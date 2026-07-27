import type {
	ReminderRecurrence,
	ReminderStatus,
	ReminderTargetType,
} from "../domain/reminder";

export const reminderStatusLabels: Record<ReminderStatus, string> = {
	scheduled: "Programado",
	snoozed: "Pospuesto",
	triggered: "Activado",
	dismissed: "Descartado",
	cancelled: "Cancelado",
};

export const reminderRecurrenceLabels: Record<ReminderRecurrence, string> = {
	none: "Una vez",
	daily: "Cada día",
	weekly: "Cada semana",
	monthly: "Cada mes",
};

export const reminderTargetTypeLabels: Record<ReminderTargetType, string> = {
	custom: "Personalizado",
	task: "Task",
	time_block: "Bloque de tiempo",
	calendar_event: "Evento de calendario",
};
