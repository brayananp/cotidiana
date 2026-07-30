import { requestSync } from "./sync-request-events-client";

export function requestSettingsSync(): void {
	requestSync("settings");
}
