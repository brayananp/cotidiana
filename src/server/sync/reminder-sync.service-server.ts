import { and, asc, eq, gt, isNull } from "drizzle-orm";
import {
	type PullReminderInput,
	type PushReminderInput,
	type PushReminderOperationInput,
	pullReminderInputSchema,
	pushReminderInputSchema,
	type ReminderSyncSnapshot,
	reminderDeletePayloadSchema,
	reminderSyncSnapshotSchema,
} from "@/platform/sync/reminder-sync.schemas";
import type {
	PullReminderChange,
	PushOperationResult,
	SyncOperationType,
} from "@/platform/sync/sync.types";
import { requireServerSession } from "@/server/auth/require-session-server";
import { db } from "@/server/database/client-server";
import { device } from "@/server/database/schema/device.schema";
import { reminder } from "@/server/database/schema/reminder.schema";
import {
	processedOperation,
	syncChange,
} from "@/server/database/schema/sync.schema";
import { attemptVersionedWrite } from "./versioned-write-server";

export async function pushReminderOperations(
	rawInput: PushReminderInput,
): Promise<{
	results: PushOperationResult[];
}> {
	const input = pushReminderInputSchema.parse(rawInput);

	const session = await requireServerSession();

	await requireRegisteredDevice(session.user.id, input.deviceId);

	const results = await db.transaction(async (transaction) => {
		const values: PushOperationResult[] = [];

		for (const operation of input.operations) {
			values.push(
				await processOperation(
					transaction,
					session.user.id,
					input.deviceId,
					operation,
				),
			);
		}

		return values;
	});

	return { results };
}

export async function pullReminderChanges(
	rawInput: PullReminderInput,
): Promise<{
	changes: PullReminderChange[];
	nextCursor: number;
	hasMore: boolean;
}> {
	const input = pullReminderInputSchema.parse(rawInput);

	const session = await requireServerSession();

	await requireRegisteredDevice(session.user.id, input.deviceId);

	const rows = await db
		.select()
		.from(syncChange)
		.where(
			and(
				eq(syncChange.userId, session.user.id),
				eq(syncChange.entityType, "reminder"),
				gt(syncChange.sequence, input.cursor),
			),
		)
		.orderBy(asc(syncChange.sequence))
		.limit(input.limit + 1);

	const hasMore = rows.length > input.limit;

	const selected = hasMore ? rows.slice(0, input.limit) : rows;

	const changes: PullReminderChange[] = selected.map((row) => ({
		sequence: row.sequence,
		entityType: "reminder",
		entityId: row.entityId,
		operation: parseOperationType(row.operation),
		version: row.version,
		payload: reminderSyncSnapshotSchema.parse(row.payload),
		createdAt: row.createdAt.toISOString(),
	}));

	return {
		changes,
		nextCursor: changes.at(-1)?.sequence ?? input.cursor,
		hasMore,
	};
}

type SyncTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function processOperation(
	transaction: SyncTransaction,
	userId: string,
	deviceId: string,
	operation: PushReminderOperationInput,
): Promise<PushOperationResult> {
	const [duplicate] = await transaction
		.select()
		.from(processedOperation)
		.where(
			and(
				eq(processedOperation.operationId, operation.operationId),
				eq(processedOperation.userId, userId),
			),
		)
		.limit(1);

	if (duplicate) {
		return {
			...(duplicate.result as PushOperationResult),
			duplicate: true,
		};
	}

	const [remote] = await transaction
		.select()
		.from(reminder)
		.where(
			and(eq(reminder.id, operation.entityId), eq(reminder.userId, userId)),
		)
		.limit(1);

	const result =
		operation.operation === "delete"
			? await processDelete(transaction, userId, operation, remote)
			: await processWrite(transaction, userId, operation, remote);

	await transaction.insert(processedOperation).values({
		operationId: operation.operationId,
		userId,
		deviceId,
		result,
		processedAt: new Date(),
	});

	return result;
}

async function processWrite(
	transaction: SyncTransaction,
	userId: string,
	operation: PushReminderOperationInput,
	remote: typeof reminder.$inferSelect | undefined,
): Promise<PushOperationResult> {
	const parsed = reminderSyncSnapshotSchema.safeParse(operation.payload);

	if (!parsed.success) {
		return rejected(operation, "INVALID_REMINDER_PAYLOAD");
	}

	if (parsed.data.id !== operation.entityId || parsed.data.userId !== userId) {
		return rejected(operation, "ENTITY_OR_USER_MISMATCH");
	}

	if (operation.operation === "create") {
		if (remote) {
			return conflict(operation, "REMINDER_ALREADY_EXISTS", toSnapshot(remote));
		}

		const now = new Date();

		const snapshot: ReminderSyncSnapshot = {
			...parsed.data,
			userId,
			version: 1,
			updatedAt: now.toISOString(),
		};

		await transaction.insert(reminder).values(snapshotToInsert(snapshot));

		await appendChange(transaction, userId, "create", snapshot, now);

		return applied(operation, snapshot);
	}

	if (!remote) {
		return rejected(operation, "REMINDER_NOT_FOUND");
	}

	if (remote.deletedAt) {
		return rejected(operation, "REMINDER_ALREADY_DELETED");
	}

	if (operation.baseVersion !== remote.version) {
		return conflict(operation, "VERSION_MISMATCH", toSnapshot(remote));
	}

	const now = new Date();

	const snapshot: ReminderSyncSnapshot = {
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
				.update(reminder)
				.set(snapshotToUpdate(snapshot))
				.where(
					and(
						eq(reminder.id, operation.entityId),
						eq(reminder.userId, userId),
						eq(reminder.version, expectedVersion),
					),
				)
				.returning();

			return updated ?? null;
		},
		loadCurrent: async () => {
			const [current] = await transaction
				.select()
				.from(reminder)
				.where(
					and(eq(reminder.id, operation.entityId), eq(reminder.userId, userId)),
				)
				.limit(1);

			return current ?? null;
		},
	});

	if (write.status === "stale") {
		return write.current
			? conflict(operation, "VERSION_MISMATCH", toSnapshot(write.current))
			: rejected(operation, "REMINDER_NOT_FOUND");
	}

	await appendChange(transaction, userId, "update", snapshot, now);

	return applied(operation, snapshot);
}

async function processDelete(
	transaction: SyncTransaction,
	userId: string,
	operation: PushReminderOperationInput,
	remote: typeof reminder.$inferSelect | undefined,
): Promise<PushOperationResult> {
	const parsed = reminderDeletePayloadSchema.safeParse(operation.payload);

	if (!parsed.success) {
		return rejected(operation, "INVALID_DELETE_PAYLOAD");
	}

	if (!remote) {
		return rejected(operation, "REMINDER_NOT_FOUND");
	}

	if (operation.baseVersion !== remote.version) {
		return conflict(operation, "VERSION_MISMATCH", toSnapshot(remote));
	}

	const now = new Date();

	const snapshot: ReminderSyncSnapshot = {
		...toSnapshot(remote),
		deletedAt: now.toISOString(),
		nextTriggerAt: null,
		updatedAt: now.toISOString(),
		version: remote.version + 1,
	};

	const write = await attemptVersionedWrite({
		expectedVersion: remote.version,
		writeIfVersion: async (expectedVersion) => {
			const [updated] = await transaction
				.update(reminder)
				.set({
					deletedAt: now,
					nextTriggerAt: null,
					updatedAt: now,
					version: snapshot.version,
				})
				.where(
					and(
						eq(reminder.id, remote.id),
						eq(reminder.userId, userId),
						eq(reminder.version, expectedVersion),
					),
				)
				.returning();

			return updated ?? null;
		},
		loadCurrent: async () => {
			const [current] = await transaction
				.select()
				.from(reminder)
				.where(and(eq(reminder.id, remote.id), eq(reminder.userId, userId)))
				.limit(1);

			return current ?? null;
		},
	});

	if (write.status === "stale") {
		return write.current
			? conflict(operation, "VERSION_MISMATCH", toSnapshot(write.current))
			: rejected(operation, "REMINDER_NOT_FOUND");
	}

	await appendChange(transaction, userId, "delete", snapshot, now);

	return applied(operation, snapshot);
}

async function appendChange(
	transaction: SyncTransaction,
	userId: string,
	operation: SyncOperationType,
	snapshot: ReminderSyncSnapshot,
	now: Date,
): Promise<void> {
	await transaction.insert(syncChange).values({
		userId,
		entityType: "reminder",
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
	operation: PushReminderOperationInput,
	snapshot: ReminderSyncSnapshot,
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
	operation: PushReminderOperationInput,
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
	operation: PushReminderOperationInput,
	reason: string,
	snapshot: ReminderSyncSnapshot,
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

function toSnapshot(row: typeof reminder.$inferSelect): ReminderSyncSnapshot {
	return {
		id: row.id,
		userId: row.userId,
		title: row.title,
		notes: row.notes,
		targetType: row.targetType,
		targetId: row.targetId,
		remindAt: row.remindAt.toISOString(),
		nextTriggerAt: row.nextTriggerAt?.toISOString() ?? null,
		snoozedUntil: row.snoozedUntil?.toISOString() ?? null,
		lastTriggeredAt: row.lastTriggeredAt?.toISOString() ?? null,
		recurrence: row.recurrence,
		repeatInterval: row.repeatInterval,
		timeZone: row.timeZone,
		status: row.status,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		deletedAt: row.deletedAt?.toISOString() ?? null,
		version: row.version,
	};
}

function snapshotToInsert(snapshot: ReminderSyncSnapshot) {
	return {
		id: snapshot.id,
		userId: snapshot.userId,
		title: snapshot.title,
		notes: snapshot.notes,
		targetType: snapshot.targetType,
		targetId: snapshot.targetId,
		remindAt: new Date(snapshot.remindAt),
		nextTriggerAt: snapshot.nextTriggerAt
			? new Date(snapshot.nextTriggerAt)
			: null,
		snoozedUntil: snapshot.snoozedUntil
			? new Date(snapshot.snoozedUntil)
			: null,
		lastTriggeredAt: snapshot.lastTriggeredAt
			? new Date(snapshot.lastTriggeredAt)
			: null,
		recurrence: snapshot.recurrence,
		repeatInterval: snapshot.repeatInterval,
		timeZone: snapshot.timeZone,
		status: snapshot.status,
		version: snapshot.version,
		createdAt: new Date(snapshot.createdAt),
		updatedAt: new Date(snapshot.updatedAt),
		deletedAt: snapshot.deletedAt ? new Date(snapshot.deletedAt) : null,
	};
}

function snapshotToUpdate(snapshot: ReminderSyncSnapshot) {
	const {
		id: _id,
		userId: _userId,
		createdAt: _createdAt,
		...values
	} = snapshotToInsert(snapshot);

	return values;
}

function parseOperationType(value: string): SyncOperationType {
	if (value === "create" || value === "update" || value === "delete") {
		return value;
	}

	throw new Error("INVALID_SYNC_OPERATION");
}
