import { useLiveQuery } from "dexie-react-hooks";
import { getLocalDatabase } from "@/platform/database/local-database";
import { dataBackupPayloadSchema } from "../../schemas/data-backup.schema";

export function useLocalBackups(userId: string) {
	return useLiveQuery(
		async () => {
			const backups = await getLocalDatabase()
				.localBackups.where("userId")
				.equals(userId)
				.toArray();

			return backups
				.map((backup) => ({
					...backup,
					payload: dataBackupPayloadSchema.parse(backup.payload),
				}))
				.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
		},
		[userId],
		[],
	);
}
