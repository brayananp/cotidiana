import { describe, expect, it } from "vitest";
import { createSyncSessionStartRegistry } from "./sync-session-start-client";

describe("sync session start registry", () => {
	it("allows a Strict Mode remount to acquire the initial sync after cleanup", () => {
		const registry = createSyncSessionStartRegistry();
		const releaseFirstMount = registry.acquire("user-1:device-1");

		expect(releaseFirstMount).not.toBeNull();
		expect(registry.acquire("user-1:device-1")).toBeNull();

		releaseFirstMount?.();

		expect(registry.acquire("user-1:device-1")).not.toBeNull();
	});

	it("does not let a stale cleanup release a newer reservation", () => {
		const registry = createSyncSessionStartRegistry();
		const releaseFirstMount = registry.acquire("user-1:device-1");

		releaseFirstMount?.();
		const releaseSecondMount = registry.acquire("user-1:device-1");
		releaseFirstMount?.();

		expect(releaseSecondMount).not.toBeNull();
		expect(registry.acquire("user-1:device-1")).toBeNull();
	});
});
