import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth.schema";

export type RemoteTaskStatus = "todo" | "in_progress" | "done";

export type RemoteTaskPriority = "none" | "low" | "medium" | "high" | "urgent";

const timestamp = (name: string) =>
	integer(name, {
		mode: "timestamp_ms",
	});

export const task = sqliteTable(
	"task",
	{
		id: text("id").primaryKey(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),

		title: text("title").notNull(),
		description: text("description"),

		status: text("status").$type<RemoteTaskStatus>().notNull(),

		priority: text("priority").$type<RemoteTaskPriority>().notNull(),

		plannedAt: timestamp("planned_at"),
		dueAt: timestamp("due_at"),
		completedAt: timestamp("completed_at"),
		archivedAt: timestamp("archived_at"),

		sortOrder: integer("sort_order").default(0).notNull(),

		version: integer("version").default(1).notNull(),

		createdAt: timestamp("created_at").notNull(),

		updatedAt: timestamp("updated_at").notNull(),

		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		index("task_user_status_idx").on(table.userId, table.status),

		index("task_user_updated_idx").on(table.userId, table.updatedAt),

		index("task_user_due_idx").on(table.userId, table.dueAt),
	],
);
