# Product Scope and Screen Map

## Release definitions

### MVP

The MVP is a complete local-first application for one vehicle. It must be useful without an
account, subscription, network connection, or remote service. It includes the free product
foundation and ends before purchase or synchronization work begins.

### Target product

The target product contains the complete MVP plus an optional Premium subscription. Premium is
available only as a monthly or annual recurring purchase through the App Store and Google Play. It
unlocks additional vehicles and user-initiated device-to-device synchronization.

The target product described here is not a promise that no other features will ever be added. It is
the agreed boundary for the current delivery plan.

## MVP scope

### Included

- Create, view, edit, and safely delete one vehicle.
- Store essential vehicle details, current mileage, insurance deadline, and technical-inspection
  deadline.
- Create inspection, replacement, and repair history entries.
- Record dates, mileage, notes, monetary amounts, and relevant entry details.
- Attach invoices or other documents to the vehicle or a specific history entry.
- Import, preview, export, replace, and safely delete managed documents.
- Record refuelling events and calculate average fuel consumption from valid records.
- Display upcoming and overdue insurance and technical-inspection reminders.
- Schedule local notifications while keeping reminders usable when notification permission is
  denied.
- Persist all core data in an embedded local database and app-managed document storage.
- Provide local data export and a documented recovery path before production release.
- Support Android phones, iPhone, and adaptive iPad layouts.
- Support light and dark appearances, accessibility settings, and locale-aware units and values.

### Excluded

- Accounts, sign-in, user profiles, and cloud identity.
- Purchases, paywalls, subscriptions, trials, and Premium entitlement checks.
- More than one vehicle.
- QR pairing or synchronization between devices.
- Cloud backup, remote storage, background synchronization, and real-time synchronization.
- A synchronization server or any required remote service for core application behavior.
- A production web application.

## Target product scope

The target product retains the complete MVP for free users and adds the following Premium
capabilities.

### Premium subscription

- One Premium entitlement with two recurring purchase periods:
  - monthly,
  - annual.
- Purchase and restore through the platform stores.
- Clear handling of active, pending, grace-period, cancelled, expired, and unavailable entitlement
  states.
- No lifetime purchase in the currently agreed offering.
- Premium expiry must never delete user data. The exact read-only or editing behavior for vehicles
  above the free limit must be decided before implementation.

### Multiple vehicles

- Add more than one vehicle while Premium is active.
- Switch the active vehicle without mixing history, documents, fuel records, or reminders.
- Apply the same data model and workflows to every vehicle rather than maintaining separate Premium
  implementations.

### QR-initiated device synchronization

- Synchronization is a Premium feature and is explicitly initiated by the user.
- One device displays pairing information as a QR code and the other device scans it.
- The QR code establishes the direct synchronization session; large records and documents are not
  expected to fit inside the QR image itself.
- Both devices must be active during the transfer and must show progress, completion, and recoverable
  failure states.
- The initial target has no account, cloud source of truth, remote data store, background service,
  automatic synchronization, or real-time synchronization server.
- A serverless transport prototype must prove pairing, authentication, encryption, connectivity,
  conflict handling, interruption recovery, and document transfer before implementation begins.
- If reliable direct transfer cannot be achieved within the no-server constraint, the product scope
  must be reviewed explicitly. A synchronization service must not be introduced silently.

## MVP navigation

Phone navigation should begin with four destinations. If prototype testing shows that a destination
does not justify permanent navigation, it may become secondary navigation without changing its
functional scope.

1. **Vehicle** — selected vehicle, immediate status, history, costs, and documents.
2. **Fuel** — refuelling history, consumption summary, and add action.
3. **Reminders** — upcoming and overdue insurance and inspection deadlines.
4. **Settings** — appearance, units, data management, privacy, and help.

On iPad, the same information architecture should use a sidebar and list-detail presentation where
it adds context. iPad should not introduce different product concepts.

## MVP screens and surfaces

Not every item below needs to be a permanent full-screen route. Focused creation tasks may be sheets
or modals on phones and contextual panels on iPad.

| Surface                   | Responsibility                                                                                                  | Suggested presentation                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Launch and initialization | Open the database, run migrations, restore appearance, and route safely.                                        | Native splash followed by the correct application state.                |
| First vehicle setup       | Explain the minimum value and create the first vehicle.                                                         | Focused first-run flow without marketing slides.                        |
| Vehicle workspace         | Identify the vehicle, show mileage, nearest deadline, recent history, costs, documents, and primary add action. | Main destination; list-detail capable on iPad.                          |
| Vehicle editor            | Create or edit vehicle identity, optional photo, mileage, and deadlines.                                        | Focused form.                                                           |
| History timeline          | Scan inspection, replacement, and repair entries chronologically.                                               | Part of the vehicle workspace or a secondary list when history grows.   |
| History entry editor      | Create or edit an inspection, replacement, or repair with relevant fields only.                                 | Sheet, modal, or full-screen form depending on platform and complexity. |
| History entry details     | Review all entry information, related amount, document, edit action, and safe deletion.                         | Secondary screen or iPad detail pane.                                   |
| Vehicle documents         | Scan invoices and files related to the vehicle and its entries.                                                 | Secondary list from the vehicle workspace.                              |
| Document preview          | Preview metadata and supported content; export, replace, reassign, or delete the file.                          | Full-screen preview or platform document surface.                       |
| Fuel workspace            | Show consumption summary, refuelling history, data sufficiency, and add action.                                 | Main destination.                                                       |
| Refuelling editor         | Record date, odometer, quantity, total or unit price, and full or partial fill state.                           | Focused form.                                                           |
| Reminders workspace       | Show upcoming, overdue, and unavailable notification states.                                                    | Main destination.                                                       |
| Reminder editor           | Create or edit insurance and technical-inspection deadlines and notification preferences.                       | Focused form.                                                           |
| Settings                  | Configure appearance, units, locale-sensitive preferences, privacy, and help.                                   | Main destination with grouped plain lists.                              |
| Data management           | Export data and documents, inspect storage, and perform explicitly confirmed destructive actions.               | Secondary settings screen.                                              |

## Additional target-product screens and surfaces

| Surface                             | Responsibility                                                                                | Availability                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Garage and vehicle switcher         | List vehicles, select the active vehicle, and start adding another one.                       | Premium for vehicles above the free limit.          |
| Premium offer                       | Compare monthly and annual subscriptions and explain exactly which capabilities they unlock.  | Shown at a Premium boundary and from Settings.      |
| Purchase and restore state          | Show pending, successful, failed, restored, grace-period, and expired states.                 | Premium commerce flow.                              |
| Subscription settings               | Show current entitlement and link to platform subscription management.                        | Settings.                                           |
| Synchronization start               | Choose whether this device displays a QR code or scans another device.                        | Premium.                                            |
| Pairing QR                          | Display short-lived pairing information and an explicit cancellation action.                  | Premium synchronization flow.                       |
| QR scanner                          | Scan pairing information with contextual camera-permission education.                         | Premium synchronization flow.                       |
| Transfer review                     | Identify the peer, summarize the pending transfer, and require confirmation before changes.   | Premium synchronization flow.                       |
| Synchronization progress and result | Show transfer progress, conflicts, completion, retry, and recoverable failures.               | Premium synchronization flow.                       |
| Paired-device history               | Inspect recent direct transfers and revoke remembered trust if persistent pairing is adopted. | Premium; exact retention remains a design decision. |

## Screen-design rules

- A screen has one primary responsibility and one dominant action.
- Do not create a dashboard card for every metric; combine related status in plain layout and lists.
- Keep vehicle history as the primary working surface rather than hiding it behind analytics.
- Reuse the same editor for create and edit behavior when doing so does not obscure state.
- Reuse the free vehicle workflows for additional Premium vehicles.
- Premium prompts appear at a meaningful boundary and must not interrupt ordinary free use.
- Synchronization must present explicit source, destination, progress, conflict, and completion states;
  it must never imply continuous real-time behavior.

## Open product decisions

- Exact vehicle fields required during first setup.
- Whether vehicle documents remain embedded in the main workspace or receive a permanent secondary
  route.
- Whether Fuel and Reminders both justify permanent phone tabs after prototype testing.
- Subscription prices, trial availability, and introductory offers.
- Behavior of vehicles above the free limit after Premium expires.
- Whether paired-device trust persists after one synchronization session.
- Direct transport mechanics and connectivity limitations under the no-server constraint.
