CREATE TABLE `pending_data_reset` (
	`id` integer PRIMARY KEY NOT NULL,
	CONSTRAINT "pending_data_reset_singleton" CHECK("pending_data_reset"."id" = 1)
);
