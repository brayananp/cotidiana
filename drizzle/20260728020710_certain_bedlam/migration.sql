CREATE TABLE `book` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`author` text,
	`isbn` text,
	`description` text,
	`cover_url` text,
	`status` text NOT NULL,
	`page_count` integer,
	`current_page` integer DEFAULT 0 NOT NULL,
	`rating` integer,
	`tags` text NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_book_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `book_note` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`book_id` text NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`page` integer,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_book_note_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_book_note_book_id_book_id_fk` FOREIGN KEY (`book_id`) REFERENCES `book`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `book_user_status_idx` ON `book` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `book_user_updated_idx` ON `book` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `book_user_isbn_idx` ON `book` (`user_id`,`isbn`);--> statement-breakpoint
CREATE INDEX `book_note_book_page_idx` ON `book_note` (`book_id`,`page`);--> statement-breakpoint
CREATE INDEX `book_note_user_updated_idx` ON `book_note` (`user_id`,`updated_at`);