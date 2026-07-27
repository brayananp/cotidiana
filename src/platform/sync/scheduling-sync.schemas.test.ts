import { describe, expect, it } from "vitest";
import {
	pushSchedulingOperationSchema,
	timeBlockSyncSnapshotSchema,
} from "./scheduling-sync.schemas";

const snapshot = {
	id: "00000000-0000-4000-8000-000000000001",
	userId: "user-1",
	taskId: null,
	title: "Enfoque",
	notes: null,
	kind: "focus",
	status: "planned",
	startAt: "2026-07-27T09:00:00.000Z",
	endAt: "2026-07-27T10:00:00.000Z",
	createdAt: "2026-07-27T08:00:00.000Z",
	updatedAt: "2026-07-27T08:00:00.000Z",
	deletedAt: null,
	version: 1,
};

describe("scheduling sync schemas", () => {
	it("acepta un snapshot válido", () => {
		expect(timeBlockSyncSnapshotSchema.parse(snapshot)).toEqual(snapshot);
	});

	it("exige baseVersion en update", () => {
		const result = pushSchedulingOperationSchema.safeParse({
			operationId: "00000000-0000-4000-8000-000000000002",
			entityType: "time_block",
			entityId: snapshot.id,
			operation: "update",
			payload: snapshot,
			baseVersion: null,
		});

		expect(result.success).toBe(false);
	});
});
