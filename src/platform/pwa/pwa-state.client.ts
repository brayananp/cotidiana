import type { BeforeInstallPromptEvent } from "./pwa.types";

export type PwaSnapshot = {
	supported: boolean;
	registered: boolean;
	offlineReady: boolean;
	updateAvailable: boolean;
	updateApplying: boolean;
	installAvailable: boolean;
	installed: boolean;
	error: string | null;
};

type Listener = () => void;

const listeners = new Set<Listener>();

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

let waitingWorker: ServiceWorker | null = null;

let snapshot: PwaSnapshot = {
	supported: false,
	registered: false,
	offlineReady: false,
	updateAvailable: false,
	updateApplying: false,
	installAvailable: false,
	installed: false,
	error: null,
};

export function subscribePwaState(listener: Listener): () => void {
	listeners.add(listener);

	return () => {
		listeners.delete(listener);
	};
}

export function getPwaSnapshot(): PwaSnapshot {
	return snapshot;
}

export function getPwaServerSnapshot(): PwaSnapshot {
	return {
		supported: false,
		registered: false,
		offlineReady: false,
		updateAvailable: false,
		updateApplying: false,
		installAvailable: false,
		installed: false,
		error: null,
	};
}

export function initializePwaState(installed: boolean): void {
	updateSnapshot({
		supported: "serviceWorker" in navigator,
		installed,
		installAvailable: false,
	});
}

export function markPwaRegistered(): void {
	updateSnapshot({
		registered: true,
		error: null,
	});
}

export function markPwaOfflineReady(): void {
	updateSnapshot({
		offlineReady: true,
	});
}

export function setPwaError(error: string | null): void {
	updateSnapshot({
		error,
	});
}

export function setInstallPrompt(
	prompt: BeforeInstallPromptEvent | null,
): void {
	deferredInstallPrompt = prompt;

	updateSnapshot({
		installAvailable: prompt !== null,
	});
}

export function markPwaInstalled(): void {
	deferredInstallPrompt = null;

	updateSnapshot({
		installed: true,
		installAvailable: false,
	});
}

export function setWaitingWorker(worker: ServiceWorker | null): void {
	waitingWorker = worker;

	updateSnapshot({
		updateAvailable: worker !== null,
		updateApplying: false,
	});
}

export async function requestPwaInstall(): Promise<
	"accepted" | "dismissed" | "unavailable"
> {
	const prompt = deferredInstallPrompt;

	if (!prompt) {
		return "unavailable";
	}

	await prompt.prompt();

	const choice = await prompt.userChoice;

	deferredInstallPrompt = null;

	updateSnapshot({
		installAvailable: false,
		installed: choice.outcome === "accepted",
	});

	return choice.outcome;
}

export function activateWaitingWorker(): boolean {
	if (!waitingWorker) {
		return false;
	}

	updateSnapshot({
		updateApplying: true,
	});

	waitingWorker.postMessage({
		type: "SKIP_WAITING",
	});

	return true;
}

function updateSnapshot(patch: Partial<PwaSnapshot>): void {
	snapshot = {
		...snapshot,
		...patch,
	};

	for (const listener of listeners) {
		listener();
	}
}
