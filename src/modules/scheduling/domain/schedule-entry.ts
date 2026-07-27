import type { CalendarEvent } from "./calendar-event";
import type { TimeBlock } from "./time-block";

export type ScheduleEntry =
	| {
			entityType: "time_block";
			item: TimeBlock;
	  }
	| {
			entityType: "calendar_event";
			item: CalendarEvent;
	  };

export type ScheduleRangeQuery = {
	userId: string;
	rangeStart: string;
	rangeEnd: string;
	includeDeleted?: boolean;
};
