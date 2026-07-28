import { z } from "zod";

const nullableIsoDate = z.string().datetime().nullable();

export const bookSyncSnapshotSchema = z
	.object({
		id: z.string().uuid(),
		userId: z.string().min(1),
		title: z.string().min(1).max(300),
		author: z.string().max(200).nullable(),
		isbn: z.string().max(30).nullable(),
		description: z.string().max(10_000).nullable(),
		coverUrl: z.string().url().nullable(),

		status: z.enum([
			"want_to_read",
			"reading",
			"completed",
			"paused",
			"dropped",
		]),

		pageCount: z.number().int().positive().nullable(),

		currentPage: z.number().int().nonnegative(),

		rating: z.number().int().min(1).max(5).nullable(),

		tags: z.array(z.string().min(1).max(100)).max(100),

		startedAt: nullableIsoDate,

		completedAt: nullableIsoDate,

		createdAt: z.string().datetime(),

		updatedAt: z.string().datetime(),

		deletedAt: nullableIsoDate,

		version: z.number().int().positive(),
	})
	.superRefine((value, context) => {
		if (value.pageCount !== null && value.currentPage > value.pageCount) {
			context.addIssue({
				code: "custom",
				path: ["currentPage"],
				message: "Current page exceeds page count",
			});
		}
	});

export const bookNoteSyncSnapshotSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().min(1),
	bookId: z.string().uuid(),

	type: z.enum(["note", "quote", "idea"]),

	content: z.string().min(1).max(20_000),

	page: z.number().int().positive().nullable(),

	createdAt: z.string().datetime(),

	updatedAt: z.string().datetime(),

	deletedAt: nullableIsoDate,

	version: z.number().int().positive(),
});

export const libraryDeletePayloadSchema = z.object({
	id: z.string().uuid(),
	deletedAt: z.string().datetime(),
	version: z.number().int().positive(),
});

export const libraryEntityTypeSchema = z.enum(["book", "book_note"]);

export const pushLibraryOperationSchema = z
	.object({
		operationId: z.string().uuid(),

		entityType: libraryEntityTypeSchema,

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

export const pushLibraryInputSchema = z.object({
	deviceId: z.string().uuid(),

	operations: z.array(pushLibraryOperationSchema).min(1).max(50),
});

export const pullLibraryInputSchema = z.object({
	deviceId: z.string().uuid(),

	entityType: libraryEntityTypeSchema,

	cursor: z.number().int().nonnegative(),

	limit: z.number().int().min(1).max(200).default(100),
});

export type BookSyncSnapshot = z.infer<typeof bookSyncSnapshotSchema>;

export type BookNoteSyncSnapshot = z.infer<typeof bookNoteSyncSnapshotSchema>;

export type PushLibraryOperationInput = z.infer<
	typeof pushLibraryOperationSchema
>;

export type PushLibraryInput = z.infer<typeof pushLibraryInputSchema>;

export type PullLibraryInput = z.infer<typeof pullLibraryInputSchema>;
