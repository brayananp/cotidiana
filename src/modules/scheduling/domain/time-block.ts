import { assertValidScheduleInterval } from "./schedule-interval";

export const TIME_BLOCK_KINDS = ["task", "focus", "break", "personal"] as const;

export type TimeBlockKind = (typeof TIME_BLOCK_KINDS)[number];

export const TIME_BLOCK_STATUSES = [
	"planned",
	"completed",
	"cancelled",
] as const;

export type TimeBlockStatus = (typeof TIME_BLOCK_STATUSES)[number];

export type TimeBlock = {
	id: string;
	userId: string;
	taskId: string | null;
	title: string;
	notes: string | null;
	kind: TimeBlockKind;
	status: TimeBlockStatus;
	startAt: string;
	endAt: string;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	version: number;
};

export type CreateTimeBlockInput = {
	userId: string;
	taskId: string | null;
	title: string;
	notes: string | null;
	kind: TimeBlockKind;
	startAt: string;
	endAt: string;
};

export type UpdateTimeBlockInput = Omit<CreateTimeBlockInput, "userId">;

export function createTimeBlockEntity(
	input: CreateTimeBlockInput,
	now = new Date(),
): TimeBlock {
	assertValidScheduleInterval(input);

	const timestamp = now.toISOString();

	return {
		id: crypto.randomUUID(),
		userId: input.userId,
		taskId: input.taskId,
		title: normalizeTitle(input.title),
		notes: normalizeNullableText(input.notes),
		kind: input.kind,
		status: "planned",
		startAt: input.startAt,
		endAt: input.endAt,
		createdAt: timestamp,
		updatedAt: timestamp,
		deletedAt: null,
		version: 1,
	};
}

export function updateTimeBlockEntity(
	block: TimeBlock,
	input: UpdateTimeBlockInput,
	now = new Date(),
): TimeBlock {
	assertEditable(block);
	assertValidScheduleInterval(input);

	return {
		...block,
		taskId: input.taskId,
		title: normalizeTitle(input.title),
		notes: normalizeNullableText(input.notes),
		kind: input.kind,
		startAt: input.startAt,
		endAt: input.endAt,
		updatedAt: now.toISOString(),
		version: block.version + 1,
	};
}

export function changeTimeBlockStatus(
	block: TimeBlock,
	status: TimeBlockStatus,
	now = new Date(),
): TimeBlock {
	assertEditable(block);

	return {
		...block,
		status,
		updatedAt: now.toISOString(),
		version: block.version + 1,
	};
}

export function deleteTimeBlockEntity(
	block: TimeBlock,
	now = new Date(),
): TimeBlock {
	assertEditable(block);

	return {
		...block,
		deletedAt: now.toISOString(),
		updatedAt: now.toISOString(),
		version: block.version + 1,
	};
}

export function assertTimeBlockOwnership(
	block: TimeBlock,
	userId: string,
): void {
	if (block.userId !== userId) {
		throw new Error("TIME_BLOCK_FORBIDDEN");
	}
}

export function timeBlockBlocksSchedule(block: TimeBlock): boolean {
	return block.deletedAt === null && block.status !== "cancelled";
}

function assertEditable(block: TimeBlock): void {
	if (block.deletedAt) {
		throw new Error("TIME_BLOCK_ALREADY_DELETED");
	}
}

function normalizeTitle(value: string): string {
	const normalized = value.trim();

	if (!normalized) {
		throw new Error("TIME_BLOCK_TITLE_REQUIRED");
	}

	return normalized;
}

function normalizeNullableText(value: string | null): string | null {
	const normalized = value?.trim();
	return normalized ? normalized : null;
}
