import {
	ArrowRight01Icon,
	Calendar01Icon,
	CheckmarkCircle02Icon,
	Notification01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Badge } from "@/shared/components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import type { DashboardMetrics } from "../../domain/dashboard-metrics";

export function DashboardLists({ metrics }: { metrics: DashboardMetrics }) {
	return (
		<div className="flex flex-col gap-4">
			<ListCard
				title="Prioridades"
				link="/tasks"
				empty="No hay tareas pendientes para hoy."
				icon={CheckmarkCircle02Icon}
			>
				{metrics.priorities.map((task) => (
					<motion.li
						key={task.id}
						initial={{ opacity: 0, x: -4 }}
						animate={{ opacity: 1, x: 0 }}
						whileHover={{ scale: 1.01 }}
						className="flex flex-col gap-1 rounded-lg border bg-card p-3 text-sm transition-colors hover:border-primary/30"
					>
						<div className="flex items-center justify-between gap-3">
							<span className="font-medium text-foreground truncate">
								{task.title}
							</span>
							<Badge
								variant={task.overdue ? "destructive" : "outline"}
								className="shrink-0 text-[10px] uppercase font-semibold"
							>
								{task.priority}
							</Badge>
						</div>
						{task.dueAt && (
							<p
								className={
									task.overdue
										? "text-xs font-semibold text-destructive flex items-center gap-1"
										: "text-xs text-muted-foreground"
								}
							>
								{task.overdue ? "Vencida · " : ""}
								{formatDate(task.dueAt)}
							</p>
						)}
					</motion.li>
				))}
			</ListCard>

			<ListCard
				title="Próxima agenda"
				link="/scheduling"
				empty="No hay actividades próximas agendadas."
				icon={Calendar01Icon}
			>
				{metrics.agenda.map((item) => (
					<motion.li
						key={`${item.entityType}:${item.id}`}
						initial={{ opacity: 0, x: -4 }}
						animate={{ opacity: 1, x: 0 }}
						whileHover={{ scale: 1.01 }}
						className="flex flex-col gap-1 rounded-lg border bg-card p-3 text-sm transition-colors hover:border-primary/30"
					>
						<p className="font-medium text-foreground truncate">{item.title}</p>
						<p className="text-xs text-muted-foreground">
							{formatDate(item.startAt)}
						</p>
					</motion.li>
				))}
			</ListCard>

			<ListCard
				title="Recordatorios 24 h"
				link="/reminders"
				empty="No hay recordatorios próximos."
				icon={Notification01Icon}
			>
				{metrics.reminders.map((item) => (
					<motion.li
						key={item.id}
						initial={{ opacity: 0, x: -4 }}
						animate={{ opacity: 1, x: 0 }}
						whileHover={{ scale: 1.01 }}
						className="flex flex-col gap-1 rounded-lg border bg-card p-3 text-sm transition-colors hover:border-primary/30"
					>
						<p className="font-medium text-foreground truncate">{item.title}</p>
						<p className="text-xs text-muted-foreground">
							{formatDate(item.nextTriggerAt)}
						</p>
					</motion.li>
				))}
			</ListCard>
		</div>
	);
}

function ListCard({
	title,
	link,
	empty,
	icon,
	children,
}: {
	title: string;
	link: "/tasks" | "/scheduling" | "/reminders";
	empty: string;
	icon: HugeiconsIconProps["icon"];
	children: ReactNode;
}) {
	const items = Array.isArray(children) ? children : [children];
	const hasItems = items.some(Boolean);

	return (
		<Card className="flex flex-col p-4">
			<CardHeader className="p-0 pb-3">
				<div className="flex items-center justify-between gap-3">
					<CardTitle className="flex items-center gap-2 text-base font-semibold">
						<div className="flex size-7 items-center justify-center rounded-md bg-muted text-foreground">
							<HugeiconsIcon icon={icon} size={15} />
						</div>
						<span>{title}</span>
					</CardTitle>
					<Link
						to={link}
						className="group flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
					>
						<span>Ver todo</span>
						<HugeiconsIcon
							icon={ArrowRight01Icon}
							size={12}
							className="transition-transform group-hover:translate-x-0.5"
						/>
					</Link>
				</div>
			</CardHeader>
			<CardContent className="flex-1 p-0">
				{hasItems ? (
					<ul className="flex flex-col gap-2">{children}</ul>
				) : (
					<Empty className="py-6 border border-dashed rounded-lg">
						<EmptyTitle className="text-xs text-muted-foreground">
							{empty}
						</EmptyTitle>
						<EmptyDescription className="sr-only">{empty}</EmptyDescription>
					</Empty>
				)}
			</CardContent>
		</Card>
	);
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat("es-PE", {
		dateStyle: "short",
		timeStyle: "short",
	}).format(new Date(value));
}
