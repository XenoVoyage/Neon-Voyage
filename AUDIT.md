# Neon Voyage 1.1.0 — release audit

Audited: 2026-08-12  
Targets: direct `file://` launch and GitHub Pages repository-subpath hosting  
Result: **PASS — 39/39 automated checks**

Observed with Node v24.14.0 on Linux x64. The harness uses Node built-ins only; Node is not part of the browser game.

## Release properties

- Runtime dependencies: **0**
- Build step: **none**
- Required local server: **none**
- Remote runtime requests: **0 by design**
- Runtime files: local HTML, CSS, JavaScript, and WebP
- Persistent data: validated local high score and sound/effects preferences only
- License: MIT

## Finite-wave and gameplay verification

Passed:

- The immutable 1.1 configuration defines five ordered stage families, presented as Belt Breach, Deep Belt, Alien Intercept, Titan Clash, and Command Arena; Stages 1–4 use waves and Stage 5 uses a direct boss-defeat goal.
- The first Belt Breach wave contains exactly three required rocks. All three are visible at entry, no fourth threat appears while that wave remains active, and the next finite wave begins with its configured four required threats.
- Stage and wave configuration is finite and capped. A required survivor prevents both wave advancement and premature stage clear.
- Required wave deaths advance the current-wave and whole-stage counters exactly once. Optional hazards remain independent of goal progress.
- Direct asteroid impact destroys a required alien, damages the asteroid, and advances both required counters once without awarding score, combo, or a pickup. Reprocessing the same death has no effect.
- Every asteroid variant—rock, crystal, volatile, armored, colossal, and Titan—remained ballistic and produced no projectile or mine through an isolated 60-second simulation.
- Alien spacecraft retain finite ranged attack behavior.
- Destroying the required Titan enters hyperspace on the next fixed step with no survival-time gate.
- Stage clear protects a one-hull ship from an overlapping asteroid before and throughout hyperspace.
- Hyperspace clears threats, projectiles, mines, pickups, effects, floaters, and drones before transit. Movement, fire, dash, and Void Pulse inputs cannot alter its configured normalized autopilot path or create combat entities.
- Hyperspace duration and progress are finite; the ship exits centered, invulnerable, and ready for the next configured stage.
- Rapid Fire and Tri-Shot coexist, refresh independently, and expire on independent ten-second timers.
- The deterministic pickup sample includes Shield, Rapid Fire, Tri-Shot, Hull Repair, Piercing Rounds, and Pulse Charge. Rare module upgrades remain configured, pity behavior prevents long droughts, and the pickup array respects its cap.
- Player movement and outward dashes remain inside all four rectangular stage boundaries.
- The locked boss arena contains extreme positions and velocity. Its complete authored circle remains visible from every legal ship edge at 1280×720, 320×568, and 568×320.
- Difficulty functions remain finite, monotonic, sublinear, and capped; all five permanent weapon modules retain bounded tiers.

## Visual verification

Passed:

- Menu, normal play, and pause keep stars as point sprites with zero travel distance and no line streaks, regardless of ship angle or velocity.
- Earth and Mars match five exact stage keyframes, interpolate continuously between stages, clamp unsafe inputs, and wrap from Stage 5 toward the next sector.
- Hyperspace streaks activate only during an active transition; menu, normal play, and pause produce no cinematic streak profile.
- Streaks travel opposite the normalized autopilot vector with bounded progress, intensity, density, length, and speed.
- Reduced-effects mode lowers hyperspace streak intensity, density, and length without changing the transition contract.

## Offline, security, and repository verification

Passed:

- The Content Security Policy denies all unspecified sources and explicitly blocks runtime connections, frames, objects, fonts, media, workers, forms, and base-URI changes.
- Runtime source contains no remote URL, network API, telemetry, dynamic code, worker, service worker, module loader, package manifest, lockfile, or `node_modules`.
- Every HTML/CSS runtime resource is local, relative, and valid beneath the `/Neon-Voyage/` GitHub Pages repository subpath. No `<base>` tag or root-relative runtime path is present.
- Runtime JavaScript passes syntax checks. The release tree contains no symlinks and remains below conservative offline payload limits.
- Runtime configuration, `VERSION.txt`, README, changelog, and this audit agree on version 1.1.0; project contributor instructions are present.
- The dependency-free browser VM loads every local script, draws Canvas frames, launches from the menu, exposes the HUD, and maintains a single animation loop.
- CI runs the audit without an install step. The Pages workflow audits, configures Pages, uploads the unchanged repository root, and deploys without a production build.

## Long-run verification

Passed:

- A deterministic 20-minute expedition completed 72,000 fixed simulation steps while cycling finite waves, hyperspace, every stage family, player input, projectiles, effects, environmental alien kills, and boss combat.
- Ship, camera, score, clocks, and active entities remained finite. Asteroids, aliens, player/enemy projectiles, mines, pickups, effects, and floaters remained within their configured caps.
- The run exercised asteroid pressure, alien pressure, player fire, effects, and more than one full stage cycle.
- Repeating a long simulation with the same seed and inputs reproduced its snapshot, collection peaks, and stage-transition count.

## Reproduce

```sh
node tests/run.js
```

Expected result for this source snapshot: `39/39 tests passed`.

## Acceptance and publication boundary

Automated checks validate contracts, safety, determinism, and simulated browser behavior. They do not establish human acceptance of balance, difficulty, visual quality, responsiveness, audio, or overall game feel.

`SHA256SUMS` must be regenerated only after final integration freezes every release file. CI, Pages deployment, and the live URL must then be observed after the single public `main` publication; this local result does not claim those later publication checks have already completed.
