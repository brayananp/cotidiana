import "fake-indexeddb/auto";

import Dexie from "dexie";
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type { TaskRecord } from "@/modules/tasks/infrastructure/local/task.record";
import {
	getLocalDatabase,
	type ProductivityLocalDatabase,
} from "@/platform/database/local-database";
import {
	type ResolveConflictInput,
	resolveSyncConflict,
} from "@/platform/sync/conflict-resolution-client";
import type {
	Json,
	SyncConflictRecord,
	SyncOperationRecord,
} from "@/platform/sync/sync.types";
import {
	clearResolvedConflicts,
	discardRejectedOperation,
} from "@/platform/sync/sync-center-client";
import {
	createDataBackupPayload,
	createLocalBackup,
	importDataBackup,
} from "../application/backup.service-client";
import type { DataBackupPayload } from "../domain/data-backup";

const DATABASE_NAME = "personal-productivity-os";
const USER_ID = "user-1";
const DEVICE_ID = "device-1";
const NOW = "2026-07-27T12:00:00.000Z";
const TASK_IDS = {
	conflicted: "00000000-0000-4000-8000-000000000005",
	otherUser: "00000000-0000-4000-8000-000000000002",
	rejected: "00000000-0000-4000-8000-000000000006",
	restored: "00000000-0000-4000-8000-000000000004",
	stale: "00000000-0000-4000-8000-000000000003",
	user: "00000000-0000-4000-8000-000000000001",
} as const;

let db: ProductivityLocalDatabase;

beforeAll(async () => {
	Object.defineProperty(globalThis, "window", {
		configurable: true,
		value: {
			addEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
			removeEventListener: vi.fn(),
			setTimeout,
		},
	});

	await Dexie.delete(DATABASE_NAME);
	db = getLocalDatabase();
	await db.open();
});

afterEach(async () => {
	await Promise.all(db.tables.map((table) => table.clear()));
});

afterAll(async () => {
	db.close();
	await Dexie.delete(DATABASE_NAME);
	Reflect.deleteProperty(globalThis, "window");
});

describe("data management", () => {
	it("exports the active user's data and stores a local backup", async () => {
		await db.tasks.bulkPut([
			createTask({ id: TASK_IDS.user, userId: USER_ID }),
			createTask({ id: TASK_IDS.otherUser, userId: "user-2" }),
		]);

		const payload = await createDataBackupPayload(USER_ID);
		const backup = await createLocalBackup(USER_ID, "manual", "Snapshot");

		expect(payload.data.tasks.map((task) => task.id)).toEqual([TASK_IDS.user]);
		expect(backup.label).toBe("Snapshot");
		expect(await db.localBackups.get(backup.id)).toMatchObject({
			userId: USER_ID,
			reason: "manual",
		});
	});

	it("restores a backup atomically and clears stale sync state", async () => {
		const staleTask = createTask({ id: TASK_IDS.stale, userId: USER_ID });
		const restoredTask = createTask({
			id: TASK_IDS.restored,
			title: "Restored",
			userId: USER_ID,
		});

		await db.tasks.put(staleTask);
		await db.syncConflicts.put(
			createConflict({
				entityId: staleTask.id,
				localPayload: toJson(staleTask),
				remotePayload: toJson(staleTask),
			}),
		);
		await db.syncRuntime.put({
			id: `${USER_ID}:task`,
			userId: USER_ID,
			entityType: "task",
			state: "error",
			lastStartedAt: NOW,
			lastCompletedAt: null,
			lastError: "STALE",
			updatedAt: NOW,
		});

		await expect(
			importDataBackup({
				payload: createBackupPayload([restoredTask]),
				userId: USER_ID,
				deviceId: DEVICE_ID,
				mode: "replace_local",
				createSafetyBackup: false,
			}),
		).resolves.toMatchObject({
			imported: 1,
			operationsCreated: 1,
			safetyBackupId: null,
		});

		expect(await db.tasks.get(staleTask.id)).toBeUndefined();
		expect(await db.tasks.get(restoredTask.id)).toMatchObject({
			title: "Restored",
		});
		expect(await db.syncConflicts.count()).toBe(0);
		expect(await db.syncRuntime.count()).toBe(0);
		expect(await db.syncOperations.count()).toBe(1);
	});

	it("rejects a backup from another profile before changing local data", async () => {
		const existingTask = createTask({
			id: TASK_IDS.user,
			title: "User 2 task",
			userId: "user-2",
		});
		const importedTask = createTask({
			id: TASK_IDS.user,
			title: "User 1 task",
			userId: USER_ID,
		});

		await db.tasks.put(existingTask);

		await expect(
			importDataBackup({
				payload: createBackupPayload([importedTask]),
				userId: "user-2",
				deviceId: DEVICE_ID,
				mode: "merge",
				createSafetyBackup: false,
			}),
		).rejects.toThrow("BACKUP_USER_MISMATCH");

		expect(await db.tasks.get(existingTask.id)).toEqual(existingTask);
		expect(await db.syncOperations.count()).toBe(0);
	});

	it("accepts the remote side of a conflict and records the resolution", async () => {
		const localTask = createTask({ id: TASK_IDS.conflicted, title: "Local" });
		const remoteTask = createTask({
			id: localTask.id,
			title: "Remote",
			version: 2,
		});
		const operation = createOperation(localTask);
		const conflict = createConflict({
			entityId: localTask.id,
			localOperationIds: [operation.id],
			localPayload: toJson(localTask),
			remotePayload: toJson(remoteTask),
			remoteVersion: 2,
		});

		await db.tasks.put(localTask);
		await db.syncOperations.put(operation);
		await db.syncConflicts.put(conflict);

		const input: ResolveConflictInput = {
			conflictId: conflict.id,
			userId: USER_ID,
			deviceId: DEVICE_ID,
			resolution: "accept_remote",
		};

		await resolveSyncConflict(input);

		expect(await db.tasks.get(localTask.id)).toMatchObject({
			title: "Remote",
			version: 2,
		});
		expect(await db.syncOperations.get(operation.id)).toBeUndefined();
		expect(await db.syncConflicts.get(conflict.id)).toMatchObject({
			resolution: "accept_remote",
		});
	});

	it("cleans resolved conflicts and rejected local creates for one user", async () => {
		const rejectedTask = createTask({ id: TASK_IDS.rejected });
		const rejectedOperation = createOperation(rejectedTask, {
			status: "rejected",
		});
		const resolvedConflict = createConflict({
			id: "resolved-conflict",
			entityId: rejectedTask.id,
			resolution: "discard_local",
			resolvedAt: NOW,
		});
		const otherUserConflict = createConflict({
			id: "other-user-conflict",
			userId: "user-2",
		});

		await db.tasks.put(rejectedTask);
		await db.syncOperations.put(rejectedOperation);
		await db.syncConflicts.bulkPut([resolvedConflict, otherUserConflict]);

		await discardRejectedOperation(rejectedOperation.id, USER_ID);
		const removed = await clearResolvedConflicts(USER_ID);

		expect(removed).toBe(1);
		expect(await db.tasks.get(rejectedTask.id)).toBeUndefined();
		expect(await db.syncOperations.get(rejectedOperation.id)).toBeUndefined();
		expect(await db.syncConflicts.get(resolvedConflict.id)).toBeUndefined();
		expect(await db.syncConflicts.get(otherUserConflict.id)).toBeDefined();
	});
});

function createTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
	return {
		id: "task-1",
		userId: USER_ID,
		title: "Task",
		description: null,
		status: "todo",
		priority: "none",
		plannedAt: null,
		dueAt: null,
		completedAt: null,
		archivedAt: null,
		sortOrder: 0,
		createdAt: NOW,
		updatedAt: NOW,
		deletedAt: null,
		version: 1,
		...overrides,
	};
}

function createBackupPayload(tasks: TaskRecord[]): DataBackupPayload {
	return {
		format: "personal-productivity-os-backup",
		schemaVersion: 3,
		appVersion: "1.9.0",
		exportedAt: NOW,
		sourceUserId: USER_ID,
		data: {
			tasks,
			timeBlocks: [],
			calendarEvents: [],
			reminders: [],
			books: [],
			bookNotes: [],
			userSettings: [],
			dailyReviews: [],
		},
		syncMetadata: [],
	};
}

function createOperation(
	task: TaskRecord,
	overrides: Partial<SyncOperationRecord> = {},
): SyncOperationRecord {
	return {
		id: `operation-${task.id}`,
		userId: task.userId,
		deviceId: DEVICE_ID,
		entityType: "task",
		entityId: task.id,
		operation: "create",
		payload: toJson(task),
		baseVersion: null,
		status: "pending",
		attempts: 0,
		nextRetryAt: null,
		lastError: null,
		createdAt: NOW,
		updatedAt: NOW,
		...overrides,
	};
}

function createConflict(
	overrides: Partial<SyncConflictRecord> = {},
): SyncConflictRecord {
	return {
		id: "conflict-1",
		userId: USER_ID,
		entityType: "task",
		entityId: "task-1",
		localPayload: null,
		remotePayload: null,
		remoteVersion: 1,
		localOperationIds: [],
		reason: "VERSION_MISMATCH",
		createdAt: NOW,
		resolvedAt: null,
		resolution: null,
		resolvedPayload: null,
		...overrides,
	};
}

function toJson(value: unknown): Json {
	return JSON.parse(JSON.stringify(value)) as Json;
}
