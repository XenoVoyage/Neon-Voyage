# Changelog

All notable user-facing changes to Neon Voyage are documented here. A heading records a runtime version; Git and GitHub history remain the evidence for its deployment, tag, and GitHub Release status. Starting with `v2026.8.13`, the first runtime label on a day uses `vYYYY.M.D` without leading zeroes; additional same-day runtime labels append `a`, `b`, `c`, and so on. Earlier semantic-version labels remain unchanged as historical records.

## [v2026.8.14] — 2026-08-14

### Added

- Added a focused game-design guide, visual-asset guide, and security policy so public, product, technical, and reporting information each have one clear home.

### Fixed

- Prevented manually dispatched Pages jobs from deploying an unmerged feature branch.
- Made carrier children follow their configured type, count, reward, and living-child limit instead of hidden hardcoded values.
- Enforced the configured camera-shake and guardian-drone caps.

### Changed

- Rebuilt the README as a shorter, player-focused introduction with the existing gameplay visuals, essential controls, project summary, and local-play instructions.
- Reordered and condensed the contributor rules around simplicity, descriptive naming, clear ownership, cleanup, verification, and protected pull-request releases.
- Removed unused runtime helpers, fields, selectors, configuration metadata, debug aliases, and stale pre-release wording without changing the intended game experience.

## [v2026.8.13] — 2026-08-13

### Added

- Upgraded campaign progress to strict schema 2 with bounded per-stage weapon checkpoints. Continue now restores the selected stage's permanent module tiers and remaining temporary-weapon timers while starting score, hull, position, and the battlefield fresh.
- Added an accessible confirmation before New Game overwrites existing campaign checkpoints. Cancel is the safe default, and local record plus sound/effects preferences remain untouched.
- Added two lightweight, locally generated gameplay captures to the README for the Earth-orbit opening and the Harrower command arena.

### Fixed

- Bounded the defeat camera shake to a short presentation-only decay and cleared residual shake/flash when returning to the menu, preventing game-over feedback from shaking later screens indefinitely.
- Recolored the Local Record value from gold to cyan so it matches the established deep-space interface palette.

### Changed

- Condensed the README's mobile/tablet and expedition guidance while preserving the input lifecycle, landscape, finite-stage, collision, and clean-field rules players need.
- Migrated valid schema-1 progress safely: earned stages and the last-played checkpoint are retained, with conservative base loadouts synthesized where older saves could not contain weapon data.
- Adopted calendar release labels: `vYYYY.M.D` for the first release on its actual publication date, followed by ordered lowercase suffixes for additional same-day releases.

## [1.4.0] — 2026-08-13

### Added

- Added **Homing Salvo** and **Radial Array** as rare, bounded permanent modules for the current run. The first periodically launches guided rockets at a nearby threat; the second emits an autonomous ring of projectiles.
- Added a finite asteroid hazard mix to every alien wave in Stages 6–8, keeping the physical battlefield active during first contact, strike-wing, and raid-fleet encounters.
- Replaced the six procedural striped exoplanets beyond Mars with locally bundled photoreal worlds for the frontier, Titan Gate, unknown signal, shard, fleet, and command scenes. Earth and Mars remain unchanged.

### Fixed

- Prevented waves and stages from clearing while any same-encounter threat remains. Optional hazards, required descendants, carrier children, boss escorts, deferred spawns, and hard-cull requeues must now all resolve before progression.
- Made the Harrower victory wait for its surviving escorts instead of beginning hyperspace over a visibly occupied arena.

### Changed

- Reduced Void Pulse from a near-screen-clearing attack to a local 280 px defensive burst, with lower asteroid, alien, and boss damage while retaining nearby projectile and mine clearing.
- Compacted the phone-class landscape HUD so the score, objective, modules, and controls leave more of the battlefield visible.
- Removed the obsolete procedural exoplanet band/ring renderer and its unused balance/configuration paths while preserving the local Canvas craft, asteroid, projectile, pickup, and effects art.

## [1.3.0] — 2026-08-13

### Added

- Added persistent local stage progression. **New Game** always starts at Stage 1, while **Continue** opens an adaptive grid of earned checkpoints with deterministic, locally drawn previews.
- Made checkpoint semantics explicit: selecting an unlocked stage starts a fresh Sector 1 run there with reset score, hull, temporary weapons, and run upgrades; it is not a suspended live-state save.
- Added an exact bounded colossal break tree: one parent becomes three rocks, then each rock splits once into two final fragments (1→3→6). Every required descendant joins the finite objective.
- Added three progressive asteroid crack stages and a short hit flash so heavy damage is visible before destruction.

### Fixed

- Fixed the persistent mobile fire and movement latch seen when Safari/WebKit suppresses or malformedly reports a terminal pointer event. Matching pointer IDs now release their owned sticks regardless of `pointerType`.
- Added per-frame pointer-capture reconciliation plus inactive boundary, native touch, page freeze/restore, visibility, page-exit, portrait, and mode-change fallbacks. Lost ownership clears immediately, while a deliberately stationary hold has no inactivity timeout.
- Allowed a fresh primary touch to recover genuinely stale stick ownership without stealing a valid simultaneous second-thumb control.
- Separated an overlapping player and asteroid before applying impact response, preventing collision embedding from making resumed movement feel stuck.
- Stopped asteroid pairs from damaging or destroying one another. They now separate and bounce only, while a genuine asteroid-to-alien impact remains lethal and reward-free.

### Changed

- Slightly raised the bounded pickup weights for Rapid Fire (24), Tri-Shot (22), and Hull Repair (20) without changing the global drop chance or pity threshold.
- Made inactive menus and overlays inert, limited canvas focus to active play, and restored the correct primary action after menu, pause, game-over, dialog, and portrait transitions.
- Kept campaign unlock storage separate from high score and preferences, with strict schema, size, and Stage 1–9 bounds; debug stage jumps cannot unlock checkpoints.

## [1.2.3] — 2026-08-13

### Added

- Added dynamic mobile joysticks inspired by modern touch games: a fresh canvas touch establishes the movement stick anywhere on the playable left half or the aim/fire stick anywhere on the right half.
- Made each new stick origin initially neutral and pointer-owned. Its base stays fixed while the knob follows that finger—even across the center line—until a terminal event, then returns to its idle visual position without disturbing the other stick.

### Fixed

- Prevented touch firing from remaining latched after release, cancellation, lost capture, visibility changes, page exit, pause, orientation blocking, or another control-mode transition.
- Added global pointer termination handling and a live aim-stick ownership guard, so browsers that reject or unexpectedly lose pointer capture cannot leave an attack active.
- Kept Dash, Void Pulse, and HUD actions independent from the dynamic canvas sticks, including while movement and aim are both held.

### Changed

- Made touch response fully analog across each stick radius. Partial movement remains deliberate while greater deflection smoothly approaches the configured movement maximum.
- Scaled aim turning by stick magnitude and reduced its full-deflection cap from 8 to 7.2 radians per second, providing finer partial-aim control without removing fast turning at the edge.

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

## [1.0.0] — 2026-08-12

### Added

- Initial public release of the dependency-free local browser arcade shooter.
- Five-stage sector structure, ballistic asteroid variants, alien spacecraft, weapon modules, temporary power-ups, Void Pulse, and an alien boss arena.
- Deep-space Canvas presentation, synthesized audio, local high score, reduced-effects mode, offline audit tests, CI, and GitHub Pages deployment.
