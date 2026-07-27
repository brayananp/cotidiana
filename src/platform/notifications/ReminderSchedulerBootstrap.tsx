import { useEffect } from "react";
import type { AppAccess } from "@/platform/auth/app-access.types";
import { processDueReminders } from "./reminder-scheduler-client";

const CHECK_INTERVAL_MS = 15_000;

export function ReminderSchedulerBootstrap({ access }: { access: AppAccess }) {
	// biome-ignore lint/correctness/useExhaustiveDependencies: <>
	useEffect(() => {
		const identity = access.localIdentity;

		if (!identity) {
			return;
		}

		let disposed = false;
		let active: Promise<number> | null = null;

		const run = async () => {
			if (disposed || active) {
				return;
			}

			active = processDueReminders({
				userId: identity.userId,
				deviceId: identity.deviceId,
			});

			try {
				await active;
			} finally {
				active = null;
			}
		};

		void run();

		const interval = window.setInterval(() => {
			void run();
		}, CHECK_INTERVAL_MS);

		const handleFocus = () => {
			void run();
		};

		const handleVisibility = () => {
			if (document.visibilityState === "visible") {
				void run();
			}
		};

		window.addEventListener("focus", handleFocus);

		document.addEventListener("visibilitychange", handleVisibility);

		return () => {
			disposed = true;
			window.clearInterval(interval);

			window.removeEventListener("focus", handleFocus);

			document.removeEventListener("visibilitychange", handleVisibility);
		};
	}, [access.localIdentity?.userId, access.localIdentity?.deviceId]);

	return null;
}
