import { requestSync } from "./sync-request-events-client";

export function requestTaskSync(): void {
	requestSync("tasks");
}
