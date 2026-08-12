# Neon Voyage local audit

Run from the repository root with Node.js installed on the auditing machine:

```sh
node tests/run.js
```

Observed for Neon Voyage 1.2.2 on 2026-08-13: **73/73 tests passed** with Node v24.14.0 on Linux x64.

The browser game does not require Node or any dependency. This harness uses only Node built-ins and verifies:

- immutable 1.2 configuration, nine ordered finite stages, asteroid-only pre-contact progression, Titan at Stage 5, first aliens at Stage 6, and the boss at Stage 9;
- exact opening composition, capped finite waves, no premature clear, dynamically counted required descendants, full-tree objective completion, and exact hard-cull objective-state restoration;
- a 1,024-seed opening-placement sweep at six phone, tablet, and desktop sizes, including visibility, 72 px ship-surface clearance, 18 px threat separation, 2.2-second minimum predicted contact time, first-tick stability, and a protected opening window;
- 10,240 additional seeded openings across Stages 1–5 at two compact phone sizes, proving large radii adapt only to the safe configured floor or remain strictly deferred; every authored threat stays living or queued, deferred slots retry as combat frees space, and the stationary ship remains undamaged during the protected window;
- deterministic core math, seeded randomness, safe storage, pooling, cleanup, bounded difficulty, and every entity cap;
- asteroid pair separation, bounce, approach-only damage, initial fragment safety, boundary response, exactly-once environmental destruction, and deterministic asteroid-alien co-location recovery without reward duplication;
- captured-direction hyperspace, locked input, clean world handoff, preserved screen anchors across desktop, portrait, and landscape viewports, and all four narrow-screen arena edges through the boss-to-next-sector wrap;
- hybrid tablet touch detection, stale mouse-target handoff, real simultaneous move/aim pointer ownership, radially symmetric configured deadzones and response caps, shared barely-active aim ownership, low-band aim/fire alignment, bounded aim turning, heading preservation, aim-to-fire, Dash and Pulse, pointer cancel and lost-capture cleanup, and visibility-reset capture recovery;
- mobile browser-focus tolerance with hidden-document and desktop focus pause retained, stationary capture-safe touch pause/resume, plus full portrait ownership of covered UI/keyboard/gamepad input, held-button edge suppression, seamless landscape resume, safe-area and non-overlap contracts, accessible double-tap suppression, and harmless missing or rejected orientation locks;
- temporary Arc Burst and Nova Lance projectile behavior, independent timers and expiry, broad weighted pickup coverage, pity drops, and bounded permanent run upgrades;
- point-only normal stars, transition-only streaks, Earth-to-Mars departure, continuously interpolated exotic deep-space scenes, and no Earth reset on sector wrap;
- strict CSP, local repository-subpath resources, no network/dynamic code/dependencies, JavaScript syntax, symlinks, payload limits, and GitHub Pages workflow safety;
- dependency-free browser-VM boot, menu launch, Canvas frames, DOM integration, and a single animation loop;
- a deterministic 20-minute fixed-step expedition covering all nine stages, finite waves, boss combat, effects, environmental kills, repeatability, and every configured cap.

The harness intentionally exercises private gameplay through the deterministic `ND.game` and `ND.RenderDebug` contracts exposed by the local runtime. Release CI and Pages deployment run this same command without installing packages.
