# Neon Voyage

Neon Voyage is a fast, fixed-screen 2D arcade shooter that runs entirely in a local browser. Clear five objective-driven stages, combine temporary weapon boosts, survive dense asteroid fields, intercept alien spacecraft, and finish each sector inside a locked command arena.

There is no framework, package manager, build command, account, telemetry, or runtime network request. The game is plain HTML, CSS, JavaScript, and local WebP art.

## Play

- **GitHub Pages:** [Play Neon Voyage](https://xenovoyage.github.io/Neon-Voyage/)
- **Offline:** clone or download the repository, then open `index.html` directly in a current browser.

Audio starts after the first click or key press because browsers require a user gesture. Everything else works through `file://` without a local server.

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

## Arcade expedition

Every sector has five enclosed stages with an explicit goal:

1. **Belt Breach** — destroy the asteroid quota.
2. **Salvage Run** — recover three marked energy cores while surviving a mixed field.
3. **Alien Intercept** — destroy the alien formation. Alien ships crushed by asteroids count toward the objective.
4. **Meteor Storm** — survive the storm and destroy its non-shooting Titan.
5. **Command Arena** — defeat an alien capital ship inside a locked circular arena.

Normal stages keep the action inside the visible screen. Threats enter from its edges, pressure is replenished quickly, and the next stage begins only after its goal is complete. Asteroids are ballistic physical hazards: they never aim, home, or fire. Only recognisable alien spacecraft use ranged attacks.

The scenery communicates progression without turning the game into open-world travel. Space-flow lines always keep one fixed direction, independent of the ship's aim. Earth and Mars use authored stage keyframes, approaching or receding as a sector advances.

## Weapons and pickups

The player starts with a pulse cannon and can earn lasting run upgrades such as spread fire, seeker missiles, piercing rail shots, and guardian drones.

Field pickups are deliberately frequent and immediately readable:

- Rapid Fire
- Tri-Shot
- Shield
- Hull Repair
- Piercing Rounds
- Pulse Charge
- Rare Weapon Upgrade

Temporary weapon boosts can coexist, so Rapid Fire and Tri-Shot work together until their independent timers expire. Combo chains, asteroid splitting, environmental alien kills, dash movement, and Void Pulse keep each stage active without an inventory screen.

## Project structure

| File | Responsibility |
| --- | --- |
| `js/config.js` | Balance, stages, goals, variants, power-ups, caps, and difficulty |
| `js/core.js` | Math, deterministic randomness, collision helpers, safe storage, and cleanup |
| `js/audio.js` | Gesture-unlocked synthesized audio with a hard voice cap |
| `js/render.js` | Canvas scenery, planet keyframes, ships, asteroids, effects, and world indicators |
| `js/game.js` | Stage direction, entity behavior, input, fixed-step orchestration, collisions, menus, and HUD updates |

The source uses a small shared `window.ND` namespace so it remains readable and works directly from disk. Start gameplay tuning in `js/config.js`; the runtime has no generated or bundled code.

## Performance and safety

- Deterministic 60 Hz simulation with bounded frame catch-up
- Explicit caps for every entity and effect family
- Immediate cleanup of expired or irrelevant objects
- Swept projectile collision to prevent tunnelling
- Radius-aware player and boss-arena containment
- Reduced-effects option for lower particle and streak density
- Restrictive Content Security Policy and local-only resources
- No `fetch`, XHR, WebSocket, analytics, ads, external fonts, workers, or service workers
- Size-limited, schema-validated local high-score and preference storage

## Verification

Node.js is optional and is used only for the repository audit. The game itself does not need Node.

```sh
node tests/run.js
```

The dependency-free test harness validates gameplay invariants, long-run caps, browser boot, accessibility, offline security, and GitHub Pages subpath compatibility. See [AUDIT.md](AUDIT.md) for the release report.

## Credits and license

Designed and implemented with **OpenAI Codex**, with gameplay direction and review from **XenoVoyage**. Architecture, implementation, tests, and documentation are kept in the public history for transparency.

Released under the [MIT License](LICENSE).
