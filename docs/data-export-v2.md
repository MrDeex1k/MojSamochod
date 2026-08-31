# Vehicle History Data Export v2

## Purpose

Version 2 is the current user-owned JSON representation of locally stored vehicle history. It adds
document metadata to the version 1 vehicle and history records while keeping binary content outside
the JSON document. The format is independent of the SQLite and Drizzle schemas.

The export is a data portability manifest, not yet a complete device backup or an import promise.
A future archive format must include the manifest and referenced binary objects before restore can
reconstruct photos and documents.

## Envelope

Every document has this top-level structure:

```json
{
  "binaryFilesIncluded": false,
  "data": {
    "documents": [],
    "historyEntries": [],
    "vehicle": null
  },
  "exportedAt": "2026-08-31T10:00:00.000Z",
  "format": "moje-auto-vehicle-history",
  "formatVersion": 2
}
```

- `format` remains the stable `moje-auto-vehicle-history` identifier.
- `formatVersion` is `2` and must be checked before interpreting the document.
- `exportedAt` is a canonical ISO 8601 UTC timestamp generated at export time.
- `binaryFilesIncluded` is always `false` in version 2.
- `data.vehicle` is the single free vehicle or `null` for a valid empty export.
- `data.historyEntries` retains the version 1 record shapes and deterministic newest-first order.
- `data.documents` contains metadata for the vehicle's documents. An empty database or a vehicle
  without documents produces an empty array.

## Vehicle and history records

Vehicle and history records have the same meaning and field shapes documented for
[Vehicle History Data Export v1](./data-export-v1.md). Optional values remain explicit `null`
values, timestamps remain canonical UTC strings, money remains integer minor units plus an ISO 4217
currency code, and distances remain integer metres.

## Document records

Each document record contains:

| Field            | Type             | Notes                                                                    |
| ---------------- | ---------------- | ------------------------------------------------------------------------ |
| `id`             | string           | Canonical lowercase UUIDv7 document identifier.                          |
| `vehicleId`      | string           | Identifier of the owning vehicle.                                        |
| `historyEntryId` | string or `null` | Optional related history entry belonging to the same vehicle.            |
| `name`           | string           | User-editable display name.                                              |
| `documentDate`   | string or `null` | Calendar date in `YYYY-MM-DD` form.                                      |
| `amount`         | object or `null` | `{ "currency": "PLN", "minorUnits": 12345 }` when recorded.              |
| `notes`          | string or `null` | User-authored notes.                                                     |
| `createdAt`      | string           | Canonical ISO 8601 UTC creation timestamp.                               |
| `updatedAt`      | string           | Canonical ISO 8601 UTC update timestamp.                                 |
| `file`           | object           | Portable metadata describing the referenced managed file, as shown next. |

The nested `file` object contains:

| Field          | Type    | Notes                                                           |
| -------------- | ------- | --------------------------------------------------------------- |
| `originalName` | string  | File name received from the system picker.                      |
| `mimeType`     | string  | Validated MIME type; currently PDF, JPEG, or PNG.               |
| `byteSize`     | integer | Non-negative file size in bytes; current import limit is 20 MB. |
| `sha256`       | string  | Lowercase 64-character SHA-256 digest of the binary content.    |

Internal managed-file identifiers, staging states, and storage keys are deliberately omitted. They
are installation-specific implementation details and cannot locate a binary on another device.

## Binary-content boundary

Version 2 does not embed vehicle photos or document bytes as Base64, SQLite BLOBs, file paths, or
storage keys. A consumer can inventory and verify expected document content from `file`, but cannot
restore or open that content from this JSON alone.

A future portable backup may package this JSON as a manifest alongside an object directory. That
archive must define object naming, digest verification, missing-file handling, duplicate handling,
atomic restore, and compatibility before setting `binaryFilesIncluded` to `true`.

## Compatibility

Consumers must reject unknown `format` values and unsupported `formatVersion` values. Version 2 is
not version 1 with optional fields: the required `data.documents` member changes the expected shape,
which is why the format version increased.

Internal additive database migrations do not require an export-version change unless the exported
meaning or required JSON shape changes. Export fails with a typed corrupt-data error when document
metadata references a managed file that is not ready, rather than silently producing an incomplete
manifest.
