import type { Reminder } from "@/modules/reminders/domain/reminder";

export function showReminderNotification(reminder: Reminder): boolean {
	if (
		typeof window === "undefined" ||
		!("Notification" in window) ||
		Notification.permission !== "granted"
	) {
		return false;
	}

	try {
		const notification = new Notification(reminder.title, {
			body: reminder.notes ?? "Tienes un recordatorio pendiente.",
			tag: `reminder:${reminder.id}`,
			renotify: true,
			requireInteraction: reminder.recurrence === "none",
			data: {
				reminderId: reminder.id,
			},
		});

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
