import { describe, expect, it } from "vitest";
import {
	createDailyReviewEntity,
	updateDailyReviewEntity,
} from "../domain/daily-review";

const now = new Date("2026-07-27T22:00:00.000Z");

describe("DailyReview", () => {
	it("normaliza prioridades y completa la revisión", () => {
		const review = createDailyReviewEntity(
			{
				userId: "user-1",
				reviewDate: "2026-07-27",
				mood: 4,
				energy: 3,
				productivity: 5,
				wins: "  Terminé el módulo  ",
				blockers: null,
				notes: null,
				tomorrowPriorities: ["  Revisar tests  ", "", "Desplegar"],
				completed: true,
			},
			now,
		);

		expect(review.wins).toBe("Terminé el módulo");
		expect(review.tomorrowPriorities).toEqual(["Revisar tests", "Desplegar"]);
		expect(review.completedAt).toBe(now.toISOString());
	});

	it("incrementa la versión al actualizar", () => {
		const original = createDailyReviewEntity(
			{
				userId: "user-1",
				reviewDate: "2026-07-27",
				mood: 3,
				energy: 3,
				productivity: 3,
				wins: null,
				blockers: null,
				notes: null,
				tomorrowPriorities: [],
				completed: false,
			},
			now,
		);

		const updated = updateDailyReviewEntity(
			original,
			{
				mood: 4,
				energy: 4,
				productivity: 4,
				wins: "Bien",
				blockers: null,
				notes: null,
				tomorrowPriorities: ["Uno"],
				completed: true,
			},
			new Date("2026-07-27T23:00:00.000Z"),
		);

		expect(updated.version).toBe(2);
		expect(updated.completedAt).not.toBeNull();
	});
});
