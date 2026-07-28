import { assertBookOwnership, updateBookEntity } from "../../domain/book";
import type { LibraryRepository } from "../../domain/repositories/library.repository";
import { bookFormSchema } from "../../schemas/book-form.schema";
import type { LibraryExecutionContext } from "../library-context";
import type { LibraryWriteStore } from "../ports/library-write-store";

export function updateBookCommand(
	repository: LibraryRepository,
	writeStore: LibraryWriteStore,
) {
	return async (
		id: string,
		rawInput: unknown,
		context: LibraryExecutionContext,
	) => {
		const input = bookFormSchema.parse(rawInput);

		const existing = await repository.findBookById(id);

		if (!existing) {
			throw new Error("BOOK_NOT_FOUND");
		}

		assertBookOwnership(existing, context.userId);

		const updated = updateBookEntity(existing, {
			title: input.title,
			author: input.author || null,
			isbn: input.isbn || null,
			description: input.description || null,
			coverUrl: input.coverUrl || null,
			status: input.status,
			pageCount: input.pageCount,
			currentPage: input.currentPage,
			rating: input.rating,
			tags: input.tagsText
				.split(",")
				.map((tag) => tag.trim())
				.filter(Boolean),
		});

		await writeStore.commitBook(updated, "update", context.deviceId);

		return updated;
	};
}
