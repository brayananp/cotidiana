import { RemindersPage } from "#/modules/reminders";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/reminders")({
	component: RemindersPage,
});
