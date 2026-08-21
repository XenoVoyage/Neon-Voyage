# Project status

This is the current-state handoff. Enduring engineering rules belong in [`AGENTS.md`](../AGENTS.md), player intent in [`GAME_DESIGN.md`](GAME_DESIGN.md), implementation ownership in [`ARCHITECTURE.md`](ARCHITECTURE.md), and historical product changes in [`CHANGELOG.md`](../CHANGELOG.md).

## Current state

| Area | Verified state |
| --- | --- |
| Product | Complete seven-stage offline browser campaign with Harrower and Leviathan command-ship encounters |
| Runtime version | `v2026.8.21b`; `js/config.js` is canonical and intentional mirrors are consistency-tested |
| Runtime surface | Repository-local HTML, CSS, five classic scripts, Canvas, Web Audio, and 55 WebP runtime rasters |
| Dependencies and build | No runtime or development packages, package manager, installation, or build step |
| Hosting | Direct `file://` launch and the GitHub Pages `/Neon-Voyage/` repository subpath |
| Saved data | Unchanged local keys; strict schema-4 checkpoints with exact schema-3/schema-2/schema-1 migration |
| Repository | `main` is protected by an active ruleset requiring pull requests, an up-to-date `audit` check, and blocking deletion and non-fast-forward updates |
| Automation | Official GitHub Actions are commit-pinned; workflows use least-privilege permissions and Node.js `22.22.0` only for verification |
| Evidence | [`AUDIT.md`](../AUDIT.md) owns the current frozen-source result; GitHub owns PR, check, merge, and deployment records |

The game-design, architecture, asset, security, contributor, and test documents have distinct owners. `AUDIT.md` contains current observed evidence only; older results remain available through Git and the changelog instead of being mirrored in active status documentation.

## Acceptance boundary

- Automated coverage exercises offline boot, strict CSP and local resources, all supported input families, responsive simulated viewports, accessibility and focus, saved-progress migrations, the complete Stage 1–7 campaign, both bosses, renderer ownership, audio bounds, and deterministic long-run caps.
- Published desktop smoke is required after every Pages deployment. Candidate previews and hands-on device evidence are reported separately when actually available.
- No physical phone or iPad session, subjective audio listening, or uninterrupted human-controlled seven-stage completion is currently claimed. Those are product-feel observations, not hidden source-gate results.
- No immutable Git tag or GitHub Release exists for `v2026.8.21b`. Creating one remains an explicit owner publication decision and is not implied by a changelog heading or Pages deployment.

## Next decision boundary

Select new player-facing work only from reproduced defects, observed accessibility problems, or a separately authorized product goal. Do not reopen architecture, balance, visual direction, saved-data shape, or repository surface speculatively.
