export type DashboardTask = {
	id: string;
	title: string;
	status: "todo" | "in_progress" | "done";
	priority: string;
	plannedAt: string | null;
	dueAt: string | null;
	completedAt: string | null;
	archivedAt: string | null;
	createdAt: string;
	deletedAt: string | null;
};

export type DashboardTimeBlock = {
	id: string;
	title: string;
	kind: string;
	status: string;
	startAt: string;
	endAt: string;
	deletedAt: string | null;
};

export type DashboardCalendarEvent = {
	id: string;
	title: string;
	eventType: string;
	startAt: string;
	endAt: string;
	deletedAt: string | null;
};

export type DashboardReminder = {
	id: string;
	title: string;
	status: string;
	nextTriggerAt: string | null;
	deletedAt: string | null;
};

export type DashboardReadingBook = {
	status: "reading";
	pageCount: number | null;
	currentPage: number;
	deletedAt: string | null;
};

export type DashboardReview = {
	reviewDate: string;
	mood: number;
	energy: number;
	productivity: number;
	completedAt: string | null;
	deletedAt: string | null;
};

export type DashboardSourceData = {
	tasks: DashboardTask[];
	timeBlocks: DashboardTimeBlock[];
	calendarEvents: DashboardCalendarEvent[];
	reminders: DashboardReminder[];
	readingBooks: DashboardReadingBook[];
	completedBookCount: number;
	dailyReviews: DashboardReview[];
};
