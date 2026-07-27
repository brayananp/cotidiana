import { useForm } from "@tanstack/react-form";
import type { ReactNode } from "react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { isoToLocalDateTime } from "@/modules/tasks/application/date-mapper";
import type { TaskExecutionContext } from "@/modules/tasks/application/task-context";
import { TASK_PRIORITIES, type Task } from "@/modules/tasks/domain/task";
import { tasksDependencies } from "@/modules/tasks/infrastructure/tasks.dependencies";
import { taskPriorityLabels } from "@/modules/tasks/presentation/task-labels";
import {
	taskFormSchema,
	type TaskFormInput,
} from "@/modules/tasks/schemas/task-input.schema";

type TaskFormProps = {
	context: TaskExecutionContext;
	task?: Task | null;
	onCompleted?: () => void;
};

export function TaskForm({ context, task, onCompleted }: TaskFormProps) {
	const defaultValues: TaskFormInput = {
		title: task?.title ?? "",
		description: task?.description ?? "",
		priority: task?.priority ?? "none",
		plannedAt: isoToLocalDateTime(task?.plannedAt ?? null),
		dueAt: isoToLocalDateTime(task?.dueAt ?? null),
	};

	const form = useForm({
		defaultValues,
		validators: { onSubmit: taskFormSchema },
		onSubmit: async ({ value }) => {
			if (task) {
				await tasksDependencies.updateTask(task.id, value, context);
			} else {
				await tasksDependencies.createTask(value, context);
			}
			form.reset();
			onCompleted?.();
		},
	});

	return (
		<form
			className="space-y-5"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<form.Field name="title">
				{(field) => (
					<FieldContainer label="Título" errors={field.state.meta.errors}>
						<Input
							id={field.name}
							name={field.name}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							placeholder="¿Qué tienes que hacer?"
							autoFocus
						/>
					</FieldContainer>
				)}
			</form.Field>

			<form.Field name="description">
				{(field) => (
					<FieldContainer label="Descripción" errors={field.state.meta.errors}>
						<Textarea
							id={field.name}
							name={field.name}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							placeholder="Agrega más detalles (opcional)"
							rows={3}
						/>
					</FieldContainer>
				)}
			</form.Field>

			<form.Field name="priority">
				{(field) => (
					<FieldContainer label="Prioridad" errors={field.state.meta.errors}>
						<Select
							value={field.state.value}
							onValueChange={(value) => field.handleChange(value ?? "none")}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{TASK_PRIORITIES.map((priority) => (
									<SelectItem key={priority} value={priority}>
										{taskPriorityLabels[priority]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</FieldContainer>
				)}
			</form.Field>

			<div className="grid gap-4 sm:grid-cols-2">
				<form.Field name="plannedAt">
					{(field) => (
						<FieldContainer
							label="Fecha planificada"
							errors={field.state.meta.errors}
						>
							<Input
								id={field.name}
								type="datetime-local"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
							/>
						</FieldContainer>
					)}
				</form.Field>

				<form.Field name="dueAt">
					{(field) => (
						<FieldContainer
							label="Fecha límite"
							errors={field.state.meta.errors}
						>
							<Input
								id={field.name}
								type="datetime-local"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
							/>
						</FieldContainer>
					)}
				</form.Field>
			</div>

			<form.Subscribe
				selector={(state) => [state.canSubmit, state.isSubmitting]}
			>
				{([canSubmit, isSubmitting]) => (
					<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						{task && (
							<Button type="button" variant="outline" onClick={onCompleted}>
								Cancelar
							</Button>
						)}
						<Button type="submit" disabled={!canSubmit || isSubmitting}>
							{isSubmitting
								? "Guardando…"
								: task
									? "Guardar cambios"
									: "Crear tarea"}
						</Button>
					</div>
				)}
			</form.Subscribe>
		</form>
	);
}

type FieldContainerProps = {
	label: string;
	errors: readonly unknown[];
	children: ReactNode;
};

function FieldContainer({ label, errors, children }: FieldContainerProps) {
	const errorMessage = errors.map(getErrorMessage).filter(Boolean).join(", ");

	return (
		<div className="space-y-2">
			<label className="text-sm font-medium">{label}</label>
			{children}
			{errorMessage && (
				<p className="text-sm text-destructive">{errorMessage}</p>
			)}
		</div>
	);
}

function getErrorMessage(error: unknown): string {
	if (typeof error === "string") return error;
	if (
		typeof error === "object" &&
		error !== null &&
		"message" in error &&
		typeof (error as { message: string }).message === "string"
	) {
		return (error as { message: string }).message;
	}
	return "";
}
