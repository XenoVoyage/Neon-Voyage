# Neon Voyage v2026.8.21e — source audit

- Audited: 2026-08-21
- Scope: current-renderer README captures and canonical visual-documentation accuracy
- Targets: direct `file://` launch and GitHub Pages repository-subpath hosting
- Result: **PASS — 195/195 dependency-free tests and the 94-entry checksum manifest verified**
- Player-facing behavior change: **no; runtime label remains `v2026.8.21e`**

Observed locally with Node v24.19.0 on Linux 6.18.35 x86_64. Node is used only by the dependency-free verification and documentation-capture harnesses and is not part of the browser game.

## Baseline

- Clean `main` started at `6feb2eae88e0c437e3a5bb8abcbcbf78817cdd34`, matching `origin/main`.
- GitHub had no open issue or pull request and only the `main` branch.
- Post-merge Offline audit run `32516611426` and Pages run `32516611491` passed on the baseline commit.
- The deployed baseline returned HTTP 200 and reported `v2026.8.21e`; a real New Game, primary-fire action, Void Pulse action, and Settings inspection completed without a page-origin console error or warning.

## Substantiated problems

- Both README gameplay images were the exact 1200×675 files documented as predating the complete realistic gameplay-art and expanded-field passes. Visual inspection confirmed cyan procedural polygon asteroids in the Earth capture and the obsolete outlined Harrower silhouette in the command capture.
- `docs/GAME_DESIGN.md` still claimed a six-living-child Brood Carrier lineage cap even though `js/config.js`, architecture documentation, tests, and the deployed `v2026.8.21e` behavior use four.
- The README alternative text described only generic asteroid and Harrower encounters and did not identify the current raster threats, Rapid device, or boss nodes now shown.

## Candidate result

### Current public gameplay evidence

- `docs/assets/neon-voyage-earth-orbit.webp` is a fresh 1200×675 Stage 1 capture from deterministic seed 2101. It shows the realistic rock, crystal, and volatile bodies, the dedicated turbine-shaped Rapid pickup without the rejected three-line glyph, local plasma fire, the Interceptor, Earth, and readable run status.
- `docs/assets/neon-voyage-command-arena.webp` is a fresh 1200×675 Stage 5 capture from deterministic seed 5105. It shows the realistic Harrower and live nodes, a damaged Striker escort, exchanged raster projectiles, the command-world scene, and readable boss status.
- Both scenes came from the actual `ND.game` state and `ND.Renderer`. An untracked local QA harness attached the repository test-browser contract to a real Canvas, decoded repository-local WebPs, and composed HUD values from the same game state and current interface labels. Sharp encoded the unchanged composed frames to WebP. No generated or unrelated scene was substituted.
- README alternative text now describes the depicted action. `docs/ASSETS.md` records the seeds, dimensions, environment, method, dependency boundary, and exact capture contract.

### Canonical accuracy and regression

- The Brood Carrier design sentence now matches the configured four-child lifetime/lineage ceiling and its hard-cull behavior.
- Offline coverage parses VP8, VP8L, and VP8X dimensions without an image dependency and freezes both documentation captures at 1200×675, in addition to the existing WebP signature, unique-reference, and 256 KiB checks.
- A dedicated canonical-documentation regression rejects obsolete capture wording and any return to a six-child Brood claim.

## Compatibility and boundaries

| Area | Candidate result |
| --- | --- |
| Runtime behavior | HTML, CSS, JavaScript, balance, rendering, audio, input, persistence, and runtime assets are byte-for-byte unchanged |
| Versioning | Documentation-only maintenance keeps `v2026.8.21e`; no changelog heading, tag, or GitHub Release is added |
| Offline/security | Restrictive CSP, relative local resources, direct-file startup, Pages subpath hosting, and zero runtime network requests are unchanged |
| Determinism and caps | Fixed-step simulation, seeded state, entity caps, objective accounting, and the complete seven-stage campaign are unchanged |
| Saved progress | Preference key, progress key, strict schema 4, and schema-3/schema-2/schema-1 migrations are unchanged |
| Input/accessibility | Keyboard, mouse, touch, gamepad, focus, orientation, reduced effects, feedback options, and meaningful image alternatives remain covered |
| Repository surface | Exactly two local README WebPs remain; both are 1200×675 and below the 256 KiB per-image limit |

## Engineering-standard disposition

Standard status remains `adopting` because the active GitHub ruleset reports `required_review_thread_resolution: false`, and the connected GitHub operations available for this task do not expose ruleset mutation. The ruleset still requires pull requests and the strict up-to-date `audit` check, blocks deletion and non-fast-forward updates, and requires zero independent approvals. No approval will be fabricated.

## Frozen verification

The focused offline documentation suite passed `16/17` before manifest regeneration, with only the intentionally stale checksum failing. A complete pre-freeze pass then passed all non-checksum tests and the long deterministic stress run, with only an incorrectly prefixed first manifest generation rejected. After correcting its paths, the complete candidate passed `195/195`. The evidence-inclusive candidate then passed `195/195` again with the exact 94-entry manifest.

| Check | Observed result |
| --- | --- |
| Focused offline documentation suite | PASS — every reference, WebP signature, exact 1200×675 dimension, image-size cap, alternative-text, current-capture, and four-child canonical assertion passed; the expected stale-manifest check was resolved before freeze |
| Current-renderer visual inspection | PASS — both full-size WebPs were inspected; all named ships, asteroids, projectiles, pickup, boss nodes, effects, worlds, and HUD values are legible, use current raster art, and contain no obsolete decorative line overlays |
| `node tests/run.js` | PASS — `195/195`; includes syntax, offline/security, exact asset references, saved-data migrations, responsive input/accessibility, deterministic Stage 1–7 weapon journey, Titan/Harrower/Leviathan coverage, entity caps, and long stress |
| `sha256sum --check SHA256SUMS` | PASS — all 94 release entries verified |
| `git diff --check` | PASS — no whitespace error |
| Candidate browser preview | Unavailable; repository workflow publishes Pages only from merged `main` |

No physical phone/iPad session, subjective audio listening, uninterrupted human-controlled seven-stage completion, candidate browser preview, immutable tag, or GitHub Release is claimed. A public merge still requires the required pull-request audit, post-merge audit, Pages deployment, live README and image inspection, exact live-version check, one real Play interaction, Settings verification, and page-origin console review.
