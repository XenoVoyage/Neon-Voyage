# Neon Voyage

[![Version 1.4.0](https://img.shields.io/badge/version-1.4.0-63f7f0)](CHANGELOG.md)
[![Offline audit](https://github.com/XenoVoyage/Neon-Voyage/actions/workflows/ci.yml/badge.svg)](https://github.com/XenoVoyage/Neon-Voyage/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/XenoVoyage/Neon-Voyage/actions/workflows/pages.yml/badge.svg)](https://github.com/XenoVoyage/Neon-Voyage/actions/workflows/pages.yml)
[![Local audit: 111/111](https://img.shields.io/badge/local_audit-111%2F111_pass-78ff9f)](AUDIT.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-c8d3e8)](LICENSE)

Neon Voyage is a fast, fixed-screen 2D space shooter built for a local browser. Leave Earth behind through finite asteroid waves, discover increasingly unfamiliar space, shatter a Titan, and survive first contact before confronting an alien command ship.

## [Play Neon Voyage](https://xenovoyage.github.io/Neon-Voyage/)

GitHub Pages serves the repository as a static site without transforming the source. For offline play, clone or download the repository and open `index.html` directly—there is no install, server, account, package manager, or build command.

**New Game** always begins at Stage 1. After the first genuine stage clear, **Continue** opens a responsive grid of earned stage checkpoints with locally rendered, stage-authored scene previews. Selecting a checkpoint starts a fresh Sector 1 run at that authored stage—score, hull, temporary weapons, and run upgrades are intentionally reset. This is stage progression, not a suspended mid-run save.

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

Touch devices use two independent dynamic sticks. A fresh touch anywhere on the playable left half establishes the movement stick beneath that thumb; the right half does the same for aim and fire. The first contact is neutral, so the ship cannot move or fire until the finger deliberately drags away from that new origin. The base stays anchored there while the knob follows its owning finger—even across the center line—until release or cancellation, after which the control returns to its unobtrusive idle position.

Stick distance is analog rather than all-or-nothing: partial movement produces a slower response, while greater deflection approaches the configured maximum. The same radial response controls aim turning, from deliberate fine adjustment to a full-deflection cap of 7.2 radians per second. Firing begins only after the aim stick crosses its intentional threshold; releasing it preserves the selected heading. Small aim input and low-band firing share the same direction logic, so a shot cannot leave along the ship's old heading while the ship turns elsewhere. Dash and Void Pulse remain independent action buttons and can be used while both sticks are held. Touch capability is detected from the device, any available coarse pointer, or an actual touch, so an iPad with a connected trackpad keeps the finger controls available without retaining a stale mouse target.

The fullscreen shell suppresses accidental double-tap zoom and browser overscroll during direct game interaction. It does not add a blanket `user-scalable=no` viewport restriction, so standard pinch zoom remains available outside the canvas gestures that the game must own.

Touch play is landscape-only. In portrait, a blocking rotate prompt owns all button, keyboard, pointer, and gamepad input; it freezes the simulation and clears held actions without opening the pause menu or discarding the run. Rotating back to landscape continues from the same state without replaying buttons held during portrait. Neon Voyage requests a landscape orientation lock when the browser permits it, but iPhone and iPad browsers do not reliably expose that capability to an ordinary web page, so the player may need to rotate the device manually and turn off the system orientation lock.

Mobile browser-chrome focus changes do not pause an active touch run. Moving the page into the background or switching away still pauses through the document visibility lifecycle. A touch pause clears both stick captures, stops residual ship velocity, and requires fresh finger input before movement or firing can resume. Cleanup is pointer-ID-first: even a Safari/WebKit terminal event with a missing or malformed pointer type releases the stick it owns. Pointer release/cancel, inactive boundary exit, lost or silently dropped capture, zero-touch native termination, page freeze/restore, visibility, page exit, portrait blocking, and control-mode changes converge on neutral input. A per-frame capture watchdog clears only capture that the browser actually lost; there is no inactivity timeout, so a stationary held thumb remains valid and cannot be mistaken for a stale attack.

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

A wave stops spawning at its configured total. It advances only after the finite spawn and requeue lists are empty, every required objective has been resolved, and every living threat from that wave has left the field. Optional asteroids, splitting descendants, carrier children, and boss escorts therefore cannot be left behind even when they do not increase the required-objective counter. Between stages, a brief hyperspace sequence locks combat controls, carries the ship forward along its existing heading, clears the previous battlefield, and preserves the ship's screen position through the next encounter instead of visibly teleporting it.

Automatic opening threats use visible perimeter candidates selected for ship and threat clearance. Every threat that enters the field preserves at least 72 px of ship-surface clearance, 18 px from another threat, and 2.2 seconds of predicted contact time. On compact Stages 1–5, a large asteroid may adapt toward a safe configured radius floor; if the next threat still cannot fit, it remains in the finite wave queue instead of being forced beside the player. The director retries deferred threats as combat frees a safe perimeter slot, without losing the objective or pretending the wave is fully spawned. Newly placed asteroids also receive 2.2 seconds of collision grace.

Outside hyperspace, background stars remain twinkling points: they do not rotate with the ship or stretch into travel lines. Earth and Mars remain the opening landmarks; six locally bundled, photoreal deep-space worlds then replace the former procedural banded planets across the frontier, Titan Gate, first-contact, fleet, and command stages. All scenery remains offline and stage-authored.

Asteroids are ballistic physical hazards: they do not aim, home, or fire. Asteroid pairs use mass-aware separation and bounce without damaging or breaking one another, so required targets cannot disappear to friendly collisions. A genuine asteroid-to-alien impact can still destroy the alien and damage the asteroid; environmental destruction advances a relevant objective exactly once without granting score, combo, or pickup rewards. Ranged attacks belong to recognisable alien spacecraft, which appear only in the later half of the journey. Every alien wave in Stages 6–8 also carries a small, finite asteroid hazard mix, and all of it must be cleared before progression.

The largest colossal formation has an exact bounded break tree: one parent splits into three rocks, and each of those splits once into two final fragments (1→3→6). Every required descendant joins the live objective and remains subject to entity caps and hard-cull restoration. Damaged asteroids reveal three progressive crack stages plus a short hit flash before destruction, making remaining durability legible without adding an on-screen health bar.

## Weapons and pickups

The pulse cannon can grow into a run-wide stack of spread fire, seeker missiles, piercing rail shots, guardian drones, **Homing Salvo**, and **Radial Array**. The two new passive modules fire automatically when an eligible nearby threat exists: Homing Salvo launches periodic guided rockets, while Radial Array emits a periodic ring of projectiles. Field pickups provide short, immediately visible weapon changes and survival boosts, while rare module upgrades add bounded permanent power for the current run.

- Rapid Fire
- Tri-Shot
- Arc Burst
- Nova Lance
- Shield
- Hull Repair
- Piercing Rounds
- Pulse Charge
- Rare Weapon Upgrade

Temporary weapons coexist on independent timers, refresh only their own duration, change the live firing pattern, and expire back to the permanent loadout. The active Void Pulse is now a local defensive burst with a 280 px radius and substantially lower threat damage, so it creates space around the ship instead of clearing a battlefield. Combo chains, splitting objectives, environmental kills, dash movement, and Void Pulse keep short-term decisions active without an inventory screen.

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
- Separate size-limited, schema-validated local records for high score/preferences and unlocked-stage progress

## Development and contribution

Read [AGENTS.md](AGENTS.md) before changing the project. Keep updates small, config-driven, fully local, and dependency-free; preserve existing work and avoid speculative frameworks.

Node.js is optional and used only by the audit harness:

```sh
node tests/run.js
```

The frozen Neon Voyage 1.4.0 source snapshot passes **111/111** dependency-free automated checks on Node v24.14.0 / Linux x64, including a weapon-driven Stage 1–9 journey that defeats the Harrower boss under every entity cap. Its phone- and tablet-class touch evidence is browser-simulated rather than a claim of physical-device acceptance. A separate rendered Canvas inspection covered all six new local planet assets; no installed browser executable was available for hands-on prepublication play. The linked CI and Pages badges report the public workflows independently after publication, and release completion still requires an observed live Play after deployment.

A coherent release update includes a semantic version bump, [changelog](CHANGELOG.md), synchronized README/audit, deterministic regression coverage, regenerated checksums after files are frozen, and a short-lived release branch merged through a pull request. The active `Protect main` ruleset requires `Offline audit / audit`; force pushes, branch deletion, and bypasses are forbidden. Approval remains optional for solo maintenance and should be raised to one only when a real independent reviewer is available. See [AUDIT.md](AUDIT.md) and [tests/README.md](tests/README.md) for the current evidence and publication boundary.

## Credits and license

Designed and implemented with **OpenAI Codex**, with gameplay direction and review from **XenoVoyage**. The repository history, tests, audit, and changelog document that collaboration transparently.

Released under the [MIT License](LICENSE).
