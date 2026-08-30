CREATE TABLE `managed_files` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`staging_key` text,
	`storage_key` text,
	`mime_type` text NOT NULL,
	`original_name` text NOT NULL,
	`byte_size` integer NOT NULL,
	`sha256` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "managed_files_kind" CHECK("managed_files"."kind" in ('vehicle-photo', 'document')),
	CONSTRAINT "managed_files_status" CHECK("managed_files"."status" in ('staged', 'ready', 'deleting')),
	CONSTRAINT "managed_files_mime_type_length" CHECK(length(trim("managed_files"."mime_type")) between 1 and 120),
	CONSTRAINT "managed_files_original_name_length" CHECK(length(trim("managed_files"."original_name")) between 1 and 255),
	CONSTRAINT "managed_files_byte_size" CHECK("managed_files"."byte_size" between 0 and 9007199254740991),
	CONSTRAINT "managed_files_sha256" CHECK(length("managed_files"."sha256") = 64 and lower("managed_files"."sha256") = "managed_files"."sha256"),
	CONSTRAINT "managed_files_location_state" CHECK(("managed_files"."status" = 'staged' and "managed_files"."staging_key" is not null and "managed_files"."storage_key" is null) or ("managed_files"."status" in ('ready', 'deleting') and "managed_files"."staging_key" is null and "managed_files"."storage_key" is not null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `managed_files_staging_key_unique` ON `managed_files` (`staging_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `managed_files_storage_key_unique` ON `managed_files` (`storage_key`);--> statement-breakpoint
ALTER TABLE `vehicles` ADD `photo_reference` text REFERENCES managed_files(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_photo_reference_unique` ON `vehicles` (`photo_reference`);
