import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth.schema";
import { device } from "./device.schema";

const timestamp = (name: string) =>
	integer(name, {
		mode: "timestamp_ms",
	});

export const syncChange = sqliteTable(
	"sync_change",
	{
		sequence: integer("sequence").primaryKey({
			autoIncrement: true,
		}),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),

		entityType: text("entity_type").notNull(),

		entityId: text("entity_id").notNull(),

		operation: text("operation").notNull(),

		version: integer("version").notNull(),

		payload: text("payload", {
			mode: "json",
		}).$type<unknown>(),

		createdAt: timestamp("created_at").notNull(),
	},
	(table) => [
		index("sync_change_user_sequence_idx").on(table.userId, table.sequence),

		index("sync_change_entity_idx").on(table.entityType, table.entityId),
	],
);

export const processedOperation = sqliteTable(
	"processed_operation",
	{
		operationId: text("operation_id").primaryKey(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),

		deviceId: text("device_id")
			.notNull()
			.references(() => device.id, {
				onDelete: "cascade",
			}),

		result: text("result", {
			mode: "json",
		})
			.$type<unknown>()
			.notNull(),

		processedAt: timestamp("processed_at").notNull(),
	},
	(table) => [
		index("processed_operation_user_device_idx").on(
			table.userId,
			table.deviceId,
		),
	],
);
