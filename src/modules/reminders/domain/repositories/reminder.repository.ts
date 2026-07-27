import type { Reminder } from "../reminder";
import type { ReminderQuery } from "../reminder-query";

export interface ReminderRepository {
	findById(id: string): Promise<Reminder | null>;

	list(query: ReminderQuery): Promise<Reminder[]>;
}
