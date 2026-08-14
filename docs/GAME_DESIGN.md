# Neon Voyage game design

This document defines the intended player experience. `js/config.js` remains the source of truth for exact values, stage composition, timing, balance, and caps.

## Vision

Neon Voyage is a focused space-arcade expedition that begins above a familiar Earth and steadily moves into stranger, more dangerous territory. A complete run should feel readable, responsive, and finite: every battlefield has a purpose, every threat can be cleared, and each stage visibly advances the voyage.

| Pillar | Direction |
| --- | --- |
| Immediate control | Movement, aiming, firing, Dash, and Void Pulse respond predictably on every supported input |
| Finite momentum | Authored waves end cleanly and transition quickly into the next stage |
| Readable danger | Threat shape, color, motion, damage cracks, warnings, and arena edges communicate risk |
| Build variety | Temporary weapons create bursts of power while bounded modules shape a longer campaign |
| Lightweight craft | The game stays local, fast, and dependency-free without sacrificing atmosphere |

## Core loop

1. Enter a stage with a fresh battlefield and the checkpoint's saved weapon loadout.
2. Move, aim, fire, Dash, and use Void Pulse to survive its finite waves.
3. Break asteroids, defeat spacecraft, collect field pickups, and improve modules.
4. Clear every encounter-owned threat.
5. Travel through hyperspace to the next authored stage.
6. Defeat the Harrower, continue into a harder sector, or return later through an earned checkpoint.

## Journey

| Stage | Encounter | Purpose |
| --- | --- | --- |
| 1 | Earth Orbit | Learn movement and fire against a safe opening asteroid field |
| 2 | Inner Belt | Introduce crystal, volatile, and armored hazards |
| 3 | Deep Drift | Increase mixed asteroid pressure as familiar space recedes |
| 4 | Shattered Frontier | Introduce colossal asteroids and bounded split trees |
| 5 | Titan Gate | Break the Titan while controlling its surrounding hazards |
| 6 | First Contact | Meet alien scouts without removing the physical asteroid field |
| 7 | Strike Wing | Fight faster interceptors and bombers |
| 8 | Raid Fleet | Break carrier-supported alien formations |
| 9 | Command Arena | Defeat the Harrower and every surviving escort |

Ordinary alien spacecraft do not appear before Stage 6. Later sectors repeat the authored journey with bounded difficulty scaling and deep-space scenery rather than returning visually to Earth.

## Player systems

Movement is analog where the device supports it. Aim direction persists after release so the ship does not snap to an unrelated heading. Dash provides a short repositioning burst with a cooldown. Void Pulse is a charged local defense: it protects the nearby area but is not a screen-wide clear.

Keyboard and mouse, gamepad, and touch share the same simulation actions. Mobile play uses landscape orientation and two independent dynamic sticks. The left half owns movement; the right half owns aim and automatic fire. Deflection controls strength. Touch ownership ends only through a matching terminal or a real browser lifecycle boundary, never through an inactivity timer.

## Combat and threats

Asteroids are physical ballistic hazards. They separate and bounce when they hit one another instead of causing mutual destruction. Large authored asteroids can show progressive cracks and split through explicit finite generations. An asteroid can destroy an alien through a genuine approaching impact, but environmental destruction grants no player reward.

Alien families have distinct roles: scouts strafe and fire, strikers telegraph charges, bombers place mines, and carriers launch a bounded number of configured children. The Harrower combines movement phases, beams, volleys, mines, and escorts inside a contained command arena.

A wave is complete only when all of its configured spawns are exhausted and the field is clean. Required objectives, optional hazards, fragments, carrier children, escorts, pending spawns, and hard-cull requeues all belong to that rule. Hyperspace never begins over a living encounter threat.

## Weapons and progression

Field pickups can repair or shield the ship, recharge Void Pulse, or temporarily enable faster, wider, piercing, arc, or lance fire. Temporary effects have independent finite timers.

Permanent modules are rare, tier-bounded upgrades. Firing modules add repeaters, spread, seekers, or heavy shots; autonomous modules add homing salvos, radial bursts, or guardian drones. All owned modules cooperate within the shared projectile and effect caps.

Campaign progress is local and intentionally narrow. Each earned stage stores only bounded permanent module tiers and remaining temporary-weapon time. Continue restores the chosen loadout into a fresh Sector 1 battlefield; it does not restore score, hull, position, clocks, enemies, or a paused fight. New Game confirms before replacing campaign checkpoints and keeps the local high score and preferences.

## Presentation

The voyage begins with recognizable Earth and Mars imagery, then moves through distinctive authored worlds. Planets should feel cinematic and believable, never like translucent interface rings or repeated procedural bands. Craft, threats, projectiles, pickups, and effects remain crisp Canvas shapes with strong silhouettes and a restrained cyan, magenta, violet, gold, and deep-space palette.

The HUD prioritizes immediate survival information. Compact landscape layouts reduce secondary text while preserving accessible names and touch targets. Reduced-effects mode lowers shake, flashes, particles, and hyperspace intensity without changing gameplay.

Audio is synthesized locally and supports action rather than dominating it: shots are short, impacts are legible, major threats receive distinct cues, and ambient rhythm follows encounter intensity.

## Design boundaries

- No endless spawning disguised as stage progression.
- No online account, economy, advertisement, telemetry, or server-owned progress.
- No unbounded procedural split tree, entity family, or effect system.
- No automatic aim or control rule that takes ownership away from the player's current input.
- No scenery or interface flourish that obscures threats or reduces small-screen playability.
- New systems should deepen the core loop before expanding the project's technical surface.
