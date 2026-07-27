import { AuthShell } from "#/app/layouts/auth-shell";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
	ssr: false,
	component: AuthShell,
});
