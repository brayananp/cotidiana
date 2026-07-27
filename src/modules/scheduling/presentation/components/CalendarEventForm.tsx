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
import {
	CALENDAR_EVENT_TYPES,
	type CalendarEvent,
} from "../../domain/calendar-event";
import { schedulingDependencies } from "../../infrastructure/scheduling.dependencies";
import {
	type CalendarEventFormInput,
	calendarEventFormSchema,
} from "../../schemas/calendar-event-form.schema";
import { calendarEventTypeLabels } from "../labels";
import { defaultLocalDateTime } from "../week-utils";
import { getSchedulingError } from "./form-field.shared";

type CalendarEventFormProps = {
	context: SchedulingExecutionContext;
	event?: CalendarEvent | null;
	initialDate?: Date;
	onCompleted?: () => void;
};

export function CalendarEventForm({
	context,
	event,
	initialDate,
	onCompleted,
}: CalendarEventFormProps) {
	const [submitError, setSubmitError] = useState<string | null>(null);

	const defaultValues: CalendarEventFormInput = {
		title: event?.title ?? "",
		notes: event?.notes ?? "",
		location: event?.location ?? "",
		eventType: event?.eventType ?? "meeting",
		startAt: event
			? isoToLocalDateTime(event.startAt)
			: defaultLocalDateTime(initialDate, 9),
		endAt: event
			? isoToLocalDateTime(event.endAt)
			: defaultLocalDateTime(initialDate, 10),
	};

	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: calendarEventFormSchema,
		},
		onSubmit: async ({ value }) => {
			setSubmitError(null);
			const actionLabel = event ? "actualizado" : "creado";
			try {
				if (event) {
					await schedulingDependencies.updateCalendarEvent(
						event.id,
						value,
						context,
					);
				} else {
					await schedulingDependencies.createCalendarEvent(value, context);
				}
				toast.add({
					type: "success",
					title: "Evento guardado",
					description: `El evento fue ${actionLabel} con éxito.`,
				});
				form.reset();
				onCompleted?.();
			} catch (error) {
				const message = getSchedulingError(
					error,
					"No fue posible guardar el evento.",
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
			onSubmit={(submitEvent) => {
				submitEvent.preventDefault();
				submitEvent.stopPropagation();
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
											placeholder="Ej: Reunión de equipo"
										/>
										<FieldDescription>
											Asigna un título claro para el evento.
										</FieldDescription>
										<FieldError errors={field.state.meta.errors} />
									</FieldContent>
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="eventType">
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
													{CALENDAR_EVENT_TYPES.map((eventType) => (
														<SelectItem key={eventType} value={eventType}>
															{calendarEventTypeLabels[eventType]}
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

					<form.Field name="location">
						{(field) => {
							const invalid = field.state.meta.errors.length > 0;
							return (
								<Field data-invalid={invalid || undefined}>
									<FieldLabel htmlFor={field.name}>Ubicación</FieldLabel>
									<FieldContent>
										<Input
											id={field.name}
											aria-invalid={invalid || undefined}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="Ej: Sala A - Oficina o enlace Meet"
										/>
										<FieldDescription>
											Opcional: sala física o enlace de videollamada.
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
											placeholder="Notas de la reunión..."
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
						{event && (
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
									{event ? "Actualizar evento" : "Guardar evento"}
								</>
							)}
						</Button>
					</div>
				)}
			</form.Subscribe>
		</form>
	);
}
