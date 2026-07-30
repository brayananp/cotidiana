import { AppLockGate } from "#/modules/security";
import { signOutCurrentDevice } from "#/platform/auth/local-access.service";
import { ReminderSchedulerBootstrap } from "#/platform/notifications/ReminderSchedulerBootstrap";
import { PwaBootstrap, PwaControls, PwaUpdatePrompt } from "#/platform/pwa";
import { GlobalSyncBootstrap } from "#/platform/sync";
import { GlobalSyncIndicator } from "#/shared/components/GlobalSyncIndicator";
import {
	BooksIcon,
	Calendar01Icon,
	DashboardSquare01Icon,
	Logout01Icon,
	Notification01Icon,
	Settings01Icon,
	Task01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Link,
	Outlet,
	useLocation,
	useNavigate,
	useRouteContext,
} from "@tanstack/react-router";
import { motion } from "motion/react";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
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

const navItems = [
	{ to: "/dashboard", label: "Dashboard", icon: DashboardSquare01Icon },
	{ to: "/tasks", label: "Tareas", icon: Task01Icon },
	{ to: "/scheduling", label: "Agenda", icon: Calendar01Icon },
	{ to: "/reminders", label: "Recordatorios", icon: Notification01Icon },
	{ to: "/library", label: "Biblioteca", icon: BooksIcon },
] as const;

export function AppShell() {
	const navigate = useNavigate();
	const location = useLocation();

	const { access } = useRouteContext({
		from: "/_app",
	});
	const session = access.remoteSession;
	const profile = session?.user ?? access.localIdentity;

	const handleSignOut = async () => {
		await signOutCurrentDevice();
		await navigate({ to: "/login", replace: true });
	};

	return (
		<>
			<PwaBootstrap />
			<GlobalSyncBootstrap access={access} />
			<ReminderSchedulerBootstrap access={access} />

			<AppLockGate access={access}>
				<div className="relative flex min-h-dvh flex-col bg-background text-foreground">
					<PwaUpdatePrompt />

					{/* Sticky Desktop & Mobile Header */}
					<header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
						<div className="flex items-center gap-6">
							<Link
								to="/dashboard"
								className="flex items-center gap-2 text-base font-semibold tracking-tight transition-opacity hover:opacity-80"
							>
								<div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
									C
								</div>
								<span className="hidden font-bold sm:inline">Cotidiana</span>
							</Link>

							{/* Desktop Navbar */}
							<nav className="hidden items-center gap-1 md:flex">
								{navItems.map((item) => {
									const isActive = location.pathname.startsWith(item.to);
									return (
										<Link
											key={item.to}
											to={item.to}
											className={`relative flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
												isActive
													? "text-foreground font-semibold"
													: "text-muted-foreground hover:text-foreground"
											}`}
										>
											<HugeiconsIcon icon={item.icon} size={15} />
											<span>{item.label}</span>
											{isActive && (
												<motion.div
													layoutId="desktop-active-indicator"
													className="absolute inset-0 z-[-1] rounded-md bg-muted"
													transition={{
														type: "spring",
														stiffness: 400,
														damping: 30,
													}}
												/>
											)}
										</Link>
									);
								})}
							</nav>
						</div>

						<div className="flex items-center gap-2">
							<GlobalSyncIndicator
								userId={access.localIdentity?.userId ?? session?.user.id}
							/>

							<PwaControls />
							<AccessBanner mode={access.mode} />

							{profile ? (
								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<Button
												variant="ghost"
												size="sm"
												className="h-8 gap-2 px-2 hover:bg-muted"
											>
												<Avatar className="size-6">
													<AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
														{profile.name?.charAt(0).toUpperCase() ?? "U"}
													</AvatarFallback>
												</Avatar>
												<span className="hidden text-xs font-medium sm:inline">
													{profile.name}
												</span>
											</Button>
										}
									/>
									<DropdownMenuContent align="end" className="w-56">
										<DropdownMenuGroup>
											<DropdownMenuLabel className="font-normal">
												<div className="flex flex-col gap-0.5">
													<span className="text-xs font-semibold text-foreground">
														{profile.name}
													</span>
													<span className="text-[11px] text-muted-foreground truncate">
														{profile.email}
													</span>
												</div>
											</DropdownMenuLabel>
										</DropdownMenuGroup>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											render={
												<Link
													to="/settings/sync"
													className="flex items-center gap-2"
												>
													<HugeiconsIcon icon={Settings01Icon} size={14} />
													<span>Configuración</span>
												</Link>
											}
										/>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											onClick={() => void handleSignOut()}
											className="gap-2 text-destructive focus:text-destructive"
										>
											<HugeiconsIcon icon={Logout01Icon} size={14} />
											<span>Cerrar sesión</span>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							) : null}
						</div>
					</header>

					{/* Main Content View */}
					<main className="flex-1 px-4 pt-6 pb-24 md:pb-8 sm:px-6">
						<Outlet />
					</main>

					{/* Mobile Bottom Navigation Bar */}
					<nav
						aria-label="Navegación móvil"
						className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-background/90 px-2 backdrop-blur-lg md:hidden"
					>
						{navItems.map((item) => {
							const isActive = location.pathname.startsWith(item.to);
							return (
								<Link
									key={item.to}
									to={item.to}
									className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors ${
										isActive
											? "text-primary font-semibold"
											: "text-muted-foreground hover:text-foreground"
									}`}
								>
									<HugeiconsIcon icon={item.icon} size={20} />
									<span>{item.label}</span>
									{isActive && (
										<motion.div
											layoutId="mobile-active-indicator"
											className="absolute -top-[1px] h-0.5 w-8 rounded-full bg-primary"
											transition={{
												type: "spring",
												stiffness: 500,
												damping: 35,
											}}
										/>
									)}
								</Link>
							);
						})}
					</nav>
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
		<output className="flex items-center justify-between gap-4 border-b bg-muted px-6 py-2 text-xs">
			<span>{message}</span>
			{mode === "reauthentication_required" && (
				<Link to="/login" className="font-medium underline">
					Iniciar sesión
				</Link>
			)}
		</output>
	);
}
