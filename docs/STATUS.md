# Project status

This document is the current-state handoff. It records project maturity and open decisions, not enduring engineering rules or release history.

## Current state

| Area | Status |
| --- | --- |
| Runtime | Complete, playable nine-stage browser game |
| Current runtime version | `v2026.8.14` |
| Hosting | Direct `file://` launch and GitHub Pages repository subpath |
| Dependencies and build | No runtime dependencies and no build step |
| Saved data | Local high score, preferences, unlocked stages, and bounded checkpoint loadouts |
| Automated baseline | `124/124` checks recorded in [`AUDIT.md`](../AUDIT.md) |
| Product work | No active feature or approved roadmap item is documented |

The last fully reviewed default-branch baseline before this documentation pass was `e3d753fb90f7fb261c9184462886f5cd36ee9c28`.

## Implemented product

- Nine finite stages lead from Earth Orbit to the Harrower command arena and then repeat in a bounded harder sector.
- Keyboard and mouse, gamepad, and independent two-stick touch input are implemented.
- Progress is local and deliberately narrow: a checkpoint restores weapons into a fresh battlefield, not a suspended run.
- Fixed-step simulation, finite encounter queues, hard collection caps, local assets, and a restrictive Content Security Policy are enforced by tests.
- GitHub Actions audit pull requests and deploys the unchanged repository root to Pages after `main` updates.

See [`GAME_DESIGN.md`](GAME_DESIGN.md) for intended experience and [`ARCHITECTURE.md`](ARCHITECTURE.md) for implementation ownership.

## Evidence and acceptance

- [`AUDIT.md`](../AUDIT.md) records reproducible source and dependency-free browser-VM evidence for the current runtime version.
- Simulated viewports and Pointer Events are not physical-device acceptance.
- Rendered asset inspection is separate from the dependency-free suite unless its exact tool and output are recorded.
- A public runtime release still needs the post-deployment live Play check described in [`AGENTS.md`](../AGENTS.md).

## Publication status

`v2026.8.14` is the runtime version label in the source. At the reviewed baseline, no matching immutable Git tag or GitHub Release was present. A changelog heading, Pages deployment, or version badge does not by itself create a release.

Creating or backfilling a tag is an explicit publication action. Do not do it during ordinary documentation maintenance, and never move a published tag.

## Next task boundary

The repository is ready for a concrete feature or maintenance request. Before coding, define the desired outcome, affected player behavior, acceptance criteria, and out-of-scope work. Update this document only when project maturity, the active decision, a known blocker, or the verified baseline changes.
