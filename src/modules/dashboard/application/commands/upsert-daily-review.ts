import {
	createDailyReviewEntity,
	updateDailyReviewEntity,
} from "../../domain/daily-review";
import type { DailyReviewRepository } from "../../domain/repositories/daily-review.repository";
import { dailyReviewFormSchema } from "../../schemas/daily-review-form.schema";
import type { DashboardExecutionContext } from "../dashboard-context";
import type { DailyReviewWriteStore } from "../ports/daily-review-write-store";

export function upsertDailyReviewCommand(
	repository: DailyReviewRepository,
	writeStore: DailyReviewWriteStore,
) {
	return async (
		reviewDate: string,
		rawInput: unknown,
		context: DashboardExecutionContext,
	) => {
		const input = dailyReviewFormSchema.parse(rawInput);
		const existing = await repository.findByDate(context.userId, reviewDate);

		if (existing) {
			const updated = updateDailyReviewEntity(existing, input);
			await writeStore.commit(updated, "update", context.deviceId);
			return updated;
		}

		const created = createDailyReviewEntity({
			userId: context.userId,
			reviewDate,
			...input,
		});

		await writeStore.commit(created, "create", context.deviceId);
		return created;
	};
}
