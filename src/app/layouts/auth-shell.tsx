import { Link, Outlet } from "@tanstack/react-router";

export function AuthShell() {
	return (
		<main className="grid min-h-screen place-items-center p-6">
			<section className="w-full max-w-md space-y-6 rounded-xl border bg-card p-6 shadow-sm">
				<header className="space-y-2">
					<Link to="/" className="text-sm text-muted-foreground">
						Personal Productivity OS
					</Link>

					<h1 className="text-2xl font-semibold">Acceso</h1>
				</header>

				<Outlet />
			</section>
		</main>
	);
}
