import { describe, expect, it } from "vitest";
import {
	assertValidScheduleInterval,
	intervalsOverlap,
} from "../domain/schedule-interval";

describe("schedule intervals", () => {
	it("detecta un solapamiento", () => {
		expect(
			intervalsOverlap(
				{
					startAt: "2026-07-27T09:00:00.000Z",
					endAt: "2026-07-27T10:00:00.000Z",
				},
				{
					startAt: "2026-07-27T09:30:00.000Z",
					endAt: "2026-07-27T11:00:00.000Z",
				},
			),
		).toBe(true);
	});

	it("permite intervalos adyacentes", () => {
		expect(
			intervalsOverlap(
				{
					startAt: "2026-07-27T09:00:00.000Z",
					endAt: "2026-07-27T10:00:00.000Z",
				},
				{
					startAt: "2026-07-27T10:00:00.000Z",
					endAt: "2026-07-27T11:00:00.000Z",
				},
			),
		).toBe(false);
	});

	it("rechaza un intervalo invertido", () => {
		expect(() =>
			assertValidScheduleInterval({
				startAt: "2026-07-27T11:00:00.000Z",
				endAt: "2026-07-27T10:00:00.000Z",
			}),
		).toThrow("INVALID_SCHEDULE_INTERVAL");
	});
});
