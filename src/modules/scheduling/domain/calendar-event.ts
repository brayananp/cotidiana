import { assertValidScheduleInterval } from "./schedule-interval";

export const CALENDAR_EVENT_TYPES = [
	"meeting",
	"appointment",
	"personal",
	"other",
] as const;

export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export type CalendarEvent = {
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

export type CreateCalendarEventInput = {
	userId: string;
	title: string;
	notes: string | null;
	location: string | null;
	eventType: CalendarEventType;
	startAt: string;
	endAt: string;
};

export type UpdateCalendarEventInput = Omit<CreateCalendarEventInput, "userId">;

export function createCalendarEventEntity(
	input: CreateCalendarEventInput,
	now = new Date(),
): CalendarEvent {
	assertValidScheduleInterval(input);

	const timestamp = now.toISOString();

	return {
		id: crypto.randomUUID(),
		userId: input.userId,
		title: normalizeTitle(input.title),
		notes: normalizeNullableText(input.notes),
		location: normalizeNullableText(input.location),
		eventType: input.eventType,
		startAt: input.startAt,
		endAt: input.endAt,
		createdAt: timestamp,
		updatedAt: timestamp,
		deletedAt: null,
		version: 1,
	};
}

export function updateCalendarEventEntity(
	event: CalendarEvent,
	input: UpdateCalendarEventInput,
	now = new Date(),
): CalendarEvent {
	assertEditable(event);
	assertValidScheduleInterval(input);

	return {
		...event,
		title: normalizeTitle(input.title),
		notes: normalizeNullableText(input.notes),
		location: normalizeNullableText(input.location),
		eventType: input.eventType,
		startAt: input.startAt,
		endAt: input.endAt,
		updatedAt: now.toISOString(),
		version: event.version + 1,
	};
}

export function deleteCalendarEventEntity(
	event: CalendarEvent,
	now = new Date(),
): CalendarEvent {
	assertEditable(event);

	return {
		...event,
		deletedAt: now.toISOString(),
		updatedAt: now.toISOString(),
		version: event.version + 1,
	};
}

export function assertCalendarEventOwnership(
	event: CalendarEvent,
	userId: string,
): void {
	if (event.userId !== userId) {
		throw new Error("CALENDAR_EVENT_FORBIDDEN");
	}
}

function assertEditable(event: CalendarEvent): void {
	if (event.deletedAt) {
		throw new Error("CALENDAR_EVENT_ALREADY_DELETED");
	}
}

function normalizeTitle(value: string): string {
	const normalized = value.trim();

	if (!normalized) {
		throw new Error("CALENDAR_EVENT_TITLE_REQUIRED");
	}

	return normalized;
}

function normalizeNullableText(value: string | null): string | null {
	const normalized = value?.trim();
	return normalized ? normalized : null;
}
