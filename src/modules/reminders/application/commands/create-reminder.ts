import { createReminderEntity } from "../../domain/reminder";
import { reminderFormSchema } from "../../schemas/reminder-form.schema";
import { localDateTimeToIso } from "../date-mapper";
import type { ReminderWriteStore } from "../ports/reminder-write-store";
import type { ReminderExecutionContext } from "../reminder-context";

export function createReminderCommand(writeStore: ReminderWriteStore) {
	return async (rawInput: unknown, context: ReminderExecutionContext) => {
		const input = reminderFormSchema.parse(rawInput);

		const reminder = createReminderEntity({
			userId: context.userId,
			title: input.title,
			notes: input.notes || null,
			targetType: input.targetType,
			targetId: input.targetType === "custom" ? null : input.targetId,
			remindAt: localDateTimeToIso(input.remindAt),
			recurrence: input.recurrence,
			repeatInterval: input.repeatInterval,
			timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
		});

		await writeStore.commit(reminder, "create", context.deviceId);

		return reminder;
	};
}
