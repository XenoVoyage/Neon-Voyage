# Neon Voyage v2026.8.21d — source audit

- Audited: 2026-08-21
- Scope: Overdrive raster identity and natural Auric descendant presentation
- Targets: direct `file://` launch and GitHub Pages repository-subpath hosting
- Result: **PASS — 193/193 dependency-free tests and the 94-entry checksum manifest verified**
- Player-facing behavior change: **yes; runtime label advances from `v2026.8.21c`**

Observed locally with Node v24.19.0 on Linux 6.18.35 x86_64. Node is used only by the dependency-free verification harness and is not part of the browser game.

## Baseline

- Clean `main` started at `66f25b99291fc77c396280936b2b38dd87bed4f0`, matching `origin/main`.
- The unchanged baseline passed `193/193` tests, all 93 checksum entries, and `git diff --check` in the preceding published release gate.
- GitHub had no open issue or pull request and only the `main` branch.
- Offline audit #61 and Pages #33 passed on the baseline commit.
- The deployed baseline returned HTTP 200 and reported `v2026.8.21c`.

## Verified candidate behavior

### Overdrive identity

- A dedicated local 192×192 Overdrive turbine WebP replaces the shared-chassis-plus-three-lines presentation when the new raster is ready.
- The short readable pickup label remains, while the physical raster receives no procedural speed stripe or other duplicate silhouette work.
- Failed or pending image loads still use the established offline procedural fallback.

### Natural Auric descendants

- The explosive and magnetic Auric descendant WebPs are now compact irregular basalt-and-gold rocks rather than elongated blade/ship silhouettes. Hazard identity remains confined to amber or cyan fissures and the existing live-state effect.
- The exact finite 1→3→6 objective tree, mixed hazard variants, health, rewards, caps, requeues, collision grace, magnetic pull, and explosive death radius remain unchanged.
- Split motion is configuration-owned: the first generation inherits 86% of parent velocity with 38 px/s base separation; the second inherits 90% with 26 px/s base separation. Seeded 0.72×–1.22× variation stays bounded and avoids the prior hard-coded 135 px/s radial burst.
- Descendants appear immediately with collision grace, so no timer, pending objective, or hidden spawning path was introduced.

### Asset evidence

- Three accepted image-generator PNG sources were inspected for real alpha; one opaque checkerboard attempt was rejected and never entered the repository.
- Accepted objects were cropped by alpha bounds, resized and centered on their existing transparent runtime canvases, and encoded with ImageMagick 6.9 at WebP quality 90 and alpha quality 100.
- Final standalone inspection confirmed compact silhouettes, transparent padding, no background box, no cast/drop shadow, no text, and no exterior halo. Runtime mapping and Canvas draw regressions verify that the selected files are actually consumed.

## Compatibility and boundaries

| Area | Candidate result |
| --- | --- |
| Runtime surface | Dependency-free HTML/CSS/classic JavaScript/Canvas/Web Audio architecture preserved; one local WebP added |
| Offline/security | Restrictive CSP, relative local resources, and zero runtime network requests preserved |
| Determinism | Existing seeded order retained; new split values are immutable config and fixed-step state only |
| Caps/objectives | Existing asteroid cap, exact Auric descendant count, and required-objective accounting preserved |
| Saved progress | Preference key, progress key, strict schema 4, and schema-3/schema-2/schema-1 migrations unchanged |
| Input/accessibility | Keyboard, mouse, touch, gamepad, focus, orientation, reduced effects, and readable pickup label retained |
| Audio | Mix, limiter, cues, 80% default, slider, mute, cooldown, and 24-node cap unchanged |

## Engineering-standard disposition

Standard status remains `adopting` because the active GitHub ruleset reports `required_review_thread_resolution: false`, and the connected GitHub operations available for this task do not expose ruleset mutation. The ruleset still requires pull requests and the strict up-to-date `audit` check, blocks deletion and non-fast-forward updates, and requires zero independent approvals. No approval will be fabricated.

## Frozen verification

The first complete candidate pass verified all `193/193` tests with the 94-entry manifest. After this evidence record was finalized, the manifest and entire gate were rerun on the exact frozen candidate.

| Check | Observed result |
| --- | --- |
| `node tests/run.js` | PASS — `193/193`; includes syntax, offline/security, version/asset integrity, deterministic Auric motion and exact objectives, ready-raster Overdrive drawing, saved-data migrations, responsive input/accessibility, Stage 1–7 weapon journey, both bosses, and long deterministic stress |
| `sha256sum --check SHA256SUMS` | PASS — all 94 release entries verified |
| `git diff --check` | PASS — no whitespace error |
| Generated-asset inspection | PASS — all three accepted sources and final WebPs inspected at native and actual 40/106 px gameplay scales; real alpha, centered compact silhouettes, restrained internal emission, no box, text, exterior halo, or cast/drop shadow |
| Automated rendered states | PASS — Canvas call recording verifies dedicated Overdrive raster use without the three-line glyph; both Auric variants and every existing gameplay source remain mapped and drawn |
| Candidate browser preview | Unavailable; repository workflow publishes Pages only from merged `main` |

No physical phone/iPad session, subjective audio listening, uninterrupted human-controlled seven-stage completion, immutable tag, or GitHub Release is claimed. A public merge must still pass the required pull-request audit, post-merge audit, Pages deployment, exact live-version check, one real Play interaction, and page-origin console review.
