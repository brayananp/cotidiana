import type { LocalBackupRecord } from "#/modules/data-management/infrastructure/local/local-backup.record";
import type { BookRecord } from "#/modules/library/infrastructure/local/book.record";
import type { BookNoteRecord } from "#/modules/library/infrastructure/local/book-note.record";
import type { ReminderRecord } from "#/modules/reminders/infrastructure/local/reminder.record";
import Dexie, { type EntityTable } from "dexie";
import type { DailyReviewRecord } from "@/modules/dashboard/infrastructure/local/daily-review.record";
import type { CalendarEventRecord } from "@/modules/scheduling/infrastructure/local/calendar-event.record";
import type { TimeBlockRecord } from "@/modules/scheduling/infrastructure/local/time-block.record";
import type { LocalSecurityProfileRecord } from "@/modules/security/infrastructure/local/local-security.record";
import type { UserSettingsRecord } from "@/modules/settings/infrastructure/local/user-settings.record";
import type { TaskRecord } from "@/modules/tasks/infrastructure/local/task.record";
import type {
	SyncConflictRecord,
	SyncCursorRecord,
	SyncMetadataRecord,
	SyncOperationRecord,
	SyncRuntimeRecord,
} from "@/platform/sync/sync.types";

export type LocalDeviceRecord = {
	id: string;
	name: string;
	platform: string | null;
	createdAt: string;
	lastOpenedAt: string;
};

export type LocalIdentityRecord = {
	id: string;
	userId: string;
	deviceId: string;
	name: string;
	email: string;
	offlineAccessEnabled: boolean;
	remoteSignOutPending: boolean;
	initializedAt: string;
	lastAuthenticatedAt: string;
	remoteRegisteredAt: string | null;
	updatedAt: string;
};

export type ActiveProfileRecord = {
	id: "current";
	userId: string;
	deviceId: string;
	updatedAt: string;
};

export class ProductivityLocalDatabase extends Dexie {
	localDevices!: EntityTable<LocalDeviceRecord, "id">;
	localIdentities!: EntityTable<LocalIdentityRecord, "id">;
	activeProfile!: EntityTable<ActiveProfileRecord, "id">;
	tasks!: EntityTable<TaskRecord, "id">;
	timeBlocks!: EntityTable<TimeBlockRecord, "id">;
	calendarEvents!: EntityTable<CalendarEventRecord, "id">;
	reminders!: EntityTable<ReminderRecord, "id">;
	books!: EntityTable<BookRecord, "id">;
	bookNotes!: EntityTable<BookNoteRecord, "id">;
	localBackups!: EntityTable<LocalBackupRecord, "id">;
	localSecurityProfiles!: EntityTable<LocalSecurityProfileRecord, "id">;
	userSettings!: EntityTable<UserSettingsRecord, "id">;
	dailyReviews!: EntityTable<DailyReviewRecord, "id">;
	syncOperations!: EntityTable<SyncOperationRecord, "id">;
	syncMetadata!: EntityTable<SyncMetadataRecord, "id">;
	syncCursors!: EntityTable<SyncCursorRecord, "id">;
	syncConflicts!: EntityTable<SyncConflictRecord, "id">;
	syncRuntime!: EntityTable<SyncRuntimeRecord, "id">;

	constructor(databaseName = "personal-productivity-os") {
		super(databaseName);

		this.version(1).stores({
			localDevices: "id, createdAt, lastOpenedAt",
			localIdentities:
				"id, userId, deviceId, email, updatedAt, [userId+deviceId]",
			activeProfile: "id, userId, deviceId, updatedAt",
		});

		this.version(2)
			.stores({
				localDevices: "id, createdAt, lastOpenedAt",
				localIdentities:
					"id, userId, deviceId, email, updatedAt, [userId+deviceId]",
				activeProfile: "id, userId, deviceId, updatedAt",
			})
			.upgrade(async (transaction) => {
				await transaction
					.table<LocalIdentityRecord>("localIdentities")
					.toCollection()
					.modify((identity) => {
						identity.remoteSignOutPending ??= false;
					});
			});

		this.version(3).stores({
			localDevices: "id, createdAt, lastOpenedAt",
			localIdentities:
				"id, userId, deviceId, email, updatedAt, [userId+deviceId]",
			activeProfile: "id, userId, deviceId, updatedAt",
			tasks:
				"id, userId, status, priority, plannedAt, dueAt, updatedAt, deletedAt, [userId+status], [userId+updatedAt]",
			syncOperations:
				"id, userId, deviceId, status, entityType, entityId, createdAt, nextRetryAt, [entityType+entityId], [status+createdAt]",
			syncMetadata:
				"id, entityType, entityId, state, lastSyncedAt, [entityType+entityId]",
		});

		this.version(4).stores({
			localDevices: "id, createdAt, lastOpenedAt",
			localIdentities:
				"id, userId, deviceId, email, updatedAt, [userId+deviceId]",
			activeProfile: "id, userId, deviceId, updatedAt",
			tasks:
				"id, userId, status, priority, plannedAt, dueAt, updatedAt, deletedAt, [userId+status], [userId+updatedAt]",
			syncOperations:
				"id, userId, deviceId, status, entityType, entityId, createdAt, nextRetryAt, [entityType+entityId], [status+createdAt]",
			syncMetadata:
				"id, entityType, entityId, state, lastSyncedAt, [entityType+entityId]",
			syncCursors:
				"id, userId, entityType, cursor, updatedAt, [userId+entityType]",
			syncConflicts:
				"id, userId, entityType, entityId, createdAt, resolvedAt, [entityType+entityId], [userId+resolvedAt]",
			syncRuntime:
				"id, userId, entityType, state, updatedAt, [userId+entityType]",
		});
		this.version(5).stores({
			localDevices: "id, createdAt, lastOpenedAt",
			localIdentities:
				"id, userId, deviceId, email, updatedAt, [userId+deviceId]",
			activeProfile: "id, userId, deviceId, updatedAt",
			tasks:
				"id, userId, status, priority, plannedAt, dueAt, updatedAt, deletedAt, [userId+status], [userId+updatedAt]",
			timeBlocks:
				"id, userId, taskId, status, kind, startAt, endAt, updatedAt, deletedAt, [userId+startAt], [userId+updatedAt]",
			calendarEvents:
				"id, userId, eventType, startAt, endAt, updatedAt, deletedAt, [userId+startAt], [userId+updatedAt]",
			syncOperations:
				"id, userId, deviceId, status, entityType, entityId, createdAt, nextRetryAt, [entityType+entityId], [status+createdAt]",
			syncMetadata:
				"id, entityType, entityId, state, lastSyncedAt, [entityType+entityId]",
			syncCursors:
				"id, userId, entityType, cursor, updatedAt, [userId+entityType]",
			syncConflicts:
				"id, userId, entityType, entityId, createdAt, resolvedAt, [entityType+entityId], [userId+resolvedAt]",
			syncRuntime:
				"id, userId, entityType, state, updatedAt, [userId+entityType]",
		});
		this.version(6).stores({
			localDevices: "id, createdAt, lastOpenedAt",
			localIdentities:
				"id, userId, deviceId, email, updatedAt, [userId+deviceId]",
			activeProfile: "id, userId, deviceId, updatedAt",
			tasks:
				"id, userId, status, priority, plannedAt, dueAt, updatedAt, deletedAt, [userId+status], [userId+updatedAt]",
			timeBlocks:
				"id, userId, taskId, status, kind, startAt, endAt, updatedAt, deletedAt, [userId+startAt], [userId+updatedAt]",
			calendarEvents:
				"id, userId, eventType, startAt, endAt, updatedAt, deletedAt, [userId+startAt], [userId+updatedAt]",
			reminders:
				"id, userId, status, targetType, targetId, nextTriggerAt, updatedAt, deletedAt, [userId+status], [userId+nextTriggerAt], [userId+updatedAt]",
			syncOperations:
				"id, userId, deviceId, status, entityType, entityId, createdAt, nextRetryAt, [entityType+entityId], [status+createdAt]",
			syncMetadata:
				"id, entityType, entityId, state, lastSyncedAt, [entityType+entityId]",
			syncCursors:
				"id, userId, entityType, cursor, updatedAt, [userId+entityType]",
			syncConflicts:
				"id, userId, entityType, entityId, createdAt, resolvedAt, [entityType+entityId], [userId+resolvedAt]",
			syncRuntime:
				"id, userId, entityType, state, updatedAt, [userId+entityType]",
		});
		this.version(7).stores({
			localDevices: "id, createdAt, lastOpenedAt",
			localIdentities:
				"id, userId, deviceId, email, updatedAt, [userId+deviceId]",
			activeProfile: "id, userId, deviceId, updatedAt",
			tasks:
				"id, userId, status, priority, plannedAt, dueAt, updatedAt, deletedAt, [userId+status], [userId+updatedAt]",
			timeBlocks:
				"id, userId, taskId, status, kind, startAt, endAt, updatedAt, deletedAt, [userId+startAt], [userId+updatedAt]",
			calendarEvents:
				"id, userId, eventType, startAt, endAt, updatedAt, deletedAt, [userId+startAt], [userId+updatedAt]",
			reminders:
				"id, userId, status, targetType, targetId, nextTriggerAt, updatedAt, deletedAt, [userId+status], [userId+nextTriggerAt], [userId+updatedAt]",
			books:
				"id, userId, status, title, author, isbn, updatedAt, deletedAt, [userId+status], [userId+updatedAt]",
			bookNotes:
				"id, userId, bookId, type, page, updatedAt, deletedAt, [userId+bookId], [bookId+page], [userId+updatedAt]",
			syncOperations:
				"id, userId, deviceId, status, entityType, entityId, createdAt, nextRetryAt, [entityType+entityId], [status+createdAt]",
			syncMetadata:
				"id, entityType, entityId, state, lastSyncedAt, [entityType+entityId]",
			syncCursors:
				"id, userId, entityType, cursor, updatedAt, [userId+entityType]",
			syncConflicts:
				"id, userId, entityType, entityId, createdAt, resolvedAt, [entityType+entityId], [userId+resolvedAt]",
			syncRuntime:
				"id, userId, entityType, state, updatedAt, [userId+entityType]",
		});
		this.version(8)
			.stores({
				localDevices: "id, createdAt, lastOpenedAt",
				localIdentities:
					"id, userId, deviceId, email, updatedAt, [userId+deviceId]",
				activeProfile: "id, userId, deviceId, updatedAt",
				tasks:
					"id, userId, status, priority, plannedAt, dueAt, updatedAt, deletedAt, [userId+status], [userId+updatedAt]",
				timeBlocks:
					"id, userId, taskId, status, kind, startAt, endAt, updatedAt, deletedAt, [userId+startAt], [userId+updatedAt]",
				calendarEvents:
					"id, userId, eventType, startAt, endAt, updatedAt, deletedAt, [userId+startAt], [userId+updatedAt]",
				reminders:
					"id, userId, status, targetType, targetId, nextTriggerAt, updatedAt, deletedAt, [userId+status], [userId+nextTriggerAt], [userId+updatedAt]",
				books:
					"id, userId, status, title, author, isbn, updatedAt, deletedAt, [userId+status], [userId+updatedAt]",
				bookNotes:
					"id, userId, bookId, type, page, updatedAt, deletedAt, [userId+bookId], [bookId+page], [userId+updatedAt]",
				localBackups:
					"id, userId, reason, createdAt, schemaVersion, [userId+createdAt]",
				syncOperations:
					"id, userId, deviceId, status, entityType, entityId, createdAt, nextRetryAt, [entityType+entityId], [status+createdAt]",
				syncMetadata:
					"id, entityType, entityId, state, lastSyncedAt, [entityType+entityId]",
				syncCursors:
					"id, userId, entityType, cursor, updatedAt, [userId+entityType]",
				syncConflicts:
					"id, userId, entityType, entityId, createdAt, resolvedAt, [entityType+entityId], [userId+resolvedAt]",
				syncRuntime:
					"id, userId, entityType, state, updatedAt, [userId+entityType]",
			})
			.upgrade(async (transaction) => {
				await transaction
					.table("syncConflicts")
					.toCollection()
					.modify((conflict: Record<string, unknown>) => {
						conflict.resolution ??= null;
						conflict.resolvedPayload ??= null;
					});
			});
		this.version(9).stores({
			localDevices: "id, createdAt, lastOpenedAt",
			localIdentities:
				"id, userId, deviceId, email, updatedAt, [userId+deviceId]",
			activeProfile: "id, userId, deviceId, updatedAt",
			localSecurityProfiles: "id, userId, enabled, lockedUntil, updatedAt",
			userSettings:
				"id, userId, locale, startPage, updatedAt, deletedAt, [userId+updatedAt]",
			tasks:
				"id, userId, status, priority, plannedAt, dueAt, updatedAt, deletedAt, [userId+status], [userId+updatedAt]",
			timeBlocks:
				"id, userId, taskId, status, kind, startAt, endAt, updatedAt, deletedAt, [userId+startAt], [userId+updatedAt]",
			calendarEvents:
				"id, userId, eventType, startAt, endAt, updatedAt, deletedAt, [userId+startAt], [userId+updatedAt]",
			reminders:
				"id, userId, status, targetType, targetId, nextTriggerAt, updatedAt, deletedAt, [userId+status], [userId+nextTriggerAt], [userId+updatedAt]",
			books:
				"id, userId, status, title, author, isbn, updatedAt, deletedAt, [userId+status], [userId+updatedAt]",
			bookNotes:
				"id, userId, bookId, type, page, updatedAt, deletedAt, [userId+bookId], [bookId+page], [userId+updatedAt]",
			localBackups:
				"id, userId, reason, createdAt, schemaVersion, [userId+createdAt]",
			syncOperations:
				"id, userId, deviceId, status, entityType, entityId, createdAt, nextRetryAt, [entityType+entityId], [status+createdAt]",
			syncMetadata:
				"id, entityType, entityId, state, lastSyncedAt, [entityType+entityId]",
			syncCursors:
				"id, userId, entityType, cursor, updatedAt, [userId+entityType]",
			syncConflicts:
				"id, userId, entityType, entityId, createdAt, resolvedAt, [entityType+entityId], [userId+resolvedAt]",
			syncRuntime:
				"id, userId, entityType, state, updatedAt, [userId+entityType]",
		});
		this.version(10).stores({
			dailyReviews:
				"id, userId, reviewDate, completedAt, updatedAt, deletedAt, [userId+reviewDate], [userId+updatedAt]",
		});
		this.version(11).stores({
			syncOperations:
				"id, userId, deviceId, status, entityType, entityId, createdAt, nextRetryAt, [entityType+entityId], [status+createdAt], [userId+status]",
		});
		this.version(12).stores({
			tasks:
				"id, userId, status, priority, plannedAt, dueAt, completedAt, updatedAt, deletedAt, [userId+status], [userId+completedAt], [userId+updatedAt]",
		});
	}
}

let database: ProductivityLocalDatabase | null = null;

export function getLocalDatabase(): ProductivityLocalDatabase {
	if (typeof window === "undefined") {
		throw new Error("The local database is only available in the browser");
	}

	database ??= new ProductivityLocalDatabase();
	return database;
}
