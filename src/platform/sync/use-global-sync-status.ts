import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { getLocalDatabase } from "@/platform/database/local-database";
import type { GlobalSyncStatus } from "./global-sync-status";
import {
	loadGlobalSyncStatus,
	pruneResolvedSyncConflicts,
} from "./global-sync-status-query-client";

export function useGlobalSyncStatus(
	userId: string | undefined,
): GlobalSyncStatus | null | undefined {
	useEffect(() => {
		if (!userId) {
			return;
		}

		void pruneResolvedSyncConflicts(getLocalDatabase(), userId).catch(
			() => undefined,
		);
	}, [userId]);

	return useLiveQuery<GlobalSyncStatus | null>(async () => {
		if (!userId) {
			return null;
		}

		const db = getLocalDatabase();
		return loadGlobalSyncStatus(db, userId);
	}, [userId]);
}
