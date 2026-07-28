import type { BookRecord } from "@/modules/library/infrastructure/local/book.record";
import type { BookNoteRecord } from "@/modules/library/infrastructure/local/book-note.record";
import type { ReminderRecord } from "@/modules/reminders/infrastructure/local/reminder.record";
import type { CalendarEventRecord } from "@/modules/scheduling/infrastructure/local/calendar-event.record";
import type { TimeBlockRecord } from "@/modules/scheduling/infrastructure/local/time-block.record";
import type { UserSettingsRecord } from "@/modules/settings/infrastructure/local/user-settings.record";
import type { TaskRecord } from "@/modules/tasks/infrastructure/local/task.record";
import type { SyncMetadataRecord } from "@/platform/sync/sync.types";

export const DATA_BACKUP_FORMAT = "personal-productivity-os-backup" as const;

export const DATA_BACKUP_SCHEMA_VERSION = 2 as const;

export type BackupReason = "manual" | "before_import" | "before_restore";

export type ImportMode = "merge" | "replace_local";

export type DataBackupPayload = {
	format: typeof DATA_BACKUP_FORMAT;
	schemaVersion: typeof DATA_BACKUP_SCHEMA_VERSION;
	appVersion: string;
	exportedAt: string;
	sourceUserId: string;

	data: {
		tasks: TaskRecord[];
		timeBlocks: TimeBlockRecord[];
		calendarEvents: CalendarEventRecord[];
		reminders: ReminderRecord[];
		books: BookRecord[];
		bookNotes: BookNoteRecord[];
		userSettings: UserSettingsRecord[];
	};

	syncMetadata: SyncMetadataRecord[];
};

export type BackupDataCounts = {
	tasks: number;
	timeBlocks: number;
	calendarEvents: number;
	reminders: number;
	books: number;
	bookNotes: number;
	userSettings: number;
	total: number;
};

export function countBackupData(payload: DataBackupPayload): BackupDataCounts {
	const counts = {
		tasks: payload.data.tasks.length,
		timeBlocks: payload.data.timeBlocks.length,
		calendarEvents: payload.data.calendarEvents.length,
		reminders: payload.data.reminders.length,
		books: payload.data.books.length,
		bookNotes: payload.data.bookNotes.length,
		userSettings: payload.data.userSettings.length,
	};

	return {
		...counts,
		total: Object.values(counts).reduce((sum, value) => sum + value, 0),
	};
}
