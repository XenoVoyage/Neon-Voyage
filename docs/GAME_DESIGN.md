# Neon Voyage game design

This document defines the intended player experience. `js/config.js` remains the source of truth for exact values, stage composition, timing, balance, and caps.

## Vision

Neon Voyage is a focused space-arcade expedition that begins above a familiar Earth and steadily moves into stranger, more dangerous territory. A complete run should feel readable, responsive, and finite: every battlefield has a purpose, every threat can be cleared, and each stage visibly advances the voyage.

| Pillar | Direction |
| --- | --- |
| Immediate control | Movement, aiming, firing, Dash, and Void Pulse respond predictably on every supported input |
| Finite momentum | Authored waves end cleanly and transition quickly into the next stage |
| Readable danger | Threat shape, color, motion, damage cracks, warnings, and arena edges communicate risk |
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
| 2 | Inner Belt | Introduce crystal, volatile, and armored hazards | Homing Salvo tier |
| 3 | Deep Drift | Increase mixed asteroid pressure as familiar space recedes | — |
| 4 | Shattered Frontier | Introduce colossal asteroids and bounded split trees | Radial Array tier |
| 5 | Titan Gate | Break the Titan while controlling its surrounding hazards | Tractor Field tier |
| 6 | First Contact | Meet alien scouts without removing the physical asteroid field | Guardian Drone tier |
| 7 | Strike Wing | Fight faster interceptors and bombers | — |
| 8 | Raid Fleet | Break carrier-supported alien formations | Tesla Coil tier |
| 9 | Command Screen | Break the capital ship's final pickets and carriers | Shield Reactor tier |
| 10 | Harrower Arena | Defeat the Harrower and every surviving escort | Boss-core upgrade or capped overflow |
| 11 | Ion Graveyard | Enter the evolved anomaly arc against charged razor fields | Orbit Blades tier |
| 12 | Prism Rift | Cross refracting prismatic and volatile formations | Prism Fan tier |
| 13 | Gravity Scar | Control dense monoliths inside a collapsing field | — |
| 14 | Fractured Halo | Survive splinter swarms and broken giants | Mine Layer tier |
| 15 | Anomaly Crown | Shatter an evolved Titan and its anomaly court | Overclock Matrix tier |
| 16 | Vanguard Swarm | Meet advanced lancer and gunship formations | — |
| 17 | Null Phalanx | Break coordinated lancers, gunships, and legacy strike craft | Seeker Rack tier |
| 18 | Siege Choir | Silence gunship, bomber, and carrier attack rhythms | — |
| 19 | Sovereign Guard | Clear the Leviathan's heaviest mixed fleet screen | Mass Driver tier |
| 20 | Leviathan Arena | Defeat the Leviathan and every surviving escort | Boss-core upgrade or capped overflow |

Stages 1–5 form an accessible asteroid-and-anomaly opening; ordinary alien spacecraft do not appear before Stage 6. Stages 6–9 form the first mixed alien arc, Stage 10 is the first command-ship battle, Stages 11–15 escalate through evolved anomalies, and Stages 16–19 introduce advanced alien formations before the Stage 20 boss. A milestone targets its authored module unless that system is already at Mk V, in which case the bounded upgrade rules redirect the reward. Later sectors repeat the complete journey with bounded difficulty scaling and deep-space scenery rather than returning visually to Earth.

## Player systems

Movement is analog where the device supports it. Aim direction persists after release so the ship does not snap to an unrelated heading. Dash provides a short repositioning burst with a cooldown. Void Pulse is a charged local defense: it protects the nearby area but is not a screen-wide clear.

Keyboard and mouse, gamepad, and touch share the same simulation actions. Mobile play uses landscape orientation and two independent dynamic sticks. The left half owns movement; the right half owns aim and automatic fire. Deflection controls strength. Touch ownership ends only through a matching terminal or a real browser lifecycle boundary, never through an inactivity timer.

Collecting an Enigma signal first neutralizes held input and eases the fixed-step simulation to zero over a short time fracture. Combat then remains fully suspended until the player selects one of three cards. Mouse, touch, number keys, and gamepad can make the choice; gameplay input and ordinary pause actions cannot bypass it. The ship remains protected through the slowdown and its return to combat.

## Combat and threats

Asteroids are physical ballistic hazards. They separate and bounce when they hit one another instead of causing mutual destruction. Large authored asteroids can show progressive cracks and split through explicit finite generations. An asteroid can destroy an alien through a genuine approaching impact, but environmental destruction grants no player reward.

Alien families have distinct roles: scouts strafe and fire, strikers telegraph charges, bombers place mines, carriers launch a bounded number of configured children, lancers coordinate aggressive attack lines, and gunships add heavier fleet pressure. Razor, prismatic, and monolith asteroids extend the physical hazard language in the second arc. The Harrower and Leviathan use distinct configured phase sets, silhouettes, attacks, and escorts inside contained command arenas.

A wave is complete only when all of its configured spawns are exhausted and the field is clean. Required objectives, optional hazards, fragments, carrier children, escorts, pending spawns, and hard-cull requeues all belong to that rule. Hyperspace never begins over a living encounter threat.

## Weapons and progression

Field pickups can repair or shield the ship, recharge Void Pulse, or temporarily enable faster, wider, piercing, arc, lance, amplified-damage, or damage-resistant play. Drops are intentionally common: each eligible defeat has a 48% chance and a two-kill dry spell triggers the bounded pity path. Each of the seven temporary effects lasts 24–30 seconds per pickup and owns an independent finite timer; another matching pickup adds one full duration up to four base durations.

Thirteen permanent modules are bounded at Mk V. Firing modules add repeaters, spread, seekers, or heavy shots. Autonomous systems add homing salvos, rotating radial bursts, guardian drones, chained Tesla strikes, orbiting blades, defensive mines, or shield recovery without taking over the player's aim. Overclock Matrix accelerates the equipped arsenal and Tractor Field draws nearby pickups toward the ship. Authored stage milestones, Enigma cards, common module caches, and boss cores all feed the same tier bounds. All owned modules cooperate within shared projectile, mine, drone, audio, and effect caps.

Every Enigma draft contains three distinct eligible cards. Cards can install or raise a permanent module, add a duration stack to a temporary weapon, or immediately restore hull, shields, or Void Pulse. When a category is already full, the draft draws from the remaining bounded choices rather than offering an unusable upgrade.

Campaign progress is local and intentionally narrow. Each earned stage stores only bounded permanent module tiers and remaining stacked temporary-weapon time. Continue cards summarize installed modules, autonomous systems, and timed enhancements; selecting one restores that loadout into a fresh Sector 1 battlefield. It does not restore score, hull, position, cooldown phase, enemies, Enigma choices, or a paused fight. New Game confirms before replacing campaign checkpoints and keeps the local high score and preferences.

## Presentation

The voyage begins with recognizable Earth and Mars imagery, then moves through distinctive authored worlds. Planets should feel cinematic and believable, never like translucent interface rings or repeated procedural bands. Craft, threats, projectiles, pickups, and effects remain crisp Canvas shapes with strong silhouettes and a restrained cyan, magenta, violet, gold, and deep-space palette.

The HUD prioritizes immediate survival information. Its compact permanent strip lists only equipped modules with their current Mk tier and activation marker; it never reserves large boxes for empty slots. A separate active-effects row appears only while temporary enhancements are running and gives each one a visible countdown. Guided rockets, radial shots, Tesla arcs, orbit blades, player mines, shield pulses, and the two new timed effects retain distinct restrained silhouettes. The Enigma chooser uses three wide cards when space permits, compacts for short landscape screens, and becomes a single column in narrow portrait layouts. Dialog focus, full card labels, central announcements, keyboard shortcuts, and gamepad navigation preserve the same decision across input methods.

Compact landscape layouts reduce secondary text while preserving accessible names and touch targets. Reduced-effects mode lowers Enigma ornament, shake, flashes, particles, and hyperspace intensity without changing upgrade choices or projectile readability.

Audio is synthesized locally and supports action rather than dominating it: shots are short, impacts are legible, major threats receive distinct cues, and ambient rhythm follows encounter intensity.

## Design boundaries

- No endless spawning disguised as stage progression.
- No online account, economy, advertisement, telemetry, or server-owned progress.
- No unbounded procedural split tree, entity family, or effect system.
- No automatic aim or control rule that takes ownership away from the player's current input.
- No hidden combat advance while an Enigma choice is open, and no dismiss path that skips its required decision.
- No scenery or interface flourish that obscures threats or reduces small-screen playability.
- New systems should deepen the core loop before expanding the project's technical surface.
