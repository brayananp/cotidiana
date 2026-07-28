import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth.schema";

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });

export const dailyReview = sqliteTable(
	"daily_review",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		reviewDate: text("review_date").notNull(),
		mood: integer("mood").notNull(),
		energy: integer("energy").notNull(),
		productivity: integer("productivity").notNull(),
		wins: text("wins"),
		blockers: text("blockers"),
		notes: text("notes"),
		tomorrowPriorities: text("tomorrow_priorities", { mode: "json" })
			.$type<string[]>()
			.notNull(),
		completedAt: timestamp("completed_at"),
		version: integer("version").default(1).notNull(),
		createdAt: timestamp("created_at").notNull(),
		updatedAt: timestamp("updated_at").notNull(),
		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		uniqueIndex("daily_review_user_date_unique").on(
			table.userId,
			table.reviewDate,
		),
		index("daily_review_user_updated_idx").on(table.userId, table.updatedAt),
	],
);
