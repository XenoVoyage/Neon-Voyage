# Neon Voyage local audit

Run from the repository root with Node.js installed on the auditing machine:

```sh
node tests/run.js
```

The browser game does not require Node or any dependency. This harness uses only Node built-ins and verifies:

- immutable Neon Voyage 1.0 configuration, five ordered stage goals, bounded difficulty, weapon progression, pickup frequency, and entity caps;
- deterministic core math, collision, seeded randomness, safe storage, pooling, and cleanup;
- strict CSP, local resources, repository-subpath-relative URLs, no network/dynamic code/dependencies, JavaScript syntax, symlinks, and payload limits;
- dependency-free browser-VM boot, menu launch, Canvas frames, DOM integration, and a single animation loop;
- ballistic non-shooting asteroids, attacking alien spacecraft, and asteroid-versus-alien environmental destruction with exactly-once goals and no farming reward;
- visible opening pressure, dead-air replenishment below 0.25 seconds, independent Rapid Fire and Tri-Shot timers, broad pickup distribution, caps, and pity drops;
- stage-clear damage protection, rectangular player/dash containment, a fully visible locked boss arena across desktop and narrow portrait/landscape layouts, fixed background-flow orientation, and deterministic Earth/Mars stage keyframes;
- a deterministic 20-minute fixed-step stress expedition for finite state, stage cycling, director pressure, projectiles, effects, and every configured cap.

The test harness intentionally exercises private gameplay through the read-only `ND.game` debug contract exposed by the local runtime. Release CI and Pages deployment both run this same command without installing packages.
