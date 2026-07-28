import { z } from "zod";
import { dailyReviewSyncSnapshotSchema } from "@/platform/sync/daily-review-sync.schemas";
import {
	bookNoteSyncSnapshotSchema,
	bookSyncSnapshotSchema,
} from "@/platform/sync/library-sync.schemas";
import { reminderSyncSnapshotSchema } from "@/platform/sync/reminder-sync.schemas";
import {
	calendarEventSyncSnapshotSchema,
	timeBlockSyncSnapshotSchema,
} from "@/platform/sync/scheduling-sync.schemas";
import { userSettingsSyncSnapshotSchema } from "@/platform/sync/settings-sync.schemas";
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
		"daily_review",
	]),
	entityId: z.string().min(1),
	localVersion: z.number().int().positive(),
	remoteVersion: z.number().int().positive().nullable(),
	state: z.enum(["synced", "pending", "failed", "conflict"]),
	lastSyncedAt: z.string().datetime().nullable(),
	lastError: z.string().nullable(),
	updatedAt: z.string().datetime(),
});

const common = {
	format: z.literal("personal-productivity-os-backup"),
	appVersion: z.string().min(1),
	exportedAt: z.string().datetime(),
	sourceUserId: z.string().min(1),
	syncMetadata: z.array(syncMetadataSchema),
};

const dataV1 = z.object({
	tasks: z.array(taskSyncSnapshotSchema),
	timeBlocks: z.array(timeBlockSyncSnapshotSchema),
	calendarEvents: z.array(calendarEventSyncSnapshotSchema),
	reminders: z.array(reminderSyncSnapshotSchema),
	books: z.array(bookSyncSnapshotSchema),
	bookNotes: z.array(bookNoteSyncSnapshotSchema),
});

const dataV2 = dataV1.extend({
	userSettings: z.array(userSettingsSyncSnapshotSchema),
});

const backupV1Schema = z.object({
	...common,
	schemaVersion: z.literal(1),
	data: dataV1,
});

const backupV2Schema = z.object({
	...common,
	schemaVersion: z.literal(2),
	data: dataV2,
});

const dataV3 = dataV2.extend({
	dailyReviews: z.array(dailyReviewSyncSnapshotSchema),
});

const backupV3Schema = z.object({
	...common,
	schemaVersion: z.literal(3),
	data: dataV3,
});

export const dataBackupPayloadSchema = z
	.union([backupV3Schema, backupV2Schema, backupV1Schema])
	.transform((payload) => {
		if (payload.schemaVersion === 3) return payload;

		if (payload.schemaVersion === 2) {
			return {
				...payload,
				schemaVersion: 3 as const,
				data: { ...payload.data, dailyReviews: [] },
			};
		}

		return {
			...payload,
			schemaVersion: 3 as const,
			data: {
				...payload.data,
				userSettings: [],
				dailyReviews: [],
			},
		};
	});

export type ParsedDataBackup = z.infer<typeof dataBackupPayloadSchema>;
