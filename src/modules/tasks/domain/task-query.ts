import type { TaskPriority, TaskStatus } from "./task";

export type TaskQuery = {
	userId: string;
	status?: TaskStatus | "all";
	priorities?: TaskPriority[];
	search?: string;
	includeArchived?: boolean;
	includeDeleted?: boolean;
};
