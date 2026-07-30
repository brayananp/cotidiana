import type { LocalIdentityRecord } from "@/platform/database/local-database";
import { browserReportsOnline } from "@/platform/network/network-status";
import { decideAppAccess } from "./access-decision";
import type { AppAccess, LocalIdentitySnapshot } from "./app-access.types";
import { authClient } from "./auth-client";
import { LocalAccessRepository } from "./local-access.repository";
import {
	flushPendingRemoteSignOut,
	provisionLocalAccess,
} from "./local-access.service";

const repository = new LocalAccessRepository();

export async function resolveAppAccess(): Promise<AppAccess> {
	const localRecord = await repository.getActiveIdentity();
	const localIdentity = localRecord ? toLocalSnapshot(localRecord) : null;

	const online = browserReportsOnline();

	if (!online) {
		return decideAppAccess({
			localIdentity,
			browserReportsOnline: false,
			serverAvailable: false,
			remoteSession: null,
		});
	}

	await flushPendingRemoteSignOut();

	const sessionResult = await authClient.getSession();

	if (sessionResult.error) {
		return decideAppAccess({
			localIdentity,
			browserReportsOnline: true,
			serverAvailable: false,
			remoteSession: null,
		});
	}

	if (sessionResult.data) {
		await provisionLocalAccess(sessionResult.data);

		const refreshed = await repository.getActiveIdentity();

		return decideAppAccess({
			localIdentity: refreshed ? toLocalSnapshot(refreshed) : localIdentity,
			browserReportsOnline: true,
			serverAvailable: true,
			remoteSession: sessionResult.data,
		});
	}

	return decideAppAccess({
		localIdentity,
		browserReportsOnline: true,
		serverAvailable: true,
		remoteSession: null,
	});
}

function toLocalSnapshot(record: LocalIdentityRecord): LocalIdentitySnapshot {
	return {
		userId: record.userId,
		deviceId: record.deviceId,
		name: record.name,
		email: record.email,
		offlineAccessEnabled: record.offlineAccessEnabled,
		initializedAt: record.initializedAt,
		lastAuthenticatedAt: record.lastAuthenticatedAt,
	};
}
