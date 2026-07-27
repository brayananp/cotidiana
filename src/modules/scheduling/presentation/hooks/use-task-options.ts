import { useLiveQuery } from "dexie-react-hooks";
import { getLocalDatabase } from "@/platform/database/local-database";

export function useTaskOptions(userId: string) {
	return useLiveQuery(
		async () => {
			const db = getLocalDatabase();

			const tasks = await db.tasks.where("userId").equals(userId).toArray();

			return tasks
				.filter((task) => task.deletedAt === null && task.archivedAt === null)
				.sort((left, right) => left.title.localeCompare(right.title))
				.map((task) => ({
					id: task.id,
					title: task.title,
				}));
		},
		[userId],
		[],
	);
}
