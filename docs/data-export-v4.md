# Internal Vehicle History Data Export v4

## Purpose and compatibility

Version 4 is the current internal diagnostic manifest. No user-facing action exposes it in the FREE
release. It is not a complete backup, portability promise or import format, and it never includes
binary file contents.

Consumers must check both `format` and `formatVersion`, and reject unsupported versions rather
than interpreting another version as version 4. The TypeScript types and mapping functions in
`apps/mobile/application/export/vehicle-history-export.ts` are the executable source of truth.

## Envelope

```json
{
  "binaryFilesIncluded": false,
  "data": {
    "documents": [],
    "historyEntries": [],
    "refuellings": [],
    "reminders": [],
    "vehicle": null
  },
  "exportedAt": "2026-09-03T10:00:00.000Z",
  "format": "moje-auto-vehicle-history",
  "formatVersion": 4
}
```

An absent vehicle produces `vehicle: null` and empty arrays. A vehicle with no reminders produces
`reminders: []`. Failure to read any required repository fails the export rather than omitting data.

## Record groups

- `vehicle` contains identity, optional registration/manufacture data, canonical odometer values,
  fuel-tank capacity, unit preferences and audit timestamps.
- `historyEntries` contains inspection, replacement and repair records with their type-specific
  details, optional costs, odometer values and audit timestamps.
- `documents` contains document metadata and file integrity metadata. It excludes storage keys,
  local paths and file bytes.
- `refuellings` contains canonical fuel quantity, input-unit history, optional canonical odometer,
  fill kind, optional pricing and audit timestamps. Derived consumption is excluded.
- `reminders` contains the source fields described below. Native scheduling state is excluded.

## Reminder records

| Field                    | Type          | Meaning                                                                            |
| ------------------------ | ------------- | ---------------------------------------------------------------------------------- |
| `id`                     | string        | Canonical lowercase UUIDv7 reminder identifier.                                    |
| `vehicleId`              | string        | Owning vehicle identifier.                                                         |
| `kind`                   | string        | `insurance` or `technicalInspection`.                                              |
| `dueDate`                | string        | Gregorian calendar date, `YYYY-MM-DD`, years 0001–9999; not a UTC timestamp.       |
| `timeZone`               | string        | Named time zone retained from reminder creation, e.g. `Europe/Warsaw`.             |
| `notificationDaysBefore` | integer array | Unique selected offsets from `[7, 1, 0]`, descending; `[]` disables notifications. |
| `createdAt`              | string        | Canonical ISO 8601 UTC creation timestamp, separate from UUIDv7.                   |
| `updatedAt`              | string        | Canonical ISO 8601 UTC last-update timestamp.                                      |

There is at most one reminder of each kind per vehicle. Records are exported in repository order:
kind ascending, then identifier ascending. The exporter copies only these source fields.

The reminder's date remains valid throughout that date in its retained time zone. Notification
offsets are calendar days in that same zone, at 09:00, including its seasonal clock changes.
Travel does not change the retained zone. These are version 4 rules; changing their meaning requires
an explicit compatibility decision.

## Excluded data

- System notification permissions, scheduled notification identifiers and scheduling bookkeeping.
- Derived deadline states and calculated notification instants.
- Vehicle photo or document bytes, Base64, local file paths and storage keys.
- Derived fuel-consumption results.

A future importer must validate source fields and obtain device permissions separately. It must
not interpret exported preferences as proof that the destination device can deliver notifications.
