export type NotificationPermissionState =
	| "unsupported"
	| NotificationPermission;

export function getNotificationPermissionState(): NotificationPermissionState {
	if (typeof window === "undefined" || !("Notification" in window)) {
		return "unsupported";
	}

	return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
	if (typeof window === "undefined" || !("Notification" in window)) {
		return "unsupported";
	}

	return Notification.requestPermission();
}
