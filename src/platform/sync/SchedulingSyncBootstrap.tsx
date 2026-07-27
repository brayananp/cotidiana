import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import type { AppAccess } from "@/platform/auth/app-access.types";
import { getLocalDatabase } from "@/platform/database/local-database";
import {
	browserReportsOnline,
	subscribeToNetworkChanges,
} from "@/platform/network/network-status";
import { runSchedulingSync } from "./scheduling-sync-client";
import { subscribeToSchedulingSyncRequests } from "./scheduling-sync-events-client";
import { createSyncRuntimeId } from "./sync.types";

const PERIODIC_SYNC_MS = 60_000;

type SchedulingSyncBootstrapProps = {
	access: AppAccess;
};

export function SchedulingSyncBootstrap({
	access,
}: SchedulingSyncBootstrapProps) {
	const router = useRouter();

	// biome-ignore lint/correctness/useExhaustiveDependencies: <>
	useEffect(() => {
		const identity = access.localIdentity;

		if (!identity) {
			return;
		}

		let disposed = false;

		const run = async () => {
			if (disposed || !access.canSynchronize || !browserReportsOnline()) {
				return;
			}

			try {
				await runSchedulingSync({
					userId: identity.userId,
					deviceId: identity.deviceId,
				});
			} catch {
				void router.invalidate();
			}
		};

		const markUnavailable = async () => {
			const db = getLocalDatabase();

			const now = new Date().toISOString();

			for (const entityType of ["time_block", "calendar_event"] as const) {
				const id = createSyncRuntimeId(identity.userId, entityType);

				const existing = await db.syncRuntime.get(id);

				await db.syncRuntime.put({
					id,
					userId: identity.userId,
					entityType,
					state: access.requiresReauthentication
						? "reauthentication_required"
						: "offline",
					lastStartedAt: existing?.lastStartedAt ?? null,
					lastCompletedAt: existing?.lastCompletedAt ?? null,
					lastError: existing?.lastError ?? null,
					updatedAt: now,
				});
			}
		};

		if (access.canSynchronize) {
			void run();
		} else {
			void markUnavailable();
		}

		const unsubscribeRequests = subscribeToSchedulingSyncRequests(() => {
			void run();
		});

		const unsubscribeNetwork = subscribeToNetworkChanges(() => {
			if (browserReportsOnline()) {
				void run();
			} else {
				void markUnavailable();
			}
		});

		const handleFocus = () => {
			void run();
		};

		window.addEventListener("focus", handleFocus);

		const interval = window.setInterval(() => {
			void run();
		}, PERIODIC_SYNC_MS);

		return () => {
			disposed = true;
			unsubscribeRequests();
			unsubscribeNetwork();
			window.removeEventListener("focus", handleFocus);
			window.clearInterval(interval);
		};
	}, [
		access.canSynchronize,
		access.requiresReauthentication,
		access.localIdentity?.userId,
		access.localIdentity?.deviceId,
		router,
	]);

	return null;
}
