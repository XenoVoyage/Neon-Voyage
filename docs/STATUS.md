# Project status

This document is the current-state handoff. It records project maturity and open decisions, not enduring engineering rules or release history.

## Current state

| Area | Status |
| --- | --- |
| Runtime | Complete, playable 20-stage browser game source candidate |
| Current runtime version | `v2026.8.15a` source candidate |
| Hosting | Direct `file://` launch and GitHub Pages repository subpath |
| Dependencies and build | No runtime dependencies and no build step |
| Saved data | Local high score, preferences, 20 unlocked stages, and bounded stacking checkpoint loadouts |
| Automated baseline | `147/147` checks pass for the frozen `v2026.8.15a` source candidate |
| Product work | Expanded campaign, denser upgrade pacing, new passive systems, and compact upgrade HUD are implemented in source |

This candidate is based on default-branch commit `fa87c4c`. [`AUDIT.md`](../AUDIT.md) owns the reproducible `v2026.8.15a` source evidence.

## Implemented product

- Twenty finite stages lead from Earth Orbit through the Harrower at Stage 10, a second anomaly-and-alien arc, and the Leviathan at Stage 20 before repeating in a bounded harder sector.
- Keyboard and mouse, gamepad, and independent two-stick touch input are implemented.
- Enigma pickups slow combat to a full stop and require one of three accessible enhancement choices before the simulation resumes.
- Thirteen permanent modules stack through Mk V. The expanded set adds Tesla Coil, Orbit Blades, Mine Layer, Shield Reactor, Overclock Matrix, and Tractor Field to the original seven systems.
- Seven temporary effects last 24–30 seconds per pickup and stack to four base durations. Damage Amplifier and Aegis Field join the existing weapon effects.
- Field rewards use a 48% drop chance and two-kill pity interval, with Enigma and permanent-module pickups weighted much more heavily than in the prior build.
- The live HUD lists only equipped permanent modules and presents active temporary effects as separate countdown chips; empty module placeholders no longer reserve space.
- Progress is local and deliberately narrow: strict schema 3 stores up to 20 checkpoint loadouts within a 16,384-byte limit, migrates valid exact-shape schema-2 and schema-1 records, and restores a fresh battlefield rather than live combat state.
- Fixed-step simulation, finite encounter queues, hard collection caps, local assets, and a restrictive Content Security Policy are enforced by tests.
- GitHub Actions audit pull requests and deploys the unchanged repository root to Pages after `main` updates.

See [`GAME_DESIGN.md`](GAME_DESIGN.md) for intended experience and [`ARCHITECTURE.md`](ARCHITECTURE.md) for implementation ownership.

## Evidence and acceptance

- [`AUDIT.md`](../AUDIT.md) records the dependency-free suite, checksum, syntax, deterministic Stage 1–20 journey, browser-VM smoke, responsive contracts, and long-run stress evidence for the frozen `v2026.8.15a` candidate.
- The cloud browser cannot reach the workspace-local preview route, so hands-on browser play remains a post-deployment Pages gate rather than source-audit evidence.
- Simulated viewports and Pointer Events are not physical-device acceptance.
- Rendered asset inspection is separate from the dependency-free suite unless its exact tool and output are recorded.
- Physical phone and iPad hands-on acceptance remains pending; automated compact and tablet viewport checks must be reported separately.
- A public runtime release still needs the protected pull-request checks and post-deployment live Play check described in [`AGENTS.md`](../AGENTS.md).

## Publication status

`v2026.8.15a` is a source-candidate label. No merge, deployment, immutable tag, GitHub Release, or live verification for that label is recorded here. A changelog heading, Pages deployment, or version badge does not by itself create a release.

Creating or backfilling a tag is an explicit publication action. Do not do it during ordinary documentation maintenance, and never move a published tag.

## Next task boundary

Publish the frozen candidate through the protected pull-request workflow only after the required check passes, then verify Pages, the live version, one desktop Play action, compact phone/tablet-class layouts, and console cleanliness. Physical-touch phone and iPad acceptance remains separate from automated viewport coverage.
