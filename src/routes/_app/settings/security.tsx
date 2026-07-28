import { SecuritySettingsPage } from "#/modules/security";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/settings/security")({
	component: SecuritySettingsPage,
});
