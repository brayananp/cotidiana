import { LibraryPage } from "#/modules/library";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/library")({
	component: LibraryPage,
});
