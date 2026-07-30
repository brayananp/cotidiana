import { and, asc, eq, gt, isNull } from "drizzle-orm";
import {
	type PullSettingsInput,
	type PushSettingsInput,
	pullSettingsInputSchema,
	pushSettingsInputSchema,
	type UserSettingsSyncSnapshot,
	userSettingsSyncSnapshotSchema,
} from "@/platform/sync/settings-sync.schemas";
import type {
	PushOperationResult,
	SyncOperationType,
} from "@/platform/sync/sync.types";
import { requireServerSession } from "@/server/auth/require-session-server";
import { db } from "@/server/database/client-server";
import { device } from "@/server/database/schema/device.schema";
import {
	processedOperation,
	syncChange,
} from "@/server/database/schema/sync.schema";
import { userSettings } from "@/server/database/schema/user-settings.schema";
import { attemptVersionedWrite } from "./versioned-write-server";

export async function pushSettingsOperations(
	rawInput: PushSettingsInput,
): Promise<{ results: PushOperationResult[] }> {
	const input = pushSettingsInputSchema.parse(rawInput);
	const session = await requireServerSession();

	await requireRegisteredDevice(session.user.id, input.deviceId);

	const results = await db.transaction(async (transaction) => {
		const values: PushOperationResult[] = [];

		for (const operation of input.operations) {
			const [duplicate] = await transaction
				.select()
				.from(processedOperation)
				.where(
					and(
						eq(processedOperation.operationId, operation.operationId),
						eq(processedOperation.userId, session.user.id),
					),
				)
				.limit(1);

			if (duplicate) {
				values.push({
					...(duplicate.result as PushOperationResult),
					duplicate: true,
				});
				continue;
			}

			const [remote] = await transaction
				.select()
				.from(userSettings)
				.where(eq(userSettings.userId, session.user.id))
				.limit(1);

			const parsed = userSettingsSyncSnapshotSchema.safeParse(
				operation.payload,
			);

			let result: PushOperationResult;

			if (
				!parsed.success ||
				parsed.data.userId !== session.user.id ||
				parsed.data.id !== session.user.id ||
				operation.entityId !== session.user.id
			) {
				result = rejected(operation, "INVALID_USER_SETTINGS_PAYLOAD");
			} else if (operation.operation === "create") {
				if (remote) {
					result = conflict(
						operation,
						"USER_SETTINGS_ALREADY_EXISTS",
						toSnapshot(remote),
					);
				} else {
					const now = new Date();
					const snapshot: UserSettingsSyncSnapshot = {
						...parsed.data,
						id: session.user.id,
						userId: session.user.id,
						version: 1,
						updatedAt: now.toISOString(),
					};

					await transaction
						.insert(userSettings)
						.values(snapshotToInsert(snapshot));

					await appendChange(
						transaction,
						session.user.id,
						"create",
						snapshot,
						now,
					);
					result = applied(operation, snapshot);
				}
			} else if (!remote) {
				result = rejected(operation, "USER_SETTINGS_NOT_FOUND");
			} else if (operation.baseVersion !== remote.version) {
				result = conflict(operation, "VERSION_MISMATCH", toSnapshot(remote));
			} else {
				const now = new Date();
				const snapshot: UserSettingsSyncSnapshot = {
					...parsed.data,
					id: session.user.id,
					userId: session.user.id,
					createdAt: remote.createdAt.toISOString(),
					updatedAt: now.toISOString(),
					version: remote.version + 1,
				};

				const write = await attemptVersionedWrite({
					expectedVersion: remote.version,
					writeIfVersion: async (expectedVersion) => {
						const [updated] = await transaction
							.update(userSettings)
							.set(snapshotToUpdate(snapshot))
							.where(
								and(
									eq(userSettings.userId, session.user.id),
									eq(userSettings.version, expectedVersion),
								),
							)
							.returning();

						return updated ?? null;
					},
					loadCurrent: async () => {
						const [current] = await transaction
							.select()
							.from(userSettings)
							.where(eq(userSettings.userId, session.user.id))
							.limit(1);

						return current ?? null;
					},
				});

				if (write.status === "stale") {
					result = write.current
						? conflict(operation, "VERSION_MISMATCH", toSnapshot(write.current))
						: rejected(operation, "USER_SETTINGS_NOT_FOUND");
				} else {
					await appendChange(
						transaction,
						session.user.id,
						"update",
						snapshot,
						now,
					);
					result = applied(operation, snapshot);
				}
			}

			await transaction.insert(processedOperation).values({
				operationId: operation.operationId,
				userId: session.user.id,
				deviceId: input.deviceId,
				result,
				processedAt: new Date(),
			});

			values.push(result);
		}

		return values;
	});

	return { results };
}

export async function pullSettingsChanges(rawInput: PullSettingsInput) {
	const input = pullSettingsInputSchema.parse(rawInput);
	const session = await requireServerSession();

	await requireRegisteredDevice(session.user.id, input.deviceId);

	const rows = await db
		.select()
		.from(syncChange)
		.where(
			and(
				eq(syncChange.userId, session.user.id),
				eq(syncChange.entityType, "user_settings"),
				gt(syncChange.sequence, input.cursor),
			),
		)
		.orderBy(asc(syncChange.sequence))
		.limit(input.limit + 1);

	const hasMore = rows.length > input.limit;
	const selected = hasMore ? rows.slice(0, input.limit) : rows;

	const changes = selected.map((row) => ({
		sequence: row.sequence,
		entityType: "user_settings" as const,
		entityId: row.entityId,
		operation: parseOperation(row.operation),
		version: row.version,
		payload: userSettingsSyncSnapshotSchema.parse(row.payload),
		createdAt: row.createdAt.toISOString(),
	}));

	return {
		changes,
		nextCursor: changes.at(-1)?.sequence ?? input.cursor,
		hasMore,
	};
}

type SyncTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function appendChange(
	transaction: SyncTransaction,
	userId: string,
	operation: SyncOperationType,
	snapshot: UserSettingsSyncSnapshot,
	now: Date,
): Promise<void> {
	await transaction.insert(syncChange).values({
		userId,
		entityType: "user_settings",
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
	operation: { operationId: string; entityId: string },
	snapshot: UserSettingsSyncSnapshot,
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
	operation: { operationId: string; entityId: string },
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
	operation: { operationId: string; entityId: string },
	reason: string,
	snapshot: UserSettingsSyncSnapshot,
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
	row: typeof userSettings.$inferSelect,
): UserSettingsSyncSnapshot {
	return {
		id: row.id,
		userId: row.userId,
		locale: row.locale,
		weekStartsOn: row.weekStartsOn,
		timeFormat: row.timeFormat,
		startPage: row.startPage,
		defaultTaskPriority: row.defaultTaskPriority,
		defaultReminderMinutes: row.defaultReminderMinutes,
		denseMode: row.denseMode,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		deletedAt: row.deletedAt?.toISOString() ?? null,
		version: row.version,
	};
}

function snapshotToInsert(snapshot: UserSettingsSyncSnapshot) {
	return {
		id: snapshot.id,
		userId: snapshot.userId,
		locale: snapshot.locale,
		weekStartsOn: snapshot.weekStartsOn,
		timeFormat: snapshot.timeFormat,
		startPage: snapshot.startPage,
		defaultTaskPriority: snapshot.defaultTaskPriority,
		defaultReminderMinutes: snapshot.defaultReminderMinutes,
		denseMode: snapshot.denseMode,
		version: snapshot.version,
		createdAt: new Date(snapshot.createdAt),
		updatedAt: new Date(snapshot.updatedAt),
		deletedAt: snapshot.deletedAt ? new Date(snapshot.deletedAt) : null,
	};
}

function snapshotToUpdate(snapshot: UserSettingsSyncSnapshot) {
	const {
		id: _id,
		userId: _userId,
		createdAt: _createdAt,
		...values
	} = snapshotToInsert(snapshot);

	return values;
}

function parseOperation(value: string): SyncOperationType {
	if (value === "create" || value === "update" || value === "delete") {
		return value;
	}

	throw new Error("INVALID_SYNC_OPERATION");
}
