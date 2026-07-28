import { z } from "zod";

const dailyReviewScoreSchema = z.union([
	z.literal(1),
	z.literal(2),
	z.literal(3),
	z.literal(4),
	z.literal(5),
]);

export const dailyReviewFormSchema = z.object({
	mood: dailyReviewScoreSchema,
	energy: dailyReviewScoreSchema,
	productivity: dailyReviewScoreSchema,
	wins: z.string().max(5_000),
	blockers: z.string().max(5_000),
	notes: z.string().max(10_000),
	tomorrowPriorities: z.array(z.string().max(300)).max(3),
	completed: z.boolean(),
});

export type DailyReviewFormInput = z.infer<typeof dailyReviewFormSchema>;
