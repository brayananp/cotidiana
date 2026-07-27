import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import type { AppAccess } from "@/platform/auth/app-access.types";
import { getLocalDatabase } from "@/platform/database/local-database";
import {
	browserReportsOnline,
	subscribeToNetworkChanges,
} from "@/platform/network/network-status";
import { createSyncRuntimeId } from "./sync.types";

const PERIODIC_SYNC_MS = 60_000;

type TaskSyncBootstrapProps = {
	access: AppAccess;
};

export function TaskSyncBootstrap({ access }: TaskSyncBootstrapProps) {
	const router = useRouter();

	// biome-ignore lint/correctness/useExhaustiveDependencies: <// we need to access the access object to ensure it is updated>
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
				const { runTaskSync } = await import("./task-sync-client");
				await runTaskSync({
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

			const id = createSyncRuntimeId(identity.userId, "task");

			const existing = await db.syncRuntime.get(id);

			await db.syncRuntime.put({
				id,
				userId: identity.userId,
				entityType: "task",
				state: access.requiresReauthentication
					? "reauthentication_required"
					: "offline",
				lastStartedAt: existing?.lastStartedAt ?? null,
				lastCompletedAt: existing?.lastCompletedAt ?? null,
				lastError: existing?.lastError ?? null,
				updatedAt: now,
			});
		};

		if (access.canSynchronize) {
			void run();
		} else {
			void markUnavailable();
		}

		let unsubscribeRequests: (() => void) | undefined;

		void (async () => {
			const { subscribeToTaskSyncRequests } = await import(
				"./sync-events-client"
			);
			unsubscribeRequests = subscribeToTaskSyncRequests(() => {
				void run();
			});
		})();

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
			unsubscribeRequests?.();
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
