# Neon Voyage

[![Version v2026.8.13](https://img.shields.io/badge/version-v2026.8.13-63f7f0)](CHANGELOG.md)
[![Offline audit](https://github.com/XenoVoyage/Neon-Voyage/actions/workflows/ci.yml/badge.svg)](https://github.com/XenoVoyage/Neon-Voyage/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/XenoVoyage/Neon-Voyage/actions/workflows/pages.yml/badge.svg)](https://github.com/XenoVoyage/Neon-Voyage/actions/workflows/pages.yml)
[![Local audit: 119/119](https://img.shields.io/badge/local_audit-119%2F119_pass-78ff9f)](AUDIT.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-c8d3e8)](LICENSE)

Neon Voyage is a fast, fixed-screen 2D space shooter. Leave Earth through finite asteroid waves, break the Titan Gate, survive first contact, and confront an alien command ship.

## [Play Neon Voyage](https://xenovoyage.github.io/Neon-Voyage/)

![Neon Voyage ship firing through an asteroid wave above Earth in Stage 1.](docs/assets/neon-voyage-earth-orbit.webp)

The game is plain HTML, CSS, and JavaScript. To play offline, clone or download the repository and open `index.html`; there is no install, server, account, package manager, or build step. Audio starts after the first interaction because browsers require a user gesture.

**New Game** starts at Stage 1 and asks before replacing an existing campaign. **Continue** opens earned stage checkpoints and restores the selected stage's saved weapon loadout. Score, hull, position, and the live battlefield start fresh, so checkpoints are deterministic stage starts rather than mid-fight saves.

## Controls

| Action | Keyboard and mouse | Gamepad or touch |
| --- | --- | --- |
| Move | `WASD` or arrows | Left stick |
| Aim | Mouse or `I J K L` | Right stick |
| Fire | Click or `Space` | Primary / aim stick |
| Dash | `Shift` | Secondary / Dash |
| Void Pulse | `E` | Tertiary / Pulse |
| Pause | `P` or `Esc` | Menu / HUD Pause |
| Sound | `M` or Settings | HUD Sound |

Touch play uses independent dynamic sticks and is landscape-only. Touch either canvas half to place its stick; greater deflection increases movement or aim speed. Portrait mode safely freezes the run until landscape returns. Dash and Pulse remain separate controls, and hybrid tablets retain touch input when a trackpad is connected.

Keyboard, mouse, touch, and gamepad paths share accessible menus, dialog focus, live status, and pause-safe input cleanup. Reduced-effects mode lowers visual intensity. Orientation locking is best-effort on mobile devices; simulated phone/tablet checks do not claim physical-device acceptance.

## Expedition

The finite nine-stage journey moves from Earth Orbit through the Inner Belt, deep asteroid space, and the Titan Gate before alien spacecraft appear in Stage 6. The Harrower waits in the Stage 9 Command Arena.

Each wave must finish spawning and every encounter threat—including split fragments, optional hazards, carrier children, and escorts—must be cleared before hyperspace begins. Asteroids bounce without breaking one another, but a real asteroid impact can destroy an alien.

![Neon Voyage ship fighting the Harrower inside the Stage 9 command arena.](docs/assets/neon-voyage-command-arena.webp)

Temporary pickups provide Rapid Fire, Tri-Shot, Arc Burst, Nova Lance, shields, repairs, piercing rounds, and pulse charge. Rare bounded upgrades add spread fire, seeker missiles, rail shots, guardian drones, Homing Salvo, or Radial Array to campaign checkpoints. Void Pulse is a local defensive burst rather than a screen-wide clear.

## Offline, private, and lightweight

- No runtime dependencies, network requests, analytics, telemetry, ads, external fonts, workers, or service workers
- Restrictive Content Security Policy and repository-local relative resources
- Fixed 60 Hz simulation, bounded frame catch-up, hard entity caps, and deterministic cleanup
- Separate size-limited local records for preferences, high score, and campaign loadouts
- Direct `file://` play and unchanged static GitHub Pages deployment

## Development and verification

Read [AGENTS.md](AGENTS.md) before every task. It is the canonical engineering and release handoff for any contributor or coding agent. Balance and finite-stage data live in `js/config.js`; runtime code stays dependency-free and config-driven.

Node.js is optional and used only by the local audit:

```sh
node tests/run.js
```

The frozen v2026.8.13 candidate passes **119/119** dependency-free checks on Node v24.14.0 / Linux x64, including a weapon-driven Stage 1–9 boss journey and a repeatable 20-minute stress run under every entity cap. The focused mobile suite passes **36/36** checks using simulated browser viewports and Pointer Events.

See [AUDIT.md](AUDIT.md) and [tests/README.md](tests/README.md) for the evidence and its limits. Pull-request audit, merge, Pages deployment, and final live Play are separate publication gates verified after the source candidate is frozen; they are not included in the local test count.

Releases use the actual publication date: `vYYYY.M.D` for the first release that day, then `a`, `b`, `c`, and so on for additional same-day releases. Month and day are never zero-padded; details are maintained in [AGENTS.md](AGENTS.md) and [CHANGELOG.md](CHANGELOG.md).

## Credits and license

Designed and implemented with **OpenAI Codex**, with gameplay direction and review from **XenoVoyage**. Released under the [MIT License](LICENSE).
