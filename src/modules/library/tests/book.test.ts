import { describe, expect, it } from "vitest";
import {
	calculateBookProgress,
	createBookEntity,
	updateBookProgressEntity,
} from "../domain/book";

const now = new Date("2026-07-27T12:00:00.000Z");

function createBook() {
	return createBookEntity(
		{
			userId: "user-1",
			title: "  Clean Architecture  ",
			author: "  Robert C. Martin  ",
			isbn: "978-0-13-449416-6",
			description: null,
			coverUrl: null,
			status: "reading",
			pageCount: 400,
			currentPage: 100,
			rating: null,
			tags: [" Arquitectura ", "software", "arquitectura"],
		},
		now,
	);
}

describe("Book", () => {
	it("normaliza texto, ISBN y etiquetas", () => {
		const book = createBook();

		expect(book.title).toBe("Clean Architecture");

		expect(book.author).toBe("Robert C. Martin");

		expect(book.isbn).toBe("9780134494166");

		expect(book.tags).toEqual(["arquitectura", "software"]);
	});

	it("calcula el progreso", () => {
		expect(calculateBookProgress(createBook())).toBe(25);
	});

	it("completa al llegar a la última página", () => {
		const completed = updateBookProgressEntity(createBook(), 400, now);

		expect(completed.status).toBe("completed");

		expect(completed.completedAt).toBe(now.toISOString());
	});

	it("rechaza una página mayor al total", () => {
		expect(() => updateBookProgressEntity(createBook(), 401, now)).toThrow(
			"CURRENT_PAGE_EXCEEDS_PAGE_COUNT",
		);
	});
});
