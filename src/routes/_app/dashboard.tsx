import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/modules/dashboard";
import { DashboardSkeleton } from "@/modules/dashboard/presentation/components/DashboardSkeleton";

export const Route = createFileRoute("/_app/dashboard")({
	component: DashboardPage,
	pendingComponent: DashboardSkeleton,
});
