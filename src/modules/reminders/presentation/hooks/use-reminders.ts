import { useLiveQuery } from "dexie-react-hooks";
import type { ReminderStatus } from "../../domain/reminder";
import { remindersDependencies } from "../../infrastructure/reminders.dependencies";

export function useReminders(
	userId: string,
	statuses: ReminderStatus[],
	search: string,
) {
	return useLiveQuery(
		() =>
			remindersDependencies.listReminders({
				userId,
				statuses,
				search,
				includeDeleted: false,
			}),
		[userId, statuses.join(","), search],
		[],
	);
}
