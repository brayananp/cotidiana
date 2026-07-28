import {
	assertBookNoteOwnership,
	updateBookNoteEntity,
} from "../../domain/book-note";
import type { LibraryRepository } from "../../domain/repositories/library.repository";
import { bookNoteFormSchema } from "../../schemas/book-note-form.schema";
import type { LibraryExecutionContext } from "../library-context";
import type { LibraryWriteStore } from "../ports/library-write-store";

export function updateBookNoteCommand(
	repository: LibraryRepository,
	writeStore: LibraryWriteStore,
) {
	return async (
		id: string,
		rawInput: unknown,
		context: LibraryExecutionContext,
	) => {
		const input = bookNoteFormSchema.parse(rawInput);

		const note = await repository.findNoteById(id);

		if (!note) {
			throw new Error("BOOK_NOTE_NOT_FOUND");
		}

		assertBookNoteOwnership(note, context.userId);

		const book = await repository.findBookById(note.bookId);

		if (!book || book.deletedAt) {
			throw new Error("BOOK_NOT_FOUND");
		}

		if (
			input.page !== null &&
			book.pageCount !== null &&
			input.page > book.pageCount
		) {
			throw new Error("BOOK_NOTE_PAGE_EXCEEDS_BOOK");
		}

		const updated = updateBookNoteEntity(note, input);

		await writeStore.commitNote(updated, "update", context.deviceId);

		return updated;
	};
}
