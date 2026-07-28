import { useLiveQuery } from "dexie-react-hooks";
import { getLocalDatabase } from "@/platform/database/local-database";
import { createSyncRuntimeId, type SyncRuntimeState } from "./sync.types";

export type DailyReviewSyncStatusSnapshot = {
	state: SyncRuntimeState;
	pending: number;
	rejected: number;
	conflicts: number;
	lastCompletedAt: string | null;
	lastError: string | null;
};

export function useDailyReviewSyncStatus(userId: string | undefined) {
	return useLiveQuery<DailyReviewSyncStatusSnapshot | null, null>(
		async () => {
			if (!userId) return null;
			const db = getLocalDatabase();
			const [runtime, operations, conflicts] = await Promise.all([
				db.syncRuntime.get(createSyncRuntimeId(userId, "daily_review")),
				db.syncOperations.where("userId").equals(userId).toArray(),
				db.syncConflicts.where("userId").equals(userId).toArray(),
			]);
			const reviewOperations = operations.filter(
				(item) => item.entityType === "daily_review",
			);
			return {
				state: runtime?.state ?? "idle",
				pending: reviewOperations.filter(
					(item) =>
						item.status === "pending" ||
						item.status === "processing" ||
						item.status === "failed",
				).length,
				rejected: reviewOperations.filter((item) => item.status === "rejected")
					.length,
				conflicts: conflicts.filter(
					(item) =>
						item.entityType === "daily_review" && item.resolvedAt === null,
				).length,
				lastCompletedAt: runtime?.lastCompletedAt ?? null,
				lastError: runtime?.lastError ?? null,
			};
		},
		[userId],
		null,
	);
}
