import type { SyncOperationType } from "@/platform/sync/sync.types";
import type { DailyReview } from "../../domain/daily-review";

export interface DailyReviewWriteStore {
	commit(
		review: DailyReview,
		operation: SyncOperationType,
		deviceId: string,
	): Promise<void>;
}
