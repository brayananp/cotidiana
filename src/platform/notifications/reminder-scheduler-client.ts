import { remindersDependencies } from "@/modules/reminders/infrastructure/reminders.dependencies";
import { showReminderNotification } from "./reminder-notification-client";

export type ProcessDueRemindersInput = {
	userId: string;
	deviceId: string;
};

export async function processDueReminders(
	input: ProcessDueRemindersInput,
): Promise<number> {
	const claimed = await remindersDependencies.writeStore.claimDue(
		input.userId,
		input.deviceId,
	);

	for (const reminder of claimed) {
		showReminderNotification(reminder);
	}

	return claimed.length;
}
