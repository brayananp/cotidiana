import { useLiveQuery } from "dexie-react-hooks";
import { settingsDependencies } from "../../infrastructure/settings.dependencies";

export function useUserSettings(userId: string) {
	return useLiveQuery(
		() => settingsDependencies.getOrDefault(userId),
		[userId],
	);
}
