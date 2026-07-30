type LockManagerLike = {
	request<T>(
		name: string,
		options: { ifAvailable: true },
		callback: (lock: unknown | null) => Promise<T | null>,
	): Promise<T | null>;
};

type SyncLockContext = {
	userId: string;
	deviceId: string;
};

function getBrowserLockManager(): LockManagerLike | null {
	if (typeof navigator === "undefined") {
		return null;
	}

	return (navigator as Navigator & { locks?: LockManagerLike }).locks ?? null;
}

function createLockName(domain: string, context: SyncLockContext): string {
	return [
		"cotidiana",
		"sync",
		domain,
		encodeURIComponent(context.userId),
		encodeURIComponent(context.deviceId),
	].join(":");
}

export function createSyncLock(
	domain: string,
	getLockManager: () => LockManagerLike | null = getBrowserLockManager,
) {
	let fallbackLock = false;

	return async function withSyncLock<T>(
		context: SyncLockContext,
		work: () => Promise<T>,
	): Promise<T | null> {
		const lockManager = getLockManager();

		if (lockManager) {
			return lockManager.request(
				createLockName(domain, context),
				{ ifAvailable: true },
				async (lock) => (lock ? work() : null),
			);
		}

		if (fallbackLock) {
			return null;
		}

		fallbackLock = true;

		try {
			return await work();
		} finally {
			fallbackLock = false;
		}
	};
}

export const withTaskSyncLock = createSyncLock("tasks");
export const withSchedulingSyncLock = createSyncLock("scheduling");
export const withReminderSyncLock = createSyncLock("reminders");
export const withLibrarySyncLock = createSyncLock("library");
export const withSettingsSyncLock = createSyncLock("settings");
export const withDailyReviewSyncLock = createSyncLock("daily-reviews");
