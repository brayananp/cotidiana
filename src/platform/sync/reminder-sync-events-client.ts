const EVENT_NAME = "personal-productivity-os:reminder-sync-request";

export function requestReminderSync(): void {
	window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function subscribeToReminderSyncRequests(
	listener: () => void,
): () => void {
	window.addEventListener(EVENT_NAME, listener);

	return () => {
		window.removeEventListener(EVENT_NAME, listener);
	};
}
