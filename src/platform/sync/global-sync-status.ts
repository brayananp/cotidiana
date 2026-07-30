import type {
	SyncEntityType,
	SyncOperationStatus,
	SyncRuntimeState,
} from "./sync.types";
import { SYNC_DOMAINS, type SyncDomain } from "./sync-coordinator-client";

export type GlobalSyncState =
	| "synced"
	| "pending"
	| "syncing"
	| "offline"
	| "reauthentication_required"
	| "attention"
	| "error";

export type DomainSyncStatus = {
	domain: SyncDomain;
	state: SyncRuntimeState;
	pending: number;
	rejected: number;
	conflicts: number;
	lastCompletedAt: string | null;
	lastError: string | null;
};

export type GlobalSyncStatus = {
	state: GlobalSyncState;
	pending: number;
	rejected: number;
	conflicts: number;
	errorDomains: number;
	lastCompletedAt: string | null;
	domains: DomainSyncStatus[];
};

type RuntimeInput = {
	userId: string;
	entityType: SyncEntityType;
	state: SyncRuntimeState;
	lastCompletedAt: string | null;
	lastError: string | null;
};

type OperationInput = {
	userId: string;
	entityType: SyncEntityType;
	status: SyncOperationStatus;
};

type ConflictInput = {
	userId: string;
	entityType: SyncEntityType;
	resolvedAt: string | null;
};

type GlobalSyncStatusInput = {
	runtimes: readonly RuntimeInput[];
	operations: readonly OperationInput[];
	conflicts: readonly ConflictInput[];
};

const ENTITY_DOMAINS: Record<SyncEntityType, SyncDomain> = {
	task: "tasks",
	time_block: "scheduling",
	calendar_event: "scheduling",
	reminder: "reminders",
	book: "library",
	book_note: "library",
	user_settings: "settings",
	daily_review: "daily-review",
};

const RUNTIME_STATE_PRIORITY: Record<SyncRuntimeState, number> = {
	idle: 0,
	error: 1,
	syncing: 2,
	offline: 3,
	reauthentication_required: 4,
};

export function deriveGlobalSyncStatus(
	userId: string,
	input: GlobalSyncStatusInput,
): GlobalSyncStatus {
	const byDomain = new Map<SyncDomain, DomainSyncStatus>(
		SYNC_DOMAINS.map((domain) => [
			domain,
			{
				domain,
				state: "idle",
				pending: 0,
				rejected: 0,
				conflicts: 0,
				lastCompletedAt: null,
				lastError: null,
			},
		]),
	);

	for (const runtime of input.runtimes) {
		if (runtime.userId !== userId) {
			continue;
		}

		const status = byDomain.get(ENTITY_DOMAINS[runtime.entityType]);

		if (!status) {
			continue;
		}

		if (
			RUNTIME_STATE_PRIORITY[runtime.state] >
			RUNTIME_STATE_PRIORITY[status.state]
		) {
			status.state = runtime.state;
		}

		if (
			runtime.lastCompletedAt &&
			(!status.lastCompletedAt ||
				runtime.lastCompletedAt > status.lastCompletedAt)
		) {
			status.lastCompletedAt = runtime.lastCompletedAt;
		}

		if (runtime.lastError) {
			status.lastError = runtime.lastError;
		}
	}

	for (const operation of input.operations) {
		if (operation.userId !== userId) {
			continue;
		}

		const status = byDomain.get(ENTITY_DOMAINS[operation.entityType]);

		if (!status) {
			continue;
		}

		if (operation.status === "rejected") {
			status.rejected += 1;
		} else if (
			operation.status === "pending" ||
			operation.status === "processing" ||
			operation.status === "failed"
		) {
			status.pending += 1;
		}
	}

	for (const conflict of input.conflicts) {
		if (conflict.userId !== userId || conflict.resolvedAt !== null) {
			continue;
		}

		const status = byDomain.get(ENTITY_DOMAINS[conflict.entityType]);

		if (status) {
			status.conflicts += 1;
		}
	}

	const domains = [...byDomain.values()];
	const pending = sum(domains, "pending");
	const rejected = sum(domains, "rejected");
	const conflicts = sum(domains, "conflicts");
	const errorDomains = domains.filter(
		(domain) => domain.state === "error",
	).length;
	const completedDates = domains
		.map((domain) => domain.lastCompletedAt)
		.filter((value): value is string => value !== null);

	return {
		state: deriveGlobalState(domains, pending, rejected, conflicts),
		pending,
		rejected,
		conflicts,
		errorDomains,
		lastCompletedAt: completedDates.sort().at(-1) ?? null,
		domains,
	};
}

function deriveGlobalState(
	domains: readonly DomainSyncStatus[],
	pending: number,
	rejected: number,
	conflicts: number,
): GlobalSyncState {
	const states = new Set(domains.map((domain) => domain.state));

	if (states.has("reauthentication_required")) {
		return "reauthentication_required";
	}

	if (states.has("offline")) {
		return "offline";
	}

	if (states.has("syncing")) {
		return "syncing";
	}

	if (rejected > 0 || conflicts > 0) {
		return "attention";
	}

	if (states.has("error")) {
		return "error";
	}

	return pending > 0 ? "pending" : "synced";
}

function sum(
	domains: readonly DomainSyncStatus[],
	key: "pending" | "rejected" | "conflicts",
): number {
	return domains.reduce((total, domain) => total + domain[key], 0);
}
