import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/modules/dashboard";

export const Route = createFileRoute("/_app/dashboard")({
	component: DashboardPage,
	pendingComponent: () => (
		<div className="flex items-center justify-center p-12 text-muted-foreground">
			Cargando…
		</div>
	),
});
