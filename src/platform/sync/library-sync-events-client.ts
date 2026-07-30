import { requestSync } from "./sync-request-events-client";

export function requestLibrarySync(): void {
	requestSync("library");
}
