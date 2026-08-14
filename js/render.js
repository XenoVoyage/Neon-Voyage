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
    Object.freeze({ depth: 1, hue: 344, bodies: Object.freeze([
      Object.freeze({ id: "command-world", type: "command-world", x: 0.52, y: 0.16, size: 0.39, alpha: 0.82, hue: 344 })
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

  ND.RenderDebug = Object.freeze({
    sceneFrame,
    cinematicProfile,
    screenAnchor,
    asteroidCrackStage,
    assetSource
  });
  ND.StagePreview = Object.freeze({ render: renderStagePreview });

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
      const themes = [
        ["rgba(25,92,160,0.15)", "rgba(68,211,255,0.09)"],
        ["rgba(150,72,28,0.14)", "rgba(255,151,75,0.085)"],
        ["rgba(54,61,145,0.15)", "rgba(117,121,255,0.09)"],
        ["rgba(20,117,109,0.15)", "rgba(70,255,211,0.085)"],
        ["rgba(155,91,25,0.15)", "rgba(255,194,78,0.09)"],
        ["rgba(27,123,80,0.145)", "rgba(85,255,163,0.085)"],
        ["rgba(126,39,137,0.155)", "rgba(255,87,226,0.095)"],
        ["rgba(55,42,148,0.16)", "rgba(137,109,255,0.095)"],
        ["rgba(156,39,70,0.17)", "rgba(255,74,177,0.1)"]
      ];
      this.encounterWashes = themes.map((colors, index) => {
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
        return { base, accent };
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
        ctx.globalAlpha = (this.reduced ? 0.38 : 0.55 + Math.sin(time * 0.12 + stageIndex) * 0.035) * alpha;
        ctx.fillStyle = wash.base;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.globalAlpha *= 0.72;
        ctx.fillStyle = wash.accent;
        ctx.fillRect(0, 0, this.width, this.height);
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
      return [
        "#66f7ff",
        "#ffb267",
        "#9298ff",
        "#62f7c8",
        "#ffd166",
        "#72ffa5",
        "#ff67d9",
        "#9f8cff",
        "#ff5f9e"
      ][stageNumber(encounter) - 1];
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
      ctx.save();
      ctx.strokeStyle = state.arena.warning > 0 ? "rgba(255,209,102,0.72)" : "rgba(255,79,216,0.72)";
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 14]);
      ctx.lineDashOffset = -time * 42;
      ctx.shadowColor = "#ff4fd8";
      ctx.shadowBlur = this.reduced ? 0 : 18;
      ctx.beginPath();
      ctx.arc(point.x, point.y, state.arena.radius, 0, TAU);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.12;
      ctx.lineWidth = 14;
      ctx.stroke();
      ctx.restore();
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
      if (ship.shield > 0) {
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(time * 0.55);
        ctx.strokeStyle = `rgba(85,245,255,${0.25 + Math.min(0.55, ship.shield / 150)})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, 28, 0, TAU * clamp(ship.shield / 100, 0.18, 1));
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
      if (!this.onScreen(point.x, point.y, asteroid.radius)) return;
      const ctx = this.ctx;
      const color = asteroid.kind === "crystal" ? "#ff66dd" : asteroid.kind === "volatile" ? "#ffb84d" : asteroid.kind === "armored" ? "#a7b8c8" : asteroid.kind === "titan" ? "#ffd166" : "#72dff3";
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
      ctx.fillStyle = asteroid.kind === "crystal" ? "rgba(38,15,48,0.95)" : "rgba(13,21,32,0.97)";
      ctx.strokeStyle = color;
      ctx.lineWidth = asteroid.kind === "titan" ? 3 : 1.6;
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
      if (asteroid.kind === "armored" || asteroid.kind === "titan") {
        ctx.globalAlpha = 0.68;
        ctx.strokeStyle = "#c7d5df";
        ctx.lineWidth = Math.max(2, asteroid.radius * 0.035);
        for (let i = 0; i < 3; i += 1) {
          ctx.beginPath();
          ctx.arc(0, 0, asteroid.radius * (0.78 - i * 0.08), i * 1.9, i * 1.9 + 0.95);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    drawAlien(alien, camera, time) {
      const point = this.worldToScreen(alien.x, alien.y, camera);
      if (!this.onScreen(point.x, point.y, alien.radius + 20)) return;
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(point.x, point.y);
      const heading = Number.isFinite(alien.heading) ? alien.heading : Number.isFinite(alien.angle) ? alien.angle : 0;
      ctx.rotate(heading);
      const color = alien.type === "bomber" ? "#ffd166" : alien.type === "carrier" ? "#ff5aa5" : alien.type === "striker" ? "#b68cff" : "#62f7c8";
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
      ctx.ellipse(3, 0, alien.type === "carrier" ? 12 : 7, alien.type === "carrier" ? 7 : 4, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.52;
      ctx.strokeStyle = "#d9ffff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(8, -4); ctx.lineTo(-8, -9);
      ctx.moveTo(8, 4); ctx.lineTo(-8, 9);
      ctx.stroke();
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
    }

    drawBoss(boss, camera, time) {
      const point = this.worldToScreen(boss.x, boss.y, camera);
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(boss.angle || 0);
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
      ctx.restore();

      if (boss.nodes) {
        for (const node of boss.nodes) {
          if (node.health <= 0) continue;
          const nodePoint = this.worldToScreen(node.x, node.y, camera);
          ctx.save();
          ctx.translate(nodePoint.x, nodePoint.y);
          ctx.rotate(time * 1.4 + node.index);
          ctx.strokeStyle = "#6fffff";
          ctx.fillStyle = "rgba(12,35,48,0.9)";
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

      if (boss.telegraph && boss.telegraph.active) this.drawTelegraph(boss.telegraph, camera, time);
    }

    drawTelegraph(telegraph, camera, time) {
      const ctx = this.ctx;
      const start = this.worldToScreen(telegraph.x, telegraph.y, camera);
      ctx.save();
      ctx.globalAlpha = 0.42 + Math.sin(time * 16) * 0.15;
      ctx.strokeStyle = telegraph.color || "#ff667a";
      ctx.lineWidth = telegraph.width || 5;
      ctx.setLineDash([18, 12]);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(start.x + Math.cos(telegraph.angle) * (telegraph.length || 1200), start.y + Math.sin(telegraph.angle) * (telegraph.length || 1200));
      ctx.stroke();
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
        const length = isLance ? 38 : bullet.kind === "rail" ? 30 : isRocket ? 17 : bullet.kind === "missile" ? 13 : isArc ? 15 : isRadial ? 12 : 10;
        ctx.strokeStyle = color;
        ctx.lineWidth = isLance ? 5 : bullet.kind === "rail" ? 4 : isArc ? 3 : isRadial ? 1.6 : isRocket ? 2 : 2.5;
        ctx.globalAlpha = isRadial ? 0.66 : isRocket ? 0.75 : 0.82;
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
        }
        if (!isRocket && !isRadial) {
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
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(time * 0.8 + mine.phase);
      ctx.strokeStyle = mine.armed ? "#ff5d7a" : "#ffd166";
      ctx.fillStyle = "rgba(35,15,24,0.92)";
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
      ctx.restore();
    }

    drawPickup(pickup, camera, time) {
      const point = this.worldToScreen(pickup.x, pickup.y, camera);
      if (!this.onScreen(point.x, point.y, 24)) return;
      const colors = {
        shield: "#55f5ff",
        rapid: "#ffd166",
        repair: "#7dff9b",
        module: "#ff4fd8",
        triShot: "#ff9a62",
        piercing: "#ff6b7d",
        pulseCharge: "#bca4ff",
        arcBurst: "#65ffbd",
        novaLance: "#ff75ef",
        enigma: "#c584ff"
      };
      const labels = {
        shield: "S",
        rapid: "R",
        repair: "+",
        module: "M",
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
      ctx.fillStyle = color;
      ctx.font = "900 11px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(labels[pickup.kind] || "?", 0, 0.5);
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
        if (effect.type === "ring") {
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
