# Neon Voyage

[![Version 1.1.0](https://img.shields.io/badge/version-1.1.0-63f7f0)](CHANGELOG.md)
[![Offline audit](https://github.com/XenoVoyage/Neon-Voyage/actions/workflows/ci.yml/badge.svg)](https://github.com/XenoVoyage/Neon-Voyage/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/XenoVoyage/Neon-Voyage/actions/workflows/pages.yml/badge.svg)](https://github.com/XenoVoyage/Neon-Voyage/actions/workflows/pages.yml)
[![Local audit: 39/39](https://img.shields.io/badge/local_audit-39%2F39_pass-78ff9f)](AUDIT.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-c8d3e8)](LICENSE)

Neon Voyage is a fast, fixed-screen 2D space shooter built for a local browser. Fight through finite arcade waves, combine temporary weapon boosts, survive ballistic asteroid fields, intercept alien spacecraft, shatter a Titan, and defeat an alien command ship.

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

## Expedition

Each sector is five enclosed stages with explicit, finite objectives. Stages 1–4 use configured combat waves; Stage 5 is a direct boss objective:

1. **Belt Breach** — learn the field in an exact three-asteroid opening wave, then clear escalating rock formations.
2. **Deep Belt** — destroy finite waves of tougher asteroid variants.
3. **Alien Intercept** — eliminate required alien formations while optional asteroids remain physical hazards.
4. **Titan Clash** — destroy the non-shooting Titan; victory is not delayed by an artificial survival timer.
5. **Command Arena** — defeat an alien capital ship inside a locked circular arena.

A wave stops spawning at its configured total. It advances only after every required threat from that wave has spawned and been resolved; a stage cannot clear early. Between stages, a brief hyperspace sequence locks combat controls, guides the ship on autopilot, clears the previous battlefield, and hands off to the next encounter.

Outside hyperspace, background stars remain twinkling points: they do not rotate with the ship or stretch into travel lines.

Asteroids are ballistic hazards: they do not aim, home, or fire. Ranged attacks belong to recognisable alien spacecraft. Asteroid impacts can destroy aliens and advance the relevant objective without granting duplicate score or drops.

## Weapons and pickups

The pulse cannon can grow into a run-wide stack of spread fire, seeker missiles, piercing rail shots, and guardian drones. Frequent field pickups include:

- Rapid Fire
- Tri-Shot
- Shield
- Hull Repair
- Piercing Rounds
- Pulse Charge
- Rare Weapon Upgrade

Rapid Fire and Tri-Shot coexist on independent timers. Combo chains, splitting asteroids, environmental alien kills, dash movement, and Void Pulse keep short-term decisions active without an inventory screen.

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
- Keyboard, mouse, touch, and gamepad controls with accessible menus and live status
- Restrictive Content Security Policy and local relative resources
- No runtime network APIs, analytics, telemetry, ads, external fonts, workers, or service workers
- Size-limited, schema-validated local high-score and preference storage

## Development and contribution

Read [AGENTS.md](AGENTS.md) before changing the project. Keep updates small, config-driven, fully local, and dependency-free; preserve existing work and avoid speculative frameworks.

Node.js is optional and used only by the audit harness:

```sh
node tests/run.js
```

The Neon Voyage 1.1.0 source snapshot passes **39/39** dependency-free automated checks. The linked CI and Pages badges report the public workflows independently.

A coherent release update includes a semantic version bump, [changelog](CHANGELOG.md), synchronized README/audit, deterministic regression coverage, regenerated checksums after files are frozen, one clean public `main` publish, and observed CI, Pages, and live-site verification. See [AUDIT.md](AUDIT.md) and [tests/README.md](tests/README.md) for the current evidence and scope.

## Credits and license

Designed and implemented with **OpenAI Codex**, with gameplay direction and review from **XenoVoyage**. The repository history, tests, audit, and changelog document that collaboration transparently.

Released under the [MIT License](LICENSE).
