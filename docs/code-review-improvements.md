# Repository review improvements — 2026-09-05

The review fixes from `feat/harden-mobile-workspace` are merged into `feat/free-release-hardening`.
Local release-configuration QA builds use `dev.mojeauto.qa`; this is not a store release or
completion of all Phase 7 release gates.

## Post-merge native smoke — 2026-09-05

The current merge commit `48ac7a6` was rebuilt as a local Release QA application and installed on
iPhone 17 Pro, iPad Air 11-inch (M4), Pixel 9 and Pixel Tablet. All four targets launched the
workspace and exposed the localized data-management screen. Phone landscape and tablet portrait
showed the expected orientation gate, while tablet landscape rendered the adaptive workspace.
The two-page PDF preview rendered internally on iPhone, iPad and Android phone; no outbound document
action appeared in the preview surface.

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

`nub run check` passed: lint, formatting, TypeScript, Drizzle migration checks and **63 suites /
436 tests**. Added coverage includes dirty-form navigation, orientation draft retention, stale
document lookup rejection, metadata validation before file operations, selective data loading,
cursor pagination across timestamp ties, startup recovery ordering, transactional deletion and
interrupted deletion retries. `git diff --check` passed.

React Doctor 0.9.13 reported **87/100** with no issues. No rule was suppressed.

Expo Doctor 1.20.4 passed 19/21 checks and reports two diagnostics: it does not recognize the
intentional `nub.lock` lockfile, and its version check expects TypeScript 6 plus newer Expo patch
versions. The TypeScript 7 choice and current exact Expo-compatible pins are intentional; no
alternate lockfile or dependency-policy exception was introduced.

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

## PR #11 review follow-up — intermediate checkpoint

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

## Native UI refinement — 2026-09-08

The follow-up replaces duplicated screen-level navigation with shared phone and tablet shells,
safe-area-aware navigation surfaces, reusable contextual actions and consistent form sections.
Entry and refuelling details retain Edit as the visible primary action; destructive actions move to
a labelled menu and still require a separate confirmation. Android Back dismisses the menu before
leaving details, while dirty-form protection remains active on both platforms.

The internal PDF reader now supports full-screen presentation, page navigation, 50% zoom steps from
100% to 300%, fit-page behavior and two-axis scrolling. The current page survives closing and reopening
the reader, while another document begins on page one. Page changes reset zoom, rotation recomputes the
fit and stale render results are discarded and cleaned up. The reader remains raster-based and local;
pinch zoom, text selection, annotation and outbound sharing are outside this change.

Local Release QA builds passed on iPhone 17, iPad (A16), Pixel 9 and Pixel Tablet. The checks covered
phone and tablet navigation, both supported device orientations, real Android software keyboards,
safe areas, contextual action dismissal, dirty forms, multi-page PDFs, mixed page aspect ratios, zoom,
fit and scrolling. Simulator evidence does not replace physical-device acceptance or coverage of every
keyboard provider.

The current `nub run check` passes with **68 suites / 460 tests**. React Doctor 0.9.13 reports 83/100
and four existing warnings: high control-flow complexity in three forms and related `useState` calls in
the document form. Expo Doctor 1.20.4 passes 19/21 checks; the two known diagnostics are the unsupported
`nub.lock` detection and dependency-version recommendations that include intentional TypeScript 7 and
available Expo patch releases. No alternate lockfile, trust-policy exception or suppression was added.

## Remaining release work

This verification establishes behavior, not a measured FPS or startup-speed improvement. There is
no before/after profiler baseline. Document relationship selection still loads the full history,
and document/refuelling repositories still return full datasets behind virtualized views. Further
query pagination should be driven by larger representative datasets and profiling.

Physical-device accessibility, large text and screen-reader acceptance, dense/encrypted/damaged
PDF samples, platform backup policy, vulnerability audit, production signing and store distribution
remain release work. The PDF reader provides page navigation, stepped raster zoom and fit-page behavior,
but not pinch zoom, text selection or annotation. Interruption and notification cancellation failure
paths are covered automatically; native process termination at every deletion step and notification
delivery were not exhaustively repeated here.
