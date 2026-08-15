# Project status

This document is the current-state handoff. It records project maturity and open decisions, not enduring engineering rules or release history.

## Current state

| Area | Status |
| --- | --- |
| Runtime | Deployed 20-stage browser game |
| Current runtime version | `v2026.8.15b` on `main` and GitHub Pages |
| Hosting | Direct `file://` launch and GitHub Pages repository subpath |
| Dependencies and build | No runtime dependencies and no build step |
| Saved data | Local high score, preferences, 20 unlocked stages, and bounded stacking checkpoint loadouts |
| Verification | `167/167` frozen-source checks and checksum pass; the latest post-merge audit and Pages deployment succeeded |
| Product work | Progressive rewards, staged threat novelty, evolved hazards, boss counterplay, and compact presentation are implemented and deployed |

Pull request [#9](https://github.com/XenoVoyage/Neon-Voyage/pull/9) established the current player-facing runtime, and pull request [#10](https://github.com/XenoVoyage/Neon-Voyage/pull/10) merged its behavior-preserving cleanup and test-harness consolidation. The post-merge Offline audit and Pages deployment for the current `main` checkpoint succeeded, and the live Pages site serves `v2026.8.15b`. [`AUDIT.md`](../AUDIT.md) remains the owner of the frozen automated source evidence; GitHub records provide the separate merge and deployment evidence.

## Implemented product

- Twenty finite stages increase authored composition pressure from an accessible asteroid opening through staged alien roles, the Harrower at Stage 10, evolved anomaly fields, advanced fleets, and the Leviathan at Stage 20.
- Keyboard and mouse, gamepad, and independent two-stick touch input are implemented.
- Enigma pickups slow combat to a full stop and require one of three accessible enhancement cards. Each card has a deterministic local Canvas preview, and a draft may omit permanent choices when its stage band does not offer one.
- Six reward bands begin at Stages 1, 3, 4, 6, 11, and 16. Their drop chances are 26%, 28%, 29%, 31%, 34%, and 38%; pity triggers after four kills in the first four bands and three in the final two.
- The 13-module catalog opens by stage and its reward ceiling advances from Mk I to Mk V. Only Stages 3, 6, 9, 12, 15, and 18 grant authored milestone modules.
- Seven temporary effects last 24–30 seconds per pickup and stack to four base durations. Damage Amplifier and Aegis Field join the existing weapon effects.
- Auric Colossi split through an exact 1→3→6 explosive/magnetic shard tree. Coronas own a warning/active rotating beam and local death blast; Gunships use a warning/active laser; Brood Carriers trade long-range armor for close-range vulnerability and retain a bounded lancer lineage through requeues.
- The Harrower retains its circular arena. The Leviathan owns a responsive rectangular field and a node-dependent reflector that weakens direct body shots and returns configured hostile projectiles while nodes live.
- Shield reserve is visible only while charged, capped at a weaker 60 points, and consumed at 1.25 points per absorbed damage. Passive acquisition and attraction use their exact equipped-tier ranges.
- The live HUD lists equipped permanent modules and active timed countdowns; compact touch layouts replace each long row with one pointer-transparent accessible summary chip. Late-stage and boss scenes add cached restrained nebula washes.
- Progress remains deliberately narrow and schema-compatible: strict schema 3 stores up to 20 bounded checkpoints within 16,384 bytes, preserves the exact tested schema-2/schema-1 migrations, and restores a fresh battlefield rather than live combat state.
- Fixed-step simulation, finite encounter queues, hard collection caps, local assets, and a restrictive Content Security Policy are enforced by tests.
- GitHub Actions audit pull requests and deploys the unchanged repository root to Pages after `main` updates.

See [`GAME_DESIGN.md`](GAME_DESIGN.md) for intended experience and [`ARCHITECTURE.md`](ARCHITECTURE.md) for implementation ownership.

## Evidence and acceptance

- [`AUDIT.md`](../AUDIT.md) records `167/167` checks on the frozen source tree, including browser-VM boot, simulated responsive/input contracts, the complete weapon-driven Stage 1–20 journey, deterministic long-run stress, and exact checksum coverage.
- Pull requests #9 and #10 are merged; the latest post-merge Offline audit and Pages deployment succeeded, and the deployed site serves the expected runtime version.
- Simulated viewports and Pointer Events are not physical-device acceptance.
- Compact 568×320, 667×375, and iPad-class automated layout coverage must be reported separately from hands-on phone and iPad results. Physical-device acceptance remains pending.
- No remote immutable Git tag or GitHub Release exists for `v2026.8.15b`.

## Publication status

`v2026.8.15b` is the deployed runtime version on `main`. It is not a published release under this repository's definition because no matching immutable tag exists remotely. A local tag, changelog heading, Pages deployment, or version badge does not by itself create that release.

Creating or backfilling a tag is an explicit publication action. Do not do it during ordinary documentation maintenance, and never move a published tag.

## Next task boundary

Publishing a formal release requires an explicit owner decision to create the matching immutable remote tag. Physical phone and iPad acceptance remains a separate unverified boundary.
