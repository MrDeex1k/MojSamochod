# Technology

## Platform targets

| Target          | Status           | Notes                                                                                         |
| --------------- | ---------------- | --------------------------------------------------------------------------------------------- |
| iOS             | Supported        | Simulator and physical-device development are available.                                      |
| iPadOS          | Supported        | Adaptive layouts must be verified independently from iPhone layouts.                          |
| Android phones  | Supported        | Emulator-based development is available; physical-device testing remains a later requirement. |
| Android tablets | Supported        | Adaptive layouts must be verified independently from Android phone layouts.                   |
| Web             | Development only | It is not a product release target.                                                           |

The supported presentation is portrait on phones and landscape on tablets. Expo's static
`orientation` setting cannot express a different lock per device class, so the application uses
`default` to make tablet landscape available. The adaptive application shell guards the supported
presentation and asks the user to rotate unsupported phone-landscape and tablet-portrait layouts.

## Current application stack

The application currently lives in `apps/mobile` inside a lightweight NUB workspace. Direct
dependencies are pinned exactly; the manifest and `nub.lock` are the source of truth for full
versions.

| Area                  | Current choice                                                           | Role                                                              |
| --------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Application framework | Expo SDK 57 (`expo` 57.0.18)                                             | Cross-platform runtime, native modules, and development workflow. |
| UI runtime            | React Native 0.86.3 and React 19.2.3                                     | Shared Android phone/tablet, iOS, and iPadOS application code.    |
| Language              | TypeScript 7.0.2                                                         | Static typing for application and domain code.                    |
| Navigation            | Expo Router 57.0.17                                                      | File-based navigation and typed routes.                           |
| Styling               | NativeWind 5.0.0-preview.4, Tailwind CSS 4.3.3, `react-native-css` 3.0.7 | Shared utility styling and CSS interoperability.                  |
| Animation runtime     | React Native Reanimated 4.5.1 and React Native Worklets 0.10.1           | Performant native-thread interaction and motion where justified.  |
| Gestures              | React Native Gesture Handler 2.32.0                                      | Platform-aware touch interactions.                                |
| System appearance     | Expo System UI 57.0.3                                                    | Applies the dark interface style consistently on Android.         |
| Unit/component tests  | Jest 29.7.0, Jest Expo 57.0.5, React Native Testing Library 14.0.1       | Tests pure logic and user-visible component behavior.             |
| Local database        | Expo SQLite 57.0.2 and Drizzle ORM 0.45.2                                | Persistent SQLite access and typed queries.                       |
| Database migrations   | Drizzle Kit 0.31.10                                                      | Generates reviewable SQL migrations bundled with the application. |
| Record identifiers    | UUID 14.0.2 and Expo Crypto 57.0.2                                       | UUIDv7 generation backed by native secure randomness.             |
| Document import       | Expo Document Picker 57.0.1                                              | Native PDF/JPEG/PNG selection with platform-granted file access.  |
| Native file export    | Expo Sharing 57.0.16                                                     | Platform share/export surface for managed documents.              |

NativeWind 5 is intentionally a preview dependency. Its compatibility with the active Expo SDK
must be rechecked before SDK upgrades and before a production release.

## Theme source of truth

The theme source of truth is `apps/mobile/styles/theme.css`, imported once by
`apps/mobile/global.css`. It exposes semantic Tailwind and NativeWind aliases for the dark product
appearance. Components must consume semantic names instead of raw palette values or hard-coded
colors so that a palette change remains centralized. Light appearance is outside the current scope.

The agreed racing-green, warm-ivory, and graphite palette and its alias rules are defined in
[Design Direction](./design-direction.md#color-token-architecture).

## Current repository tooling

- Node.js 24.18.0 is pinned in `.node-version`.
- NUB 0.8.0 is the only Node.js package manager and script runner used by the repository.
- NUB uses the hoisted `node_modules` layout required by the NativeWind 5 and React Native CSS
  Metro resolver.
- Socket Firewall protects dependency mutations and enforces a 24-hour dependency cooling period.
- Direct dependencies use exact versions; `nub.lock` is the only committed Node.js lockfile.
- Oxlint provides static linting and Oxfmt provides formatting.
- Husky and commitlint enforce Conventional Commits.
- `nub run check` is the standard local quality gate: lint, formatting check, TypeScript
  validation, consistency of Drizzle migrations, and Jest tests.
- Tests are colocated with source files and prefer accessible roles, labels, and user interactions
  over implementation details.
- NativeWind theme lengths use `rem` values, while custom line heights remain unitless ratios. This
  avoids oversized native text boxes caused by length-based custom line-height tokens in the current
  NativeWind 5 and React Native CSS preview stack.
- Third-party components do not receive NativeWind `className` behavior automatically. The shared
  `expo-image` adapter maps `className` to the native `style` prop instead of relying on unsupported
  passthrough.
- Expo Doctor is required after Expo, native configuration, or dependency changes. React Doctor is
  required after React component changes.

## Local-first architecture

The application should be split into layers so that presentation code does not own storage or
business rules:

```text
Expo Router screens
        ↓
application use cases
        ↓
domain models and calculations
        ↓
repositories
        ↓
local database and document storage
```

This boundary is important for testable fuel calculations, safe data migrations, entitlement
checks, and later synchronization.

## Localization and language strategy

The application must be localization-ready before the first production screen is implemented.
Polish is the first complete product language and English is the fallback and next complete
localization. User-facing copy must use stable translation keys instead of being embedded directly
in React components.

Localization has separate responsibilities that must not be collapsed into one mechanism:

| Responsibility                 | Planned approach                                                                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Device language and region     | Read locale preferences through `expo-localization`.                                                                                                        |
| Application translations       | Use `i18next`, `react-i18next`, and `expo-localization`; keep Polish and English catalogs outside screens and fall back to English.                         |
| Per-application language       | Declare supported locales through the `expo-localization` config plugin so iOS and Android system settings can select the app language.                     |
| Dates, numbers, and currencies | Format values at the presentation boundary with locale-aware `Intl` APIs.                                                                                   |
| Units                          | Keep distance, volume, and other unit preferences explicit; language or region may provide an initial default but must not silently overwrite user choices. |
| Native platform strings        | Localize application names, permission descriptions, and other native resources through Expo/native configuration.                                          |
| Store metadata                 | Manage localized descriptions, keywords, release notes, screenshots, and product information separately in App Store Connect and Google Play Console.       |

Changing the interface language must not modify persisted domain data. Vehicle details, notes,
document names, and other user-authored content remain exactly as entered. Historical monetary
amounts retain their recorded currency, and changing locale affects formatting rather than value.

The initial application should normally follow the per-app language selected in the operating
system. A custom in-app language selector is not required until product testing demonstrates a need
that the platform setting does not cover.

Phase 3 uses `i18next`, `react-i18next`, and `expo-localization`. Polish and English catalogs are
bundled with the application, the system locale selects between them, and unsupported locales fall
back to English. Translation resources stay outside screens and tests can select a locale
deterministically. Locale-sensitive numbers, currencies, and dates use `Intl`; changing locale never
changes stored domain values.

Phase 3 also uses `expo-image-picker` for gallery-only selection, `expo-image-manipulator` for square
JPEG processing, `expo-image` for native rendering, `expo-file-system` for private managed storage,
and `@react-native-community/datetimepicker` for separate native date and UTC-time controls. Direct
dependencies are pinned to Expo SDK-compatible versions in the application manifest.

Phase 4 uses `expo-document-picker` for system PDF/JPEG/PNG selection and `expo-sharing` for native
export. Android imports preserve the picker-granted `content://` URI until `expo-file-system` copies
the file into private managed storage; copying first into Expo Go's shared cache can lose scoped
read permission. Before sharing, the application creates a cache alias with the original file name
so the platform surface does not expose the internal UUID storage key.

Phase 5 uses pure TypeScript domain functions for canonical distance and volume conversion,
refuelling validation, exact price derivation, and auditable fuel-consumption calculation. Vehicle
preferences control distance, fuel-volume, and consumption presentation without rewriting
historical source records. SQLite persists raw refuelling data, while JSON export v3 exposes those
records without storing derived consumption values.

## Planned capabilities and open selections

The following capabilities are part of the product direction but are not installed or implemented
yet. A short technical spike should confirm each choice before it becomes a production dependency.

| Capability              | Planned direction                                                           | Decision still required                                                          |
| ----------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Reminders               | Local notifications scheduled from stored deadlines                         | Permission flow, rescheduling rules, timezone and overdue behavior.              |
| Purchases               | Monthly and annual App Store and Google Play subscriptions                  | Purchase library, products, entitlement model, restore flow, receipt validation. |
| Premium synchronization | User-initiated, encrypted direct transfer established by scanning a QR code | Serverless transport, identity, encryption, conflicts, retries, and recovery.    |

No new library should be selected only because it is popular. It must support the active Expo SDK,
pass the repository's SFW policy, and demonstrate a clear maintenance and platform-compatibility
story.

The initial synchronization design must not depend on an account, cloud data store, background
service, automatic synchronization, or real-time synchronization server. WebRTC may be evaluated as
a transport candidate only if the QR exchange can establish the direct session within this
constraint. The application must not introduce signalling or relay infrastructure without an
explicit product-scope decision.

## Data safety requirements

- Use explicit, versioned database migrations from the first persisted schema.
- Use UUIDv7 for stable record identity, but store `createdAt`, `updatedAt`, and history-entry
  `occurredAt` independently as UTC timestamps. Never derive domain time from an identifier.
- Never delete vehicle records or documents implicitly during an upgrade.
- Store money in minor currency units rather than floating-point values.
- Store normalized timestamps and preserve the user's timezone where deadline semantics require it.
- Keep odometer and fuel calculations in testable domain functions.
- Treat document metadata and file writes as one recoverable operation; detect and clean orphaned
  files safely.
- Define export and restore behavior before calling the local-first data model production-ready.
- Synchronization must not be added until stable identifiers and conflict rules exist.

Binary vehicle photos and documents live in app-managed file storage rather than SQLite BLOB
columns. SQLite stores their stable identifiers, storage keys, MIME types, original names, sizes,
SHA-256 digests, relations, states, and timestamps. Phase 4 extends the versioned JSON export with
document metadata while intentionally keeping `binaryFilesIncluded` equal to `false`; a portable
archive containing binaries remains production-hardening work.

## Verification matrix

Every user-visible feature should be verified on:

- a representative iPhone simulator,
- an iPad simulator when layout or navigation can differ,
- an Android phone emulator,
- an Android tablet emulator when layout or navigation can differ,
- a physical iPhone during milestone and release testing,
- a physical Android phone and a representative Android tablet before public Android distribution.

Automated tests should prioritize domain calculations, validation, migrations, repository behavior,
premium gating, and synchronization conflict resolution.
