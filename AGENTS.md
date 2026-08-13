# Neon Voyage contributor instructions

Read this file at the start of every task before inspecting or changing the project, and re-read it if it changes or after switching branches. Keep it current: update it only when an enduring project invariant, architecture boundary, verification gate, or release workflow changes; do not use it as a changelog or task log. Read the related runtime, tests, and documentation before editing a connected system; do not infer behavior from filenames or old release notes.

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
- Treat `main` as protected. Never push directly to it, force-push it, delete it, or bypass branch protection. Work on a short-lived branch and merge through a pull request only after the required `Offline audit / audit` check passes. If approval protection is enabled, wait for one genuine independent approval; never self-approve or fabricate review.
- Keep input, dialogs, live status, progress indicators, focus behavior, and reduced-effects support accessible across keyboard, pointer, touch, and gamepad paths.
- Detect touch capability from device signals and observed touch input, not only the primary pointer; hybrid tablets with a trackpad must retain their touch controls.
- Treat document visibility as the touch lifecycle boundary: browser-chrome focus changes must not pause a touch run, while a hidden document must pause and clear transient input. Preserve desktop blur-to-pause behavior.

## Gameplay and verification

- A non-boss stage is a finite sequence of configured waves followed by a controlled hyperspace transition. The boss stage uses its direct configured defeat goal. Do not reintroduce endless replenishment disguised as progression.
- Do not hardcode stage-specific branches when the stage/wave configuration can express the rule clearly.
- Keep the authored journey legible: the first five stages progress from Earth orbit through increasingly unfamiliar asteroid space and the Titan Gate; ordinary alien spacecraft do not appear before Stage 6, and the alien command arena remains Stage 9.
- Stage and wave clear require the configured finite wave to be fully spawned, its pending and requeue lists to be empty, every required objective to be resolved, and no living same-generation asteroid or alien to remain. Optional hazards, descendants, carrier children, and boss escorts all belong to this clean-field gate even when they do not increase required-objective counters.
- During hyperspace, gameplay input is locked, autopilot and cinematic state are finite, old combat entities are cleaned, and the ship keeps its pre-transition screen anchor and travel direction through the stage handoff. Never hide a discontinuity with a world-position teleport.
- Asteroids remain ballistic physical hazards; normal ranged attacks belong to alien spacecraft. Asteroid pairs use mass-aware separation and bounce without damaging or destroying one another. A genuine approaching asteroid-to-alien impact remains lethal to the alien and may damage the asteroid, but it must never duplicate objective credit or grant score, combo, or pickup rewards.
- Splitting hazards must use an explicit, bounded remaining-generation value. Preserve descendant objective ownership and hard-cull restoration, and never add an unbounded recursive split path.
- Hard culling must requeue every living same-generation encounter threat, preserve its required flag and finite gameplay state, and never duplicate, drop, or silently resolve it.
- Temporary weapon pickups use independent finite timers and must visibly change firing behavior while active. Rare permanent module upgrades remain bounded and persist only for the current run.
- Campaign progress is a strict, size-limited local record separate from score/preferences. Continue exposes only earned authored-stage checkpoints, and selecting one starts a fresh Sector 1 run at that stage; it is not a live-state save. Debug and automation stage jumps must never unlock campaign progress.
- Add deterministic regression coverage for every gameplay fix. Fixed seed plus fixed input must reproduce equivalent state.
- Mobile play is landscape-only. Portrait uses a blocking orientation gate that owns covered UI, keyboard, pointer, and gamepad input; it freezes simulation and clears input without changing the run mode. Returning to landscape resumes the same state without replaying held buttons. Screen Orientation locking is best-effort and must never be required for play.
- Track simultaneous touch sticks by independent pointer IDs. A terminal event matching an owned pointer ID must release that stick even when WebKit omits or corrupts `pointerType`. Reconcile tracked capture ownership every simulation frame, and provide boundary, native-touch, page-lifecycle, visibility, and orientation cleanup fallbacks. Never use an inactivity timeout: a deliberately stationary held thumb must remain valid. Cover malformed terminals, implicit capture loss, hybrid detection, focus/visibility behavior, and rejected orientation locks with browser-VM regressions.
- Keep mobile stick response radial and config-driven, preserve the chosen heading after aim release, and make touch pause release captures and stop drift until fresh input. Suppress accidental double-tap zoom through gesture ownership without adding a blanket `user-scalable=no` viewport restriction.
- Mobile joysticks are dynamic controls: a fresh touch on the playable left or right canvas half establishes that stick's logical origin, remains owned by one pointer until a terminal event, and returns to its idle visual position after cleanup. Gameplay overlays and action buttons must remain independently operable.
- Automatic combat spawns must account for full entity radii, visible-field containment, nearby threats, and a tested minimum contact time. Adapt size only to the configured safe floor; otherwise preserve the pending objective and retry when space becomes available instead of forcing or dropping a spawn. Seed-sweep opening placements across compact and desktop viewports whenever spawn logic changes.
- Keep the 20-minute stress audit finite and under every configured cap. Never weaken a release test merely to hide an application defect.
- Before release, run a deterministic weapon-driven journey through all nine stages and defeat the Stage 9 boss under every configured entity cap. A debug stage jump is not a substitute for this end-to-end gameplay path.
- Run targeted tests while iterating, then `node tests/run.js` for a coherent release candidate.
- Automated checks establish contracts and regressions. Never claim that visuals, balance, difficulty, responsiveness, or overall game feel were manually accepted unless a human reviewer actually accepted them.
- Before every public release, exercise the frozen candidate through the rendered browser smoke in addition to the full deterministic suite. When an allowed preview URL is available, also play that candidate in an actual browser before publication. When browser security prevents local preview, perform an actual live Play smoke immediately after Pages deploy and do not declare the release complete until it passes. Cover desktop plus automated phone-class and tablet-class landscape layouts; on real touch hardware, manually check partial/full deflection, two-thumb Dash/Pulse, pause/resume, release/cancel, and stage progress whenever that hardware is available. Record only what was actually observed, and never describe a simulated touch test as manual hardware acceptance.

## Coherent release updates

Every coherent public update must include all of the following in one clean publication:

1. Bump the semantic version in runtime metadata and `VERSION.txt`.
2. Add a professional, user-facing entry to `CHANGELOG.md`.
3. Update `README.md` and `AUDIT.md` to match implemented behavior only.
4. Add or update permanent deterministic tests and run the full suite.
5. Complete and document the browser-smoke gate above; if local preview is blocked, record that boundary and require the immediate post-deploy live Play check.
6. Regenerate `SHA256SUMS` only after all release files are frozen, then verify every entry.
7. Review the complete diff and publish the coherent update as one release pull request from a short-lived branch into protected `main`.
8. Wait for the required `Offline audit / audit` status and any configured human approval, then merge without bypassing protection.
9. Verify CI, Pages deployment, and the live repository-subpath URL after merge, including one final live Play action.

Do not split one coherent update across partial public merges. A release branch may contain iterative commits, but its pull request must present one frozen, coherent candidate and should normally be squash-merged. Do not claim publication, CI, Pages, checksum, or live-site success before it is observed. If access or deployment blocks final verification, report the exact blocker and leave the repository in a tested, recoverable state.
