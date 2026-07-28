import { assertBookOwnership, deleteBookEntity } from "../../domain/book";
import { deleteBookNoteEntity } from "../../domain/book-note";
import type { LibraryRepository } from "../../domain/repositories/library.repository";
import type { LibraryExecutionContext } from "../library-context";
import type { LibraryWriteStore } from "../ports/library-write-store";

export function deleteBookCommand(
	repository: LibraryRepository,
	writeStore: LibraryWriteStore,
) {
	return async (id: string, context: LibraryExecutionContext) => {
		const book = await repository.findBookById(id);

		if (!book) {
			throw new Error("BOOK_NOT_FOUND");
		}

		assertBookOwnership(book, context.userId);

		const notes = await repository.listNotes({
			userId: context.userId,
			bookId: id,
			includeDeleted: false,
		});

		const deletedBook = deleteBookEntity(book);

		const deletedNotes = notes.map((note) => deleteBookNoteEntity(note));

		await writeStore.deleteBookWithNotes(
			deletedBook,
			deletedNotes,
			context.deviceId,
		);
	};
}
