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
import { Separator } from "#/shared/components/ui/separator";
import { toast } from "#/shared/components/ui/toast";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "#/shared/components/ui/tooltip";
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
	const [isMutating, setIsMutating] = useState(false);

	const handleDelete = async () => {
		setIsMutating(true);
		const label = entry.entityType === "time_block" ? "bloque" : "evento";
		try {
			if (entry.entityType === "time_block") {
				await schedulingDependencies.deleteTimeBlock(item.id, context);
			} else {
				await schedulingDependencies.deleteCalendarEvent(item.id, context);
			}
			toast.add({
				type: "success",
				title: `${label.charAt(0).toUpperCase()}${label.slice(1)} eliminado`,
				description: `Se eliminó «${item.title}».`,
			});
			setDeleteOpen(false);
		} catch (error) {
			toast.add({
				type: "error",
				title: "No se pudo eliminar",
				description:
					error instanceof Error
						? error.message
						: "Ocurrió un error inesperado.",
			});
		} finally {
			setIsMutating(false);
		}
	};

	const handleComplete = async () => {
		if (entry.entityType !== "time_block") return;
		setIsMutating(true);
		try {
			await schedulingDependencies.changeTimeBlockStatus(
				entry.item.id,
				"completed",
				context,
			);
			toast.add({
				type: "success",
				title: "Bloque completado",
				description: `Se marcó como completado «${item.title}».`,
			});
		} catch (error) {
			toast.add({
				type: "error",
				title: "No se pudo actualizar",
				description:
					error instanceof Error
						? error.message
						: "Ocurrió un error inesperado.",
			});
		} finally {
			setIsMutating(false);
		}
	};

	const handleCancelBlock = async () => {
		if (entry.entityType !== "time_block") return;
		setIsMutating(true);
		try {
			await schedulingDependencies.changeTimeBlockStatus(
				entry.item.id,
				"cancelled",
				context,
			);
			toast.add({
				type: "info",
				title: "Bloque cancelado",
				description: `Se canceló «${item.title}».`,
			});
		} catch (error) {
			toast.add({
				type: "error",
				title: "No se pudo actualizar",
				description:
					error instanceof Error
						? error.message
						: "Ocurrió un error inesperado.",
			});
		} finally {
			setIsMutating(false);
		}
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
			<TooltipProvider delay={150}>
				<motion.article
					layout
					initial={{ opacity: 0, y: 8, scale: 0.98 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, y: -4, scale: 0.98 }}
					whileHover={{ scale: 1.005 }}
					whileTap={{ scale: 0.995 }}
					transition={{
						layout: { duration: 0.2 },
						opacity: { duration: 0.2 },
						y: { duration: 0.2 },
						scale: { duration: 0.15, ease: "easeOut" },
						delay: Math.min(index * 0.02, 0.15),
					}}
					className={cn(
						"flex flex-col gap-3 rounded-2xl border bg-card p-3 text-card-foreground shadow-sm",
						isCompleted &&
							"border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/20",
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
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant={statusBadgeVariant(entry.item.status)}>
								{timeBlockStatusLabels[entry.item.status]}
							</Badge>
							{entry.item.notes && (
								<Tooltip>
									<TooltipTrigger
										render={
											<span className="inline-flex cursor-default items-center gap-1 text-xs text-muted-foreground">
												<HugeiconsIcon
													icon={ClipboardIcon}
													strokeWidth={2}
													className="size-3.5"
												/>
												Notas
											</span>
										}
									/>
									<TooltipContent className="max-w-72 text-xs leading-relaxed">
										{entry.item.notes}
									</TooltipContent>
								</Tooltip>
							)}
						</div>
					)}

					{entry.entityType === "calendar_event" && entry.item.location && (
						<Tooltip>
							<TooltipTrigger
								render={
									<p className="inline-flex cursor-default items-center gap-1 truncate text-xs text-muted-foreground">
										<HugeiconsIcon
											icon={Location01Icon}
											strokeWidth={2}
											className="size-3.5 shrink-0"
										/>
										<span className="truncate">{entry.item.location}</span>
									</p>
								}
							/>
							<TooltipContent className="max-w-72 text-xs leading-relaxed">
								{entry.item.location}
							</TooltipContent>
						</Tooltip>
					)}

					<Separator />

					<div className="flex flex-wrap items-center gap-1.5">
						{entry.entityType === "time_block" &&
							entry.item.status !== "completed" &&
							entry.item.status !== "cancelled" && (
								<Tooltip>
									<TooltipTrigger
										render={
											<Button
												size="xs"
												variant="ghost"
												disabled={isMutating}
												onClick={handleComplete}
											>
												<HugeiconsIcon
													icon={CheckmarkBadge01Icon}
													strokeWidth={2}
													data-icon="inline-start"
												/>
												Completar
											</Button>
										}
									/>
									<TooltipContent side="bottom">
										Marcar este bloque como completado.
									</TooltipContent>
								</Tooltip>
							)}

						{entry.entityType === "time_block" &&
							entry.item.status !== "cancelled" &&
							entry.item.status !== "completed" && (
								<Tooltip>
									<TooltipTrigger
										render={
											<Button
												size="xs"
												variant="ghost"
												disabled={isMutating}
												onClick={handleCancelBlock}
											>
												<HugeiconsIcon
													icon={CancelCircleIcon}
													strokeWidth={2}
													data-icon="inline-start"
												/>
												Cancelar
											</Button>
										}
									/>
									<TooltipContent side="bottom">
										Cancelar este bloque de tiempo.
									</TooltipContent>
								</Tooltip>
							)}

						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										size="xs"
										variant="outline"
										disabled={isMutating}
										onClick={() => onEdit(entry)}
									>
										<HugeiconsIcon
											icon={Edit03Icon}
											strokeWidth={2}
											data-icon="inline-start"
										/>
										Editar
									</Button>
								}
							/>
							<TooltipContent side="bottom">
								Editar este elemento.
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger
								render={
									<span>
										<AlertDialogTrigger
											render={
												<Button
													size="xs"
													variant="destructive"
													disabled={isMutating}
												>
													<HugeiconsIcon
														icon={Delete01Icon}
														strokeWidth={2}
														data-icon="inline-start"
													/>
													Eliminar
												</Button>
											}
										/>
									</span>
								}
							/>
							<TooltipContent side="bottom">
								Eliminar este elemento (no se puede deshacer).
							</TooltipContent>
						</Tooltip>
					</div>
				</motion.article>
			</TooltipProvider>

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
					<AlertDialogCancel disabled={isMutating}>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						disabled={isMutating}
						onClick={() => void handleDelete()}
					>
						{isMutating ? "Eliminando…" : "Sí, eliminar"}
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
