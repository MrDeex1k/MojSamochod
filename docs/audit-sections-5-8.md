# Audit remediation: sections 5–8

This change follows the sections 1–4 audit and targets its branch. It covers vehicle and service
history flows, documents and PDF previews, refuelling and consumption, and reminders/notifications.
Dependency versions, the database schema, and native renderer implementations remain unchanged.

## Section 5: vehicles and service history

- A failed cleanup of the previous vehicle photo could enter the rollback path after the new
  reference had committed, removing the new photo and reporting a failed save. Cleanup now runs
  after the commit boundary. A failed rollback cannot become a truthy success result either.
- State updates alone did not prevent two calls to the same save handler before React rendered.
  Synchronous pending refs now guard onboarding, vehicle editing, history, documents, and refuelling.
- Editing history or refuelling truncated existing seconds/milliseconds, and constructing a date
  with `Date.UTC` shifted years 0001–0099 into the twentieth century. Existing timestamps remain
  exact; new records still default to minute precision without changing the year.

## Section 6: documents and PDF previews

- Serialized document writes re-read current metadata before updates and file replacement. An old
  edit form can no longer restore the previous, already removed file reference after replacement.
  Replacement of a deleted document fails before importing another file.
- File cleanup errors after a committed replacement or deletion no longer report a failed write.
  Managed-file metadata retains unreferenced objects for startup reconciliation and cleanup retry.
- Reference search hides obsolete results immediately when its query/context changes. Pagination
  cannot reuse an old query's cursor during the debounce window. Rejected and late requests remain
  isolated by the existing generation guard.
- Reviewed PDF path confinement, bounded rendering, native resource closure, and stale React
  render-result cleanup. No additional confirmed defect required a renderer change. The native
  metadata fixture contains a deliberately invalid PDF; its visible preview error is expected and
  is not evidence of successful PDF rendering or system picker import.

## Section 7: refuelling and consumption

- Editable unit prices disable digit grouping. A stored price such as `1234.56` no longer becomes
  the unparseable input `1,234.56` when changing currency or resaving the form. Display formatting
  continues to group digits.
- Aggregate overflow now has an explicit `unsafe-total` result and explanation. It cannot claim
  that entries contributed to an unavailable average or show the unrelated missing-anchor hint.
  Valid individual intervals remain available.
- Original input units, historical pricing representations, monotonic current mileage, and weighted
  consumption semantics are preserved. The audit did not justify changing those domain policies.

## Section 8: reminders and notifications

- Permission/retry actions now surface unsuccessful reconciliation results instead of reporting
  success unconditionally. A synchronous guard prevents overlapping actions before rerender.
- Requests queued before reconciliation starts share one fresh snapshot. Requests arriving during
  a native await share one following pass, preserving intervening edits/deletions. A regression
  test submits 100 requests during scheduling and verifies two vehicle reads and cancellation of
  the alert whose reminder was removed. This measures reduced work, not a device latency claim.
- Native cancellation still completes before replacements are scheduled. Scheduling stays ordered
  and bounded; delivery on physical devices remains a release acceptance check.

## Verification

- `nub run check`: 83 suites and 546 tests passed, including lint, formatting, native tooling,
  TypeScript, and Drizzle checks. Regression tests exercise cleanup failures, stale document
  updates, duplicate submissions, timestamp precision, price editing, overflow, search debounce,
  notification errors, and reconciliation bursts.
- React Doctor 0.9.22, changed scope against the sections 1–4 branch: no findings, 89/100.
  Full scans of both the parent commit and this change return 87/100 with the same four warnings:
  two ordered native notification loops, the unsupported NUB lockfile, and an array lookup over
  three reminder offsets. No suppression or speculative concurrency/cache was added.
- Expo Doctor: 18/20 checks passed. Existing diagnostics concern `nub.lock` recognition and
  Expo-recommended dependency versions, including the intentional TypeScript 7 choice.
- Release-configuration QA builds succeeded for Apple simulators and Android ARM64. Verification
  used only `dev.mojeauto.qa` and synthetic QA data, with no production app or physical device.
- iPhone 17 / iOS 27.2, Polish: saved a history entry; opened the reminder form; searched for the
  entry, attached a document to it, and saved its metadata. iPad A16 / iPadOS 27.2, Polish: edited fuel settings and saved
  a 10-litre refuelling. Pixel 9 / Android 17, English: completed onboarding and saved a 5-US-gallon
  refuelling. Pixel Tablet / Android 17, English: saved a 5-US-gallon refuelling for USD 1234.56,
  reopened its form, and resaved it with the amount preserved.

These native checks cover ordinary form interactions on phones and tablets. Fault injection and
same-render races are covered by automated tests; native notification delivery, complete PDF
rendering, and all system picker variants were not retested in this change.
