const EVENT_NAME = "personal-productivity-os:settings-sync-request";

export function requestSettingsSync(): void {
	window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function subscribeToSettingsSyncRequests(
	listener: () => void,
): () => void {
	window.addEventListener(EVENT_NAME, listener);

	return () => {
		window.removeEventListener(EVENT_NAME, listener);
	};
}
