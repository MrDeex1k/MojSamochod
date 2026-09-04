# Local native acceptance builds

Expo Go is useful for supported UI iterations, but final native acceptance must exercise our
generated application, native modules, permissions and notification channels.

## Local identity

Set `MOJE_AUTO_NATIVE_QA=1` to use `dev.mojeauto.qa` on both platforms. This opt-in is implemented
in `apps/mobile/app.config.js`; normal configuration is unchanged without it. This is a local QA
identity, not a decision about production bundle identifiers, signing, store accounts or releases.
It gives the test app separate storage and permissions from Expo Go. Never clear another app's data
to prepare these tests.

## Build procedure

Run from `apps/mobile`, with the repository-pinned Node runtime selected through NUB. Use
`--node` for native builds: NUB's augmented runtime can otherwise load dependency TypeScript
configuration while resolving native build scripts. In the verified stack this broke Worklets
adapter discovery and Expo Constants configuration. `--node` does not change the pinned Node version.
Keep Socket Firewall around commands that may download build dependencies.

```sh
MOJE_AUTO_NATIVE_QA=1 CI=1 nub exec --node sfw nub exec --node expo prebuild --no-install --skip-dependency-update react,react-native
```

Review the diff after prebuild. It can regenerate ignored native projects and rewrite the mobile
`ios`/`android` package scripts; preserve the repository's existing scripts unless changing them is
intentional. Do not regenerate native directories while a build is running.

For Apple, run in the generated `ios` directory:

```sh
MOJE_AUTO_NATIVE_QA=1 nub exec --node sfw pod install
```

Then, from `apps/mobile`:

```sh
MOJE_AUTO_NATIVE_QA=1 NODE_ENV=production nub exec --node sfw nub exec --node expo run:ios --configuration Release --no-install --no-bundler --device generic --output /tmp/moje-auto-native-qa-ios
```

This produces a simulator application, not an App Store archive. For Android, run in the generated
`android` directory with `ANDROID_HOME` pointing to the installed SDK:

```sh
MOJE_AUTO_NATIVE_QA=1 NODE_ENV=production nub exec --node sfw ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --console=plain
```

The APK is `app/build/outputs/apk/release/app-release.apk`. The local generated project uses debug
signing for this release-configuration QA APK; it is not a signed store release. The commands above
target the Apple Silicon simulator/ARM64 emulator environment used in Phase 6. Adapt architectures
deliberately for other targets. Native directories and build artifacts remain untracked.

## Verification boundaries

Install the binaries on iPhone, iPad, Android phone and Android tablet. Record exact OS versions,
host, locale, permission state and scenarios; do not describe a subset as exhaustive device coverage.
Check persisted data, notification grants/denials, cancellation, restart, retained timezones and
representative existing workflows. Native notification delivery may be delayed by system policy.

For accelerated notification probes, use only the dedicated QA app and identify owned requests.
Record any trigger or emulator-clock manipulation separately from ordinary end-to-end checks.
Restore device clock/timezone settings and normal schedules afterward. Never infer exact-time or
physical-device reliability from simulator delivery alone. Production physical-device and signing
acceptance belong to the release checklist.

Native metadata translations use platform-scoped `ios` and `android` objects: Apple plist keys
must not become Android string resources. Regression tests exercise Expo's actual locale resolver.
See the [Phase 6 acceptance report](phase-6-step-7-verification.md) for results and limitations.
