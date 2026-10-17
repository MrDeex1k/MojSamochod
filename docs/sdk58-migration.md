# Expo SDK 58 migration

## Version contract

The current version contract pins Expo 58.0.14, React Native 0.88.0, and React 19.3.0.
React Native 0.88 now uses its stable release rather than a release candidate. Apple
dependency integration uses experimental Swift Package Manager support.
Expo libraries follow SDK 58's bundled native version set. Node 24.18.0,
the repository's NUB version, and TypeScript 7.0.2 remain intentional choices.

## Native preparation

The October 17 refresh follows Expo's official bundled native dependency contract.
Upgrade Helper did not yet list React Native 0.88.0; the maintainer explicitly
approved using Expo's template and prebuild instead of waiting for that template.
The three-hour release-age gate remains enabled. Node and NUB pins are unchanged.
React 19.3.0 and Gesture Handler 3.3.0 remain SDK-aligned rather than using
registry-latest React 19.3.1 and Gesture Handler 3.4.0.

Expo UI's new mixed Swift/Objective-C++ sources require an additional source
manifest because its published package has no Apple prebuilt artifact. The
Screens manifest also includes the new navigation-bar, tab-item coordinator,
and bottom-accessory wrapper sources. Screens now fixes detached Android
headers upstream, so that local code patch has been removed.

Native preparation now fingerprints the mobile dependency manifest as well as
app configuration, ensuring dependency changes trigger template regeneration.
Safe Area Context 5.10.1 now supplies its own manifest, so the former local
manifest patch is removed. A smaller header-only patch guards its edge/mode
declarations against repeated Clang imports. React Native CSS needs a lazy `AssetRegistry` export
forwarder for React Native 0.88; both installed wrapper variants are covered by
a regression test that failed before the patch and passes afterward.

Install dependencies with `nub run deps:install`. NUB applies the checked-in
dependency patches through Socket Firewall; the dependency cooling period is
three hours. `nub.lock` is generated locally and remains ignored.

Run `nub run ios` from the repository root. To prepare before opening Xcode,
run `nub run ios:prepare` in `apps/mobile`, then open `ios/MojeAuto.xcodeproj`.
Preparation regenerates native configuration when it changes, runs SwiftPM
autolinking and codegen, applies generated consumption fixes, and records input
fingerprints. Expo prebuild may call `pod deintegrate` to remove its template's
CocoaPods integration; dependency resolution and compilation use SwiftPM.
Xcode fails with preparation instructions if dependency or native inputs change.

For isolated acceptance builds, set `MOJE_AUTO_NATIVE_QA=1` when preparing either
platform. This uses `dev.mojeauto.qa` and preserves production app storage.
Android uses `nub run android` and Gradle. The SDK 58 debug configuration explicitly
enables development support in the React host so precompiled React does not
accidentally select an embedded JavaScript asset in a Metro development build.

Start Metro on localhost. Android emulators can use an ADB reverse for port 8081.
When IPv6 localhost binding prevents an emulator from reaching Metro, use
`NODE_OPTIONS=--dns-result-order=ipv4first` with `expo start --localhost` through NUB.

## Application adjustments

- Update React Native component refs and nullable list slot types for the new typings.
- Use DateTimePicker's separate `onValueChange` and `onDismiss` callbacks.
- Use SDK 58's scene lifecycle and verify its generated scene delegate.
- Register the local Document Preview module with an explicit package and SwiftPM manifest.
- Preserve Jest's real JavaScript Reanimated implementation while replacing native
  host wrappers with test components; use Worklets' resolver and mock.
- Keep one version of Expo Modules Core in the native autolinking graph through
  explicit NUB package extensions.

SwiftPM compatibility patches are described in [dependency patches](../patches/README.md).
Review them when upgrading either framework; they are tied to these prerelease versions.

## Verification

The project check covers lint, formatting, native autolinking duplicates, TypeScript,
Drizzle migration consistency, and Jest. The October 17 run passes 72 suites and 474 tests.
The native graph has 27 Expo modules on Apple and 26 on Android, with no duplicate module versions.

The October 17 Android Debug build succeeds. After cold-booting Pixel 9 and
Pixel Tablet separately, the repeated native regression run passes navigation,
history and refuelling CRUD, unit conversion, PDF import/preview/metadata/deletion,
reminders, permissions, and persisted data after relaunch. The earlier System UI
ANRs do not recur. Testing exposed SDK 58's Android channel warning for an explicit
`sound: "default"`; omitting that optional channel property retains the system
default sound without treating it as a missing custom file. The regression test
fails before the fix and passes afterward; native channel and alarm checks also pass.

A separate local Android Release QA build succeeds with R8 enabled. On Pixel
Tablet, `dev.mojeauto.qa` runs without Metro, clears its isolated data, creates a
new vehicle with a gallery photo, converts its odometer from miles to kilometres,
and retains the vehicle/photo after cold start. This does not clear the normal
application's data. Exact scope and exclusions are recorded in the
[Android regression report](./android-regression-2026-10-17.md).

The October 17 iOS simulator Release build also succeeds with Xcode 27 and
SwiftPM. Its isolated `dev.mojeauto.qa` binary starts on iPhone 18 Pro and iPad
Pro 13-inch (M5). The iPhone retains the existing QA vehicle, repair entry, and
document; document-list entry/back and settings navigation work. The iPad shows
the first-vehicle form and opens/closes the native fuel-unit picker. These are
local smoke checks, not a physical-device or TestFlight acceptance run. The app
version remains 0.8.2 (5); this dependency refresh was not uploaded or published.

The earlier October 12 native checks cover Pixel 9 and Pixel Tablet:
workspace navigation, saved history, a repair draft and date-picker cancellation,
document import, thumbnails, and navigation between both pages of a PDF.

The October 12 iOS Debug build succeeds with Xcode 27 using SwiftPM. Those native checks cover
iPhone 18 Pro and iPad Pro 13-inch (M5), both on iOS 27: vehicle creation,
adaptive workspace navigation, native date selection or cancellation, document
import through Files, saved document previews, and fullscreen navigation between
portrait and landscape PDF pages. The iPhone also saves a dated repair entry.
Vehicles and imported documents survive a full app relaunch on both Apple
targets, and the iPhone's saved repair remains in history.

Expo Doctor passes 17 of 20 checks after the October 17 refresh. Its remaining
diagnostics are the unrecognized `nub.lock`, an asset-schema check that treats
the existing `Car.icon` Icon Composer directory as an inaccessible file, and
stale tooling recommendations: TypeScript 6 versus intentional
TypeScript 7, plus Jest 29 and its types versus Jest 30. The installed
`jest-expo` 58.0.11 itself depends on Jest 30 packages, and the complete test suite
passes with Jest 30.5.2. Do not downgrade these tools merely to silence the doctor.
The current changed-file React Doctor scan reports 100/100 with no issues.

The October 12 dependency refresh also updates application libraries, test tools,
and linters, regenerates version-specific patches, and retains exact pins.
Gesture Handler, Reanimated, Safe Area Context, and Screens retain SDK-supported
versions rather than newer versions outside the SDK's compatibility contract.
The three-hour dependency cooling period still applies. The October 17 refresh
advances i18next to the now-eligible 26.4.7.

## Remaining preview limitations

Precompiled Expo Modules Core does not export `ExpoModulesWorkletsAdapter` as a
SwiftPM product. The generator omits that optional Expo/Worklets bridge. The current
app uses React Native Reanimated/Worklets directly; adding an Expo module that needs
the adapter requires revisiting this integration.

Simulator and emulator checks do not establish physical-device acceptance,
production signing, or release/archive readiness.
The separate October 12 release verification includes a cold start of local
Release 0.8.2 (5) on the physical iPhone 15 Pro and successful App Store Connect
upload. See [the release notes](./testflight-preparation.md) for evidence and limits.
