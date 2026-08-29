# Technology

## Platform targets

| Target  | Status           | Notes                                                                                         |
| ------- | ---------------- | --------------------------------------------------------------------------------------------- |
| iOS     | Supported        | Simulator and physical-device development are available.                                      |
| iPadOS  | Supported        | Adaptive layouts must be verified independently from iPhone layouts.                          |
| Android | Supported        | Emulator-based development is available; physical-device testing remains a later requirement. |
| Web     | Development only | It is not a product release target.                                                           |

## Current application stack

The application currently lives in `apps/mobile` inside a lightweight NUB workspace. Direct
dependencies are pinned exactly; the manifest and `nub.lock` are the source of truth for full
versions.

| Area                  | Current choice                                               | Role                                                              |
| --------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| Application framework | Expo SDK 57                                                  | Cross-platform runtime, native modules, and development workflow. |
| UI runtime            | React Native 0.86 and React 19.2                             | Shared Android, iOS, and iPadOS application code.                 |
| Language              | TypeScript 7                                                 | Static typing for application and domain code.                    |
| Navigation            | Expo Router                                                  | File-based navigation and typed routes.                           |
| Styling               | NativeWind 5 preview, Tailwind CSS 4, and `react-native-css` | Shared utility styling and CSS interoperability.                  |
| Animation runtime     | React Native Reanimated and Worklets                         | Performant native-thread interaction and motion where justified.  |
| Gestures              | React Native Gesture Handler                                 | Platform-aware touch interactions.                                |

NativeWind 5 is intentionally a preview dependency. Its compatibility with the active Expo SDK
must be rechecked before SDK upgrades and before a production release.

## Theme source of truth

The planned theme source of truth is `apps/mobile/styles/theme.css`, imported once by
`apps/mobile/global.css`. It will expose semantic Tailwind and NativeWind color aliases for both
light and dark appearances. Components must consume semantic names instead of raw palette values or
hard-coded colors so that a palette change remains centralized.

The agreed racing-green, warm-ivory, and graphite palette and its alias rules are defined in
[Design Direction](./design-direction.md#color-token-architecture). The dedicated theme file will be
introduced with the design-system foundation; it does not exist in the current placeholder
application yet.

## Current repository tooling

- Node.js 24.18.0 is pinned in `.node-version`.
- NUB 0.7.5 is the only Node.js package manager and script runner used by the repository.
- Socket Firewall protects dependency mutations and enforces a 24-hour dependency cooling period.
- Direct dependencies use exact versions; `nub.lock` is the only committed Node.js lockfile.
- Oxlint provides static linting and Oxfmt provides formatting.
- Husky and commitlint enforce Conventional Commits.
- `nub run check` is the standard local quality gate: lint, formatting check, and TypeScript
  validation.
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
| Application translations       | Use a JavaScript i18n library selected during Phase 1; keep translation catalogs outside screens.                                                           |
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

The translation-library choice remains open until Phase 1. The selected library must support
fallbacks, interpolation, plural rules, typed or statically verifiable keys, and testing without a
native runtime. Adding it must follow the repository's Expo compatibility, exact-version, NUB, and
Socket Firewall requirements.

## Planned capabilities and open selections

The following capabilities are part of the product direction but are not installed or implemented
yet. A short technical spike should confirm each choice before it becomes a production dependency.

| Capability              | Planned direction                                                                      | Decision still required                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Structured local data   | Embedded SQLite database, preferably through an Expo-supported module                  | Schema, migration runner, repository API, backup behavior.                                   |
| Invoices and documents  | App-managed local file storage with metadata and relations stored in the database      | File import API, size limits, supported formats, orphan cleanup, export.                     |
| Reminders               | Local notifications scheduled from stored deadlines                                    | Permission flow, rescheduling rules, timezone and overdue behavior.                          |
| Localization            | `expo-localization`, external translation catalogs, and locale-aware `Intl` formatting | Translation library, catalog structure, supported locale identifiers, and fallback behavior. |
| Fuel calculations       | Pure TypeScript domain logic backed by persisted refuelling records                    | Full-tank rules, partial fills, units, rounding, invalid sequences.                          |
| Purchases               | Monthly and annual App Store and Google Play subscriptions                             | Purchase library, products, entitlement model, restore flow, receipt validation.             |
| Premium synchronization | User-initiated, encrypted direct transfer established by scanning a QR code            | Serverless transport, identity, encryption, conflicts, retries, and recovery.                |

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
- Never delete vehicle records or documents implicitly during an upgrade.
- Store money in minor currency units rather than floating-point values.
- Store normalized timestamps and preserve the user's timezone where deadline semantics require it.
- Keep odometer and fuel calculations in testable domain functions.
- Treat document metadata and file writes as one recoverable operation; detect and clean orphaned
  files safely.
- Define export and restore behavior before calling the local-first data model production-ready.
- Synchronization must not be added until stable identifiers and conflict rules exist.

## Verification matrix

Every user-visible feature should be verified on:

- a representative iPhone simulator,
- an iPad simulator when layout or navigation can differ,
- an Android phone emulator,
- a physical iPhone during milestone and release testing,
- a physical Android device before public Android distribution.

Automated tests should prioritize domain calculations, validation, migrations, repository behavior,
premium gating, and synchronization conflict resolution.
