import { and, asc, eq, gt, isNull } from "drizzle-orm";
import {
	type DailyReviewSyncSnapshot,
	dailyReviewDeletePayloadSchema,
	dailyReviewSyncSnapshotSchema,
	type PullDailyReviewInput,
	type PushDailyReviewInput,
	type PushDailyReviewOperationInput,
	pullDailyReviewInputSchema,
	pushDailyReviewInputSchema,
} from "@/platform/sync/daily-review-sync.schemas";
import type {
	PullDailyReviewChange,
	PushOperationResult,
	SyncOperationType,
} from "@/platform/sync/sync.types";
import { requireServerSession } from "@/server/auth/require-session.server";
import { db } from "@/server/database/client.server";
import { dailyReview } from "@/server/database/schema/daily-review.schema";
import { device } from "@/server/database/schema/device.schema";
import {
	processedOperation,
	syncChange,
} from "@/server/database/schema/sync.schema";
import { attemptVersionedWrite } from "./versioned-write-server";

export async function pushDailyReviewOperations(
	rawInput: PushDailyReviewInput,
): Promise<{ results: PushOperationResult[] }> {
	const input = pushDailyReviewInputSchema.parse(rawInput);
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

export async function pullDailyReviewChanges(
	rawInput: PullDailyReviewInput,
): Promise<{
	changes: PullDailyReviewChange[];
	nextCursor: number;
	hasMore: boolean;
}> {
	const input = pullDailyReviewInputSchema.parse(rawInput);
	const session = await requireServerSession();
	await requireRegisteredDevice(session.user.id, input.deviceId);

	const rows = await db
		.select()
		.from(syncChange)
		.where(
			and(
				eq(syncChange.userId, session.user.id),
				eq(syncChange.entityType, "daily_review"),
				gt(syncChange.sequence, input.cursor),
			),
		)
		.orderBy(asc(syncChange.sequence))
		.limit(input.limit + 1);

	const hasMore = rows.length > input.limit;
	const selected = hasMore ? rows.slice(0, input.limit) : rows;
	const changes: PullDailyReviewChange[] = selected.map((row) => ({
		sequence: row.sequence,
		entityType: "daily_review",
		entityId: row.entityId,
		operation: parseOperationType(row.operation),
		version: row.version,
		payload: dailyReviewSyncSnapshotSchema.parse(row.payload),
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
	operation: PushDailyReviewOperationInput,
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
		return { ...(duplicate.result as PushOperationResult), duplicate: true };
	}

	const [remote] = await transaction
		.select()
		.from(dailyReview)
		.where(
			and(
				eq(dailyReview.id, operation.entityId),
				eq(dailyReview.userId, userId),
			),
		)
		.limit(1);

	const result =
		operation.operation === "delete"
			? await applyDelete(transaction, userId, operation, remote)
			: await applyWrite(transaction, userId, operation, remote);

	await transaction.insert(processedOperation).values({
		operationId: operation.operationId,
		userId,
		deviceId,
		result,
		processedAt: new Date(),
	});

	return result;
}

async function applyWrite(
	transaction: SyncTransaction,
	userId: string,
	operation: PushDailyReviewOperationInput,
	remote: typeof dailyReview.$inferSelect | undefined,
): Promise<PushOperationResult> {
	const parsed = dailyReviewSyncSnapshotSchema.safeParse(operation.payload);
	if (!parsed.success)
		return rejected(operation, "INVALID_DAILY_REVIEW_PAYLOAD");
	if (parsed.data.id !== operation.entityId || parsed.data.userId !== userId) {
		return rejected(operation, "ENTITY_OR_USER_MISMATCH");
	}

	if (operation.operation === "create") {
		if (remote)
			return conflict(
				operation,
				"DAILY_REVIEW_ALREADY_EXISTS",
				toSnapshot(remote),
			);

		const [sameDate] = await transaction
			.select()
			.from(dailyReview)
			.where(
				and(
					eq(dailyReview.userId, userId),
					eq(dailyReview.reviewDate, parsed.data.reviewDate),
				),
			)
			.limit(1);

		if (sameDate)
			return conflict(
				operation,
				"DAILY_REVIEW_DATE_ALREADY_EXISTS",
				toSnapshot(sameDate),
			);

		const now = new Date();
		const snapshot: DailyReviewSyncSnapshot = {
			...parsed.data,
			userId,
			version: 1,
			updatedAt: now.toISOString(),
		};

		await transaction.insert(dailyReview).values(snapshotToInsert(snapshot));
		await appendChange(transaction, userId, "create", snapshot, now);
		return applied(operation, snapshot);
	}

	if (!remote) return rejected(operation, "DAILY_REVIEW_NOT_FOUND");
	if (remote.deletedAt)
		return rejected(operation, "DAILY_REVIEW_ALREADY_DELETED");
	if (operation.baseVersion !== remote.version) {
		return conflict(operation, "VERSION_MISMATCH", toSnapshot(remote));
	}

	const now = new Date();
	const snapshot: DailyReviewSyncSnapshot = {
		...parsed.data,
		userId,
		reviewDate: remote.reviewDate,
		createdAt: remote.createdAt.toISOString(),
		updatedAt: now.toISOString(),
		version: remote.version + 1,
	};

	const write = await attemptVersionedWrite({
		expectedVersion: remote.version,
		writeIfVersion: async (expectedVersion) => {
			const [updated] = await transaction
				.update(dailyReview)
				.set(snapshotToUpdate(snapshot))
				.where(
					and(
						eq(dailyReview.id, operation.entityId),
						eq(dailyReview.userId, userId),
						eq(dailyReview.version, expectedVersion),
					),
				)
				.returning();

			return updated ?? null;
		},
		loadCurrent: async () => {
			const [current] = await transaction
				.select()
				.from(dailyReview)
				.where(
					and(
						eq(dailyReview.id, operation.entityId),
						eq(dailyReview.userId, userId),
					),
				)
				.limit(1);

			return current ?? null;
		},
	});

	if (write.status === "stale") {
		return write.current
			? conflict(operation, "VERSION_MISMATCH", toSnapshot(write.current))
			: rejected(operation, "DAILY_REVIEW_NOT_FOUND");
	}
	await appendChange(transaction, userId, "update", snapshot, now);
	return applied(operation, snapshot);
}

async function applyDelete(
	transaction: SyncTransaction,
	userId: string,
	operation: PushDailyReviewOperationInput,
	remote: typeof dailyReview.$inferSelect | undefined,
): Promise<PushOperationResult> {
	const parsed = dailyReviewDeletePayloadSchema.safeParse(operation.payload);
	if (!parsed.success) return rejected(operation, "INVALID_DELETE_PAYLOAD");
	if (parsed.data.id !== operation.entityId) {
		return rejected(operation, "ENTITY_MISMATCH");
	}
	if (!remote) return rejected(operation, "DAILY_REVIEW_NOT_FOUND");
	if (remote.deletedAt) {
		return rejected(operation, "DAILY_REVIEW_ALREADY_DELETED");
	}
	if (operation.baseVersion !== remote.version) {
		return conflict(operation, "VERSION_MISMATCH", toSnapshot(remote));
	}

	const now = new Date();
	const snapshot: DailyReviewSyncSnapshot = {
		...toSnapshot(remote),
		deletedAt: parsed.data.deletedAt,
		updatedAt: now.toISOString(),
		version: remote.version + 1,
	};

	const write = await attemptVersionedWrite({
		expectedVersion: remote.version,
		writeIfVersion: async (expectedVersion) => {
			const [updated] = await transaction
				.update(dailyReview)
				.set({
					deletedAt: new Date(parsed.data.deletedAt),
					updatedAt: now,
					version: snapshot.version,
				})
				.where(
					and(
						eq(dailyReview.id, remote.id),
						eq(dailyReview.userId, userId),
						eq(dailyReview.version, expectedVersion),
					),
				)
				.returning();

			return updated ?? null;
		},
		loadCurrent: async () => {
			const [current] = await transaction
				.select()
				.from(dailyReview)
				.where(
					and(eq(dailyReview.id, remote.id), eq(dailyReview.userId, userId)),
				)
				.limit(1);

			return current ?? null;
		},
	});

	if (write.status === "stale") {
		return write.current
			? conflict(operation, "VERSION_MISMATCH", toSnapshot(write.current))
			: rejected(operation, "DAILY_REVIEW_NOT_FOUND");
	}

	await appendChange(transaction, userId, "delete", snapshot, now);
	return applied(operation, snapshot);
}

async function appendChange(
	transaction: SyncTransaction,
	userId: string,
	operation: SyncOperationType,
	snapshot: DailyReviewSyncSnapshot,
	now: Date,
): Promise<void> {
	await transaction.insert(syncChange).values({
		userId,
		entityType: "daily_review",
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

	if (!registered) throw new Error("DEVICE_NOT_REGISTERED");
}

function applied(
	operation: PushDailyReviewOperationInput,
	snapshot: DailyReviewSyncSnapshot,
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
	operation: PushDailyReviewOperationInput,
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
	operation: PushDailyReviewOperationInput,
	reason: string,
	snapshot: DailyReviewSyncSnapshot,
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

function toSnapshot(
	row: typeof dailyReview.$inferSelect,
): DailyReviewSyncSnapshot {
	return {
		id: row.id,
		userId: row.userId,
		reviewDate: row.reviewDate,
		mood: row.mood as 1 | 2 | 3 | 4 | 5,
		energy: row.energy as 1 | 2 | 3 | 4 | 5,
		productivity: row.productivity as 1 | 2 | 3 | 4 | 5,
		wins: row.wins,
		blockers: row.blockers,
		notes: row.notes,
		tomorrowPriorities: row.tomorrowPriorities,
		completedAt: row.completedAt?.toISOString() ?? null,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		deletedAt: row.deletedAt?.toISOString() ?? null,
		version: row.version,
	};
}

function snapshotToInsert(snapshot: DailyReviewSyncSnapshot) {
	return {
		id: snapshot.id,
		userId: snapshot.userId,
		reviewDate: snapshot.reviewDate,
		mood: snapshot.mood,
		energy: snapshot.energy,
		productivity: snapshot.productivity,
		wins: snapshot.wins,
		blockers: snapshot.blockers,
		notes: snapshot.notes,
		tomorrowPriorities: snapshot.tomorrowPriorities,
		completedAt: snapshot.completedAt ? new Date(snapshot.completedAt) : null,
		version: snapshot.version,
		createdAt: new Date(snapshot.createdAt),
		updatedAt: new Date(snapshot.updatedAt),
		deletedAt: snapshot.deletedAt ? new Date(snapshot.deletedAt) : null,
	};
}

function snapshotToUpdate(snapshot: DailyReviewSyncSnapshot) {
	const {
		id: _id,
		userId: _userId,
		reviewDate: _reviewDate,
		createdAt: _createdAt,
		...values
	} = snapshotToInsert(snapshot);
	return values;
}

function parseOperationType(value: string): SyncOperationType {
	if (value === "create" || value === "update" || value === "delete")
		return value;
	throw new Error("INVALID_SYNC_OPERATION");
}
