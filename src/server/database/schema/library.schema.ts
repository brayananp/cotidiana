import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth.schema";

const timestamp = (name: string) =>
	integer(name, {
		mode: "timestamp_ms",
	});

export type RemoteBookStatus =
	| "want_to_read"
	| "reading"
	| "completed"
	| "paused"
	| "dropped";

export type RemoteBookNoteType = "note" | "quote" | "idea";

export const book = sqliteTable(
	"book",
	{
		id: text("id").primaryKey(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),

		title: text("title").notNull(),
		author: text("author"),
		isbn: text("isbn"),
		description: text("description"),
		coverUrl: text("cover_url"),

		status: text("status").$type<RemoteBookStatus>().notNull(),

		pageCount: integer("page_count"),
		currentPage: integer("current_page").default(0).notNull(),

		rating: integer("rating"),

		tags: text("tags", {
			mode: "json",
		})
			.$type<string[]>()
			.notNull(),

		startedAt: timestamp("started_at"),

		completedAt: timestamp("completed_at"),

		version: integer("version").default(1).notNull(),

		createdAt: timestamp("created_at").notNull(),

		updatedAt: timestamp("updated_at").notNull(),

		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		index("book_user_status_idx").on(table.userId, table.status),

		index("book_user_updated_idx").on(table.userId, table.updatedAt),

		index("book_user_isbn_idx").on(table.userId, table.isbn),
	],
);

export const bookNote = sqliteTable(
	"book_note",
	{
		id: text("id").primaryKey(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),

		bookId: text("book_id")
			.notNull()
			.references(() => book.id, {
				onDelete: "cascade",
			}),

		type: text("type").$type<RemoteBookNoteType>().notNull(),

		content: text("content").notNull(),

		page: integer("page"),

		version: integer("version").default(1).notNull(),

		createdAt: timestamp("created_at").notNull(),

		updatedAt: timestamp("updated_at").notNull(),

		deletedAt: timestamp("deleted_at"),
	},
	(table) => [
		index("book_note_book_page_idx").on(table.bookId, table.page),

		index("book_note_user_updated_idx").on(table.userId, table.updatedAt),
	],
);
