import { getLocalDatabase } from "@/platform/database/local-database";
import { requestSettingsSync } from "@/platform/sync/settings-sync-events-client";
import {
	createSyncMetadataId,
	type SyncMetadataRecord,
	type SyncOperationRecord,
} from "@/platform/sync/sync.types";
import type { UserSettings } from "../../domain/user-settings";
import { userSettingsToRecord } from "./settings.mapper";

export class DexieSettingsWriteStore {
	async commit(
		settings: UserSettings,
		operation: "create" | "update",
		deviceId: string,
	): Promise<void> {
		const db = getLocalDatabase();

		await db.transaction(
			"rw",
			db.userSettings,
			db.syncOperations,
			db.syncMetadata,
			async () => {
				const existingOperations = await db.syncOperations
					.where("[entityType+entityId]")
					.equals(["user_settings", settings.id])
					.toArray();

				const compactable = existingOperations.filter(
					(item) => item.status === "pending" && item.attempts === 0,
				);

				const pendingCreate = compactable.find(
					(item) => item.operation === "create",
				);

				const effectiveOperation = pendingCreate ? "create" : operation;

				const metadataId = createSyncMetadataId("user_settings", settings.id);

				const currentMetadata = await db.syncMetadata.get(metadataId);

				const now = new Date().toISOString();

				const syncOperation: SyncOperationRecord = {
					id: crypto.randomUUID(),
					userId: settings.userId,
					deviceId,
					entityType: "user_settings",
					entityId: settings.id,
					operation: effectiveOperation,
					payload: settings,
					baseVersion:
						effectiveOperation === "create"
							? null
							: (currentMetadata?.remoteVersion ?? null),
					status: "pending",
					attempts: 0,
					nextRetryAt: null,
					lastError: null,
					createdAt: compactable[0]?.createdAt ?? now,
					updatedAt: now,
				};

				const metadata: SyncMetadataRecord = {
					id: metadataId,
					entityType: "user_settings",
					entityId: settings.id,
					localVersion: settings.version,
					remoteVersion: currentMetadata?.remoteVersion ?? null,
					state: "pending",
					lastSyncedAt: currentMetadata?.lastSyncedAt ?? null,
					lastError: null,
					updatedAt: now,
				};

				await db.userSettings.put(userSettingsToRecord(settings));

				if (compactable.length > 0) {
					await db.syncOperations.bulkDelete(
						compactable.map((item) => item.id),
					);
				}

				await db.syncOperations.put(syncOperation);
				await db.syncMetadata.put(metadata);
			},
		);

		requestSettingsSync();
	}
}
