# Local visual asset notes

Neon Voyage 1.4.0 bundles nine AI-assisted raster assets, optimized as local WebP files:

- `assets/deep-space.webp` — a wide, dark star field with restrained blue and violet nebulae and a clear central play area.
- `assets/earth.webp` — the illuminated Earth departure landmark.
- `assets/mars.webp` — the cratered Mars landmark near the Inner Belt.
- `assets/frontier-world.webp` — an oceanic exoplanet at the Shattered Frontier.
- `assets/titan-world.webp` — a warm, realistically ringed gas giant behind the Titan Gate.
- `assets/signal-world.webp` — an emerald cratered moon at First Contact.
- `assets/shard-world.webp` — a frozen violet world behind the Strike Wing.
- `assets/fleet-world.webp` — a deep-blue storm world behind the Raid Fleet.
- `assets/command-world.webp` — a red volcanic planet behind the Command Arena.

The original prompt set and 1.4.0 generation briefs were:

1. “Wide cinematic deep-space star field, restrained blue and violet nebula at the outer edges, dark high-contrast central gameplay area, no text, no ships, no planets, 16:9.”
2. “Photorealistic full Earth globe from space with oceans, continents, clouds, thin atmosphere and subtle night lights, centered isolated object, no text.”
3. “Photorealistic full Mars globe from space with cratered rust surface, polar detail and dramatic rim light, centered isolated object, no text.”
4. “Photorealistic isolated oceanic exoplanet for deep space, dark teal oceans, luminous atmosphere, intricate cloud systems, cinematic rim light, centered full globe, transparent background, no stars, rings, text, ships, or interface.”
5. “Photorealistic isolated ringed gas giant, warm amber and bronze cloud bands, physically plausible thin rings, dramatic distant-sun rim light, centered full planet and complete rings, transparent background, no stars, text, ships, or interface.”
6. “Photorealistic isolated emerald cratered alien moon, mineral-green terrain, subtle cyan atmospheric glow, centered full globe, transparent background, no rings, stars, text, ships, or interface.”
7. “Photorealistic isolated frozen violet exoplanet, fractured ice fields, restrained magenta-violet atmosphere, cinematic rim light, centered full globe, transparent background, no rings, stars, text, ships, or interface.”
8. “Photorealistic isolated deep-blue storm planet, layered cloud vortices and electric-blue atmosphere, cinematic rim light, centered full globe, transparent background, no rings, stars, text, ships, or interface.”
9. “Photorealistic isolated red volcanic exoplanet, dark basalt surface, glowing lava fissures and ember atmosphere, dramatic rim light, centered full globe, transparent background, no rings, stars, text, ships, or interface.”

The six deep-space planets added in 1.4.0 were created from these original prompts with OpenAI's built-in image generator and were not copied, traced, or adapted from an outside source. Earth and Mars are preserved. The Canvas renderer clips and interpolates every celestial image from deterministic, stage-authored position, scale, and opacity data; the images are scenery only.

Player craft, alien ships, capital ships, asteroids, projectiles, pickups, and effects remain procedural Canvas vectors. This keeps gameplay assets crisp, recolorable, lightweight, and dependency-free.

No runtime asset is embedded from Canva, a CDN, or another online service. Every released asset is stored in this repository and remains available offline.
