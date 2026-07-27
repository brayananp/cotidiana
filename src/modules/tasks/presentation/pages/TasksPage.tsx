import { Task01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouteContext } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Task } from "@/modules/tasks/domain/task";
import { TaskFormDialog } from "@/modules/tasks/presentation/components/TaskFormDialog";
import { TaskItem } from "@/modules/tasks/presentation/components/TaskItem";
import { usePendingTaskChanges } from "@/modules/tasks/presentation/hooks/use-pending-task-changes";
import { useTasks } from "@/modules/tasks/presentation/hooks/use-tasks";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";

const statusOptions = [
	{ value: "all", label: "Todos los estados" },
	{ value: "todo", label: "Pendientes" },
	{ value: "in_progress", label: "En progreso" },
	{ value: "done", label: "Completadas" },
] as const;

export function TasksPage() {
	const { access } = useRouteContext({ from: "/_app" });
	const identity = access.localIdentity;

	if (!identity) {
		return (
			<div className="flex min-h-[200px] items-center justify-center">
				<p className="text-muted-foreground">
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

	const tasks = useTasks({ userId, status, search, includeArchived });
	const pendingChanges = usePendingTaskChanges(userId);
	const context = { userId, deviceId };

	const openNewTask = () => {
		setEditingTask(null);
		setDialogOpen(true);
	};

	const openEditTask = (task: Task) => {
		setEditingTask(task);
		setDialogOpen(true);
	};

	return (
		<section className="mx-auto max-w-3xl space-y-6">
			<header className="flex flex-col gap-1">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-semibold">Tareas</h1>
					<Button onClick={openNewTask}>Nueva tarea</Button>
				</div>
				<p className="text-sm text-muted-foreground">
					{pendingChanges === 0
						? "Todas las tareas están sincronizadas."
						: `${pendingChanges} cambio(s) pendiente(s) de sincronización.`}
				</p>
			</header>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div className="flex-1">
					<Input
						type="search"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Buscar tareas…"
						className="w-full"
					/>
				</div>
				<div className="flex gap-2">
					<Select
						value={status}
						onValueChange={(v) => setStatus(v as typeof status)}
					>
						<SelectTrigger className="w-[160px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{statusOptions.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						variant={includeArchived ? "secondary" : "outline"}
						size="default"
						onClick={() => setIncludeArchived(!includeArchived)}
						className="shrink-0"
					>
						<Badge
							variant={includeArchived ? "default" : "outline"}
							className="mr-1"
						>
							{includeArchived ? "Sí" : "No"}
						</Badge>
						Archivadas
					</Button>
				</div>
			</div>

			<TaskFormDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				context={context}
				task={editingTask}
				onCompleted={() => {
					setEditingTask(null);
				}}
			/>

			{tasks.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
					<div className="mb-4 rounded-full bg-muted p-4">
						<HugeiconsIcon icon={Task01Icon} />
					</div>
					<h3 className="font-medium">No hay tareas</h3>
					<p className="mt-1 text-sm text-muted-foreground">
						Crea una tarea nueva para comenzar.
					</p>
					<Button className="mt-4" onClick={openNewTask}>
						Crear primera tarea
					</Button>
				</div>
			) : (
				<motion.div layout className="grid gap-3">
					<AnimatePresence mode="popLayout">
						{tasks.map((task: Task, index: number) => (
							<motion.div
								key={task.id}
								layout
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, x: -20 }}
								transition={{
									duration: 0.25,
									delay: index * 0.03,
									ease: "easeOut",
								}}
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
		<div className="mx-auto max-w-3xl space-y-6">
			<div className="flex items-center justify-between">
				<Skeleton className="h-8 w-32" />
				<Skeleton className="h-8 w-28" />
			</div>
			<div className="flex gap-3">
				<Skeleton className="h-10 flex-1" />
				<Skeleton className="h-10 w-40" />
				<Skeleton className="h-10 w-32" />
			</div>
			{[1, 2, 3].map((i) => (
				<Skeleton key={i} className="h-32 w-full rounded-2xl" />
			))}
		</div>
	);
}
