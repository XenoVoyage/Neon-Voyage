(function attachRenderer(global) {
  "use strict";

  const ND = global.ND = global.ND || {};
  const CONFIG = ND.CONFIG;
  const TAU = Math.PI * 2;
  const mod = (value, span) => ((value % span) + span) % span;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const DEFAULT_TRAVEL_DIRECTION = Object.freeze({ x: 0, y: -1 });
  const CELESTIAL_ASSET_SOURCES = Object.freeze({
    earth: "assets/earth.webp",
    mars: "assets/mars.webp",
    "frontier-world": "assets/frontier-world.webp",
    "titan-world": "assets/titan-world.webp",
    "signal-world": "assets/signal-world.webp",
    "shard-world": "assets/shard-world.webp",
    "fleet-world": "assets/fleet-world.webp",
    "command-world": "assets/command-world.webp"
  });
  const SCENE_KEYFRAMES = Object.freeze([
    Object.freeze({ depth: 0.08, hue: 205, bodies: Object.freeze([
      Object.freeze({ id: "earth", type: "earth", x: 0.88, y: 0.58, size: 0.62, alpha: 0.92, hue: 205 }),
      Object.freeze({ id: "mars", type: "mars", x: 0.07, y: 0.16, size: 0.025, alpha: 0.025, hue: 18 })
    ]) }),
    Object.freeze({ depth: 0.18, hue: 25, bodies: Object.freeze([
      Object.freeze({ id: "earth", type: "earth", x: 0.08, y: 0.82, size: 0.14, alpha: 0.28, hue: 205 }),
      Object.freeze({ id: "mars", type: "mars", x: 0.8, y: 0.25, size: 0.27, alpha: 0.72, hue: 18 })
    ]) }),
    Object.freeze({ depth: 0.32, hue: 238, bodies: Object.freeze([
      Object.freeze({ id: "earth", type: "earth", x: 0.015, y: 0.9, size: 0.052, alpha: 0.1, hue: 205 }),
      Object.freeze({ id: "mars", type: "mars", x: 0.965, y: 0.1, size: 0.072, alpha: 0.16, hue: 18 })
    ]) }),
    Object.freeze({ depth: 0.47, hue: 174, bodies: Object.freeze([
      Object.freeze({ id: "frontier", type: "frontier-world", x: 0.82, y: 0.72, size: 0.33, alpha: 0.64, hue: 174 })
    ]) }),
    Object.freeze({ depth: 0.6, hue: 36, bodies: Object.freeze([
      Object.freeze({ id: "titan-gate", type: "titan-world", x: 0.16, y: 0.33, size: 0.5, alpha: 0.76, hue: 36 })
    ]) }),
    Object.freeze({ depth: 0.71, hue: 142, bodies: Object.freeze([
      Object.freeze({ id: "signal-moon", type: "signal-world", x: 0.84, y: 0.22, size: 0.22, alpha: 0.58, hue: 142 })
    ]) }),
    Object.freeze({ depth: 0.8, hue: 304, bodies: Object.freeze([
      Object.freeze({ id: "shard-world", type: "shard-world", x: 0.12, y: 0.76, size: 0.31, alpha: 0.66, hue: 304 })
    ]) }),
    Object.freeze({ depth: 0.9, hue: 256, bodies: Object.freeze([
      Object.freeze({ id: "fleet-world", type: "fleet-world", x: 0.74, y: 0.63, size: 0.46, alpha: 0.72, hue: 256 })
    ]) }),
    Object.freeze({ depth: 0.96, hue: 285, bodies: Object.freeze([
      Object.freeze({ id: "command-screen", type: "fleet-world", x: 0.18, y: 0.28, size: 0.33, alpha: 0.6, hue: 277 }),
      Object.freeze({ id: "command-beacon", type: "shard-world", x: 0.9, y: 0.76, size: 0.16, alpha: 0.34, hue: 318 })
    ]) }),
    Object.freeze({ depth: 1, hue: 344, bodies: Object.freeze([
      Object.freeze({ id: "harrower-world", type: "command-world", x: 0.52, y: 0.16, size: 0.39, alpha: 0.82, hue: 344 })
    ]) }),
    Object.freeze({ depth: 1.08, hue: 32, bodies: Object.freeze([
      Object.freeze({ id: "ion-remnant", type: "titan-world", x: 0.08, y: 0.72, size: 0.24, alpha: 0.42, hue: 28 }),
      Object.freeze({ id: "ion-moon", type: "frontier-world", x: 0.82, y: 0.18, size: 0.1, alpha: 0.2, hue: 202 })
    ]) }),
    Object.freeze({ depth: 1.16, hue: 292, bodies: Object.freeze([
      Object.freeze({ id: "prism-primary", type: "shard-world", x: 0.86, y: 0.48, size: 0.51, alpha: 0.72, hue: 298 }),
      Object.freeze({ id: "prism-secondary", type: "signal-world", x: 0.12, y: 0.16, size: 0.12, alpha: 0.26, hue: 166 })
    ]) }),
    Object.freeze({ depth: 1.24, hue: 226, bodies: Object.freeze([
      Object.freeze({ id: "gravity-anchor", type: "command-world", x: 0.06, y: 0.28, size: 0.22, alpha: 0.36, hue: 222 }),
      Object.freeze({ id: "gravity-shear", type: "frontier-world", x: 0.88, y: 0.82, size: 0.31, alpha: 0.48, hue: 184 })
    ]) }),
    Object.freeze({ depth: 1.32, hue: 168, bodies: Object.freeze([
      Object.freeze({ id: "halo-core", type: "frontier-world", x: 0.54, y: 0.24, size: 0.38, alpha: 0.58, hue: 166 }),
      Object.freeze({ id: "halo-shard-left", type: "shard-world", x: 0.05, y: 0.82, size: 0.09, alpha: 0.19, hue: 312 }),
      Object.freeze({ id: "halo-shard-right", type: "shard-world", x: 0.94, y: 0.68, size: 0.13, alpha: 0.24, hue: 326 })
    ]) }),
    Object.freeze({ depth: 1.4, hue: 118, bodies: Object.freeze([
      Object.freeze({ id: "anomaly-crown", type: "signal-world", x: 0.48, y: 0.58, size: 0.62, alpha: 0.7, hue: 122 })
    ]) }),
    Object.freeze({ depth: 1.5, hue: 353, bodies: Object.freeze([
      Object.freeze({ id: "vanguard-muster", type: "fleet-world", x: 0.14, y: 0.64, size: 0.42, alpha: 0.62, hue: 350 }),
      Object.freeze({ id: "vanguard-signal", type: "signal-world", x: 0.84, y: 0.16, size: 0.15, alpha: 0.3, hue: 145 })
    ]) }),
    Object.freeze({ depth: 1.6, hue: 208, bodies: Object.freeze([
      Object.freeze({ id: "null-bastion", type: "titan-world", x: 0.82, y: 0.3, size: 0.43, alpha: 0.66, hue: 212 }),
      Object.freeze({ id: "null-shard", type: "shard-world", x: 0.1, y: 0.78, size: 0.18, alpha: 0.28, hue: 292 })
    ]) }),
    Object.freeze({ depth: 1.7, hue: 278, bodies: Object.freeze([
      Object.freeze({ id: "siege-choir", type: "command-world", x: 0.78, y: 0.78, size: 0.3, alpha: 0.5, hue: 282 }),
      Object.freeze({ id: "siege-fleet", type: "fleet-world", x: 0.22, y: 0.18, size: 0.24, alpha: 0.42, hue: 248 })
    ]) }),
    Object.freeze({ depth: 1.82, hue: 322, bodies: Object.freeze([
      Object.freeze({ id: "sovereign-gate", type: "command-world", x: 0.92, y: 0.5, size: 0.58, alpha: 0.78, hue: 326 }),
      Object.freeze({ id: "sovereign-guard", type: "fleet-world", x: 0.18, y: 0.7, size: 0.24, alpha: 0.4, hue: 256 })
    ]) }),
    Object.freeze({ depth: 1.96, hue: 264, bodies: Object.freeze([
      Object.freeze({ id: "leviathan-well", type: "signal-world", x: 0.5, y: 0.18, size: 0.48, alpha: 0.72, hue: 266 }),
      Object.freeze({ id: "leviathan-remnant", type: "titan-world", x: 0.07, y: 0.9, size: 0.28, alpha: 0.38, hue: 26 }),
      Object.freeze({ id: "leviathan-shard", type: "shard-world", x: 0.92, y: 0.82, size: 0.16, alpha: 0.3, hue: 314 })
    ]) })
  ]);

  function stageNumber(value) {
    return clamp(Math.floor(Number(value) || 1), 1, SCENE_KEYFRAMES.length);
  }

  function sectorNumber(value) {
    return Math.max(1, Math.floor(Number(value) || 1));
  }

  function copyBody(body) {
    return {
      id: body.id,
      type: body.type,
      x: body.x,
      y: body.y,
      size: body.size,
      alpha: body.alpha,
      hue: body.hue
    };
  }

  function authoredScene(stage, sector) {
    const safeStage = stageNumber(stage);
    const safeSector = sectorNumber(sector);
    const source = SCENE_KEYFRAMES[safeStage - 1];
    const hueShift = (safeSector - 1) * 29;
    const bodies = source.bodies.map(copyBody);
    if (safeSector > 1) {
      for (const body of bodies) {
        if (body.id === "earth" || body.id === "mars") body.alpha = 0;
        else body.hue = mod(body.hue + hueShift, 360);
      }
      if (safeStage <= 3) {
        const waypoint = [
          { x: 0.86, y: 0.68, size: 0.25, alpha: 0.46 },
          { x: 0.2, y: 0.25, size: 0.17, alpha: 0.32 },
          { x: 0.045, y: 0.84, size: 0.07, alpha: 0.13 }
        ][safeStage - 1];
        bodies.push({ id: "waypoint", type: "frontier-world", ...waypoint, hue: mod(188 + hueShift, 360) });
      }
    }
    return {
      stage: safeStage,
      sector: safeSector,
      depth: source.depth + Math.min(0.18, (safeSector - 1) * 0.025),
      hue: mod(source.hue + hueShift, 360),
      bodies
    };
  }

  function bodyMap(bodies) {
    const result = Object.create(null);
    for (const body of bodies) result[body.id] = body;
    return result;
  }

  function interpolateBody(from, to, amount) {
    if (amount <= 0) return from ? copyBody(from) : { ...to, alpha: 0 };
    if (amount >= 1) return to ? copyBody(to) : { ...from, alpha: 0 };
    const source = from || { ...to, alpha: 0 };
    const target = to || { ...from, alpha: 0 };
    return {
      id: source.id || target.id,
      type: amount < 0.5 ? source.type : target.type,
      x: source.x + (target.x - source.x) * amount,
      y: source.y + (target.y - source.y) * amount,
      size: source.size + (target.size - source.size) * amount,
      alpha: source.alpha + (target.alpha - source.alpha) * amount,
      hue: source.hue + (target.hue - source.hue) * amount
    };
  }

  function sceneFrame(stage, sector, transitionProgress, toStage, toSector) {
    const fromStage = stageNumber(stage);
    const fromSector = sectorNumber(sector);
    const nextStage = toStage == null ? (fromStage < SCENE_KEYFRAMES.length ? fromStage + 1 : 1) : stageNumber(toStage);
    const nextSector = toSector == null ? (fromStage < SCENE_KEYFRAMES.length ? fromSector : fromSector + 1) : sectorNumber(toSector);
    const amount = clamp(Number(transitionProgress) || 0, 0, 1);
    const from = authoredScene(fromStage, fromSector);
    const to = authoredScene(nextStage, nextSector);
    const fromBodies = bodyMap(from.bodies);
    const toBodies = bodyMap(to.bodies);
    const ids = from.bodies.map((body) => body.id);
    for (const body of to.bodies) if (!fromBodies[body.id]) ids.push(body.id);
    const bodies = ids.map((id) => interpolateBody(fromBodies[id], toBodies[id], amount));
    const visibleBodies = bodies.filter((body) => body.alpha > 0.002 && body.size > 0.002);
    return {
      fromStage,
      toStage: nextStage,
      fromSector,
      toSector: nextSector,
      progress: amount,
      depth: from.depth + (to.depth - from.depth) * amount,
      hue: from.hue + (to.hue - from.hue) * amount,
      bodies,
      visibleBodies
    };
  }

  function smoothstep(value) {
    const amount = clamp(Number(value) || 0, 0, 1);
    return amount * amount * (3 - amount * 2);
  }

  function normalizedDirection(x, y, fallback) {
    const safeX = Number.isFinite(Number(x)) ? Number(x) : 0;
    const safeY = Number.isFinite(Number(y)) ? Number(y) : 0;
    const length = Math.hypot(safeX, safeY);
    if (length > 0.0001) return { x: safeX / length, y: safeY / length };
    return { x: fallback.x, y: fallback.y };
  }

  function cinematicProfile(state, reducedEffects) {
    const cinematic = state && state.cinematic;
    const active = Boolean(state && state.mode === "transition" && cinematic && cinematic.active);
    if (!active) {
      return {
        streaks: false,
        progress: 0,
        intensity: 0,
        density: 0,
        lengthScale: 0,
        speed: 0,
        direction: { x: 0, y: 0 }
      };
    }

    const duration = Number(cinematic.duration);
    const elapsed = Number(cinematic.elapsed);
    const explicitProgress = Number(cinematic.progress);
    const progress = Number.isFinite(explicitProgress)
      ? clamp(explicitProgress, 0, 1)
      : duration > 0 && Number.isFinite(elapsed)
        ? clamp(elapsed / duration, 0, 1)
        : 0;
    const travel = normalizedDirection(
      cinematic.directionX,
      cinematic.directionY,
      DEFAULT_TRAVEL_DIRECTION
    );
    const reduced = Boolean(reducedEffects);
    const build = smoothstep(clamp(progress * 1.45, 0, 1));

    return {
      streaks: true,
      progress,
      intensity: clamp(build * (reduced ? 0.68 : 1), 0, 1),
      density: reduced ? 0.38 : 0.82,
      lengthScale: reduced ? 0.56 : 1,
      speed: clamp(Number(cinematic.speed) || 980, 240, 1800),
      direction: { x: -travel.x, y: -travel.y }
    };
  }

  function screenAnchor(state, viewport) {
    const width = Math.max(1, Number(viewport && viewport.width) || 1);
    const height = Math.max(1, Number(viewport && viewport.height) || 1);
    const ship = state && state.ship;
    const camera = state && state.camera;
    if (!ship || !camera) return null;
    const cinematic = state && state.cinematic;
    const hasCapturedAnchor = Boolean(
      state.mode === "transition" &&
      cinematic &&
      cinematic.active &&
      Number.isFinite(Number(cinematic.anchorX)) &&
      Number.isFinite(Number(cinematic.anchorY))
    );
    const x = hasCapturedAnchor
      ? width * 0.5 + Number(cinematic.anchorX)
      : Number(ship.x) - Number(camera.x) + width * 0.5;
    const y = hasCapturedAnchor
      ? height * 0.5 + Number(cinematic.anchorY)
      : Number(ship.y) - Number(camera.y) + height * 0.5;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y, normalizedX: x / width, normalizedY: y / height };
  }

  function asteroidCrackStage(asteroid) {
    const health = Number(asteroid && asteroid.health);
    const maxHealth = Number(asteroid && asteroid.maxHealth);
    const ratio = maxHealth > 0 && Number.isFinite(health) ? clamp(health / maxHealth, 0, 1) : 1;
    return ratio < 0.25 ? 3 : ratio < 0.5 ? 2 : ratio < 0.75 ? 1 : 0;
  }

  function previewRandom(stage, sector) {
    let value = (Math.imul(stageNumber(stage), 0x9e3779b1) ^ Math.imul(sectorNumber(sector), 0x85ebca6b)) >>> 0;
    return function nextPreviewRandom() {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  const previewAssets = Object.create(null);

  function assetSource(type) {
    return Object.prototype.hasOwnProperty.call(CELESTIAL_ASSET_SOURCES, type)
      ? CELESTIAL_ASSET_SOURCES[type]
      : null;
  }

  function previewAsset(type, canvas, stage, sector) {
    const source = assetSource(type);
    if (!source || typeof global.Image !== "function") return null;
    let record = previewAssets[type];
    if (!record) {
      const image = new global.Image();
      record = previewAssets[type] = { image, pending: [], failed: false };
      image.decoding = "async";
      image.onload = () => {
        const pending = record.pending.splice(0);
        for (const request of pending) renderStagePreview(request.canvas, request.stage, request.sector);
      };
      image.onerror = () => {
        record.failed = true;
        record.pending.length = 0;
      };
      image.src = source;
    }
    if (record.image.complete && record.image.naturalWidth) return record.image;
    if (!record.failed && !record.pending.some((request) => request.canvas === canvas)) {
      record.pending.push({ canvas, stage, sector });
    }
    return null;
  }

  function renderStagePreview(canvas, stage, sector) {
    if (!canvas || typeof canvas.getContext !== "function") return false;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    const width = Math.max(1, Number(canvas.width) || 320);
    const height = Math.max(1, Number(canvas.height) || 180);
    const scene = authoredScene(stage, sector);
    const random = previewRandom(scene.stage, scene.sector);
    const background = ctx.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, `hsl(${mod(scene.hue - 28, 360)} 56% 8%)`);
    background.addColorStop(0.55, "#030713");
    background.addColorStop(1, `hsl(${mod(scene.hue + 34, 360)} 44% 7%)`);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(width * 0.52, height * 0.46, 0, width * 0.52, height * 0.46, width * 0.72);
    glow.addColorStop(0, `hsla(${scene.hue} 82% 58% / 0.12)`);
    glow.addColorStop(1, `hsla(${scene.hue} 82% 30% / 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    for (let index = 0; index < 44; index += 1) {
      const size = 0.45 + random() * 1.25;
      ctx.globalAlpha = 0.25 + random() * 0.68;
      ctx.fillStyle = random() < 0.24 ? "#a9ecff" : "#ffffff";
      ctx.fillRect(random() * width, random() * height, size, size);
    }
    ctx.restore();

    const unit = Math.min(width, height);
    for (const body of scene.bodies) {
      if (body.alpha <= 0.002 || body.size <= 0.002) continue;
      const x = body.x * width;
      const y = body.y * height;
      const radius = Math.max(1.5, body.size * unit * 0.5);
      ctx.save();
      const halo = ctx.createRadialGradient(x, y, radius * 0.12, x, y, radius * 1.18);
      halo.addColorStop(0, `hsla(${body.hue} 86% 64% / 0.2)`);
      halo.addColorStop(1, `hsla(${body.hue} 78% 38% / 0)`);
      ctx.globalAlpha = clamp(body.alpha, 0, 1);
      ctx.fillStyle = halo;
      ctx.fillRect(x - radius * 1.2, y - radius * 1.2, radius * 2.4, radius * 2.4);
      const image = previewAsset(body.type, canvas, stage, sector);
      if (image) {
        const drawHeight = radius * 2;
        const drawWidth = drawHeight * (image.naturalWidth / image.naturalHeight);
        ctx.drawImage(image, x - drawWidth * 0.5, y - drawHeight * 0.5, drawWidth, drawHeight);
      } else {
        const planet = ctx.createRadialGradient(x - radius * 0.34, y - radius * 0.38, radius * 0.06, x, y, radius);
        planet.addColorStop(0, `hsl(${mod(body.hue + 20, 360)} 72% 78%)`);
        planet.addColorStop(0.46, `hsl(${body.hue} 56% 38%)`);
        planet.addColorStop(1, "#030610");
        ctx.fillStyle = planet;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    return true;
  }

  function enigmaChoiceId(choice) {
    if (!choice || typeof choice !== "object") return "pulse";
    const source = choice.enhancementId || choice.moduleId || choice.id || choice.kind || "pulse";
    const value = String(source);
    const separator = value.lastIndexOf(":");
    return separator >= 0 ? value.slice(separator + 1) : value;
  }

  function enigmaChoiceTier(choice) {
    if (!choice || typeof choice !== "object") return 1;
    for (const value of [choice.nextTier, choice.previewTier, choice.moduleTier]) {
      const tier = Math.floor(Number(value));
      if (Number.isFinite(tier) && tier > 0) return clamp(tier, 1, 5);
    }
    return 1;
  }

  function enigmaChoiceColor(id, choice) {
    const module = CONFIG.weapons && CONFIG.weapons.modules && CONFIG.weapons.modules[id];
    if (module && module.color) return module.color;
    const powerup = CONFIG.powerups && CONFIG.powerups[id];
    if (powerup && powerup.color) return powerup.color;
    if (id === "amplifier") return "#ffb45f";
    if (id === "aegis" || id === "shield") return "#7bdcff";
    if (id === "repair") return "#7dff9b";
    if (id === "pulseCharge") return "#c584ff";
    if (choice && choice.activation === "autonomous") return "#65ffbd";
    if (choice && choice.activation === "passive") return "#66f7ff";
    return "#c584ff";
  }

  function drawPreviewShip(ctx, x, y, scale, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(5,15,29,0.96)";
    ctx.strokeStyle = color || "#8ffcff";
    ctx.lineWidth = 1.2 / Math.max(0.35, scale);
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(-5, -8);
    ctx.lineTo(-2, -3);
    ctx.lineTo(-11, -2);
    ctx.lineTo(-11, 2);
    ctx.lineTo(-2, 3);
    ctx.lineTo(-5, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ff57d8";
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-2, -2.5);
    ctx.lineTo(-2, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPreviewTarget(ctx, x, y, radius, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color || "#ff7b72";
    ctx.fillStyle = "rgba(31,12,26,0.82)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * TAU;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function renderEnigmaPreview(canvas, choice, seconds, reducedEffects) {
    if (!canvas || typeof canvas.getContext !== "function") return false;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    const cssWidth = Math.max(1, Number(canvas.clientWidth) || Number(canvas.width) || 240);
    const cssHeight = Math.max(1, Number(canvas.clientHeight) || Number(canvas.height) || 64);
    const dpr = clamp(Number(global.devicePixelRatio) || 1, 1, 2);
    const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
    const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const id = enigmaChoiceId(choice);
    const tier = enigmaChoiceTier(choice);
    const color = enigmaChoiceColor(id, choice);
    const clock = reducedEffects ? 0.42 : Math.max(0, Number(seconds) || 0);
    const phase = mod(clock * 0.46 + id.length * 0.071, 1);
    const centerY = cssHeight * 0.5;
    const shipX = cssWidth * 0.2;
    const targetX = cssWidth * 0.8;
    const unit = Math.max(7, Math.min(13, cssHeight * 0.19));

    ctx.save();
    ctx.fillStyle = "rgba(1,6,16,0.2)";
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    ctx.strokeStyle = "rgba(142,231,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(cssWidth, centerY);
    ctx.stroke();
    ctx.fillStyle = "rgba(202,247,255,0.45)";
    for (let index = 0; index < 4; index += 1) {
      ctx.fillRect(cssWidth * (0.1 + index * 0.27), cssHeight * (0.2 + (index % 2) * 0.56), 1, 1);
    }

    drawPreviewShip(ctx, shipX, centerY, unit / 12, color);

    if (id === "radialArray" || id === "arcBurst") {
      const radius = unit * (1.15 + phase * 2.2);
      const count = Math.min(8, 4 + tier);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.34 + (1 - phase) * 0.42;
      ctx.beginPath();
      ctx.arc(shipX, centerY, radius, 0, TAU);
      ctx.stroke();
      for (let index = 0; index < count; index += 1) {
        const angle = index / count * TAU + phase * 0.7;
        ctx.fillRect(shipX + Math.cos(angle) * radius - 1, centerY + Math.sin(angle) * radius - 1, 2, 2);
      }
    } else if (id === "drone" || id === "orbitBlades") {
      const count = Math.min(5, Math.max(1, tier));
      const radius = Math.min(cssHeight * 0.36, unit * 2.25);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.24;
      ctx.beginPath(); ctx.arc(shipX, centerY, radius, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = color;
      for (let index = 0; index < count; index += 1) {
        const angle = phase * TAU + index / count * TAU;
        const x = shipX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        if (id === "orbitBlades") {
          ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.fillRect(-5, -1.5, 10, 3); ctx.restore();
        } else {
          ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill();
        }
      }
    } else if (id === "teslaCoil") {
      const middleX = cssWidth * 0.5;
      drawPreviewTarget(ctx, middleX, centerY - unit * 0.7, unit * 0.42, color);
      drawPreviewTarget(ctx, targetX, centerY + unit * 0.5, unit * 0.48, color);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = 0.62 + Math.sin(clock * 8) * 0.18;
      ctx.beginPath();
      ctx.moveTo(shipX + unit, centerY);
      ctx.lineTo(cssWidth * 0.36, centerY + unit * 0.38);
      ctx.lineTo(middleX, centerY - unit * 0.7);
      ctx.lineTo(cssWidth * 0.66, centerY - unit * 0.2);
      ctx.lineTo(targetX, centerY + unit * 0.5);
      ctx.stroke();
    } else if (id === "mineLayer") {
      const mineX = cssWidth * (0.43 + phase * 0.1);
      const radius = unit * (1.25 + phase * 0.5);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.42;
      ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.arc(mineX, centerY, radius, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "rgba(46,25,8,0.9)";
      ctx.beginPath(); ctx.arc(mineX, centerY, unit * 0.42, 0, TAU); ctx.fill();
      ctx.strokeStyle = color; ctx.stroke();
      drawPreviewTarget(ctx, targetX, centerY, unit * 0.52, "#ff7b72");
    } else if (id === "shieldReactor" || id === "shield" || id === "aegis") {
      const radius = unit * (1.25 + phase * 0.7);
      ctx.strokeStyle = color;
      ctx.lineWidth = id === "aegis" ? 2.2 : 1.6;
      ctx.globalAlpha = 0.42 + (1 - phase) * 0.44;
      ctx.setLineDash(id === "aegis" ? [5, 3] : [3, 5]);
      ctx.beginPath();
      ctx.arc(shipX, centerY, radius, -Math.PI * 0.82, Math.PI * 0.82);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.7;
      ctx.fillRect(shipX + radius - 1, centerY - 1, 2, 2);
    } else if (id === "tractorField") {
      const radius = Math.min(cssHeight * 0.41, unit * 2.7);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.36;
      for (let index = 0; index < 4; index += 1) {
        const start = index / 4 * TAU + 0.12;
        ctx.beginPath(); ctx.arc(shipX, centerY, radius, start, start + 0.72); ctx.stroke();
      }
      const pickupX = cssWidth * (0.77 - phase * 0.33);
      const pickupY = centerY - unit * 0.68;
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(pickupX, pickupY); ctx.lineTo(shipX + unit, centerY); ctx.stroke();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(pickupX, pickupY, 3.4, 0, TAU); ctx.fill();
    } else if (id === "overclock" || id === "rapid") {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.82;
      for (let index = 0; index < 4; index += 1) {
        const travel = mod(phase + index * 0.23, 1);
        const x = shipX + unit + travel * (cssWidth * 0.68);
        ctx.fillRect(x, centerY - 1, 7, 2);
      }
      ctx.globalAlpha = 0.28;
      ctx.beginPath(); ctx.arc(shipX, centerY, unit * (1.1 + phase), 0, TAU); ctx.stroke();
    } else if (id === "homingSalvo" || id === "seeker") {
      drawPreviewTarget(ctx, targetX, centerY - unit * 0.35, unit * 0.5, "#ff7b72");
      const travel = phase;
      const x = shipX + unit + (targetX - shipX - unit) * travel;
      const y = centerY - Math.sin(travel * Math.PI) * unit * 1.15;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.34;
      ctx.beginPath();
      ctx.moveTo(shipX + unit, centerY);
      ctx.quadraticCurveTo(cssWidth * 0.5, centerY - unit * 1.8, targetX, centerY - unit * 0.35);
      ctx.stroke();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = color;
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.2 + travel * 0.48); ctx.fillRect(-5, -2, 10, 4); ctx.restore();
    } else if (id === "triShot" || id === "prism") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = 0.76;
      for (const offset of [-0.34, 0, 0.34]) {
        ctx.beginPath();
        ctx.moveTo(shipX + unit, centerY);
        ctx.lineTo(targetX, centerY + offset * cssHeight * 0.62);
        ctx.stroke();
      }
    } else if (id === "piercing" || id === "massDriver" || id === "novaLance") {
      for (let index = 0; index < 3; index += 1) {
        drawPreviewTarget(ctx, cssWidth * (0.48 + index * 0.16), centerY, unit * 0.35, "#ff7b72");
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = id === "novaLance" ? 3.2 : 2;
      ctx.globalAlpha = 0.7 + Math.sin(clock * 7) * 0.16;
      ctx.beginPath(); ctx.moveTo(shipX + unit, centerY); ctx.lineTo(cssWidth * 0.96, centerY); ctx.stroke();
    } else if (id === "amplifier") {
      drawPreviewTarget(ctx, targetX, centerY, unit * 0.56, "#ff7b72");
      const travel = phase;
      const x = shipX + unit + (targetX - shipX - unit) * travel;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.moveTo(x - 10, centerY); ctx.lineTo(x, centerY); ctx.stroke();
      ctx.globalAlpha = Math.max(0, (phase - 0.78) * 4.5);
      ctx.beginPath(); ctx.arc(targetX, centerY, unit * (0.7 + phase), 0, TAU); ctx.stroke();
    } else if (id === "repair") {
      const left = cssWidth * 0.4;
      const top = centerY - 4;
      const width = cssWidth * 0.46;
      ctx.strokeStyle = "rgba(125,255,155,0.42)";
      ctx.strokeRect(left, top, width, 8);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.82;
      ctx.fillRect(left + 2, top + 2, (width - 4) * (0.35 + phase * 0.65), 4);
    } else if (id === "pulseCharge") {
      const radius = unit * 1.65;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.78;
      ctx.beginPath();
      ctx.arc(shipX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + TAU * (0.3 + phase * 0.7));
      ctx.stroke();
    } else {
      drawPreviewTarget(ctx, targetX, centerY, unit * 0.52, "#ff7b72");
      const travel = phase;
      const x = shipX + unit + (targetX - shipX - unit) * travel;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.globalAlpha = 0.84;
      ctx.beginPath(); ctx.moveTo(x - 9, centerY); ctx.lineTo(x, centerY); ctx.stroke();
    }
    ctx.restore();
    return true;
  }

  ND.RenderDebug = Object.freeze({
    sceneFrame,
    cinematicProfile,
    screenAnchor,
    asteroidCrackStage,
    assetSource
  });
  ND.StagePreview = Object.freeze({ render: renderStagePreview });
  ND.EnigmaPreview = Object.freeze({ render: renderEnigmaPreview });

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
      this.width = 1;
      this.height = 1;
      this.dpr = 1;
      this.reduced = false;
      this.assets = Object.create(null);
      this.stars = [];
      this.speedDust = [];
      this.encounterWashes = [];
      this.fieldDashPattern = [10, 9];
      this.loadAssets();
      this.resize();
    }

    loadAssets() {
      if (typeof global.Image !== "function") return;
      const sources = { space: "assets/deep-space.webp", ...CELESTIAL_ASSET_SOURCES };
      for (const [name, source] of Object.entries(sources)) {
        const image = new global.Image();
        image.decoding = "async";
        image.src = source;
        this.assets[name] = image;
      }
    }

    resize() {
      this.width = Math.max(1, global.innerWidth || this.canvas.clientWidth || 1280);
      this.height = Math.max(1, global.innerHeight || this.canvas.clientHeight || 720);
      const requested = Math.min(global.devicePixelRatio || 1, 2);
      const pixelCap = Math.sqrt(5200000 / Math.max(1, this.width * this.height));
      this.dpr = Math.max(0.25, Math.min(requested, pixelCap));
      this.canvas.width = Math.max(1, Math.floor(this.width * this.dpr));
      this.canvas.height = Math.max(1, Math.floor(this.height * this.dpr));
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.buildStars();
      this.buildEncounterWashes();
      this.vignetteGradient = this.ctx.createRadialGradient(
        this.width / 2,
        this.height / 2,
        Math.min(this.width, this.height) * 0.18,
        this.width / 2,
        this.height / 2,
        Math.max(this.width, this.height) * 0.76
      );
      this.vignetteGradient.addColorStop(0, "rgba(1,3,10,0)");
      this.vignetteGradient.addColorStop(1, "rgba(0,1,6,0.52)");
    }

    buildStars() {
      const count = clamp(Math.floor(this.width * this.height / 6500), 120, 360);
      let seed = 0x2f6e2b1;
      const random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      this.stars = Array.from({ length: count }, () => ({
        x: random() * this.width,
        y: random() * this.height,
        depth: 0.01 + random() * 0.075,
        size: 0.45 + random() * 1.55,
        alpha: 0.25 + random() * 0.68,
        phase: random() * TAU,
        blue: random() < 0.22
      }));
      const dustCount = clamp(Math.floor(this.width * this.height / 17000), 36, 112);
      this.speedDust = Array.from({ length: dustCount }, () => ({
        x: random() * this.width,
        y: random() * this.height,
        depth: 0.1 + random() * 0.17,
        size: 0.45 + random() * 1.05,
        alpha: 0.12 + random() * 0.38,
        phase: random() * TAU
      }));
    }

    buildEncounterWashes() {
      const themes = SCENE_KEYFRAMES.map((scene, index) => [
        `hsla(${mod(scene.hue - 24 - index * 3, 360)}, 72%, 46%, 0.15)`,
        `hsla(${mod(scene.hue + 34 + index * 5, 360)}, 88%, 66%, 0.09)`
      ]);
      this.encounterWashes = themes.map((colors, index) => {
        const encounter = CONFIG.sector && Array.isArray(CONFIG.sector.encounters)
          ? CONFIG.sector.encounters[index]
          : null;
        const bossType = encounter && encounter.bossType ? String(encounter.bossType) : "";
        const lateStage = clamp((index - 8) / Math.max(1, SCENE_KEYFRAMES.length - 9), 0, 1);
        const sceneHue = SCENE_KEYFRAMES[index].hue;
        const mirrored = index % 2 === 1;
        const base = this.ctx.createLinearGradient(
          mirrored ? this.width : 0,
          0,
          mirrored ? 0 : this.width,
          this.height
        );
        base.addColorStop(0, colors[0]);
        base.addColorStop(0.52, "rgba(2,5,13,0)");
        base.addColorStop(1, colors[1]);
        const accentX = this.width * (mirrored ? 0.7 : 0.28);
        const accentY = this.height * (index < 2 ? 0.35 : 0.68);
        const accent = this.ctx.createRadialGradient(
          accentX,
          accentY,
          0,
          accentX,
          accentY,
          Math.max(this.width, this.height) * 0.72
        );
        accent.addColorStop(0, colors[1]);
        accent.addColorStop(0.48, "rgba(2,5,13,0.025)");
        accent.addColorStop(1, "rgba(2,5,13,0)");
        let nebula = null;
        if (lateStage > 0 || bossType) {
          const nebulaX = this.width * (mirrored ? 0.82 : 0.18);
          const nebulaY = this.height * (index % 3 === 0 ? 0.28 : 0.72);
          nebula = this.ctx.createRadialGradient(
            nebulaX,
            nebulaY,
            0,
            nebulaX,
            nebulaY,
            Math.max(this.width, this.height) * 0.64
          );
          nebula.addColorStop(0, `hsla(${mod(sceneHue + 18, 360)}, 86%, 62%, 0.13)`);
          nebula.addColorStop(0.34, `hsla(${mod(sceneHue - 22, 360)}, 74%, 43%, 0.065)`);
          nebula.addColorStop(1, `hsla(${sceneHue}, 70%, 28%, 0)`);
        }
        let bossNebula = null;
        if (bossType) {
          const bossX = this.width * (mirrored ? 0.22 : 0.78);
          const bossY = this.height * 0.36;
          bossNebula = this.ctx.createRadialGradient(
            bossX,
            bossY,
            0,
            bossX,
            bossY,
            Math.max(this.width, this.height) * 0.52
          );
          const hueOffset = bossType === "leviathan" ? 58 : -34;
          bossNebula.addColorStop(0, `hsla(${mod(sceneHue + hueOffset, 360)}, 92%, 66%, 0.15)`);
          bossNebula.addColorStop(0.42, `hsla(${mod(sceneHue + hueOffset * 0.5, 360)}, 78%, 44%, 0.055)`);
          bossNebula.addColorStop(1, `hsla(${sceneHue}, 68%, 28%, 0)`);
        }
        return { base, accent, nebula, bossNebula, lateStage, bossType };
      });
    }

    worldToScreen(x, y, camera) {
      return {
        x: x - camera.x + this.width / 2,
        y: y - camera.y + this.height / 2
      };
    }

    onScreen(x, y, radius = 0) {
      return x + radius > -120 && x - radius < this.width + 120 && y + radius > -120 && y - radius < this.height + 120;
    }

    render(state, time) {
      const ctx = this.ctx;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.reduced = Boolean(state.settings && state.settings.reducedEffects);
      const cinematic = cinematicProfile(state, this.reduced);
      this.drawBackground(state, time, cinematic);

      if (!state.ship || state.mode === "menu") {
        return;
      }

      const shake = this.reduced || cinematic.streaks
        ? 0
        : clamp(Number(state.shake) || 0, 0, CONFIG.camera.maxShake);
      ctx.save();
      ctx.translate((Math.random() * 2 - 1) * shake, (Math.random() * 2 - 1) * shake);
      if (!cinematic.streaks) {
        this.drawCombatField(state, time);
        this.drawArena(state, time);
        this.drawEffects(state.effects, state.camera, "back");
        this.drawPlayerFields(state, time);
        for (const pickup of state.pickups) this.drawPickup(pickup, state.camera, time);
        for (const mine of state.mines) this.drawMine(mine, state.camera, time);
        for (const asteroid of state.asteroids) this.drawAsteroid(asteroid, state.camera, time);
        for (const alien of state.aliens) this.drawAlien(alien, state.camera, time);
        if (state.boss) this.drawBoss(state.boss, state.camera, time);
        this.drawProjectiles(state.enemyBullets, state.camera, true);
        this.drawProjectiles(state.playerBullets, state.camera, false);
        this.drawDrones(state);
      }
      this.drawShip(state.ship, state.camera, time, cinematic.streaks, state);
      if (!cinematic.streaks) {
        this.drawOrbitBlades(state);
        this.drawEffects(state.effects, state.camera, "front");
        this.drawFloaters(state.floaters, state.camera);
        this.drawReticle(state);
      }
      ctx.restore();

      this.drawTimeFracture(state);

      if (state.flash > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.2, state.flash * 0.22);
        ctx.fillStyle = state.flashColor || "#ff667a";
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();
      }
    }

    drawTimeFracture(state) {
      const draft = state && state.upgradeDraft;
      if (!draft || draft.phase !== "slowing") return;
      const duration = Math.max(0.001, Number(draft.duration) || 0.72);
      const progress = clamp((Number(draft.elapsed) || 0) / duration, 0, 1);
      const source = this.worldToScreen(
        Number.isFinite(Number(draft.x)) ? Number(draft.x) : state.ship.x,
        Number.isFinite(Number(draft.y)) ? Number(draft.y) : state.ship.y,
        state.camera
      );
      const ctx = this.ctx;
      ctx.save();
      const veil = ctx.createRadialGradient(source.x, source.y, 12, source.x, source.y, Math.max(this.width, this.height) * 0.78);
      veil.addColorStop(0, `rgba(197,132,255,${0.05 + progress * 0.12})`);
      veil.addColorStop(0.48, `rgba(91,37,146,${0.04 + progress * 0.12})`);
      veil.addColorStop(1, `rgba(3,2,12,${progress * 0.34})`);
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.translate(source.x, source.y);
      if (!this.reduced) {
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "rgba(213,168,255,0.7)";
        ctx.lineWidth = 1.5;
        for (let index = 0; index < 3; index += 1) {
          const radius = 28 + (1 - ((progress * 1.8 + index / 3) % 1)) * 116;
          ctx.globalAlpha = 0.18 + progress * 0.28;
          ctx.beginPath();
          ctx.arc(0, 0, radius, -Math.PI * 0.82, Math.PI * 0.82);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.48 + progress * 0.42;
      ctx.fillStyle = "#eedfff";
      ctx.font = `900 ${Math.round(20 + progress * 18)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", 0, 0);
      ctx.restore();
    }

    drawBackground(state, time, cinematic) {
      const ctx = this.ctx;
      ctx.fillStyle = "#02050d";
      ctx.fillRect(0, 0, this.width, this.height);

      const space = this.assets.space;
      if (space && space.complete && space.naturalWidth) {
        const scale = Math.max(this.height / space.naturalHeight, this.width / space.naturalWidth) * 1.04;
        const drawWidth = space.naturalWidth * scale;
        const drawHeight = space.naturalHeight * scale;
        const offsetX = (this.width - drawWidth) * 0.5;
        const offsetY = (this.height - drawHeight) * 0.5;
        ctx.save();
        ctx.globalAlpha = 0.78;
        ctx.drawImage(space, offsetX, offsetY, drawWidth, drawHeight);
        ctx.restore();
      } else {
        const gradient = ctx.createRadialGradient(this.width * 0.25, this.height * 0.25, 0, this.width * 0.5, this.height * 0.5, Math.max(this.width, this.height));
        gradient.addColorStop(0, "#0c1830");
        gradient.addColorStop(0.48, "#050815");
        gradient.addColorStop(1, "#02030a");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
      }

      const stage = stageNumber(state.encounter || state.stage);
      const sector = sectorNumber(state.sector);
      const toStage = state.cinematic && state.cinematic.active ? state.cinematic.toEncounter : undefined;
      const toSector = state.cinematic && state.cinematic.active ? state.cinematic.toSector : undefined;
      const scene = sceneFrame(
        stage,
        sector,
        cinematic.streaks ? smoothstep(cinematic.progress) : 0,
        toStage,
        toSector
      );
      this.drawEncounterWash(state, time, scene);
      const duration = state.cinematic && Number.isFinite(Number(state.cinematic.duration)) ? Math.max(0, Number(state.cinematic.duration)) : 0;
      const elapsed = state.cinematic && Number.isFinite(Number(state.cinematic.elapsed))
        ? Math.max(0, Number(state.cinematic.elapsed))
        : cinematic.progress * duration;
      const flowDistance = cinematic.streaks
        ? elapsed * cinematic.speed * (0.46 + cinematic.intensity * 0.74)
        : 0;
      const directionX = cinematic.direction.x;
      const directionY = cinematic.direction.y;
      const cameraX = !cinematic.streaks && state.camera && Number.isFinite(Number(state.camera.x)) ? Number(state.camera.x) : 0;
      const cameraY = !cinematic.streaks && state.camera && Number.isFinite(Number(state.camera.y)) ? Number(state.camera.y) : 0;
      const streakCount = cinematic.streaks
        ? Math.floor(this.stars.length * cinematic.density * cinematic.intensity)
        : 0;
      ctx.save();
      ctx.lineCap = "round";
      for (let index = 0; index < this.stars.length; index += 1) {
        const star = this.stars[index];
        const parallax = 0.12 + star.depth * 3;
        const x = mod(star.x - cameraX * star.depth + directionX * flowDistance * parallax, this.width);
        const y = mod(star.y - cameraY * star.depth + directionY * flowDistance * parallax, this.height);
        ctx.globalAlpha = star.alpha * (0.82 + Math.sin(time * 0.7 + star.phase) * 0.18);
        const color = star.blue ? "#a7e9ff" : "#ffffff";
        const streak = (4 + cinematic.intensity * (24 + star.depth * 260)) * cinematic.lengthScale;
        if (index < streakCount && streak > 1.25) {
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(0.55, star.size * 0.66);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - directionX * streak, y - directionY * streak);
          ctx.stroke();
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(x, y, star.size, star.size);
        }
      }
      ctx.restore();
      this.drawSpeedDust(flowDistance, cinematic, time);
      this.drawCelestials(scene);

      ctx.fillStyle = this.vignetteGradient;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    drawEncounterWash(state, time, scene) {
      if (!state.ship || state.mode === "menu") return;
      const fromStage = scene ? scene.fromStage : stageNumber(state.encounter || state.stage);
      const toStage = scene ? scene.toStage : fromStage;
      const progress = scene ? scene.progress : 0;
      const ctx = this.ctx;
      const renderWash = (stageIndex, alpha) => {
        const wash = this.encounterWashes[stageIndex - 1];
        if (!wash || alpha <= 0.001) return;
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = (this.reduced ? 0.32 : 0.46 + Math.sin(time * 0.12 + stageIndex) * 0.025) * alpha;
        ctx.fillStyle = wash.base;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.globalAlpha = (this.reduced ? 0.2 : 0.29) * alpha;
        ctx.fillStyle = wash.accent;
        ctx.fillRect(0, 0, this.width, this.height);
        if (wash.nebula) {
          ctx.globalAlpha = (this.reduced ? 0.16 : 0.24) * Math.max(0.42, wash.lateStage) * alpha;
          ctx.fillStyle = wash.nebula;
          ctx.fillRect(0, 0, this.width, this.height);
        }
        if (wash.bossNebula) {
          ctx.globalAlpha = (this.reduced ? 0.19 : 0.3) * alpha;
          ctx.fillStyle = wash.bossNebula;
          ctx.fillRect(0, 0, this.width, this.height);
        }
        ctx.restore();
      };
      renderWash(fromStage, 1 - progress);
      renderWash(toStage, progress);
    }

    drawSpeedDust(flowDistance, cinematic, time) {
      if (!cinematic.streaks || cinematic.intensity <= 0.02) return;
      const ctx = this.ctx;
      const intensity = cinematic.intensity;
      const active = Math.floor(this.speedDust.length * cinematic.density * intensity);
      const baseLength = (6 + intensity * 46) * cinematic.lengthScale;
      const directionX = cinematic.direction.x;
      const directionY = cinematic.direction.y;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "#b9f5ff";
      ctx.lineCap = "round";
      for (let i = 0; i < active; i += 1) {
        const dust = this.speedDust[i];
        const x = mod(dust.x + directionX * flowDistance * dust.depth * 2.2, this.width);
        const y = mod(dust.y + directionY * flowDistance * dust.depth * 2.2, this.height);
        const flicker = 0.76 + Math.sin(time * 2.3 + dust.phase) * 0.24;
        const length = baseLength * (0.58 + dust.depth * 2.2);
        ctx.globalAlpha = dust.alpha * intensity * flicker;
        ctx.lineWidth = dust.size;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - directionX * length, y - directionY * length);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawCelestials(scene) {
      const unit = Math.min(this.width, this.height);
      for (const item of scene.visibleBodies) {
        const screenX = item.x * this.width;
        const screenY = item.y * this.height;
        const width = item.size * unit;
        if (!this.onScreen(screenX, screenY, width)) continue;
        this.drawAssetPlanet(item, screenX, screenY, width);
      }
    }

    drawAssetPlanet(item, screenX, screenY, width) {
      const image = this.assets[item.type];
      const ctx = this.ctx;
      const loaded = Boolean(image && image.complete && image.naturalWidth && image.naturalHeight);
      const height = loaded ? width * (image.naturalHeight / image.naturalWidth) : width;
      const radius = Math.min(width, height) * 0.5;
      ctx.save();
      const hue = mod(item.hue, 360);
      const halo = ctx.createRadialGradient(screenX, screenY, radius * 0.12, screenX, screenY, radius * 1.08);
      halo.addColorStop(0, `hsla(${hue} 84% 64% / 0.16)`);
      halo.addColorStop(0.72, `hsla(${hue} 76% 48% / 0.05)`);
      halo.addColorStop(1, `hsla(${hue} 70% 34% / 0)`);
      ctx.globalAlpha = clamp(item.alpha, 0, 1);
      ctx.fillStyle = halo;
      ctx.fillRect(screenX - radius * 1.1, screenY - radius * 1.1, radius * 2.2, radius * 2.2);
      if (loaded) {
        ctx.drawImage(image, screenX - width * 0.5, screenY - height * 0.5, width, height);
      } else {
        const surface = ctx.createRadialGradient(
          screenX - radius * 0.32,
          screenY - radius * 0.36,
          radius * 0.06,
          screenX,
          screenY,
          radius
        );
        surface.addColorStop(0, `hsl(${mod(hue + 20, 360)} 72% 78%)`);
        surface.addColorStop(0.46, `hsl(${hue} 56% 38%)`);
        surface.addColorStop(1, "#030610");
        ctx.fillStyle = surface;
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    encounterAccent(encounter) {
      const scene = SCENE_KEYFRAMES[stageNumber(encounter) - 1];
      return `hsl(${mod(scene.hue + 18, 360)} 92% 70%)`;
    }

    drawCombatField(state, time) {
      const field = state.combatField;
      const ship = state.ship;
      if (!field || !field.active || !ship || !state.camera) return;
      const halfWidth = Number(field.halfWidth);
      const halfHeight = Number(field.halfHeight);
      if (!(halfWidth > 0) || !(halfHeight > 0)) return;

      const center = this.worldToScreen(field.x, field.y, state.camera);
      const left = center.x - halfWidth;
      const right = center.x + halfWidth;
      const top = center.y - halfHeight;
      const bottom = center.y + halfHeight;
      const worldLeft = field.x - halfWidth;
      const worldRight = field.x + halfWidth;
      const worldTop = field.y - halfHeight;
      const worldBottom = field.y + halfHeight;
      const threshold = clamp(Math.min(halfWidth, halfHeight) * 0.34, 95, 245);
      const nearLeft = clamp(1 - Math.max(0, ship.x - worldLeft) / threshold, 0, 1);
      const nearRight = clamp(1 - Math.max(0, worldRight - ship.x) / threshold, 0, 1);
      const nearTop = clamp(1 - Math.max(0, ship.y - worldTop) / threshold, 0, 1);
      const nearBottom = clamp(1 - Math.max(0, worldBottom - ship.y) / threshold, 0, 1);
      const corner = clamp(Math.min(halfWidth, halfHeight) * 0.11, 30, 66);
      const color = this.encounterAccent(Math.floor(Number(state.encounter) || 1));
      const margin = 28;
      const ctx = this.ctx;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.1;
      if (left > -margin && left < this.width + margin) {
        if (top > -margin && top < this.height + margin) {
          ctx.beginPath(); ctx.moveTo(left, top + corner); ctx.lineTo(left, top); ctx.lineTo(left + corner, top); ctx.stroke();
        }
        if (bottom > -margin && bottom < this.height + margin) {
          ctx.beginPath(); ctx.moveTo(left, bottom - corner); ctx.lineTo(left, bottom); ctx.lineTo(left + corner, bottom); ctx.stroke();
        }
      }
      if (right > -margin && right < this.width + margin) {
        if (top > -margin && top < this.height + margin) {
          ctx.beginPath(); ctx.moveTo(right - corner, top); ctx.lineTo(right, top); ctx.lineTo(right, top + corner); ctx.stroke();
        }
        if (bottom > -margin && bottom < this.height + margin) {
          ctx.beginPath(); ctx.moveTo(right - corner, bottom); ctx.lineTo(right, bottom); ctx.lineTo(right, bottom - corner); ctx.stroke();
        }
      }

      const shipPoint = this.worldToScreen(ship.x, ship.y, state.camera);
      this.drawFieldCue(true, left, nearLeft, shipPoint.y, top, bottom, time, color, margin);
      this.drawFieldCue(true, right, nearRight, shipPoint.y, top, bottom, time, color, margin);
      this.drawFieldCue(false, top, nearTop, shipPoint.x, left, right, time, color, margin);
      this.drawFieldCue(false, bottom, nearBottom, shipPoint.x, left, right, time, color, margin);
      ctx.restore();
    }

    drawFieldCue(vertical, position, intensity, shipAxis, rangeStart, rangeEnd, time, color, margin) {
      const viewportLimit = vertical ? this.width : this.height;
      if (intensity <= 0.015 || position < -margin || position > viewportLimit + margin) return;
      const length = 62 + intensity * 92;
      const middle = clamp(shipAxis, rangeStart + length * 0.5, rangeEnd - length * 0.5);
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = 0.12 + intensity * 0.7;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1 + intensity * 1.8;
      ctx.setLineDash(this.fieldDashPattern);
      ctx.lineDashOffset = -time * (10 + intensity * 24);
      ctx.shadowColor = color;
      ctx.shadowBlur = this.reduced ? 0 : intensity * 16;
      ctx.beginPath();
      if (vertical) {
        ctx.moveTo(position, middle - length * 0.5);
        ctx.lineTo(position, middle + length * 0.5);
      } else {
        ctx.moveTo(middle - length * 0.5, position);
        ctx.lineTo(middle + length * 0.5, position);
      }
      ctx.stroke();
      ctx.restore();
    }

    drawArena(state, time) {
      if (!state.arena || !state.arena.active) return;
      const ctx = this.ctx;
      const point = this.worldToScreen(state.arena.x, state.arena.y, state.camera);
      const fieldShape = state.arena.shape === "field";
      const halfWidth = Math.max(1, Number(state.arena.halfWidth) || Number(state.arena.radius) || 1);
      const halfHeight = Math.max(1, Number(state.arena.halfHeight) || Number(state.arena.radius) || 1);
      ctx.save();
      ctx.strokeStyle = state.arena.warning > 0 ? "rgba(255,209,102,0.72)" : "rgba(255,79,216,0.72)";
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 14]);
      ctx.lineDashOffset = this.reduced ? 0 : -time * 42;
      ctx.shadowColor = "#ff4fd8";
      ctx.shadowBlur = this.reduced ? 0 : 18;
      ctx.beginPath();
      if (fieldShape) {
        ctx.rect(point.x - halfWidth, point.y - halfHeight, halfWidth * 2, halfHeight * 2);
      } else {
        ctx.arc(point.x, point.y, state.arena.radius, 0, TAU);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.12;
      ctx.lineWidth = 14;
      ctx.stroke();
      ctx.restore();
    }

    drawPlayerFields(state, time) {
      const ship = state.ship;
      const modules = ship && ship.modules;
      if (!ship || !modules) return;
      const tractorTier = Math.max(0, Number(modules.tractorField) || 0);
      const reactorTier = Math.max(0, Number(modules.shieldReactor) || 0);
      if (tractorTier <= 0 && reactorTier <= 0) return;
      const point = this.worldToScreen(ship.x, ship.y, state.camera);
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(point.x, point.y);
      if (tractorTier > 0) {
        const definition = CONFIG.weapons.modules.tractorField;
        const values = definition && definition.tiers && definition.tiers[tractorTier - 1];
        const radius = Math.max(0, Number(values && values.range) || 0);
        let pickupInside = false;
        if (radius > 0 && Array.isArray(state.pickups)) {
          const radiusSquared = radius * radius;
          for (const pickup of state.pickups) {
            if (!pickup || pickup.dead) continue;
            const dx = pickup.x - ship.x;
            const dy = pickup.y - ship.y;
            if (dx * dx + dy * dy <= radiusSquared) {
              pickupInside = true;
              break;
            }
          }
        }
        if (radius > 0) {
          ctx.strokeStyle = definition.color || "#9b8cff";
          ctx.lineWidth = pickupInside ? 1.35 : 1;
          ctx.globalAlpha = this.reduced
            ? pickupInside ? 0.1 : 0.055
            : pickupInside ? 0.14 : 0.07;
          for (let index = 0; index < 4; index += 1) {
            const start = index / 4 * TAU + 0.1;
            ctx.beginPath();
            ctx.arc(0, 0, radius, start, start + 0.72);
            ctx.stroke();
          }
        }
      }
      if (reactorTier > 0 && ship.shield > 0) {
        const pulse = this.reduced ? 0 : (time * (0.58 + reactorTier * 0.04)) % 1;
        const radius = 30 + pulse * (10 + reactorTier * 2);
        ctx.setLineDash([]);
        ctx.globalAlpha = this.reduced ? 0.2 : (1 - pulse) * (0.16 + reactorTier * 0.018);
        ctx.strokeStyle = "#66f7ff";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawOrbitBlades(state) {
      const blades = state.ship && state.ship.orbitBlades;
      if (!Array.isArray(blades) || blades.length === 0) return;
      const ctx = this.ctx;
      for (const blade of blades) {
        const point = this.worldToScreen(blade.x, blade.y, state.camera);
        if (!this.onScreen(point.x, point.y, 18)) continue;
        const radius = clamp(Number(blade.radius) || 9, 6, 15);
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(Number(blade.angle) || 0);
        ctx.strokeStyle = "#b8fdff";
        ctx.fillStyle = "rgba(36, 168, 184, 0.9)";
        ctx.lineWidth = 1.25;
        ctx.shadowColor = "#66f7ff";
        ctx.shadowBlur = this.reduced ? 0 : 8;
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(-radius * 0.28, -radius * 0.5);
        ctx.lineTo(-radius, 0);
        ctx.lineTo(-radius * 0.28, radius * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(radius * 0.28, -0.75, radius * 0.38, 1.5);
        ctx.restore();
      }
    }

    drawShip(ship, camera, time, cinematic, state) {
      const point = cinematic
        ? screenAnchor(state, { width: this.width, height: this.height }) || this.worldToScreen(ship.x, ship.y, camera)
        : this.worldToScreen(ship.x, ship.y, camera);
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(ship.angle);
      if (!cinematic && ship.invulnerable > 0 && Math.floor(time * 18) % 2 === 0) ctx.globalAlpha = 0.34;
      this.shipPath(1, cinematic ? Math.max(0.9, ship.engine || 0) : ship.engine || 0, time, false);
      ctx.restore();
      if (ship.shield > 0 || ship.aegisTimer > 0) {
        const aegisActive = ship.aegisTimer > 0;
        const shieldCap = Math.max(1, Number(CONFIG.powerups.shield.cap) || 1);
        const shieldRatio = clamp(Number(ship.shield) / shieldCap, 0, 1);
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(time * 0.55);
        ctx.strokeStyle = aegisActive
          ? "rgba(178, 224, 255, 0.82)"
          : `rgba(85,245,255,${0.25 + shieldRatio * 0.55})`;
        ctx.lineWidth = aegisActive ? 2.5 : 2;
        ctx.setLineDash(aegisActive ? [10, 4] : [6, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, aegisActive ? 31 : 28, 0, aegisActive ? TAU : TAU * clamp(shieldRatio, 0.18, 1));
        ctx.stroke();
        ctx.restore();
      }
    }

    shipPath(scale, engine, time, decorative) {
      const ctx = this.ctx;
      ctx.save();
      ctx.scale(scale, scale);
      const flame = 14 + engine * 12 + Math.sin(time * 42) * 2;
      if (!decorative || engine > 0) {
        const flameGradient = ctx.createLinearGradient(-flame - 12, 0, -8, 0);
        flameGradient.addColorStop(0, "rgba(255,79,216,0)");
        flameGradient.addColorStop(0.5, "#ff4fd8");
        flameGradient.addColorStop(1, "#b8ffff");
        ctx.fillStyle = flameGradient;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(-13, side * 6);
          ctx.lineTo(-flame - 8, side * 6);
          ctx.lineTo(-10, side * 2.8);
          ctx.closePath();
          ctx.fill();
        }
      }

      ctx.shadowColor = "#55f5ff";
      ctx.shadowBlur = this.reduced ? 0 : 12;
      ctx.fillStyle = "rgba(7,17,31,0.98)";
      ctx.strokeStyle = "#9afaff";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(24, 0);
      ctx.lineTo(8, -5);
      ctx.lineTo(-4, -16);
      ctx.lineTo(-15, -14);
      ctx.lineTo(-11, -6);
      ctx.lineTo(-16, -3);
      ctx.lineTo(-16, 3);
      ctx.lineTo(-11, 6);
      ctx.lineTo(-15, 14);
      ctx.lineTo(-4, 16);
      ctx.lineTo(8, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,79,216,0.82)";
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(2, -4.5);
      ctx.lineTo(-5, 0);
      ctx.lineTo(2, 4.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(179,250,255,0.5)";
      ctx.beginPath();
      ctx.moveTo(5, -6);
      ctx.lineTo(-7, -12);
      ctx.moveTo(5, 6);
      ctx.lineTo(-7, 12);
      ctx.stroke();
      ctx.fillStyle = "#d8ffff";
      ctx.fillRect(-14, -8, 3, 4);
      ctx.fillRect(-14, 4, 3, 4);
      ctx.restore();
    }

    drawAsteroid(asteroid, camera, time) {
      const point = this.worldToScreen(asteroid.x, asteroid.y, camera);
      if (!this.onScreen(point.x, point.y, asteroid.radius)) {
        if (asteroid.telegraph && asteroid.telegraph.active !== false) {
          this.drawTelegraph(asteroid.telegraph, camera, time, asteroid);
        }
        return;
      }
      const ctx = this.ctx;
      const color = {
        crystal: "#ff66dd",
        volatile: "#ffb84d",
        armored: "#a7b8c8",
        titan: "#ffd166",
        razor: "#7dffcf",
        prismatic: "#b88cff",
        monolith: "#6ea8ff",
        auricColossus: "#ffd86b",
        auricShard: asteroid.hazardVariant === "magnetic" ? "#72e6ff" : "#ffae57",
        corona: "#ff754f"
      }[asteroid.kind] || "#72dff3";
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(asteroid.rotation || 0);
      ctx.beginPath();
      const points = asteroid.points || [];
      const count = points.length || 10;
      for (let i = 0; i < count; i += 1) {
        const angle = points.length ? points[i].angle : i / count * TAU;
        const radius = points.length ? points[i].radius : asteroid.radius * (0.8 + ((i * 17) % 5) * 0.045);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = asteroid.kind === "crystal" || asteroid.kind === "prismatic"
        ? "rgba(38,15,48,0.95)"
        : asteroid.kind === "razor"
          ? "rgba(8, 31, 31, 0.97)"
          : asteroid.kind === "monolith"
            ? "rgba(8, 15, 34, 0.98)"
            : asteroid.kind === "auricColossus"
              ? "rgba(35, 25, 8, 0.98)"
              : asteroid.kind === "auricShard"
                ? asteroid.hazardVariant === "magnetic" ? "rgba(7, 25, 36, 0.97)" : "rgba(40, 20, 8, 0.97)"
                : asteroid.kind === "corona"
                  ? "rgba(43, 13, 8, 0.97)"
            : "rgba(13,21,32,0.97)";
      ctx.strokeStyle = color;
      ctx.lineWidth = asteroid.kind === "titan" || asteroid.kind === "auricColossus" ? 3 : 1.6;
      ctx.shadowColor = color;
      ctx.shadowBlur = this.reduced || asteroid.radius < 25 ? 0 : Math.min(18, asteroid.radius * 0.13);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (asteroid.hitFlash > 0) {
        ctx.globalAlpha = clamp(asteroid.hitFlash, 0, 1) * 0.34;
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }

      const crackStage = asteroidCrackStage(asteroid);
      if (crackStage > 0) {
        ctx.globalAlpha = 0.3 + crackStage * 0.15;
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, asteroid.radius * (0.014 + crackStage * 0.006));
        const crack = asteroid.radius * 0.62;
        ctx.beginPath();
        ctx.moveTo(-crack, -crack * 0.14);
        ctx.lineTo(-crack * 0.15, crack * 0.08);
        ctx.lineTo(crack * 0.18, -crack * 0.36);
        ctx.lineTo(crack * 0.72, crack * 0.18);
        if (crackStage >= 2) {
          ctx.moveTo(-crack * 0.15, crack * 0.08);
          ctx.lineTo(-crack * 0.42, crack * 0.5);
          ctx.lineTo(-crack * 0.12, crack * 0.76);
        }
        if (crackStage >= 3) {
          ctx.moveTo(crack * 0.18, -crack * 0.36);
          ctx.lineTo(crack * 0.02, -crack * 0.74);
          ctx.moveTo(crack * 0.34, -crack * 0.18);
          ctx.lineTo(crack * 0.68, -crack * 0.58);
        }
        ctx.stroke();
      }
      if (asteroid.kind === "volatile") {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = `rgba(255,145,55,${0.4 + Math.sin(time * 7 + asteroid.phase) * 0.22})`;
        ctx.beginPath();
        ctx.arc(0, 0, asteroid.radius * 0.27, 0, TAU);
        ctx.fill();
      }
      if (asteroid.kind === "prismatic") {
        ctx.globalAlpha = 0.58;
        ctx.strokeStyle = "#e1c9ff";
        ctx.lineWidth = 1;
        for (let index = 0; index < count; index += 2) {
          const angle = points.length ? points[index].angle : index / count * TAU;
          const radius = points.length ? points[index].radius : asteroid.radius * 0.82;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
          ctx.stroke();
        }
      }
      if (asteroid.kind === "razor") {
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = "#c2fff0";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-asteroid.radius * 0.62, asteroid.radius * 0.2);
        ctx.lineTo(asteroid.radius * 0.7, -asteroid.radius * 0.25);
        ctx.moveTo(-asteroid.radius * 0.4, -asteroid.radius * 0.38);
        ctx.lineTo(asteroid.radius * 0.48, asteroid.radius * 0.36);
        ctx.stroke();
      }
      if (asteroid.kind === "armored" || asteroid.kind === "titan" || asteroid.kind === "monolith") {
        ctx.globalAlpha = 0.68;
        ctx.strokeStyle = asteroid.kind === "monolith" ? "#9bc4ff" : "#c7d5df";
        ctx.lineWidth = Math.max(2, asteroid.radius * 0.035);
        for (let i = 0; i < 3; i += 1) {
          ctx.beginPath();
          ctx.arc(0, 0, asteroid.radius * (0.78 - i * 0.08), i * 1.9, i * 1.9 + 0.95);
          ctx.stroke();
        }
      }
      if (asteroid.kind === "auricColossus") {
        ctx.globalAlpha = 0.72;
        ctx.strokeStyle = "#fff0a8";
        ctx.lineWidth = Math.max(1.5, asteroid.radius * 0.022);
        for (let index = 0; index < 6; index += 1) {
          const angle = index / 6 * TAU + 0.18;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * asteroid.radius * 0.26, Math.sin(angle) * asteroid.radius * 0.26);
          ctx.lineTo(Math.cos(angle) * asteroid.radius * 0.76, Math.sin(angle) * asteroid.radius * 0.76);
          ctx.stroke();
        }
        ctx.globalAlpha = 0.42;
        ctx.beginPath();
        ctx.arc(0, 0, asteroid.radius * 0.48, 0, TAU);
        ctx.stroke();
      }
      if (asteroid.kind === "auricShard") {
        const magnetic = asteroid.hazardVariant === "magnetic";
        ctx.globalAlpha = 0.78;
        ctx.strokeStyle = magnetic ? "#d4fbff" : "#ffe0a8";
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(-asteroid.radius * 0.62, asteroid.radius * 0.38);
        ctx.lineTo(asteroid.radius * 0.54, -asteroid.radius * 0.5);
        ctx.moveTo(-asteroid.radius * 0.35, -asteroid.radius * 0.48);
        ctx.lineTo(asteroid.radius * 0.38, asteroid.radius * 0.46);
        ctx.stroke();
        if (magnetic) {
          ctx.globalAlpha = this.reduced ? 0.24 : 0.28 + Math.sin(time * 3.2 + (asteroid.phase || 0)) * 0.06;
          ctx.setLineDash([3, 7]);
          ctx.beginPath();
          ctx.arc(0, 0, asteroid.radius * 1.16, 0, TAU);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.globalAlpha = this.reduced ? 0.34 : 0.42 + Math.sin(time * 6 + (asteroid.phase || 0)) * 0.12;
          ctx.fillStyle = "#ff9d4d";
          ctx.beginPath();
          ctx.arc(0, 0, asteroid.radius * 0.2, 0, TAU);
          ctx.fill();
        }
      }
      if (asteroid.kind === "corona") {
        const pulse = this.reduced ? 0.5 : 0.5 + Math.sin(time * 4.2 + (asteroid.phase || 0)) * 0.18;
        ctx.globalAlpha = 0.38 + pulse * 0.36;
        ctx.fillStyle = "#ffca67";
        ctx.beginPath();
        ctx.arc(0, 0, asteroid.radius * 0.23, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "#ff8a55";
        ctx.lineWidth = Math.max(1.2, asteroid.radius * 0.025);
        ctx.globalAlpha = 0.28 + pulse * 0.22;
        for (let index = 0; index < 5; index += 1) {
          const angle = index / 5 * TAU + (asteroid.phase || 0);
          ctx.beginPath();
          ctx.arc(0, 0, asteroid.radius * (0.68 + index * 0.045), angle, angle + 0.72);
          ctx.stroke();
        }
      }
      ctx.restore();
      if (asteroid.telegraph && asteroid.telegraph.active !== false) {
        this.drawTelegraph(asteroid.telegraph, camera, time, asteroid);
      }
    }

    drawAlien(alien, camera, time) {
      const point = this.worldToScreen(alien.x, alien.y, camera);
      if (!this.onScreen(point.x, point.y, alien.radius + 20)) {
        if (alien.telegraph && alien.telegraph.active !== false) {
          this.drawTelegraph(alien.telegraph, camera, time, alien);
        }
        return;
      }
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(point.x, point.y);
      const heading = Number.isFinite(alien.heading) ? alien.heading : Number.isFinite(alien.angle) ? alien.angle : 0;
      ctx.rotate(heading);
      const color = {
        bomber: "#ffd166",
        carrier: "#ff5aa5",
        broodCarrier: "#ff9f62",
        striker: "#b68cff",
        lancer: "#5fe5ff",
        gunship: "#ff7b72"
      }[alien.type] || "#62f7c8";
      ctx.strokeStyle = color;
      ctx.fillStyle = "rgba(9,15,29,0.96)";
      ctx.lineWidth = 1.7;
      ctx.shadowColor = color;
      ctx.shadowBlur = this.reduced ? 0 : 10;
      const enginePulse = 4 + Math.sin(time * 16 + (alien.phase || 0)) * 1.6;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.58;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-12, side * 5);
        ctx.lineTo(-18 - enginePulse, side * 5);
        ctx.stroke();
      }
      ctx.restore();
      if (alien.type === "scout") {
        ctx.beginPath();
        ctx.moveTo(20, 0); ctx.lineTo(1, -11); ctx.lineTo(-14, -8); ctx.lineTo(-6, 0); ctx.lineTo(-14, 8); ctx.lineTo(1, 11); ctx.closePath();
      } else if (alien.type === "striker") {
        ctx.beginPath();
        ctx.moveTo(24, 0); ctx.lineTo(2, -7); ctx.lineTo(-13, -17); ctx.lineTo(-8, -3); ctx.lineTo(-17, 0); ctx.lineTo(-8, 3); ctx.lineTo(-13, 17); ctx.lineTo(2, 7); ctx.closePath();
      } else if (alien.type === "bomber") {
        ctx.beginPath();
        ctx.moveTo(17, 0); ctx.quadraticCurveTo(4, -18, -15, -13); ctx.lineTo(-20, -5); ctx.lineTo(-14, 0); ctx.lineTo(-20, 5); ctx.lineTo(-15, 13); ctx.quadraticCurveTo(4, 18, 17, 0); ctx.closePath();
      } else if (alien.type === "lancer") {
        ctx.beginPath();
        ctx.moveTo(29, 0); ctx.lineTo(4, -6); ctx.lineTo(-9, -15); ctx.lineTo(-6, -4); ctx.lineTo(-22, -7); ctx.lineTo(-14, 0); ctx.lineTo(-22, 7); ctx.lineTo(-6, 4); ctx.lineTo(-9, 15); ctx.lineTo(4, 6); ctx.closePath();
      } else if (alien.type === "gunship") {
        ctx.beginPath();
        ctx.moveTo(23, 0); ctx.lineTo(9, -13); ctx.lineTo(-15, -17); ctx.lineTo(-25, -7); ctx.lineTo(-17, 0); ctx.lineTo(-25, 7); ctx.lineTo(-15, 17); ctx.lineTo(9, 13); ctx.closePath();
      } else if (alien.type === "broodCarrier") {
        ctx.beginPath();
        ctx.moveTo(29, 0); ctx.quadraticCurveTo(9, -25, -28, -18); ctx.lineTo(-19, -8); ctx.lineTo(-31, -4); ctx.lineTo(-22, 0); ctx.lineTo(-31, 4); ctx.lineTo(-19, 8); ctx.lineTo(-28, 18); ctx.quadraticCurveTo(9, 25, 29, 0); ctx.closePath();
      } else {
        ctx.beginPath();
        ctx.moveTo(27, 0); ctx.quadraticCurveTo(5, -21, -25, -14); ctx.lineTo(-14, 0); ctx.lineTo(-25, 14); ctx.quadraticCurveTo(5, 21, 27, 0); ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      const heavy = alien.type === "carrier" || alien.type === "broodCarrier" || alien.type === "gunship";
      ctx.ellipse(3, 0, heavy ? 12 : 7, heavy ? 7 : 4, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.52;
      ctx.strokeStyle = "#d9ffff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(8, -4); ctx.lineTo(-8, -9);
      ctx.moveTo(8, 4); ctx.lineTo(-8, 9);
      ctx.stroke();
      if (alien.type === "broodCarrier") {
        ctx.globalAlpha = 0.78;
        ctx.fillStyle = "#ffd1a4";
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(-13, side * 11, 3.5, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 0.42;
          ctx.strokeStyle = color;
          ctx.beginPath();
          ctx.arc(-13, side * 11, 7, 0, TAU);
          ctx.stroke();
          ctx.globalAlpha = 0.78;
        }
      }
      if (Number.isFinite(alien.aimAngle)) {
        ctx.save();
        ctx.rotate(alien.aimAngle - heading);
        ctx.globalAlpha = 0.82;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(Math.max(15, Math.min(24, (alien.radius || 18) * 0.9)), 0);
        ctx.stroke();
        ctx.restore();
      }
      if (alien.state === "telegraph") {
        ctx.globalAlpha = 0.62 + Math.sin(time * 18) * 0.28;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, alien.radius + 7, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
      if (alien.telegraph && alien.telegraph.active !== false) {
        this.drawTelegraph(alien.telegraph, camera, time, alien);
      } else if (alien.type === "gunship" && alien.state === "telegraph" && Number.isFinite(alien.aimAngle)) {
        this.drawTelegraph(alien, camera, time, alien);
      }
    }

    drawBoss(boss, camera, time) {
      const point = this.worldToScreen(boss.x, boss.y, camera);
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(boss.angle || 0);
      if (boss.type === "leviathan") {
        const radius = boss.radius;
        const pulse = 0.88 + Math.sin(time * 2.4) * 0.08;
        ctx.fillStyle = "rgba(8, 9, 27, 0.99)";
        ctx.strokeStyle = "#9a7dff";
        ctx.lineWidth = 3.4;
        ctx.shadowColor = "#7257ff";
        ctx.shadowBlur = this.reduced ? 0 : 24;
        ctx.beginPath();
        ctx.moveTo(radius * 0.94, 0);
        ctx.quadraticCurveTo(radius * 0.48, -radius * 0.5, radius * 0.02, -radius * 0.34);
        ctx.quadraticCurveTo(-radius * 0.5, -radius * 0.72, -radius * 0.92, -radius * 0.18);
        ctx.lineTo(-radius * 0.6, 0);
        ctx.lineTo(-radius * 0.92, radius * 0.18);
        ctx.quadraticCurveTo(-radius * 0.5, radius * 0.72, radius * 0.02, radius * 0.34);
        ctx.quadraticCurveTo(radius * 0.48, radius * 0.5, radius * 0.94, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(120, 236, 255, 0.72)";
        ctx.lineWidth = 1.5;
        for (let index = 0; index < 4; index += 1) {
          const x = radius * (0.34 - index * 0.25);
          const rib = radius * (0.22 + index * 0.035) * pulse;
          ctx.beginPath();
          ctx.moveTo(x, -rib);
          ctx.quadraticCurveTo(x - radius * 0.13, 0, x, rib);
          ctx.stroke();
        }
        ctx.fillStyle = "#d9ffff";
        ctx.globalAlpha = 0.92;
        ctx.beginPath();
        ctx.ellipse(radius * 0.48, -radius * 0.13, radius * 0.075, radius * 0.045, -0.16, 0, TAU);
        ctx.ellipse(radius * 0.48, radius * 0.13, radius * 0.075, radius * 0.045, 0.16, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#ff57d8";
        ctx.beginPath();
        ctx.arc(radius * 0.51, -radius * 0.13, radius * 0.022, 0, TAU);
        ctx.arc(radius * 0.51, radius * 0.13, radius * 0.022, 0, TAU);
        ctx.fill();
      } else {
        ctx.fillStyle = "rgba(10,14,30,0.98)";
        ctx.strokeStyle = "#ff5ecf";
        ctx.lineWidth = 3;
        ctx.shadowColor = "#ff4fd8";
        ctx.shadowBlur = this.reduced ? 0 : 20;
        ctx.beginPath();
        ctx.moveTo(boss.radius * 0.85, 0);
        ctx.quadraticCurveTo(boss.radius * 0.2, -boss.radius * 0.54, -boss.radius * 0.8, -boss.radius * 0.38);
        ctx.lineTo(-boss.radius * 0.45, 0);
        ctx.lineTo(-boss.radius * 0.8, boss.radius * 0.38);
        ctx.quadraticCurveTo(boss.radius * 0.2, boss.radius * 0.54, boss.radius * 0.85, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#62f7ff";
        ctx.globalAlpha = 0.66;
        ctx.beginPath();
        ctx.ellipse(boss.radius * 0.08, 0, boss.radius * 0.3, boss.radius * 0.14, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      this.drawBossReflectionShield(boss, camera, time);

      if (boss.nodes) {
        const leviathan = boss.type === "leviathan";
        for (const node of boss.nodes) {
          if (node.health <= 0) continue;
          const nodePoint = this.worldToScreen(node.x, node.y, camera);
          ctx.save();
          ctx.translate(nodePoint.x, nodePoint.y);
          ctx.rotate(time * 1.4 + node.index);
          ctx.strokeStyle = leviathan ? "#b79dff" : "#6fffff";
          ctx.fillStyle = leviathan ? "rgba(28, 18, 54, 0.92)" : "rgba(12,35,48,0.9)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 6; i += 1) {
            const angle = i / 6 * TAU;
            const x = Math.cos(angle) * 13;
            const y = Math.sin(angle) * 13;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.restore();
        }
      }

      if (boss.telegraph && boss.telegraph.active !== false) this.drawTelegraph(boss.telegraph, camera, time, boss);
    }

    drawBossReflectionShield(boss, camera, time) {
      if (!boss) return;
      const source = boss.reflectionShield;
      const profile = source && typeof source === "object" ? source : null;
      const timer = Number(boss.reflectionShieldTimer || boss.reflectTimer || 0);
      const warning = Boolean(profile && (profile.warning || profile.phase === "warning"));
      const active = profile
        ? Boolean(profile.active || warning) && Number(profile.remaining == null ? 1 : profile.remaining) > 0
        : Boolean(source || boss.reflectionShieldActive || timer > 0);
      if (!active) return;
      const strengthSource = profile && profile.strength != null
        ? profile.strength
        : boss.reflectionShieldStrength != null ? boss.reflectionShieldStrength : warning ? 0.58 : 1;
      const strength = clamp(Number(strengthSource) || 0, 0.12, 1);
      const bossRadius = Math.max(1, Number(boss.radius) || 1);
      const radiusSource = profile && profile.radius != null ? profile.radius : boss.reflectionShieldRadius;
      const radius = clamp(Number(radiusSource) || bossRadius + 24, bossRadius + 6, bossRadius + 96);
      const rotationSource = profile && Number.isFinite(Number(profile.angle)) ? Number(profile.angle) : 0;
      const rotation = rotationSource + (this.reduced ? 0 : time * 0.24);
      const point = this.worldToScreen(boss.x, boss.y, camera);
      const color = profile && profile.color || (warning ? "#d7b2ff" : "#9defff");
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(rotation);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5 + strength * 1.4;
      ctx.globalAlpha = (this.reduced ? 0.32 : 0.38 + Math.sin(time * 3.2) * 0.06) * strength;
      ctx.shadowColor = color;
      ctx.shadowBlur = this.reduced ? 0 : 10 * strength;
      ctx.setLineDash(warning ? [7, 6] : []);
      for (let index = 0; index < 5; index += 1) {
        const start = index / 5 * TAU + 0.08;
        ctx.beginPath();
        ctx.arc(0, 0, radius, start, start + 0.72);
        ctx.stroke();
        const tip = start + 0.72;
        const x = Math.cos(tip) * radius;
        const y = Math.sin(tip) * radius;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(tip + Math.PI * 0.5);
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(4, 2);
        ctx.lineTo(-4, 2);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    drawTelegraph(telegraph, camera, time, entity) {
      if (!telegraph || telegraph.active === false) return;
      const ctx = this.ctx;
      const sourceX = Number.isFinite(Number(telegraph.x))
        ? Number(telegraph.x)
        : Number.isFinite(Number(entity && entity.x)) ? Number(entity.x) : 0;
      const sourceY = Number.isFinite(Number(telegraph.y))
        ? Number(telegraph.y)
        : Number.isFinite(Number(entity && entity.y)) ? Number(entity.y) : 0;
      let angle = Number.isFinite(Number(telegraph.angle))
        ? Number(telegraph.angle)
        : Number.isFinite(Number(telegraph.aimAngle))
          ? Number(telegraph.aimAngle)
          : Number.isFinite(Number(entity && entity.aimAngle))
            ? Number(entity.aimAngle)
            : Number.isFinite(Number(entity && entity.heading))
              ? Number(entity.heading)
              : Number(entity && entity.angle) || 0;
      if (!Number.isFinite(Number(telegraph.angle)) && Number.isFinite(Number(telegraph.targetX)) && Number.isFinite(Number(telegraph.targetY))) {
        angle = Math.atan2(Number(telegraph.targetY) - sourceY, Number(telegraph.targetX) - sourceX);
      }
      const kind = String(telegraph.kind || telegraph.telegraphKind ||
        (entity && entity.type === "gunship" ? "laser" : entity && entity.kind === "corona" ? "radial" : "line"));
      const isLaser = kind === "laser" || kind === "laserWarning" || kind === "laserActive";
      const isWarning = kind === "laserWarning" || kind === "radiationWarning" || /warning/i.test(kind);
      const isActive = kind === "laserActive" || kind === "radiationActive" || /active/i.test(kind);
      const progress = clamp(Number(telegraph.progress == null ? 1 : telegraph.progress) || 0, 0, 1);
      const length = clamp(Number(telegraph.length || telegraph.telegraphLength) || 1200, 24, 2400);
      const width = clamp(Number(telegraph.width || telegraph.telegraphWidth) || (isLaser ? 6 : 5), 1, 48);
      const start = this.worldToScreen(sourceX, sourceY, camera);
      const pulse = this.reduced ? 0.48 : 0.42 + Math.sin(time * 16) * 0.15;
      ctx.save();
      ctx.globalAlpha = pulse * (0.62 + progress * 0.38);
      ctx.strokeStyle = telegraph.color || "#ff667a";
      ctx.lineWidth = width;
      if (kind === "radial" || kind === "corona") {
        const fallbackRadius = Math.max(20, Number(entity && entity.radius) * (1.3 + progress * 0.55) || 36);
        const radius = clamp(Number(telegraph.radius) || fallbackRadius, 8, 720);
        ctx.setLineDash([8, 9]);
        ctx.lineDashOffset = this.reduced ? 0 : -time * 18;
        ctx.beginPath();
        ctx.arc(start.x, start.y, radius, 0, TAU);
        ctx.stroke();
      } else {
        const endX = start.x + Math.cos(angle) * length;
        const endY = start.y + Math.sin(angle) * length;
        ctx.setLineDash(isActive ? [] : isLaser ? [12, 8] : [18, 12]);
        ctx.lineDashOffset = this.reduced ? 0 : -time * (isLaser ? 30 : 18);
        if (isLaser) {
          ctx.globalAlpha *= 0.35;
          ctx.lineWidth = width * 2.4;
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          ctx.globalAlpha = (isActive ? 0.82 : pulse) * (isWarning ? 0.72 : 1) * (0.72 + progress * 0.28);
          ctx.lineWidth = Math.max(1, width * (isActive ? 0.62 : 0.42));
        }
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawProjectiles(projectiles, camera, hostile) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const bullet of projectiles) {
        const point = this.worldToScreen(bullet.x, bullet.y, camera);
        if (!this.onScreen(point.x, point.y, 20)) continue;
        const color = bullet.color || (hostile ? "#ff5da9" : "#91ffff");
        const angle = Math.atan2(bullet.vy || 0, bullet.vx || 1);
        const isLance = bullet.kind === "lance";
        const isArc = bullet.kind === "arc";
        const isRocket = !hostile && bullet.kind === "missile" && bullet.sourceModule === "homingSalvo";
        const isRadial = !hostile && bullet.kind === "radial";
        const isReflected = hostile && bullet.kind === "reflected";
        const length = isLance ? 38 : bullet.kind === "rail" ? 30 : isRocket ? 17 : bullet.kind === "missile" ? 13 : isArc ? 15 : isRadial ? 12 : isReflected ? 16 : 10;
        ctx.strokeStyle = color;
        ctx.lineWidth = isLance ? 5 : bullet.kind === "rail" ? 4 : isArc ? 3 : isRadial ? 1.6 : isRocket ? 2 : isReflected ? 3.2 : 2.5;
        ctx.globalAlpha = isRadial ? 0.66 : isRocket ? 0.75 : isReflected ? 0.9 : 0.82;
        ctx.beginPath();
        ctx.moveTo(point.x - Math.cos(angle) * length, point.y - Math.sin(angle) * length);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        if (isArc) {
          ctx.globalAlpha = 0.48;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 7, angle - 1.2, angle + 1.2);
          ctx.stroke();
        } else if (isLance) {
          ctx.globalAlpha = 0.34;
          ctx.lineWidth = 9;
          ctx.beginPath();
          ctx.moveTo(point.x - Math.cos(angle) * length * 0.72, point.y - Math.sin(angle) * length * 0.72);
          ctx.lineTo(point.x, point.y);
          ctx.stroke();
        } else if (isRocket) {
          ctx.save();
          ctx.translate(point.x, point.y);
          ctx.rotate(angle);
          ctx.globalAlpha = 0.94;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(7, 0);
          ctx.lineTo(-4, -4.5);
          ctx.lineTo(-1.5, 0);
          ctx.lineTo(-4, 4.5);
          ctx.closePath();
          ctx.fill();
          if (!this.reduced) {
            ctx.globalAlpha = 0.42;
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-4, -2.6);
            ctx.lineTo(-10, -5.8);
            ctx.moveTo(-4, 2.6);
            ctx.lineTo(-10, 5.8);
            ctx.stroke();
          }
          ctx.restore();
        } else if (isRadial) {
          ctx.save();
          ctx.translate(point.x, point.y);
          ctx.rotate(angle);
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(5.5, 0);
          ctx.lineTo(0, -3.5);
          ctx.lineTo(-5.5, 0);
          ctx.lineTo(0, 3.5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else if (isReflected) {
          ctx.save();
          ctx.translate(point.x, point.y);
          ctx.rotate(angle);
          ctx.globalAlpha = 0.94;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(6, 0);
          ctx.lineTo(0, -4);
          ctx.lineTo(-6, 0);
          ctx.lineTo(0, 4);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        if (!isRocket && !isRadial && !isReflected) {
          ctx.fillStyle = "#ffffff";
          ctx.globalAlpha = 0.95;
          ctx.beginPath();
          ctx.arc(point.x, point.y, bullet.radius || 2.5, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    drawMine(mine, camera, time) {
      const point = this.worldToScreen(mine.x, mine.y, camera);
      if (!this.onScreen(point.x, point.y, mine.radius + 12)) return;
      const playerOwned = mine.owner === "player" || mine.sourceModule === "mineLayer";
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(point.x, point.y);
      if (playerOwned && !this.reduced && mine.triggerRadius > mine.radius) {
        ctx.globalAlpha = 0.11 + Math.sin(time * 3 + (mine.phase || 0)) * 0.025;
        ctx.strokeStyle = "#66f7ff";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 9]);
        ctx.beginPath();
        ctx.arc(0, 0, mine.triggerRadius, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.globalAlpha = 1;
      ctx.rotate((playerOwned ? -1 : 1) * time * 0.8 + (mine.phase || 0));
      ctx.strokeStyle = playerOwned ? "#8ffcff" : mine.armed ? "#ff5d7a" : "#ffd166";
      ctx.fillStyle = playerOwned ? "rgba(7, 31, 40, 0.94)" : "rgba(35,15,24,0.92)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const angle = i / 8 * TAU;
        const radius = i % 2 ? mine.radius * 0.58 : mine.radius;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      if (playerOwned) {
        ctx.rotate(-Math.PI * 0.25);
        ctx.fillStyle = "#d8ffff";
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(-2, -2.8);
        ctx.lineTo(-2, 2.8);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    drawPickup(pickup, camera, time) {
      const point = this.worldToScreen(pickup.x, pickup.y, camera);
      if (!this.onScreen(point.x, point.y, 24)) return;
      const colors = {
        shield: "#55f5ff",
        aegis: "#7bdcff",
        rapid: "#ffd166",
        amplifier: "#ffb45f",
        repair: "#7dff9b",
        module: "#ff4fd8",
        moduleUpgrade: "#ff4fd8",
        triShot: "#ff9a62",
        piercing: "#ff6b7d",
        pulseCharge: "#bca4ff",
        arcBurst: "#65ffbd",
        novaLance: "#ff75ef",
        enigma: "#c584ff"
      };
      const labels = {
        shield: "S",
        aegis: "G",
        rapid: "R",
        amplifier: "A",
        repair: "+",
        module: "M",
        moduleUpgrade: "M",
        triShot: "3",
        piercing: "P",
        pulseCharge: "E",
        arcBurst: "A",
        novaLance: "N",
        enigma: "?"
      };
      const color = colors[pickup.kind] || "#ffffff";
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(time * 1.25 + pickup.phase);
      ctx.strokeStyle = color;
      ctx.fillStyle = "rgba(6,12,25,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const angle = i / 6 * TAU;
        const x = Math.cos(angle) * 13;
        const y = Math.sin(angle) * 13;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.rotate(-time * 1.25 - pickup.phase);
      if (pickup.kind === "amplifier") {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(2, -8);
        ctx.lineTo(-4, 0);
        ctx.lineTo(0, 0);
        ctx.lineTo(-2, 8);
        ctx.lineTo(6, -2);
        ctx.lineTo(2, -2);
        ctx.closePath();
        ctx.fill();
      } else if (pickup.kind === "aegis") {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.8;
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(0, -7.5);
        ctx.lineTo(6, -4.5);
        ctx.lineTo(5, 2.5);
        ctx.quadraticCurveTo(3.8, 6, 0, 8);
        ctx.quadraticCurveTo(-3.8, 6, -5, 2.5);
        ctx.lineTo(-6, -4.5);
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.fillStyle = color;
        ctx.font = "900 11px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(labels[pickup.kind] || "?", 0, 0.5);
      }
      ctx.restore();
    }

    drawDrones(state) {
      if (!state.ship || !state.ship.drones) return;
      const ctx = this.ctx;
      for (const drone of state.ship.drones) {
        const point = this.worldToScreen(drone.x, drone.y, state.camera);
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(drone.angle || 0);
        ctx.strokeStyle = "#7dffcf";
        ctx.fillStyle = "rgba(6,24,27,0.9)";
        ctx.beginPath();
        ctx.moveTo(10, 0); ctx.lineTo(-7, -6); ctx.lineTo(-4, 0); ctx.lineTo(-7, 6); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }

    drawEffects(effects, camera, layer) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const effect of effects) {
        if ((effect.layer || "front") !== layer) continue;
        const point = this.worldToScreen(effect.x, effect.y, camera);
        const alpha = clamp(effect.life / effect.maxLife, 0, 1);
        ctx.globalAlpha = alpha;
        if (effect.type === "chain") {
          const target = this.worldToScreen(effect.targetX, effect.targetY, camera);
          const dx = target.x - point.x;
          const dy = target.y - point.y;
          const length = Math.max(1, Math.hypot(dx, dy));
          const normalX = -dy / length;
          const normalY = dx / length;
          ctx.strokeStyle = effect.color || "#a7ffff";
          ctx.lineWidth = this.reduced ? 1.7 : 2.2;
          ctx.shadowColor = effect.color || "#66f7ff";
          ctx.shadowBlur = this.reduced ? 0 : 9;
          ctx.beginPath();
          ctx.moveTo(point.x, point.y);
          if (!this.reduced) {
            for (let index = 1; index < 5; index += 1) {
              const progress = index / 5;
              const offset = (index % 2 ? 1 : -1) * (3 + mod(effect.x + effect.y + index * 11, 5));
              ctx.lineTo(
                point.x + dx * progress + normalX * offset,
                point.y + dy * progress + normalY * offset
              );
            }
          }
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = alpha * 0.75;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(target.x, target.y, 2.4, 0, TAU);
          ctx.fill();
        } else if (effect.type === "ring") {
          ctx.strokeStyle = effect.color;
          ctx.lineWidth = 1 + alpha * 4;
          ctx.beginPath(); ctx.arc(point.x, point.y, effect.radius, 0, TAU); ctx.stroke();
        } else {
          ctx.fillStyle = effect.color;
          const size = effect.size * (0.35 + alpha * 0.65);
          ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
        }
      }
      ctx.restore();
    }

    drawFloaters(floaters, camera) {
      const ctx = this.ctx;
      ctx.save();
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (const floater of floaters) {
        const point = this.worldToScreen(floater.x, floater.y, camera);
        ctx.globalAlpha = clamp(floater.life / floater.maxLife, 0, 1);
        ctx.fillStyle = floater.color || "#ffffff";
        ctx.font = `900 ${floater.size || 13}px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillText(floater.text, point.x, point.y);
      }
      ctx.restore();
    }

    drawReticle(state) {
      if (state.mode !== "playing" || !state.aimWorld) return;
      const point = this.worldToScreen(state.aimWorld.x, state.aimWorld.y, state.camera);
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(state.time * 0.75);
      ctx.strokeStyle = "rgba(158,250,255,0.64)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i += 1) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath(); ctx.arc(0, 0, 9, 0.15, 1.1); ctx.stroke();
      }
      ctx.fillStyle = "#ff5dce";
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    }
  }

  ND.Renderer = Renderer;
})(window);
