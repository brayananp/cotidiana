import {
	browserReportsOnline,
	isServerAvailable,
} from "@/platform/network/network-status";
import type { AuthClientSession } from "./auth-client";
import { authClient } from "./auth-client";
import { ensureRemoteDeviceRegistered } from "./device-registration-client";
import { LocalAccessRepository } from "./local-access.repository";

const repository = new LocalAccessRepository();

type SignOutDependencies = {
	browserReportsOnline: () => boolean;
	isServerAvailable: () => Promise<boolean>;
	signOutRemote: () => Promise<{ error?: unknown }>;
	disableLocalAccess: (remoteSignOutPending: boolean) => Promise<void>;
};

export async function provisionLocalAccess(
	session: AuthClientSession,
): Promise<void> {
	const device = await repository.getOrCreateDevice();
	const existingIdentity = await repository.getActiveIdentity();
	const now = new Date().toISOString();
	const remoteRegisteredAt =
		existingIdentity?.userId === session.user.id &&
		existingIdentity.deviceId === device.id
			? existingIdentity.remoteRegisteredAt
			: null;

	await repository.activateIdentity({
		userId: session.user.id,
		deviceId: device.id,
		name: session.user.name,
		email: session.user.email,
		offlineAccessEnabled: true,
		initializedAt: now,
		lastAuthenticatedAt: now,
		remoteRegisteredAt,
	});

	void ensureRemoteDeviceRegistered({
		userId: session.user.id,
		deviceId: device.id,
	}).catch(() => {
		// Local access is already active. The sync coordinator retries registration.
	});
}

export function createSignOutCurrentDevice(
	dependencies: SignOutDependencies,
): () => Promise<void> {
	return async () => {
		let remoteSignOutPending = true;

		try {
			const online = dependencies.browserReportsOnline();
			const serverAvailable =
				online && (await dependencies.isServerAvailable());

			if (serverAvailable) {
				const result = await dependencies.signOutRemote();
				remoteSignOutPending = Boolean(result.error);
			}
		} catch {
			remoteSignOutPending = true;
		}

		await dependencies.disableLocalAccess(remoteSignOutPending);
	};
}

export const signOutCurrentDevice = createSignOutCurrentDevice({
	browserReportsOnline,
	isServerAvailable,
	signOutRemote: () => authClient.signOut(),
	disableLocalAccess: (remoteSignOutPending) =>
		repository.disableActiveLocalAccess(remoteSignOutPending),
});

export async function flushPendingRemoteSignOut(): Promise<void> {
	const hasPending = await repository.hasPendingRemoteSignOut();

	if (!hasPending) {
		return;
	}

	const result = await authClient.signOut();

	if (!result.error) {
		await repository.clearPendingRemoteSignOut();
	}
}
