import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import type { AppAccess } from "@/platform/auth/app-access.types";
import { getLocalDatabase } from "@/platform/database/local-database";
import {
	browserReportsOnline,
	subscribeToNetworkChanges,
} from "@/platform/network/network-status";
import { runDailyReviewSync } from "./daily-review-sync-client";
import { subscribeToDailyReviewSyncRequests } from "./daily-review-sync-events-client";
import { createSyncRuntimeId } from "./sync.types";

const PERIODIC_SYNC_MS = 60_000;

export function DailyReviewSyncBootstrap({ access }: { access: AppAccess }) {
	const router = useRouter();
	const userId = access.localIdentity?.userId;
	const deviceId = access.localIdentity?.deviceId;
	const canSynchronize = access.canSynchronize;
	const requiresReauthentication = access.requiresReauthentication;

	useEffect(() => {
		if (!userId || !deviceId) return;
		let disposed = false;

		const run = async () => {
			if (disposed || !canSynchronize || !browserReportsOnline()) return;
			try {
				await runDailyReviewSync({
					userId,
					deviceId,
				});
			} catch {
				void router.invalidate();
			}
		};

		const markUnavailable = async () => {
			const db = getLocalDatabase();
			const id = createSyncRuntimeId(userId, "daily_review");
			const existing = await db.syncRuntime.get(id);
			const now = new Date().toISOString();
			await db.syncRuntime.put({
				id,
				userId,
				entityType: "daily_review",
				state: requiresReauthentication
					? "reauthentication_required"
					: "offline",
				lastStartedAt: existing?.lastStartedAt ?? null,
				lastCompletedAt: existing?.lastCompletedAt ?? null,
				lastError: existing?.lastError ?? null,
				updatedAt: now,
			});
		};

		if (canSynchronize) void run();
		else void markUnavailable();

		const unsubscribeRequests = subscribeToDailyReviewSyncRequests(
			() => void run(),
		);
		const unsubscribeNetwork = subscribeToNetworkChanges(() => {
			if (browserReportsOnline()) void run();
			else void markUnavailable();
		});
		const handleFocus = () => void run();
		window.addEventListener("focus", handleFocus);
		const interval = window.setInterval(() => void run(), PERIODIC_SYNC_MS);

		return () => {
			disposed = true;
			unsubscribeRequests();
			unsubscribeNetwork();
			window.removeEventListener("focus", handleFocus);
			window.clearInterval(interval);
		};
	}, [canSynchronize, requiresReauthentication, userId, deviceId, router]);

	return null;
}
