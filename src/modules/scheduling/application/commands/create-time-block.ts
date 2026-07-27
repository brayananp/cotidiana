import type { SchedulingRepository } from "../../domain/repositories/scheduling.repository";
import { ScheduleOverlapError } from "../../domain/schedule-errors";
import { createTimeBlockEntity } from "../../domain/time-block";
import { timeBlockFormSchema } from "../../schemas/time-block-form.schema";
import { localDateTimeToIso } from "../date-mapper";
import type { SchedulingWriteStore } from "../ports/scheduling-write-store";
import type { SchedulingExecutionContext } from "../scheduling-context";

export function createTimeBlockCommand(
	repository: SchedulingRepository,
	writeStore: SchedulingWriteStore,
) {
	return async (rawInput: unknown, context: SchedulingExecutionContext) => {
		const input = timeBlockFormSchema.parse(rawInput);

		const interval = {
			startAt: localDateTimeToIso(input.startAt),
			endAt: localDateTimeToIso(input.endAt),
		};

		if (await repository.hasOverlap(context.userId, interval)) {
			throw new ScheduleOverlapError();
		}

		const block = createTimeBlockEntity({
			userId: context.userId,
			taskId: input.taskId || null,
			title: input.title,
			notes: input.notes || null,
			kind: input.kind,
			...interval,
		});

		await writeStore.commitTimeBlock(block, "create", context.deviceId);

		return block;
	};
}
