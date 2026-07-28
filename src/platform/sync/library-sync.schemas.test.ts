import { describe, expect, it } from "vitest";

import {
	bookSyncSnapshotSchema,
	pushLibraryOperationSchema,
} from "./library-sync.schemas";

const snapshot = {
	id: "00000000-0000-4000-8000-000000000001",
	userId: "user-1",
	title: "Libro",
	author: null,
	isbn: null,
	description: null,
	coverUrl: null,
	status: "reading",
	pageCount: 200,
	currentPage: 30,
	rating: null,
	tags: ["arquitectura"],
	startedAt: "2026-07-27T12:00:00.000Z",
	completedAt: null,
	createdAt: "2026-07-27T12:00:00.000Z",
	updatedAt: "2026-07-27T12:00:00.000Z",
	deletedAt: null,
	version: 1,
};

describe("library sync schemas", () => {
	it("acepta un snapshot válido", () => {
		expect(bookSyncSnapshotSchema.parse(snapshot)).toEqual(snapshot);
	});

	it("exige baseVersion en update", () => {
		const result = pushLibraryOperationSchema.safeParse({
			operationId: "00000000-0000-4000-8000-000000000002",
			entityType: "book",
			entityId: snapshot.id,
			operation: "update",
			payload: snapshot,
			baseVersion: null,
		});

		expect(result.success).toBe(false);
	});
});
