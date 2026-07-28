import { z } from "zod";

const nullableIsoDate = z.string().datetime().nullable();
const dailyReviewScoreSchema = z.union([
	z.literal(1),
	z.literal(2),
	z.literal(3),
	z.literal(4),
	z.literal(5),
]);

export const dailyReviewSyncSnapshotSchema = z.object({
	id: z.string().min(1),
	userId: z.string().min(1),
	reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	mood: dailyReviewScoreSchema,
	energy: dailyReviewScoreSchema,
	productivity: dailyReviewScoreSchema,
	wins: z.string().max(5_000).nullable(),
	blockers: z.string().max(5_000).nullable(),
	notes: z.string().max(10_000).nullable(),
	tomorrowPriorities: z.array(z.string().max(300)).max(3),
	completedAt: nullableIsoDate,
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	deletedAt: nullableIsoDate,
	version: z.number().int().positive(),
});

export const dailyReviewDeletePayloadSchema = z.object({
	id: z.string().min(1),
	deletedAt: z.string().datetime(),
	version: z.number().int().positive(),
});

export const pushDailyReviewOperationSchema = z
	.object({
		operationId: z.string().uuid(),
		entityType: z.literal("daily_review"),
		entityId: z.string().min(1),
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

export const pushDailyReviewInputSchema = z.object({
	deviceId: z.string().uuid(),
	operations: z.array(pushDailyReviewOperationSchema).min(1).max(50),
});

export const pullDailyReviewInputSchema = z.object({
	deviceId: z.string().uuid(),
	cursor: z.number().int().nonnegative(),
	limit: z.number().int().min(1).max(200).default(100),
});

export type DailyReviewSyncSnapshot = z.infer<
	typeof dailyReviewSyncSnapshotSchema
>;
export type PushDailyReviewOperationInput = z.infer<
	typeof pushDailyReviewOperationSchema
>;
export type PushDailyReviewInput = z.infer<typeof pushDailyReviewInputSchema>;
export type PullDailyReviewInput = z.infer<typeof pullDailyReviewInputSchema>;
