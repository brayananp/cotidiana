import type { CalendarEventType } from "../../domain/calendar-event";

export type CalendarEventRecord = {
	id: string;
	userId: string;
	title: string;
	notes: string | null;
	location: string | null;
	eventType: CalendarEventType;
	startAt: string;
	endAt: string;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	version: number;
};
