import { z } from "zod";
import {
	REMINDER_RECURRENCES,
	REMINDER_TARGET_TYPES,
} from "../domain/reminder";

export const reminderFormSchema = z
	.object({
		title: z.string().trim().min(1, "El título es obligatorio").max(200),

		notes: z.string().max(5_000),

		targetType: z.enum(REMINDER_TARGET_TYPES),

		targetId: z.string(),

		remindAt: z
			.string()
			.min(1, "La fecha es obligatoria")
			.refine(
				(value) => !Number.isNaN(new Date(value).getTime()),
				"Ingresa una fecha válida",
			),

		recurrence: z.enum(REMINDER_RECURRENCES),

		repeatInterval: z.number().int().min(1).max(365),
	})
	.superRefine((value, context) => {
		if (value.targetType !== "custom" && !value.targetId) {
			context.addIssue({
				code: "custom",
				path: ["targetId"],
				message: "Selecciona el elemento relacionado",
			});
		}
	});

export type ReminderFormInput = z.input<typeof reminderFormSchema>;
