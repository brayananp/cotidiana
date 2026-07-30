import type { TaskPriority } from "#/modules/tasks";

export type DashboardDayPoint = {
	date: string;
	label: string;
	completedTasks: number;
	completedBlocks: number;
	focusMinutes: number;
	reviewScore: number | null;
	productive: boolean;
};

export type DashboardPriorityTask = {
	id: string;
	title: string;
	priority: TaskPriority;
	dueAt: string | null;
	overdue: boolean;
};

export type DashboardAgendaItem = {
	id: string;
	entityType: "time_block" | "calendar_event";
	title: string;
	startAt: string;
	endAt: string;
	status: string;
};

export type DashboardReminderItem = {
	id: string;
	title: string;
	nextTriggerAt: string;
};

export type DashboardMetrics = {
	generatedAt: string;
	today: {
		completedTasks: number;
		plannedTasks: number;
		overdueTasks: number;
		taskCompletionRate: number;
		plannedMinutes: number;
		completedMinutes: number;
		focusMinutes: number;
		upcomingEvents: number;
		dueReminders: number;
	};
	week: {
		completedTasks: number;
		completedBlocks: number;
		focusMinutes: number;
		taskCompletionRate: number;
		productiveDays: number;
		points: DashboardDayPoint[];
	};
	streak: {
		current: number;
		bestInWindow: number;
	};
	library: {
		reading: number;
		completed: number;
		averageProgress: number | null;
	};
	priorities: DashboardPriorityTask[];
	agenda: DashboardAgendaItem[];
	reminders: DashboardReminderItem[];
};
