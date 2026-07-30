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
import { AnimatePresence, motion } from "motion/react";
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
	none: { variant: "outline", className: "opacity-40" },
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
	const isOverdue =
		!isDone && Boolean(task.dueAt && new Date(task.dueAt) < new Date());

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
			className={`group relative flex flex-col gap-2.5 rounded-2xl border bg-card p-3.5 transition-all duration-200 hover:shadow-sm ${
				isDone
					? "bg-card/50 opacity-70 border-border/50"
					: isOverdue
						? "border-destructive/30 bg-destructive/[0.02]"
						: "border-border"
			}`}
		>
			{/* Top Row: Checkbox + Title + Priority + Options Menu */}
			<div className="flex items-start justify-between gap-3">
				<div className="flex items-start gap-3 min-w-0 flex-1">
					{/* Interactive Micro-animated Checkbox (Asana / Todoist style) */}
					<motion.button
						type="button"
						onClick={toggleComplete}
						whileTap={{ scale: 0.85 }}
						animate={isDone ? { scale: [0.85, 1.2, 1] } : { scale: 1 }}
						transition={{ duration: 0.2 }}
						className={`mt-0.5 relative flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors duration-200 ${
							isDone
								? "border-emerald-500 bg-emerald-500 text-white shadow-xs shadow-emerald-500/30"
								: "border-muted-foreground/40 hover:border-primary hover:bg-primary/10"
						}`}
						title={isDone ? "Marcar como pendiente" : "Marcar como completada"}
					>
						<AnimatePresence mode="wait">
							{isDone && (
								<motion.div
									initial={{ scale: 0, rotate: -45 }}
									animate={{ scale: 1, rotate: 0 }}
									exit={{ scale: 0, rotate: 45 }}
									transition={{ type: "spring", stiffness: 500, damping: 25 }}
								>
									<HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} />
								</motion.div>
							)}
						</AnimatePresence>
					</motion.button>

					{/* Title & Description with Animated Strike-through */}
					<div className="flex flex-col gap-0.5 min-w-0 flex-1">
						<button
							type="button"
							onClick={toggleComplete}
							className="text-left border-0 bg-transparent p-0 cursor-pointer group/title"
						>
							<h3
								className={`relative inline-block text-sm font-medium leading-snug select-none transition-colors duration-200 ${
									isDone
										? "text-muted-foreground"
										: "text-foreground group-hover/title:text-primary"
								}`}
							>
								{task.title}
								{/* Animated Strike-through line */}
								{isDone && (
									<motion.span
										initial={{ scaleX: 0 }}
										animate={{ scaleX: 1 }}
										transition={{ duration: 0.2, ease: "easeOut" }}
										className="absolute left-0 top-1/2 h-[1.5px] w-full origin-left bg-muted-foreground/60"
									/>
								)}
							</h3>
						</button>
						{task.description && (
							<p
								className={`line-clamp-2 text-xs leading-relaxed ${isDone ? "text-muted-foreground/60" : "text-muted-foreground"}`}
							>
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

			{/* Dates Row — Properly handles completed vs overdue state */}
			{(task.plannedAt || task.dueAt) && (
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-8 text-[11px] text-muted-foreground">
					{task.plannedAt && (
						<div className="flex items-center gap-1">
							<HugeiconsIcon icon={Calendar01Icon} size={12} />
							<span>{formatDate(task.plannedAt)}</span>
						</div>
					)}
					{task.dueAt && (
						<div
							className={`flex items-center gap-1 ${
								isDone
									? "text-muted-foreground/60"
									: isOverdue
										? "text-destructive font-semibold"
										: "text-muted-foreground"
							}`}
						>
							<HugeiconsIcon
								icon={Clock01Icon}
								size={12}
								className={isOverdue && !isDone ? "text-destructive" : ""}
							/>
							<span>
								{isOverdue
									? `Vencida · ${formatDate(task.dueAt)}`
									: `Límite: ${formatDate(task.dueAt)}`}
							</span>
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
