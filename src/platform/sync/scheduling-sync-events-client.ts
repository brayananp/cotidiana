const EVENT_NAME = "personal-productivity-os:scheduling-sync-request";

export function requestSchedulingSync(): void {
	window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function subscribeToSchedulingSyncRequests(
	listener: () => void,
): () => void {
	window.addEventListener(EVENT_NAME, listener);

	return () => {
		window.removeEventListener(EVENT_NAME, listener);
	};
}
