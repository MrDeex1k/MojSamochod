-- Compatibility repair: legacy duplicates remain readable; new duplicates are rejected.
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
