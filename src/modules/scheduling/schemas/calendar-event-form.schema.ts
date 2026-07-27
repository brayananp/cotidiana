import { z } from "zod";
import { CALENDAR_EVENT_TYPES } from "../domain/calendar-event";

const localDateTime = z
	.string()
	.min(1, "La fecha y hora son obligatorias")
	.refine(
		(value) => !Number.isNaN(new Date(value).getTime()),
		"Ingresa una fecha válida",
	);

export const calendarEventFormSchema = z
	.object({
		title: z.string().trim().min(1, "El título es obligatorio").max(200),

		notes: z.string().max(5_000),
		location: z.string().max(300),
		eventType: z.enum(CALENDAR_EVENT_TYPES),
		startAt: localDateTime,
		endAt: localDateTime,
	})
	.superRefine((value, context) => {
		const start = new Date(value.startAt).getTime();
		const end = new Date(value.endAt).getTime();

		if (end <= start) {
			context.addIssue({
				code: "custom",
				path: ["endAt"],
				message: "La hora final debe ser posterior a la inicial",
			});
		}
	});

export type CalendarEventFormInput = z.input<typeof calendarEventFormSchema>;
