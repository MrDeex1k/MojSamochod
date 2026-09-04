# Privacy and permission boundaries

This is an engineering inventory, not a published privacy policy. Publisher identity, contact
details and store declarations must be completed and verified before release.

## User-facing information

The Settings and privacy section explains the one-vehicle FREE scope, local records and attachment
copies, absence of database export/import/restore, retention of original documents, optional
notifications and the existing vehicle-unit preferences. It is available from the history screen
on phones and tablets in Polish and English. Erase-all and removal of existing document sharing
belong to Phase 7 step 2; the information screen does not claim those changes are implemented.

No analytics service is added by application code. The first release has no account or in-app
cloud synchronization. This does not imply that platform diagnostics, store beta diagnostics,
OS backups or every transitive SDK have been exhaustively network-audited. Review those boundaries
before publishing privacy declarations; do not claim that no bytes ever leave the device.

## Media access

- Vehicle photos come only from the gallery. Camera and microphone permissions are disabled in
  the image-picker plugin and explicitly blocked in the Android manifest.
- Android uses the system photo picker and its selected-URI grant, without first requesting broad
  library access. External-storage and broad media permissions are blocked. The selected file is
  processed into an app-managed copy; square cropping remains available.
- iOS retains contextual photo-library permission because the currently accepted editable picker
  uses `UIImagePickerController`. A move to `PHPicker` without broad library access would require
  replacing its manual crop interaction, not merely removing a permission call. Camera/microphone
  usage descriptions are absent from the built application.
- Document selection uses the system document picker and copies the chosen attachment into the
  managed store. It is not database import. Keep original user files outside the managed store.

## Notifications and remaining native permissions

Notifications remain local and optional, with contextual consent. Android boot delivery,
notification posting, vibration and scheduling-related wake behavior remain supported.
APNs entitlement and remote-notification background mode stay disabled. Android remote-push
receive, overlay and install-referrer service permissions are blocked.

The inspected Android release manifest still includes internet/network state and vendor badge
permissions contributed by the native dependency graph. They are not prompts for camera, media
or location access. Their presence is recorded, not proof of active tracking; review transitive
SDK initialization and actual network behavior before final release. No package upgrades or
global warning suppression are part of this step.

Tests inspect the result of all Expo config plugins, including blocked-permission merge directives.
Native QA also inspects the final merged Android manifest and built Apple Info.plist, because an
Expo configuration-only check does not include every library manifest. Rebuild binaries after
permission changes; Expo Go cannot validate the app's final manifest.

## Accessibility scope

Settings headings are exposed to assistive technology, content wraps and scrolls, and buttons use
the shared minimum-height control. Text fields expose helper/error content as accessibility hints,
with errors taking precedence. Existing labels, disabled states and text scaling are retained.

Component tests and native accessibility-tree inspection are not substitutes for a complete
VoiceOver/TalkBack user journey or a formal accessibility conformance claim. Those release checks
remain necessary on physical devices. See the [step 1 report](phase-7-step-1-verification.md).
