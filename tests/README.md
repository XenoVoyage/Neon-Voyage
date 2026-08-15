# Neon Voyage test suite

Run the complete dependency-free audit from the repository root:

```sh
node tests/run.js
```

The browser game does not require Node.js. Node is used only for local and continuous verification.
Node.js 22 is the minimum verification baseline because both GitHub workflows run on Node 22. `AUDIT.md` records the exact environment used for its frozen evidence.

## Suite map

| Suite | Responsibility |
| --- | --- |
| `config-core.test.js` | Immutable 20-stage configuration, two-boss cadence, pickup pacing, Enigma and 13-module Mk V balance, milestone rewards, deterministic math, storage, bounds, and caps |
| `offline.test.js` | CSP, local resources, repository hygiene, documentation, checksums, and workflows |
| `browser-smoke.test.js` | Dependency-free browser/DOM/Canvas boot, menu, and generated upgrade-card integration |
| `progress.test.js` | Strict schema-3 campaign validation, schema-2/schema-1 migration, 20 Mk V/stacked checkpoints, milestone rewards, loadout summaries, dialogs, focus, and stage selection |
| `mobile-input.test.js` | Touch ownership, Enigma input blocking, pointer failures, lifecycle cleanup, orientation, and mobile layout |
| `gameplay.test.js` | Waves, spawning, collision, Enigma slowdown/selection, seven stacking effects, 13 permanent modules, both bosses, progression, and the complete Stage 1–20 journey |
| `visuals.test.js` | Twenty-scene continuity, planets, hyperspace, time-fracture/projectile/passive source contracts, damage presentation, and compact responsive HUD/dialog rules |
| `stress.test.js` | Long deterministic full-build simulation, reproducibility, finite state, all passive-system exercise, and enforced caps |

The harness exercises the stable `ND.game`, `ND.StagePreview`, and `ND.RenderDebug` test contracts exposed by the classic-script runtime. It installs no package and performs no network request.

## Final candidate checks

1. Run focused suites or syntax checks while iterating.
2. Freeze the candidate and regenerate `SHA256SUMS` so it covers the exact repository file set enforced by `offline.test.js`.
3. Run `node tests/run.js` and `sha256sum --check SHA256SUMS` on the final candidate.
4. Run `git diff --check`, inspect `git status --short`, and review the complete diff against the current base branch.

Do not edit `SHA256SUMS` by hand. A checksum pass proves file integrity only; it does not prove that behavior is correct or accepted.

## Browser and manual QA

Use only the rows affected by the change, plus the release row for a public runtime release. Record browser/device, viewport, input, source commit or preview URL, and what was actually observed.

| Area | Manual observation |
| --- | --- |
| Direct-file baseline | Open `index.html` through `file://`; start a run and confirm local scripts, assets, HUD, movement, aim, fire, Dash, Pulse, pause, and dialogs work without a server |
| Repository-subpath hosting | Open an allowed candidate preview at a `/Neon-Voyage/` path and confirm local resources, start, Continue cards, and play load without root-relative failures |
| Desktop input and accessibility | Exercise keyboard and mouse, focus order, dialogs, pause/resume, sound, reduced effects, and fullscreen where supported |
| Enigma draft | Collect Enigma during active pressure; confirm the gradual slowdown reaches a complete combat pause, three distinct cards remain readable, Escape/Pause cannot skip the decision, one choice applies, and protected combat resumes with neutral input |
| Upgrade HUD | Build several permanent and temporary upgrades; confirm only equipped permanent modules occupy the module strip, active temporary effects show live countdown chips, expired effects disappear, and no empty placeholder grid obscures the battlefield |
| Responsive layout | Inspect representative desktop, 667×375 and 568×320 phone landscape, and 1024×768 iPad landscape viewports; include the equipped-module strip, timed chips, three-card chooser, and Continue summaries without clipped primary controls, cards, objectives, or touch zones |
| Desktop and assistive choice input | Select each card with pointer and `1`–`3`; verify dialog focus, Tab order, full accessible labels, central announcements, and focus return after selection |
| Gamepad | Move, aim/fire, Dash, Pulse, pause, then use D-pad and primary action through an Enigma choice; verify held controls do not replay after resume |
| Physical touch | When touch or compact UI changes, use a real phone/tablet in landscape with two simultaneous sticks, action buttons, pause, rotation, background/foreground, and release/capture-loss cleanup |
| Passive and timed systems | Exercise Tesla chaining, orbit-blade contact cadence, player mine deployment, Shield Reactor recovery, Overclock fire cadence, Tractor Field attraction, Damage Amplifier, and Aegis Field; confirm effects are readable and remain within shared caps |
| Campaign and bosses | Complete the authored Stage 1–20 journey; confirm the easy asteroid opening, first alien arc, Harrower at Stage 10, evolved anomalies, advanced alien arc, Leviathan at Stage 20, clean escort requirements, and bounded next-sector wrap |
| Persistence | Exercise a fresh profile, exact legacy schema-2 and schema-1 records, malformed/denied/oversized storage, all 13 Mk V modules, all seven four-stack timers, Stage 2/4/5/6/8/9/11/12/14/15/17/19 milestones, 20 Continue cards, checkpoint refresh, and confirmed New Game reset |
| Published runtime | After deployment, open the exact Pages URL on desktop, select **Play**, complete a short combat interaction, and record the deployed commit and result |

## Evidence boundary

Automated browser tests use simulated viewports, Pointer Events, and Canvas calls. They establish deterministic behavior and regression coverage, not human acceptance of balance, difficulty, visual quality, audio, responsiveness, or physical phone/tablet feel. Physical phone and iPad acceptance is pending for the `v2026.8.15a` source candidate until separately observed and recorded. Each public release still requires the browser-smoke and live-Play gates defined in `AGENTS.md`.
