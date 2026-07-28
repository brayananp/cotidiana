import type { DailyReviewScore } from "../../domain/daily-review";

export type DailyReviewRecord = {
	id: string;
	userId: string;
	reviewDate: string;
	mood: DailyReviewScore;
	energy: DailyReviewScore;
	productivity: DailyReviewScore;
	wins: string | null;
	blockers: string | null;
	notes: string | null;
	tomorrowPriorities: string[];
	completedAt: string | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	version: number;
};
