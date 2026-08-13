"use strict";

const { assert, vm, readProject, approximately } = require("./_harness");
const browserSmoke = require("./browser-smoke.test");

function loadRenderer() {
  const browser = browserSmoke.buildBrowser({ now: 1700000000000 });
  for (const script of ["js/config.js", "js/core.js", "js/render.js"]) {
    vm.runInContext(readProject(script), browser.context, { filename: script, timeout: 3000 });
  }
  return browser.window.ND.RenderDebug;
}

module.exports = function register(test) {
  test("normal stars remain point-only regardless of ship angle and velocity", () => {
    const debug = loadRenderer();
    assert.ok(debug && typeof debug.cinematicProfile === "function");
    const cinematic = {
      active: true,
      duration: 2,
      elapsed: 1,
      progress: 0.5,
      directionX: 0,
      directionY: -1,
      speed: 640
    };
    for (const state of [
      { mode: "menu", ship: null, cinematic },
      { mode: "playing", ship: { angle: 0, vx: 0, vy: 0 }, cinematic },
      { mode: "playing", ship: { angle: 2.4, vx: -920, vy: 480 }, cinematic },
      { mode: "paused", ship: { angle: -1.7, vx: 300, vy: -700 }, cinematic }
    ]) {
      const profile = debug.cinematicProfile(state, false);
      assert.equal(profile.streaks, false);
      assert.equal(profile.intensity, 0);
      assert.equal(profile.density, 0);
      assert.equal(profile.lengthScale, 0);
      assert.equal(profile.speed, 0);
      assert.equal(profile.direction.x, 0);
      assert.equal(profile.direction.y, 0);
    }
  });

  test("scene journey leaves Earth for Mars, distant space, and exotic worlds", () => {
    const debug = loadRenderer();
    assert.ok(debug && typeof debug.sceneFrame === "function" && typeof debug.screenAnchor === "function");
    const scenes = Array.from({ length: 9 }, (_, index) => debug.sceneFrame(index + 1, 1, 0));
    const body = (scene, id) => scene.bodies.find((item) => item.id === id);
    const earth1 = body(scenes[0], "earth");
    const earth2 = body(scenes[1], "earth");
    const earth3 = body(scenes[2], "earth");
    const mars1 = body(scenes[0], "mars");
    const mars2 = body(scenes[1], "mars");
    const mars3 = body(scenes[2], "mars");
    assert.ok(earth1.alpha > 0.8 && earth1.size > 0.5, "Earth is not the prominent Stage 1 origin");
    assert.ok(earth2.alpha < earth1.alpha && earth2.size < earth1.size, "Earth did not recede toward Mars");
    assert.ok(mars2.alpha > 0.6 && mars2.size > 0.2 && mars2.alpha > mars1.alpha, "Mars is not prominent in Stage 2");
    assert.ok(earth3.alpha < earth2.alpha && mars3.alpha < mars2.alpha, "the familiar planets did not recede in Stage 3");
    assert.ok(earth3.size < 0.08 && mars3.size < 0.1, "Stage 3 remains visually too close to the inner system");
    for (let index = 3; index < scenes.length; index += 1) {
      assert.ok(scenes[index].bodies.some((item) => item.type === "exotic" && item.alpha > 0.4), `Stage ${index + 1} lacks a visible exotic world`);
      assert.ok(scenes[index].depth > scenes[index - 1].depth, `Stage ${index + 1} did not move deeper into space`);
    }
    const nextSector = debug.sceneFrame(1, 2, 0);
    assert.ok(nextSector.bodies.filter((item) => item.id === "earth" || item.id === "mars").every((item) => item.alpha === 0));
    assert.ok(nextSector.bodies.some((item) => item.id === "waypoint" && item.alpha > 0), "later sectors fell back to the Solar System");
  });

  test("all nine scene handoffs interpolate continuously, including the sector wrap", () => {
    const debug = loadRenderer();
    const activeMap = (scene) => new Map(scene.bodies.filter((body) => body.alpha > 1e-10).map((body) => [body.id, body]));
    for (let stage = 1; stage <= 9; stage += 1) {
      const sector = 1;
      const nextStage = stage === 9 ? 1 : stage + 1;
      const nextSector = stage === 9 ? 2 : sector;
      const start = debug.sceneFrame(stage, sector, 0, nextStage, nextSector);
      const middle = debug.sceneFrame(stage, sector, 0.5, nextStage, nextSector);
      const end = debug.sceneFrame(stage, sector, 1, nextStage, nextSector);
      const byId = (scene, id) => scene.bodies.find((body) => body.id === id);
      for (const item of middle.bodies) {
        const from = byId(start, item.id);
        const to = byId(end, item.id);
        for (const key of ["x", "y", "size", "alpha", "hue", "rings"]) {
          approximately(item[key], (from[key] + to[key]) * 0.5, 1e-10, `Stage ${stage} ${item.id}.${key}`);
          assert.ok(Number.isFinite(item[key]));
        }
      }
      const target = debug.sceneFrame(nextStage, nextSector, 0);
      const ended = activeMap(end);
      const started = activeMap(target);
      assert.deepEqual(Array.from(ended.keys()).sort(), Array.from(started.keys()).sort(), `Stage ${stage} handoff changed visible bodies`);
      for (const [id, targetBody] of started) {
        const endBody = ended.get(id);
        for (const key of ["x", "y", "size", "alpha", "hue", "rings"]) approximately(endBody[key], targetBody[key], 1e-10, `Stage ${stage}→${nextStage} ${id}.${key}`);
      }
    }
    assert.equal(debug.sceneFrame(-20, -4, -1).fromStage, 1);
    assert.equal(debug.sceneFrame(99, 1, 99).fromStage, 9);
    assert.equal(debug.sceneFrame(1, 1, Infinity).progress, 1);
    assert.equal(debug.sceneFrame(1, 1, NaN).progress, 0);
  });

  test("screen anchor reports exact desktop and mobile ship placement", () => {
    const debug = loadRenderer();
    const state = { ship: { x: 84, y: -45 }, camera: { x: -16, y: 15 } };
    for (const viewport of [{ width: 1280, height: 720 }, { width: 320, height: 568 }, { width: 568, height: 320 }]) {
      const anchor = debug.screenAnchor(state, viewport);
      approximately(anchor.x, viewport.width * 0.5 + 100, 1e-12);
      approximately(anchor.y, viewport.height * 0.5 - 60, 1e-12);
      approximately(anchor.normalizedX, anchor.x / viewport.width, 1e-12);
      approximately(anchor.normalizedY, anchor.y / viewport.height, 1e-12);
      const cinematic = debug.screenAnchor({
        ship: state.ship,
        camera: state.camera,
        mode: "transition",
        cinematic: { active: true, anchorX: -viewport.width * 0.13, anchorY: viewport.height * 0.17 }
      }, viewport);
      approximately(cinematic.x, viewport.width * 0.37, 1e-12);
      approximately(cinematic.y, viewport.height * 0.67, 1e-12);
    }
    assert.equal(debug.screenAnchor({ ship: null, camera: state.camera }, { width: 100, height: 100 }), null);
  });

  test("hyperspace streak profile is transition-only, directional, bounded, and reduced-effects aware", () => {
    const debug = loadRenderer();
    assert.ok(debug && typeof debug.cinematicProfile === "function");
    const activeCinematic = {
      active: true,
      duration: 2,
      elapsed: 1,
      progress: 0.5,
      directionX: 3,
      directionY: 4,
      speed: 640
    };

    const inactive = debug.cinematicProfile({
      mode: "transition",
      cinematic: { ...activeCinematic, active: false }
    }, false);
    assert.equal(inactive.streaks, false, "an inactive transition rendered hyperspace streaks");
    assert.equal(inactive.intensity, 0);
    assert.equal(inactive.density, 0);
    assert.equal(inactive.lengthScale, 0);
    assert.equal(inactive.speed, 0);

    const full = debug.cinematicProfile({ mode: "transition", cinematic: activeCinematic }, false);
    assert.equal(full.streaks, true);
    assert.equal(full.progress, 0.5);
    approximately(full.direction.x, -0.6, 1e-12, "opposite travel x");
    approximately(full.direction.y, -0.8, 1e-12, "opposite travel y");
    approximately(Math.hypot(full.direction.x, full.direction.y), 1, 1e-12, "streak direction length");
    assert.ok(full.intensity > 0 && full.intensity <= 1);
    assert.ok(full.density > 0 && full.density <= 1);
    assert.ok(full.lengthScale > 0 && full.lengthScale <= 1);
    assert.equal(full.speed, 640);

    const reduced = debug.cinematicProfile({ mode: "transition", cinematic: activeCinematic }, true);
    assert.equal(reduced.streaks, true);
    assert.ok(reduced.intensity < full.intensity);
    assert.ok(reduced.density < full.density);
    assert.ok(reduced.lengthScale < full.lengthScale);

    const bounded = debug.cinematicProfile({
      mode: "transition",
      cinematic: { active: true, duration: 0, elapsed: Infinity, progress: 99, directionX: 0, directionY: 0, speed: 999999 }
    }, false);
    assert.equal(bounded.progress, 1);
    assert.ok(bounded.intensity >= 0 && bounded.intensity <= 1);
    assert.ok(bounded.density >= 0 && bounded.density <= 1);
    assert.ok(bounded.lengthScale >= 0 && bounded.lengthScale <= 1);
    assert.equal(bounded.speed, 1800);
    approximately(Math.hypot(bounded.direction.x, bounded.direction.y), 1, 1e-12, "fallback streak direction length");
  });

  test("asteroid cracks reveal exactly three progressive pre-break damage stages", () => {
    const debug = loadRenderer();
    assert.equal(typeof debug.asteroidCrackStage, "function");
    const asteroid = { health: 100, maxHealth: 100 };
    assert.equal(debug.asteroidCrackStage(asteroid), 0);
    asteroid.health = 75;
    assert.equal(debug.asteroidCrackStage(asteroid), 0);
    asteroid.health = 74.99;
    assert.equal(debug.asteroidCrackStage(asteroid), 1);
    asteroid.health = 50;
    assert.equal(debug.asteroidCrackStage(asteroid), 1);
    asteroid.health = 49.99;
    assert.equal(debug.asteroidCrackStage(asteroid), 2);
    asteroid.health = 25;
    assert.equal(debug.asteroidCrackStage(asteroid), 2);
    asteroid.health = 24.99;
    assert.equal(debug.asteroidCrackStage(asteroid), 3);
    asteroid.health = -Infinity;
    assert.equal(debug.asteroidCrackStage(asteroid), 0, "invalid damage state produced cracks");
  });
};
