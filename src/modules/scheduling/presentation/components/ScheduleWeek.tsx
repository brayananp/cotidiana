import { Badge } from "#/shared/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/shared/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyTitle,
} from "#/shared/components/ui/empty";
import { ScrollArea } from "#/shared/components/ui/scroll-area";
import { Separator } from "#/shared/components/ui/separator";
import { Skeleton } from "#/shared/components/ui/skeleton";
import { cn } from "#/shared/lib/utils";
import { Calendar01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";
import type { SchedulingExecutionContext } from "../../application/scheduling-context";
import type { ScheduleEntry } from "../../domain/schedule-entry";
import { addDays, dateKey } from "../week-utils";
import { ScheduleEntryCard } from "./ScheduleEntryCard";

type ScheduleWeekProps = {
	weekStart: Date;
	entries: ScheduleEntry[];
	context: SchedulingExecutionContext;
	onEdit: (entry: ScheduleEntry) => void;
	isLoading?: boolean;
};

const isSameDay = (a: Date, b: Date) =>
	a.getFullYear() === b.getFullYear() &&
	a.getMonth() === b.getMonth() &&
	a.getDate() === b.getDate();

export function ScheduleWeek({
	weekStart,
	entries,
	context,
	onEdit,
	isLoading = false,
}: ScheduleWeekProps) {
	const today = new Date();

	if (isLoading) {
		const skeletonKeys = [
			"schedule-skeleton-0",
			"schedule-skeleton-1",
			"schedule-skeleton-2",
			"schedule-skeleton-3",
			"schedule-skeleton-4",
			"schedule-skeleton-5",
			"schedule-skeleton-6",
		];
		return (
			<div className="grid gap-3 lg:grid-cols-7">
				{skeletonKeys.map((key) => (
					<Card key={key} size="sm" className="min-h-40">
						<CardHeader className="pb-2">
							<Skeleton className="h-4 w-24" />
						</CardHeader>
						<CardContent className="flex flex-col gap-2">
							<Skeleton className="h-24 w-full rounded-xl" />
							<Skeleton className="h-20 w-full rounded-xl" />
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	return (
		<div className="grid gap-3 lg:grid-cols-7">
			{Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)).map(
				(day, dayIndex) => {
					const key = dateKey(day.toISOString());
					const todayFlag = isSameDay(day, today);

					const dayEntries = entries.filter(
						(entry) => dateKey(entry.item.startAt) === key,
					);

					return (
						<motion.section
							key={key}
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								duration: 0.22,
								delay: dayIndex * 0.04,
								ease: "easeOut",
							}}
						>
							<Card
								className={cn(
									"flex min-h-40 flex-col transition-all",
									todayFlag &&
										"ring-2 ring-primary/50 shadow-md shadow-primary/10",
								)}
								size="sm"
							>
								<CardHeader className={cn("pb-2", todayFlag && "bg-primary/5")}>
									<div className="flex items-start justify-between gap-2">
										<div>
											<CardTitle
												className={cn(
													"text-sm font-semibold tracking-tight",
													todayFlag && "text-primary",
												)}
											>
												{new Intl.DateTimeFormat("es-PE", {
													weekday: "short",
													day: "2-digit",
												}).format(day)}
											</CardTitle>
											<CardDescription className="text-[11px]">
												{new Intl.DateTimeFormat("es-PE", {
													month: "short",
													year: "2-digit",
												}).format(day)}
											</CardDescription>
										</div>
										<div className="flex items-center gap-1.5">
											{todayFlag && (
												<Badge
													variant="default"
													className="h-5 px-1.5 text-[10px]"
												>
													Hoy
												</Badge>
											)}
											<Badge
												variant="outline"
												className="h-5 px-1.5 text-[10px]"
											>
												{dayEntries.length}
											</Badge>
										</div>
									</div>
								</CardHeader>
								<Separator />
								<CardContent className="flex-1 px-2 pb-2 pt-2">
									{dayEntries.length === 0 ? (
										<Empty className="min-h-20 rounded-xl border border-dashed p-0 py-6">
											<HugeiconsIcon
												icon={Calendar01Icon}
												strokeWidth={2}
												className="text-muted-foreground"
											/>
											<EmptyTitle className="text-xs font-medium">
												Sin actividades
											</EmptyTitle>
											<EmptyDescription className="max-w-40 text-[11px]">
												Agrega un bloque o evento para planificar el día.
											</EmptyDescription>
										</Empty>
									) : (
										<ScrollArea className="h-full max-h-80 pr-1">
											<ol className="flex flex-col gap-2">
												{dayEntries.map((entry, eIndex) => (
													<li key={`${entry.entityType}:${entry.item.id}`}>
														<ScheduleEntryCard
															entry={entry}
															context={context}
															onEdit={onEdit}
															index={eIndex}
														/>
													</li>
												))}
											</ol>
										</ScrollArea>
									)}
								</CardContent>
							</Card>
						</motion.section>
					);
				},
			)}
		</div>
	);
}
