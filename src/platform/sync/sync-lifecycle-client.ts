type SyncTarget<TDomain extends string> = TDomain | readonly TDomain[] | "all";

type SyncLifecycleSignals<TDomain extends string> = {
	onNetworkChange: (listener: () => void) => () => void;
	onFocus: (listener: () => void) => () => void;
	onSyncRequest: (
		listener: (target: SyncTarget<TDomain>) => void,
	) => () => void;
	every: (intervalMs: number, listener: () => void) => () => void;
};

type SyncLifecycleOptions<TDomain extends string> = {
	canSynchronize: boolean;
	isOnline: () => boolean;
	request: (target: SyncTarget<TDomain>) => void;
	markUnavailable: () => void;
	signals: SyncLifecycleSignals<TDomain>;
	intervalMs: number;
	requestOnStart?: boolean;
};

export function startSyncLifecycle<TDomain extends string>(
	options: SyncLifecycleOptions<TDomain>,
): () => void {
	let disposed = false;

	const request = (target: SyncTarget<TDomain>): void => {
		if (disposed) {
			return;
		}

		if (!options.canSynchronize || !options.isOnline()) {
			options.markUnavailable();
			return;
		}

		options.request(target);
	};

	const unsubscribeRequests = options.signals.onSyncRequest(request);
	const unsubscribeNetwork = options.signals.onNetworkChange(() => {
		request("all");
	});
	const unsubscribeFocus = options.signals.onFocus(() => {
		request("all");
	});
	const clearInterval = options.signals.every(options.intervalMs, () => {
		request("all");
	});

	if (options.requestOnStart ?? true) {
		request("all");
	} else if (!options.canSynchronize || !options.isOnline()) {
		options.markUnavailable();
	}

	return () => {
		disposed = true;
		unsubscribeRequests();
		unsubscribeNetwork();
		unsubscribeFocus();
		clearInterval();
	};
}
