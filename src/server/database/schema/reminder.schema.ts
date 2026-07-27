import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth.schema";

const timestamp = (name: string) =>
	integer(name, {
		mode: "timestamp_ms",
	});

export type RemoteReminderTargetType =
	| "custom"
	| "task"
	| "time_block"
	| "calendar_event";

export type RemoteReminderStatus =
	| "scheduled"
	| "snoozed"
	| "triggered"
	| "dismissed"
	| "cancelled";

export type RemoteReminderRecurrence = "none" | "daily" | "weekly" | "monthly";

export const reminder = sqliteTable(
	"reminder",
	{
		id: text("id").primaryKey(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),

		title: text("title").notNull(),
		notes: text("notes"),

		targetType: text("target_type").$type<RemoteReminderTargetType>().notNull(),

		targetId: text("target_id"),

		remindAt: timestamp("remind_at").notNull(),

		nextTriggerAt: timestamp("next_trigger_at"),

		snoozedUntil: timestamp("snoozed_until"),

		lastTriggeredAt: timestamp("last_triggered_at"),

		recurrence: text("recurrence").$type<RemoteReminderRecurrence>().notNull(),

		repeatInterval: integer("repeat_interval").default(1).notNull(),

		timeZone: text("time_zone").notNull(),

		status: text("status").$type<RemoteReminderStatus>().notNull(),

		version: integer("version").default(1).notNull(),

		createdAt: timestamp("created_at").notNull(),

		updatedAt: timestamp("updated_at").notNull(),

		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		index("reminder_user_status_idx").on(table.userId, table.status),

		index("reminder_user_next_trigger_idx").on(
			table.userId,
			table.nextTriggerAt,
		),

		index("reminder_user_updated_idx").on(table.userId, table.updatedAt),
	],
);
