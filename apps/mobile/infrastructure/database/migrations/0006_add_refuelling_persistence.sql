ALTER TABLE `vehicles` ADD `fuel_tank_capacity_microlitres` integer;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `fuel_volume_unit_preference` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `fuel_consumption_unit_preference` text;--> statement-breakpoint
CREATE TRIGGER `vehicles_fuel_configuration_insert`
BEFORE INSERT ON `vehicles`
FOR EACH ROW
WHEN NOT (
  (NEW.`fuel_tank_capacity_microlitres` IS NULL
    AND NEW.`fuel_volume_unit_preference` IS NULL
    AND NEW.`fuel_consumption_unit_preference` IS NULL)
  OR
  (COALESCE(NEW.`fuel_tank_capacity_microlitres` BETWEEN 1 AND 9007199254740991, 0)
    AND COALESCE(NEW.`fuel_volume_unit_preference` IN ('litres', 'usGallons', 'imperialGallons'), 0)
    AND COALESCE(NEW.`fuel_consumption_unit_preference` IN ('litresPer100Kilometres', 'milesPerUsGallon', 'milesPerImperialGallon'), 0))
)
BEGIN
  SELECT RAISE(ABORT, 'vehicle fuel configuration is incomplete or invalid');
END;--> statement-breakpoint
CREATE TRIGGER `vehicles_fuel_configuration_update`
BEFORE UPDATE OF `fuel_tank_capacity_microlitres`, `fuel_volume_unit_preference`, `fuel_consumption_unit_preference` ON `vehicles`
FOR EACH ROW
WHEN NOT (
  (NEW.`fuel_tank_capacity_microlitres` IS NULL
    AND NEW.`fuel_volume_unit_preference` IS NULL
    AND NEW.`fuel_consumption_unit_preference` IS NULL)
  OR
  (COALESCE(NEW.`fuel_tank_capacity_microlitres` BETWEEN 1 AND 9007199254740991, 0)
    AND COALESCE(NEW.`fuel_volume_unit_preference` IN ('litres', 'usGallons', 'imperialGallons'), 0)
    AND COALESCE(NEW.`fuel_consumption_unit_preference` IN ('litresPer100Kilometres', 'milesPerUsGallon', 'milesPerImperialGallon'), 0))
)
BEGIN
  SELECT RAISE(ABORT, 'vehicle fuel configuration is incomplete or invalid');
END;--> statement-breakpoint
CREATE TABLE `refuellings` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text NOT NULL,
	`occurred_at` text NOT NULL,
	`odometer_metres` integer,
	`quantity_microlitres` integer NOT NULL,
	`input_volume_unit` text NOT NULL,
	`fill_kind` text NOT NULL,
	`pricing_input_mode` text,
	`total_cost_minor_units` integer,
	`total_cost_currency` text,
	`unit_price_milli_units` integer,
	`unit_price_volume_unit` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "refuellings_odometer_range" CHECK("refuellings"."odometer_metres" is null or "refuellings"."odometer_metres" between 0 and 9007199254740991),
	CONSTRAINT "refuellings_quantity_range" CHECK("refuellings"."quantity_microlitres" between 1 and 9007199254740991),
	CONSTRAINT "refuellings_input_volume_unit" CHECK("refuellings"."input_volume_unit" in ('litres', 'usGallons', 'imperialGallons')),
	CONSTRAINT "refuellings_fill_kind" CHECK("refuellings"."fill_kind" in ('full', 'partial')),
	CONSTRAINT "refuellings_pricing_group" CHECK(("refuellings"."pricing_input_mode" is null and "refuellings"."total_cost_minor_units" is null and "refuellings"."total_cost_currency" is null and "refuellings"."unit_price_milli_units" is null and "refuellings"."unit_price_volume_unit" is null) or ("refuellings"."pricing_input_mode" is not null and "refuellings"."total_cost_minor_units" is not null and "refuellings"."total_cost_currency" is not null and "refuellings"."unit_price_milli_units" is not null and "refuellings"."unit_price_volume_unit" is not null and "refuellings"."pricing_input_mode" in ('total', 'perVolumeUnit') and "refuellings"."total_cost_minor_units" between 0 and 9007199254740991 and length("refuellings"."total_cost_currency") = 3 and upper("refuellings"."total_cost_currency") = "refuellings"."total_cost_currency" and "refuellings"."unit_price_milli_units" between 0 and 9007199254740991 and "refuellings"."unit_price_volume_unit" in ('litres', 'usGallons', 'imperialGallons')))
);--> statement-breakpoint
CREATE INDEX `refuellings_vehicle_timeline_index` ON `refuellings` (`vehicle_id`,`occurred_at`,`created_at`,`id`);
