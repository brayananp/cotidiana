import { useLiveQuery } from "dexie-react-hooks";
import { getLocalDatabase } from "@/platform/database/local-database";
import type { SyncRuntimeState } from "./sync.types";
import { createSyncRuntimeId } from "./sync.types";

export type SchedulingSyncStatusSnapshot = {
	state: SyncRuntimeState;
	pending: number;
	rejected: number;
	conflicts: number;
	lastCompletedAt: string | null;
	lastError: string | null;
};

export function useSchedulingSyncStatus(
	userId: string | undefined,
): SchedulingSyncStatusSnapshot | null | undefined {
	return useLiveQuery<SchedulingSyncStatusSnapshot | null>(async () => {
		if (!userId) {
			return null;
		}

		const db = getLocalDatabase();

		const [blockRuntime, eventRuntime, operations, conflictRows] =
			await Promise.all([
				db.syncRuntime.get(createSyncRuntimeId(userId, "time_block")),

				db.syncRuntime.get(createSyncRuntimeId(userId, "calendar_event")),

				db.syncOperations.where("userId").equals(userId).toArray(),

				db.syncConflicts.where("userId").equals(userId).toArray(),
			]);

		const schedulingOperations = operations.filter(
			(operation) =>
				operation.entityType === "time_block" ||
				operation.entityType === "calendar_event",
		);

		const states = [
			blockRuntime?.state ?? "idle",
			eventRuntime?.state ?? "idle",
		];

		const state = states.includes("syncing")
			? "syncing"
			: states.includes("error")
				? "error"
				: states.includes("reauthentication_required")
					? "reauthentication_required"
					: states.includes("offline")
						? "offline"
						: "idle";

		const completedDates = [
			blockRuntime?.lastCompletedAt,
			eventRuntime?.lastCompletedAt,
		].filter((value): value is string => Boolean(value));

		return {
			state,

			pending: schedulingOperations.filter(
				(operation) =>
					operation.status === "pending" ||
					operation.status === "processing" ||
					operation.status === "failed",
			).length,

			rejected: schedulingOperations.filter(
				(operation) => operation.status === "rejected",
			).length,

			conflicts: conflictRows.filter(
				(conflict) =>
					(conflict.entityType === "time_block" ||
						conflict.entityType === "calendar_event") &&
					conflict.resolvedAt === null,
			).length,

			lastCompletedAt: completedDates.sort().at(-1) ?? null,

			lastError: blockRuntime?.lastError ?? eventRuntime?.lastError ?? null,
		};
	}, [userId]) as SchedulingSyncStatusSnapshot | null | undefined;
}
