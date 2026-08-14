# Project status

This document is the current-state handoff. It records project maturity and open decisions, not enduring engineering rules or release history.

## Current state

| Area | Status |
| --- | --- |
| Runtime | Complete, playable nine-stage browser game |
| Current runtime version | `v2026.8.15` release candidate |
| Hosting | Direct `file://` launch and GitHub Pages repository subpath |
| Dependencies and build | No runtime dependencies and no build step |
| Saved data | Local high score, preferences, unlocked stages, and bounded stacking checkpoint loadouts |
| Automated baseline | `139/139` checks pass for the frozen `v2026.8.15` source candidate |
| Product work | Enigma choices and deeper bounded weapon growth are implemented and source-verified |

The last reviewed default-branch baseline before this candidate was `4887f6a`. [`AUDIT.md`](../AUDIT.md) owns the reproducible `v2026.8.15` source evidence.

## Implemented product

- Nine finite stages lead from Earth Orbit to the Harrower command arena and then repeat in a bounded harder sector.
- Keyboard and mouse, gamepad, and independent two-stick touch input are implemented.
- Enigma pickups slow combat to a full stop and require one of three accessible enhancement choices before the simulation resumes.
- Permanent modules stack through Mk V, temporary weapons stack to four base durations, and Stage 2/4/6/8 clears target authored autonomous-module milestones.
- Progress is local and deliberately narrow: Continue exposes each saved loadout, then restores its weapons into a fresh battlefield rather than resuming live combat state.
- Fixed-step simulation, finite encounter queues, hard collection caps, local assets, and a restrictive Content Security Policy are enforced by tests.
- GitHub Actions audit pull requests and deploys the unchanged repository root to Pages after `main` updates.

See [`GAME_DESIGN.md`](GAME_DESIGN.md) for intended experience and [`ARCHITECTURE.md`](ARCHITECTURE.md) for implementation ownership.

## Evidence and acceptance

- [`AUDIT.md`](../AUDIT.md) records reproducible source and dependency-free browser-VM evidence for the frozen `v2026.8.15` candidate.
- Simulated viewports and Pointer Events are not physical-device acceptance.
- Rendered asset inspection is separate from the dependency-free suite unless its exact tool and output are recorded.
- A public runtime release still needs the post-deployment live Play check described in [`AGENTS.md`](../AGENTS.md).

## Publication status

`v2026.8.15` is the release-candidate label in the source. No merge, deployment, immutable tag, GitHub Release, or live verification for that label is recorded here. A changelog heading, Pages deployment, or version badge does not by itself create a release.

Creating or backfilling a tag is an explicit publication action. Do not do it during ordinary documentation maintenance, and never move a published tag.

## Next task boundary

Publish the frozen candidate through the protected pull-request workflow, then verify the required CI, Pages deployment, live version, and one desktop Play action. Physical-touch and compact-device hands-on acceptance remain separate from simulated coverage.
