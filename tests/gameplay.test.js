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

function timeToCircleContact(first, second) {
  const px = first.x - second.x;
  const py = first.y - second.y;
  const vx = (first.vx || 0) - (second.vx || 0);
  const vy = (first.vy || 0) - (second.vy || 0);
  const radius = (first.radius || 0) + (second.radius || 0);
  const c = px * px + py * py - radius * radius;
  if (c <= 0) return 0;
  const a = vx * vx + vy * vy;
  if (a <= 1e-12) return Infinity;
  const b = 2 * (px * vx + py * vy);
  if (b >= 0) return Infinity;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return Infinity;
  const time = (-b - Math.sqrt(discriminant)) / (2 * a);
  return time >= 0 ? time : Infinity;
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
    game.setStage(6, 1);
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
    game.setStage(6, 1);
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

  test("exact asteroid-alien co-location separates and resolves one approaching impact", () => {
    const { game } = boot(311);
    const state = game.state;
    game.setStage(6, 1);
    clearEntities(state);
    freezeDirector(state);
    state.score = 640;
    state.combo = 5;
    const asteroid = game.spawnAsteroid("crystal", {
      x: 0,
      y: 0,
      velocityAngle: 0,
      speed: 300,
      health: 100,
      required: false,
      threatCost: 0,
      noDrops: true
    });
    const alien = game.spawnAlien("scout", { x: 0, y: 0, required: true, noDrops: true });
    alien.vx = -300;
    alien.vy = 0;
    const data = state.encounterData;
    data.waveRequiredTotal = 1;
    data.stageRequiredTotal = 1;
    const asteroidHealth = asteroid.health;
    const pickups = state.pickups.length;

    game.collideThreats();

    assert.ok(Math.hypot(alien.x - asteroid.x, alien.y - asteroid.y) >= asteroid.radius + alien.radius - 1e-7, "co-located asteroid and alien were not separated");
    assert.equal(alien.dead, true, "approaching co-located alien survived the deterministic impact");
    assert.ok(asteroid.health < asteroidHealth, "asteroid took no reciprocal collision damage");
    assert.equal(data.waveRequiredCleared, 1);
    assert.equal(data.stageRequiredCleared, 1);
    assert.equal(data.environmentalKills, 1);
    assert.equal(data.playerKills, 0);
    assert.equal(data.lastDeathCause, "asteroid");
    assert.equal(state.score, 640, "environmental co-location awarded score");
    assert.equal(state.combo, 5, "environmental co-location changed combo");
    assert.equal(state.pickups.length, pickups, "environmental co-location created a pickup");

    game.collideThreats();
    game.killThreat(alien, "player");
    assert.equal(data.waveRequiredCleared, 1, "co-located alien death advanced the wave twice");
    assert.equal(data.stageRequiredCleared, 1, "co-located alien death advanced the stage twice");
    assert.equal(data.environmentalKills, 1, "co-located alien death recorded twice");
    assert.equal(state.score, 640, "repeat collision awarded score");
    assert.equal(state.pickups.length, pickups, "repeat collision created a pickup");
  });

  test("asteroids separate and bounce without damaging either body or changing rewards", () => {
    const { game } = boot(321);
    const state = game.state;
    game.setStage(1, 1);
    clearEntities(state);
    freezeDirector(state);
    const left = game.spawnAsteroid("rock", { x: -20, y: 0, velocityAngle: 0, speed: 120, health: 100, required: false, noDrops: true });
    const right = game.spawnAsteroid("rock", { x: 20, y: 0, velocityAngle: Math.PI, speed: 120, health: 100, required: false, noDrops: true });
    const leftHealth = left.health;
    const rightHealth = right.health;
    const before = {
      score: state.score,
      pickups: state.pickups.length,
      cleared: state.encounterData.waveRequiredCleared,
      environmental: state.encounterData.environmentalKills
    };
    game.collideThreats();
    assert.deepEqual([left.health, right.health], [leftHealth, rightHealth], "asteroid impact changed health");
    assert.ok(left.vx < 0 && right.vx > 0, "asteroids did not bounce apart");
    assert.ok(Math.hypot(right.x - left.x, right.y - left.y) >= left.radius + right.radius - 1e-7, "asteroids remained overlapped");
    game.collideThreats();
    assert.deepEqual([left.health, right.health], [leftHealth, rightHealth], "a separated collision changed health");
    assert.deepEqual({
      score: state.score,
      pickups: state.pickups.length,
      cleared: state.encounterData.waveRequiredCleared,
      environmental: state.encounterData.environmentalKills
    }, before, "asteroid impact changed objectives or rewards");

    left.x = right.x = 0;
    left.y = right.y = 0;
    left.vx = -40;
    right.vx = 40;
    const restingHealth = [left.health, right.health];
    game.collideThreats();
    assert.deepEqual([left.health, right.health], restingHealth, "separating overlap farmed impact damage");
    assert.ok(Math.hypot(right.x - left.x, right.y - left.y) >= left.radius + right.radius - 1e-7, "resting overlap was not separated");
  });

  test("asteroid impact cannot resolve or reward a required asteroid", () => {
    const { game } = boot(331);
    const state = game.state;
    game.setStage(1, 1);
    clearEntities(state);
    freezeDirector(state);
    state.score = 900;
    state.combo = 6;
    const data = state.encounterData;
    const first = game.spawnAsteroid("crystal", { x: -30, y: 0, velocityAngle: 0, speed: 520, health: 1, required: false, noDrops: true });
    const required = game.spawnAsteroid("crystal", { x: 30, y: 0, velocityAngle: Math.PI, speed: 520, health: 1, required: true, noDrops: true });
    data.waveRequiredTotal = 1;
    data.stageRequiredTotal = 1;
    const pickups = state.pickups.length;
    game.collideThreats();
    assert.equal(required.dead, false, "asteroid collision destroyed the required asteroid");
    assert.equal(required.health, 1, "asteroid collision damaged the required asteroid");
    assert.equal(first.health, 1, "asteroid collision damaged the other asteroid");
    assert.equal(data.waveRequiredCleared, 0);
    assert.equal(data.stageRequiredCleared, 0);
    assert.equal(data.lastDeathCause, null);
    assert.equal(state.score, 900);
    assert.equal(state.combo, 6);
    assert.equal(state.pickups.length, pickups);
    game.collideThreats();
    game.killThreat(required, "player");
    assert.equal(data.waveRequiredCleared, 1, "player destruction did not resolve the objective once");
    assert.ok(state.score > 900, "player destruction awarded no score");
  });

  test("required asteroid descendants join the objective and block clear until the full tree dies", () => {
    const { game, CONFIG } = boot(341);
    const state = game.state;
    game.setStage(1, 1);
    clearEntities(state);
    freezeDirector(state);
    const data = state.encounterData;
    const parent = game.spawnAsteroid("volatile", {
      x: 0,
      y: 0,
      velocityAngle: 0,
      speed: 60,
      health: 1,
      required: true,
      generation: data.generation,
      waveIndex: data.waveIndex,
      noDrops: true
    });
    data.waveRequiredTotal = 1;
    data.stageRequiredTotal = 1;
    game.damageThreat(parent, 2, "player");
    const children = state.asteroids.filter((item) => !item.dead && item.fragment && item.required);
    assert.equal(children.length, CONFIG.asteroids.volatile.deathBurst.fragments, "required volatile did not create its full descendant objective");
    assert.ok(children.every((item) => item.kind === CONFIG.asteroids.volatile.deathBurst.fragmentKind));
    assert.ok(children.every((item) => item.generation === data.generation && item.waveIndex === data.waveIndex));
    assert.equal(data.waveRequiredTotal, 1 + children.length, "wave total did not expand for descendants");
    assert.equal(data.stageRequiredTotal, 1 + children.length, "stage total did not expand for descendants");
    assert.equal(data.waveRequiredCleared, 1);
    game.step(CONFIG.world.fixedStep);
    assert.equal(data.complete, false, "parent death cleared the stage while descendants survived");
    assert.equal(children.filter((item) => !item.dead).length, children.length, "newly spawned fragments self-destructed on contact");
    children.slice(0, -1).forEach((item) => game.killThreat(item, "player"));
    runSteps(game, CONFIG.combatField.interWaveSeconds + 0.2, CONFIG.world.fixedStep);
    assert.equal(data.complete, false, "stage cleared with one required descendant alive");
    assert.equal(data.waveRequiredCleared, data.waveRequiredTotal - 1);
    game.killThreat(children.at(-1), "player");
    assert.equal(data.waveRequiredCleared, data.waveRequiredTotal, "final descendant did not resolve the objective");
  });

  test("a colossal asteroid has an exact bounded one-to-three-to-six required split tree", () => {
    const { game } = boot(351);
    const state = game.state;
    game.setStage(4, 1);
    clearEntities(state);
    freezeDirector(state);
    const data = state.encounterData;
    const parent = game.spawnAsteroid("colossal", {
      x: 0,
      y: 0,
      speed: 0,
      health: 1,
      required: true,
      generation: data.generation,
      waveIndex: data.waveIndex,
      noDrops: true
    });
    data.waveRequiredTotal = 1;
    data.stageRequiredTotal = 1;
    assert.equal(Math.hypot(parent.vx, parent.vy), 0, "explicit zero speed was ignored");

    game.damageThreat(parent, 2, "player");
    const firstGeneration = state.asteroids.filter((item) => !item.dead);
    assert.equal(firstGeneration.length, 3);
    assert.ok(firstGeneration.every((item) => item.kind === "rock" && item.fragment && item.splitRemaining === 1));
    assert.equal(data.waveRequiredTotal, 4);

    firstGeneration.forEach((item) => game.damageThreat(item, 2, "player"));
    const finalGeneration = state.asteroids.filter((item) => !item.dead);
    assert.equal(finalGeneration.length, 6);
    assert.ok(finalGeneration.every((item) => item.kind === "rock" && item.splitRemaining === 0));
    assert.equal(data.waveRequiredTotal, 10);
    assert.equal(data.stageRequiredTotal, 10);
    assert.equal(data.waveRequiredCleared, 4);
    finalGeneration.slice(0, -1).forEach((item) => game.killThreat(item, "player"));
    game.step(1 / 60);
    assert.equal(data.complete, false, "the stage cleared with a final descendant alive");
    game.killThreat(finalGeneration.at(-1), "player");
    assert.equal(data.waveRequiredCleared, 10);
    assert.ok(state.asteroids.filter((item) => !item.dead).length === 0, "the final generation split again");
  });

  test("hard-culling a required fragment requeues its exact objective state", () => {
    const { browser, game, CONFIG } = boot(371, { width: 640, height: 360 });
    const state = game.state;
    game.setStage(5, 1);
    clearEntities(state);
    freezeDirector(state);
    const data = state.encounterData;
    const diagonal = Math.max(640, Math.hypot(browser.window.innerWidth, browser.window.innerHeight));
    const original = game.spawnAsteroid("rock", {
      x: state.ship.x + diagonal * CONFIG.culling.hardCullViewports + 100,
      y: state.ship.y,
      velocityAngle: 0.7,
      speed: 95,
      radius: 19,
      health: 0.42,
      maxHealth: 1.7,
      score: 13,
      noDrops: true,
      threatCost: 0,
      required: true,
      generation: data.generation,
      waveIndex: data.waveIndex,
      fragment: true,
      ballisticFragment: true,
      collisionGrace: 0.17,
      gateIndex: 2
    });
    data.waveRequiredTotal = 1;
    data.stageRequiredTotal = 1;
    game.step(CONFIG.world.fixedStep);
    assert.equal(original.dead, true, "required fragment was not hard-culled");
    assert.equal(data.waveSpawned, false, "hard-cull did not reopen the finite spawn queue");
    assert.equal(data.requeue.length, 1);
    const queued = data.requeue[0];
    for (const key of ["health", "maxHealth", "radius", "score", "noDrops", "threatCost", "fragment", "ballisticFragment", "splitRemaining", "gateIndex"]) {
      assert.equal(queued[key], original[key], `requeue lost ${key}`);
    }
    approximately(queued.collisionGrace, Math.max(0, original.collisionGrace), 1e-12, "requeued collision grace");
    for (let frame = 0; frame < 30 && data.requeue.length; frame += 1) game.step(CONFIG.world.fixedStep);
    assert.equal(data.requeue.length, 0, "required fragment did not respawn");
    const restored = state.asteroids.find((item) => !item.dead && item.id !== original.id && item.required);
    assert.ok(restored, "required fragment objective vanished after culling");
    for (const key of ["health", "maxHealth", "radius", "score", "noDrops", "threatCost", "fragment", "ballisticFragment", "splitRemaining", "gateIndex"]) {
      assert.equal(restored[key], original[key], `respawn changed ${key}`);
    }
    assert.equal(data.waveRequiredTotal, 1, "requeue duplicated the objective total");
    assert.equal(data.waveRequiredCleared, 0, "requeue incorrectly cleared the objective");
  });

  test("hard-culling an optional stage hazard requeues it and still blocks a clean wave", () => {
    const { browser, game, CONFIG } = boot(381, { width: 640, height: 360 });
    const state = game.state;
    game.setStage(6, 1);
    clearEntities(state);
    freezeDirector(state);
    const data = state.encounterData;
    data.waveRequiredTotal = 0;
    const diagonal = Math.max(640, Math.hypot(browser.window.innerWidth, browser.window.innerHeight));
    const hazard = game.spawnAsteroid("crystal", {
      x: state.ship.x + diagonal * CONFIG.culling.hardCullViewports + 100,
      y: state.ship.y,
      speed: 20,
      required: false,
      generation: data.generation,
      waveIndex: data.waveIndex,
      noDrops: true
    });

    game.step(CONFIG.world.fixedStep);
    assert.equal(hazard.dead, true);
    assert.equal(data.complete, false, "optional hard-cull cleared the encounter");
    assert.equal(data.waveSpawned, false);
    assert.equal(data.requeue.length, 1);
    assert.equal(data.requeue[0].required, false);
    for (let frame = 0; frame < 30 && data.requeue.length; frame += 1) game.step(CONFIG.world.fixedStep);
    assert.equal(data.requeue.length, 0);
    assert.ok(state.asteroids.some((item) => !item.dead && item.required === false), "optional hazard vanished instead of respawning");
    assert.equal(data.waveRequiredTotal, 0, "optional requeue corrupted the required counter");
  });

  test("stage APIs expose ordered finite goals and a required survivor prevents premature wave clear", () => {
    const { game, CONFIG } = boot(401);
    const expected = ["waves", "waves", "waves", "waves", "titan", "waves", "waves", "waves", "boss"];
    expected.forEach((goal, index) => {
      const snapshot = game.setStage(index + 1, 1);
      assert.equal(snapshot.encounter, index + 1);
      assert.equal(snapshot.objective.type, goal);
      assert.equal(snapshot.objective.progress, 0);
      assert.equal(snapshot.objective.complete, false);
      if (index < 8) {
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

  test("alien waves wait for every mixed asteroid hazard before advancing", () => {
    const { game, CONFIG } = boot(451);
    const state = game.state;
    game.setStage(6, 1);
    const data = state.encounterData;
    const aliens = state.aliens.filter((entity) => !entity.dead);
    const hazards = state.asteroids.filter((entity) => !entity.dead);
    assert.ok(aliens.length > 0 && hazards.length > 0, "First Contact did not open as a mixed encounter");
    aliens.forEach((entity) => game.killThreat(entity, "player"));
    runSteps(game, CONFIG.combatField.interWaveSeconds + 0.2, CONFIG.world.fixedStep);
    assert.equal(data.waveNumber, 1, "wave advanced while asteroid hazards survived");
    hazards.forEach((entity) => game.killThreat(entity, "player"));
    advanceToWave(game, 2, CONFIG.world.fixedStep);
    assert.ok(state.aliens.some((entity) => !entity.dead));
    assert.ok(state.asteroids.some((entity) => !entity.dead), "second alien wave omitted its asteroid pressure");
  });

  test("Earth Orbit opens with exactly three visible rocks and never over-spawns its finite waves", () => {
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
    const descendants = requiredLiving(state);
    assert.ok(descendants.length > 0, "splitting rocks did not add their descendants to the finite objective");
    descendants.forEach((entity) => game.killThreat(entity, "player"));
    advanceToWave(game, 2, CONFIG.world.fixedStep);
    assert.equal(requiredLiving(state).length, 4, "second wave did not match its finite configured total");
    runSteps(game, 1, CONFIG.world.fixedStep);
    assert.equal(requiredLiving(state).length, 4, "second wave spawned beyond its configured total");
  });

  test("Earth Orbit opening spawns are radius-safe across phone, tablet, and desktop viewports", () => {
    const viewports = [
      { width: 568, height: 320 },
      { width: 667, height: 375 },
      { width: 852, height: 393 },
      { width: 932, height: 430 },
      { width: 1024, height: 768 },
      { width: 1280, height: 720 }
    ];
    const seeds = 1024;
    for (const viewport of viewports) {
      const { browser, game, CONFIG, Core } = boot(9001 + viewport.width, viewport);
      const state = game.state;
      for (let seed = 1; seed <= seeds; seed += 1) {
        game.setSeed(seed);
        game.setStage(1, 1);
        state.ship.hull = 100;
        state.ship.shield = 0;
        state.ship.invulnerable = 0;
        const opening = requiredLiving(state);
        const label = `${viewport.width}x${viewport.height} seed ${seed}`;
        assert.equal(opening.length, 3, `${label} did not spawn exactly three required rocks`);
        for (const asteroid of opening) {
          const surface = Math.hypot(asteroid.x - state.ship.x, asteroid.y - state.ship.y) - asteroid.radius - state.ship.radius;
          assert.ok(surface >= CONFIG.combatField.spawnShipClearance - 1e-7, `${label} spawned ${asteroid.id} only ${surface}px from the ship surface`);
          assert.ok(
            timeToCircleContact(asteroid, state.ship) >= CONFIG.combatField.spawnMinimumContactSeconds - 1e-7,
            `${label} spawned ${asteroid.id} with insufficient time to contact`
          );
          assert.ok(
            Core.circleVisible(asteroid.x, asteroid.y, asteroid.radius, state.camera, browser.window.innerWidth, browser.window.innerHeight, 0),
            `${label} spawned ${asteroid.id} outside the visible field`
          );
        }
        for (let first = 0; first < opening.length; first += 1) {
          for (let second = first + 1; second < opening.length; second += 1) {
            const surface = Math.hypot(opening[first].x - opening[second].x, opening[first].y - opening[second].y) - opening[first].radius - opening[second].radius;
            assert.ok(surface >= CONFIG.combatField.spawnThreatClearance - 1e-7, `${label} spawned overlapping threats with ${surface}px surface clearance`);
          }
        }

        game.step(CONFIG.world.fixedStep);
        for (const asteroid of opening) {
          const surface = Math.hypot(asteroid.x - state.ship.x, asteroid.y - state.ship.y) - asteroid.radius - state.ship.radius;
          assert.ok(surface >= 0, `${label} collapsed into the ship on its first simulation tick`);
        }
        for (let first = 0; first < opening.length; first += 1) {
          for (let second = first + 1; second < opening.length; second += 1) {
            const surface = Math.hypot(opening[first].x - opening[second].x, opening[first].y - opening[second].y) - opening[first].radius - opening[second].radius;
            assert.ok(surface >= -1e-7, `${label} threats overlapped on their first simulation tick`);
          }
        }

        const frames = Math.ceil(2 / CONFIG.world.fixedStep) - 1;
        for (let frame = 0; frame < frames; frame += 1) game.step(CONFIG.world.fixedStep);
        assert.equal(state.ship.hull, 100, `${label} damaged the stationary ship during the protected opening window`);
      }
    }
  });

  test("Stages one through five safely place or defer every compact-screen opening threat", () => {
    const viewports = [
      { width: 568, height: 320 },
      { width: 667, height: 375 }
    ];
    const stages = [1, 2, 3, 4, 5];
    const seeds = 1024;
    for (const viewport of viewports) {
      const { browser, game, CONFIG, Core } = boot(12000 + viewport.width, viewport);
      const state = game.state;
      for (const stage of stages) {
        const firstWave = CONFIG.sector.encounters[stage - 1].waves[0];
        const expected = (firstWave.required || []).concat(firstWave.hazards || [])
          .reduce((total, group) => total + group.count, 0);
        for (let seed = 1; seed <= seeds; seed += 1) {
          game.setSeed(seed);
          game.setStage(stage, 1);
          state.ship.hull = 100;
          state.ship.shield = 0;
          state.ship.invulnerable = 0;
          const opening = living(state);
          const data = state.encounterData;
          const label = `stage ${stage} ${viewport.width}x${viewport.height} seed ${seed}`;

          assert.ok(opening.length > 0, `${label} deferred the entire opening wave`);
          assert.equal(opening.length + data.pendingSpawns.length, expected, `${label} lost or duplicated a deferred opening threat`);
          assert.equal(data.requeue.length, 0, `${label} unexpectedly requeued a fresh opening threat`);
          assert.equal(data.waveSpawned, data.pendingSpawns.length === 0, `${label} reported the wrong deferred-spawn state`);
          for (const threat of opening) {
            const surface = Math.hypot(threat.x - state.ship.x, threat.y - state.ship.y) - threat.radius - state.ship.radius;
            assert.ok(surface >= CONFIG.combatField.spawnShipClearance - 1e-7, `${label} placed ${threat.id} only ${surface}px from the ship surface`);
            assert.ok(
              timeToCircleContact(threat, state.ship) >= CONFIG.combatField.spawnMinimumContactSeconds - 1e-7,
              `${label} placed ${threat.id} with insufficient time to contact`
            );
            assert.ok(
              Core.circleVisible(threat.x, threat.y, threat.radius, state.camera, browser.window.innerWidth, browser.window.innerHeight, 0),
              `${label} placed ${threat.id} outside the visible field`
            );
            if (threat.kind) {
              assert.ok(threat.radius >= CONFIG.combatField.spawnMinimumRadius - 1e-7, `${label} shrank ${threat.kind} below the safe configured radius floor`);
              assert.ok(threat.radius <= CONFIG.asteroids[threat.kind].radius + 1e-7, `${label} enlarged ${threat.kind} beyond its authored radius`);
            }
          }
          for (let first = 0; first < opening.length; first += 1) {
            for (let second = first + 1; second < opening.length; second += 1) {
              const surface = Math.hypot(opening[first].x - opening[second].x, opening[first].y - opening[second].y) - opening[first].radius - opening[second].radius;
              assert.ok(surface >= CONFIG.combatField.spawnThreatClearance - 1e-7, `${label} placed threats with only ${surface}px surface clearance`);
            }
          }

          for (let frame = 0; frame < Math.ceil(2 / CONFIG.world.fixedStep); frame += 1) game.step(CONFIG.world.fixedStep);
          assert.equal(state.ship.hull, 100, `${label} damaged the stationary ship during the protected opening window`);
        }
      }
    }
  });

  test("stage clear waits for an optional asteroid, then protects a one-hull ship through hyperspace", () => {
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
    const hazard = game.spawnAsteroid("crystal", {
      x: state.ship.x + 180,
      y: state.ship.y + 120,
      velocityAngle: 0,
      speed: 0.25,
      health: 1000,
      required: false,
      threatCost: 0,
      noDrops: true
    });

    game.step(CONFIG.world.fixedStep);
    assert.equal(state.encounterData.complete, false, "optional asteroid was ignored by the clean-stage contract");
    assert.equal(state.mode, "playing");
    hazard.x = state.ship.x;
    hazard.y = state.ship.y;
    game.killThreat(hazard, "player");
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

    const looseAsteroid = game.spawnAsteroid("crystal", { required: false });
    const looseAlien = game.spawnAlien("scout", { required: false });
    game.spawnPickup(0, 0, "shield");
    state.playerBullets.push({ marker: "old" });
    state.enemyBullets.push({ marker: "old" });
    state.mines.push({ marker: "old" });
    state.effects.push({ marker: "old" });
    state.floaters.push({ marker: "old" });
    state.ship.drones.push({ marker: "old" });

    game.killThreat(looseAsteroid, "player");
    game.killThreat(looseAlien, "player");

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
    const directionX = state.cinematic.directionX;
    const directionY = state.cinematic.directionY;
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
    const frameLimit = Math.ceil((CONFIG.cinematic.duration + 0.2) / CONFIG.world.fixedStep);
    for (let frame = 0; frame < frameLimit && state.mode === "transition"; frame += 1) game.step(CONFIG.world.fixedStep);
    assert.equal(state.mode, "playing");
    assert.equal(state.cinematic.active, false);
    assert.equal(state.encounter, 2);
    approximately(state.ship.x, state.cinematic.entryX, 1e-12, "Stage 2 entry x");
    approximately(state.ship.y, state.cinematic.entryY, 1e-12, "Stage 2 entry y");
    assert.ok(Math.hypot(state.ship.x, state.ship.y) > 1, "Stage handoff teleported the ship back to world origin");
    assert.equal(state.playerBullets.length, 0);
    assert.equal(state.enemyBullets.length, 0);
    assert.equal(state.mines.length, 0);
  });

  test("hyperspace preserves heading and screen-space anchor across desktop and mobile handoffs", () => {
    const layouts = [
      { width: 1280, height: 720, label: "desktop" },
      { width: 320, height: 568, label: "portrait" },
      { width: 568, height: 320, label: "landscape" }
    ];
    const starts = [
      { x: -180, y: 95, vx: 310, vy: 170 },
      { x: 120, y: -80, vx: -220, vy: 260 },
      { x: 40, y: 60, vx: 0, vy: -360 }
    ];
    for (const [index, layout] of layouts.entries()) {
      const { browser, game, CONFIG } = boot(580 + index, layout);
      const state = game.state;
      game.setStage(1 + index, 1);
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
      Object.assign(state.ship, starts[index]);
      state.ship.angle = Math.atan2(starts[index].vy, starts[index].vx);
      state.camera.x = state.ship.x - (layout.width * (0.38 + index * 0.08) - layout.width * 0.5);
      state.camera.y = state.ship.y - (layout.height * (0.61 - index * 0.09) - layout.height * 0.5);
      const anchorBefore = browser.window.ND.RenderDebug.screenAnchor(state, layout);
      const directionLength = Math.hypot(starts[index].vx, starts[index].vy);
      const expectedDirection = { x: starts[index].vx / directionLength, y: starts[index].vy / directionLength };

      game.step(CONFIG.world.fixedStep);
      assert.equal(state.mode, "transition", `${layout.label} did not enter hyperspace`);
      approximately(state.cinematic.directionX, expectedDirection.x, 1e-9, `${layout.label} direction x`);
      approximately(state.cinematic.directionY, expectedDirection.y, 1e-9, `${layout.label} direction y`);
      const anchorDuring = browser.window.ND.RenderDebug.screenAnchor(state, layout);
      approximately(anchorDuring.x, layout.width * 0.5 + state.cinematic.anchorX, 1e-7, `${layout.label} transition anchor x`);
      approximately(anchorDuring.y, layout.height * 0.5 + state.cinematic.anchorY, 1e-7, `${layout.label} transition anchor y`);
      const capturedAnchor = { x: anchorDuring.x, y: anchorDuring.y };
      assert.ok(Math.hypot(capturedAnchor.x - anchorBefore.x, capturedAnchor.y - anchorBefore.y) < 16, `${layout.label} capture visibly jumped before transit`);

      const frameLimit = Math.ceil((CONFIG.cinematic.duration + 0.2) / CONFIG.world.fixedStep);
      for (let frame = 0; frame < frameLimit && state.mode === "transition"; frame += 1) game.step(CONFIG.world.fixedStep);
      assert.equal(state.mode, "playing");
      assert.equal(state.encounter, 2 + index);
      const anchorAfter = browser.window.ND.RenderDebug.screenAnchor(state, layout);
      approximately(anchorAfter.x, capturedAnchor.x, 1e-5, `${layout.label} handoff anchor x`);
      approximately(anchorAfter.y, capturedAnchor.y, 1e-5, `${layout.label} handoff anchor y`);
      approximately(state.ship.x - state.cinematic.entryX, 0, 1e-7, `${layout.label} entry x`);
      approximately(state.ship.y - state.cinematic.entryY, 0, 1e-7, `${layout.label} entry y`);
      assert.ok(Number.isFinite(state.ship.x) && Number.isFinite(state.ship.y));
    }
  });

  test("destroying the Titan completes its stage once every accompanying asteroid is clear", () => {
    const { game, CONFIG } = boot(590);
    const state = game.state;
    game.setStage(5, 1);
    const data = state.encounterData;
    assert.equal(data.timer, 0);
    const titan = state.asteroids.find((entity) => !entity.dead && entity.required && entity.kind === "titan");
    assert.ok(titan, "Titan wave did not spawn its required Titan");
    assert.equal(data.waveRequiredTotal, 1);
    assert.equal(game.killThreat(titan, "player"), true);
    game.step(CONFIG.world.fixedStep);
    assert.equal(data.complete, false, "Titan death ignored surviving stage hazards");
    let survivor = living(state)[0];
    while (survivor) {
      game.killThreat(survivor, "player");
      survivor = living(state)[0];
    }
    game.step(CONFIG.world.fixedStep);
    assert.ok(data.timer <= CONFIG.world.fixedStep * 2.01, "Titan stage added a survival-time gate after cleanup");
    assert.equal(data.waveRequiredCleared, 1);
    assert.equal(data.complete, true);
    assert.equal(state.mode, "transition", "Titan destruction did not enter hyperspace immediately");
    assert.equal(state.cinematic.fromEncounter, 5);
    assert.equal(state.cinematic.toEncounter, 6);
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

  test("temporary weapon pickups change firing behavior, refresh independently, and expire", () => {
    const { game, CONFIG } = boot(651);
    const state = game.state;
    clearEntities(state);
    freezeDirector(state);
    game.applyPickup(game.spawnPickup(0, 0, "arcBurst"));
    assert.equal(state.ship.arcBurstTimer, CONFIG.powerups.arcBurst.duration);
    assert.equal(state.ship.novaLanceTimer, 0);
    game.input.touchAimX = 1;
    game.input.touchAimY = 0;
    game.input.keys.space = true;
    runSteps(game, 0.4, CONFIG.world.fixedStep);
    assert.ok(state.playerBullets.some((bullet) => bullet.kind === "arc"), "Arc Burst did not fire arc projectiles");
    state.playerBullets.length = 0;
    runSteps(game, 4, CONFIG.world.fixedStep);
    game.applyPickup(game.spawnPickup(0, 0, "novaLance"));
    const arcBeforeRefresh = state.ship.arcBurstTimer;
    assert.equal(state.ship.novaLanceTimer, CONFIG.powerups.novaLance.duration);
    runSteps(game, 0.4, CONFIG.world.fixedStep);
    assert.ok(state.playerBullets.some((bullet) => bullet.kind === "arc"), "Arc Burst stopped when Nova Lance activated");
    assert.ok(state.playerBullets.some((bullet) => bullet.kind === "lance"), "Nova Lance did not fire lance projectiles");
    game.applyPickup(game.spawnPickup(0, 0, "novaLance"));
    assert.equal(state.ship.novaLanceTimer, CONFIG.powerups.novaLance.duration);
    approximately(state.ship.arcBurstTimer, arcBeforeRefresh - 0.4, CONFIG.world.fixedStep * 1.2, "Nova refresh changed Arc timer");
    runSteps(game, state.ship.arcBurstTimer + CONFIG.world.fixedStep * 2, CONFIG.world.fixedStep);
    assert.equal(state.ship.arcBurstTimer, 0);
    assert.ok(state.ship.novaLanceTimer > 0, "refreshing Nova incorrectly refreshed Arc");
    state.playerBullets.length = 0;
    runSteps(game, 0.5, CONFIG.world.fixedStep);
    assert.ok(!state.playerBullets.some((bullet) => bullet.kind === "arc"), "expired Arc Burst kept firing");
    assert.ok(state.playerBullets.some((bullet) => bullet.kind === "lance"), "active Nova Lance stopped firing");
  });

  test("module upgrade is permanent for the run and remains bounded", () => {
    const { game, CONFIG } = boot(681);
    const state = game.state;
    clearEntities(state);
    freezeDirector(state);
    const before = { ...state.ship.modules };
    game.applyPickup(game.spawnPickup(0, 0, "moduleUpgrade"));
    const changed = Object.keys(state.ship.modules).filter((id) => state.ship.modules[id] !== before[id]);
    assert.equal(changed.length, 1, "module upgrade did not change exactly one permanent module");
    const selected = changed[0];
    assert.ok(state.ship.modules[selected] > (before[selected] || 0));
    assert.ok(state.ship.modules[selected] <= CONFIG.weapons.maxModuleTier);
    runSteps(game, 30, CONFIG.world.fixedStep);
    assert.equal(state.ship.modules[selected], (before[selected] || 0) + 1, "permanent run upgrade expired over time");

    for (let index = 0; index < CONFIG.weapons.maxInstalledModules * CONFIG.weapons.maxModuleTier; index += 1) {
      state.pickups.length = 0;
      game.applyPickup(game.spawnPickup(0, 0, "moduleUpgrade"));
    }
    assert.equal(Object.keys(state.ship.modules).length, CONFIG.weapons.maxInstalledModules, "normal upgrades did not reach every module slot");
    for (const id of Object.keys(CONFIG.weapons.modules)) {
      assert.equal(state.ship.modules[id], CONFIG.weapons.maxModuleTier, `${id} did not reach its bounded tier cap`);
    }
    assert.ok(state.ship.modules.homingSalvo && state.ship.modules.radialArray, "passive modules were unreachable through normal upgrades");
    const capped = JSON.stringify(state.ship.modules);
    state.pickups.length = 0;
    game.applyPickup(game.spawnPickup(0, 0, "moduleUpgrade"));
    assert.equal(JSON.stringify(state.ship.modules), capped, "overflow upgrade exceeded a module tier or slot cap");
  });

  test("Homing Salvo and Radial Array fire autonomously, persist for the run, and respect projectile caps", () => {
    const { game, CONFIG } = boot(691);
    const state = game.state;
    clearEntities(state);
    freezeDirector(state);
    const target = game.spawnAsteroid("crystal", {
      x: state.ship.x + 220,
      y: state.ship.y,
      speed: 0,
      health: 1e9,
      required: false,
      noDrops: true
    });
    assert.ok(target);
    game.applyPickup(game.spawnPickup(0, 0, "moduleUpgrade"));
    game.applyPickup(game.spawnPickup(0, 0, "moduleUpgrade"));
    assert.equal(state.ship.modules.homingSalvo, 1);
    assert.equal(state.ship.modules.radialArray, 1);
    state.playerBullets.length = 0;
    state.ship.weaponTimers.homingSalvo = 0;
    state.ship.weaponTimers.radialArray = 0;

    game.step(CONFIG.world.fixedStep);
    const missiles = state.playerBullets.filter((bullet) => bullet.kind === "missile");
    const radial = state.playerBullets.filter((bullet) => bullet.kind === "radial");
    assert.equal(missiles.length, CONFIG.weapons.modules.homingSalvo.tiers[0].projectiles);
    assert.equal(radial.length, CONFIG.weapons.modules.radialArray.tiers[0].projectiles);
    assert.ok(missiles.every((bullet) => bullet.turnRate > 0), "passive rockets were not homing");
    assert.ok(state.ship.weaponTimers.homingSalvo > 0 && state.ship.weaponTimers.radialArray > 0);

    runSteps(game, 20, CONFIG.world.fixedStep, () => {
      assert.ok(state.playerBullets.length <= CONFIG.caps.playerProjectiles);
    });
    assert.equal(state.ship.modules.homingSalvo, 1);
    assert.equal(state.ship.modules.radialArray, 1);
  });

  test("active Void Pulse affects only its configured nearby radius at reduced damage", () => {
    const { game, CONFIG } = boot(696);
    const state = game.state;
    clearEntities(state);
    freezeDirector(state);
    const radius = CONFIG.voidPulse.radius;
    const nearAsteroid = game.spawnAsteroid("rock", { x: radius - 4, y: 0, speed: 0, health: 20, required: false, noDrops: true });
    const farAsteroid = game.spawnAsteroid("rock", { x: radius + 4, y: 0, speed: 0, health: 20, required: false, noDrops: true });
    const nearAlien = game.spawnAlien("scout", { x: 0, y: radius - 4, health: 20, required: false, noDrops: true });
    const farAlien = game.spawnAlien("scout", { x: 0, y: radius + 4, health: 20, required: false, noDrops: true });
    const nearBullet = { x: radius - 2, y: 0, dead: false };
    const farBullet = { x: radius + 2, y: 0, dead: false };
    const nearMine = { x: 0, y: radius - 2, dead: false };
    const farMine = { x: 0, y: radius + 2, dead: false };
    state.enemyBullets.push(nearBullet, farBullet);
    state.mines.push(nearMine, farMine);
    const boss = {
      id: 99999,
      x: radius - 4,
      y: 0,
      radius: 82,
      type: "harrower",
      health: 100,
      maxHealth: 100,
      nodes: [],
      dead: false
    };
    state.boss = boss;
    const asteroidHealth = [nearAsteroid.health, farAsteroid.health];
    const alienHealth = [nearAlien.health, farAlien.health];
    state.ship.pulse = 100;

    game.activatePulse();

    approximately(nearAsteroid.health, asteroidHealth[0] - CONFIG.voidPulse.asteroidDamage, 1e-9, "near asteroid pulse damage");
    assert.equal(farAsteroid.health, asteroidHealth[1], "pulse damaged an asteroid outside its radius");
    approximately(nearAlien.health, alienHealth[0] - CONFIG.voidPulse.alienDamage, 1e-9, "near alien pulse damage");
    assert.equal(farAlien.health, alienHealth[1], "pulse damaged an alien outside its radius");
    assert.equal(nearBullet.dead, true);
    assert.equal(farBullet.dead, false);
    assert.equal(nearMine.dead, true);
    assert.equal(farMine.dead, false);
    approximately(boss.health, 100 - CONFIG.voidPulse.bossDamage, 1e-9, "near boss pulse damage");
    const bossHealth = boss.health;
    boss.x = radius + 4;
    state.ship.pulse = 100;
    game.activatePulse();
    assert.equal(boss.health, bossHealth, "pulse damaged a boss outside its radius");
    assert.equal(state.ship.pulse, 0);
    assert.ok(CONFIG.voidPulse.radius < 0.5 * Math.hypot(1280, 720), "pulse retained a screen-wide radius");
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
    for (const kind of ["shield", "rapid", "triShot", "arcBurst", "novaLance", "repair", "piercing", "pulseCharge"]) {
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

  test("requested combat and repair pickups receive only the bounded weight increase", () => {
    const { CONFIG } = boot(711);
    assert.equal(CONFIG.powerups.rapid.weight, 24);
    assert.equal(CONFIG.powerups.triShot.weight, 22);
    assert.equal(CONFIG.powerups.repair.weight, 20);
    assert.equal(CONFIG.powerups.dropChance, 0.19);
    assert.equal(CONFIG.powerups.pityKills, 5);
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

  test("player-asteroid contact separates the hull and removes inward relative velocity", () => {
    const { game, CONFIG } = boot(831);
    const state = game.state;
    game.setStage(1, 1);
    clearEntities(state);
    freezeDirector(state);
    const asteroid = game.spawnAsteroid("rock", {
      x: 0,
      y: 0,
      speed: 0,
      health: 100,
      required: false,
      noDrops: true
    });
    Object.assign(state.ship, { x: 12, y: 0, vx: -320, vy: 0, invulnerable: 0 });
    game.step(CONFIG.world.fixedStep);
    const normalX = state.ship.x - asteroid.x;
    const normalY = state.ship.y - asteroid.y;
    const distance = Math.hypot(normalX, normalY);
    assert.ok(distance >= state.ship.radius + asteroid.radius * 0.82 - 1e-7, "ship remained embedded in asteroid");
    const relativeNormalSpeed = ((state.ship.vx - asteroid.vx) * normalX + (state.ship.vy - asteroid.vy) * normalY) / distance;
    assert.ok(relativeNormalSpeed >= -1e-7, "contact retained inward relative velocity");
    for (let frame = 0; frame < 120; frame += 1) game.step(CONFIG.world.fixedStep);
    assert.ok(Math.hypot(state.ship.x - asteroid.x, state.ship.y - asteroid.y) >= state.ship.radius + asteroid.radius * 0.82 - 1e-7,
      "ship re-embedded while collision invulnerability was active");
  });

  test("asteroids and alien spacecraft bounce back inside stage boundaries", () => {
    const { game, CONFIG } = boot(851);
    const state = game.state;
    game.setStage(6, 1);
    clearEntities(state);
    freezeDirector(state);
    const field = state.combatField;
    const asteroid = game.spawnAsteroid("crystal", {
      x: field.x + field.halfWidth + 4,
      y: field.y,
      velocityAngle: 0,
      speed: 180,
      health: 1000,
      required: false
    });
    const alien = game.spawnAlien("scout", { x: field.x, y: field.y - field.halfHeight - 4, required: false });
    alien.vx = 0;
    alien.vy = -260;
    alien.cooldown = Infinity;
    game.step(CONFIG.world.fixedStep);
    const asteroidRight = field.x + field.halfWidth - asteroid.radius - CONFIG.combatField.threatBoundaryPadding;
    const alienTop = field.y - field.halfHeight + alien.radius + CONFIG.combatField.threatBoundaryPadding;
    assert.ok(asteroid.x <= asteroidRight + 1e-7 && asteroid.vx <= 0, "asteroid did not bounce off the right boundary");
    assert.ok(alien.y >= alienTop - 1e-7 && alien.vy >= 0, "alien did not bounce off the top boundary");
  });

  test("locked boss arena contains extreme positions and dash velocity", () => {
    const { game, CONFIG } = boot(901);
    const state = game.state;
    game.setStage(9, 1);
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

  test("defeating Harrower waits for every surviving arena escort before hyperspace", () => {
    const { game, CONFIG } = boot(875);
    const state = game.state;
    game.setStage(9, 1);
    runSteps(game, CONFIG.bossArena.warningSeconds + 0.1, CONFIG.world.fixedStep);
    assert.ok(state.boss, "Harrower did not enter the arena");
    const escort = game.spawnAlien("scout", {
      x: state.ship.x + 120,
      y: state.ship.y,
      health: 30,
      required: false,
      generation: state.encounterData.generation,
      noDrops: true
    });
    game.damageBoss(state.boss.maxHealth * 10);
    assert.equal(state.encounterData.bossDefeated, true);
    assert.equal(state.encounterData.complete, false, "boss death ignored its surviving escort");
    assert.equal(state.mode, "playing");
    assert.ok(escort && !escort.dead);
    game.killThreat(escort, "player");
    game.step(CONFIG.world.fixedStep);
    assert.equal(state.encounterData.complete, true);
    assert.equal(state.mode, "transition", "clean boss arena did not enter hyperspace");
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
      game.setStage(9, 1);
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

  test("boss-sector wrap preserves every legal arena-edge screen anchor on narrow viewports", () => {
    const layouts = [
      { width: 568, height: 320, label: "landscape" },
      { width: 320, height: 568, label: "portrait" }
    ];
    const edges = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    for (const [layoutIndex, layout] of layouts.entries()) {
      for (const [edgeIndex, [edgeX, edgeY]] of edges.entries()) {
        const { browser, game, CONFIG } = boot(980 + layoutIndex * 10 + edgeIndex, layout);
        const state = game.state;
        game.setStage(9, 1);
        clearEntities(state);
        state.arena.warning = CONFIG.world.fixedStep * 0.5;
        state.ship.invulnerable = 1e9;
        game.step(CONFIG.world.fixedStep);
        assert.ok(state.boss, `${layout.label} boss did not spawn`);

        const legalRadius = Math.max(0, state.arena.radius - CONFIG.bossArena.boundaryPadding - state.ship.radius);
        state.ship.x = state.arena.x + edgeX * legalRadius;
        state.ship.y = state.arena.y + edgeY * legalRadius;
        state.ship.vx = edgeX * 180;
        state.ship.vy = edgeY * 180;
        state.camera.x = state.arena.x;
        state.camera.y = state.arena.y;
        const before = browser.window.ND.RenderDebug.screenAnchor(state, layout);
        const context = `${layout.label} ${layout.width}x${layout.height} edge ${edgeX},${edgeY}`;

        game.damageBoss(state.boss.maxHealth * 10);
        assert.equal(state.mode, "transition", `${context} did not enter hyperspace`);
        assert.equal(state.cinematic.fromEncounter, 9);
        assert.equal(state.cinematic.toEncounter, 1);
        assert.equal(state.cinematic.fromSector, 1);
        assert.equal(state.cinematic.toSector, 2);
        const during = browser.window.ND.RenderDebug.screenAnchor(state, layout);
        approximately(during.x, before.x, 1e-7, `${context} transition anchor x`);
        approximately(during.y, before.y, 1e-7, `${context} transition anchor y`);

        const frameLimit = Math.ceil((CONFIG.cinematic.duration + 0.2) / CONFIG.world.fixedStep);
        for (let frame = 0; frame < frameLimit && state.mode === "transition"; frame += 1) game.step(CONFIG.world.fixedStep);
        assert.equal(state.mode, "playing", `${context} did not finish hyperspace`);
        assert.equal(state.sector, 2, `${context} did not enter Sector 2`);
        assert.equal(state.encounter, 1, `${context} did not wrap to Stage 1`);
        const after = browser.window.ND.RenderDebug.screenAnchor(state, layout);
        approximately(after.x, before.x, 1e-7, `${context} handoff anchor x`);
        approximately(after.y, before.y, 1e-7, `${context} handoff anchor y`);

        browser.window.dispatchEvent({ type: "resize" });
        game.step(CONFIG.world.fixedStep);
        const afterResize = browser.window.ND.RenderDebug.screenAnchor(state, layout);
        approximately(afterResize.x, before.x, 1e-7, `${context} post-resize anchor x`);
        approximately(afterResize.y, before.y, 1e-7, `${context} post-resize anchor y`);
        const field = state.combatField;
        assert.equal(field.active, true, `${context} Stage 1 field is inactive after resize`);
        assert.ok(state.ship.x - state.ship.radius >= field.x - field.halfWidth - 1e-7, `${context} ship escaped left field edge after resize`);
        assert.ok(state.ship.x + state.ship.radius <= field.x + field.halfWidth + 1e-7, `${context} ship escaped right field edge after resize`);
        assert.ok(state.ship.y - state.ship.radius >= field.y - field.halfHeight - 1e-7, `${context} ship escaped top field edge after resize`);
        assert.ok(state.ship.y + state.ship.radius <= field.y + field.halfHeight + 1e-7, `${context} ship escaped bottom field edge after resize`);
      }
    }
  });

  test("deterministic weapon fire traverses all nine stages through the alien boss within caps", () => {
    const { game, CONFIG } = boot(918273, { width: 1280, height: 720 });
    const state = game.state;
    const visited = new Set([state.encounter]);
    const capByCollection = {
      asteroids: CONFIG.caps.asteroids,
      aliens: CONFIG.caps.aliens,
      playerBullets: CONFIG.caps.playerProjectiles,
      enemyBullets: CONFIG.caps.enemyProjectiles,
      mines: CONFIG.caps.mines,
      pickups: CONFIG.caps.pickups,
      effects: CONFIG.caps.particles,
      floaters: CONFIG.caps.floaters
    };
    const limit = Math.ceil(360 / CONFIG.world.fixedStep);
    for (let frame = 0; frame < limit && !(state.sector === 2 && state.encounter === 1); frame += 1) {
      state.ship.invulnerable = 1e9;
      let target = state.boss && (state.boss.nodes.find((node) => node.health > 0) || state.boss);
      const data = state.encounterData;
      if (!target && data) {
        target = state.asteroids.concat(state.aliens)
          .filter((entity) => !entity.dead && entity.required && entity.generation === data.generation)
          .sort((first, second) => distanceSquaredForTest(first, state.ship) - distanceSquaredForTest(second, state.ship))[0];
      }
      if (!target) target = state.asteroids.concat(state.aliens).find((entity) => !entity.dead);
      if (target) {
        const angle = Math.atan2(target.y - state.ship.y, target.x - state.ship.x);
        game.input.touchAimX = Math.cos(angle);
        game.input.touchAimY = Math.sin(angle);
      } else {
        game.input.touchAimX = 0;
        game.input.touchAimY = 0;
      }
      game.input.keys.space = true;
      for (const pickup of state.pickups.slice()) if (!pickup.dead) game.applyPickup(pickup);
      game.step(CONFIG.world.fixedStep);
      visited.add(state.encounter);
      for (const [name, cap] of Object.entries(capByCollection)) {
        assert.ok(state[name].length <= cap, `${name} exceeded ${cap} during full journey`);
      }
    }
    assert.equal(state.sector, 2, "weapon-driven journey did not wrap after Stage 9");
    assert.equal(state.encounter, 1);
    assert.deepEqual(Array.from(visited).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.equal(state.bossesDefeated, 1, "alien boss was not defeated by weapon fire");
  });
};

function distanceSquaredForTest(first, second) {
  const dx = first.x - second.x;
  const dy = first.y - second.y;
  return dx * dx + dy * dy;
}

module.exports.boot = boot;
module.exports.clearEntities = clearEntities;
module.exports.freezeDirector = freezeDirector;
