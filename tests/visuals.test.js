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

  test("Earth and Mars follow exact authored stage keyframes", () => {
    const debug = loadRenderer();
    const expected = [
      [[0.91, 0.22, 0.16, 0.24], [0.08, 0.78, 0.08, 0.06]],
      [[0.84, 0.28, 0.24, 0.40], [0.14, 0.72, 0.12, 0.16]],
      [[0.75, 0.36, 0.34, 0.58], [0.20, 0.63, 0.17, 0.29]],
      [[0.63, 0.47, 0.48, 0.74], [0.22, 0.45, 0.23, 0.44]],
      [[0.45, 0.61, 0.66, 0.82], [0.18, 0.24, 0.30, 0.60]]
    ];
    expected.forEach(([earth, mars], index) => {
      const frame = debug.planetFrame(index + 1, 0);
      ["x", "y", "size", "alpha"].forEach((key, valueIndex) => {
        approximately(frame.earth[key], earth[valueIndex], 1e-12, `stage ${index + 1} Earth ${key}`);
        approximately(frame.mars[key], mars[valueIndex], 1e-12, `stage ${index + 1} Mars ${key}`);
      });
    });
  });

  test("planet transitions interpolate continuously and clamp unsafe inputs", () => {
    const debug = loadRenderer();
    for (let stage = 1; stage <= 4; stage += 1) {
      const start = debug.planetFrame(stage, 0);
      const middle = debug.planetFrame(stage, 0.5);
      const end = debug.planetFrame(stage, 1);
      for (const body of ["earth", "mars"]) {
        for (const key of ["x", "y", "size", "alpha"]) {
          approximately(middle[body][key], (start[body][key] + end[body][key]) * 0.5, 1e-12);
          assert.ok(Number.isFinite(middle[body][key]));
        }
      }
      const next = debug.planetFrame(stage + 1, 0);
      assert.deepEqual(end.earth, next.earth);
      assert.deepEqual(end.mars, next.mars);
    }
    assert.deepEqual(debug.planetFrame(-20, -4), debug.planetFrame(1, 0));
    assert.deepEqual(debug.planetFrame(99, 99), debug.planetFrame(5, 1));
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
};
