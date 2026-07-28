import { describe, expect, it } from "vitest";
import { countBackupData } from "../domain/data-backup";
import { dataBackupPayloadSchema } from "../schemas/data-backup.schema";

const task = {
	id: "00000000-0000-4000-8000-000000000001",
	userId: "user-1",
	title: "Tarea",
	description: null,
	status: "todo",
	priority: "none",
	plannedAt: null,
	dueAt: null,
	completedAt: null,
	archivedAt: null,
	sortOrder: 0,
	createdAt: "2026-07-27T12:00:00.000Z",
	updatedAt: "2026-07-27T12:00:00.000Z",
	deletedAt: null,
	version: 1,
};

const payloadV1 = {
	format: "personal-productivity-os-backup",
	schemaVersion: 1,
	appVersion: "1.9.0",
	exportedAt: "2026-07-27T12:00:00.000Z",
	sourceUserId: "user-1",
	data: {
		tasks: [task],
		timeBlocks: [],
		calendarEvents: [],
		reminders: [],
		books: [],
		bookNotes: [],
	},
	syncMetadata: [],
} as const;

describe("data backup v2", () => {
	it("migra un backup v1 al formato v2", () => {
		const parsed = dataBackupPayloadSchema.parse(payloadV1);

		expect(parsed.schemaVersion).toBe(2);
		expect(parsed.data.userSettings).toEqual([]);
	});

	it("cuenta las preferencias", () => {
		const parsed = dataBackupPayloadSchema.parse({
			...payloadV1,
			schemaVersion: 2,
			appVersion: "1.10.0",
			data: {
				...payloadV1.data,
				userSettings: [
					{
						id: "user-1",
						userId: "user-1",
						locale: "es",
						weekStartsOn: 1,
						timeFormat: "24h",
						startPage: "dashboard",
						defaultTaskPriority: "none",
						defaultReminderMinutes: 30,
						denseMode: false,
						createdAt: "2026-07-27T12:00:00.000Z",
						updatedAt: "2026-07-27T12:00:00.000Z",
						deletedAt: null,
						version: 1,
					},
				],
			},
		});

		const counts = countBackupData(parsed);

		expect(counts.tasks).toBe(1);
		expect(counts.userSettings).toBe(1);
		expect(counts.total).toBe(2);
	});

	it("rechaza un formato desconocido", () => {
		expect(
			dataBackupPayloadSchema.safeParse({
				...payloadV1,
				format: "otro-formato",
			}).success,
		).toBe(false);
	});
});
