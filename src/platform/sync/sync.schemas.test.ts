import { describe, expect, it } from "vitest";
import { pushTaskOperationSchema } from "./sync.schemas";

const task = {
	id: "00000000-0000-4000-8000-000000000001",
	userId: "user-1",
	title: "Tarea",
	description: null,
	status: "todo",
	priority: "none",
	plannedAt: null,
	dueAt: null,
	completedAt: null,
	archivedAt: null,
	sortOrder: 1,
	createdAt: "2026-07-27T12:00:00.000Z",
	updatedAt: "2026-07-27T12:00:00.000Z",
	deletedAt: null,
	version: 1,
};

describe("pushTaskOperationSchema", () => {
	it("acepta CREATE sin baseVersion", () => {
		const result = pushTaskOperationSchema.safeParse({
			operationId: "00000000-0000-4000-8000-000000000002",
			entityType: "task",
			entityId: task.id,
			operation: "create",
			payload: task,
			baseVersion: null,
		});

		expect(result.success).toBe(true);
	});

	it("rechaza UPDATE sin baseVersion", () => {
		const result = pushTaskOperationSchema.safeParse({
			operationId: "00000000-0000-4000-8000-000000000002",
			entityType: "task",
			entityId: task.id,
			operation: "update",
			payload: task,
			baseVersion: null,
		});

		expect(result.success).toBe(false);
	});
});
