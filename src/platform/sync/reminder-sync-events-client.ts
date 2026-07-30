import { requestSync } from "./sync-request-events-client";

export function requestReminderSync(): void {
	requestSync("reminders");
}
