import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#/shared/components/ui/alert-dialog";
import { Badge, type badgeVariants } from "#/shared/components/ui/badge";
import { Button } from "#/shared/components/ui/button";
import { cn } from "#/shared/lib/utils";
import {
	CancelCircleIcon,
	CheckmarkBadge01Icon,
	ClipboardIcon,
	Delete01Icon,
	Edit03Icon,
	Location01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { VariantProps } from "class-variance-authority";
import { motion } from "motion/react";
import { useState } from "react";
import type { SchedulingExecutionContext } from "../../application/scheduling-context";
import type { CalendarEventType } from "../../domain/calendar-event";
import type { ScheduleEntry } from "../../domain/schedule-entry";
import type { TimeBlockKind, TimeBlockStatus } from "../../domain/time-block";
import { schedulingDependencies } from "../../infrastructure/scheduling.dependencies";
import {
	calendarEventTypeLabels,
	timeBlockKindLabels,
	timeBlockStatusLabels,
} from "../labels";

type ScheduleEntryCardProps = {
	entry: ScheduleEntry;
	context: SchedulingExecutionContext;
	onEdit: (entry: ScheduleEntry) => void;
	index?: number;
};

function statusBadgeVariant(
	status: TimeBlockStatus,
): VariantProps<typeof badgeVariants>["variant"] {
	switch (status) {
		case "completed":
			return "default";
		case "cancelled":
			return "destructive";
		default:
			return "secondary";
	}
}

function kindBadgeVariant(
	kind: TimeBlockKind,
): VariantProps<typeof badgeVariants>["variant"] {
	switch (kind) {
		case "task":
			return "default";
		case "focus":
			return "secondary";
		case "break":
			return "outline";
		default:
			return "ghost";
	}
}

function eventTypeBadgeVariant(
	eventType: CalendarEventType,
): VariantProps<typeof badgeVariants>["variant"] {
	switch (eventType) {
		case "meeting":
			return "default";
		case "appointment":
			return "secondary";
		case "personal":
			return "outline";
		default:
			return "ghost";
	}
}

export function ScheduleEntryCard({
	entry,
	context,
	onEdit,
	index = 0,
}: ScheduleEntryCardProps) {
	const { item } = entry;
	const [deleteOpen, setDeleteOpen] = useState(false);

	const handleDelete = async () => {
		if (entry.entityType === "time_block") {
			await schedulingDependencies.deleteTimeBlock(item.id, context);
		} else {
			await schedulingDependencies.deleteCalendarEvent(item.id, context);
		}
		setDeleteOpen(false);
	};

	const handleComplete = () => {
		if (entry.entityType !== "time_block") return;
		void schedulingDependencies.changeTimeBlockStatus(
			entry.item.id,
			"completed",
			context,
		);
	};

	const handleCancelBlock = () => {
		if (entry.entityType !== "time_block") return;
		void schedulingDependencies.changeTimeBlockStatus(
			entry.item.id,
			"cancelled",
			context,
		);
	};

	const typeBadge =
		entry.entityType === "time_block" ? (
			<Badge variant={kindBadgeVariant(entry.item.kind)}>
				{timeBlockKindLabels[entry.item.kind]}
			</Badge>
		) : (
			<Badge variant={eventTypeBadgeVariant(entry.item.eventType)}>
				{calendarEventTypeLabels[entry.item.eventType]}
			</Badge>
		);

	const isCompleted =
		entry.entityType === "time_block" && entry.item.status === "completed";
	const isCancelled =
		entry.entityType === "time_block" && entry.item.status === "cancelled";

	return (
		<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
			<motion.article
				layout
				initial={{ opacity: 0, y: 8, scale: 0.98 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				exit={{ opacity: 0, y: -4, scale: 0.98 }}
				transition={{
					duration: 0.2,
					delay: Math.min(index * 0.02, 0.15),
					ease: "easeOut",
				}}
				className={cn(
					"space-y-2.5 rounded-2xl border bg-card p-3 text-card-foreground shadow-sm transition-all hover:shadow-md",
					isCompleted &&
						"border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20",
					isCancelled &&
						"opacity-70 line-through decoration-muted-foreground/60",
				)}
			>
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0 flex-1">
						<p className="text-xs font-medium text-muted-foreground">
							{formatTime(item.startAt)}
							{" – "}
							{formatTime(item.endAt)}
						</p>
						<h3 className="mt-0.5 truncate font-medium leading-snug">
							{item.title}
						</h3>
					</div>
					{typeBadge}
				</div>

				{entry.entityType === "time_block" && (
					<div className="flex items-center gap-2">
						<Badge variant={statusBadgeVariant(entry.item.status)}>
							{timeBlockStatusLabels[entry.item.status]}
						</Badge>
						{entry.item.notes && (
							<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
								<HugeiconsIcon
									icon={ClipboardIcon}
									strokeWidth={2}
									className="size-3"
								/>
								Notas
							</span>
						)}
					</div>
				)}

				{entry.entityType === "calendar_event" && entry.item.location && (
					<p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
						<HugeiconsIcon
							icon={Location01Icon}
							strokeWidth={2}
							className="size-3.5"
						/>
						{entry.item.location}
					</p>
				)}

				<div className="flex flex-wrap gap-1.5 pt-1">
					{entry.entityType === "time_block" &&
						entry.item.status !== "completed" &&
						entry.item.status !== "cancelled" && (
							<Button size="xs" variant="ghost" onClick={handleComplete}>
								<HugeiconsIcon icon={CheckmarkBadge01Icon} strokeWidth={2} />
								Completar
							</Button>
						)}

					{entry.entityType === "time_block" &&
						entry.item.status !== "cancelled" &&
						entry.item.status !== "completed" && (
							<Button size="xs" variant="ghost" onClick={handleCancelBlock}>
								<HugeiconsIcon icon={CancelCircleIcon} strokeWidth={2} />
								Cancelar
							</Button>
						)}

					<Button size="xs" variant="outline" onClick={() => onEdit(entry)}>
						<HugeiconsIcon icon={Edit03Icon} strokeWidth={2} />
						Editar
					</Button>

					<AlertDialogTrigger
						render={
							<Button size="xs" variant="destructive">
								<HugeiconsIcon icon={Delete01Icon} strokeWidth={2} />
								Eliminar
							</Button>
						}
					/>
				</div>
			</motion.article>

			<AlertDialogContent size="sm">
				<AlertDialogHeader>
					<AlertDialogTitle>¿Eliminar este elemento?</AlertDialogTitle>
					<AlertDialogDescription>
						Esta acción no se puede deshacer. Se eliminará
						{entry.entityType === "time_block"
							? " el bloque de tiempo "
							: " el evento "}
						<strong>«{item.title}»</strong>.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						onClick={() => void handleDelete()}
					>
						Sí, eliminar
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function formatTime(value: string): string {
	return new Intl.DateTimeFormat("es-PE", {
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(value));
}
