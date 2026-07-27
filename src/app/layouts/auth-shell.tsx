import { Link, Outlet } from "@tanstack/react-router";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";

export function AuthShell() {
	return (
		<div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
			<Card className="w-full max-w-sm">
				<CardHeader className="text-center">
					<Link
						to="/"
						className="text-xs text-muted-foreground hover:text-foreground"
					>
						Cotidiana
					</Link>
					<CardTitle className="mt-2 text-xl">Acceso</CardTitle>
				</CardHeader>
				<CardContent>
					<Outlet />
				</CardContent>
			</Card>
		</div>
	);
}
