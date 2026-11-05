# Audit remediation: sections 1–4

This change addresses the application lifecycle, domain contracts, SQLite persistence, and local
file storage findings. Dependency and toolchain versions remain unchanged.

## Application lifecycle

- A separate service factory and runtime own startup, accepted asynchronous work, and shutdown.
- Pending erasure completes before file recovery and notification scheduling. Erasure waits for
  reconciliation, then clears both scheduled and delivered app-owned notifications.
- Replacement service instances wait for their predecessor; a replacement database connection
  cannot open until services drain and the preceding connection closes. Strict Mode creates fresh
  runtime instances rather than restarting disposed schedulers.
- Recovery and cleanup failures retain diagnostic causes. Picker interfaces belong to the
  application layer, and production history services explicitly require paged reads and projections.

## Domain contracts

- Text rejects NUL and counts Unicode code points without allocating character arrays. Length
  validation stops after exceeding the limit.
- UTC timestamps accept only canonical four-digit years 0001–9999. Documents and reminders share
  calendar-date validation; timezone calculations handle intermediate years outside that range.
- Date/time merging preserves years 0001–0099. Reminder timezone formatters have a bounded cache.
- Money formatting and fuel calculations share currency precision. Three-letter uppercase codes
  remain supported, including historical/custom codes; unknown codes use Intl's two-digit fallback.
  Explicit pricing precision must agree with this policy. Decimal precision arguments are bounded,
  and failed validation requires at least one issue.

## SQLite persistence

- Reference search normalizes Unicode and performs literal, case-insensitive substring matching
  over bounded projections. It yields between batches. This avoids SQLite's ASCII-only LIKE
  folding; uncommon queries may still scan all references. A persisted search index should follow
  measured workload needs rather than adding another unmeasured cache.
- Document lists use keyset pagination, including null dates and stable ID tie-breaks. Refresh keeps
  the loaded range. Timeline indexes match descending dates and ascending IDs.
- New writes reject invalid calendar dates and fractional integer values. Mappers reject invalid
  manufacture years, and document deletion reports corrupt stored data consistently.

### Migration compatibility

Migration 0003 is deliberately repaired because a legacy database containing duplicate document
hashes otherwise fails before any later corrective migration can run. Existing files and document
references are preserved. An indexed pair of triggers prevents new duplicate reservations without
deleting historical duplicates or blocking their unchanged staged-to-ready recovery.

Migration 0008 applies the same policy to databases that already ran the original 0003, updates sort
indexes, and adds write-validation triggers. It avoids rebuilding tables, preserving existing
relation triggers. Future table-rebuild migrations must explicitly preserve these handwritten
triggers. Integration tests cover legacy duplicate records, repeated migration, invalid writes,
pagination, query plans, and SQLite failure recovery.

## Local file storage

- Erasure removes managed objects and all app-private cache entries, including picker and image
  processing copies. External originals remain outside its scope; failed deletion retains the
  resumable erasure marker.
- Serialized import/recovery operations release failed staged hash reservations so retry works
  without restarting. Stored staging keys must match the file ID and allowed extension.
- Commit verifies size and SHA-256 even when the final object already exists. Hashing uses the
  native file digest API instead of materializing the whole file in JavaScript memory.
- Export reads ready-file metadata in batches, preserving missing-file validation and excluding
  private storage keys from the exported document.

Startup cache cleanup remains before application readiness so it cannot delete newly picked files.
It is best-effort; moving whole-directory deletion behind readiness would introduce a race. Further
startup caching or incremental cache cleanup needs timing evidence and an ownership-safe design.

## Verification

- `nub run check`: 82 suites, 532 tests passed, including lint, formatting, native tooling, typecheck,
  and Drizzle migration checks.
- React Doctor 0.9.22, changed scope: 100/100, no findings.
- Expo Doctor: 18/20 checks passed. Known diagnostics concern unsupported `nub.lock` detection and
  Expo-recommended dependency versions, including the intentional TypeScript 7 choice. No alternate
  lockfile, dependency upgrade, or diagnostic suppression was introduced.
- Local release-configuration QA builds succeeded for Android ARM64 and Apple simulators. These
  use `dev.mojeauto.qa` and are not signed store releases.
- On macOS 27.2, iPhone 17 and iPad A16 simulators running iOS/iPadOS 27.2 in Polish opened a
  synthetic 105-document list and reached document 000 across both pagination boundaries. The
  fixtures exercise list metadata, not PDF rendering or system picker import.
- Pixel 9 and Pixel Tablet emulators running Android 17 in English opened the document screen with existing QA data
  (a populated phone list and an empty tablet list). These are smoke checks, not exhaustive native
  workflow or notification delivery acceptance. Notification permissions and device clocks were
  not changed. Production app data and physical devices were not used.

Notification erasure ordering and retry, shutdown races, cache erasure, staged-import retry,
existing-target hash mismatch, traversal rejection, export batching, and pagination are covered by
automated tests. Physical-device delivery and distribution signing remain release acceptance work.
