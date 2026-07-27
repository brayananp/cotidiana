import { z } from "zod";
import { TIME_BLOCK_KINDS } from "../domain/time-block";

const localDateTime = z
	.string()
	.min(1, "La fecha y hora son obligatorias")
	.refine(
		(value) => !Number.isNaN(new Date(value).getTime()),
		"Ingresa una fecha válida",
	);

export const timeBlockFormSchema = z
	.object({
		title: z.string().trim().min(1, "El título es obligatorio").max(200),

		notes: z.string().max(5_000),

		taskId: z.string(),

		kind: z.enum(TIME_BLOCK_KINDS),

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

export type TimeBlockFormInput = z.input<typeof timeBlockFormSchema>;
