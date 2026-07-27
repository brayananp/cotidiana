import { createServerFn } from "@tanstack/react-start";
import {
	pullTaskChanges,
	pushTaskOperations,
} from "@/server/sync/task-sync.service.server";
import { pullTasksInputSchema, pushTasksInputSchema } from "./sync.schemas";

export const pushTaskOperationsFn = createServerFn({
	method: "POST",
})
	.validator(pushTasksInputSchema)
	.handler(async ({ data }) => {
		return pushTaskOperations(data);
	});

export const pullTaskChangesFn = createServerFn({
	method: "POST",
})
	.validator(pullTasksInputSchema)
	.handler(async ({ data }) => {
		return pullTaskChanges(data);
	});
