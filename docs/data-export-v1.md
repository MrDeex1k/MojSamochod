# Vehicle History Data Export v1

## Purpose

The version 1 export is the first stable, user-owned representation of locally stored vehicle
history. It is a UTF-8 JSON document produced independently of the SQLite and Drizzle schemas. It
can therefore remain readable when the internal database structure changes.

The export is a data portability format, not a database backup or an import promise. A compatible
restore/import flow will be designed and tested before the application is considered production
ready.

## Envelope

Every document has this top-level structure:

```json
{
  "binaryFilesIncluded": false,
  "data": {
    "historyEntries": [],
    "vehicle": null
  },
  "exportedAt": "2026-08-30T18:30:00.000Z",
  "format": "moje-auto-vehicle-history",
  "formatVersion": 1
}
```

- `format` is the stable format identifier.
- `formatVersion` changes only when a consumer must interpret the document differently.
- `exportedAt` is a canonical ISO 8601 UTC timestamp generated at export time.
- `binaryFilesIncluded` is always `false` in version 1.
- `data.vehicle` is either the single free vehicle or `null` for a valid empty export.
- `data.historyEntries` contains that vehicle's entries in the same newest-first order returned by
  the repository: `occurredAt`, then `createdAt`, then `id`.

## Vehicle record

The vehicle record contains:

| Field                                  | Type                    | Notes                                               |
| -------------------------------------- | ----------------------- | --------------------------------------------------- |
| `id`                                   | string                  | Canonical lowercase UUIDv7.                         |
| `make`, `model`                        | string                  | Required normalized vehicle names.                  |
| `variant`, `registrationNumber`, `vin` | string or `null`        | Optional normalized values.                         |
| `manufactureYear`                      | integer or `null`       | Four-digit year when known.                         |
| `initialOdometerMetres`                | integer or `null`       | Initial odometer value in metres.                   |
| `currentOdometerMetres`                | integer or `null`       | Current monotonic odometer value in metres.         |
| `distanceUnitPreference`               | `kilometres` or `miles` | Display preference; stored distances remain metres. |
| `createdAt`, `updatedAt`               | string                  | Canonical ISO 8601 UTC timestamps.                  |

The version 1 vehicle record intentionally has no photo reference. A local storage key would not
be useful outside the application, while the binary photo is outside the Phase 2 scope.

## History records

Every history record contains:

- `id` and `vehicleId` as canonical lowercase UUIDv7 identifiers;
- `type` as `inspection`, `replacement`, or `repair`;
- `occurredAt`, `createdAt`, and `updatedAt` as canonical UTC timestamps;
- `odometerMetres` as a non-negative integer or `null`;
- `cost` as `null` or `{ "currency": "PLN", "minorUnits": 12345 }`;
- `serviceProvider` and `notes` as strings or `null`;
- exactly one `details` object whose shape is selected by `type`.

Inspection details contain `kind`, `result`, and nullable `description`. Replacement details
contain `item`, nullable `manufacturer`, and nullable `partNumber`. Repair details contain `subject`
and nullable `description`.

Optional values are represented explicitly as `null`; fields are not conditionally omitted. Money
uses ISO 4217 currency codes and integer minor units to avoid floating-point ambiguity.

## Compatibility and files

Consumers must reject unknown `format` values and must not interpret an unsupported
`formatVersion` as version 1. Additive internal database migrations do not require an export-version
change unless the exported meaning or required shape changes.

Version 1 never includes vehicle photos, documents, storage keys, or other binary content. Once
managed files exist, a later format will use an archive containing a manifest and an object
directory. Binary content will not be embedded as SQLite BLOBs or base64 fields in this JSON
document.
