import { z } from "zod";

const nullableIsoDate = z.string().datetime().nullable();

export const timeBlockSyncSnapshotSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().min(1),
	taskId: z.string().uuid().nullable(),
	title: z.string().min(1).max(200),
	notes: z.string().max(5_000).nullable(),
	kind: z.enum(["task", "focus", "break", "personal"]),
	status: z.enum(["planned", "completed", "cancelled"]),
	startAt: z.string().datetime(),
	endAt: z.string().datetime(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	deletedAt: nullableIsoDate,
	version: z.number().int().positive(),
});

export const calendarEventSyncSnapshotSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().min(1),
	title: z.string().min(1).max(200),
	notes: z.string().max(5_000).nullable(),
	location: z.string().max(300).nullable(),
	eventType: z.enum(["meeting", "appointment", "personal", "other"]),
	startAt: z.string().datetime(),
	endAt: z.string().datetime(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	deletedAt: nullableIsoDate,
	version: z.number().int().positive(),
});

export const schedulingDeletePayloadSchema = z.object({
	id: z.string().uuid(),
	deletedAt: z.string().datetime(),
	version: z.number().int().positive(),
});

export const schedulingEntityTypeSchema = z.enum([
	"time_block",
	"calendar_event",
]);

export const pushSchedulingOperationSchema = z
	.object({
		operationId: z.string().uuid(),
		entityType: schedulingEntityTypeSchema,
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
				message: "CREATE operations must not have a base version",
			});
		}

		if (value.operation !== "create" && value.baseVersion === null) {
			context.addIssue({
				code: "custom",
				path: ["baseVersion"],
				message: "UPDATE and DELETE require a base version",
			});
		}
	});

export const pushSchedulingInputSchema = z.object({
	deviceId: z.string().uuid(),
	operations: z.array(pushSchedulingOperationSchema).min(1).max(50),
});

export const pullSchedulingInputSchema = z.object({
	deviceId: z.string().uuid(),
	entityType: schedulingEntityTypeSchema,
	cursor: z.number().int().nonnegative(),
	limit: z.number().int().min(1).max(200).default(100),
});

export type TimeBlockSyncSnapshot = z.infer<typeof timeBlockSyncSnapshotSchema>;

export type CalendarEventSyncSnapshot = z.infer<
	typeof calendarEventSyncSnapshotSchema
>;

export type PushSchedulingOperationInput = z.infer<
	typeof pushSchedulingOperationSchema
>;

export type PushSchedulingInput = z.infer<typeof pushSchedulingInputSchema>;

export type PullSchedulingInput = z.infer<typeof pullSchedulingInputSchema>;
