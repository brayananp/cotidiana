import { useEffect } from "react";
import type { BeforeInstallPromptEvent } from "./pwa.types";
import {
	initializePwaState,
	markPwaInstalled,
	markPwaOfflineReady,
	markPwaRegistered,
	setInstallPrompt,
	setPwaError,
	setWaitingWorker,
} from "./pwa-state-client";

const UPDATE_INTERVAL_MS = 60 * 60_000;

export function PwaBootstrap() {
	useEffect(() => {
		ensurePwaHeadElements();

		const installed = isStandalone();

		initializePwaState(installed);

		const handleInstallPrompt = (event: BeforeInstallPromptEvent) => {
			event.preventDefault();
			setInstallPrompt(event);
		};

		const handleInstalled = () => {
			markPwaInstalled();
		};

		window.addEventListener("beforeinstallprompt", handleInstallPrompt);

		window.addEventListener("appinstalled", handleInstalled);

		const shouldRegister =
			import.meta.env.PROD || import.meta.env.VITE_PWA_DEV === "true";

		if (!shouldRegister || !("serviceWorker" in navigator)) {
			return () => {
				window.removeEventListener("beforeinstallprompt", handleInstallPrompt);

				window.removeEventListener("appinstalled", handleInstalled);
			};
		}

		let disposed = false;
		let registration: ServiceWorkerRegistration | null = null;

		let updateInterval: number | null = null;

		let reloading = false;

		const initialController = navigator.serviceWorker.controller;

		const handleControllerChange = () => {
			markPwaOfflineReady();
			setWaitingWorker(null);

			if (initialController && !reloading) {
				reloading = true;
				window.location.reload();
			}
		};

		const inspectWorker = (worker: ServiceWorker | null) => {
			if (!worker) {
				return;
			}

			const handleStateChange = () => {
				if (worker.state !== "installed") {
					return;
				}

				if (navigator.serviceWorker.controller) {
					setWaitingWorker(worker);
				} else {
					markPwaOfflineReady();
				}
			};

			worker.addEventListener("statechange", handleStateChange);

			handleStateChange();
		};

		const register = async () => {
			try {
				registration = await navigator.serviceWorker.register("/sw.js", {
					scope: "/",
					type: "module",
					updateViaCache: "none",
				});

				if (disposed) {
					return;
				}

				markPwaRegistered();

				if (registration.waiting && navigator.serviceWorker.controller) {
					setWaitingWorker(registration.waiting);
				}

				inspectWorker(registration.installing);

				registration.addEventListener("updatefound", () => {
					inspectWorker(registration?.installing ?? null);
				});

				const ready = await navigator.serviceWorker.ready;

				if (disposed) {
					return;
				}

				markPwaOfflineReady();

				await cacheCurrentShell(ready);

				updateInterval = window.setInterval(() => {
					void registration?.update();
				}, UPDATE_INTERVAL_MS);
			} catch (error) {
				setPwaError(
					error instanceof Error
						? error.message
						: "SERVICE_WORKER_REGISTRATION_FAILED",
				);
			}
		};

		const handleFocus = () => {
			void registration?.update();
		};

		navigator.serviceWorker.addEventListener(
			"controllerchange",
			handleControllerChange,
		);

		window.addEventListener("focus", handleFocus);

		void register();

		return () => {
			disposed = true;

			window.removeEventListener("beforeinstallprompt", handleInstallPrompt);

			window.removeEventListener("appinstalled", handleInstalled);

			window.removeEventListener("focus", handleFocus);

			navigator.serviceWorker.removeEventListener(
				"controllerchange",
				handleControllerChange,
			);

			if (updateInterval !== null) {
				window.clearInterval(updateInterval);
			}
		};
	}, []);

	return null;
}

async function cacheCurrentShell(
	registration: ServiceWorkerRegistration,
): Promise<void> {
	const worker = registration.active ?? navigator.serviceWorker.controller;

	if (!worker) {
		return;
	}

	const urls = new Set<string>();

	urls.add(window.location.href);

	for (const entry of performance.getEntriesByType("resource")) {
		const url = new URL(entry.name, window.location.origin);

		if (
			url.origin !== window.location.origin ||
			url.pathname.startsWith("/api/")
		) {
			continue;
		}

		urls.add(url.href);
	}

	worker.postMessage({
		type: "CACHE_URLS",

		payload: {
			urlsToCache: Array.from(urls),
		},
	});
}

function isStandalone(): boolean {
	return (
		window.matchMedia("(display-mode: standalone)").matches ||
		navigator.standalone === true
	);
}

function ensurePwaHeadElements(): void {
	ensureMeta("theme-color", "#0f172a");

	ensureMeta("application-name", "Personal Productivity OS");

	ensureMeta("apple-mobile-web-app-capable", "yes");

	ensureLink({
		rel: "manifest",
		href: "/manifest.webmanifest",
	});

	ensureLink({
		rel: "icon",
		href: "/pwa-icon.svg",
		type: "image/svg+xml",
	});

	ensureLink({
		rel: "apple-touch-icon",
		href: "/apple-touch-icon.png",
		sizes: "180x180",
	});
}

function ensureMeta(name: string, content: string): void {
	const existing = document.head.querySelector(`meta[name="${name}"]`);

	if (existing) {
		return;
	}

	const element = document.createElement("meta");

	element.name = name;
	element.content = content;

	document.head.append(element);
}

function ensureLink(input: {
	rel: string;
	href: string;
	type?: string;
	sizes?: string;
}): void {
	const existing = document.head.querySelector(
		`link[rel="${input.rel}"][href="${input.href}"]`,
	);

	if (existing) {
		return;
	}

	const element = document.createElement("link");

	element.rel = input.rel;
	element.href = input.href;

	if (input.type) {
		element.type = input.type;
	}

	if (input.sizes) {
		element.setAttribute("sizes", input.sizes);
	}

	document.head.append(element);
}
