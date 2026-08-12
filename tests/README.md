# Neon Voyage local audit

Run from the repository root with Node.js installed on the auditing machine:

```sh
node tests/run.js
```

Observed for Neon Voyage 1.1.0 on 2026-08-12: **39/39 tests passed** with Node v24.14.0 on Linux x64.

The browser game does not require Node or any dependency. This harness uses only Node built-ins and verifies:

- immutable Neon Voyage 1.1 configuration, five ordered finite-stage plans, exact first-wave composition, bounded difficulty, weapon progression, pickup frequency, and entity caps;
- deterministic core math, collision, seeded randomness, safe storage, pooling, and cleanup;
- strict CSP, local resources, repository-subpath-relative URLs, no network/dynamic code/dependencies, JavaScript syntax, symlinks, and payload limits;
- dependency-free browser-VM boot, menu launch, Canvas frames, DOM integration, and a single animation loop;
- ballistic non-shooting asteroids, attacking alien spacecraft, and asteroid-versus-alien environmental destruction with exactly-once goals and no farming reward;
- an exact three-rock opening, configured four-threat second wave, no finite-wave overrun, and no advancement or stage clear while a required threat survives;
- immediate Titan completion and hyperspace input lock, normalized autopilot, world cleanup, finite progress, and centered clean stage handoff;
- visible wave pressure, independent Rapid Fire and Tri-Shot timers, broad pickup distribution, caps, and pity drops;
- stage-clear damage protection, rectangular player/dash containment, and a fully visible locked boss arena across desktop and narrow portrait/landscape layouts;
- point-only stars with no normal-play travel or line streaks, deterministic Earth/Mars stage keyframes, and transition-only hyperspace streak profiles with bounded reduced-effects behavior;
- a deterministic 20-minute fixed-step stress expedition for finite state, stage cycling, finite waves, hyperspace, projectiles, effects, and every configured cap.

The test harness intentionally exercises private gameplay through the deterministic `ND.game` debug contract exposed by the local runtime. Release CI and Pages deployment both run this same command without installing packages.
