import "fake-indexeddb/auto";

import { liveQuery } from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { ProductivityLocalDatabase } from "@/platform/database/local-database";
import {
	loadGlobalSyncStatus,
	pruneResolvedSyncConflicts,
} from "./global-sync-status-query-client";
import type { SyncConflictRecord, SyncOperationRecord } from "./sync.types";

const databases: ProductivityLocalDatabase[] = [];

afterEach(async () => {
	await Promise.all(
		databases.splice(0).map(async (database) => {
			database.close();
			await database.delete();
		}),
	);
});

describe("loadGlobalSyncStatus", () => {
	it("can run inside a Dexie liveQuery without starting a write transaction", async () => {
		const db = new ProductivityLocalDatabase(
			`sync-status-${crypto.randomUUID()}`,
		);
		databases.push(db);
		await db.open();

		await expect(
			firstLiveValue(() => loadGlobalSyncStatus(db, "user-1")),
		).resolves.toMatchObject({
			state: "synced",
		});
	});

	it("loads only visible operations and prunes old resolved conflicts", async () => {
		const db = new ProductivityLocalDatabase(
			`sync-status-${crypto.randomUUID()}`,
		);
		databases.push(db);
		await db.open();
		await db.syncOperations.bulkPut([
			createOperation("pending", "pending"),
			createOperation("conflict", "ignored-conflict"),
			createOperation("rejected", "rejected"),
		]);
		await db.syncConflicts.bulkPut([
			createConflict("open", null),
			createConflict("old", "2026-05-01T00:00:00.000Z"),
			createConflict("recent", "2026-07-20T00:00:00.000Z"),
			createConflict("other-user", "2026-05-01T00:00:00.000Z", "user-2"),
		]);

		await pruneResolvedSyncConflicts(
			db,
			"user-1",
			new Date("2026-07-30T00:00:00.000Z"),
		);
		const status = await loadGlobalSyncStatus(db, "user-1");

		expect(status).toMatchObject({
			state: "attention",
			pending: 1,
			rejected: 1,
			conflicts: 1,
		});
		expect(await db.syncConflicts.get("old")).toBeUndefined();
		expect(await db.syncConflicts.get("recent")).toBeDefined();
		expect(await db.syncConflicts.get("other-user")).toBeDefined();
	});
});

function firstLiveValue<T>(querier: () => Promise<T>): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const subscription = liveQuery(querier).subscribe({
			next(value) {
				subscription.unsubscribe();
				resolve(value);
			},
			error: reject,
		});
	});
}

function createOperation(
	status: SyncOperationRecord["status"],
	id: string,
): SyncOperationRecord {
	return {
		id,
		userId: "user-1",
		deviceId: "device-1",
		entityType: "task",
		entityId: id,
		operation: "update",
		payload: null,
		baseVersion: 1,
		status,
		attempts: 0,
		nextRetryAt: null,
		lastError: null,
		createdAt: "2026-07-30T00:00:00.000Z",
		updatedAt: "2026-07-30T00:00:00.000Z",
	};
}

function createConflict(
	id: string,
	resolvedAt: string | null,
	userId = "user-1",
): SyncConflictRecord {
	return {
		id,
		userId,
		entityType: "task",
		entityId: id,
		localPayload: null,
		remotePayload: null,
		remoteVersion: 1,
		localOperationIds: [],
		reason: "VERSION_MISMATCH",
		createdAt: "2026-04-01T00:00:00.000Z",
		resolvedAt,
		resolution: resolvedAt ? "accept_remote" : null,
		resolvedPayload: null,
	};
}
