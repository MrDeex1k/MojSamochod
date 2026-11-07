-- Preserve existing records and handwritten relation triggers; validate subsequent writes.
DROP INDEX history_entries_vehicle_timeline_index;
--> statement-breakpoint
CREATE INDEX history_entries_vehicle_timeline_index ON history_entries(vehicle_id, occurred_at DESC, created_at DESC, id ASC);
--> statement-breakpoint
DROP INDEX refuellings_vehicle_timeline_index;
--> statement-breakpoint
CREATE INDEX refuellings_vehicle_timeline_index ON refuellings(vehicle_id, occurred_at DESC, created_at DESC, id ASC);
--> statement-breakpoint
DROP INDEX vehicle_documents_vehicle_date_index;
--> statement-breakpoint
CREATE INDEX vehicle_documents_vehicle_date_index ON vehicle_documents(vehicle_id, document_date DESC, created_at DESC, id ASC);
--> statement-breakpoint
DROP INDEX managed_files_document_sha256_unique;
--> statement-breakpoint
CREATE INDEX managed_files_document_sha256_unique ON managed_files(sha256) WHERE kind = 'document' AND status IN ('staged', 'ready');
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS managed_files_document_hash_insert
BEFORE INSERT ON managed_files
WHEN NEW.kind = 'document' AND NEW.status IN ('staged', 'ready') AND EXISTS (
 SELECT 1 FROM managed_files WHERE kind = 'document' AND status IN ('staged', 'ready') AND sha256 = NEW.sha256
)
BEGIN SELECT RAISE(ABORT, 'UNIQUE constraint failed: managed_files.sha256'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS managed_files_document_hash_update
BEFORE UPDATE ON managed_files
WHEN NEW.kind = 'document' AND NEW.status IN ('staged', 'ready')
 AND (OLD.kind != NEW.kind OR OLD.sha256 != NEW.sha256 OR OLD.status NOT IN ('staged', 'ready'))
 AND EXISTS (SELECT 1 FROM managed_files WHERE id != NEW.id AND kind = 'document' AND status IN ('staged', 'ready') AND sha256 = NEW.sha256)
BEGIN SELECT RAISE(ABORT, 'UNIQUE constraint failed: managed_files.sha256'); END;

--> statement-breakpoint
CREATE TRIGGER vehicles_integer_values_insert BEFORE INSERT ON vehicles WHEN (NEW.manufacture_year IS NOT NULL AND typeof(NEW.manufacture_year) != 'integer') OR (NEW.initial_odometer_metres IS NOT NULL AND typeof(NEW.initial_odometer_metres) != 'integer') OR (NEW.current_odometer_metres IS NOT NULL AND typeof(NEW.current_odometer_metres) != 'integer') BEGIN SELECT RAISE(ABORT, 'CHECK constraint failed: vehicles_integer_values'); END;
--> statement-breakpoint
CREATE TRIGGER vehicles_integer_values_update BEFORE UPDATE ON vehicles WHEN (NEW.manufacture_year IS NOT NULL AND typeof(NEW.manufacture_year) != 'integer') OR (NEW.initial_odometer_metres IS NOT NULL AND typeof(NEW.initial_odometer_metres) != 'integer') OR (NEW.current_odometer_metres IS NOT NULL AND typeof(NEW.current_odometer_metres) != 'integer') BEGIN SELECT RAISE(ABORT, 'CHECK constraint failed: vehicles_integer_values'); END;
--> statement-breakpoint
CREATE TRIGGER history_entries_integer_values_insert BEFORE INSERT ON history_entries WHEN (NEW.odometer_metres IS NOT NULL AND typeof(NEW.odometer_metres) != 'integer') OR (NEW.cost_minor_units IS NOT NULL AND typeof(NEW.cost_minor_units) != 'integer') BEGIN SELECT RAISE(ABORT, 'CHECK constraint failed: history_entries_integer_values'); END;
--> statement-breakpoint
CREATE TRIGGER history_entries_integer_values_update BEFORE UPDATE ON history_entries WHEN (NEW.odometer_metres IS NOT NULL AND typeof(NEW.odometer_metres) != 'integer') OR (NEW.cost_minor_units IS NOT NULL AND typeof(NEW.cost_minor_units) != 'integer') BEGIN SELECT RAISE(ABORT, 'CHECK constraint failed: history_entries_integer_values'); END;
--> statement-breakpoint
CREATE TRIGGER vehicle_documents_integer_values_insert BEFORE INSERT ON vehicle_documents WHEN (NEW.amount_minor_units IS NOT NULL AND typeof(NEW.amount_minor_units) != 'integer') BEGIN SELECT RAISE(ABORT, 'CHECK constraint failed: vehicle_documents_integer_values'); END;
--> statement-breakpoint
CREATE TRIGGER vehicle_documents_integer_values_update BEFORE UPDATE ON vehicle_documents WHEN (NEW.amount_minor_units IS NOT NULL AND typeof(NEW.amount_minor_units) != 'integer') BEGIN SELECT RAISE(ABORT, 'CHECK constraint failed: vehicle_documents_integer_values'); END;
--> statement-breakpoint
CREATE TRIGGER managed_files_integer_values_insert BEFORE INSERT ON managed_files WHEN (NEW.byte_size IS NOT NULL AND typeof(NEW.byte_size) != 'integer') BEGIN SELECT RAISE(ABORT, 'CHECK constraint failed: managed_files_integer_values'); END;
--> statement-breakpoint
CREATE TRIGGER managed_files_integer_values_update BEFORE UPDATE ON managed_files WHEN (NEW.byte_size IS NOT NULL AND typeof(NEW.byte_size) != 'integer') BEGIN SELECT RAISE(ABORT, 'CHECK constraint failed: managed_files_integer_values'); END;
--> statement-breakpoint
CREATE TRIGGER refuellings_integer_values_insert BEFORE INSERT ON refuellings WHEN (NEW.quantity_microlitres IS NOT NULL AND typeof(NEW.quantity_microlitres) != 'integer') OR (NEW.odometer_metres IS NOT NULL AND typeof(NEW.odometer_metres) != 'integer') OR (NEW.total_cost_minor_units IS NOT NULL AND typeof(NEW.total_cost_minor_units) != 'integer') OR (NEW.unit_price_milli_units IS NOT NULL AND typeof(NEW.unit_price_milli_units) != 'integer') BEGIN SELECT RAISE(ABORT, 'CHECK constraint failed: refuellings_integer_values'); END;
--> statement-breakpoint
CREATE TRIGGER refuellings_integer_values_update BEFORE UPDATE ON refuellings WHEN (NEW.quantity_microlitres IS NOT NULL AND typeof(NEW.quantity_microlitres) != 'integer') OR (NEW.odometer_metres IS NOT NULL AND typeof(NEW.odometer_metres) != 'integer') OR (NEW.total_cost_minor_units IS NOT NULL AND typeof(NEW.total_cost_minor_units) != 'integer') OR (NEW.unit_price_milli_units IS NOT NULL AND typeof(NEW.unit_price_milli_units) != 'integer') BEGIN SELECT RAISE(ABORT, 'CHECK constraint failed: refuellings_integer_values'); END;
--> statement-breakpoint
CREATE TRIGGER vehicle_documents_valid_date_insert BEFORE INSERT ON vehicle_documents WHEN NEW.document_date IS NOT NULL AND (NEW.document_date < '0001-01-01' OR date(NEW.document_date, '+0 days') IS NULL OR date(NEW.document_date, '+0 days') != NEW.document_date) BEGIN SELECT RAISE(ABORT, 'CHECK constraint failed: vehicle_documents_date_format'); END;
--> statement-breakpoint
CREATE TRIGGER vehicle_documents_valid_date_update BEFORE UPDATE ON vehicle_documents WHEN NEW.document_date IS NOT NULL AND (NEW.document_date < '0001-01-01' OR date(NEW.document_date, '+0 days') IS NULL OR date(NEW.document_date, '+0 days') != NEW.document_date) BEGIN SELECT RAISE(ABORT, 'CHECK constraint failed: vehicle_documents_date_format'); END;
