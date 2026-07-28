import { getLocalDatabase } from "@/platform/database/local-database";
import type { Book } from "../../domain/book";
import type { BookNote } from "../../domain/book-note";
import type { BookNoteQuery, BookQuery } from "../../domain/library-query";
import type { LibraryRepository } from "../../domain/repositories/library.repository";
import { bookFromRecord, bookNoteFromRecord } from "./library.mapper";

export class DexieLibraryRepository implements LibraryRepository {
	async findBookById(id: string): Promise<Book | null> {
		const record = await getLocalDatabase().books.get(id);

		return record ? bookFromRecord(record) : null;
	}

	async findNoteById(id: string): Promise<BookNote | null> {
		const record = await getLocalDatabase().bookNotes.get(id);

		return record ? bookNoteFromRecord(record) : null;
	}

	async listBooks(query: BookQuery): Promise<Book[]> {
		const records = await getLocalDatabase()
			.books.where("userId")
			.equals(query.userId)
			.toArray();

		const search = query.search?.trim().toLowerCase() ?? "";

		const tags = query.tags?.map((tag) => tag.trim().toLowerCase()) ?? [];

		return records
			.filter((record) => {
				if (!query.includeDeleted && record.deletedAt) {
					return false;
				}

				if (query.statuses?.length && !query.statuses.includes(record.status)) {
					return false;
				}

				if (tags.length && !tags.every((tag) => record.tags.includes(tag))) {
					return false;
				}

				if (search) {
					const searchable = [
						record.title,
						record.author ?? "",
						record.isbn ?? "",
						record.tags.join(" "),
					]
						.join(" ")
						.toLowerCase();

					if (!searchable.includes(search)) {
						return false;
					}
				}

				return true;
			})
			.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
			.map(bookFromRecord);
	}

	async listNotes(query: BookNoteQuery): Promise<BookNote[]> {
		const records = await getLocalDatabase()
			.bookNotes.where("bookId")
			.equals(query.bookId)
			.toArray();

		return records
			.filter(
				(record) =>
					record.userId === query.userId &&
					(query.includeDeleted || !record.deletedAt),
			)
			.sort((left, right) => {
				if (
					left.page !== null &&
					right.page !== null &&
					left.page !== right.page
				) {
					return left.page - right.page;
				}

				return right.updatedAt.localeCompare(left.updatedAt);
			})
			.map(bookNoteFromRecord);
	}
}
