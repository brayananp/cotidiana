import { createBookEntity } from "../../domain/book";
import { bookFormSchema } from "../../schemas/book-form.schema";
import type { LibraryExecutionContext } from "../library-context";
import type { LibraryWriteStore } from "../ports/library-write-store";

export function createBookCommand(writeStore: LibraryWriteStore) {
	return async (rawInput: unknown, context: LibraryExecutionContext) => {
		const input = bookFormSchema.parse(rawInput);

		const book = createBookEntity({
			userId: context.userId,
			title: input.title,
			author: input.author || null,
			isbn: input.isbn || null,
			description: input.description || null,
			coverUrl: input.coverUrl || null,
			status: input.status,
			pageCount: input.pageCount,
			currentPage: input.currentPage,
			rating: input.rating,
			tags: parseTags(input.tagsText),
		});

		await writeStore.commitBook(book, "create", context.deviceId);

		return book;
	};
}

function parseTags(value: string): string[] {
	return value
		.split(",")
		.map((tag) => tag.trim())
		.filter(Boolean);
}
