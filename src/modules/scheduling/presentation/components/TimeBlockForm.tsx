"use client";

import { Button } from "#/shared/components/ui/button";
import { Input } from "#/shared/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/shared/components/ui/select";
import { Textarea } from "#/shared/components/ui/textarea";
import { useForm } from "@tanstack/react-form";
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
import { FormField, getSchedulingError } from "./form-field.shared";

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
				form.reset();
				onCompleted?.();
			} catch (error) {
				setSubmitError(
					getSchedulingError(error, "No fue posible guardar el bloque."),
				);
			}
		},
	});

	return (
		<form
			className="space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<div className="grid gap-4 md:grid-cols-2">
				<form.Field name="title">
					{(field) => (
						<FormField label="Título" errors={field.state.meta.errors}>
							<Input
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="Ej: Preparar presentación"
							/>
						</FormField>
					)}
				</form.Field>

				<form.Field name="kind">
					{(field) => (
						<FormField label="Tipo" errors={field.state.meta.errors}>
							<Select
								value={field.state.value}
								onValueChange={(v) =>
									field.handleChange(v as typeof field.state.value)
								}
							>
								<SelectTrigger className="w-full">
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
						</FormField>
					)}
				</form.Field>

				<form.Field name="taskId">
					{(field) => (
						<FormField
							label="Tarea relacionada"
							errors={field.state.meta.errors}
						>
							<Select
								value={field.state.value}
								onValueChange={(v) => field.handleChange(v ?? "")}
							>
								<SelectTrigger className="w-full">
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
						</FormField>
					)}
				</form.Field>

				<form.Field name="notes">
					{(field) => (
						<FormField label="Notas" errors={field.state.meta.errors}>
							<Textarea
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="Notas adicionales..."
							/>
						</FormField>
					)}
				</form.Field>

				<form.Field name="startAt">
					{(field) => (
						<FormField label="Inicio" errors={field.state.meta.errors}>
							<Input
								type="datetime-local"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						</FormField>
					)}
				</form.Field>

				<form.Field name="endAt">
					{(field) => (
						<FormField label="Fin" errors={field.state.meta.errors}>
							<Input
								type="datetime-local"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						</FormField>
					)}
				</form.Field>
			</div>

			{submitError && (
				<div
					role="alert"
					className="rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
				>
					{submitError}
				</div>
			)}

			<form.Subscribe
				selector={(state) => [state.canSubmit, state.isSubmitting]}
			>
				{([canSubmit, isSubmitting]) => (
					<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						{block && (
							<Button type="button" variant="outline" onClick={onCompleted}>
								Cancelar
							</Button>
						)}
						<Button type="submit" disabled={!canSubmit || isSubmitting}>
							{isSubmitting ? "Guardando…" : "Guardar bloque"}
						</Button>
					</div>
				)}
			</form.Subscribe>
		</form>
	);
}
