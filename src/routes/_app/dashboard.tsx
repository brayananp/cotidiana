import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard")({
	component: RouteComponent,
	pendingComponent: () => <div>Loading...</div>,
});

function RouteComponent() {
	const { access } = Route.useRouteContext();
	
	const name =
    access.remoteSession?.user.name ??
    access.localIdentity?.name ??
    'Usuario'
	return (
		<section className="space-y-2">
		  <h1 className="text-2xl font-semibold">
			Dashboard
		  </h1>
	
		  <p className="text-muted-foreground">
			Bienvenido, {name}.
		  </p>
	
		  <p className="text-sm text-muted-foreground">
			Modo de acceso: {access.mode}
		  </p>
		  <Link to="/tasks" className="text-blue-500">Tasks</Link>
		</section>
	  )
}