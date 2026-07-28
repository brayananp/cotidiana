import { AppLockGate } from "#/modules/security";
import { authClient } from "#/platform/auth/auth-client";
import { subscribeToNetworkChanges } from "#/platform/network/network-status";
import { ReminderSchedulerBootstrap } from "#/platform/notifications/ReminderSchedulerBootstrap";
import { PwaBootstrap, PwaUpdatePrompt } from "#/platform/pwa";
import { TaskSyncBootstrap } from "#/platform/sync";
import { LibrarySyncBootstrap } from "#/platform/sync/LibrarySyncBootstrap";
import { ReminderSyncBootstrap } from "#/platform/sync/ReminderSyncBootstrap";
import { SchedulingSyncBootstrap } from "#/platform/sync/SchedulingSyncBootstrap";
import { SettingsSyncBootstrap } from "#/platform/sync/SettingsSyncBootstrap";
import { LibrarySyncStatus } from "#/shared/components/LibrarySyncStatus";
import { ReminderSyncStatus } from "#/shared/components/ReminderSyncStatus";
import { SchedulingSyncStatus } from "#/shared/components/SchedulingSyncStatus";
import { SettingsSyncStatus } from "#/shared/components/SettingsSyncStatus";
import { TaskSyncStatus } from "#/shared/components/TaskSyncStatus";
import { MenuIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Link,
	Outlet,
	useNavigate,
	useRouteContext,
	useRouter,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Separator } from "@/shared/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/shared/components/ui/sheet";

const navItems = [
	{ to: "/dashboard", label: "Dashboard" },
	{ to: "/tasks", label: "Tareas" },
	{ to: "/scheduling", label: "Agenda" },
	{ to: "/reminders", label: "Recordatorios" },
	{ to: "/library", label: "Biblioteca" },
] as const;

export function AppShell() {
	const navigate = useNavigate();
	const router = useRouter();

	const { data: session, isPending } = authClient.useSession();
	const [mobileOpen, setMobileOpen] = useState(false);

	const { access } = useRouteContext({
		from: "/_app",
	});

	useEffect(
		() =>
			subscribeToNetworkChanges(() => {
				void router.invalidate();
			}),
		[router],
	);
	const NavLinks = ({ onClick }: { onClick?: () => void }) => (
		<>
			{navItems.map((item) => (
				<Link
					key={item.to}
					to={item.to}
					className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					activeProps={{ className: "text-foreground font-semibold" }}
					onClick={onClick}
				>
					{item.label}
				</Link>
			))}
		</>
	);
	const handleSignOut = async () => {
		await authClient.signOut();
		await navigate({ to: "/login", replace: true });
	};
	return (
		<>
			<PwaBootstrap />
			<TaskSyncBootstrap access={access} />
			<SchedulingSyncBootstrap access={access} />
			<ReminderSyncBootstrap access={access} />
			<ReminderSchedulerBootstrap access={access} />
			<LibrarySyncBootstrap access={access} />
			<SettingsSyncBootstrap access={access} />

			<AppLockGate access={access}>
				<div className="relative flex min-h-dvh flex-col">
					<header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
						<div className="flex items-center gap-6">
							<Link
								to="/dashboard"
								className="text-base font-semibold tracking-tight"
							>
								Cotidiana
							</Link>
							<nav className="hidden items-center gap-5 md:flex">
								<NavLinks />
							</nav>
						</div>

						<div className="flex items-center gap-2">
							<PwaUpdatePrompt />
							<TaskSyncStatus userId={session?.user.id} />
							<SchedulingSyncStatus userId={session?.user.id} />
							<ReminderSyncStatus userId={session?.user.id} />
							<LibrarySyncStatus userId={session?.user.id} />
							<SettingsSyncStatus userId={session?.user.id} />
							<AccessBanner mode={access.mode} />

							{isPending ? (
								<div className="h-8 w-20 animate-pulse rounded-2xl bg-muted" />
							) : session ? (
								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<Button variant="ghost" size="sm" className="gap-2">
												<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
													{session.user.name?.charAt(0).toUpperCase() ?? "U"}
												</div>
												<span className="hidden text-sm sm:inline">
													{session.user.name}
												</span>
											</Button>
										}
									/>
									<DropdownMenuContent align="end" className="w-48">
										<DropdownMenuGroup>
											<DropdownMenuLabel className="font-normal">
												<div className="flex flex-col gap-1">
													<span className="font-medium text-foreground">
														{session.user.name}
													</span>
													<span className="text-xs text-muted-foreground">
														{session.user.email}
													</span>
												</div>
											</DropdownMenuLabel>
										</DropdownMenuGroup>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											render={
												<Link to="/settings/sync">
													{/* <SettingsIcon className="mr-2 h-4 w-4" /> */}
													<span>Configuración</span>
												</Link>
											}
										></DropdownMenuItem>
										<DropdownMenuItem onClick={() => void handleSignOut()}>
											Cerrar sesión
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							) : null}

							<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
								<SheetTrigger
									render={
										<Button variant="ghost" size="icon" className="md:hidden">
											<HugeiconsIcon icon={MenuIcon} size={20} />
										</Button>
									}
								/>
								<SheetContent side="right">
									<SheetHeader>
										<SheetTitle>Cotidiana</SheetTitle>
									</SheetHeader>
									<div className="mt-6 flex flex-col gap-4 px-2">
										<NavLinks onClick={() => setMobileOpen(false)} />
										<Separator />
										{session && (
											<div className="flex flex-col gap-2">
												<span className="text-sm text-muted-foreground">
													{session.user.email}
												</span>
												<Button
													variant="destructive"
													size="sm"
													onClick={() => {
														setMobileOpen(false);
														void handleSignOut();
													}}
												>
													Cerrar sesión
												</Button>
											</div>
										)}
									</div>
								</SheetContent>
							</Sheet>
						</div>
					</header>

					<main className="flex-1 px-4 py-6 sm:px-6">
						<Outlet />
					</main>
				</div>
			</AppLockGate>
		</>
	);
}

function AccessBanner({
	mode,
}: {
	mode:
		| "remote_authenticated"
		| "local_offline"
		| "local_remote_unavailable"
		| "reauthentication_required"
		| "unauthenticated";
}) {
	if (mode === "remote_authenticated") {
		return null;
	}

	const message = {
		local_offline:
			"Trabajando sin conexión. Los cambios se sincronizarán cuando vuelva Internet.",

		local_remote_unavailable:
			"Turso o el servidor no están disponibles. Puedes continuar trabajando localmente.",

		reauthentication_required:
			"La sesión remota expiró. Puedes trabajar localmente, pero debes iniciar sesión para sincronizar.",

		unauthenticated: "No existe una sesión activa.",
	}[mode];

	return (
		<output className="flex items-center justify-between gap-4 border-b bg-muted px-6 py-2 text-sm">
			<span>{message}</span>

			{mode === "reauthentication_required" && (
				<Link to="/login" className="font-medium underline">
					Iniciar sesión
				</Link>
			)}
		</output>
	);
}
