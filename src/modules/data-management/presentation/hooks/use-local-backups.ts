import { useLiveQuery } from "dexie-react-hooks";
import { getLocalDatabase } from "@/platform/database/local-database";

export function useLocalBackups(userId: string) {
	return useLiveQuery(
		async () => {
			const backups = await getLocalDatabase()
				.localBackups.where("userId")
				.equals(userId)
				.toArray();

			return backups.sort((left, right) =>
				right.createdAt.localeCompare(left.createdAt),
			);
		},
		[userId],
		[],
	);
}
