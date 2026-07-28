import { PreferencesSettingsPage } from "#/modules/settings";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/settings/preferences")({
	component: PreferencesSettingsPage,
});
