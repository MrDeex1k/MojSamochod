# Product Foundation

This directory records the agreed product direction for Moje Auto. It separates the product
scope from implementation choices and delivery order so that future decisions can change without
silently rewriting the original goal.

## Product vision

Moje Auto is a local-first mobile application for keeping the complete, practical history of a
vehicle in one place. It should help a driver answer three questions quickly:

1. What has happened to this car?
2. What did it cost and which documents confirm it?
3. What needs attention next?

The application is intended for Android phones and tablets, iPhone, and iPad. A web application is
not part of the product scope. Web support exposed by Expo may be used during development, but it is
not a release target unless the product scope changes explicitly.

## Product principles

- **Local-first:** core functionality must work without an account or network connection.
- **User-owned data:** vehicle history, costs, and documents remain available on the device and
  must be handled safely during migrations, export, import, synchronization, and deletion.
- **Useful before premium:** one vehicle and its core history must provide a complete, credible
  free experience.
- **Progressive complexity:** begin with one vehicle and one complete workflow before adding
  monetization or device-to-device synchronization.
- **Cross-platform consistency:** business rules and information architecture should be shared,
  while navigation and controls should still feel appropriate on each platform and form factor.

## Agreed functional scope

### Free foundation

- Add and manage one vehicle.
- Store essential vehicle details, including mileage.
- Add dated history entries in three initial categories:
  - inspection,
  - replacement,
  - repair.
- Record entry details, mileage, notes, and monetary amounts.
- Attach invoices or other documents to a vehicle and to a specific history entry.
- Record refuelling events and calculate average fuel consumption.
- Remind the user about mandatory technical inspection and motor insurance deadlines.

### Premium direction

- Monthly and annual subscriptions purchased through the platform stores.
- More than one vehicle.
- User-initiated device-to-device synchronization established by scanning a QR code.

Premium limits, trial rules, entitlement recovery, synchronization conflict handling, encryption,
and the exact direct transport are product decisions for later phases. The initial target does not
include accounts, cloud storage, background synchronization, or a real-time synchronization server.

## Deliberately outside the initial scope

- A required account or sign-in flow.
- A required remote service for core vehicle management.
- Social features, fleet management, workshops, marketplace functionality, and public profiles.
- A production web application.
- Premium and synchronization work before the local data model is stable.

## Documentation map

- [Vehicle history domain model](./domain-model.md) — approved entities, value types, invariants,
  lifecycle rules, and product decisions for the first vertical slice.
- [First vehicle user flow](./first-vehicle-user-flow.md) — approved Polish working document covering
  first-run, vehicle setup, history-entry behavior, and phone/tablet wireframes.
- [Technology](./technology.md) — platforms, current stack, tooling, and planned native
  capabilities.
- [Product scope and screen map](./product-scope.md) — explicit MVP and target-product boundaries,
  navigation, and required surfaces.
- [Design direction](./design-direction.md) — visual thesis, information hierarchy, responsive
  behavior, and motion principles.
- [Delivery plan](./delivery-plan.md) — phases, implementation steps, and completion criteria.

## Decision discipline

When a product or architecture decision changes, update the relevant document in the same change
as the implementation. Mark uncertain choices as decisions to validate instead of presenting them
as completed technology.
