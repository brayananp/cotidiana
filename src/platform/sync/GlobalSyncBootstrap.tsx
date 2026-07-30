import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import type { AppAccess } from "@/platform/auth/app-access.types";
import { ensureRemoteDeviceRegistered } from "@/platform/auth/device-registration-client";
import { getLocalDatabase } from "@/platform/database/local-database";
import {
	browserReportsOnline,
	subscribeToNetworkChanges,
} from "@/platform/network/network-status";
import {
	createSyncRuntimeId,
	type SyncEntityType,
	type SyncRuntimeState,
} from "./sync.types";
import {
	createSyncCoordinator,
	type SyncDomain,
	type SyncEngine,
} from "./sync-coordinator-client";
import { startSyncLifecycle } from "./sync-lifecycle-client";
import {
	type SyncRequestTarget,
	subscribeToSyncRequests,
} from "./sync-request-events-client";
import { createSyncSessionStartRegistry } from "./sync-session-start-client";

const PERIODIC_SYNC_MS = 60_000;

const ENTITY_TYPES: readonly SyncEntityType[] = [
	"task",
	"time_block",
	"calendar_event",
	"reminder",
	"book",
	"book_note",
	"user_settings",
	"daily_review",
];

const syncSessionStarts = createSyncSessionStartRegistry();

export function GlobalSyncBootstrap({ access }: { access: AppAccess }) {
	const router = useRouter();
	const userId = access.localIdentity?.userId;
	const deviceId = access.localIdentity?.deviceId;

	useEffect(() => {
		if (!userId || !deviceId) {
			return;
		}

		const syncInput = {
			userId,
			deviceId,
		};
		const sessionKey = `${userId}:${deviceId}`;
		const releaseInitialSync = access.canSynchronize
			? syncSessionStarts.acquire(sessionKey)
			: null;
		const requestOnStart = releaseInitialSync !== null;
		const engines = {
			tasks: {
				run: async () => {
					const { runTaskSync } = await import("./task-sync-client");
					return runTaskSync(syncInput);
				},
			},
			scheduling: {
				run: async () => {
					const { runSchedulingSync } = await import(
						"./scheduling-sync-client"
					);
					return runSchedulingSync(syncInput);
				},
			},
			reminders: {
				run: async () => {
					const { runReminderSync } = await import("./reminder-sync-client");
					return runReminderSync(syncInput);
				},
			},
			library: {
				run: async () => {
					const { runLibrarySync } = await import("./library-sync-client");
					return runLibrarySync(syncInput);
				},
			},
			settings: {
				run: async () => {
					const { runSettingsSync } = await import("./settings-sync-client");
					return runSettingsSync(syncInput);
				},
			},
			"daily-review": {
				run: async () => {
					const { runDailyReviewSync } = await import(
						"./daily-review-sync-client"
					);
					return runDailyReviewSync(syncInput);
				},
			},
		} satisfies Record<SyncDomain, SyncEngine>;
		const coordinator = createSyncCoordinator({ engines });
		const observedDrains = new WeakSet<Promise<unknown>>();
		let disposed = false;

		const observeDrain = (
			drain: ReturnType<typeof coordinator.request>,
		): void => {
			if (observedDrains.has(drain)) {
				return;
			}

			observedDrains.add(drain);

			void drain.then((report) => {
				if (report.runs.some((run) => run.status === "rejected")) {
					void router.invalidate();
				}
			});
		};

		const request = (target: SyncRequestTarget): void => {
			void ensureRemoteDeviceRegistered(syncInput)
				.then(() => {
					if (disposed) {
						return;
					}

					observeDrain(coordinator.request(target));
				})
				.catch(async (error: unknown) => {
					if (disposed) {
						return;
					}

					await setAllRuntimeStates(userId, "error", getErrorMessage(error));
					await router.invalidate();
				});
		};

		const stopLifecycle = startSyncLifecycle({
			canSynchronize: access.canSynchronize,
			isOnline: browserReportsOnline,
			request,
			markUnavailable: () => {
				void setAllRuntimeStates(
					userId,
					access.requiresReauthentication
						? "reauthentication_required"
						: "offline",
					null,
				);
			},
			signals: {
				onNetworkChange: (listener) =>
					subscribeToNetworkChanges(() => {
						void router.invalidate();
						listener();
					}),
				onFocus: (listener) => {
					window.addEventListener("focus", listener);
					return () => window.removeEventListener("focus", listener);
				},
				onSyncRequest: subscribeToSyncRequests,
				every: (intervalMs, listener) => {
					const interval = window.setInterval(listener, intervalMs);
					return () => window.clearInterval(interval);
				},
			},
			intervalMs: PERIODIC_SYNC_MS,
			requestOnStart,
		});

		return () => {
			disposed = true;
			releaseInitialSync?.();
			stopLifecycle();
		};
	}, [
		access.canSynchronize,
		access.requiresReauthentication,
		userId,
		deviceId,
		router,
	]);

	return null;
}

async function setAllRuntimeStates(
	userId: string,
	state: SyncRuntimeState,
	error: string | null,
): Promise<void> {
	const db = getLocalDatabase();
	const now = new Date().toISOString();

	await db.transaction("rw", db.syncRuntime, async () => {
		for (const entityType of ENTITY_TYPES) {
			const id = createSyncRuntimeId(userId, entityType);
			const existing = await db.syncRuntime.get(id);

			await db.syncRuntime.put({
				id,
				userId,
				entityType,
				state,
				lastStartedAt: existing?.lastStartedAt ?? null,
				lastCompletedAt: existing?.lastCompletedAt ?? null,
				lastError: error ?? existing?.lastError ?? null,
				updatedAt: now,
			});
		}
	});
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : "DEVICE_REGISTRATION_FAILED";
}
