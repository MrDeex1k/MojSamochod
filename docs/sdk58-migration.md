# Expo SDK 58 migration

## Version contract

This migration pins Expo 58.0.2, React Native 0.88.0-rc.3, and React 19.3.0.
SDK 58 is a beta release and React Native 0.88 is a release candidate. Apple
dependency integration uses experimental Swift Package Manager support.
Expo libraries follow SDK 58's bundled native version set. Node 24.18.0,
the repository's NUB version, and TypeScript 7.0.2 remain intentional choices.

## Native preparation

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
Drizzle migration consistency, and Jest. The current run passes 69 suites and 464 tests.
The native graph has 25 Expo modules on each platform and no duplicate module versions.

Android Debug builds successfully. Native checks cover Pixel 9 and Pixel Tablet:
workspace navigation, saved history, a repair draft and date-picker cancellation,
document import, thumbnails, and navigation between both pages of a PDF.

iOS Debug builds successfully with Xcode 27 using SwiftPM. Native checks cover
iPhone 18 Pro and iPad Pro 13-inch (M5), both on iOS 27: vehicle creation,
adaptive workspace navigation, native date selection or cancellation, document
import through Files, saved document previews, and fullscreen navigation between
portrait and landscape PDF pages. The iPhone also saves a dated repair entry.
Vehicles and imported documents survive a full app relaunch on both Apple
targets, and the iPhone's saved repair remains in history.

Expo Doctor passes 18 of 20 checks. Its remaining diagnostics are the unrecognized
`nub.lock` and the SDK's TypeScript 6 expectation versus intentional TypeScript 7.
React Doctor reports one existing complexity warning in `EntryForm` after that
file enters the changed-file scan.

## Remaining preview limitations

Precompiled Expo Modules Core does not export `ExpoModulesWorkletsAdapter` as a
SwiftPM product. The generator omits that optional Expo/Worklets bridge. The current
app uses React Native Reanimated/Worklets directly; adding an Expo module that needs
the adapter requires revisiting this integration.

Simulator and emulator checks do not establish physical-device acceptance,
production signing, or release/archive readiness.
