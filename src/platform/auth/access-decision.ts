import type { AppAccess, LocalIdentitySnapshot } from "./app-access.types";
import type { AuthClientSession } from "./auth-client";

type AccessDecisionInput = {
	localIdentity: LocalIdentitySnapshot | null;
	browserReportsOnline: boolean;
	serverAvailable: boolean;
	remoteSession: AuthClientSession | null;
};

export function decideAppAccess({
	localIdentity,
	browserReportsOnline,
	serverAvailable,
	remoteSession,
}: AccessDecisionInput): AppAccess {
	if (serverAvailable && remoteSession) {
		return {
			mode: "remote_authenticated",
			canEnterApp: true,
			canSynchronize: true,
			requiresReauthentication: false,
			localIdentity,
			remoteSession,
		};
	}

	const hasLocalAccess = localIdentity?.offlineAccessEnabled === true;

	if (!hasLocalAccess) {
		return {
			mode: "unauthenticated",
			canEnterApp: false,
			canSynchronize: false,
			requiresReauthentication: false,
			localIdentity: null,
			remoteSession: null,
		};
	}

	if (!browserReportsOnline) {
		return {
			mode: "local_offline",
			canEnterApp: true,
			canSynchronize: false,
			requiresReauthentication: false,
			localIdentity,
			remoteSession: null,
		};
	}

	if (!serverAvailable) {
		return {
			mode: "local_remote_unavailable",
			canEnterApp: true,
			canSynchronize: false,
			requiresReauthentication: false,
			localIdentity,
			remoteSession: null,
		};
	}

	return {
		mode: "reauthentication_required",
		canEnterApp: true,
		canSynchronize: false,
		requiresReauthentication: true,
		localIdentity,
		remoteSession: null,
	};
}
