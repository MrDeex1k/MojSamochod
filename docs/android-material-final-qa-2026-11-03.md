# Android Material final QA — 3 November 2026

Branch: `feat/android-material-expressive`. Baseline: `ee5ab3c`.
The follow-up APK includes the router fix committed with this report.
Both targets ran the same arm64 Release APK, installed over the existing
`dev.mojeauto.qa` application without clearing its data.

## Result

One confirmed application crash was reproduced and fixed. The regression test and
native replay pass after the fix. This is **not an unconditional accessibility or
predictive-animation sign-off**: spoken TalkBack acceptance and an interactive
previous-screen predictive preview remain open below.

## Targets and scope

| Target            | Configuration                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| Pixel 9           | Android 17, 1080 × 2424, gesture navigation, existing Volvo fixture                                      |
| Pixel Tablet      | Android 17, 2560 × 1600 and 1600 × 2560, 100% and 160% system text                                       |
| TalkBack          | Android Accessibility Suite 17.0.0.889642762; service enabled on both Android targets                    |
| Apple smoke check | iPhone 18 Pro and iPad Air 11-inch (M4), iOS/iPadOS 27.2, Release startup and native onboarding controls |

Native screenshots and accessibility trees were used. Browser rendering was not
used as a substitute for Android verification. Apple startup was checked because
the router hook migration also touches shared components; this pass does not claim
a repeat of the complete Apple workspace acceptance matrix.

## Confirmed issue and correction

### P1 — Navigation rail can crash after a system text-size change

Reproduction on the baseline Release APK:

1. Open the vehicle workspace on Pixel Tablet in landscape.
2. Change Android system text size from 100% to 160% while the application runs.
3. Select Settings in the navigation rail.
4. The application exits to the launcher.

The failure was reproduced twice. Android's crash buffer contains:

```text
Process: dev.mojeauto.qa
JavascriptException: Error: The imperative router is unavailable before the first render has finished.
throwBeforeFirstRender
onSelect
```

[Recorded reproduction](images/material-2026-11-03/tablet-font-rail-repro.mp4).

The rail used the module-level Expo router. After the configuration change that
router was unbound even though the current UI was interactive. Components now use
`useRouter()`, which is bound to their Expo Router root. Workspace routing receives
that router explicitly, and reminder navigation is passed as a controller callback.
Settings and editor callbacks using the same module-level pattern were migrated
as well. This follows the [Expo SDK 58 migration guidance](https://github.com/expo/expo/blob/expo%4058.0.0/docs/pages/router/migrate/sdk-57-to-58.mdx).

The regression test first failed with the same exception. It now verifies that
switching from phone tabs to the tablet rail uses the current root's navigation,
even when the module-level router is unavailable.

Native replay on the corrected APK: change 100% → 160%, select Settings, open Edit
vehicle and cancel; open Settings → Your data. No application crash occurred.

## Runtime checks

PASS means the stated behavior was observed. LIMITED means the evidence does not
support full acceptance. Older PDF and persisted-entry CRUD results remain in the
[initial implementation report](android-material-expressive.md); they were not all
repeated in this follow-up.

| Scenario                                                            | Target        | Result                                                             |
| ------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------ |
| Vehicle identity, history rows, near-black canvas and green accents | Phone, tablet | PASS; no clipping in inspected default-size screens                |
| Material Settings rows without nested button backgrounds            | Phone, tablet | PASS                                                               |
| Fuel list, consumption summary and opening the refuelling form      | Phone         | PASS                                                               |
| Empty fuel quantity, Save, inline validation, Cancel                | Phone         | PASS; validation appears and no record is saved                    |
| Deadlines with notifications disabled                               | Phone         | PASS; saved deadlines remain visible without requesting permission |
| Native repair type sheet and date dialog                            | Phone         | PASS                                                               |
| Dirty repair form, edge-back gesture, Keep editing                  | Phone         | PASS; confirmation shown and subject preserved                     |
| Dirty vehicle form, rotate, Cancel, Keep editing, Cancel, Discard   | Tablet        | PASS; draft survives rotation and Keep editing                     |
| 160% text in portrait and landscape                                 | Tablet        | PASS for inspected vehicle, navigation and editor content          |
| Configuration change followed by rail navigation                    | Tablet        | FAIL before fix; PASS on corrected APK                             |
| Settings → Edit vehicle / Your data                                 | Tablet        | PASS on corrected APK                                              |
| Existing Android fixture preservation                               | Phone, tablet | PASS; no persisted test records were created or removed            |

## TalkBack

TalkBack was actually enabled on both emulators. `dumpsys accessibility` confirmed
a bound TalkBack service, `touchExplorationEnabled=true` and no crashed service.
The phone showed TalkBack focus on the native date-dialog title, repair subject
and discard-dialog title. The tablet showed focus on Settings and the editor's
Cancel control. TTS audio-focus requests were present in Android logs.

This verifies service-on focus exposure, not a complete spoken audit. Injected
swipes and shortcut activation did not provide a reliable traversal/action signal
in this automation setup; some shortcuts reached Android's assistant. No pass is
claimed for complete reading order, dialog focus confinement, double-tap-only
completion, or pronunciation/verbosity. A normal accessibility snapshot can also
suspend TalkBack while the automation service owns the device, so it was not used
as proof that TalkBack was running.

Remaining acceptance: with TalkBack enabled and automation disconnected, traverse
all four tabs/rail items, a form with errors, the date/time selectors, a discard
dialog and a PDF. Confirm labels, roles, selection state, focus confinement and
return focus by listening and operating the reader on a device.

Reference: [Google's TalkBack keyboard documentation](https://support.google.com/accessibility/android/answer/6110948).

## Predictive back

The phone used gesture navigation (`navigation_mode=2`), and the generated Android
manifest enables `android:enableOnBackInvokedCallback`. A real edge pan on a dirty
form opened its discard confirmation; Keep editing preserved the draft. An edge
swipe on a clean history-detail route returned to the vehicle list.
On the tablet, an edge swipe on Your data returned to Settings.

A slow edge gesture captured before release showed the system back arrow over
the current detail screen. It did **not** establish an interactive preview of the
previous screen. A return-to-edge cancellation attempt left the detail open, but
the evidence did not establish that an interactive transition had started.
Therefore predictive animation and cancellation are **LIMITED**, not PASS. The
manifest opt-in alone is not acceptance evidence.

Remaining acceptance: verify a visible, progress-linked destination preview and
its cancellation on phone and tablet. Investigate the installed navigator/native
stack integration if only the system arrow appears on a physical device too.
No custom speculative back animation or experimental navigator migration was
introduced in this QA correction.

## Verification and cleanup

- Android `assembleRelease`: passed with R8 enabled; corrected APK installed on both targets.
- `nub run check`: passed, **76 suites / 488 tests**.
- React Doctor 0.9.22, changed scope, `--no-score --no-supply-chain`: no issues found.
  No online score was requested and no score is inferred from that result.
- iOS Release: build succeeded. The CLI's subsequent deep-link launch failed;
  direct application launch with agent-device succeeded on iPhone and iPad.
- No dependency, Expo configuration, or native configuration changes were made
  in this correction. Expo Doctor was not rerun for this source-only change.
- Tablet system text was restored to 100%, with its original natural landscape
  orientation. TalkBack was returned to its previous disabled state on both targets.
- Existing Android QA vehicles, history, fuel records and attachments were retained.
  Apple onboarding drafts were not saved as new vehicles.
- One automation helper lost ownership of Android UI automation; restarting only
  that helper restored inspection. A later recording timeout reset its daemon and
  sessions were rebound explicitly to the phone and tablet serials. These tooling
  failures are not counted as application defects.

## Evidence

- [Phone workspace](images/material-2026-11-03/phone-initial.png)
- [Tablet workspace](images/material-2026-11-03/tablet-initial.png)
- [Tablet portrait at 160% text](images/material-2026-11-03/tablet-large-portrait.png)
- [Corrected APK: tablet Settings after configuration-change replay](images/material-2026-11-03/tablet-fixed-settings.png)
- [TalkBack focus on discard-dialog title](images/material-2026-11-03/talkback-dirty-dialog.png)
- [System arrow during an edge gesture](images/material-2026-11-03/predictive-detail-mid.png)

The complete local captures, logs and recordings are retained under
`/tmp/material-final-qa`. There was no production release or deployment.
