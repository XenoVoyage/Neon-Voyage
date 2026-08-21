# Neon Voyage test suite

Run the complete dependency-free audit from the repository root:

```sh
node tests/run.js
```

The browser game does not require Node.js. Node is used only for local and continuous verification.
Node.js 22 is the minimum local verification baseline. Both GitHub workflows pin Node.js `22.22.0`; `AUDIT.md` records the exact local environment used for its frozen evidence.

## Suite map

| Suite | Responsibility |
| --- | --- |
| `config-core.test.js` | Immutable seven-stage configuration and bounded audio mix/limiter values, stage-clear/touch-hold/game-over presentation timing, early Titan/alien novelty, durable alien contacts and child ceilings, two-boss cadence, five reward bands, gated powerups/modules, five milestones, crystal shrapnel, 13 Mk V systems, deterministic math, storage, bounds, and caps |
| `offline.test.js` | CSP, local resources, repository hygiene, documentation, checksums, and workflows |
| `browser-smoke.test.js` | Dependency-free browser/DOM/Canvas boot, bounded material/weapon-specific audio vocabulary, lifted voice gain, limiter routing, master-gain clamping, generated Enigma preview integration, and compact accessible touch summaries |
| `progress.test.js` | Strict schema-4 validation, strongest-loadout schema-3 twenty-to-seven compaction, exact schema-2/schema-1 migration, compatible/persistent volume and impact-feedback preferences, seven Mk V/stacked checkpoints, five milestone rewards, loadout summaries, dialogs, focus, and stage selection |
| `mobile-input.test.js` | Floating-stick ownership and response, queued ultra-short desktop click/Space taps, delayed stationary auto-aim/manual latch/hybrid-manual priority/target cleanup, ready-only actions, Enigma input blocking, pointer failures, lifecycle cleanup, orientation, and mobile layout |
| `gameplay.test.js` | Finite balanced waves and pressure-bounded reserves, clean-field pickup/Enigma salvage, expanded field containment and bounded camera follow, locked clear/travel handoff, terminal-but-delayed game-over presentation, Pulse asteroid pull without alien displacement, finite crystal shrapnel, slow inherited Auric fragmentation and Corona hazards, Gunship/Brood state, gated rewards, eight stacking effects including Thruster Surge, passive ranges, shared boss geometry/reflection, and the complete Stage 1–7 journey |
| `visuals.test.js` | Shell-owned renderer sizing, pointer-only reticle, capped clustered off-screen objective cues, terminal ship suppression, opt-in shake/flash rendering, seven-scene continuity, exact gameplay-raster mapping/draw coverage, readable alien play sizes and damage states, raster-led overlay contracts including stripe-free Overdrive art, deterministic irregular asteroid fractures, semantic pickup identities, player hull damage states, cached late/boss washes, Enigma micro-previews, cinematic contracts, and compact responsive rules |
| `stress.test.js` | Long deterministic full-build simulation, crystal shrapnel, hazard and reflection phase exercise, complete seven-stage and alien-role coverage, reproducibility, finite state, all passive systems, and enforced caps |

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
| Desktop input and accessibility | Exercise keyboard and mouse, focus order, dialogs, pause/resume, sound, visual density, default-off Camera shake and Screen flashes, and fullscreen where supported |
| Expanded field and camera | In early, alien, and boss stages, cross both axes, confirm the camera follows through a restrained dead zone, the viewport never reveals beyond the field, the ship can steer away after Dash reaches an edge, and visible targets do not receive edge cues |
| Off-screen objectives | Move several asteroids, aliens, a boss, and live nodes beyond different viewport edges; confirm no more than six cues appear, nearby targets cluster with accurate counts, target miniatures remain recognizable, protected boss bodies yield to their nodes, and cues update as targets re-enter view or die |
| Titan breach | Play Stage 2 from its Stage 1 loadout; confirm the five-root opening stays readable, reserve pairs prevent empty downtime without flooding split fragments, the Colossal and Titan arrive with clear cues, crystal shrapnel is dangerous but avoidable, and the complete encounter feels substantial rather than repetitive or grindy |
| Complete gameplay art and audio | Across representative early, alien, anomaly, and boss stages, inspect every asteroid and ship class, nodes, projectiles, mines, pickups, drones, blades, impacts, and destruction at real gameplay size and in motion. Confirm silhouettes remain readable against stars and bright worlds; alpha edges have no fringe or box; no rotating object carries a fixed cast/drop shadow or obsolete decorative line overlay; projectile heads align with collision direction; telegraphs and pickup symbols remain legible; reduced density remains calm; the 80% default is clearly audible without clipping; the 0–100% slider and mute preserve their state; and player weapons, hostile weapons, material impacts, destruction, pickups, Dash, Pulse, and boss cues are distinct without masking one another. |
| Enigma draft | From Stage 2 onward, collect Enigma during active pressure; confirm slowdown reaches a complete pause, three distinct stage-eligible cards and their restrained vector previews remain readable, a permanent card is not falsely guaranteed, Escape/Pause cannot skip the choice, one card applies, and protected combat resumes with neutral input |
| Upgrade HUD | Build several permanent and temporary upgrades; confirm desktop rows show only equipped systems and live countdowns, expired effects disappear, and compact touch landscape replaces each long row with one pointer-transparent accessible summary chip |
| Responsive layout | Inspect representative desktop, 667×375 and 568×320 phone landscape, and 1024×768 iPad landscape viewports; change mobile browser chrome or the visual viewport and confirm Canvas field edges remain aligned with the live game shell; include the 60-point shield readout, summary chips, enlarged floating sticks, ready-only action slots, three-card chooser/previews, and Continue summaries without clipped primary controls, cards, objectives, or touch zones |
| Desktop and assistive choice input | Select each card with pointer and `1`–`3`; verify dialog focus, Tab order, full accessible labels, central announcements, and focus return after selection |
| Gamepad | Move, aim/fire, Dash, Pulse, pause, then use D-pad and primary action through an Enigma choice; verify held controls do not replay after resume |
| Physical touch | When touch or compact UI changes, use a real phone/tablet in landscape with two simultaneous floating sticks, ready-only action buttons, pause, rotation, background/foreground, and release/capture-loss cleanup; confirm each base follows a dragged thumb without crossing pointer roles, a neutral 0.10-second right-stick hold locks/reacquires the nearest actionable threat without showing a reticle, and any deflection keeps manual aim for that gesture |
| Transition and defeat presentation | Leave ordinary and Enigma pickups on a genuinely cleared field; confirm they salvage through the normal application/choice paths before a one-second locked readable clear beat preserves only final effects and the unchanged 1.65-second hyperspace flight begins, with no early encounter change or input. Take lethal damage and confirm the run freezes immediately, the ship burst remains visible for 1.2 seconds without combat advancement, only then does the game-over dialog appear with focus on Play Again, and the destroyed ship does not return behind it. Repeat with shake and flashes off and on independently. |
| Evolved hazards and alien roles | Break an Auric Colossus and observe exactly three then six compact rocky explosive/magnetic descendants; confirm they inherit the parent drift and separate gradually, then check magnetic pull and local explosions. Exercise Corona warning/active/cooldown rotation and death blast. For every alien class, confirm the biomechanical raster remains readable at play size, sustained damage progresses through attached smoke/internal fire before destruction, and no line outline appears; then exercise Gunship warning/active laser plus Brood long-range armor, close-range vulnerability, lancer lineage, and four-child cap. |
| Passive and timed systems | Check Mk I and Mk V acquisition edges for Homing Salvo 480–680 px, Radial Array 360–520 px, Guardian Drone 360–560 px, Tesla Coil 360–600 px plus 130–220 px chains, Mine Layer 280–440 px, and Tractor Field 140–320 px. Exercise orbit-blade cadence, Shield Reactor, Overclock, Amplifier, Aegis, all four-stack timers, and Thruster Surge acceleration/top-speed changes within shared caps |
| Campaign and bosses | Complete Stage 1–7; confirm the Stage 2 Titan, Stage 3 first Scout, Stage 4 mixed front, Harrower at Stage 5, anomaly siege, and Leviathan at Stage 7; verify balanced groups, bounded descendants, expanded finite fields, node-dependent reflection, touch auto-aim priority, clean escorts, and bounded next-sector wrap |
| Rewards and persistence | Exercise all five drop bands (44/48/52/56/60%, pity 3/2/2/2/2), stage-gated pickup/module catalogs, Mk I–V ceilings, Stage 1/2/3/4/6 milestone modules, all 13 modules, all eight four-stack timers, seven Continue cards, strongest-loadout schema-3 compaction, exact schema-2/schema-1 migration, malformed/denied/oversized storage, checkpoint refresh, and confirmed New Game reset |
| Published runtime | After deployment, open the exact Pages URL on desktop, select **Play**, complete a short combat interaction, and record the deployed commit and result |

## Evidence boundary

Automated browser tests use simulated viewports, Pointer Events, and Canvas calls. They establish deterministic behavior and regression coverage, not human acceptance of balance, difficulty, visual quality, audio, responsiveness, or physical phone/tablet feel. [`AUDIT.md`](../AUDIT.md) records the frozen source evidence and exact results for the current checkpoint. Published-browser and physical-device evidence remain separate. Each public release still requires the browser-smoke and live-Play gates defined in `AGENTS.md`.
