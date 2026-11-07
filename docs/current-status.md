# Current project status

Status as of 7 November 2026. Application baseline: `main` at `8630435`, after merging audit
PRs [#23](https://github.com/MrDeex1k/MojSamochod/pull/23),
[#24](https://github.com/MrDeex1k/MojSamochod/pull/24),
[#25](https://github.com/MrDeex1k/MojSamochod/pull/25), and
[#26](https://github.com/MrDeex1k/MojSamochod/pull/26).

## Application on main

The FREE scope from phases 0–7 is integrated. Users maintain one vehicle locally, including
service history, refuelling and consumption calculations, insurance and inspection deadlines,
and optional local notifications using the timezone retained when a deadline is saved.
Polish and English are supported, with English as the fallback language.

SQLite and Drizzle store records and file metadata. Vehicle photos come from the gallery;
PDF, JPEG, and PNG documents can be imported and previewed inside the app. Confirmed data erasure
removes application records, managed file copies, and owned notifications while preserving
original gallery and provider files. JSON v4 remains an internal contract; there is no user-facing
database export, import, backup, or restore. See [product scope](product-scope.md) and
[privacy and permissions](privacy-and-permissions.md).

The application uses Expo 58.0.22 and React Native 0.88.1. Native configuration declares version
0.8.2, iOS build 5, and Android version code 1. The last documented App Store Connect upload is
iOS 0.8.2 (5), dated 12 October. The November changes and QA builds are newer than that upload;
merging them into `main` does not publish a new TestFlight or store build. See
[TestFlight history](testflight-preparation.md) and the [delivery plan](delivery-plan.md).

## Integrated changes

- `6e1088b`: adaptive foldable layouts, following the Android Material controls and shared
  phone/tablet navigation work. See the [foldable verification report](foldable-baseline-2026-11-04.md).
- `12d621f`, audit sections 1–4: safer application/database shutdown and erasure, stricter domain
  and stored-data contracts, stable document pagination and search, and recoverable managed-file
  operations. See the [remediation report](audit-sections-1-4.md), including migration compatibility.
- `ade7a78`, sections 5–8: guarded form submissions, timestamp preservation, serialized document
  writes, cleanup failure handling, precise refuelling prices and overflow reporting, and reliable
  reminder reconciliation. See the [remediation report](audit-sections-5-8.md).
- `741a897`, sections 9–12: invalidation after in-flight reads, shared pagination requests,
  preservation of loaded refuelling ranges, split-view Back behavior, navigation guard cleanup,
  Android accessibility descriptions, alert dismissal isolation, and localized exact formatting.
- `8630435`, sections 13–15: profile-aware native preparation, pinned transitive Expo modules for
  clean installs, required native-module checks, consistent dark launch configuration, and updated
  native build and release documentation. See [native QA builds](native-qa-builds.md)
  and [Xcode project preparation](xcode-json-project-format.md).

## Verification at integration

On 7 November, `nub run check` passed on the final rebased application tree, which matches
`8630435`: lint, formatting, 9 native tooling tests, Expo autolinking checks (28 Apple and 27 Android
modules without duplicates), TypeScript, Drizzle checks, and 83 application suites / 566 tests.
React Doctor 0.9.22 reported 100/100 with no findings in the final PR's changed scope; this is not
a full-codebase score. Socket checks passed on all three updated PR heads before merging.

Expo Doctor 1.21.6 passed 18/20 checks. It does not recognize the ignored local `nub.lock`, and
reports differences from the SDK-recommended package versions, including the intentional TypeScript
7.0.2 choice. No alternate lockfile, dependency upgrade, or diagnostic suppression was introduced.

Native QA recorded in the audit PRs includes Apple simulator and Android ARM64 builds and checks
on iPhone 17, iPad A16, Pixel 9, and Pixel Tablet. These used the isolated `dev.mojeauto.qa` app.
The merge operation preserved the PR patches and reran local repository checks; it did not repeat
native device acceptance or upload a release. Earlier reports retain their original test counts,
dates, and limitations; those counts are not the current integration result.

## CI and release automation

The Quality GitHub Actions workflow was removed on 7 November at the user's request. The repository
has no CI/CD workflows. Run `nub run check` locally before committing or opening a pull request;
dependency installation continues to use the pinned toolchain and Socket Firewall.
Native builds, signing, and submission remain local; EAS is outside the accepted release setup.

## Historical accessibility verification and release gates

On 4 November, the user confirmed manual TalkBack and Back-gesture testing on a physical Android
device. Individual acceptance-criterion results were not recorded. Earlier emulator checks confirmed
TalkBack activation and touch exploration on phone and tablet; automation did not reliably establish
spoken content or reading order. See the [TalkBack report](android-material-final-qa-2026-11-03.md#talkback).

Manual TalkBack acceptance should cover navigation and validation announcements, date/time pickers,
discard dialogs and focus restoration, and PDF navigation and dismissal. The recorded Back tests
confirmed navigation and dirty-form confirmation, but did not establish an interactive predictive
preview. Verify both gesture completion and cancellation manually. See the
[Back-gesture report](android-material-final-qa-2026-11-03.md#predictive-back).

Release preparation still includes physical-device notification delivery, the unavailable registry
vulnerability audit, signing, store metadata, and acceptance of the intended release artifact.
The earlier isolated Android SQLite-initialization incident remains tracked as non-reproduced and
non-blocking; it has not been proven fixed. Phase 8 remains stabilization through user feedback.
See the [release gates](delivery-plan.md#recommended-next-step).
