/// <reference lib="webworker" />

import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
	CacheableResponsePlugin,
	CacheFirst,
	ExpirationPlugin,
	NetworkFirst,
	Serwist,
	StaleWhileRevalidate,
} from "serwist";

declare global {
	interface WorkerGlobalScope extends SerwistGlobalConfig {
		__SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
	}
}

declare const self: ServiceWorkerGlobalScope & WorkerGlobalScope;

const DAY = 24 * 60 * 60;

const serwist = new Serwist({
	cacheId: "personal-productivity-os",

	precacheEntries: self.__SW_MANIFEST,

	precacheOptions: {
		cleanupOutdatedCaches: true,

		ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^source$/],
	},

	skipWaiting: false,
	clientsClaim: true,
	navigationPreload: false,
	disableDevLogs: true,

	fallbacks: {
		entries: [
			{
				url: "/offline.html",

				matcher({ request }) {
					return request.destination === "document";
				},
			},
		],
	},
});

serwist.registerCapture(
	({ request, url, sameOrigin }) =>
		sameOrigin &&
		request.mode === "navigate" &&
		!url.pathname.startsWith("/api/"),

	new NetworkFirst({
		cacheName: "pages-v1",
		networkTimeoutSeconds: 4,

		plugins: [
			new CacheableResponsePlugin({
				statuses: [0, 200],
			}),

			new ExpirationPlugin({
				maxEntries: 24,
				maxAgeSeconds: 7 * DAY,
				purgeOnQuotaError: true,
			}),
		],
	}),
);

serwist.registerCapture(
	({ request }) => request.destination === "image",

	new CacheFirst({
		cacheName: "images-v1",

		plugins: [
			new CacheableResponsePlugin({
				statuses: [0, 200],
			}),

			new ExpirationPlugin({
				maxEntries: 120,
				maxAgeSeconds: 30 * DAY,
				purgeOnQuotaError: true,
			}),
		],
	}),
);

serwist.registerCapture(
	({ request }) => request.destination === "font",

	new CacheFirst({
		cacheName: "fonts-v1",

		plugins: [
			new CacheableResponsePlugin({
				statuses: [0, 200],
			}),

			new ExpirationPlugin({
				maxEntries: 24,
				maxAgeSeconds: 365 * DAY,
				purgeOnQuotaError: true,
			}),
		],
	}),
);

serwist.registerCapture(
	({ url, sameOrigin }) =>
		sameOrigin &&
		(url.pathname === "/manifest.webmanifest" ||
			url.pathname === "/pwa-icon.svg"),

	new StaleWhileRevalidate({
		cacheName: "pwa-metadata-v1",

		plugins: [
			new CacheableResponsePlugin({
				statuses: [200],
			}),
		],
	}),
);

self.addEventListener("notificationclick", (event) => {
	event.notification.close();

	const data = event.notification.data as
		| {
				url?: string;
				reminderId?: string;
		  }
		| undefined;

	const targetUrl = data?.url ?? "/reminders";

	event.waitUntil(focusOrOpenClient(targetUrl));
});

serwist.addEventListeners();

async function focusOrOpenClient(targetUrl: string): Promise<void> {
	const absoluteUrl = new URL(targetUrl, self.location.origin).href;

	const clients = await self.clients.matchAll({
		type: "window",
		includeUncontrolled: true,
	});

	for (const client of clients) {
		const windowClient = client as WindowClient;

		if (new URL(windowClient.url).origin === self.location.origin) {
			await windowClient.navigate(absoluteUrl);

			await windowClient.focus();
			return;
		}
	}

	await self.clients.openWindow(absoluteUrl);
}
