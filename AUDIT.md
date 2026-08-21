# Neon Voyage v2026.8.21c — source audit

- Audited: 2026-08-21
- Scope: terminal player presentation, independent impact-feedback preferences, and synthesized-audio gain staging
- Targets: direct `file://` launch and GitHub Pages repository-subpath hosting
- Result: **PASS — 193/193 dependency-free tests and the 93-entry checksum manifest verified**
- Player-facing behavior change: **yes; runtime label advances from `v2026.8.21b`**

Observed locally with Node v24.19.0 on Linux 6.18.35 x86_64. Node is used only by the dependency-free verification harness and is not part of the browser game.

## Baseline

- Clean `main` started at `879cfa2592685851a5af726f44da7c2e2369634e`, matching `origin/main`.
- The unchanged baseline passed `192/192` tests, all 93 checksum entries, and `git diff --check`.
- GitHub had no open issue or pull request and only the `main` branch.
- Offline audit #59 and Pages #32 passed on the baseline commit.
- The deployed baseline returned HTTP 200 and reported `v2026.8.21b`.

## Verified candidate behavior

### Terminal defeat

- The renderer now suppresses the player ship, ship fields, drones, orbit blades, and reticle for the complete `gameover` mode. Finishing the 1.2-second death presentation and exposing the dialog can no longer make the ship reappear behind it.
- The existing logical terminal boundary is unchanged: world simulation, input, director state, score, rewards, projectiles, and randomness remain frozen while only bounded presentation effects advance.
- A deterministic renderer regression exercises both the pending burst and the visible dialog state, followed by a live-playing positive control.

### Independent impact feedback

- Settings now separates Visual density, Camera shake, and Screen flashes. Shake and flashes are persistent independent buttons with accessible pressed state and labels.
- New sessions and compatible historical `neon-voyage-v1` records default both new options off. Historical records are accepted without being rewritten on boot; the existing storage key and campaign schema remain unchanged.
- Renderer regressions prove that nonzero shake/flash state produces no camera offset or viewport fill by default, and that each explicit opt-in restores its bounded presentation path.
- Portrait-orientation regressions prove the new controls cannot mutate preferences behind the landscape gate.

### Audio presence and peak control

- Every synthesized voice receives the configured 1.7× internal lift (about +4.6 dB) and remains capped at 0.22 before the master stage.
- The master feeds one configured `DynamicsCompressorNode` before the destination. Tests verify its routing and threshold, knee, ratio, attack, and release values.
- The accessible 80% default, 0–100% slider, explicit silence, mute independence, cue cooldowns, source cleanup, and 24-node cap remain unchanged.
- Web Audio remains optional and repository-local; failure to create or resume a context remains harmless.

## Compatibility and boundaries

| Area | Candidate result |
| --- | --- |
| Runtime surface | Unchanged dependency-free HTML/CSS/classic JavaScript/Canvas/Web Audio architecture |
| Offline/security | Restrictive CSP, relative local resources, and zero runtime network requests preserved |
| Determinism | Simulation timing and random progression unchanged; new settings are presentation-only |
| Caps | Existing simulation caps and 24 active-audio-node ceiling preserved |
| Saved progress | Progress key and strict schema 4 plus schema-3/schema-2/schema-1 migrations unchanged |
| Local preferences | Existing key preserved; optional shake/flash fields migrate by safe default |
| Input/accessibility | Keyboard, mouse, touch, gamepad, focus, orientation, and dialog contracts retained |
| Assets | No runtime or documentation raster changed |

## Engineering-standard disposition

Standard status remains `adopting` because the active GitHub ruleset reports `required_review_thread_resolution: false`, and the connected GitHub operations available for this task do not expose ruleset mutation. The ruleset still requires pull requests and the strict up-to-date `audit` check, blocks deletion and non-fast-forward updates, and requires zero independent approvals. No approval will be fabricated.

## Frozen verification

The initial development run passed every affected behavior while version mirrors and the manifest were intentionally still stale. The first freeze then exposed a test-only strict-comparison mismatch between JavaScript `-0` and `0`; the regression now checks numeric zero displacement without changing runtime behavior. Documentation, version mirrors, tests, and the manifest were frozen together before the complete pass below.

| Check | Observed result |
| --- | --- |
| `node tests/run.js` | PASS — `193/193`; includes syntax, offline/security, preference compatibility, browser VM/rendering, responsive input/accessibility, Stage 1–7 weapon journey, both bosses, audio bounds, and deterministic stress |
| `sha256sum --check SHA256SUMS` | PASS — all 93 release entries verified |
| `git diff --check` | PASS — no whitespace error |
| Automated rendered states | PASS — terminal ship suppression and shake/flash off/on paths exercised through Canvas call recording |
| Candidate browser preview | Unavailable; repository workflow publishes Pages only from merged `main` |

No physical phone/iPad session, subjective audio listening, uninterrupted human-controlled seven-stage completion, immutable tag, or GitHub Release is claimed. The automated audio checks establish routing and bounds, not perceived loudness on speakers or headphones. A public merge must still pass the required pull-request audit, post-merge audit, Pages deployment, exact live-version check, Settings inspection, one real Play interaction, and page-origin console review.
