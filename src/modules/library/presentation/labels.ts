import type { BookStatus } from "../domain/book";
import type { BookNoteType } from "../domain/book-note";

export const bookStatusLabels: Record<BookStatus, string> = {
	want_to_read: "Quiero leer",
	reading: "Leyendo",
	completed: "Completado",
	paused: "En pausa",
	dropped: "Abandonado",
};

export const bookNoteTypeLabels: Record<BookNoteType, string> = {
	note: "Nota",
	quote: "Cita",
	idea: "Idea",
};
