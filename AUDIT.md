# Neon Voyage v2026.8.21f — source audit

- Audited: 2026-08-21
- Scope: complete twenty-stage campaign, final Sovereign encounter, pacing/progression expansion, saved-progress compatibility, and current visual evidence
- Targets: direct `file://` launch and GitHub Pages repository-subpath hosting
- Result: **PASS — 198/198 dependency-free tests and the 96-entry checksum manifest verified**
- Player-facing behavior change: **yes; runtime advances from `v2026.8.21e` to `v2026.8.21f`**

Observed locally with Node v24.19.0 on Linux 6.18.35 x86_64. Node is used only by the dependency-free verification and documentation-capture harnesses and is not part of the browser game.

## Baseline

- Clean `main` started at `2ca2348438bc3e4406ee47ce3a68842e717a552a`, matching GitHub `main`; the repository had no open issue or pull request and only `main` remained.
- Required Offline audit and Pages checks passed for that baseline, and the deployed Pages site returned the expected `v2026.8.21e` runtime before work began.
- The accepted baseline already kept the dedicated Overdrive raster free of the obsolete three-line glyph, suppressed the destroyed player ship throughout game over, exposed default-off shake/flash controls, and used the 80% master level with bounded 1.7× voice lift. The older screenshots supplied with this task therefore substantiate earlier presentation reports, not regressions still present in the starting source.

## Substantiated work

- The authorized product direction required a full twenty-level voyage ending in a giant UFO-like command ship. The starting campaign contained seven stages and two command ships.
- A complete gameplay-asset contact sheet showed that the existing Razor asteroid's elongated symmetric silhouette could read as an alien spacecraft at gameplay size. Its identity problem was reproduced visually even though its collision and finite objective behavior were correct.
- Automated campaign instrumentation established the need to preserve compact openings and finite pressure while distributing asteroid, alien, hazard, reward, and command-ship vocabulary over the longer journey. No claim is made that automation alone establishes subjective difficulty or fun.

## Candidate result

### Campaign and pacing

- The campaign now contains 20 authored stages: first contact at Stage 3, an eight-root pressure-bounded Titan Gate at Stage 5, Harrower at Stage 10, Leviathan at Stage 15, and Sovereign at Stage 20. Seventeen ordinary stages contain seven to thirteen authored roots and never create unbounded replacement threats.
- Five reward bands now span Stages 1, 2–5, 6–10, 11–15, and 16–20. Ten deterministic milestone modules establish a readable build arc without bypassing Mk I–V ceilings, shared entity caps, or the existing Enigma rules.
- A weapon-driven deterministic maximum-build journey cleared all 20 stages and three bosses in 233.01 simulated seconds. Individual stages ranged from 8.40 to 16.00 seconds in that automation, with no stalled objective or runaway outlier. This is pacing evidence from a controlled high-power test seam, not a human completion or final balance verdict.

### Threats and final encounter

- The Sovereign is a giant original realistic raster command ship with five distinct nodes, node-dependent reflection, three health phases, seeded 14- and 18-shot radial barrages, mine arcs, a sweeping beam, escorts, progressive smoke/internal-fire damage, boss HUD integration, and raster off-screen indicators.
- Radial barrages use the existing hostile-projectile collection, create evenly spaced seeded rings, and respect its hard cap. Boss victory still waits for live nodes, escorts, pending/requeued threats, and all other encounter ownership.
- The Razor sprite is now a cratered jagged nickel/stone asteroid with restrained mineral seams, transparent edges, and no engine, cockpit, ship symmetry, halo, line decoration, or background box. Existing finite fracture, collision, and objective behavior is unchanged.

### Progress, accessibility, and platform boundaries

- The progress key remains unchanged. Strict schema 5 stores up to twenty current checkpoints. Valid schema-4 seven-stage records expand through fixed narrative endpoints; valid schema-3 twenty-stage records migrate one-to-one with a safe zero Thruster timer; schema-2 and schema-1 compatibility remains exact at historical bounds.
- Keyboard, mouse, gamepad, and touch paths retain one fixed-step simulation. Command-node auto-aim priority now covers all three bosses; feedback options remain persistent and default off; the master-volume control remains accessible and defaults to 80%.
- Restrictive CSP, relative repository-local resources, direct-file boot, Pages subpath hosting, dependency-free HTML/CSS/Canvas/Web Audio, deterministic random ownership, fixed-step catch-up, and every collection cap remain intact.

### Visual evidence

- `docs/assets/neon-voyage-earth-orbit.webp` is a refreshed 1200×675 Stage 1 capture from deterministic seed 2101. It shows the current realistic asteroid families, turbine-shaped Rapid pickup without speed lines, local projectile art, Earth, and readable HUD state.
- `docs/assets/neon-voyage-sovereign-arena.webp` is a 1200×675 Stage 20 capture from deterministic seed 20105. It shows the giant Sovereign, all five nodes, the Interceptor firing, the command-world scene, and readable boss status.
- A 20-stage 2560×1800 contact sheet from the actual renderer was inspected across the complete campaign. A separate 58-asset gameplay sheet was inspected at comparable scale, and the replacement Razor was additionally checked against a contrasting dark-blue field for alpha contamination and spacecraft ambiguity. The reviewed frames retained realistic raster silhouettes without generic procedural aim lines, duplicate outlines, hard halos, or dashed shield rings.
- The untracked local QA harness attached the repository's browser-test contract to a real Canvas implementation, decoded repository-local WebPs, and used actual `ND.game` and `ND.Renderer` state. Runtime-provided `@napi-rs/canvas` and Sharp were used only to encode visual evidence; neither is a project dependency or runtime resource.

## Compatibility and boundaries

| Area | Candidate result |
| --- | --- |
| Offline/security | Restrictive CSP, local relative resources, direct-file startup, Pages subpath hosting, and zero runtime network requests are preserved |
| Determinism and caps | Fixed-step simulation, seeded decisions, finite wave reserves/split trees, radial-barrage cap, and all collection ceilings remain enforced |
| Saved progress | Unchanged keys; strict schema 5 plus tested schema-4/schema-3/schema-2/schema-1 migrations |
| Input/accessibility | Keyboard, mouse, touch, gamepad, focus, orientation, reduced density, default-off shake/flash, and accessible volume remain covered |
| Visual direction | 58 local runtime WebPs; realistic raster silhouettes remain authoritative and code drawing is limited to functional state cues |
| Repository surface | Exactly two local 1200×675 README WebPs remain below the 256 KiB per-image limit |

## Engineering-standard disposition

Standard status remains `adopting` because the active GitHub ruleset reports `required_review_thread_resolution: false`, and the connected GitHub operations available for this task do not expose ruleset mutation. The ruleset still requires pull requests and the strict up-to-date `audit` check, blocks deletion and non-fast-forward updates, and requires zero independent approvals. No approval will be fabricated.

## Frozen verification

Focused configuration, gameplay, progress, input, visual, and stress suites passed during development. The first complete pre-freeze run passed `197/198`, with only the intentionally stale checksum rejected. After the final file set produced the exact 96-entry manifest, the complete candidate passed `198/198`.

| Check | Observed result |
| --- | --- |
| Focused deterministic regressions | PASS — campaign structure, every compact opening, Titan pressure, all reward gates, all three command fields, Sovereign radial cap, schema migrations, 20-stage journey, and 20-minute stress coverage |
| Current-renderer visual inspection | PASS — both 1200×675 captures, all twenty stage frames, all 58 runtime assets, and the replacement Razor were inspected; named objects were readable and no rejected generic raster overlay returned |
| `node tests/run.js` | PASS — `198/198`; includes syntax, offline/security, exact raster references, schema-5 and all legacy migrations, responsive input/accessibility, every compact opening, the weapon-driven Stage 1–20 journey, all three command ships, entity caps, and long stress |
| `sha256sum --check SHA256SUMS` | PASS — all 96 release entries verified |
| `git diff --check` | PASS — no whitespace error |
| Candidate browser preview | Unavailable locally because the controlled cloud browser rejected the loopback origin; the public post-merge Pages smoke remains mandatory |

No physical phone/iPad session, subjective audio listening, uninterrupted human-controlled twenty-stage completion, candidate public browser preview, immutable tag, or GitHub Release is claimed. Publication still requires the required pull-request audit, exact-head review, squash merge, post-merge audit and Pages deployment, live README/image inspection, exact live-version check, one real Play interaction, Settings verification, and page-origin console review.
