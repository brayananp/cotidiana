import { useLiveQuery } from "dexie-react-hooks";
import { getLocalDatabase } from "@/platform/database/local-database";
import type {
	SyncConflictRecord,
	SyncEntityType,
	SyncOperationRecord,
	SyncRuntimeState,
} from "@/platform/sync/sync.types";

export type SyncModuleKey =
	| "tasks"
	| "scheduling"
	| "reminders"
	| "library"
	| "settings";

export type SyncModuleSnapshot = {
	key: SyncModuleKey;
	label: string;
	entityTypes: SyncEntityType[];
	state: SyncRuntimeState;
	pending: number;
	failed: number;
	rejected: number;
	conflicts: number;
	lastCompletedAt: string | null;
	lastError: string | null;
};

export type SyncCenterSnapshot = {
	modules: SyncModuleSnapshot[];
	operations: SyncOperationRecord[];
	unresolvedConflicts: SyncConflictRecord[];
	resolvedConflicts: number;
	cursors: Array<{
		entityType: SyncEntityType;
		cursor: number;
		updatedAt: string;
	}>;
	totals: {
		pending: number;
		processing: number;
		failed: number;
		rejected: number;
		conflicts: number;
	};
};

const MODULES: Array<{
	key: SyncModuleKey;
	label: string;
	entityTypes: SyncEntityType[];
}> = [
	{
		key: "tasks",
		label: "Tareas",
		entityTypes: ["task"],
	},
	{
		key: "scheduling",
		label: "Agenda",
		entityTypes: ["time_block", "calendar_event"],
	},
	{
		key: "reminders",
		label: "Recordatorios",
		entityTypes: ["reminder"],
	},
	{
		key: "library",
		label: "Biblioteca",
		entityTypes: ["book", "book_note"],
	},
	{
		key: "settings",
		label: "Preferencias",
		entityTypes: ["user_settings"],
	},
];

export function useSyncCenter(userId: string): SyncCenterSnapshot | undefined {
	return useLiveQuery(async () => {
		const db = getLocalDatabase();

		const [operations, conflicts, runtime, cursors] = await Promise.all([
			db.syncOperations.where("userId").equals(userId).toArray(),

			db.syncConflicts.where("userId").equals(userId).toArray(),

			db.syncRuntime.where("userId").equals(userId).toArray(),

			db.syncCursors.where("userId").equals(userId).toArray(),
		]);

		const unresolvedConflicts = conflicts
			.filter((conflict) => conflict.resolvedAt === null)
			.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

		const modules = MODULES.map((module) => {
			const moduleOperations = operations.filter((operation) =>
				module.entityTypes.includes(operation.entityType),
			);

			const moduleRuntime = runtime.filter((item) =>
				module.entityTypes.includes(item.entityType),
			);

			const states = moduleRuntime.map((item) => item.state);

			const lastCompletedAt =
				moduleRuntime
					.map((item) => item.lastCompletedAt)
					.filter((value): value is string => value !== null)
					.sort()
					.at(-1) ?? null;

			return {
				...module,
				state: aggregateRuntimeState(states),
				pending: moduleOperations.filter(
					(operation) =>
						operation.status === "pending" || operation.status === "processing",
				).length,
				failed: moduleOperations.filter(
					(operation) => operation.status === "failed",
				).length,
				rejected: moduleOperations.filter(
					(operation) => operation.status === "rejected",
				).length,
				conflicts: unresolvedConflicts.filter((conflict) =>
					module.entityTypes.includes(conflict.entityType),
				).length,
				lastCompletedAt,
				lastError:
					moduleRuntime.find((item) => item.lastError)?.lastError ?? null,
			};
		});

		return {
			modules,
			operations: operations.sort((left, right) =>
				right.updatedAt.localeCompare(left.updatedAt),
			),
			unresolvedConflicts,
			resolvedConflicts: conflicts.length - unresolvedConflicts.length,
			cursors: cursors.map((cursor) => ({
				entityType: cursor.entityType,
				cursor: cursor.cursor,
				updatedAt: cursor.updatedAt,
			})),
			totals: {
				pending: operations.filter(
					(operation) => operation.status === "pending",
				).length,
				processing: operations.filter(
					(operation) => operation.status === "processing",
				).length,
				failed: operations.filter((operation) => operation.status === "failed")
					.length,
				rejected: operations.filter(
					(operation) => operation.status === "rejected",
				).length,
				conflicts: unresolvedConflicts.length,
			},
		};
	}, [userId]);
}

function aggregateRuntimeState(states: SyncRuntimeState[]): SyncRuntimeState {
	if (states.includes("syncing")) {
		return "syncing";
	}

	if (states.includes("error")) {
		return "error";
	}

	if (states.includes("reauthentication_required")) {
		return "reauthentication_required";
	}

	if (states.includes("offline")) {
		return "offline";
	}

	return "idle";
}
