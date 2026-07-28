import type { DailyReview } from "../../domain/daily-review";
import type { DailyReviewRecord } from "./daily-review.record";

export const dailyReviewToRecord = (
	review: DailyReview,
): DailyReviewRecord => ({ ...review });
export const dailyReviewFromRecord = (
	record: DailyReviewRecord,
): DailyReview => ({ ...record });
