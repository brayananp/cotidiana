import { LoginForm } from "#/modules/identity/components/login-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";

const loginSearchSchema = z.object({
	redirect: z.string().optional(),
});
export const Route = createFileRoute("/_auth/login")({
	validateSearch: loginSearchSchema,
	component: LoginPage,
	beforeLoad: async () => {},
});

function LoginPage() {
	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-semibold">Iniciar sesión</h2>
				<p className="text-sm text-muted-foreground">
					Ingresa con tu correo y contraseña.
				</p>
			</div>

			<LoginForm />

			<p className="text-center text-sm text-muted-foreground">
				¿No tienes cuenta?{" "}
				<Link to="/register" className="font-medium text-foreground underline">
					Regístrate
				</Link>
			</p>
		</div>
	);
}
