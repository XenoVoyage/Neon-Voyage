# Neon Voyage contributor instructions

Read this file before changing the project. Read the related runtime, tests, and documentation before editing a connected system; do not infer behavior from filenames or old release notes.

## Project facts

- Neon Voyage is a local-first 2D Canvas arcade shooter built from plain HTML, CSS, and classic JavaScript.
- The browser runtime must work by opening `index.html` directly and from the GitHub Pages repository subpath.
- Runtime dependencies, package managers, build steps, accounts, telemetry, analytics, and network requests are forbidden.
- `js/config.js` is the balance and stage source of truth. Stage order, finite wave definitions, spawn mixes, goals, transition timing, difficulty, and caps must stay data-driven.
- `js/core.js` owns deterministic math, collision, storage, and collection helpers. `js/game.js` owns simulation and orchestration. `js/render.js` owns Canvas presentation. `js/audio.js` owns capped synthesized audio.
- Simulation uses a fixed time step with bounded frame catch-up. Every entity/effect family has a hard cap and deterministic cleanup.
- GitHub Pages already deploys through Actions from the public `main` branch.

## Engineering behavior

- Prefer the smallest complete solution. Keep code simple, direct, modular, and readable.
- Do not add speculative frameworks, managers, service layers, event buses, loaders, build tooling, abstractions, or unused extension points.
- Read the connected code path before implementation. Follow existing naming, plain-object state, classic-script namespace, and config-driven patterns.
- Preserve user changes and unrelated work. Never discard or rewrite them to simplify a task.
- Put logic in the file that already owns the responsibility. Generalize only when current behavior has proven reuse.
- Keep hot fixed-step and render paths allocation-conscious. Reuse state, enforce caps, expire transient objects, and clean inactive world state.
- Preserve restrictive CSP, relative local resource paths, safe optional storage, and zero runtime network surface.
- Keep input, dialogs, live status, progress indicators, focus behavior, and reduced-effects support accessible across keyboard, pointer, touch, and gamepad paths.

## Gameplay and verification

- A non-boss stage is a finite sequence of configured waves followed by a controlled hyperspace transition. The boss stage uses its direct configured defeat goal. Do not reintroduce endless replenishment disguised as progression.
- Do not hardcode stage-specific branches when the stage/wave configuration can express the rule clearly.
- Stage clear requires the configured finite wave to be fully spawned and all required living objectives to be resolved. Optional hazards must not corrupt objective counts.
- During hyperspace, gameplay input is locked, autopilot and cinematic state are finite, and old combat entities are cleaned before the next stage begins.
- Asteroids remain ballistic physical hazards; normal ranged attacks belong to alien spacecraft.
- Add deterministic regression coverage for every gameplay fix. Fixed seed plus fixed input must reproduce equivalent state.
- Keep the 20-minute stress audit finite and under every configured cap. Never weaken a release test merely to hide an application defect.
- Run targeted tests while iterating, then `node tests/run.js` for a coherent release candidate.
- Automated checks establish contracts and regressions. Never claim that visuals, balance, difficulty, responsiveness, or overall game feel were manually accepted unless a human reviewer actually accepted them.

## Coherent release updates

Every coherent public update must include all of the following in one clean publication:

1. Bump the semantic version in runtime metadata and `VERSION.txt`.
2. Add a professional, user-facing entry to `CHANGELOG.md`.
3. Update `README.md` and `AUDIT.md` to match implemented behavior only.
4. Add or update permanent deterministic tests and run the full suite.
5. Regenerate `SHA256SUMS` only after all release files are frozen, then verify every entry.
6. Review the complete diff and publish one clean commit to public `main`.
7. Verify CI, Pages deployment, and the live repository-subpath URL after publication.

Do not split one coherent update across partial public commits. Do not claim publication, CI, Pages, checksum, or live-site success before it is observed. If access or deployment blocks final verification, report the exact blocker and leave the repository in a tested, recoverable state.
