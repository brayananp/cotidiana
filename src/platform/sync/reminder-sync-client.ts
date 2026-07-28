import type { ReminderRecord } from "@/modules/reminders/infrastructure/local/reminder.record";
import { registerCurrentDevice } from "@/platform/auth/device.functions";
import { getLocalDatabase } from "@/platform/database/local-database";
import {
	pullReminderChangesFn,
	pushReminderOperationsFn,
} from "./reminder-sync.functions";
import { reminderSyncSnapshotSchema } from "./reminder-sync.schemas";
import { withReminderSyncLock } from "./reminder-sync-lock-client";
import { getNextRetryAt } from "./retry-policy";
import {
	createSyncCursorId,
	createSyncMetadataId,
	createSyncRuntimeId,
	type PullReminderChange,
	type PushOperationResult,
	type SyncOperationRecord,
	type SyncRuntimeState,
} from "./sync.types";

const PUSH_BATCH_SIZE = 50;
const PULL_BATCH_SIZE = 100;
const MAX_BATCHES_PER_RUN = 10;
const STALE_PROCESSING_MS = 2 * 60_000;

const registeredDevicesThisSession = new Set<string>();

export type RunReminderSyncInput = {
	userId: string;
	deviceId: string;
};

export type RunReminderSyncResult = {
	pushed: number;
	pulled: number;
	conflicts: number;
	rejected: number;
};

export async function runReminderSync(
	input: RunReminderSyncInput,
): Promise<RunReminderSyncResult | null> {
	return withReminderSyncLock(async () => {
		await setRuntimeState(input.userId, "syncing", null, true);

		try {
			await recoverStaleOperations(input.userId, input.deviceId);

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
					const response = await pushReminderOperationsFn({
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
				const cursor = await getCursor(input.userId);

				const response = await pullReminderChangesFn({
					data: {
						deviceId: input.deviceId,
						cursor,
						limit: PULL_BATCH_SIZE,
					},
				});

				const result = await applyPullChanges(
					input.userId,
					response.changes,
					response.nextCursor,
				);

				pulled += result.applied;
				conflicts += result.conflicts;

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
				operation.entityType !== "reminder" ||
				operation.status !== "processing" ||
				new Date(operation.updatedAt).getTime() > cutoff
			) {
				continue;
			}

			await db.syncOperations.update(operation.id, {
				status: "failed",
				nextRetryAt: null,
				lastError: "STALE_PROCESSING_RECOVERED",
				updatedAt: now,
			});
		}
	});
}

async function ensureRemoteDevice(input: RunReminderSyncInput): Promise<void> {
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
	const nowIso = now.toISOString();

	return db.transaction("rw", db.syncOperations, db.syncMetadata, async () => {
		const candidates = await db.syncOperations
			.where("userId")
			.equals(userId)
			.toArray();

		const conflictMetadata = await db.syncMetadata
			.where("state")
			.equals("conflict")
			.toArray();

		const conflictedIds = new Set(
			conflictMetadata
				.filter((metadata) => metadata.entityType === "reminder")
				.map((metadata) => metadata.entityId),
		);

		const ordered = candidates
			.filter(
				(operation) =>
					operation.deviceId === deviceId &&
					operation.entityType === "reminder" &&
					(operation.status === "pending" || operation.status === "failed") &&
					(!operation.nextRetryAt || new Date(operation.nextRetryAt) <= now) &&
					!conflictedIds.has(operation.entityId),
			)
			.sort((left, right) => left.createdAt.localeCompare(right.createdAt));

		const selected: SyncOperationRecord[] = [];

		const seenEntities = new Set<string>();

		for (const operation of ordered) {
			if (seenEntities.has(operation.entityId)) {
				continue;
			}

			seenEntities.add(operation.entityId);

			selected.push(operation);

			if (selected.length >= PUSH_BATCH_SIZE) {
				break;
			}
		}

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

function toPushInput(operation: SyncOperationRecord) {
	return {
		operationId: operation.id,
		entityType: "reminder" as const,
		entityId: operation.entityId,
		operation: operation.operation,
		payload: operation.payload,
		baseVersion: operation.baseVersion,
	};
}

async function applyPushResults(
	userId: string,
	operations: SyncOperationRecord[],
	results: PushOperationResult[],
): Promise<{
	applied: number;
	conflicts: number;
	rejected: number;
}> {
	const operationById = new Map(
		operations.map((operation) => [operation.id, operation]),
	);

	let appliedCount = 0;
	let conflictCount = 0;
	let rejectedCount = 0;

	for (const result of results) {
		const operation = operationById.get(result.operationId);

		if (!operation) {
			continue;
		}

		if (result.status === "applied") {
			await applyPushedSnapshot(
				operation,
				result.serverPayload,
				result.version,
			);

			appliedCount += 1;
			continue;
		}

		if (result.status === "conflict") {
			await storePushConflict(userId, operation, result);

			conflictCount += 1;
			continue;
		}

		await markRejected(operation, result.reason);

		rejectedCount += 1;
	}

	return {
		applied: appliedCount,
		conflicts: conflictCount,
		rejected: rejectedCount,
	};
}

async function applyPushedSnapshot(
	operation: SyncOperationRecord,
	rawSnapshot: unknown,
	remoteVersion: number,
): Promise<void> {
	const db = getLocalDatabase();
	const now = new Date().toISOString();

	const snapshot = reminderSyncSnapshotSchema.parse(rawSnapshot);

	await db.transaction(
		"rw",
		db.reminders,
		db.syncOperations,
		db.syncMetadata,
		async () => {
			await db.reminders.put(snapshot as ReminderRecord);

			await db.syncOperations.delete(operation.id);

			await db.syncMetadata.put({
				id: createSyncMetadataId("reminder", operation.entityId),
				entityType: "reminder",
				entityId: operation.entityId,
				localVersion: snapshot.version,
				remoteVersion,
				state: "synced",
				lastSyncedAt: now,
				lastError: null,
				updatedAt: now,
			});

			const remaining = await db.syncOperations
				.where("[entityType+entityId]")
				.equals(["reminder", operation.entityId])
				.toArray();

			const next = remaining
				.filter(
					(candidate) =>
						candidate.status === "pending" || candidate.status === "failed",
				)
				.sort((left, right) =>
					left.createdAt.localeCompare(right.createdAt),
				)[0];

			if (next) {
				await db.syncOperations.update(next.id, {
					baseVersion: remoteVersion,
					updatedAt: now,
				});

				await db.syncMetadata.update(
					createSyncMetadataId("reminder", operation.entityId),
					{
						state: "pending",
						updatedAt: now,
					},
				);
			}
		},
	);
}

async function storePushConflict(
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
				id: createSyncMetadataId("reminder", operation.entityId),
				entityType: "reminder",
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
				entityType: "reminder",
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
			createSyncMetadataId("reminder", operation.entityId),
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
	errorMessage: string,
): Promise<void> {
	const db = getLocalDatabase();
	const now = new Date();
	const nowIso = now.toISOString();

	await db.transaction("rw", db.syncOperations, db.syncMetadata, async () => {
		for (const operation of operations) {
			await db.syncOperations.update(operation.id, {
				status: "failed",
				nextRetryAt: getNextRetryAt(operation.attempts, now),
				lastError: errorMessage,
				updatedAt: nowIso,
			});

			await db.syncMetadata.update(
				createSyncMetadataId("reminder", operation.entityId),
				{
					state: "failed",
					lastError: errorMessage,
					updatedAt: nowIso,
				},
			);
		}
	});
}

async function getCursor(userId: string): Promise<number> {
	const cursor = await getLocalDatabase().syncCursors.get(
		createSyncCursorId(userId, "reminder"),
	);

	return cursor?.cursor ?? 0;
}

async function applyPullChanges(
	userId: string,
	changes: PullReminderChange[],
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
		db.reminders,
		db.syncOperations,
		db.syncMetadata,
		db.syncCursors,
		db.syncConflicts,
		async () => {
			for (const change of changes) {
				const unresolved = await db.syncOperations
					.where("[entityType+entityId]")
					.equals(["reminder", change.entityId])
					.filter((operation) => operation.status !== "rejected")
					.toArray();

				if (unresolved.length > 0) {
					const conflictId = `reminder:${change.entityId}:pull:${change.version}`;

					await db.syncConflicts.put({
						id: conflictId,
						userId,
						entityType: "reminder",
						entityId: change.entityId,
						localPayload: unresolved.at(-1)?.payload ?? null,
						remotePayload: change.payload,
						remoteVersion: change.version,
						localOperationIds: unresolved.map((operation) => operation.id),
						reason: "REMOTE_CHANGE_WITH_LOCAL_OPERATIONS",
						createdAt: new Date().toISOString(),
						resolvedAt: null,
						resolution: null,
						resolvedPayload: null,
					});

					await db.syncMetadata.put({
						id: createSyncMetadataId("reminder", change.entityId),
						entityType: "reminder",
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

				const snapshot = reminderSyncSnapshotSchema.parse(change.payload);

				await db.reminders.put(snapshot as ReminderRecord);

				const now = new Date().toISOString();

				await db.syncMetadata.put({
					id: createSyncMetadataId("reminder", change.entityId),
					entityType: "reminder",
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
				id: createSyncCursorId(userId, "reminder"),
				userId,
				entityType: "reminder",
				cursor: nextCursor,
				updatedAt: new Date().toISOString(),
			});
		},
	);

	return {
		applied,
		conflicts,
	};
}

async function setRuntimeState(
	userId: string,
	state: SyncRuntimeState,
	error: string | null,
	started: boolean,
): Promise<void> {
	const db = getLocalDatabase();
	const now = new Date().toISOString();

	const id = createSyncRuntimeId(userId, "reminder");

	const existing = await db.syncRuntime.get(id);

	await db.syncRuntime.put({
		id,
		userId,
		entityType: "reminder",
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
	return error instanceof Error ? error.message : "REMINDER_SYNC_FAILED";
}
