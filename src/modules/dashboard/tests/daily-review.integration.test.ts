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
import { getLocalDatabase } from "@/platform/database/local-database";
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
});
