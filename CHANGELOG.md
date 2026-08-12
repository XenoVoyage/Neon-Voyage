# Changelog

All notable user-facing changes to Neon Voyage are documented here. Versions follow semantic versioning.

## [1.2.2] — 2026-08-13

### Fixed

- Suppressed accidental double-tap zoom and browser overscroll across the fullscreen game shell without adding a blanket viewport zoom restriction; standard pinch zoom remains available outside direct canvas gestures.
- Removed irregular touch heading changes caused by stale hybrid mouse targets. Releasing the aim stick now preserves the selected heading and keeps the aim anchor aligned as the ship moves.
- Made mobile pause reliably release both stick captures, clear held actions, and stop residual ship velocity. Old pointer events cannot regain control after resume; fresh finger input is required.
- Prevented opening threats from appearing beside the player or delivering an immediate unavoidable hit on compact phone, tablet, and desktop viewports.

### Changed

- Reworked mobile sticks around configurable radial deadzones and response curves, with a lower movement-output cap and bounded touch-aim turn rate for more deliberate control in every direction.
- Automatic combat spawns now compare multiple visible perimeter candidates and require 72 px of ship-surface clearance, 18 px of threat separation, and at least 2.2 seconds of predicted contact time. Newly placed asteroids receive matching collision grace.
- Large automatic asteroids can adapt toward a safe configured radius floor on compact viewports. A threat that still cannot fit remains in its finite wave queue and is retried as normal combat frees a safe slot, rather than being forced into an unsafe placement or silently discarded.

### Quality

- Added deterministic mobile regressions for radial symmetry, deadzones, response caps, bounded turn rate, barely-active aim ownership, low-band shot alignment, heading preservation, hybrid pointer handoff, pointer-capture release, and stationary pause/resume behavior.
- Retained the 1,024-seed, six-viewport Earth Orbit sweep and added 10,240 compact-screen openings across Stages 1–5, verifying safe radius adaptation or strict deferral, exact objective retention, visibility, clearances, minimum contact time, and a protected opening window.
- Expanded the dependency-free audit to 73 automated checks while retaining the strict offline runtime, restrictive Content Security Policy, fixed-step simulation, entity caps, and zero runtime network surface.

## [1.2.1] — 2026-08-12

### Fixed

- Prevented ordinary mobile browser focus changes from opening the pause menu when a player touches the movement controls; switching away or hiding the page still pauses safely.
- Made the two touch sticks retain independent pointer ownership and reliably return to neutral after pointer release, cancellation, lost capture, visibility loss, or an orientation change.
- Corrected joystick geometry so the center of each visible ring is truly neutral and cannot create upward drift or accidental aim-fire input.
- Kept the touch Dash and Pulse controls inside gameplay instead of allowing their gestures to leak into pause behavior.
- Prevented covered controls, dialogs, keyboard shortcuts, and gamepad buttons from bypassing the portrait orientation gate or replaying held input after rotation.

### Changed

- Added a blocking portrait-mode gate for touch devices. The simulation and transient input freeze without changing the run state, then continue seamlessly when the device returns to landscape.
- Added best-effort Screen Orientation locking where the browser permits it. Browsers such as iOS Safari that do not provide a usable lock receive the same rotate-to-landscape gate and require the player to rotate manually.
- Improved touch detection for hybrid iPads and other tablet/trackpad combinations, and tightened the narrow-landscape layout around display safe areas.

### Quality

- Added real dual-pointer browser regressions for hybrid touch detection, move/aim/fire independence, Dash and Pulse, pointer cancellation, lost capture, mobile focus changes, document visibility, portrait freezing, seamless landscape resume, and missing or rejected orientation locks.
- Expanded the dependency-free audit to 64 automated checks while retaining the strict offline runtime, restrictive Content Security Policy, fixed-step simulation, entity caps, and zero runtime network surface.

## [1.2.0] — 2026-08-12

### Fixed

- Removed the visible teleport at a stage handoff: hyperspace now carries the ship along its existing heading and preserves its screen-space anchor when the next battlefield begins.
- Made required asteroid fragments part of the live objective, including dynamically updating the total, so a wave cannot clear while any required descendant survives.
- Added physical asteroid separation and bounce with approach-only impact damage, preventing resting overlaps and newly spawned fragments from repeatedly damaging one another.
- Kept environmental asteroid and alien deaths exactly-once for objective progress, score, combo, and pickup handling.

### Changed

- Expanded each expedition from five stages to a nine-stage journey: Earth Orbit, Inner Belt, Deep Drift, Shattered Frontier, Titan Gate, First Contact, Strike Wing, Raid Fleet, and Command Arena.
- Moved the Titan ahead of first contact at Stage 5, delayed ordinary alien spacecraft until Stage 6, and moved the alien command boss to Stage 9.
- Extended the deep-space scenery from nearby Earth and Mars into unfamiliar distant space and exoplanet views, with continuous stage-to-stage interpolation.
- Made temporary weapon pickups change the active firing pattern for a finite duration while preserving rare, bounded permanent run upgrades.

### Quality

- Added deterministic regression coverage for nine-stage ordering, descendant objectives, physical collision safety, seamless mobile and desktop hyperspace anchors, temporary weapon expiry, deep-space progression, offline security, and long-run caps.
- Retained the dependency-free local runtime, strict Content Security Policy, fixed-step simulation, accessible input paths, GitHub Pages deployment, and zero runtime network surface.

## [1.1.0] — 2026-08-12

### Fixed

- Replaced open-ended stage pressure with finite waves that stop spawning at their configured totals.
- Prevented a stage from clearing until its current wave is fully deployed and every required threat is resolved.
- Removed the artificial survival-time gate from the Titan objective: destroying the Titan now completes the combat requirement immediately.
- Removed directional star trails from normal play; stars remain points until the controlled hyperspace sequence begins.

### Changed

- Rebuilt the expedition as five focused combat stages: an introductory three-asteroid wave, escalating asteroid fields, an alien interception, a Titan confrontation, and an alien command-ship arena.
- Replaced collectible salvage progression with clear finite-wave objectives.
- Added a short hyperspace sequence between stages with locked controls, ship autopilot, accelerated star streaks, and clean world handoff.
- Updated stage presentation and objective messaging around wave progress instead of continuous roaming pressure.

### Quality

- Added deterministic regressions for exact wave counts, finite spawning, objective-clear ordering, Titan completion, transition control lock, autopilot, and world cleanup.
- Retained the dependency-free local runtime, strict offline security policy, entity caps, fixed-step safety, accessibility paths, and long-run deterministic stress coverage.

## [1.0.0] — 2026-08-12

### Added

- Initial public release of the dependency-free local browser arcade shooter.
- Five-stage sector structure, ballistic asteroid variants, alien spacecraft, weapon modules, temporary power-ups, Void Pulse, and an alien boss arena.
- Deep-space Canvas presentation, synthesized audio, local high score, reduced-effects mode, offline audit tests, CI, and GitHub Pages deployment.
