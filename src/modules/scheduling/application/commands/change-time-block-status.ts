import type { SchedulingRepository } from "../../domain/repositories/scheduling.repository";
import {
	assertTimeBlockOwnership,
	changeTimeBlockStatus,
	type TimeBlockStatus,
} from "../../domain/time-block";
import type { SchedulingWriteStore } from "../ports/scheduling-write-store";
import type { SchedulingExecutionContext } from "../scheduling-context";

export function changeTimeBlockStatusCommand(
	repository: SchedulingRepository,
	writeStore: SchedulingWriteStore,
) {
	return async (
		id: string,
		status: TimeBlockStatus,
		context: SchedulingExecutionContext,
	) => {
		const existing = await repository.findTimeBlockById(id);

		if (!existing) {
			throw new Error("TIME_BLOCK_NOT_FOUND");
		}

		assertTimeBlockOwnership(existing, context.userId);

		const updated = changeTimeBlockStatus(existing, status);

		await writeStore.commitTimeBlock(updated, "update", context.deviceId);

		return updated;
	};
}
