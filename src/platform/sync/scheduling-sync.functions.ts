import { createServerFn } from "@tanstack/react-start";
import {
	pullSchedulingInputSchema,
	pushSchedulingInputSchema,
} from "./scheduling-sync.schemas";

export const pushSchedulingOperationsFn = createServerFn({
	method: "POST",
})
	.validator(pushSchedulingInputSchema)
	.handler(async ({ data }) => {
		const { pushSchedulingOperations } = await import(
			"#/server/sync/scheduling-sync.service-server"
		);

		return pushSchedulingOperations(data);
	});

export const pullSchedulingChangesFn = createServerFn({
	method: "POST",
})
	.validator(pullSchedulingInputSchema)
	.handler(async ({ data }) => {
		const { pullSchedulingChanges } = await import(
			"#/server/sync/scheduling-sync.service-server"
		);

		return pullSchedulingChanges(data);
	});
