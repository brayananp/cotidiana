import type { CalendarEvent } from "../calendar-event";
import type { ScheduleEntry, ScheduleRangeQuery } from "../schedule-entry";
import type { ScheduleInterval } from "../schedule-interval";
import type { TimeBlock } from "../time-block";

export type ExcludedScheduleEntity = {
	entityType: "time_block" | "calendar_event";
	entityId: string;
};

export interface SchedulingRepository {
	findTimeBlockById(id: string): Promise<TimeBlock | null>;

	findCalendarEventById(id: string): Promise<CalendarEvent | null>;

	listRange(query: ScheduleRangeQuery): Promise<ScheduleEntry[]>;

	hasOverlap(
		userId: string,
		interval: ScheduleInterval,
		excluded?: ExcludedScheduleEntity,
	): Promise<boolean>;
}
