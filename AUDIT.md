# Neon Voyage 1.4.0 — release audit

- Audited: 2026-08-13
- Targets: direct `file://` launch and GitHub Pages repository-subpath hosting
- Result: **PASS — 111/111 automated checks; protection enforcement, merge, deployment, and live Play pending**

Observed with Node v24.14.0 on Linux x64. The harness uses Node built-ins only; Node is not part of the browser game. Automated phone- and tablet-class evidence uses simulated browser viewports and Pointer Events and is not a claim of acceptance on physical touch hardware.

## Release properties

- Runtime dependencies: **0**
- Build step: **none**
- Required local server: **none**
- Remote runtime requests: **0 by design**
- Runtime files: local HTML, CSS, JavaScript, and nine WebP scenery assets
- Persistent data: separate strict local records for high score/preferences and unlocked-stage progress
- License: MIT

## Journey and finite objectives

Passed:

- The immutable 1.4 configuration defines nine ordered stages: Earth Orbit, Inner Belt, Deep Drift, Shattered Frontier, Titan Gate, First Contact, Strike Wing, Raid Fleet, and Command Arena.
- Stages 1–4 contain asteroid and non-sentient anomaly hazards only. The Titan is Stage 5, ordinary alien spacecraft first appear at Stage 6, and the alien Harrower boss remains Stage 9.
- The first Earth Orbit wave contains exactly three required rocks, all visible at entry, and cannot over-spawn its configured total.
- Across 1,024 fixed seeds at each of six phone, tablet, and desktop viewports, every Earth Orbit opening rock preserves at least 72 px of ship-surface clearance, 18 px of threat separation, and 2.2 seconds of predicted contact time.
- An additional 10,240 seeded openings cover Stages 1–5 at 568×320 and 667×375. Large automatic asteroids adapt only to the configured safe radius floor; an unsafe threat remains in the finite pending queue and retries instead of being forced beside the player or discarded.
- Required descendants inherit encounter and wave ownership and increase the live objective totals. The stage cannot clear while any required descendant remains.
- Wave and stage completion also wait for every living same-generation asteroid or alien, plus both finite pending and hard-cull requeue lists. Optional hazards, carrier children, and boss escorts block clean-field progression without corrupting the required-objective counter.
- Every configured alien wave in Stages 6–8 contains a small, finite asteroid hazard mix. Those hazards remain ballistic and must be cleared alongside the spacecraft.
- The colossal split is exact and bounded: one parent creates three required rock children; each child creates two final fragments; those six final fragments cannot split again. The resulting required tree contains ten total objectives (1+3+6).
- Fresh fragments spawn separated with collision grace and survive their initial frame. A hard-culled required fragment is requeued with its exact health, radius, required state, remaining split generations, hit-flash state, and collision grace.
- A deterministic weapon-driven run visits Stages 1–9 in order, clears every optional hazard and spawned add, defeats the Harrower boss through normal player projectiles, wraps to Sector 2 Stage 1, and remains beneath every configured entity cap.

## Physical collision verification

Passed:

- Every asteroid variant remains ballistic and creates no normal projectile or mine during an isolated 60-second simulation. Alien spacecraft retain their configured attacks.
- Asteroid pairs use mass-aware separation and restitution. Approaching pairs bounce without health loss, objective changes, score, combo, pickups, or environmental-kill credit; separating and exact-co-location overlaps also recover without damage farming.
- A required asteroid cannot be resolved by another asteroid. Player destruction still advances it exactly once and receives the normal reward.
- A genuine approaching asteroid-to-alien impact destroys the alien, may damage the asteroid, advances the relevant objective once, and grants no score, combo, or pickup reward. Repeated processing cannot duplicate credit.
- Player/asteroid overlap separates the ship before impact response and removes inward relative velocity. Invulnerability no longer permits persistent embedding or stale collision drift.
- Asteroids, alien spacecraft, the player, and outward dashes remain contained by their relevant rectangular stage boundaries. The Stage 9 arena remains circular and fully visible across desktop and narrow layouts.

## Hyperspace and scenery verification

Passed:

- Stage clear protects a one-hull ship and removes threats, projectiles, mines, pickups, effects, floaters, and drones before transit.
- Movement, fire, Dash, and Void Pulse cannot alter the finite autopilot sequence or create combat entities.
- Autopilot captures the ship's current travel direction and screen anchor. The next battlefield opens around that anchor without a visible world-position teleport.
- Anchor continuity passes multiple starting positions and headings at desktop, portrait, and landscape dimensions, including all four legal arena edges through the Stage 9-to-Sector 2 wrap.
- Menu, normal play, and pause keep stars as point sprites. Line streaks activate only during hyperspace and remain bounded in full and reduced-effects modes.
- Scenery progresses continuously from Earth through Mars-adjacent space into six locally bundled photoreal deep-space worlds. The earlier procedural banded exoplanets are no longer a runtime path, and a sector wrap does not visibly reset the background to Earth.
- The six added planet files resolve through local relative paths, decode successfully, and render as stage-authored Canvas bodies. A rendered `@napi-rs/canvas` inspection covered their clipping, composition, and transparency without adding a browser-game dependency.
- Continue-card previews are deterministically rendered, stage-distinct, and draw only from local authored scene data and bundled assets.
- Asteroid damage presentation has exactly three pre-break crack thresholds below 75%, 50%, and 25% health plus a bounded hit flash.

## Mobile input and lifecycle verification

Passed in automated browser-VM regressions:

- Touch capability is detected from `maxTouchPoints`, any coarse pointer, or observed touch input. Hybrid tablets with a fine primary pointer retain their touch controls.
- Fresh touches on the playable canvas halves establish independent dynamic movement and aim/fire origins. Initial contact is neutral, radial magnitude remains analog, crossing the center cannot swap ownership, and cleanup returns each control to its idle position.
- Each stick is owned by one pointer ID. A matching terminal event releases that stick even if Safari/WebKit omits, empties, or corrupts `pointerType`; releasing one stick does not disturb the other.
- Missing, rejected, thrown, silently lost, and normally released pointer capture converge on neutral input. A per-frame capture watchdog clears only ownership that was actually lost.
- Inactive `pointerout`/`pointerleave`, zero-touch native `touchend`, native `touchcancel`, document freeze, persisted page restore, visibility loss, page exit, portrait blocking, pause, and mode changes provide additional cleanup boundaries.
- There is no inactivity timeout. A stationary captured or intentionally uncaptured held thumb remains owned after 60 seconds, while a fresh primary touch can recover genuinely stale ownership without stealing a valid second thumb.
- Live movement, aim, and firing require active ownership. Duplicate move delivery is ignored, malformed terminal recovery cannot relatch fire, and an old pointer cannot resume after cleanup.
- Touch aim turning scales from fine partial deflection to the configured 7.2-radian-per-second cap. Low-band fire follows the same heading path; release preserves the chosen heading.
- Dash and Void Pulse remain independently operable with both sticks held and cannot leak into pause behavior.
- Ordinary mobile browser-chrome focus changes do not pause a visible run. Hiding the document pauses safely; touch pause releases captures, clears actions, stops residual velocity, and requires fresh input.
- Portrait play presents a blocking landscape gate that owns covered UI, keyboard, pointer, and gamepad input without changing the run mode. Landscape restoration resumes the same state without replaying held buttons.
- Double-tap zoom and overscroll are suppressed within the owned fullscreen game shell without adding `user-scalable=no`; landscape orientation lock remains best-effort and is never required on iOS.

## Progress, UI, and storage verification

Passed:

- Progress uses a separate, size-limited `neon-voyage-progress-v1` record with strict schema 1 and Stage 1–9 integer bounds. Missing, malformed, oversized, unknown-schema, and denied storage fall back safely.
- High score and sound/effects preferences remain intact when progress data is invalid. Storage failure cannot block New Game.
- New Game always starts Stage 1 while retaining the highest earned checkpoint.
- Continue remains disabled until Stage 2 is genuinely unlocked. Its responsive grid contains all nine ordered stages, disables locked cards, marks the last-played stage, and repeats the lock check in runtime logic.
- Selecting an unlocked checkpoint starts a fresh Sector 1 run at that stage with score 0, full hull, and only the base pulse module. It is explicitly not a live-state save.
- A genuine stage clear persists the next checkpoint before hyperspace. Debug and automated stage jumps cannot unlock campaign progress, and progress clamps at Stage 9.
- Menu, pause, game-over, dialogs, and portrait mode use correct `inert` and `aria-hidden` ownership. Canvas focus exists only during active play; primary actions receive focus once per real mode transition without stealing dialog or restored control focus.
- Phone-class landscape CSS compacts secondary HUD labels, the objective panel, module text, and system meters while preserving their accessible names and touch targets.

## Weapons and pickups verification

Passed:

- Rapid Fire, Tri-Shot, Arc Burst, and Nova Lance use independent finite timers and visibly distinct firing behavior. Refreshing or expiring one cannot change another.
- Pickup selection retains its global drop chance and pity boundary. Only the requested weights changed: Rapid Fire 24, Tri-Shot 22, and Hull Repair 20.
- The deterministic weighted sample includes survival pickups and temporary weapons. Pickup collection remains capped.
- Rare permanent module upgrades change one eligible module, last only for the current run, and remain within the three-tier limit.
- Homing Salvo and Radial Array are reachable through the normal bounded module-upgrade path, persist only for the current run, wait for an eligible in-range target, obey their configured cooldowns, and stay under the player-projectile cap.
- Void Pulse reads its reach and damage from immutable configuration. Its 280 px radius affects only nearby threats, enemy projectiles, and mines, and its reduced asteroid, alien, and boss damage cannot reproduce the old screen-wide clear.

## Offline, security, and repository verification

Passed:

- The Content Security Policy denies unspecified sources and blocks runtime connections, frames, objects, fonts, media, workers, forms, and base-URI changes.
- Runtime source contains no remote URL, network API, telemetry, dynamic code, worker, service worker, module loader, package manifest, lockfile, or `node_modules`.
- All nine raster resources—including the six AI-generated deep-space worlds—are repository-local, referenced exactly once from the renderer's celestial manifest, and absent from external URLs. No outside source image is used.
- Every runtime resource is local, relative, and valid beneath the `/Neon-Voyage/` GitHub Pages repository subpath. Direct `file://` launch requires no server.
- Runtime JavaScript passes syntax checking. The release tree contains no symlinks and stays below conservative offline payload limits.
- Runtime configuration, visible UI metadata, `VERSION.txt`, README, changelog, and this audit agree on version 1.4.0.
- The dependency-free browser VM loads every local script, draws Canvas frames and local stage previews, launches a run, exposes the HUD, and maintains one animation loop.
- CI and Pages workflows publish the unchanged repository root without installing dependencies or running a production build.

## Long-run verification

Passed:

- A deterministic 20-minute expedition completed 72,000 fixed simulation steps while cycling all nine stages, finite waves, hyperspace, asteroid and alien pressure, player fire, effects, environmental kills, and boss combat.
- Ship, camera, score, clocks, and active entities remained finite. Asteroids, aliens, player/enemy projectiles, mines, pickups, effects, and floaters stayed within configured caps.
- Repeating the long simulation with the same seed and inputs reproduced its snapshot, collection peaks, and stage-transition count.

## Reproduce

```sh
node tests/run.js
```

Expected result for this source snapshot: `111/111 tests passed`.

## Browser smoke and acceptance

- The automated rendered/browser-VM smoke loads every local script, draws Canvas and Continue previews, starts a run, drives Pointer Events through movement, aim, fire, Dash, Pulse, pause, malformed terminals, lifecycle cleanup, and simulation, then verifies neutral stick state.
- Phone- and tablet-class landscape behavior is exercised through deterministic simulated viewports and pointer sequences. This is automated coverage, not physical-device acceptance.
- The six new celestial assets were rendered through `@napi-rs/canvas` and inspected in their stage compositions. This is a rendered asset check, not a hands-on browser playthrough.
- No installed browser executable was available for hands-on local candidate play, and the available cloud browser cannot open the local/file preview URL. No prepublication browser play is claimed.
- A live desktop Play from the GitHub Pages repository-subpath URL is required immediately after deployment. This release must not be declared complete until that action and the deployed 1.4.0 version are observed successfully.

## Acceptance and publication boundary

Automated checks validate contracts, safety, determinism, and simulated browser behavior. They do not establish human acceptance of balance, difficulty, visual quality, responsiveness, audio, or overall game feel. The post-deployment live desktop check described above remains the publication acceptance boundary.

## Repository protection and publication status

- The repository contains the `Offline audit` pull-request workflow, whose required check context is exactly `Offline audit / audit`.
- Project governance requires pull requests into `main`, blocks direct/force pushes and branch deletion, and permits one required approval only when a genuine independent reviewer is available.
- Server-side branch protection is **not yet verified or claimed as applied**. The connected GitHub integration cannot administer branch rules, and the available browser session requires GitHub sign-in. This candidate must remain on its release branch until an authenticated repository administrator enables and verifies the rules.

`SHA256SUMS` must be regenerated only after all release files are frozen. The release pull request, required check, merge, Pages deployment, repository metadata, and live URL must then be observed; this local audit does not claim those later checks have completed.
