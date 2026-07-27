import type { SchedulingRepository } from "../../domain/repositories/scheduling.repository";
import { ScheduleOverlapError } from "../../domain/schedule-errors";
import {
	assertTimeBlockOwnership,
	updateTimeBlockEntity,
} from "../../domain/time-block";
import { timeBlockFormSchema } from "../../schemas/time-block-form.schema";
import { localDateTimeToIso } from "../date-mapper";
import type { SchedulingWriteStore } from "../ports/scheduling-write-store";
import type { SchedulingExecutionContext } from "../scheduling-context";

export function updateTimeBlockCommand(
	repository: SchedulingRepository,
	writeStore: SchedulingWriteStore,
) {
	return async (
		id: string,
		rawInput: unknown,
		context: SchedulingExecutionContext,
	) => {
		const input = timeBlockFormSchema.parse(rawInput);

		const existing = await repository.findTimeBlockById(id);

		if (!existing) {
			throw new Error("TIME_BLOCK_NOT_FOUND");
		}

		assertTimeBlockOwnership(existing, context.userId);

		const interval = {
			startAt: localDateTimeToIso(input.startAt),
			endAt: localDateTimeToIso(input.endAt),
		};

		if (
			existing.status !== "cancelled" &&
			(await repository.hasOverlap(context.userId, interval, {
				entityType: "time_block",
				entityId: id,
			}))
		) {
			throw new ScheduleOverlapError();
		}

		const updated = updateTimeBlockEntity(existing, {
			taskId: input.taskId || null,
			title: input.title,
			notes: input.notes || null,
			kind: input.kind,
			...interval,
		});

		await writeStore.commitTimeBlock(updated, "update", context.deviceId);

		return updated;
	};
}
