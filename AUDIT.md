# Neon Voyage v2026.8.15a — source audit

- Audited: 2026-08-15
- Targets: direct `file://` launch and GitHub Pages repository-subpath hosting
- Result: **PASS — 147/147 automated source checks**

Observed with Node v24.19.0 on Linux x64. The harness uses Node built-ins only; Node is not part of the browser game. Phone- and tablet-class evidence below uses simulated viewports and Pointer Events and is not a claim of acceptance on physical touch hardware.

## Runtime properties

- Runtime dependencies: **0**
- Build step: **none**
- Required local server: **none**
- Remote runtime requests: **0 by design**
- Runtime files: local HTML, CSS, JavaScript, and nine WebP scenery assets
- Persistent data: separate strict local records for high score/preferences and schema-3 per-stage campaign loadouts
- License: MIT

## Campaign and finite objectives

Passed:

- The immutable configuration defines 20 ordered stages. Stages 1–5 form an asteroid/anomaly opening, Stages 6–9 introduce mixed alien fleets, Stage 10 contains the Harrower, Stages 11–15 use evolved asteroid families, Stages 16–19 introduce advanced alien formations, and Stage 20 contains the Leviathan.
- Boss ownership is config-driven through `bossType`; runtime encounter logic does not depend on hardcoded boss stage IDs. Defeating Stage 20 advances to Sector 2 Stage 1 with bounded difficulty scaling and without visually returning to Earth.
- Every non-boss stage has finite authored waves. Completion waits for required objectives, optional hazards, descendants, carrier or boss children, pending spawns, hard-cull requeues, and surviving escorts.
- Earth Orbit still opens with exactly three visible rocks. Across 1,024 fixed seeds at each of six phone, tablet, and desktop viewports—including 568×320, 667×375, 1024×768, and 1280×720—opening threats preserve the configured ship clearance and predicted-contact interval.
- An additional 10,240 seeded compact openings cover Stages 1–5 at 568×320 and 667×375. Oversized threats adapt only to the safe configured radius floor; an unsafe spawn remains in the finite queue instead of appearing beside the player or being discarded.
- The original colossal one-to-three-to-six split tree remains exact and bounded. New razor, prismatic, and monolith asteroids also use finite authored split or gate behavior.
- A deterministic weapon-driven run visits Stages 1–20 in order, resolves mandatory Enigma choices, clears hazards and adds, defeats both bosses with normal player systems, wraps to Sector 2 Stage 1, and remains under every configured entity cap.
- Stage completion remains deferred during Enigma slowdown or selection. Overlapping pickups cannot mutate an advertised card, and an in-flight boss kill defers its boss-core reward until the selected enhancement has applied.

## Threat and boss verification

Passed:

- All nine asteroid variants remain ballistic hazards and create no ordinary projectile or mine during isolated 60-second simulations. Asteroid pairs separate and bounce without reward or damage farming.
- Genuine asteroid-to-alien impacts remain reward-free, can resolve an alien exactly once, and cannot resolve or reward a required asteroid.
- The six alien families retain bounded roles: scout/gunship strafe fire, striker/lancer telegraph charges, bombers place mines, and carriers launch configured children under the alien cap.
- Harrower and Leviathan instantiate from their own immutable definitions, phase safely, keep their circular arenas visible at legal ship edges, clear hostile ordnance on defeat, and wait for every surviving escort before hyperspace.
- Boss nodes, beams, volleys, dashes, mines, and children stay within shared collection caps. Stage 10 and Stage 20 transitions preserve the ship's screen-space anchor on narrow and desktop viewports.
- Asteroids, aliens, the player, and outward dashes remain inside the relevant rectangular battlefield; bosses and the player remain inside the visible circular arena.

## Upgrade and pickup verification

Passed:

- Eligible kills use a 48% drop chance and a two-kill pity boundary. The weighted pool includes all support and timed effects, Enigma at weight 36, and permanent module caches at weight 32; pickup creation and lifetime remain capped.
- Rapid Fire and Tri-Shot last 28 seconds, Piercing Rounds 26, Arc Burst 24, Nova Lance 30, Damage Amplifier 28, and Aegis Field 28. Each timer stacks additively to exactly four base durations and expires independently.
- Damage Amplifier scales outgoing player damage by 1.45 while active. Aegis Field reduces incoming damage by 32% while active. Both use explicit pickup silhouettes and checkpoint timers.
- Thirteen permanent modules stack through Mk V. The six added systems are Tesla Coil, Orbit Blades, Mine Layer, Shield Reactor, Overclock Matrix, and Tractor Field.
- Tesla chaining, orbit contacts, player-owned mine cadence/trigger/blast/lifetime, shield restoration, cooldown overclocking, and pickup attraction are deterministic fixed-step systems with finite values and enforced shared caps.
- Homing Salvo, Radial Array, Guardian Drones, Tesla Coil, Orbit Blades, Mine Layer, and Shield Reactor operate without requiring primary-fire input. Overclock and Tractor Field apply passively without creating unbounded entities.
- Enigma eases simulation over 0.72 seconds to a complete pause and deterministically offers exactly three distinct eligible cards. When available, every draft includes a permanent and a timed choice; fully capped builds receive bounded instant support fallbacks.
- Selection applies only the advertised choice once, persists the resulting checkpoint loadout, resumes with neutral input and one second of protection, and cannot be bypassed by cancel, Pause/Escape, portrait blocking, stale pointers, or held gamepad buttons.
- Void Pulse remains a finite local defense. It clears enemy rather than player mines and applies the active damage-amplifier multiplier without bypassing configured range or damage bounds.

## Progress, migration, and HUD verification

Passed:

- Progress keeps the existing `neon-voyage-progress-v1` key and uses strict schema 3: exact current keys, 20 integer-bounded checkpoints, 13 module tiers, seven temporary timers, and a 16,384-byte record limit.
- Exact legacy schema-2 records retain their historical seven-module/five-timer shape, Stage 1–9 bounds, and original timer ceilings during migration. Valid schema-1 unlock records migrate separately. Unknown keys, out-of-range tiers, oversized records, and malformed shapes fail closed.
- Checkpoints save only permanent module tiers and remaining temporary-effect time. Continue restores a fresh battlefield; hull, shield, score, position, velocity, clocks, cooldown phases, entities, effects, mines, drones, blades, and pending Enigma state are never serialized.
- All 20 saturated checkpoints fit within the storage limit. Reboot and Continue restore all 13 modules and all seven timers exactly, while old schema-2 saves preserve their original arsenal and receive safe zero values for new fields.
- Authored rewards at Stages 2, 4, 5, 6, 8, 9, 11, 12, 14, 15, 17, and 19 target the configured module. A capped target falls back through the bounded generic upgrade path; boss cores at Stages 10 and 20 grant once.
- The live HUD creates chips only for equipped permanent modules. The previous empty-slot grid is gone. A separate Timed row appears only while effects are active and updates visible whole-second countdowns without a live-region announcement every frame.
- Autonomous modules carry a text `AUTO` marker; the module strip is a semantic list without duplicate live announcements. Timed chips expose effect names and remaining seconds through accessible labels.
- Touch HUD rows are pointer-transparent, so module and timer information cannot steal either half of the two-stick control surface. Compact rows remain single-line and overflow horizontally; maximal-build visual density remains a hands-on acceptance item.
- Continue exposes 20 ordered cards, repeats lock checks in runtime logic, marks the last-played stage, and summarizes permanent/autonomous/timed checkpoint state including total temporary seconds.

## Input, lifecycle, and responsive verification

Passed in automated browser-VM regressions:

- Keyboard/mouse, gamepad, and independent movement and aim/fire touch sticks retain their prior ownership, analog response, capture-loss, malformed-terminal, visibility, page lifecycle, pause, and orientation cleanup guarantees.
- Touch capability comes from device signals or observed touch, so hybrid fine-pointer tablets retain touch controls. Initial stick contact is neutral, each pointer owns only one stick, and terminal events cannot relatch fire.
- Collecting Enigma immediately neutralizes keyboard, pointer, touch, and gamepad intent. Its frozen choice survives portrait rotation, visibility loss, page exit, blur, and lifecycle pause without rerolling or hidden selection.
- Portrait play is blocked behind an inert landscape gate. Returning to landscape preserves the same run or Enigma choice without replaying held input.
- Source contracts cover 568×320 and 667×375 compact landscapes, a 1024×768 tablet-class viewport, safe-area sizing, readable three-card Enigma layout, 44 px action targets, and pointer-transparent loadout rows.
- These are simulated viewport and input checks. Physical phone and iPad two-thumb feel, balance, readability, and audio acceptance remain pending.

## Rendering, offline, and repository verification

Passed:

- Twenty scene keyframes progress continuously from Earth and Mars through local authored deep-space worlds; the Stage 20 wrap does not reset scenery to Earth.
- Razor, prismatic, and monolith asteroids; lancer and gunship aliens; the Leviathan; Tesla chains; orbit blades; player mines; reactor/tractor fields; Amplifier; and Aegis have explicit renderer paths and finite silhouettes.
- Essential friendly and hostile silhouettes remain distinguishable in reduced-effects mode. Decorative glow, launch ornament, shake, and excess particles are suppressed without removing core projectiles or fields.
- The Content Security Policy denies unspecified sources and blocks runtime connections, frames, objects, fonts, media, workers, forms, and base-URI changes.
- Runtime source contains no remote URL, network API, telemetry, dynamic code, worker, module loader, package manifest, lockfile, or runtime dependency.
- All runtime resources are local, relative, valid under the `/Neon-Voyage/` GitHub Pages subpath, and usable through direct `file://` launch. The frozen tree has no symlinks and stays below conservative offline payload limits.
- Every runtime JavaScript file passes syntax checking; every runtime script and test suite is registered once; local Markdown links resolve; release text is free of conflict markers and whitespace damage.
- `SHA256SUMS` recursively and exactly covers every frozen release file outside explicit local-output exclusions and verifies each digest.
- The dependency-free browser VM loads every classic script, constructs the DOM and Canvas surfaces, renders frames and Continue previews, generates real Enigma card buttons, starts a run, and maintains one animation loop.
- CI retains read-only audit permissions and Pages publishes the unchanged repository root only from `main`, with no install or production build.

## Long-run verification

Passed:

- A deterministic 20-minute full-build expedition completes 72,000 fixed simulation steps with every Mk V module and every four-stack temporary timer active.
- The stress path visits all 20 stages and both boss types and observes Tesla chains, orbit blades, player mines, shield restoration, drones, homing/radial fire, and each player projectile source.
- Ship, camera, score, clocks, timers, and active entities remain finite. Asteroids, aliens, player/enemy projectiles, mines, pickups, effects, floaters, drones, and blades stay within their configured bounds.
- Repeating the long simulation with the same seed and inputs reproduces the same normalized snapshot and collection peaks.

## Reproduce

```sh
node tests/run.js
```

Expected result for this source snapshot: `147/147 tests passed`.

The suite reproduces dependency-free source, simulation, DOM, Canvas-call, storage, input, responsive-contract, and browser-VM checks. It is not a pixel-comparison test and does not claim a physical-device playthrough.

## Browser and publication boundary

- Prepublication automation includes the complete browser-VM boot and interaction smoke plus deterministic phone/tablet/desktop viewport contracts.
- The cloud browser cannot reach the workspace-local preview route. No prepublication hands-on cloud-browser play is claimed by this source audit.
- After protected merge and Pages deployment, release acceptance requires opening the exact live repository-subpath URL, confirming the deployed version, selecting **Play**, exercising a short combat interaction, checking desktop plus phone/tablet-class viewports, and reviewing console errors.
- Physical phone/iPad acceptance remains separate and pending unless a real device is explicitly observed.

## Repository protection and publication status

- The required pull-request check context remains exactly `Offline audit / audit`; `main` is protected from direct, force, and deletion workflows.
- This audit records the frozen source candidate for runtime version `v2026.8.15a`. It does not by itself prove a Git tag, GitHub Release, merge, Pages deployment, or live acceptance.
- Pull-request checks, merge state, immutable tagging, Pages deployment, and the post-deployment live Play observation are external publication gates recorded in GitHub history and the release handoff.
