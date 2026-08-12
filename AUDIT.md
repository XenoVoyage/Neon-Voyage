# Neon Voyage 1.2.0 — release audit

Audited: 2026-08-12  
Targets: direct `file://` launch and GitHub Pages repository-subpath hosting  
Result: **PASS — 50/50 automated checks**

Observed with Node v24.14.0 on Linux x64. The harness uses Node built-ins only; Node is not part of the browser game.

## Release properties

- Runtime dependencies: **0**
- Build step: **none**
- Required local server: **none**
- Remote runtime requests: **0 by design**
- Runtime files: local HTML, CSS, JavaScript, and WebP
- Persistent data: validated local high score and sound/effects preferences only
- License: MIT

## Journey and finite objectives

Passed:

- The immutable 1.2 configuration defines nine ordered stages: Earth Orbit, Inner Belt, Deep Drift, Shattered Frontier, Titan Gate, First Contact, Strike Wing, Raid Fleet, and Command Arena.
- Stages 1–4 contain asteroid and non-sentient anomaly hazards only. The Titan is Stage 5, ordinary alien spacecraft first appear at Stage 6, and the alien Harrower boss remains Stage 9.
- No pre-contact stage or wave label contains stale scout, strike, raid, fleet, carrier, bomber, or alien terminology.
- The first Earth Orbit wave contains exactly three required rocks, all visible at entry, and cannot over-spawn its configured total.
- Each non-boss stage is a finite set of configured, capped waves. A required survivor prevents wave advancement and premature stage clear.
- Splitting required asteroids create required descendants with the same encounter generation and wave. Both current-wave and stage totals grow by the number successfully spawned; the full descendant tree must be destroyed before progress continues.
- Fresh fragments spawn separated with collision grace and survive their initial frame instead of self-annihilating.
- A required fragment that crosses the hard-cull radius is requeued and restored with its exact radius, current/max health, fragment flags, no-drop/score/threat values, health-gate index, and remaining collision grace. The round trip neither duplicates nor clears its objective total.

## Physical collision verification

Passed:

- Every asteroid variant remains ballistic and creates no projectile or mine during an isolated 60-second simulation. Alien spacecraft retain their configured attacks.
- Approaching asteroid pairs separate, bounce, and exchange one impact-damage event. A repeated or already-separating overlap cannot farm damage.
- Exact asteroid-alien co-location resolves to deterministic separation and one approaching impact, with exactly-once objective credit and no duplicate score, combo, or pickup reward.
- Asteroid impacts can destroy required asteroids or aliens. Objective counters advance exactly once, while environmental destruction grants no duplicate score, combo, or pickup reward.
- Asteroids, alien spacecraft, the player, and outward dashes remain contained by their relevant rectangular stage boundaries. The locked boss arena contains extreme positions and keeps its complete circle visible on desktop, narrow portrait, and narrow landscape viewports.

## Hyperspace and scenery verification

Passed:

- Stage clear protects a one-hull ship and removes threats, projectiles, mines, pickups, effects, floaters, and drones before transit.
- Movement, fire, dash, and Void Pulse input cannot alter the finite autopilot sequence or create combat entities.
- Autopilot captures the ship's current velocity direction, with an aim/config fallback, and retains that normalized direction through transit.
- The next combat field opens around the carried position. The handoff preserves the captured screen-space ship anchor without resetting the ship to the world origin.
- Anchor continuity passed from three different starting positions and headings at 1280×720, 320×568, and 568×320.
- The Stage 9 boss-to-Sector 2 wrap preserves the exact ship anchor from all four legal arena edges at 320×568 and 568×320.
- Menu, normal play, and pause keep stars as point sprites. Line streaks activate only for an active hyperspace transition and remain bounded in full and reduced-effects modes.
- Authored scenery begins with a prominent Earth, shifts toward Mars, recedes from both familiar planets, and progresses through exotic distant worlds. All nine transitions interpolate continuously; a sector wrap stays in deep space rather than returning visibly to Earth.

## Weapons and progression verification

Passed:

- Rapid Fire, Tri-Shot, Arc Burst, and Nova Lance use independent finite timers. Arc Burst emits `arc` projectiles, Nova Lance emits `lance` projectiles, refreshing one does not refresh another, and expiry removes only that temporary firing behavior.
- The deterministic weighted sample includes survival pickups and both temporary weapons. Pity behavior prevents long drop droughts and the pickup collection respects its cap.
- Rare module upgrades change one eligible permanent module, persist for the current run, and remain within the three-tier limit.
- Difficulty functions remain finite, monotonic, sublinear, and capped; all five permanent weapon modules retain bounded viable tiers.

## Offline, security, and repository verification

Passed:

- The Content Security Policy denies unspecified sources and explicitly blocks runtime connections, frames, objects, fonts, media, workers, forms, and base-URI changes.
- Runtime source contains no remote URL, network API, telemetry, dynamic code, worker, service worker, module loader, package manifest, lockfile, or `node_modules`.
- Every runtime resource is local, relative, and valid beneath the `/Neon-Voyage/` GitHub Pages repository subpath. No `<base>` tag or root-relative runtime path is present.
- Runtime JavaScript passes syntax checking. The release tree contains no symlinks and stays below conservative offline payload limits.
- Runtime configuration, visible UI metadata, `VERSION.txt`, README, changelog, and this audit agree on version 1.2.0.
- The dependency-free browser VM loads every local script, draws Canvas frames, launches a run, exposes the HUD, and maintains one animation loop.
- CI and Pages workflows use the unchanged repository root without installing dependencies or running a production build.

## Long-run verification

Passed:

- A deterministic 20-minute expedition completed 72,000 fixed simulation steps while cycling all nine stages, finite waves, hyperspace, asteroid and alien pressure, player fire, effects, environmental kills, and boss combat.
- Ship, camera, score, clocks, and active entities remained finite. Asteroids, aliens, player/enemy projectiles, mines, pickups, effects, and floaters stayed within their configured caps.
- Repeating a long simulation with the same seed and inputs reproduced its snapshot, collection peaks, and stage-transition count.

## Reproduce

```sh
node tests/run.js
```

Expected result for this source snapshot: `50/50 tests passed`.

## Acceptance and publication boundary

Automated checks validate contracts, safety, determinism, and simulated browser behavior. They do not establish human acceptance of balance, difficulty, visual quality, responsiveness, audio, or overall game feel.

`SHA256SUMS` must be regenerated only after all release files are frozen. CI, Pages deployment, repository metadata, and the live URL must then be observed after the single public `main` publication; this local audit does not claim those later checks have completed.
