import type { BookNoteQuery } from "../../domain/library-query";
import type { LibraryRepository } from "../../domain/repositories/library.repository";

export function listBookNotesQuery(repository: LibraryRepository) {
	return (query: BookNoteQuery) => repository.listNotes(query);
}
