import { useLiveQuery } from "dexie-react-hooks";
import { schedulingDependencies } from "../../infrastructure/scheduling.dependencies";

export function useScheduleRange(
	userId: string,
	rangeStart: string,
	rangeEnd: string,
) {
	return useLiveQuery(
		() =>
			schedulingDependencies.listRange({
				userId,
				rangeStart,
				rangeEnd,
				includeDeleted: false,
			}),
		[userId, rangeStart, rangeEnd],
		[],
	);
}
