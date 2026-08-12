# Neon Voyage 1.0.0 — release audit

Audited: 2026-08-12  
Targets: direct `file://` launch and GitHub Pages repository-subpath hosting  
Result: **PASS — 34/34 automated checks**

## Release properties

- Runtime dependencies: **0**
- Build step: **none**
- Required local server: **none**
- Remote runtime requests: **0 by design**
- Runtime files: local HTML, CSS, JavaScript, and WebP
- Persistent data: validated local high score and sound/effects preferences only
- License: MIT

## Offline and security verification

Passed:

- Restrictive Content Security Policy with `default-src 'none'`, `connect-src 'none'`, and explicit local script/style/image allowances.
- No `fetch`, XMLHttpRequest, WebSocket, EventSource, beacon, remote URL, telemetry SDK, dynamic import, `eval`, `new Function`, worker, service worker, external font, iframe, CDN, or package loader in runtime source.
- Every HTML and CSS resource resolves to a regular file inside the repository.
- All resource URLs are relative and stay below `/Neon-Voyage/` when resolved under the GitHub Pages repository subpath.
- No root-relative runtime paths, `<base>` tag, inline script, inline stylesheet, or inline style attributes.
- No package manifest, lockfile, `node_modules`, framework, bundler, or production build.
- No symlink in the release tree; individual files and the total runtime remain below conservative offline payload limits.
- Storage reads and writes are length-limited, schema-validated, exception-safe, and optional.

## Gameplay correctness verification

Passed:

- Five stages remain in the required order: Belt Breach, Salvage Run, Alien Intercept, Meteor Storm, and Command Arena.
- Each stage has a concrete, independently tested goal. Meteor Storm requires both Titan destruction and its minimum survival time; Command Arena remains boss-only.
- Every normal stage begins with four visible threats. An unfinished empty stage restores active pressure inside the 0.25-second limit; its configured empty refill is 0.08 seconds.
- All six asteroid variants were isolated for 60 simulated seconds each. Velocity stayed constant without an impact, and no asteroid produced a bullet, mine, ring attack, beam, or homing adjustment.
- Alien Scout attack behavior produced finite hostile projectiles. Other alien classes remain config-driven spacecraft with separate attack patterns.
- An asteroid–alien impact damages the asteroid and destroys the alien. The environmental kill advances Alien Intercept exactly once and produces no score, combo, pulse, or pickup reward.
- A death-processing guard prevents double objective progress, score, and drops.
- Rapid Fire and Tri-Shot can coexist, refresh independently, and expire on independent ten-second timers.
- The weighted field pool produced Shield, Rapid Fire, Tri-Shot, Hull Repair, Piercing Rounds, and Pulse Charge in a deterministic distribution sample. Rare weapon upgrades remain configured separately.
- The five-kill pity threshold guarantees a pickup before a long reward drought, and the active pickup array respects its hard cap.
- The player remains inside all four rectangular stage boundaries, including outward dashes.
- Stage-clear transitions grant immediate safety: a one-hull ship overlapping an asteroid stays alive through the clear frame, transition, and normal Stage 2 advance.
- An extreme out-of-bounds position and dash velocity cannot escape the locked circular boss arena.
- At every legal arena edge, the boss camera keeps the complete authored circle visible inside 1280×720 desktop, 320×568 portrait, and 568×320 landscape viewports. It does not drift with the ship.
- Post-boss reward downtime is capped at 1.5 seconds before the next sector begins.
- Difficulty functions are finite, monotonic, sublinear, and capped at extreme sector values.
- All five permanent weapon modules have bounded tiers and fire through the shared module system.

## Visual progression verification

Passed:

- The deep-space flow vector is normalized, fixed in screen space, and identical across ship angles and velocity directions. Ship rotation cannot rotate the background lines.
- Earth and Mars position, size, and opacity match five exact authored stage keyframes.
- Inter-stage planet values interpolate linearly and continuously; stage and progress inputs are clamped.
- The fifth-stage scene transitions safely back toward the first-stage keyframe for the next sector.
- Deep-space, Earth, and Mars WebP assets decode locally; ships, asteroids, projectiles, pickups, and effects are procedural Canvas vectors.

## Long-run and performance verification

Passed:

- Deterministic **20-minute** fixed-step stress expedition: 72,000 simulation steps with stage cycling, movement, aim, continuous fire, dashes, pulses, alien environmental kills, boss damage, spawning, effects, and cleanup.
- Simulation state, score, clocks, camera, ship, and every active entity remained finite throughout.
- Every collection remained below its configured cap: player/enemy projectiles, asteroids, aliens, mines, pickups, particles, and floaters.
- The stress run exercised asteroid pressure, alien pressure, player projectiles, effects, boss combat, and more than one complete stage cycle.
- Fixed seed plus fixed inputs reproduced the same long-run snapshot, peaks, and transition count.
- Fixed 60 Hz stepping, bounded frame delta/catch-up, safe cleanup, and capped synthesized audio remain enabled.

## Browser and repository verification

Passed:

- Dependency-free browser-VM boot loads every local script, creates the renderer, draws frames, launches from the minimal menu, reveals the HUD, and keeps a single animation loop.
- Every runtime JavaScript file passes syntax checking.
- CI runs the audit directly with Node and no install step.
- The Pages workflow reruns the audit, enables Pages where supported, uploads the repository root, and deploys it without transforming the source.
- `.nojekyll`, MIT `LICENSE`, version metadata, public README, asset provenance notes, and test documentation are present.

## Automated command

```sh
node tests/run.js
```

Audit environment: Node v24.14.0 on Linux x86_64. The test harness uses only Node built-ins and simulates the browser DOM, Canvas, animation frames, local storage, input, and long-running fixed-step gameplay. Node is not used by the game itself.

## Residual platform note

Browsers control permission for synthesized audio and fullscreen mode. The runtime handles denial safely, but audio normally requires one click or key press. Automated Canvas mocks verify behavior and state transitions; they do not replace final perceptual review on every browser, GPU, touch device, and display aspect ratio.
