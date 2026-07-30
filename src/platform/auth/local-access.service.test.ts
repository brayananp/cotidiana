import { describe, expect, it, vi } from "vitest";
import { createSignOutCurrentDevice } from "./local-access.service";

describe("sign out current device", () => {
	it("disables local access without a pending marker after remote sign-out succeeds", async () => {
		const disableLocalAccess = vi.fn(async () => undefined);
		const signOut = createSignOutCurrentDevice({
			browserReportsOnline: () => true,
			isServerAvailable: async () => true,
			signOutRemote: async () => ({ error: null }),
			disableLocalAccess,
		});

		await signOut();

		expect(disableLocalAccess).toHaveBeenCalledWith(false);
	});

	it("disables local access and records a pending remote sign-out when the remote request throws", async () => {
		const disableLocalAccess = vi.fn(async () => undefined);
		const signOut = createSignOutCurrentDevice({
			browserReportsOnline: () => true,
			isServerAvailable: async () => true,
			signOutRemote: async () => {
				throw new Error("network failed");
			},
			disableLocalAccess,
		});

		await expect(signOut()).resolves.toBeUndefined();
		expect(disableLocalAccess).toHaveBeenCalledWith(true);
	});

	it("does not attempt remote sign-out while offline", async () => {
		const signOutRemote = vi.fn(async () => ({ error: null }));
		const disableLocalAccess = vi.fn(async () => undefined);
		const signOut = createSignOutCurrentDevice({
			browserReportsOnline: () => false,
			isServerAvailable: async () => true,
			signOutRemote,
			disableLocalAccess,
		});

		await signOut();

		expect(signOutRemote).not.toHaveBeenCalled();
		expect(disableLocalAccess).toHaveBeenCalledWith(true);
	});
});
