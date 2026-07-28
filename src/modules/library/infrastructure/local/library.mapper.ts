import type { Book } from "../../domain/book";
import type { BookNote } from "../../domain/book-note";
import type { BookNoteRecord } from "./book-note.record";
import type { BookRecord } from "./book.record";

export function bookToRecord(book: Book): BookRecord {
	return { ...book };
}

export function bookFromRecord(record: BookRecord): Book {
	return { ...record };
}

export function bookNoteToRecord(note: BookNote): BookNoteRecord {
	return { ...note };
}

export function bookNoteFromRecord(record: BookNoteRecord): BookNote {
	return { ...record };
}
