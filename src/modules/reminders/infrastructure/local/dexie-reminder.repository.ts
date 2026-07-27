import { getLocalDatabase } from "@/platform/database/local-database";
import type { Reminder } from "../../domain/reminder";
import type { ReminderQuery } from "../../domain/reminder-query";
import type { ReminderRepository } from "../../domain/repositories/reminder.repository";
import { reminderFromRecord } from "./reminder.mapper";

export class DexieReminderRepository implements ReminderRepository {
	async findById(id: string): Promise<Reminder | null> {
		const record = await getLocalDatabase().reminders.get(id);

		return record ? reminderFromRecord(record) : null;
	}

	async list(query: ReminderQuery): Promise<Reminder[]> {
		const records = await getLocalDatabase()
			.reminders.where("userId")
			.equals(query.userId)
			.toArray();

		const search = query.search?.trim().toLowerCase() ?? "";

		return records
			.filter((record) => {
				if (!query.includeDeleted && record.deletedAt) {
					return false;
				}

				if (query.statuses?.length && !query.statuses.includes(record.status)) {
					return false;
				}

				if (
					query.targetTypes?.length &&
					!query.targetTypes.includes(record.targetType)
				) {
					return false;
				}

				if (search) {
					const searchable =
						`${record.title} ${record.notes ?? ""}`.toLowerCase();

					if (!searchable.includes(search)) {
						return false;
					}
				}

				return true;
			})
			.sort(compareReminders)
			.map(reminderFromRecord);
	}
}

function compareReminders(
	left: {
		nextTriggerAt: string | null;
		updatedAt: string;
	},
	right: {
		nextTriggerAt: string | null;
		updatedAt: string;
	},
): number {
	if (left.nextTriggerAt && right.nextTriggerAt) {
		return left.nextTriggerAt.localeCompare(right.nextTriggerAt);
	}

	if (left.nextTriggerAt) {
		return -1;
	}

	if (right.nextTriggerAt) {
		return 1;
	}

	return right.updatedAt.localeCompare(left.updatedAt);
}
