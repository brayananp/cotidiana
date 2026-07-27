import type { TaskPriority, TaskStatus } from "../domain/task";

export const taskStatusLabels: Record<TaskStatus, string> = {
	todo: "Pendiente",
	in_progress: "En progreso",
	done: "Completada",
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
	none: "Sin prioridad",
	low: "Baja",
	medium: "Media",
	high: "Alta",
	urgent: "Urgente",
};
