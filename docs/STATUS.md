# Project status

This document is the current-state handoff. It records project maturity and open decisions, not enduring engineering rules or release history.

## Current state

| Area | Status |
| --- | --- |
| Runtime | Seven-stage browser game; protected `main` publishes to Pages after audit |
| Current runtime version | `v2026.8.20h` in the source checkpoint; Pages follows successful `main` deployments |
| Hosting | Direct `file://` launch and GitHub Pages repository subpath |
| Dependencies and build | No runtime dependencies and no build step |
| Saved data | Unchanged local keys; schema-4 seven-stage progress with exact schema-3/schema-2/schema-1 migration and bounded stacking checkpoint loadouts |
| Verification | Frozen-source results belong in [`AUDIT.md`](../AUDIT.md); merge, Pages, live-play, and physical-touch evidence remain separate gates |
| Product work | Seven-stage pacing, early Titan and alien contact, frequent longer rewards, asteroid-only Pulse attraction, crystal shrapnel, semantic pickups, damage-state effects, expanded finite scrolling fields, complete realistic gameplay art, and material-aware synthesized audio are implemented |

The current source checkpoint compresses the complete expedition to seven stages. Stage 2 owns one pre-authored ten-root Titan breach with five opening roots, bounded later pairs, a Colossal, and the Titan; Stage 3 begins alien contact; Stage 4 mixes ordinary fleet roles with evolved asteroids; the Harrower and Leviathan now own Stages 5 and 7. Rewards arrive at 44–60% with two- or three-defeat pity, temporary effects last 42–48 seconds, and Homing Salvo, Tractor Field, Guardian Drone, Radial Array, and Seeker Rack are guaranteed during the run. Crystal deaths emit finite hostile shrapnel, Void Pulse pulls asteroids but never ships, pickups expose distinct glyphs and labels, and the damaged interceptor gains restrained smoke/fire/electricity. A restrained dead-zone camera remains inside hard field bounds, capped clustered edge cues identify off-screen objectives, and ultra-short desktop fire taps remain queued for one fixed step. Exact save migration, accessibility, deterministic caps, security, offline operation, art ownership, and bounded audio remain enforced. [`AUDIT.md`](../AUDIT.md) owns frozen automated source evidence; GitHub records and hands-on browser sessions separately own merge, deployment, live-play, balance, visual-quality, audio-quality, and physical-device evidence.

## Implemented product

- Seven finite stages advance on every clear from Earth Orbit through the Stage 2 Titan breach, Stage 3 first contact, Stage 4 mixed front, Harrower at Stage 5, anomaly siege, and Leviathan at Stage 7. Every reserve and descendant tree is finite, deterministic, pressure-bounded, and counted by the objective where required.
- Keyboard and mouse, gamepad, and independent floating two-stick touch input are implemented. Enlarged stick bases follow drag overshoot, and the reserved Dash/Pulse slots become visible and interactive only while ready. A neutral right-stick hold waits 0.10 seconds, then locks and reacquires the nearest actionable threat; any deflection keeps manual aim in control for the rest of that touch. A damage-reduced command-ship body is excluded while its nodes live.
- Enigma pickups slow combat to a full stop and require one of three accessible enhancement cards. Each card has a deterministic local Canvas preview, and a draft may omit permanent choices when its stage band does not offer one.
- Five reward bands begin at Stages 1, 2, 3, 5, and 7. Their drop chances are 44%, 48%, 52%, 56%, and 60%; pity triggers after three kills at Stage 1 and two thereafter.
- The 13-module catalog opens by stage and its reward ceiling advances from Mk I to Mk V. Stages 1, 2, 3, 4, and 6 guarantee Homing Salvo, Tractor Field, Guardian Drone, Radial Array, and Seeker Rack respectively.
- Eight temporary effects last 42–48 seconds per pickup and stack to four base durations. Thruster Surge adds bounded acceleration and top-speed multipliers alongside the seven weapon/defense effects.
- Crystal asteroids emit eight finite hostile shards on destruction without adding objectives. Auric Colossi split through an exact 1→3→6 explosive/magnetic shard tree. Coronas own a warning/active rotating beam and local death blast; Gunships use a warning/active laser; Brood Carriers trade long-range armor for close-range vulnerability and retain a bounded lancer lineage through requeues. Seeded mixed asteroid groups distribute kinds within one count of each other, and late anomaly waves limit guaranteed massive roots.
- Every normal and boss encounter uses the same expanded finite rectangular field. The camera follows the ship inside a viewport-scaled dead zone with bounded lookahead, while hard borders prevent the player and encounter objects from leaving the authored play space. The Leviathan retains its node-dependent reflector.
- At most six off-screen objective cues are drawn inside a safe viewport margin. They reuse authored target art, cluster nearby objectives with counts, exclude stale or visible objects, and favor exposed boss nodes over a protected command-ship body.
- The Canvas renderer derives its CSS-space dimensions from the actual `#game-shell` layout box and uses device-pixel ratio only for its bounded backing store. Mobile browser-toolbar changes therefore resize the combat field and its top/bottom cues with the surrounding responsive shell.
- The cyan/magenta aim reticle appears only for active mouse or pen pointer aim. Touch input hides it; a later pointer move can restore it on a hybrid device without changing mouse, keyboard, or gamepad control.
- Forty-six local transparent gameplay WebPs cover the player, every asteroid and spacecraft family, projectiles, equipment, pickups, and material effects. The renderer keeps deterministic procedural fallbacks for pending or failed loads while code-drawn telegraphs, shields, restrained irregular fracture stages, hazard pulses, semantic pickup glyphs/labels, and player damage states preserve live-state readability.
- Optional Web Audio now owns bounded, cooldown-limited cues for each player weapon family, alien and boss weapons, shield/hull/asteroid/alien/boss impacts, destruction scale, pickups, upgrades, Dash, Pulse, and arena events. It loads no media or network resource and retains the 24-node ceiling.
- Clearing a stage enters a one-second locked presentation that preserves only bounded final effects and floaters before the existing unchanged 1.65-second hyperspace flight. A lethal hit makes the run terminal immediately, freezes combat and input, advances only bounded death effects for 1.2 seconds, then reveals and focuses the game-over dialog.
- Shield reserve is visible only while charged, capped at a weaker 60 points, and consumed at 1.25 points per absorbed damage. Passive acquisition and attraction use their exact equipped-tier ranges.
- The live HUD lists equipped permanent modules and active timed countdowns; compact touch layouts replace each long row with one pointer-transparent accessible summary chip. Late-stage and boss scenes add cached restrained nebula washes.
- Progress remains deliberately narrow and schema-compatible: strict schema 4 stores up to seven bounded checkpoints within 16,384 bytes, compacts valid schema-3 twenty-stage saves by preserving the strongest converging loadout, preserves exact schema-2/schema-1 migrations, and restores a fresh battlefield rather than live combat state.
- Fixed-step simulation, finite encounter queues, hard collection caps, local assets, and a restrictive Content Security Policy are enforced by tests.
- GitHub Actions audit pull requests and deploys the unchanged repository root to Pages after `main` updates.

See [`GAME_DESIGN.md`](GAME_DESIGN.md) for intended experience and [`ARCHITECTURE.md`](ARCHITECTURE.md) for implementation ownership.

## Evidence and acceptance

- [`AUDIT.md`](../AUDIT.md) owns the exact frozen-source command results and coverage for this checkpoint, including browser-VM boot, simulated responsive/input contracts, both finite presentation phases, the Stage 1–7 journey, deterministic long-run stress, and checksum coverage.
- Pull-request checks, post-merge audit, Pages deployment, deployed-version inspection, and live Play are publication gates recorded outside the source checkpoint.
- Simulated shell/viewport mismatches and Pointer Events are not physical-device acceptance.
- Compact 568×320, 667×375, and iPad-class automated layout coverage must be reported separately from hands-on phone and iPad results. Physical-device acceptance remains pending.

## Publication status

`v2026.8.20h` is the current runtime label. A local label, changelog heading, Pages deployment, or version badge does not by itself prove that a matching immutable tag and formal GitHub Release exist; publication status must be confirmed from GitHub.

Creating or backfilling a tag is an explicit publication action. Do not do it during ordinary documentation maintenance, and never move a published tag.

## Next task boundary

Play the complete seven-stage expedition from a fresh Stage 1 loadout and judge human pacing, pickup recognizability, reward frequency, Titan/Colossal descendant pressure, crystal-shard fairness, early alien readability, boss difficulty, and the absence of empty travel or unfair flooding. Separately review damage-state effects, the expanded camera field, complete gameplay art, and sound on desktop, then record hands-on phone and iPad landscape acceptance. Automated evidence cannot accept game feel or physical controls. Publishing a formal tagged release requires an explicit owner decision; physical phone and iPad acceptance remains unverified until actually observed.
