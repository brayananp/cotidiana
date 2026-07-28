import { z } from "zod";

export const registerSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(2, "El nombre debe tener al menos 2 caracteres")
			.max(100, "El nombre es demasiado largo"),

		email: z
			.string()
			.trim()
			.min(1, "El correo es obligatorio")
			.email("Ingresa un correo válido")
			.transform((value) => value.toLowerCase()),

		password: z
			.string()
			.min(12, "La contraseña debe tener al menos 12 caracteres")
			.max(128, "La contraseña es demasiado larga"),

		passwordConfirmation: z.string(),
	})
	.refine((value) => value.password === value.passwordConfirmation, {
		message: "Las contraseñas no coinciden",
		path: ["passwordConfirmation"],
	});

export type RegisterInput = z.input<typeof registerSchema>;
