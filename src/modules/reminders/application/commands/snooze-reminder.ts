import {
	assertReminderOwnership,
	snoozeReminderEntity,
} from "../../domain/reminder";
import type { ReminderRepository } from "../../domain/repositories/reminder.repository";
import type { ReminderWriteStore } from "../ports/reminder-write-store";
import type { ReminderExecutionContext } from "../reminder-context";

export function snoozeReminderCommand(
	repository: ReminderRepository,
	writeStore: ReminderWriteStore,
) {
	return async (
		id: string,
		minutes: number,
		context: ReminderExecutionContext,
	) => {
		const existing = await repository.findById(id);

		if (!existing) {
			throw new Error("REMINDER_NOT_FOUND");
		}

		assertReminderOwnership(existing, context.userId);

		const snoozed = snoozeReminderEntity(existing, minutes);

		await writeStore.commit(snoozed, "update", context.deviceId);

		return snoozed;
	};
}
