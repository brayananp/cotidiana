import { createBookCommand } from "../application/commands/create-book";
import { createBookNoteCommand } from "../application/commands/create-book-note";
import { deleteBookCommand } from "../application/commands/delete-book";
import { deleteBookNoteCommand } from "../application/commands/delete-book-note";
import { updateBookCommand } from "../application/commands/update-book";
import { updateBookNoteCommand } from "../application/commands/update-book-note";
import { updateBookProgressCommand } from "../application/commands/update-book-progress";
import { listBookNotesQuery } from "../application/queries/list-book-notes";
import { listBooksQuery } from "../application/queries/list-books";
import { DexieLibraryWriteStore } from "./local/dexie-library-write-store";
import { DexieLibraryRepository } from "./local/dexie-library.repository";

const repository = new DexieLibraryRepository();

const writeStore = new DexieLibraryWriteStore();

export const libraryDependencies = {
	repository,
	writeStore,

	createBook: createBookCommand(writeStore),

	updateBook: updateBookCommand(repository, writeStore),

	updateBookProgress: updateBookProgressCommand(repository, writeStore),

	deleteBook: deleteBookCommand(repository, writeStore),

	createNote: createBookNoteCommand(repository, writeStore),

	updateNote: updateBookNoteCommand(repository, writeStore),

	deleteNote: deleteBookNoteCommand(repository, writeStore),

	listBooks: listBooksQuery(repository),

	listNotes: listBookNotesQuery(repository),
};
