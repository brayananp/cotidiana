import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth.schema";

const timestamp = (name: string) =>
	integer(name, {
		mode: "timestamp_ms",
	});

export const userSettings = sqliteTable(
	"user_settings",
	{
		id: text("id").primaryKey(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),

		locale: text("locale").$type<"es" | "en">().notNull(),

		weekStartsOn: integer("week_starts_on").$type<0 | 1>().notNull(),

		timeFormat: text("time_format").$type<"12h" | "24h">().notNull(),

		startPage: text("start_page")
			.$type<"dashboard" | "tasks" | "scheduling" | "reminders" | "library">()
			.notNull(),

		defaultTaskPriority: text("default_task_priority")
			.$type<"none" | "low" | "medium" | "high" | "urgent">()
			.notNull(),

		defaultReminderMinutes: integer("default_reminder_minutes").notNull(),

		denseMode: integer("dense_mode", {
			mode: "boolean",
		})
			.default(false)
			.notNull(),

		version: integer("version").default(1).notNull(),

		createdAt: timestamp("created_at").notNull(),
		updatedAt: timestamp("updated_at").notNull(),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		uniqueIndex("user_settings_user_unique").on(table.userId),
		index("user_settings_updated_idx").on(table.updatedAt),
	],
);
