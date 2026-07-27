import { getLocalDatabase } from "@/platform/database/local-database";
import { requestReminderSync } from "@/platform/sync/reminder-sync-events-client";
import {
	createSyncMetadataId,
	type SyncMetadataRecord,
	type SyncOperationRecord,
	type SyncOperationType,
} from "@/platform/sync/sync.types";
import type {
	ReminderCommitResult,
	ReminderWriteStore,
} from "../../application/ports/reminder-write-store";
import {
	isReminderDue,
	type Reminder,
	triggerReminderEntity,
} from "../../domain/reminder";
import { reminderFromRecord, reminderToRecord } from "./reminder.mapper";

export class DexieReminderWriteStore implements ReminderWriteStore {
	async commit(
		reminder: Reminder,
		requestedOperation: SyncOperationType,
		deviceId: string,
	): Promise<ReminderCommitResult> {
		const db = getLocalDatabase();

		const result = await db.transaction(
			"rw",
			db.reminders,
			db.syncOperations,
			db.syncMetadata,
			async () =>
				this.commitInsideTransaction(reminder, requestedOperation, deviceId),
		);

		requestReminderSync();
		return result;
	}

	async claimDue(
		userId: string,
		deviceId: string,
		now = new Date(),
	): Promise<Reminder[]> {
		const db = getLocalDatabase();

		const claimed = await db.transaction(
			"rw",
			db.reminders,
			db.syncOperations,
			db.syncMetadata,
			async () => {
				const records = await db.reminders
					.where("userId")
					.equals(userId)
					.toArray();

				const triggered: Reminder[] = [];

				for (const record of records) {
					const currentRecord = await db.reminders.get(record.id);

					if (!currentRecord) {
						continue;
					}

					const current = reminderFromRecord(currentRecord);

					if (!isReminderDue(current, now)) {
						continue;
					}

					const updated = triggerReminderEntity(current, now);

					await this.commitInsideTransaction(updated, "update", deviceId);

					triggered.push(updated);
				}

				return triggered;
			},
		);

		if (claimed.length > 0) {
			requestReminderSync();
		}

		return claimed;
	}

	private async commitInsideTransaction(
		reminder: Reminder,
		requestedOperation: SyncOperationType,
		deviceId: string,
	): Promise<ReminderCommitResult> {
		const db = getLocalDatabase();

		const existingOperations = await db.syncOperations
			.where("[entityType+entityId]")
			.equals(["reminder", reminder.id])
			.toArray();

		const compactableOperations = existingOperations.filter(
			(operation) => operation.status === "pending" && operation.attempts === 0,
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
			await db.reminders.delete(reminder.id);

			await db.syncOperations.bulkDelete(
				compactableOperations.map((operation) => operation.id),
			);

			await db.syncMetadata.delete(
				createSyncMetadataId("reminder", reminder.id),
			);

			return {
				type: "removed_local_only",
			};
		}

		const effectiveOperation =
			compactableCreate && requestedOperation === "update"
				? "create"
				: requestedOperation;

		const metadataId = createSyncMetadataId("reminder", reminder.id);

		const existingMetadata = await db.syncMetadata.get(metadataId);

		const now = new Date().toISOString();

		const operationId = crypto.randomUUID();

		const operation: SyncOperationRecord = {
			id: operationId,
			userId: reminder.userId,
			deviceId,
			entityType: "reminder",
			entityId: reminder.id,
			operation: effectiveOperation,
			payload:
				effectiveOperation === "delete"
					? {
							id: reminder.id,
							deletedAt: reminder.deletedAt,
							version: reminder.version,
						}
					: reminder,
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
			entityType: "reminder",
			entityId: reminder.id,
			localVersion: reminder.version,
			remoteVersion: existingMetadata?.remoteVersion ?? null,
			state: "pending",
			lastSyncedAt: existingMetadata?.lastSyncedAt ?? null,
			lastError: null,
			updatedAt: now,
		};

		await db.reminders.put(reminderToRecord(reminder));

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
		};
	}
}
