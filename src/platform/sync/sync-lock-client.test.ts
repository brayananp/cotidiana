import { describe, expect, it, vi } from "vitest";
import { createSyncLock } from "./sync-lock-client";

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((resolvePromise) => {
		resolve = resolvePromise;
	});
	return { promise, resolve };
}

describe("createSyncLock", () => {
	it("uses a Web Lock key scoped by domain, user and device", async () => {
		let requestedName: string | null = null;
		const withLock = createSyncLock("library", () => ({
			async request<T>(
				name: string,
				_options: { ifAvailable: true },
				callback: (lock: unknown | null) => Promise<T | null>,
			) {
				requestedName = name;
				return callback({});
			},
		}));

		await expect(
			withLock({ userId: "user 1", deviceId: "device/1" }, async () => "ok"),
		).resolves.toBe("ok");
		expect(requestedName).toBe("cotidiana:sync:library:user%201:device%2F1");
	});

	it("does not run when another tab owns the Web Lock", async () => {
		const work = vi.fn(async () => "ok");
		const withLock = createSyncLock("tasks", () => ({
			request: async (_name, _options, callback) => callback(null),
		}));

		await expect(
			withLock({ userId: "user-1", deviceId: "device-1" }, work),
		).resolves.toBeNull();
		expect(work).not.toHaveBeenCalled();
	});

	it("serializes concurrent work with its in-memory fallback", async () => {
		const gate = deferred<void>();
		const withLock = createSyncLock("reminders", () => null);
		const first = withLock(
			{ userId: "user-1", deviceId: "device-1" },
			async () => {
				await gate.promise;
				return "first";
			},
		);

		await expect(
			withLock(
				{ userId: "user-1", deviceId: "device-1" },
				async () => "second",
			),
		).resolves.toBeNull();

		gate.resolve();
		await expect(first).resolves.toBe("first");
	});
});
