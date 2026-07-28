import { getLocalDatabase } from "@/platform/database/local-database";
import type { DailyReview } from "../../domain/daily-review";
import type { DailyReviewRepository } from "../../domain/repositories/daily-review.repository";
import { dailyReviewFromRecord } from "./daily-review.mapper";

export class DexieDailyReviewRepository implements DailyReviewRepository {
	async findById(id: string): Promise<DailyReview | null> {
		const record = await getLocalDatabase().dailyReviews.get(id);
		return record ? dailyReviewFromRecord(record) : null;
	}

	async findByDate(
		userId: string,
		reviewDate: string,
	): Promise<DailyReview | null> {
		const record = await getLocalDatabase()
			.dailyReviews.where("[userId+reviewDate]")
			.equals([userId, reviewDate])
			.first();

		return record && !record.deletedAt ? dailyReviewFromRecord(record) : null;
	}

	async list(userId: string, limit = 30): Promise<DailyReview[]> {
		const records = await getLocalDatabase()
			.dailyReviews.where("userId")
			.equals(userId)
			.toArray();

		return records
			.filter((record) => !record.deletedAt)
			.sort((left, right) => right.reviewDate.localeCompare(left.reviewDate))
			.slice(0, limit)
			.map(dailyReviewFromRecord);
	}
}
