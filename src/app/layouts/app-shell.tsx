import { authClient } from "#/platform/auth/auth-client";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";

export function AppShell() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();

	const handleSignOut = async () => {
		await authClient.signOut();

		await navigate({
			to: "/login",
			replace: true,
		});
	};

	return (
		<div className="min-h-screen">
			<header className="flex h-14 items-center justify-between border-b px-6">
				<nav className="flex items-center gap-4">
					<Link to="/dashboard">Dashboard</Link>
				</nav>

				<div className="flex items-center gap-3">
					<span className="text-sm text-muted-foreground">
						{isPending ? "Cargando sesión…" : session?.user.email}
					</span>

					<button
						type="button"
						className="rounded-md border px-3 py-1.5 text-sm"
						onClick={() => void handleSignOut()}
					>
						Cerrar sesión
					</button>
				</div>
			</header>

			<main className="p-6">
				<Outlet />
			</main>
		</div>
	);
}
