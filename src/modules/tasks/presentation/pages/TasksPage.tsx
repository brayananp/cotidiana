import {
	Archive01Icon,
	PlusSignIcon,
	Search01Icon,
	Task01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouteContext } from "@tanstack/react-router";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { useMemo, useState } from "react";
import type { Task } from "@/modules/tasks/domain/task";
import { TaskFormDialog } from "@/modules/tasks/presentation/components/TaskFormDialog";
import { TaskItem } from "@/modules/tasks/presentation/components/TaskItem";
import { usePendingTaskChanges } from "@/modules/tasks/presentation/hooks/use-pending-task-changes";
import { useTasks } from "@/modules/tasks/presentation/hooks/use-tasks";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/shared/components/ui/input-group";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@/shared/components/ui/toggle-group";

const statusFilterOptions = [
	{ value: "all", label: "Todas" },
	{ value: "todo", label: "Pendientes" },
	{ value: "in_progress", label: "En progreso" },
	{ value: "done", label: "Completadas" },
] as const;

const listVariants: Variants = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: {
			staggerChildren: 0.05,
			delayChildren: 0.02,
		},
	},
};

const itemVariants: Variants = {
	hidden: { opacity: 0, y: 12 },
	show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
	exit: { opacity: 0, x: -16, transition: { duration: 0.15 } },
};

export function TasksPage() {
	const { access } = useRouteContext({ from: "/_app" });
	const identity = access.localIdentity;

	if (!identity) {
		return (
			<div className="flex min-h-[200px] items-center justify-center p-6 text-center">
				<p className="text-sm text-muted-foreground">
					El dispositivo todavía no tiene una identidad local activa.
				</p>
			</div>
		);
	}

	return <TasksContent userId={identity.userId} deviceId={identity.deviceId} />;
}

function TasksContent({
	userId,
	deviceId,
}: {
	userId: string;
	deviceId: string;
}) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [status, setStatus] = useState<"all" | "todo" | "in_progress" | "done">(
		"all",
	);
	const [search, setSearch] = useState("");
	const [includeArchived, setIncludeArchived] = useState(false);
	const [editingTask, setEditingTask] = useState<Task | null>(null);

	const allTasks = useTasks({
		userId,
		status: "all",
		search: "",
		includeArchived,
	});
	const filteredTasks = useTasks({ userId, status, search, includeArchived });
	const pendingChanges = usePendingTaskChanges(userId);
	const context = { userId, deviceId };

	// Stats counts
	const counts = useMemo(() => {
		const todo = allTasks.filter((t) => t.status === "todo").length;
		const inProgress = allTasks.filter(
			(t) => t.status === "in_progress",
		).length;
		const done = allTasks.filter((t) => t.status === "done").length;
		return { all: allTasks.length, todo, inProgress, done };
	}, [allTasks]);

	const openNewTask = () => {
		setEditingTask(null);
		setDialogOpen(true);
	};

	const openEditTask = (task: Task) => {
		setEditingTask(task);
		setDialogOpen(true);
	};

	return (
		<section className="mx-auto max-w-3xl space-y-5">
			{/* Header */}
			<header className="flex flex-col gap-2">
				<div className="flex items-center justify-between gap-3">
					<div>
						<div className="flex items-center gap-2">
							<h1 className="text-2xl font-bold tracking-tight">Tareas</h1>
							{pendingChanges > 0 && (
								<Badge
									variant="outline"
									className="text-[10px] font-semibold border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
								>
									{pendingChanges} por sincronizar
								</Badge>
							)}
						</div>
						<p className="mt-0.5 text-xs text-muted-foreground">
							Organiza, prioriza y gestiona tus actividades diarias.
						</p>
					</div>

					<Button onClick={openNewTask} size="sm" className="gap-1.5 shrink-0">
						<HugeiconsIcon icon={PlusSignIcon} size={15} />
						<span>Nueva tarea</span>
					</Button>
				</div>

				{/* Quick Stats Bar */}
				<div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
					<span className="font-semibold text-muted-foreground">Resumen:</span>
					<Badge variant="secondary" className="text-[10px] font-medium">
						{counts.todo} pendientes
					</Badge>
					{counts.inProgress > 0 && (
						<Badge
							variant="outline"
							className="text-[10px] font-semibold border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
						>
							{counts.inProgress} en progreso
						</Badge>
					)}
					<Badge variant="outline" className="text-[10px] font-medium">
						{counts.done} completadas
					</Badge>
				</div>
			</header>

			{/* Search & Filters Controls */}
			<div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
				{/* Search Input */}
				<div className="flex-1">
					<InputGroup className="h-9">
						<InputGroupAddon align="inline-start">
							<HugeiconsIcon icon={Search01Icon} size={14} />
						</InputGroupAddon>
						<InputGroupInput
							type="search"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Buscar por título o descripción…"
							className="text-xs"
						/>
					</InputGroup>
				</div>

				{/* 1-Click Segmented Toggle Group for Status */}
				<div className="flex items-center gap-2 shrink-0 overflow-x-auto">
					<ToggleGroup
						value={[status]}
						onValueChange={(val: string[]) => {
							const selected = val[val.length - 1];
							if (selected) setStatus(selected as typeof status);
						}}
						className="justify-start gap-0.5 rounded-xl border bg-muted/40 p-0.5"
					>
						{statusFilterOptions.map((opt) => (
							<ToggleGroupItem
								key={opt.value}
								value={opt.value}
								size="sm"
								className="h-7 rounded-lg px-2.5 text-xs font-medium data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-xs"
							>
								{opt.label}
							</ToggleGroupItem>
						))}
					</ToggleGroup>

					{/* Archived toggle button */}
					<Button
						variant={includeArchived ? "secondary" : "outline"}
						size="sm"
						onClick={() => setIncludeArchived(!includeArchived)}
						className="h-8 gap-1.5 text-xs shrink-0"
						title={
							includeArchived ? "Ocultar archivadas" : "Mostrar archivadas"
						}
					>
						<HugeiconsIcon icon={Archive01Icon} size={13} />
						<span>Archivadas</span>
					</Button>
				</div>
			</div>

			{/* Task Dialog */}
			<TaskFormDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				context={context}
				task={editingTask}
				onCompleted={() => {
					setEditingTask(null);
				}}
			/>

			{/* Task List / Empty State */}
			{filteredTasks.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-12 px-6 text-center">
					<div className="mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
						<HugeiconsIcon icon={Task01Icon} size={20} />
					</div>
					<h3 className="text-sm font-semibold text-foreground">
						{search ? "No se encontraron tareas" : "No hay tareas registradas"}
					</h3>
					<p className="mt-1 max-w-sm text-xs text-muted-foreground">
						{search
							? "Prueba cambiando el término de búsqueda o desactivando los filtros."
							: "Comienza creando tu primera tarea para organizar tu día."}
					</p>
					{!search && (
						<Button
							size="sm"
							className="mt-4 gap-1.5 text-xs font-semibold"
							onClick={openNewTask}
						>
							<HugeiconsIcon icon={PlusSignIcon} size={14} />
							<span>Crear primera tarea</span>
						</Button>
					)}
				</div>
			) : (
				<motion.div
					layout
					variants={listVariants}
					initial="hidden"
					animate="show"
					className="grid gap-2.5"
				>
					<AnimatePresence mode="popLayout">
						{filteredTasks.map((task: Task) => (
							<motion.div
								key={task.id}
								layout
								variants={itemVariants}
								exit="exit"
							>
								<TaskItem task={task} context={context} onEdit={openEditTask} />
							</motion.div>
						))}
					</AnimatePresence>
				</motion.div>
			)}
		</section>
	);
}

export function TasksPageSkeleton() {
	return (
		<div className="mx-auto max-w-3xl space-y-5">
			<div className="flex items-center justify-between">
				<Skeleton className="h-8 w-32 rounded-lg" />
				<Skeleton className="h-8 w-28 rounded-lg" />
			</div>
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
				<Skeleton className="h-9 flex-1 rounded-2xl" />
				<Skeleton className="h-9 w-64 rounded-xl" />
			</div>
			{[1, 2, 3, 4].map((i) => (
				<Skeleton key={i} className="h-20 w-full rounded-2xl" />
			))}
		</div>
	);
}
