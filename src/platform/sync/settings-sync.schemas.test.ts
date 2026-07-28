import { describe, expect, it } from "vitest";
import {
	pushSettingsOperationSchema,
	userSettingsSyncSnapshotSchema,
} from "./settings-sync.schemas";

const snapshot = {
	id: "user-1",
	userId: "user-1",
	locale: "es",
	weekStartsOn: 1,
	timeFormat: "24h",
	startPage: "dashboard",
	defaultTaskPriority: "none",
	defaultReminderMinutes: 30,
	denseMode: false,
	createdAt: "2026-07-27T12:00:00.000Z",
	updatedAt: "2026-07-27T12:00:00.000Z",
	deletedAt: null,
	version: 1,
};

describe("settings sync schemas", () => {
	it("acepta un snapshot válido", () => {
		expect(userSettingsSyncSnapshotSchema.parse(snapshot)).toEqual(snapshot);
	});

	it("exige baseVersion para update", () => {
		const result = pushSettingsOperationSchema.safeParse({
			operationId: "00000000-0000-4000-8000-000000000001",
			entityType: "user_settings",
			entityId: "user-1",
			operation: "update",
			payload: snapshot,
			baseVersion: null,
		});

		expect(result.success).toBe(false);
	});
});
