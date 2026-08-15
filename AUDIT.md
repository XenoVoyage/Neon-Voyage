# Neon Voyage v2026.8.15b — source audit

- Audited: 2026-08-15
- Targets: direct `file://` launch and GitHub Pages repository-subpath hosting
- Result: **PASS — 167/167 automated source checks**

Observed with Node v24.19.0 on Linux x86_64. The harness uses Node built-ins only; Node is not part of the browser game. Automated phone- and tablet-class evidence uses simulated viewports, Pointer Events, DOM behavior, and Canvas calls. It is not physical-device acceptance.

## Runtime properties

- Runtime dependencies: **0**
- Build step: **none**
- Required local server: **none**
- Remote runtime requests: **0 by design**
- Runtime files: local HTML, CSS, JavaScript, and nine WebP scenery assets
- Persistent data: separate strict local records for high score/preferences and schema-3 per-stage campaign loadouts
- License: MIT

## Campaign and progression

Passed:

- The immutable configuration defines 20 finite stages. Stages 1–5 build asteroid pressure, Stages 6–9 stage familiar alien roles, Stage 10 contains the Harrower, Stages 11–15 introduce evolved anomaly counterplay, Stages 16–19 stage advanced fleets, and Stage 20 contains the Leviathan.
- Boss ownership remains config-driven. Harrower uses a circular arena; Leviathan uses a responsive rectangular field. Defeating Stage 20 advances to bounded Sector 2 without visually returning to Earth.
- Non-boss root counts rise within each authored arc: 12/14/16/18, 12/14/16/18, 14/16/18/20, and 14/16/18/20. Titan stages remain finite specialist encounters, and every stage waits for required descendants, optional hazards, carrier children, requeues, and boss escorts.
- Natural reward pacing uses six stage bands. Drop chance rises 26/28/29/31/34/38 percent; pity occurs after 4/4/4/4/3/3 eligible kills; module-cache weight, permanent-draft chance, unlock catalog, and Mk I–V ceiling increase later in the journey.
- Only Stages 3, 6, 9, 12, 15, and 18 grant authored milestone modules. Natural drops, Enigma cards, caches, milestones, and boss cores use one bounded eligibility path.
- Existing schema-3 and migrated legacy loadouts are never clamped or downgraded by the new reward gates. A grandfathered future module remains usable but cannot gain another tier before its authored unlock.
- A deterministic weapon-driven run visits Stages 1–20 in order, resolves mandatory Enigma choices, defeats both bosses using normal player systems, wraps to Sector 2, and remains within every collection cap.

## Evolved threats and counterplay

Passed:

- Auric Colossi create an exact bounded 1→3→6 required split tree. Descendants retain objective ownership, configured health, explosive/magnetic variant, and finite state through hard-cull requeues.
- Magnetic shards remain ballistic while their combined ship pull is aggregated and clamped for acceleration and speed. Explosive shards apply one local death blast; a lethal trade records earned score and high score exactly once before terminating the frame.
- Coronas remain ballistic and own a deterministic warning/active/cooldown rotating beam plus a local death blast. Pause and hard-cull paths preserve finite hazard phase, timer, and angle.
- Gunships lock the warned laser line, then sweep it only at the bounded authored angular rate. The damaging line matches the telegraph, uses no projectile allocation, stops later simulation after a lethal hit, and restores its exact angle after requeue.
- Brood Carriers reduce distant direct damage to 30 percent, become normally vulnerable inside 300 px, and launch only their configured Lancer children. Stable lineage survives repeated hard culls without exceeding the six-child lifetime cap.
- Leviathan reflection has warning, active, and cooldown phases and exists only while shield nodes survive. It reflects capped direct player bullets that hit the boss body, does not recursively reflect hostile fire, and leaves node hits and other authored module counters distinct.
- Compact 568×320 and desktop boss simulations keep every living node circle inside its authored arena/field and visible viewport. Boss death still waits for surviving escorts and clears owned hostile ordnance safely.

## Player power, Enigma, and HUD

Passed:

- Thirteen permanent systems stack through Mk V. Seven temporary effects last 24–30 seconds per pickup, stack additively to four base durations, expire independently, and preserve the existing checkpoint schema.
- Homing Salvo, Radial Array, Guardian Drone, Tesla Coil, Orbit Blades, Mine Layer, Shield Reactor, Overclock Matrix, and Tractor Field obey exact acquisition or influence radii. Autonomous systems remain idle without an in-range target where required.
- Shield reserve is capped at 60, shield absorption drains at 1.25 points per damage, and Shield Reactor restores only the weaker configured amounts. The HUD is hidden at zero and exposes its exact value and maximum when charged.
- Enigma deterministically slows combat to a complete pause and offers three distinct eligible cards. Early bands may omit a permanent card; all paths retain bounded temporary/support fallbacks and cannot bypass the mandatory selection.
- Each Enigma card owns one local decorative Canvas preview driven by the existing animation frame. It adds no asset, random source, listener, or animation loop and remains finite in reduced-effects mode.
- Desktop HUD rows list equipped systems and active timed countdowns only. Compact touch layouts replace each row with one pointer-transparent accessible summary so status never steals either movement/aim touch half.
- Late-stage and boss nebula washes are locally rendered, cached on resize, interpolated with the existing scene handoff, and subdued by reduced-effects mode.

## Persistence and finite state

Passed:

- The existing `neon-voyage-progress-v1` key and strict schema 3 are unchanged: exact 13-module/seven-timer keys, 20 bounded checkpoints, Mk I–V tiers, four-duration ceilings, and a 16,384-byte record limit.
- Exact schema-2 records retain their historical seven-module/five-timer shape, Stage 1–9 bounds, and historical timer ceilings during migration. Valid schema-1 unlock records migrate separately; malformed, unknown, oversized, and out-of-range records fail closed.
- Checkpoints contain only permanent module tiers and remaining temporary-effect time. Hull, shield, score, position, velocity, clocks, cooldown phases, entities, effects, mines, drones, blades, hazards, boss state, and Enigma state are never serialized.
- Extreme high score clamps and reloads as the existing valid 999,999,999 maximum. Storage denial and malformed local records remain safe.
- The deterministic 20-minute full-build stress run completes 72,000 fixed steps, visits all 20 stages and both bosses, exercises evolved hazards, reflection, every Mk V system, and every four-stack timer, and keeps all state finite and capped. Repeating with the same seed and inputs reproduces the same normalized snapshot.

## Automated evidence boundary

The frozen run registered and passed 167 checks across configuration/core (13), offline/repository (16), browser VM (3), progress (16), mobile input (39), gameplay (66), visuals (12), and stress (2). `SHA256SUMS` exactly covered and verified all 47 release files outside its documented self/exclusion rules.

The browser VM loads every classic script, constructs the DOM and Canvas surfaces, starts a run, creates real Enigma buttons/previews, projects shield and compact summaries, and keeps one animation loop. Responsive contracts cover 568×320 and 667×375 phone landscapes and a 1024×768 tablet-class viewport. This is automated source and simulated-browser evidence, not a pixel-comparison test or hands-on device play.

## Reproduce

```sh
node tests/run.js
```

Observed result for this frozen source tree: `167/167 tests passed`.

## Browser and publication boundary

- No prepublication hands-on browser play is claimed; the cloud browser cannot reach the workspace-local preview route.
- Physical phone and iPad two-thumb feel, balance, readability, and audio acceptance remain pending.
- After protected merge and Pages deployment, release acceptance requires opening the exact live repository-subpath URL, confirming the deployed version, selecting **Play**, exercising a short combat interaction, and checking the browser console.
- This audit does not itself prove a pull-request check, merge, Pages deployment, immutable tag, GitHub Release, or live Play result. Those are external publication gates.
