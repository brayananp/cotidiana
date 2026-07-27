import { DexieTaskRepository } from "@/modules/tasks/infrastructure/local/dexie-task.repository";
import { DexieTaskWriteStore } from "@/modules/tasks/infrastructure/local/dexie-task-write-store";
import { archiveTaskCommand } from "../application/commands/archive-task";
import { changeTaskStatusCommand } from "../application/commands/change-task-status";
import { createTaskCommand } from "../application/commands/create-task";
import { deleteTaskCommand } from "../application/commands/delete-task";
import { updateTaskCommand } from "../application/commands/update-task";
import { listTasksQuery } from "../application/queries/list-tasks";

const repository = new DexieTaskRepository();
const writeStore = new DexieTaskWriteStore();

export const tasksDependencies = {
	repository,
	writeStore,

	createTask: createTaskCommand(writeStore),

	updateTask: updateTaskCommand(repository, writeStore),

	changeStatus: changeTaskStatusCommand(repository, writeStore),

	archiveTask: archiveTaskCommand(repository, writeStore),

	deleteTask: deleteTaskCommand(repository, writeStore),

	listTasks: listTasksQuery(repository),
};
