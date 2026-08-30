// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from "./meta/_journal.json";
import m0000 from "./0000_create_vehicle_history_schema.sql";
import m0001 from "./0001_add_managed_vehicle_photos.sql";
import m0002 from "./0002_add_vehicle_documents.sql";

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
  },
};
