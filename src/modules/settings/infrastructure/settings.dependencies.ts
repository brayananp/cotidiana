import { updateUserSettingsEntity } from "../domain/user-settings";
import { userSettingsFormSchema } from "../schemas/user-settings-form.schema";
import { DexieSettingsRepository } from "./local/dexie-settings.repository";
import { DexieSettingsWriteStore } from "./local/dexie-settings-write-store";

const repository = new DexieSettingsRepository();
const writeStore = new DexieSettingsWriteStore();

export const settingsDependencies = {
	repository,
	writeStore,

	async getOrDefault(userId: string) {
		return repository.getOrDefault(userId);
	},

	async update(userId: string, deviceId: string, rawInput: unknown) {
		const input = userSettingsFormSchema.parse(rawInput);
		const existing = await repository.getOrDefault(userId);
		const updated = updateUserSettingsEntity(existing, input);

		await writeStore.commit(
			updated,
			existing.version === 1 && existing.updatedAt === existing.createdAt
				? "create"
				: "update",
			deviceId,
		);

		return updated;
	},
};
