(function attachRenderer(global) {
  "use strict";

  const ND = global.ND = global.ND || {};
  const TAU = Math.PI * 2;
  const mod = (value, span) => ((value % span) + span) % span;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const FLOW_DIRECTION = Object.freeze({ x: -0.9486832980505138, y: 0.31622776601683794 });
  const PLANET_KEYFRAMES = Object.freeze([
    Object.freeze({ earth: Object.freeze({ x: 0.91, y: 0.22, size: 0.16, alpha: 0.24 }), mars: Object.freeze({ x: 0.08, y: 0.78, size: 0.08, alpha: 0.06 }) }),
    Object.freeze({ earth: Object.freeze({ x: 0.84, y: 0.28, size: 0.24, alpha: 0.4 }), mars: Object.freeze({ x: 0.14, y: 0.72, size: 0.12, alpha: 0.16 }) }),
    Object.freeze({ earth: Object.freeze({ x: 0.75, y: 0.36, size: 0.34, alpha: 0.58 }), mars: Object.freeze({ x: 0.2, y: 0.63, size: 0.17, alpha: 0.29 }) }),
    Object.freeze({ earth: Object.freeze({ x: 0.63, y: 0.47, size: 0.48, alpha: 0.74 }), mars: Object.freeze({ x: 0.22, y: 0.45, size: 0.23, alpha: 0.44 }) }),
    Object.freeze({ earth: Object.freeze({ x: 0.45, y: 0.61, size: 0.66, alpha: 0.82 }), mars: Object.freeze({ x: 0.18, y: 0.24, size: 0.3, alpha: 0.6 }) })
  ]);

  function stageNumber(value) {
    return clamp(Math.floor(Number(value) || 1), 1, PLANET_KEYFRAMES.length);
  }

  function interpolatePlanet(from, to, progress) {
    const amount = clamp(Number(progress) || 0, 0, 1);
    return {
      x: from.x + (to.x - from.x) * amount,
      y: from.y + (to.y - from.y) * amount,
      size: from.size + (to.size - from.size) * amount,
      alpha: from.alpha + (to.alpha - from.alpha) * amount
    };
  }

  function planetFrame(stage, transitionProgress) {
    const currentStage = stageNumber(stage);
    const current = PLANET_KEYFRAMES[currentStage - 1];
    const next = PLANET_KEYFRAMES[currentStage % PLANET_KEYFRAMES.length];
    return {
      stage: currentStage,
      progress: clamp(Number(transitionProgress) || 0, 0, 1),
      earth: interpolatePlanet(current.earth, next.earth, transitionProgress),
      mars: interpolatePlanet(current.mars, next.mars, transitionProgress)
    };
  }

  ND.RenderDebug = Object.freeze({
    flowDirection() {
      return { x: FLOW_DIRECTION.x, y: FLOW_DIRECTION.y };
    },
    planetFrame
  });

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
      const sources = {
        space: "assets/deep-space.webp",
        earth: "assets/earth.webp",
        mars: "assets/mars.webp"
      };
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
        ["rgba(24,123,132,0.14)", "rgba(84,255,208,0.085)"],
        ["rgba(102,54,160,0.15)", "rgba(196,103,255,0.09)"],
        ["rgba(158,93,31,0.145)", "rgba(255,190,75,0.085)"],
        ["rgba(156,39,70,0.16)", "rgba(255,74,177,0.095)"]
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
      this.drawBackground(state, time);

      if (!state.ship || state.mode === "menu") {
        return;
      }

      const shake = this.reduced ? 0 : Math.max(0, state.shake || 0);
      ctx.save();
      ctx.translate((Math.random() * 2 - 1) * shake, (Math.random() * 2 - 1) * shake);
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
      this.drawShip(state.ship, state.camera, time);
      this.drawEffects(state.effects, state.camera, "front");
      this.drawFloaters(state.floaters, state.camera);
      this.drawReticle(state);
      ctx.restore();

      if (state.flash > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.2, state.flash * 0.22);
        ctx.fillStyle = state.flashColor || "#ff667a";
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();
      }
    }

    drawBackground(state, time) {
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

      this.drawEncounterWash(state, time);
      const ship = state.ship;
      const velocityX = ship && Number.isFinite(ship.vx) ? ship.vx : 0;
      const velocityY = ship && Number.isFinite(ship.vy) ? ship.vy : 0;
      const speed = Math.hypot(velocityX, velocityY);
      const speedReference = ND.CONFIG && ND.CONFIG.world && Number(ND.CONFIG.world.playerMaxSpeed) > 0 ? Number(ND.CONFIG.world.playerMaxSpeed) : 560;
      const movementRatio = clamp(speed / speedReference, 0, 1.4);
      const speedRatio = 0.32 + movementRatio * 1.08;
      const flowTime = state.mode === "menu" ? time : Number.isFinite(state.runTime) ? state.runTime : time;
      const flowDistance = flowTime * (94 + movementRatio * 226);
      const directionX = FLOW_DIRECTION.x;
      const directionY = FLOW_DIRECTION.y;
      ctx.save();
      ctx.lineCap = "round";
      for (const star of this.stars) {
        const parallax = 0.12 + star.depth * 3;
        const x = mod(star.x + directionX * flowDistance * parallax, this.width);
        const y = mod(star.y + directionY * flowDistance * parallax, this.height);
        ctx.globalAlpha = star.alpha * (0.82 + Math.sin(time * 0.7 + star.phase) * 0.18);
        const color = star.blue ? "#a7e9ff" : "#ffffff";
        const streak = this.reduced ? 0 : Math.max(0, speedRatio - 0.18) * (2 + star.depth * 122);
        if (streak > 1.25) {
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(0.55, star.size * 0.66);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + directionX * streak, y + directionY * streak);
          ctx.stroke();
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(x, y, star.size, star.size);
        }
      }
      ctx.restore();
      this.drawSpeedDust(flowDistance, directionX, directionY, speedRatio, time);
      this.drawCelestials(state);

      ctx.fillStyle = this.vignetteGradient;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    drawEncounterWash(state, time) {
      if (!state.ship || state.mode === "menu") return;
      const encounter = stageNumber(state.stage || state.encounter);
      const wash = this.encounterWashes[encounter - 1];
      if (!wash) return;
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = this.reduced ? 0.38 : 0.55 + Math.sin(time * 0.12 + encounter) * 0.035;
      ctx.fillStyle = wash.base;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalAlpha *= 0.72;
      ctx.fillStyle = wash.accent;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }

    drawSpeedDust(flowDistance, directionX, directionY, speedRatio, time) {
      if (this.reduced || speedRatio < 0.22) return;
      const ctx = this.ctx;
      const intensity = clamp((speedRatio - 0.22) / 0.92, 0, 1);
      const active = Math.floor(this.speedDust.length * (0.28 + intensity * 0.72));
      const baseLength = 8 + intensity * 38;
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
        ctx.lineTo(x + directionX * length, y + directionY * length);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawCelestials(state) {
      const stage = stageNumber(state.stage || state.encounter);
      const data = state.encounterData || {};
      const transition = Number(data.transition) || 0;
      const sectorConfig = ND.CONFIG && ND.CONFIG.sector ? ND.CONFIG.sector : {};
      const duration = stage === 5 ? Number(sectorConfig.postBossRewardSeconds) || 5 : Number(sectorConfig.intermissionSeconds) || 1.25;
      const transitionProgress = transition > 0 ? clamp(1 - transition / duration, 0, 1) : 0;
      const frame = planetFrame(stage, transitionProgress);
      const unit = Math.min(this.width, this.height);
      const objects = [
        { asset: "earth", ...frame.earth },
        { asset: "mars", ...frame.mars }
      ];
      for (const item of objects) {
        const screenX = item.x * this.width;
        const screenY = item.y * this.height;
        const width = item.size * unit;
        if (!this.onScreen(screenX, screenY, width)) continue;
        const image = this.assets[item.asset];
        if (!image || !image.complete || !image.naturalWidth) continue;
        const height = width * (image.naturalHeight / image.naturalWidth);
        this.ctx.save();
        this.ctx.globalAlpha = item.alpha;
        const radius = Math.min(width, height) * 0.49;
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, radius, 0, TAU);
        this.ctx.clip();
        this.ctx.drawImage(image, screenX - width / 2, screenY - height / 2, width, height);
        this.ctx.restore();
      }
    }

    encounterAccent(encounter) {
      if (encounter === 2) return "#ffd36b";
      if (encounter === 3) return "#ff67d9";
      if (encounter === 4) return "#ff845f";
      return "#66f7ff";
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

    drawShip(ship, camera, time) {
      const point = this.worldToScreen(ship.x, ship.y, camera);
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(ship.angle);
      if (ship.invulnerable > 0 && Math.floor(time * 18) % 2 === 0) ctx.globalAlpha = 0.34;
      this.shipPath(1, ship.engine || 0, time, false);
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

      ctx.globalAlpha = 0.48;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, asteroid.radius * 0.018);
      const crack = asteroid.radius * 0.62;
      ctx.beginPath();
      ctx.moveTo(-crack, -crack * 0.14);
      ctx.lineTo(-crack * 0.15, crack * 0.08);
      ctx.lineTo(crack * 0.18, -crack * 0.36);
      ctx.lineTo(crack * 0.72, crack * 0.18);
      ctx.stroke();
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
      if (boss.type === "gravemaw") {
        this.drawAsteroid(boss, camera, time);
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = `rgba(255,90,70,${0.32 + Math.sin(time * 4) * 0.12})`;
        ctx.beginPath();
        ctx.arc(0, 0, boss.radius * (boss.phase >= 2 ? 0.31 : 0.17), 0, TAU);
        ctx.fill();
        ctx.restore();
      } else {
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
        const length = bullet.kind === "rail" ? 30 : bullet.kind === "missile" ? 13 : 10;
        ctx.strokeStyle = color;
        ctx.lineWidth = bullet.kind === "rail" ? 4 : 2.5;
        ctx.globalAlpha = 0.82;
        ctx.beginPath();
        ctx.moveTo(point.x - Math.cos(angle) * length, point.y - Math.sin(angle) * length);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.arc(point.x, point.y, bullet.radius || 2.5, 0, TAU);
        ctx.fill();
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
        salvage: "#c6e3ff",
        pulseCharge: "#bca4ff"
      };
      const labels = { shield: "S", rapid: "R", repair: "+", module: "M", triShot: "3", piercing: "P", salvage: "V", pulseCharge: "E" };
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
