# Moje Auto

Moje Auto is a local-first vehicle management application for iPhone and iPad. It is being developed as a native Apple-platform project using Swift and SwiftUI.

The repository is publicly visible for review and evaluation, but it is not open source. See [LICENSE](LICENSE) before using any material from this project.

## Product scope

The application is intended to support:

- one vehicle in the free tier;
- maintenance, replacement, inspection, and repair records;
- costs, mileage, notes, and attachments associated with vehicle records;
- fuel entries and average fuel-consumption calculations;
- local reminders for insurance and technical inspections;
- monthly and annual Premium purchases through the App Store;
- additional vehicles and device synchronization as Premium capabilities.

The first implementation is focused on reliable offline operation. Synchronization is not required for the core application to function.

## Technical direction

- Swift and SwiftUI;
- iOS and iPadOS;
- SwiftData for local persistence;
- Swift Package Manager for Swift dependencies;
- StoreKit for in-app purchases;
- UserNotifications for local reminders;
- XCTest or Swift Testing for automated verification.

The native Xcode application project has not yet been added to this foundation branch.

## Repository tooling

Husky and commitlint remain as small, application-independent development tools that enforce Conventional Commits. Node.js is not part of the application runtime.

Requirements for repository tooling:

- Node.js 24.18.0, pinned in `.node-version`;
- NUB 0.7.5 or a compatible version.

Install the commit tooling from the repository root:

```sh
nub run deps:install
```

Do not use npm, pnpm, Yarn, or Bun in the repository workflow. NUB is the only Node.js package manager used by the project, and `nub.lock` is its only Node.js dependency lockfile.

## Commits

Commit messages follow Conventional Commits:

```text
type(optional-scope): short description
```

Examples:

```text
feat(ios): add vehicle form
fix(ios): preserve odometer value
docs: update development setup
chore(repo): update tooling
```

## Collaboration and security

- Bugs: [GitHub Issues](https://github.com/MrDeex1k/MojSamochod/issues)
- Ideas and questions: [GitHub Discussions](https://github.com/MrDeex1k/MojSamochod/discussions)
- Vulnerabilities: [GitHub Private Vulnerability Reporting](https://github.com/MrDeex1k/MojSamochod/security/advisories/new)

Read [CONTRIBUTING.md](CONTRIBUTING.md), [CLA.md](CLA.md), and [SECURITY.md](SECURITY.md) before contributing or reporting a security issue.

## License

Copyright © 2026 Jakub Batycki. All rights reserved. See [LICENSE](LICENSE) for the complete terms.
