import {
	getLocalDatabase,
	type LocalDeviceRecord,
	type LocalIdentityRecord,
} from "@/platform/database/local-database";

export class LocalAccessRepository {
	async getActiveIdentity(): Promise<LocalIdentityRecord | null> {
		const db = getLocalDatabase();
		const active = await db.activeProfile.get("current");

		if (!active) {
			return null;
		}

		const identity = await db.localIdentities.get(active.userId);

		if (!identity || identity.deviceId !== active.deviceId) {
			return null;
		}

		return {
			...identity,
			remoteSignOutPending: identity.remoteSignOutPending ?? false,
		};
	}

	async getOrCreateDevice(): Promise<LocalDeviceRecord> {
		const db = getLocalDatabase();
		const existing = await db.localDevices.orderBy("createdAt").first();

		const now = new Date().toISOString();

		if (existing) {
			const updated: LocalDeviceRecord = {
				...existing,
				lastOpenedAt: now,
			};

			await db.localDevices.put(updated);
			return updated;
		}

		const device: LocalDeviceRecord = {
			id: crypto.randomUUID(),
			name: getDeviceName(),
			platform: getPlatform(),
			createdAt: now,
			lastOpenedAt: now,
		};

		await db.localDevices.add(device);

		return device;
	}

	async activateIdentity(
		input: Omit<
			LocalIdentityRecord,
			"id" | "updatedAt" | "remoteSignOutPending"
		>,
	): Promise<LocalIdentityRecord> {
		const db = getLocalDatabase();
		const now = new Date().toISOString();

		const identity: LocalIdentityRecord = {
			id: input.userId,
			...input,
			remoteSignOutPending: false,
			updatedAt: now,
		};

		await db.transaction(
			"rw",
			db.localIdentities,
			db.activeProfile,
			async () => {
				await db.localIdentities.put(identity);

				await db.activeProfile.put({
					id: "current",
					userId: identity.userId,
					deviceId: identity.deviceId,
					updatedAt: now,
				});
			},
		);

		return identity;
	}

	async disableActiveLocalAccess(remoteSignOutPending: boolean): Promise<void> {
		const db = getLocalDatabase();
		const active = await db.activeProfile.get("current");

		if (!active) {
			return;
		}

		const identity = await db.localIdentities.get(active.userId);

		const now = new Date().toISOString();

		await db.transaction(
			"rw",
			db.localIdentities,
			db.activeProfile,
			async () => {
				if (identity) {
					await db.localIdentities.put({
						...identity,
						offlineAccessEnabled: false,
						remoteSignOutPending,
						updatedAt: now,
					});
				}

				await db.activeProfile.delete("current");
			},
		);
	}

	async hasPendingRemoteSignOut(): Promise<boolean> {
		const db = getLocalDatabase();

		const pending = await db.localIdentities
			.filter((identity) => identity.remoteSignOutPending === true)
			.first();

		return Boolean(pending);
	}

	async clearPendingRemoteSignOut(): Promise<void> {
		const db = getLocalDatabase();
		const now = new Date().toISOString();

		await db.localIdentities
			.filter((identity) => identity.remoteSignOutPending === true)
			.modify({
				remoteSignOutPending: false,
				updatedAt: now,
			});
	}
}

function getDeviceName(): string {
	const platform = getPlatform();

	return platform ? `Dispositivo ${platform}` : "Navegador personal";
}

function getPlatform(): string | null {
	if (typeof navigator === "undefined") {
		return null;
	}

	const navigatorWithUserAgentData = navigator as Navigator & {
		userAgentData?: {
			platform?: string;
		};
	};

	return (
		navigatorWithUserAgentData.userAgentData?.platform ??
		navigator.platform ??
		null
	);
}
