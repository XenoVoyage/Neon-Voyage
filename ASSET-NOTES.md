# Local visual asset notes

Neon Voyage bundles three AI-assisted raster assets, optimized as local WebP files:

- `assets/deep-space.webp` — a wide, dark star field with restrained blue and violet nebulae and a clear central play area.
- `assets/earth.webp` — an illuminated Earth globe used by deterministic stage keyframes.
- `assets/mars.webp` — a cratered Mars globe used by deterministic stage keyframes.

The source prompts were:

1. “Wide cinematic deep-space star field, restrained blue and violet nebula at the outer edges, dark high-contrast central gameplay area, no text, no ships, no planets, 16:9.”
2. “Photorealistic full Earth globe from space with oceans, continents, clouds, thin atmosphere and subtle night lights, centered isolated object, no text.”
3. “Photorealistic full Mars globe from space with cratered rust surface, polar detail and dramatic rim light, centered isolated object, no text.”

Earth and Mars are clipped by the Canvas renderer and animated from stage-authored position, scale, and opacity values. They are scenery only and do not trigger any network access.

Player craft, alien ships, capital ships, asteroids, projectiles, pickups, and effects are procedural Canvas vectors. This keeps gameplay assets crisp, recolorable, lightweight, and dependency-free.

No runtime asset is embedded from Canva, a CDN, or another online service. Every released asset is stored in this repository and remains available offline.
