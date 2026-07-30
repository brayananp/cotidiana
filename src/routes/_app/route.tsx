import { AppShell } from "#/app/layouts/app-shell";
import { resolveAppAccess } from "#/platform/auth/app-access";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app")({
	ssr: false,
	beforeLoad: async ({ location }) => {
		const access = await resolveAppAccess();
		if (!access.canEnterApp) {
			throw redirect({
				to: "/login",
				search: {
					redirect: location.href,
				},
			});
		}

		return {
			access,
		};
	},
	component: AppShell,
});
