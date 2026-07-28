import { z } from "zod";
import { BOOK_NOTE_TYPES } from "../domain/book-note";

export const bookNoteFormSchema = z.object({
	type: z.enum(BOOK_NOTE_TYPES),

	content: z.string().trim().min(1, "El contenido es obligatorio").max(20_000),

	page: z.union([z.number().int().positive(), z.null()]),
});

export type BookNoteFormInput = z.input<typeof bookNoteFormSchema>;
