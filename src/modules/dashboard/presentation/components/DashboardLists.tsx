import { taskPriorityLabels } from "#/modules/tasks/presentation/task-labels";
import {
	ArrowRight01Icon,
	Calendar01Icon,
	CheckmarkCircle02Icon,
	Notification01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { motion, type Variants } from "motion/react";
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
import { Separator } from "@/shared/components/ui/separator";
import type { DashboardMetrics } from "../../domain/dashboard-metrics";

const listVariants: Variants = {
	hidden: {},
	show: {
		transition: {
			staggerChildren: 0.055,
			delayChildren: 0.05,
		},
	},
};

const itemVariants: Variants = {
	hidden: { opacity: 0, x: -6 },
	show: { opacity: 1, x: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

export function DashboardLists({ metrics }: { metrics: DashboardMetrics }) {
	return (
		<div className="flex flex-col gap-4">
			<ListCard
				title="Prioridades"
				link="/tasks"
				empty="No hay tareas pendientes para hoy."
				icon={CheckmarkCircle02Icon}
			>
				{metrics.priorities.map((task, index) => (
					<motion.li
						key={task.id}
						variants={itemVariants}
						className="flex flex-col"
					>
						<div className="flex flex-col gap-1.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted/50">
							<div className="flex items-center justify-between gap-3">
								<span className="font-medium text-foreground truncate leading-snug">
									{task.title}
								</span>
								<Badge
									variant={task.overdue ? "destructive" : "outline"}
									className="shrink-0 text-[10px] uppercase font-semibold"
								>
									{taskPriorityLabels[task.priority]}
								</Badge>
							</div>
							{task.dueAt && (
								<p
									className={
										task.overdue
											? "text-[11px] font-semibold text-destructive"
											: "text-[11px] text-muted-foreground"
									}
								>
									{task.overdue ? "Vencida · " : ""}
									{formatDate(task.dueAt)}
								</p>
							)}
						</div>
						{index < metrics.priorities.length - 1 && (
							<Separator className="my-1 opacity-50" />
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
				{metrics.agenda.map((item, index) => (
					<motion.li
						key={`${item.entityType}:${item.id}`}
						variants={itemVariants}
						className="flex flex-col"
					>
						<div className="flex flex-col gap-1.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted/50">
							<p className="font-medium text-foreground truncate leading-snug">
								{item.title}
							</p>
							<p className="text-[11px] text-muted-foreground">
								{formatDate(item.startAt)}
							</p>
						</div>
						{index < metrics.agenda.length - 1 && (
							<Separator className="my-1 opacity-50" />
						)}
					</motion.li>
				))}
			</ListCard>

			<ListCard
				title="Recordatorios 24 h"
				link="/reminders"
				empty="No hay recordatorios próximos."
				icon={Notification01Icon}
			>
				{metrics.reminders.map((item, index) => (
					<motion.li
						key={item.id}
						variants={itemVariants}
						className="flex flex-col"
					>
						<div className="flex flex-col gap-1.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted/50">
							<p className="font-medium text-foreground truncate leading-snug">
								{item.title}
							</p>
							<p className="text-[11px] text-muted-foreground">
								{formatDate(item.nextTriggerAt)}
							</p>
						</div>
						{index < metrics.reminders.length - 1 && (
							<Separator className="my-1 opacity-50" />
						)}
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
					<CardTitle className="flex items-center gap-2 text-sm font-semibold">
						<div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<HugeiconsIcon icon={icon} size={13} />
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
							size={11}
							className="transition-transform group-hover:translate-x-0.5"
						/>
					</Link>
				</div>
			</CardHeader>
			<CardContent className="flex-1 p-0">
				{hasItems ? (
					<motion.ul
						className="flex flex-col"
						variants={listVariants}
						initial="hidden"
						animate="show"
					>
						{children}
					</motion.ul>
				) : (
					<Empty className="py-6 border border-dashed rounded-xl">
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
