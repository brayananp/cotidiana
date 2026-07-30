import type { ProductivityLocalDatabase } from "@/platform/database/local-database";
import { localDateKey } from "../../domain/daily-review";
import type {
	DashboardReadingBook,
	DashboardSourceData,
} from "../../domain/dashboard-source";

export async function loadDashboardSource(
	db: ProductivityLocalDatabase,
	userId: string,
	now = new Date(),
): Promise<DashboardSourceData> {
	const todayStart = startOfDay(now);
	const weekStart = addDays(todayStart, -6);
	const nextWeek = addDays(todayStart, 7);
	const next24Hours = new Date(now.getTime() + 24 * 60 * 60_000);
	const reviewStart = localDateKey(weekStart);
	const reviewEnd = localDateKey(addDays(todayStart, 1));

	const [
		todoTasks,
		inProgressTasks,
		completedTasks,
		timeBlocks,
		calendarEvents,
		reminders,
		readingBookRecords,
		completedBookCount,
		dailyReviews,
	] = await Promise.all([
		db.tasks.where("[userId+status]").equals([userId, "todo"]).toArray(),
		db.tasks.where("[userId+status]").equals([userId, "in_progress"]).toArray(),
		db.tasks
			.where("[userId+completedAt]")
			.between(
				[userId, weekStart.toISOString()],
				[userId, addDays(todayStart, 1).toISOString()],
				true,
				false,
			)
			.toArray(),
		db.timeBlocks
			.where("[userId+startAt]")
			.between(
				[userId, weekStart.toISOString()],
				[userId, nextWeek.toISOString()],
				true,
				false,
			)
			.toArray(),
		db.calendarEvents
			.where("[userId+startAt]")
			.between(
				[userId, weekStart.toISOString()],
				[userId, nextWeek.toISOString()],
				true,
				false,
			)
			.toArray(),
		db.reminders
			.where("[userId+nextTriggerAt]")
			.between(
				[userId, now.toISOString()],
				[userId, next24Hours.toISOString()],
				true,
				true,
			)
			.toArray(),
		db.books.where("[userId+status]").equals([userId, "reading"]).toArray(),
		db.books
			.where("[userId+status]")
			.equals([userId, "completed"])
			.filter((book) => book.deletedAt === null)
			.count(),
		db.dailyReviews
			.where("[userId+reviewDate]")
			.between([userId, reviewStart], [userId, reviewEnd], true, false)
			.toArray(),
	]);

	return {
		tasks: deduplicateById([
			...todoTasks,
			...inProgressTasks,
			...completedTasks,
		]),
		timeBlocks,
		calendarEvents,
		reminders,
		readingBooks: readingBookRecords.map(
			(book): DashboardReadingBook => ({
				status: "reading",
				pageCount: book.pageCount,
				currentPage: book.currentPage,
				deletedAt: book.deletedAt,
			}),
		),
		completedBookCount,
		dailyReviews,
	};
}

function deduplicateById<T extends { id: string }>(items: T[]): T[] {
	return [...new Map(items.map((item) => [item.id, item])).values()];
}

function startOfDay(value: Date): Date {
	const date = new Date(value);
	date.setHours(0, 0, 0, 0);
	return date;
}

function addDays(value: Date, days: number): Date {
	const date = new Date(value);
	date.setDate(date.getDate() + days);
	return date;
}
