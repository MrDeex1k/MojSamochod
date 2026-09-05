# Repository review improvements — 2026-09-05

The review fixes are prepared on `feat/harden-mobile-workspace` for review. Local release-configuration QA builds use
`dev.mojeauto.qa`; this is not a store release or completion of all Phase 7 release gates.

## Delivered behavior

- Forms remain mounted when the orientation gate hides them. Unsaved edits survive rotation.
  A shared guard confirms leaving dirty forms through buttons, tablet navigation and Android Back,
  and blocks leaving during saves. Selecting an already open vehicle editor preserves its draft.
- History, document and refuelling lists use virtualization. History reads use stable SQLite cursor
  pages of 50 records, with deterministic ordering for equal timestamps. Scroll offsets survive
  navigation. Data loading and invalidation are separated by section; fuel calculations and document
  reads no longer run every time the history opens. Document relationships use a lookup map.
- Workspace data orchestration, history presentation, navigation guards and layout infrastructure
  have separate modules. Repository failures distinguish unavailable storage from corrupt records;
  form saves recover their enabled state after rejected operations.
- Document metadata is validated before copying and hashing a file. The document date uses a native
  calendar picker. Switching documents cannot display the previous document after a failed lookup.
- PDFs render one page at a time through a local Expo module using PDFKit on Apple and PdfRenderer
  on Android. Source files are restricted to managed application storage. Preview images are bounded
  to 1600 pixels on their longest side and cleaned up after use. There are no outbound document
  sharing/open-in-another-app actions; `expo-sharing` and its plugin were removed. Internal JSON
  contracts remain internal.
- Interrupted managed-file commits are recovered before application access; deletion of previously
  identified orphan files continues after usable data becomes available. Preview/export caches are
  cleaned on startup without blocking otherwise usable records if cache cleanup fails.
- The Your data screen offers confirmed deletion of user records, managed attachments and owned
  notification schedules. A persistent marker makes interrupted deletion resumable on startup.
  Database deletion is transactional and preserves schema/migrations. Original source files are
  outside the deletion scope. Successful deletion returns directly to initial vehicle creation.
- Form fields expose validation messages and focus the first newly invalid text field. Save buttons
  expose busy state. Embedded forms adjust for keyboards; text input line heights use the existing
  scalable typography tokens instead of fixed native line heights.
- The repository currently has no GitHub Actions workflow; the previously added workflow was removed.
  Local verification results are recorded below. Node, NUB, exact dependency pins and the cooling policy
  remain unchanged. Native build output is ignored.

## Automated verification

`nub run check` passed: lint, formatting, TypeScript, Drizzle migration checks and **62 suites /
411 tests**. Added coverage includes dirty-form navigation, orientation draft retention, stale
document lookup rejection, metadata validation before file operations, selective data loading,
cursor pagination across timestamp ties, startup recovery ordering, transactional deletion and
interrupted deletion retries. `git diff --check` passed.

React Doctor 0.9.13 scanned all 177 source files: no reported errors, 18 warnings. It did not produce
a score because maintainability analysis failed; this is an incomplete diagnostic, not a clean
health score. Remaining warnings cover complex existing forms/workspace branches, related state,
subscription churn, a component-file helper export, safe-area padding and small bounded reminder
offset lookups. Sequential notification operations intentionally preserve scheduling order. The
erase coordinator converts failures to results, so its caller's busy reset is not exposed to an
uncaught storage rejection. The lockfile warning does not recognize NUB. No rule was suppressed.

Expo Doctor 1.20.4 passed 19/21 checks. It does not recognize `nub.lock` and recommends TypeScript 6,
while TypeScript 7 is intentional. It also recommends patch upgrades for Expo, image picker/image
manipulator, notifications and router. Those upgrades were not folded into this behavioral change.
No alternate lockfile, TypeScript downgrade or dependency-policy exception was introduced.

Both native QA builds succeeded: iOS simulator Release and Android ARM64 release-configuration APK.
No GitHub Actions workflow currently runs repository checks on pull requests or main.
The recorded `nub run check` result comes from local verification.

## Native verification

Tests used the application's own QA binary, not Expo Go or Expo Web. Final binaries were installed
on all four targets. Device data used for destructive testing was created specifically for this task.

| Target                          | System / locale      | Verified scenarios                                                                                                                                                                                          |
| ------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iPhone 17 Pro simulator         | iOS 26.5 / Polish    | Draft survives blocked landscape and return; discard confirmation; normal startup after final install.                                                                                                      |
| iPad Air 11-inch (M4) simulator | iPadOS 26.5 / Polish | Draft survives blocked portrait and return; keyboard layout; two-page PDF, switching to a different PDF starts on its first page; history containing 1200 records reaches record 1199 and opens its detail. |
| Pixel 9 emulator                | Android 17 / English | Draft survives rotation; system Back confirms discard; PDF imported through system picker, both pages render internally, retained after final build installation.                                           |
| Pixel Tablet emulator           | Android 17 / English | Keyboard layout; draft survives portrait blocking and return to landscape; reopening current vehicle editor is a no-op; system Back confirms discard.                                                       |

The tablet emulator's natural orientation is landscape: the automation tool's rotation labels map
to device rotation values rather than physical aspect ratio. Assertions used actual displayed UI
and accessibility content. PDF page rendering was also inspected visually on Android.

The iPad erase-all test removed the synthetic vehicle, 1200 history records, two document records
and their two managed PDFs. Read-only SQLite inspection confirmed zero user records, all nine
migration rows retained, and no remaining managed directory or erase marker. The source PDF outside
application storage remained present. The UI returned to first-vehicle creation and remained there
after a fresh application launch. Android's document calendar opened and confirmed September 5,
2026 with the expected localized date in the form.

## PR #11 review follow-up

Document reads now distinguish missing content from storage/repository errors and offer an in-place
retry after an error. History accessibility labels include the displayed date, mileage and cost,
including zero values. History refresh uses pages up to 100 records while initial loading remains
50 records; the final refresh page is limited to the remaining cached range. Regression tests cover
empty, 50-, 250- and 500-record ranges and continued cursor loading. Refreshing 500 cached records
now uses five page requests instead of ten; this measures query count, not device frame rate.

Local `nub run check` passed with 63 suites and 423 tests after these fixes. React Doctor 0.9.13
completed its changed-scope analysis against `origin/main`: 82/100, no errors and eight warnings.
This is a different scope from the earlier incomplete full scan, so the scores are not comparable.
The removed GitHub Actions workflow remains removed; local checks are not reported as hosted CI.

Updated native QA builds succeeded on Apple and Android. On iPhone 17 Pro and iPad Air 11-inch (M4)
simulators, a controlled invalid storage key on a synthetic attachment produced the read-error UI;
restoring its metadata and pressing retry displayed the PDF in place. The temporary corruption was
removed afterward. A missing-file case was separately verified on iPhone. Accessibility snapshots
confirmed date, distance and zero-cost labels on iPhone, iPad, Pixel 9 and Pixel Tablet. These are native
accessibility-tree checks, not a replacement for physical VoiceOver/TalkBack acceptance.

## Remaining release work

This verification establishes behavior, not a measured FPS or startup-speed improvement. There is
no before/after profiler baseline. Document relationship selection still loads the full history,
and document/refuelling repositories still return full datasets behind virtualized views. Further
query pagination should be driven by larger representative datasets and profiling.

Physical-device accessibility, large text and screen-reader acceptance, dense/encrypted/damaged
PDF samples, platform backup policy, vulnerability audit, production signing and store distribution
remain release work. PDF previews currently provide page navigation, not text selection or zoom.
Interruption and notification cancellation failure paths are covered automatically; native process
termination at every deletion step and notification delivery were not exhaustively repeated here.
