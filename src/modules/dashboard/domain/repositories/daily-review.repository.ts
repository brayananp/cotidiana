import type { DailyReview } from "../daily-review";

export interface DailyReviewRepository {
	findById(id: string): Promise<DailyReview | null>;
	findByDate(userId: string, reviewDate: string): Promise<DailyReview | null>;
	list(userId: string, limit?: number): Promise<DailyReview[]>;
}
