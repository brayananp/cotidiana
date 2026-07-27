import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth.schema";

const timestamp = (name: string) =>
	integer(name, {
		mode: "timestamp_ms",
	});

export const device = sqliteTable(
	"device",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),
		name: text("name").notNull(),
		platform: text("platform"),
		createdAt: timestamp("created_at")
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: timestamp("updated_at")
			.$defaultFn(() => new Date())
			.notNull(),
		lastSeenAt: timestamp("last_seen_at")
			.$defaultFn(() => new Date())
			.notNull(),
		revokedAt: timestamp("revoked_at"),
	},
	(table) => [
		index("device_user_id_idx").on(table.userId),
		index("device_last_seen_at_idx").on(table.lastSeenAt),
	],
);
