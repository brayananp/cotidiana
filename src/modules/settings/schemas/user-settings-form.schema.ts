import { z } from "zod";
import { TASK_PRIORITIES } from "@/modules/tasks/domain/task";
import {
	SETTINGS_LOCALES,
	START_PAGES,
	TIME_FORMATS,
} from "../domain/user-settings";

export const userSettingsFormSchema = z.object({
	locale: z.enum(SETTINGS_LOCALES),
	weekStartsOn: z.union([z.literal(0), z.literal(1)]),
	timeFormat: z.enum(TIME_FORMATS),
	startPage: z.enum(START_PAGES),
	defaultTaskPriority: z.enum(TASK_PRIORITIES),
	defaultReminderMinutes: z.number().int().min(1).max(10_080),
	denseMode: z.boolean(),
});

export type UserSettingsFormInput = z.infer<typeof userSettingsFormSchema>;
