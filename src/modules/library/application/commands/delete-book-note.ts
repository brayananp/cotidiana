import {
	assertBookNoteOwnership,
	deleteBookNoteEntity,
} from "../../domain/book-note";
import type { LibraryRepository } from "../../domain/repositories/library.repository";
import type { LibraryExecutionContext } from "../library-context";
import type { LibraryWriteStore } from "../ports/library-write-store";

export function deleteBookNoteCommand(
	repository: LibraryRepository,
	writeStore: LibraryWriteStore,
) {
	return async (id: string, context: LibraryExecutionContext) => {
		const note = await repository.findNoteById(id);

		if (!note) {
			throw new Error("BOOK_NOTE_NOT_FOUND");
		}

		assertBookNoteOwnership(note, context.userId);

		const deleted = deleteBookNoteEntity(note);

		await writeStore.commitNote(deleted, "delete", context.deviceId);
	};
}
