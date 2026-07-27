import { z } from "zod";

export const registerSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(2, "El nombre debe tener al menos 2 caracteres")
			.max(100, "El nombre es demasiado largo"),
		email: z

			.email("Ingresa un correo válido")
			.trim()
			.min(1, "El correo es obligatorio")
			.transform((value) => value.toLowerCase()),
		password: z
			.string()
			.min(8, "La contraseña debe tener al menos 8 caracteres")
			.max(128, "La contraseña es demasiado larga"),
		passwordConfirmation: z.string(),
	})
	.refine((value) => value.password === value.passwordConfirmation, {
		message: "Las contraseñas no coinciden",
		path: ["passwordConfirmation"],
	});

export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterValues = z.output<typeof registerSchema>;
