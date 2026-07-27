import { AppShell } from "#/app/layouts/app-shell";
import { TaskSyncBootstrap } from "#/platform/sync";
import { resolveAppAccess } from "#/platform/auth/app-access";
import { createFileRoute, redirect } from "@tanstack/react-router";

function AppShellWrapper() {
	const { access } = Route.useRouteContext();

	return (
		<>
			<TaskSyncBootstrap access={access} />
			<AppShell />
		</>
	);
}

export const Route = createFileRoute("/_app")({
	ssr: false,
	beforeLoad: async ({ location }) => {
		const access = await resolveAppAccess();
		if (!access.canEnterApp) {
			throw redirect({
			  to: '/login',
			  search: {
				redirect: location.href,
			  },
			})
		  }

		  return {
			access,
		  }
	},
	component: AppShellWrapper,
});
