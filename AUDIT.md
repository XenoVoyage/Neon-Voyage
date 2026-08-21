# Neon Voyage v2026.8.21b — source audit

- Audited: 2026-08-21
- Scope: Engineering Standard v1.0 repository cleanup and publication hardening
- Targets: direct `file://` launch and GitHub Pages repository-subpath hosting
- Result: **PASS — 192/192 dependency-free tests and the 93-entry checksum manifest verified**
- Player-facing behavior change: **none; runtime version and saved-data formats remain unchanged**

Observed locally with Node v24.19.0 on Linux x86_64. Node is used only by the dependency-free verification harness and is not part of the browser game.

## Baseline

- Clean `main` started at `d9f4b7bfdd8fe3658c37851fbf4e1e714b2f115e`, matching `origin/main`.
- The pre-change complete suite passed `192/192`; the 93-entry checksum manifest verified.
- GitHub had no open issue or pull request, no tag or GitHub Release, and only the `main` branch.
- Offline audit #57 and Pages #31 passed on the baseline commit.
- The deployed baseline reported `v2026.8.21b`; desktop Play, aim/fire, Void Pulse, Settings at 80%, and the absence of page-origin console errors were observed immediately before this cleanup.

## Engineering-standard disposition

The root agent contract now declares Engineering Standard v1.0 and owns priorities, exact commands, boundaries, ownership, cleanup, Git workflow, and the definition of done. Standard status remains `adopting` because the active GitHub ruleset reports `required_review_thread_resolution: false`, and the connected GitHub operations available for this task do not expose ruleset mutation. The audit does not claim `verified` while that repository-setting requirement remains unmet.

The same ruleset is active and already blocks branch deletion and non-fast-forward updates, requires pull requests, and requires the strict up-to-date `audit` check. Its independent-approval count is zero; no independent reviewer was configured or available for this owner repository, so no approval was fabricated. Automatic deletion of merged task branches was observed after PR #24.

## Inventory and cleanup

| Area | Observed result |
| --- | --- |
| Tracked release set | 93 files: local source/docs/workflows, 57 WebPs, no symlink or generated build tree |
| Runtime | One HTML file, one stylesheet, five deferred classic scripts, Canvas, and optional Web Audio |
| Packages | No runtime or development package manifest, lockfile, package manager, installation, or build step |
| Network/privacy | Runtime CSP and source reject remote requests, telemetry, analytics, workers, dynamic code, and remote assets |
| Saved data | Existing preference and schema-4 progress keys, bounds, and schema-3/schema-2/schema-1 migrations are untouched |
| Assets | All 55 runtime and two documentation WebPs are referenced, bounded, structurally valid, dimension-checked, and visually sampled together |
| Asset provenance | Original-project/OpenAI generation provenance, transformation, intended role, and usage boundary remain recorded in `docs/ASSETS.md`; no third-party runtime asset or license was introduced |
| Source cleanup | Reference and single-occurrence scans found no proven-dead runtime function, selector, asset, script, test suite, or compatibility path safe to remove |
| Documentation | `docs/STATUS.md` now contains current state only; `AUDIT.md` contains current evidence only; historical product changes remain in `CHANGELOG.md` and Git history |
| Public README | Player-first content and two real local captures remain; unnecessary third-party Shields.io version/license badges were replaced with local text links |
| Collaboration | The PR template now records deletions/consolidation and requires an honest standard-status disposition |

The audit and status consolidation deliberately removes duplicated historical and implementation narration from active handoff files. No unique product history was deleted: user-facing history remains in `CHANGELOG.md`, source history remains immutable in Git, product intent remains in `docs/GAME_DESIGN.md`, and technical ownership remains in `docs/ARCHITECTURE.md`.

## Automation dependency review

The repository still installs no dependency. Workflow-only tools were resolved from their official GitHub-maintained major refs on 2026-08-21 and replaced with immutable commit pins. The official repositories were active, not archived, and MIT-licensed.

| Workflow tool | Reviewed major | Immutable commit |
| --- | --- | --- |
| `actions/checkout` | `v7` | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `actions/setup-node` | `v7` | `820762786026740c76f36085b0efc47a31fe5020` |
| `actions/configure-pages` | `v6` | `45bfe0192ca1faeb007ade9deae92b16b8254a0d` |
| `actions/upload-pages-artifact` | `v5` | `fc324d3547104276b827a68afc52ff2a11cc49c9` |
| `actions/deploy-pages` | `v5` | `cd2ce8fcbc39b97be8ca5fce6e763baed58fa128` |

The pinned upload-pages composite action in turn pins `actions/upload-artifact` to `bbbca2ddaa5d8feaa63e36b76fdaad77386f024f`. Direct action manifests, official license files, lock metadata where present, and bundled license notices were inspected. Declared/bundled licenses were permissive or weak-copyleft (`0BSD`, Apache-2.0, BSD, BlueOak-1.0.0, CC0/CC-BY, ISC, MIT/MIT-X11, MPL-2.0, and Python-2.0); no GPL, AGPL, or SSPL notice was found. No action or transitive package becomes part of the shipped browser runtime.

Both workflows pin Node.js `22.22.0`, the current Node 22 security release listed by the [official distribution index](https://nodejs.org/dist/index.json) at audit time. Checkout credentials remain disabled, the audit workflow retains read-only contents permission, Pages retains only its required contents/pages/id-token permissions, and neither workflow installs repository dependencies.

## Frozen verification

| Check | Observed result |
| --- | --- |
| `node tests/run.js` | PASS — `192/192`; includes syntax, offline/security, storage migrations, browser VM/rendering, responsive input/accessibility, Stage 1–7 weapon journey, bosses, visuals, audio bounds, and deterministic stress |
| `sha256sum --check SHA256SUMS` | PASS — all 93 release entries verified |
| `git diff --check` | PASS — no whitespace error |
| Runtime-byte comparison with baseline | PASS — `index.html`, `styles.css`, `js/`, `assets/`, and `docs/assets/` are unchanged |

The evidence above was rerun after documentation, tests, workflow pins, standard status, and the checksum manifest were frozen together.

Non-applicable or separately bounded checks:

- No gameplay, storage, interface, asset, or balance behavior changed, so no runtime-version bump, saved-data migration, or gameplay regression was added.
- The repository contains no scientific, medical, statistical, or standards-based product claim requiring an external evidence ledger.
- There is no configured package audit, build, linter, formatter, or type checker; syntax, repository hygiene, deterministic behavior, browser simulation, and long stress are covered by the existing dependency-free suite.
- Runtime and asset bytes are unchanged, so no candidate visual delta exists. Automated representative desktop/phone/tablet rendering remains part of the complete suite.
- No new physical phone/iPad session, subjective audio listening, or uninterrupted human-controlled seven-stage run is claimed.
- A candidate Pages preview is unavailable by design; post-merge acceptance must verify the exact live URL, Settings, one Play interaction, and page-origin console state.

This source audit does not itself prove a pull-request check, merge, post-merge audit, Pages deployment, immutable tag, GitHub Release, or branch cleanup. Those remain external publication evidence.
