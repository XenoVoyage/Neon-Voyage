# Architecture

Neon Voyage is a static browser game built from one HTML document, one stylesheet, five deferred classic scripts, Canvas rendering, and Web Audio. It has no runtime package, module loader, server, network request, or build step.

## Startup and data flow

`index.html` loads scripts in this fixed order:

1. `js/config.js` creates the deeply frozen balance and stage configuration.
2. `js/core.js` exposes deterministic math, collision, storage, bounds, and collection utilities.
3. `js/audio.js` defines the capped optional Web Audio engine.
4. `js/render.js` defines authored scene data, checkpoint and Enigma previews, cached encounter washes, and the Canvas renderer.
5. `js/game.js` validates saved records, creates live state, binds input and UI, and starts the one animation loop.

Browser events write input intent. `js/game.js` consumes that intent in a 60 Hz fixed-step update with at most five catch-up steps per animation frame. Normal play uses the complete fixed delta. An Enigma draft deterministically tapers the simulation delta during its short slowdown and then supplies zero simulation time while the three-card choice is open. The renderer and accessible DOM continue presenting frames and status without advancing combat. Simulation state does not depend on render timing.

The renderer's CSS-space width and height come from the live `#game-shell` layout rectangle, including mobile browser-toolbar and `visualViewport` changes. Device-pixel ratio affects only the capped Canvas backing store. The simulation derives a larger viewport-scaled finite field from that same size; `js/game.js` owns the dead-zone camera target and clamps it so the viewport remains inside the field.

```mermaid
flowchart LR
    Input[Browser input] --> Intent[Input intent]
    Intent --> Simulation[Fixed-step simulation]
    Simulation --> State[Bounded state]
    State --> Output[Canvas, DOM, and audio]
    State --> Storage[Strict local records]
```

## Source ownership

| Source | Owns | Does not own |
| --- | --- | --- |
| `index.html` | Semantic shell, Enigma and campaign dialogs, HUD, controls, CSP, script order | Gameplay behavior or styling |
| `styles.css` | Responsive upgrade cards, checkpoint summaries, overlays, touch presentation, focus, reduced-motion styling | Simulation state |
| `js/config.js` | Version, stages, milestone rewards, module tiers, pickup pacing, audio defaults, dimensions, timing, difficulty, caps | Mutable run state |
| `js/core.js` | Pure reusable deterministic utilities and safe storage primitives | Domain orchestration |
| `js/audio.js` | Optional material/weapon-specific synthesized cues, bounded voice mix, output limiter, master gain, cooldowns, and active-node cap | Gameplay decisions or preference storage |
| `js/render.js` | Scene keyframes, complete local scenery/gameplay asset loading, procedural fallbacks, previews, cached late/boss washes, field cues, clustered off-screen objective cues, telegraphs, and Canvas drawing | Progression or collision outcomes |
| `js/game.js` | Saved progress, modes, input, queued press edges, bounded camera, gated rewards, Enigma drafting, encounter and threat state machines, combat, progression, UI projection, frame loop | Authored balance values or raster provenance |
| `tests/` | Deterministic contracts and dependency-free browser simulation | Human game-feel acceptance |

Exact product behavior belongs in [`GAME_DESIGN.md`](GAME_DESIGN.md); exact tuning and caps belong in `js/config.js`.

## State and persistence

`js/game.js` owns one plain-object live state. Entity collections are mutated only through the fixed-step path and cleaned against the caps in `CONFIG.caps`. Encounter queues carry required, optional, descendant, carrier-lineage, and hard-cull-requeued threats until the field is truly clear. A wave may keep its complete seeded root queue as a finite reserve: configuration owns its initial batch, later batch size, active-pressure ceiling, refill threshold, interval, and optional per-group durability. The fixed-step director restores requeues first, counts every living descendant as at least one pressure unit, and never generates a replacement outside the authored queue. Permanent-module cadence, orbit contacts, player mines, shield recovery, pickup attraction, temporary-effect timers, asteroid hazards, alien attack phases, and boss reflection all advance only through the same fixed-step path. `state.upgradeDraft` owns the finite `idle` → `slowing` → `choosing` Enigma sequence, its deterministic choices, focus index, and time scale.

Stage handoff first calls the single pickup application path for every remaining beneficial field pickup only after the encounter is genuinely clean. Ordinary rewards apply and checkpoint normally; an Enigma retains the existing `slowing` → `choosing` flow and blocks completion until one card resolves. The existing cinematic state then owns two explicit phases. `clear` holds the completed encounter for `CONFIG.cinematic.clearHoldSeconds`, keeps input and combat neutral, and advances/cleans only the already bounded final effects and floaters. `travel` runs the unchanged `CONFIG.cinematic.duration` hyperspace motion, scene crossfade, screen-anchor preservation, and final `advanceEncounter()` handoff. Encounter numbers, combat collections, random progression, and rewards cannot advance during the clear hold.

Lethal damage sets logical `gameover` mode immediately so same-step collision, reward, score, checkpoint, and input guards remain terminal. `state.presentation.gameoverPending` delays only the DOM projection: the HUD remains visible, the game-over overlay stays inert and unfocused, and a capped frame-time presentation path advances existing death particles plus shake/flash decay for `CONFIG.presentation.gameoverEffectDuration`. Ship-owned rendering is suppressed for the complete `gameover` mode, not only while the overlay is delayed. No world, projectile, pickup, director, audio cadence, or random state advances. When the timer reaches zero, the overlay becomes active and its primary action receives focus without resurrecting the destroyed ship.

Reward eligibility has one runtime path. `progressionStage()` selects the current authored stage and treats later sectors as the final band; `currentDropBand()` selects one of the five frozen configuration bands; `contentUnlocked()` applies stage gates; and `rewardableModuleIds()` intersects the unlocked catalog with the band's tier ceiling. Natural drops, Enigma permanent cards, module caches, milestones, and boss cores use those boundaries rather than maintaining separate hidden catalogs.

Threat counterplay is similarly state-owned and config-driven. The combat field remains finite and viewport-scaled; encounter containment and camera containment share its bounds. Mixed-kind wave groups build one seeded balanced bag before any root is released, so reinforcement timing does not change authored totals or random order. Crystal death emits one seeded, capped, finite-life hostile shrapnel ring through the existing enemy-projectile collection; those shards never enter encounter objectives. Void Pulse applies a bounded inward impulse only to asteroids and independently damages aliens without changing their velocity. Auric descendants retain their explosive/magnetic variant and split generation through requeues; each configured split inherits a bounded fraction of parent velocity and adds a low seeded separation impulse without changing exact objective ownership. Corona hazards retain cooldown/warning/active timers and beam angle. Gunships own warning/active/cooldown laser state. Brood Carriers retain their living-child lineage across requeues. The configured `bossType` selects Harrower or Leviathan behavior, and the Leviathan's reflection remains active only while shield nodes survive.

Two strict local-storage records are intentionally separate:

| Key | Contents | Compatibility rule |
| --- | --- | --- |
| `neon-voyage-v1` | High score plus sound, master-volume, visual-density, camera-shake, and screen-flash preferences | Keep the key; accept historical records without `volume`, `cameraShake`, or `damageFlash`; apply the configured volume and default both new feedback controls off |
| `neon-voyage-progress-v1` | Schema-4 unlocked stages, seven bounded checkpoints, 13 Mk V module tiers, and up to four base durations for each of eight saved temporary effects | Preserve tested exact-shape migrations from schema 3, schema 2, and schema 1 |

The storage key remains unchanged. Schema 4 accepts only the exact current module and timer keys, Stage 1–7 bounds, Mk I–V tiers, four-duration timer ceilings, and a 16,384-byte record limit. A valid schema-3 record first retains its exact historical 13-module/seven-timer shape and Stage 1–20 bounds, then compacts checkpoints through the fixed mapping `1→1`, `2–4→2`, `5–7→3`, `8–9→4`, `10→5`, `11–15→6`, and `16–20→7`; when several legacy checkpoints converge, each module tier and timer keeps the strongest valid value. Valid schema-2 records retain their exact historical seven-module/five-timer shape and Stage 1–9 bounds during migration; valid schema-1 unlock progress migrates separately. New keys, including `thrusterTimer`, receive safe zero values. Malformed, unknown, oversized, or out-of-range records are rejected rather than partially trusted. Live hull, score, position, clocks, cooldown phase, entities, generated Enigma cards, and paused battles are never saved as campaign checkpoints.

Collecting Enigma generates three seeded, non-duplicated eligible choices before slowdown begins. A band may decline to offer a permanent card, so temporary and support choices provide bounded fallbacks. Unscaled draft elapsed time advances by the fixed step, while its smooth time scale multiplies only gameplay simulation. At the `choosing` phase the multiplier is zero, transient controls remain neutral, the modal owns focus, and selection applies exactly one upgrade before restoring input with bounded invulnerability and checkpointing the result. The existing animation frame calls `ND.EnigmaPreview.render` for each decorative card canvas; the preview owns no random source, event listener, or animation loop.

The HUD remains a projection of live state. Shield reserve is hidden at zero and exposes the configured 60-point maximum when charged. Desktop rows expose equipped systems and individual timed countdowns; compact touch CSS displays one accessible summary per row and makes both rows pointer-transparent so they cannot intercept movement or aim starts. Touch-stick bases move only by drag overshoot while retaining their original pointer-ID role; shared Dash and Pulse readiness predicates gate both simulation input and the accessible touch-button projection.

The right touch stick has one finite gesture state. It starts pending at neutral, becomes auto-aim only after `CONFIG.mobileControls.autoAimHoldSeconds`, and retains one target until that target is no longer actionable. It then reuses the bounded nearest-target scan to reacquire. Any shaped manual deflection latches manual aim until the matching release/cancel/cleanup; returning to center cannot re-enter auto-aim in the same gesture. The auto-aim eligibility predicate excludes either command-ship body while live nodes reduce its damage, but leaves those nodes and other threats eligible; Leviathan reflection remains a separate node-dependent defense. Every existing pointer-capture, pause, orientation, visibility, page-lifecycle, and mode cleanup clears the timer, latch, target, and fire intent together. Mouse, keyboard, and gamepad paths do not read this gesture state.

`js/render.js` loads repository-local scenery plus 47 realistic gameplay WebPs through one bounded image cache. Immutable maps select art for every asteroid variant, alien class, boss/node, projectile family, mine, pickup chassis, dedicated Overdrive pickup, drone, blade, and material effect. Pending or failed images retain established procedural paths. Raster-backed silhouettes remain authoritative: attached gradient exhaust and soft state auras may accompany them, but decorative engine/aim strokes, hard raster halos, rotating dashed shield rings, duplicate impact circles, and square debris do not. Live telegraphs, three deterministic irregular fracture patterns, hazard ranges, semantic pickup glyphs and short labels, hull-threshold damage emission, field ranges, and targeting cues stay code-drawn because they project gameplay state rather than static object art; a ready Overdrive raster does not receive the obsolete three-line glyph. Crystal shrapnel reuses the local prism projectile image or its bounded diamond fallback. Off-screen objective projection is presentation-only: it selects current-generation living targets, sorts stable priorities, intersects world direction with safe viewport margins, clusters nearby cues, and caps output at six while aggregating overflow counts. It consumes no simulation randomness and writes no game state. Stars and encounter gradients are rebuilt only when the shell-owned renderer size changes. Late-stage intensity derives from encounter progression, boss washes derive from configured `bossType`, and both crossfade with the same scene-handoff weights. Reduced effects use lower static opacity. Tractor arcs read the exact equipped-tier range; subtle field cues read the shared combat-field bounds; telegraphs read the runtime warning/active objects; and Leviathan reflection reads the node-dependent shield object defensively. The cyan/magenta reticle draws only when `js/game.js` projects active mouse/pen pointer aim; touch and neutral aim do not render it, and a later pointer move can restore it on a hybrid device.

`js/audio.js` remains an optional, locally synthesized Web Audio layer. Fixed cue families distinguish player modules, hostile sources, material impacts, scaled destruction, pickups, movement, bosses, and ambient cadence. Each voice applies `CONFIG.audio.mixGain` and clamps to `maxVoiceGain`; the master then feeds one configured `DynamicsCompressorNode` before the destination so concurrent peaks remain bounded. The master gain defaults to `CONFIG.audio.defaultVolume` (80%) and `setVolume()` clamps explicit 0–100% preference changes without unmuting a disabled mix. `js/game.js` owns slider projection and storage; historical local records without `volume` remain valid and adopt the configured default until the next preference write. Cue-key cooldowns prevent burst spam, `activeNodes` never exceeds 24, every source disconnects on completion, and browser refusal to create or resume an audio context remains harmless. Audio does not load files, allocate per-frame oscillators, or affect deterministic simulation decisions.

## Large-file routing

`js/game.js` is deliberately the orchestration owner. Inspect the connected region and its tests before changing it:

| Responsibility | Main functions or state |
| --- | --- |
| Save compatibility | `validSave`, strict schema-4 checkpoint/progress validators, schema-3/schema-2/schema-1 migration, `saveLocal`, `saveProgress` |
| Modes and UI ownership | overlay/dialog helpers, delayed game-over projection/focus, Enigma card/preview/focus flow, run start/restart/menu flow, progress grid, shield readout, equipped-module strip, timed-effect countdowns, and compact summaries |
| Input lifecycle | keyboard, pointer-only reticle intent, pending/manual/auto touch-aim gesture, gamepad, orientation, visibility cleanup |
| Encounter lifecycle | combat-field setup, queues, waves, clear/travel cinematic phases, stage advancement |
| Combat | ship/weapons, passive cadence/ranges, spawns, evolved hazard and alien state machines, shared boss fields/reflection, collisions, damage, gated pickups, temporary stacking, and bounded module rewards |
| Bounded cleanup | effects, hard-cull requeue, collection cleanup, camera, origin rebasing |
| Verification surface | `ND.game`, deterministic debug controls, snapshot, fixed-step `frame` loop |

`js/render.js` similarly owns both scene composition and draw routines; its stable test surfaces are `ND.StagePreview`, `ND.EnigmaPreview`, and `ND.RenderDebug`. Split either large file only when a small explicit interface creates clearer ownership and all affected tests can move with it.

## Security and hosting boundaries

- All runtime resources are repository-local relative paths so direct-file and `/Neon-Voyage/` Pages hosting both work.
- The CSP rejects network connections, frames, workers, forms, remote code, and dynamic code.
- The Pages workflow verifies and uploads the repository root without transforming runtime files.
- GitHub Actions use immutable reviewed commit pins, least-privilege workflow permissions, disabled checkout credentials, and an exact Node.js verification patch. They install no repository package or runtime dependency; the current audit records the reviewed action revisions and licenses.
- Audio unlock, fullscreen, orientation lock, local storage, and pointer capture may fail; their failure paths must remain safe.

See [`SECURITY.md`](../SECURITY.md) for reporting scope.

## Verification surfaces

- `ND.Core` exposes pure utility contracts.
- `ND.RenderDebug` exposes scene, cinematic, anchor, damage, scenery-source, and complete gameplay-asset-source contracts.
- `ND.StagePreview.render` exposes deterministic checkpoint-card rendering.
- `ND.EnigmaPreview.render` exposes deterministic, decorative choice-card rendering driven by the existing frame time and reduced-effects setting.
- `ND.game` exposes the intentional deterministic simulation surface used by tests, including both configured bosses, the Stage 1–7 journey, passive-system state, the Enigma snapshot, and controlled enhancement selection.

These are test seams, not a public third-party API. Preserve them when tests or compatibility rely on them; do not expand them merely to avoid testing behavior through its real owner.
