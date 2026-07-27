import type { SchedulingRepository } from "../../domain/repositories/scheduling.repository";
import type { ScheduleRangeQuery } from "../../domain/schedule-entry";

export function listScheduleRangeQuery(repository: SchedulingRepository) {
	return (query: ScheduleRangeQuery) => repository.listRange(query);
}
