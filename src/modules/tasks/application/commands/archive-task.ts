import type { TaskRepository } from "../../domain/repositories/task.repository";
import { assertTaskOwnership, setTaskArchived } from "../../domain/task";
import type { TaskWriteStore } from "../ports/task-write-store";
import type { TaskExecutionContext } from "../task-context";

export function archiveTaskCommand(
	repository: TaskRepository,
	writeStore: TaskWriteStore,
) {
	return async (
		taskId: string,
		archived: boolean,
		context: TaskExecutionContext,
	) => {
		const existing = await repository.findById(taskId);

		if (!existing) {
			throw new Error("TASK_NOT_FOUND");
		}

		assertTaskOwnership(existing, context.userId);

		const updated = setTaskArchived(existing, archived);

		await writeStore.commit(updated, "update", context.deviceId);

		return updated;
	};
}
