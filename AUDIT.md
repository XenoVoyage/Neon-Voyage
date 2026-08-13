# Neon Voyage 1.2.3 — release audit

- Audited: 2026-08-13
- Targets: direct `file://` launch and GitHub Pages repository-subpath hosting
- Result: **PASS — 81/81 automated checks; post-deployment live Play pending**

Observed with Node v24.14.0 on Linux x64. The harness uses Node built-ins only; Node is not part of the browser game. An independent final audit found the frozen candidate clean.

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
- Across 1,024 fixed seeds at each of six phone, tablet, and desktop viewports, every Earth Orbit opening rock preserves at least 72 px of ship-surface clearance, 18 px of threat separation, and 2.2 seconds of predicted contact time.
- An additional 10,240 seeded openings cover Stages 1–5 at 568×320 and 667×375. Large automatic asteroids adapt only as far as the configured safe radius floor; if no strict placement exists, the threat remains in the finite pending queue rather than being forced onto the field or discarded.
- Every compact opening places at least one threat and retains the exact authored total across living and pending threats. A deferred slot keeps `waveSpawned` false and is retried as normal combat frees safe perimeter space.
- Opening asteroids remain non-overlapping on their first simulation tick and cannot damage a stationary ship during the protected opening window; automatic placements receive 2.2 seconds of collision grace rather than relying on temporary player invulnerability.
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
- Asteroids, alien spacecraft, the player, and outward dashes remain contained by their relevant rectangular stage boundaries. The locked boss arena contains extreme positions and keeps its complete circle visible across desktop and narrow viewport geometry; the touch shell blocks active play in portrait.

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

## Mobile input and lifecycle verification

Passed in automated browser-VM regressions:

- Touch capability is detected from `maxTouchPoints`, any available coarse pointer, or an observed touch gesture. Hybrid iPads and other fine-primary-pointer tablets retain the touch-control shell.
- Fresh touches on the playable canvas left and right halves establish dynamic movement and aim-stick origins respectively. The new origin begins neutral and stays fixed while the knob follows its owning pointer; crossing the center line cannot swap that pointer's role. Cleanup returns the control to its idle visual position.
- Real Pointer Event sequences keep the move and aim sticks assigned to independent pointer IDs. Holding the aim stick fires without stealing movement; releasing one stick does not clear the other, and Dash, Void Pulse, and HUD controls remain independent of canvas stick ownership.
- Stick input is calculated radially from each dynamic origin. Configured deadzones, nonlinear response curves, and output caps remain symmetric; exact origin touches remain neutral and cannot move or fire.
- Movement strength scales with radial deflection. Touch aim turning also scales with the shaped magnitude and reaches its configured 7.2-radian-per-second cap only at full output, preserving fine control at partial deflection.
- Touch aiming follows the requested vector through its magnitude-scaled turn path. Low-band firing uses that same path and emits along the resulting ship heading; barely-active aim uses the same ownership threshold, turns without snapping, and stays below the fire threshold. Releasing the aim stick preserves the chosen heading and reanchors the aim vector as the ship moves instead of snapping toward a stale target.
- An observed touch clears stale mouse targeting on a hybrid device. Canvas and global pointer termination, lost capture, document hiding, page exit, portrait blocking, mode changes, and touch pause return the relevant stick and transient actions to neutral. A rejected capture still receives terminal cleanup, and firing additionally requires live aim-stick ownership, preventing a stale attack latch.
- Touch Dash and Void Pulse activate gameplay without opening pause. Ordinary mobile browser focus loss does not pause a visible run, while hiding or switching away from the document still pauses safely and clears captured touch ownership.
- A manual mobile pause releases both pointer captures, clears all held touch actions, stops residual ship velocity, and ignores stale movement from the old pointer IDs after resume. Fresh finger input takes ownership normally.
- Desktop focus loss retains automatic pause behavior.
- Portrait touch play presents an accessible blocking rotate prompt, freezes fixed-step simulation without changing the run mode, and resumes the same state after a landscape resize or orientation change.
- The portrait gate owns covered buttons, dialogs, pointer input, keyboard shortcuts, and gamepad state. No covered action can start, reset, pause, configure, or leave a run; held gamepad buttons are sampled without replaying an edge after landscape resumes.
- Landscape locking is requested only as a best-effort browser capability. A missing API, synchronous failure, or rejected lock cannot break startup or input; the runtime does not claim to force orientation on iOS Safari.
- The local shell declares display-safe-area handling, a narrow-landscape layout, and CSS/JavaScript fallbacks for touch controls. `touch-action: manipulation` suppresses double-tap zoom across the shell while the viewport avoids `user-scalable=no`, preserving standard pinch accessibility outside canvas-owned gestures; overscroll is contained.

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
- Runtime configuration, visible UI metadata, `VERSION.txt`, README, changelog, and this audit agree on version 1.2.3.
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

Expected result for this source snapshot: `81/81 tests passed`.

## Browser smoke and acceptance

- The automated rendered/browser-VM smoke loaded every local script, drew Canvas frames, started a run, drove real Pointer Event objects through movement, aim, fire, Dash, Pulse, pause, lifecycle cleanup, and simulation, then returned both sticks to neutral.
- Phone- and tablet-class landscape behavior was exercised through deterministic simulated viewports and pointer sequences. This is automated coverage, not a claim that the 1.2.3 candidate was accepted on physical phone or tablet hardware.
- The available cloud browser rejected the local/file preview URL under its URL security policy, so no hands-on prepublication candidate play is claimed.
- A live desktop Play from the GitHub Pages repository-subpath URL is required immediately after deployment. This release must not be declared complete until that action and the deployed version are observed successfully.

## Acceptance and publication boundary

Automated checks validate contracts, safety, determinism, and simulated browser behavior. They do not establish human acceptance of balance, difficulty, visual quality, responsiveness, audio, or overall game feel. The post-deployment live desktop check described above remains the publication acceptance boundary.

`SHA256SUMS` must be regenerated only after all release files are frozen. CI, Pages deployment, repository metadata, and the live URL must then be observed after the single public `main` publication; this local audit does not claim those later checks have completed.
