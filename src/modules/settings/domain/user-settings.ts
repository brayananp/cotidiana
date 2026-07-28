import type { TaskPriority } from "@/modules/tasks/domain/task";

export const SETTINGS_LOCALES = ["es", "en"] as const;

export type SettingsLocale = (typeof SETTINGS_LOCALES)[number];

export const TIME_FORMATS = ["12h", "24h"] as const;

export type TimeFormat = (typeof TIME_FORMATS)[number];

export const START_PAGES = [
	"dashboard",
	"tasks",
	"scheduling",
	"reminders",
	"library",
] as const;

export type StartPage = (typeof START_PAGES)[number];

export type UserSettings = {
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

export type UpdateUserSettingsInput = Pick<
	UserSettings,
	| "locale"
	| "weekStartsOn"
	| "timeFormat"
	| "startPage"
	| "defaultTaskPriority"
	| "defaultReminderMinutes"
	| "denseMode"
>;

export function createDefaultUserSettings(
	userId: string,
	now = new Date(),
): UserSettings {
	const timestamp = now.toISOString();

	return {
		id: userId,
		userId,
		locale: "es",
		weekStartsOn: 1,
		timeFormat: "24h",
		startPage: "dashboard",
		defaultTaskPriority: "none",
		defaultReminderMinutes: 30,
		denseMode: false,
		createdAt: timestamp,
		updatedAt: timestamp,
		deletedAt: null,
		version: 1,
	};
}

export function updateUserSettingsEntity(
	settings: UserSettings,
	input: UpdateUserSettingsInput,
	now = new Date(),
): UserSettings {
	if (settings.deletedAt) {
		throw new Error("USER_SETTINGS_DELETED");
	}

	if (
		!Number.isInteger(input.defaultReminderMinutes) ||
		input.defaultReminderMinutes < 1 ||
		input.defaultReminderMinutes > 10_080
	) {
		throw new Error("INVALID_DEFAULT_REMINDER_MINUTES");
	}

	return {
		...settings,
		...input,
		updatedAt: now.toISOString(),
		version: settings.version + 1,
	};
}
