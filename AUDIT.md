# Neon Voyage v2026.8.20 — source audit

- Audited: 2026-08-20
- Targets: direct `file://` launch and GitHub Pages repository-subpath hosting
- Result: **PASS — 177/177 automated source checks**

Observed with Node v24.19.0 on Linux x86_64. The harness uses Node built-ins only; Node is not part of the browser game. Automated phone- and tablet-class evidence uses simulated layout boxes, viewports, Pointer Events, DOM behavior, and Canvas calls. It is not physical-device acceptance.

## Runtime properties

- Runtime dependencies: **0**
- Build step: **none**
- Required local server: **none**
- Remote runtime requests: **0 by design**
- Runtime files: local HTML, CSS, JavaScript, and nine WebP scenery assets
- Persistent data: separate strict local records for high score/preferences and schema-3 per-stage campaign loadouts
- Saved-data change in this checkpoint: **none**
- License: MIT

## v2026.8.20 verified changes

Source inspection, focused regression coverage, and the frozen full-suite gate establish these implemented contracts.

### Mobile field ownership and pointer presentation

- Renderer CSS-space dimensions now come from the live `#game-shell` layout rectangle. The capped device-pixel ratio affects only the Canvas backing store; renderer state does not write competing inline Canvas CSS dimensions from `window.innerWidth` or `window.innerHeight`.
- Window, orientation, and `visualViewport` resize paths use the same shell-owned resize operation for the renderer, combat field, arena containment, and orientation state.
- Browser-harness coverage supplies a window taller than its game shell, verifies the backing store and combat bounds follow the shell, then changes the shell and dispatches a visual-viewport resize.
- The cyan/magenta reticle draws only when active mouse or pen pointer aim is projected to the renderer. Touch and neutral aim do not draw it; a later non-touch pointer move on a hybrid device may restore it.

### Stationary touch auto-aim

- A right-stick gesture begins in a neutral `pending` state. After the configured 0.10-second hold, it acquires the nearest actionable asteroid, alien, living boss node, or eligible command-ship body and fires through the existing player cadence.
- Target selection uses the existing finite threat collections and a deterministic strict-distance comparison. A valid target remains locked to avoid jitter; a dead or culled target is released and the bounded scan may reacquire another.
- Any shaped directional deflection latches `manual` aim for the rest of that pointer gesture. Returning to the deadzone cannot reactivate auto-aim, and derived automatic fire does not overwrite the manual touch-fire intent.
- Live command-ship nodes keep their damage-reduced body out of auto-aim eligibility. The nodes and other actionable threats remain eligible; after all nodes are destroyed, the body may be acquired. Leviathan reflection remains a separate node-dependent defense, and manual touch aim, mouse, keyboard, and gamepad behavior remain independent.
- Active keyboard/gamepad direction or a fresh mouse/pen pointer aim suppresses the effective touch auto target for both turning and firing. The bounded touch lock may remain available, but it cannot override or add fire to that manual input.
- Release, cancellation, capture loss, pause, visibility, page lifecycle, and orientation cleanup neutralize the gesture timer, mode, target, and fire ownership. Same-landscape orientation changes are covered explicitly.

### Stage-clear and defeat presentation

- Completing a stage now enters an input-locked one-second `clear` phase. Combat, encounter advancement, rewards, and random progression remain frozen while only already bounded final effects and floaters advance and expire.
- The clear phase then hands off to the existing `travel` phase. Its configured 1.65-second hyperspace path, streaks, scene crossfade, screen anchor, direction, world cleanup, and final encounter advancement remain owned by the original cinematic state.
- Pausing freezes both presentation phases. Hyperspace streaks are restricted to `travel`, so the clear beat reads as a completed battlefield rather than an early transit.
- Lethal damage still makes the run logically terminal in the damage frame. Simulation, input, rewards, collisions, audio cadence, and random progression remain frozen while a capped presentation-only path advances the existing destruction effects for 1.2 seconds.
- The game-over overlay remains hidden, inert, and unfocused during that death beat. After the finite timer completes, it appears and its primary action receives focus; no second gameplay mode or animation loop was added.

## Prior frozen baseline evidence

The following properties were observed in the prior frozen `v2026.8.15c` audit (168/168 checks) and are preserved here as historical context. The current frozen gate re-exercises their registered coverage alongside the new checks above.

### Campaign and progression

- The immutable configuration defines 20 finite stages. Stages 1–5 build asteroid pressure, Stages 6–9 stage familiar alien roles, Stage 10 contains the Harrower, Stages 11–15 introduce evolved anomaly counterplay, Stages 16–19 stage advanced fleets, and Stage 20 contains the Leviathan.
- Boss ownership remains config-driven. Harrower and Leviathan reuse the responsive normal combat field with subtle boundary cues; the separate glowing circular boss boundary is absent. Defeating Stage 20 advances to bounded Sector 2 without visually returning to Earth.
- Non-boss root counts rise within each authored arc: 12/14/16/18, 12/14/16/18, 14/16/18/20, and 14/16/18/20. Titan stages remain finite specialist encounters, and every stage waits for required descendants, optional hazards, carrier children, requeues, and boss escorts.
- Mixed-kind asteroid groups use deterministic balanced bags: each authored kind differs by at most one root, the same seed repeats the same order, and downstream random state consumes the same number of draws. Late anomaly waves retain their finite totals while limiting guaranteed massive-root clustering.
- Natural reward pacing uses six stage bands. Drop chance rises 26/28/29/31/34/38 percent; pity occurs after 4/4/4/4/3/3 eligible kills; module-cache weight, permanent-draft chance, unlock catalog, and Mk I–V ceiling increase later in the journey.
- Only Stages 3, 6, 9, 12, 15, and 18 grant authored milestone modules. Natural drops, Enigma cards, caches, milestones, and boss cores use one bounded eligibility path.
- Existing schema-3 and migrated legacy loadouts are never clamped or downgraded by the new reward gates. A grandfathered future module remains usable but cannot gain another tier before its authored unlock.
- A deterministic weapon-driven run visits Stages 1–20 in order, resolves mandatory Enigma choices, defeats both bosses using normal player systems, wraps to Sector 2, and remains within every collection cap.

### Evolved threats and counterplay

- Auric Colossi create an exact bounded 1→3→6 required split tree. Descendants retain objective ownership, configured health, explosive/magnetic variant, and finite state through hard-cull requeues.
- Magnetic shards remain ballistic while their combined ship pull is aggregated and clamped for acceleration and speed. Explosive shards apply one local death blast; a lethal trade records earned score and high score exactly once before terminating the frame.
- Coronas remain ballistic and own a deterministic warning/active/cooldown rotating beam plus a local death blast. Pause and hard-cull paths preserve finite hazard phase, timer, and angle.
- Gunships lock the warned laser line, then sweep it only at the bounded authored angular rate. The damaging line matches the telegraph, uses no projectile allocation, stops later simulation after a lethal hit, and restores its exact angle after requeue.
- Brood Carriers reduce distant direct damage to 30 percent, become normally vulnerable inside 300 px, and launch only their configured Lancer children. Stable lineage survives repeated hard culls without exceeding the six-child lifetime cap.
- Leviathan reflection has warning, active, and cooldown phases and exists only while shield nodes survive. It reflects capped direct player bullets that hit the boss body, does not recursively reflect hostile fire, and leaves node hits and other authored module counters distinct.
- Compact 568×320, tablet-class, and desktop boss simulations keep both command ships and every living node circle inside the shared responsive field and visible viewport. Boss entries begin without ship overlap and an attack-disabled two-second entry window causes no contact damage. Boss death still waits for surviving escorts and clears owned hostile ordnance safely.

### Player power, Enigma, and HUD

- Thirteen permanent systems stack through Mk V. Seven temporary effects last 24–30 seconds per pickup, stack additively to four base durations, expire independently, and preserve the existing checkpoint schema.
- Homing Salvo, Radial Array, Guardian Drone, Tesla Coil, Orbit Blades, Mine Layer, Shield Reactor, Overclock Matrix, and Tractor Field obey exact acquisition or influence radii. Autonomous systems remain idle without an in-range target where required.
- Shield reserve is capped at 60, shield absorption drains at 1.25 points per damage, and Shield Reactor restores only the weaker configured amounts. The HUD is hidden at zero and exposes its exact value and maximum when charged.
- Enigma deterministically slows combat to a complete pause and offers three distinct eligible cards. Early bands may omit a permanent card; all paths retain bounded temporary/support fallbacks and cannot bypass the mandatory selection.
- Each Enigma card owns one local decorative Canvas preview driven by the existing animation frame. It adds no asset, random source, listener, or animation loop and remains finite in reduced-effects mode.
- Desktop HUD rows list equipped systems and active timed countdowns only. Compact touch layouts replace each row with one pointer-transparent accessible summary so status never steals either movement/aim touch half.
- Independent touch sticks retain pointer-ID roles while their enlarged bases follow bounded drag overshoot. Idle stick hotspots remain hidden, unavailable Dash/Pulse slots pass touches through to the aim half, and the action buttons become visible, focusable, and interactive only at the same readiness thresholds used by simulation.
- Late-stage and boss nebula washes are locally rendered, cached on resize, interpolated with the existing scene handoff, and subdued by reduced-effects mode.

### Persistence and finite state

- The existing `neon-voyage-progress-v1` key and strict schema 3 are unchanged: exact 13-module/seven-timer keys, 20 bounded checkpoints, Mk I–V tiers, four-duration ceilings, and a 16,384-byte record limit.
- Exact schema-2 records retain their historical seven-module/five-timer shape, Stage 1–9 bounds, and historical timer ceilings during migration. Valid schema-1 unlock records migrate separately; malformed, unknown, oversized, and out-of-range records fail closed.
- Checkpoints contain only permanent module tiers and remaining temporary-effect time. Hull, shield, score, position, velocity, clocks, cooldown phases, entities, effects, mines, drones, blades, hazards, boss state, and Enigma state are never serialized.
- Extreme high score clamps and reloads as the existing valid 999,999,999 maximum. Storage denial and malformed local records remain safe.
- The deterministic 20-minute full-build stress run completes 72,000 fixed steps, visits all 20 stages and both bosses, exercises evolved hazards, reflection, every Mk V system, and every four-stack timer, and keeps all state finite and capped. Repeating with the same seed and inputs reproduces the same normalized snapshot.

## Automated evidence boundary

The frozen run registered and passed 177 checks across configuration/core (13), offline/repository (16), browser VM (3), progress (16), mobile input (45), gameplay (67), visuals (15), and stress (2).

New deterministic coverage exercises shell/viewport disagreement and dynamic resizing; pointer-only reticle rendering; death-effect rendering without ship-owned visuals; clear-versus-travel presentation; terminal-but-delayed game-over focus and effect timing; delayed stationary target acquisition, deterministic tie order, bounded turn and fire; target lock and reacquisition; touch and hybrid-manual takeover; both command ships' live-node protection; and same-landscape orientation cleanup.

The browser VM loads every classic script, constructs the DOM and Canvas surfaces, starts a run, creates real Enigma buttons/previews, projects shield and compact summaries, and keeps one animation loop. Responsive contracts include 568×320 and 667×375 phone landscapes and a 1024×768 tablet-class viewport. This is automated source and simulated-browser evidence, not a pixel-comparison test or hands-on device play.

`SHA256SUMS` exactly covered and verified all 47 release files outside its documented self/exclusion rules.

## Reproduce

```sh
node tests/run.js
sha256sum --check SHA256SUMS
```

Observed result for this frozen source tree: `177/177 tests passed`. A separate `sha256sum --check SHA256SUMS` pass verified all 47 manifest entries.

## Browser and publication boundary

- No prepublication hands-on browser play is claimed.
- No post-change physical phone or iPad play is claimed. Two-thumb feel, browser-toolbar behavior on real devices, target selection feel, balance, readability, and audio acceptance remain pending.
- After protected merge and Pages deployment, acceptance requires opening the exact live repository-subpath URL, confirming the deployed version, selecting **Play**, exercising a short combat interaction, and checking the browser console.
- This source audit does not itself prove a pull-request check, merge, Pages deployment, immutable tag, GitHub Release, or live Play result. Those are external publication gates.
