import { describe, expect, it } from "vitest";
import {
	getGlobalSyncLabel,
	getManualSyncTarget,
} from "./global-sync-indicator-model";
import type { GlobalSyncStatus } from "./global-sync-status";

function createStatus(overrides: Partial<GlobalSyncStatus>): GlobalSyncStatus {
	return {
		state: "synced",
		pending: 0,
		rejected: 0,
		conflicts: 0,
		errorDomains: 0,
		lastCompletedAt: null,
		domains: [
			{
				domain: "tasks",
				state: "idle",
				pending: 0,
				rejected: 0,
				conflicts: 0,
				lastCompletedAt: null,
				lastError: null,
			},
			{
				domain: "library",
				state: "idle",
				pending: 0,
				rejected: 0,
				conflicts: 0,
				lastCompletedAt: null,
				lastError: null,
			},
		],
		...overrides,
	};
}

describe("global sync indicator model", () => {
	it.each([
		["synced", "Sincronizado"],
		["syncing", "Sincronizando…"],
		["offline", "Sin conexión"],
		["reauthentication_required", "Inicia sesión"],
	] as const)("labels %s state", (state, label) => {
		expect(getGlobalSyncLabel(createStatus({ state }))).toBe(label);
	});

	it("includes actionable totals in attention labels", () => {
		expect(
			getGlobalSyncLabel(
				createStatus({
					state: "attention",
					conflicts: 2,
					rejected: 1,
				}),
			),
		).toBe("3 requieren atención");
		expect(
			getGlobalSyncLabel(createStatus({ state: "error", errorDomains: 2 })),
		).toBe("Error en 2 secciones");
		expect(
			getGlobalSyncLabel(createStatus({ state: "pending", pending: 4 })),
		).toBe("4 cambios pendientes");
	});

	it("targets only domains with retryable work", () => {
		const status = createStatus({
			domains: [
				{
					domain: "tasks",
					state: "error",
					pending: 0,
					rejected: 0,
					conflicts: 0,
					lastCompletedAt: null,
					lastError: "TASK_PULL_FAILED",
				},
				{
					domain: "library",
					state: "idle",
					pending: 2,
					rejected: 0,
					conflicts: 0,
					lastCompletedAt: null,
					lastError: null,
				},
			],
		});

		expect(getManualSyncTarget(status)).toEqual(["tasks", "library"]);
		expect(getManualSyncTarget(createStatus({}))).toBe("all");
	});

	it("targets a domain with conflicts even when it has no pending operations", () => {
		const status = createStatus({
			domains: [
				{
					domain: "tasks",
					state: "idle",
					pending: 0,
					rejected: 0,
					conflicts: 1,
					lastCompletedAt: null,
					lastError: null,
				},
				{
					domain: "library",
					state: "idle",
					pending: 0,
					rejected: 0,
					conflicts: 0,
					lastCompletedAt: null,
					lastError: null,
				},
			],
		});

		expect(getManualSyncTarget(status)).toEqual(["tasks"]);
	});
});
