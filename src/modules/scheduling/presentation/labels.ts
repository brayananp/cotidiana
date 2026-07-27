import type { CalendarEventType } from "../domain/calendar-event";
import type { TimeBlockKind, TimeBlockStatus } from "../domain/time-block";

export const timeBlockKindLabels: Record<TimeBlockKind, string> = {
	task: "Tarea",
	focus: "Enfoque",
	break: "Descanso",
	personal: "Personal",
};

export const timeBlockStatusLabels: Record<TimeBlockStatus, string> = {
	planned: "Planificado",
	completed: "Completado",
	cancelled: "Cancelado",
};

export const calendarEventTypeLabels: Record<CalendarEventType, string> = {
	meeting: "Reunión",
	appointment: "Cita",
	personal: "Personal",
	other: "Otro",
};
