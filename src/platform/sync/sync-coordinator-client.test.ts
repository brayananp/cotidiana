import { describe, expect, it, vi } from "vitest";
import {
	createSyncCoordinator,
	type SyncEngine,
} from "./sync-coordinator-client";

type TestDomain = "tasks" | "scheduling" | "library";

function createDeferred() {
	let resolve!: () => void;
	let reject!: (error: unknown) => void;

	const promise = new Promise<void>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});

	return { promise, resolve, reject };
}

describe("sync coordinator", () => {
	it("coalesces duplicate requests made in the same turn", async () => {
		const run = vi.fn(async () => undefined);
		const coordinator = createSyncCoordinator({
			engines: {
				tasks: { run },
			},
		});

		const first = coordinator.request("tasks");
		const second = coordinator.request("tasks");

		expect(second).toBe(first);

		const report = await first;

		expect(run).toHaveBeenCalledTimes(1);
		expect(report.runs).toEqual([
			{ domain: "tasks", pass: 1, status: "fulfilled" },
		]);
	});

	it("runs requests received during an active pass in the next pass", async () => {
		const firstTaskRun = createDeferred();
		const taskRun = vi
			.fn<SyncEngine["run"]>()
			.mockImplementationOnce(() => firstTaskRun.promise)
			.mockResolvedValue(undefined);
		const schedulingRun = vi.fn(async () => undefined);
		const coordinator = createSyncCoordinator({
			engines: {
				tasks: { run: taskRun },
				scheduling: { run: schedulingRun },
			},
		});

		const drain = coordinator.request("tasks");
		await vi.waitFor(() => expect(taskRun).toHaveBeenCalledTimes(1));

		const sameDrain = coordinator.request(["tasks", "scheduling", "tasks"]);

		expect(sameDrain).toBe(drain);
		firstTaskRun.resolve();

		const report = await drain;

		expect(taskRun).toHaveBeenCalledTimes(2);
		expect(schedulingRun).toHaveBeenCalledTimes(1);
		expect(report.runs).toEqual([
			{ domain: "tasks", pass: 1, status: "fulfilled" },
			{ domain: "tasks", pass: 2, status: "fulfilled" },
			{ domain: "scheduling", pass: 2, status: "fulfilled" },
		]);
	});

	it("runs every registered engine for an all request", async () => {
		const calls: TestDomain[] = [];
		const createEngine = (domain: TestDomain): SyncEngine => ({
			run: async () => {
				calls.push(domain);
			},
		});
		const coordinator = createSyncCoordinator({
			engines: {
				tasks: createEngine("tasks"),
				scheduling: createEngine("scheduling"),
				library: createEngine("library"),
			},
		});

		const report = await coordinator.request("all");

		expect(calls).toEqual(["tasks", "scheduling", "library"]);
		expect(report.runs).toHaveLength(3);
	});

	it("respects the configured concurrency limit", async () => {
		let active = 0;
		let peak = 0;
		const releases: Array<() => void> = [];
		const createEngine = (): SyncEngine => ({
			run: async () => {
				active += 1;
				peak = Math.max(peak, active);

				await new Promise<void>((resolve) => {
					releases.push(resolve);
				});

				active -= 1;
			},
		});
		const coordinator = createSyncCoordinator({
			engines: {
				tasks: createEngine(),
				scheduling: createEngine(),
				library: createEngine(),
			},
			maxConcurrency: 2,
		});

		const drain = coordinator.request("all");

		await vi.waitFor(() => expect(releases).toHaveLength(2));
		releases.shift()?.();
		await vi.waitFor(() => expect(releases).toHaveLength(2));
		releases.shift()?.();
		releases.shift()?.();
		await drain;

		expect(peak).toBe(2);
	});

	it("isolates engine failures and can run again afterward", async () => {
		const error = new Error("library unavailable");
		const taskRun = vi.fn(async () => undefined);
		const libraryRun = vi
			.fn<SyncEngine["run"]>()
			.mockRejectedValueOnce(error)
			.mockResolvedValue(undefined);
		const coordinator = createSyncCoordinator({
			engines: {
				tasks: { run: taskRun },
				library: { run: libraryRun },
			},
		});

		const firstReport = await coordinator.request("all");

		expect(firstReport.runs).toEqual([
			{ domain: "tasks", pass: 1, status: "fulfilled" },
			{ domain: "library", pass: 1, status: "rejected", error },
		]);

		const secondReport = await coordinator.request("library");

		expect(libraryRun).toHaveBeenCalledTimes(2);
		expect(secondReport.runs).toEqual([
			{ domain: "library", pass: 1, status: "fulfilled" },
		]);
	});
});
