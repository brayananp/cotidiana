import { getLocalDatabase } from "@/platform/database/local-database";
import type { SyncEntityType, SyncOperationRecord } from "./sync.types";
import {
	deleteEntitySnapshot,
	isDomainSyncEntityType,
} from "./sync-entity-registry-client";
import { requestSync } from "./sync-request-events-client";

export function requestAllSync(): void {
	requestSync("all");
}

export async function retryFailedOperations(userId: string): Promise<number> {
	const db = getLocalDatabase();
	const operations = await db.syncOperations
		.where("userId")
		.equals(userId)
		.toArray();

	const failed = operations.filter(
		(operation) => operation.status === "failed",
	);

	const now = new Date().toISOString();

	await db.transaction("rw", db.syncOperations, db.syncMetadata, async () => {
		for (const operation of failed) {
			await db.syncOperations.update(operation.id, {
				status: "pending",
				attempts: 0,
				nextRetryAt: null,
				lastError: null,
				updatedAt: now,
			});

			await db.syncMetadata.update(
				`${operation.entityType}:${operation.entityId}`,
				{
					state: "pending",
					lastError: null,
					updatedAt: now,
				},
			);
		}
	});

	if (failed.length > 0) {
		requestAllSync();
	}

	return failed.length;
}

export async function discardRejectedOperation(
	operationId: string,
	userId: string,
): Promise<void> {
	const db = getLocalDatabase();
	const operation = await db.syncOperations.get(operationId);

	if (!operation) {
		return;
	}

	if (operation.userId !== userId) {
		throw new Error("SYNC_OPERATION_FORBIDDEN");
	}

	if (operation.status !== "rejected") {
		throw new Error("SYNC_OPERATION_NOT_REJECTED");
	}

	const now = new Date().toISOString();

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
			db.syncCursors,
		],
		async () => {
			if (
				operation.operation === "create" &&
				isDomainSyncEntityType(operation.entityType)
			) {
				await deleteEntitySnapshot(operation.entityType, operation.entityId);
			}

			await db.syncOperations.delete(operation.id);

			await db.syncMetadata.delete(
				`${operation.entityType}:${operation.entityId}`,
			);

			await resetEntityCursor(userId, operation.entityType, now);
		},
	);

	requestSyncForEntity(operation.entityType);
}

export async function clearResolvedConflicts(userId: string): Promise<number> {
	const db = getLocalDatabase();
	const conflicts = await db.syncConflicts
		.where("userId")
		.equals(userId)
		.toArray();

	const resolved = conflicts.filter((conflict) => conflict.resolvedAt !== null);

	await db.syncConflicts.bulkDelete(resolved.map((conflict) => conflict.id));

	return resolved.length;
}

export function requestSyncForEntity(entityType: SyncEntityType): void {
	if (entityType === "task") {
		requestSync("tasks");
		return;
	}

	if (entityType === "time_block" || entityType === "calendar_event") {
		requestSync("scheduling");
		return;
	}

	if (entityType === "reminder") {
		requestSync("reminders");
		return;
	}

	if (entityType === "book" || entityType === "book_note") {
		requestSync("library");
		return;
	}

	if (entityType === "user_settings") {
		requestSync("settings");
		return;
	}

	if (entityType === "daily_review") {
		requestSync("daily-review");
	}
}

async function resetEntityCursor(
	userId: string,
	entityType: SyncEntityType,
	updatedAt: string,
): Promise<void> {
	const db = getLocalDatabase();

	if (entityType === "user_settings") {
		return;
	}

	await db.syncCursors.put({
		id: `${userId}:${entityType}`,
		userId,
		entityType,
		cursor: 0,
		updatedAt,
	});
}

export function sortOperations(
	operations: SyncOperationRecord[],
): SyncOperationRecord[] {
	return [...operations].sort((left, right) =>
		right.updatedAt.localeCompare(left.updatedAt),
	);
}
