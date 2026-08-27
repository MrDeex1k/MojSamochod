# Project Instructions

## Project Scope

- Build Moje Auto as a native application for iOS and iPadOS using Swift and SwiftUI.
- Keep the product local-first. Do not introduce a required backend, account system, cross-platform framework, Android application, or web application unless the task explicitly includes it.
- Preserve user ownership of locally stored vehicle data and documents. Treat migrations, imports, exports, and deletion as data-safety-sensitive work.

## Apple Development

- Prefer Apple frameworks and platform conventions before adding third-party dependencies.
- Manage Swift dependencies with Swift Package Manager and commit `Package.resolved` when it is generated for the application.
- Do not commit Derived Data, build products, Xcode user state, signing certificates, provisioning profiles, API keys, or other secrets.
- Before creating or modifying code, consult the current official Apple Developer Documentation for the relevant frameworks. Also use Context7 when the relevant third-party library or technology is available there.
- Treat iPhone and iPad as supported form factors. Verify adaptive layouts and platform behavior on both when a change can affect them.

## Repository Tooling

- Node.js tooling exists only to install and run Husky and commitlint for Conventional Commits. Do not use Node.js as an application runtime without an explicit change in project scope.
- Respect the Node.js and NUB versions pinned by the repository. Do not change them unless the task explicitly includes a tooling upgrade.
- Use NUB exclusively for repository Node.js tooling. Translate commands written for `npm`, `npx`, `pnpm`, `yarn`, or `bun` into semantically equivalent NUB commands before execution.
- Route every Node.js dependency installation or mutation through Socket Firewall (SFW). Use `nub run deps:install` for a standard install and `nub exec sfw nub <command>` for operations such as `add`, `remove`, or `update`.
- Preserve the 24-hour dependency cooling period configured in `nub.jsonc`. Do not bypass SFW or the cooling period without explicit approval.
- Pin direct Node.js dependencies to exact versions and keep `nub.lock` synchronized as the repository's only Node.js lockfile.
- Do not invoke another Node.js package manager or create its lockfile.

## Verification

- Build the affected Xcode scheme after Swift or project-configuration changes.
- Run the relevant Swift tests after modifying application behavior, persistence, calculations, purchases, notifications, imports, exports, or migrations.
- Test user-visible changes on an appropriate simulator or physical device. Include both iPhone and iPad verification when layout or navigation may differ.
- Keep commit messages compatible with Conventional Commits and the repository's commitlint configuration.

## Language

- Respond in the language used by the user unless they explicitly request another language.
- Write source code, identifiers, technical comments, repository documentation, and commit messages in English unless the user explicitly requests otherwise.
- User-facing application content may use the product's selected locale and is not required to be in English.
