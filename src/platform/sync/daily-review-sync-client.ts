import type { DailyReviewRecord } from "@/modules/dashboard/infrastructure/local/daily-review.record";
import { getLocalDatabase } from "@/platform/database/local-database";
import {
	pullDailyReviewChangesFn,
	pushDailyReviewOperationsFn,
} from "./daily-review-sync.functions";
import { dailyReviewSyncSnapshotSchema } from "./daily-review-sync.schemas";
import { withDailyReviewSyncLock } from "./sync-lock-client";
import { getNextRetryAt } from "./retry-policy";
import {
	createSyncCursorId,
	createSyncMetadataId,
	createSyncRuntimeId,
	type PullDailyReviewChange,
	type PushOperationResult,
	type SyncOperationRecord,
	type SyncRuntimeState,
} from "./sync.types";

const PUSH_BATCH_SIZE = 50;
const PULL_BATCH_SIZE = 100;
const MAX_BATCHES_PER_RUN = 10;
const STALE_PROCESSING_MS = 2 * 60_000;
export type RunDailyReviewSyncInput = { userId: string; deviceId: string };

export async function runDailyReviewSync(input: RunDailyReviewSyncInput) {
	return withDailyReviewSyncLock(input, async () => {
		await setRuntimeState(input.userId, "syncing", null, true);

		try {
			await recoverStaleOperations(input.userId, input.deviceId);
			let pushed = 0;
			let pulled = 0;
			let conflicts = 0;
			let rejected = 0;

			for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch += 1) {
				const operations = await claimPushBatch(input.userId, input.deviceId);
				if (!operations.length) break;

				try {
					const response = await pushDailyReviewOperationsFn({
						data: {
							deviceId: input.deviceId,
							operations: operations.map((operation) => ({
								operationId: operation.id,
								entityType: "daily_review" as const,
								entityId: operation.entityId,
								operation: operation.operation,
								payload: operation.payload,
								baseVersion: operation.baseVersion,
							})),
						},
					});

					const summary = await applyPushResults(
						input.userId,
						operations,
						response.results,
					);
					pushed += summary.applied;
					conflicts += summary.conflicts;
					rejected += summary.rejected;
				} catch (error) {
					await markBatchFailed(operations, getErrorMessage(error));
					throw error;
				}
			}

			for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch += 1) {
				const cursor = await getCursor(input.userId);
				const response = await pullDailyReviewChangesFn({
					data: { deviceId: input.deviceId, cursor, limit: PULL_BATCH_SIZE },
				});
				const result = await applyDailyReviewPullChanges(
					input.userId,
					response.changes,
					response.nextCursor,
				);
				pulled += result.applied;
				conflicts += result.conflicts;
				if (!response.hasMore) break;
			}

			await setRuntimeState(input.userId, "idle", null, false);
			return { pushed, pulled, conflicts, rejected };
		} catch (error) {
			await setRuntimeState(
				input.userId,
				"error",
				getErrorMessage(error),
				false,
			);
			throw error;
		}
	});
}

async function recoverStaleOperations(
	userId: string,
	deviceId: string,
): Promise<void> {
	const db = getLocalDatabase();
	const cutoff = Date.now() - STALE_PROCESSING_MS;
	const now = new Date().toISOString();
	const operations = await db.syncOperations
		.where("userId")
		.equals(userId)
		.toArray();

	await db.transaction("rw", db.syncOperations, async () => {
		for (const operation of operations) {
			if (
				operation.deviceId !== deviceId ||
				operation.entityType !== "daily_review" ||
				operation.status !== "processing" ||
				new Date(operation.updatedAt).getTime() > cutoff
			)
				continue;

			await db.syncOperations.update(operation.id, {
				status: "failed",
				nextRetryAt: null,
				lastError: "STALE_PROCESSING_RECOVERED",
				updatedAt: now,
			});
		}
	});
}

async function claimPushBatch(
	userId: string,
	deviceId: string,
): Promise<SyncOperationRecord[]> {
	const db = getLocalDatabase();
	const now = new Date();
	const nowIso = now.toISOString();

	return db.transaction("rw", db.syncOperations, db.syncMetadata, async () => {
		const candidates = await db.syncOperations
			.where("userId")
			.equals(userId)
			.toArray();
		const conflicts = await db.syncMetadata
			.where("state")
			.equals("conflict")
			.toArray();
		const conflictedIds = new Set(
			conflicts
				.filter((item) => item.entityType === "daily_review")
				.map((item) => item.entityId),
		);

		const selected = candidates
			.filter(
				(operation) =>
					operation.deviceId === deviceId &&
					operation.entityType === "daily_review" &&
					(operation.status === "pending" || operation.status === "failed") &&
					(!operation.nextRetryAt || new Date(operation.nextRetryAt) <= now) &&
					!conflictedIds.has(operation.entityId),
			)
			.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
			.filter(
				(operation, index, values) =>
					values.findIndex((item) => item.entityId === operation.entityId) ===
					index,
			)
			.slice(0, PUSH_BATCH_SIZE);

		for (const operation of selected) {
			await db.syncOperations.update(operation.id, {
				status: "processing",
				attempts: operation.attempts + 1,
				nextRetryAt: null,
				lastError: null,
				updatedAt: nowIso,
			});
		}

		return selected.map((operation) => ({
			...operation,
			status: "processing" as const,
			attempts: operation.attempts + 1,
			nextRetryAt: null,
			lastError: null,
			updatedAt: nowIso,
		}));
	});
}

async function applyPushResults(
	userId: string,
	operations: SyncOperationRecord[],
	results: PushOperationResult[],
): Promise<{ applied: number; conflicts: number; rejected: number }> {
	const byId = new Map(
		operations.map((operation) => [operation.id, operation]),
	);
	let applied = 0;
	let conflicts = 0;
	let rejected = 0;

	for (const result of results) {
		const operation = byId.get(result.operationId);
		if (!operation) continue;

		if (result.status === "applied") {
			await applyPushedSnapshot(
				operation,
				result.serverPayload,
				result.version,
			);
			applied += 1;
		} else if (result.status === "conflict") {
			await storeConflict(userId, operation, result);
			conflicts += 1;
		} else {
			await markRejected(operation, result.reason);
			rejected += 1;
		}
	}

	return { applied, conflicts, rejected };
}

async function applyPushedSnapshot(
	operation: SyncOperationRecord,
	payload: unknown,
	remoteVersion: number,
): Promise<void> {
	const db = getLocalDatabase();
	const snapshot = dailyReviewSyncSnapshotSchema.parse(payload);
	const now = new Date().toISOString();

	await db.transaction(
		"rw",
		db.dailyReviews,
		db.syncOperations,
		db.syncMetadata,
		async () => {
			await db.dailyReviews.put(snapshot as DailyReviewRecord);
			await db.syncOperations.delete(operation.id);
			await db.syncMetadata.put({
				id: createSyncMetadataId("daily_review", operation.entityId),
				entityType: "daily_review",
				entityId: operation.entityId,
				localVersion: snapshot.version,
				remoteVersion,
				state: "synced",
				lastSyncedAt: now,
				lastError: null,
				updatedAt: now,
			});

			const next = (
				await db.syncOperations
					.where("[entityType+entityId]")
					.equals(["daily_review", operation.entityId])
					.toArray()
			)
				.filter((item) => item.status === "pending" || item.status === "failed")
				.sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];

			if (next) {
				await db.syncOperations.update(next.id, {
					baseVersion: remoteVersion,
					updatedAt: now,
				});
				await db.syncMetadata.update(
					createSyncMetadataId("daily_review", operation.entityId),
					{
						state: "pending",
						updatedAt: now,
					},
				);
			}
		},
	);
}

async function storeConflict(
	userId: string,
	operation: SyncOperationRecord,
	result: Extract<PushOperationResult, { status: "conflict" }>,
): Promise<void> {
	const db = getLocalDatabase();
	const now = new Date().toISOString();

	await db.transaction(
		"rw",
		db.syncOperations,
		db.syncMetadata,
		db.syncConflicts,
		async () => {
			await db.syncOperations.update(operation.id, {
				status: "conflict",
				lastError: result.reason,
				updatedAt: now,
			});
			await db.syncMetadata.put({
				id: createSyncMetadataId("daily_review", operation.entityId),
				entityType: "daily_review",
				entityId: operation.entityId,
				localVersion: getPayloadVersion(operation.payload),
				remoteVersion: result.serverVersion,
				state: "conflict",
				lastSyncedAt: null,
				lastError: result.reason,
				updatedAt: now,
			});
			await db.syncConflicts.put({
				id: crypto.randomUUID(),
				userId,
				entityType: "daily_review",
				entityId: operation.entityId,
				localPayload: operation.payload,
				remotePayload: result.serverPayload,
				remoteVersion: result.serverVersion,
				localOperationIds: [operation.id],
				reason: result.reason,
				createdAt: now,
				resolvedAt: null,
				resolution: null,
				resolvedPayload: null,
			});
		},
	);
}

async function markRejected(
	operation: SyncOperationRecord,
	reason: string,
): Promise<void> {
	const db = getLocalDatabase();
	const now = new Date().toISOString();
	await db.transaction("rw", db.syncOperations, db.syncMetadata, async () => {
		await db.syncOperations.update(operation.id, {
			status: "rejected",
			lastError: reason,
			updatedAt: now,
		});
		await db.syncMetadata.update(
			createSyncMetadataId("daily_review", operation.entityId),
			{
				state: "failed",
				lastError: reason,
				updatedAt: now,
			},
		);
	});
}

async function markBatchFailed(
	operations: SyncOperationRecord[],
	error: string,
): Promise<void> {
	const db = getLocalDatabase();
	const now = new Date();
	const updatedAt = now.toISOString();
	await db.transaction("rw", db.syncOperations, db.syncMetadata, async () => {
		for (const operation of operations) {
			await db.syncOperations.update(operation.id, {
				status: "failed",
				nextRetryAt: getNextRetryAt(operation.attempts, now),
				lastError: error,
				updatedAt,
			});
			await db.syncMetadata.update(
				createSyncMetadataId("daily_review", operation.entityId),
				{
					state: "failed",
					lastError: error,
					updatedAt,
				},
			);
		}
	});
}

async function getCursor(userId: string): Promise<number> {
	const cursor = await getLocalDatabase().syncCursors.get(
		createSyncCursorId(userId, "daily_review"),
	);
	return cursor?.cursor ?? 0;
}

export async function applyDailyReviewPullChanges(
	userId: string,
	changes: PullDailyReviewChange[],
	nextCursor: number,
): Promise<{ applied: number; conflicts: number }> {
	const db = getLocalDatabase();
	let applied = 0;
	let conflicts = 0;

	await db.transaction(
		"rw",
		db.dailyReviews,
		db.syncOperations,
		db.syncMetadata,
		db.syncCursors,
		db.syncConflicts,
		async () => {
			for (const change of changes) {
				const snapshot = dailyReviewSyncSnapshotSchema.parse(change.payload);
				const metadata = await db.syncMetadata.get(
					createSyncMetadataId("daily_review", change.entityId),
				);
				if (
					metadata?.remoteVersion !== null &&
					metadata?.remoteVersion !== undefined &&
					change.version <= metadata.remoteVersion
				) {
					continue;
				}
				const unresolved = await db.syncOperations
					.where("[entityType+entityId]")
					.equals(["daily_review", change.entityId])
					.filter((operation) => operation.status !== "rejected")
					.toArray();

				if (unresolved.length) {
					await db.syncConflicts.put({
						id: `daily_review:${change.entityId}:pull:${change.version}`,
						userId,
						entityType: "daily_review",
						entityId: change.entityId,
						localPayload: unresolved.at(-1)?.payload ?? null,
						remotePayload: snapshot,
						remoteVersion: change.version,
						localOperationIds: unresolved.map((item) => item.id),
						reason: "REMOTE_CHANGE_WITH_LOCAL_OPERATIONS",
						createdAt: new Date().toISOString(),
						resolvedAt: null,
						resolution: null,
						resolvedPayload: null,
					});
					await db.syncMetadata.put({
						id: createSyncMetadataId("daily_review", change.entityId),
						entityType: "daily_review",
						entityId: change.entityId,
						localVersion: getPayloadVersion(unresolved.at(-1)?.payload),
						remoteVersion: change.version,
						state: "conflict",
						lastSyncedAt: null,
						lastError: "REMOTE_CHANGE_WITH_LOCAL_OPERATIONS",
						updatedAt: new Date().toISOString(),
					});
					conflicts += 1;
					continue;
				}

				await db.dailyReviews.put(snapshot as DailyReviewRecord);
				const now = new Date().toISOString();
				await db.syncMetadata.put({
					id: createSyncMetadataId("daily_review", change.entityId),
					entityType: "daily_review",
					entityId: change.entityId,
					localVersion: snapshot.version,
					remoteVersion: change.version,
					state: "synced",
					lastSyncedAt: now,
					lastError: null,
					updatedAt: now,
				});
				applied += 1;
			}

			await db.syncCursors.put({
				id: createSyncCursorId(userId, "daily_review"),
				userId,
				entityType: "daily_review",
				cursor: nextCursor,
				updatedAt: new Date().toISOString(),
			});
		},
	);

	return { applied, conflicts };
}

async function setRuntimeState(
	userId: string,
	state: SyncRuntimeState,
	error: string | null,
	started: boolean,
): Promise<void> {
	const db = getLocalDatabase();
	const id = createSyncRuntimeId(userId, "daily_review");
	const existing = await db.syncRuntime.get(id);
	const now = new Date().toISOString();
	await db.syncRuntime.put({
		id,
		userId,
		entityType: "daily_review",
		state,
		lastStartedAt: started ? now : (existing?.lastStartedAt ?? null),
		lastCompletedAt:
			state === "idle" ? now : (existing?.lastCompletedAt ?? null),
		lastError: error,
		updatedAt: now,
	});
}

function getPayloadVersion(payload: unknown): number {
	if (
		typeof payload === "object" &&
		payload !== null &&
		"version" in payload &&
		typeof payload.version === "number"
	) {
		return payload.version;
	}
	return 1;
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : "DAILY_REVIEW_SYNC_FAILED";
}
