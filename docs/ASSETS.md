# Visual assets

Neon Voyage uses local WebP scenery and a complete realistic gameplay raster set, with procedural Canvas fallbacks and code-drawn gameplay cues. The runtime remains lightweight, dependency-free, and fully offline.

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
| `assets/player-interceptor.webp` | 384×256 | Player interceptor |
| `assets/common-asteroid.webp` | 256×256 | Common `rock` asteroid |
| `assets/asteroid-crystal.webp` | 256×256 | Crystal asteroid |
| `assets/asteroid-volatile.webp` | 256×256 | Volatile asteroid |
| `assets/asteroid-armored.webp` | 256×256 | Armored asteroid |
| `assets/asteroid-colossal.webp` | 256×256 | Colossal asteroid |
| `assets/asteroid-titan.webp` | 256×256 | Titan asteroid |
| `assets/asteroid-razor.webp` | 256×256 | Razor asteroid |
| `assets/asteroid-prismatic.webp` | 256×256 | Prismatic asteroid |
| `assets/asteroid-monolith.webp` | 256×256 | Monolith asteroid |
| `assets/asteroid-auric-colossus.webp` | 256×256 | Auric Colossus |
| `assets/asteroid-auric-shard-explosive.webp` | 256×256 | Explosive Auric Shard |
| `assets/asteroid-auric-shard-magnetic.webp` | 256×256 | Magnetic Auric Shard |
| `assets/asteroid-corona.webp` | 256×256 | Corona asteroid |
| `assets/alien-scout.webp` | 384×256 | Alien Scout |
| `assets/alien-striker.webp` | 384×256 | Alien Striker |
| `assets/alien-bomber.webp` | 384×256 | Alien Bomber |
| `assets/alien-carrier.webp` | 384×256 | Alien Carrier |
| `assets/alien-lancer.webp` | 384×256 | Alien Lancer |
| `assets/alien-gunship.webp` | 384×256 | Alien Gunship |
| `assets/alien-brood-carrier.webp` | 384×256 | Alien Brood Carrier |
| `assets/boss-harrower.webp` | 512×320 | Harrower command ship |
| `assets/boss-leviathan.webp` | 512×320 | Leviathan command ship |
| `assets/boss-node-harrower.webp` | 192×192 | Harrower shield node |
| `assets/boss-node-leviathan.webp` | 192×192 | Leviathan shield node |
| `assets/player-plasma.webp` | 256×96 | Pulse plasma bolt |
| `assets/player-missile.webp` | 256×96 | Homing and seeker missile |
| `assets/player-rail-slug.webp` | 256×96 | Mass Driver rail slug |
| `assets/player-prism.webp` | 256×96 | Prism projectile |
| `assets/player-radial.webp` | 256×96 | Radial Array projectile |
| `assets/player-arc.webp` | 256×96 | Arc Burst projectile |
| `assets/player-lance.webp` | 256×96 | Nova Lance projectile |
| `assets/drone-plasma.webp` | 256×96 | Guardian Drone plasma |
| `assets/alien-plasma.webp` | 256×96 | Hostile plasma projectile |
| `assets/reflected-plasma.webp` | 256×96 | Leviathan-reflected projectile |
| `assets/plasma-impact.webp` | 192×192 | Compact plasma impact |
| `assets/shield-impact.webp` | 192×192 | Shield absorption impact |
| `assets/hull-impact.webp` | 192×192 | Hull damage impact |
| `assets/asteroid-break.webp` | 256×256 | Asteroid fragmentation burst |
| `assets/explosion-burst.webp` | 256×256 | Ship, boss, and mine destruction burst |
| `assets/shield-generator.webp` | 192×192 | Shield pickup |
| `assets/pickup-chassis.webp` | 192×192 | Shared non-shield pickup chassis |
| `assets/guardian-drone.webp` | 192×128 | Guardian Drone |
| `assets/orbit-blade.webp` | 256×96 | Orbit Blade |
| `assets/player-mine.webp` | 192×192 | Player Mine Layer charge |
| `assets/alien-mine.webp` | 192×192 | Hostile mine |

All 55 runtime rasters are original project assets. The six worlds beyond Mars were created with OpenAI's image generator from original project briefs; Earth, Mars, and the shared star field are preserved from the original asset set. None was copied, traced, or adapted from outside artwork.

The 46 gameplay sources were created on 2026-08-20 with OpenAI's built-in image generator in stylized-concept mode from original Neon Voyage briefs. The existing game screenshot was used only to judge composition, gameplay scale, and the worlds' believable lighting; no screenshot pixels or outside artwork were supplied as source art. Briefs consistently requested orthographic silhouettes, believable upper-left self-lighting, restrained cyan/magenta player technology, violet/green biomechanical alien technology, natural asteroid materials, transparent backgrounds, and no floor, cast shadow, drop shadow, text, logo, watermark, or background glow box. Generated PNGs were alpha-inspected, trimmed where needed, resized and centered on transparent canvases, then encoded with ImageMagick 6.9 to WebP at quality 88–90 with full alpha quality. No third-party license or runtime service is required.

The six previously accepted subjects remain byte-for-byte unchanged. The additional 40 rasters complete every physical asteroid, ship, boss/node, projectile, mine, pickup chassis, drone, blade, impact, and destruction family. Simulation objects, collision radii, timing, balance, deterministic state, accessibility, and saved-data shape are unchanged. If a raster is pending or fails to load, the established procedural fallback remains available; telegraphs, shields, crack stages, hazard pulses, pickup symbols, and target cues stay code-drawn because they communicate live gameplay state.

## Documentation images

| File | Role |
| --- | --- |
| `docs/assets/neon-voyage-earth-orbit.webp` | README opening-gameplay capture |
| `docs/assets/neon-voyage-command-arena.webp` | README Harrower encounter capture |

Both captures come from a real local renderer. They predate the `v2026.8.20e` complete gameplay-art pass and remain documentation-only until a fresh real-renderer capture is warranted; they are kept compressed, repository-local, and meaningfully described in the README.

The two current captures are 1200×675 WebP files. The audit enforces a 256 KiB maximum per documentation image.

## Art direction

- Worlds should look cinematic, natural, and individually recognizable.
- Earth and Mars are the quality reference for believable lighting and surface detail.
- Planet silhouettes and atmospheres must not resemble HUD rings, repeated stripes, or transparent overlays.
- Background contrast must leave the central combat field readable.
- Gameplay rasters use believable material, lighting, and surface detail at actual play size while preserving distinct silhouettes and restrained identity colors.
- Physical objects use self-shading and restrained contact occlusion only. Never bake a directional cast/drop shadow into a rotating sprite; attached engine, weapon, shield, and hazard emission may rotate with its owner.
- Procedural fallbacks remain mandatory for pending or failed image loads. Code-drawn overlays remain reserved for live state and accessibility cues.

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
