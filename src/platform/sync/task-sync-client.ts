import type { TaskRecord } from "@/modules/tasks/infrastructure/local/task.record";
import { registerCurrentDevice } from "@/platform/auth/device.functions";
import { getLocalDatabase } from "@/platform/database/local-database";
import { getNextRetryAt } from "./retry-policy";
import { type TaskSyncSnapshot, taskSyncSnapshotSchema } from "./sync.schemas";
import {
	createSyncCursorId,
	createSyncMetadataId,
	createSyncRuntimeId,
	type PullTaskChange,
	type PushOperationResult,
	type SyncOperationRecord,
} from "./sync.types";
import { withTaskSyncLock } from "./sync-lock-client";
import { pullTaskChangesFn, pushTaskOperationsFn } from "./task-sync.functions";

const PUSH_BATCH_SIZE = 50;
const PULL_BATCH_SIZE = 100;
const MAX_BATCHES_PER_RUN = 10;
const registeredDevicesThisSession = new Set<string>();
const STALE_PROCESSING_MS = 2 * 60_000;

export type RunTaskSyncInput = {
	userId: string;
	deviceId: string;
};

export type RunTaskSyncResult = {
	pushed: number;
	pulled: number;
	conflicts: number;
	rejected: number;
};

export async function runTaskSync(
	input: RunTaskSyncInput,
): Promise<RunTaskSyncResult | null> {
	return withTaskSyncLock(async () => {
		await setRuntimeState(input.userId, "syncing", null, true);

		try {
			await recoverStaleProcessingOperations(input.userId, input.deviceId);

			await ensureRemoteDevice(input);

			let pushed = 0;
			let pulled = 0;
			let conflicts = 0;
			let rejected = 0;

			for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch += 1) {
				const operations = await claimPushBatch(input.userId, input.deviceId);

				if (operations.length === 0) {
					break;
				}

				try {
					const response = await pushTaskOperationsFn({
						data: {
							deviceId: input.deviceId,
							operations: operations.map(toPushInput),
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
				const cursor = await getTaskCursor(input.userId);

				const response = await pullTaskChangesFn({
					data: {
						deviceId: input.deviceId,
						cursor,
						limit: PULL_BATCH_SIZE,
					},
				});

				const summary = await applyPullChanges(
					input.userId,
					response.changes,
					response.nextCursor,
				);

				pulled += summary.applied;
				conflicts += summary.conflicts;

				if (!response.hasMore) {
					break;
				}
			}

			await setRuntimeState(input.userId, "idle", null, false);

			return {
				pushed,
				pulled,
				conflicts,
				rejected,
			};
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

async function recoverStaleProcessingOperations(
	userId: string,
	deviceId: string,
): Promise<void> {
	const db = getLocalDatabase();
	const cutoff = Date.now() - STALE_PROCESSING_MS;
	const now = new Date().toISOString();

	await db.transaction("rw", db.syncOperations, async () => {
		const operations = await db.syncOperations
			.where("userId")
			.equals(userId)
			.toArray();

		for (const operation of operations) {
			if (
				operation.deviceId !== deviceId ||
				operation.entityType !== "task" ||
				operation.status !== "processing" ||
				new Date(operation.updatedAt).getTime() > cutoff
			) {
				continue;
			}

			await db.syncOperations.update(operation.id, {
				status: "failed",
				attempts: operation.attempts + 1,
				nextRetryAt: null,
				lastError: "STALE_PROCESSING_RECOVERED",
				updatedAt: now,
			});
		}
	});
}

async function ensureRemoteDevice(input: RunTaskSyncInput): Promise<void> {
	const db = getLocalDatabase();
	const [device, identity] = await Promise.all([
		db.localDevices.get(input.deviceId),
		db.localIdentities.get(input.userId),
	]);

	if (!device) {
		throw new Error("LOCAL_DEVICE_NOT_FOUND");
	}

	if (registeredDevicesThisSession.has(device.id)) {
		return;
	}

	const registration = await registerCurrentDevice({
		data: {
			deviceId: device.id,
			name: device.name,
			platform: device.platform,
		},
	});

	registeredDevicesThisSession.add(device.id);

	if (identity) {
		await db.localIdentities.update(identity.id, {
			remoteRegisteredAt: registration.registeredAt,
			updatedAt: new Date().toISOString(),
		});
	}
}

async function claimPushBatch(
	userId: string,
	deviceId: string,
): Promise<SyncOperationRecord[]> {
	const db = getLocalDatabase();
	const now = new Date();

	return db.transaction("rw", db.syncOperations, db.syncMetadata, async () => {
		const candidates = await db.syncOperations
			.where("userId")
			.equals(userId)
			.toArray();

		const conflictMetadata = await db.syncMetadata
			.where("state")
			.equals("conflict")
			.toArray();

		const conflictedEntityIds = new Set(
			conflictMetadata
				.filter((metadata) => metadata.entityType === "task")
				.map((metadata) => metadata.entityId),
		);

		const ordered = candidates
			.filter(
				(operation) =>
					operation.deviceId === deviceId && operation.entityType === "task",
			)
			.sort((left, right) => left.createdAt.localeCompare(right.createdAt));

		// Only the oldest unresolved operation of each entity can
		// run. Later operations depend on the remote version returned
		// by the previous one.
		const seenEntityIds = new Set<string>();
		const selected: SyncOperationRecord[] = [];

		for (const operation of ordered) {
			if (seenEntityIds.has(operation.entityId)) {
				continue;
			}

			seenEntityIds.add(operation.entityId);

			if (
				conflictedEntityIds.has(operation.entityId) ||
				!isEligibleForRetry(operation, now) ||
				(operation.operation !== "create" && operation.baseVersion === null)
			) {
				continue;
			}

			selected.push(operation);

			if (selected.length >= PUSH_BATCH_SIZE) {
				break;
			}
		}

		const updatedAt = now.toISOString();

		for (const operation of selected) {
			await db.syncOperations.update(operation.id, {
				status: "processing",
				updatedAt,
			});
		}

		return selected.map((operation) => ({
			...operation,
			status: "processing",
			updatedAt,
		}));
	});
}

function isEligibleForRetry(
	operation: SyncOperationRecord,
	now: Date,
): boolean {
	if (operation.status === "pending") {
		return true;
	}

	if (operation.status !== "failed") {
		return false;
	}

	if (!operation.nextRetryAt) {
		return true;
	}

	return new Date(operation.nextRetryAt).getTime() <= now.getTime();
}

function toPushInput(operation: SyncOperationRecord) {
	return {
		operationId: operation.id,
		entityType: "task" as const,
		entityId: operation.entityId,
		operation: operation.operation,
		payload: operation.payload,
		baseVersion: operation.baseVersion,
	};
}

async function applyPushResults(
	userId: string,
	claimedOperations: SyncOperationRecord[],
	results: PushOperationResult[],
): Promise<{
	applied: number;
	conflicts: number;
	rejected: number;
}> {
	const db = getLocalDatabase();
	const claimedById = new Map(
		claimedOperations.map((operation) => [operation.id, operation]),
	);

	let applied = 0;
	let conflicts = 0;
	let rejected = 0;

	await db.transaction(
		"rw",
		db.tasks,
		db.syncOperations,
		db.syncMetadata,
		db.syncConflicts,
		async () => {
			for (const result of results) {
				const claimed = claimedById.get(result.operationId);

				if (!claimed) {
					continue;
				}

				if (result.status === "applied") {
					await applySuccessfulPush(claimed, result);
					applied += 1;
					continue;
				}

				if (result.status === "conflict") {
					await preservePushConflict(userId, claimed, result);
					conflicts += 1;
					continue;
				}

				await db.syncOperations.update(claimed.id, {
					status: "rejected",
					nextRetryAt: null,
					lastError: result.reason,
					updatedAt: new Date().toISOString(),
				});

				const metadataId = createSyncMetadataId("task", claimed.entityId);

				await db.syncMetadata.update(metadataId, {
					state: "failed",
					lastError: result.reason,
					updatedAt: new Date().toISOString(),
				});

				rejected += 1;
			}
		},
	);

	return { applied, conflicts, rejected };
}

async function applySuccessfulPush(
	claimed: SyncOperationRecord,
	result: Extract<PushOperationResult, { status: "applied" }>,
): Promise<void> {
	const db = getLocalDatabase();
	const snapshot = taskSyncSnapshotSchema.parse(result.serverPayload);

	const newerOperations = await db.syncOperations
		.where("[entityType+entityId]")
		.equals(["task", claimed.entityId])
		.filter(
			(operation) =>
				operation.id !== claimed.id &&
				(operation.status === "pending" ||
					operation.status === "processing" ||
					operation.status === "failed"),
		)
		.toArray();

	await db.syncOperations.delete(claimed.id);

	for (const operation of newerOperations) {
		await db.syncOperations.update(operation.id, {
			baseVersion: result.version,
			updatedAt: new Date().toISOString(),
		});
	}

	const currentTask = await db.tasks.get(claimed.entityId);

	if (newerOperations.length === 0) {
		await db.tasks.put(snapshotToTaskRecord(snapshot));
	}

	const now = new Date().toISOString();

	await db.syncMetadata.put({
		id: createSyncMetadataId("task", claimed.entityId),
		entityType: "task",
		entityId: claimed.entityId,
		localVersion:
			newerOperations.length > 0
				? (currentTask?.version ?? snapshot.version)
				: snapshot.version,
		remoteVersion: result.version,
		state: newerOperations.length > 0 ? "pending" : "synced",
		lastSyncedAt: now,
		lastError: null,
		updatedAt: now,
	});
}

async function preservePushConflict(
	userId: string,
	claimed: SyncOperationRecord,
	result: Extract<PushOperationResult, { status: "conflict" }>,
): Promise<void> {
	const db = getLocalDatabase();
	const now = new Date().toISOString();

	await db.syncOperations.update(claimed.id, {
		status: "conflict",
		nextRetryAt: null,
		lastError: result.reason,
		updatedAt: now,
	});

	await db.syncConflicts.put({
		id: crypto.randomUUID(),
		userId,
		entityType: "task",
		entityId: claimed.entityId,
		localPayload: claimed.payload,
		remotePayload: result.serverPayload,
		remoteVersion: result.serverVersion,
		localOperationIds: [claimed.id],
		reason: result.reason,
		createdAt: now,
		resolvedAt: null,
		resolution: null,
		resolvedPayload: null,
	});

	await db.syncMetadata.put({
		id: createSyncMetadataId("task", claimed.entityId),
		entityType: "task",
		entityId: claimed.entityId,
		localVersion: (await db.tasks.get(claimed.entityId))?.version ?? 1,
		remoteVersion: result.serverVersion,
		state: "conflict",
		lastSyncedAt: null,
		lastError: result.reason,
		updatedAt: now,
	});
}

async function markBatchFailed(
	operations: SyncOperationRecord[],
	message: string,
): Promise<void> {
	const db = getLocalDatabase();

	await db.transaction("rw", db.syncOperations, db.syncMetadata, async () => {
		for (const operation of operations) {
			const attempts = operation.attempts + 1;
			const now = new Date().toISOString();

			await db.syncOperations.update(operation.id, {
				status: "failed",
				attempts,
				nextRetryAt: getNextRetryAt(attempts),
				lastError: message,
				updatedAt: now,
			});

			await db.syncMetadata.update(
				createSyncMetadataId("task", operation.entityId),
				{
					state: "failed",
					lastError: message,
					updatedAt: now,
				},
			);
		}
	});
}

async function getTaskCursor(userId: string): Promise<number> {
	const db = getLocalDatabase();
	const cursor = await db.syncCursors.get(createSyncCursorId(userId, "task"));

	return cursor?.cursor ?? 0;
}

async function applyPullChanges(
	userId: string,
	changes: PullTaskChange[],
	nextCursor: number,
): Promise<{
	applied: number;
	conflicts: number;
}> {
	const db = getLocalDatabase();
	let applied = 0;
	let conflicts = 0;

	await db.transaction(
		"rw",
		db.tasks,
		db.syncOperations,
		db.syncMetadata,
		db.syncCursors,
		db.syncConflicts,
		async () => {
			for (const change of changes) {
				const snapshot = taskSyncSnapshotSchema.parse(change.payload);

				const metadataId = createSyncMetadataId("task", change.entityId);

				const metadata = await db.syncMetadata.get(metadataId);

				if (change.version <= (metadata?.remoteVersion ?? 0)) {
					continue;
				}

				const localOperations = await db.syncOperations
					.where("[entityType+entityId]")
					.equals(["task", change.entityId])
					.filter((operation) => operation.status !== "rejected")
					.toArray();

				if (localOperations.length > 0) {
					const currentTask = await db.tasks.get(change.entityId);

					const now = new Date().toISOString();

					await db.syncConflicts.put({
						id: crypto.randomUUID(),
						userId,
						entityType: "task",
						entityId: change.entityId,
						localPayload:
							currentTask ?? localOperations.at(-1)?.payload ?? null,
						remotePayload: snapshot,
						remoteVersion: change.version,
						localOperationIds: localOperations.map((operation) => operation.id),
						reason: "REMOTE_CHANGE_WITH_LOCAL_PENDING",
						createdAt: now,
						resolvedAt: null,
						resolution: null,
						resolvedPayload: null,
					});

					for (const operation of localOperations) {
						await db.syncOperations.update(operation.id, {
							status: "conflict",
							nextRetryAt: null,
							lastError: "REMOTE_CHANGE_WITH_LOCAL_PENDING",
							updatedAt: now,
						});
					}

					await db.syncMetadata.put({
						id: metadataId,
						entityType: "task",
						entityId: change.entityId,
						localVersion: currentTask?.version ?? 1,
						remoteVersion: change.version,
						state: "conflict",
						lastSyncedAt: metadata?.lastSyncedAt ?? null,
						lastError: "REMOTE_CHANGE_WITH_LOCAL_PENDING",
						updatedAt: now,
					});

					conflicts += 1;
					continue;
				}

				await db.tasks.put(snapshotToTaskRecord(snapshot));

				const now = new Date().toISOString();

				await db.syncMetadata.put({
					id: metadataId,
					entityType: "task",
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
				id: createSyncCursorId(userId, "task"),
				userId,
				entityType: "task",
				cursor: nextCursor,
				updatedAt: new Date().toISOString(),
			});
		},
	);

	return { applied, conflicts };
}

function snapshotToTaskRecord(snapshot: TaskSyncSnapshot): TaskRecord {
	return { ...snapshot };
}

async function setRuntimeState(
	userId: string,
	state: "idle" | "syncing" | "error",
	error: string | null,
	started: boolean,
): Promise<void> {
	const db = getLocalDatabase();
	const id = createSyncRuntimeId(userId, "task");

	const existing = await db.syncRuntime.get(id);
	const now = new Date().toISOString();

	await db.syncRuntime.put({
		id,
		userId,
		entityType: "task",
		state,
		lastStartedAt: started ? now : (existing?.lastStartedAt ?? null),
		lastCompletedAt:
			state === "idle" ? now : (existing?.lastCompletedAt ?? null),
		lastError: error,
		updatedAt: now,
	});
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : "TASK_SYNC_FAILED";
}
