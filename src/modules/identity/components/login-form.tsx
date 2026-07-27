import { useAppForm } from "#/shared/hooks/form";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { completeAuthentication } from "@/modules/identity/application/complete-authentication";
import {
	type LoginInput,
	loginSchema,
} from "@/modules/identity/schemas/login.schema";
import { authClient } from "@/platform/auth/auth-client";
import { Button } from "@/shared/components/ui/button";

const defaultValues: LoginInput = {
	email: "",
	password: "",
	rememberMe: true,
};

export function LoginForm() {
	const navigate = useNavigate();
	const search = useSearch({
		from: "/_auth/login",
	});

	const [serverError, setServerError] = useState<string | null>(null);

	const form = useAppForm({
		defaultValues,

		validators: {
			onSubmit: loginSchema,
		},

		onSubmit: async ({ value }) => {
			setServerError(null);

			const parsed = loginSchema.safeParse(value);

			if (!parsed.success) {
				return;
			}

			const result = await authClient.signIn.email({
				email: parsed.data.email,
				password: parsed.data.password,
				rememberMe: parsed.data.rememberMe,
			});

			if (result.error) {
				setServerError(result.error.message ?? "No fue posible iniciar sesión");
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
				to: search.redirect ?? "/dashboard",
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
			<form.AppField name="email">
				{(field) => (
					<field.TextField
						label="Correo electrónico"
						autoComplete="email"
						placeholder="Correo electrónico"
						type="email"
					/>
				)}
			</form.AppField>

			<form.AppField name="password">
				{(field) => (
					<field.TextField
						label="Contraseña"
						autoComplete="current-password"
						placeholder="Contraseña"
						type="password"
					/>
				)}
			</form.AppField>

			<form.AppField name="rememberMe">
				{(field) => <field.CheckboxField label="Mantener la sesión iniciada" />}
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
						{isSubmitting ? "Ingresando…" : "Iniciar sesión"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
