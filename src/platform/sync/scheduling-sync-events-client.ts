import { requestSync } from "./sync-request-events-client";

export function requestSchedulingSync(): void {
	requestSync("scheduling");
}
