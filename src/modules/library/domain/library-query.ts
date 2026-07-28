import type { BookStatus } from "./book";

export type BookQuery = {
	userId: string;
	statuses?: BookStatus[];
	tags?: string[];
	search?: string;
	includeDeleted?: boolean;
};

export type BookNoteQuery = {
	userId: string;
	bookId: string;
	includeDeleted?: boolean;
};
