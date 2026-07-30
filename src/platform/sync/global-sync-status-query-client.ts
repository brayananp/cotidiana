import type { ProductivityLocalDatabase } from "@/platform/database/local-database";
import {
	deriveGlobalSyncStatus,
	type GlobalSyncStatus,
} from "./global-sync-status";
import type { SyncOperationStatus } from "./sync.types";

const VISIBLE_OPERATION_STATUSES: readonly SyncOperationStatus[] = [
	"pending",
	"processing",
	"failed",
	"rejected",
];
const RESOLVED_CONFLICT_RETENTION_MS = 30 * 24 * 60 * 60_000;

export async function pruneResolvedSyncConflicts(
	db: ProductivityLocalDatabase,
	userId: string,
	now = new Date(),
): Promise<number> {
	const retentionCutoff = new Date(
		now.getTime() - RESOLVED_CONFLICT_RETENTION_MS,
	).toISOString();

	return db.syncConflicts
		.where("resolvedAt")
		.below(retentionCutoff)
		.and((conflict) => conflict.userId === userId)
		.delete();
}

export async function loadGlobalSyncStatus(
	db: ProductivityLocalDatabase,
	userId: string,
): Promise<GlobalSyncStatus> {
	const [runtimes, operationGroups, conflicts] = await Promise.all([
		db.syncRuntime.where("userId").equals(userId).toArray(),
		Promise.all(
			VISIBLE_OPERATION_STATUSES.map((status) =>
				db.syncOperations
					.where("[userId+status]")
					.equals([userId, status])
					.toArray(),
			),
		),
		db.syncConflicts
			.where("userId")
			.equals(userId)
			.filter((conflict) => conflict.resolvedAt === null)
			.toArray(),
	]);

	return deriveGlobalSyncStatus(userId, {
		runtimes,
		operations: operationGroups.flat(),
		conflicts,
	});
}
