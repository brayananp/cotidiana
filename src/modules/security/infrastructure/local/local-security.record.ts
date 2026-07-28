export type LocalSecurityProfileRecord = {
	id: string;
	userId: string;
	enabled: boolean;
	pinSalt: string | null;
	pinHash: string | null;
	pinIterations: number;
	failedAttempts: number;
	lockedUntil: string | null;
	autoLockMinutes: number;
	lockOnBackground: boolean;
	lastUnlockedAt: string | null;
	createdAt: string;
	updatedAt: string;
};
