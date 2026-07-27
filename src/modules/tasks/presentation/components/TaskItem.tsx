import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { tasksDependencies } from "@/modules/tasks/infrastructure/tasks.dependencies";
import type { TaskExecutionContext } from "../../application/task-context";
import type { Task, TaskStatus } from "../../domain/task";
import { taskPriorityLabels, taskStatusLabels } from "../task-labels";

type TaskItemProps = {
	task: Task;
	context: TaskExecutionContext;
	onEdit: (task: Task) => void;
};

const priorityVariants: Record<
	string,
	"default" | "secondary" | "destructive" | "outline" | "ghost"
> = {
	none: "ghost",
	low: "secondary",
	medium: "outline",
	high: "destructive",
	urgent: "destructive",
} as const;

const statusVariants: Record<string, "default" | "secondary" | "outline"> = {
	todo: "secondary",
	in_progress: "default",
	done: "outline",
} as const;

export function TaskItem({ task, context, onEdit }: TaskItemProps) {
	const changeStatus = async (status: TaskStatus) => {
		await tasksDependencies.changeStatus(task.id, status, context);
	};

	const isDone = task.status === "done";

	return (
		<Card size="sm" className={isDone ? "opacity-70" : ""}>
			<CardContent className="space-y-3 pt-(--card-spacing)">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0 flex-1 space-y-1.5">
						<h3
							className={`text-base font-medium leading-snug ${
								isDone ? "line-through text-muted-foreground" : ""
							}`}
						>
							{task.title}
						</h3>
						{task.description && (
							<p className="line-clamp-2 text-sm text-muted-foreground">
								{task.description}
							</p>
						)}
					</div>
					<div className="flex shrink-0 flex-wrap gap-1.5">
						<Badge variant={statusVariants[task.status]}>
							{taskStatusLabels[task.status]}
						</Badge>
						<Badge variant={priorityVariants[task.priority]}>
							{taskPriorityLabels[task.priority]}
						</Badge>
					</div>
				</div>

				{(task.plannedAt || task.dueAt) && (
					<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
						{task.plannedAt && (
							<span>Planificada: {formatDate(task.plannedAt)}</span>
						)}
						{task.dueAt && <span>Límite: {formatDate(task.dueAt)}</span>}
					</div>
				)}

				<div className="flex flex-wrap gap-1.5">
					{task.status !== "in_progress" && (
						<Button
							variant="outline"
							size="xs"
							onClick={() => changeStatus("in_progress")}
						>
							Iniciar
						</Button>
					)}
					{task.status !== "done" && (
						<Button
							variant="default"
							size="xs"
							onClick={() => changeStatus("done")}
						>
							Completar
						</Button>
					)}
					{task.status !== "todo" && (
						<Button
							variant="secondary"
							size="xs"
							onClick={() => changeStatus("todo")}
						>
							Reabrir
						</Button>
					)}
					<Button variant="ghost" size="xs" onClick={() => onEdit(task)}>
						Editar
					</Button>
					<Button
						variant="ghost"
						size="xs"
						onClick={() =>
							tasksDependencies.archiveTask(task.id, !task.archivedAt, context)
						}
					>
						{task.archivedAt ? "Restaurar" : "Archivar"}
					</Button>
					<Button
						variant="ghost"
						size="xs"
						className="text-destructive hover:text-destructive"
						onClick={() => {
							if (window.confirm("¿Eliminar esta tarea?")) {
								tasksDependencies.deleteTask(task.id, context);
							}
						}}
					>
						Eliminar
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat("es-PE", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}
