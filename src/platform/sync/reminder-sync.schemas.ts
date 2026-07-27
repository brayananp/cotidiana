import { z } from "zod";

const nullableIsoDate = z.string().datetime().nullable();

export const reminderSyncSnapshotSchema = z
	.object({
		id: z.string().uuid(),
		userId: z.string().min(1),
		title: z.string().min(1).max(200),
		notes: z.string().max(5_000).nullable(),

		targetType: z.enum(["custom", "task", "time_block", "calendar_event"]),

		targetId: z.string().nullable(),

		remindAt: z.string().datetime(),

		nextTriggerAt: nullableIsoDate,

		snoozedUntil: nullableIsoDate,

		lastTriggeredAt: nullableIsoDate,

		recurrence: z.enum(["none", "daily", "weekly", "monthly"]),

		repeatInterval: z.number().int().min(1).max(365),

		timeZone: z.string().min(1),

		status: z.enum([
			"scheduled",
			"snoozed",
			"triggered",
			"dismissed",
			"cancelled",
		]),

		createdAt: z.string().datetime(),

		updatedAt: z.string().datetime(),

		deletedAt: nullableIsoDate,

		version: z.number().int().positive(),
	})
	.superRefine((value, context) => {
		if (value.targetType !== "custom" && !value.targetId) {
			context.addIssue({
				code: "custom",
				path: ["targetId"],
				message: "A related entity is required",
			});
		}
	});

export const reminderDeletePayloadSchema = z.object({
	id: z.string().uuid(),
	deletedAt: z.string().datetime(),
	version: z.number().int().positive(),
});

export const pushReminderOperationSchema = z
	.object({
		operationId: z.string().uuid(),

		entityType: z.literal("reminder"),

		entityId: z.string().uuid(),

		operation: z.enum(["create", "update", "delete"]),

		payload: z.unknown(),

		baseVersion: z.number().int().positive().nullable(),
	})
	.superRefine((value, context) => {
		if (value.operation === "create" && value.baseVersion !== null) {
			context.addIssue({
				code: "custom",
				path: ["baseVersion"],
				message: "CREATE must not include baseVersion",
			});
		}

		if (value.operation !== "create" && value.baseVersion === null) {
			context.addIssue({
				code: "custom",
				path: ["baseVersion"],
				message: "UPDATE and DELETE require baseVersion",
			});
		}
	});

export const pushReminderInputSchema = z.object({
	deviceId: z.string().uuid(),

	operations: z.array(pushReminderOperationSchema).min(1).max(50),
});

export const pullReminderInputSchema = z.object({
	deviceId: z.string().uuid(),

	cursor: z.number().int().nonnegative(),

	limit: z.number().int().min(1).max(200).default(100),
});

export type ReminderSyncSnapshot = z.infer<typeof reminderSyncSnapshotSchema>;

export type PushReminderOperationInput = z.infer<
	typeof pushReminderOperationSchema
>;

export type PushReminderInput = z.infer<typeof pushReminderInputSchema>;

export type PullReminderInput = z.infer<typeof pullReminderInputSchema>;
