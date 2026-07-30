import { and, asc, eq, gt, isNull, lt, ne } from "drizzle-orm";
import {
	type CalendarEventSyncSnapshot,
	calendarEventSyncSnapshotSchema,
	type PullSchedulingInput,
	type PushSchedulingInput,
	type PushSchedulingOperationInput,
	pullSchedulingInputSchema,
	pushSchedulingInputSchema,
	schedulingDeletePayloadSchema,
	type TimeBlockSyncSnapshot,
	timeBlockSyncSnapshotSchema,
} from "@/platform/sync/scheduling-sync.schemas";
import type {
	PullSchedulingChange,
	PushOperationResult,
	SyncOperationType,
} from "@/platform/sync/sync.types";
import { requireServerSession } from "@/server/auth/require-session-server";
import { db } from "@/server/database/client-server";
import { device } from "@/server/database/schema/device.schema";
import {
	calendarEvent,
	timeBlock,
} from "@/server/database/schema/scheduling.schema";
import {
	processedOperation,
	syncChange,
} from "@/server/database/schema/sync.schema";
import { attemptVersionedWrite } from "./versioned-write-server";

export async function pushSchedulingOperations(
	rawInput: PushSchedulingInput,
): Promise<{
	results: PushOperationResult[];
}> {
	const input = pushSchedulingInputSchema.parse(rawInput);

	const session = await requireServerSession();
	const userId = session.user.id;

	await requireRegisteredDevice(userId, input.deviceId);

	const results = await db.transaction(async (transaction) => {
		const values: PushOperationResult[] = [];

		for (const operation of input.operations) {
			values.push(
				await processOperation(transaction, userId, input.deviceId, operation),
			);
		}

		return values;
	});

	return { results };
}

export async function pullSchedulingChanges(
	rawInput: PullSchedulingInput,
): Promise<{
	changes: PullSchedulingChange[];
	nextCursor: number;
	hasMore: boolean;
}> {
	const input = pullSchedulingInputSchema.parse(rawInput);

	const session = await requireServerSession();

	await requireRegisteredDevice(session.user.id, input.deviceId);

	const rows = await db
		.select()
		.from(syncChange)
		.where(
			and(
				eq(syncChange.userId, session.user.id),
				eq(syncChange.entityType, input.entityType),
				gt(syncChange.sequence, input.cursor),
			),
		)
		.orderBy(asc(syncChange.sequence))
		.limit(input.limit + 1);

	const hasMore = rows.length > input.limit;

	const selected = hasMore ? rows.slice(0, input.limit) : rows;

	const changes: PullSchedulingChange[] = selected.map((row) => ({
		sequence: row.sequence,
		entityType: input.entityType,
		entityId: row.entityId,
		operation: parseOperationType(row.operation),
		version: row.version,
		payload:
			input.entityType === "time_block"
				? timeBlockSyncSnapshotSchema.parse(row.payload)
				: calendarEventSyncSnapshotSchema.parse(row.payload),
		createdAt: row.createdAt.toISOString(),
	}));

	return {
		changes,
		nextCursor: changes.at(-1)?.sequence ?? input.cursor,
		hasMore,
	};
}

type SyncTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function loadTimeBlock(
	transaction: SyncTransaction,
	userId: string,
	entityId: string,
) {
	const [row] = await transaction
		.select()
		.from(timeBlock)
		.where(and(eq(timeBlock.id, entityId), eq(timeBlock.userId, userId)))
		.limit(1);

	return row;
}

async function loadCalendarEvent(
	transaction: SyncTransaction,
	userId: string,
	entityId: string,
) {
	const [row] = await transaction
		.select()
		.from(calendarEvent)
		.where(
			and(eq(calendarEvent.id, entityId), eq(calendarEvent.userId, userId)),
		)
		.limit(1);

	return row;
}

async function processOperation(
	transaction: SyncTransaction,
	userId: string,
	deviceId: string,
	operation: PushSchedulingOperationInput,
): Promise<PushOperationResult> {
	const [alreadyProcessed] = await transaction
		.select()
		.from(processedOperation)
		.where(
			and(
				eq(processedOperation.operationId, operation.operationId),
				eq(processedOperation.userId, userId),
			),
		)
		.limit(1);

	if (alreadyProcessed) {
		return {
			...(alreadyProcessed.result as PushOperationResult),
			duplicate: true,
		};
	}

	const result =
		operation.entityType === "time_block"
			? await processTimeBlockOperation(transaction, userId, operation)
			: await processCalendarEventOperation(transaction, userId, operation);

	await transaction.insert(processedOperation).values({
		operationId: operation.operationId,
		userId,
		deviceId,
		result,
		processedAt: new Date(),
	});

	return result;
}

async function processTimeBlockOperation(
	transaction: SyncTransaction,
	userId: string,
	operation: PushSchedulingOperationInput,
): Promise<PushOperationResult> {
	const remote = await loadTimeBlock(transaction, userId, operation.entityId);

	if (operation.operation === "delete") {
		return deleteTimeBlock(transaction, userId, operation, remote);
	}

	const parsed = timeBlockSyncSnapshotSchema.safeParse(operation.payload);

	if (!parsed.success) {
		return rejected(operation, "INVALID_TIME_BLOCK_PAYLOAD");
	}

	if (parsed.data.id !== operation.entityId || parsed.data.userId !== userId) {
		return rejected(operation, "ENTITY_OR_USER_MISMATCH");
	}

	if (operation.operation === "create") {
		if (remote) {
			return conflict(
				operation,
				"TIME_BLOCK_ALREADY_EXISTS",
				toTimeBlockSnapshot(remote),
			);
		}

		const overlapping =
			parsed.data.status === "cancelled"
				? null
				: await findOverlap(
						transaction,
						userId,
						parsed.data.startAt,
						parsed.data.endAt,
					);

		if (overlapping) {
			return conflictWithOverlap(operation, overlapping);
		}

		const now = new Date();

		const snapshot: TimeBlockSyncSnapshot = {
			...parsed.data,
			userId,
			version: 1,
			updatedAt: now.toISOString(),
		};

		await transaction
			.insert(timeBlock)
			.values(timeBlockSnapshotToInsert(snapshot));

		await appendChange(
			transaction,
			userId,
			"time_block",
			"create",
			snapshot,
			now,
		);

		return applied(operation, snapshot);
	}

	if (!remote) {
		return rejected(operation, "TIME_BLOCK_NOT_FOUND");
	}

	if (remote.deletedAt) {
		return rejected(operation, "TIME_BLOCK_ALREADY_DELETED");
	}

	if (operation.baseVersion !== remote.version) {
		return conflict(operation, "VERSION_MISMATCH", toTimeBlockSnapshot(remote));
	}

	const overlapping =
		parsed.data.status === "cancelled"
			? null
			: await findOverlap(
					transaction,
					userId,
					parsed.data.startAt,
					parsed.data.endAt,
					{
						entityType: "time_block",
						entityId: remote.id,
					},
				);

	if (overlapping) {
		return conflictWithOverlap(operation, overlapping);
	}

	const now = new Date();

	const snapshot: TimeBlockSyncSnapshot = {
		...parsed.data,
		userId,
		createdAt: remote.createdAt.toISOString(),
		updatedAt: now.toISOString(),
		version: remote.version + 1,
	};

	const write = await attemptVersionedWrite({
		expectedVersion: remote.version,
		writeIfVersion: async (expectedVersion) => {
			const [updated] = await transaction
				.update(timeBlock)
				.set(timeBlockSnapshotToUpdate(snapshot))
				.where(
					and(
						eq(timeBlock.id, operation.entityId),
						eq(timeBlock.userId, userId),
						eq(timeBlock.version, expectedVersion),
					),
				)
				.returning();

			return updated ?? null;
		},
		loadCurrent: async () =>
			(await loadTimeBlock(transaction, userId, operation.entityId)) ?? null,
	});

	if (write.status === "stale") {
		return write.current
			? conflict(
					operation,
					"VERSION_MISMATCH",
					toTimeBlockSnapshot(write.current),
				)
			: rejected(operation, "TIME_BLOCK_NOT_FOUND");
	}

	await appendChange(
		transaction,
		userId,
		"time_block",
		"update",
		snapshot,
		now,
	);

	return applied(operation, snapshot);
}

async function processCalendarEventOperation(
	transaction: SyncTransaction,
	userId: string,
	operation: PushSchedulingOperationInput,
): Promise<PushOperationResult> {
	const remote = await loadCalendarEvent(
		transaction,
		userId,
		operation.entityId,
	);

	if (operation.operation === "delete") {
		return deleteCalendarEvent(transaction, userId, operation, remote);
	}

	const parsed = calendarEventSyncSnapshotSchema.safeParse(operation.payload);

	if (!parsed.success) {
		return rejected(operation, "INVALID_CALENDAR_EVENT_PAYLOAD");
	}

	if (parsed.data.id !== operation.entityId || parsed.data.userId !== userId) {
		return rejected(operation, "ENTITY_OR_USER_MISMATCH");
	}

	if (operation.operation === "create") {
		if (remote) {
			return conflict(
				operation,
				"CALENDAR_EVENT_ALREADY_EXISTS",
				toCalendarEventSnapshot(remote),
			);
		}

		const overlapping = await findOverlap(
			transaction,
			userId,
			parsed.data.startAt,
			parsed.data.endAt,
		);

		if (overlapping) {
			return conflictWithOverlap(operation, overlapping);
		}

		const now = new Date();

		const snapshot: CalendarEventSyncSnapshot = {
			...parsed.data,
			userId,
			version: 1,
			updatedAt: now.toISOString(),
		};

		await transaction
			.insert(calendarEvent)
			.values(calendarEventSnapshotToInsert(snapshot));

		await appendChange(
			transaction,
			userId,
			"calendar_event",
			"create",
			snapshot,
			now,
		);

		return applied(operation, snapshot);
	}

	if (!remote) {
		return rejected(operation, "CALENDAR_EVENT_NOT_FOUND");
	}

	if (remote.deletedAt) {
		return rejected(operation, "CALENDAR_EVENT_ALREADY_DELETED");
	}

	if (operation.baseVersion !== remote.version) {
		return conflict(
			operation,
			"VERSION_MISMATCH",
			toCalendarEventSnapshot(remote),
		);
	}

	const overlapping = await findOverlap(
		transaction,
		userId,
		parsed.data.startAt,
		parsed.data.endAt,
		{
			entityType: "calendar_event",
			entityId: remote.id,
		},
	);

	if (overlapping) {
		return conflictWithOverlap(operation, overlapping);
	}

	const now = new Date();

	const snapshot: CalendarEventSyncSnapshot = {
		...parsed.data,
		userId,
		createdAt: remote.createdAt.toISOString(),
		updatedAt: now.toISOString(),
		version: remote.version + 1,
	};

	const write = await attemptVersionedWrite({
		expectedVersion: remote.version,
		writeIfVersion: async (expectedVersion) => {
			const [updated] = await transaction
				.update(calendarEvent)
				.set(calendarEventSnapshotToUpdate(snapshot))
				.where(
					and(
						eq(calendarEvent.id, operation.entityId),
						eq(calendarEvent.userId, userId),
						eq(calendarEvent.version, expectedVersion),
					),
				)
				.returning();

			return updated ?? null;
		},
		loadCurrent: async () =>
			(await loadCalendarEvent(transaction, userId, operation.entityId)) ??
			null,
	});

	if (write.status === "stale") {
		return write.current
			? conflict(
					operation,
					"VERSION_MISMATCH",
					toCalendarEventSnapshot(write.current),
				)
			: rejected(operation, "CALENDAR_EVENT_NOT_FOUND");
	}

	await appendChange(
		transaction,
		userId,
		"calendar_event",
		"update",
		snapshot,
		now,
	);

	return applied(operation, snapshot);
}

async function deleteTimeBlock(
	transaction: SyncTransaction,
	userId: string,
	operation: PushSchedulingOperationInput,
	remote: typeof timeBlock.$inferSelect | undefined,
): Promise<PushOperationResult> {
	const parsed = schedulingDeletePayloadSchema.safeParse(operation.payload);

	if (!parsed.success) {
		return rejected(operation, "INVALID_DELETE_PAYLOAD");
	}

	if (!remote) {
		return rejected(operation, "TIME_BLOCK_NOT_FOUND");
	}

	if (operation.baseVersion !== remote.version) {
		return conflict(operation, "VERSION_MISMATCH", toTimeBlockSnapshot(remote));
	}

	const now = new Date();

	const snapshot: TimeBlockSyncSnapshot = {
		...toTimeBlockSnapshot(remote),
		deletedAt: now.toISOString(),
		updatedAt: now.toISOString(),
		version: remote.version + 1,
	};

	const write = await attemptVersionedWrite({
		expectedVersion: remote.version,
		writeIfVersion: async (expectedVersion) => {
			const [updated] = await transaction
				.update(timeBlock)
				.set({
					deletedAt: now,
					updatedAt: now,
					version: snapshot.version,
				})
				.where(
					and(
						eq(timeBlock.id, remote.id),
						eq(timeBlock.userId, userId),
						eq(timeBlock.version, expectedVersion),
					),
				)
				.returning();

			return updated ?? null;
		},
		loadCurrent: async () =>
			(await loadTimeBlock(transaction, userId, remote.id)) ?? null,
	});

	if (write.status === "stale") {
		return write.current
			? conflict(
					operation,
					"VERSION_MISMATCH",
					toTimeBlockSnapshot(write.current),
				)
			: rejected(operation, "TIME_BLOCK_NOT_FOUND");
	}

	await appendChange(
		transaction,
		userId,
		"time_block",
		"delete",
		snapshot,
		now,
	);

	return applied(operation, snapshot);
}

async function deleteCalendarEvent(
	transaction: SyncTransaction,
	userId: string,
	operation: PushSchedulingOperationInput,
	remote: typeof calendarEvent.$inferSelect | undefined,
): Promise<PushOperationResult> {
	const parsed = schedulingDeletePayloadSchema.safeParse(operation.payload);

	if (!parsed.success) {
		return rejected(operation, "INVALID_DELETE_PAYLOAD");
	}

	if (!remote) {
		return rejected(operation, "CALENDAR_EVENT_NOT_FOUND");
	}

	if (operation.baseVersion !== remote.version) {
		return conflict(
			operation,
			"VERSION_MISMATCH",
			toCalendarEventSnapshot(remote),
		);
	}

	const now = new Date();

	const snapshot: CalendarEventSyncSnapshot = {
		...toCalendarEventSnapshot(remote),
		deletedAt: now.toISOString(),
		updatedAt: now.toISOString(),
		version: remote.version + 1,
	};

	const write = await attemptVersionedWrite({
		expectedVersion: remote.version,
		writeIfVersion: async (expectedVersion) => {
			const [updated] = await transaction
				.update(calendarEvent)
				.set({
					deletedAt: now,
					updatedAt: now,
					version: snapshot.version,
				})
				.where(
					and(
						eq(calendarEvent.id, remote.id),
						eq(calendarEvent.userId, userId),
						eq(calendarEvent.version, expectedVersion),
					),
				)
				.returning();

			return updated ?? null;
		},
		loadCurrent: async () =>
			(await loadCalendarEvent(transaction, userId, remote.id)) ?? null,
	});

	if (write.status === "stale") {
		return write.current
			? conflict(
					operation,
					"VERSION_MISMATCH",
					toCalendarEventSnapshot(write.current),
				)
			: rejected(operation, "CALENDAR_EVENT_NOT_FOUND");
	}

	await appendChange(
		transaction,
		userId,
		"calendar_event",
		"delete",
		snapshot,
		now,
	);

	return applied(operation, snapshot);
}

type OverlapResult = {
	entityType: "time_block" | "calendar_event";
	version: number;
	payload: TimeBlockSyncSnapshot | CalendarEventSyncSnapshot;
};

async function findOverlap(
	transaction: SyncTransaction,
	userId: string,
	startAt: string,
	endAt: string,
	excluded?: {
		entityType: "time_block" | "calendar_event";
		entityId: string;
	},
): Promise<OverlapResult | null> {
	const start = new Date(startAt);
	const end = new Date(endAt);

	const blockCondition =
		excluded?.entityType === "time_block"
			? and(
					eq(timeBlock.userId, userId),
					isNull(timeBlock.deletedAt),
					ne(timeBlock.status, "cancelled"),
					lt(timeBlock.startAt, end),
					gt(timeBlock.endAt, start),
					ne(timeBlock.id, excluded.entityId),
				)
			: and(
					eq(timeBlock.userId, userId),
					isNull(timeBlock.deletedAt),
					ne(timeBlock.status, "cancelled"),
					lt(timeBlock.startAt, end),
					gt(timeBlock.endAt, start),
				);

	const [block] = await transaction
		.select()
		.from(timeBlock)
		.where(blockCondition)
		.limit(1);

	if (block) {
		return {
			entityType: "time_block",
			version: block.version,
			payload: toTimeBlockSnapshot(block),
		};
	}

	const eventCondition =
		excluded?.entityType === "calendar_event"
			? and(
					eq(calendarEvent.userId, userId),
					isNull(calendarEvent.deletedAt),
					lt(calendarEvent.startAt, end),
					gt(calendarEvent.endAt, start),
					ne(calendarEvent.id, excluded.entityId),
				)
			: and(
					eq(calendarEvent.userId, userId),
					isNull(calendarEvent.deletedAt),
					lt(calendarEvent.startAt, end),
					gt(calendarEvent.endAt, start),
				);

	const [event] = await transaction
		.select()
		.from(calendarEvent)
		.where(eventCondition)
		.limit(1);

	if (!event) {
		return null;
	}

	return {
		entityType: "calendar_event",
		version: event.version,
		payload: toCalendarEventSnapshot(event),
	};
}

async function appendChange(
	transaction: SyncTransaction,
	userId: string,
	entityType: "time_block" | "calendar_event",
	operation: SyncOperationType,
	snapshot: TimeBlockSyncSnapshot | CalendarEventSyncSnapshot,
	now: Date,
): Promise<void> {
	await transaction.insert(syncChange).values({
		userId,
		entityType,
		entityId: snapshot.id,
		operation,
		version: snapshot.version,
		payload: snapshot,
		createdAt: now,
	});
}

async function requireRegisteredDevice(
	userId: string,
	deviceId: string,
): Promise<void> {
	const [registered] = await db
		.select()
		.from(device)
		.where(
			and(
				eq(device.id, deviceId),
				eq(device.userId, userId),
				isNull(device.revokedAt),
			),
		)
		.limit(1);

	if (!registered) {
		throw new Error("DEVICE_NOT_REGISTERED");
	}
}

function applied(
	operation: PushSchedulingOperationInput,
	snapshot: TimeBlockSyncSnapshot | CalendarEventSyncSnapshot,
): PushOperationResult {
	return {
		operationId: operation.operationId,
		entityId: operation.entityId,
		status: "applied",
		duplicate: false,
		version: snapshot.version,
		serverPayload: snapshot,
	};
}

function rejected(
	operation: PushSchedulingOperationInput,
	reason: string,
): PushOperationResult {
	return {
		operationId: operation.operationId,
		entityId: operation.entityId,
		status: "rejected",
		duplicate: false,
		reason,
	};
}

function conflict(
	operation: PushSchedulingOperationInput,
	reason: string,
	snapshot: TimeBlockSyncSnapshot | CalendarEventSyncSnapshot,
): PushOperationResult {
	return {
		operationId: operation.operationId,
		entityId: operation.entityId,
		status: "conflict",
		duplicate: false,
		reason,
		serverVersion: snapshot.version,
		serverPayload: snapshot,
	};
}

function conflictWithOverlap(
	operation: PushSchedulingOperationInput,
	overlap: OverlapResult,
): PushOperationResult {
	return {
		operationId: operation.operationId,
		entityId: operation.entityId,
		status: "conflict",
		duplicate: false,
		reason: `SCHEDULE_OVERLAP:${overlap.entityType}`,
		serverVersion: overlap.version,
		serverPayload: overlap.payload,
	};
}

function toTimeBlockSnapshot(
	row: typeof timeBlock.$inferSelect,
): TimeBlockSyncSnapshot {
	return {
		id: row.id,
		userId: row.userId,
		taskId: row.taskId,
		title: row.title,
		notes: row.notes,
		kind: row.kind,
		status: row.status,
		startAt: row.startAt.toISOString(),
		endAt: row.endAt.toISOString(),
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		deletedAt: row.deletedAt?.toISOString() ?? null,
		version: row.version,
	};
}

function toCalendarEventSnapshot(
	row: typeof calendarEvent.$inferSelect,
): CalendarEventSyncSnapshot {
	return {
		id: row.id,
		userId: row.userId,
		title: row.title,
		notes: row.notes,
		location: row.location,
		eventType: row.eventType,
		startAt: row.startAt.toISOString(),
		endAt: row.endAt.toISOString(),
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		deletedAt: row.deletedAt?.toISOString() ?? null,
		version: row.version,
	};
}

function timeBlockSnapshotToInsert(snapshot: TimeBlockSyncSnapshot) {
	return {
		id: snapshot.id,
		userId: snapshot.userId,
		taskId: snapshot.taskId,
		title: snapshot.title,
		notes: snapshot.notes,
		kind: snapshot.kind,
		status: snapshot.status,
		startAt: new Date(snapshot.startAt),
		endAt: new Date(snapshot.endAt),
		version: snapshot.version,
		createdAt: new Date(snapshot.createdAt),
		updatedAt: new Date(snapshot.updatedAt),
		deletedAt: snapshot.deletedAt ? new Date(snapshot.deletedAt) : null,
	};
}

function timeBlockSnapshotToUpdate(snapshot: TimeBlockSyncSnapshot) {
	return {
		taskId: snapshot.taskId,
		title: snapshot.title,
		notes: snapshot.notes,
		kind: snapshot.kind,
		status: snapshot.status,
		startAt: new Date(snapshot.startAt),
		endAt: new Date(snapshot.endAt),
		version: snapshot.version,
		updatedAt: new Date(snapshot.updatedAt),
		deletedAt: snapshot.deletedAt ? new Date(snapshot.deletedAt) : null,
	};
}

function calendarEventSnapshotToInsert(snapshot: CalendarEventSyncSnapshot) {
	return {
		id: snapshot.id,
		userId: snapshot.userId,
		title: snapshot.title,
		notes: snapshot.notes,
		location: snapshot.location,
		eventType: snapshot.eventType,
		startAt: new Date(snapshot.startAt),
		endAt: new Date(snapshot.endAt),
		version: snapshot.version,
		createdAt: new Date(snapshot.createdAt),
		updatedAt: new Date(snapshot.updatedAt),
		deletedAt: snapshot.deletedAt ? new Date(snapshot.deletedAt) : null,
	};
}

function calendarEventSnapshotToUpdate(snapshot: CalendarEventSyncSnapshot) {
	return {
		title: snapshot.title,
		notes: snapshot.notes,
		location: snapshot.location,
		eventType: snapshot.eventType,
		startAt: new Date(snapshot.startAt),
		endAt: new Date(snapshot.endAt),
		version: snapshot.version,
		updatedAt: new Date(snapshot.updatedAt),
		deletedAt: snapshot.deletedAt ? new Date(snapshot.deletedAt) : null,
	};
}

function parseOperationType(value: string): SyncOperationType {
	if (value === "create" || value === "update" || value === "delete") {
		return value;
	}

	throw new Error("INVALID_SYNC_OPERATION");
}
