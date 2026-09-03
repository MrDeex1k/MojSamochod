# Vehicle History Data Export v4

## Purpose and compatibility

Version 4 is the current JSON portability manifest. It extends [version 3](data-export-v3.md)
with a required `data.reminders` array. Vehicle, history-entry, document and refuelling record
shapes retain their version 3 meaning. This manifest is not a complete backup or an import promise.

Consumers must check both `format` and `formatVersion`, and reject unsupported versions rather
than interpreting version 4 as version 3. Earlier contracts remain documented for existing exports.

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
- Derived fuel-consumption results, as in version 3.

A future importer must validate source fields and obtain device permissions separately. It must
not interpret exported preferences as proof that the destination device can deliver notifications.
