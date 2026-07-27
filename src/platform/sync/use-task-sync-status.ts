import { useLiveQuery } from "dexie-react-hooks";
import { getLocalDatabase } from "@/platform/database/local-database";
import { createSyncRuntimeId } from "./sync.types";

export function useTaskSyncStatus(userId: string | undefined) {
	return useLiveQuery(
		async () => {
			if (!userId) {
				return null;
			}

			const db = getLocalDatabase();
			const [runtime, operations, conflicts] = await Promise.all([
				db.syncRuntime.get(createSyncRuntimeId(userId, "task")),
				db.syncOperations.where("userId").equals(userId).toArray(),
				db.syncConflicts
					.where("userId")
					.equals(userId)
					.filter(
						(conflict) =>
							conflict.entityType === "task" && conflict.resolvedAt === null,
					)
					.count(),
			]);

			const taskOperations = operations.filter(
				(operation) => operation.entityType === "task",
			);

			return {
				state: runtime?.state ?? "idle",
				pending: taskOperations.filter(
					(operation) =>
						operation.status === "pending" ||
						operation.status === "processing" ||
						operation.status === "failed",
				).length,
				rejected: taskOperations.filter(
					(operation) => operation.status === "rejected",
				).length,
				conflicts,
				lastCompletedAt: runtime?.lastCompletedAt ?? null,
				lastError: runtime?.lastError ?? null,
			};
		},
		[userId],
		null,
	);
}
