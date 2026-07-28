import { z } from "zod";
import {
	bookNoteSyncSnapshotSchema,
	bookSyncSnapshotSchema,
} from "@/platform/sync/library-sync.schemas";
import { reminderSyncSnapshotSchema } from "@/platform/sync/reminder-sync.schemas";
import {
	calendarEventSyncSnapshotSchema,
	timeBlockSyncSnapshotSchema,
} from "@/platform/sync/scheduling-sync.schemas";
import { taskSyncSnapshotSchema } from "@/platform/sync/sync.schemas";

const syncMetadataSchema = z.object({
	id: z.string().min(1),

	entityType: z.enum([
		"task",
		"time_block",
		"calendar_event",
		"reminder",
		"book",
		"book_note",
		"user_settings",
	]),

	entityId: z.string().min(1),
	localVersion: z.number().int().positive(),
	remoteVersion: z.number().int().positive().nullable(),

	state: z.enum(["synced", "pending", "failed", "conflict"]),

	lastSyncedAt: z.string().datetime().nullable(),

	lastError: z.string().nullable(),
	updatedAt: z.string().datetime(),
});

export const dataBackupPayloadSchema = z.object({
	format: z.literal("personal-productivity-os-backup"),

	schemaVersion: z.literal(1),
	appVersion: z.string().min(1),
	exportedAt: z.string().datetime(),
	sourceUserId: z.string().min(1),

	data: z.object({
		tasks: z.array(taskSyncSnapshotSchema),

		timeBlocks: z.array(timeBlockSyncSnapshotSchema),

		calendarEvents: z.array(calendarEventSyncSnapshotSchema),

		reminders: z.array(reminderSyncSnapshotSchema),

		books: z.array(bookSyncSnapshotSchema),

		bookNotes: z.array(bookNoteSyncSnapshotSchema),
	}),

	syncMetadata: z.array(syncMetadataSchema),
});

export type ParsedDataBackup = z.infer<typeof dataBackupPayloadSchema>;
