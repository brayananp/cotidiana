import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";

export const Route = createFileRoute("/_app/dashboard")({
	component: RouteComponent,
	pendingComponent: () => (
		<div className="flex items-center justify-center p-12 text-muted-foreground">
			Cargando…
		</div>
	),
});

function RouteComponent() {
	const { access } = Route.useRouteContext();

	const name =
		access.remoteSession?.user.name ?? access.localIdentity?.name ?? "Usuario";

	const isOnline = access.mode === "remote_authenticated";

	return (
		<div className="mx-auto max-w-3xl space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Dashboard</h1>
				<p className="text-muted-foreground">Bienvenido, {name}.</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Estado del acceso</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-center gap-2">
							<div
								className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-primary" : "bg-muted-foreground"}`}
							/>
							<span className="text-sm font-medium">{access.mode}</span>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Acceso rápido</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<Button
							variant="default"
							className="w-full"
							render={<Link to="/tasks" />}
						>
							Ir a Tareas
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
