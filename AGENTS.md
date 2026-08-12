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
- Detect touch capability from device signals and observed touch input, not only the primary pointer; hybrid tablets with a trackpad must retain their touch controls.
- Treat document visibility as the touch lifecycle boundary: browser-chrome focus changes must not pause a touch run, while a hidden document must pause and clear transient input. Preserve desktop blur-to-pause behavior.

## Gameplay and verification

- A non-boss stage is a finite sequence of configured waves followed by a controlled hyperspace transition. The boss stage uses its direct configured defeat goal. Do not reintroduce endless replenishment disguised as progression.
- Do not hardcode stage-specific branches when the stage/wave configuration can express the rule clearly.
- Keep the authored journey legible: the first five stages progress from Earth orbit through increasingly unfamiliar asteroid space and the Titan Gate; ordinary alien spacecraft do not appear before Stage 6, and the alien command arena remains Stage 9.
- Stage clear requires the configured finite wave to be fully spawned and all required living objectives to be resolved. Required asteroid descendants dynamically join that objective and must be destroyed; optional hazards must not corrupt objective counts.
- During hyperspace, gameplay input is locked, autopilot and cinematic state are finite, old combat entities are cleaned, and the ship keeps its pre-transition screen anchor and travel direction through the stage handoff. Never hide a discontinuity with a world-position teleport.
- Asteroids remain ballistic physical hazards; normal ranged attacks belong to alien spacecraft. Asteroid impacts use separation and bounce, damage only on a genuine approaching collision, and can destroy other asteroids or aliens without duplicate objective credit or farming rewards.
- Temporary weapon pickups use independent finite timers and must visibly change firing behavior while active. Rare permanent module upgrades remain bounded and persist only for the current run.
- Add deterministic regression coverage for every gameplay fix. Fixed seed plus fixed input must reproduce equivalent state.
- Mobile play is landscape-only. Portrait uses a blocking orientation gate that owns covered UI, keyboard, pointer, and gamepad input; it freezes simulation and clears input without changing the run mode. Returning to landscape resumes the same state without replaying held buttons. Screen Orientation locking is best-effort and must never be required for play.
- Track simultaneous touch sticks by independent pointer IDs, and release each capture on pointer up, pointer cancel, lost capture, visibility loss, and orientation blocking. Cover these paths, hybrid detection, focus/visibility behavior, and rejected orientation locks with browser-VM regressions.
- Keep mobile stick response radial and config-driven, preserve the chosen heading after aim release, and make touch pause release captures and stop drift until fresh input. Suppress accidental double-tap zoom through gesture ownership without adding a blanket `user-scalable=no` viewport restriction.
- Automatic combat spawns must account for full entity radii, visible-field containment, nearby threats, and a tested minimum contact time. Adapt size only to the configured safe floor; otherwise preserve the pending objective and retry when space becomes available instead of forcing or dropping a spawn. Seed-sweep opening placements across compact and desktop viewports whenever spawn logic changes.
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
