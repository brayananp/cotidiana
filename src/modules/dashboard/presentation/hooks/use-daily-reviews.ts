import { useLiveQuery } from "dexie-react-hooks";
import { dashboardDependencies } from "../../infrastructure/dashboard.dependencies";

export function useDailyReview(userId: string, reviewDate: string) {
	return useLiveQuery(
		() => dashboardDependencies.repository.findByDate(userId, reviewDate),
		[userId, reviewDate],
		null,
	);
}

export function useDailyReviewHistory(userId: string, limit = 7) {
	return useLiveQuery(
		() => dashboardDependencies.repository.list(userId, limit),
		[userId, limit],
		[],
	);
}
