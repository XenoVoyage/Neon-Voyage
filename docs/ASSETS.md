# Visual assets

Neon Voyage uses local WebP scenery, a bounded realistic gameplay-art proof, and procedural Canvas fallbacks. This keeps the worlds and approved proof subjects detailed while every unreviewed gameplay family remains sharp, recolorable, and lightweight.

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
| `assets/player-interceptor.webp` | 384×256 | Realistic player-ship proof |
| `assets/common-asteroid.webp` | 256×256 | Realistic common `rock` asteroid proof |
| `assets/alien-scout.webp` | 384×256 | Realistic alien `scout` proof |
| `assets/player-plasma.webp` | 256×96 | Realistic starting `bolt` projectile proof |
| `assets/plasma-impact.webp` | 192×192 | Compact small-ring impact proof |
| `assets/shield-generator.webp` | 192×192 | Realistic `shield` pickup proof |

All fifteen runtime rasters are AI-assisted original project assets. The six worlds beyond Mars were created with OpenAI's image generator from original project briefs; Earth, Mars, and the shared star field are preserved from the original asset set. None was copied, traced, or adapted from outside artwork.

The six gameplay-proof sources were created on 2026-08-20 with OpenAI's built-in image generator in stylized-concept mode from original Neon Voyage briefs. The existing game screenshot was used only to judge composition, gameplay scale, and the worlds' believable lighting; no pixels or outside artwork were supplied as source art. The briefs requested orthographic right-facing craft, natural upper-left-lit silicate/nickel rock, restrained cyan/magenta player energy, a dark violet/green biomechanical Scout, a compact plasma impact, and a physical shield-generator capsule. Generated transparent PNGs were alpha-inspected, trimmed, resized, centered on transparent canvases, and encoded with ImageMagick 6.9 to WebP at quality 88–90 with full alpha quality. No third-party license or runtime service is required.

The player interceptor, common rock, Scout, starting bolt, selected compact ring impacts, and shield pickup are the only approved runtime scopes for this proof. Their simulation objects, collision radii, timing, balance, and saved-data shape are unchanged. All other gameplay families keep the established procedural renderer until hands-on acceptance authorizes a complete set.

## Documentation images

| File | Role |
| --- | --- |
| `docs/assets/neon-voyage-earth-orbit.webp` | README opening-gameplay capture |
| `docs/assets/neon-voyage-command-arena.webp` | README Harrower encounter capture |

Both captures come from a real local renderer. They predate the `v2026.8.20d` gameplay-art proof and remain documentation-only until the proof direction is accepted and a fresh real-renderer capture is warranted; they are kept compressed, repository-local, and meaningfully described in the README.

The two current captures are 1200×675 WebP files. The audit enforces a 256 KiB maximum per documentation image.

## Art direction

- Worlds should look cinematic, natural, and individually recognizable.
- Earth and Mars are the quality reference for believable lighting and surface detail.
- Planet silhouettes and atmospheres must not resemble HUD rings, repeated stripes, or transparent overlays.
- Background contrast must leave the central combat field readable.
- Accepted gameplay rasters should use believable material, lighting, and surface detail at actual play size while preserving distinct silhouettes and restrained identity colors.
- A representative raster must prove clarity, transparency, offline payload, and in-motion fit before the same direction expands to a complete gameplay family.
- Procedural fallbacks remain mandatory for failed image loads and for every family not included in the accepted proof.

## Asset rules

- Store runtime and documentation assets locally; never load them from a CDN or third-party service.
- Prefer WebP and the smallest dimensions/quality that remain clean at the maximum rendered size.
- Record purpose and provenance here when adding or replacing an asset.
- Search all HTML, CSS, JavaScript, tests, and Markdown before moving or deleting a file.
- Remove an asset once it is proven unused; the audit rejects orphan runtime and README raster files.

## Replacement and capture workflow

No lossless generation sources or one-command capture pipeline are tracked for the current raster set. The gameplay briefs are summarized above, but generated images are not deterministically reproducible from the repository alone.

When adding or replacing runtime art:

1. Record the source method, original project brief, tool, transformation steps, intended scene, and any license or usage constraint in this document. Never commit credentials or private source material.
2. Keep transparent world art square unless a renderer change intentionally supports another aspect ratio. Size gameplay art to its intended on-Canvas aspect ratio and preserve transparent padding needed by that draw contract. Preserve the existing file path when the asset keeps the same role.
3. Inspect the image in the actual menu preview, authored stage, hyperspace handoff, narrow landscape layout, and reduced-effects mode. A standalone image preview is insufficient.
4. Confirm the central combat field remains readable, edges and transparency are clean, and the file remains within the repository payload limits.
5. Run the full verification gate, update affected descriptions or tests, and regenerate `SHA256SUMS` only after the final WebP is frozen.

When refreshing a README capture:

1. Use the real local renderer at a 1200×675 viewport; do not substitute a mockup or an unrelated generated scene.
2. Capture the named encounter with readable threats and HUD, remove browser chrome only, and encode the result as WebP without changing its content.
3. Keep exactly two restrained README captures unless the public README and its audit contract are deliberately changed together.
4. Update meaningful alternative text if the depicted action changes, visually inspect the rendered README, run `node tests/run.js`, and regenerate `SHA256SUMS`.

Record the exact capture environment in the pull request or release handoff. Repository tests validate reference integrity and file limits; they do not judge visual quality.
