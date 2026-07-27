import type { ReminderQuery } from "../../domain/reminder-query";
import type { ReminderRepository } from "../../domain/repositories/reminder.repository";

export function listRemindersQuery(repository: ReminderRepository) {
	return (query: ReminderQuery) => repository.list(query);
}
