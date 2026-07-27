import type { TaskPriority, TaskStatus } from "../../domain/task";

export type TaskRecord = {
	id: string;
	userId: string;
	title: string;
	description: string | null;
	status: TaskStatus;
	priority: TaskPriority;
	plannedAt: string | null;
	dueAt: string | null;
	completedAt: string | null;
	archivedAt: string | null;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	version: number;
};
