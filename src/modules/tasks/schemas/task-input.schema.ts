import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES } from "../domain/task";

const optionalLocalDateTime = z
	.string()
	.trim()
	.refine(
		(value) => value === "" || !Number.isNaN(new Date(value).getTime()),
		"Ingresa una fecha válida",
	);

export const taskFormSchema = z
	.object({
		title: z
			.string()
			.trim()
			.min(1, "El título es obligatorio")
			.max(200, "El título no puede superar 200 caracteres"),

		description: z
			.string()
			.max(5_000, "La descripción no puede superar 5000 caracteres"),

		priority: z.enum(TASK_PRIORITIES),
		plannedAt: optionalLocalDateTime,
		dueAt: optionalLocalDateTime,
	})
	.superRefine((value, context) => {
		if (!value.plannedAt || !value.dueAt) {
			return;
		}

		const planned = new Date(value.plannedAt).getTime();

		const due = new Date(value.dueAt).getTime();

		if (due < planned) {
			context.addIssue({
				code: "custom",
				path: ["dueAt"],
				message: "La fecha límite no puede ser anterior a la fecha planificada",
			});
		}
	});

export const taskStatusSchema = z.enum(TASK_STATUSES);

export type TaskFormInput = z.input<typeof taskFormSchema>;
