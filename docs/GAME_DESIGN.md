# Neon Voyage game design

This document defines the intended player experience. `js/config.js` remains the source of truth for exact values, stage composition, timing, balance, and caps.

## Vision

Neon Voyage is a focused space-arcade expedition that begins above a familiar Earth and steadily moves into stranger, more dangerous territory. A complete run should feel readable, responsive, and finite: every battlefield has a purpose, every threat can be cleared, and each stage visibly advances the voyage.

| Pillar | Direction |
| --- | --- |
| Immediate control | Movement, aiming, firing, Dash, and Void Pulse respond predictably on every supported input |
| Finite momentum | Authored waves end cleanly and transition quickly into the next stage |
| Readable danger | Threat shape, color, motion, damage cracks, warnings, and field edges communicate risk |
| Build variety | Stacking temporary weapons, Enigma choices, and bounded Mk V modules shape each campaign |
| Lightweight craft | The game stays local, fast, and dependency-free without sacrificing atmosphere |

## Core loop

1. Enter a stage with a fresh battlefield and the checkpoint's saved weapon loadout.
2. Move, aim, fire, Dash, and use Void Pulse to survive its finite waves.
3. Break asteroids, defeat spacecraft, stack field pickups, and choose among Enigma enhancements.
4. Clear every encounter-owned threat.
5. Travel through hyperspace to the next authored stage.
6. Defeat the Harrower at Stage 10, break through the evolved frontier, defeat the Leviathan at Stage 20, then continue into a harder sector or return later through an earned checkpoint.

## Journey

| Stage | Encounter | Purpose | Clear reward |
| --- | --- | --- | --- |
| 1 | Earth Orbit | Learn movement and fire against a safe opening asteroid field | — |
| 2 | Inner Belt | Introduce crystal, volatile, and armored hazards | — |
| 3 | Deep Drift | Increase mixed asteroid pressure as familiar space recedes | Homing Salvo tier |
| 4 | Shattered Frontier | Introduce Auric Colossi, mixed shard counterplay, and colossal split pressure | — |
| 5 | Titan Gate | Break the Titan and an Auric Colossus while controlling their surrounding hazards | — |
| 6 | First Contact | Meet alien scouts without removing the physical asteroid field | Guardian Drone tier |
| 7 | Strike Wing | Learn telegraphed striker charges beside the scout screen | — |
| 8 | Raid Fleet | Add bombers and bounded carrier-supported formations | — |
| 9 | Command Screen | Break the capital ship's final pickets and carriers | Shield Reactor tier |
| 10 | Harrower Field | Defeat the Harrower and every surviving escort | Boss-core upgrade or capped overflow |
| 11 | Ion Graveyard | Enter the evolved anomaly arc against razor and prismatic fields | — |
| 12 | Prism Rift | Cross refracting prismatic and volatile formations | Prism Fan tier |
| 13 | Gravity Scar | Control dense monoliths inside a collapsing field | — |
| 14 | Fractured Halo | Survive Auric, razor, monolith, and colossal split pressure | — |
| 15 | Anomaly Crown | Read Corona beams while shattering an evolved Titan court | Overclock Matrix tier |
| 16 | Vanguard Swarm | Meet advanced lancers before heavier fleet weapons arrive | — |
| 17 | Null Phalanx | Add warning/active Gunship lasers to coordinated lancer formations | — |
| 18 | Siege Choir | Introduce armored Brood Carriers and their bounded lancer lineage | Seeker Rack tier |
| 19 | Sovereign Guard | Clear the Leviathan's densest mixed fleet and Corona screen | — |
| 20 | Leviathan Field | Defeat the Leviathan and every surviving escort | Boss-core upgrade or capped overflow |

Stages 1–5 form an accessible asteroid-and-anomaly opening; ordinary alien spacecraft do not appear before Stage 6. Stages 6–9 introduce scout, striker, bomber, and carrier roles in sequence before the first command-ship battle. Stages 11–15 add evolved asteroid counterplay, while Stages 16–19 introduce lancer, Gunship, then Brood Carrier novelty before the Stage 20 boss. Authored group counts and the bounded health, damage, speed, fire-rate, and score curves increase pressure across the journey without turning any stage into endless spawning. Later sectors repeat the complete journey at the bounded final reward band and with deep-space scenery rather than returning visually to Earth.

## Player systems

Movement is analog where the device supports it. Aim direction persists after release so the ship does not snap to an unrelated heading. Dash provides a short repositioning burst with a cooldown. Void Pulse is a charged local defense: it protects the nearby area but is not a screen-wide clear.

Keyboard and mouse, gamepad, and touch share the same simulation actions. Mobile play uses landscape orientation and two independent floating sticks. The left half owns movement; the right half owns aim and automatic fire. Each enlarged stick begins under its thumb and follows only when that thumb moves beyond the configured radius, preserving analog deflection without leaving the control behind. A right-stick touch held at neutral for 0.10 seconds locks the nearest actionable asteroid, spacecraft, or exposed boss target and reacquires only when that target is gone. Any manual deflection immediately latches manual aim for the rest of that pointer gesture, so returning the thumb to center cannot unexpectedly take control back. While either command ship's nodes survive, stationary auto-aim can select those nodes or another threat but not the damage-reduced body; the Leviathan's nodes additionally govern its reflector. Manual aim remains unrestricted. Dash and Pulse occupy stable touch slots but appear and accept input only while ready. Touch ownership and any auto-aim target end through the matching terminal or a real browser lifecycle boundary, never through an inactivity timer.

Collecting an Enigma signal first neutralizes held input and eases the fixed-step simulation to zero over a short time fracture. Combat then remains fully suspended until the player selects one of three cards. Mouse, touch, number keys, and gamepad can make the choice; gameplay input and ordinary pause actions cannot bypass it. The ship remains protected through the slowdown and its return to combat.

## Combat and threats

Asteroids are physical ballistic hazards. They separate and bounce when they hit one another instead of causing mutual destruction. Mixed-kind groups use balanced seeded orders so one repeated kind cannot dominate by chance, while late anomaly waves limit guaranteed massive roots and introduce smaller bodies alongside them. Large authored asteroids can show progressive cracks and split through explicit finite generations. An asteroid can destroy an alien through a genuine approaching impact, but environmental destruction grants no player reward.

An Auric Colossus owns an exact 1→3→6 split tree. Its children include explosive shards with a local 120 px death blast and magnetic shards that pull the ship only inside a 300 px field with one aggregate acceleration cap. Coronas warn before activating a rotating 520 px beam, return to a finite cooldown, and produce a separate local 160 px death blast. These hazards stay ballistic: their counterplay does not turn the asteroid family into projectile-firing spacecraft.

Alien families have distinct staged roles: scouts strafe and fire, strikers telegraph charges, bombers place mines, legacy carriers launch bounded configured children, and lancers coordinate aggressive attack lines. Gunships stop to warn before a finite active laser and then return to cooldown instead of adding projectile spam. Brood Carriers take only 30% direct player-bullet damage beyond 300 px, take full damage at close range, launch two lancers at a time, and preserve a six-living-child lineage cap through hard-cull requeues.

Every ordinary and boss stage occupies the same larger finite rectangular field. The camera follows the ship through a restrained viewport-relative dead zone and velocity lookahead, but clamps before the viewport can reveal beyond the hard field boundary. Capped edge cues reuse target art, cluster nearby off-screen objectives, and prioritize actionable boss nodes and spacecraft without replacing exploration or aiming. The Harrower and Leviathan retain distinct phase sets, silhouettes, attacks, and escorts; while any Leviathan shield node survives, its reflector cycles through warning, active, and cooldown phases.

A wave is complete only when all of its configured spawns are exhausted and the field is clean. Required objectives, optional hazards, fragments, carrier children, escorts, pending spawns, and hard-cull requeues all belong to that rule. Once the final encounter-owned threat is gone, the run enters a one-second locked clear presentation: combat, input, damage, rewards, and encounter advancement stay frozen while only bounded final effects and floaters finish. The existing 1.65-second hyperspace flight then begins with its established travel direction, ship anchor, scenery crossfade, and clean-world handoff. Hyperspace never begins over a living encounter threat.

## Weapons and progression

Field pickups can repair or shield the ship, recharge Void Pulse, or temporarily enable faster, wider, piercing, arc, lance, amplified-damage, or damage-resistant play. Content opens by authored stage rather than exposing the final build in Earth Orbit. Each of the seven temporary effects lasts 24–30 seconds per pickup and owns an independent finite timer; another matching pickup adds one full duration up to four base durations.

| Active stage band | Drop chance per eligible defeat | Pity after dry kills | Permanent tier ceiling |
| --- | ---: | ---: | --- |
| 1–2 | 26% | 4 | Mk I |
| 3 | 28% | 4 | Mk II |
| 4–5 | 29% | 4 | Mk II |
| 6–10 | 31% | 4 | Mk III |
| 11–15 | 34% | 3 | Mk IV |
| 16–20 and later sectors | 38% | 3 | Mk V |

Enigma first enters at Stage 3. Permanent Enigma-card probability rises by band, common module caches enter at Stage 4 and gain weight later, and both paths draw only from modules whose unlock stage and current band ceiling permit another tier. This makes rewards more common as pressure rises without allowing early Mk V acceleration.

| Permanent module | Opens | Activation | Mk I → Mk V range or footprint |
| --- | ---: | --- | --- |
| Pulse Repeater | 1 | While firing | Player aimed |
| Homing Salvo | 3 | Autonomous | 480 → 680 px acquisition |
| Radial Array | 5 | Autonomous | 360 → 520 px threat acquisition |
| Guardian Drone | 6 | Autonomous | 360 → 560 px from each drone |
| Tractor Field | 7 | Passive | 140 → 320 px attraction |
| Tesla Coil | 9 | Autonomous | 360 → 600 px first target; 130 → 220 px chaining |
| Shield Reactor | 9 | Autonomous | Timed reserve recovery; no target range |
| Orbit Blades | 11 | Autonomous | 58 → 94 px orbit radius |
| Prism Fan | 12 | While firing | Player aimed |
| Mine Layer | 14 | Autonomous | 280 → 440 px threat acquisition |
| Overclock Matrix | 15 | Passive | Global equipped-weapon cadence |
| Seeker Rack | 17 | While firing | 500 → 680 px targeting |
| Mass Driver | 19 | While firing | Player aimed |

Only six authored milestones guarantee a module: Stage 3 Homing Salvo, Stage 6 Guardian Drone, Stage 9 Shield Reactor, Stage 12 Prism Fan, Stage 15 Overclock Matrix, and Stage 18 Seeker Rack. If a target is already at the active tier ceiling, the bounded reward rules redirect or overflow safely. Enigma cards, module caches, milestones, and boss cores all share the same catalog and tier bounds. All 13 systems cooperate within shared projectile, mine, drone, audio, and effect caps.

The ordinary shield pickup restores 30 points to a visible 60-point reserve. Shielding is deliberately weaker than hull: absorbing one point of incoming damage consumes 1.25 shield points. Shield Reactor recovery and Aegis mitigation remain separate systems.

Every Enigma draft contains three distinct eligible cards, but a permanent card is not guaranteed. Depending on the active band, cards can install or raise an unlocked permanent module, add an available duration stack, or immediately restore hull, shields, or Void Pulse. When a category is locked or already full, the draft draws from remaining bounded fallbacks rather than offering an unusable upgrade.

Campaign progress is local and intentionally narrow. Each earned stage stores only bounded permanent module tiers and remaining stacked temporary-weapon time. Continue cards summarize installed modules, autonomous systems, and timed enhancements; selecting one restores that loadout into a fresh Sector 1 battlefield. It does not restore score, hull, position, cooldown phase, enemies, Enigma choices, or a paused fight. New Game confirms before replacing campaign checkpoints and keeps the local high score and preferences.

## Presentation

The voyage begins with recognizable Earth and Mars imagery, then moves through distinctive authored worlds. Planets should feel cinematic and believable, never like translucent interface rings or repeated procedural bands. Every physical gameplay family now shares one realistic material language: the player, all asteroid and alien classes, both command ships and their nodes, projectiles, mines, pickups, drones, blades, impacts, and destruction bursts retain strong silhouettes with restrained cyan, magenta, violet, green, and deep-space identity cues. Rotating sprites use self-shading and attached emission without a baked directional cast/drop shadow, so their lighting remains plausible at every heading.

The HUD prioritizes immediate survival information. Its permanent strip lists only equipped modules with their current Mk tier and activation marker; it never reserves large boxes for empty slots. A separate active-effects row appears only while temporary enhancements are running and gives each one a visible countdown. In compact touch landscape, each row collapses to one pointer-transparent accessible summary chip so movement and aim touches still reach the battlefield.

The combat Canvas follows the actual game-shell layout rather than a competing browser-window height. When mobile browser chrome changes the visible layout, the camera clamp, field cues, simulation bounds, HUD, and touch controls remain aligned. Device-pixel ratio changes only the bounded Canvas backing resolution, not its CSS footprint.

The cyan/magenta aim reticle is a mouse/pen pointer cue and appears only while pointer aim is active. Touch input does not show a cursor target beneath the player's finger; a real pointer move may restore it on a hybrid device. Keyboard and gamepad aiming remain unchanged.

Stage completion and defeat each get a short readable beat without adding another combat path. The clear presentation holds the completed field for one second before the existing hyperspace sequence. On lethal damage, the run becomes terminal immediately and the ship-destruction effects continue alone for 1.2 seconds; the game-over dialog remains hidden and unfocused until that burst finishes. No enemies, projectiles, pickups, rewards, director state, input, or random progression advance during either frozen presentation.

Special guided rockets, radial shots, orbit blades, mines, and reflected projectiles use distinct local transparent rasters. Tesla chains, tier-accurate Tractor Field arcs, shield pulses, warning beams, crack stages, hazard fields, and pickup symbols remain restrained code-drawn overlays because they communicate live state. The Enigma chooser uses three wide cards when space permits, compacts for short landscape screens, and becomes a single column in narrow portrait layouts. Each actionable card owns a deterministic code-drawn micro-preview without adding a separate animation loop or asset. Dialog focus, full card labels, central announcements, keyboard shortcuts, and gamepad navigation preserve the same decision across input methods.

Late stages and boss encounters add cached, configuration-driven nebula washes that crossfade with the existing scene handoff. Reduced-effects mode lowers their opacity and keeps them static.

Compact landscape layouts reduce secondary text while preserving accessible names and touch targets. Reduced-effects mode lowers Enigma animation, shake, flashes, particles, and hyperspace intensity without changing upgrade choices or projectile readability.

Audio is synthesized locally and supports action rather than dominating it. Each player weapon family has a compact signature; hostile craft and boss weapons have distinct registers; shield, hull, asteroid, alien, and boss impacts separate by material; destruction scales by target; and pickups, upgrades, Dash, Pulse, arena events, and ambient rhythm remain legible under shared cooldown and 24-node limits.

## Design boundaries

- No endless spawning disguised as stage progression.
- No online account, economy, advertisement, telemetry, or server-owned progress.
- No unbounded procedural split tree, entity family, or effect system.
- No automatic aim may override active manual input. Stationary touch auto-aim is an explicit delayed hold gesture, and the first manual deflection owns the rest of that gesture.
- No hidden combat advance while an Enigma choice is open, and no dismiss path that skips its required decision.
- No scenery or interface flourish that obscures threats or reduces small-screen playability.
- New systems should deepen the core loop before expanding the project's technical surface.
