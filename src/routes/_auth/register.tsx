import { RegisterForm } from "#/modules/identity/components/register-form";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/register")({
	component: RegisterPage,
	beforeLoad: async () => {},
});

function RegisterPage() {
	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-semibold">Crear cuenta</h2>
				<p className="text-sm text-muted-foreground">
					La primera autenticación requiere conexión.
				</p>
			</div>

			<RegisterForm />

			<p className="text-center text-sm text-muted-foreground">
				¿Ya tienes cuenta?{" "}
				<Link to="/login" className="font-medium text-foreground underline">
					Inicia sesión
				</Link>
			</p>
		</div>
	);
}
