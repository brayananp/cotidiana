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
						userId: "u1",
						title: "Task",
						description: null,
						status: "done",
						priority: "high",
						plannedAt: null,
						dueAt: null,
						completedAt: "2026-07-27T10:00:00.000Z",
						archivedAt: null,
						sortOrder: 0,
						createdAt: "2026-07-27T08:00:00.000Z",
						updatedAt: "2026-07-27T10:00:00.000Z",
						deletedAt: null,
						version: 1,
					},
				],
				timeBlocks: [
					{
						id: "b1",
						userId: "u1",
						taskId: "t1",
						title: "Focus",
						notes: null,
						kind: "focus",
						status: "completed",
						startAt: "2026-07-27T09:00:00.000Z",
						endAt: "2026-07-27T10:00:00.000Z",
						createdAt: "2026-07-27T08:00:00.000Z",
						updatedAt: "2026-07-27T10:00:00.000Z",
						deletedAt: null,
						version: 1,
					},
				],
				calendarEvents: [],
				reminders: [],
				books: [
					{
						id: "book1",
						userId: "u1",
						title: "Libro",
						author: null,
						isbn: null,
						description: null,
						coverUrl: null,
						status: "reading",
						pageCount: 200,
						currentPage: 100,
						rating: null,
						tags: [],
						startedAt: null,
						completedAt: null,
						createdAt: "2026-07-20T10:00:00.000Z",
						updatedAt: "2026-07-27T10:00:00.000Z",
						deletedAt: null,
						version: 1,
					},
				],
				dailyReviews: [],
			},
			now,
		);

		expect(metrics.today.completedTasks).toBe(1);
		expect(metrics.today.focusMinutes).toBe(60);
		expect(metrics.library.averageProgress).toBe(50);
	});
});
