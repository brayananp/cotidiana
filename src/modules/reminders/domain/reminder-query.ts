import type { ReminderStatus, ReminderTargetType } from "./reminder";

export type ReminderQuery = {
	userId: string;
	statuses?: ReminderStatus[];
	targetTypes?: ReminderTargetType[];
	includeDeleted?: boolean;
	search?: string;
};
