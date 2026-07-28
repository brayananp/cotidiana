import { describe, expect, it } from "vitest";
import {
	dailyReviewDeletePayloadSchema,
	dailyReviewSyncSnapshotSchema,
	pushDailyReviewOperationSchema,
} from "./daily-review-sync.schemas";

const snapshot = {
	id: "00000000-0000-4000-8000-000000000001",
	userId: "user-1",
	reviewDate: "2026-07-27",
	mood: 4,
	energy: 3,
	productivity: 5,
	wins: null,
	blockers: null,
	notes: null,
	tomorrowPriorities: ["Revisar"],
	completedAt: "2026-07-27T22:00:00.000Z",
	createdAt: "2026-07-27T21:00:00.000Z",
	updatedAt: "2026-07-27T22:00:00.000Z",
	deletedAt: null,
	version: 1,
};

describe("daily review sync schemas", () => {
	it("acepta un snapshot válido", () => {
		expect(dailyReviewSyncSnapshotSchema.parse(snapshot)).toEqual(snapshot);
	});

	it("exige baseVersion para update", () => {
		const result = pushDailyReviewOperationSchema.safeParse({
			operationId: "00000000-0000-4000-8000-000000000002",
			entityType: "daily_review",
			entityId: snapshot.id,
			operation: "update",
			payload: snapshot,
			baseVersion: null,
		});
		expect(result.success).toBe(false);
	});

	it("rechaza puntuaciones fuera del rango de 1 a 5", () => {
		const result = dailyReviewSyncSnapshotSchema.safeParse({
			...snapshot,
			mood: 6,
		});

		expect(result.success).toBe(false);
	});

	it("acepta el identificador compuesto usado por las revisiones locales", () => {
		expect(
			dailyReviewDeletePayloadSchema.parse({
				id: "user-1:2026-07-27",
				deletedAt: "2026-07-28T00:00:00.000Z",
				version: 1,
			}),
		).toEqual({
			id: "user-1:2026-07-27",
			deletedAt: "2026-07-28T00:00:00.000Z",
			version: 1,
		});
	});
});
