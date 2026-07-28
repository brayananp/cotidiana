export const DAILY_REVIEW_SCORES = [1, 2, 3, 4, 5] as const;
export type DailyReviewScore = (typeof DAILY_REVIEW_SCORES)[number];

export type DailyReview = {
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

export type DailyReviewInput = {
	userId: string;
	reviewDate: string;
	mood: DailyReviewScore;
	energy: DailyReviewScore;
	productivity: DailyReviewScore;
	wins: string | null;
	blockers: string | null;
	notes: string | null;
	tomorrowPriorities: string[];
	completed: boolean;
};

export function createDailyReviewEntity(
	input: DailyReviewInput,
	now = new Date(),
): DailyReview {
	validateInput(input);
	const timestamp = now.toISOString();

	return {
		id: `${input.userId}:${input.reviewDate}`,
		userId: input.userId,
		reviewDate: input.reviewDate,
		mood: input.mood,
		energy: input.energy,
		productivity: input.productivity,
		wins: normalizeNullable(input.wins),
		blockers: normalizeNullable(input.blockers),
		notes: normalizeNullable(input.notes),
		tomorrowPriorities: normalizePriorities(input.tomorrowPriorities),
		completedAt: input.completed ? timestamp : null,
		createdAt: timestamp,
		updatedAt: timestamp,
		deletedAt: null,
		version: 1,
	};
}

export function updateDailyReviewEntity(
	review: DailyReview,
	input: Omit<DailyReviewInput, "userId" | "reviewDate">,
	now = new Date(),
): DailyReview {
	if (review.deletedAt) throw new Error("DAILY_REVIEW_ALREADY_DELETED");

	validateInput({
		...input,
		userId: review.userId,
		reviewDate: review.reviewDate,
	});

	return {
		...review,
		mood: input.mood,
		energy: input.energy,
		productivity: input.productivity,
		wins: normalizeNullable(input.wins),
		blockers: normalizeNullable(input.blockers),
		notes: normalizeNullable(input.notes),
		tomorrowPriorities: normalizePriorities(input.tomorrowPriorities),
		completedAt: input.completed
			? (review.completedAt ?? now.toISOString())
			: null,
		updatedAt: now.toISOString(),
		version: review.version + 1,
	};
}

export function deleteDailyReviewEntity(
	review: DailyReview,
	now = new Date(),
): DailyReview {
	if (review.deletedAt) throw new Error("DAILY_REVIEW_ALREADY_DELETED");

	return {
		...review,
		deletedAt: now.toISOString(),
		updatedAt: now.toISOString(),
		version: review.version + 1,
	};
}

export function assertDailyReviewOwnership(
	review: DailyReview,
	userId: string,
): void {
	if (review.userId !== userId) throw new Error("DAILY_REVIEW_FORBIDDEN");
}

export function localDateKey(date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function validateInput(input: DailyReviewInput): void {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(input.reviewDate)) {
		throw new Error("INVALID_REVIEW_DATE");
	}

	for (const score of [input.mood, input.energy, input.productivity]) {
		if (!DAILY_REVIEW_SCORES.includes(score)) {
			throw new Error("INVALID_DAILY_REVIEW_SCORE");
		}
	}

	if (input.tomorrowPriorities.length > 3) {
		throw new Error("TOO_MANY_TOMORROW_PRIORITIES");
	}
}

function normalizeNullable(value: string | null): string | null {
	const normalized = value?.trim();
	return normalized ? normalized : null;
}

function normalizePriorities(values: string[]): string[] {
	return values
		.map((value) => value.trim())
		.filter(Boolean)
		.slice(0, 3);
}
