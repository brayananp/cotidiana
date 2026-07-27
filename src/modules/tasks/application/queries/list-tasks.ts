import type { TaskRepository } from "../../domain/repositories/task.repository";
import type { TaskQuery } from "../../domain/task-query";

export function listTasksQuery(repository: TaskRepository) {
	return (query: TaskQuery) => repository.list(query);
}
