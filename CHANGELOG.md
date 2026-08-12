# Changelog

All notable user-facing changes to Neon Voyage are documented here. Versions follow semantic versioning.

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
