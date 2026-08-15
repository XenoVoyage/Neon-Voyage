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
| `js/config.js` | Version, stages, milestone rewards, module tiers, pickup pacing, dimensions, timing, difficulty, caps | Mutable run state |
| `js/core.js` | Pure reusable deterministic utilities and safe storage primitives | Domain orchestration |
| `js/audio.js` | Optional synthesized cues and active-node cap | Gameplay decisions |
| `js/render.js` | Scene keyframes, asset loading, previews, cached late/boss washes, arenas, telegraphs, fields, projectiles, and Canvas drawing | Progression or collision outcomes |
| `js/game.js` | Saved progress, modes, input, gated rewards, Enigma drafting, encounter and threat state machines, combat, progression, UI projection, frame loop | Authored balance values or raster provenance |
| `tests/` | Deterministic contracts and dependency-free browser simulation | Human game-feel acceptance |

Exact product behavior belongs in [`GAME_DESIGN.md`](GAME_DESIGN.md); exact tuning and caps belong in `js/config.js`.

## State and persistence

`js/game.js` owns one plain-object live state. Entity collections are mutated only through the fixed-step path and cleaned against the caps in `CONFIG.caps`. Encounter queues carry required, optional, descendant, carrier-lineage, and hard-cull-requeued threats until the field is truly clear. Permanent-module cadence, orbit contacts, player mines, shield recovery, pickup attraction, temporary-effect timers, asteroid hazards, alien attack phases, and boss reflection all advance only through the same fixed-step path. `state.upgradeDraft` owns the finite `idle` → `slowing` → `choosing` Enigma sequence, its deterministic choices, focus index, and time scale.

Reward eligibility has one runtime path. `progressionStage()` selects the current authored stage and treats later sectors as the final band; `currentDropBand()` selects one of the six frozen configuration bands; `contentUnlocked()` applies stage gates; and `rewardableModuleIds()` intersects the unlocked catalog with the band's tier ceiling. Natural drops, Enigma permanent cards, module caches, milestones, and boss cores use those boundaries rather than maintaining separate hidden catalogs.

Threat counterplay is similarly state-owned and config-driven. Auric descendants retain their explosive/magnetic variant and split generation through requeues. Corona hazards retain cooldown/warning/active timers and beam angle. Gunships own warning/active/cooldown laser state. Brood Carriers retain their living-child lineage across requeues. The configured `bossType` selects Harrower or Leviathan behavior; `arenaShape` selects circular or rectangular containment, and the Leviathan's reflection object remains active only while shield nodes survive.

Two strict local-storage records are intentionally separate:

| Key | Contents | Compatibility rule |
| --- | --- | --- |
| `neon-voyage-v1` | High score and sound/effects preferences | Keep the key and strict validation |
| `neon-voyage-progress-v1` | Schema-3 unlocked stages, 20 bounded checkpoints, 13 Mk V module tiers, and up to four base durations for each of seven saved temporary effects | Preserve tested exact-shape migrations from schema 2 and schema 1 |

The storage key remains unchanged. Schema 3 accepts only the exact current module and timer keys, Stage 1–20 bounds, Mk I–V tiers, four-duration timer ceilings, and a 16,384-byte record limit. A valid schema-2 record retains its exact legacy seven-module/five-timer shape and Stage 1–9 bounds during migration; valid schema-1 unlock progress is migrated separately. New keys are filled with safe zero values, while malformed, unknown, oversized, or out-of-range records are rejected rather than partially trusted. Live hull, score, position, clocks, cooldown phase, entities, generated Enigma cards, and paused battles are never saved as campaign checkpoints. `v2026.8.15b` changes no storage key, schema field, validator shape, or migration contract.

Collecting Enigma generates three seeded, non-duplicated eligible choices before slowdown begins. A band may decline to offer a permanent card, so temporary and support choices provide bounded fallbacks. Unscaled draft elapsed time advances by the fixed step, while its smooth time scale multiplies only gameplay simulation. At the `choosing` phase the multiplier is zero, transient controls remain neutral, the modal owns focus, and selection applies exactly one upgrade before restoring input with bounded invulnerability and checkpointing the result. The existing animation frame calls `ND.EnigmaPreview.render` for each decorative card canvas; the preview owns no random source, event listener, or animation loop.

The HUD remains a projection of live state. Shield reserve is hidden at zero and exposes the configured 60-point maximum when charged. Desktop rows expose equipped systems and individual timed countdowns; compact touch CSS displays one accessible summary per row and makes both rows pointer-transparent so they cannot intercept movement or aim starts.

`js/render.js` builds encounter gradients only on renderer resize. Late-stage intensity derives from encounter progression, boss washes derive from configured `bossType`, and both crossfade with the same scene-handoff weights. Reduced effects use lower static opacity. Tractor arcs read the exact equipped-tier range; arena drawing reads `shape`, `halfWidth`, and `halfHeight`; telegraphs read the runtime warning/active objects; and Leviathan reflection reads the node-dependent shield object defensively.

## Large-file routing

`js/game.js` is deliberately the orchestration owner. Inspect the connected region and its tests before changing it:

| Responsibility | Main functions or state |
| --- | --- |
| Save compatibility | `validSave`, strict schema-3 checkpoint/progress validators, schema-2/schema-1 migration, `saveLocal`, `saveProgress` |
| Modes and UI ownership | overlay/dialog helpers, Enigma card/preview/focus flow, run start/restart/menu flow, progress grid, shield readout, equipped-module strip, timed-effect countdowns, and compact summaries |
| Input lifecycle | keyboard, pointer, touch-stick, gamepad, orientation, visibility cleanup |
| Encounter lifecycle | combat-field setup, queues, waves, hyperspace, stage advancement |
| Combat | ship/weapons, passive cadence/ranges, spawns, evolved hazard and alien state machines, configured boss arenas/reflection, collisions, damage, gated pickups, temporary stacking, and bounded module rewards |
| Bounded cleanup | effects, hard-cull requeue, collection cleanup, camera, origin rebasing |
| Verification surface | `ND.game`, deterministic debug controls, snapshot, fixed-step `frame` loop |

`js/render.js` similarly owns both scene composition and draw routines; its stable test surfaces are `ND.StagePreview`, `ND.EnigmaPreview`, and `ND.RenderDebug`. Split either large file only when a small explicit interface creates clearer ownership and all affected tests can move with it.

## Security and hosting boundaries

- All runtime resources are repository-local relative paths so direct-file and `/Neon-Voyage/` Pages hosting both work.
- The CSP rejects network connections, frames, workers, forms, remote code, and dynamic code.
- The Pages workflow verifies and uploads the repository root without transforming runtime files.
- Audio unlock, fullscreen, orientation lock, local storage, and pointer capture may fail; their failure paths must remain safe.

See [`SECURITY.md`](../SECURITY.md) for reporting scope.

## Verification surfaces

- `ND.Core` exposes pure utility contracts.
- `ND.RenderDebug` exposes scene, cinematic, anchor, damage, and asset-source contracts.
- `ND.StagePreview.render` exposes deterministic checkpoint-card rendering.
- `ND.EnigmaPreview.render` exposes deterministic, decorative choice-card rendering driven by the existing frame time and reduced-effects setting.
- `ND.game` exposes the intentional deterministic simulation surface used by tests, including both configured bosses, the Stage 1–20 journey, passive-system state, the Enigma snapshot, and controlled enhancement selection.

These are test seams, not a public third-party API. Preserve them when tests or compatibility rely on them; do not expand them merely to avoid testing behavior through its real owner.
