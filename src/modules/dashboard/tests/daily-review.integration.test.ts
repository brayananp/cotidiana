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

vi.mock("@/platform/auth/device.functions", () => ({
	registerCurrentDevice: vi.fn(),
}));
vi.mock("@/platform/sync/daily-review-sync.functions", () => ({
	pullDailyReviewChangesFn: vi.fn(),
	pushDailyReviewOperationsFn: vi.fn(),
}));

import { getLocalDatabase } from "@/platform/database/local-database";
import { applyDailyReviewPullChanges } from "@/platform/sync/daily-review-sync-client";
import {
	createSyncCursorId,
	createSyncMetadataId,
} from "@/platform/sync/sync.types";
import { dashboardDependencies } from "../infrastructure/dashboard.dependencies";

const DATABASE_NAME = "personal-productivity-os";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const DEVICE_ID = "00000000-0000-4000-8000-000000000002";
const REVIEW_DATE = "2026-07-28";

beforeAll(async () => {
	Object.defineProperty(globalThis, "window", {
		configurable: true,
		value: {
			addEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
			removeEventListener: vi.fn(),
		},
	});

	await Dexie.delete(DATABASE_NAME);
	await getLocalDatabase().open();
});

afterEach(async () => {
	await Promise.all(getLocalDatabase().tables.map((table) => table.clear()));
});

afterAll(async () => {
	getLocalDatabase().close();
	await Dexie.delete(DATABASE_NAME);
	Reflect.deleteProperty(globalThis, "window");
});

describe("daily review persistence", () => {
	it("stores a review and compacts later edits into one create operation", async () => {
		const input = {
			mood: 4 as const,
			energy: 3 as const,
			productivity: 5 as const,
			wins: "Módulo terminado",
			blockers: "",
			notes: "",
			tomorrowPriorities: ["Revisar pruebas"],
			completed: false,
		};

		await dashboardDependencies.upsertReview(REVIEW_DATE, input, {
			userId: USER_ID,
			deviceId: DEVICE_ID,
		});
		await dashboardDependencies.upsertReview(
			REVIEW_DATE,
			{ ...input, completed: true },
			{ userId: USER_ID, deviceId: DEVICE_ID },
		);

		const db = getLocalDatabase();
		const review = await db.dailyReviews.get(`${USER_ID}:${REVIEW_DATE}`);
		const operations = await db.syncOperations
			.where("[entityType+entityId]")
			.equals(["daily_review", `${USER_ID}:${REVIEW_DATE}`])
			.toArray();

		expect(review).toMatchObject({
			userId: USER_ID,
			reviewDate: REVIEW_DATE,
			version: 2,
		});
		expect(review?.completedAt).not.toBeNull();
		expect(operations).toHaveLength(1);
		expect(operations[0]).toMatchObject({
			entityType: "daily_review",
			operation: "create",
			status: "pending",
		});
	});

	it("ignora el eco remoto ya reconocido cuando hay una edición posterior pendiente", async () => {
		const db = getLocalDatabase();
		const entityId = `${USER_ID}:${REVIEW_DATE}`;
		const remoteSnapshot = {
			id: entityId,
			userId: USER_ID,
			reviewDate: REVIEW_DATE,
			mood: 3 as const,
			energy: 3 as const,
			productivity: 3 as const,
			wins: null,
			blockers: null,
			notes: "Versión remota confirmada",
			tomorrowPriorities: [],
			completedAt: null,
			createdAt: "2026-07-28T08:00:00.000Z",
			updatedAt: "2026-07-28T08:00:00.000Z",
			deletedAt: null,
			version: 1,
		};
		const localSnapshot = {
			...remoteSnapshot,
			notes: "Edición local posterior",
			updatedAt: "2026-07-28T08:01:00.000Z",
			version: 2,
		};

		await db.dailyReviews.put(localSnapshot);
		await db.syncMetadata.put({
			id: createSyncMetadataId("daily_review", entityId),
			entityType: "daily_review",
			entityId,
			localVersion: 2,
			remoteVersion: 1,
			state: "pending",
			lastSyncedAt: "2026-07-28T08:00:00.000Z",
			lastError: null,
			updatedAt: "2026-07-28T08:01:00.000Z",
		});
		await db.syncOperations.put({
			id: "00000000-0000-4000-8000-000000000003",
			userId: USER_ID,
			deviceId: DEVICE_ID,
			entityType: "daily_review",
			entityId,
			operation: "update",
			payload: localSnapshot,
			baseVersion: 1,
			status: "pending",
			attempts: 0,
			nextRetryAt: null,
			lastError: null,
			createdAt: "2026-07-28T08:01:00.000Z",
			updatedAt: "2026-07-28T08:01:00.000Z",
		});

		const result = await applyDailyReviewPullChanges(
			USER_ID,
			[
				{
					sequence: 7,
					entityType: "daily_review",
					entityId,
					operation: "create",
					version: 1,
					payload: remoteSnapshot,
					createdAt: "2026-07-28T08:00:00.000Z",
				},
			],
			7,
		);

		expect(result).toEqual({ applied: 0, conflicts: 0 });
		expect(await db.dailyReviews.get(entityId)).toMatchObject({
			notes: "Edición local posterior",
			version: 2,
		});
		expect(await db.syncConflicts.count()).toBe(0);
		expect(
			await db.syncCursors.get(createSyncCursorId(USER_ID, "daily_review")),
		).toMatchObject({ cursor: 7 });
	});
});
