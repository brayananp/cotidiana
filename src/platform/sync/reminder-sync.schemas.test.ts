import { describe, expect, it } from "vitest";
import {
	pushReminderOperationSchema,
	reminderSyncSnapshotSchema,
} from "./reminder-sync.schemas";

const snapshot = {
	id: "00000000-0000-4000-8000-000000000001",
	userId: "user-1",
	title: "Recordatorio",
	notes: null,
	targetType: "custom",
	targetId: null,
	remindAt: "2026-07-27T12:30:00.000Z",
	nextTriggerAt: "2026-07-27T12:30:00.000Z",
	snoozedUntil: null,
	lastTriggeredAt: null,
	recurrence: "none",
	repeatInterval: 1,
	timeZone: "America/Santiago",
	status: "scheduled",
	createdAt: "2026-07-27T12:00:00.000Z",
	updatedAt: "2026-07-27T12:00:00.000Z",
	deletedAt: null,
	version: 1,
};

describe("reminder sync schemas", () => {
	it("acepta un snapshot válido", () => {
		expect(reminderSyncSnapshotSchema.parse(snapshot)).toEqual(snapshot);
	});

	it("exige baseVersion para update", () => {
		const result = pushReminderOperationSchema.safeParse({
			operationId: "00000000-0000-4000-8000-000000000002",
			entityType: "reminder",
			entityId: snapshot.id,
			operation: "update",
			payload: snapshot,
			baseVersion: null,
		});

		expect(result.success).toBe(false);
	});
});
