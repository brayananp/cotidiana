import { SyncCenterPage } from "#/modules/data-management";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/settings/sync")({
	component: SyncCenterPage,
});
