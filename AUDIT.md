# Neon Voyage v2026.8.21e — source audit

- Audited: 2026-08-21
- Scope: ordinary-alien durability, density, readability, and progressive damage presentation
- Targets: direct `file://` launch and GitHub Pages repository-subpath hosting
- Result: **PASS — 194/194 dependency-free tests and the 94-entry checksum manifest verified**
- Player-facing behavior change: **yes; runtime label advances from `v2026.8.21d`**

Observed locally with Node v24.19.0 on Linux 6.18.35 x86_64. Node is used only by the dependency-free verification harness and is not part of the browser game.

## Baseline

- Clean `main` started at `22425154a5073b75eb1e8eb880bf65d678a1dc11`, matching `origin/main`.
- GitHub had no open issue or pull request and only the `main` branch.
- Post-merge Offline audit run `32513844128` and Pages run `32513844025` passed on the baseline commit.
- The deployed baseline returned HTTP 200 and reported `v2026.8.21d`.

## Substantiated problems

- At Sector 1 Stage 3, the original three-health Scout scaled to 3.30 health and required only four Mk I Pulse hits, about 0.54 seconds between first and lethal shot before the already-earned Homing Salvo was counted. This did not leave enough time for first contact to communicate its attack or damage state.
- Authored root formations were already small: Stage 3 opens with one Scout and later alien waves use three or four roots. Reducing root counts would create empty pacing rather than solve excess density.
- Carrier ceilings could add four Scouts or six Lancers to those small root formations. With stronger children, keeping those ceilings would create the crowding the durability pass is intended to avoid.
- All seven existing alien WebPs were inspected together and at their actual renderer sizes. They already form a distinct violet/green biomechanical family, so replacement art was not substantiated; the smallest dark silhouettes needed stronger play-scale presentation instead.

## Candidate behavior

### Fewer, tougher contacts

- Base health is now 7/12/17/30/15/27/60 for Scout, Striker, Bomber, Carrier, Lancer, Gunship, and Brood Carrier. The first Scout therefore requires at least eight unamplified Mk I Pulse hits at Stage 3.
- Stage roots and their seeded order are unchanged. Ordinary Carrier living children are capped at three and Brood Carrier Lancers at four, including hard-cull requeues and lineage restoration.
- Contact damage, speeds, cooldowns, attack state machines, rewards, objective ownership, boss definitions, and the global 30-alien cap are unchanged.

### Raster-led readability and damage

- Ordinary alien draw sizes increase by 8–12 pixels in width while collision radii remain unchanged; the Scout is now presented at the same 76×51 px footprint as the player interceptor but retains its unrelated biomechanical silhouette.
- A localized low-opacity violet/green signature reinforces the existing emissive core. It is a filled radial material glow, not a hard halo, outline, shield ring, or aim line.
- Health ratios below 60%, 35%, and 18% select three deterministic damage stages. Smoke, filled flame, and a soft internal burn glow stay attached to an ID-derived hull location and use render time only; they write no simulation state and consume no randomness.
- Reduced effects keep fewer smoke puffs and static/lower emission. Pending or failed alien images still use the established procedural fallback without receiving raster-only overlays.

## Compatibility and boundaries

| Area | Candidate result |
| --- | --- |
| Runtime surface | Dependency-free HTML/CSS/classic JavaScript/Canvas/Web Audio architecture preserved; no file or asset added |
| Offline/security | Restrictive CSP, relative local resources, and zero runtime network requests preserved |
| Determinism | Health and child ceilings remain frozen config; damage presentation derives only from health, ID, reduced-effects state, and render time |
| Caps/objectives | Authored root totals, objective accounting, lineage requeues, and global entity caps preserved; child ceilings lowered |
| Saved progress | Preference key, progress key, strict schema 4, and schema-3/schema-2/schema-1 migrations unchanged |
| Input/accessibility | Keyboard, mouse, touch, gamepad, focus, orientation, off-screen cues, and reduced effects retained |
| Visual direction | Existing realistic alien rasters remain authoritative; no generic procedural line, outline, hard halo, or duplicated silhouette added |
| Audio | Mix, limiter, cues, 80% default, slider, mute, cooldown, and 24-node cap unchanged |

## Engineering-standard disposition

Standard status remains `adopting` because the active GitHub ruleset reports `required_review_thread_resolution: false`, and the connected GitHub operations available for this task do not expose ruleset mutation. The ruleset still requires pull requests and the strict up-to-date `audit` check, blocks deletion and non-fast-forward updates, and requires zero independent approvals. No approval will be fabricated.

## Frozen verification

The first complete candidate pass verified all `194/194` tests with the 94-entry manifest. After this evidence record was finalized, the manifest and entire gate were rerun on the exact frozen candidate.

| Check | Observed result |
| --- | --- |
| Focused config and renderer suites | PASS — `35/35`; includes exact durability/child ceilings, at-least-eight-hit first contact, play-scale raster sizes, all three damage thresholds, filled emission, and zero line overlay |
| Focused deterministic gameplay suite | PASS — `72/72`; includes carrier lineage/requeue ceilings, all alien attack roles, Stage 1–7 journey, both bosses, caps, and objectives |
| Actual-size raster inspection | PASS — all seven alien WebPs inspected together and on a dark 880×270 play-scale sheet; distinct biomechanical silhouettes and clean alpha retained |
| `node tests/run.js` | PASS — `194/194`; includes syntax, offline/security, version and asset integrity, exact alien durability/child ceilings, all alien roles and damage states, saved-data migrations, responsive input/accessibility, Stage 1–7 weapon journey, both bosses, and long deterministic stress |
| `sha256sum --check SHA256SUMS` | PASS — all 94 release entries verified |
| `git diff --check` | PASS — no whitespace error |
| Candidate browser preview | Unavailable; repository workflow publishes Pages only from merged `main` |

No physical phone/iPad session, subjective audio listening, uninterrupted human-controlled seven-stage completion, immutable tag, or GitHub Release is claimed. A public merge still requires the required pull-request audit, post-merge audit, Pages deployment, exact live-version check, one real Play interaction, alien-stage visual inspection, Settings verification, and page-origin console review.
