import { useLiveQuery } from "dexie-react-hooks";
import { getLocalDatabase } from "@/platform/database/local-database";
import { createSyncRuntimeId, type SyncRuntimeState } from "./sync.types";

export type SettingsSyncStatusSnapshot = {
	state: SyncRuntimeState;
	pending: number;
	rejected: number;
	conflicts: number;
	lastCompletedAt: string | null;
	lastError: string | null;
};

export function useSettingsSyncStatus(
	userId: string | undefined,
): SettingsSyncStatusSnapshot | null | undefined {
	return useLiveQuery<SettingsSyncStatusSnapshot | null, null>(
		async () => {
			if (!userId) {
				return null;
			}

			const db = getLocalDatabase();
			const [runtime, operations, conflicts] = await Promise.all([
				db.syncRuntime.get(createSyncRuntimeId(userId, "user_settings")),
				db.syncOperations.where("userId").equals(userId).toArray(),
				db.syncConflicts.where("userId").equals(userId).toArray(),
			]);

			const settingsOperations = operations.filter(
				(item) => item.entityType === "user_settings",
			);

			return {
				state: runtime?.state ?? "idle",
				pending: settingsOperations.filter(
					(item) =>
						item.status === "pending" ||
						item.status === "processing" ||
						item.status === "failed",
				).length,
				rejected: settingsOperations.filter(
					(item) => item.status === "rejected",
				).length,
				conflicts: conflicts.filter(
					(item) =>
						item.entityType === "user_settings" && item.resolvedAt === null,
				).length,
				lastCompletedAt: runtime?.lastCompletedAt ?? null,
				lastError: runtime?.lastError ?? null,
			};
		},
		[userId],
		null,
	);
}
