import type { UserSettings } from "../../domain/user-settings";
import type { UserSettingsRecord } from "./user-settings.record";

export function userSettingsToRecord(
	settings: UserSettings,
): UserSettingsRecord {
	return { ...settings };
}

export function userSettingsFromRecord(
	record: UserSettingsRecord,
): UserSettings {
	return { ...record };
}
