let activeSync: Promise<unknown> | null = null;

export async function withLibrarySyncLock<T>(
	operation: () => Promise<T>,
): Promise<T | null> {
	if (activeSync) {
		return null;
	}

	const promise = operation();
	activeSync = promise;

	try {
		return await promise;
	} finally {
		activeSync = null;
	}
}
