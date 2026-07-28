import { upsertDailyReviewCommand } from "../application/commands/upsert-daily-review";
import { DexieDailyReviewRepository } from "./local/dexie-daily-review.repository";
import { DexieDailyReviewWriteStore } from "./local/dexie-daily-review-write-store";

const repository = new DexieDailyReviewRepository();
const writeStore = new DexieDailyReviewWriteStore();

export const dashboardDependencies = {
	repository,
	writeStore,
	upsertReview: upsertDailyReviewCommand(repository, writeStore),
};
