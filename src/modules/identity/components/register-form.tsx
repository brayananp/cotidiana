import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { authClient } from "#/platform/auth/auth-client";
import { useAppForm } from "#/shared/hooks/form";
import { completeAuthentication } from "@/modules/identity/application/complete-authentication";
import {
	registerSchema,
	type RegisterInput,
} from "@/modules/identity/schemas/register.schema";

const defaultValues: RegisterInput = {
	name: "",
	email: "",
	password: "",
	passwordConfirmation: "",
};

export function RegisterForm() {
	const navigate = useNavigate();
	const [serverError, setServerError] = useState<string | null>(null);

	const form = useAppForm({
		defaultValues,

		validators: {
			onSubmit: registerSchema,
		},

		onSubmit: async ({ value }) => {
			setServerError(null);

			const parsed = registerSchema.safeParse(value);

			if (!parsed.success) {
				return;
			}

			const result = await authClient.signUp.email({
				name: parsed.data.name,
				email: parsed.data.email,
				password: parsed.data.password,
			});

			if (result.error) {
				setServerError(
					result.error.message ?? "No fue posible crear la cuenta",
				);
				return;
			}

			try {
				await completeAuthentication();
			} catch (error) {
				setServerError(
					error instanceof Error
						? error.message
						: "No fue posible inicializar el acceso local",
				);
				return;
			}

			await navigate({
				to: "/dashboard",
				replace: true,
			});
		},
	});

	return (
		<form
			className="space-y-5"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<form.AppField name="name">
				{(field) => (
					<field.TextField
						label="Nombre"
						autoComplete="name"
						placeholder="Ingresa tu nombre"
					/>
				)}
			</form.AppField>

			<form.AppField name="email">
				{(field) => (
					<field.TextField
						label="Correo electrónico"
						autoComplete="email"
						placeholder="Ingresa tu correo electrónico"
					/>
				)}
			</form.AppField>

			<form.AppField name="password">
				{(field) => (
					<field.TextField
						label="Contraseña"
						autoComplete="new-password"
						placeholder="Ingresa tu contraseña"
					/>
				)}
			</form.AppField>

			<form.AppField name="passwordConfirmation">
				{(field) => (
					<field.TextField
						label="Confirmar contraseña"
						autoComplete="new-password"
						placeholder="Ingresa tu contraseña"
					/>
				)}
			</form.AppField>

			{serverError && (
				<p
					role="alert"
					className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
				>
					{serverError}
				</p>
			)}

			<form.Subscribe
				selector={(state) => [state.canSubmit, state.isSubmitting]}
			>
				{([canSubmit, isSubmitting]) => (
					<Button
						type="submit"
						disabled={!canSubmit || isSubmitting}
						className="w-full"
					>
						{isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
