import { describe, expect, it, vi } from "vitest";
import { startSyncLifecycle } from "./sync-lifecycle-client";

type Domain = "tasks" | "library";
type Target = Domain | readonly Domain[] | "all";

function createSignals() {
	let networkListener: () => void = () => undefined;
	let focusListener: () => void = () => undefined;
	let requestListener: (_target: Target) => void = () => undefined;
	let intervalListener: () => void = () => undefined;
	const unsubscribeNetwork = vi.fn();
	const unsubscribeFocus = vi.fn();
	const unsubscribeRequests = vi.fn();
	const clearInterval = vi.fn();

	return {
		signals: {
			onNetworkChange: (listener: () => void) => {
				networkListener = listener;
				return unsubscribeNetwork;
			},
			onFocus: (listener: () => void) => {
				focusListener = listener;
				return unsubscribeFocus;
			},
			onSyncRequest: (listener: (target: Target) => void) => {
				requestListener = listener;
				return unsubscribeRequests;
			},
			every: (_intervalMs: number, listener: () => void) => {
				intervalListener = listener;
				return clearInterval;
			},
		},
		unsubscribers: [
			unsubscribeNetwork,
			unsubscribeFocus,
			unsubscribeRequests,
			clearInterval,
		],
		emitNetwork: () => networkListener(),
		emitFocus: () => focusListener(),
		emitRequest: (target: Target) => requestListener(target),
		emitInterval: () => intervalListener(),
	};
}

describe("sync lifecycle", () => {
	it("routes browser signals through one coordinated lifecycle", () => {
		const events = createSignals();
		const request = vi.fn();
		const markUnavailable = vi.fn();
		let online = true;

		const stop = startSyncLifecycle({
			canSynchronize: true,
			isOnline: () => online,
			request,
			markUnavailable,
			signals: events.signals,
			intervalMs: 60_000,
		});

		expect(request).toHaveBeenLastCalledWith("all");

		events.emitRequest("library");
		expect(request).toHaveBeenLastCalledWith("library");

		events.emitFocus();
		events.emitInterval();
		expect(request).toHaveBeenCalledTimes(4);

		online = false;
		events.emitNetwork();
		expect(markUnavailable).toHaveBeenCalledTimes(1);

		stop();
		for (const unsubscribe of events.unsubscribers) {
			expect(unsubscribe).toHaveBeenCalledTimes(1);
		}
	});

	it("marks sync unavailable instead of requesting work", () => {
		const events = createSignals();
		const request = vi.fn();
		const markUnavailable = vi.fn();

		startSyncLifecycle({
			canSynchronize: false,
			isOnline: () => true,
			request,
			markUnavailable,
			signals: events.signals,
			intervalMs: 60_000,
		});

		expect(request).not.toHaveBeenCalled();
		expect(markUnavailable).toHaveBeenCalledTimes(1);
	});

	it("can reuse an initialized session without a duplicate startup request", () => {
		const events = createSignals();
		const request = vi.fn();

		startSyncLifecycle({
			canSynchronize: true,
			isOnline: () => true,
			requestOnStart: false,
			request,
			markUnavailable: vi.fn(),
			signals: events.signals,
			intervalMs: 60_000,
		});

		expect(request).not.toHaveBeenCalled();

		events.emitFocus();
		expect(request).toHaveBeenCalledWith("all");
	});
});
