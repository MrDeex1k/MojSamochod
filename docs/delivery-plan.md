# Delivery Plan

## Delivery strategy

Build Moje Auto as a sequence of complete vertical slices. The first meaningful milestone is not a
large navigation shell; it is one vehicle persisted locally with one history entry that survives an
application restart and can be viewed, edited, and deleted safely.

Each phase should finish with working software on iOS and Android. iPad and Android tablet
validation is required as soon as navigation or layout becomes more than a single placeholder
screen.

Phases 0 through 7 deliver the MVP: the complete local-first free application for one vehicle.
Phases 8 and 9 extend that stable MVP into the target product with monthly or annual Premium,
additional vehicles, and user-initiated QR synchronization. The detailed feature boundary and
screen inventory are defined in [Product Scope and Screen Map](./product-scope.md).

## Phase 0 — Product and domain decisions

**Status:** Complete. The domain model, first vehicle flow, responsive phone/tablet behavior, and
initial visual direction have been approved.

### Steps

1. Define the minimum vehicle fields and distinguish required data from optional metadata.
2. Define entry fields shared by inspection, replacement, and repair records.
3. Define money, mileage, date, currency, distance, and fuel-unit rules.
4. Define deletion, archive, export, and document-retention expectations.
5. Sketch the primary user journeys and low-fidelity phone and tablet information architecture.
6. Record unresolved decisions instead of hiding them in implementation details.

### Exit criteria

- The domain glossary and first data model are reviewable.
- The free one-vehicle boundary is unambiguous.
- The first vertical slice has acceptance criteria and no dependency on premium or synchronization.

## Phase 1 — Application and design-system foundation

**Status:** Complete and integrated into `main`.

### Steps

1. Replace the placeholder screen with the minimum Expo Router structure required by the first
   workflow.
2. Create `apps/mobile/styles/theme.css` as the single source of primitive palette values and
   semantic dark-appearance aliases, then introduce semantic tokens for typography, spacing, radii,
   and motion.
3. Create reusable primitives only when demanded by a real screen.
4. Add dark-appearance, safe-area, keyboard, loading, empty, and error-state foundations.
5. Establish unit-test and component-test conventions before domain logic expands.
6. Verify adaptive behavior on a representative iPhone, iPad, Android phone, and Android tablet
   emulator.

### Exit criteria

- Navigation and visual primitives support the first vertical slice.
- The application remains accessible with large text and reduced motion.
- Quality checks and simulator smoke tests pass.

## Phase 2 — Local persistence foundation

**Status:** Complete and integrated into `main`. Drizzle ORM, UUIDv7, transactional repositories,
persistence resilience, the version 1 JSON export, and the managed-file boundary are implemented
and documented.

### Steps

1. Integrate Drizzle ORM with the Expo SDK 57-compatible `expo-sqlite` package.
2. Define stable identifiers, schema versioning, migrations, and repository interfaces.
3. Implement transactional create, read, update, and delete behavior for vehicles and entries.
4. Add seed or fixture data for development without coupling production behavior to it.
5. Test migration failure, interrupted writes, invalid records, and application restarts.
6. Define the first export format before the schema becomes difficult to change.

### Exit criteria

- A versioned local database survives restart and migration tests.
- Screens do not issue database queries directly.
- Data can be exported in a documented, user-owned form.

## Phase 3 — First complete vehicle-history slice

**Status:** Complete and integrated into `main`. Automated checks and native verification cover
iPhone, iPad, Android phone, and Android tablet. Polish and English localization uses an English
fallback; vehicle photos are gallery-only.

### Steps

1. Implement onboarding and creation of the first vehicle.
2. Build the vehicle workspace with current mileage and chronological history.
3. Add inspection, replacement, and repair entry flows.
4. Support entry details, UTC date and time, mileage, amount, notes, edit, and safe deletion.
5. Enforce one free vehicle in the domain or entitlement boundary rather than only hiding UI.
6. Test validation, empty states, interruptions, and restart persistence.

### Exit criteria

- A user can manage one vehicle and its complete basic history offline.
- Money and mileage rules are covered by automated tests.
- The workflow passes iPhone, iPad, Android phone, and Android tablet emulator verification.

## Phase 4 — Documents and invoices

**Status:** Complete and integrated into `main`. The implementation includes managed PDF/JPEG/PNG
imports up to 20 MB, optional metadata and history-entry relations, duplicate detection, preview,
native sharing of the original managed file, replacement, deletion, recovery, and the version 2
metadata-only JSON export.

### Steps

1. Add document import with explicit supported formats and size limits.
2. Store managed files separately from relational metadata.
3. Relate a document to a vehicle, a history entry, or both.
4. Add preview, metadata editing, replacement, native file sharing, and deletion.
5. Handle permission denial, missing source files, interrupted copies, duplicates, and orphan cleanup.
6. Test application upgrades and data export with attachments present.

### Exit criteria

- Documents remain available offline and survive restart and migration.
- Failed imports do not create broken metadata or orphaned files.
- Users can share the original managed PDF, JPEG, or PNG through the native platform surface,
  export document metadata through JSON v2, and understand destructive actions.

## Phase 5 — Refuelling and fuel consumption

**Status:** Complete and integrated into `main`. Domain decisions, canonical unit conversions,
vehicle fuel preferences, refuelling persistence, JSON v3 export, application workflows, and
adaptive phone/tablet UI have automated and native coverage.

### Steps

1. Define full-fill, partial-fill, odometer, quantity, price, and unit behavior.
2. Implement refuelling entry and history workflows.
3. Calculate average consumption in pure, thoroughly tested domain functions.
4. Explain insufficient or invalid data rather than displaying misleading averages.
5. Add concise trends only when they improve understanding over a list and summary value.
6. Remove per-entry unit selection and use the vehicle's saved distance, fuel-volume, and
   consumption preferences throughout entry forms.
7. Re-render historical values, editable values, tank capacity, and unit prices from canonical data
   when a vehicle unit preference changes, without rewriting source records.

### Exit criteria

- Calculations have fixtures for normal, partial, missing, and invalid sequences.
- Users can audit which refuelling events produced an average.
- Locale, currency, distance, and volume formatting are correct.
- Users configure units once per vehicle rather than repeating the choice for every entry.
- Changing a unit preference preserves canonical data and consistently converts all affected
  presentation and editing surfaces.

## Phase 6 — Reminders

**Status:** Domain decisions accepted; stages 1–7 (domain rules, persistence,
application services, JSON v4 export, native notification adapter/configuration, schedule
reconciliation, localized phone/tablet UI, compatible dependency updates, automated tests and
native acceptance) are complete and merged into `main` in `522c2cf`, including the post-review
subscriber-isolation fix and its regression tests (398 tests across 59 suites). Our rebuilt applications passed the recorded
four-device acceptance scope, including Android notification channels. Registry vulnerability audit
results remain unavailable; this is not a clean security audit or store-release approval. See the
[stage 7 report](phase-6-step-7-verification.md) for coverage and limitations, and
[reminder-domain-decisions.md](reminder-domain-decisions.md) for the working contract.

### Steps

1. Implement reminder domain rules and tests, retaining the creation-time device timezone and
   its daylight-saving rules.
2. Persist optional vehicle-owned insurance and inspection reminders, enforce one per kind,
   and extend versioned JSON export.
3. Integrate native local notifications and explicit permission handling without startup prompts.
4. Reconcile schedules after edits, removal, restart, and permission changes without duplicates.
5. Implement phone/tablet reminder UI, localization, and contextual permission education.
6. Update all production and development dependencies across the repository to the newest compatible
   versions, review transitive dependencies and overrides, adapt affected code, and update `nub.lock`.
   Keep Expo/React Native packages SDK-compatible, exact pins, SFW and the 24-hour cooling period;
   document exceptions. Run automated checks, React Doctor and Expo Doctor before native acceptance.
7. Verify the entire phase and existing application functionality after dependency updates on iPhone,
   iPad, Android phone and Android tablet. Rebuild native apps as required, fix regressions,
   and update final documentation.

### Exit criteria

- Deadlines work offline and remain visible without notification permission.
- Editing or deleting a deadline updates scheduled notifications correctly.
- Notifications remain at 09:00 in the retained reminder timezone; calendar-day offsets and
  deadline states use that same zone. JSON export includes reminder data, not device scheduling state.
- Platform-specific notification behavior is verified on simulators and physical devices where
  required.
- Final native acceptance uses the updated dependency set; Expo Go alone does not validate the
  application's generated native configuration or signing capabilities.

## Phase 7 — Production hardening of the free application

**Status:** In progress on `feat/harden-mobile-workspace`, pending review. The repository-review implementation delivers
resumable erase-all, internal PDF previews without outbound document actions, draft preservation,
paginated history and initial accessibility improvements. See the
[implementation and verification report](code-review-improvements.md) for coverage and remaining gates.
FREE scope agreed: one vehicle per device, no user-facing data export,
database import, backup or restore, and no added analytics. Existing JSON contracts remain internal.
Provide a confirmed erase-all action returning to first-vehicle setup, including managed file
copies and owned scheduled alerts; do not delete users' original gallery or document files.
Use minimal contextual permissions and gallery-only vehicle photos, with no camera capture.
Distribution channel, production identity and publisher/privacy details remain open. The export
restriction includes single-document sharing and external-open actions; attachment selection remains
allowed, but importing datasets from other applications does not. Review OS backup behavior
separately from app-level export. The publisher currently has no active Apple Developer Program
membership or paid Google Play publisher registration; store distribution is not configured.
The five steps below remain the roadmap; retry and assess the unavailable vulnerability audit
before release, alongside documented diagnostic exceptions.

### Steps

1. Add privacy information, data-management guidance, accessibility review, and localized product
   copy.
2. Implement and verify safe erase-all, database migrations, document storage pressure and recovery
   from interrupted operations. Remove existing outbound document actions and verify that preview
   surfaces cannot export/share files. Do not add user-facing backup, export or database restore.
3. Test application lifecycle, low storage, interrupted attachment imports, device rotation where supported,
   and background transitions.
4. Establish release builds, signing, store metadata, screenshots, and a physical-device test
   matrix.
5. Measure startup, timeline rendering, memory use, and document-preview behavior on realistic data.

### Exit criteria

- The free application is useful, stable, and releasable without premium features.
- No known data-loss path remains unresolved.
- Android and Apple release candidates pass their platform checklists.

## Phase 8 — Premium subscriptions and additional vehicles

### Steps

1. Define monthly and annual products, pricing presentation, entitlement states, and store policy
   requirements. Do not introduce a lifetime purchase without a separate product decision.
2. Select an Expo-compatible purchase integration and design server-validation needs separately.
3. Implement purchase, restore, renewal, cancellation, grace-period, and offline entitlement states.
4. Gate creation of additional vehicles at the domain boundary.
5. Keep existing user data readable when premium expires and define what becomes read-only.
6. Test sandbox-store flows on both platforms, including interrupted and pending purchases.

### Exit criteria

- Entitlements behave consistently across application restarts and store-account changes.
- Premium expiry never destroys vehicle data.
- Purchase and restore flows meet App Store and Google Play requirements.

## Phase 9 — Premium synchronization discovery and implementation

### Discovery steps

1. Prototype a user-initiated flow in which one device displays pairing information as a QR code and
   the other device scans it.
2. Prove a direct, encrypted transfer without an account, cloud data store, background service, or
   real-time synchronization server. Evaluate WebRTC only as a transport candidate within this
   no-server constraint.
3. Define end-to-end encryption, device trust, revocation, replay protection, and secret recovery.
4. Define stable change identifiers, ordering, conflict resolution, retries, and interrupted transfer
   behavior.
5. Decide how large documents transfer, resume, deduplicate, and respect storage limits.
6. Threat-model pairing, transport, local storage, and premium entitlement boundaries.

Implementation should begin only after the prototype proves the network model and the conflict
strategy protects user data. If the no-server constraint cannot provide a reliable product, stop and
review the scope instead of introducing remote infrastructure implicitly.

### Exit criteria

- Two devices can pair deliberately, authenticate each other, and exchange encrypted data.
- Repeated, concurrent, interrupted, and out-of-order user-initiated transfers converge without
  silent data loss.
- Users can inspect paired devices, revoke access, retry safely, and understand synchronization
  status.
- The interface never suggests that synchronization is automatic, continuous, background, or
  real-time.

## Working agreement for every phase

1. Document acceptance criteria and data-safety risks before implementation.
2. Consult current documentation for affected Expo, React Native, and third-party APIs.
3. Add the smallest complete implementation and avoid speculative abstractions.
4. Add automated tests in proportion to business and migration risk.
5. Run `nub run check`; also run Expo Doctor or React Doctor when required by `AGENTS.md`.
6. Verify user-visible behavior on the relevant iPhone, iPad, Android phone, and Android tablet
   targets. Prefer SDK-compatible Expo Go 57 for fast native iterations supported by its bundled
   modules. Use rebuilt development/release apps for native configuration, dependency changes and
   final acceptance; record which host was tested. Follow the
   [verification matrix](technology.md#verification-matrix).
7. Update these documents when a decision changes.
8. Commit using Conventional Commits and keep unrelated phases in separate changes.

## Recommended next step

Continue Phase 7 hardening from the [repository-review implementation](code-review-improvements.md).
Phase 6 is merged; the new changes are on `feat/harden-mobile-workspace`, pending review.
Native acceptance after dependency
updates is recorded in the [stage 7 report](phase-6-step-7-verification.md); local build instructions
are in [native-qa-builds.md](native-qa-builds.md). Retry the unavailable registry vulnerability audit
before release. Physical-device notification reliability, signing and store acceptance are still
release gates, not conclusions drawn from simulator testing.
