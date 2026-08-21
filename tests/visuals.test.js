"use strict";

const { assert, vm, readProject, approximately } = require("./_harness");
const { buildBrowser, loadRuntimeScripts } = require("./_browser-harness");

function loadRenderer() {
  return loadVisualRuntime().window.ND.RenderDebug;
}

function loadVisualRuntime() {
  const browser = buildBrowser({ now: 1700000000000 });
  for (const script of ["js/config.js", "js/core.js", "js/render.js"]) {
    vm.runInContext(readProject(script), browser.context, { filename: script, timeout: 3000 });
  }
  return browser;
}

function recordingCanvas() {
  const operations = [];
  const methods = new Set([
    "arc", "beginPath", "clearRect", "closePath", "fill", "fillRect", "lineTo", "moveTo",
    "quadraticCurveTo", "restore", "rotate", "save", "scale", "setLineDash", "setTransform",
    "stroke", "strokeRect", "translate"
  ]);
  const context = new Proxy({}, {
    get(target, key) {
      if (methods.has(key)) return (...args) => operations.push([key, ...args]);
      return target[key];
    },
    set(target, key, value) {
      target[key] = value;
      operations.push(["set", key, value]);
      return true;
    }
  });
  const canvas = {
    width: 0,
    height: 0,
    clientWidth: 240,
    clientHeight: 64,
    getContext: () => context
  };
  return { canvas, operations };
}

module.exports = function register(test) {
  test("renderer follows the game shell through dynamic viewport changes", () => {
    const browser = buildBrowser({
      now: 1700000000000,
      shellBounds: { left: 0, top: 0, width: 844, height: 390 }
    });
    browser.window.innerWidth = 844;
    browser.window.innerHeight = 540;
    browser.window.devicePixelRatio = 2;
    loadRuntimeScripts(browser);
    browser.document.readyState = "interactive";
    browser.emit(browser.document, "DOMContentLoaded");
    const canvas = browser.elements.get("game");
    const shell = browser.elements.get("game-shell");
    const game = browser.window.ND.game;
    const CONFIG = browser.window.ND.CONFIG;
    game.start();

    assert.deepEqual([canvas.width, canvas.height], [1688, 780],
      "renderer backing store followed the window instead of the shorter shell");
    assert.equal(canvas.style.width, undefined, "renderer overrode the canvas CSS width");
    assert.equal(canvas.style.height, undefined, "renderer overrode the canvas CSS height");
    assert.equal(game.state.combatField.halfWidth,
      Math.max(CONFIG.combatField.minHalfWidth, 844 * CONFIG.combatField.halfWidthViewportRatio));
    assert.equal(game.state.combatField.halfHeight,
      Math.max(CONFIG.combatField.minHalfHeight, 390 * CONFIG.combatField.halfHeightViewportRatio));

    shell.setBoundingClientRect({ width: 667, height: 375 });
    browser.window.innerWidth = 667;
    browser.window.innerHeight = 510;
    browser.window.visualViewport.dispatchEvent({ type: "resize" });

    assert.deepEqual([canvas.width, canvas.height], [1334, 750],
      "renderer backing store did not follow the resized shell");
    assert.equal(game.state.combatField.halfWidth,
      Math.max(CONFIG.combatField.minHalfWidth, 667 * CONFIG.combatField.halfWidthViewportRatio));
    assert.equal(game.state.combatField.halfHeight,
      Math.max(CONFIG.combatField.minHalfHeight, 375 * CONFIG.combatField.halfHeightViewportRatio));
  });

  test("reticle renders only for an active pointer aim", () => {
    const browser = loadVisualRuntime();
    const canvas = browser.elements.get("game");
    const context = canvas.getContext("2d");
    const renderer = new browser.window.ND.Renderer(canvas);
    const state = {
      mode: "playing",
      time: 3,
      aimWorld: { x: 20, y: -12 },
      camera: { x: 0, y: 0 }
    };
    let arcs = 0;
    let dots = 0;
    context.arc = () => { arcs += 1; };
    context.fillRect = () => { dots += 1; };

    renderer.drawReticle(state, false);
    assert.equal(arcs, 0, "touch/neutral aim drew reticle arcs");
    assert.equal(dots, 0, "touch/neutral aim drew the reticle dot");

    renderer.drawReticle(state, true);
    assert.equal(arcs, 4, "active pointer aim did not draw the complete reticle");
    assert.equal(dots, 1, "active pointer aim did not draw the reticle dot");

    state.mode = "transition";
    renderer.drawReticle(state, true);
    assert.equal(arcs, 4, "non-playing mode drew a reticle");
    assert.equal(dots, 1, "non-playing mode drew a reticle dot");
  });

  test("off-screen threat indicators stay bounded, clustered, and use target art", () => {
    const browser = loadVisualRuntime();
    const debug = browser.window.ND.RenderDebug;
    const CONFIG = browser.window.ND.CONFIG;
    const state = {
      ship: { x: 0, y: 0 },
      camera: { x: 0, y: 0 },
      encounterData: { generation: "1:1:test" },
      boss: {
        id: 90,
        type: "leviathan",
        x: 0,
        y: -900,
        health: 100,
        nodes: [{ id: 91, x: 0, y: -760, health: 20, dead: false }]
      },
      aliens: [
        { id: 30, type: "scout", x: -900, y: 0, health: 20, generation: "1:1:test" },
        { id: 31, type: "striker", x: 0, y: 0, health: 20, generation: "old" }
      ],
      asteroids: [
        { id: 10, kind: "rock", x: 900, y: 0, health: 20, generation: "1:1:test" },
        { id: 11, kind: "rock", x: 980, y: 8, health: 20, generation: "1:1:test" },
        { id: 12, kind: "crystal", x: 120, y: 0, health: 20, generation: "1:1:test" },
        { id: 13, kind: "armored", x: -650, y: 0, radius: 20, health: 20, generation: "1:1:test" }
      ]
    };
    const width = 1280;
    const height = 720;
    const candidates = [];
    const entries = [];
    const baseEntries = debug.offscreenIndicators(state, { width, height }, candidates, entries);
    assert.ok(baseEntries.length > 0 && baseEntries.length <= CONFIG.targetIndicators.maxVisible);
    assert.ok(baseEntries.every((entry) => entry.x >= CONFIG.targetIndicators.edgeMargin - 1e-7 &&
      entry.x <= width - CONFIG.targetIndicators.edgeMargin + 1e-7));
    assert.ok(baseEntries.every((entry) => entry.y >= CONFIG.targetIndicators.topMargin - 1e-7 &&
      entry.y <= height - CONFIG.targetIndicators.bottomMargin + 1e-7));
    const node = baseEntries.find((entry) => entry.family === "bossNode");
    assert.equal(node && node.assetKey, "bossNodeLeviathan", "living boss node lacked its authored indicator art");
    assert.equal(baseEntries.some((entry) => entry.family === "boss"), false,
      "damage-reduced boss body competed with its actionable node indicator");
    const rocks = baseEntries.find((entry) => entry.assetKey === "commonAsteroid");
    assert.equal(rocks && rocks.count, 2, "nearby off-screen rocks did not cluster into one bounded cue");
    assert.equal(baseEntries.some((entry) => entry.id === 31 || entry.id === 12 || entry.id === 13), false,
      "visible, partially visible, or stale-generation targets received an off-screen cue");

    for (let index = 0; index < 12; index += 1) {
      const angle = index / 12 * Math.PI * 2;
      state.aliens.push({
        id: 100 + index,
        type: "lancer",
        x: Math.cos(angle) * 1000,
        y: Math.sin(angle) * 1000,
        health: 20,
        generation: "1:1:test"
      });
    }
    const firstEntry = entries[0];
    const saturatedEntries = debug.offscreenIndicators(state, { width, height }, candidates, entries);
    assert.equal(saturatedEntries[0], firstEntry, "renderer indicator buffers were not reused");
    assert.ok(saturatedEntries.length <= CONFIG.targetIndicators.maxVisible);
    assert.equal(saturatedEntries.reduce((total, entry) => total + entry.count, 0), 16,
      "indicator clustering dropped a live off-screen objective");
    assert.equal(debug.offscreenIndicators({}, { width, height }, candidates, entries).length, 0,
      "missing gameplay state retained stale indicator entries");
  });

  test("pending game over renders death effects without ship-owned visuals", () => {
    const browser = buildBrowser({ now: 1700000000000 });
    loadRuntimeScripts(browser);
    browser.document.readyState = "interactive";
    browser.emit(browser.document, "DOMContentLoaded");
    const canvas = browser.elements.get("game");
    const game = browser.window.ND.game;
    const renderer = new browser.window.ND.Renderer(canvas);
    game.start();
    const state = game.state;
    for (const name of ["pickups", "mines", "asteroids", "aliens", "enemyBullets", "playerBullets", "floaters"]) {
      state[name].length = 0;
    }
    state.boss = null;
    state.shake = 0;
    state.flash = 0;
    state.presentation.gameoverPending = true;
    state.mode = "gameover";

    const shipOwnedCalls = [];
    const effectLayers = [];
    renderer.drawBackground = () => {};
    renderer.drawCombatField = () => {};
    renderer.drawPlayerFields = () => { shipOwnedCalls.push("fields"); };
    renderer.drawDrones = () => { shipOwnedCalls.push("drones"); };
    renderer.drawShip = () => { shipOwnedCalls.push("ship"); };
    renderer.drawOrbitBlades = () => { shipOwnedCalls.push("blades"); };
    renderer.drawReticle = () => { shipOwnedCalls.push("reticle"); };
    renderer.drawEffects = (_effects, _camera, layer) => { effectLayers.push(layer); };
    renderer.drawTimeFracture = () => {};

    renderer.render(state, 3, true);
    assert.deepEqual(shipOwnedCalls, [], "pending defeat drew ship-owned presentation");
    assert.deepEqual(effectLayers, ["back", "front"], "pending defeat did not retain both death-effect layers");

    state.presentation.gameoverPending = false;
    effectLayers.length = 0;
    renderer.render(state, 3, true);
    assert.deepEqual(shipOwnedCalls, [], "defeated ship returned behind the game-over dialog");
    assert.deepEqual(effectLayers, ["back", "front"]);

    state.mode = "playing";
    effectLayers.length = 0;
    renderer.render(state, 3, true);
    assert.deepEqual(shipOwnedCalls, ["fields", "drones", "ship", "blades", "reticle"],
      "positive control did not exercise every ship-owned renderer path");
    assert.deepEqual(effectLayers, ["back", "front"]);
  });

  test("camera shake and full-screen flashes are independent opt-in presentation settings", () => {
    const browser = buildBrowser({ now: 1700000000000 });
    loadRuntimeScripts(browser);
    browser.document.readyState = "interactive";
    browser.emit(browser.document, "DOMContentLoaded");
    const canvas = browser.elements.get("game");
    const game = browser.window.ND.game;
    const renderer = new browser.window.ND.Renderer(canvas);
    game.start();
    const state = game.state;
    state.shake = 12;
    state.flash = 1;
    state.settings.cameraShake = false;
    state.settings.damageFlash = false;

    const translations = [];
    const fullScreenFills = [];
    const context = canvas.getContext("2d");
    context.translate = (x, y) => { translations.push([x, y]); };
    context.fillRect = (x, y, width, height) => { fullScreenFills.push([x, y, width, height]); };
    renderer.drawBackground = () => {};
    renderer.drawCombatField = () => {};
    renderer.drawEffects = () => {};
    renderer.drawPlayerFields = () => {};
    renderer.drawPickup = () => {};
    renderer.drawMine = () => {};
    renderer.drawAsteroid = () => {};
    renderer.drawAlien = () => {};
    renderer.drawBoss = () => {};
    renderer.drawProjectiles = () => {};
    renderer.drawDrones = () => {};
    renderer.drawShip = () => {};
    renderer.drawOrbitBlades = () => {};
    renderer.drawFloaters = () => {};
    renderer.drawReticle = () => {};
    renderer.drawOffscreenIndicators = () => {};
    renderer.drawTimeFracture = () => {};

    renderer.render(state, 3, true);
    assert.equal(Math.abs(translations.at(-1)[0]) + Math.abs(translations.at(-1)[1]), 0,
      "default-off camera shake moved the view");
    assert.deepEqual(fullScreenFills, [], "default-off screen flashes painted the viewport");

    const originalRandom = browser.window.Math.random;
    browser.window.Math.random = () => 1;
    state.settings.cameraShake = true;
    state.settings.damageFlash = true;
    renderer.render(state, 3, true);
    browser.window.Math.random = originalRandom;
    assert.deepEqual(translations.at(-1), [12, 12], "enabled camera shake did not use the bounded impact value");
    assert.deepEqual(fullScreenFills.at(-1), [0, 0, renderer.width, renderer.height],
      "enabled screen flash did not cover the renderer viewport");
  });

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
    const scenes = Array.from({ length: 7 }, (_, index) => debug.sceneFrame(index + 1, 1, 0));
    const body = (scene, id) => scene.bodies.find((item) => item.id === id);
    const earth1 = body(scenes[0], "earth");
    const mars1 = body(scenes[0], "mars");
    const mars2 = body(scenes[1], "mars");
    const titan2 = body(scenes[1], "titan-gate");
    const signal3 = body(scenes[2], "signal-world");
    assert.ok(earth1.alpha > 0.8 && earth1.size > 0.5, "Earth is not the prominent Stage 1 origin");
    assert.ok(mars2.alpha > mars1.alpha && mars2.size > mars1.size, "Mars did not become the Stage 2 waypoint");
    assert.ok(titan2.alpha > 0.7 && titan2.size > 0.5, "Titan is not prominent during its breach");
    assert.ok(signal3.alpha > 0.6 && signal3.size > 0.3, "First Contact lacks its deep-space signal world");
    assert.equal(body(scenes[1], "earth"), undefined, "Earth did not leave the frame after Stage 1");
    assert.equal(body(scenes[2], "mars"), undefined, "Mars did not leave the frame before First Contact");
    for (let index = 1; index < scenes.length; index += 1) {
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
    for (let stage = 2; stage <= 7; stage += 1) {
      const visible = debug.sceneFrame(stage, 1, 0).visibleBodies.filter((item) => item.alpha > 0.15);
      assert.ok(visible.length > 0, `Stage ${stage} lacks a main authored world`);
      for (const body of visible) {
        assert.ok(debug.assetSource(body.type), `Stage ${stage} uses missing local art ${body.type}`);
        types.add(body.type);
      }
    }
    for (const type of expected) assert.ok(types.has(type), `${type} never appears in the seven-stage journey`);
    for (const type of ["earth", "mars"].concat(expected)) {
      assert.equal(debug.assetSource(type), `assets/${type}.webp`);
    }
    assert.equal(debug.assetSource("exotic"), null);
    assert.equal(debug.assetSource("unknown-world"), null);
    const renderer = readProject("js/render.js");
    assert.doesNotMatch(renderer, /drawExoticPlanet|type:\s*["']exotic["']|\.rings\b/, "the old procedural ring/band planet path remains in runtime code");
  });

  test("the complete gameplay presentation uses the authored local raster set", () => {
    const browser = loadVisualRuntime();
    const debug = browser.window.ND.RenderDebug;
    const expected = {
      playerInterceptor: "assets/player-interceptor.webp",
      commonAsteroid: "assets/common-asteroid.webp",
      asteroidCrystal: "assets/asteroid-crystal.webp",
      asteroidVolatile: "assets/asteroid-volatile.webp",
      asteroidArmored: "assets/asteroid-armored.webp",
      asteroidColossal: "assets/asteroid-colossal.webp",
      asteroidTitan: "assets/asteroid-titan.webp",
      asteroidRazor: "assets/asteroid-razor.webp",
      asteroidPrismatic: "assets/asteroid-prismatic.webp",
      asteroidMonolith: "assets/asteroid-monolith.webp",
      asteroidAuricColossus: "assets/asteroid-auric-colossus.webp",
      asteroidAuricShardExplosive: "assets/asteroid-auric-shard-explosive.webp",
      asteroidAuricShardMagnetic: "assets/asteroid-auric-shard-magnetic.webp",
      asteroidCorona: "assets/asteroid-corona.webp",
      alienScout: "assets/alien-scout.webp",
      alienStriker: "assets/alien-striker.webp",
      alienBomber: "assets/alien-bomber.webp",
      alienCarrier: "assets/alien-carrier.webp",
      alienLancer: "assets/alien-lancer.webp",
      alienGunship: "assets/alien-gunship.webp",
      alienBroodCarrier: "assets/alien-brood-carrier.webp",
      bossHarrower: "assets/boss-harrower.webp",
      bossLeviathan: "assets/boss-leviathan.webp",
      bossNodeHarrower: "assets/boss-node-harrower.webp",
      bossNodeLeviathan: "assets/boss-node-leviathan.webp",
      playerPlasma: "assets/player-plasma.webp",
      playerMissile: "assets/player-missile.webp",
      playerRailSlug: "assets/player-rail-slug.webp",
      playerPrism: "assets/player-prism.webp",
      playerRadial: "assets/player-radial.webp",
      playerArc: "assets/player-arc.webp",
      playerLance: "assets/player-lance.webp",
      dronePlasma: "assets/drone-plasma.webp",
      alienPlasma: "assets/alien-plasma.webp",
      reflectedPlasma: "assets/reflected-plasma.webp",
      plasmaImpact: "assets/plasma-impact.webp",
      shieldImpact: "assets/shield-impact.webp",
      hullImpact: "assets/hull-impact.webp",
      asteroidBreak: "assets/asteroid-break.webp",
      explosionBurst: "assets/explosion-burst.webp",
      shieldGenerator: "assets/shield-generator.webp",
      pickupChassis: "assets/pickup-chassis.webp",
      pickupOverdrive: "assets/pickup-overdrive.webp",
      guardianDrone: "assets/guardian-drone.webp",
      orbitBlade: "assets/orbit-blade.webp",
      playerMine: "assets/player-mine.webp",
      alienMine: "assets/alien-mine.webp"
    };
    for (const [name, source] of Object.entries(expected)) assert.equal(debug.gameplayAssetSource(name), source);
    assert.equal(debug.gameplayAssetSource("unknown-gameplay-art"), null);

    const canvas = browser.elements.get("game");
    const context = canvas.getContext("2d");
    const renderer = new browser.window.ND.Renderer(canvas);
    const camera = { x: 0, y: 0 };
    const drawn = [];
    context.drawImage = (image) => { drawn.push(image.src); };
    renderer.drawShip({
      x: 0, y: 0, angle: 0, engine: 1, invulnerable: 0, shield: 0, aegisTimer: 0
    }, camera, 1, false, {});
    const asteroidCases = [
      ["rock"], ["crystal"], ["volatile"], ["armored"], ["colossal"], ["titan"],
      ["razor"], ["prismatic"], ["monolith"], ["auricColossus"],
      ["auricShard", "explosive"], ["auricShard", "magnetic"], ["corona"]
    ];
    for (const [kind, hazardVariant] of asteroidCases) renderer.drawAsteroid({
      x: 0, y: 0, radius: 30, kind, hazardVariant, rotation: 0, phase: 0, points: [],
      health: 3, maxHealth: 3, hitFlash: 0
    }, camera, 1);
    for (const type of ["scout", "striker", "bomber", "carrier", "lancer", "gunship", "broodCarrier"]) {
      renderer.drawAlien({ x: 0, y: 0, radius: 24, type, heading: 0, phase: 0 }, camera, 1);
    }
    for (const type of ["harrower", "leviathan"]) renderer.drawBoss({
      x: 0, y: 0, radius: type === "leviathan" ? 96 : 82, type, angle: 0,
      nodes: [{ x: 12, y: 0, radius: 13, index: 0, health: 1 }]
    }, camera, 1);
    renderer.drawProjectiles([
      { x: 0, y: 0, vx: 1, vy: 0, kind: "bolt" },
      { x: 0, y: 0, vx: 1, vy: 0, kind: "missile" },
      { x: 0, y: 0, vx: 1, vy: 0, kind: "rail" },
      { x: 0, y: 0, vx: 1, vy: 0, kind: "prism" },
      { x: 0, y: 0, vx: 1, vy: 0, kind: "radial" },
      { x: 0, y: 0, vx: 1, vy: 0, kind: "arc" },
      { x: 0, y: 0, vx: 1, vy: 0, kind: "lance" },
      { x: 0, y: 0, vx: 1, vy: 0, kind: "droneBolt" }
    ], camera, false);
    renderer.drawProjectiles([
      { x: 0, y: 0, vx: 1, vy: 0 },
      { x: 0, y: 0, vx: 1, vy: 0, kind: "reflected" },
      { x: 0, y: 0, vx: 1, vy: 0, kind: "crystalShard" }
    ], camera, true);
    for (const kind of ["shield", "repair", "rapid", "module", "triShot", "piercing", "arcBurst", "novaLance", "amplifier", "aegis", "pulseCharge", "enigma", "thruster"]) {
      renderer.drawPickup({ x: 0, y: 0, kind, phase: 0 }, camera, 1);
    }
    renderer.drawMine({ x: 0, y: 0, radius: 11, owner: "player", triggerRadius: 0, phase: 0 }, camera, 1);
    renderer.drawMine({ x: 0, y: 0, radius: 15, owner: "enemy", phase: 0, armed: true }, camera, 1);
    renderer.drawDrones({ ship: { drones: [{ x: 0, y: 0, angle: 0 }] }, camera });
    renderer.drawOrbitBlades({ ship: { orbitBlades: [{ x: 0, y: 0, angle: 0, radius: 9 }] }, camera });
    const effects = ["plasma", "shield", "hull", "asteroid", "alien", "boss", "explosion"].map((material) => ({
      x: 0, y: 0, type: "sprite", material, layer: "front", color: "#ffffff",
      life: 0.2, maxLife: 0.3, size: 48
    }));
    effects.push({
      x: 0, y: 0, type: "ring", layer: "front", color: "#8ffcff",
      life: 0.2, maxLife: 0.3, radius: 20, startRadius: 4, targetRadius: 48
    });
    renderer.drawEffects(effects, camera, "front");
    assert.deepEqual([...new Set(drawn)].sort(), Object.values(expected).sort());
  });

  test("raster-backed gameplay uses material effects instead of legacy decorative line overlays", () => {
    const browser = loadVisualRuntime();
    const canvas = browser.elements.get("game");
    const context = canvas.getContext("2d");
    const renderer = new browser.window.ND.Renderer(canvas);
    const camera = { x: 0, y: 0 };
    let strokes = 0;
    let rectangles = 0;
    let rasterDraws = 0;
    context.stroke = () => { strokes += 1; };
    context.fillRect = () => { rectangles += 1; };
    context.drawImage = () => { rasterDraws += 1; };

    for (const type of ["scout", "striker", "bomber", "carrier", "lancer", "gunship", "broodCarrier"]) {
      strokes = 0;
      rasterDraws = 0;
      renderer.drawAlien({
        x: 0, y: 0, radius: 24, type, heading: 0, phase: 0,
        aimAngle: Math.PI * 0.25, state: "approach"
      }, camera, 1);
      assert.equal(rasterDraws, 1, `${type} did not use its authored raster`);
      assert.equal(strokes, 0, `${type} retained decorative engine, aim, or outline strokes`);
    }

    strokes = 0;
    renderer.drawShip({
      x: 0, y: 0, angle: 0, engine: 1, invulnerable: 0,
      hull: 100, maxHull: 100, shield: 80, aegisTimer: 20
    }, camera, 1, false, {});
    assert.equal(strokes, 0, "raster player shield retained a rotating dashed line");

    strokes = 0;
    renderer.drawAsteroid({
      x: 0, y: 0, radius: 30, kind: "auricShard", hazardVariant: "magnetic",
      rotation: 0, phase: 0, points: [], health: 3, maxHealth: 3, hitFlash: 0
    }, camera, 1);
    assert.equal(strokes, 0, "raster magnetic shard retained a dashed decorative ring");

    strokes = 0;
    rasterDraws = 0;
    const rapidDraws = [];
    context.drawImage = (image) => { rasterDraws += 1; rapidDraws.push(image.src); };
    renderer.drawPickup({ x: 0, y: 0, kind: "rapid", phase: 0 }, camera, 1);
    assert.equal(rasterDraws, 1, "Overdrive did not use its authored raster");
    assert.deepEqual(rapidDraws, ["assets/pickup-overdrive.webp"]);
    assert.equal(strokes, 0, "ready Overdrive raster retained the legacy three-line glyph");

    strokes = 0;
    rectangles = 0;
    renderer.drawEffects([
      {
        x: 0, y: 0, type: "ring", layer: "front", color: "#8ffcff",
        life: 0.2, maxLife: 0.3, radius: 20, startRadius: 4, targetRadius: 48
      },
      {
        x: 10, y: 10, type: "particle", layer: "front", color: "#ff5577",
        life: 0.2, maxLife: 0.3, size: 5
      }
    ], camera, "front");
    assert.equal(strokes, 0, "authored impact raster retained a duplicate circle");
    assert.equal(rectangles, 0, "generic debris retained the old square-pixel treatment");

    const source = readProject("js/render.js");
    assert.doesNotMatch(source, /ctx\.moveTo\(4,\s*0\)[\s\S]{0,180}alien\.radius/,
      "the obsolete alien aim spine remains in renderer source");
  });

  test("alien rasters remain readable at play scale and expose progressive damage without line overlays", () => {
    const browser = loadVisualRuntime();
    const debug = browser.window.ND.RenderDebug;
    assert.equal(typeof debug.alienDamageStage, "function");
    assert.equal(debug.alienDamageStage({ health: 100, maxHealth: 100 }), 0);
    assert.equal(debug.alienDamageStage({ health: 59, maxHealth: 100 }), 1);
    assert.equal(debug.alienDamageStage({ health: 34, maxHealth: 100 }), 2);
    assert.equal(debug.alienDamageStage({ health: 17, maxHealth: 100 }), 3);
    assert.equal(debug.alienDamageStage({ health: NaN, maxHealth: 100 }), 0);

    const canvas = browser.elements.get("game");
    const context = canvas.getContext("2d");
    const renderer = new browser.window.ND.Renderer(canvas);
    const camera = { x: 0, y: 0 };
    const expectedSizes = {
      scout: [76, 51], striker: [84, 56], bomber: [96, 64], carrier: [122, 81],
      lancer: [90, 60], gunship: [114, 76], broodCarrier: [154, 103]
    };
    const rasterSizes = {};
    context.drawImage = (image, _x, _y, width, height) => {
      if (image.src.includes("alien-")) rasterSizes[image.src] = [width, height];
    };
    for (const type of Object.keys(expectedSizes)) {
      renderer.drawAlien({
        id: 40, x: 0, y: 0, radius: 24, type, heading: 0, phase: 0,
        health: 100, maxHealth: 100, state: "approach"
      }, camera, 1);
      const source = debug.gameplayAssetSource(`alien${type[0].toUpperCase()}${type.slice(1)}`);
      assert.deepEqual(rasterSizes[source], expectedSizes[type], `${type} play-scale raster size`);
    }

    let arcs = 0;
    let radialGradients = 0;
    let strokes = 0;
    context.arc = () => { arcs += 1; };
    context.stroke = () => { strokes += 1; };
    const createRadialGradient = context.createRadialGradient;
    context.createRadialGradient = (...args) => {
      radialGradients += 1;
      return createRadialGradient(...args);
    };
    renderer.drawAlien({
      id: 41, x: 0, y: 0, radius: 17, type: "scout", heading: 0, phase: 0,
      health: 100, maxHealth: 100, state: "approach"
    }, camera, 1);
    const healthyArcs = arcs;
    const healthyGradients = radialGradients;
    arcs = 0;
    radialGradients = 0;
    renderer.drawAlien({
      id: 41, x: 0, y: 0, radius: 17, type: "scout", heading: 0, phase: 0,
      health: 17, maxHealth: 100, state: "approach"
    }, camera, 1);
    assert.ok(arcs >= healthyArcs + 4, "critical alien damage did not add attached smoke and burn emission");
    assert.ok(radialGradients >= healthyGradients + 1, "critical alien damage did not add its soft internal burn glow");
    assert.equal(strokes, 0, "alien readability or damage state restored a procedural line overlay");
  });

  test("all seven scene handoffs interpolate continuously, including the sector wrap", () => {
    const debug = loadRenderer();
    const activeMap = (scene) => new Map(scene.bodies.filter((body) => body.alpha > 1e-10).map((body) => [body.id, body]));
    for (let stage = 1; stage <= 7; stage += 1) {
      const sector = 1;
      const nextStage = stage === 7 ? 1 : stage + 1;
      const nextSector = stage === 7 ? 2 : sector;
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
    assert.equal(debug.sceneFrame(99, 1, 99).fromStage, 7);
    assert.equal(debug.sceneFrame(1, 1, Infinity).progress, 1);
    assert.equal(debug.sceneFrame(1, 1, NaN).progress, 0);
  });

  test("late-stage and boss nebula washes share the same continuous handoff weights", () => {
    const renderer = readProject("js/render.js");
    assert.match(renderer, /const lateStage = clamp\(\(index - 2\)/,
      "late-stage nebula intensity is not derived from encounter progression");
    assert.match(renderer, /if \(lateStage > 0 \|\| bossType\) \{[\s\S]*?nebula = this\.ctx\.createRadialGradient/,
      "late stages and boss scenes do not receive a local nebula wash");
    assert.match(renderer, /if \(bossType\) \{[\s\S]*?bossNebula = this\.ctx\.createRadialGradient/,
      "boss scenes lack their distinct nebula layer");
    assert.match(renderer, /renderWash\(fromStage, 1 - progress\);\s*renderWash\(toStage, progress\);/,
      "nebula washes no longer crossfade with the authored scene handoff");
    assert.match(renderer, /if \(wash\.nebula\) \{[\s\S]*?\* alpha;/,
      "nebula opacity ignores the scene handoff weight");
    assert.match(renderer, /if \(wash\.bossNebula\) \{[\s\S]*?\* alpha;/,
      "boss nebula opacity ignores the scene handoff weight");
  });

  test("Enigma card previews are local canvases with deterministic reduced animation", () => {
    const runtime = loadVisualRuntime();
    const preview = runtime.window.ND.EnigmaPreview;
    assert.ok(preview && typeof preview.render === "function", "Enigma preview renderer is unavailable");
    const choice = {
      id: "module:teslaCoil",
      enhancementId: "teslaCoil",
      kind: "module",
      activation: "autonomous",
      nextTier: 4
    };
    const reducedFirst = recordingCanvas();
    const reducedLater = recordingCanvas();
    assert.equal(preview.render(reducedFirst.canvas, choice, 1, true), true);
    assert.equal(preview.render(reducedLater.canvas, choice, 999, true), true);
    assert.deepEqual(reducedFirst.operations, reducedLater.operations,
      "reduced-effects previews changed with wall-clock time");
    assert.deepEqual([reducedFirst.canvas.width, reducedFirst.canvas.height], [240, 64]);
    assert.ok(reducedFirst.operations.some((operation) => operation[0] === "stroke"),
      "preview rendered no visible vector action");

    const animatedFirst = recordingCanvas();
    const animatedLater = recordingCanvas();
    preview.render(animatedFirst.canvas, choice, 1, false);
    preview.render(animatedLater.canvas, choice, 2, false);
    assert.notDeepEqual(animatedFirst.operations, animatedLater.operations,
      "normal previews lost their restrained animation");
    assert.equal(preview.render(null, choice, 0, false), false);
    assert.equal(preview.render({ getContext: () => null }, choice, 0, false), false);
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
      phase: "travel",
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

    const clear = debug.cinematicProfile({
      mode: "transition",
      cinematic: { ...activeCinematic, phase: "clear" }
    }, false);
    assert.equal(clear.streaks, false, "the stage-clear hold rendered hyperspace streaks");
    assert.equal(clear.intensity, 0);

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
      cinematic: { active: true, phase: "travel", duration: 0, elapsed: Infinity, progress: 99, directionX: 0, directionY: 0, speed: 999999 }
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
    assert.equal(typeof debug.asteroidFracturePattern, "function");
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

    const patterns = [0, 1, 2].map((id) => JSON.parse(JSON.stringify(debug.asteroidFracturePattern({ id }))));
    assert.equal(new Set(patterns.map((pattern) => JSON.stringify(pattern))).size, 3,
      "asteroids reused one obvious fracture overlay");
    for (const pattern of patterns) {
      assert.deepEqual([1, 2, 3].map((stage) => pattern.filter((fracture) => fracture.stage <= stage).length), [1, 3, 5]);
      assert.ok(pattern.every((fracture) => fracture.points.length >= 3), "fracture branch remained a straight two-point slash");
      assert.ok(pattern.flatMap((fracture) => fracture.points).every(([x, y]) => Math.abs(x) <= 0.55 && Math.abs(y) <= 0.55),
        "fracture overlay escaped the asteroid material core");
    }
    const renderer = readProject("js/render.js");
    assert.doesNotMatch(renderer, /0\.014\s*\+\s*crackStage/, "the oversized legacy neon crack width remains");
    assert.match(renderer, /clamp\(asteroid\.radius \* 0\.0035, 0\.5, 1\.05\)/,
      "fine material fracture highlight is missing");
  });

  test("ship damage states and pickup identities remain explicit and touch-safe", () => {
    const debug = loadRenderer();
    assert.equal(typeof debug.playerDamageStage, "function");
    assert.equal(debug.playerDamageStage({ hull: 100, maxHull: 100 }), 0);
    assert.equal(debug.playerDamageStage({ hull: 59, maxHull: 100 }), 1);
    assert.equal(debug.playerDamageStage({ hull: 34, maxHull: 100 }), 2);
    assert.equal(debug.playerDamageStage({ hull: 17, maxHull: 100 }), 3);
    assert.equal(debug.playerDamageStage({ hull: NaN, maxHull: 100 }), 0);

    const expectedLabels = {
      shield: "SHIELD",
      rapid: "RAPID",
      triShot: "TRI",
      piercing: "PHASE",
      arcBurst: "ARC",
      novaLance: "LANCE",
      amplifier: "AMP",
      aegis: "AEGIS",
      repair: "HULL",
      module: "MODULE",
      pulseCharge: "PULSE",
      enigma: "ENIGMA",
      thruster: "THRUST"
    };
    for (const [kind, label] of Object.entries(expectedLabels)) {
      const identity = debug.pickupIdentity(kind);
      assert.equal(identity.label, label, `${kind} pickup label`);
      assert.match(identity.color, /^#[0-9a-f]{6}$/i, `${kind} pickup color`);
    }
    assert.equal(new Set(Object.values(expectedLabels)).size, Object.keys(expectedLabels).length,
      "two power-ups share the same visible label");

    const html = readProject("index.html");
    const css = readProject("styles.css");
    assert.match(html, /class="desktop-control-hint"[^>]*><kbd>Shift<\/kbd> Dash [\s\S]*<kbd>E<\/kbd> Pulse/,
      "desktop play lacks visible Dash and Pulse keys");
    assert.match(css, /\.desktop-control-hint\s+kbd\s*\{/);
    assert.match(css, /\.is-touch-capable\s+\.desktop-control-hint\s*\{[^}]*display:\s*none/s);
    assert.match(css, /@media\s*\(pointer:\s*coarse\)[\s\S]*?\.desktop-control-hint\s*\{[^}]*display:\s*none/s);
  });

  test("touch landscape HUD replaces chip spam with one pointer-transparent summary per row", () => {
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
    const declarationsFor = (selector) => {
      const declarations = [...compact.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
        .filter((match) => match[1].split(",").map((part) => part.trim()).includes(selector))
        .map((match) => match[2]);
      assert.ok(declarations.length > 0, `${selector} compact rule is missing`);
      return declarations.join("\n");
    };
    for (const selector of [
      ".is-touch-capable .record-readout",
      ".is-touch-capable .objective-label",
      ".is-touch-capable .loadout-readouts .module-heading"
    ]) {
      const declarations = declarationsFor(selector);
      assert.match(declarations, /position:\s*absolute/);
      assert.match(declarations, /width:\s*1px/);
      assert.match(declarations, /height:\s*1px/);
      assert.match(declarations, /clip:\s*rect\(0,\s*0,\s*0,\s*0\)/);
      assert.doesNotMatch(declarations, /display:\s*none/, `${selector} was removed from assistive technology`);
    }
    const loadoutDeclarations = rule(".is-touch-capable .module-strip,\n  .is-touch-capable .active-effects-list");
    assert.match(loadoutDeclarations, /flex-wrap:\s*nowrap/);
    assert.match(loadoutDeclarations, /justify-content:\s*center/);
    assert.match(loadoutDeclarations, /overflow-x:\s*hidden/);
    assert.match(loadoutDeclarations, /overflow-y:\s*hidden/);
    assert.match(loadoutDeclarations, /pointer-events:\s*none/);
    const hiddenChips = rule(".is-touch-capable .module-slot,\n  .is-touch-capable .active-effect-chip");
    assert.match(hiddenChips, /display:\s*none/);
    const visibleSummaries = rule(".is-touch-capable .module-compact-summary,\n  .is-touch-capable .active-effect-compact-summary");
    assert.match(visibleSummaries, /display:\s*inline-flex/);
    const baseSummary = css.match(/\.module-compact-summary,\s*\.active-effect-compact-summary\s*\{([^}]*)\}/s);
    assert.ok(baseSummary, "desktop compact-summary base rule is missing");
    assert.match(baseSummary[1], /display:\s*none/);
    assert.doesNotMatch(loadoutDeclarations, /(?:width|height):\s*1px|clip:\s*rect/, "owned summary rows were visually clipped");
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
    assert.match(compact, /\.upgrade-card-preview-frame\s*\{[^}]*height:\s*clamp\(36px,\s*8vh,\s*44px\)/s);
    assert.match(css, /\.upgrade-card-preview\s*\{[^}]*pointer-events:\s*none/s,
      "decorative previews can intercept card input");
    assert.match(renderer, /enigma:\s*"#c584ff"/);
    assert.match(renderer, /enigma:\s*"ENIGMA"/);
    assert.match(renderer, /drawTimeFracture\(state\)/);
    assert.match(renderer, /sourceModule\s*===\s*"homingSalvo"/);
    assert.match(renderer, /bullet\.kind\s*===\s*"radial"/);
    assert.match(renderer, /effect\.type\s*===\s*"chain"/);
    assert.match(renderer, /state\.ship\s*&&\s*state\.ship\.orbitBlades/);
    assert.match(renderer, /mine\.owner\s*===\s*"player"/);
    assert.match(renderer, /boss\.type\s*===\s*"leviathan"/);
    assert.match(renderer, /this\.drawCombatField\(state, time\)/,
      "boss stages cannot reuse the normal field cues");
    assert.doesNotMatch(renderer, /drawArena\s*\(/,
      "the removed glowing boss boundary is still rendered");
    assert.match(renderer, /amplifier:\s*"#ffb45f"/);
    assert.match(renderer, /aegis:\s*"#7bdcff"/);
    assert.match(renderer, /thruster:\s*"#72c8ff"/);
  });

  test("the menu local record uses the space-theme cyan accent", () => {
    const css = readProject("styles.css");
    const match = css.match(/\.menu-meta\s+strong\s*\{([^}]*)\}/s);
    assert.ok(match, "menu record style is missing");
    assert.match(match[1], /color:\s*var\(--cyan(?:-strong)?\)/);
    assert.doesNotMatch(match[1], /var\(--gold\)/);
  });

  test("menu metadata remains legible against the menu background", () => {
    const css = readProject("styles.css");
    const root = css.match(/:root\s*\{([^}]*)\}/s);
    const menu = css.match(/\.menu-meta\s*\{([^}]*)\}/s);
    assert.ok(root && menu, "menu metadata styles are missing");

    const variable = (name) => {
      const match = root[1].match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"));
      assert.ok(match, `--${name} color is missing`);
      return match[1];
    };
    const luminance = (hex) => {
      const channels = hex.slice(1).match(/.{2}/g).map((channel) => parseInt(channel, 16) / 255);
      const [red, green, blue] = channels.map((channel) => (
        channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
      ));
      return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
    };
    const foreground = luminance(variable("ink-dim"));
    const background = luminance(variable("void"));
    const contrast = (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    const size = menu[1].match(/font-size:\s*([\d.]+)rem/);

    assert.match(menu[1], /color:\s*var\(--ink-dim\)/);
    assert.ok(size && Number(size[1]) >= 0.6, "menu metadata regressed below its legible size floor");
    assert.ok(contrast >= 4.5, `menu metadata contrast ${contrast.toFixed(2)}:1 is below 4.5:1`);
  });
};
