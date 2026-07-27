CREATE TABLE `calendar_event` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`location` text,
	`event_type` text NOT NULL,
	`start_at` integer NOT NULL,
	`end_at` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_calendar_event_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `time_block` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`task_id` text,
	`title` text NOT NULL,
	`notes` text,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`start_at` integer NOT NULL,
	`end_at` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_time_block_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `calendar_event_user_start_idx` ON `calendar_event` (`user_id`,`start_at`);--> statement-breakpoint
CREATE INDEX `calendar_event_user_updated_idx` ON `calendar_event` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `time_block_user_start_idx` ON `time_block` (`user_id`,`start_at`);--> statement-breakpoint
CREATE INDEX `time_block_user_updated_idx` ON `time_block` (`user_id`,`updated_at`);