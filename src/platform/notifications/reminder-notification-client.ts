import type { Reminder } from "@/modules/reminders/domain/reminder";

export async function showReminderNotification(
	reminder: Reminder,
): Promise<boolean> {
	if (
		typeof window === "undefined" ||
		!("Notification" in window) ||
		Notification.permission !== "granted"
	) {
		return false;
	}

	const options: NotificationOptions = {
		body: reminder.notes ?? "Tienes un recordatorio pendiente.",

		tag: `reminder:${reminder.id}`,

		// renotify: true ,
		requireInteraction: reminder.recurrence === "none",

		icon: "/pwa-192x192.png",
		badge: "/pwa-64x64.png",

		data: {
			reminderId: reminder.id,
			url: "/reminders",
		},
	};

	if ("serviceWorker" in navigator) {
		try {
			const registration = await navigator.serviceWorker.ready;

			await registration.showNotification(reminder.title, options);

			return true;
		} catch {
			// Se utiliza el constructor de ventana como fallback.
		}
	}

	try {
		const notification = new Notification(reminder.title, options);

		notification.onclick = () => {
			window.focus();

			window.location.assign("/reminders");

			notification.close();
		};

		return true;
	} catch {
		return false;
	}
}
