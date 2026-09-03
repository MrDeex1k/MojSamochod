# Local Reminder Notifications

## Implementation boundary

Phase 6 stage 3 introduces `expo-notifications` 57.0.15, pinned to the version recommended by the
installed Expo 57.0.18 package's `bundledNativeModules.json`. Installation uses NUB and SFW.

`ReminderNotifications` is an application-level port; `NativeReminderNotifications` implements
permission inspection, explicit permission requests, settings navigation, one-shot scheduling,
listing, and cancellation. Domain code does not import Expo or React Native.

This stage does not reconcile stored reminders with native schedules or connect reminder forms.
These are stages 4 and 5. Native delivery and four-device verification remain pending.

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
the future reconciler can remove it. Cancellation operates on one reserved identifier, never all
application notifications. The reconciler must handle partial failures and inspect native state
before deciding whether a retry is needed.

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
