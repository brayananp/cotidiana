import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { getLocalDatabase } from "@/platform/database/local-database";
import { calculateDashboardMetrics } from "../../application/queries/get-dashboard-snapshot";
import { loadDashboardSource } from "../../infrastructure/local/load-dashboard-source-client";

export function useDashboard(userId: string) {
	const [clock, setClock] = useState(() => Date.now());

	useEffect(() => {
		const interval = window.setInterval(() => setClock(Date.now()), 60_000);

		return () => window.clearInterval(interval);
	}, []);

	return useLiveQuery(async () => {
		const db = getLocalDatabase();
		const now = new Date(clock);
		const source = await loadDashboardSource(db, userId, now);
		return calculateDashboardMetrics(source, now);
	}, [userId, clock]);
}
