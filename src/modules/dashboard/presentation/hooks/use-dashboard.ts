import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { getLocalDatabase } from "@/platform/database/local-database";
import { calculateDashboardMetrics } from "../../application/queries/get-dashboard-snapshot";

export function useDashboard(userId: string) {
	const [clock, setClock] = useState(() => Date.now());

	useEffect(() => {
		const interval = window.setInterval(() => setClock(Date.now()), 60_000);

		return () => window.clearInterval(interval);
	}, []);

	return useLiveQuery(async () => {
		const db = getLocalDatabase();
		const [tasks, timeBlocks, calendarEvents, reminders, books, dailyReviews] =
			await Promise.all([
				db.tasks.where("userId").equals(userId).toArray(),
				db.timeBlocks.where("userId").equals(userId).toArray(),
				db.calendarEvents.where("userId").equals(userId).toArray(),
				db.reminders.where("userId").equals(userId).toArray(),
				db.books.where("userId").equals(userId).toArray(),
				db.dailyReviews.where("userId").equals(userId).toArray(),
			]);

		return calculateDashboardMetrics(
			{
				tasks,
				timeBlocks,
				calendarEvents,
				reminders,
				books,
				dailyReviews,
			},
			new Date(clock),
		);
	}, [userId, clock]);
}
