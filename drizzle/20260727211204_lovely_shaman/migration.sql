CREATE TABLE `reminder` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`target_type` text NOT NULL,
	`target_id` text,
	`remind_at` integer NOT NULL,
	`next_trigger_at` integer,
	`snoozed_until` integer,
	`last_triggered_at` integer,
	`recurrence` text NOT NULL,
	`repeat_interval` integer DEFAULT 1 NOT NULL,
	`time_zone` text NOT NULL,
	`status` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_reminder_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `reminder_user_status_idx` ON `reminder` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `reminder_user_next_trigger_idx` ON `reminder` (`user_id`,`next_trigger_at`);--> statement-breakpoint
CREATE INDEX `reminder_user_updated_idx` ON `reminder` (`user_id`,`updated_at`);