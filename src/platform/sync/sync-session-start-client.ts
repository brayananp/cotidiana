export type SyncSessionStartRegistry = {
	acquire: (sessionKey: string) => (() => void) | null;
};

export function createSyncSessionStartRegistry(): SyncSessionStartRegistry {
	const reservations = new Set<string>();

	return {
		acquire: (sessionKey) => {
			if (reservations.has(sessionKey)) {
				return null;
			}

			reservations.add(sessionKey);
			let released = false;

			return () => {
				if (released) {
					return;
				}

				released = true;
				reservations.delete(sessionKey);
			};
		},
	};
}
