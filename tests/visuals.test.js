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
  test("background flow orientation is fixed and independent of ship angle", () => {
    const debug = loadRenderer();
    assert.ok(debug && typeof debug.flowDirection === "function");
    const baseline = debug.flowDirection();
    approximately(Math.hypot(baseline.x, baseline.y), 1, 1e-12, "flow vector length");
    for (const angle of [0, Math.PI / 3, Math.PI, Math.PI * 1.75, -2.4]) {
      const direction = debug.flowDirection({ ship: { angle, vx: Math.cos(angle) * 800, vy: Math.sin(angle) * 800 } });
      approximately(direction.x, baseline.x, 1e-12, `flow x at ship angle ${angle}`);
      approximately(direction.y, baseline.y, 1e-12, `flow y at ship angle ${angle}`);
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
};
