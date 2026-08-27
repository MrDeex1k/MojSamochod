# Contributing to Moje Auto

Thank you for taking the time to improve the project. This repository is publicly visible but is not open source. Read `LICENSE` and `CLA.md` before contributing.

## Where to communicate

- Use **GitHub Issues** for reproducible bugs and concrete defects.
- Use **GitHub Discussions** for ideas, feature proposals, questions, and early design conversations.
- Use **GitHub Private Vulnerability Reporting** for suspected security vulnerabilities. Never disclose a vulnerability in a public issue or discussion.

Please search existing issues and discussions before creating a new one.

## Before submitting code

Opening an issue or discussion does not require acceptance of the CLA. Every code, documentation, design, asset, or test contribution submitted for inclusion in the repository does.

You receive limited permission to copy and modify the Materials solely as reasonably necessary to prepare and submit a proposed contribution to this repository through GitHub. This permission:

- applies only to work intended for submission to this Project;
- does not permit using the Project or Materials for another project or purpose;
- does not permit publishing or distributing modified versions outside the GitHub contribution workflow;
- ends when the contribution process ends;
- is subject to `LICENSE` and `CLA.md`.

## Development setup

The application is developed with Xcode using Swift and SwiftUI for iOS and iPadOS. Swift dependencies are managed with Swift Package Manager.

NUB is used only for the repository's Husky and commitlint tooling. Install it from the repository root with:

```sh
nub run deps:install
```

Do not introduce npm, pnpm, Yarn, or Bun commands into the contributor workflow. NUB is the project's only Node.js package manager, and `nub.lock` is its only Node.js dependency lockfile.

## Contribution workflow

1. For a substantial change, start with a GitHub Discussion so the direction can be agreed before implementation.
2. Create a focused branch from the current `main` branch.
3. Keep the change small and avoid unrelated refactors.
4. Add or update tests and documentation where appropriate.
5. Build the affected Xcode scheme and run the relevant tests.
6. Test user-visible changes on the affected iPhone or iPad form factors.
7. Use Conventional Commits, for example `feat(ios): add vehicle form`.
8. Complete the pull request template and accept the CLA.

Submitting a contribution does not guarantee review, acceptance, publication, or inclusion in a release. The Project Owner may close or decline any submission.

## Pull request expectations

A pull request should explain:

- the problem being solved;
- the proposed behavior and implementation;
- the Xcode scheme, tests, simulators, and devices used for verification;
- any persistence, migration, privacy, security, or compatibility implications;
- screenshots or recordings for visible UI changes.

Do not include secrets, production data, personal data, generated build artifacts, signing material, or third-party material without compatible permission.
