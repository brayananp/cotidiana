import { signOutCurrentDevice } from "#/platform/auth/local-access.service";
import { subscribeToNetworkChanges } from "#/platform/network/network-status";
import { TaskSyncBootstrap } from "#/platform/sync";
import { TaskSyncStatus } from "#/shared/components/TaskSyncStatus";
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

const navItems = [
	{ to: "/dashboard", label: "Dashboard" },
	{ to: "/tasks", label: "Tareas" },
] as const;

export function AppShell() {
	const navigate = useNavigate();
	const router = useRouter();
	const { access } = useRouteContext({
		from: "/_app",
	});
	useEffect(() => {
		return subscribeToNetworkChanges(() => {
			void router.invalidate();
		});
	}, [router]);

	const handleSignOut = async () => {
		await signOutCurrentDevice();

		await navigate({
			to: "/login",
			replace: true,
		});
	};
	const [mobileOpen, setMobileOpen] = useState(false);

	const user = access.remoteSession?.user ?? access.localIdentity;

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

	return (
		<div className="relative flex min-h-dvh flex-col">
			<header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
				<div className="flex items-center gap-6">
					<Link
						to="/dashboard"
						className="text-base font-semibold tracking-tight"
					>
						Cotidiana
					</Link>
					<TaskSyncStatus userId={access.localIdentity?.userId ?? undefined} />
					<TaskSyncBootstrap access={access} />
					<nav className="hidden items-center gap-5 md:flex">
						<NavLinks />
					</nav>
				</div>

				<div className="flex items-center gap-2">
					{user ? (
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button variant="ghost" size="sm" className="gap-2">
										<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
											{user.name?.charAt(0).toUpperCase() ?? "U"}
										</div>
										<span className="hidden text-sm sm:inline">
											{user.name}
										</span>
									</Button>
								}
							/>
							<DropdownMenuContent align="end" className="w-48">
								<DropdownMenuGroup>
									<DropdownMenuLabel className="font-normal">
										<div className="flex flex-col gap-1">
											<span className="font-medium text-foreground">
												{user.name}
											</span>
											<span className="text-xs text-muted-foreground">
												{user.email}
											</span>
										</div>
									</DropdownMenuLabel>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
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
									<HugeiconsIcon icon={MenuIcon} className="size-5" />
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
								{user && (
									<div className="flex flex-col gap-2">
										<span className="text-sm text-muted-foreground">
											{user.email}
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
	);
}
