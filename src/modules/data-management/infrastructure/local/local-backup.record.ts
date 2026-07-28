import type { BackupReason, DataBackupPayload } from "../../domain/data-backup";

export type LocalBackupRecord = {
	id: string;
	userId: string;
	reason: BackupReason;
	label: string;
	schemaVersion: number;
	createdAt: string;
	sizeBytes: number;
	payload: DataBackupPayload;
};
