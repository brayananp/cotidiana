import {
	assertReminderOwnership,
	updateReminderEntity,
} from "../../domain/reminder";
import type { ReminderRepository } from "../../domain/repositories/reminder.repository";
import { reminderFormSchema } from "../../schemas/reminder-form.schema";
import { localDateTimeToIso } from "../date-mapper";
import type { ReminderWriteStore } from "../ports/reminder-write-store";
import type { ReminderExecutionContext } from "../reminder-context";

export function updateReminderCommand(
	repository: ReminderRepository,
	writeStore: ReminderWriteStore,
) {
	return async (
		id: string,
		rawInput: unknown,
		context: ReminderExecutionContext,
	) => {
		const input = reminderFormSchema.parse(rawInput);

		const existing = await repository.findById(id);

		if (!existing) {
			throw new Error("REMINDER_NOT_FOUND");
		}

		assertReminderOwnership(existing, context.userId);

		const updated = updateReminderEntity(existing, {
			title: input.title,
			notes: input.notes || null,
			targetType: input.targetType,
			targetId: input.targetType === "custom" ? null : input.targetId,
			remindAt: localDateTimeToIso(input.remindAt),
			recurrence: input.recurrence,
			repeatInterval: input.repeatInterval,
			timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
		});

		await writeStore.commit(updated, "update", context.deviceId);

		return updated;
	};
}
