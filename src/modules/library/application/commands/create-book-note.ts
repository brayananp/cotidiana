import { assertBookOwnership } from "../../domain/book";
import { createBookNoteEntity } from "../../domain/book-note";
import type { LibraryRepository } from "../../domain/repositories/library.repository";
import { bookNoteFormSchema } from "../../schemas/book-note-form.schema";
import type { LibraryExecutionContext } from "../library-context";
import type { LibraryWriteStore } from "../ports/library-write-store";

export function createBookNoteCommand(
	repository: LibraryRepository,
	writeStore: LibraryWriteStore,
) {
	return async (
		bookId: string,
		rawInput: unknown,
		context: LibraryExecutionContext,
	) => {
		const input = bookNoteFormSchema.parse(rawInput);

		const book = await repository.findBookById(bookId);

		if (!book) {
			throw new Error("BOOK_NOT_FOUND");
		}

		assertBookOwnership(book, context.userId);

		if (
			input.page !== null &&
			book.pageCount !== null &&
			input.page > book.pageCount
		) {
			throw new Error("BOOK_NOTE_PAGE_EXCEEDS_BOOK");
		}

		const note = createBookNoteEntity({
			userId: context.userId,
			bookId,
			type: input.type,
			content: input.content,
			page: input.page,
		});

		await writeStore.commitNote(note, "create", context.deviceId);

		return note;
	};
}
