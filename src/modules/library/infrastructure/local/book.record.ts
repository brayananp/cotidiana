import type { BookStatus } from "../../domain/book";

export type BookRecord = {
	id: string;
	userId: string;
	title: string;
	author: string | null;
	isbn: string | null;
	description: string | null;
	coverUrl: string | null;
	status: BookStatus;
	pageCount: number | null;
	currentPage: number;
	rating: number | null;
	tags: string[];
	startedAt: string | null;
	completedAt: string | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	version: number;
};
