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

const payload = {
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

describe("data backup", () => {
	it("valida un backup portable", () => {
		expect(dataBackupPayloadSchema.parse(payload)).toEqual(payload);
	});

	it("cuenta las entidades", () => {
		const counts = countBackupData(dataBackupPayloadSchema.parse(payload));

		expect(counts.tasks).toBe(1);
		expect(counts.total).toBe(1);
	});

	it("rechaza un formato desconocido", () => {
		expect(
			dataBackupPayloadSchema.safeParse({
				...payload,
				format: "otro-formato",
			}).success,
		).toBe(false);
	});
});
