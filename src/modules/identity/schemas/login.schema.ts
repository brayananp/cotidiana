import { z } from "zod";

export const loginSchema = z.object({
	email: z

		.email("Ingresa un correo válido")
		.trim()
		.min(1, "El correo es obligatorio")
		.transform((value) => value.toLowerCase()),
	password: z.string().min(1, "La contraseña es obligatoria"),
	rememberMe: z.boolean(),
});

export type LoginInput = z.input<typeof loginSchema>;
export type LoginValues = z.output<typeof loginSchema>;
