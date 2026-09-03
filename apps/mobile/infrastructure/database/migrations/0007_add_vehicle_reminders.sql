CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text NOT NULL,
	`kind` text NOT NULL,
	`due_date` text NOT NULL,
	`time_zone` text NOT NULL,
	`notify_seven_days_before` integer NOT NULL,
	`notify_one_day_before` integer NOT NULL,
	`notify_on_due_date` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "reminders_kind" CHECK("reminders"."kind" in ('insurance', 'technicalInspection')),
	CONSTRAINT "reminders_due_date" CHECK("reminders"."due_date" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' and "reminders"."due_date" >= '0001-01-01' and date("reminders"."due_date", '+0 days') is not null and date("reminders"."due_date", '+0 days') = "reminders"."due_date"),
	CONSTRAINT "reminders_time_zone" CHECK(length(trim("reminders"."time_zone")) > 0 and trim("reminders"."time_zone") = "reminders"."time_zone"),
	CONSTRAINT "reminders_notify_seven_days" CHECK("reminders"."notify_seven_days_before" in (0, 1)),
	CONSTRAINT "reminders_notify_one_day" CHECK("reminders"."notify_one_day_before" in (0, 1)),
	CONSTRAINT "reminders_notify_due_date" CHECK("reminders"."notify_on_due_date" in (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reminders_vehicle_kind_unique` ON `reminders` (`vehicle_id`,`kind`);