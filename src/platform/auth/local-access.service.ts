import {
	browserReportsOnline,
	isServerAvailable,
} from "@/platform/network/network-status";
import type { AuthClientSession } from "./auth-client";
import { authClient } from "./auth-client";
import { registerCurrentDevice } from "./device.functions";
import { LocalAccessRepository } from "./local-access.repository";

const repository = new LocalAccessRepository();

export async function provisionLocalAccess(
	session: AuthClientSession,
): Promise<void> {
	const device = await repository.getOrCreateDevice();
	const now = new Date().toISOString();

	let remoteRegisteredAt: string | null = null;

	try {
		const registration = await registerCurrentDevice({
			data: {
				deviceId: device.id,
				name: device.name,
				platform: device.platform,
			},
		});

		remoteRegisteredAt = registration.registeredAt;
	} catch {
		// The authenticated user can still initialize local access.
		// Device registration can be retried on a later navigation.
	}

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
}

export async function signOutCurrentDevice(): Promise<void> {
	const online = browserReportsOnline();
	const serverAvailable = online && (await isServerAvailable());

	let remoteSignOutPending = true;

	if (serverAvailable) {
		const result = await authClient.signOut();
		remoteSignOutPending = Boolean(result.error);
	}

	await repository.disableActiveLocalAccess(remoteSignOutPending);
}

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
