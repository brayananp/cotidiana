import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/settings")({
	component: SettingsLayout,
});

function SettingsLayout() {
	return (
		<div className="space-y-6">
			<nav className="flex flex-wrap gap-2 border-b pb-3">
				<Link
					to="/settings/preferences"
					className="rounded-md border px-3 py-2 text-sm"
				>
					Preferencias
				</Link>

				<Link
					to="/settings/security"
					className="rounded-md border px-3 py-2 text-sm"
				>
					Seguridad
				</Link>

				<Link
					to="/settings/sync"
					className="rounded-md border px-3 py-2 text-sm"
				>
					Datos y sincronización
				</Link>
			</nav>

			<Outlet />
		</div>
	);
}
