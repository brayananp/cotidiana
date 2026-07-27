import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth.schema";

const timestamp = (name: string) =>
	integer(name, {
		mode: "timestamp_ms",
	});

export type RemoteTimeBlockKind = "task" | "focus" | "break" | "personal";

export type RemoteTimeBlockStatus = "planned" | "completed" | "cancelled";

export type RemoteCalendarEventType =
	| "meeting"
	| "appointment"
	| "personal"
	| "other";

export const timeBlock = sqliteTable(
	"time_block",
	{
		id: text("id").primaryKey(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),

		taskId: text("task_id"),
		title: text("title").notNull(),
		notes: text("notes"),

		kind: text("kind").$type<RemoteTimeBlockKind>().notNull(),

		status: text("status").$type<RemoteTimeBlockStatus>().notNull(),

		startAt: timestamp("start_at").notNull(),
		endAt: timestamp("end_at").notNull(),

		version: integer("version").default(1).notNull(),

		createdAt: timestamp("created_at").notNull(),

		updatedAt: timestamp("updated_at").notNull(),

		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		index("time_block_user_start_idx").on(table.userId, table.startAt),

		index("time_block_user_updated_idx").on(table.userId, table.updatedAt),
	],
);

export const calendarEvent = sqliteTable(
	"calendar_event",
	{
		id: text("id").primaryKey(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),

		title: text("title").notNull(),
		notes: text("notes"),
		location: text("location"),

		eventType: text("event_type").$type<RemoteCalendarEventType>().notNull(),

		startAt: timestamp("start_at").notNull(),
		endAt: timestamp("end_at").notNull(),

		version: integer("version").default(1).notNull(),

		createdAt: timestamp("created_at").notNull(),

		updatedAt: timestamp("updated_at").notNull(),

		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		index("calendar_event_user_start_idx").on(table.userId, table.startAt),

		index("calendar_event_user_updated_idx").on(table.userId, table.updatedAt),
	],
);
