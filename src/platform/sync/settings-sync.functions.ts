import { createServerFn } from "@tanstack/react-start";
import {
	pullSettingsInputSchema,
	pushSettingsInputSchema,
} from "./settings-sync.schemas";

export const pushSettingsOperationsFn = createServerFn({
	method: "POST",
})
	.validator(pushSettingsInputSchema)
	.handler(async ({ data }) => {
		const { pushSettingsOperations } = await import(
			"@/server/sync/settings-sync.service-server"
		);

		return pushSettingsOperations(data);
	});

export const pullSettingsChangesFn = createServerFn({
	method: "POST",
})
	.validator(pullSettingsInputSchema)
	.handler(async ({ data }) => {
		const { pullSettingsChanges } = await import(
			"@/server/sync/settings-sync.service-server"
		);

		return pullSettingsChanges(data);
	});
