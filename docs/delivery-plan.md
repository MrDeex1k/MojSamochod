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

**Status:** Implemented on `feat/application-foundation`; final documentation and integration into
`main` are pending. The current implementation includes the semantic dark theme, reusable UI and
application-state primitives, the adaptive phone/tablet shell, orientation guards, Jest and React
Native Testing Library conventions, and native verification on the four representative targets.

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

**Status:** Complete on `feat/local-persistence-foundation`; ready for review and integration.
Drizzle ORM, UUIDv7, transactional repositories, persistence resilience, the version 1 JSON export,
and the managed-file boundary are implemented and documented.

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

**Status:** Implemented and verified on `feat/vehicle-history-slice`; integration into `main` is
pending. Automated checks and native verification cover iPhone, iPad, Android phone, and Android
tablet. Polish and English localization uses an English fallback; vehicle photos are gallery-only.

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

**Status:** Implemented and verified on `feat/documents-and-invoices`; integration into `main` is
pending. The implementation includes managed PDF/JPEG/PNG imports up to 20 MB, optional metadata
and history-entry relations, duplicate detection, preview, native export, replacement, deletion,
recovery, and the version 2 metadata-only JSON export.

### Steps

1. Add document import with explicit supported formats and size limits.
2. Store managed files separately from relational metadata.
3. Relate a document to a vehicle, a history entry, or both.
4. Add preview, metadata editing, replacement, export, and deletion.
5. Handle permission denial, missing source files, interrupted copies, duplicates, and orphan cleanup.
6. Test application upgrades and data export with attachments present.

### Exit criteria

- Documents remain available offline and survive restart and migration.
- Failed imports do not create broken metadata or orphaned files.
- Users can export their documents and understand destructive actions.

## Phase 5 — Refuelling and fuel consumption

### Steps

1. Define full-fill, partial-fill, odometer, quantity, price, and unit behavior.
2. Implement refuelling entry and history workflows.
3. Calculate average consumption in pure, thoroughly tested domain functions.
4. Explain insufficient or invalid data rather than displaying misleading averages.
5. Add concise trends only when they improve understanding over a list and summary value.

### Exit criteria

- Calculations have fixtures for normal, partial, missing, and invalid sequences.
- Users can audit which refuelling events produced an average.
- Locale, currency, distance, and volume formatting are correct.

## Phase 6 — Reminders

### Steps

1. Add inspection and insurance deadlines to the vehicle model.
2. Design notification permission as contextual education, not an onboarding demand.
3. Schedule and reschedule local notifications deterministically.
4. Handle timezone changes, edited dates, overdue states, permission denial, and removed vehicles.
5. Provide an in-app reminder list so notifications are not the only source of truth.

### Exit criteria

- Deadlines work offline and remain visible without notification permission.
- Editing or deleting a deadline updates scheduled notifications correctly.
- Platform-specific notification behavior is verified on simulators and physical devices where
  required.

## Phase 7 — Production hardening of the free application

### Steps

1. Add privacy information, data-management guidance, accessibility review, and localized product
   copy.
2. Validate database migrations, export and restore, document storage pressure, and recovery paths.
3. Test application lifecycle, low storage, interrupted imports, device rotation where supported,
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
   targets.
7. Update these documents when a decision changes.
8. Commit using Conventional Commits and keep unrelated phases in separate changes.

## Recommended next step

Review and merge the Phase 4 pull request. Then start Phase 5 on a dedicated branch by defining the
refuelling domain rules for full and partial fills, odometer readings, quantity, price, supported
volume units, and the exact average-consumption algorithm before implementing persistence or UI.
