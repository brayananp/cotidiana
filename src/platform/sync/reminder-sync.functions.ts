import { createServerFn } from "@tanstack/react-start";
import {
	pullReminderInputSchema,
	pushReminderInputSchema,
} from "./reminder-sync.schemas";

export const pushReminderOperationsFn = createServerFn({
	method: "POST",
})
	.validator(pushReminderInputSchema)
	.handler(async ({ data }) => {
		const { pushReminderOperations } = await import(
			"@/server/sync/reminder-sync.service-server"
		);

		return pushReminderOperations(data);
	});

export const pullReminderChangesFn = createServerFn({
	method: "POST",
})
	.validator(pullReminderInputSchema)
	.handler(async ({ data }) => {
		const { pullReminderChanges } = await import(
			"@/server/sync/reminder-sync.service-server"
		);

		return pullReminderChanges(data);
	});
