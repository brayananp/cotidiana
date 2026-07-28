import { getLocalDatabase } from "@/platform/database/local-database";
import {
	createDefaultUserSettings,
	type UserSettings,
} from "../../domain/user-settings";
import {
	userSettingsFromRecord,
	userSettingsToRecord,
} from "./settings.mapper";

export class DexieSettingsRepository {
	async get(userId: string): Promise<UserSettings | null> {
		const record = await getLocalDatabase().userSettings.get(userId);

		return record ? userSettingsFromRecord(record) : null;
	}

	async getOrCreate(userId: string): Promise<UserSettings> {
		const existing = await this.get(userId);

		if (existing) {
			return existing;
		}

		const created = createDefaultUserSettings(userId);

		await getLocalDatabase().userSettings.put(userSettingsToRecord(created));

		return created;
	}
}
