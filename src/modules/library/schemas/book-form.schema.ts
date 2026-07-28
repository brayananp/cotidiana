import { z } from "zod";
import { BOOK_STATUSES } from "../domain/book";

const optionalPositiveInteger = z.union([
	z.number().int().positive(),
	z.null(),
]);

export const bookFormSchema = z
	.object({
		title: z.string().trim().min(1, "El título es obligatorio").max(300),

		author: z.string().max(200),
		isbn: z.string().max(30),
		description: z.string().max(10_000),
		coverUrl: z
			.string()
			.trim()
			.refine(
				(value) => value === "" || z.string().url().safeParse(value).success,
				"Ingresa una URL válida",
			),

		status: z.enum(BOOK_STATUSES),

		pageCount: optionalPositiveInteger,

		currentPage: z.number().int().min(0),

		rating: z.union([z.number().int().min(1).max(5), z.null()]),

		tagsText: z.string().max(1_000),
	})
	.superRefine((value, context) => {
		if (value.pageCount !== null && value.currentPage > value.pageCount) {
			context.addIssue({
				code: "custom",
				path: ["currentPage"],
				message: "La página actual no puede superar el total",
			});
		}
	});

export type BookFormInput = z.input<typeof bookFormSchema>;
