import type { CalendarEvent } from "../../domain/calendar-event";
import type { TimeBlock } from "../../domain/time-block";
import type { CalendarEventRecord } from "./calendar-event.record";
import type { TimeBlockRecord } from "./time-block.record";

export function timeBlockToRecord(block: TimeBlock): TimeBlockRecord {
	return { ...block };
}

export function timeBlockFromRecord(record: TimeBlockRecord): TimeBlock {
	return { ...record };
}

export function calendarEventToRecord(
	event: CalendarEvent,
): CalendarEventRecord {
	return { ...event };
}

export function calendarEventFromRecord(
	record: CalendarEventRecord,
): CalendarEvent {
	return { ...record };
}
