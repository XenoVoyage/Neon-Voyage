# Neon Voyage

[![Version 1.2.1](https://img.shields.io/badge/version-1.2.1-63f7f0)](CHANGELOG.md)
[![Offline audit](https://github.com/XenoVoyage/Neon-Voyage/actions/workflows/ci.yml/badge.svg)](https://github.com/XenoVoyage/Neon-Voyage/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/XenoVoyage/Neon-Voyage/actions/workflows/pages.yml/badge.svg)](https://github.com/XenoVoyage/Neon-Voyage/actions/workflows/pages.yml)
[![Local audit: 64/64](https://img.shields.io/badge/local_audit-64%2F64_pass-78ff9f)](AUDIT.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-c8d3e8)](LICENSE)

Neon Voyage is a fast, fixed-screen 2D space shooter built for a local browser. Leave Earth behind through finite asteroid waves, discover increasingly unfamiliar space, shatter a Titan, and survive first contact before confronting an alien command ship.

## [Play Neon Voyage](https://xenovoyage.github.io/Neon-Voyage/)

GitHub Pages serves the repository as a static site without transforming the source. For offline play, clone or download the repository and open `index.html` directly—there is no install, server, account, package manager, or build command.

Audio begins after the first click or key press because browsers require a user gesture.

## Controls

| Action | Keyboard and mouse | Alternate input |
| --- | --- | --- |
| Move | `WASD` or arrow keys | Left gamepad/touch stick |
| Aim | Mouse or `I J K L` | Right gamepad/touch stick |
| Fire | Click or `Space` | Primary button / aim stick |
| Dash | `Shift` | Secondary button / Dash |
| Void Pulse | `E` | Tertiary button / Pulse |
| Pause | `P` or `Esc` | Gamepad menu / HUD Pause |
| Sound | `M` or Settings | HUD Sound |

### Mobile and tablet play

Touch devices use two independent on-screen sticks: move with the left thumb, and aim and fire with the right. Each stick uses its visible ring as the neutral point, while the larger surrounding area remains available for reliable pointer capture. Dash and Void Pulse remain separate action buttons. Touch capability is detected from the device, any available coarse pointer, or an actual touch, so an iPad with a connected trackpad keeps the finger controls available.

Touch play is landscape-only. In portrait, a blocking rotate prompt owns all button, keyboard, pointer, and gamepad input; it freezes the simulation and clears held actions without opening the pause menu or discarding the run. Rotating back to landscape continues from the same state without replaying buttons held during portrait. Neon Voyage requests a landscape orientation lock when the browser permits it, but iPhone and iPad browsers do not reliably expose that capability to an ordinary web page, so the player may need to rotate the device manually and turn off the system orientation lock.

Mobile browser-chrome focus changes do not pause an active touch run. Moving the page into the background or switching away still pauses through the document visibility lifecycle, and clears captured touch input before play resumes.

## Expedition

Each sector is a nine-stage journey with explicit, finite objectives. Stages 1–8 use configured combat waves; Stage 9 is a direct boss objective:

1. **Earth Orbit** — depart above Earth through an exact three-rock opening and a widening orbital debris field.
2. **Inner Belt** — cross Mars-adjacent crystal and volatile formations.
3. **Deep Drift** — encounter strange, reactive anomaly stones beyond familiar routes.
4. **Shattered Frontier** — break through colossal and armored formations at the edge of mapped space.
5. **Titan Gate** — destroy the non-shooting Titan and every required fragment it releases.
6. **First Contact** — meet the first alien scouts only after leaving the asteroid frontier.
7. **Strike Wing** — survive coordinated scout and striker formations.
8. **Raid Fleet** — dismantle bombers, carriers, and their supporting hazards.
9. **Command Arena** — defeat an alien capital ship inside a locked circular arena.

A wave stops spawning at its configured total. It advances only after every required threat from that wave has spawned and been resolved; splitting required asteroids add their descendants to the live objective, so destroying a parent cannot clear the stage while its fragments survive. Between stages, a brief hyperspace sequence locks combat controls, carries the ship forward along its existing heading, clears the previous battlefield, and preserves the ship's screen position through the next encounter instead of visibly teleporting it.

Outside hyperspace, background stars remain twinkling points: they do not rotate with the ship or stretch into travel lines.

Asteroids are ballistic physical hazards: they do not aim, home, or fire. They separate, bounce, and exchange impact damage when they collide with each other or alien spacecraft; environmental destruction advances a relevant objective exactly once without granting duplicate score or drops. Ranged attacks belong to recognisable alien spacecraft, which appear only in the later half of the journey.

## Weapons and pickups

The pulse cannon can grow into a run-wide stack of spread fire, seeker missiles, piercing rail shots, and guardian drones. Field pickups provide short, immediately visible weapon changes and survival boosts, while rare module upgrades add bounded permanent power for the current run.

- Rapid Fire
- Tri-Shot
- Arc Burst
- Nova Lance
- Shield
- Hull Repair
- Piercing Rounds
- Pulse Charge
- Rare Weapon Upgrade

Temporary weapons coexist on independent timers, refresh only their own duration, change the live firing pattern, and expire back to the permanent loadout. Combo chains, splitting objectives, environmental kills, dash movement, and Void Pulse keep short-term decisions active without an inventory screen.

## Local architecture

| File | Responsibility |
| --- | --- |
| `js/config.js` | Version, finite stages and waves, goals, balance, variants, power-ups, difficulty, transitions, and caps |
| `js/core.js` | Deterministic math, collisions, safe storage, pooling, and cleanup helpers |
| `js/audio.js` | Gesture-unlocked synthesized audio with a hard voice cap |
| `js/render.js` | Canvas scenery, hyperspace presentation, ships, planets, asteroids, aliens, and effects |
| `js/game.js` | Fixed-step simulation, wave direction, entities, input, collisions, transitions, menus, and HUD |

The runtime uses a small `window.ND` namespace and classic deferred scripts so it works through both `file://` and the GitHub Pages repository subpath. Keep stage behavior config-driven and start balance changes in `js/config.js`.

## Performance, privacy, and accessibility

- Deterministic 60 Hz simulation with bounded frame catch-up
- Explicit caps and cleanup for every entity and effect family
- Swept projectile collision and radius-aware stage/arena containment
- Reduced-effects mode for lower particle density during play and fewer, shorter hyperspace streaks
- Keyboard, mouse, independent dual-touch, and gamepad controls with accessible menus and live status
- Landscape touch gate, display-safe-area layout, hybrid tablet detection, and visibility-safe input cleanup
- Restrictive Content Security Policy and local relative resources
- No runtime network APIs, analytics, telemetry, ads, external fonts, workers, or service workers
- Size-limited, schema-validated local high-score and preference storage

## Development and contribution

Read [AGENTS.md](AGENTS.md) before changing the project. Keep updates small, config-driven, fully local, and dependency-free; preserve existing work and avoid speculative frameworks.

Node.js is optional and used only by the audit harness:

```sh
node tests/run.js
```

The Neon Voyage 1.2.1 source snapshot passes **64/64** dependency-free automated checks. The linked CI and Pages badges report the public workflows independently.

A coherent release update includes a semantic version bump, [changelog](CHANGELOG.md), synchronized README/audit, deterministic regression coverage, regenerated checksums after files are frozen, one clean public `main` publish, and observed CI, Pages, and live-site verification. See [AUDIT.md](AUDIT.md) and [tests/README.md](tests/README.md) for the current evidence and scope.

## Credits and license

Designed and implemented with **OpenAI Codex**, with gameplay direction and review from **XenoVoyage**. The repository history, tests, audit, and changelog document that collaboration transparently.

Released under the [MIT License](LICENSE).
