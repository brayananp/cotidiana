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
import { settingsDependencies } from "../infrastructure/settings.dependencies";

const DATABASE_NAME = "personal-productivity-os";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const DEVICE_ID = "00000000-0000-4000-8000-000000000002";

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

describe("settings synchronization", () => {
	it("stores preferences and queues one user_settings operation atomically", async () => {
		await settingsDependencies.update(USER_ID, DEVICE_ID, {
			locale: "es",
			weekStartsOn: 1,
			timeFormat: "24h",
			startPage: "scheduling",
			defaultTaskPriority: "medium",
			defaultReminderMinutes: 20,
			denseMode: true,
		});

		const db = getLocalDatabase();
		const settings = await db.userSettings.get(USER_ID);
		const operations = await db.syncOperations
			.where("[entityType+entityId]")
			.equals(["user_settings", USER_ID])
			.toArray();

		expect(settings).toMatchObject({
			id: USER_ID,
			userId: USER_ID,
			startPage: "scheduling",
		});
		expect(operations).toHaveLength(1);
		expect(operations[0]).toMatchObject({
			entityType: "user_settings",
			entityId: USER_ID,
			operation: "create",
			status: "pending",
		});
	});
});
