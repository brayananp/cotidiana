import type { Book } from "../book";
import type { BookNote } from "../book-note";
import type { BookNoteQuery, BookQuery } from "../library-query";

export interface LibraryRepository {
	findBookById(id: string): Promise<Book | null>;

	findNoteById(id: string): Promise<BookNote | null>;

	listBooks(query: BookQuery): Promise<Book[]>;

	listNotes(query: BookNoteQuery): Promise<BookNote[]>;
}
