import {
	assertReminderOwnership,
	dismissReminderEntity,
} from "../../domain/reminder";
import type { ReminderRepository } from "../../domain/repositories/reminder.repository";
import type { ReminderWriteStore } from "../ports/reminder-write-store";
import type { ReminderExecutionContext } from "../reminder-context";

export function dismissReminderCommand(
	repository: ReminderRepository,
	writeStore: ReminderWriteStore,
) {
	return async (id: string, context: ReminderExecutionContext) => {
		const existing = await repository.findById(id);

		if (!existing) {
			throw new Error("REMINDER_NOT_FOUND");
		}

		assertReminderOwnership(existing, context.userId);

		const dismissed = dismissReminderEntity(existing);

		await writeStore.commit(dismissed, "update", context.deviceId);

		return dismissed;
	};
}
