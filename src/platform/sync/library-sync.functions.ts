import { createServerFn } from "@tanstack/react-start";
import {
	pullLibraryInputSchema,
	pushLibraryInputSchema,
} from "./library-sync.schemas";

export const pushLibraryOperationsFn = createServerFn({
	method: "POST",
})
	.validator(pushLibraryInputSchema)
	.handler(async ({ data }) => {
		const { pushLibraryOperations } = await import(
			"@/server/sync/library-sync.service.server"
		);

		return pushLibraryOperations(data);
	});

export const pullLibraryChangesFn = createServerFn({
	method: "POST",
})
	.validator(pullLibraryInputSchema)
	.handler(async ({ data }) => {
		const { pullLibraryChanges } = await import(
			"@/server/sync/library-sync.service.server"
		);

		return pullLibraryChanges(data);
	});
