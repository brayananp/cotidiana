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
import { FormField, getSchedulingError } from "./form-field.shared";

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
				form.reset();
				onCompleted?.();
			} catch (error) {
				setSubmitError(
					getSchedulingError(error, "No fue posible guardar el evento."),
				);
			}
		},
	});

	return (
		<form
			className="space-y-4"
			onSubmit={(submitEvent) => {
				submitEvent.preventDefault();
				submitEvent.stopPropagation();
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
								placeholder="Ej: Reunión de equipo"
							/>
						</FormField>
					)}
				</form.Field>

				<form.Field name="eventType">
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
										{CALENDAR_EVENT_TYPES.map((eventType) => (
											<SelectItem key={eventType} value={eventType}>
												{calendarEventTypeLabels[eventType]}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</FormField>
					)}
				</form.Field>

				<form.Field name="location">
					{(field) => (
						<FormField label="Ubicación" errors={field.state.meta.errors}>
							<Input
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="Ej: Sala A - Oficina"
							/>
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
								placeholder="Notas de la reunión..."
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
						{event && (
							<Button type="button" variant="outline" onClick={onCompleted}>
								Cancelar
							</Button>
						)}
						<Button type="submit" disabled={!canSubmit || isSubmitting}>
							{isSubmitting ? "Guardando…" : "Guardar evento"}
						</Button>
					</div>
				)}
			</form.Subscribe>
		</form>
	);
}
