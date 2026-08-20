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
| `config-core.test.js` | Immutable 20-stage configuration, stage-clear/touch-hold/game-over presentation timing, staged novelty and pressure, two-boss cadence, six reward bands, gated powerups/modules, six milestones, 13 Mk V systems, deterministic math, storage, bounds, and caps |
| `offline.test.js` | CSP, local resources, repository hygiene, documentation, checksums, and workflows |
| `browser-smoke.test.js` | Dependency-free browser/DOM/Canvas boot, generated Enigma preview integration, and compact accessible touch summaries |
| `progress.test.js` | Unchanged strict schema-3 validation, exact schema-2/schema-1 migration, 20 Mk V/stacked checkpoints, six milestone rewards, loadout summaries, dialogs, focus, and stage selection |
| `mobile-input.test.js` | Floating-stick ownership and response, delayed stationary auto-aim/manual latch/hybrid-manual priority/target cleanup, ready-only actions, Enigma input blocking, pointer failures, lifecycle cleanup, orientation, and mobile layout |
| `gameplay.test.js` | Finite and balanced waves, locked clear/travel handoff, terminal-but-delayed game-over presentation, Auric/Corona hazards, Gunship/Brood state, gated rewards and Enigma, seven stacking effects, passive ranges, 60-point shield, shared boss-field geometry, Leviathan reflection, and the complete Stage 1–20 journey |
| `visuals.test.js` | Shared procedural material-language contract, shell-owned renderer sizing, pointer-only reticle, twenty-scene continuity, cached late/boss washes, deterministic Enigma micro-previews, clear-versus-travel hyperspace contracts, projectile/field contracts, damage presentation, and compact responsive summary/dialog rules |
| `stress.test.js` | Long deterministic full-build simulation, hazard and reflection phase exercise, staged alien coverage, reproducibility, finite state, all passive systems, and enforced caps |

The generic and browser harnesses exercise the stable `ND.game`, `ND.StagePreview`, `ND.EnigmaPreview`, and `ND.RenderDebug` test contracts exposed by the classic-script runtime. They install no package and perform no network request.

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
| Enigma draft | From Stage 3 onward, collect Enigma during active pressure; confirm slowdown reaches a complete pause, three distinct stage-eligible cards and their restrained vector previews remain readable, a permanent card is not falsely guaranteed, Escape/Pause cannot skip the choice, one card applies, and protected combat resumes with neutral input |
| Upgrade HUD | Build several permanent and temporary upgrades; confirm desktop rows show only equipped systems and live countdowns, expired effects disappear, and compact touch landscape replaces each long row with one pointer-transparent accessible summary chip |
| Responsive layout | Inspect representative desktop, 667×375 and 568×320 phone landscape, and 1024×768 iPad landscape viewports; change mobile browser chrome or the visual viewport and confirm Canvas field edges remain aligned with the live game shell; include the 60-point shield readout, summary chips, enlarged floating sticks, ready-only action slots, three-card chooser/previews, and Continue summaries without clipped primary controls, cards, objectives, or touch zones |
| Desktop and assistive choice input | Select each card with pointer and `1`–`3`; verify dialog focus, Tab order, full accessible labels, central announcements, and focus return after selection |
| Gamepad | Move, aim/fire, Dash, Pulse, pause, then use D-pad and primary action through an Enigma choice; verify held controls do not replay after resume |
| Physical touch | When touch or compact UI changes, use a real phone/tablet in landscape with two simultaneous floating sticks, ready-only action buttons, pause, rotation, background/foreground, and release/capture-loss cleanup; confirm each base follows a dragged thumb without crossing pointer roles, a neutral 0.10-second right-stick hold locks/reacquires the nearest actionable threat without showing a reticle, and any deflection keeps manual aim for that gesture |
| Transition and defeat presentation | Clear an ordinary stage and each boss route; confirm a one-second locked readable clear beat preserves only final effects before the unchanged 1.65-second hyperspace flight, with no early encounter change or input. Take lethal damage and confirm the run freezes immediately, the ship burst remains visible for 1.2 seconds without combat advancement, and only then does the game-over dialog appear with focus on Play Again |
| Evolved hazards and alien roles | Break an Auric Colossus and observe exactly three then six mixed explosive/magnetic descendants; check magnetic pull and local explosions. Exercise Corona warning/active/cooldown rotation and death blast, Gunship warning/active laser, and Brood long-range armor, close-range vulnerability, lancer lineage, and six-child cap |
| Passive and timed systems | Check Mk I and Mk V acquisition edges for Homing Salvo 480–680 px, Radial Array 360–520 px, Guardian Drone 360–560 px, Tesla Coil 360–600 px plus 130–220 px chains, Mine Layer 280–440 px, and Tractor Field 140–320 px. Exercise orbit-blade cadence, Shield Reactor, Overclock, Amplifier, Aegis, and all four-stack timers within shared caps |
| Campaign and bosses | Complete Stage 1–20; confirm staged asteroid and alien novelty, balanced mixed groups, bounded massive-root pressure, both bosses using the normal responsive rectangular field without a glowing boss ring, node-dependent Leviathan reflection, touch auto-aim preferring live nodes/other threats over each damage-reduced command-ship body, clean escort requirements, and bounded next-sector wrap |
| Rewards and persistence | Exercise all six drop bands (26/28/29/31/34/38%, pity 4/4/4/4/3/3), stage-gated pickup/module catalogs, Mk I–V band ceilings, only the Stage 3/6/9/12/15/18 milestones, all 13 modules, all seven four-stack timers, 20 Continue cards, and unchanged exact schema-2/schema-1 migration, malformed/denied/oversized storage, checkpoint refresh, and confirmed New Game reset |
| Published runtime | After deployment, open the exact Pages URL on desktop, select **Play**, complete a short combat interaction, and record the deployed commit and result |

## Evidence boundary

Automated browser tests use simulated viewports, Pointer Events, and Canvas calls. They establish deterministic behavior and regression coverage, not human acceptance of balance, difficulty, visual quality, audio, responsiveness, or physical phone/tablet feel. [`AUDIT.md`](../AUDIT.md) records the frozen source evidence and exact results for the current checkpoint. Published-browser and physical-device evidence remain separate. Each public release still requires the browser-smoke and live-Play gates defined in `AGENTS.md`.
