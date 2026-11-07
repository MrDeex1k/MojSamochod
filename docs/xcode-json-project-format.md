# Xcode JSON project format

The Apple project uses Xcode's JSON configuration file:
`apps/mobile/ios/MojeAuto.xcodeproj/project.xcproj`.
Use **Xcode 27.2 or later** to run this repository's preparation/conversion workflow.
Apple documents JSON project reading support in Xcode 27 and later.

The outer `.xcodeproj` bundle, app target, scheme and build configurations keep
their existing names. Android configuration is unaffected.

## Prepare and build

From the repository root:

```sh
nub run ios
```

To prepare the project for Xcode without launching the app, run from `apps/mobile`:

```sh
nub run ios:prepare
```

For the isolated native QA app, set `MOJE_AUTO_NATIVE_QA=1` for both preparation
and build. Open `ios/MojeAuto.xcodeproj` in Xcode as before. The prepared bundle
contains `project.xcproj` and no `project.pbxproj`.

The official command used at the end of preparation is:

```sh
xcodebuild -project ios/MojeAuto.xcodeproj -convert-project xcproj
```

The format argument is `xcproj`, not `json`. Xcode writes its own JSON dialect,
including trailing commas; do not process it with strict `JSON.parse` or a generic
JSON formatter. The conversion is handled by the installed Xcode, with no new
conversion dependency.

Preparation also removes the invalid text encoding emitted for the `Car.icon`
bundle and literal unknown-file-type placeholders. Leaving the invalid encoding
in place makes Xcode's converter emit a different integer on each run, creating
unnecessary JSON diffs.

## Expo and React Native compatibility

Expo SDK 58 config plugins, the React Native 0.88 SwiftPM injector and Expo CLI's
signing setup still read or modify `project.pbxproj`. Native generation and those
CLI operations therefore run with the legacy format temporarily. The prepared
project and direct Xcode builds use JSON.

Xcode's JSON-to-plist conversion regenerates internal UUIDs. React Native's
`.spm-injected.json` bookkeeping relies on the original UUIDs, so converting back
with Xcode before each autolinking update would leave stale references. The local
`.moje-auto-project-format.json` compatibility cache stores the exact generator
output and checksums. Preparation restores it only if the JSON file is unchanged,
runs the existing generators, then converts the updated project to JSON again.
The preparation and Expo CLI wrappers restore JSON after a failed command when
the legacy project is still convertible. Preparation records its fingerprints
only after the project returns to JSON. The Expo CLI wrapper forwards build and
device arguments and preserves the CLI's exit status.

Use the repository's `nub run ios` entry point for Expo CLI builds. Running raw
`expo run:ios`, `expo prebuild` or `react-native spm update` against the JSON-only
bundle bypasses this compatibility layer. Direct `xcodebuild -project ...` builds
work with the JSON bundle and do not need the layer.

Run preparation and native builds sequentially, with Xcode project editing paused.
If conversion fails or the process is interrupted, resolve the reported error
and rerun preparation before opening the project for a build.

## Source of truth and manual edits

Native directories remain generated and ignored by Git. The committed change is
the reproducible preparation/build integration, not a machine-specific snapshot
of the native bundle. Changes belong in app configuration, Expo config plugins,
local modules or the preparation scripts. Consequently, the JSON format does not
introduce native-project diffs into this repository's source control workflow.

If `project.xcproj` has been edited manually, preparation stops before replacing
it. It also refuses an absent or modified compatibility cache, or a bundle with
both configuration formats. Preserve your native changes, move them to the
generation inputs, and regenerate the iOS project before preparing again. Back
up any local signing/project changes before a clean prebuild. The guard avoids
silently dropping edits made in Xcode.

The cache is local compatibility state. It contains generated paths and build
settings and must remain ignored with the rest of `ios/`. No dependencies, package
manager, Node version or NUB version are upgraded by this migration.

Before switching back to a branch whose tooling only supports plist projects,
restore the legacy configuration from the repository root while this helper is
still available:

```sh
nub --node --input-type=module -e 'import { restoreLegacyProject } from "./scripts/xcode-project-format.mjs"; restoreLegacyProject("apps/mobile/ios/MojeAuto.xcodeproj");'
```

This uses the same edit guard and preserves the generator's UUIDs. Returning to
this branch and running iOS preparation converts the project to JSON again.

## Verification

`nub run check` includes the native-tooling regression tests. They cover repeated
conversion/restoration, exact SwiftPM identifier preservation, rejection of manual
edits or corrupt caches, interrupted conversion, and JSON restoration after CLI
failures.

Native validation also needs repeated real preparation, a JSON-only Xcode project
load, a Release simulator build and a build through the Expo compatibility entry
point. See [native QA builds](native-qa-builds.md) for the isolated app identity.

Validated on 3 November 2026 with Xcode 27.2 (27B52):

- Repeated real preparation produces byte-identical JSON and leaves the SwiftPM
  injection marker unchanged.
- `xcodebuild -list -json` reads the JSON-only bundle and reports `MojeAuto`, its
  scheme and Debug/Release configurations.
- A direct JSON-project arm64 Release simulator build passes.
- The Expo CLI compatibility entry point's generic Release simulator build passes
  with zero errors; it reports 1,362 native compiler/build-phase warnings.
- After the CLI build, the bundle contains JSON only, unchanged from preparation;
  the SwiftPM input check passes.
- `nub run check` passes: 8 native-tooling tests and 76 app suites / 488 app tests.
- Expo Doctor passes 18/20 checks. The remaining checks concern unsupported
  `nub.lock` detection and the intentional TypeScript 7 version. No additional
  lockfile or diagnostic suppression was introduced.

No React component or mobile interaction behavior changes in this migration.

## References

- [Apple: Updating your Xcode project configuration file format](https://developer.apple.com/documentation/xcode/updating-your-xcode-project-configuration-file-format)
- [Apple: Xcode 27.2 release notes](https://developer.apple.com/documentation/xcode-release-notes/xcode-27_2-release-notes)
- [Apple's project format library](https://github.com/apple/xcode-project-format)
