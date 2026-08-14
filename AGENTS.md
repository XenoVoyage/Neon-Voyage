# Neon Voyage contributor instructions

Read this file at the start of every task, in full, before inspecting or changing the project. Re-read it after changing branches or updating this file. These rules are the canonical handoff for human and AI contributors without access to earlier conversations.

## 1. Priorities

Apply these priorities in order:

1. Preserve user intent, saved progress, accessibility, and working behavior.
2. Choose the smallest complete solution with a clear owner.
3. Keep the runtime deterministic, bounded, local, and secure.
4. Remove proven clutter and duplication.
5. Verify honestly before publishing.

Inspect `git status`, the connected code path, its tests, and the relevant documentation before editing. Preserve unrelated work. Never infer current behavior from filenames, screenshots, or old release notes alone.

## 2. Non-negotiable boundaries

- Neon Voyage must work by opening `index.html` directly and from its GitHub Pages repository subpath.
- Runtime code is plain HTML, CSS, Canvas, and deferred classic JavaScript.
- Runtime dependencies, package managers, build steps, modules, accounts, analytics, telemetry, dynamic code, and network requests are forbidden.
- Keep the restrictive Content Security Policy and repository-local relative resources.
- Use a fixed time step with bounded catch-up. Every collection and repeating effect needs a real enforced cap and deterministic cleanup.
- Preserve keyboard, mouse, touch, and gamepad access; dialog focus, live status, reduced effects, and pause behavior are product requirements.

## 3. Code quality

- Prefer simple, direct code over frameworks, managers, service layers, event buses, loaders, or speculative extension points.
- Give each function and file one understandable responsibility. Split a file only when the new boundary has a small explicit interface and improves ownership; size alone is not a reason.
- Use descriptive nouns for state and verb phrases for actions. Avoid vague names such as `data`, `manager`, `helper`, or unexplained abbreviations when a domain name is clearer.
- Keep one source of truth. Do not duplicate balance values, design rules, version labels, or release evidence across files.
- Comments explain intent, units, invariants, or browser quirks. Do not narrate obvious syntax, preserve stale explanations, or compensate for unclear names with comments.
- Follow the existing plain-object state and classic-script namespace unless a task proves that boundary insufficient.
- Keep fixed-step and render paths allocation-conscious. Reuse state, expire transient objects, and never add unbounded generation or collections.
- Remove code, fields, selectors, assets, tests, and documentation only after proving they are unused. Do not retain compatibility wrappers or placeholders for hypothetical future work.
- Preserve the legacy progress validator and storage keys unless a tested migration is included; they protect existing player saves.

## 4. Ownership map

| Area | Source of truth |
| --- | --- |
| Balance, stages, waves, difficulty, caps | `js/config.js` |
| Deterministic math, collision, storage, collection utilities | `js/core.js` |
| Simulation, progression, input, orchestration | `js/game.js` |
| Canvas scenes and presentation | `js/render.js` |
| Capped synthesized audio | `js/audio.js` |
| Layout and responsive presentation | `styles.css` |
| Intended player experience | `docs/GAME_DESIGN.md` |

Put new logic in the file that already owns its responsibility. Generalize only after current behavior demonstrates reuse.

## 5. Gameplay invariants

- The nine-stage journey is finite and config-driven. Do not hardcode stage-specific behavior that the stage and wave data can express.
- A stage clears only after its authored spawns, pending/requeued threats, required objectives, descendants, optional hazards, carrier children, and boss escorts are gone.
- Hyperspace is finite, locks gameplay input, cleans old combat state, and preserves the ship's screen anchor and travel direction.
- Asteroids are ballistic hazards. Asteroid pairs bounce without damaging one another; genuine asteroid-to-alien impacts remain reward-free.
- Split trees and hard-cull requeues preserve objective ownership and finite state. They must never duplicate, drop, or silently resolve a threat.
- Campaign checkpoints store bounded weapon loadouts for earned stages, not live battlefield state. Continue starts a fresh Sector 1 field; New Game confirms before replacing campaign progress.
- Touch sticks are independent, radial, dynamic, and pointer-ID owned. Every terminal, capture-loss, visibility, pause, orientation, or page-lifecycle path must return input to neutral without timing out a deliberate stationary hold.
- Automatic spawns account for full radii, field containment, nearby threats, and safe contact time. Unsafe spawns remain pending instead of being forced or discarded.

See `docs/GAME_DESIGN.md` for product intent and `tests/README.md` for the stable verification map. Exact tuning belongs only in `js/config.js`.

## 6. Verification and cleanup

- Add a deterministic regression for every bug fix. Fixed seed plus fixed input must reproduce equivalent state.
- Run focused tests while iterating, then run the complete `node tests/run.js` suite on the frozen candidate.
- Release coverage must include the rendered browser smoke, a weapon-driven Stage 1–9 boss journey, the long deterministic stress run, entity caps, storage failure, responsive layouts, and input cleanup.
- Before deleting or moving repository content, inventory tracked files and search all code, test, HTML, CSS, and Markdown references.
- Verify every runtime script and test suite is registered once, every local link resolves, every asset is referenced, and the checksum manifest covers the complete release tree.
- Review `git diff --check`, JavaScript syntax, the full diff, and any generated evidence before publication.
- Automated browser and viewport checks are not physical-device acceptance. Record only what was actually observed.
- A public release requires an actual playable browser smoke. Use an allowed candidate preview when available; otherwise play the deployed Pages build immediately after merge.

Never weaken or remove a test to hide a defect.

## 7. Documentation ownership

| File | Purpose |
| --- | --- |
| `README.md` | Short public introduction, visuals, controls, and local-play instructions |
| `docs/GAME_DESIGN.md` | Current vision, loop, mechanics, journey, and presentation direction |
| `docs/ASSETS.md` | Asset inventory, provenance, visual rules, and optimization limits |
| `AGENTS.md` | Enduring technical and workflow rules |
| `SECURITY.md` | Supported scope and responsible reporting |
| `CHANGELOG.md` | User-visible release history |
| `AUDIT.md` | Observed evidence for the current source release |
| `tests/README.md` | Stable test-suite map and evidence boundaries |

Update this file only when an enduring invariant, architecture boundary, verification gate, or release workflow changes. Do not use it as a changelog or task log.

## 8. Git and releases

Treat `main` as protected. Never push directly to it, force-push it, delete it, or bypass branch protection. Use a short-lived branch and merge through a pull request only after the required `Offline audit / audit` check passes. If approval protection is enabled, wait for a genuine independent approval; never self-approve or fabricate review.

Release labels use the actual publication date:

- First release that day: `vYYYY.M.D`, without leading zeroes.
- Later releases that day: append `a`, `b`, `c`, and so on.
- Inspect history before choosing a label; never reuse or skip a label.

For every coherent public release:

1. Synchronize the version in runtime configuration, visible UI, `VERSION.txt`, README, changelog, audit, and permanent assertions.
2. Add a concise user-facing changelog entry.
3. Review all documentation owners and update only those affected.
4. Freeze the candidate, run the complete verification gate, and record observed evidence in `AUDIT.md`.
5. Regenerate and verify `SHA256SUMS` after every release file is final.
6. Publish one coherent pull request from a short-lived branch.
7. Wait for required checks and any real approval, then normally squash-merge without bypass.
8. Verify post-merge CI, Pages deployment, the live version, and one final Play action.

Do not claim a test, check, deployment, or live verification before observing it. If access blocks publication, leave the branch and pull request in a tested, recoverable state and report the exact blocker.
