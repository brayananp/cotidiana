import { getLocalDatabase } from "@/platform/database/local-database";
import type { LocalSecurityProfileRecord } from "../infrastructure/local/local-security.record";
import {
	type LocalLockPreferencesInput,
	localLockPreferencesSchema,
	localPinSchema,
} from "../schemas/local-lock.schema";
import {
	createPinVerifier,
	verifyPinVerifier,
} from "./local-lock.crypto-client";
import {
	markAppUnlocked,
	setAppLockError,
	updateAppLockConfig,
} from "./local-lock-state-client";

const DEFAULT_ITERATIONS = 600_000;
const MAX_LOCK_SECONDS = 15 * 60;

export async function getLocalSecurityProfile(
	userId: string,
): Promise<LocalSecurityProfileRecord> {
	const db = getLocalDatabase();
	const existing = await db.localSecurityProfiles.get(userId);

	if (existing) {
		return existing;
	}

	const now = new Date().toISOString();
	const created: LocalSecurityProfileRecord = {
		id: userId,
		userId,
		enabled: false,
		pinSalt: null,
		pinHash: null,
		pinIterations: DEFAULT_ITERATIONS,
		failedAttempts: 0,
		lockedUntil: null,
		autoLockMinutes: 15,
		lockOnBackground: false,
		lastUnlockedAt: null,
		createdAt: now,
		updatedAt: now,
	};

	await db.localSecurityProfiles.put(created);
	return created;
}

export async function enableLocalPin(input: {
	userId: string;
	pin: string;
	preferences: LocalLockPreferencesInput;
}): Promise<void> {
	const pin = localPinSchema.parse(input.pin);
	const preferences = localLockPreferencesSchema.parse(input.preferences);

	const verifier = await createPinVerifier(pin);
	const existing = await getLocalSecurityProfile(input.userId);
	const now = new Date().toISOString();

	await getLocalDatabase().localSecurityProfiles.put({
		...existing,
		enabled: true,
		pinSalt: verifier.salt,
		pinHash: verifier.hash,
		pinIterations: verifier.iterations,
		failedAttempts: 0,
		lockedUntil: null,
		autoLockMinutes: preferences.autoLockMinutes,
		lockOnBackground: preferences.lockOnBackground,
		lastUnlockedAt: now,
		updatedAt: now,
	});

	updateAppLockConfig({
		enabled: true,
		lockedUntil: null,
	});
	markAppUnlocked();
}

export async function changeLocalPin(input: {
	userId: string;
	currentPin: string;
	newPin: string;
}): Promise<void> {
	localPinSchema.parse(input.currentPin);
	const newPin = localPinSchema.parse(input.newPin);

	const verified = await verifyLocalPin({
		userId: input.userId,
		pin: input.currentPin,
	});

	if (!verified.ok) {
		throw new Error("CURRENT_PIN_INVALID");
	}

	const verifier = await createPinVerifier(newPin);
	const profile = await getLocalSecurityProfile(input.userId);
	const now = new Date().toISOString();

	await getLocalDatabase().localSecurityProfiles.put({
		...profile,
		pinSalt: verifier.salt,
		pinHash: verifier.hash,
		pinIterations: verifier.iterations,
		failedAttempts: 0,
		lockedUntil: null,
		updatedAt: now,
	});
}

export async function disableLocalPin(input: {
	userId: string;
	currentPin: string;
}): Promise<void> {
	const verified = await verifyLocalPin({
		userId: input.userId,
		pin: input.currentPin,
	});

	if (!verified.ok) {
		throw new Error("CURRENT_PIN_INVALID");
	}

	const profile = await getLocalSecurityProfile(input.userId);
	const now = new Date().toISOString();

	await getLocalDatabase().localSecurityProfiles.put({
		...profile,
		enabled: false,
		pinSalt: null,
		pinHash: null,
		failedAttempts: 0,
		lockedUntil: null,
		lastUnlockedAt: null,
		updatedAt: now,
	});

	updateAppLockConfig({
		enabled: false,
		lockedUntil: null,
	});
	markAppUnlocked();
}

export async function updateLocalLockPreferences(input: {
	userId: string;
	preferences: LocalLockPreferencesInput;
}): Promise<void> {
	const preferences = localLockPreferencesSchema.parse(input.preferences);
	const profile = await getLocalSecurityProfile(input.userId);

	await getLocalDatabase().localSecurityProfiles.put({
		...profile,
		...preferences,
		updatedAt: new Date().toISOString(),
	});
}

export async function verifyLocalPin(input: {
	userId: string;
	pin: string;
	countFailure?: boolean;
}): Promise<{
	ok: boolean;
	lockedUntil: string | null;
}> {
	const pin = localPinSchema.parse(input.pin);
	const profile = await getLocalSecurityProfile(input.userId);
	const now = new Date();

	if (!profile.enabled || !profile.pinSalt || !profile.pinHash) {
		markAppUnlocked();
		return {
			ok: true,
			lockedUntil: null,
		};
	}

	if (profile.lockedUntil && new Date(profile.lockedUntil) > now) {
		setAppLockError("PIN_TEMPORARILY_LOCKED", profile.lockedUntil);
		return {
			ok: false,
			lockedUntil: profile.lockedUntil,
		};
	}

	const ok = await verifyPinVerifier(pin, {
		salt: profile.pinSalt,
		hash: profile.pinHash,
		iterations: profile.pinIterations,
	});

	if (ok) {
		const timestamp = now.toISOString();

		await getLocalDatabase().localSecurityProfiles.put({
			...profile,
			failedAttempts: 0,
			lockedUntil: null,
			lastUnlockedAt: timestamp,
			updatedAt: timestamp,
		});

		markAppUnlocked();
		return {
			ok: true,
			lockedUntil: null,
		};
	}

	if (input.countFailure === false) {
		return {
			ok: false,
			lockedUntil: null,
		};
	}

	const attempts = profile.failedAttempts + 1;
	const seconds = calculateLockSeconds(attempts);
	const lockedUntil =
		seconds > 0 ? new Date(now.getTime() + seconds * 1000).toISOString() : null;

	await getLocalDatabase().localSecurityProfiles.put({
		...profile,
		failedAttempts: attempts,
		lockedUntil,
		updatedAt: now.toISOString(),
	});

	setAppLockError("PIN_INVALID", lockedUntil);

	return {
		ok: false,
		lockedUntil,
	};
}

function calculateLockSeconds(attempts: number): number {
	if (attempts < 5) {
		return 0;
	}

	return Math.min(MAX_LOCK_SECONDS, 30 * 2 ** (attempts - 5));
}
