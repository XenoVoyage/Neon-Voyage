# Neon Voyage v2026.8.20h — source audit

- Audited: 2026-08-20
- Targets: direct `file://` launch and GitHub Pages repository-subpath hosting
- Result: **PASS — 188/188 automated source checks**

Observed with Node v24.19.0 on Linux x86_64. The harness uses Node built-ins only; Node is not part of the browser game. Automated phone- and tablet-class evidence uses simulated layout boxes, viewports, Pointer Events, DOM behavior, and Canvas calls. It is not physical-device acceptance.

## Runtime properties

- Runtime dependencies: **0**
- Build step: **none**
- Required local server: **none**
- Remote runtime requests: **0 by design**
- Runtime files: local HTML, CSS, JavaScript, nine WebP scenery assets, and 46 transparent WebP gameplay assets
- Persistent data: separate strict local records for high score/preferences and schema-4 per-stage campaign loadouts
- Saved-data change in this checkpoint: **compatible schema-3/schema-2/schema-1 migration into seven bounded checkpoints**
- License: MIT

## v2026.8.20h verified changes

Source inspection, deterministic progression/combat/renderer regressions, the browser harness, the complete Stage 1–7 weapon journey, and the frozen full-suite gate establish these implemented contracts.

### Seven-stage expedition and earlier variety

- The configured journey now owns exactly seven finite stages. Titan Breach is Stage 2, a single Scout and then a Scout/Striker formation establish first contact at Stage 3, mixed alien and evolved-asteroid combat begins at Stage 4, the Harrower owns Stage 5, the anomaly siege owns Stage 6, and the Leviathan owns Stage 7.
- Stage 2 owns ten seeded roots with a five-root opening, pressure-bounded two-root reinforcement batches, one announced Colossal, and one announced Titan. Every required descendant, requeue, optional hazard, escort, and reserve root still belongs to the clean-field gate.
- Homing Salvo, Tractor Field, Guardian Drone, Radial Array, and Seeker Rack are guaranteed at Stages 1, 2, 3, 4, and 6. Five reward bands raise natural drops to 44/48/52/56/60 percent with pity after 3/2/2/2/2 eligible defeats, while Mk ceilings and stage gates remain bounded.
- Eight temporary effects last 42–48 seconds per pickup and stack to four base durations. Thruster Surge applies bounded acceleration and top-speed multipliers; all temporary timers remain independent and checkpointed.

### Combat and visual readability

- Void Pulse gives nearby asteroids one proximity-scaled inward impulse with an enforced 360 px/s cap, then applies configured damage. Aliens take configured Pulse damage without any velocity change.
- Destroying a crystal asteroid emits exactly eight seeded hostile crystal projectiles with finite 1.65-second life, capped enemy-projectile ownership, and no objective or split-tree membership. Cap pressure truncates safely instead of exceeding the shared bound.
- Three immutable normalized fracture patterns replace oversized straight crack marks. Their dark under-stroke and thin material highlight remain clipped to the rotating asteroid and never affect collision, health, descendants, or randomness.
- Every pickup retains its local chassis but adds a distinct semantic glyph, short readable label, and color treatment. The desktop objective line exposes `Shift` for Dash and `E` for Pulse; touch/coarse/compact layouts hide that keyboard-only hint.
- The player ship projects deterministic smoke below 60% hull, attached flame below 35%, and restrained electricity below 18%. Reduced-effects mode keeps the signals bounded and calmer.

### Save compatibility and finite state

- The `neon-voyage-progress-v1` key remains unchanged. Strict schema 4 stores seven checkpoints, all 13 module tiers, and all eight timers within the existing 16,384-byte limit.
- Exact historical schema-3 validation retains its 20-stage, 13-module, seven-timer shape and original timer ceilings before migration. Checkpoints compact through `1→1`, `2–4→2`, `5–7→3`, `8–9→4`, `10→5`, `11–15→6`, and `16–20→7`; converging checkpoints preserve the strongest tier and timer value. Exact schema-2 and schema-1 migrations remain covered.
- The deterministic 20-minute full-build stress run completes 72,000 fixed steps, visits all seven stages and both bosses repeatedly, exercises crystal shrapnel, evolved hazards, reflection, every Mk V system, and all eight four-stack timers, and keeps every collection finite and capped. Identical seed and input reproduce the same normalized snapshot.

## Prior v2026.8.20g frozen evidence

The following reinforcement contracts were observed in the prior frozen `v2026.8.20g` audit and remain historical context.

### Finite Inner Belt reinforcement surge

- Stage 2 owns one complete seeded reserve of 16 required asteroid roots. Six roots form the opening field; later batches contain at most two roots and release only after a 0.45-second minimum interval while current-wave pressure is at or below four.
- Live pressure counts every encounter-owned asteroid or alien at least once, including zero-reward split descendants. The director restores hard-cull requeues before fresh reserve roots, so replenishment cannot duplicate, discard, or silently complete an objective.
- Ten opening roots precede one announced Colossal. Its exact one-to-three-to-six split tree and all later crystal, volatile, armored, and split descendants block stage completion until the authored reserve and field are both empty.
- Stage-owned 0.8 durability scaling offsets the denser field without changing global asteroid definitions, collision radii, ballistic movement, split geometry, score, or saved data.
- The objective exposes the complete finite threat count and the Belt Surge label instead of presenting the encounter as endless generation.

## Prior v2026.8.20f frozen evidence

The following expanded-field and quick-fire contracts were observed in the prior frozen `v2026.8.20f` audit and remain historical context.

Source inspection, deterministic camera/input/renderer regressions, and the frozen full-suite gate establish these implemented contracts.

### Expanded finite fields and bounded camera

- Every normal and boss stage now derives one finite combat field from the live game-shell dimensions at 1.64 viewport widths by 1.44 viewport heights, subject to configured minimum half-extents. The same field continues to own player and encounter containment.
- Normal play follows the ship through a viewport-relative dead zone with bounded velocity lookahead. Camera target and final position clamp so the viewport never reveals outside the field; cinematic camera ownership remains separate and unchanged.
- Resize, early-stage spawn, boss entry, boss-node containment, Dash-to-edge recovery, Stage 1–20 progression, next-sector wrap, fixed-step behavior, collection caps, and origin rebasing remain deterministic and finite.

### Off-screen objective cues

- Presentation-only target projection considers current-generation living asteroids, aliens, bosses, and boss nodes; visible, stale, dead, or protected boss bodies are excluded as appropriate.
- At most six cues intersect a safe viewport margin. Stable priority favors exposed boss nodes, bosses, aliens, then asteroids; nearby and over-cap objectives aggregate into accurate counts instead of disappearing.
- Cue miniatures reuse existing repository-local target art with procedural fallback. Reduced effects removes pulse and shadow, and cue generation consumes no simulation random draw or saved state.

### Reliable desktop tap fire

- A click or Space press released between two fixed updates queues exactly one shot on the next update. Holding either input retains the existing weapon cadence, while release cannot create stuck or automated fire.
- The local player-interceptor favicon removes the otherwise harmless missing-favicon request without adding a resource, dependency, or network path.

## Prior v2026.8.20e frozen evidence

The following complete gameplay-art and audio contracts were observed in the prior frozen `v2026.8.20e` audit and remain historical context.

### Complete realistic gameplay presentation

- Forty new original transparent WebPs extend the six accepted subjects across every physical asteroid variant, alien class, command ship and node, player/hostile projectile family, mine, pickup chassis, Guardian Drone, Orbit Blade, material impact, and destruction burst. All 46 gameplay rasters total 507,512 bytes and load through one repository-relative cache with no dependency, build, account, request, or executable content.
- Every new source was alpha-inspected and the encoded families were visually inspected together on a dark field. Art direction requires orthographic silhouettes, believable self-lighting, transparent edges, and no floor, cast shadow, drop shadow, text, logo, watermark, or background glow box. The previously accepted six encoded assets remain unchanged. This is static source-art evidence, not live in-motion acceptance.
- Immutable maps select an exact raster for all 13 asteroid presentations including both Auric Shard variants, seven alien classes, two bosses and their nodes, ten player/hostile projectile presentations, two mines, the shared pickup chassis, shield pickup, drone, blade, and five effect materials. Pending or failed images use established procedural fallbacks.
- Code-drawn telegraphs, reflection and player shields, crack stages, hazard pulses/fields, pickup symbols, targeting cues, and range indicators remain authoritative live-state overlays. Presentation-only effect sprites use the existing finite effect collection and consume no simulation random draw.
- Raster drawing changes no entity state, collision radius, hitbox, timing, balance, random sequence, collection cap, input, accessibility, saved-data schema/key, or migration. Reduced-effects branches remain bounded and all resources remain compatible with direct-file and repository-subpath hosting.
- Renderer coverage freezes all 46 exact local paths and exercises every mapped draw family, variant, projectile ownership, pickup chassis, support object, and effect material.

### Material-aware synthesized audio

- The optional Web Audio engine now distinguishes all player weapon families; Scout/heavy/lancer/gunship and boss registers; shield, hull, asteroid, alien, and boss impacts; target-scaled destruction; pickups, upgrades, Dash, Pulse, boss beam, arena entry, and ambient cadence.
- Fixed cue-key cooldowns suppress collision and volley spam. The pre-existing active-source accounting still caps at 24 nodes, disconnects completed graphs, creates no per-frame oscillator, loads no audio file, and treats context creation/resume refusal as optional failure.
- Browser-VM coverage verifies the complete cue surface, retirement of the old generic cue methods, the 24-node constructor ceiling, every authored player-weapon branch, and safe calls without an available audio context.

## Prior v2026.8.20d frozen evidence

The six-subject player/common-rock/Scout/plasma/impact/shield direction was accepted before this complete-family expansion. Those local rasters and their presentation-only compatibility contract are preserved unchanged.

## Prior v2026.8.20c frozen evidence

The following restoration evidence was observed in the prior frozen `v2026.8.20c` audit and remains historical context.

### Rejected visual-pilot withdrawal

- The `v2026.8.20b` procedural geometry pilot was withdrawn after hands-on visual acceptance found its asteroid treatment worse and its preserved player silhouette insufficiently changed against the realistic scenery.
- Ship, asteroid, alien, projectile, pickup, and particle drawing returned to the prior accepted `v2026.8.20a` presentation. No gameplay, collision, hitbox, timing, input, accessibility, saved-data, random, or collection-cap behavior changed.
- The deployed `v2026.8.20b` changelog record remains historical. A ground-up realistic local-raster proof is explicitly separated from this restoration so it can be reviewed at gameplay size before complete asset-family production.

## Prior v2026.8.20a frozen evidence

Source inspection, focused regression coverage, and the frozen full-suite gate establish these implemented contracts.

### Persistence and runtime ownership

- Module caches, authored milestones, Enigma module choices, boss-core clears, and boss cores with surviving escorts each write one campaign checkpoint per reward transaction. The storage key, strict schema-3 record, size bound, validators, and schema-2/schema-1 migrations are unchanged.
- The configured encounter array now owns runtime sector length. Validation, progression, stage wrapping, checkpoint bounds, and debug stage selection derive from that array length; the deliberately tuned twenty-stage difficulty curve remains separate.
- Obsolete circular-arena containment code, unused arena-shape and cinematic-start metadata, the noncanonical battlefield pickup alias, and unconsumed UI class state were removed only after complete reference searches. Rectangular boss containment, beam/victory radius use, transition entry coordinates, and canonical module-reward configuration remain intact.
- Immutable asteroid, alien, and pickup presentation maps are created once with the renderer module instead of being rebuilt inside per-entity draw calls; visual values and bounded render behavior are unchanged.

### Interface, documentation, and governance

- Small menu metadata now uses a `0.6rem` size and the existing `--ink-dim` color, which measures 9.26:1 against the declared `--void` base instead of the prior 4.28:1 pairing.
- The README keeps an explicit browser-play heading and makes the existing Earth-orbit gameplay image a direct, action-labelled link to the verified GitHub Pages repository-subpath URL. No new image, runtime request, or dependency was added.
- Duplicate CSS declarations, impossible selector states, and redundant presentational class tokens were consolidated without hiding accessible text or changing Enigma selection semantics. Repository tests verify the grouped compact assistive-text rules and menu contrast contract.
- The contributor handoff now owns Git, pull-request, release, and stale-branch policy in one section. Governance tests retain the operational workflow and deletion-proof contracts without locking incidental prose.

### Workflow and deployment integrity

- Both workflows now use the Node-24-native `actions/checkout@v7` and `actions/setup-node@v7` majors while preserving Node 22 as the explicit verification baseline.
- Pages now uses `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5`, and `actions/deploy-pages@v5`. The artifact step explicitly includes hidden repository-root files so `.nojekyll` remains part of the unchanged static site.
- Workflow triggers, permissions, the required `Offline audit / audit` context, repository-root deployment, runtime files, dependencies, build behavior, and saved data are unchanged.

## Prior v2026.8.20 frozen evidence

The following contracts were observed in the prior frozen `v2026.8.20` audit (177/177 checks) and are preserved here as historical context. The current frozen gate re-exercises their registered coverage alongside the maintenance checks above.

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

## Earlier v2026.8.15c frozen evidence

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

The frozen run registered and passed 188 checks across configuration/core (13), offline/repository (16), browser VM (4), progress (18), mobile input (46), gameplay (70), visuals (19), and stress (2).

Current `v2026.8.20h` coverage adds the seven-stage journey, schema-3 compaction, earlier alien and module variety, higher/longer rewards, Thruster Surge, asteroid-only Pulse attraction, finite crystal shrapnel, semantic pickup presentation, restrained fractures, damaged-ship effects, and desktop action hints while retaining expanded-field containment, bounded camera follow, capped clustered off-screen cues, queued quick-tap fire, complete mapped renderer ownership, bounded audio vocabulary, accessibility, deterministic gameplay, Node-24-native workflow, and Pages-artifact contracts from prior checkpoints.

Retained `v2026.8.20` deterministic coverage exercises shell/viewport disagreement and dynamic resizing; pointer-only reticle rendering; death-effect rendering without ship-owned visuals; clear-versus-travel presentation; terminal-but-delayed game-over focus and effect timing; delayed stationary target acquisition, deterministic tie order, bounded turn and fire; target lock and reacquisition; touch and hybrid-manual takeover; both command ships' live-node protection; and same-landscape orientation cleanup.

The browser VM loads every classic script, constructs the DOM and Canvas surfaces, starts a run, creates real Enigma buttons/previews, projects shield and compact summaries, and keeps one animation loop. Responsive contracts include 568×320 and 667×375 phone landscapes and a 1024×768 tablet-class viewport. This is automated source and simulated-browser evidence, not a pixel-comparison test or hands-on device play.

`SHA256SUMS` exactly covered and verified all 93 release files outside its documented self/exclusion rules.

## Reproduce

```sh
node tests/run.js
sha256sum --check SHA256SUMS
```

Observed result for this frozen source tree: `188/188 tests passed`. A separate `sha256sum --check SHA256SUMS` pass verified all 93 manifest entries.

## Browser and publication boundary

- No prepublication hands-on browser acceptance of the new camera, target cues, or complete-set visual/audio motion is claimed by this source audit. Automated browser-VM and deterministic renderer evidence are reported separately above.
- No post-change physical phone or iPad play is claimed. Two-thumb feel, browser-toolbar behavior on real devices, target selection feel, balance, readability, and audio acceptance remain pending.
- After protected merge and Pages deployment, acceptance requires opening the exact live repository-subpath URL, confirming the deployed version, selecting **Play**, exercising a short combat interaction, and checking the browser console.
- This source audit does not itself prove a pull-request check, merge, Pages deployment, immutable tag, GitHub Release, or live Play result. Those are external publication gates.
