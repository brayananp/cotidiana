import { ResponsiveDialog } from "@/shared/components/responsive-dialog";

import type { Task } from "../../domain/task";
import type { TaskExecutionContext } from "../../application/task-context";
import { TaskForm } from "./TaskForm";

type TaskFormDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	context: TaskExecutionContext;
	task: Task | null;
	onCompleted: () => void;
};

export function TaskFormDialog({
	open,
	onOpenChange,
	context,
	task,
	onCompleted,
}: TaskFormDialogProps) {
	const title = task ? "Editar tarea" : "Nueva tarea";
	const description = task
		? "Actualiza los datos de la tarea."
		: "Crea una nueva tarea en tu lista.";

	return (
		<ResponsiveDialog
			open={open}
			onOpenChange={onOpenChange}
			title={title}
			description={description}
		>
			<TaskForm
				context={context}
				task={task}
				onCompleted={() => {
					onCompleted();
					onOpenChange(false);
				}}
			/>
		</ResponsiveDialog>
	);
}
