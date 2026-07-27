import type {
	ReminderRecurrence,
	ReminderStatus,
	ReminderTargetType,
} from "../../domain/reminder";

export type ReminderRecord = {
	id: string;
	userId: string;
	title: string;
	notes: string | null;

	targetType: ReminderTargetType;
	targetId: string | null;

	remindAt: string;
	nextTriggerAt: string | null;
	snoozedUntil: string | null;
	lastTriggeredAt: string | null;

	recurrence: ReminderRecurrence;
	repeatInterval: number;
	timeZone: string;

	status: ReminderStatus;

	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	version: number;
};
