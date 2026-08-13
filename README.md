# Neon Voyage

[![Version 1.5.0](https://img.shields.io/badge/version-1.5.0-63f7f0)](CHANGELOG.md)
[![Offline audit](https://github.com/XenoVoyage/Neon-Voyage/actions/workflows/ci.yml/badge.svg)](https://github.com/XenoVoyage/Neon-Voyage/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/XenoVoyage/Neon-Voyage/actions/workflows/pages.yml/badge.svg)](https://github.com/XenoVoyage/Neon-Voyage/actions/workflows/pages.yml)
[![Local audit: 118/118](https://img.shields.io/badge/local_audit-118%2F118_pass-78ff9f)](AUDIT.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-c8d3e8)](LICENSE)

Neon Voyage is a fast, fixed-screen 2D space shooter built for a local browser. Leave Earth behind through finite asteroid waves, discover increasingly unfamiliar space, shatter a Titan, and survive first contact before confronting an alien command ship.

## [Play Neon Voyage](https://xenovoyage.github.io/Neon-Voyage/)

![Neon Voyage ship firing through an asteroid wave above Earth in Stage 1.](docs/assets/neon-voyage-earth-orbit.webp)

GitHub Pages serves the repository as a static site without transforming the source. For offline play, clone or download the repository and open `index.html` directly—there is no install, server, account, package manager, or build command.

**New Game** begins at Stage 1 and asks before replacing an existing campaign save. **Continue** opens the earned checkpoint grid and restores the saved weapon loadout for the selected stage. Score, hull, position, and live battlefield state still reset, keeping each checkpoint safe and deterministic rather than suspending a run mid-fight.

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

Touch play is landscape-only and uses two independent dynamic sticks. Touch anywhere on the left half to place the movement stick or the right half to place aim and fire. Contact starts neutral; dragging farther increases movement speed or aim turn rate, and firing begins only after the aim threshold. Releasing aim preserves the selected heading. Dash and Void Pulse remain separate actions, and hybrid tablets keep touch controls even when a trackpad is connected.

Portrait displays a blocking rotate prompt and freezes the current run until landscape returns. Orientation locking is best-effort, so iPhone and iPad players may need to rotate manually and disable the device orientation lock. Direct game gestures suppress accidental double-tap zoom and overscroll without disabling ordinary browser zoom outside the owned canvas interaction.

Pausing, hiding or leaving the page, canceling a touch, or losing browser pointer capture clears held controls and residual drift before play resumes. Browser-chrome focus changes alone do not pause an active touch run.

## Expedition

Neon Voyage is a finite nine-stage journey from Earth orbit to an alien command arena:

| Stage | Encounter |
| --- | --- |
| 1 — Earth Orbit | Depart above Earth through the three-rock opening and orbital debris. |
| 2 — Inner Belt | Cross Mars-adjacent crystal and volatile formations. |
| 3–4 — Deep Drift / Shattered Frontier | Face reactive anomalies, colossal rocks, and armored frontier formations. |
| 5 — Titan Gate | Destroy the non-shooting Titan and every fragment it releases. |
| 6–8 — First Contact / Strike Wing / Raid Fleet | Meet alien spacecraft, then coordinated strike and carrier fleets with finite asteroid hazards. |
| 9 — Command Arena | Defeat the Harrower inside its locked circular arena. |

![Neon Voyage ship fighting the Harrower inside the Stage 9 command arena.](docs/assets/neon-voyage-command-arena.webp)

A stage advances only after its configured waves are fully spawned and every living threat—including optional hazards, split descendants, carrier children, and boss escorts—has been cleared. Safe perimeter placement defers a threat instead of forcing it beside the ship. Hyperspace then locks combat controls, clears the battlefield, and carries the ship into the next encounter without changing its screen anchor or travel direction.

Outside hyperspace, stars remain points and the journey moves past Earth, Mars, and six bundled deep-space worlds. Asteroids stay ballistic: they bounce without breaking one another and never aim, fire, or home. A real asteroid impact can still destroy an alien. The largest formation follows a bounded 1→3→6 split and reveals progressive cracks before breaking.

## Weapons and pickups

The pulse cannon can grow into a stack of spread fire, seeker missiles, piercing rail shots, guardian drones, **Homing Salvo**, and **Radial Array**. The two passive modules fire automatically when an eligible nearby threat exists: Homing Salvo launches periodic guided rockets, while Radial Array emits a periodic ring of projectiles. Field pickups provide short, immediately visible weapon changes and survival boosts, while rare module upgrades add bounded power to the saved checkpoint loadout.

- Rapid Fire
- Tri-Shot
- Arc Burst
- Nova Lance
- Shield
- Hull Repair
- Piercing Rounds
- Pulse Charge
- Rare Weapon Upgrade

Temporary weapons coexist on independent timers, refresh only their own duration, change the live firing pattern, and expire back to the permanent loadout. A checkpoint records bounded module tiers and the remaining temporary-weapon timers for that stage. The active Void Pulse is a local defensive burst with a 280 px radius and substantially lower threat damage, so it creates space around the ship instead of clearing a battlefield.

The requested combat pickups are slightly more common while the existing drop chance and pity boundary remain bounded: Rapid Fire has weight 24, Tri-Shot 22, and Hull Repair 20.

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
- Keyboard, mouse, dynamic half-screen radial dual-touch, and gamepad controls with accessible menus, dialog focus, inert inactive overlays, and live status
- Landscape touch gate, display-safe-area layout, compact phone HUD, hybrid tablet detection, double-tap protection, and pause-safe capture cleanup
- Restrictive Content Security Policy and local relative resources
- No runtime network APIs, analytics, telemetry, ads, external fonts, workers, or service workers
- Separate size-limited, schema-validated local records for high score/preferences and per-stage campaign loadouts

## Development and contribution

Read [AGENTS.md](AGENTS.md) before changing the project. Keep updates small, config-driven, fully local, and dependency-free; preserve existing work and avoid speculative frameworks.

Node.js is optional and used only by the audit harness:

```sh
node tests/run.js
```

The frozen Neon Voyage 1.5.0 candidate passes **118/118** dependency-free automated checks on Node v24.14.0 / Linux x64, including a weapon-driven Stage 1–9 journey that defeats the Harrower boss under every entity cap. Its focused mobile suite passes **36/36** checks; phone- and tablet-class touch evidence remains browser-simulated rather than a claim of physical-device acceptance. The pull-request audit, merge, Pages deployment, and live Play are separate publication gates and remain pending until observed.

A coherent release update includes a semantic version bump, [changelog](CHANGELOG.md), synchronized README/audit, deterministic regression coverage, regenerated checksums after files are frozen, and a short-lived release branch merged through a pull request. The active `Protect main` ruleset requires `Offline audit / audit`; force pushes, branch deletion, and bypasses are forbidden. Approval remains optional for solo maintenance and should be raised to one only when a real independent reviewer is available. See [AUDIT.md](AUDIT.md) and [tests/README.md](tests/README.md) for the current evidence and publication boundary.

## Credits and license

Designed and implemented with **OpenAI Codex**, with gameplay direction and review from **XenoVoyage**. The repository history, tests, audit, and changelog document that collaboration transparently.

Released under the [MIT License](LICENSE).
