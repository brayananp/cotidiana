import { z } from "zod";

export const userSettingsSyncSnapshotSchema = z.object({
	id: z.string().min(1),
	userId: z.string().min(1),
	locale: z.enum(["es", "en"]),
	weekStartsOn: z.union([z.literal(0), z.literal(1)]),
	timeFormat: z.enum(["12h", "24h"]),
	startPage: z.enum([
		"dashboard",
		"tasks",
		"scheduling",
		"reminders",
		"library",
	]),
	defaultTaskPriority: z.enum(["none", "low", "medium", "high", "urgent"]),
	defaultReminderMinutes: z.number().int().min(1).max(10_080),
	denseMode: z.boolean(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	deletedAt: z.string().datetime().nullable(),
	version: z.number().int().positive(),
});

export const pushSettingsOperationSchema = z
	.object({
		operationId: z.string().uuid(),
		entityType: z.literal("user_settings"),
		entityId: z.string().min(1),
		operation: z.enum(["create", "update"]),
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

		if (value.operation === "update" && value.baseVersion === null) {
			context.addIssue({
				code: "custom",
				path: ["baseVersion"],
				message: "UPDATE requires baseVersion",
			});
		}
	});

export const pushSettingsInputSchema = z.object({
	deviceId: z.string().uuid(),
	operations: z.array(pushSettingsOperationSchema).min(1).max(20),
});

export const pullSettingsInputSchema = z.object({
	deviceId: z.string().uuid(),
	cursor: z.number().int().nonnegative(),
	limit: z.number().int().min(1).max(50).default(20),
});

export type UserSettingsSyncSnapshot = z.infer<
	typeof userSettingsSyncSnapshotSchema
>;

export type PushSettingsInput = z.infer<typeof pushSettingsInputSchema>;

export type PullSettingsInput = z.infer<typeof pullSettingsInputSchema>;
