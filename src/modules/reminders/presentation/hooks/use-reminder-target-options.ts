import { useLiveQuery } from "dexie-react-hooks";
import { getLocalDatabase } from "@/platform/database/local-database";
import type { ReminderTargetType } from "../../domain/reminder";

export type ReminderTargetOption = {
	id: string;
	label: string;
};

export function useReminderTargetOptions(
	userId: string,
	targetType: ReminderTargetType,
): ReminderTargetOption[] {
	return (
		useLiveQuery(
			async () => {
				const db = getLocalDatabase();

				if (targetType === "custom") {
					return [];
				}

				if (targetType === "task") {
					const tasks = await db.tasks.where("userId").equals(userId).toArray();

					return tasks
						.filter(
							(task) => task.deletedAt === null && task.archivedAt === null,
						)
						.map((task) => ({
							id: task.id,
							label: task.title,
						}));
				}

				if (targetType === "time_block") {
					const blocks = await db.timeBlocks
						.where("userId")
						.equals(userId)
						.toArray();

					return blocks
						.filter((block) => block.deletedAt === null)
						.map((block) => ({
							id: block.id,
							label: `${block.title} · ${formatDate(block.startAt)}`,
						}));
				}

				const events = await db.calendarEvents
					.where("userId")
					.equals(userId)
					.toArray();

				return events
					.filter((event) => event.deletedAt === null)
					.map((event) => ({
						id: event.id,
						label: `${event.title} · ${formatDate(event.startAt)}`,
					}));
			},
			[userId, targetType],
			[],
		) ?? []
	);
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat("es-PE", {
		dateStyle: "short",
		timeStyle: "short",
	}).format(new Date(value));
}
