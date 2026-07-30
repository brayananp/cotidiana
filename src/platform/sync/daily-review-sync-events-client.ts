import { requestSync } from "./sync-request-events-client";

export function requestDailyReviewSync(): void {
	requestSync("daily-review");
}
