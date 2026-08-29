# Project Instructions

## Environment and Dependency Management

- Respect the Node.js and NUB versions pinned by the repository. Do not change them unless the task explicitly includes a toolchain upgrade.
- Use NUB exclusively to manage Node.js, dependencies, scripts, and project binaries.
- Treat commands written for `npm`, `npx`, `pnpm`, `yarn`, or `bun` in documentation and skills as examples. Translate them into semantically equivalent NUB commands before execution.
- Route every dependency installation or mutation through Socket Firewall (SFW). Use `nub run deps:install` for the standard project install and `nub exec sfw nub <command>` for operations such as `add`, `remove`, or `update`. Commands that only run already installed scripts or binaries do not require SFW.
- Preserve the 24-hour dependency cooling period configured in `nub.jsonc`. Do not bypass SFW or the cooling period without explicit approval.
- Pin direct dependencies and development dependencies to exact versions. Do not introduce `^`, `~`, or other version ranges.
- Keep `nub.lock` synchronized with dependency manifests and commit it as the repository's only package-manager lockfile.
- Use `nub run` for package scripts and `nub exec` for an installed local binary. Run temporarily downloaded tools through SFW with `nub exec sfw nub dlx <package>`. Preserve SFW when translating dependency commands; for example, translate `npx expo install ...` to `nub exec sfw nub exec expo install ...`.
- For Expo and React Native packages, prefer versions supported by the active Expo SDK over the newest registry release.
- Do not invoke another package manager or create its lockfile. If an equivalent NUB command cannot be confirmed, consult `nub help <command>` or the NUB documentation. Do not fall back to another package manager without explicit user approval.

## Code Verification

- Run `nub run check` after code or configuration changes and before completing work or opening a pull request.
- After creating or modifying React code, use React Doctor to verify it.
- Run Expo Doctor in the Expo application workspace (`apps/mobile`) after changing dependencies, Expo configuration, native configuration, or the Expo SDK, and before opening a pull request or producing a release build. Invoke it through NUB and SFW in accordance with the dependency-management rules above.
- Expo Doctor currently does not recognize `nub.lock`, and TypeScript 7 is an intentional project choice. Report related diagnostics, but do not create another lockfile, downgrade TypeScript, or suppress checks unless explicitly requested.
- If SFW blocks a diagnostic because of a supply-chain trust failure, do not weaken the trust policy or add an exception without explicit approval. Report which diagnostic could not run and complete the remaining verification.
- Before creating or modifying code, use Context7 to consult the current documentation for the technologies involved.

## Native Application Verification

- Treat native iOS and Android simulators, emulators, or physical devices as the source of truth for user-visible mobile behavior. Expo Web and browser automation do not replace native verification unless the user explicitly requests the development web surface.
- After changing React Native layout or interaction behavior, verify the affected form factors on relevant native Apple and Android targets. Include both iPadOS and Android tablets whenever adaptive tablet behavior may differ from phone behavior.

## Language

- Respond in the language used by the user unless they explicitly request another language.
- Write source code, identifiers, technical comments, repository documentation, and commit messages in English unless the user explicitly requests otherwise.
- Write temporary working documents, phase-status notes, and decision drafts in Polish. Keep durable target documentation in English unless the user explicitly requests another language.
- User-facing application content may use the product's selected locale and is not required to be in English.
