import { describe, expect, it } from "vitest";
import {
	calculateNextOccurrence,
	createReminderEntity,
	dismissReminderEntity,
	isReminderDue,
	snoozeReminderEntity,
	triggerReminderEntity,
} from "../domain/reminder";

const now = new Date("2026-07-27T12:00:00.000Z");

function createReminder(recurrence: "none" | "daily" = "none") {
	return createReminderEntity(
		{
			userId: "user-1",
			title: "  Revisar agenda  ",
			notes: "  Antes de salir  ",
			targetType: "custom",
			targetId: null,
			remindAt: "2026-07-27T12:05:00.000Z",
			recurrence,
			repeatInterval: 1,
			timeZone: "America/Santiago",
		},
		now,
	);
}

describe("Reminder", () => {
	it("normaliza los datos", () => {
		const reminder = createReminder();

		expect(reminder.title).toBe("Revisar agenda");

		expect(reminder.notes).toBe("Antes de salir");

		expect(reminder.status).toBe("scheduled");
	});

	it("detecta un recordatorio vencido", () => {
		const reminder = createReminder();

		expect(isReminderDue(reminder, new Date("2026-07-27T12:06:00.000Z"))).toBe(
			true,
		);
	});

	it("activa una vez sin nueva fecha", () => {
		const triggered = triggerReminderEntity(
			createReminder(),
			new Date("2026-07-27T12:06:00.000Z"),
		);

		expect(triggered.status).toBe("triggered");

		expect(triggered.nextTriggerAt).toBeNull();
	});

	it("programa la siguiente ocurrencia", () => {
		const triggered = triggerReminderEntity(
			createReminder("daily"),
			new Date("2026-07-27T12:06:00.000Z"),
		);

		expect(triggered.status).toBe("scheduled");

		const nextTrigger = triggered.nextTriggerAt;
		expect(nextTrigger).not.toBeNull();
		if (nextTrigger) {
			expect(new Date(nextTrigger).getTime()).toBeGreaterThan(
				new Date("2026-07-27T12:06:00.000Z").getTime(),
			);
		}
	});

	it("permite posponer", () => {
		const snoozed = snoozeReminderEntity(createReminder(), 15, now);

		expect(snoozed.status).toBe("snoozed");

		expect(snoozed.nextTriggerAt).toBe("2026-07-27T12:15:00.000Z");
	});

	it("permite descartar", () => {
		const dismissed = dismissReminderEntity(createReminder(), now);

		expect(dismissed.status).toBe("dismissed");

		expect(dismissed.nextTriggerAt).toBeNull();
	});

	it("calcula el siguiente mes", () => {
		const next = calculateNextOccurrence(
			"2026-01-31T10:00:00.000Z",
			"monthly",
			1,
			new Date("2026-02-01T00:00:00.000Z"),
		);

		expect(new Date(next).getTime()).toBeGreaterThan(
			new Date("2026-02-01T00:00:00.000Z").getTime(),
		);
	});
});
