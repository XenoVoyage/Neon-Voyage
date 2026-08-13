# Neon Voyage local audit

Run from the repository root with Node.js installed on the auditing machine:

```sh
node tests/run.js
```

Observed for Neon Voyage 1.3.0 on 2026-08-13: **101/101 tests passed** with Node v24.14.0 on Linux x64. The focused mobile input suite contributes **36** checks.

The browser game does not require Node or any dependency. This harness uses only Node built-ins and verifies:

- immutable 1.3 configuration, nine ordered finite stages, asteroid-only pre-contact progression, Titan at Stage 5, first aliens at Stage 6, and the Harrower boss at Stage 9;
- exact opening composition, capped finite waves, no premature clear, dynamically counted descendants, exact bounded colossal 1→3→6 splitting, full-tree objective completion, and exact hard-cull state restoration;
- a 1,024-seed opening-placement sweep at six phone, tablet, and desktop sizes, including visibility, 72 px ship-surface clearance, 18 px threat separation, 2.2-second minimum predicted contact time, first-tick stability, and a protected opening window;
- 10,240 additional seeded openings across Stages 1–5 at two compact phone sizes, proving large radii adapt only to the safe configured floor or remain deferred while every authored threat stays living or queued;
- deterministic core math, seeded randomness, strict/denied storage behavior, pooling, cleanup, bounded difficulty, and every entity cap;
- asteroid-pair mass separation and bounce with no mutual damage or reward changes, player/asteroid de-embedding, boundary response, and exactly-once lethal asteroid-to-alien impact without reward duplication;
- captured-direction hyperspace, locked input, clean world handoff, preserved screen anchors across desktop, portrait, and landscape viewports, and all four narrow-screen arena edges through the boss-to-next-sector wrap;
- hybrid tablet detection, simultaneous pointer-ID ownership, dynamic half-screen origins, neutral initial contact, radial movement/aim response, the 7.2-radian-per-second aim cap, shared low-band aim/fire heading, and independent Dash and Pulse actions;
- pointer-ID-first malformed terminal recovery, normal/rejected/thrown/implicit capture-loss cleanup, per-frame capture liveness, inactive boundary termination, native touch and page-lifecycle fallbacks, stale-primary recovery, old-pointer rejection, and a 60-second stationary hold with no inactivity timeout;
- mobile browser-focus tolerance with hidden-document pause retained, capture-safe pause/resume, portrait ownership of covered UI/keyboard/gamepad input, held-button edge suppression, seamless landscape resume, safe-area layout, double-tap suppression, and harmless rejected orientation locks;
- strict local checkpoint progress, corrupt/oversized/denied fallback, persistent genuine unlocks, debug-unlock rejection, New Game Stage 1 semantics, locked-card guards, and fresh Sector 1 Continue starts from every earned stage;
- adaptive deterministic stage-preview cards, inert inactive overlays, mode-owned focus, Canvas tab-order ownership, and portrait-safe Continue dialog behavior;
- independent temporary weapon timers, exact Rapid Fire/Tri-Shot/Hull Repair weight changes, broad weighted pickup coverage, pity drops, and bounded permanent run upgrades;
- point-only normal stars, transition-only streaks, continuous Earth-to-deep-space scenery, deterministic stage previews, and exactly three progressive asteroid crack thresholds plus hit flash;
- strict CSP, local repository-subpath resources, no network/dynamic code/dependencies, JavaScript syntax, symlinks, payload limits, and GitHub Pages workflow safety;
- dependency-free browser-VM boot, menu/Continue integration, Canvas frames, real Pointer Event routing, accessible DOM state, and one animation loop;
- a deterministic weapon-driven Stage 1–9 traversal that defeats the alien boss and wraps to Sector 2 under every cap, plus a repeatable 20-minute fixed-step stress expedition.

The harness intentionally exercises private gameplay through the deterministic `ND.game`, `ND.StagePreview`, and `ND.RenderDebug` contracts exposed by the local runtime. Release CI and Pages deployment run this same command without installing packages. Phone- and tablet-class checks use simulated viewports and Pointer Events; they do not claim observation on physical hardware.
