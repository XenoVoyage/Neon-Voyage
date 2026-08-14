# Neon Voyage test suite

Run the complete dependency-free audit from the repository root:

```sh
node tests/run.js
```

The browser game does not require Node.js. Node is used only for local and continuous verification.

## Suite map

| Suite | Responsibility |
| --- | --- |
| `config-core.test.js` | Immutable configuration, deterministic math, storage, bounds, and caps |
| `offline.test.js` | CSP, local resources, repository hygiene, documentation, checksums, and workflows |
| `browser-smoke.test.js` | Dependency-free browser/DOM/Canvas boot and menu integration |
| `progress.test.js` | Campaign migration, checkpoints, dialogs, focus, and stage selection |
| `mobile-input.test.js` | Touch ownership, pointer failures, lifecycle cleanup, orientation, and mobile layout |
| `gameplay.test.js` | Waves, spawning, collision, combat, weapons, progression, and the complete journey |
| `visuals.test.js` | Scene continuity, planets, hyperspace, damage presentation, and compact HUD rules |
| `stress.test.js` | Long deterministic simulation, reproducibility, finite state, and enforced caps |

The harness exercises the stable `ND.game`, `ND.StagePreview`, and `ND.RenderDebug` test contracts exposed by the classic-script runtime. It installs no package and performs no network request.

## Evidence boundary

Automated browser tests use simulated viewports, Pointer Events, and Canvas calls. They establish deterministic behavior and regression coverage, not human acceptance of balance, difficulty, visual quality, audio, responsiveness, or physical phone/tablet feel. Each public release still requires the browser-smoke and live-Play gates defined in `AGENTS.md`.
