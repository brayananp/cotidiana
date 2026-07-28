import type { BookNoteType } from "../../domain/book-note";

export type BookNoteRecord = {
	id: string;
	userId: string;
	bookId: string;
	type: BookNoteType;
	content: string;
	page: number | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	version: number;
};
