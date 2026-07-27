import { SchedulingPage } from "#/modules/scheduling";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/scheduling")({
	component: SchedulingPage,
});
