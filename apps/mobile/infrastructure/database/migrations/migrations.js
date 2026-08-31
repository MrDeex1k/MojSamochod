import journal from "./meta/_journal.json";
import m0000 from "./0000_create_vehicle_history_schema.sql";
import m0001 from "./0001_add_managed_vehicle_photos.sql";
import m0002 from "./0002_add_vehicle_documents.sql";
import m0003 from "./0003_enforce_document_sha256_uniqueness.sql";
import m0004 from "./0004_enforce_document_entry_vehicle_consistency.sql";

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
    m0004,
  },
};
