UPDATE `vehicle_documents`
SET `history_entry_id` = NULL
WHERE `history_entry_id` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `history_entries`
    WHERE `history_entries`.`id` = `vehicle_documents`.`history_entry_id`
      AND `history_entries`.`vehicle_id` = `vehicle_documents`.`vehicle_id`
  );
--> statement-breakpoint
CREATE TRIGGER `vehicle_documents_history_entry_vehicle_insert`
BEFORE INSERT ON `vehicle_documents`
FOR EACH ROW
WHEN NEW.`history_entry_id` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `history_entries`
    WHERE `history_entries`.`id` = NEW.`history_entry_id`
      AND `history_entries`.`vehicle_id` = NEW.`vehicle_id`
  )
BEGIN
  SELECT RAISE(ABORT, 'vehicle document history entry belongs to another vehicle');
END;
--> statement-breakpoint
CREATE TRIGGER `vehicle_documents_history_entry_vehicle_update`
BEFORE UPDATE OF `vehicle_id`, `history_entry_id` ON `vehicle_documents`
FOR EACH ROW
WHEN NEW.`history_entry_id` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `history_entries`
    WHERE `history_entries`.`id` = NEW.`history_entry_id`
      AND `history_entries`.`vehicle_id` = NEW.`vehicle_id`
  )
BEGIN
  SELECT RAISE(ABORT, 'vehicle document history entry belongs to another vehicle');
END;
