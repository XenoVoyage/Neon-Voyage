# Visual assets

Neon Voyage uses local WebP scenery with procedural Canvas gameplay art. This keeps the worlds detailed while ships, threats, projectiles, pickups, and effects remain sharp, recolorable, and lightweight.

## Runtime inventory

| File | Role |
| --- | --- |
| `assets/deep-space.webp` | Shared star-field backdrop |
| `assets/earth.webp` | Earth Orbit landmark |
| `assets/mars.webp` | Inner-system landmark |
| `assets/frontier-world.webp` | Shattered Frontier world |
| `assets/titan-world.webp` | Ringed Titan Gate world |
| `assets/signal-world.webp` | First Contact world |
| `assets/shard-world.webp` | Strike Wing world |
| `assets/fleet-world.webp` | Raid Fleet world |
| `assets/command-world.webp` | Command Arena world |

All nine runtime rasters are AI-assisted original project assets. The six worlds beyond Mars were created with OpenAI's image generator from original project briefs; Earth, Mars, and the shared star field are preserved from the original asset set. None was copied, traced, or adapted from outside artwork.

## Documentation images

| File | Role |
| --- | --- |
| `docs/assets/neon-voyage-earth-orbit.webp` | README opening-gameplay capture |
| `docs/assets/neon-voyage-command-arena.webp` | README Harrower encounter capture |

Both captures come from the real local renderer. They are documentation-only and are kept compressed, repository-local, and meaningfully described in the README.

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
