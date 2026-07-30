import { describe, expect, it } from "vitest";
import { deriveGlobalSyncStatus } from "./global-sync-status";

describe("global sync status", () => {
	it("reports a clean user with every domain synchronized", () => {
		const status = deriveGlobalSyncStatus("user-1", {
			runtimes: [],
			operations: [],
			conflicts: [],
		});

		expect(status.state).toBe("synced");
		expect(status.pending).toBe(0);
		expect(status.domains).toHaveLength(6);
		expect(status.domains.every((domain) => domain.state === "idle")).toBe(
			true,
		);
	});

	it("keeps another user's operations out of the summary", () => {
		const status = deriveGlobalSyncStatus("user-1", {
			runtimes: [],
			operations: [
				{
					userId: "user-2",
					entityType: "task",
					status: "failed",
				},
			],
			conflicts: [],
		});

		expect(status.state).toBe("synced");
		expect(status.pending).toBe(0);
	});

	it("groups related entity types under their visible domain", () => {
		const status = deriveGlobalSyncStatus("user-1", {
			runtimes: [],
			operations: [
				{
					userId: "user-1",
					entityType: "time_block",
					status: "pending",
				},
				{
					userId: "user-1",
					entityType: "calendar_event",
					status: "processing",
				},
				{
					userId: "user-1",
					entityType: "book",
					status: "rejected",
				},
			],
			conflicts: [
				{
					userId: "user-1",
					entityType: "book_note",
					resolvedAt: null,
				},
			],
		});

		expect(status.state).toBe("attention");
		expect(status.pending).toBe(2);
		expect(status.rejected).toBe(1);
		expect(status.conflicts).toBe(1);
		expect(
			status.domains.find((domain) => domain.domain === "scheduling"),
		).toMatchObject({ pending: 2 });
		expect(
			status.domains.find((domain) => domain.domain === "library"),
		).toMatchObject({ rejected: 1, conflicts: 1 });
	});

	it("uses the documented global state precedence", () => {
		const base = {
			operations: [],
			conflicts: [],
		};
		const createRuntime = (
			entityType: "task" | "reminder",
			state: "syncing" | "offline" | "reauthentication_required",
		) => ({
			userId: "user-1",
			entityType,
			state,
			lastCompletedAt: null,
			lastError: null,
		});

		const offline = deriveGlobalSyncStatus("user-1", {
			...base,
			runtimes: [
				createRuntime("task", "syncing"),
				createRuntime("reminder", "offline"),
			],
		});
		const reauthentication = deriveGlobalSyncStatus("user-1", {
			...base,
			runtimes: [
				createRuntime("task", "offline"),
				createRuntime("reminder", "reauthentication_required"),
			],
		});

		expect(offline.state).toBe("offline");
		expect(reauthentication.state).toBe("reauthentication_required");
	});

	it("preserves the latest completion and error for each domain", () => {
		const status = deriveGlobalSyncStatus("user-1", {
			runtimes: [
				{
					userId: "user-1",
					entityType: "time_block",
					state: "idle",
					lastCompletedAt: "2026-07-29T19:00:00.000Z",
					lastError: null,
				},
				{
					userId: "user-1",
					entityType: "calendar_event",
					state: "error",
					lastCompletedAt: "2026-07-29T20:00:00.000Z",
					lastError: "CALENDAR_PULL_FAILED",
				},
			],
			operations: [],
			conflicts: [],
		});

		expect(status.state).toBe("error");
		expect(
			status.domains.find((domain) => domain.domain === "scheduling"),
		).toMatchObject({
			state: "error",
			lastCompletedAt: "2026-07-29T20:00:00.000Z",
			lastError: "CALENDAR_PULL_FAILED",
		});
	});
});
