import { useLiveQuery } from "dexie-react-hooks";
import { getLocalDatabase } from "@/platform/database/local-database";
import {
	deriveGlobalSyncStatus,
	type GlobalSyncStatus,
} from "./global-sync-status";

export function useGlobalSyncStatus(
	userId: string | undefined,
): GlobalSyncStatus | null | undefined {
	return useLiveQuery<GlobalSyncStatus | null>(async () => {
		if (!userId) {
			return null;
		}

		const db = getLocalDatabase();
		const [runtimes, operations, conflicts] = await Promise.all([
			db.syncRuntime.where("userId").equals(userId).toArray(),
			db.syncOperations.where("userId").equals(userId).toArray(),
			db.syncConflicts.where("userId").equals(userId).toArray(),
		]);

		return deriveGlobalSyncStatus(userId, {
			runtimes,
			operations,
			conflicts,
		});
	}, [userId]);
}
