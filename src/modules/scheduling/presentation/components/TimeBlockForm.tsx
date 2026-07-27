"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "#/shared/components/ui/alert";
import { Button } from "#/shared/components/ui/button";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "#/shared/components/ui/field";
import { Input } from "#/shared/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/shared/components/ui/select";
import { Spinner } from "#/shared/components/ui/spinner";
import { Textarea } from "#/shared/components/ui/textarea";
import { toast } from "#/shared/components/ui/toast";
import { Alert01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { motion } from "motion/react";
import { useState } from "react";
import { isoToLocalDateTime } from "../../application/date-mapper";
import type { SchedulingExecutionContext } from "../../application/scheduling-context";
import { TIME_BLOCK_KINDS, type TimeBlock } from "../../domain/time-block";
import { schedulingDependencies } from "../../infrastructure/scheduling.dependencies";
import {
	type TimeBlockFormInput,
	timeBlockFormSchema,
} from "../../schemas/time-block-form.schema";
import { useTaskOptions } from "../hooks/use-task-options";
import { timeBlockKindLabels } from "../labels";
import { defaultLocalDateTime } from "../week-utils";
import { getSchedulingError } from "./form-field.shared";

type TimeBlockFormProps = {
	context: SchedulingExecutionContext;
	block?: TimeBlock | null;
	initialDate?: Date;
	onCompleted?: () => void;
};

export function TimeBlockForm({
	context,
	block,
	initialDate,
	onCompleted,
}: TimeBlockFormProps) {
	const tasks = useTaskOptions(context.userId);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const startDefault = block
		? isoToLocalDateTime(block.startAt)
		: defaultLocalDateTime(initialDate, 9);

	const endDefault = block
		? isoToLocalDateTime(block.endAt)
		: defaultLocalDateTime(initialDate, 10);

	const defaultValues: TimeBlockFormInput = {
		title: block?.title ?? "",
		notes: block?.notes ?? "",
		taskId: block?.taskId ?? "",
		kind: block?.kind ?? "focus",
		startAt: startDefault,
		endAt: endDefault,
	};

	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: timeBlockFormSchema,
		},
		onSubmit: async ({ value }) => {
			setSubmitError(null);
			const actionLabel = block ? "actualizado" : "creado";
			try {
				if (block) {
					await schedulingDependencies.updateTimeBlock(
						block.id,
						value,
						context,
					);
				} else {
					await schedulingDependencies.createTimeBlock(value, context);
				}
				toast.add({
					type: "success",
					title: "Bloque guardado",
					description: `El bloque de tiempo fue ${actionLabel} con éxito.`,
				});
				form.reset();
				onCompleted?.();
			} catch (error) {
				const message = getSchedulingError(
					error,
					"No fue posible guardar el bloque.",
				);
				setSubmitError(message);
				toast.add({
					type: "error",
					title: "No se pudo guardar",
					description: message,
				});
			}
		},
	});

	return (
		<form
			className="flex flex-col gap-6"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<FieldGroup>
				<div className="grid gap-6 md:grid-cols-2">
					<form.Field name="title">
						{(field) => {
							const invalid = field.state.meta.errors.length > 0;
							return (
								<Field data-invalid={invalid || undefined}>
									<FieldLabel htmlFor={field.name}>Título</FieldLabel>
									<FieldContent>
										<Input
											id={field.name}
											aria-invalid={invalid || undefined}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="Ej: Preparar presentación"
										/>
										<FieldDescription>
											Identifica claramente el objetivo de este bloque.
										</FieldDescription>
										<FieldError errors={field.state.meta.errors} />
									</FieldContent>
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="kind">
						{(field) => {
							const invalid = field.state.meta.errors.length > 0;
							return (
								<Field data-invalid={invalid || undefined}>
									<FieldLabel htmlFor={field.name}>Tipo</FieldLabel>
									<FieldContent>
										<Select
											value={field.state.value}
											onValueChange={(v) =>
												field.handleChange(v as typeof field.state.value)
											}
										>
											<SelectTrigger
												id={field.name}
												aria-invalid={invalid || undefined}
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													{TIME_BLOCK_KINDS.map((kind) => (
														<SelectItem key={kind} value={kind}>
															{timeBlockKindLabels[kind]}
														</SelectItem>
													))}
												</SelectGroup>
											</SelectContent>
										</Select>
										<FieldError errors={field.state.meta.errors} />
									</FieldContent>
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="taskId">
						{(field) => {
							const invalid = field.state.meta.errors.length > 0;
							return (
								<Field data-invalid={invalid || undefined}>
									<FieldLabel htmlFor={field.name}>
										Tarea relacionada
									</FieldLabel>
									<FieldContent>
										<Select
											value={field.state.value}
											onValueChange={(v) => field.handleChange(v ?? "")}
										>
											<SelectTrigger
												id={field.name}
												aria-invalid={invalid || undefined}
											>
												<SelectValue placeholder="Sin tarea" />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													<SelectItem value="">Sin tarea</SelectItem>
													{tasks.map((task) => (
														<SelectItem key={task.id} value={task.id}>
															{task.title}
														</SelectItem>
													))}
												</SelectGroup>
											</SelectContent>
										</Select>
										<FieldDescription>
											Vincula el bloque a una tarea para sincronizar progreso.
										</FieldDescription>
										<FieldError errors={field.state.meta.errors} />
									</FieldContent>
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="notes">
						{(field) => {
							const invalid = field.state.meta.errors.length > 0;
							return (
								<Field data-invalid={invalid || undefined}>
									<FieldLabel htmlFor={field.name}>Notas</FieldLabel>
									<FieldContent>
										<Textarea
											id={field.name}
											aria-invalid={invalid || undefined}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="Notas adicionales..."
										/>
										<FieldError errors={field.state.meta.errors} />
									</FieldContent>
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="startAt">
						{(field) => {
							const invalid = field.state.meta.errors.length > 0;
							return (
								<Field data-invalid={invalid || undefined}>
									<FieldLabel htmlFor={field.name}>Inicio</FieldLabel>
									<FieldContent>
										<Input
											id={field.name}
											type="datetime-local"
											aria-invalid={invalid || undefined}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										<FieldError errors={field.state.meta.errors} />
									</FieldContent>
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="endAt">
						{(field) => {
							const invalid = field.state.meta.errors.length > 0;
							return (
								<Field data-invalid={invalid || undefined}>
									<FieldLabel htmlFor={field.name}>Fin</FieldLabel>
									<FieldContent>
										<Input
											id={field.name}
											type="datetime-local"
											aria-invalid={invalid || undefined}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										<FieldError errors={field.state.meta.errors} />
									</FieldContent>
								</Field>
							);
						}}
					</form.Field>
				</div>
			</FieldGroup>

			{submitError && (
				<motion.div
					initial={{ opacity: 0, y: -6 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -6 }}
				>
					<Alert variant="destructive">
						<HugeiconsIcon
							icon={Alert01Icon}
							strokeWidth={2}
							data-icon="inline-start"
						/>
						<AlertTitle>No fue posible guardar</AlertTitle>
						<AlertDescription>{submitError}</AlertDescription>
					</Alert>
				</motion.div>
			)}

			<form.Subscribe
				selector={(state) => [state.canSubmit, state.isSubmitting]}
			>
				{([canSubmit, isSubmitting]) => (
					<div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
						{block && (
							<Button
								type="button"
								variant="outline"
								onClick={onCompleted}
								disabled={isSubmitting}
							>
								Cancelar
							</Button>
						)}
						<Button type="submit" disabled={!canSubmit || isSubmitting}>
							{isSubmitting ? (
								<>
									<Spinner aria-hidden="true" data-icon="inline-start" />
									Guardando…
								</>
							) : (
								<>
									<HugeiconsIcon
										icon={CheckmarkCircle02Icon}
										strokeWidth={2}
										data-icon="inline-start"
										aria-hidden="true"
									/>
									{block ? "Actualizar bloque" : "Guardar bloque"}
								</>
							)}
						</Button>
					</div>
				)}
			</form.Subscribe>
		</form>
	);
}
