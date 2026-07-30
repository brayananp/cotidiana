import { tasksDependencies } from "@/modules/tasks/infrastructure/tasks.dependencies";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
	Archive01Icon,
	Calendar01Icon,
	CheckmarkCircle02Icon,
	Clock01Icon,
	Delete02Icon,
	MoreHorizontalIcon,
	PencilEdit01Icon,
	PlayIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";
import type { TaskExecutionContext } from "../../application/task-context";
import type { Task, TaskPriority, TaskStatus } from "../../domain/task";
import { taskPriorityLabels, taskStatusLabels } from "../task-labels";

type TaskItemProps = {
	task: Task;
	context: TaskExecutionContext;
	onEdit: (task: Task) => void;
};

const priorityStyles: Record<
	TaskPriority,
	{
		variant: "default" | "secondary" | "destructive" | "outline";
		className?: string;
	}
> = {
	none: { variant: "outline", className: "opacity-50" },
	low: { variant: "secondary" },
	medium: {
		variant: "outline",
		className:
			"border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10",
	},
	high: {
		variant: "outline",
		className:
			"border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10",
	},
	urgent: { variant: "destructive" },
};

export function TaskItem({ task, context, onEdit }: TaskItemProps) {
	const isDone = task.status === "done";
	const isInProgress = task.status === "in_progress";

	const toggleComplete = async () => {
		const nextStatus: TaskStatus = isDone ? "todo" : "done";
		await tasksDependencies.changeStatus(task.id, nextStatus, context);
	};

	const changeStatus = async (status: TaskStatus) => {
		await tasksDependencies.changeStatus(task.id, status, context);
	};

	return (
		<motion.div
			whileHover={{ y: -1 }}
			transition={{ duration: 0.15 }}
			className={`group relative flex flex-col gap-2.5 rounded-2xl border bg-card p-3.5 transition-shadow hover:shadow-xs ${
				isDone ? "bg-card/60 opacity-75" : ""
			}`}
		>
			{/* Top Row: Checkbox + Title + Priority + Options Menu */}
			<div className="flex items-start justify-between gap-3">
				<div className="flex items-start gap-2.5 min-w-0 flex-1">
					{/* Interactive Checkbox Button */}
					<button
						type="button"
						onClick={toggleComplete}
						className={`mt-0.5 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors ${
							isDone
								? "border-primary bg-primary text-primary-foreground"
								: "border-muted-foreground/40 hover:border-primary hover:bg-primary/10"
						}`}
						title={isDone ? "Marcar como pendiente" : "Marcar como completada"}
					>
						{isDone && <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} />}
					</button>

					{/* Title & Description */}
					<div className="flex flex-col gap-0.5 min-w-0 flex-1">
						<h3
							onClick={toggleComplete}
							className={`cursor-pointer text-sm font-medium leading-snug select-none ${
								isDone
									? "line-through text-muted-foreground"
									: "text-foreground"
							}`}
						>
							{task.title}
						</h3>
						{task.description && (
							<p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
								{task.description}
							</p>
						)}
					</div>
				</div>

				{/* Badges + Options Dropdown */}
				<div className="flex items-center gap-1.5 shrink-0">
					{/* Status badge */}
					{isInProgress && (
						<Badge
							variant="outline"
							className="text-[10px] font-semibold uppercase border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 gap-1"
						>
							<HugeiconsIcon icon={PlayIcon} size={10} />
							{taskStatusLabels[task.status]}
						</Badge>
					)}

					{/* Priority Badge */}
					{task.priority !== "none" && (
						<Badge
							variant={priorityStyles[task.priority].variant}
							className={`text-[10px] font-semibold uppercase ${priorityStyles[task.priority].className ?? ""}`}
						>
							{taskPriorityLabels[task.priority]}
						</Badge>
					)}

					{/* Options Dropdown */}
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="ghost"
									size="icon-xs"
									className="size-7 rounded-xl text-muted-foreground opacity-70 group-hover:opacity-100 hover:text-foreground"
								>
									<HugeiconsIcon icon={MoreHorizontalIcon} size={15} />
								</Button>
							}
						/>
						<DropdownMenuContent align="end" className="w-40">
							<DropdownMenuGroup>
								{!isDone && !isInProgress && (
									<DropdownMenuItem onClick={() => changeStatus("in_progress")}>
										<HugeiconsIcon icon={PlayIcon} size={14} />
										<span>Iniciar</span>
									</DropdownMenuItem>
								)}
								{isInProgress && (
									<DropdownMenuItem onClick={() => changeStatus("todo")}>
										<HugeiconsIcon icon={Clock01Icon} size={14} />
										<span>Pausar</span>
									</DropdownMenuItem>
								)}
								<DropdownMenuItem onClick={() => onEdit(task)}>
									<HugeiconsIcon icon={PencilEdit01Icon} size={14} />
									<span>Editar</span>
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() =>
										tasksDependencies.archiveTask(
											task.id,
											!task.archivedAt,
											context,
										)
									}
								>
									<HugeiconsIcon icon={Archive01Icon} size={14} />
									<span>{task.archivedAt ? "Restaurar" : "Archivar"}</span>
								</DropdownMenuItem>
							</DropdownMenuGroup>

							<DropdownMenuSeparator />

							<DropdownMenuItem
								variant="destructive"
								onClick={() => {
									if (window.confirm("¿Eliminar esta tarea?")) {
										tasksDependencies.deleteTask(task.id, context);
									}
								}}
							>
								<HugeiconsIcon icon={Delete02Icon} size={14} />
								<span>Eliminar</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{/* Dates Row (if plannedAt or dueAt exists) */}
			{(task.plannedAt || task.dueAt) && (
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-7 text-[11px] text-muted-foreground">
					{task.plannedAt && (
						<div className="flex items-center gap-1">
							<HugeiconsIcon icon={Calendar01Icon} size={12} />
							<span>{formatDate(task.plannedAt)}</span>
						</div>
					)}
					{task.dueAt && (
						<div className="flex items-center gap-1 text-destructive font-medium">
							<HugeiconsIcon icon={Clock01Icon} size={12} />
							<span>Vence: {formatDate(task.dueAt)}</span>
						</div>
					)}
				</div>
			)}
		</motion.div>
	);
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat("es-PE", {
		dateStyle: "short",
		timeStyle: "short",
	}).format(new Date(value));
}
