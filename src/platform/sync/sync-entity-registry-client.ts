import type { BookRecord } from "@/modules/library/infrastructure/local/book.record";
import type { BookNoteRecord } from "@/modules/library/infrastructure/local/book-note.record";
import type { ReminderRecord } from "@/modules/reminders/infrastructure/local/reminder.record";
import type { CalendarEventRecord } from "@/modules/scheduling/infrastructure/local/calendar-event.record";
import type { TimeBlockRecord } from "@/modules/scheduling/infrastructure/local/time-block.record";
import type { TaskRecord } from "@/modules/tasks/infrastructure/local/task.record";
import { getLocalDatabase } from "@/platform/database/local-database";
import {
	bookNoteSyncSnapshotSchema,
	bookSyncSnapshotSchema,
} from "./library-sync.schemas";
import { reminderSyncSnapshotSchema } from "./reminder-sync.schemas";
import {
	calendarEventSyncSnapshotSchema,
	timeBlockSyncSnapshotSchema,
} from "./scheduling-sync.schemas";
import { taskSyncSnapshotSchema } from "./sync.schemas";
import type { Json, SyncEntityType } from "./sync.types";

export type DomainSyncEntityType = Exclude<SyncEntityType, "user_settings">;

export type EntitySnapshot = Record<string, Json> & {
	id: string;
	userId: string;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	version: number;
};

export function isDomainSyncEntityType(
	value: SyncEntityType,
): value is DomainSyncEntityType {
	return (
		value === "task" ||
		value === "time_block" ||
		value === "calendar_event" ||
		value === "reminder" ||
		value === "book" ||
		value === "book_note"
	);
}

export function parseEntitySnapshot(
	entityType: DomainSyncEntityType,
	payload: unknown,
): EntitySnapshot {
	switch (entityType) {
		case "task":
			return taskSyncSnapshotSchema.parse(payload) as EntitySnapshot;

		case "time_block":
			return timeBlockSyncSnapshotSchema.parse(payload) as EntitySnapshot;

		case "calendar_event":
			return calendarEventSyncSnapshotSchema.parse(payload) as EntitySnapshot;

		case "reminder":
			return reminderSyncSnapshotSchema.parse(payload) as EntitySnapshot;

		case "book":
			return bookSyncSnapshotSchema.parse(payload) as EntitySnapshot;

		case "book_note":
			return bookNoteSyncSnapshotSchema.parse(payload) as EntitySnapshot;
	}
}

export async function getEntitySnapshot(
	entityType: DomainSyncEntityType,
	id: string,
): Promise<EntitySnapshot | null> {
	const db = getLocalDatabase();

	const value = await (() => {
		switch (entityType) {
			case "task":
				return db.tasks.get(id);
			case "time_block":
				return db.timeBlocks.get(id);
			case "calendar_event":
				return db.calendarEvents.get(id);
			case "reminder":
				return db.reminders.get(id);
			case "book":
				return db.books.get(id);
			case "book_note":
				return db.bookNotes.get(id);
		}
	})();

	return value ? (value as EntitySnapshot) : null;
}

export async function putEntitySnapshot(
	entityType: DomainSyncEntityType,
	snapshot: EntitySnapshot,
): Promise<void> {
	const db = getLocalDatabase();

	switch (entityType) {
		case "task":
			await db.tasks.put(snapshot as TaskRecord);
			return;

		case "time_block":
			await db.timeBlocks.put(snapshot as TimeBlockRecord);
			return;

		case "calendar_event":
			await db.calendarEvents.put(snapshot as CalendarEventRecord);
			return;

		case "reminder":
			await db.reminders.put(snapshot as ReminderRecord);
			return;

		case "book":
			await db.books.put(snapshot as BookRecord);
			return;

		case "book_note":
			await db.bookNotes.put(snapshot as BookNoteRecord);
	}
}

export async function deleteEntitySnapshot(
	entityType: DomainSyncEntityType,
	id: string,
): Promise<void> {
	const db = getLocalDatabase();

	switch (entityType) {
		case "task":
			await db.tasks.delete(id);
			return;
		case "time_block":
			await db.timeBlocks.delete(id);
			return;
		case "calendar_event":
			await db.calendarEvents.delete(id);
			return;
		case "reminder":
			await db.reminders.delete(id);
			return;
		case "book":
			await db.books.delete(id);
			return;
		case "book_note":
			await db.bookNotes.delete(id);
	}
}

export function cloneEntitySnapshot(
	entityType: DomainSyncEntityType,
	source: EntitySnapshot,
	userId: string,
	now = new Date(),
): EntitySnapshot {
	const timestamp = now.toISOString();

	const clone: EntitySnapshot = {
		...source,
		id: crypto.randomUUID(),
		userId,
		version: 1,
		createdAt: timestamp,
		updatedAt: timestamp,
		deletedAt: null,
	};

	if (entityType === "task") {
		clone.archivedAt = null;
	}

	return parseEntitySnapshot(entityType, clone);
}

export function getEntityTypeLabel(entityType: SyncEntityType): string {
	return {
		task: "Tarea",
		time_block: "Bloque de tiempo",
		calendar_event: "Evento",
		reminder: "Recordatorio",
		book: "Libro",
		book_note: "Nota de libro",
		user_settings: "Configuración",
	}[entityType];
}

export function getEntityDisplayName(payload: unknown): string {
	if (typeof payload === "object" && payload !== null) {
		for (const key of ["title", "content", "name"]) {
			const value = Reflect.get(payload, key);

			if (typeof value === "string" && value.trim()) {
				return value.trim().slice(0, 90);
			}
		}
	}
	return "Sin nombre";
}
