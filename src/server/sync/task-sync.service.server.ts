import { and, asc, eq, gt, isNull } from "drizzle-orm";
import {
	type PullTasksInput,
	type PushTaskOperationInput,
	type PushTasksInput,
	pullTasksInputSchema,
	pushTasksInputSchema,
	type TaskSyncSnapshot,
	taskDeletePayloadSchema,
	taskSyncSnapshotSchema,
} from "@/platform/sync/sync.schemas";
import type {
	PullTaskChange,
	PushOperationResult,
} from "@/platform/sync/sync.types";
import { requireServerSession } from "@/server/auth/require-session.server";
import { db } from "@/server/database/client.server";
import { device } from "@/server/database/schema/device.schema";
import {
	processedOperation,
	syncChange,
} from "@/server/database/schema/sync.schema";
import { task } from "@/server/database/schema/task.schema";

export async function pushTaskOperations(rawInput: PushTasksInput): Promise<{
	results: PushOperationResult[];
}> {
	const input = pushTasksInputSchema.parse(rawInput);
	const session = await requireServerSession();
	const userId = session.user.id;

	await requireRegisteredDevice(userId, input.deviceId);

	const results = await db.transaction(async (transaction) => {
		const batchResults: PushOperationResult[] = [];

		for (const operation of input.operations) {
			const result = await processOperation(
				transaction,
				userId,
				input.deviceId,
				operation,
			);

			batchResults.push(result);
		}

		return batchResults;
	});

	return { results };
}

export async function pullTaskChanges(rawInput: PullTasksInput): Promise<{
	changes: PullTaskChange[];
	nextCursor: number;
	hasMore: boolean;
}> {
	const input = pullTasksInputSchema.parse(rawInput);
	const session = await requireServerSession();

	await requireRegisteredDevice(session.user.id, input.deviceId);

	const rows = await db
		.select()
		.from(syncChange)
		.where(
			and(
				eq(syncChange.userId, session.user.id),
				eq(syncChange.entityType, "task"),
				gt(syncChange.sequence, input.cursor),
			),
		)
		.orderBy(asc(syncChange.sequence))
		.limit(input.limit + 1);

	const hasMore = rows.length > input.limit;
	const selected = hasMore ? rows.slice(0, input.limit) : rows;

	const changes: PullTaskChange[] = selected.map((row) => ({
		sequence: row.sequence,
		entityType: "task",
		entityId: row.entityId,
		operation: parseOperationType(row.operation),
		version: row.version,
		payload: taskSyncSnapshotSchema.parse(row.payload),
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
	operation: PushTaskOperationInput,
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
		const stored = parseStoredResult(alreadyProcessed.result);

		return {
			...stored,
			duplicate: true,
		};
	}

	const [remoteTask] = await transaction
		.select()
		.from(task)
		.where(and(eq(task.id, operation.entityId), eq(task.userId, userId)))
		.limit(1);

	let result: PushOperationResult;

	if (operation.operation === "create") {
		result = await applyCreate(transaction, userId, operation, remoteTask);
	} else if (operation.operation === "update") {
		result = await applyUpdate(transaction, userId, operation, remoteTask);
	} else {
		result = await applyDelete(transaction, userId, operation, remoteTask);
	}

	await transaction.insert(processedOperation).values({
		operationId: operation.operationId,
		userId,
		deviceId,
		result,
		processedAt: new Date(),
	});

	return result;
}

async function applyCreate(
	transaction: SyncTransaction,
	userId: string,
	operation: PushTaskOperationInput,
	remoteTask: typeof task.$inferSelect | undefined,
): Promise<PushOperationResult> {
	const parsed = taskSyncSnapshotSchema.safeParse(operation.payload);

	if (!parsed.success) {
		return rejected(operation, "INVALID_CREATE_PAYLOAD");
	}

	if (parsed.data.id !== operation.entityId || parsed.data.userId !== userId) {
		return rejected(operation, "ENTITY_OR_USER_MISMATCH");
	}

	if (remoteTask) {
		return conflict(operation, "TASK_ALREADY_EXISTS", toSnapshot(remoteTask));
	}

	const now = new Date();
	const snapshot: TaskSyncSnapshot = {
		...parsed.data,
		userId,
		version: 1,
		updatedAt: now.toISOString(),
	};

	await transaction.insert(task).values(snapshotToInsert(snapshot));

	await appendChange(transaction, userId, "create", snapshot, now);

	return applied(operation, snapshot);
}

async function applyUpdate(
	transaction: SyncTransaction,
	userId: string,
	operation: PushTaskOperationInput,
	remoteTask: typeof task.$inferSelect | undefined,
): Promise<PushOperationResult> {
	const parsed = taskSyncSnapshotSchema.safeParse(operation.payload);

	if (!parsed.success) {
		return rejected(operation, "INVALID_UPDATE_PAYLOAD");
	}

	if (parsed.data.id !== operation.entityId || parsed.data.userId !== userId) {
		return rejected(operation, "ENTITY_OR_USER_MISMATCH");
	}

	if (!remoteTask) {
		return rejected(operation, "TASK_NOT_FOUND");
	}

	if (remoteTask.deletedAt) {
		return rejected(operation, "TASK_ALREADY_DELETED");
	}

	if (operation.baseVersion !== remoteTask.version) {
		return conflict(operation, "VERSION_MISMATCH", toSnapshot(remoteTask));
	}

	const now = new Date();
	const snapshot: TaskSyncSnapshot = {
		...parsed.data,
		userId,
		createdAt: remoteTask.createdAt.toISOString(),
		updatedAt: now.toISOString(),
		version: remoteTask.version + 1,
	};

	await transaction
		.update(task)
		.set(snapshotToUpdate(snapshot))
		.where(and(eq(task.id, operation.entityId), eq(task.userId, userId)));

	await appendChange(transaction, userId, "update", snapshot, now);

	return applied(operation, snapshot);
}

async function applyDelete(
	transaction: SyncTransaction,
	userId: string,
	operation: PushTaskOperationInput,
	remoteTask: typeof task.$inferSelect | undefined,
): Promise<PushOperationResult> {
	const parsed = taskDeletePayloadSchema.safeParse(operation.payload);

	if (!parsed.success) {
		return rejected(operation, "INVALID_DELETE_PAYLOAD");
	}

	if (parsed.data.id !== operation.entityId) {
		return rejected(operation, "ENTITY_MISMATCH");
	}

	if (!remoteTask) {
		return rejected(operation, "TASK_NOT_FOUND");
	}

	if (remoteTask.deletedAt) {
		return rejected(operation, "TASK_ALREADY_DELETED");
	}

	if (operation.baseVersion !== remoteTask.version) {
		return conflict(operation, "VERSION_MISMATCH", toSnapshot(remoteTask));
	}

	const now = new Date();
	const snapshot: TaskSyncSnapshot = {
		...toSnapshot(remoteTask),
		deletedAt: parsed.data.deletedAt,
		updatedAt: now.toISOString(),
		version: remoteTask.version + 1,
	};

	const deletedAtValue = snapshot.deletedAt;
	await transaction
		.update(task)
		.set({
			deletedAt: deletedAtValue ? new Date(deletedAtValue) : undefined,
			updatedAt: now,
			version: snapshot.version,
		})
		.where(and(eq(task.id, operation.entityId), eq(task.userId, userId)));

	await appendChange(transaction, userId, "delete", snapshot, now);

	return applied(operation, snapshot);
}

async function appendChange(
	transaction: SyncTransaction,
	userId: string,
	operation: "create" | "update" | "delete",
	snapshot: TaskSyncSnapshot,
	createdAt: Date,
): Promise<void> {
	await transaction.insert(syncChange).values({
		userId,
		entityType: "task",
		entityId: snapshot.id,
		operation,
		version: snapshot.version,
		payload: snapshot,
		createdAt,
	});
}

async function requireRegisteredDevice(
	userId: string,
	deviceId: string,
): Promise<void> {
	const [registered] = await db
		.select({ id: device.id })
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
	operation: PushTaskOperationInput,
	snapshot: TaskSyncSnapshot,
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

function conflict(
	operation: PushTaskOperationInput,
	reason: string,
	snapshot: TaskSyncSnapshot,
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

function rejected(
	operation: PushTaskOperationInput,
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

function toSnapshot(row: typeof task.$inferSelect): TaskSyncSnapshot {
	return {
		id: row.id,
		userId: row.userId,
		title: row.title,
		description: row.description,
		status: row.status,
		priority: row.priority,
		plannedAt: row.plannedAt?.toISOString() ?? null,
		dueAt: row.dueAt?.toISOString() ?? null,
		completedAt: row.completedAt?.toISOString() ?? null,
		archivedAt: row.archivedAt?.toISOString() ?? null,
		sortOrder: row.sortOrder,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		deletedAt: row.deletedAt?.toISOString() ?? null,
		version: row.version,
	};
}

function snapshotToInsert(
	snapshot: TaskSyncSnapshot,
): typeof task.$inferInsert {
	return {
		id: snapshot.id,
		userId: snapshot.userId,
		title: snapshot.title,
		description: snapshot.description,
		status: snapshot.status,
		priority: snapshot.priority,
		plannedAt: toDate(snapshot.plannedAt),
		dueAt: toDate(snapshot.dueAt),
		completedAt: toDate(snapshot.completedAt),
		archivedAt: toDate(snapshot.archivedAt),
		sortOrder: snapshot.sortOrder,
		version: snapshot.version,
		createdAt: new Date(snapshot.createdAt),
		updatedAt: new Date(snapshot.updatedAt),
		deletedAt: toDate(snapshot.deletedAt),
	};
}

function snapshotToUpdate(
	snapshot: TaskSyncSnapshot,
): Partial<typeof task.$inferInsert> {
	return {
		title: snapshot.title,
		description: snapshot.description,
		status: snapshot.status,
		priority: snapshot.priority,
		plannedAt: toDate(snapshot.plannedAt),
		dueAt: toDate(snapshot.dueAt),
		completedAt: toDate(snapshot.completedAt),
		archivedAt: toDate(snapshot.archivedAt),
		sortOrder: snapshot.sortOrder,
		version: snapshot.version,
		updatedAt: new Date(snapshot.updatedAt),
		deletedAt: toDate(snapshot.deletedAt),
	};
}

function toDate(value: string | null): Date | null {
	return value ? new Date(value) : null;
}

function parseStoredResult(value: unknown): PushOperationResult {
	if (
		typeof value !== "object" ||
		value === null ||
		!("status" in value) ||
		!("operationId" in value) ||
		!("entityId" in value)
	) {
		throw new Error("INVALID_PROCESSED_OPERATION_RESULT");
	}

	return value as PushOperationResult;
}

function parseOperationType(value: string): "create" | "update" | "delete" {
	if (value === "create" || value === "update" || value === "delete") {
		return value;
	}

	throw new Error("INVALID_SYNC_CHANGE_OPERATION");
}
