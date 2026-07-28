const EVENT_NAME = "personal-productivity-os:library-sync-request";

export function requestLibrarySync(): void {
	window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function subscribeToLibrarySyncRequests(
	listener: () => void,
): () => void {
	window.addEventListener(EVENT_NAME, listener);

	return () => {
		window.removeEventListener(EVENT_NAME, listener);
	};
}
