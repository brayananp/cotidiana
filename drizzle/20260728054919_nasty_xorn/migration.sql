CREATE TABLE `user_settings` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`locale` text NOT NULL,
	`week_starts_on` integer NOT NULL,
	`time_format` text NOT NULL,
	`start_page` text NOT NULL,
	`default_task_priority` text NOT NULL,
	`default_reminder_minutes` integer NOT NULL,
	`dense_mode` integer DEFAULT false NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_user_settings_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_user_unique` ON `user_settings` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_settings_updated_idx` ON `user_settings` (`updated_at`);