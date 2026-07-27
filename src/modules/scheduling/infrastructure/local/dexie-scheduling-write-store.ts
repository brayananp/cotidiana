import { getLocalDatabase } from "@/platform/database/local-database";
import { requestSchedulingSync } from "@/platform/sync/scheduling-sync-events-client";
import {
	createSyncMetadataId,
	type SyncMetadataRecord,
	type SyncOperationRecord,
	type SyncOperationType,
} from "@/platform/sync/sync.types";
import type {
	ScheduleCommitResult,
	SchedulingWriteStore,
} from "../../application/ports/scheduling-write-store";
import type { CalendarEvent } from "../../domain/calendar-event";
import type { TimeBlock } from "../../domain/time-block";
import { calendarEventToRecord, timeBlockToRecord } from "./scheduling.mapper";

type SchedulingEntity =
	| {
			entityType: "time_block";
			item: TimeBlock;
	  }
	| {
			entityType: "calendar_event";
			item: CalendarEvent;
	  };

export class DexieSchedulingWriteStore implements SchedulingWriteStore {
	async commitTimeBlock(
		block: TimeBlock,
		operation: SyncOperationType,
		deviceId: string,
	): Promise<ScheduleCommitResult> {
		return this.commit(
			{
				entityType: "time_block",
				item: block,
			},
			operation,
			deviceId,
		);
	}

	async commitCalendarEvent(
		event: CalendarEvent,
		operation: SyncOperationType,
		deviceId: string,
	): Promise<ScheduleCommitResult> {
		return this.commit(
			{
				entityType: "calendar_event",
				item: event,
			},
			operation,
			deviceId,
		);
	}

	private async commit(
		entity: SchedulingEntity,
		requestedOperation: SyncOperationType,
		deviceId: string,
	): Promise<ScheduleCommitResult> {
		const db = getLocalDatabase();
		const item = entity.item;

		const result = await db.transaction(
			"rw",
			db.timeBlocks,
			db.calendarEvents,
			db.syncOperations,
			db.syncMetadata,
			async () => {
				const existingOperations = await db.syncOperations
					.where("[entityType+entityId]")
					.equals([entity.entityType, item.id])
					.toArray();

				const compactableOperations = existingOperations.filter(
					(operation) =>
						operation.status === "pending" && operation.attempts === 0,
				);

				const compactableCreate = compactableOperations.find(
					(operation) => operation.operation === "create",
				);

				const compactableIds = new Set(
					compactableOperations.map((operation) => operation.id),
				);

				const nonCompactableOperations = existingOperations.filter(
					(operation) => !compactableIds.has(operation.id),
				);

				if (
					requestedOperation === "delete" &&
					compactableCreate &&
					nonCompactableOperations.length === 0
				) {
					if (entity.entityType === "time_block") {
						await db.timeBlocks.delete(item.id);
					} else {
						await db.calendarEvents.delete(item.id);
					}

					await db.syncOperations.bulkDelete(
						compactableOperations.map((operation) => operation.id),
					);

					await db.syncMetadata.delete(
						createSyncMetadataId(entity.entityType, item.id),
					);

					return {
						type: "removed_local_only",
					} satisfies ScheduleCommitResult;
				}

				const effectiveOperation =
					compactableCreate && requestedOperation === "update"
						? "create"
						: requestedOperation;

				const metadataId = createSyncMetadataId(entity.entityType, item.id);

				const existingMetadata = await db.syncMetadata.get(metadataId);

				const now = new Date().toISOString();
				const operationId = crypto.randomUUID();

				const operation: SyncOperationRecord = {
					id: operationId,
					userId: item.userId,
					deviceId,
					entityType: entity.entityType,
					entityId: item.id,
					operation: effectiveOperation,
					payload:
						effectiveOperation === "delete"
							? {
									id: item.id,
									deletedAt: item.deletedAt,
									version: item.version,
								}
							: item,
					baseVersion:
						effectiveOperation === "create"
							? null
							: (existingMetadata?.remoteVersion ?? null),
					status: "pending",
					attempts: 0,
					nextRetryAt: null,
					lastError: null,
					createdAt: compactableOperations[0]?.createdAt ?? now,
					updatedAt: now,
				};

				const metadata: SyncMetadataRecord = {
					id: metadataId,
					entityType: entity.entityType,
					entityId: item.id,
					localVersion: item.version,
					remoteVersion: existingMetadata?.remoteVersion ?? null,
					state: "pending",
					lastSyncedAt: existingMetadata?.lastSyncedAt ?? null,
					lastError: null,
					updatedAt: now,
				};

				if (entity.entityType === "time_block") {
					await db.timeBlocks.put(timeBlockToRecord(entity.item));
				} else {
					await db.calendarEvents.put(calendarEventToRecord(entity.item));
				}

				if (compactableOperations.length) {
					await db.syncOperations.bulkDelete(
						compactableOperations.map((operation) => operation.id),
					);
				}

				await db.syncOperations.put(operation);
				await db.syncMetadata.put(metadata);

				return {
					type: "queued",
					operationId,
				} satisfies ScheduleCommitResult;
			},
		);

		requestSchedulingSync();
		return result;
	}
}
