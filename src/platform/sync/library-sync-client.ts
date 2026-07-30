import type { BookRecord } from "@/modules/library/infrastructure/local/book.record";
import type { BookNoteRecord } from "@/modules/library/infrastructure/local/book-note.record";
import { getLocalDatabase } from "@/platform/database/local-database";
import {
	pullLibraryChangesFn,
	pushLibraryOperationsFn,
} from "./library-sync.functions";
import {
	type BookNoteSyncSnapshot,
	type BookSyncSnapshot,
	bookNoteSyncSnapshotSchema,
	bookSyncSnapshotSchema,
} from "./library-sync.schemas";
import { getNextRetryAt } from "./retry-policy";
import {
	createSyncCursorId,
	createSyncMetadataId,
	createSyncRuntimeId,
	type PullLibraryChange,
	type PushOperationResult,
	type SyncEntityType,
	type SyncOperationRecord,
	type SyncRuntimeState,
} from "./sync.types";
import { withLibrarySyncLock } from "./sync-lock-client";

const ENTITY_TYPES = ["book", "book_note"] as const;

const PUSH_BATCH_SIZE = 50;
const PULL_BATCH_SIZE = 100;
const MAX_BATCHES_PER_RUN = 10;
const STALE_PROCESSING_MS = 2 * 60_000;

export type RunLibrarySyncInput = {
	userId: string;
	deviceId: string;
};

export type RunLibrarySyncResult = {
	pushed: number;
	pulled: number;
	conflicts: number;
	rejected: number;
};

export async function runLibrarySync(
	input: RunLibrarySyncInput,
): Promise<RunLibrarySyncResult | null> {
	return withLibrarySyncLock(input, async () => {
		await setRuntimeState(input.userId, "syncing", null, true);

		try {
			await recoverStaleOperations(input.userId, input.deviceId);

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
					const response = await pushLibraryOperationsFn({
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

			for (const entityType of ENTITY_TYPES) {
				for (let batch = 0; batch < MAX_BATCHES_PER_RUN; batch += 1) {
					const cursor = await getCursor(input.userId, entityType);

					const response = await pullLibraryChangesFn({
						data: {
							deviceId: input.deviceId,
							entityType,
							cursor,
							limit: PULL_BATCH_SIZE,
						},
					});

					const result = await applyPullChanges(
						input.userId,
						entityType,
						response.changes,
						response.nextCursor,
					);

					pulled += result.applied;
					conflicts += result.conflicts;

					if (!response.hasMore) {
						break;
					}
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
				!isLibraryEntityType(operation.entityType) ||
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

		const conflictedKeys = new Set(
			conflictMetadata
				.filter((metadata) => isLibraryEntityType(metadata.entityType))
				.map((metadata) => `${metadata.entityType}:${metadata.entityId}`),
		);

		const ordered = candidates
			.filter(
				(operation) =>
					operation.deviceId === deviceId &&
					isLibraryEntityType(operation.entityType) &&
					(operation.status === "pending" || operation.status === "failed") &&
					(!operation.nextRetryAt || new Date(operation.nextRetryAt) <= now) &&
					!conflictedKeys.has(`${operation.entityType}:${operation.entityId}`),
			)
			.sort((left, right) => left.createdAt.localeCompare(right.createdAt));

		const selected: SyncOperationRecord[] = [];

		const seenEntities = new Set<string>();

		for (const operation of ordered) {
			const key = `${operation.entityType}:${operation.entityId}`;

			if (seenEntities.has(key)) {
				continue;
			}

			seenEntities.add(key);
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
	if (!isLibraryEntityType(operation.entityType)) {
		throw new Error("INVALID_LIBRARY_ENTITY");
	}

	return {
		operationId: operation.id,
		entityType: operation.entityType,
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

	const snapshot = parseSnapshot(operation.entityType, rawSnapshot);

	await db.transaction(
		"rw",
		db.books,
		db.bookNotes,
		db.syncOperations,
		db.syncMetadata,
		async () => {
			if (operation.entityType === "book") {
				await db.books.put(snapshot as BookRecord);
			} else {
				await db.bookNotes.put(snapshot as BookNoteRecord);
			}

			await db.syncOperations.delete(operation.id);

			await db.syncMetadata.put({
				id: createSyncMetadataId(operation.entityType, operation.entityId),
				entityType: operation.entityType,
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
				.equals([operation.entityType, operation.entityId])
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
					createSyncMetadataId(operation.entityType, operation.entityId),
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
				id: createSyncMetadataId(operation.entityType, operation.entityId),
				entityType: operation.entityType,
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
				entityType: operation.entityType,
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
			createSyncMetadataId(operation.entityType, operation.entityId),
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
				createSyncMetadataId(operation.entityType, operation.entityId),
				{
					state: "failed",
					lastError: errorMessage,
					updatedAt: nowIso,
				},
			);
		}
	});
}

async function getCursor(
	userId: string,
	entityType: "book" | "book_note",
): Promise<number> {
	const cursor = await getLocalDatabase().syncCursors.get(
		createSyncCursorId(userId, entityType),
	);

	return cursor?.cursor ?? 0;
}

async function applyPullChanges(
	userId: string,
	entityType: "book" | "book_note",
	changes: PullLibraryChange[],
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
		[
			db.books,
			db.bookNotes,
			db.syncOperations,
			db.syncMetadata,
			db.syncCursors,
			db.syncConflicts,
		],
		async () => {
			for (const change of changes) {
				const unresolved = await db.syncOperations
					.where("[entityType+entityId]")
					.equals([change.entityType, change.entityId])
					.filter((operation) => operation.status !== "rejected")
					.toArray();

				if (unresolved.length > 0) {
					const conflictId = `${change.entityType}:${change.entityId}:pull:${change.version}`;

					await db.syncConflicts.put({
						id: conflictId,
						userId,
						entityType: change.entityType,
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
						id: createSyncMetadataId(change.entityType, change.entityId),
						entityType: change.entityType,
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

				const snapshot = parseSnapshot(change.entityType, change.payload);

				if (change.entityType === "book") {
					await db.books.put(snapshot as BookRecord);
				} else {
					await db.bookNotes.put(snapshot as BookNoteRecord);
				}

				const now = new Date().toISOString();

				await db.syncMetadata.put({
					id: createSyncMetadataId(change.entityType, change.entityId),
					entityType: change.entityType,
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
				id: createSyncCursorId(userId, entityType),
				userId,
				entityType,
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

	await db.transaction("rw", db.syncRuntime, async () => {
		for (const entityType of ENTITY_TYPES) {
			const id = createSyncRuntimeId(userId, entityType);

			const existing = await db.syncRuntime.get(id);

			await db.syncRuntime.put({
				id,
				userId,
				entityType,
				state,
				lastStartedAt: started ? now : (existing?.lastStartedAt ?? null),
				lastCompletedAt:
					state === "idle" ? now : (existing?.lastCompletedAt ?? null),
				lastError: error,
				updatedAt: now,
			});
		}
	});
}

function parseSnapshot(
	entityType: SyncEntityType,
	value: unknown,
): BookSyncSnapshot | BookNoteSyncSnapshot {
	if (entityType === "book") {
		return bookSyncSnapshotSchema.parse(value);
	}

	if (entityType === "book_note") {
		return bookNoteSyncSnapshotSchema.parse(value);
	}

	throw new Error("INVALID_LIBRARY_ENTITY");
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

function isLibraryEntityType(
	value: SyncEntityType,
): value is "book" | "book_note" {
	return value === "book" || value === "book_note";
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : "LIBRARY_SYNC_FAILED";
}
