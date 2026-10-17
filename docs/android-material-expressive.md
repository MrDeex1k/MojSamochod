# Android Material 3 implementation

Verified on 17 October 2026 on `feat/android-material-expressive`.

## Direction

The canvas is **#010101** on both platforms. Android uses a dark Material palette
generated from the green #72B48E brand seed. Wallpaper colors do not replace the
brand palette. Tonal surfaces distinguish controls without turning the canvas
grey. Semantic warning and destructive colors retain their meaning.

The composition follows the frontend skill: vehicle identity anchors the workspace,
each screen has one primary action, and spacing, typography and dividers replace
unnecessary cards. iOS retains its system controls, sheets and glass presentation.

## Seven implementation areas

| Area                             | Delivered behavior                                                                                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme and typography             | Seeded Material color roles, Android typography and shapes, shared near-black canvas, semantic runtime variables.                                                                                 |
| Controls and feedback            | Native Compose buttons, outlined fields, segments, icon buttons and menus; Material ripple for custom list rows.                                                                                  |
| Forms and selection              | Native date/time dialogs, Material confirmations, contextual validation, native save/cancel toolbar, UTC-safe time conversion.                                                                    |
| Navigation and adaptive layout   | Native phone tabs, a Material NavigationRailView exposed through a local Android-only Expo module, adaptive list/detail workspace and large-text navigation.                                      |
| Sheets, back and motion          | Short choices in a Material modal bottom sheet, editors in the Android stack, dirty-form removal guards, predictive-back configuration and native transition/interaction feedback.                |
| Screen hierarchy and documents   | Contextual extended FABs on populated history/fuel lists, compact empty-state actions, supporting Documents action, plain detail/form layout and native PDF actions with corrected system insets. |
| Platform polish and verification | Monochrome adaptive icon, regression tests, release builds, native phone/tablet checks and retained Apple presentation.                                                                           |

## Verification

- `nub run check`: passed, including **75 test suites / 487 tests**.
- React Doctor 0.9.18: **97/100**, no reported issues in the changed React files.
- Expo Doctor: **17/20**. Remaining diagnostics concern unsupported `nub.lock`
  detection, the intentional TypeScript 7 version and the iOS `Car.icon` directory
  schema. No substitute lockfile, version downgrade or diagnostic suppression was added.
- Android arm64 release APK: Gradle `assembleRelease` passed with R8 enabled.
- iOS simulator Release: build passed with zero errors. Existing generated/native
  compiler warnings remain; the build reported 1,817 warnings.
- Regression coverage includes Material keyboard options, alert lifecycle,
  native-route exit guards, near-black theme tokens, unitless typography and
  local-clock/UTC conversion across daylight-saving boundaries.

| Native target                 | Checked                                                                                                                                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pixel 9 emulator              | Vehicle/history/fuel navigation, create/save/delete test entries, date/time selection, dirty draft confirmation and preservation, native menus, PDF page navigation and zoom, full-screen safe areas. |
| Pixel Tablet emulator         | Navigation rail, portrait/landscape adaptation, form draft preservation on rotation, discard/keep-editing behavior and 160% system text. Text scale was restored afterward.                           |
| iPhone 18 Pro simulator       | Native tabs, settings and Apple editor sheet presentation.                                                                                                                                            |
| iPad Air 11-inch M4 simulator | Settings/navigation and native editor sheet using the final iOS Release build.                                                                                                                        |

Temporary records created during verification were deleted. Existing QA records
were retained. No store release or production deployment was performed.

These checks used emulators and simulators. Full spoken TalkBack/VoiceOver
acceptance and controlled physical-device performance/battery measurements remain
outside this verification. A near-black screenshot pixel was measured as #010101;
this verifies the color, not a battery-saving claim.

## Screenshots

- [Android vehicle workspace](images/material-2026-10-17/android-phone.png)
- [Android PDF with system insets](images/material-2026-10-17/android-pdf.png)
- [Android tablet at 160% text size](images/material-2026-10-17/android-tablet-large-text.png)
- [iPhone native editor](images/material-2026-10-17/iphone-form.png)
- [iPad native editor](images/material-2026-10-17/ipad-form.png)
- [Android settings after the grouped-row correction](images/material-2026-10-17/android-settings.png)

## Settings follow-up

The Android settings screen now renders one native Material list item per row.
The universal FieldGroup section previously wrapped those items in another
ListItem, causing duplicate backgrounds and padding. Settings now uses plain
sections on #010101, disclosure icons only for navigation, and a non-interactive
version value. Content width is bounded on tablets for readable text.

A source audit found no other FieldGroup/ListItem nesting in Android screens.
Native checks covered settings on Pixel 9 and Pixel Tablet (including 160% text),
opening the editor and data screen, and the fuel/deadline list structure. The
existing iOS implementation is unchanged. The release APK and all 487 tests passed;
React Doctor remained at 97/100 with no reported issues.
