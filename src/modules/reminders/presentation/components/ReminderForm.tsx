import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "#/shared/components/ui/alert";
import { Button } from "#/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/shared/components/ui/card";
import {
	Field,
	FieldContent,
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
import { Separator } from "#/shared/components/ui/separator";
import { Spinner } from "#/shared/components/ui/spinner";
import { Textarea } from "#/shared/components/ui/textarea";
import { cn } from "#/shared/lib/utils";
import { Link01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { motion } from "motion/react";
import { useState } from "react";
import { isoToLocalDateTime } from "../../application/date-mapper";
import type { ReminderExecutionContext } from "../../application/reminder-context";
import {
	REMINDER_RECURRENCES,
	REMINDER_TARGET_TYPES,
	type Reminder,
	type ReminderTargetType,
} from "../../domain/reminder";
import { remindersDependencies } from "../../infrastructure/reminders.dependencies";
import {
	type ReminderFormInput,
	reminderFormSchema,
} from "../../schemas/reminder-form.schema";
import { useReminderTargetOptions } from "../hooks/use-reminder-target-options";
import { reminderRecurrenceLabels, reminderTargetTypeLabels } from "../labels";

type ReminderFormProps = {
	context: ReminderExecutionContext;
	reminder?: Reminder | null;
	onCompleted?: () => void;
};

export function ReminderForm({
	context,
	reminder,
	onCompleted,
}: ReminderFormProps) {
	const [submitError, setSubmitError] = useState<string | null>(null);

	const defaultDate = new Date(Date.now() + 30 * 60_000);

	const defaultValues: ReminderFormInput = {
		title: reminder?.title ?? "",
		notes: reminder?.notes ?? "",
		targetType: reminder?.targetType ?? "custom",
		targetId: reminder?.targetId ?? "",
		remindAt: reminder
			? isoToLocalDateTime(reminder.remindAt)
			: toLocalDateTime(defaultDate),
		recurrence: reminder?.recurrence ?? "none",
		repeatInterval: reminder?.repeatInterval ?? 1,
	};

	const [selectedTargetType, setSelectedTargetType] =
		useState<ReminderTargetType>(defaultValues.targetType);

	const targetOptions = useReminderTargetOptions(
		context.userId,
		selectedTargetType,
	);

	const form = useForm({
		defaultValues,

		validators: {
			onSubmit: reminderFormSchema,
		},

		onSubmit: async ({ value }) => {
			setSubmitError(null);

			try {
				if (reminder) {
					await remindersDependencies.updateReminder(
						reminder.id,
						value,
						context,
					);
				} else {
					await remindersDependencies.createReminder(value, context);
				}

				form.reset();
				onCompleted?.();
			} catch (error) {
				setSubmitError(
					error instanceof Error
						? error.message
						: "No fue posible guardar el recordatorio.",
				);
			}
		},
	});

	return (
		<motion.form
			id="form"
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: 0.05 }}
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<Card
				className={cn(
					reminder
						? "border-ring/40 bg-ring/[0.03] shadow-sm ring-1 ring-ring/20"
						: undefined,
				)}
			>
				<CardHeader className="flex flex-row items-start justify-between gap-4">
					<div className="flex flex-col gap-1">
						<CardTitle className="flex items-center gap-2 text-base">
							<HugeiconsIcon
								icon={reminder ? Tick02Icon : Link01Icon}
								strokeWidth={2}
								data-icon="inline-start"
							/>
							{reminder ? "Editar recordatorio" : "Nuevo recordatorio"}
						</CardTitle>
						<CardDescription className="text-sm">
							Se guardará localmente y se sincronizará cuando haya conexión.
						</CardDescription>
					</div>
					{reminder && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={onCompleted}
							aria-label="Cancelar edición"
						>
							<HugeiconsIcon
								icon={Cancel01Icon}
								strokeWidth={2}
								data-icon="inline-start"
							/>
							Cancelar
						</Button>
					)}
				</CardHeader>

				<CardContent>
					<FieldGroup>
						<div className="grid gap-4 md:grid-cols-2">
							<form.Field name="title">
								{(field) => (
									<Field
										data-invalid={
											field.state.meta.errors.length > 0 || undefined
										}
									>
										<FieldLabel htmlFor="reminder-title">Título</FieldLabel>
										<FieldContent>
											<Input
												id="reminder-title"
												placeholder="Ej.: Llamar a la clínica"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												aria-invalid={field.state.meta.errors.length > 0}
											/>
											<FieldError
												errors={field.state.meta.errors.map(
													normalizeFieldError,
												)}
											/>
										</FieldContent>
									</Field>
								)}
							</form.Field>

							<form.Field name="remindAt">
								{(field) => (
									<Field
										data-invalid={
											field.state.meta.errors.length > 0 || undefined
										}
									>
										<FieldLabel htmlFor="reminder-remind-at">
											Fecha y hora
										</FieldLabel>
										<FieldContent>
											<Input
												id="reminder-remind-at"
												type="datetime-local"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												aria-invalid={field.state.meta.errors.length > 0}
											/>
											<FieldError
												errors={field.state.meta.errors.map(
													normalizeFieldError,
												)}
											/>
										</FieldContent>
									</Field>
								)}
							</form.Field>

							<form.Field name="targetType">
								{(field) => (
									<Field
										data-invalid={
											field.state.meta.errors.length > 0 || undefined
										}
									>
										<FieldLabel>Relacionado con</FieldLabel>
										<FieldContent>
											<Select
												value={field.state.value}
												onValueChange={(value) => {
													const next = value as ReminderTargetType;
													field.handleChange(next);
													setSelectedTargetType(next);
													form.setFieldValue("targetId", "");
												}}
											>
												<SelectTrigger className="w-full">
													<SelectValue placeholder="Seleccionar tipo" />
												</SelectTrigger>
												<SelectContent>
													<SelectGroup>
														{REMINDER_TARGET_TYPES.map((targetType) => (
															<SelectItem key={targetType} value={targetType}>
																{reminderTargetTypeLabels[targetType]}
															</SelectItem>
														))}
													</SelectGroup>
												</SelectContent>
											</Select>
											<FieldError
												errors={field.state.meta.errors.map(
													normalizeFieldError,
												)}
											/>
										</FieldContent>
									</Field>
								)}
							</form.Field>

							{selectedTargetType === "custom" ? null : (
								<form.Field name="targetId">
									{(field) => (
										<Field
											data-invalid={
												field.state.meta.errors.length > 0 || undefined
											}
										>
											<FieldLabel>Elemento</FieldLabel>
											<FieldContent>
												<Select
													value={field.state.value || "__placeholder__"}
													onValueChange={(value) =>
														field.handleChange(
															value === "__placeholder__" ? "" : value,
														)
													}
													disabled={targetOptions.length === 0}
												>
													<SelectTrigger className="w-full">
														<SelectValue
															placeholder={
																targetOptions.length === 0
																	? "Sin elementos disponibles"
																	: "Seleccionar"
															}
														/>
													</SelectTrigger>
													<SelectContent>
														<SelectGroup>
															<SelectItem value="__placeholder__" disabled>
																Seleccionar
															</SelectItem>
															<Separator />
															{targetOptions.map((option) => (
																<SelectItem key={option.id} value={option.id}>
																	{option.label}
																</SelectItem>
															))}
														</SelectGroup>
													</SelectContent>
												</Select>
												<FieldError
													errors={field.state.meta.errors.map(
														normalizeFieldError,
													)}
												/>
											</FieldContent>
										</Field>
									)}
								</form.Field>
							)}

							<form.Field name="recurrence">
								{(field) => (
									<Field
										data-invalid={
											field.state.meta.errors.length > 0 || undefined
										}
									>
										<FieldLabel className="flex items-center gap-1.5">
											<HugeiconsIcon
												icon={Link01Icon}
												strokeWidth={2}
												className="size-4 text-muted-foreground"
											/>
											Repetición
										</FieldLabel>
										<FieldContent>
											<Select
												value={field.state.value}
												onValueChange={(value) =>
													field.handleChange(value as typeof field.state.value)
												}
											>
												<SelectTrigger className="w-full">
													<SelectValue placeholder="Seleccionar" />
												</SelectTrigger>
												<SelectContent>
													<SelectGroup>
														{REMINDER_RECURRENCES.map((recurrence) => (
															<SelectItem key={recurrence} value={recurrence}>
																{reminderRecurrenceLabels[recurrence]}
															</SelectItem>
														))}
													</SelectGroup>
												</SelectContent>
											</Select>
											<FieldError
												errors={field.state.meta.errors.map(
													normalizeFieldError,
												)}
											/>
										</FieldContent>
									</Field>
								)}
							</form.Field>

							<form.Subscribe selector={(state) => state.values.recurrence}>
								{(recurrence) =>
									recurrence === "none" ? null : (
										<form.Field name="repeatInterval">
											{(field) => (
												<Field
													data-invalid={
														field.state.meta.errors.length > 0 || undefined
													}
												>
													<FieldLabel htmlFor="reminder-interval">
														Cada cuántas unidades
													</FieldLabel>
													<FieldContent>
														<Input
															id="reminder-interval"
															type="number"
															min={1}
															max={365}
															value={field.state.value}
															onBlur={field.handleBlur}
															onChange={(event) =>
																field.handleChange(Number(event.target.value))
															}
															aria-invalid={field.state.meta.errors.length > 0}
														/>
														<FieldError
															errors={field.state.meta.errors.map(
																normalizeFieldError,
															)}
														/>
													</FieldContent>
												</Field>
											)}
										</form.Field>
									)
								}
							</form.Subscribe>

							<form.Field name="notes">
								{(field) => (
									<Field
										data-invalid={
											field.state.meta.errors.length > 0 || undefined
										}
										className="md:col-span-2"
									>
										<FieldLabel htmlFor="reminder-notes">Notas</FieldLabel>
										<FieldContent>
											<Textarea
												id="reminder-notes"
												rows={3}
												placeholder="Información adicional o contexto…"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												aria-invalid={field.state.meta.errors.length > 0}
											/>
											<FieldError
												errors={field.state.meta.errors.map(
													normalizeFieldError,
												)}
											/>
										</FieldContent>
									</Field>
								)}
							</form.Field>
						</div>
					</FieldGroup>
				</CardContent>

				<CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
					{submitError ? (
						<Alert variant="destructive" className="flex-1">
							<HugeiconsIcon icon={CancelCircleIcon} strokeWidth={2} />
							<AlertTitle>No se pudo guardar</AlertTitle>
							<AlertDescription>{submitError}</AlertDescription>
						</Alert>
					) : (
						<div className="flex-1" />
					)}

					<form.Subscribe
						selector={(state) => [state.canSubmit, state.isSubmitting]}
					>
						{([canSubmit, isSubmitting]) => (
							<div className="flex items-center justify-end gap-2">
								{reminder && (
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={onCompleted}
										disabled={isSubmitting}
									>
										Cancelar
									</Button>
								)}
								<Button
									type="submit"
									size="sm"
									disabled={!canSubmit || isSubmitting}
								>
									{isSubmitting ? (
										<>
											<Spinner data-icon="inline-start" />
											Guardando…
										</>
									) : (
										<>
											<HugeiconsIcon
												icon={Tick02Icon}
												strokeWidth={2}
												data-icon="inline-start"
											/>
											{reminder ? "Guardar cambios" : "Guardar recordatorio"}
										</>
									)}
								</Button>
							</div>
						)}
					</form.Subscribe>
				</CardFooter>
			</Card>
		</motion.form>
	);
}

function normalizeFieldError(error: unknown): { message?: string } | undefined {
	if (typeof error === "string") {
		return { message: error };
	}

	if (
		typeof error === "object" &&
		error !== null &&
		"message" in error &&
		typeof (error as { message?: unknown }).message === "string"
	) {
		return error as { message: string };
	}

	return { message: "Valor inválido" };
}

function toLocalDateTime(date: Date): string {
	const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
	return local.toISOString().slice(0, 16);
}
