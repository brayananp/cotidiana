import { describe, expect, it } from "vitest";
import {
	createBookNoteEntity,
	updateBookNoteEntity,
} from "../domain/book-note";

const now = new Date("2026-07-27T12:00:00.000Z");

describe("BookNote", () => {
	it("normaliza el contenido", () => {
		const note = createBookNoteEntity(
			{
				userId: "user-1",
				bookId: "00000000-0000-4000-8000-000000000001",
				type: "quote",
				content: "  Una buena arquitectura permite cambios.  ",
				page: 42,
			},
			now,
		);

		expect(note.content).toBe("Una buena arquitectura permite cambios.");

		expect(note.version).toBe(1);
	});

	it("incrementa versión al editar", () => {
		const note = createBookNoteEntity(
			{
				userId: "user-1",
				bookId: "00000000-0000-4000-8000-000000000001",
				type: "note",
				content: "Inicial",
				page: null,
			},
			now,
		);

		const updated = updateBookNoteEntity(
			note,
			{
				type: "idea",
				content: "Actualizada",
				page: 10,
			},
			now,
		);

		expect(updated.version).toBe(2);
		expect(updated.type).toBe("idea");
	});
});
