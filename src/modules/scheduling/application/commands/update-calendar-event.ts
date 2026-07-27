import {
	assertCalendarEventOwnership,
	updateCalendarEventEntity,
} from "../../domain/calendar-event";
import type { SchedulingRepository } from "../../domain/repositories/scheduling.repository";
import { ScheduleOverlapError } from "../../domain/schedule-errors";
import { calendarEventFormSchema } from "../../schemas/calendar-event-form.schema";
import { localDateTimeToIso } from "../date-mapper";
import type { SchedulingWriteStore } from "../ports/scheduling-write-store";
import type { SchedulingExecutionContext } from "../scheduling-context";

export function updateCalendarEventCommand(
	repository: SchedulingRepository,
	writeStore: SchedulingWriteStore,
) {
	return async (
		id: string,
		rawInput: unknown,
		context: SchedulingExecutionContext,
	) => {
		const input = calendarEventFormSchema.parse(rawInput);

		const existing = await repository.findCalendarEventById(id);

		if (!existing) {
			throw new Error("CALENDAR_EVENT_NOT_FOUND");
		}

		assertCalendarEventOwnership(existing, context.userId);

		const interval = {
			startAt: localDateTimeToIso(input.startAt),
			endAt: localDateTimeToIso(input.endAt),
		};

		if (
			await repository.hasOverlap(context.userId, interval, {
				entityType: "calendar_event",
				entityId: id,
			})
		) {
			throw new ScheduleOverlapError();
		}

		const updated = updateCalendarEventEntity(existing, {
			title: input.title,
			notes: input.notes || null,
			location: input.location || null,
			eventType: input.eventType,
			...interval,
		});

		await writeStore.commitCalendarEvent(updated, "update", context.deviceId);

		return updated;
	};
}
