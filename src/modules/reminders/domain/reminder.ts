export const REMINDER_TARGET_TYPES = [
	"custom",
	"task",
	"time_block",
	"calendar_event",
] as const;

export type ReminderTargetType = (typeof REMINDER_TARGET_TYPES)[number];

export const REMINDER_STATUSES = [
	"scheduled",
	"snoozed",
	"triggered",
	"dismissed",
	"cancelled",
] as const;

export type ReminderStatus = (typeof REMINDER_STATUSES)[number];

export const REMINDER_RECURRENCES = [
	"none",
	"daily",
	"weekly",
	"monthly",
] as const;

export type ReminderRecurrence = (typeof REMINDER_RECURRENCES)[number];

export type Reminder = {
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

export type CreateReminderEntityInput = {
	userId: string;
	title: string;
	notes: string | null;
	targetType: ReminderTargetType;
	targetId: string | null;
	remindAt: string;
	recurrence: ReminderRecurrence;
	repeatInterval: number;
	timeZone: string;
};

export type UpdateReminderEntityInput = Omit<
	CreateReminderEntityInput,
	"userId"
>;

export function createReminderEntity(
	input: CreateReminderEntityInput,
	now = new Date(),
): Reminder {
	assertReminderDate(input.remindAt);
	assertRepeatInterval(input.recurrence, input.repeatInterval);
	assertTarget(input.targetType, input.targetId);

	const timestamp = now.toISOString();

	return {
		id: crypto.randomUUID(),
		userId: input.userId,
		title: normalizeTitle(input.title),
		notes: normalizeNullableText(input.notes),
		targetType: input.targetType,
		targetId: input.targetType === "custom" ? null : input.targetId,
		remindAt: input.remindAt,
		nextTriggerAt: input.remindAt,
		snoozedUntil: null,
		lastTriggeredAt: null,
		recurrence: input.recurrence,
		repeatInterval: input.recurrence === "none" ? 1 : input.repeatInterval,
		timeZone: input.timeZone,
		status: "scheduled",
		createdAt: timestamp,
		updatedAt: timestamp,
		deletedAt: null,
		version: 1,
	};
}

export function updateReminderEntity(
	reminder: Reminder,
	input: UpdateReminderEntityInput,
	now = new Date(),
): Reminder {
	assertEditable(reminder);
	assertReminderDate(input.remindAt);
	assertRepeatInterval(input.recurrence, input.repeatInterval);
	assertTarget(input.targetType, input.targetId);

	return {
		...reminder,
		title: normalizeTitle(input.title),
		notes: normalizeNullableText(input.notes),
		targetType: input.targetType,
		targetId: input.targetType === "custom" ? null : input.targetId,
		remindAt: input.remindAt,
		nextTriggerAt: input.remindAt,
		snoozedUntil: null,
		recurrence: input.recurrence,
		repeatInterval: input.recurrence === "none" ? 1 : input.repeatInterval,
		timeZone: input.timeZone,
		status: "scheduled",
		updatedAt: now.toISOString(),
		version: reminder.version + 1,
	};
}

export function snoozeReminderEntity(
	reminder: Reminder,
	minutes: number,
	now = new Date(),
): Reminder {
	assertEditable(reminder);

	if (!Number.isInteger(minutes) || minutes <= 0) {
		throw new Error("INVALID_SNOOZE_MINUTES");
	}

	const snoozedUntil = new Date(now.getTime() + minutes * 60_000).toISOString();

	return {
		...reminder,
		status: "snoozed",
		snoozedUntil,
		nextTriggerAt: snoozedUntil,
		updatedAt: now.toISOString(),
		version: reminder.version + 1,
	};
}

export function dismissReminderEntity(
	reminder: Reminder,
	now = new Date(),
): Reminder {
	assertEditable(reminder);

	return {
		...reminder,
		status: "dismissed",
		nextTriggerAt: null,
		snoozedUntil: null,
		updatedAt: now.toISOString(),
		version: reminder.version + 1,
	};
}

export function cancelReminderEntity(
	reminder: Reminder,
	now = new Date(),
): Reminder {
	assertEditable(reminder);

	return {
		...reminder,
		status: "cancelled",
		nextTriggerAt: null,
		snoozedUntil: null,
		updatedAt: now.toISOString(),
		version: reminder.version + 1,
	};
}

export function deleteReminderEntity(
	reminder: Reminder,
	now = new Date(),
): Reminder {
	assertEditable(reminder);

	return {
		...reminder,
		deletedAt: now.toISOString(),
		nextTriggerAt: null,
		updatedAt: now.toISOString(),
		version: reminder.version + 1,
	};
}

export function triggerReminderEntity(
	reminder: Reminder,
	now = new Date(),
): Reminder {
	assertEditable(reminder);

	if (!isReminderActive(reminder)) {
		throw new Error("REMINDER_NOT_ACTIVE");
	}

	if (reminder.recurrence === "none") {
		return {
			...reminder,
			status: "triggered",
			nextTriggerAt: null,
			snoozedUntil: null,
			lastTriggeredAt: now.toISOString(),
			updatedAt: now.toISOString(),
			version: reminder.version + 1,
		};
	}

	const nextTriggerAt = calculateNextOccurrence(
		reminder.nextTriggerAt ?? reminder.remindAt,
		reminder.recurrence,
		reminder.repeatInterval,
		now,
	);

	return {
		...reminder,
		status: "scheduled",
		nextTriggerAt,
		snoozedUntil: null,
		lastTriggeredAt: now.toISOString(),
		updatedAt: now.toISOString(),
		version: reminder.version + 1,
	};
}

export function isReminderActive(reminder: Reminder): boolean {
	return (
		reminder.deletedAt === null &&
		(reminder.status === "scheduled" || reminder.status === "snoozed") &&
		reminder.nextTriggerAt !== null
	);
}

export function isReminderDue(reminder: Reminder, now = new Date()): boolean {
	if (!isReminderActive(reminder)) {
		return false;
	}

	const nextTrigger = reminder.nextTriggerAt;
	if (nextTrigger === null) {
		return false;
	}

	return new Date(nextTrigger).getTime() <= now.getTime();
}

export function assertReminderOwnership(
	reminder: Reminder,
	userId: string,
): void {
	if (reminder.userId !== userId) {
		throw new Error("REMINDER_FORBIDDEN");
	}
}

export function calculateNextOccurrence(
	fromIso: string,
	recurrence: Exclude<ReminderRecurrence, "none">,
	repeatInterval: number,
	now = new Date(),
): string {
	assertRepeatInterval(recurrence, repeatInterval);

	const next = new Date(fromIso);
	const monthlyAnchorDay = next.getDate();

	if (Number.isNaN(next.getTime())) {
		throw new Error("INVALID_REMINDER_DATE");
	}

	do {
		if (recurrence === "daily") {
			next.setDate(next.getDate() + repeatInterval);
		} else if (recurrence === "weekly") {
			next.setDate(next.getDate() + repeatInterval * 7);
		} else {
			next.setDate(1);
			next.setMonth(next.getMonth() + repeatInterval);

			const lastDay = new Date(
				next.getFullYear(),
				next.getMonth() + 1,
				0,
			).getDate();

			next.setDate(Math.min(monthlyAnchorDay, lastDay));
		}
	} while (next.getTime() <= now.getTime());

	return next.toISOString();
}

function assertReminderDate(value: string): void {
	if (Number.isNaN(new Date(value).getTime())) {
		throw new Error("INVALID_REMINDER_DATE");
	}
}

function assertRepeatInterval(
	recurrence: ReminderRecurrence,
	value: number,
): void {
	if (
		recurrence !== "none" &&
		(!Number.isInteger(value) || value < 1 || value > 365)
	) {
		throw new Error("INVALID_REPEAT_INTERVAL");
	}
}

function assertTarget(
	targetType: ReminderTargetType,
	targetId: string | null,
): void {
	if (targetType !== "custom" && !targetId) {
		throw new Error("REMINDER_TARGET_REQUIRED");
	}
}

function assertEditable(reminder: Reminder): void {
	if (reminder.deletedAt) {
		throw new Error("REMINDER_ALREADY_DELETED");
	}
}

function normalizeTitle(value: string): string {
	const normalized = value.trim();

	if (!normalized) {
		throw new Error("REMINDER_TITLE_REQUIRED");
	}

	return normalized;
}

function normalizeNullableText(value: string | null): string | null {
	const normalized = value?.trim();
	return normalized ? normalized : null;
}
