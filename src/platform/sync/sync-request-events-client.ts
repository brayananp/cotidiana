import type { SyncDomain } from "./sync-coordinator-client";

const SYNC_REQUEST_EVENT = "cotidiana:sync-request";

export type SyncRequestTarget = SyncDomain | readonly SyncDomain[] | "all";

export function requestSync(target: SyncRequestTarget): void {
	if (typeof window === "undefined") {
		return;
	}

	window.dispatchEvent(
		new CustomEvent<SyncRequestTarget>(SYNC_REQUEST_EVENT, {
			detail: target,
		}),
	);
}

export function subscribeToSyncRequests(
	listener: (target: SyncRequestTarget) => void,
): () => void {
	const handleRequest = (event: Event) => {
		listener((event as CustomEvent<SyncRequestTarget>).detail);
	};

	window.addEventListener(SYNC_REQUEST_EVENT, handleRequest);

	return () => {
		window.removeEventListener(SYNC_REQUEST_EVENT, handleRequest);
	};
}
