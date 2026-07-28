import { getLocalDatabase } from "@/platform/database/local-database";
import {
	type ConflictResolution,
	createSyncCursorId,
	createSyncMetadataId,
	type Json,
	type SyncConflictRecord,
	type SyncOperationRecord,
	type SyncOperationType,
} from "./sync.types";
import { requestSyncForEntity } from "./sync-center-client";
import {
	cloneEntitySnapshot,
	type DomainSyncEntityType,
	deleteEntitySnapshot,
	type EntitySnapshot,
	getEntitySnapshot,
	isDomainSyncEntityType,
	parseEntitySnapshot,
	putEntitySnapshot,
} from "./sync-entity-registry-client";

export type ResolveConflictInput = {
	conflictId: string;
	userId: string;
	deviceId: string;
	resolution: ConflictResolution;
	mergedPayload?: unknown;
};

export async function resolveSyncConflict(
	input: ResolveConflictInput,
): Promise<void> {
	const db = getLocalDatabase();
	const conflict = await db.syncConflicts.get(input.conflictId);

	if (!conflict) {
		throw new Error("SYNC_CONFLICT_NOT_FOUND");
	}

	if (conflict.userId !== input.userId) {
		throw new Error("SYNC_CONFLICT_FORBIDDEN");
	}

	if (conflict.resolvedAt) {
		throw new Error("SYNC_CONFLICT_ALREADY_RESOLVED");
	}

	if (!isDomainSyncEntityType(conflict.entityType)) {
		throw new Error("SYNC_ENTITY_NOT_SUPPORTED");
	}

	const operations = await getEntityOperations(conflict);

	const originalOperation =
		operations
			.slice()
			.sort((left, right) =>
				left.createdAt.localeCompare(right.createdAt),
			)[0] ?? null;

	const overlapConflict = isScheduleOverlapConflict(conflict);

	await db.transaction(
		"rw",
		[
			db.tasks,
			db.timeBlocks,
			db.calendarEvents,
			db.reminders,
			db.books,
			db.bookNotes,
			db.userSettings,
			db.dailyReviews,
			db.syncOperations,
			db.syncMetadata,
			db.syncConflicts,
			db.syncCursors,
		],
		async () => {
			switch (input.resolution) {
				case "accept_remote":
					if (overlapConflict) {
						throw new Error("REMOTE_PAYLOAD_IS_OVERLAP_BLOCKER");
					}

					await acceptRemote(conflict, operations);
					break;

				case "keep_local":
					if (overlapConflict) {
						throw new Error("OVERLAP_REQUIRES_MANUAL_MERGE");
					}

					await keepLocal(
						conflict,
						operations,
						originalOperation,
						input.deviceId,
					);
					break;

				case "duplicate_local":
					if (overlapConflict) {
						throw new Error("OVERLAP_REQUIRES_MANUAL_MERGE");
					}

					await duplicateLocal(conflict, operations, input.deviceId);
					break;

				case "merge_manual":
					if (input.mergedPayload === undefined) {
						throw new Error("MERGED_PAYLOAD_REQUIRED");
					}

					await mergeManual(
						conflict,
						operations,
						originalOperation,
						input.deviceId,
						input.mergedPayload,
						overlapConflict,
					);
					break;

				case "discard_local":
					await discardLocal(
						conflict,
						operations,
						originalOperation,
						overlapConflict,
					);
					break;
			}
		},
	);

	requestSyncForEntity(conflict.entityType);
}

async function acceptRemote(
	conflict: SyncConflictRecord,
	operations: SyncOperationRecord[],
): Promise<void> {
	const entityType = requireDomainEntityType(conflict.entityType);

	const remote = forceIdentity(
		parseEntitySnapshot(entityType, conflict.remotePayload),
		conflict,
	);

	await putEntitySnapshot(entityType, remote);

	await removeOperations(operations);
	await markMetadataSynced(conflict, remote);

	await markConflictResolved(conflict, "accept_remote", remote);
}

async function keepLocal(
	conflict: SyncConflictRecord,
	operations: SyncOperationRecord[],
	originalOperation: SyncOperationRecord | null,
	deviceId: string,
): Promise<void> {
	const entityType = requireDomainEntityType(conflict.entityType);

	const remote = forceIdentity(
		parseEntitySnapshot(entityType, conflict.remotePayload),
		conflict,
	);

	if (remote.deletedAt) {
		await duplicateLocal(conflict, operations, deviceId);
		return;
	}

	const current = await getEntitySnapshot(entityType, conflict.entityId);

	const operationType =
		originalOperation?.operation === "delete" ? "delete" : "update";

	let local: EntitySnapshot;

	if (operationType === "delete") {
		if (!current) {
			throw new Error("LOCAL_ENTITY_NOT_FOUND");
		}

		local = current;
	} else {
		local = forceIdentity(
			current ?? parseEntitySnapshot(entityType, conflict.localPayload),
			conflict,
		);

		await putEntitySnapshot(entityType, local);
	}

	await removeOperations(operations);

	await queueResolutionOperation({
		conflict,
		local,
		operation: operationType,
		baseVersion: conflict.remoteVersion,
		deviceId,
	});

	await markConflictResolved(conflict, "keep_local", local);
}

async function duplicateLocal(
	conflict: SyncConflictRecord,
	operations: SyncOperationRecord[],
	deviceId: string,
): Promise<void> {
	const entityType = requireDomainEntityType(conflict.entityType);

	const current = await getEntitySnapshot(entityType, conflict.entityId);

	const local = forceIdentity(
		current ?? parseEntitySnapshot(entityType, conflict.localPayload),
		conflict,
	);

	const remote = forceIdentity(
		parseEntitySnapshot(entityType, conflict.remotePayload),
		conflict,
	);

	const duplicate = cloneEntitySnapshot(entityType, local, conflict.userId);

	await putEntitySnapshot(entityType, remote);

	await putEntitySnapshot(entityType, duplicate);

	await removeOperations(operations);
	await markMetadataSynced(conflict, remote);

	await queueCreateOperation(entityType, duplicate, deviceId);

	await markConflictResolved(conflict, "duplicate_local", duplicate);
}

async function mergeManual(
	conflict: SyncConflictRecord,
	operations: SyncOperationRecord[],
	originalOperation: SyncOperationRecord | null,
	deviceId: string,
	mergedPayload: unknown,
	overlapConflict: boolean,
): Promise<void> {
	const entityType = requireDomainEntityType(conflict.entityType);

	const merged = forceIdentity(
		parseEntitySnapshot(entityType, mergedPayload),
		conflict,
	);

	const operation =
		originalOperation?.operation === "create"
			? overlapConflict
				? "create"
				: "update"
			: (originalOperation?.operation ?? "update");

	const baseVersion =
		operation === "create"
			? null
			: overlapConflict
				? (originalOperation?.baseVersion ?? conflict.remoteVersion)
				: conflict.remoteVersion;

	await putEntitySnapshot(entityType, merged);

	await removeOperations(operations);

	await queueResolutionOperation({
		conflict,
		local: merged,
		operation,
		baseVersion,
		deviceId,
	});

	await markConflictResolved(conflict, "merge_manual", merged);
}

async function discardLocal(
	conflict: SyncConflictRecord,
	operations: SyncOperationRecord[],
	originalOperation: SyncOperationRecord | null,
	overlapConflict: boolean,
): Promise<void> {
	if (!overlapConflict) {
		await acceptRemote(conflict, operations);

		await getLocalDatabase().syncConflicts.update(conflict.id, {
			resolution: "discard_local",
		});

		return;
	}

	const db = getLocalDatabase();
	const entityType = requireDomainEntityType(conflict.entityType);

	await removeOperations(operations);
	await deleteEntitySnapshot(entityType, conflict.entityId);

	await db.syncMetadata.delete(
		createSyncMetadataId(entityType, conflict.entityId),
	);

	if (originalOperation?.operation !== "create") {
		await db.syncCursors.put({
			id: createSyncCursorId(conflict.userId, entityType),
			userId: conflict.userId,
			entityType,
			cursor: 0,
			updatedAt: new Date().toISOString(),
		});
	}

	await markConflictResolved(conflict, "discard_local", null);
}

async function queueResolutionOperation(input: {
	conflict: SyncConflictRecord;
	local: EntitySnapshot;
	operation: SyncOperationType;
	baseVersion: number | null;
	deviceId: string;
}): Promise<void> {
	const db = getLocalDatabase();
	const now = new Date().toISOString();

	const operation: SyncOperationRecord = {
		id: crypto.randomUUID(),
		userId: input.conflict.userId,
		deviceId: input.deviceId,
		entityType: input.conflict.entityType,
		entityId: input.conflict.entityId,
		operation: input.operation,
		payload:
			input.operation === "delete"
				? {
						id: input.local.id,
						deletedAt: input.local.deletedAt ?? now,
						version: input.local.version,
					}
				: input.local,
		baseVersion: input.operation === "create" ? null : input.baseVersion,
		status: "pending",
		attempts: 0,
		nextRetryAt: null,
		lastError: null,
		createdAt: now,
		updatedAt: now,
	};

	await db.syncOperations.put(operation);

	await db.syncMetadata.put({
		id: createSyncMetadataId(
			input.conflict.entityType,
			input.conflict.entityId,
		),
		entityType: input.conflict.entityType,
		entityId: input.conflict.entityId,
		localVersion: input.local.version,
		remoteVersion: input.baseVersion,
		state: "pending",
		lastSyncedAt: null,
		lastError: null,
		updatedAt: now,
	});
}

async function queueCreateOperation(
	entityType: DomainSyncEntityType,
	snapshot: EntitySnapshot,
	deviceId: string,
): Promise<void> {
	const db = getLocalDatabase();
	const now = new Date().toISOString();

	await db.syncOperations.put({
		id: crypto.randomUUID(),
		userId: snapshot.userId,
		deviceId,
		entityType,
		entityId: snapshot.id,
		operation: "create",
		payload: snapshot,
		baseVersion: null,
		status: "pending",
		attempts: 0,
		nextRetryAt: null,
		lastError: null,
		createdAt: now,
		updatedAt: now,
	});

	await db.syncMetadata.put({
		id: createSyncMetadataId(entityType, snapshot.id),
		entityType,
		entityId: snapshot.id,
		localVersion: snapshot.version,
		remoteVersion: null,
		state: "pending",
		lastSyncedAt: null,
		lastError: null,
		updatedAt: now,
	});
}

async function markMetadataSynced(
	conflict: SyncConflictRecord,
	snapshot: EntitySnapshot,
): Promise<void> {
	const now = new Date().toISOString();

	await getLocalDatabase().syncMetadata.put({
		id: createSyncMetadataId(conflict.entityType, conflict.entityId),
		entityType: conflict.entityType,
		entityId: conflict.entityId,
		localVersion: snapshot.version,
		remoteVersion: conflict.remoteVersion,
		state: "synced",
		lastSyncedAt: now,
		lastError: null,
		updatedAt: now,
	});
}

async function markConflictResolved(
	conflict: SyncConflictRecord,
	resolution: ConflictResolution,
	payload: Json | null,
): Promise<void> {
	await getLocalDatabase().syncConflicts.update(conflict.id, {
		resolvedAt: new Date().toISOString(),
		resolution,
		resolvedPayload: payload,
	});
}

async function removeOperations(
	operations: SyncOperationRecord[],
): Promise<void> {
	await getLocalDatabase().syncOperations.bulkDelete(
		operations.map((operation) => operation.id),
	);
}

async function getEntityOperations(
	conflict: SyncConflictRecord,
): Promise<SyncOperationRecord[]> {
	const db = getLocalDatabase();

	const byEntity = await db.syncOperations
		.where("[entityType+entityId]")
		.equals([conflict.entityType, conflict.entityId])
		.toArray();

	const operationIds = new Set(conflict.localOperationIds);

	const byId = await Promise.all(
		conflict.localOperationIds.map((id) => db.syncOperations.get(id)),
	);

	const all = [
		...byEntity,
		...byId.filter((operation): operation is SyncOperationRecord =>
			Boolean(operation),
		),
	];

	const unique = new Map(all.map((operation) => [operation.id, operation]));

	for (const id of operationIds) {
		if (!unique.has(id)) {
		}
	}

	return Array.from(unique.values());
}

function forceIdentity(
	snapshot: EntitySnapshot,
	conflict: SyncConflictRecord,
): EntitySnapshot {
	return {
		...snapshot,
		id: conflict.entityId,
		userId: conflict.userId,
	};
}

function requireDomainEntityType(
	entityType: SyncConflictRecord["entityType"],
): DomainSyncEntityType {
	if (!isDomainSyncEntityType(entityType)) {
		throw new Error("SYNC_ENTITY_NOT_SUPPORTED");
	}

	return entityType;
}

export function isScheduleOverlapConflict(
	conflict: Pick<SyncConflictRecord, "reason">,
): boolean {
	return conflict.reason.startsWith("SCHEDULE_OVERLAP");
}
