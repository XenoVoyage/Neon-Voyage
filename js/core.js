(function attachNeonVoyageCore(root) {
  "use strict";

  const ND = root.ND || (root.ND = {});
  const TAU = Math.PI * 2;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, amount) {
    return a + (b - a) * amount;
  }

  function normalizeAngle(value) {
    return ((value + Math.PI) % TAU + TAU) % TAU - Math.PI;
  }

  function angleDelta(from, to) {
    return normalizeAngle(to - from);
  }

  function distanceSquared(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    return dx * dx + dy * dy;
  }

  function segmentCircleHit(x1, y1, x2, y2, cx, cy, radius) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return distanceSquared(x1, y1, cx, cy) <= radius * radius;
    const projection = ((cx - x1) * dx + (cy - y1) * dy) / lengthSquared;
    const t = clamp(projection, 0, 1);
    const closestX = x1 + dx * t;
    const closestY = y1 + dy * t;
    return distanceSquared(closestX, closestY, cx, cy) <= radius * radius;
  }

  function hashSeed() {
    let hash = 0x811c9dc5;
    for (let partIndex = 0; partIndex < arguments.length; partIndex += 1) {
      const text = String(arguments[partIndex]);
      for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
      }
      hash ^= 0xff;
      hash = Math.imul(hash, 0x01000193);
    }
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x7feb352d);
    hash ^= hash >>> 15;
    hash = Math.imul(hash, 0x846ca68b);
    hash ^= hash >>> 16;
    return hash >>> 0;
  }

  function createRng(seed) {
    let state = hashSeed(seed) || 0x6d2b79f5;
    const next = function nextRandom() {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    next.range = (min, max) => min + next() * (max - min);
    next.int = (min, max) => Math.floor(next.range(min, max + 1));
    next.chance = (probability) => next() < probability;
    next.pick = (items) => (items && items.length ? items[Math.floor(next() * items.length)] : undefined);
    next.getState = () => state >>> 0;
    return next;
  }

  function getDefaultStorage() {
    try {
      return root.localStorage || null;
    } catch {
      return null;
    }
  }

  function safeReadJSON(storage, key, fallback, validate, maxLength) {
    const source = storage || getDefaultStorage();
    const limit = Number.isFinite(maxLength) ? Math.max(0, maxLength) : 8192;
    if (!source || typeof source.getItem !== "function") return fallback;
    try {
      const raw = source.getItem(key);
      if (typeof raw !== "string" || raw.length === 0 || raw.length > limit) return fallback;
      const value = JSON.parse(raw);
      return typeof validate !== "function" || validate(value) ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function safeWriteJSON(storage, key, value, validate, maxLength) {
    const target = storage || getDefaultStorage();
    const limit = Number.isFinite(maxLength) ? Math.max(0, maxLength) : 8192;
    if (!target || typeof target.setItem !== "function") return false;
    try {
      if (typeof validate === "function" && !validate(value)) return false;
      const raw = JSON.stringify(value);
      if (typeof raw !== "string" || raw.length > limit) return false;
      target.setItem(key, raw);
      return true;
    } catch {
      return false;
    }
  }

  function cleanupCapped(array, isAlive, maxLength, onRemove) {
    if (!Array.isArray(array)) return 0;
    const keep = typeof isAlive === "function" ? isAlive : (item) => item && !item.dead;
    const limit = Number.isFinite(maxLength) ? Math.max(0, Math.floor(maxLength)) : Infinity;
    let writeIndex = 0;
    let removed = 0;
    for (let index = 0; index < array.length; index += 1) {
      const item = array[index];
      if (keep(item)) {
        array[writeIndex] = item;
        writeIndex += 1;
      } else {
        removed += 1;
        if (typeof onRemove === "function") onRemove(item);
      }
    }
    array.length = writeIndex;
    if (array.length > limit) {
      const excess = array.length - limit;
      if (typeof onRemove === "function") {
        for (let index = 0; index < excess; index += 1) onRemove(array[index]);
      }
      array.splice(0, excess);
      removed += excess;
    }
    return removed;
  }

  function cameraZoom(camera) {
    const zoom = camera && Number(camera.zoom);
    return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  }

  function worldToScreen(x, y, camera, viewWidth, viewHeight, out) {
    const target = out || {};
    const zoom = cameraZoom(camera);
    target.x = (x - (camera ? camera.x : 0)) * zoom + viewWidth * 0.5;
    target.y = (y - (camera ? camera.y : 0)) * zoom + viewHeight * 0.5;
    return target;
  }

  function circlesOverlap(ax, ay, ar, bx, by, br) {
    const radius = Math.max(0, ar) + Math.max(0, br);
    return distanceSquared(ax, ay, bx, by) <= radius * radius;
  }

  function constrainToCircle(entity, centerX, centerY, boundaryRadius, restitution) {
    const entityRadius = Math.max(0, Number(entity.radius) || 0);
    const limit = Math.max(0, boundaryRadius - entityRadius);
    const dx = entity.x - centerX;
    const dy = entity.y - centerY;
    const squared = dx * dx + dy * dy;
    if (squared <= limit * limit) return false;
    const length = Math.sqrt(squared);
    const nx = length > 0.000001 ? dx / length : 1;
    const ny = length > 0.000001 ? dy / length : 0;
    entity.x = centerX + nx * limit;
    entity.y = centerY + ny * limit;
    if (Number.isFinite(entity.vx) && Number.isFinite(entity.vy)) {
      const outward = entity.vx * nx + entity.vy * ny;
      if (outward > 0) {
        const bounce = clamp(Number(restitution) || 0, 0, 1);
        entity.vx -= nx * outward * (1 + bounce);
        entity.vy -= ny * outward * (1 + bounce);
      }
    }
    return true;
  }

  function translateOriginPoint(point, shiftX, shiftY) {
    if (!point || typeof point !== "object") return;
    const pairs = [
      ["x", "y"],
      ["px", "py"],
      ["cx", "cy"],
      ["centerX", "centerY"],
      ["spawnX", "spawnY"],
      ["targetX", "targetY"]
    ];
    for (const pair of pairs) {
      if (Number.isFinite(point[pair[0]])) point[pair[0]] -= shiftX;
      if (Number.isFinite(point[pair[1]])) point[pair[1]] -= shiftY;
    }
  }

  function rebaseOrigin(anchor, collections, points, threshold, quantum) {
    const edge = Number.isFinite(threshold) ? Math.max(1, Math.abs(threshold)) : 100000;
    if (Math.abs(anchor.x) < edge && Math.abs(anchor.y) < edge) return;
    const step = Number.isFinite(quantum) ? Math.max(1, Math.abs(quantum)) : Math.max(1, edge * 0.5);
    const shiftX = Math.trunc(anchor.x / step) * step;
    const shiftY = Math.trunc(anchor.y / step) * step;
    if (shiftX === 0 && shiftY === 0) return;
    const seen = new Set();
    const move = (point) => {
      if (!point || seen.has(point)) return;
      seen.add(point);
      translateOriginPoint(point, shiftX, shiftY);
    };
    move(anchor);
    for (const collection of collections || []) {
      if (Array.isArray(collection)) {
        for (const item of collection) move(item);
      } else {
        move(collection);
      }
    }
    for (const point of points || []) move(point);
  }

  function isFiniteEntity(entity, fields) {
    const names = fields || ["x", "y", "vx", "vy"];
    return Boolean(entity) && names.every((name) => Number.isFinite(entity[name]));
  }

  function circleVisible(x, y, radius, camera, viewWidth, viewHeight, margin) {
    const point = worldToScreen(x, y, camera, viewWidth, viewHeight);
    const scaledRadius = Math.max(0, radius) * cameraZoom(camera);
    const pad = Math.max(0, Number(margin) || 0);
    return point.x + scaledRadius >= -pad && point.x - scaledRadius <= viewWidth + pad &&
      point.y + scaledRadius >= -pad && point.y - scaledRadius <= viewHeight + pad;
  }

  function beyondRadius(entity, centerX, centerY, radius) {
    return distanceSquared(entity.x, entity.y, centerX, centerY) > radius * radius;
  }

  ND.Core = Object.freeze({
    clamp,
    lerp,
    normalizeAngle,
    angleDelta,
    distanceSquared,
    segmentCircleHit,
    createRng,
    safeReadJSON,
    safeWriteJSON,
    cleanupCapped,
    circlesOverlap,
    constrainToCircle,
    rebaseOrigin,
    isFiniteEntity,
    circleVisible,
    beyondRadius
  });
})(typeof window === "object" ? window : globalThis);
