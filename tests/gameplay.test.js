"use strict";

const { assert, vm, readProject, approximately } = require("./_harness");
const browserSmoke = require("./browser-smoke.test");

const SCRIPTS = ["js/config.js", "js/core.js", "js/audio.js", "js/render.js", "js/game.js"];

function boot(seed, viewport) {
  const browser = browserSmoke.buildBrowser({ now: 1700000000000 + (seed || 0) });
  if (viewport) {
    browser.window.innerWidth = viewport.width;
    browser.window.innerHeight = viewport.height;
  }
  for (const script of SCRIPTS) vm.runInContext(readProject(script), browser.context, { filename: script, timeout: 3000 });
  browser.document.readyState = "interactive";
  browser.emit(browser.document, "DOMContentLoaded");
  const game = browser.window.ND.game;
  assert.ok(game && typeof game.step === "function" && typeof game.setStage === "function", "debug contract is unavailable");
  game.start();
  game.setSeed(seed || 1);
  game.state.ship.invulnerable = 1e9;
  return { browser, game, CONFIG: browser.window.ND.CONFIG, Core: browser.window.ND.Core };
}

function clearEntities(state) {
  for (const name of ["asteroids", "aliens", "playerBullets", "enemyBullets", "mines", "pickups", "effects", "floaters"]) {
    state[name].length = 0;
  }
}

function freezeDirector(state) {
  const data = state.encounterData;
  if (!data || data.spec.id === "boss") return;
  data.pendingSpawns.length = 0;
  data.requeue.length = 0;
  data.waveSpawned = true;
  data.waveDelay = Infinity;
  data.waveRequiredTotal = 1;
  data.waveRequiredCleared = 0;
  data.goalProgress = 0;
  data.complete = false;
}

function runSteps(game, seconds, fixedStep, eachStep) {
  const total = Math.ceil(seconds / fixedStep);
  for (let index = 0; index < total; index += 1) {
    game.step(fixedStep);
    if (eachStep) eachStep(index);
  }
}

function living(state) {
  return state.asteroids.concat(state.aliens).filter((entity) => !entity.dead);
}

function requiredLiving(state) {
  const data = state.encounterData;
  return living(state).filter((entity) => entity.required && entity.generation === data.generation && entity.waveIndex === data.waveIndex);
}

function advanceToWave(game, waveNumber, fixedStep) {
  const limit = Math.ceil(2 / fixedStep);
  for (let frame = 0; frame < limit && game.state.encounterData.waveNumber < waveNumber; frame += 1) game.step(fixedStep);
  assert.equal(game.state.encounterData.waveNumber, waveNumber, `wave ${waveNumber} did not begin`);
}

module.exports = function register(test) {
  test("every asteroid variant stays ballistic and produces no attacks for sixty seconds", () => {
    for (const kind of ["rock", "crystal", "volatile", "armored", "colossal", "titan"]) {
      const { game, CONFIG } = boot(100 + kind.length);
      const state = game.state;
      game.setStage(1, 1);
      clearEntities(state);
      freezeDirector(state);
      state.ship.x = state.combatField.x - state.combatField.halfWidth + state.ship.radius;
      state.ship.y = state.combatField.y;
      state.ship.vx = 0;
      state.ship.vy = 0;
      const asteroid = game.spawnAsteroid(kind, {
        x: 100,
        y: 0,
        velocityAngle: Math.PI / 2,
        speed: 0.25,
        health: 100000,
        required: false,
        threatCost: 0
      });
      assert.ok(asteroid);
      const speed = Math.hypot(asteroid.vx, asteroid.vy);
      const angle = Math.atan2(asteroid.vy, asteroid.vx);
      runSteps(game, 60, CONFIG.world.fixedStep, () => {
        approximately(Math.hypot(asteroid.vx, asteroid.vy), speed, 1e-7, `${kind} speed`);
        approximately(Math.atan2(asteroid.vy, asteroid.vx), angle, 1e-7, `${kind} direction`);
        assert.equal(state.enemyBullets.length, 0, `${kind} fired an enemy projectile`);
        assert.equal(state.mines.length, 0, `${kind} created a mine`);
      });
    }
  });

  test("alien spacecraft retain ranged attack behavior", () => {
    const { game, CONFIG } = boot(201);
    const state = game.state;
    game.setStage(3, 1);
    clearEntities(state);
    freezeDirector(state);
    state.ship.x = 0;
    state.ship.y = 0;
    const scout = game.spawnAlien("scout", { x: 180, y: 0, required: false, threatCost: 0 });
    scout.cooldown = 0;
    runSteps(game, 0.1, CONFIG.world.fixedStep);
    assert.ok(state.enemyBullets.length > 0, "Scout ship did not fire");
    assert.ok(state.enemyBullets.every((bullet) => Number.isFinite(bullet.vx) && Number.isFinite(bullet.vy)));
  });

  test("asteroid impact destroys a required alien once, advances its wave once, and grants no reward", () => {
    const { game } = boot(301);
    const state = game.state;
    game.setStage(3, 1);
    clearEntities(state);
    freezeDirector(state);
    state.score = 700;
    state.combo = 4;
    const asteroid = game.spawnAsteroid("rock", {
      x: 0,
      y: 0,
      velocityAngle: 0,
      speed: 300,
      health: 100,
      required: false,
      threatCost: 0,
      noDrops: true
    });
    const alien = game.spawnAlien("scout", { x: 20, y: 0, required: true });
    const beforeAsteroidHealth = asteroid.health;
    const beforePickups = state.pickups.length;
    game.collideThreats();
    assert.equal(alien.dead, true);
    assert.ok(asteroid.health < beforeAsteroidHealth, "asteroid took no impact damage");
    assert.equal(state.encounterData.waveRequiredCleared, 1);
    assert.equal(state.encounterData.stageRequiredCleared, 1);
    assert.equal(state.encounterData.environmentalKills, 1);
    assert.equal(state.encounterData.playerKills, 0);
    assert.equal(state.encounterData.lastDeathCause, "asteroid");
    assert.equal(state.score, 700, "environmental kill awarded score");
    assert.equal(state.combo, 4, "environmental kill changed combo");
    assert.equal(state.pickups.length, beforePickups, "environmental kill created a pickup");
    game.collideThreats();
    game.killThreat(alien, "player");
    assert.equal(state.encounterData.waveRequiredCleared, 1, "alien death advanced the wave twice");
    assert.equal(state.encounterData.stageRequiredCleared, 1, "alien death advanced the stage twice");
    assert.equal(state.score, 700, "double processing awarded score");
    assert.equal(state.pickups.length, beforePickups, "double processing created a drop");
  });

  test("stage APIs expose ordered finite goals and a required survivor prevents premature wave clear", () => {
    const { game, CONFIG } = boot(401);
    const expected = ["waves", "waves", "waves", "titan", "boss"];
    expected.forEach((goal, index) => {
      const snapshot = game.setStage(index + 1, 1);
      assert.equal(snapshot.encounter, index + 1);
      assert.equal(snapshot.objective.type, goal);
      assert.equal(snapshot.objective.progress, 0);
      assert.equal(snapshot.objective.complete, false);
      if (index < 4) {
        assert.equal(snapshot.objective.waveNumber, 1);
        assert.equal(snapshot.objective.waveCount, CONFIG.sector.encounters[index].waves.length);
        assert.ok(snapshot.objective.waveRequiredTotal > 0);
      }
    });
    game.setStage(1, 1);
    const targets = requiredLiving(game.state);
    assert.equal(targets.length, 3);
    game.killThreat(targets[0], "player");
    game.killThreat(targets[1], "player");
    runSteps(game, CONFIG.combatField.interWaveSeconds + 0.2, CONFIG.world.fixedStep);
    assert.equal(game.state.encounterData.waveNumber, 1, "wave advanced while a required asteroid survived");
    assert.equal(game.state.encounterData.complete, false, "stage cleared while a required asteroid survived");
  });

  test("Belt Breach opens with exactly three visible rocks and never over-spawns its finite waves", () => {
    const { browser, game, CONFIG, Core } = boot(501);
    const state = game.state;
    game.setStage(1, 1);
    const opening = living(state);
    assert.equal(opening.length, 3);
    assert.ok(opening.every((entity) => entity.kind === "rock" && entity.required && entity.waveIndex === 0));
    opening.forEach((entity, index) => assert.ok(
      Core.circleVisible(entity.x, entity.y, entity.radius, state.camera, browser.window.innerWidth, browser.window.innerHeight, 0),
      `opening threat ${index} was off-screen`
    ));
    runSteps(game, 2, CONFIG.world.fixedStep);
    assert.equal(requiredLiving(state).length, 3, "first wave spawned beyond its configured total");
    opening.forEach((entity) => game.killThreat(entity, "player"));
    advanceToWave(game, 2, CONFIG.world.fixedStep);
    assert.equal(requiredLiving(state).length, 4, "second wave did not match its finite configured total");
    runSteps(game, 1, CONFIG.world.fixedStep);
    assert.equal(requiredLiving(state).length, 4, "second wave spawned beyond its configured total");
  });

  test("stage-clear hyperspace protects a one-hull ship from an overlapping asteroid and advances cleanly", () => {
    const { game, CONFIG } = boot(551);
    const state = game.state;
    game.setStage(1, 1);
    clearEntities(state);
    const data = state.encounterData;
    data.waveIndex = data.waveCount - 1;
    data.waveNumber = data.waveCount;
    data.pendingSpawns.length = 0;
    data.requeue.length = 0;
    data.waveSpawned = true;
    data.waveRequiredTotal = 1;
    data.waveRequiredCleared = 1;
    data.stageRequiredTotal = 1;
    data.stageRequiredCleared = 1;
    data.goalProgress = data.goalTarget - 1;
    state.ship.hull = 1;
    state.ship.invulnerable = 0;
    game.spawnAsteroid("rock", {
      x: state.ship.x,
      y: state.ship.y,
      velocityAngle: 0,
      speed: 0.25,
      health: 1000,
      required: false,
      threatCost: 0,
      noDrops: true
    });

    game.step(CONFIG.world.fixedStep);
    assert.equal(state.encounterData.complete, true, "completed goal did not begin its clear transition");
    assert.equal(state.mode, "transition", "stage clear did not enter hyperspace");
    assert.ok(state.ship.hull > 0, "ship lost its final hull point on the stage-clear frame");

    const transitionFrames = Math.ceil((CONFIG.cinematic.duration + 0.2) / CONFIG.world.fixedStep);
    for (let frame = 0; frame < transitionFrames; frame += 1) {
      game.step(CONFIG.world.fixedStep);
      assert.notEqual(state.mode, "gameover", `ship died during hyperspace frame ${frame}`);
      assert.ok(state.ship.hull > 0, `ship lost its final hull point during clear transition frame ${frame}`);
    }
    assert.equal(state.mode, "playing");
    assert.equal(state.encounter, 2, "hyperspace did not advance to Stage 2");
    assert.equal(state.encounterData.complete, false, "Stage 2 began already complete");
  });

  test("hyperspace locks movement, weapons, dash, and pulse to a finite autopilot path", () => {
    const { game, CONFIG } = boot(575);
    const state = game.state;
    game.setStage(1, 1);
    clearEntities(state);
    const data = state.encounterData;
    data.waveIndex = data.waveCount - 1;
    data.waveNumber = data.waveCount;
    data.pendingSpawns.length = 0;
    data.requeue.length = 0;
    data.waveSpawned = true;
    data.waveRequiredTotal = 1;
    data.waveRequiredCleared = 1;
    data.stageRequiredTotal = 1;
    data.stageRequiredCleared = 1;
    data.goalProgress = data.goalTarget - 1;

    game.spawnAsteroid("rock", { required: false });
    game.spawnAlien("scout", { required: false });
    game.spawnPickup(0, 0, "shield");
    state.playerBullets.push({ marker: "old" });
    state.enemyBullets.push({ marker: "old" });
    state.mines.push({ marker: "old" });
    state.effects.push({ marker: "old" });
    state.floaters.push({ marker: "old" });
    state.ship.drones.push({ marker: "old" });

    game.step(CONFIG.world.fixedStep);
    assert.equal(state.mode, "transition");
    assert.equal(state.cinematic.active, true);
    for (const name of ["asteroids", "aliens", "playerBullets", "enemyBullets", "mines", "pickups", "effects", "floaters"]) {
      assert.equal(state[name].length, 0, `${name} survived the hyperspace cleanup`);
    }
    assert.equal(state.ship.drones.length, 0, "drones survived the hyperspace cleanup");

    const startX = state.ship.x;
    const startY = state.ship.y;
    const startPulse = state.ship.pulse;
    const directionLength = Math.hypot(CONFIG.cinematic.directionX, CONFIG.cinematic.directionY);
    const directionX = CONFIG.cinematic.directionX / directionLength;
    const directionY = CONFIG.cinematic.directionY / directionLength;
    const frames = 18;
    for (let frame = 0; frame < frames; frame += 1) {
      game.input.keys.w = true;
      game.input.keys.d = true;
      game.input.keys.space = true;
      game.input.touchMoveX = -1;
      game.input.touchMoveY = 1;
      game.input.touchAimX = 1;
      game.input.touchAimY = 0;
      game.input.touchFire = true;
      game.input.gamepadMoveX = 1;
      game.input.gamepadMoveY = 1;
      game.input.gamepadFire = true;
      game.input.pressed.dash = true;
      game.input.pressed.pulse = true;
      game.step(CONFIG.world.fixedStep);
      approximately(state.ship.x, startX + directionX * CONFIG.cinematic.speed * CONFIG.world.fixedStep * (frame + 1), 1e-7, "autopilot x");
      approximately(state.ship.y, startY + directionY * CONFIG.cinematic.speed * CONFIG.world.fixedStep * (frame + 1), 1e-7, "autopilot y");
      approximately(state.ship.vx, directionX * CONFIG.cinematic.speed, 1e-9, "autopilot vx");
      approximately(state.ship.vy, directionY * CONFIG.cinematic.speed, 1e-9, "autopilot vy");
      assert.equal(state.ship.dashTime, 0, "dash input changed the cinematic path");
      assert.equal(state.ship.pulse, startPulse, "pulse input activated during hyperspace");
      assert.equal(state.playerBullets.length, 0, "fire input created a projectile during hyperspace");
      assert.equal(state.effects.length, 0, "pulse or dash input created an effect during hyperspace");
    }

    assert.ok(state.cinematic.progress > 0 && state.cinematic.progress < 1);
    runSteps(game, CONFIG.cinematic.duration, CONFIG.world.fixedStep);
    assert.equal(state.mode, "playing");
    assert.equal(state.cinematic.active, false);
    assert.equal(state.encounter, 2);
    approximately(state.ship.x, 0, 1e-12, "Stage 2 centered x");
    approximately(state.ship.y, 0, 1e-12, "Stage 2 centered y");
    assert.equal(state.playerBullets.length, 0);
    assert.equal(state.enemyBullets.length, 0);
    assert.equal(state.mines.length, 0);
  });

  test("destroying the Titan completes its stage immediately without a survival-time gate", () => {
    const { game, CONFIG } = boot(590);
    const state = game.state;
    game.setStage(4, 1);
    const data = state.encounterData;
    assert.equal(data.timer, 0);
    const titan = state.asteroids.find((entity) => !entity.dead && entity.required && entity.kind === "titan");
    assert.ok(titan, "Titan wave did not spawn its required Titan");
    assert.equal(data.waveRequiredTotal, 1);
    assert.equal(game.killThreat(titan, "player"), true);
    game.step(CONFIG.world.fixedStep);
    assert.ok(data.timer <= CONFIG.world.fixedStep * 1.01, "Titan stage waited after the kill");
    assert.equal(data.waveRequiredCleared, 1);
    assert.equal(data.complete, true);
    assert.equal(state.mode, "transition", "Titan destruction did not enter hyperspace immediately");
    assert.equal(state.cinematic.fromEncounter, 4);
    assert.equal(state.cinematic.toEncounter, 5);
  });

  test("Rapid Fire and Tri-Shot coexist, refresh independently, and expire", () => {
    const { game, CONFIG } = boot(601);
    const state = game.state;
    clearEntities(state);
    freezeDirector(state);
    const rapid = game.spawnPickup(0, 0, "rapid");
    const tri = game.spawnPickup(0, 0, "triShot");
    game.applyPickup(rapid);
    game.applyPickup(tri);
    assert.equal(state.ship.rapidTimer, CONFIG.powerups.rapid.duration);
    assert.equal(state.ship.triShotTimer, CONFIG.powerups.triShot.duration);
    runSteps(game, 4, CONFIG.world.fixedStep);
    const triBeforeRefresh = state.ship.triShotTimer;
    game.applyPickup(game.spawnPickup(0, 0, "rapid"));
    assert.equal(state.ship.rapidTimer, CONFIG.powerups.rapid.duration);
    approximately(state.ship.triShotTimer, triBeforeRefresh, CONFIG.world.fixedStep * 1.1);
    runSteps(game, triBeforeRefresh + CONFIG.world.fixedStep * 2, CONFIG.world.fixedStep);
    assert.equal(state.ship.triShotTimer, 0);
    assert.ok(state.ship.rapidTimer > 0, "refreshing Rapid incorrectly refreshed Tri-Shot");
    runSteps(game, state.ship.rapidTimer + CONFIG.world.fixedStep * 2, CONFIG.world.fixedStep);
    assert.equal(state.ship.rapidTimer, 0);
  });

  test("pickup distribution is broad, capped, and pity prevents long droughts", () => {
    const { game, CONFIG } = boot(701);
    const state = game.state;
    game.setStage(1, 1);
    clearEntities(state);
    freezeDirector(state);
    game.setSeed(314159);
    const kinds = new Set();
    for (let index = 0; index < 160; index += 1) {
      const pickup = game.spawnPickup(index, 0);
      if (pickup) kinds.add(pickup.kind);
      state.pickups.length = 0;
    }
    for (const kind of ["shield", "rapid", "triShot", "repair", "piercing", "pulseCharge"]) {
      assert.ok(kinds.has(kind), `weighted sample never produced ${kind}`);
    }
    assert.ok(CONFIG.powerups.moduleUpgrade.weight > 0, "rare module upgrade is absent from the configured pool");
    for (let index = 0; index < CONFIG.caps.pickups + 10; index += 1) game.spawnPickup(index, 0, "shield");
    assert.equal(state.pickups.length, CONFIG.caps.pickups);

    state.pickups.length = 0;
    state.encounterData.killsSincePowerup = CONFIG.powerups.pityKills - 1;
    const victim = game.spawnAsteroid("rock", { x: 0, y: 0, required: false, threatCost: 0 });
    game.killThreat(victim, "player");
    assert.equal(state.pickups.length, 1, "pity threshold failed to create a pickup");
    assert.equal(state.encounterData.killsSincePowerup, 0);
  });

  test("all four player bounds and outward dashes stay inside normal stages", () => {
    const { game, CONFIG } = boot(801);
    const state = game.state;
    game.setStage(1, 1);
    clearEntities(state);
    freezeDirector(state);
    const field = state.combatField;
    const cases = [
      { x: field.x + field.halfWidth - state.ship.radius - 0.01, y: field.y, dx: 1, dy: 0 },
      { x: field.x - field.halfWidth + state.ship.radius + 0.01, y: field.y, dx: -1, dy: 0 },
      { x: field.x, y: field.y + field.halfHeight - state.ship.radius - 0.01, dx: 0, dy: 1 },
      { x: field.x, y: field.y - field.halfHeight + state.ship.radius + 0.01, dx: 0, dy: -1 }
    ];
    for (const edge of cases) {
      Object.assign(state.ship, { x: edge.x, y: edge.y, vx: 0, vy: 0, dashCooldown: 0, dashTime: 0 });
      game.input.touchMoveX = edge.dx;
      game.input.touchMoveY = edge.dy;
      game.input.pressed.dash = true;
      runSteps(game, 0.25, CONFIG.world.fixedStep);
      assert.ok(state.ship.x >= field.x - field.halfWidth + state.ship.radius - 1e-7);
      assert.ok(state.ship.x <= field.x + field.halfWidth - state.ship.radius + 1e-7);
      assert.ok(state.ship.y >= field.y - field.halfHeight + state.ship.radius - 1e-7);
      assert.ok(state.ship.y <= field.y + field.halfHeight - state.ship.radius + 1e-7);
    }
    game.input.touchMoveX = game.input.touchMoveY = 0;
  });

  test("locked boss arena contains extreme positions and dash velocity", () => {
    const { game, CONFIG } = boot(901);
    const state = game.state;
    game.setStage(5, 1);
    state.arena.active = true;
    state.arena.locked = true;
    state.arena.warning = 0;
    state.ship.x = state.arena.x + state.arena.radius * 4;
    state.ship.y = state.arena.y - state.arena.radius * 3;
    state.ship.vx = CONFIG.world.playerDashSpeed * 5;
    state.ship.vy = -CONFIG.world.playerDashSpeed * 4;
    game.step(CONFIG.world.fixedStep);
    const maximum = state.arena.radius - CONFIG.bossArena.boundaryPadding - state.ship.radius;
    assert.ok(Math.hypot(state.ship.x - state.arena.x, state.ship.y - state.arena.y) <= maximum + 1e-7);
    const dx = state.ship.x - state.arena.x;
    const dy = state.ship.y - state.arena.y;
    assert.ok(state.ship.vx * dx + state.ship.vy * dy <= 1e-7, "boss boundary kept outward velocity");
  });

  test("boss camera keeps the authored arena circle fully visible from every legal ship edge", () => {
    const layouts = [
      { width: 1280, height: 720, label: "desktop" },
      { width: 320, height: 568, label: "portrait" },
      { width: 568, height: 320, label: "landscape" }
    ];
    const edges = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const tolerance = 1;

    for (const [layoutIndex, layout] of layouts.entries()) {
      const { browser, game, CONFIG } = boot(951 + layoutIndex, layout);
      const state = game.state;
      game.setStage(5, 1);
      clearEntities(state);
      freezeDirector(state);
      state.arena.active = true;
      state.arena.locked = true;
      state.arena.warning = Infinity;
      state.boss = null;
      state.ship.invulnerable = 1e9;
      const legalRadius = Math.max(0, state.arena.radius - CONFIG.bossArena.boundaryPadding - state.ship.radius);

      for (const [edgeX, edgeY] of edges) {
        state.ship.x = state.arena.x + edgeX * legalRadius;
        state.ship.y = state.arena.y + edgeY * legalRadius;
        state.ship.vx = 0;
        state.ship.vy = 0;
        state.camera.x = state.arena.x;
        state.camera.y = state.arena.y;
        game.input.touchMoveX = 0;
        game.input.touchMoveY = 0;
        runSteps(game, 3, CONFIG.world.fixedStep);

        const centerX = state.arena.x - state.camera.x + browser.window.innerWidth * 0.5;
        const centerY = state.arena.y - state.camera.y + browser.window.innerHeight * 0.5;
        const context = `${layout.label} ${layout.width}x${layout.height} ship edge ${edgeX},${edgeY}`;
        assert.ok(centerX - state.arena.radius >= -tolerance, `arena clipped left in ${context}`);
        assert.ok(centerX + state.arena.radius <= browser.window.innerWidth + tolerance, `arena clipped right in ${context}`);
        assert.ok(centerY - state.arena.radius >= -tolerance, `arena clipped top in ${context}`);
        assert.ok(centerY + state.arena.radius <= browser.window.innerHeight + tolerance, `arena clipped bottom in ${context}`);
      }
    }
  });
};

module.exports.boot = boot;
module.exports.clearEntities = clearEntities;
module.exports.freezeDirector = freezeDirector;
