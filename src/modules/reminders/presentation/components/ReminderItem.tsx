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
	Calendar01Icon,
	CancelCircleIcon,
	Clock01Icon,
	Delete01Icon,
	Edit03Icon,
	Link01Icon,
	TaskDone01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { VariantProps } from "class-variance-authority";
import { motion } from "motion/react";
import { useState } from "react";
import type { ReminderExecutionContext } from "../../application/reminder-context";
import type { Reminder, ReminderStatus } from "../../domain/reminder";
import { remindersDependencies } from "../../infrastructure/reminders.dependencies";
import {
	reminderRecurrenceLabels,
	reminderStatusLabels,
	reminderTargetTypeLabels,
} from "../labels";

type ReminderItemProps = {
	reminder: Reminder;
	context: ReminderExecutionContext;
	onEdit: (reminder: Reminder) => void;
	index?: number;
};

function statusBadgeVariant(
	status: ReminderStatus,
): VariantProps<typeof badgeVariants>["variant"] {
	switch (status) {
		case "scheduled":
			return "default";
		case "snoozed":
			return "secondary";
		case "triggered":
			return "outline";
		case "dismissed":
			return "ghost";
		case "cancelled":
			return "destructive";
		default:
			return "outline";
	}
}

export function ReminderItem({
	reminder,
	context,
	onEdit,
	index = 0,
}: ReminderItemProps) {
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [isMutating, setIsMutating] = useState(false);

	const handleDelete = async () => {
		setIsMutating(true);
		try {
			await remindersDependencies.deleteReminder(reminder.id, context);
			toast.add({
				type: "success",
				title: "Recordatorio eliminado",
				description: `Se eliminó «${reminder.title}».`,
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

	const runAction = async (
		label: string,
		fn: () => Promise<unknown>,
		type: "success" | "info" | "error" = "success",
	) => {
		setIsMutating(true);
		try {
			await fn();
			toast.add({
				type,
				title: label,
				description: `«${reminder.title}».`,
			});
		} catch (error) {
			toast.add({
				type: "error",
				title: `No se pudo ${label.toLowerCase()}`,
				description:
					error instanceof Error
						? error.message
						: "Ocurrió un error inesperado.",
			});
		} finally {
			setIsMutating(false);
		}
	};

	const isEditable =
		reminder.status === "scheduled" || reminder.status === "snoozed";
	const isTriggered = reminder.status === "triggered";
	const isInactive =
		reminder.status === "dismissed" || reminder.status === "cancelled";

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
						"flex flex-col gap-3 rounded-2xl border bg-card p-4 text-card-foreground shadow-sm",
						isTriggered &&
							"ring-2 ring-warning/40 border-warning/30 bg-warning/5",
						isInactive && "opacity-70",
					)}
				>
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div className="min-w-0 flex-1 flex flex-col gap-1">
							<div className="flex items-center gap-2">
								<h3 className="font-medium leading-snug truncate">
									{reminder.title}
								</h3>
								{isTriggered && (
									<span className="inline-flex size-2 shrink-0 animate-pulse rounded-full bg-warning" />
								)}
							</div>
							{reminder.notes && (
								<p className="text-sm text-muted-foreground line-clamp-2">
									{reminder.notes}
								</p>
							)}
						</div>
						<Badge variant={statusBadgeVariant(reminder.status)}>
							{reminderStatusLabels[reminder.status]}
						</Badge>
					</div>

					<div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
						<span className="inline-flex items-center gap-1.5 truncate">
							<HugeiconsIcon
								icon={Calendar01Icon}
								strokeWidth={2}
								className="size-3.5 shrink-0"
							/>
							<span className="truncate">
								Próxima:{" "}
								{reminder.nextTriggerAt
									? formatDateTime(reminder.nextTriggerAt)
									: "Sin próxima fecha"}
							</span>
						</span>

						<span className="inline-flex items-center gap-1.5 truncate">
							<HugeiconsIcon
								icon={Link01Icon}
								strokeWidth={2}
								className="size-3.5 shrink-0"
							/>
							<span className="truncate">
								{reminderRecurrenceLabels[reminder.recurrence]}
								{reminder.recurrence !== "none" &&
									reminder.repeatInterval > 1 &&
									` × ${reminder.repeatInterval}`}
							</span>
						</span>

						<span className="inline-flex items-center gap-1.5 truncate">
							<HugeiconsIcon
								icon={Link01Icon}
								strokeWidth={2}
								className="size-3.5 shrink-0"
							/>
							<span className="truncate">
								{reminderTargetTypeLabels[reminder.targetType]}
							</span>
						</span>

						{reminder.lastTriggeredAt && (
							<span className="inline-flex items-center gap-1.5 truncate">
								<HugeiconsIcon
									icon={Clock01Icon}
									strokeWidth={2}
									className="size-3.5 shrink-0"
								/>
								<span className="truncate">
									Última: {formatDateTime(reminder.lastTriggeredAt)}
								</span>
							</span>
						)}
					</div>

					<Separator />

					<div className="flex flex-wrap items-center gap-1.5">
						{isTriggered && (
							<>
								<Tooltip>
									<TooltipTrigger
										render={
											<Button
												size="xs"
												variant="outline"
												disabled={isMutating}
												onClick={() =>
													void runAction(
														"Pospuesto 5 minutos",
														() =>
															remindersDependencies.snoozeReminder(
																reminder.id,
																5,
																context,
															),
														"info",
													)
												}
											>
												<HugeiconsIcon
													icon={Clock01Icon}
													strokeWidth={2}
													data-icon="inline-start"
												/>
												+5 min
											</Button>
										}
									/>
									<TooltipContent side="bottom">
										Posponer el recordatorio 5 minutos.
									</TooltipContent>
								</Tooltip>

								<Tooltip>
									<TooltipTrigger
										render={
											<Button
												size="xs"
												variant="outline"
												disabled={isMutating}
												onClick={() =>
													void runAction(
														"Pospuesto 15 minutos",
														() =>
															remindersDependencies.snoozeReminder(
																reminder.id,
																15,
																context,
															),
														"info",
													)
												}
											>
												<HugeiconsIcon
													icon={Clock01Icon}
													strokeWidth={2}
													data-icon="inline-start"
												/>
												+15 min
											</Button>
										}
									/>
									<TooltipContent side="bottom">
										Posponer el recordatorio 15 minutos.
									</TooltipContent>
								</Tooltip>

								<Tooltip>
									<TooltipTrigger
										render={
											<Button
												size="xs"
												variant="secondary"
												disabled={isMutating}
												onClick={() =>
													void runAction("Descartado", () =>
														remindersDependencies.dismissReminder(
															reminder.id,
															context,
														),
													)
												}
											>
												<HugeiconsIcon
													icon={TaskDone01Icon}
													strokeWidth={2}
													data-icon="inline-start"
												/>
												Descartar
											</Button>
										}
									/>
									<TooltipContent side="bottom">
										Marcar este recordatorio como descartado.
									</TooltipContent>
								</Tooltip>
							</>
						)}

						{isEditable && (
							<>
								<Tooltip>
									<TooltipTrigger
										render={
											<Button
												size="xs"
												variant="outline"
												disabled={isMutating}
												onClick={() => onEdit(reminder)}
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
										Editar este recordatorio.
									</TooltipContent>
								</Tooltip>

								<Tooltip>
									<TooltipTrigger
										render={
											<Button
												size="xs"
												variant="ghost"
												disabled={isMutating}
												onClick={() =>
													void runAction(
														"Cancelado",
														() =>
															remindersDependencies.cancelReminder(
																reminder.id,
																context,
															),
														"info",
													)
												}
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
										Cancelar este recordatorio programado.
									</TooltipContent>
								</Tooltip>
							</>
						)}

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
								Eliminar permanentemente (no se puede deshacer).
							</TooltipContent>
						</Tooltip>
					</div>
				</motion.article>
			</TooltipProvider>

			<AlertDialogContent size="sm">
				<AlertDialogHeader>
					<AlertDialogTitle>¿Eliminar este recordatorio?</AlertDialogTitle>
					<AlertDialogDescription>
						Esta acción no se puede deshacer. Se eliminará el recordatorio{" "}
						<strong>«{reminder.title}»</strong>.
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

function formatDateTime(value: string): string {
	return new Intl.DateTimeFormat("es-PE", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}
