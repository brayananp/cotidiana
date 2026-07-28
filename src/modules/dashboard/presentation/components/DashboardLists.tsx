import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { DashboardMetrics } from "../../domain/dashboard-metrics";

export function DashboardLists({ metrics }: { metrics: DashboardMetrics }) {
	return (
		<div className="grid gap-4 xl:grid-cols-3">
			<ListCard
				title="Prioridades"
				link="/tasks"
				empty="No hay tareas pendientes."
			>
				{metrics.priorities.map((task) => (
					<li key={task.id} className="rounded-md border p-3 text-sm">
						<div className="flex justify-between gap-3">
							<span className="font-medium">{task.title}</span>
							<span className="text-xs text-muted-foreground">
								{task.priority}
							</span>
						</div>
						{task.dueAt && (
							<p
								className={
									task.overdue
										? "mt-1 text-xs text-destructive"
										: "mt-1 text-xs text-muted-foreground"
								}
							>
								{task.overdue ? "Vencida · " : ""}
								{formatDate(task.dueAt)}
							</p>
						)}
					</li>
				))}
			</ListCard>

			<ListCard
				title="Próxima agenda"
				link="/scheduling"
				empty="No hay actividades próximas."
			>
				{metrics.agenda.map((item) => (
					<li
						key={`${item.entityType}:${item.id}`}
						className="rounded-md border p-3 text-sm"
					>
						<p className="font-medium">{item.title}</p>
						<p className="mt-1 text-xs text-muted-foreground">
							{formatDate(item.startAt)}
						</p>
					</li>
				))}
			</ListCard>

			<ListCard
				title="Recordatorios 24 h"
				link="/reminders"
				empty="No hay recordatorios próximos."
			>
				{metrics.reminders.map((item) => (
					<li key={item.id} className="rounded-md border p-3 text-sm">
						<p className="font-medium">{item.title}</p>
						<p className="mt-1 text-xs text-muted-foreground">
							{formatDate(item.nextTriggerAt)}
						</p>
					</li>
				))}
			</ListCard>
		</div>
	);
}

function ListCard({
	title,
	link,
	empty,
	children,
}: {
	title: string;
	link: "/tasks" | "/scheduling" | "/reminders";
	empty: string;
	children: ReactNode;
}) {
	const items = Array.isArray(children) ? children : [children];
	const hasItems = items.some(Boolean);

	return (
		<section className="space-y-3 rounded-xl border p-4">
			<header className="flex items-center justify-between gap-3">
				<h2 className="font-semibold">{title}</h2>
				<Link to={link} className="text-sm underline">
					Ver todo
				</Link>
			</header>
			{hasItems ? (
				<ul className="space-y-2">{children}</ul>
			) : (
				<p className="text-sm text-muted-foreground">{empty}</p>
			)}
		</section>
	);
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat("es-PE", {
		dateStyle: "short",
		timeStyle: "short",
	}).format(new Date(value));
}
