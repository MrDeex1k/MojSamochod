CREATE TABLE `vehicle_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text NOT NULL,
	`history_entry_id` text,
	`file_reference` text NOT NULL,
	`name` text NOT NULL,
	`document_date` text,
	`amount_minor_units` integer,
	`amount_currency` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`history_entry_id`) REFERENCES `history_entries`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`file_reference`) REFERENCES `managed_files`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "vehicle_documents_name_length" CHECK(length(trim("vehicle_documents"."name")) between 1 and 255),
	CONSTRAINT "vehicle_documents_date_format" CHECK("vehicle_documents"."document_date" is null or ("vehicle_documents"."document_date" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' and date("vehicle_documents"."document_date") = "vehicle_documents"."document_date")),
	CONSTRAINT "vehicle_documents_amount_pair" CHECK(("vehicle_documents"."amount_minor_units" is null and "vehicle_documents"."amount_currency" is null) or ("vehicle_documents"."amount_minor_units" is not null and "vehicle_documents"."amount_currency" is not null)),
	CONSTRAINT "vehicle_documents_amount_range" CHECK("vehicle_documents"."amount_minor_units" is null or "vehicle_documents"."amount_minor_units" between 0 and 9007199254740991),
	CONSTRAINT "vehicle_documents_currency_length" CHECK("vehicle_documents"."amount_currency" is null or length("vehicle_documents"."amount_currency") = 3),
	CONSTRAINT "vehicle_documents_notes_length" CHECK("vehicle_documents"."notes" is null or length("vehicle_documents"."notes") <= 5000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehicle_documents_file_reference_unique` ON `vehicle_documents` (`file_reference`);--> statement-breakpoint
CREATE INDEX `vehicle_documents_vehicle_date_index` ON `vehicle_documents` (`vehicle_id`,`document_date`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `vehicle_documents_history_entry_index` ON `vehicle_documents` (`history_entry_id`);