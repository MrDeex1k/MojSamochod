CREATE TRIGGER `history_entries_vehicle_document_vehicle_update`
BEFORE UPDATE OF `vehicle_id` ON `history_entries`
FOR EACH ROW
WHEN EXISTS (
  SELECT 1
  FROM `vehicle_documents`
  WHERE `vehicle_documents`.`history_entry_id` = NEW.`id`
    AND `vehicle_documents`.`vehicle_id` != NEW.`vehicle_id`
)
BEGIN
  SELECT RAISE(ABORT, 'history entry document belongs to another vehicle');
END;
