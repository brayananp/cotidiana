import { describe, expect, it } from "vitest";
import {
	createDefaultUserSettings,
	updateUserSettingsEntity,
} from "../domain/user-settings";

const now = new Date("2026-07-27T12:00:00.000Z");

describe("UserSettings", () => {
	it("crea preferencias predeterminadas", () => {
		const settings = createDefaultUserSettings("user-1", now);

		expect(settings).toMatchObject({
			id: "user-1",
			userId: "user-1",
			locale: "es",
			weekStartsOn: 1,
			timeFormat: "24h",
			startPage: "dashboard",
			defaultTaskPriority: "none",
			defaultReminderMinutes: 30,
			denseMode: false,
			version: 1,
		});
	});

	it("incrementa la versión al actualizar", () => {
		const original = createDefaultUserSettings("user-1", now);

		const updated = updateUserSettingsEntity(
			original,
			{
				locale: "en",
				weekStartsOn: 0,
				timeFormat: "12h",
				startPage: "tasks",
				defaultTaskPriority: "high",
				defaultReminderMinutes: 45,
				denseMode: true,
			},
			new Date("2026-07-27T13:00:00.000Z"),
		);

		expect(updated.version).toBe(2);
		expect(updated.locale).toBe("en");
		expect(updated.denseMode).toBe(true);
	});

	it("rechaza minutos fuera del rango", () => {
		const original = createDefaultUserSettings("user-1", now);

		expect(() =>
			updateUserSettingsEntity(original, {
				locale: "es",
				weekStartsOn: 1,
				timeFormat: "24h",
				startPage: "dashboard",
				defaultTaskPriority: "none",
				defaultReminderMinutes: 0,
				denseMode: false,
			}),
		).toThrow("INVALID_DEFAULT_REMINDER_MINUTES");
	});
});
