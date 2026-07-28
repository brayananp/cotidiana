CREATE TABLE `daily_review` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`review_date` text NOT NULL,
	`mood` integer NOT NULL,
	`energy` integer NOT NULL,
	`productivity` integer NOT NULL,
	`wins` text,
	`blockers` text,
	`notes` text,
	`tomorrow_priorities` text NOT NULL,
	`completed_at` integer,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_daily_review_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_review_user_date_unique` ON `daily_review` (`user_id`,`review_date`);--> statement-breakpoint
CREATE INDEX `daily_review_user_updated_idx` ON `daily_review` (`user_id`,`updated_at`);