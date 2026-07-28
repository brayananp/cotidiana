import { getLocalDatabase } from "@/platform/database/local-database";
import {
	createDefaultUserSettings,
	type UserSettings,
} from "../../domain/user-settings";
import { userSettingsFromRecord } from "./settings.mapper";

export class DexieSettingsRepository {
	async get(userId: string): Promise<UserSettings | null> {
		const record = await getLocalDatabase().userSettings.get(userId);

		return record ? userSettingsFromRecord(record) : null;
	}

	async getOrDefault(userId: string): Promise<UserSettings> {
		const existing = await this.get(userId);

		if (existing) {
			return existing;
		}

		return createDefaultUserSettings(userId);
	}
}
