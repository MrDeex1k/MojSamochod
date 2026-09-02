# Vehicle History Data Export v3

## Purpose

Version 3 is the current user-owned JSON representation of locally stored vehicle data. It extends
version 2 with the vehicle's fuel configuration and raw refuelling records. The export remains
independent of the SQLite and Drizzle schemas and still excludes binary content.

The export is a data portability manifest, not yet a complete device backup or an import promise.
Fuel-consumption results are derived data and are deliberately omitted: a compatible consumer can
recalculate them from the exported refuelling sequence using the documented domain rules.

## Envelope

Every document has this top-level structure:

```json
{
  "binaryFilesIncluded": false,
  "data": {
    "documents": [],
    "historyEntries": [],
    "refuellings": [],
    "vehicle": null
  },
  "exportedAt": "2026-09-01T10:00:00.000Z",
  "format": "moje-auto-vehicle-history",
  "formatVersion": 3
}
```

- `format` remains the stable `moje-auto-vehicle-history` identifier.
- `formatVersion` is `3` and must be checked before interpreting the document.
- `exportedAt` is a canonical ISO 8601 UTC timestamp generated at export time.
- `binaryFilesIncluded` is always `false` in version 3.
- `data.vehicle` is the single free vehicle or `null` for a valid empty export.
- `data.historyEntries` and `data.documents` retain their version 2 record shapes.
- `data.refuellings` contains the vehicle's raw refuelling records or an empty array.

## Vehicle fuel configuration

The vehicle record retains all version 2 fields and adds:

| Field                           | Type              | Notes                                                                      |
| ------------------------------- | ----------------- | -------------------------------------------------------------------------- |
| `fuelTankCapacityMicrolitres`   | integer or `null` | Positive canonical tank capacity. Legacy vehicles may contain `null`.      |
| `fuelVolumeUnitPreference`      | string or `null`  | `litres`, `usGallons`, or `imperialGallons`.                               |
| `fuelConsumptionUnitPreference` | string or `null`  | `litresPer100Kilometres`, `milesPerUsGallon`, or `milesPerImperialGallon`. |

The three fields are required members of the version 3 JSON shape even when their value is `null`.
This keeps exports of vehicles created before fuel configuration was introduced explicit and
unambiguous.

## Refuelling records

Each refuelling record contains:

| Field                 | Type              | Notes                                                   |
| --------------------- | ----------------- | ------------------------------------------------------- |
| `id`                  | string            | Canonical lowercase UUIDv7 refuelling identifier.       |
| `vehicleId`           | string            | Identifier of the owning vehicle.                       |
| `occurredAt`          | string            | Canonical ISO 8601 UTC date and time of the refuelling. |
| `quantityMicrolitres` | integer           | Positive fuel quantity in the canonical unit.           |
| `inputVolumeUnit`     | string            | Volume unit used for entering the quantity.             |
| `fillKind`            | string            | `full` or `partial`.                                    |
| `odometerMetres`      | integer or `null` | Optional odometer reading stored in canonical metres.   |
| `pricing`             | object or `null`  | Exact source pricing values when a price was supplied.  |
| `createdAt`           | string            | Canonical ISO 8601 UTC creation timestamp.              |
| `updatedAt`           | string            | Canonical ISO 8601 UTC last-update timestamp.           |

The optional `pricing` object contains:

| Field                 | Type    | Notes                                                                  |
| --------------------- | ------- | ---------------------------------------------------------------------- |
| `inputMode`           | string  | `total` or `perVolumeUnit`, preserving how the user entered the price. |
| `totalCost`           | object  | ISO 4217 currency plus integer minor units.                            |
| `unitPriceMilliUnits` | integer | Unit price stored as integer thousandths of the major currency unit.   |
| `unitPriceVolumeUnit` | string  | Volume unit to which the unit price applies.                           |

Records are exported in the deterministic order provided by the repository: newest
`occurredAt` first, then newest `createdAt`, then identifier ascending as the final tie-breaker.
The exporter does not silently reorder records or discard incomplete consumption intervals.

## Derived consumption boundary

Version 3 exports source facts, not cached calculations. It does not contain average consumption,
included refuelling identifiers, interval distances, interval fuel totals, or presentation-rounded
values. This prevents a stale result from disagreeing with edited source records or a newer
calculation implementation.

Consumption is reconstructed from full-fill anchors and the intervening full or partial records.
Invalid or incomplete intervals remain represented by their source records even though they do not
contribute to an average.

## Binary-content boundary

Version 3 has the same binary boundary as version 2. It does not embed vehicle photos or document
bytes as Base64, SQLite BLOBs, file paths, or storage keys. Document metadata remains available for
inventory and integrity checks, but restoring those files requires a future archive format.

## Compatibility

Consumers must reject unknown `format` values and unsupported `formatVersion` values. Version 3 is
not version 2 with optional fields: the required fuel-configuration members and
`data.refuellings` member change the expected shape.

Version 1 and version 2 remain documented historical contracts. Internal additive database
migrations do not require an export-version change unless the exported meaning or required JSON
shape changes.
