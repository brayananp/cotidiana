import { describe, expect, it } from "vitest";
import {
	changeTimeBlockStatus,
	createTimeBlockEntity,
	deleteTimeBlockEntity,
	updateTimeBlockEntity,
} from "../domain/time-block";

const now = new Date("2026-07-27T08:00:00.000Z");

function createBlock() {
	return createTimeBlockEntity(
		{
			userId: "user-1",
			taskId: null,
			title: "  Trabajo profundo  ",
			notes: "  Arquitectura  ",
			kind: "focus",
			startAt: "2026-07-27T09:00:00.000Z",
			endAt: "2026-07-27T10:00:00.000Z",
		},
		now,
	);
}

describe("TimeBlock", () => {
	it("normaliza título y notas", () => {
		const block = createBlock();

		expect(block.title).toBe("Trabajo profundo");

		expect(block.notes).toBe("Arquitectura");

		expect(block.status).toBe("planned");
	});

	it("incrementa versión al actualizar", () => {
		const updated = updateTimeBlockEntity(
			createBlock(),
			{
				taskId: null,
				title: "Nuevo título",
				notes: null,
				kind: "task",
				startAt: "2026-07-27T10:00:00.000Z",
				endAt: "2026-07-27T11:00:00.000Z",
			},
			now,
		);

		expect(updated.version).toBe(2);
	});

	it("permite completar el bloque", () => {
		const completed = changeTimeBlockStatus(createBlock(), "completed", now);

		expect(completed.status).toBe("completed");
	});

	it("aplica eliminación lógica", () => {
		const deleted = deleteTimeBlockEntity(createBlock(), now);

		expect(deleted.deletedAt).toBe(now.toISOString());
	});
});
