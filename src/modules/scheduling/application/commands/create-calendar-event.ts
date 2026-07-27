import { createCalendarEventEntity } from "../../domain/calendar-event";
import type { SchedulingRepository } from "../../domain/repositories/scheduling.repository";
import { ScheduleOverlapError } from "../../domain/schedule-errors";
import { calendarEventFormSchema } from "../../schemas/calendar-event-form.schema";
import { localDateTimeToIso } from "../date-mapper";
import type { SchedulingWriteStore } from "../ports/scheduling-write-store";
import type { SchedulingExecutionContext } from "../scheduling-context";

export function createCalendarEventCommand(
	repository: SchedulingRepository,
	writeStore: SchedulingWriteStore,
) {
	return async (rawInput: unknown, context: SchedulingExecutionContext) => {
		const input = calendarEventFormSchema.parse(rawInput);

		const interval = {
			startAt: localDateTimeToIso(input.startAt),
			endAt: localDateTimeToIso(input.endAt),
		};

		if (await repository.hasOverlap(context.userId, interval)) {
			throw new ScheduleOverlapError();
		}

		const event = createCalendarEventEntity({
			userId: context.userId,
			title: input.title,
			notes: input.notes || null,
			location: input.location || null,
			eventType: input.eventType,
			...interval,
		});

		await writeStore.commitCalendarEvent(event, "create", context.deviceId);

		return event;
	};
}
