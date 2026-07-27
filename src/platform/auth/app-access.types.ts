import type { AuthClientSession } from "./auth-client";

export type AppAccessMode =
	| "remote_authenticated"
	| "local_offline"
	| "local_remote_unavailable"
	| "reauthentication_required"
	| "unauthenticated";

export type LocalIdentitySnapshot = {
	userId: string;
	deviceId: string;
	name: string;
	email: string;
	offlineAccessEnabled: boolean;
	initializedAt: string;
	lastAuthenticatedAt: string;
};

export type AppAccess = {
	mode: AppAccessMode;
	canEnterApp: boolean;
	canSynchronize: boolean;
	requiresReauthentication: boolean;
	localIdentity: LocalIdentitySnapshot | null;
	remoteSession: AuthClientSession | null;
};
