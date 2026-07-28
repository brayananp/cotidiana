import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/settings/security")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_app/settings/security"!</div>;
}
