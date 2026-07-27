import {
	assertCalendarEventOwnership,
	deleteCalendarEventEntity,
} from "../../domain/calendar-event";
import type { SchedulingRepository } from "../../domain/repositories/scheduling.repository";
import type { SchedulingWriteStore } from "../ports/scheduling-write-store";
import type { SchedulingExecutionContext } from "../scheduling-context";

export function deleteCalendarEventCommand(
	repository: SchedulingRepository,
	writeStore: SchedulingWriteStore,
) {
	return async (id: string, context: SchedulingExecutionContext) => {
		const existing = await repository.findCalendarEventById(id);

		if (!existing) {
			throw new Error("CALENDAR_EVENT_NOT_FOUND");
		}

		assertCalendarEventOwnership(existing, context.userId);

		const deleted = deleteCalendarEventEntity(existing);

		await writeStore.commitCalendarEvent(deleted, "delete", context.deviceId);
	};
}
