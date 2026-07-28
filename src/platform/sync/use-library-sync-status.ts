import { useLiveQuery } from "dexie-react-hooks";
import { getLocalDatabase } from "@/platform/database/local-database";
import { createSyncRuntimeId, type SyncRuntimeState } from "./sync.types";

export type LibrarySyncStatusSnapshot = {
	state: SyncRuntimeState;
	pending: number;
	rejected: number;
	conflicts: number;
	lastCompletedAt: string | null;
	lastError: string | null;
};

export function useLibrarySyncStatus(
	userId: string | undefined,
): LibrarySyncStatusSnapshot | null | undefined {
	return useLiveQuery<LibrarySyncStatusSnapshot | null, null>(
		async () => {
			if (!userId) {
				return null;
			}

			const db = getLocalDatabase();

			const [bookRuntime, noteRuntime, operations, conflictRows] =
				await Promise.all([
					db.syncRuntime.get(createSyncRuntimeId(userId, "book")),

					db.syncRuntime.get(createSyncRuntimeId(userId, "book_note")),

					db.syncOperations.where("userId").equals(userId).toArray(),

					db.syncConflicts.where("userId").equals(userId).toArray(),
				]);

			const libraryOperations = operations.filter(
				(operation) =>
					operation.entityType === "book" ||
					operation.entityType === "book_note",
			);

			const states = [
				bookRuntime?.state ?? "idle",
				noteRuntime?.state ?? "idle",
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
				bookRuntime?.lastCompletedAt,
				noteRuntime?.lastCompletedAt,
			].filter((value): value is string => Boolean(value));

			return {
				state,

				pending: libraryOperations.filter(
					(operation) =>
						operation.status === "pending" ||
						operation.status === "processing" ||
						operation.status === "failed",
				).length,

				rejected: libraryOperations.filter(
					(operation) => operation.status === "rejected",
				).length,

				conflicts: conflictRows.filter(
					(conflict) =>
						(conflict.entityType === "book" ||
							conflict.entityType === "book_note") &&
						conflict.resolvedAt === null,
				).length,

				lastCompletedAt: completedDates.sort().at(-1) ?? null,

				lastError: bookRuntime?.lastError ?? noteRuntime?.lastError ?? null,
			};
		},
		[userId],
		null,
	);
}
