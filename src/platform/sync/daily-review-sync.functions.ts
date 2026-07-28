import { createServerFn } from "@tanstack/react-start";
import {
	pullDailyReviewChanges,
	pushDailyReviewOperations,
} from "@/server/sync/daily-review-sync.service-server";
import {
	pullDailyReviewInputSchema,
	pushDailyReviewInputSchema,
} from "./daily-review-sync.schemas";

export const pushDailyReviewOperationsFn = createServerFn({ method: "POST" })
	.validator(pushDailyReviewInputSchema)
	.handler(async ({ data }) => {
		return pushDailyReviewOperations(data);
	});

export const pullDailyReviewChangesFn = createServerFn({ method: "POST" })
	.validator(pullDailyReviewInputSchema)
	.handler(async ({ data }) => {
		return pullDailyReviewChanges(data);
	});
