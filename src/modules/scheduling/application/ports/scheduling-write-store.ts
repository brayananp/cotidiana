import type { SyncOperationType } from "@/platform/sync/sync.types";
import type { CalendarEvent } from "../../domain/calendar-event";
import type { TimeBlock } from "../../domain/time-block";

export type ScheduleCommitResult =
	| {
			type: "queued";
			operationId: string;
	  }
	| {
			type: "removed_local_only";
	  };

export interface SchedulingWriteStore {
	commitTimeBlock(
		block: TimeBlock,
		operation: SyncOperationType,
		deviceId: string,
	): Promise<ScheduleCommitResult>;

	commitCalendarEvent(
		event: CalendarEvent,
		operation: SyncOperationType,
		deviceId: string,
	): Promise<ScheduleCommitResult>;
}
