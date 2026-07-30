import { describe, expect, it } from "vitest";
import { calculateDashboardMetrics } from "../application/queries/get-dashboard-snapshot";

describe("DashboardMetrics", () => {
	it("calcula tareas, enfoque y lectura", () => {
		const now = new Date("2026-07-27T12:00:00.000Z");
		const metrics = calculateDashboardMetrics(
			{
				tasks: [
					{
						id: "t1",
						title: "Task",
						status: "done",
						priority: "high",
						plannedAt: null,
						dueAt: null,
						completedAt: "2026-07-27T10:00:00.000Z",
						archivedAt: null,
						createdAt: "2026-07-27T08:00:00.000Z",
						deletedAt: null,
					},
				],
				timeBlocks: [
					{
						id: "b1",
						title: "Focus",
						kind: "focus",
						status: "completed",
						startAt: "2026-07-27T09:00:00.000Z",
						endAt: "2026-07-27T10:00:00.000Z",
						deletedAt: null,
					},
				],
				calendarEvents: [],
				reminders: [],
				readingBooks: [
					{
						status: "reading" as const,
						pageCount: 200,
						currentPage: 100,
						deletedAt: null,
					},
				],
				completedBookCount: 0,
				dailyReviews: [],
			},
			now,
		);

		expect(metrics.today.completedTasks).toBe(1);
		expect(metrics.today.focusMinutes).toBe(60);
		expect(metrics.library.averageProgress).toBe(50);
	});

	it("atribuye un bloque completado al día en que ocurrió", () => {
		const now = new Date("2026-07-28T12:00:00.000Z");
		const metrics = calculateDashboardMetrics(
			{
				tasks: [],
				timeBlocks: [
					{
						id: "b1",
						title: "Focus",
						kind: "focus",
						status: "completed",
						startAt: "2026-07-27T09:00:00.000Z",
						endAt: "2026-07-27T10:00:00.000Z",
						deletedAt: null,
					},
				],
				calendarEvents: [],
				reminders: [],
				readingBooks: [],
				completedBookCount: 0,
				dailyReviews: [],
			},
			now,
		);

		const monday = metrics.week.points.find(
			(point) => point.date === "2026-07-27",
		);
		const tuesday = metrics.week.points.find(
			(point) => point.date === "2026-07-28",
		);

		expect(monday).toMatchObject({ completedBlocks: 1, focusMinutes: 60 });
		expect(tuesday).toMatchObject({ completedBlocks: 0, focusMinutes: 0 });
	});
});
