import type { TaskPriority } from "#/modules/tasks";
import { localDateKey } from "../../domain/daily-review";
import type {
	DashboardDayPoint,
	DashboardMetrics,
} from "../../domain/dashboard-metrics";
import type {
	DashboardReminder,
	DashboardSourceData,
	DashboardTask,
} from "../../domain/dashboard-source";

export function calculateDashboardMetrics(
	source: DashboardSourceData,
	now = new Date(),
): DashboardMetrics {
	const todayStart = startOfDay(now);
	const tomorrowStart = addDays(todayStart, 1);
	const weekStart = addDays(todayStart, -6);
	const nextWeek = addDays(todayStart, 7);
	const next24Hours = new Date(now.getTime() + 24 * 60 * 60_000);

	const tasks = source.tasks.filter(
		(task) => !task.deletedAt && !task.archivedAt,
	);
	const blocks = source.timeBlocks.filter((block) => !block.deletedAt);
	const events = source.calendarEvents.filter((event) => !event.deletedAt);
	const reminders = source.reminders.filter((reminder) => !reminder.deletedAt);
	const readingBooks = source.readingBooks.filter((book) => !book.deletedAt);
	const reviews = source.dailyReviews.filter((review) => !review.deletedAt);

	const completedToday = tasks.filter((task) =>
		inRange(task.completedAt, todayStart, tomorrowStart),
	);
	const plannedToday = tasks.filter(
		(task) =>
			task.status !== "done" &&
			(inRange(task.plannedAt, todayStart, tomorrowStart) ||
				inRange(task.dueAt, todayStart, tomorrowStart)),
	);
	const overdue = tasks.filter(
		(task) =>
			task.status !== "done" &&
			task.dueAt !== null &&
			new Date(task.dueAt) < now,
	);

	const todayBlocks = blocks.filter(
		(block) =>
			new Date(block.startAt) >= todayStart &&
			new Date(block.startAt) < tomorrowStart,
	);
	const plannedMinutes = sumDuration(
		todayBlocks.filter((block) => block.status !== "cancelled"),
	);
	const completedMinutes = sumDuration(
		todayBlocks.filter((block) => block.status === "completed"),
	);
	const focusMinutes = sumDuration(
		todayBlocks.filter(
			(block) =>
				block.status === "completed" &&
				(block.kind === "focus" || block.kind === "task"),
		),
	);

	const agenda = [
		...blocks.map((block) => ({
			id: block.id,
			entityType: "time_block" as const,
			title: block.title,
			startAt: block.startAt,
			endAt: block.endAt,
			status: block.status,
		})),
		...events.map((event) => ({
			id: event.id,
			entityType: "calendar_event" as const,
			title: event.title,
			startAt: event.startAt,
			endAt: event.endAt,
			status: event.eventType,
		})),
	]
		.filter(
			(item) =>
				new Date(item.endAt) >= now && new Date(item.startAt) < nextWeek,
		)
		.sort((left, right) => left.startAt.localeCompare(right.startAt))
		.slice(0, 8);

	const dueReminders = reminders
		.filter(
			(reminder): reminder is DashboardReminder & { nextTriggerAt: string } =>
				(reminder.status === "scheduled" || reminder.status === "snoozed") &&
				reminder.nextTriggerAt !== null &&
				new Date(reminder.nextTriggerAt) >= now &&
				new Date(reminder.nextTriggerAt) <= next24Hours,
		)
		.sort((left, right) =>
			left.nextTriggerAt.localeCompare(right.nextTriggerAt),
		)
		.slice(0, 6)
		.map((reminder) => ({
			id: reminder.id,
			title: reminder.title,
			nextTriggerAt: reminder.nextTriggerAt,
		}));

	const points: DashboardDayPoint[] = [];
	for (let index = 0; index < 7; index += 1) {
		const dayStart = addDays(weekStart, index);
		const dayEnd = addDays(dayStart, 1);
		const date = localDateKey(dayStart);
		const dayTasks = tasks.filter((task) =>
			inRange(task.completedAt, dayStart, dayEnd),
		);
		const dayBlocks = blocks.filter(
			(block) =>
				block.status === "completed" &&
				new Date(block.startAt) >= dayStart &&
				new Date(block.startAt) < dayEnd,
		);
		const dayFocusMinutes = sumDuration(
			dayBlocks.filter(
				(block) => block.kind === "focus" || block.kind === "task",
			),
		);
		const review = reviews.find(
			(item) => item.reviewDate === date && item.completedAt,
		);
		const reviewScore = review
			? Math.round((review.mood + review.energy + review.productivity) / 3)
			: null;

		points.push({
			date,
			label: new Intl.DateTimeFormat("es-PE", { weekday: "short" }).format(
				dayStart,
			),
			completedTasks: dayTasks.length,
			completedBlocks: dayBlocks.length,
			focusMinutes: dayFocusMinutes,
			reviewScore,
			productive:
				dayTasks.length > 0 || dayBlocks.length > 0 || Boolean(review),
		});
	}

	const weeklyCompletedTasks = points.reduce(
		(sum, point) => sum + point.completedTasks,
		0,
	);
	const weeklyCompletedBlocks = points.reduce(
		(sum, point) => sum + point.completedBlocks,
		0,
	);
	const weeklyFocusMinutes = points.reduce(
		(sum, point) => sum + point.focusMinutes,
		0,
	);
	const weeklyCandidateTasks = tasks.filter(
		(task) =>
			inRange(task.createdAt, weekStart, tomorrowStart) ||
			inRange(task.dueAt, weekStart, tomorrowStart) ||
			inRange(task.completedAt, weekStart, tomorrowStart),
	);

	const progressValues = readingBooks
		.filter(
			(book): book is typeof book & { pageCount: number } =>
				book.pageCount !== null && book.pageCount > 0,
		)
		.map((book) => Math.round((book.currentPage / book.pageCount) * 100));

	return {
		generatedAt: now.toISOString(),
		today: {
			completedTasks: completedToday.length,
			plannedTasks: plannedToday.length,
			overdueTasks: overdue.length,
			taskCompletionRate: percent(
				completedToday.length,
				completedToday.length + plannedToday.length,
			),
			plannedMinutes,
			completedMinutes,
			focusMinutes,
			upcomingEvents: agenda.filter(
				(item) => new Date(item.startAt) < tomorrowStart,
			).length,
			dueReminders: dueReminders.length,
		},
		week: {
			completedTasks: weeklyCompletedTasks,
			completedBlocks: weeklyCompletedBlocks,
			focusMinutes: weeklyFocusMinutes,
			taskCompletionRate: percent(
				weeklyCompletedTasks,
				weeklyCandidateTasks.length,
			),
			productiveDays: points.filter((point) => point.productive).length,
			points,
		},
		streak: calculateStreak(points),
		library: {
			reading: readingBooks.length,
			completed: source.completedBookCount,
			averageProgress: progressValues.length
				? Math.round(
						progressValues.reduce((sum, value) => sum + value, 0) /
							progressValues.length,
					)
				: null,
		},
		priorities: tasks
			.filter((task) => task.status !== "done")
			.sort((left, right) => comparePriorityTasks(left, right, now))
			.slice(0, 6)
			.map((task) => ({
				id: task.id,
				title: task.title,
				priority: task.priority as TaskPriority,
				dueAt: task.dueAt,
				overdue: task.dueAt !== null && new Date(task.dueAt) < now,
			})),
		agenda,
		reminders: dueReminders,
	};
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

function inRange(value: string | null, start: Date, end: Date): boolean {
	if (!value) return false;
	const date = new Date(value);
	return date >= start && date < end;
}

function sumDuration(items: Array<{ startAt: string; endAt: string }>): number {
	return items.reduce((sum, item) => {
		const duration =
			new Date(item.endAt).getTime() - new Date(item.startAt).getTime();
		return sum + Math.max(0, Math.round(duration / 60_000));
	}, 0);
}

function percent(value: number, total: number): number {
	return total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
}

function calculateStreak(points: DashboardDayPoint[]): {
	current: number;
	bestInWindow: number;
} {
	let current = 0;
	for (let index = points.length - 1; index >= 0; index -= 1) {
		if (!points[index].productive) break;
		current += 1;
	}

	let best = 0;
	let running = 0;
	for (const point of points) {
		running = point.productive ? running + 1 : 0;
		best = Math.max(best, running);
	}

	return { current, bestInWindow: best };
}

const PRIORITY_WEIGHT: Record<string, number> = {
	urgent: 5,
	high: 4,
	medium: 3,
	low: 2,
	none: 1,
};

function comparePriorityTasks(
	left: DashboardTask,
	right: DashboardTask,
	now: Date,
): number {
	const leftOverdue = left.dueAt && new Date(left.dueAt) < now ? 1 : 0;
	const rightOverdue = right.dueAt && new Date(right.dueAt) < now ? 1 : 0;
	if (leftOverdue !== rightOverdue) return rightOverdue - leftOverdue;

	const priorityDifference =
		(PRIORITY_WEIGHT[right.priority] ?? 0) -
		(PRIORITY_WEIGHT[left.priority] ?? 0);
	if (priorityDifference !== 0) return priorityDifference;

	if (left.dueAt && right.dueAt) return left.dueAt.localeCompare(right.dueAt);
	if (left.dueAt) return -1;
	if (right.dueAt) return 1;
	return left.createdAt.localeCompare(right.createdAt);
}
