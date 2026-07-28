const EVENT_NAME = "personal-productivity-os:daily-review-sync-request";

export function requestDailyReviewSync(): void {
	window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function subscribeToDailyReviewSyncRequests(
	listener: () => void,
): () => void {
	window.addEventListener(EVENT_NAME, listener);
	return () => window.removeEventListener(EVENT_NAME, listener);
}
