# Visual assets

Neon Voyage uses local WebP scenery with procedural Canvas gameplay art. This keeps the worlds detailed while ships, threats, projectiles, pickups, and effects remain sharp, recolorable, and lightweight.

## Runtime inventory

| File | Dimensions | Role |
| --- | --- | --- |
| `assets/deep-space.webp` | 1600×711 | Shared star-field backdrop |
| `assets/earth.webp` | 700×700 | Earth Orbit landmark |
| `assets/mars.webp` | 620×620 | Inner-system landmark |
| `assets/frontier-world.webp` | 1024×1024 | Shattered Frontier world |
| `assets/titan-world.webp` | 1024×1024 | Ringed Titan Gate world |
| `assets/signal-world.webp` | 1024×1024 | First Contact world |
| `assets/shard-world.webp` | 1024×1024 | Strike Wing world |
| `assets/fleet-world.webp` | 1024×1024 | Raid Fleet world |
| `assets/command-world.webp` | 1024×1024 | Command Arena world |

All nine runtime rasters are AI-assisted original project assets. The six worlds beyond Mars were created with OpenAI's image generator from original project briefs; Earth, Mars, and the shared star field are preserved from the original asset set. None was copied, traced, or adapted from outside artwork.

## Documentation images

| File | Role |
| --- | --- |
| `docs/assets/neon-voyage-earth-orbit.webp` | README opening-gameplay capture |
| `docs/assets/neon-voyage-command-arena.webp` | README Harrower encounter capture |

Both captures come from the real local renderer. They are documentation-only and are kept compressed, repository-local, and meaningfully described in the README.

The two current captures are 1200×675 WebP files. The audit enforces a 256 KiB maximum per documentation image.

## Art direction

- Worlds should look cinematic, natural, and individually recognizable.
- Earth and Mars are the quality reference for believable lighting and surface detail.
- Planet silhouettes and atmospheres must not resemble HUD rings, repeated stripes, or transparent overlays.
- Background contrast must leave the central combat field readable.
- Gameplay entities stay procedural unless a raster asset clearly improves the experience without weakening clarity or performance.

## Asset rules

- Store runtime and documentation assets locally; never load them from a CDN or third-party service.
- Prefer WebP and the smallest dimensions/quality that remain clean at the maximum rendered size.
- Record purpose and provenance here when adding or replacing an asset.
- Search all HTML, CSS, JavaScript, tests, and Markdown before moving or deleting a file.
- Remove an asset once it is proven unused; the audit rejects orphan runtime and README raster files.

## Replacement and capture workflow

No original generation prompts, lossless source files, or one-command capture pipeline are tracked for the current raster set. Do not claim that these files are deterministically reproducible from the repository alone.

When adding or replacing runtime art:

1. Record the source method, original project brief, tool, transformation steps, intended scene, and any license or usage constraint in this document. Never commit credentials or private source material.
2. Keep transparent world art square unless a renderer change intentionally supports another aspect ratio. Preserve the existing file path when the asset keeps the same role.
3. Inspect the image in the actual menu preview, authored stage, hyperspace handoff, narrow landscape layout, and reduced-effects mode. A standalone image preview is insufficient.
4. Confirm the central combat field remains readable, edges and transparency are clean, and the file remains within the repository payload limits.
5. Run the full verification gate, update affected descriptions or tests, and regenerate `SHA256SUMS` only after the final WebP is frozen.

When refreshing a README capture:

1. Use the real local renderer at a 1200×675 viewport; do not substitute a mockup or an unrelated generated scene.
2. Capture the named encounter with readable threats and HUD, remove browser chrome only, and encode the result as WebP without changing its content.
3. Keep exactly two restrained README captures unless the public README and its audit contract are deliberately changed together.
4. Update meaningful alternative text if the depicted action changes, visually inspect the rendered README, run `node tests/run.js`, and regenerate `SHA256SUMS`.

Record the exact capture environment in the pull request or release handoff. Repository tests validate reference integrity and file limits; they do not judge visual quality.
