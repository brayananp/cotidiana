import type { TaskRepository } from "../../domain/repositories/task.repository";
import {
	assertTaskOwnership,
	changeTaskStatus,
	type TaskStatus,
} from "../../domain/task";
import type { TaskWriteStore } from "../ports/task-write-store";
import type { TaskExecutionContext } from "../task-context";

export function changeTaskStatusCommand(
	repository: TaskRepository,
	writeStore: TaskWriteStore,
) {
	return async (
		taskId: string,
		status: TaskStatus,
		context: TaskExecutionContext,
	) => {
		const existing = await repository.findById(taskId);

		if (!existing) {
			throw new Error("TASK_NOT_FOUND");
		}

		assertTaskOwnership(existing, context.userId);

		const updated = changeTaskStatus(existing, status);

		await writeStore.commit(updated, "update", context.deviceId);

		return updated;
	};
}
