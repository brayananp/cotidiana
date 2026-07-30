import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";
import type { BookRecord } from "@/modules/library/infrastructure/local/book.record";
import type { TaskRecord } from "@/modules/tasks/infrastructure/local/task.record";
import { ProductivityLocalDatabase } from "@/platform/database/local-database";
import { loadDashboardSource } from "../infrastructure/local/load-dashboard-source-client";

const databases: ProductivityLocalDatabase[] = [];

afterEach(async () => {
	await Promise.all(
		databases.splice(0).map(async (database) => {
			database.close();
			await database.delete();
		}),
	);
});

describe("loadDashboardSource", () => {
	it("loads active tasks and only recent completed tasks", async () => {
		const db = new ProductivityLocalDatabase(
			`dashboard-${crypto.randomUUID()}`,
		);
		databases.push(db);
		await db.open();
		await db.tasks.bulkPut([
			createTask("active", "todo", null),
			createTask("recent", "done", "2026-07-29T10:00:00.000Z"),
			createTask("historic", "done", "2025-01-01T10:00:00.000Z"),
		]);
		await db.books.bulkPut([
			createBook("reading", "reading"),
			createBook("completed", "completed"),
			createBook("deleted", "completed", "2026-07-01T00:00:00.000Z"),
		]);

		const source = await loadDashboardSource(
			db,
			"user-1",
			new Date("2026-07-30T12:00:00.000Z"),
		);

		expect(source.tasks.map((task) => task.id).sort()).toEqual([
			"active",
			"recent",
		]);
		expect(source.readingBooks).toHaveLength(1);
		expect(source.completedBookCount).toBe(1);
	});
});

function createTask(
	id: string,
	status: TaskRecord["status"],
	completedAt: string | null,
): TaskRecord {
	return {
		id,
		userId: "user-1",
		title: id,
		description: null,
		status,
		priority: "medium",
		plannedAt: null,
		dueAt: null,
		completedAt,
		archivedAt: null,
		sortOrder: 0,
		createdAt: "2025-01-01T00:00:00.000Z",
		updatedAt: completedAt ?? "2026-07-30T00:00:00.000Z",
		deletedAt: null,
		version: 1,
	};
}

function createBook(
	id: string,
	status: BookRecord["status"],
	deletedAt: string | null = null,
): BookRecord {
	return {
		id,
		userId: "user-1",
		title: id,
		author: null,
		isbn: null,
		description: null,
		coverUrl: null,
		status,
		pageCount: 100,
		currentPage: 25,
		rating: null,
		tags: [],
		startedAt: null,
		completedAt: status === "completed" ? "2026-07-01T00:00:00.000Z" : null,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-07-01T00:00:00.000Z",
		deletedAt,
		version: 1,
	};
}
