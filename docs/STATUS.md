# Project status

This document is the current-state handoff. It records project maturity and open decisions, not enduring engineering rules or release history.

## Current state

| Area | Status |
| --- | --- |
| Runtime | 20-stage browser game published from protected `main` |
| Current runtime version | `v2026.8.20d` in the source checkpoint; Pages follows successful `main` deployments |
| Hosting | Direct `file://` launch and GitHub Pages repository subpath |
| Dependencies and build | No runtime dependencies and no build step |
| Saved data | Unchanged local high score, preferences, schema-3 20-stage progress, and bounded stacking checkpoint loadouts |
| Verification | Frozen-source results belong in [`AUDIT.md`](../AUDIT.md); merge, Pages, live-play, and physical-touch evidence remain separate gates |
| Product work | Mobile viewport alignment, touch-target readability, stage/death presentation polish, progressive rewards, evolved hazards, full-field boss counterplay, and a six-subject realistic gameplay-art proof are implemented |

The current source checkpoint replaces the rejected procedural geometry pilot with a ground-up realistic raster proof for six representative subjects: player interceptor, common asteroid, alien Scout, starting projectile, compact impact, and shield pickup. The proof changes presentation only; gameplay, collisions, saved data, accessibility, deterministic bounds, security, and offline operation remain unchanged. Every other visual family retains its established renderer until hands-on gameplay acceptance supports expansion. [`AUDIT.md`](../AUDIT.md) owns frozen automated source evidence; GitHub records and hands-on browser sessions separately own merge, deployment, live-play, visual-quality, and physical-device evidence.

## Implemented product

- Twenty finite stages increase authored composition pressure from an accessible asteroid opening through staged alien roles, the Harrower at Stage 10, evolved anomaly fields, advanced fleets, and the Leviathan at Stage 20.
- Keyboard and mouse, gamepad, and independent floating two-stick touch input are implemented. Enlarged stick bases follow drag overshoot, and the reserved Dash/Pulse slots become visible and interactive only while ready. A neutral right-stick hold waits 0.10 seconds, then locks and reacquires the nearest actionable threat; any deflection keeps manual aim in control for the rest of that touch. A damage-reduced command-ship body is excluded while its nodes live.
- Enigma pickups slow combat to a full stop and require one of three accessible enhancement cards. Each card has a deterministic local Canvas preview, and a draft may omit permanent choices when its stage band does not offer one.
- Six reward bands begin at Stages 1, 3, 4, 6, 11, and 16. Their drop chances are 26%, 28%, 29%, 31%, 34%, and 38%; pity triggers after four kills in the first four bands and three in the final two.
- The 13-module catalog opens by stage and its reward ceiling advances from Mk I to Mk V. Only Stages 3, 6, 9, 12, 15, and 18 grant authored milestone modules.
- Seven temporary effects last 24–30 seconds per pickup and stack to four base durations. Damage Amplifier and Aegis Field join the existing weapon effects.
- Auric Colossi split through an exact 1→3→6 explosive/magnetic shard tree. Coronas own a warning/active rotating beam and local death blast; Gunships use a warning/active laser; Brood Carriers trade long-range armor for close-range vulnerability and retain a bounded lancer lineage through requeues. Seeded mixed asteroid groups distribute kinds within one count of each other, and late anomaly waves limit guaranteed massive roots.
- The Harrower and Leviathan both use the normal responsive rectangular battlefield with subtle edge cues. The Leviathan retains its node-dependent reflector that weakens direct body shots and returns configured hostile projectiles while nodes live.
- The Canvas renderer derives its CSS-space dimensions from the actual `#game-shell` layout box and uses device-pixel ratio only for its bounded backing store. Mobile browser-toolbar changes therefore resize the combat field and its top/bottom cues with the surrounding responsive shell.
- The cyan/magenta aim reticle appears only for active mouse or pen pointer aim. Touch input hides it; a later pointer move can restore it on a hybrid device without changing mouse, keyboard, or gamepad control.
- Six local transparent WebPs provide the realistic gameplay-art proof for the player interceptor, common `rock`, alien `scout`, starting `bolt`, selected compact ring impacts, and `shield` pickup. The renderer keeps existing deterministic procedural fallbacks for failed loads and all non-proof families.
- Clearing a stage enters a one-second locked presentation that preserves only bounded final effects and floaters before the existing unchanged 1.65-second hyperspace flight. A lethal hit makes the run terminal immediately, freezes combat and input, advances only bounded death effects for 1.2 seconds, then reveals and focuses the game-over dialog.
- Shield reserve is visible only while charged, capped at a weaker 60 points, and consumed at 1.25 points per absorbed damage. Passive acquisition and attraction use their exact equipped-tier ranges.
- The live HUD lists equipped permanent modules and active timed countdowns; compact touch layouts replace each long row with one pointer-transparent accessible summary chip. Late-stage and boss scenes add cached restrained nebula washes.
- Progress remains deliberately narrow and schema-compatible: strict schema 3 stores up to 20 bounded checkpoints within 16,384 bytes, preserves the exact tested schema-2/schema-1 migrations, and restores a fresh battlefield rather than live combat state.
- Fixed-step simulation, finite encounter queues, hard collection caps, local assets, and a restrictive Content Security Policy are enforced by tests.
- GitHub Actions audit pull requests and deploys the unchanged repository root to Pages after `main` updates.

See [`GAME_DESIGN.md`](GAME_DESIGN.md) for intended experience and [`ARCHITECTURE.md`](ARCHITECTURE.md) for implementation ownership.

## Evidence and acceptance

- [`AUDIT.md`](../AUDIT.md) owns the exact frozen-source command results and coverage for this checkpoint, including browser-VM boot, simulated responsive/input contracts, both finite presentation phases, the Stage 1–20 journey, deterministic long-run stress, and checksum coverage.
- Pull-request checks, post-merge audit, Pages deployment, deployed-version inspection, and live Play are publication gates recorded outside the source checkpoint.
- Simulated shell/viewport mismatches and Pointer Events are not physical-device acceptance.
- Compact 568×320, 667×375, and iPad-class automated layout coverage must be reported separately from hands-on phone and iPad results. Physical-device acceptance remains pending.

## Publication status

`v2026.8.20d` is the current runtime label. A local label, changelog heading, Pages deployment, or version badge does not by itself prove that a matching immutable tag and formal GitHub Release exist; publication status must be confirmed from GitHub.

Creating or backfilling a tag is an explicit publication action. Do not do it during ordinary documentation maintenance, and never move a published tag.

## Next task boundary

Review the six-subject realistic raster proof in live motion on desktop and at phone/iPad landscape sizes. If its silhouette, lighting, readability, scale, transparency, and performance are accepted, author the remaining asteroid, player/alien spacecraft, projectile, particle/effect, and pickup families to the same material language in separately reviewable batches. Publishing a formal release requires an explicit owner decision for any missing immutable tag or GitHub Release action. Physical phone and iPad acceptance remains a separate unverified boundary.
