# Design Direction

## Visual thesis

Moje Auto should feel like a modern digital service book with automotive heritage: warm ivory and
graphite surfaces, confident typography, real vehicle imagery, and one restrained racing-green
accent that signals action and current state.

## Content plan

This is an operational product, not a marketing dashboard. The interface should begin with the
user's current vehicle and the next useful action.

1. **Orient:** identify the selected vehicle, its mileage, and the nearest deadline.
2. **Act:** make adding a history entry, document, or refuelling event immediately available.
3. **Review:** show a chronological, scannable service history and cost context.
4. **Inspect:** reveal full entry, document, calculation, or reminder details only when requested.

Each screen gets one primary job and one dominant action. Supporting content must explain status,
scope, or consequence rather than repeat marketing promises.

## Interaction thesis

- Use a short, ordered entrance only when a vehicle workspace first appears: identity, status, then
  recent history. Routine revisits should be immediate.
- Insert new timeline and refuelling entries with a restrained layout transition that makes their
  final position clear.
- Use shared context transitions between a timeline row and its details, plus a concise bottom-sheet
  or modal transition for focused creation flows.

All motion must remain fast, interruptible, smooth on mid-range Android hardware, and compatible
with reduced-motion preferences. Motion should explain hierarchy or state change; ornamental motion
should be removed.

## Interface principles

- Prefer calm surface hierarchy, spacing, typography, dividers, and lists over stacked cards.
- Use a card only when the entire surface is a single interaction, such as selecting a vehicle.
- Keep one accent color for primary actions, selected state, and essential status.
- Reserve semantic colors for warnings, overdue deadlines, success, and destructive actions.
- Avoid decorative gradients, thick borders, ornamental icons, dashboard mosaics, and competing
  accent colors.
- Use platform-native interaction patterns where iOS and Android expectations differ.
- Keep labels factual and compact: `Service history`, `Next inspection`, `Fuel consumption`,
  `Documents`, `Total cost`.

## Primary workspace

The vehicle workspace is the center of the product. Its hierarchy should be:

1. Vehicle identity: optional photo, make, model, registration identifier, and current mileage.
2. Immediate status: nearest inspection or insurance deadline, including overdue state.
3. Primary action: add an entry, with entry type chosen inside the flow.
4. Chronological history: repairs, replacements, inspections, refuelling, and documents presented as
   a readable timeline or sectioned list.
5. Secondary context: totals, consumption trends, document count, and vehicle settings.

Do not place every metric in a separate tile. A concise summary line or grouped list is preferred
until a visualization materially improves a decision.

## Navigation

For a phone-sized layout, begin with a small number of destinations:

- `Vehicle` — selected vehicle and its history,
- `Fuel` — refuelling records and consumption,
- `Reminders` — upcoming and overdue obligations,
- `Settings` — preferences, premium state, data management, and help.

The add action should be prominent but should not compete with navigation. If usability testing
shows that the timeline already provides adequate access to fuel and reminders, reduce the number of
top-level destinations rather than preserving an unnecessary tab.

On iPad, adapt navigation to a sidebar or split view and use the additional width for list-detail
context. Do not stretch the phone layout into a wide centered column or fill space with decorative
cards.

## Typography, color, and spacing

- Prefer native system typefaces initially for platform quality, localization, and accessibility.
- Use at most two typeface families if the brand later receives a display face.
- Establish a compact type scale with clear distinction between vehicle identity, section headings,
  values, labels, and metadata.
- Use an 8-point spacing rhythm with smaller optical adjustments where necessary.
- Support light and dark appearances from the first reusable design tokens.
- Preserve strong contrast and do not communicate category or state by color alone.
- Keep touch targets at least 44 points on Apple platforms and 48 density-independent pixels on
  Android.

### Agreed color direction

The brand palette combines racing green with warm ivory and graphite. The interface should remain
mostly neutral; green is the single brand accent used for primary actions, active navigation,
selection, focus, and essential current state.

| Role           | Light appearance | Dark appearance |
| -------------- | ---------------- | --------------- |
| Canvas         | `#F4F1E8`        | `#111410`       |
| Surface        | `#EAE6DA`        | `#181D18`       |
| Strong surface | `#DDD7C8`        | `#222A23`       |
| Primary text   | `#1B1D1A`        | `#F2F0E8`       |
| Secondary text | `#60655E`        | `#AAB0A7`       |
| Accent         | `#1F5A43`        | `#72B48E`       |
| Pressed accent | `#174735`        | `#8AC5A2`       |
| Text on accent | `#FFFFFF`        | `#0D1B13`       |
| Divider        | `#D5D0C4`        | `#2D352E`       |

Warning, overdue, destructive, and success colors are semantic state colors rather than additional
brand accents. Their final values must be contrast-tested, and they must always be paired with text,
an icon, or another non-color signal.

### Color token architecture

Colors must have one source of truth. When the design-system foundation is implemented, create
`apps/mobile/styles/theme.css` and import it once from `apps/mobile/global.css`.

The theme file must contain two layers:

1. **Primitive palette tokens** describe raw values, for example `racing-green-700`, `ivory-50`, or
   `graphite-950`. Raw palette tokens may only be referenced inside the theme definition.
2. **Semantic aliases** describe purpose, for example `canvas`, `surface`, `text-primary`, `accent`,
   `on-accent`, `warning`, or `danger`. Light and dark appearances map those same aliases to
   different primitive values.

Application components must use semantic utilities backed by those aliases, such as `bg-canvas`,
`bg-surface`, `text-primary`, or `bg-accent`. They must not contain hexadecimal, RGB, HSL, or raw
palette values. A brand-color adjustment should therefore require changing only the central theme
file and should propagate to every component using the affected aliases.

New aliases should describe reusable meaning rather than a screen or component. Prefer
`text-secondary` over `vehicle-subtitle` and `danger` over `delete-button-red`. Component-specific
tokens are acceptable only when the component represents a genuinely distinct, reusable design
role.

Typography sizes, spacing, radii, elevations, and motion values should follow the same
semantic-token approach after representative screens have validated their scale.

## Imagery and documents

A real vehicle photo may act as the visual anchor on the vehicle workspace or empty-state setup.
It should identify the user's car, not decorate routine UI. Use stable crops with quiet tonal areas,
avoid embedded text or logos, and keep information readable when no photo exists.

Invoice previews must remain subordinate to document metadata and actions. Do not turn documents
into a collage or use thumbnails where a filename, date, amount, and relation scan more efficiently.

## Forms and data entry

- Break long creation flows into meaningful groups, not one card per field.
- Select entry type early and reveal only relevant fields.
- Keep amount, mileage, and date inputs explicit about units and formats.
- Preserve drafts when the app is interrupted where data loss would be frustrating.
- Validate near the field and explain how to recover; never discard input after a validation error.
- Make attaching a document optional and available both during entry creation and later.

## Accessibility and localization

- Support Dynamic Type or equivalent font scaling without clipping essential information.
- Provide accessible names and states for icons; do not rely on icon-only meaning for uncommon
  actions.
- Maintain logical reading and focus order, including sheets and dialogs.
- Design for longer translated labels and locale-specific dates, currencies, distances, and fuel
  units.
- Respect reduced motion, increased contrast, screen readers, and platform text-size settings.

## Design validation checklist

- Can a user identify the selected vehicle and next deadline in seconds?
- Is there one unmistakable primary action on each screen?
- Can headings, values, and status labels be scanned without reading body copy?
- Has every card earned its container through interaction or grouping semantics?
- Does the layout remain useful without decorative shadows and gradients?
- Does iPad use additional space for context rather than enlarged phone chrome?
- Does every animation clarify entry, continuity, or state change?
- Do light mode, dark mode, large text, empty states, errors, and offline behavior remain coherent?
- Do components use semantic color aliases without embedding raw color values?
