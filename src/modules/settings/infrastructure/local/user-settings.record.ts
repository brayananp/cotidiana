import type { TaskPriority } from "@/modules/tasks/domain/task";
import type {
	SettingsLocale,
	StartPage,
	TimeFormat,
} from "../../domain/user-settings";

export type UserSettingsRecord = {
	id: string;
	userId: string;
	locale: SettingsLocale;
	weekStartsOn: 0 | 1;
	timeFormat: TimeFormat;
	startPage: StartPage;
	defaultTaskPriority: TaskPriority;
	defaultReminderMinutes: number;
	denseMode: boolean;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	version: number;
};
