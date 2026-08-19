# Security Policy

## Supported versions

Moje Auto is currently in early development and has no supported production release. Security fixes are applied only to the latest code on the `main` branch. Older commits, forks, unofficial builds, and modified versions are not supported.

## Reporting a vulnerability

Report suspected vulnerabilities only through [GitHub Private Vulnerability Reporting](https://github.com/MrDeex1k/MojSamochod/security/advisories/new).

Do not disclose a suspected vulnerability in a public issue, discussion, pull request, commit message, or social media post. Do not include secrets or personal data unless they are strictly necessary to understand the report; use synthetic or redacted examples whenever possible.

A useful report should include:

- the affected component, version, or commit;
- the vulnerability type and realistic impact;
- clear reproduction steps or a minimal proof of concept;
- required conditions and affected platforms;
- suggested remediation, if known;
- whether anyone else has been informed.

The Project Owner will handle reports on a best-effort basis. Submission does not guarantee a response, fix, public advisory, CVE, reward, or credit.

## Coordinated disclosure

Keep the report and all related details confidential until the Project Owner explicitly agrees to disclosure. If a report is accepted, the reporter and Project Owner may coordinate remediation, release timing, advisory content, and optional credit through the private advisory.

## Authorization and testing

This policy does not grant permission to use the Project contrary to `LICENSE`, access another person's data, test systems or accounts you do not own, disrupt services, conduct denial-of-service testing, use social engineering, or violate applicable law.

If active testing beyond your own local environment would be required, request written authorization through Private Vulnerability Reporting before performing it. Stop testing and report immediately if you encounter personal data, credentials, or access to another user's environment.

## Current system and scope

The current repository contains an Expo React Native application for Android, iOS, and iPadOS. The policy covers only code, configuration, and behavior present in this repository.

In scope:

- original application code and configuration in this repository;
- application-controlled local storage and data handling implemented by the Project;
- build or update configuration that could expose users or signing material;
- release artifacts produced from this repository.

Third-party services, Expo infrastructure, GitHub, app stores, operating systems, devices, and dependencies are outside the Project's control. Vulnerabilities in those products should be reported to their respective maintainers, unless the finding concerns an insecure integration introduced by this Project.

## Threat model and trust boundaries

Important assets include locally stored application data and signing or deployment credentials.

Untrusted input includes user-entered values, imported files, deep links, and data received from external libraries or platform services.

The principal trust boundaries are:

- the mobile interface and local application storage;
- application code and operating-system services;
- development, build, signing, and deployment environments.

## Security invariants

Security-sensitive changes must preserve these properties:

- secrets, private keys, signing credentials, and privileged tokens must never be committed or embedded in client code;
- sensitive data must not be written to logs, analytics, crash reports, or public error messages;
- untrusted input must be validated and handled with bounded resource use;
- imports, attachments, links, and file paths must not escape application-controlled storage or execute untrusted content;
- local data deletion and export must affect only the records selected by the user;
- production builds and updates must be attributable to authorized project maintainers.

## Reportable findings

Examples of reportable findings include realistic paths to unauthorized local data access or modification, disclosure of sensitive user or project credentials, injection, unsafe file handling, malicious update delivery, and exploitable dependency or configuration issues that are reachable in the Project.

Reports should demonstrate a plausible attack path and meaningful impact. Scanner output without evidence of reachability, unsupported-version findings, purely theoretical hardening suggestions, social engineering, physical access to an already-unlocked device, and denial-of-service testing are generally out of scope unless they reveal a Project-specific vulnerability with realistic user impact.

## Privacy

Use test data that belongs to you. Do not retain, copy, alter, or disclose personal data encountered accidentally. Describe such data using the minimum information necessary in the private report and delete local copies after coordination with the Project Owner.
