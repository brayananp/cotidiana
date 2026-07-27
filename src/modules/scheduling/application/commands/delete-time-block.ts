import type { SchedulingRepository } from "../../domain/repositories/scheduling.repository";
import {
	assertTimeBlockOwnership,
	deleteTimeBlockEntity,
} from "../../domain/time-block";
import type { SchedulingWriteStore } from "../ports/scheduling-write-store";
import type { SchedulingExecutionContext } from "../scheduling-context";

export function deleteTimeBlockCommand(
	repository: SchedulingRepository,
	writeStore: SchedulingWriteStore,
) {
	return async (id: string, context: SchedulingExecutionContext) => {
		const existing = await repository.findTimeBlockById(id);

		if (!existing) {
			throw new Error("TIME_BLOCK_NOT_FOUND");
		}

		assertTimeBlockOwnership(existing, context.userId);

		const deleted = deleteTimeBlockEntity(existing);

		await writeStore.commitTimeBlock(deleted, "delete", context.deviceId);
	};
}
