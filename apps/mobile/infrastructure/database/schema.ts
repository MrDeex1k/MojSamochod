import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const managedFiles = sqliteTable(
  "managed_files",
  {
    id: text("id").primaryKey(),
    kind: text("kind", { enum: ["vehicle-photo", "document"] }).notNull(),
    status: text("status", { enum: ["staged", "ready", "deleting"] }).notNull(),
    stagingKey: text("staging_key"),
    storageKey: text("storage_key"),
    mimeType: text("mime_type").notNull(),
    originalName: text("original_name").notNull(),
    byteSize: integer("byte_size").notNull(),
    sha256: text("sha256").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("managed_files_document_sha256_unique")
      .on(table.sha256)
      .where(sql`${table.kind} = 'document' and ${table.status} in ('staged', 'ready')`),
    uniqueIndex("managed_files_staging_key_unique").on(table.stagingKey),
    uniqueIndex("managed_files_storage_key_unique").on(table.storageKey),
    check("managed_files_kind", sql`${table.kind} in ('vehicle-photo', 'document')`),
    check("managed_files_status", sql`${table.status} in ('staged', 'ready', 'deleting')`),
    check("managed_files_mime_type_length", sql`length(trim(${table.mimeType})) between 1 and 120`),
    check(
      "managed_files_original_name_length",
      sql`length(trim(${table.originalName})) between 1 and 255`,
    ),
    check("managed_files_byte_size", sql`${table.byteSize} between 0 and 9007199254740991`),
    check(
      "managed_files_sha256",
      sql`length(${table.sha256}) = 64 and lower(${table.sha256}) = ${table.sha256}`,
    ),
    check(
      "managed_files_location_state",
      sql`(${table.status} = 'staged' and ${table.stagingKey} is not null and ${table.storageKey} is null) or (${table.status} in ('ready', 'deleting') and ${table.stagingKey} is null and ${table.storageKey} is not null)`,
    ),
  ],
);

export const vehicles = sqliteTable(
  "vehicles",
  {
    id: text("id").primaryKey(),
    make: text("make").notNull(),
    model: text("model").notNull(),
    variant: text("variant"),
    manufactureYear: integer("manufacture_year"),
    registrationNumber: text("registration_number"),
    vin: text("vin"),
    photoReference: text("photo_reference").references(() => managedFiles.id, {
      onDelete: "set null",
    }),
    initialOdometerMetres: integer("initial_odometer_metres"),
    currentOdometerMetres: integer("current_odometer_metres"),
    distanceUnitPreference: text("distance_unit_preference", {
      enum: ["kilometres", "miles"],
    }).notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("vehicles_photo_reference_unique").on(table.photoReference),
    check("vehicles_make_length", sql`length(trim(${table.make})) between 1 and 80`),
    check("vehicles_model_length", sql`length(trim(${table.model})) between 1 and 80`),
    check(
      "vehicles_variant_length",
      sql`${table.variant} is null or length(${table.variant}) <= 100`,
    ),
    check(
      "vehicles_manufacture_year_range",
      sql`${table.manufactureYear} is null or ${table.manufactureYear} between 1000 and 9999`,
    ),
    check(
      "vehicles_registration_number_length",
      sql`${table.registrationNumber} is null or length(${table.registrationNumber}) <= 20`,
    ),
    check("vehicles_vin_length", sql`${table.vin} is null or length(${table.vin}) = 17`),
    check(
      "vehicles_initial_odometer_range",
      sql`${table.initialOdometerMetres} is null or ${table.initialOdometerMetres} between 0 and 9007199254740991`,
    ),
    check(
      "vehicles_current_odometer_range",
      sql`${table.currentOdometerMetres} is null or ${table.currentOdometerMetres} between 0 and 9007199254740991`,
    ),
    check(
      "vehicles_distance_unit",
      sql`${table.distanceUnitPreference} in ('kilometres', 'miles')`,
    ),
  ],
);

export const historyEntries = sqliteTable(
  "history_entries",
  {
    id: text("id").primaryKey(),
    vehicleId: text("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["inspection", "replacement", "repair"] }).notNull(),
    occurredAt: text("occurred_at").notNull(),
    odometerMetres: integer("odometer_metres"),
    costMinorUnits: integer("cost_minor_units"),
    costCurrency: text("cost_currency"),
    serviceProvider: text("service_provider"),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("history_entries_id_type_unique").on(table.id, table.type),
    index("history_entries_vehicle_timeline_index").on(
      table.vehicleId,
      table.occurredAt,
      table.createdAt,
      table.id,
    ),
    check("history_entries_type", sql`${table.type} in ('inspection', 'replacement', 'repair')`),
    check(
      "history_entries_odometer_range",
      sql`${table.odometerMetres} is null or ${table.odometerMetres} between 0 and 9007199254740991`,
    ),
    check(
      "history_entries_cost_pair",
      sql`(${table.costMinorUnits} is null and ${table.costCurrency} is null) or (${table.costMinorUnits} is not null and ${table.costCurrency} is not null)`,
    ),
    check(
      "history_entries_cost_range",
      sql`${table.costMinorUnits} is null or ${table.costMinorUnits} between 0 and 9007199254740991`,
    ),
    check(
      "history_entries_currency_length",
      sql`${table.costCurrency} is null or length(${table.costCurrency}) = 3`,
    ),
    check(
      "history_entries_service_provider_length",
      sql`${table.serviceProvider} is null or length(${table.serviceProvider}) <= 120`,
    ),
    check(
      "history_entries_notes_length",
      sql`${table.notes} is null or length(${table.notes}) <= 5000`,
    ),
  ],
);

export const vehicleDocuments = sqliteTable(
  "vehicle_documents",
  {
    id: text("id").primaryKey(),
    vehicleId: text("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    historyEntryId: text("history_entry_id").references(() => historyEntries.id, {
      onDelete: "set null",
    }),
    fileReference: text("file_reference")
      .notNull()
      .references(() => managedFiles.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    documentDate: text("document_date"),
    amountMinorUnits: integer("amount_minor_units"),
    amountCurrency: text("amount_currency"),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("vehicle_documents_file_reference_unique").on(table.fileReference),
    index("vehicle_documents_vehicle_date_index").on(
      table.vehicleId,
      table.documentDate,
      table.createdAt,
      table.id,
    ),
    index("vehicle_documents_history_entry_index").on(table.historyEntryId),
    check("vehicle_documents_name_length", sql`length(trim(${table.name})) between 1 and 255`),
    check(
      "vehicle_documents_date_format",
      sql`${table.documentDate} is null or (${table.documentDate} glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' and date(${table.documentDate}) = ${table.documentDate})`,
    ),
    check(
      "vehicle_documents_amount_pair",
      sql`(${table.amountMinorUnits} is null and ${table.amountCurrency} is null) or (${table.amountMinorUnits} is not null and ${table.amountCurrency} is not null)`,
    ),
    check(
      "vehicle_documents_amount_range",
      sql`${table.amountMinorUnits} is null or ${table.amountMinorUnits} between 0 and 9007199254740991`,
    ),
    check(
      "vehicle_documents_currency_length",
      sql`${table.amountCurrency} is null or length(${table.amountCurrency}) = 3`,
    ),
    check(
      "vehicle_documents_notes_length",
      sql`${table.notes} is null or length(${table.notes}) <= 5000`,
    ),
  ],
);

export const inspectionDetails = sqliteTable(
  "inspection_details",
  {
    historyEntryId: text("history_entry_id").primaryKey(),
    entryType: text("entry_type", { enum: ["inspection"] })
      .notNull()
      .default("inspection"),
    kind: text("kind", { enum: ["technical", "diagnostic", "other"] }).notNull(),
    result: text("result", {
      enum: ["passed", "failed", "conditional", "not-recorded"],
    }).notNull(),
    description: text("description"),
  },
  (table) => [
    foreignKey({
      columns: [table.historyEntryId, table.entryType],
      foreignColumns: [historyEntries.id, historyEntries.type],
      name: "inspection_details_entry_foreign_key",
    }).onDelete("cascade"),
    check("inspection_details_entry_type", sql`${table.entryType} = 'inspection'`),
    check("inspection_details_kind", sql`${table.kind} in ('technical', 'diagnostic', 'other')`),
    check(
      "inspection_details_result",
      sql`${table.result} in ('passed', 'failed', 'conditional', 'not-recorded')`,
    ),
    check(
      "inspection_details_description_length",
      sql`${table.description} is null or length(${table.description}) <= 200`,
    ),
  ],
);

export const replacementDetails = sqliteTable(
  "replacement_details",
  {
    historyEntryId: text("history_entry_id").primaryKey(),
    entryType: text("entry_type", { enum: ["replacement"] })
      .notNull()
      .default("replacement"),
    item: text("item").notNull(),
    manufacturer: text("manufacturer"),
    partNumber: text("part_number"),
  },
  (table) => [
    foreignKey({
      columns: [table.historyEntryId, table.entryType],
      foreignColumns: [historyEntries.id, historyEntries.type],
      name: "replacement_details_entry_foreign_key",
    }).onDelete("cascade"),
    check("replacement_details_entry_type", sql`${table.entryType} = 'replacement'`),
    check("replacement_details_item_length", sql`length(trim(${table.item})) between 1 and 120`),
    check(
      "replacement_details_manufacturer_length",
      sql`${table.manufacturer} is null or length(${table.manufacturer}) <= 100`,
    ),
    check(
      "replacement_details_part_number_length",
      sql`${table.partNumber} is null or length(${table.partNumber}) <= 100`,
    ),
  ],
);

export const repairDetails = sqliteTable(
  "repair_details",
  {
    historyEntryId: text("history_entry_id").primaryKey(),
    entryType: text("entry_type", { enum: ["repair"] })
      .notNull()
      .default("repair"),
    subject: text("subject").notNull(),
    description: text("description"),
  },
  (table) => [
    foreignKey({
      columns: [table.historyEntryId, table.entryType],
      foreignColumns: [historyEntries.id, historyEntries.type],
      name: "repair_details_entry_foreign_key",
    }).onDelete("cascade"),
    check("repair_details_entry_type", sql`${table.entryType} = 'repair'`),
    check("repair_details_subject_length", sql`length(trim(${table.subject})) between 1 and 120`),
    check(
      "repair_details_description_length",
      sql`${table.description} is null or length(${table.description}) <= 500`,
    ),
  ],
);
