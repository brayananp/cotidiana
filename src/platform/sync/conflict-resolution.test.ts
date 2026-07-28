import { describe, expect, it } from "vitest";
import { isScheduleOverlapConflict } from "./conflict-resolution-client";

describe("conflict resolution", () => {
	it("detecta conflictos de solapamiento", () => {
		expect(
			isScheduleOverlapConflict({
				reason: "SCHEDULE_OVERLAP:calendar_event",
			}),
		).toBe(true);
	});

	it("distingue conflictos de versión", () => {
		expect(
			isScheduleOverlapConflict({
				reason: "VERSION_MISMATCH",
			}),
		).toBe(false);
	});
});
