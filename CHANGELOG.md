# Changelog

All notable user-facing changes to Neon Voyage are documented here. Versions follow semantic versioning.

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
