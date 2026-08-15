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

  test("scene journey leaves Earth for Mars and authored deep-space worlds", () => {
    const debug = loadRenderer();
    assert.ok(debug && typeof debug.sceneFrame === "function" && typeof debug.screenAnchor === "function");
    const scenes = Array.from({ length: 20 }, (_, index) => debug.sceneFrame(index + 1, 1, 0));
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
      assert.ok(scenes[index].bodies.some((item) => debug.assetSource(item.type) && item.alpha > 0.4), `Stage ${index + 1} lacks a visible authored world`);
      assert.ok(scenes[index].bodies.every((item) => item.type !== "exotic"), `Stage ${index + 1} retained the old procedural planet type`);
      assert.ok(scenes[index].depth > scenes[index - 1].depth, `Stage ${index + 1} did not move deeper into space`);
    }
    const nextSector = debug.sceneFrame(1, 2, 0);
    assert.ok(nextSector.bodies.filter((item) => item.id === "earth" || item.id === "mars").every((item) => item.alpha === 0));
    const waypoint = nextSector.bodies.find((item) => item.id === "waypoint" && item.alpha > 0);
    assert.ok(waypoint && debug.assetSource(waypoint.type), "later sectors fell back to an unauthored Solar System or procedural world");
  });

  test("all deep-space planets use explicit local raster art and the banded fallback is removed", () => {
    const debug = loadRenderer();
    const expected = [
      "frontier-world", "titan-world", "signal-world",
      "shard-world", "fleet-world", "command-world"
    ];
    const types = new Set();
    for (let stage = 4; stage <= 20; stage += 1) {
      const visible = debug.sceneFrame(stage, 1, 0).visibleBodies.filter((item) => item.alpha > 0.15);
      assert.ok(visible.length > 0, `Stage ${stage} lacks a main authored world`);
      for (const body of visible) {
        assert.ok(debug.assetSource(body.type), `Stage ${stage} uses missing local art ${body.type}`);
        types.add(body.type);
      }
    }
    for (const type of expected) assert.ok(types.has(type), `${type} never appears in the twenty-stage journey`);
    for (const type of ["earth", "mars"].concat(expected)) {
      assert.equal(debug.assetSource(type), `assets/${type}.webp`);
    }
    assert.equal(debug.assetSource("exotic"), null);
    assert.equal(debug.assetSource("unknown-world"), null);
    const renderer = readProject("js/render.js");
    assert.doesNotMatch(renderer, /drawExoticPlanet|type:\s*["']exotic["']|\.rings\b/, "the old procedural ring/band planet path remains in runtime code");
  });

  test("all twenty scene handoffs interpolate continuously, including the sector wrap", () => {
    const debug = loadRenderer();
    const activeMap = (scene) => new Map(scene.bodies.filter((body) => body.alpha > 1e-10).map((body) => [body.id, body]));
    for (let stage = 1; stage <= 20; stage += 1) {
      const sector = 1;
      const nextStage = stage === 20 ? 1 : stage + 1;
      const nextSector = stage === 20 ? 2 : sector;
      const start = debug.sceneFrame(stage, sector, 0, nextStage, nextSector);
      const middle = debug.sceneFrame(stage, sector, 0.5, nextStage, nextSector);
      const end = debug.sceneFrame(stage, sector, 1, nextStage, nextSector);
      const byId = (scene, id) => scene.bodies.find((body) => body.id === id);
      for (const item of middle.bodies) {
        const from = byId(start, item.id);
        const to = byId(end, item.id);
        for (const key of ["x", "y", "size", "alpha", "hue"]) {
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
        for (const key of ["x", "y", "size", "alpha", "hue"]) approximately(endBody[key], targetBody[key], 1e-10, `Stage ${stage}→${nextStage} ${id}.${key}`);
      }
    }
    assert.equal(debug.sceneFrame(-20, -4, -1).fromStage, 1);
    assert.equal(debug.sceneFrame(99, 1, 99).fromStage, 20);
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

  test("touch landscape HUD keeps loadout chips visible without blocking either control half", () => {
    const css = readProject("styles.css");
    const marker = "@media (orientation: landscape) and (max-height: 820px)";
    const start = css.indexOf(marker);
    assert.ok(start >= 0, "compact landscape HUD breakpoint is missing");
    const compact = css.slice(start, css.indexOf("@media (orientation: landscape) and (max-height: 500px)", start));
    const rule = (selector) => {
      const ruleStart = compact.lastIndexOf(`${selector} {`);
      assert.ok(ruleStart >= 0, `${selector} compact rule is missing`);
      const declarationStart = compact.indexOf("{", ruleStart) + 1;
      const declarationEnd = compact.indexOf("}", declarationStart);
      assert.ok(declarationStart > 0 && declarationEnd > declarationStart, `${selector} compact rule is malformed`);
      return compact.slice(declarationStart, declarationEnd);
    };
    for (const selector of [
      ".is-touch-capable .record-readout",
      ".is-touch-capable .objective-label"
    ]) {
      const declarations = rule(selector);
      assert.match(declarations, /position:\s*absolute/);
      assert.match(declarations, /width:\s*1px/);
      assert.match(declarations, /height:\s*1px/);
      assert.match(declarations, /clip:\s*rect\(0,\s*0,\s*0,\s*0\)/);
      assert.doesNotMatch(declarations, /display:\s*none/, `${selector} was removed from assistive technology`);
    }
    const loadoutDeclarations = rule(".is-touch-capable .module-strip,\n  .is-touch-capable .active-effects-list");
    assert.match(loadoutDeclarations, /flex-wrap:\s*nowrap/);
    assert.match(loadoutDeclarations, /overflow-x:\s*auto/);
    assert.match(loadoutDeclarations, /overflow-y:\s*hidden/);
    assert.match(loadoutDeclarations, /pointer-events:\s*none/);
    assert.doesNotMatch(loadoutDeclarations, /touch-action:\s*pan-x/);
    assert.doesNotMatch(loadoutDeclarations, /(?:width|height):\s*1px|clip:\s*rect/, "owned loadout chips were visually clipped");
    for (const selector of [".is-touch-capable .hud-button", ".is-touch-capable .touch-button"]) {
      const declarations = rule(selector);
      const width = declarations.match(/(?:min-)?width:\s*(\d+)px/);
      const height = declarations.match(/(?:min-)?height:\s*(\d+)px/);
      assert.ok(width && Number(width[1]) >= 44, `${selector} is narrower than 44px`);
      assert.ok(height && Number(height[1]) >= 44, `${selector} is shorter than 44px`);
    }
    const tight = css.slice(css.indexOf("@media (orientation: landscape) and (max-height: 500px)"));
    assert.match(tight, /\.is-touch-capable\s+\.combo\s*\{[^}]*display:\s*none/s, "very short screens retain nonessential combo text");
  });

  test("Enigma choice cards declare the compact-landscape three-column layout contract", () => {
    const html = readProject("index.html");
    const css = readProject("styles.css");
    const renderer = readProject("js/render.js");
    const dialogStart = html.indexOf('id="enigma-upgrade-modal"');
    const dialogEnd = html.indexOf("</dialog>", dialogStart);
    assert.ok(dialogStart >= 0 && dialogEnd > dialogStart, "Enigma dialog markup is missing");
    const dialogMarkup = html.slice(dialogStart, dialogEnd);
    assert.match(dialogMarkup, /aria-labelledby="enigma-upgrade-title"/);
    assert.match(dialogMarkup, /aria-describedby="enigma-upgrade-description"/);
    assert.match(dialogMarkup, /id="enigma-upgrade-grid"[^>]*class="enigma-upgrade-grid"/s);
    assert.doesNotMatch(dialogMarkup, /(?:close-button|>\s*Close\s*<)/i, "mandatory Enigma choice gained a dismiss control");

    const baseGrid = css.match(/\.enigma-upgrade-grid\s*\{([^}]*)\}/s);
    assert.ok(baseGrid);
    assert.match(baseGrid[1], /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
    const dialogRule = css.match(/\.enigma-upgrade-dialog\s*\{([^}]*)\}/s);
    assert.ok(dialogRule);
    assert.match(dialogRule[1], /max-height:\s*min\(calc\(100dvh[^;]+/);
    assert.match(dialogRule[1], /overflow-y:\s*auto/);
    assert.match(dialogRule[1], /overscroll-behavior:\s*contain/);

    const portraitStart = css.indexOf("@media (orientation: portrait) and (max-width: 620px)");
    const compactStart = css.indexOf("@media (orientation: landscape) and (max-height: 500px)");
    assert.ok(portraitStart >= 0 && compactStart > portraitStart);
    const portrait = css.slice(portraitStart, compactStart);
    assert.match(portrait, /\.enigma-upgrade-grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
    const compactEnd = css.indexOf("@media (orientation: landscape) and (max-height: 820px)", compactStart);
    const compact = css.slice(compactStart, compactEnd);
    assert.match(compact, /\.upgrade-card\s*\{[^}]*min-height:\s*176px/s);
    assert.doesNotMatch(compact, /grid-template-columns:\s*1fr/, "short landscape collapsed the three choices vertically");
    assert.match(compact, /\.upgrade-card-title\s*\{[^}]*font-size:\s*0\.76rem/s);
    assert.match(compact, /\.upgrade-card-description\s*\{[^}]*font-size:\s*0\.6rem/s);
    assert.match(renderer, /enigma:\s*"#c584ff"/);
    assert.match(renderer, /enigma:\s*"\?"/);
    assert.match(renderer, /drawTimeFracture\(state\)/);
    assert.match(renderer, /sourceModule\s*===\s*"homingSalvo"/);
    assert.match(renderer, /bullet\.kind\s*===\s*"radial"/);
    assert.match(renderer, /effect\.type\s*===\s*"chain"/);
    assert.match(renderer, /state\.ship\s*&&\s*state\.ship\.orbitBlades/);
    assert.match(renderer, /mine\.owner\s*===\s*"player"/);
    assert.match(renderer, /boss\.type\s*===\s*"leviathan"/);
    assert.match(renderer, /amplifier:\s*"#ffb45f"/);
    assert.match(renderer, /aegis:\s*"#7bdcff"/);
  });

  test("the menu local record uses the space-theme cyan accent", () => {
    const css = readProject("styles.css");
    const match = css.match(/\.menu-meta\s+strong\s*\{([^}]*)\}/s);
    assert.ok(match, "menu record style is missing");
    assert.match(match[1], /color:\s*var\(--cyan(?:-strong)?\)/);
    assert.doesNotMatch(match[1], /var\(--gold\)/);
  });
};
