import { useLiveQuery } from "dexie-react-hooks";
import { getLocalDatabase } from "@/platform/database/local-database";
import { createSyncRuntimeId, type SyncRuntimeState } from "./sync.types";

export type ReminderSyncStatusSnapshot = {
	state: SyncRuntimeState;
	pending: number;
	rejected: number;
	conflicts: number;
	lastCompletedAt: string | null;
	lastError: string | null;
};

export function useReminderSyncStatus(
	userId: string | undefined,
): ReminderSyncStatusSnapshot | null | undefined {
	return useLiveQuery<ReminderSyncStatusSnapshot | null>(
		async () => {
			if (!userId) {
				return null;
			}

			const db = getLocalDatabase();

			const [runtime, operations, conflictRows] = await Promise.all([
				db.syncRuntime.get(createSyncRuntimeId(userId, "reminder")),

				db.syncOperations.where("userId").equals(userId).toArray(),

				db.syncConflicts.where("userId").equals(userId).toArray(),
			]);

			const reminderOperations = operations.filter(
				(operation) => operation.entityType === "reminder",
			);

			return {
				state: runtime?.state ?? "idle",

				pending: reminderOperations.filter(
					(operation) =>
						operation.status === "pending" ||
						operation.status === "processing" ||
						operation.status === "failed",
				).length,

				rejected: reminderOperations.filter(
					(operation) => operation.status === "rejected",
				).length,

				conflicts: conflictRows.filter(
					(conflict) =>
						conflict.entityType === "reminder" && conflict.resolvedAt === null,
				).length,

				lastCompletedAt: runtime?.lastCompletedAt ?? null,

				lastError: runtime?.lastError ?? null,
			};
		},
		[userId],
		null,
	);
}
