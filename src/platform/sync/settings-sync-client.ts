import type { UserSettingsRecord } from "@/modules/settings/infrastructure/local/user-settings.record";
import { getLocalDatabase } from "@/platform/database/local-database";
import { getNextRetryAt } from "./retry-policy";
import {
	pullSettingsChangesFn,
	pushSettingsOperationsFn,
} from "./settings-sync.functions";
import { userSettingsSyncSnapshotSchema } from "./settings-sync.schemas";
import { withSettingsSyncLock } from "./sync-lock-client";
import {
	createSyncCursorId,
	createSyncMetadataId,
	createSyncRuntimeId,
	type PushOperationResult,
	type SyncOperationRecord,
	type SyncRuntimeState,
} from "./sync.types";

const STALE_PROCESSING_MS = 2 * 60_000;

export async function runSettingsSync(input: {
	userId: string;
	deviceId: string;
}) {
	return withSettingsSyncLock(input, async () => {
		await setRuntimeState(input.userId, "syncing", null, true);

		try {
			await recoverStaleOperation(input.userId, input.deviceId);
			let pushed = 0;
			let pulled = 0;
			let conflicts = 0;
			let rejected = 0;

			const operation = await claimOperation(input.userId, input.deviceId);

			if (operation) {
				try {
					const response = await pushSettingsOperationsFn({
						data: {
							deviceId: input.deviceId,
							operations: [toPushInput(operation)],
						},
					});

					const result = response.results[0];

					if (result) {
						if (result.status === "applied") {
							await applyPushedSnapshot(
								operation,
								result.serverPayload,
								result.version,
							);
							pushed += 1;
						} else if (result.status === "conflict") {
							await storeConflict(input.userId, operation, result);
							conflicts += 1;
						} else {
							await markRejected(operation, result.reason);
							rejected += 1;
						}
					}
				} catch (error) {
					await markFailed(operation, getErrorMessage(error));
					throw error;
				}
			}

			const cursor = await getCursor(input.userId);
			const response = await pullSettingsChangesFn({
				data: {
					deviceId: input.deviceId,
					cursor,
					limit: 20,
				},
			});

			const pullResult = await applyPullChanges(
				input.userId,
				response.changes,
				response.nextCursor,
			);

			pulled += pullResult.applied;
			conflicts += pullResult.conflicts;

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

async function recoverStaleOperation(
	userId: string,
	deviceId: string,
): Promise<void> {
	const db = getLocalDatabase();
	const cutoff = Date.now() - STALE_PROCESSING_MS;
	const operations = await db.syncOperations
		.where("userId")
		.equals(userId)
		.toArray();

	for (const operation of operations) {
		if (
			operation.deviceId === deviceId &&
			operation.entityType === "user_settings" &&
			operation.status === "processing" &&
			new Date(operation.updatedAt).getTime() <= cutoff
		) {
			await db.syncOperations.update(operation.id, {
				status: "failed",
				nextRetryAt: null,
				lastError: "STALE_PROCESSING_RECOVERED",
				updatedAt: new Date().toISOString(),
			});
		}
	}
}

async function claimOperation(
	userId: string,
	deviceId: string,
): Promise<SyncOperationRecord | null> {
	const db = getLocalDatabase();
	const now = new Date();

	return db.transaction("rw", db.syncOperations, async () => {
		const candidates = await db.syncOperations
			.where("userId")
			.equals(userId)
			.toArray();

		const selected = candidates
			.filter(
				(operation) =>
					operation.deviceId === deviceId &&
					operation.entityType === "user_settings" &&
					(operation.status === "pending" || operation.status === "failed") &&
					(!operation.nextRetryAt || new Date(operation.nextRetryAt) <= now),
			)
			.sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0];

		if (!selected) {
			return null;
		}

		const updated: SyncOperationRecord = {
			...selected,
			status: "processing",
			attempts: selected.attempts + 1,
			nextRetryAt: null,
			lastError: null,
			updatedAt: now.toISOString(),
		};

		await db.syncOperations.put(updated);
		return updated;
	});
}

function toPushInput(operation: SyncOperationRecord) {
	if (operation.operation === "delete") {
		throw new Error("SETTINGS_DELETE_UNSUPPORTED");
	}

	return {
		operationId: operation.id,
		entityType: "user_settings" as const,
		entityId: operation.entityId,
		operation: operation.operation,
		payload: operation.payload,
		baseVersion: operation.baseVersion,
	};
}

async function applyPushedSnapshot(
	operation: SyncOperationRecord,
	payload: unknown,
	remoteVersion: number,
): Promise<void> {
	const db = getLocalDatabase();
	const snapshot = userSettingsSyncSnapshotSchema.parse(payload);
	const now = new Date().toISOString();

	await db.transaction(
		"rw",
		db.userSettings,
		db.syncOperations,
		db.syncMetadata,
		async () => {
			await db.userSettings.put(snapshot as UserSettingsRecord);
			await db.syncOperations.delete(operation.id);
			await db.syncMetadata.put({
				id: createSyncMetadataId("user_settings", operation.entityId),
				entityType: "user_settings",
				entityId: operation.entityId,
				localVersion: snapshot.version,
				remoteVersion,
				state: "synced",
				lastSyncedAt: now,
				lastError: null,
				updatedAt: now,
			});
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
				id: createSyncMetadataId("user_settings", operation.entityId),
				entityType: "user_settings",
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
				entityType: "user_settings",
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

	await db.syncOperations.update(operation.id, {
		status: "rejected",
		lastError: reason,
		updatedAt: now,
	});

	await db.syncMetadata.update(
		createSyncMetadataId("user_settings", operation.entityId),
		{
			state: "failed",
			lastError: reason,
			updatedAt: now,
		},
	);
}

async function markFailed(
	operation: SyncOperationRecord,
	reason: string,
): Promise<void> {
	const now = new Date();
	const db = getLocalDatabase();

	await db.syncOperations.update(operation.id, {
		status: "failed",
		nextRetryAt: getNextRetryAt(operation.attempts, now),
		lastError: reason,
		updatedAt: now.toISOString(),
	});
}

async function getCursor(userId: string): Promise<number> {
	const cursor = await getLocalDatabase().syncCursors.get(
		createSyncCursorId(userId, "user_settings"),
	);

	return cursor?.cursor ?? 0;
}

async function applyPullChanges(
	userId: string,
	changes: Array<{
		sequence: number;
		entityId: string;
		version: number;
		payload: unknown;
	}>,
	nextCursor: number,
): Promise<{ applied: number; conflicts: number }> {
	const db = getLocalDatabase();
	let applied = 0;
	let conflicts = 0;

	await db.transaction(
		"rw",
		db.userSettings,
		db.syncOperations,
		db.syncMetadata,
		db.syncCursors,
		db.syncConflicts,
		async () => {
			for (const change of changes) {
				const remotePayload = userSettingsSyncSnapshotSchema.parse(
					change.payload,
				);
				const unresolved = await db.syncOperations
					.where("[entityType+entityId]")
					.equals(["user_settings", change.entityId])
					.filter((operation) => operation.status !== "rejected")
					.toArray();

				if (unresolved.length > 0) {
					const now = new Date().toISOString();

					await db.syncConflicts.put({
						id: `user_settings:${change.entityId}:pull:${change.version}`,
						userId,
						entityType: "user_settings",
						entityId: change.entityId,
						localPayload: unresolved.at(-1)?.payload ?? null,
						remotePayload,
						remoteVersion: change.version,
						localOperationIds: unresolved.map((item) => item.id),
						reason: "REMOTE_CHANGE_WITH_LOCAL_OPERATIONS",
						createdAt: now,
						resolvedAt: null,
						resolution: null,
						resolvedPayload: null,
					});

					await db.syncMetadata.put({
						id: createSyncMetadataId("user_settings", change.entityId),
						entityType: "user_settings",
						entityId: change.entityId,
						localVersion: getPayloadVersion(unresolved.at(-1)?.payload),
						remoteVersion: change.version,
						state: "conflict",
						lastSyncedAt: null,
						lastError: "REMOTE_CHANGE_WITH_LOCAL_OPERATIONS",
						updatedAt: now,
					});

					conflicts += 1;
					continue;
				}

				const now = new Date().toISOString();

				await db.userSettings.put(remotePayload as UserSettingsRecord);
				await db.syncMetadata.put({
					id: createSyncMetadataId("user_settings", change.entityId),
					entityType: "user_settings",
					entityId: change.entityId,
					localVersion: remotePayload.version,
					remoteVersion: change.version,
					state: "synced",
					lastSyncedAt: now,
					lastError: null,
					updatedAt: now,
				});

				applied += 1;
			}

			await db.syncCursors.put({
				id: createSyncCursorId(userId, "user_settings"),
				userId,
				entityType: "user_settings",
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
	const id = createSyncRuntimeId(userId, "user_settings");
	const existing = await db.syncRuntime.get(id);
	const now = new Date().toISOString();

	await db.syncRuntime.put({
		id,
		userId,
		entityType: "user_settings",
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
	return error instanceof Error ? error.message : "SETTINGS_SYNC_FAILED";
}
