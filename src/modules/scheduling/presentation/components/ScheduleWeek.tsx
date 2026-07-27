import { Card, CardContent, CardHeader } from "#/shared/components/ui/card";
import { cn } from "#/shared/lib/utils";
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
}: ScheduleWeekProps) {
	const today = new Date();

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
								duration: 0.2,
								delay: dayIndex * 0.04,
								ease: "easeOut",
							}}
						>
							<Card
								className={cn(
									"min-h-40 transition-all",
									todayFlag && "ring-2 ring-primary/50 shadow-md",
								)}
								size="sm"
							>
								<CardHeader className={cn("pb-2", todayFlag && "bg-primary/5")}>
									<p
										className={cn(
											"text-sm font-medium",
											todayFlag && "text-primary",
										)}
									>
										{new Intl.DateTimeFormat("es-PE", {
											weekday: "short",
											day: "2-digit",
										}).format(day)}
										{todayFlag && (
											<span className="ml-2 inline-flex items-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
												Hoy
											</span>
										)}
									</p>
								</CardHeader>
								<CardContent className="space-y-2">
									{dayEntries.length === 0 ? (
										<p className="py-4 text-center text-xs text-muted-foreground">
											Sin actividades
										</p>
									) : (
										dayEntries.map((entry, eIndex) => (
											<ScheduleEntryCard
												key={`${entry.entityType}:${entry.item.id}`}
												entry={entry}
												context={context}
												onEdit={onEdit}
												index={eIndex}
											/>
										))
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
