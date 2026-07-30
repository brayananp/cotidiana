import "fake-indexeddb/auto";

import Dexie, { liveQuery } from "dexie";
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { getLocalDatabase } from "@/platform/database/local-database";
import { createPinVerifier } from "../application/local-lock.crypto-client";
import {
	changeLocalPin,
	disableLocalPin,
	getLocalSecurityProfile,
} from "../application/local-lock.service-client";
import {
	getAppLockSnapshot,
	initializeAppLock,
} from "../application/local-lock-state-client";

const DATABASE_NAME = "personal-productivity-os";
const USER_ID = "security-test-user";

beforeAll(async () => {
	Object.defineProperty(globalThis, "window", {
		configurable: true,
		value: {
			addEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
			removeEventListener: vi.fn(),
		},
	});

	await Dexie.delete(DATABASE_NAME);
	await getLocalDatabase().open();
});

afterEach(async () => {
	await Promise.all(getLocalDatabase().tables.map((table) => table.clear()));
});

afterAll(async () => {
	getLocalDatabase().close();
	await Dexie.delete(DATABASE_NAME);
	Reflect.deleteProperty(globalThis, "window");
});

describe("local lock service", () => {
	it("reads an absent profile from liveQuery without a write transaction", async () => {
		const result = await new Promise<unknown>((resolve) => {
			const subscription = liveQuery(() =>
				getLocalSecurityProfile(USER_ID),
			).subscribe({
				next: (profile) => {
					subscription.unsubscribe();
					resolve(profile);
				},
				error: (error) => {
					subscription.unsubscribe();
					resolve(error);
				},
			});
		});

		expect(result).not.toBeInstanceOf(Error);
		expect(result).toMatchObject({
			id: USER_ID,
			enabled: false,
		});
	});

	it("applies progressive waiting to failed PIN changes", async () => {
		const verifier = await createPinVerifier("482915", 1_000);
		const now = new Date().toISOString();

		await getLocalDatabase().localSecurityProfiles.put({
			id: USER_ID,
			userId: USER_ID,
			enabled: true,
			pinSalt: verifier.salt,
			pinHash: verifier.hash,
			pinIterations: verifier.iterations,
			failedAttempts: 0,
			lockedUntil: null,
			autoLockMinutes: 15,
			lockOnBackground: false,
			lastUnlockedAt: now,
			createdAt: now,
			updatedAt: now,
		});

		for (let attempt = 0; attempt < 5; attempt += 1) {
			await expect(
				changeLocalPin({
					userId: USER_ID,
					currentPin: "000000",
					newPin: "123456",
				}),
			).rejects.toThrow("CURRENT_PIN_INVALID");
		}

		expect(
			await getLocalDatabase().localSecurityProfiles.get(USER_ID),
		).toMatchObject({
			failedAttempts: 5,
		});
		expect(
			(await getLocalDatabase().localSecurityProfiles.get(USER_ID))
				?.lockedUntil,
		).not.toBeNull();
	});

	it("removes the PIN verifier and unlocks the app when local locking is disabled", async () => {
		const verifier = await createPinVerifier("482915", 1_000);
		const now = new Date().toISOString();

		await getLocalDatabase().localSecurityProfiles.put({
			id: USER_ID,
			userId: USER_ID,
			enabled: true,
			pinSalt: verifier.salt,
			pinHash: verifier.hash,
			pinIterations: verifier.iterations,
			failedAttempts: 0,
			lockedUntil: null,
			autoLockMinutes: 0,
			lockOnBackground: false,
			lastUnlockedAt: now,
			createdAt: now,
			updatedAt: now,
		});

		initializeAppLock({
			userId: USER_ID,
			enabled: true,
			lockedUntil: null,
		});

		await disableLocalPin({
			userId: USER_ID,
			currentPin: "482915",
		});

		expect(
			await getLocalDatabase().localSecurityProfiles.get(USER_ID),
		).toMatchObject({
			enabled: false,
			pinSalt: null,
			pinHash: null,
			failedAttempts: 0,
			lockedUntil: null,
			lastUnlockedAt: null,
		});
		expect(getAppLockSnapshot()).toMatchObject({
			enabled: false,
			locked: false,
		});
	});
});
