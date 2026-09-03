# Local Reminder Notifications

## Implementation boundary

Phase 6 stage 3 introduces `expo-notifications` 57.0.15, pinned to the version recommended by the
installed Expo 57.0.18 package's `bundledNativeModules.json`. Installation uses NUB and SFW.

`ReminderNotifications` is an application-level port; `NativeReminderNotifications` implements
permission inspection, explicit permission requests, settings navigation, one-shot scheduling,
listing, and cancellation. Domain code does not import Expo or React Native.

Stage 4 adds reconciliation between stored reminders and native schedules. Reminder forms and
permission education remain stage 5. Dependency updates are stage 6; native delivery and full four-device
regression verification follow in stage 7 and remain pending.

## Permissions and presentation

- Construction, application startup and permission inspection never request system permission.
- `requestPermissionAfterExplanation()` is for a deliberate user action after contextual education.
  The explanation UI is added with reminder forms, not during onboarding.
- Concurrent permission requests share one pending operation. A denial that cannot be requested
  again returns the current state without prompting; settings navigation is explicit.
- On iOS, native authorization status takes precedence over the generic `granted` flag.
  Provisional authorization is represented separately and permits quiet delivery. Requests ask
  for alerts and sound, not badges, critical alerts or provisional authorization.
- Android uses channel `vehicle-reminders-v1`, created before an explicit permission prompt.
  Its name uses the current Polish/English catalog. App-level and channel-level blocking are checked;
  recreating a channel does not override the user's system preferences.
- Scheduling never requests permission. It rechecks permission and the clock before registering
  an alert. Errors remain typed results rather than claiming delivery or deleting source data.
- The root layout registers foreground banner/list/sound presentation only for owned reminder
  requests; registration itself neither schedules nor requests permission. Badges are disabled.

## Scheduling contract

The domain calculates 09:00 in the retained named time zone separately for each selected offset.
The adapter submits a one-shot `DATE` trigger containing that absolute UTC instant, not device-local
calendar components or a repeating interval. Travel therefore does not reinterpret the desired
instant in the new device time zone.

The `reminder:` identifier namespace is reserved for this feature. A request identifier is the
domain's stable key `reminder:<UUIDv7>:<daysBefore>`. Native content data carries an owner marker,
metadata version, vehicle/reminder identity, offset and intended UTC instant. It is device scheduling
metadata, excluded from the JSON v4 manifest.

Listing filters to owned requests and preserves malformed owned metadata as a nullable request so
the reconciler can remove it. Cancellation operates on one reserved identifier, never all
application notifications.

## Reconciliation and recovery

`ReminderSchedule` reads the current vehicle, reminders, permissions and native pending requests.
It preserves matching alerts, removes obsolete/malformed/duplicate owned requests, and schedules
only missing or changed alerts. Title and body use the current application language (English
fallback), vehicle make/model and the calendar deadline, without relative countdown wording.

- Passes run serially. A request arriving during a native operation queues a fresh read after that
  pass, so a concurrent edit or deletion is not lost.
- Successful reminder and vehicle writes trigger reconciliation through repository decorators.
  SQLite commits first; notification failures neither roll back nor delay the saved data.
- Application startup, foreground transitions, language changes and completion of an explicit
  permission request also trigger reconciliation. Returning from system settings is covered by
  the foreground event. No trigger implicitly requests permission.
- Denied permission or a blocked Android channel produces an empty desired schedule. The deadline
  remains stored; granting permission later rebuilds future alerts. Disabled offsets, deleted
  reminders/vehicles and past alerts are also removed from the pending schedule.
- Data, permission and listing failures leave native state untouched. A cancellation failure
  prevents replacement scheduling in that pass. Scheduling failures may leave a partial schedule;
  the next pass reads actual native state before retrying, including uncertain successful writes.
- `getLastResult()` exposes the last pass's permission, counters and typed issue stages for the
  upcoming UI. Results are in-memory diagnostics, not persisted reminder data or JSON export.
  Explicit `reconcile()` calls and subsequent lifecycle/data events retry; there is no background
  retry worker or guarantee of immediate recovery while the application is closed.

Unit tests cover idempotency, coordinator restart, concurrent deletion, permissions, date/offset
changes, localized content refresh, stale/malformed/duplicate requests, partial failures, and
non-blocking post-commit hooks. Lifecycle and adapter tests use mocked native APIs. These tests do
not prove notification delivery, OS restart behavior or application-specific permissions on devices.

## Native configuration and limits

The official Expo plugin is configured with background remote notifications disabled. A local
`with-local-only-notifications.cjs` plugin removes the otherwise automatically added iOS
`aps-environment` entitlement. It is registered **before** `expo-notifications`, because the
entitlements mods execute in reverse registration order in this toolchain. An introspection test
checks the final generated configuration, not merely the plugin's isolated callback.

No Expo push token or APNs/FCM device token is requested by application code. No remote notification
backend or background remote-notification mode is introduced. Expo's Android library supplies
`POST_NOTIFICATIONS` and `RECEIVE_BOOT_COMPLETED` through its manifest.

We do not request `SCHEDULE_EXACT_ALARM` or `USE_EXACT_ALARM`. In the installed Expo implementation,
Android uses `setExactAndAllowWhileIdle` when allowed and otherwise `setAndAllowWhileIdle`. The target
remains 09:00, but OS power-saving, permission settings and delivery policies may delay or suppress
an alert. The in-app list remains the source of truth.

Native configuration changes require a rebuilt development/release app. Expo Go does not validate
the app's generated entitlements or manifest. Before phase completion, verify permission grant,
denial/revocation, foreground/background delivery, cancellation, restart and travel on iOS/iPadOS
and Android phone/tablet targets, using physical devices wherever simulator behavior is insufficient.

## Expo Go 57 availability — 2026-09-03

The project-wide fast-iteration and final-acceptance rules are in the
[verification matrix](technology.md#verification-matrix).

The App Store now distributes Expo Go with SDK 57 support. For this SDK 57 project, this enables
quick checks on physical iPhones and iPads using the store app and Metro, without preparing a
separate native app merely to load the JavaScript project. It does not update repository packages
or validate this project's custom native configuration.

The new iOS store version requires the same Expo account to be signed in both in Expo CLI and
Expo Go. CLI login uses `nub exec expo login` from `apps/mobile`. According to Expo's announcement,
this requirement does not apply to simulator versions or development builds. See the
[Expo announcement](https://expo.dev/changelog/expo-go-57-login) and
[App Store listing](https://apps.apple.com/us/app/expo-go/id982107779).

Local notifications remain available in Expo Go, but the host app owns its permissions, entitlements
and bundled native modules. Final stage 7 acceptance must also use our rebuilt native app to verify
the local-only plugin, application-specific permissions and upgraded native dependencies. See
[development builds](https://docs.expo.dev/develop/development-builds/introduction/).

## Verification recorded for stage 3

- Unit tests cover the native adapter with mocked OS APIs; they do not prove device delivery.
- Expo configuration introspection confirms no APNs entitlement, background remote mode or explicit
  exact-alarm permission in the generated application configuration.
- Expo Doctor reports 19/21 checks passing: it does not recognize `nub.lock`, and its package-version
  check flags the intentional TypeScript 7 choice plus newer Expo patches. On 2026-09-03 it suggested
  Expo 57.0.19 and notifications 57.0.16, alongside updates to constants, image, image manipulator,
  image picker, linking, router and sharing. These are recorded, not suppressed or broadly upgraded
  as part of notification integration.

API reference: [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/).
