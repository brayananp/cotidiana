export type AppLockSnapshot = {
	userId: string | null;
	initialized: boolean;
	enabled: boolean;
	locked: boolean;
	lockedUntil: string | null;
	error: string | null;
};

type Listener = () => void;

const listeners = new Set<Listener>();

let snapshot: AppLockSnapshot = {
	userId: null,
	initialized: false,
	enabled: false,
	locked: false,
	lockedUntil: null,
	error: null,
};

export function subscribeAppLock(listener: Listener): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function getAppLockSnapshot(): AppLockSnapshot {
	return snapshot;
}

export function getAppLockServerSnapshot(): AppLockSnapshot {
	return {
		userId: null,
		initialized: false,
		enabled: false,
		locked: false,
		lockedUntil: null,
		error: null,
	};
}

export function initializeAppLock(input: {
	userId: string;
	enabled: boolean;
	lockedUntil: string | null;
}): void {
	update({
		userId: input.userId,
		initialized: true,
		enabled: input.enabled,
		locked: input.enabled,
		lockedUntil: input.lockedUntil,
		error: null,
	});
}

export function markAppUnlocked(): void {
	update({
		locked: false,
		lockedUntil: null,
		error: null,
	});
}

export function requestAppLock(): void {
	if (!snapshot.enabled) {
		return;
	}

	update({
		locked: true,
		error: null,
	});
}

export function updateAppLockConfig(input: {
	enabled: boolean;
	lockedUntil?: string | null;
}): void {
	update({
		enabled: input.enabled,
		locked: input.enabled ? snapshot.locked : false,
		lockedUntil:
			input.lockedUntil === undefined
				? snapshot.lockedUntil
				: input.lockedUntil,
	});
}

export function setAppLockError(
	error: string | null,
	lockedUntil?: string | null,
): void {
	update({
		error,
		lockedUntil: lockedUntil === undefined ? snapshot.lockedUntil : lockedUntil,
	});
}

function update(patch: Partial<AppLockSnapshot>): void {
	snapshot = {
		...snapshot,
		...patch,
	};

	for (const listener of listeners) {
		listener();
	}
}
