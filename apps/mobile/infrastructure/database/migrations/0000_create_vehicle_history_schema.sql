CREATE TABLE `history_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text NOT NULL,
	`type` text NOT NULL,
	`occurred_at` text NOT NULL,
	`odometer_metres` integer,
	`cost_minor_units` integer,
	`cost_currency` text,
	`service_provider` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "history_entries_type" CHECK("history_entries"."type" in ('inspection', 'replacement', 'repair')),
	CONSTRAINT "history_entries_odometer_range" CHECK("history_entries"."odometer_metres" is null or "history_entries"."odometer_metres" between 0 and 9007199254740991),
	CONSTRAINT "history_entries_cost_pair" CHECK(("history_entries"."cost_minor_units" is null and "history_entries"."cost_currency" is null) or ("history_entries"."cost_minor_units" is not null and "history_entries"."cost_currency" is not null)),
	CONSTRAINT "history_entries_cost_range" CHECK("history_entries"."cost_minor_units" is null or "history_entries"."cost_minor_units" between 0 and 9007199254740991),
	CONSTRAINT "history_entries_currency_length" CHECK("history_entries"."cost_currency" is null or length("history_entries"."cost_currency") = 3),
	CONSTRAINT "history_entries_service_provider_length" CHECK("history_entries"."service_provider" is null or length("history_entries"."service_provider") <= 120),
	CONSTRAINT "history_entries_notes_length" CHECK("history_entries"."notes" is null or length("history_entries"."notes") <= 5000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `history_entries_id_type_unique` ON `history_entries` (`id`,`type`);--> statement-breakpoint
CREATE INDEX `history_entries_vehicle_timeline_index` ON `history_entries` (`vehicle_id`,`occurred_at`,`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `inspection_details` (
	`history_entry_id` text PRIMARY KEY NOT NULL,
	`entry_type` text DEFAULT 'inspection' NOT NULL,
	`kind` text NOT NULL,
	`result` text NOT NULL,
	`description` text,
	FOREIGN KEY (`history_entry_id`,`entry_type`) REFERENCES `history_entries`(`id`,`type`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "inspection_details_entry_type" CHECK("inspection_details"."entry_type" = 'inspection'),
	CONSTRAINT "inspection_details_kind" CHECK("inspection_details"."kind" in ('technical', 'diagnostic', 'other')),
	CONSTRAINT "inspection_details_result" CHECK("inspection_details"."result" in ('passed', 'failed', 'conditional', 'not-recorded')),
	CONSTRAINT "inspection_details_description_length" CHECK("inspection_details"."description" is null or length("inspection_details"."description") <= 200)
);
--> statement-breakpoint
CREATE TABLE `repair_details` (
	`history_entry_id` text PRIMARY KEY NOT NULL,
	`entry_type` text DEFAULT 'repair' NOT NULL,
	`subject` text NOT NULL,
	`description` text,
	FOREIGN KEY (`history_entry_id`,`entry_type`) REFERENCES `history_entries`(`id`,`type`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "repair_details_entry_type" CHECK("repair_details"."entry_type" = 'repair'),
	CONSTRAINT "repair_details_subject_length" CHECK(length(trim("repair_details"."subject")) between 1 and 120),
	CONSTRAINT "repair_details_description_length" CHECK("repair_details"."description" is null or length("repair_details"."description") <= 500)
);
--> statement-breakpoint
CREATE TABLE `replacement_details` (
	`history_entry_id` text PRIMARY KEY NOT NULL,
	`entry_type` text DEFAULT 'replacement' NOT NULL,
	`item` text NOT NULL,
	`manufacturer` text,
	`part_number` text,
	FOREIGN KEY (`history_entry_id`,`entry_type`) REFERENCES `history_entries`(`id`,`type`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "replacement_details_entry_type" CHECK("replacement_details"."entry_type" = 'replacement'),
	CONSTRAINT "replacement_details_item_length" CHECK(length(trim("replacement_details"."item")) between 1 and 120),
	CONSTRAINT "replacement_details_manufacturer_length" CHECK("replacement_details"."manufacturer" is null or length("replacement_details"."manufacturer") <= 100),
	CONSTRAINT "replacement_details_part_number_length" CHECK("replacement_details"."part_number" is null or length("replacement_details"."part_number") <= 100)
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`make` text NOT NULL,
	`model` text NOT NULL,
	`variant` text,
	`manufacture_year` integer,
	`registration_number` text,
	`vin` text,
	`initial_odometer_metres` integer,
	`current_odometer_metres` integer,
	`distance_unit_preference` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "vehicles_make_length" CHECK(length(trim("vehicles"."make")) between 1 and 80),
	CONSTRAINT "vehicles_model_length" CHECK(length(trim("vehicles"."model")) between 1 and 80),
	CONSTRAINT "vehicles_variant_length" CHECK("vehicles"."variant" is null or length("vehicles"."variant") <= 100),
	CONSTRAINT "vehicles_manufacture_year_range" CHECK("vehicles"."manufacture_year" is null or "vehicles"."manufacture_year" between 1000 and 9999),
	CONSTRAINT "vehicles_registration_number_length" CHECK("vehicles"."registration_number" is null or length("vehicles"."registration_number") <= 20),
	CONSTRAINT "vehicles_vin_length" CHECK("vehicles"."vin" is null or length("vehicles"."vin") = 17),
	CONSTRAINT "vehicles_initial_odometer_range" CHECK("vehicles"."initial_odometer_metres" is null or "vehicles"."initial_odometer_metres" between 0 and 9007199254740991),
	CONSTRAINT "vehicles_current_odometer_range" CHECK("vehicles"."current_odometer_metres" is null or "vehicles"."current_odometer_metres" between 0 and 9007199254740991),
	CONSTRAINT "vehicles_distance_unit" CHECK("vehicles"."distance_unit_preference" in ('kilometres', 'miles'))
);
