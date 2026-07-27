import type { Reminder } from "../../domain/reminder";
import type { ReminderRecord } from "./reminder.record";

export function reminderToRecord(reminder: Reminder): ReminderRecord {
	return { ...reminder };
}

export function reminderFromRecord(record: ReminderRecord): Reminder {
	return { ...record };
}
