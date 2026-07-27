import type { SyncOperationType } from "@/platform/sync/sync.types";
import type { Reminder } from "../../domain/reminder";

export type ReminderCommitResult =
	| {
			type: "queued";
			operationId: string;
	  }
	| {
			type: "removed_local_only";
	  };

export interface ReminderWriteStore {
	commit(
		reminder: Reminder,
		operation: SyncOperationType,
		deviceId: string,
	): Promise<ReminderCommitResult>;

	claimDue(userId: string, deviceId: string, now?: Date): Promise<Reminder[]>;
}
