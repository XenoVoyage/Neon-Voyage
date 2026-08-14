# Security policy

## Supported version

Only the current `main` branch and the version deployed through GitHub Pages receive security updates. Older snapshots are not maintained separately.

## Reporting a vulnerability

Please do not publish exploit details in a public issue first.

Use GitHub's private [Report a vulnerability](https://github.com/XenoVoyage/Neon-Voyage/security/advisories/new) form when it is available. If it is unavailable, open a public issue titled **Private security contact requested** without technical details so the owner can provide a private channel. Ordinary, non-sensitive bugs can use the public issue tracker.

Include the affected version, reproduction steps, expected impact, and any suggested mitigation. Do not include real credentials, personal data, or destructive proof-of-concept material.

## Project boundary

Neon Voyage is a static browser game with no server, account, payment, analytics, or telemetry system. Security reports are most relevant when they involve:

- script execution or Content Security Policy bypass;
- unexpected network communication or external resource loading;
- unsafe handling of local saved data;
- GitHub Actions, Pages deployment, or release-integrity weaknesses.

Editing a local save, changing client-side scores, browser-extension behavior, and vulnerabilities in an unsupported browser are not security boundaries for this project.
