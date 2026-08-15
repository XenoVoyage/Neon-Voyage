"use strict";

const { assert, approximately } = require("./_harness");
const { buildBrowser, loadRuntimeScripts } = require("./_browser-harness");

function boot(seed, viewport) {
  const browser = buildBrowser({ now: 1700000000000 + (seed || 0) });
  if (viewport) {
    browser.window.innerWidth = viewport.width;
    browser.window.innerHeight = viewport.height;
  }
  loadRuntimeScripts(browser);
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
  if (!data || data.spec.bossType) return;
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

function advanceEnigmaToChoice(game, CONFIG) {
  const limit = Math.ceil(CONFIG.powerups.enigma.slowdownSeconds / CONFIG.world.fixedStep) + 2;
  for (let frame = 0; frame < limit && game.snapshot().enigma.phase !== "choosing"; frame += 1) {
    game.step(CONFIG.world.fixedStep);
  }
  const draft = game.snapshot().enigma;
  assert.equal(draft.phase, "choosing", "Enigma slowdown did not reach its mandatory choice");
  assert.equal(draft.timeScale, 0);
  return draft;
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
    const runtime = boot(100);
    for (const [kindIndex, kind] of Object.keys(runtime.CONFIG.asteroids).entries()) {
      const { game, CONFIG } = boot(100 + kindIndex);
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

  test("carriers use their configured child type, count, reward, and lifetime cap", () => {
    const { game, CONFIG } = boot(211);
    const state = game.state;
    game.setStage(8, 1);
    clearEntities(state);
    freezeDirector(state);
    state.ship.x = 0;
    state.ship.y = 0;
    const pattern = CONFIG.aliens.carrier.pattern;
    const carrier = game.spawnAlien("carrier", { x: 400, y: 0, required: false, noDrops: true });

    carrier.cooldown = 0;
    game.step(CONFIG.world.fixedStep);
    let children = state.aliens.filter((alien) => alien.parent === carrier && !alien.dead);
    assert.equal(children.length, pattern.count);
    assert.ok(children.every((alien) => alien.type === pattern.spawnType));
    assert.ok(children.every((alien) => alien.score === pattern.childScore && alien.noDrops && !alien.required));

    for (let cycle = 0; cycle < pattern.maxChildren + 2; cycle += 1) {
      carrier.cooldown = 0;
      game.step(CONFIG.world.fixedStep);
    }
    children = state.aliens.filter((alien) => alien.parent === carrier && !alien.dead);
    assert.equal(children.length, pattern.maxChildren, "carrier exceeded its configured living-child cap");
  });

  test("gunships execute a warning-active-cooldown laser FSM without projectile spam", () => {
    const { game, CONFIG } = boot(221);
    const state = game.state;
    game.setStage(17, 1);
    clearEntities(state);
    freezeDirector(state);
    state.ship.x = 0;
    state.ship.y = 0;
    state.ship.shield = 0;
    state.ship.invulnerable = 0;
    const pattern = CONFIG.aliens.gunship.pattern;
    const gunship = game.spawnAlien("gunship", {
      x: Math.min(pattern.range - 20, pattern.preferredRange),
      y: 0,
      required: false,
      noDrops: true,
      cooldown: 0
    });
    const hull = state.ship.hull;
    game.step(CONFIG.world.fixedStep);
    assert.equal(gunship.state, "beamWarning");
    assert.equal(state.ship.hull, hull, "gunship warning damaged the ship");
    assert.equal(state.enemyBullets.length, 0, "laser gunship emitted ordinary projectiles");
    game.step(CONFIG.world.fixedStep);
    assert.equal(gunship.telegraph.kind, "laserWarning");

    const warningLimit = Math.ceil((pattern.warning + 0.1) / CONFIG.world.fixedStep);
    for (let frame = 0; frame < warningLimit && gunship.state !== "beamActive"; frame += 1) game.step(CONFIG.world.fixedStep);
    assert.equal(gunship.state, "beamActive", "gunship warning never armed its laser");
    assert.equal(state.ship.hull, hull);
    state.ship.invulnerable = 0;
    game.step(CONFIG.world.fixedStep);
    approximately(
      state.ship.hull,
      hull - pattern.damage * CONFIG.difficulty.damageScale(1, 17),
      1e-9,
      "gunship laser damage"
    );
    const afterHit = state.ship.hull;
    state.ship.invulnerable = 0;
    game.step(CONFIG.world.fixedStep);
    assert.equal(state.ship.hull, afterHit, "gunship laser ignored its tick cadence");
    const activeLimit = Math.ceil((pattern.active + 0.1) / CONFIG.world.fixedStep);
    for (let frame = 0; frame < activeLimit && gunship.state === "beamActive"; frame += 1) game.step(CONFIG.world.fixedStep);
    assert.equal(gunship.state, "approach");
    assert.ok(gunship.cooldown > 0, "gunship skipped its configured cooldown");
    assert.equal(state.enemyBullets.length, 0);
  });

  test("gunship warning locks an actionable line, active fire sweeps at its bounded authored rate, and culling restores that aim", () => {
    const { browser, game, CONFIG, Core } = boot(2211, { width: 568, height: 320 });
    const state = game.state;
    game.setStage(17, 1);
    clearEntities(state);
    freezeDirector(state);
    Object.assign(state.ship, { x: 0, y: 0, shield: 0, invulnerable: 0 });
    const pattern = CONFIG.aliens.gunship.pattern;
    const gunship = game.spawnAlien("gunship", {
      x: Math.min(pattern.range - 20, pattern.preferredRange),
      y: 0,
      required: false,
      noDrops: true,
      cooldown: 0
    });

    game.step(CONFIG.world.fixedStep);
    assert.equal(gunship.state, "beamWarning");
    const warningAngle = gunship.beamAngle;
    assert.ok(Number.isFinite(warningAngle));
    state.ship.x = gunship.x;
    state.ship.y = gunship.y + 180;
    const hull = state.ship.hull;
    const warningLimit = Math.ceil((pattern.warning + 0.1) / CONFIG.world.fixedStep);
    for (let frame = 0; frame < warningLimit && gunship.state !== "beamActive"; frame += 1) {
      game.step(CONFIG.world.fixedStep);
      approximately(Core.angleDelta(warningAngle, gunship.beamAngle), 0, 1e-12, "locked warning angle");
    }
    assert.equal(gunship.state, "beamActive");

    const activeStart = gunship.beamAngle;
    for (let frame = 1; frame <= 12; frame += 1) {
      state.ship.invulnerable = 0;
      game.step(CONFIG.world.fixedStep);
      const expectedSweep = pattern.sweepAngularSpeed * CONFIG.world.fixedStep * frame;
      approximately(Core.angleDelta(activeStart, gunship.beamAngle), expectedSweep, 1e-12, "bounded laser sweep");
      assert.equal(state.ship.hull, hull, "ship perpendicular to the warned line was hit by retargeting laser fire");
    }

    gunship.state = "beamActive";
    gunship.stateTimer = 0.5;
    gunship.damageTimer = 1;
    gunship.beamAngle = 1.234;
    const hardDistance = Math.max(640, Math.hypot(browser.window.innerWidth, browser.window.innerHeight)) *
      CONFIG.culling.hardCullViewports + 100;
    gunship.x = state.ship.x + hardDistance;
    gunship.y = state.ship.y;
    game.step(CONFIG.world.fixedStep);
    const queued = state.encounterData.requeue.find((entry) => entry.kind === "gunship");
    assert.ok(queued, "hard-cull did not requeue the active gunship state");
    const queuedAngle = Core.normalizeAngle(1.234 + pattern.sweepAngularSpeed * CONFIG.world.fixedStep);
    approximately(queued.beamAngle, queuedAngle, 1e-12, "queued gunship aim");
    for (let frame = 0; frame < 40 && state.encounterData.requeue.length; frame += 1) game.step(CONFIG.world.fixedStep);
    const restored = state.aliens.find((alien) => alien.type === "gunship" && !alien.dead);
    assert.ok(restored, "hard-culled gunship did not respawn");
    assert.equal(restored.state, "beamActive");
    approximately(restored.beamAngle,
      Core.normalizeAngle(queuedAngle + pattern.sweepAngularSpeed * CONFIG.world.fixedStep),
      1e-12, "restored gunship aim");
  });

  test("a lethal gunship beam stops later aliens from firing in the captured game-over step", () => {
    const { game, CONFIG } = boot(222);
    const state = game.state;
    game.setStage(17, 1);
    clearEntities(state);
    freezeDirector(state);
    Object.assign(state.ship, { x: 0, y: 0, hull: 1, shield: 0, invulnerable: 0 });
    const gunship = game.spawnAlien("gunship", { x: 300, y: 0, required: false, noDrops: true });
    gunship.state = "beamActive";
    gunship.stateTimer = 1;
    gunship.damageTimer = 0;
    const laterScout = game.spawnAlien("scout", { x: 180, y: 0, required: false, noDrops: true });
    laterScout.cooldown = 0;

    game.step(CONFIG.world.fixedStep);
    assert.equal(state.mode, "gameover");
    assert.equal(state.enemyBullets.length, 0, "a later alien fired after lethal laser damage captured game over");
    assert.equal(laterScout.cooldown, 0, "a later alien advanced after the lethal laser");
    const frozen = JSON.stringify({ bullets: state.enemyBullets, scout: laterScout, score: state.score, objective: game.snapshot().objective });
    game.step(CONFIG.world.fixedStep);
    assert.equal(JSON.stringify({ bullets: state.enemyBullets, scout: laterScout, score: state.score, objective: game.snapshot().objective }), frozen,
      "lethal gunship game-over state continued simulating");
  });

  test("Brood Carrier far armor, close damage, lancer children, and lifetime cap use one config", () => {
    const { game, CONFIG } = boot(231);
    const state = game.state;
    game.setStage(18, 1);
    clearEntities(state);
    freezeDirector(state);
    state.ship.x = 0;
    state.ship.y = 0;
    const definition = CONFIG.aliens.broodCarrier;
    const armored = game.spawnAlien("broodCarrier", {
      x: definition.rangeArmor.distance + 50,
      y: 0,
      health: 100,
      required: false,
      noDrops: true
    });
    game.damageThreat(armored, 10, "player");
    approximately(armored.health, 100 - 10 * definition.rangeArmor.multiplier, 1e-9, "far Brood armor");
    armored.x = definition.rangeArmor.distance - 1;
    game.damageThreat(armored, 10, "player");
    approximately(armored.health, 90 - 10 * definition.rangeArmor.multiplier, 1e-9, "close Brood damage");
    armored.x = definition.rangeArmor.distance + 50;
    game.damageThreat(armored, 10, "environment");
    approximately(armored.health, 80 - 10 * definition.rangeArmor.multiplier, 1e-9, "environmental Brood damage");

    clearEntities(state);
    const pattern = definition.pattern;
    const carrier = game.spawnAlien("broodCarrier", {
      x: pattern.preferredRange,
      y: 0,
      health: 1e9,
      required: false,
      noDrops: true,
      cooldown: 0
    });
    game.step(CONFIG.world.fixedStep);
    let children = state.aliens.filter((alien) => alien.parent === carrier && !alien.dead);
    assert.equal(children.length, pattern.count);
    assert.ok(children.every((alien) => alien.type === pattern.spawnType && alien.noDrops && !alien.required));
    for (let cycle = 0; cycle < pattern.maxChildren + 2; cycle += 1) {
      carrier.cooldown = 0;
      game.step(CONFIG.world.fixedStep);
    }
    children = state.aliens.filter((alien) => alien.parent === carrier && !alien.dead);
    assert.equal(children.length, pattern.maxChildren);
  });

  test("Brood Carrier lineage survives repeated hard-culls without exceeding its six-child cap", () => {
    const { browser, game, CONFIG } = boot(232, { width: 640, height: 360 });
    const state = game.state;
    game.setStage(18, 1);
    clearEntities(state);
    freezeDirector(state);
    const pattern = CONFIG.aliens.broodCarrier.pattern;
    const carrier = game.spawnAlien("broodCarrier", {
      x: Math.min(pattern.launchRange - 20, pattern.preferredRange),
      y: 0,
      required: false,
      noDrops: true
    });
    const children = () => state.aliens.filter((alien) => !alien.dead && alien.parentLineageId === carrier.lineageId);
    const hardDistance = Math.max(640, Math.hypot(browser.window.innerWidth, browser.window.innerHeight)) *
      CONFIG.culling.hardCullViewports + 100;

    carrier.cooldown = 0;
    game.step(CONFIG.world.fixedStep);
    assert.equal(children().length, pattern.count);
    for (let cycle = 0; cycle < 4; cycle += 1) {
      const beforeCull = children();
      for (const child of beforeCull) {
        child.x = state.ship.x + hardDistance;
        child.y = state.ship.y;
      }
      carrier.cooldown = 0;
      game.step(CONFIG.world.fixedStep);
      const queuedChildren = state.encounterData.requeue.filter((entry) => entry.parentLineageId === carrier.lineageId);
      assert.equal(queuedChildren.length, beforeCull.length, `cycle ${cycle + 1} lost a culled child`);
      assert.ok(queuedChildren.every((entry) => Number.isFinite(entry.lineageId) && Number.isFinite(entry.parentLineageId)));
      for (let frame = 0; frame < 40 && state.encounterData.requeue.length; frame += 1) game.step(CONFIG.world.fixedStep);
      assert.equal(state.encounterData.requeue.length, 0, `cycle ${cycle + 1} did not restore its lineage`);
      carrier.cooldown = 0;
      game.step(CONFIG.world.fixedStep);
      assert.ok(children().length <= pattern.maxChildren, `cycle ${cycle + 1} exceeded the lineage cap`);
    }
    carrier.cooldown = 0;
    game.step(CONFIG.world.fixedStep);
    const finalChildren = children();
    assert.equal(finalChildren.length, pattern.maxChildren);
    assert.equal(new Set(finalChildren.map((child) => child.lineageId)).size, pattern.maxChildren,
      "requeue duplicated a child lineage");
    assert.ok(finalChildren.every((child) => child.parent === carrier && child.parentLineageId === carrier.lineageId),
      "restored child did not relink to its live carrier");
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
    const children = state.asteroids.filter((item) =>
      !item.dead && item.required && item.kind === CONFIG.asteroids.volatile.deathBurst.fragmentKind
    );
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
    assert.ok(firstGeneration.every((item) => item.kind === "rock" && item.splitRemaining === 1));
    assert.equal(data.waveRequiredTotal, 4);

    firstGeneration.forEach((item) => game.killThreat(item, "player"));
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

  test("an Auric Colossus creates an exact one-to-three-to-six mixed hazard tree", () => {
    const { game } = boot(361);
    const state = game.state;
    game.setStage(4, 1);
    clearEntities(state);
    freezeDirector(state);
    const data = state.encounterData;
    state.ship.x = 0;
    state.ship.y = 0;
    const parent = game.spawnAsteroid("auricColossus", {
      x: 420,
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

    game.damageThreat(parent, 2, "player");
    const firstGeneration = state.asteroids.filter((item) => !item.dead);
    assert.equal(firstGeneration.length, 3);
    assert.ok(firstGeneration.every((item) => item.kind === "auricShard" && item.splitRemaining === 1));
    assert.deepEqual(Array.from(new Set(firstGeneration.map((item) => item.hazardVariant))).sort(), ["explosive", "magnetic"]);
    assert.equal(data.waveRequiredTotal, 4);

    firstGeneration.forEach((item) => game.killThreat(item, "player"));
    const finalGeneration = state.asteroids.filter((item) => !item.dead);
    assert.equal(finalGeneration.length, 6);
    assert.ok(finalGeneration.every((item) => item.kind === "auricShard" && item.splitRemaining === 0));
    assert.deepEqual(Array.from(new Set(finalGeneration.map((item) => item.hazardVariant))).sort(), ["explosive", "magnetic"]);
    assert.equal(data.waveRequiredTotal, 10);
    assert.equal(data.stageRequiredTotal, 10);
    assert.equal(data.waveRequiredCleared, 4);
    finalGeneration.forEach((item) => game.killThreat(item, "player"));
    assert.equal(data.waveRequiredCleared, 10);
    assert.equal(state.asteroids.filter((item) => !item.dead).length, 0, "Auric descendants split beyond the authored tree");
  });

  test("magnetic Auric Shards pull the ship with one aggregate cap while remaining ballistic", () => {
    const { game, CONFIG } = boot(366);
    const state = game.state;
    game.setStage(13, 1);
    clearEntities(state);
    freezeDirector(state);
    const values = CONFIG.asteroids.auricShard.variants.magnetic;
    Object.assign(state.ship, { x: 0, y: 0, vx: 0, vy: 0, dashTime: 0 });
    const shard = game.spawnAsteroid("auricShard", {
      x: values.range * 0.5,
      y: 0,
      speed: 0,
      hazardVariant: "magnetic",
      required: false,
      noDrops: true
    });
    game.step(CONFIG.world.fixedStep);
    const expectedAcceleration = values.acceleration * (1 - 0.5 * 0.45);
    approximately(state.ship.vx, expectedAcceleration * CONFIG.world.fixedStep, 1e-9, "single magnetic pull");
    assert.equal(state.ship.vy, 0);
    assert.ok(Math.abs(shard.vx) < 1e-12, "magnetic shard stopped being ballistic");
    assert.ok(Math.abs(shard.vy) < 1e-12, "magnetic shard stopped being ballistic");

    clearEntities(state);
    Object.assign(state.ship, { x: 0, y: 0, vx: 0, vy: 0, dashTime: 0 });
    game.spawnAsteroid("auricShard", {
      x: values.range + 1,
      y: 0,
      speed: 0,
      hazardVariant: "magnetic",
      required: false,
      noDrops: true
    });
    game.step(CONFIG.world.fixedStep);
    assert.equal(state.ship.vx, 0, "magnetic pull escaped its configured range");

    clearEntities(state);
    Object.assign(state.ship, { x: 0, y: 0, vx: 0, vy: 0, dashTime: 0 });
    for (let index = 0; index < 8; index += 1) {
      game.spawnAsteroid("auricShard", {
        x: values.range * 0.2,
        y: index * 0.01,
        speed: 0,
        hazardVariant: "magnetic",
        required: false,
        noDrops: true,
        collisionGrace: 1
      });
    }
    game.step(CONFIG.world.fixedStep);
    approximately(Math.hypot(state.ship.vx, state.ship.vy), values.totalAccelerationCap * CONFIG.world.fixedStep, 1e-7,
      "aggregate magnetic pull cap");
    assert.ok(state.asteroids.every((item) => Math.abs(item.vx) < 1e-12 && Math.abs(item.vy) < 1e-12));

    clearEntities(state);
    Object.assign(state.ship, { x: 0, y: 0, vx: values.speedCap - 1, vy: 0, dashTime: 0 });
    game.spawnAsteroid("auricShard", {
      x: values.range * 0.25,
      y: 0,
      speed: 0,
      hazardVariant: "magnetic",
      required: false,
      noDrops: true
    });
    game.step(CONFIG.world.fixedStep);
    assert.ok(Math.hypot(state.ship.vx, state.ship.vy) <= values.speedCap + 1e-9,
      "magnetic acceleration pushed a normal ship above its speed cap");

    clearEntities(state);
    const alreadyFast = Math.min(CONFIG.world.playerMaxSpeed - 1, values.speedCap + 40);
    Object.assign(state.ship, { x: 0, y: 0, vx: alreadyFast, vy: 0, dashTime: 0 });
    game.spawnAsteroid("auricShard", {
      x: values.range * 0.25,
      y: 0,
      speed: 0,
      hazardVariant: "magnetic",
      required: false,
      noDrops: true
    });
    const expectedPrePullSpeed = alreadyFast * Math.exp(-CONFIG.world.playerDrag * CONFIG.world.fixedStep);
    game.step(CONFIG.world.fixedStep);
    approximately(Math.hypot(state.ship.vx, state.ship.vy), expectedPrePullSpeed, 1e-9,
      "magnetic cap abruptly slowed or further accelerated an already-fast ship");

    clearEntities(state);
    Object.assign(state.ship, { x: 0, y: 0, vx: 0, vy: 0, dashTime: 0 });
    game.spawnAsteroid("auricShard", {
      x: 0,
      y: 0,
      speed: 0,
      hazardVariant: "magnetic",
      required: false,
      noDrops: true
    });
    game.step(CONFIG.world.fixedStep);
    assert.ok(Number.isFinite(state.ship.vx) && Number.isFinite(state.ship.vy), "co-located magnetic pull poisoned ship state");
  });

  test("explosive Auric Shards damage once inside their configured blast and remain local", () => {
    const { game, CONFIG } = boot(368);
    const state = game.state;
    game.setStage(4, 1);
    clearEntities(state);
    freezeDirector(state);
    const values = CONFIG.asteroids.auricShard.variants.explosive;
    Object.assign(state.ship, { x: 0, y: 0, shield: 0, invulnerable: 0 });
    const inside = game.spawnAsteroid("auricShard", {
      x: values.blastRadius - 1,
      y: 0,
      speed: 0,
      health: 1,
      hazardVariant: "explosive",
      splitRemaining: 0,
      required: false,
      noDrops: true
    });
    const hull = state.ship.hull;
    assert.equal(game.killThreat(inside, "player"), true);
    const scaledDamage = values.damage * CONFIG.difficulty.damageScale(state.sector, state.encounter);
    approximately(state.ship.hull, hull - scaledDamage, 1e-9, "explosive shard damage");
    assert.equal(game.killThreat(inside, "player"), false, "explosive shard detonated twice");
    approximately(state.ship.hull, hull - scaledDamage, 1e-9);

    state.ship.invulnerable = 0;
    const outside = game.spawnAsteroid("auricShard", {
      x: values.blastRadius + 1,
      y: 0,
      speed: 0,
      health: 1,
      hazardVariant: "explosive",
      splitRemaining: 0,
      required: false,
      noDrops: true
    });
    game.killThreat(outside, "player");
    approximately(state.ship.hull, hull - scaledDamage, 1e-9, "explosive shard blast escaped its configured radius");
  });

  test("Corona warning, rotating beam, off-axis safety, cadence, and death blast stay deterministic", () => {
    const { game, CONFIG } = boot(369);
    const state = game.state;
    game.setStage(15, 1);
    clearEntities(state);
    freezeDirector(state);
    const values = CONFIG.asteroids.corona.hazard;
    const corona = game.spawnAsteroid("corona", {
      x: 0,
      y: 0,
      speed: 0,
      health: 100,
      hazardPhase: "warning",
      hazardTimer: 1,
      hazardAngle: 0,
      required: false,
      noDrops: true
    });
    state.ship.shield = 0;
    state.ship.invulnerable = 0;
    state.ship.x = 100;
    state.ship.y = 0;
    const hull = state.ship.hull;
    game.step(CONFIG.world.fixedStep);
    assert.equal(corona.hazardPhase, "warning");
    assert.equal(corona.telegraph.kind, "radiationWarning");
    assert.equal(state.ship.hull, hull, "Corona warning dealt damage");
    approximately(corona.hazardAngle, values.angularSpeed * CONFIG.world.fixedStep, 1e-12, "Corona rotation");

    corona.hazardPhase = "active";
    corona.hazardTimer = 1;
    corona.hazardHitTimer = 0;
    corona.hazardAngle = 0;
    state.ship.invulnerable = 0;
    const activeAngle = values.angularSpeed * CONFIG.world.fixedStep;
    const perpendicular = values.width * 0.5 + state.ship.radius + 2;
    state.ship.x = Math.cos(activeAngle) * 100 - Math.sin(activeAngle) * perpendicular;
    state.ship.y = Math.sin(activeAngle) * 100 + Math.cos(activeAngle) * perpendicular;
    game.step(CONFIG.world.fixedStep);
    assert.equal(state.ship.hull, hull, "off-axis ship was hit by Corona beam");

    corona.hazardPhase = "active";
    corona.hazardTimer = 1;
    corona.hazardHitTimer = 0;
    corona.hazardAngle = 0;
    state.ship.invulnerable = 0;
    state.ship.x = 100;
    state.ship.y = 0;
    game.step(CONFIG.world.fixedStep);
    const scaledBeamDamage = values.damage * CONFIG.difficulty.damageScale(state.sector, state.encounter);
    approximately(state.ship.hull, hull - scaledBeamDamage, 1e-9, "Corona beam damage");
    const afterHit = state.ship.hull;
    state.ship.invulnerable = 0;
    game.step(CONFIG.world.fixedStep);
    assert.equal(state.ship.hull, afterHit, "Corona beam ignored its configured tick cadence");

    clearEntities(state);
    state.ship.x = 0;
    state.ship.y = 0;
    state.ship.shield = 0;
    state.ship.invulnerable = 0;
    const blast = CONFIG.asteroids.corona.deathExplosion;
    const dying = game.spawnAsteroid("corona", {
      x: blast.radius - 1,
      y: 0,
      speed: 0,
      health: 1,
      required: false,
      noDrops: true
    });
    const beforeBlast = state.ship.hull;
    game.killThreat(dying, "player");
    const scaledBlastDamage = blast.damage * CONFIG.difficulty.damageScale(state.sector, state.encounter);
    approximately(state.ship.hull, beforeBlast - scaledBlastDamage, 1e-9, "Corona death explosion");
    state.ship.invulnerable = 0;
    const outside = game.spawnAsteroid("corona", {
      x: blast.radius + 1,
      y: 0,
      speed: 0,
      health: 1,
      required: false,
      noDrops: true
    });
    game.killThreat(outside, "player");
    approximately(state.ship.hull, beforeBlast - scaledBlastDamage, 1e-9, "Corona death blast escaped its radius");
  });

  test("a lethal Corona trade captures earned score once and freezes later mid-step combat mutation", () => {
    const { browser, game, CONFIG } = boot(370);
    const state = game.state;
    game.setStage(15, 1);
    clearEntities(state);
    freezeDirector(state);
    Object.assign(state.ship, { x: 0, y: 0, hull: 1, shield: 0, invulnerable: 0 });
    const data = state.encounterData;
    const corona = game.spawnAsteroid("corona", {
      x: 0,
      y: 0,
      speed: 0,
      health: 1,
      required: true,
      generation: data.generation,
      waveIndex: data.waveIndex,
      noDrops: true
    });
    const laterThreat = game.spawnAsteroid("crystal", {
      x: 300,
      y: 0,
      speed: 0,
      health: 1,
      required: true,
      generation: data.generation,
      waveIndex: data.waveIndex,
      noDrops: true
    });
    data.waveRequiredTotal = 2;
    data.stageRequiredTotal = 2;
    const bullet = (id, x) => ({
      id, x, y: 0, px: x, py: 0, vx: 0, vy: 0, radius: 3, damage: 10,
      life: 2, maxLife: 2, kind: "bolt", color: "#fff", pierce: 0,
      turnRate: 0, blastRadius: 0, hits: [], dead: false
    });
    state.playerBullets.push(bullet(993700, corona.x), bullet(993701, laterThreat.x));

    game.step(CONFIG.world.fixedStep);
    const earned = Math.round(CONFIG.asteroids.corona.score * CONFIG.difficulty.scoreScale(1, 15));
    assert.equal(earned, 598);
    assert.equal(state.mode, "gameover");
    assert.equal(state.score, earned, "live score changed after final-score capture");
    assert.equal(browser.elements.get("final-score").textContent, "000598");
    assert.equal(browser.elements.get("high-score").textContent, "000598");
    assert.equal(corona.dead, true);
    assert.equal(laterThreat.dead, false, "a later projectile mutated combat after the lethal trade");
    assert.equal(data.waveRequiredCleared, 1, "objective advanced after final-score capture");
    assert.equal(state.playerBullets.find((entry) => entry.id === 993701).dead, false,
      "later projectile resolved after game over");

    const frozen = JSON.stringify({
      score: state.score,
      cleared: data.waveRequiredCleared,
      stats: state.stats,
      bullets: state.playerBullets,
      pickups: state.pickups,
      effects: state.effects,
      hull: state.ship.hull
    });
    assert.equal(game.killThreat(corona, "player"), false, "lethal blast could be processed twice");
    game.step(CONFIG.world.fixedStep);
    assert.equal(JSON.stringify({
      score: state.score,
      cleared: data.waveRequiredCleared,
      stats: state.stats,
      bullets: state.playerBullets,
      pickups: state.pickups,
      effects: state.effects,
      hull: state.ship.hull
    }), frozen, "game-over simulation mutated after a lethal Corona trade");
  });

  test("hard-culling a required threat requeues its exact objective state", () => {
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
    for (const key of ["health", "maxHealth", "radius", "score", "noDrops", "threatCost", "splitRemaining", "gateIndex"]) {
      assert.equal(queued[key], original[key], `requeue lost ${key}`);
    }
    approximately(queued.collisionGrace, Math.max(0, original.collisionGrace), 1e-12, "requeued collision grace");
    for (let frame = 0; frame < 30 && data.requeue.length; frame += 1) game.step(CONFIG.world.fixedStep);
    assert.equal(data.requeue.length, 0, "required fragment did not respawn");
    const restored = state.asteroids.find((item) => !item.dead && item.id !== original.id && item.required);
    assert.ok(restored, "required fragment objective vanished after culling");
    for (const key of ["health", "maxHealth", "radius", "score", "noDrops", "threatCost", "splitRemaining", "gateIndex"]) {
      assert.equal(restored[key], original[key], `respawn changed ${key}`);
    }
    assert.equal(data.waveRequiredTotal, 1, "requeue duplicated the objective total");
    assert.equal(data.waveRequiredCleared, 0, "requeue incorrectly cleared the objective");
  });

  test("hard-culling an active Corona preserves finite hazard state and still blocks a clean wave", () => {
    const { browser, game, CONFIG } = boot(381, { width: 640, height: 360 });
    const state = game.state;
    game.setStage(15, 1);
    clearEntities(state);
    freezeDirector(state);
    const data = state.encounterData;
    data.waveRequiredTotal = 0;
    const diagonal = Math.max(640, Math.hypot(browser.window.innerWidth, browser.window.innerHeight));
    const hazard = game.spawnAsteroid("corona", {
      x: state.ship.x + diagonal * CONFIG.culling.hardCullViewports + 100,
      y: state.ship.y,
      speed: 20,
      hazardPhase: "active",
      hazardTimer: 0.8,
      hazardAngle: 1.25,
      hazardHitTimer: 0.19,
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
    for (const key of ["hazardPhase", "hazardTimer", "hazardAngle", "hazardHitTimer"]) {
      assert.equal(data.requeue[0][key], hazard[key], `Corona requeue lost ${key}`);
      assert.ok(typeof data.requeue[0][key] === "string" || Number.isFinite(data.requeue[0][key]));
    }
    for (let frame = 0; frame < 30 && data.requeue.length; frame += 1) game.step(CONFIG.world.fixedStep);
    assert.equal(data.requeue.length, 0);
    const restored = state.asteroids.find((item) => !item.dead && item.required === false && item.kind === "corona");
    assert.ok(restored, "optional Corona vanished instead of respawning");
    assert.equal(restored.hazardPhase, hazard.hazardPhase);
    assert.ok(Number.isFinite(restored.hazardTimer) && Number.isFinite(restored.hazardAngle) && Number.isFinite(restored.hazardHitTimer));
    assert.equal(data.waveRequiredTotal, 0, "optional requeue corrupted the required counter");
  });

  test("stage APIs expose ordered finite goals and a required survivor prevents premature wave clear", () => {
    const { game, CONFIG } = boot(401);
    const expected = [
      "waves", "waves", "waves", "waves", "titan",
      "waves", "waves", "waves", "waves", "boss",
      "waves", "waves", "waves", "waves", "waves",
      "waves", "waves", "waves", "waves", "boss"
    ];
    expected.forEach((goal, index) => {
      const snapshot = game.setStage(index + 1, 1);
      assert.equal(snapshot.encounter, index + 1);
      assert.equal(snapshot.objective.type, goal);
      assert.equal(snapshot.objective.progress, 0);
      assert.equal(snapshot.objective.complete, false);
      if (goal !== "boss") {
        assert.equal(snapshot.objective.waveNumber, 1);
        assert.equal(snapshot.objective.waveCount, CONFIG.sector.encounters[index].waves.length);
        assert.ok(snapshot.objective.waveRequiredTotal > 0);
      } else {
        assert.equal(CONFIG.sector.encounters[index].bossType, index === 9 ? "harrower" : "leviathan");
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
    assert.equal(data.waveRequiredTotal, 2, "Titan Gate must include its authored Auric Colossus");
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
    assert.equal(data.waveRequiredCleared, data.waveRequiredTotal);
    assert.equal(data.complete, true);
    assert.equal(state.mode, "transition", "Titan destruction did not enter hyperspace immediately");
    assert.equal(state.cinematic.fromEncounter, 5);
    assert.equal(state.cinematic.toEncounter, 6);
  });

  test("Rapid Fire and Tri-Shot coexist, stack additively, and expire independently", () => {
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
    const rapidBeforeStack = state.ship.rapidTimer;
    game.applyPickup(game.spawnPickup(0, 0, "rapid"));
    approximately(state.ship.rapidTimer, rapidBeforeStack + CONFIG.powerups.rapid.duration, CONFIG.world.fixedStep * 1.1);
    approximately(state.ship.triShotTimer, triBeforeRefresh, CONFIG.world.fixedStep * 1.1);
    runSteps(game, triBeforeRefresh + CONFIG.world.fixedStep * 2, CONFIG.world.fixedStep);
    assert.equal(state.ship.triShotTimer, 0);
    assert.ok(state.ship.rapidTimer > 0, "refreshing Rapid incorrectly refreshed Tri-Shot");
    runSteps(game, state.ship.rapidTimer + CONFIG.world.fixedStep * 2, CONFIG.world.fixedStep);
    assert.equal(state.ship.rapidTimer, 0);
  });

  test("temporary weapon pickups change firing behavior, stack independently, and expire", () => {
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
    const novaBeforeStack = state.ship.novaLanceTimer;
    game.applyPickup(game.spawnPickup(0, 0, "novaLance"));
    approximately(state.ship.novaLanceTimer, novaBeforeStack + CONFIG.powerups.novaLance.duration, CONFIG.world.fixedStep * 1.1);
    approximately(state.ship.arcBurstTimer, arcBeforeRefresh - 0.4, CONFIG.world.fixedStep * 1.2, "Nova refresh changed Arc timer");
    runSteps(game, state.ship.arcBurstTimer + CONFIG.world.fixedStep * 2, CONFIG.world.fixedStep);
    assert.equal(state.ship.arcBurstTimer, 0);
    assert.ok(state.ship.novaLanceTimer > 0, "refreshing Nova incorrectly refreshed Arc");
    state.playerBullets.length = 0;
    runSteps(game, CONFIG.powerups.novaLance.cooldown + CONFIG.world.fixedStep * 2, CONFIG.world.fixedStep);
    assert.ok(!state.playerBullets.some((bullet) => bullet.kind === "arc"), "expired Arc Burst kept firing");
    assert.ok(state.playerBullets.some((bullet) => bullet.kind === "lance"), "active Nova Lance stopped firing");
  });

  test("temporary pickup duration adds to a strict four-stack cap", () => {
    const { game, CONFIG } = boot(671);
    const state = game.state;
    clearEntities(state);
    freezeDirector(state);
    const timers = {
      rapid: "rapidTimer",
      triShot: "triShotTimer",
      piercing: "piercingTimer",
      arcBurst: "arcBurstTimer",
      novaLance: "novaLanceTimer",
      amplifier: "amplifierTimer",
      aegis: "aegisTimer"
    };
    for (const [kind, timer] of Object.entries(timers)) {
      for (let stack = 0; stack < CONFIG.powerups.temporaryStackLimit + 2; stack += 1) {
        game.applyPickup(game.spawnPickup(0, 0, kind));
        state.pickups.length = 0;
      }
      assert.equal(
        state.ship[timer],
        CONFIG.powerups[kind].duration * CONFIG.powerups.temporaryStackLimit,
        `${kind} exceeded its additive duration cap`
      );
    }
    runSteps(game, 1, CONFIG.world.fixedStep);
    const rapidBefore = state.ship.rapidTimer;
    assert.ok(rapidBefore < CONFIG.powerups.rapid.duration * CONFIG.powerups.temporaryStackLimit);
    game.applyPickup(game.spawnPickup(0, 0, "rapid"));
    assert.equal(state.ship.rapidTimer, CONFIG.powerups.rapid.duration * CONFIG.powerups.temporaryStackLimit);
    assert.ok(state.ship.triShotTimer < CONFIG.powerups.triShot.duration * CONFIG.powerups.temporaryStackLimit,
      "stacking Rapid changed another temporary timer");
  });

  test("module upgrade is permanent for the run and remains bounded", () => {
    const { game, CONFIG } = boot(681);
    const state = game.state;
    const moduleCount = Object.keys(CONFIG.weapons.modules).length;
    game.setStage(19, 1);
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

    for (let index = 0; index < moduleCount * CONFIG.weapons.maxModuleTier; index += 1) {
      state.pickups.length = 0;
      game.applyPickup(game.spawnPickup(0, 0, "moduleUpgrade"));
    }
    assert.equal(Object.keys(state.ship.modules).length, moduleCount, "normal upgrades did not reach every module slot");
    for (const id of Object.keys(CONFIG.weapons.modules)) {
      assert.equal(state.ship.modules[id], CONFIG.weapons.maxModuleTier, `${id} did not reach its bounded tier cap`);
    }
    assert.equal(CONFIG.weapons.maxModuleTier, 5);
    assert.ok(state.ship.modules.homingSalvo && state.ship.modules.radialArray, "passive modules were unreachable through normal upgrades");
    const capped = JSON.stringify(state.ship.modules);
    state.pickups.length = 0;
    game.applyPickup(game.spawnPickup(0, 0, "moduleUpgrade"));
    assert.equal(JSON.stringify(state.ship.modules), capped, "overflow upgrade exceeded a module tier or slot cap");
  });

  test("Homing Salvo and Radial Array fire autonomously, persist for the run, and respect projectile caps", () => {
    const { game, CONFIG } = boot(691);
    const state = game.state;
    game.setStage(5, 1);
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

  test("Mk V autonomous modules create the authored bullet-hell volley within shared caps", () => {
    const { game, CONFIG } = boot(693);
    const state = game.state;
    clearEntities(state);
    freezeDirector(state);
    state.ship.modules.homingSalvo = 5;
    state.ship.modules.radialArray = 5;
    state.ship.modules.drone = 5;
    state.ship.weaponTimers.homingSalvo = 0;
    state.ship.weaponTimers.radialArray = 0;

    game.step(CONFIG.world.fixedStep);
    assert.equal(state.playerBullets.length, 0, "targetless autonomous modules fired into an empty field");
    assert.equal(state.ship.weaponTimers.homingSalvo, 0);
    assert.equal(state.ship.weaponTimers.radialArray, 0);

    const target = game.spawnAsteroid("armored", {
      x: state.ship.x + 240,
      y: state.ship.y,
      speed: 0,
      health: 1e9,
      required: false,
      noDrops: true
    });
    assert.ok(target);
    game.step(CONFIG.world.fixedStep);
    assert.equal(state.playerBullets.filter((bullet) => bullet.kind === "missile").length,
      CONFIG.weapons.modules.homingSalvo.tiers[4].projectiles);
    assert.equal(state.playerBullets.filter((bullet) => bullet.kind === "radial").length,
      CONFIG.weapons.modules.radialArray.tiers[4].projectiles);
    assert.equal(state.ship.drones.length, CONFIG.weapons.modules.drone.tiers[4].drones);
    runSteps(game, 45, CONFIG.world.fixedStep, () => {
      assert.ok(state.playerBullets.length <= CONFIG.caps.playerProjectiles);
      assert.ok(state.ship.drones.length <= CONFIG.caps.drones);
    });
  });

  test("Tesla Coil chains a bounded target count on its deterministic cooldown", () => {
    const { game, CONFIG } = boot(694);
    const state = game.state;
    clearEntities(state);
    freezeDirector(state);
    state.ship.modules.teslaCoil = 5;
    state.ship.weaponTimers.teslaCoil = 0;
    const values = CONFIG.weapons.modules.teslaCoil.tiers[4];
    const targets = Array.from({ length: values.chains + 1 }, (_, index) => game.spawnAsteroid("crystal", {
      x: state.ship.x + 120 + index * 90,
      y: state.ship.y,
      speed: 0,
      radius: 12,
      health: 100,
      required: false,
      threatCost: 0,
      noDrops: true
    }));

    game.step(CONFIG.world.fixedStep);
    targets.slice(0, values.chains).forEach((target, index) => {
      approximately(target.health, 100 - values.damage, 1e-9, `Tesla target ${index + 1}`);
    });
    assert.equal(targets.at(-1).health, 100, "Tesla exceeded its authored chain bound");
    assert.equal(state.effects.filter((effect) => effect.type === "chain").length, values.chains);
    approximately(state.ship.weaponTimers.teslaCoil, values.cooldown, 1e-12, "Tesla cooldown");

    const afterFirstChain = targets.map((target) => target.health);
    while (state.ship.weaponTimers.teslaCoil > CONFIG.world.fixedStep * 1.01) {
      game.step(CONFIG.world.fixedStep);
      assert.deepEqual(targets.map((target) => target.health), afterFirstChain, "Tesla fired before its cooldown elapsed");
    }
    for (let frame = 0; frame < 3 && targets[0].health === afterFirstChain[0]; frame += 1) {
      game.step(CONFIG.world.fixedStep);
    }
    targets.slice(0, values.chains).forEach((target, index) => {
      approximately(target.health, 100 - values.damage * 2, 1e-8, `Tesla repeat target ${index + 1}`);
    });
    assert.equal(targets.at(-1).health, 100, "Tesla repeat exceeded its chain bound");

    state.asteroids.length = 0;
    state.effects.length = 0;
    state.ship.weaponTimers.teslaCoil = 0;
    game.step(CONFIG.world.fixedStep);
    assert.equal(state.ship.weaponTimers.teslaCoil, 0, "targetless Tesla consumed its cooldown");
  });

  test("autonomous passives acquire just inside their authored ranges and stay idle outside", () => {
    for (const [moduleId, tiers] of [["homingSalvo", [1, 5]], ["radialArray", [1, 5]], ["teslaCoil", [1, 5]], ["mineLayer", [1, 5]]]) {
      for (const tier of tiers) {
        const { game, CONFIG } = boot(69400 + tier + moduleId.length);
        const state = game.state;
        clearEntities(state);
        freezeDirector(state);
        for (const id of Object.keys(state.ship.modules)) state.ship.modules[id] = 0;
        state.ship.modules[moduleId] = tier;
        state.ship.weaponTimers[moduleId] = 0;
        const values = CONFIG.weapons.modules[moduleId].tiers[tier - 1];
        const target = game.spawnAsteroid("crystal", {
          x: state.ship.x + values.range + 1,
          y: state.ship.y,
          speed: 0,
          radius: 1,
          health: 1e6,
          required: false,
          threatCost: 0,
          noDrops: true
        });
        game.step(CONFIG.world.fixedStep);
        if (moduleId === "teslaCoil") assert.equal(target.health, 1e6, `${moduleId} fired outside Tier ${tier} range`);
        else if (moduleId === "mineLayer") assert.equal(state.mines.length, 0, `${moduleId} deployed outside Tier ${tier} range`);
        else assert.equal(state.playerBullets.filter((bullet) => bullet.sourceModule === moduleId).length, 0,
          `${moduleId} fired outside Tier ${tier} range`);
        assert.equal(state.ship.weaponTimers[moduleId], 0, `${moduleId} consumed cooldown without an in-range target`);

        target.x = state.ship.x + values.range - 1;
        target.y = state.ship.y;
        game.step(CONFIG.world.fixedStep);
        if (moduleId === "teslaCoil") assert.ok(target.health < 1e6, `${moduleId} ignored an in-range target`);
        else if (moduleId === "mineLayer") assert.ok(state.mines.some((mine) => mine.owner === "player"), `${moduleId} ignored an in-range target`);
        else assert.ok(state.playerBullets.some((bullet) => bullet.sourceModule === moduleId), `${moduleId} ignored an in-range target`);
        assert.ok(state.ship.weaponTimers[moduleId] > 0, `${moduleId} did not begin cooldown after firing`);
      }
    }

    const { game, CONFIG } = boot(69499);
    const state = game.state;
    clearEntities(state);
    freezeDirector(state);
    for (const id of Object.keys(state.ship.modules)) state.ship.modules[id] = 0;
    state.ship.modules.drone = 1;
    const values = CONFIG.weapons.modules.drone.tiers[0];
    game.step(CONFIG.world.fixedStep);
    assert.equal(state.ship.drones.length, values.drones);
    const drone = state.ship.drones[0];
    drone.cooldown = 0;
    let nextAngle = (state.time + CONFIG.world.fixedStep) * 1.4;
    const target = game.spawnAsteroid("crystal", {
      x: state.ship.x + Math.cos(nextAngle) * values.orbitRadius + values.range + 1,
      y: state.ship.y + Math.sin(nextAngle) * values.orbitRadius,
      speed: 0,
      radius: 1,
      health: 1e6,
      required: false,
      threatCost: 0,
      noDrops: true
    });
    game.step(CONFIG.world.fixedStep);
    assert.equal(state.playerBullets.filter((bullet) => bullet.sourceModule === "drone").length, 0,
      "Drone acquired beyond its authored range");
    drone.cooldown = 0;
    nextAngle = (state.time + CONFIG.world.fixedStep) * 1.4;
    target.x = state.ship.x + Math.cos(nextAngle) * values.orbitRadius + values.range - 1;
    target.y = state.ship.y + Math.sin(nextAngle) * values.orbitRadius;
    game.step(CONFIG.world.fixedStep);
    assert.ok(state.playerBullets.some((bullet) => bullet.sourceModule === "drone"),
      "Drone ignored an in-range target");
  });

  test("Orbit Blades respect their bounded count and per-blade contact cooldown", () => {
    const { game, CONFIG } = boot(695);
    const state = game.state;
    clearEntities(state);
    freezeDirector(state);
    state.ship.modules.orbitBlades = 1;
    const values = CONFIG.weapons.modules.orbitBlades.tiers[0];
    const angularSpeed = 1.75 + 0.09;
    const target = game.spawnAsteroid("crystal", {
      x: 0,
      y: 0,
      speed: 0,
      radius: 8,
      health: 100,
      required: false,
      threatCost: 0,
      noDrops: true
    });
    const alignTargetWithNextBladeFrame = () => {
      const angle = (state.time + CONFIG.world.fixedStep) * angularSpeed;
      target.x = state.ship.x + Math.cos(angle) * values.orbitRadius;
      target.y = state.ship.y + Math.sin(angle) * values.orbitRadius;
      target.vx = 0;
      target.vy = 0;
    };

    alignTargetWithNextBladeFrame();
    game.step(CONFIG.world.fixedStep);
    assert.equal(state.ship.orbitBlades.length, values.blades);
    approximately(target.health, 100 - values.damage, 1e-9, "first blade contact");
    const healthAfterFirstContact = target.health;
    while (state.ship.orbitBlades[0].cooldown > CONFIG.world.fixedStep * 1.01) {
      alignTargetWithNextBladeFrame();
      game.step(CONFIG.world.fixedStep);
      assert.equal(target.health, healthAfterFirstContact, "Orbit Blade damaged on every frame instead of honoring cooldown");
    }
    alignTargetWithNextBladeFrame();
    game.step(CONFIG.world.fixedStep);
    approximately(target.health, 100 - values.damage * 2, 1e-8, "second blade contact");

    state.ship.modules.orbitBlades = CONFIG.weapons.maxModuleTier;
    game.step(CONFIG.world.fixedStep);
    assert.equal(state.ship.orbitBlades.length, CONFIG.weapons.modules.orbitBlades.tiers[4].blades);
    assert.ok(state.ship.orbitBlades.length <= 12, "Orbit Blades exceeded the runtime hard bound");
  });

  test("Mine Layer obeys cadence, trigger, blast, lifetime, and the shared mine cap", () => {
    const { game, CONFIG } = boot(697);
    const state = game.state;
    clearEntities(state);
    freezeDirector(state);
    state.ship.modules.mineLayer = 1;
    state.ship.weaponTimers.mineLayer = 0;
    const values = CONFIG.weapons.modules.mineLayer.tiers[0];
    game.spawnAsteroid("crystal", {
      x: state.ship.x + values.range - 10,
      y: state.ship.y,
      speed: 0,
      health: 100,
      required: false,
      threatCost: 0,
      noDrops: true
    });

    game.step(CONFIG.world.fixedStep);
    const mine = state.mines.find((entry) => entry.owner === "player");
    assert.ok(mine, "Mine Layer did not place its authored player mine");
    assert.equal(mine.sourceModule, "mineLayer");
    approximately(state.ship.weaponTimers.mineLayer, values.cooldown, 1e-12, "Mine Layer cooldown");
    const direct = game.spawnAsteroid("crystal", {
      x: mine.x,
      y: mine.y,
      speed: 0,
      radius: 8,
      health: 100,
      required: false,
      threatCost: 0,
      noDrops: true
    });
    const splash = game.spawnAsteroid("crystal", {
      x: mine.x + values.blastRadius * 0.85,
      y: mine.y,
      speed: 0,
      radius: 8,
      health: 100,
      required: false,
      threatCost: 0,
      noDrops: true
    });
    game.step(CONFIG.world.fixedStep);
    approximately(direct.health, 100 - values.damage, 1e-9, "mine direct damage");
    approximately(splash.health, 100 - values.damage, 1e-9, "mine blast damage");
    assert.equal(state.mines.filter((entry) => entry.owner === "player").length, 0, "detonated player mine survived cleanup");

    clearEntities(state);
    state.ship.modules.mineLayer = CONFIG.weapons.maxModuleTier;
    state.ship.weaponTimers.mineLayer = 0;
    const cappedValues = CONFIG.weapons.modules.mineLayer.tiers[4];
    game.spawnAsteroid("crystal", {
      x: state.ship.x + cappedValues.range - 10,
      y: state.ship.y,
      speed: 0,
      health: 1e9,
      required: false,
      threatCost: 0,
      noDrops: true
    });
    for (let index = 0; index < CONFIG.caps.mines; index += 1) {
      state.mines.push({
        id: 880000 + index,
        owner: "player",
        sourceModule: "fixture",
        x: state.ship.x,
        y: state.ship.y + 100,
        vx: 0,
        vy: 0,
        radius: 1,
        life: 100,
        maxLife: 100,
        triggerRadius: 0,
        blastRadius: 1,
        damage: 0,
        phase: 0,
        armed: true,
        dead: false
      });
    }
    game.step(CONFIG.world.fixedStep);
    assert.equal(state.mines.length, CONFIG.caps.mines);
    assert.equal(state.ship.weaponTimers.mineLayer, 0, "a capped Mine Layer consumed its cooldown without spawning");
    state.mines.pop();
    game.step(CONFIG.world.fixedStep);
    assert.equal(state.mines.length, CONFIG.caps.mines, "Mine Layer failed to fill the one available capped slot");
    const cappedSpawn = state.mines.find((entry) => entry.sourceModule === "mineLayer");
    assert.ok(cappedSpawn, "Mine Layer did not use the available shared-cap slot");
    assert.ok(state.ship.weaponTimers.mineLayer > 0);

    state.mines.length = 1;
    state.mines[0] = cappedSpawn;
    state.ship.modules.mineLayer = 0;
    cappedSpawn.life = CONFIG.world.fixedStep * 0.5;
    game.step(CONFIG.world.fixedStep);
    assert.equal(state.mines.length, 0, "expired player mine did not detonate and clean up");
  });

  test("Shield Reactor restores only missing shields and waits for its cooldown", () => {
    const { game, CONFIG } = boot(698);
    const state = game.state;
    clearEntities(state);
    freezeDirector(state);
    state.ship.modules.shieldReactor = 1;
    state.ship.weaponTimers.shieldReactor = 0;
    const values = CONFIG.weapons.modules.shieldReactor.tiers[0];

    state.ship.shield = CONFIG.powerups.shield.cap;
    game.step(CONFIG.world.fixedStep);
    assert.equal(state.ship.shield, CONFIG.powerups.shield.cap);
    assert.equal(state.ship.weaponTimers.shieldReactor, 0, "full shields consumed the reactor cooldown");

    state.ship.shield = 20;
    game.step(CONFIG.world.fixedStep);
    assert.equal(state.ship.shield, 20 + values.amount);
    approximately(state.ship.weaponTimers.shieldReactor, values.cooldown, 1e-12, "Shield Reactor cooldown");
    state.ship.shield = 5;
    game.step(CONFIG.world.fixedStep);
    assert.equal(state.ship.shield, 5, "Shield Reactor fired again before its cooldown");
    state.ship.weaponTimers.shieldReactor = CONFIG.world.fixedStep * 0.5;
    game.step(CONFIG.world.fixedStep);
    assert.equal(state.ship.shield, 5 + values.amount, "Shield Reactor did not fire when its cooldown elapsed");

    state.ship.shield = CONFIG.powerups.shield.cap - 1;
    state.ship.weaponTimers.shieldReactor = 0;
    game.step(CONFIG.world.fixedStep);
    assert.equal(state.ship.shield, CONFIG.powerups.shield.cap, "Shield Reactor exceeded the shared shield cap");
  });

  test("shield reserve HUD appears only while charged and reports the weakened 60-point cap", () => {
    const { browser, game, CONFIG } = boot(6981);
    const state = game.state;
    clearEntities(state);
    freezeDirector(state);
    const readout = browser.elements.get("shield-readout");
    const value = browser.elements.get("shield-value");
    assert.equal(readout.classList.contains("is-hidden"), true);
    assert.equal(readout.getAttribute("aria-valuenow"), "0");

    game.applyPickup(game.spawnPickup(0, 0, "shield"));
    game.applyPickup(game.spawnPickup(0, 0, "shield"));
    game.applyPickup(game.spawnPickup(0, 0, "shield"));
    runSteps(game, 0.15, CONFIG.world.fixedStep);
    assert.equal(state.ship.shield, CONFIG.powerups.shield.cap);
    assert.equal(CONFIG.powerups.shield.cap, 60);
    assert.equal(readout.classList.contains("is-hidden"), false);
    assert.equal(readout.getAttribute("aria-valuemax"), String(CONFIG.powerups.shield.cap));
    assert.equal(readout.getAttribute("aria-valuenow"), String(CONFIG.powerups.shield.cap));
    assert.equal(readout.getAttribute("aria-valuetext"), `${CONFIG.powerups.shield.cap} shield points`);
    assert.equal(value.textContent, String(CONFIG.powerups.shield.cap));

    state.ship.invulnerable = 0;
    state.enemyBullets.push({
      id: 998100,
      x: state.ship.x,
      y: state.ship.y,
      px: state.ship.x,
      py: state.ship.y,
      vx: 0,
      vy: 0,
      radius: 2,
      damage: CONFIG.powerups.shield.cap / CONFIG.powerups.shield.drainMultiplier,
      life: 1,
      maxLife: 1,
      dead: false
    });
    game.step(CONFIG.world.fixedStep);
    runSteps(game, 0.15, CONFIG.world.fixedStep);
    assert.equal(state.ship.shield, 0);
    assert.equal(state.ship.hull, state.ship.maxHull, "exact shield depletion leaked into hull");
    assert.equal(readout.getAttribute("aria-valuenow"), "0");
    assert.equal(readout.getAttribute("aria-valuetext"), "0 shield points");
    assert.equal(readout.classList.contains("is-hidden"), true);
  });

  test("Overclock permanently shortens authored player firing cadence", () => {
    function firingRun(seed, overclockTier) {
      const runtime = boot(seed);
      const { game, CONFIG } = runtime;
      const state = game.state;
      clearEntities(state);
      freezeDirector(state);
      for (const id of Object.keys(state.ship.modules)) state.ship.modules[id] = 0;
      state.ship.modules.pulse = 1;
      state.ship.modules.overclock = overclockTier;
      state.ship.weaponTimers.pulse = 0;
      game.input.keys.space = true;
      game.step(CONFIG.world.fixedStep);
      const expectedMultiplier = overclockTier ? CONFIG.weapons.modules.overclock.tiers[overclockTier - 1].cooldownMultiplier : 1;
      approximately(
        state.ship.weaponTimers.pulse,
        CONFIG.weapons.modules.pulse.tiers[0].cooldown * expectedMultiplier,
        1e-12,
        "initial overclock cooldown"
      );
      runSteps(game, 0.7, CONFIG.world.fixedStep);
      return state.playerBullets.filter((bullet) => bullet.sourceModule === "pulse").length;
    }

    const normalShots = firingRun(699, 0);
    const overclockedShots = firingRun(699, 5);
    assert.ok(overclockedShots > normalShots, `${overclockedShots} overclocked shots did not exceed ${normalShots} normal shots`);
  });

  test("Tractor Field pulls only nearby pickups and keeps their velocity bounded", () => {
    const { game, CONFIG } = boot(700);
    const state = game.state;
    clearEntities(state);
    freezeDirector(state);
    state.ship.modules.tractorField = 5;
    const values = CONFIG.weapons.modules.tractorField.tiers[4];
    const nearby = game.spawnPickup(state.ship.x + values.range * 0.8, state.ship.y, "shield");
    const distant = game.spawnPickup(state.ship.x + values.range + 20, state.ship.y, "repair");
    nearby.vx = nearby.vy = distant.vx = distant.vy = 0;
    const nearbyX = nearby.x;
    const distantX = distant.x;

    game.step(CONFIG.world.fixedStep);
    assert.ok(nearby.vx < 0 && nearby.x < nearbyX, "Tractor Field did not pull a nearby pickup toward the ship");
    assert.equal(distant.vx, 0, "Tractor Field pulled a pickup outside its authored range");
    assert.equal(distant.x, distantX);
    assert.ok(Math.hypot(nearby.vx, nearby.vy) <= 560, "Tractor Field exceeded its velocity hard bound");
  });

  test("Damage Amplifier scales outgoing fire while Aegis reduces incoming damage", () => {
    const amplified = boot(702);
    const amplifiedState = amplified.game.state;
    clearEntities(amplifiedState);
    freezeDirector(amplifiedState);
    amplified.game.applyPickup(amplified.game.spawnPickup(0, 0, "amplifier"));
    assert.equal(amplifiedState.ship.amplifierTimer, amplified.CONFIG.powerups.amplifier.duration);
    amplified.game.input.keys.space = true;
    amplified.game.step(amplified.CONFIG.world.fixedStep);
    const bullet = amplifiedState.playerBullets.find((entry) => entry.sourceModule === "pulse");
    assert.ok(bullet, "amplified primary weapon did not fire");
    approximately(
      bullet.damage,
      amplified.CONFIG.weapons.modules.pulse.tiers[0].damage * amplified.CONFIG.powerups.amplifier.damageMultiplier,
      1e-12,
      "amplified outgoing damage"
    );

    const protectedRun = boot(703);
    const protectedState = protectedRun.game.state;
    clearEntities(protectedState);
    freezeDirector(protectedState);
    protectedRun.game.applyPickup(protectedRun.game.spawnPickup(0, 0, "aegis"));
    assert.equal(protectedState.ship.aegisTimer, protectedRun.CONFIG.powerups.aegis.duration);
    protectedState.ship.invulnerable = 0;
    protectedState.ship.shield = 0;
    protectedState.enemyBullets.push({
      id: 990703,
      x: protectedState.ship.x,
      y: protectedState.ship.y,
      px: protectedState.ship.x,
      py: protectedState.ship.y,
      vx: 0,
      vy: 0,
      radius: 3,
      damage: 50,
      life: 1,
      maxLife: 1,
      dead: false
    });
    protectedRun.game.step(protectedRun.CONFIG.world.fixedStep);
    approximately(
      protectedState.ship.hull,
      100 - 50 * (1 - protectedRun.CONFIG.powerups.aegis.damageReduction),
      1e-9,
      "Aegis incoming damage"
    );
  });

  test("Enigma deterministically slows into a frozen three-card draft and applies one advertised choice", () => {
    function prepare(seed, withEnigma) {
      const runtime = boot(seed);
      const { game, CONFIG } = runtime;
      const state = game.state;
      game.setStage(16, 1);
      clearEntities(state);
      freezeDirector(state);
      state.ship.rapidTimer = CONFIG.powerups.rapid.duration * 2;
      state.playerBullets.push({
        id: 999001, x: 0, y: 0, px: 0, py: 0, vx: 120, vy: 0,
        radius: 2, damage: 0, life: 10, maxLife: 10, kind: "bolt", color: "#fff",
        pierce: 0, turnRate: 0, blastRadius: 0, hits: [], dead: false
      });
      game.spawnAsteroid("corona", {
        x: 420,
        y: 180,
        speed: 0,
        health: 1e9,
        hazardPhase: "warning",
        hazardTimer: 10,
        hazardAngle: 0.4,
        required: false,
        noDrops: true
      });
      game.input.keys.space = true;
      game.input.pointerFire = true;
      game.input.touchMoveX = 1;
      game.input.touchFire = true;
      if (withEnigma) {
        const pickup = game.spawnPickup(0, 0, "enigma");
        assert.equal(game.applyPickup(pickup), true);
        assert.equal(pickup.dead, true);
        assert.equal(game.snapshot().enigma.phase, "slowing");
        assert.equal(game.input.pointerFire, false);
        assert.equal(game.input.touchMoveX, 0);
        assert.equal(game.input.touchFire, false);
      }
      return runtime;
    }

    const slowed = prepare(1701, true);
    const control = prepare(1701, false);
    const fixedStep = slowed.CONFIG.world.fixedStep;
    const steps = Math.ceil(slowed.CONFIG.powerups.enigma.slowdownSeconds / fixedStep) + 1;
    const scales = [];
    for (let frame = 0; frame < steps && slowed.game.snapshot().enigma.phase !== "choosing"; frame += 1) {
      slowed.game.step(fixedStep);
      control.game.step(fixedStep);
      scales.push(slowed.game.snapshot().enigma.timeScale);
    }
    const draft = slowed.game.snapshot().enigma;
    assert.equal(draft.phase, "choosing");
    assert.equal(draft.choices.length, slowed.CONFIG.powerups.enigma.choiceCount);
    assert.equal(new Set(draft.choices.map((choice) => choice.id)).size, 3);
    assert.ok(draft.choices.some((choice) => choice.permanence === "permanent"));
    assert.ok(draft.choices.some((choice) => choice.permanence === "temporary"));
    for (let index = 1; index < scales.length; index += 1) {
      assert.ok(scales[index] <= scales[index - 1] + 1e-12, "Enigma time scale increased during slowdown");
      assert.ok(scales[index] >= 0 && scales[index] <= 1);
    }
    assert.ok(slowed.game.state.playerBullets[0].x > 0, "slowdown stopped the world immediately");
    assert.ok(slowed.game.state.playerBullets[0].x < control.game.state.playerBullets[0].x,
      "slowdown advanced at full simulation speed");
    assert.ok(slowed.game.state.ship.rapidTimer > control.game.state.ship.rapidTimer,
      "temporary duration was consumed in real time instead of slowed simulation time");
    assert.equal(slowed.browser.elements.get("enigma-upgrade-modal").open, true);
    const cards = slowed.browser.createdElements.filter((element) => /^upgrade-card\s/.test(element.className));
    assert.equal(cards.length, 3);
    cards.forEach((card, index) => {
      assert.equal(card.dataset.choiceIndex, String(index));
      assert.equal(card.dataset.enhancementId, draft.choices[index].enhancementId);
      assert.equal(card.disabled, false);
    });
    assert.equal(slowed.browser.document.activeElement, cards[0]);
    let cancelPrevented = false;
    slowed.browser.elements.get("enigma-upgrade-modal").dispatchEvent({
      type: "cancel",
      preventDefault() { cancelPrevented = true; }
    });
    assert.equal(cancelPrevented, true, "Escape did not preserve the mandatory draft");
    assert.equal(slowed.browser.elements.get("enigma-upgrade-modal").open, true);
    assert.equal(slowed.game.snapshot().enigma.phase, "choosing");

    const frozen = {
      time: slowed.game.state.time,
      runTime: slowed.game.state.runTime,
      bulletX: slowed.game.state.playerBullets[0].x,
      rapidTimer: slowed.game.state.ship.rapidTimer,
      waveProgress: slowed.game.state.encounterData.goalProgress,
      hazardTimer: slowed.game.state.asteroids[0].hazardTimer,
      hazardAngle: slowed.game.state.asteroids[0].hazardAngle
    };
    slowed.browser.pumpFrames(120);
    assert.deepEqual({
      time: slowed.game.state.time,
      runTime: slowed.game.state.runTime,
      bulletX: slowed.game.state.playerBullets[0].x,
      rapidTimer: slowed.game.state.ship.rapidTimer,
      waveProgress: slowed.game.state.encounterData.goalProgress,
      hazardTimer: slowed.game.state.asteroids[0].hazardTimer,
      hazardAngle: slowed.game.state.asteroids[0].hazardAngle
    }, frozen, "full Enigma choice did not freeze simulation state");
    assert.equal(slowed.game.chooseEnhancement(-1), false);
    assert.equal(slowed.game.chooseEnhancement(99), false);

    const permanentIndex = draft.choices.findIndex((choice) => choice.kind === "module");
    const selected = draft.choices[permanentIndex];
    const beforeModules = { ...slowed.game.state.ship.modules };
    cards[permanentIndex].click();
    assert.equal(slowed.game.snapshot().enigma.phase, "idle", "advertised card click did not resolve the draft");
    assert.equal(slowed.game.chooseEnhancement(permanentIndex), false, "one draft granted twice");
    assert.equal(slowed.game.state.ship.modules[selected.moduleId], beforeModules[selected.moduleId] + 1);
    for (const id of Object.keys(beforeModules)) {
      if (id !== selected.moduleId) assert.equal(slowed.game.state.ship.modules[id], beforeModules[id]);
    }
    assert.equal(slowed.browser.elements.get("enigma-upgrade-modal").open, false);
    assert.ok(slowed.game.state.ship.invulnerable >= slowed.CONFIG.powerups.enigma.resumeInvulnerability);
    assert.equal(slowed.game.input.pointerFire, false);
    assert.equal(slowed.game.input.touchFire, false);
  });

  test("Enigma defers overlapping pickups so an advertised permanent tier stays exact", () => {
    const { game, CONFIG } = boot(2391);
    const state = game.state;
    game.setStage(16, 1);
    clearEntities(state);
    freezeDirector(state);
    for (const id of Object.keys(state.ship.modules)) state.ship.modules[id] = CONFIG.weapons.maxModuleTier;
    state.ship.modules.homingSalvo = 0;

    const enigma = game.spawnPickup(state.ship.x, state.ship.y, "enigma");
    const moduleCache = game.spawnPickup(state.ship.x, state.ship.y, "module");
    enigma.vx = enigma.vy = moduleCache.vx = moduleCache.vy = 0;
    game.step(CONFIG.world.fixedStep);

    const draft = game.snapshot().enigma;
    const permanentIndex = draft.choices.findIndex((choice) => choice.kind === "module");
    assert.equal(draft.phase, "slowing");
    assert.equal(draft.choices[permanentIndex].moduleId, "homingSalvo");
    assert.equal(draft.choices[permanentIndex].tier, "Install Mk I");
    assert.equal(state.ship.modules.homingSalvo, 0, "overlapping module cache changed an advertised tier");
    assert.equal(moduleCache.dead, false, "overlapping module cache was consumed during Enigma slowdown");

    advanceEnigmaToChoice(game, CONFIG);
    assert.equal(moduleCache.dead, false, "deferred pickup disappeared before the mandatory choice");
    assert.equal(game.chooseEnhancement(permanentIndex), true);
    assert.equal(state.ship.modules.homingSalvo, 1, "Install Mk I card granted a different tier");

    game.step(CONFIG.world.fixedStep);
    assert.equal(moduleCache.dead, true, "deferred pickup did not become collectible after selection");
    assert.equal(state.ship.modules.homingSalvo, 2, "deferred module cache did not apply after selection");
  });

  test("Enigma defers an in-flight boss-core reward until its advertised tier is applied", () => {
    const { game, CONFIG } = boot(2396);
    const state = game.state;
    game.setStage(10, 1);
    runSteps(game, CONFIG.bossArena.warningSeconds + 0.1, CONFIG.world.fixedStep);
    assert.equal(state.boss && state.boss.type, "harrower", "Harrower did not enter the Stage 10 arena");
    clearEntities(state);
    for (const id of Object.keys(state.ship.modules)) state.ship.modules[id] = CONFIG.weapons.maxModuleTier;
    state.ship.modules.homingSalvo = 0;
    for (const node of state.boss.nodes) node.health = 0;
    state.boss.health = 1;
    state.playerBullets.push({
      id: 999396,
      x: state.boss.x,
      y: state.boss.y,
      px: state.boss.x,
      py: state.boss.y,
      vx: 0,
      vy: 0,
      radius: 3,
      damage: 10,
      life: 2,
      maxLife: 2,
      kind: "bolt",
      color: "#ffffff",
      pierce: 0,
      turnRate: 0,
      blastRadius: 0,
      hits: [],
      dead: false
    });

    game.applyPickup(game.spawnPickup(state.ship.x, state.ship.y, "enigma"));
    const slowingDraft = game.snapshot().enigma;
    const permanentIndex = slowingDraft.choices.findIndex((choice) => choice.kind === "module");
    assert.equal(slowingDraft.choices[permanentIndex].moduleId, "homingSalvo");
    assert.equal(slowingDraft.choices[permanentIndex].tier, "Install Mk I");

    game.step(CONFIG.world.fixedStep);
    assert.equal(state.encounterData.bossDefeated, true, "in-flight shot did not defeat Harrower during slowdown");
    assert.equal(state.encounterData.bossRewardGranted, false, "boss core changed the pending card before selection");
    assert.equal(state.ship.modules.homingSalvo, 0, "boss core made Install Mk I stale during slowdown");

    advanceEnigmaToChoice(game, CONFIG);
    assert.equal(game.chooseEnhancement(permanentIndex), true);
    assert.equal(state.ship.modules.homingSalvo, 1, "Install Mk I card did not apply its advertised tier");
    assert.equal(state.encounterData.bossRewardGranted, false, "boss core applied inside the choice transaction");

    game.step(CONFIG.world.fixedStep);
    assert.equal(state.encounterData.bossRewardGranted, true, "deferred boss core was not granted after selection");
    assert.equal(state.ship.modules.homingSalvo, 2, "deferred boss core did not add exactly one tier");
    assert.equal(state.encounterData.complete, true);
    assert.equal(state.mode, "transition");
    runSteps(game, CONFIG.cinematic.duration * 0.5, CONFIG.world.fixedStep);
    assert.equal(state.ship.modules.homingSalvo, 2, "deferred boss core was granted more than once");
  });

  test("fixed seed and loadout reproduce Enigma choices while a capped build receives support fallbacks", () => {
    function choices(seed, capBuild) {
      const runtime = boot(seed);
      const { game, CONFIG } = runtime;
      game.setStage(16, 1);
      clearEntities(game.state);
      freezeDirector(game.state);
      if (capBuild) {
        for (const id of Object.keys(game.state.ship.modules)) game.state.ship.modules[id] = CONFIG.weapons.maxModuleTier;
        for (const kind of ["rapid", "triShot", "piercing", "arcBurst", "novaLance", "amplifier", "aegis"]) {
          const timer = `${kind}Timer`;
          game.state.ship[timer] = CONFIG.powerups[kind].duration * CONFIG.powerups.temporaryStackLimit;
        }
      }
      game.setSeed(seed);
      game.applyPickup(game.spawnPickup(0, 0, "enigma"));
      return { runtime, draft: advanceEnigmaToChoice(game, CONFIG) };
    }
    const first = choices(2401, false);
    const second = choices(2401, false);
    assert.deepEqual(JSON.parse(JSON.stringify(first.draft.choices)), JSON.parse(JSON.stringify(second.draft.choices)));
    const capped = choices(2402, true);
    assert.deepEqual(Array.from(capped.draft.choices, (choice) => choice.kind), ["support", "support", "support"]);
    assert.ok(capped.draft.choices.every((choice) => choice.permanence === "run-only" && choice.activation === "instant"));
    const supportCards = capped.runtime.browser.createdElements.filter((element) => /^upgrade-card\s/.test(element.className));
    assert.ok(supportCards.every((card) => /run only\. instant\./i.test(card.getAttribute("aria-label"))));
    assert.ok(supportCards.every((card) => !/temporary\. active\./i.test(card.getAttribute("aria-label"))));
    assert.equal(new Set(capped.draft.choices.map((choice) => choice.id)).size, 3);
    assert.equal(capped.runtime.game.chooseEnhancement(0), true);
    for (const tier of Object.values(capped.runtime.game.state.ship.modules)) assert.equal(tier, 5);
  });

  test("Enigma drafts respect stage gates, may omit a permanent card, and always retain three distinct fallbacks", () => {
    const stages = [1, 3, 4, 6, 11, 16];
    for (const stage of stages) {
      let sawPermanent = false;
      let sawNoPermanent = false;
      for (let seed = 1; seed <= 12; seed += 1) {
        const { game, CONFIG } = boot(seed * 100 + stage);
        game.setStage(stage, 1);
        clearEntities(game.state);
        freezeDirector(game.state);
        game.setSeed(seed);
        assert.equal(game.applyPickup(game.spawnPickup(0, 0, "enigma")), true);
        const choices = game.snapshot().enigma.choices;
        assert.equal(choices.length, CONFIG.powerups.enigma.choiceCount, `Stage ${stage} lost a fallback card`);
        assert.equal(new Set(choices.map((choice) => choice.id)).size, choices.length, `Stage ${stage} repeated a card`);
        const modules = choices.filter((choice) => choice.kind === "module");
        sawPermanent ||= modules.length > 0;
        sawNoPermanent ||= modules.length === 0;
        assert.ok(modules.length <= 1, `Stage ${stage} offered multiple permanent cards`);
        for (const choice of modules) {
          const definition = CONFIG.weapons.modules[choice.moduleId];
          assert.ok(definition.unlockStage <= stage, `Stage ${stage} offered locked ${choice.moduleId}`);
          assert.ok(choice.nextTier == null || choice.nextTier <= game.snapshot().dropBand.rewardTierCap);
        }
        for (const choice of choices.filter((entry) => entry.kind === "temporary")) {
          assert.ok(CONFIG.powerups[choice.enhancementId].unlockStage <= stage,
            `Stage ${stage} offered locked ${choice.enhancementId}`);
        }
      }
      if (stage === 1) assert.equal(sawPermanent, false, "Stage 1 bypassed its zero permanent-draft chance");
      else {
        assert.equal(sawPermanent, true, `Stage ${stage} fixed-seed corpus never exercised a permanent offer`);
        assert.equal(sawNoPermanent, true, `Stage ${stage} fixed-seed corpus never exercised permanent omission`);
      }
    }

    const { game, CONFIG } = boot(16001);
    game.setStage(1, 1);
    game.state.sector = 2;
    clearEntities(game.state);
    freezeDirector(game.state);
    game.setSeed(1);
    game.applyPickup(game.spawnPickup(0, 0, "enigma"));
    const sectorTwo = game.snapshot();
    assert.equal(sectorTwo.dropBand.rewardTierCap, CONFIG.weapons.maxModuleTier);
    for (const choice of sectorTwo.enigma.choices.filter((entry) => entry.kind === "module")) {
      assert.ok(CONFIG.weapons.modules[choice.moduleId].unlockStage <= CONFIG.sector.encountersPerSector);
    }
  });

  test("a final-wave Enigma choice resolves before stage clear and keeps the selected upgrade", () => {
    const { game, CONFIG } = boot(2411);
    const state = game.state;
    game.setStage(16, 1);
    clearEntities(state);
    const data = state.encounterData;
    data.pendingSpawns.length = 0;
    data.requeue.length = 0;
    data.waveIndex = data.waveCount - 1;
    data.waveNumber = data.waveCount;
    data.waveSpawned = true;
    data.waveRequiredTotal = 0;
    data.waveRequiredCleared = 0;
    data.goalProgress = data.goalTarget - 1;
    game.setSeed(1);
    game.applyPickup(game.spawnPickup(0, 0, "enigma"));
    const draft = advanceEnigmaToChoice(game, CONFIG);
    assert.equal(data.complete, false, "stage clear stranded the draft during slowdown");
    assert.equal(state.mode, "playing");
    const permanentIndex = draft.choices.findIndex((choice) => choice.kind === "module");
    const selected = draft.choices[permanentIndex];
    const beforeTier = state.ship.modules[selected.moduleId];
    assert.equal(game.chooseEnhancement(permanentIndex), true);
    assert.equal(state.ship.modules[selected.moduleId], beforeTier + 1);
    game.step(CONFIG.world.fixedStep);
    assert.equal(data.complete, true, "stage did not clear after the mandatory selection");
    assert.equal(state.mode, "transition");
    assert.equal(state.ship.modules[selected.moduleId], beforeTier + 1,
      "hyperspace discarded the selected enhancement");
  });

  test("floating-origin rebasing keeps the Enigma fracture attached to its pickup point", () => {
    const { game, CONFIG } = boot(2421);
    const state = game.state;
    clearEntities(state);
    freezeDirector(state);
    state.combatField.active = false;
    state.arena.active = false;
    state.ship.x = CONFIG.world.floatingOriginThreshold + CONFIG.world.chunkSize * 2;
    state.ship.y = -CONFIG.world.floatingOriginThreshold - CONFIG.world.chunkSize;
    state.ship.vx = 0;
    state.ship.vy = 0;
    state.camera.x = state.ship.x;
    state.camera.y = state.ship.y;
    const pickupX = state.ship.x + 123;
    const pickupY = state.ship.y - 77;
    game.applyPickup(game.spawnPickup(pickupX, pickupY, "enigma"));
    const beforeOffset = {
      x: state.upgradeDraft.x - state.ship.x,
      y: state.upgradeDraft.y - state.ship.y
    };
    game.step(CONFIG.world.fixedStep);
    assert.ok(Math.abs(state.ship.x) < CONFIG.world.floatingOriginThreshold);
    assert.ok(Math.abs(state.ship.y) < CONFIG.world.floatingOriginThreshold);
    approximately(state.upgradeDraft.x - state.ship.x, beforeOffset.x, 1e-7, "rebased Enigma x offset");
    approximately(state.upgradeDraft.y - state.ship.y, beforeOffset.y, 1e-7, "rebased Enigma y offset");
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

  test("natural pickup pools follow stage gates while each drop band owns its slower pity cadence", () => {
    const samples = [1, 2, 3, 4, 6, 8, 9, 11, 16];
    const definitions = {
      shield: "shield",
      rapid: "rapid",
      repair: "repair",
      triShot: "triShot",
      piercing: "piercing",
      arcBurst: "arcBurst",
      novaLance: "novaLance",
      amplifier: "amplifier",
      aegis: "aegis",
      pulseCharge: "pulseCharge",
      enigma: "enigma"
    };
    for (const stage of samples) {
      const { game, CONFIG } = boot(7010 + stage);
      const state = game.state;
      game.setStage(stage, 1);
      clearEntities(state);
      freezeDirector(state);
      game.setSeed(314159 + stage);
      const kinds = new Set();
      for (let index = 0; index < 2048; index += 1) {
        const pickup = game.spawnPickup(index, 0);
        if (pickup) kinds.add(pickup.kind);
        state.pickups.length = 0;
      }
      const expected = new Set(Object.entries(definitions)
        .filter(([, id]) => CONFIG.powerups[id].unlockStage <= stage)
        .map(([kind]) => kind));
      if (CONFIG.powerups.moduleUpgrade.unlockStage <= stage && game.snapshot().dropBand.moduleWeight > 0) expected.add("module");
      assert.deepEqual(Array.from(kinds).sort(), Array.from(expected).sort(), `Stage ${stage} natural pickup pool`);

      state.encounterData.killsSincePowerup = game.snapshot().dropBand.pityKills - 1;
      const victim = game.spawnAsteroid("rock", { x: 0, y: 0, required: false, threatCost: 0 });
      game.killThreat(victim, "player");
      assert.equal(state.pickups.length, 1, `Stage ${stage} pity threshold failed`);
      assert.equal(state.encounterData.killsSincePowerup, 0);
    }

    const { game, CONFIG } = boot(7031);
    game.setStage(1, 1);
    game.state.sector = 2;
    clearEntities(game.state);
    freezeDirector(game.state);
    game.setSeed(271828);
    const sectorTwoKinds = new Set();
    for (let index = 0; index < 2048; index += 1) {
      const pickup = game.spawnPickup(index, 0);
      if (pickup) sectorTwoKinds.add(pickup.kind);
      game.state.pickups.length = 0;
    }
    assert.ok(Object.keys(definitions).every((kind) => sectorTwoKinds.has(kind)), "Sector 2 did not unlock the full pickup pool");
    assert.ok(sectorTwoKinds.has("module"));
    for (let index = 0; index < CONFIG.caps.pickups + 10; index += 1) game.spawnPickup(index, 0, "shield");
    assert.equal(game.state.pickups.length, CONFIG.caps.pickups);
  });

  test("module caches obey unlock stages and drop-band tier caps while Sector 2 exposes Mk V", () => {
    for (const stage of [1, 3, 4, 6, 11, 16]) {
      const { game, CONFIG } = boot(7100 + stage);
      game.setStage(stage, 1);
      clearEntities(game.state);
      freezeDirector(game.state);
      const initial = { ...game.state.ship.modules };
      for (let index = 0; index < 100; index += 1) {
        assert.equal(game.applyPickup({ kind: "module", dead: false, x: 0, y: 0 }), true);
      }
      const cap = game.snapshot().dropBand.rewardTierCap;
      for (const [id, definition] of Object.entries(CONFIG.weapons.modules)) {
        const expected = definition.unlockStage <= stage ? cap : initial[id];
        assert.equal(game.state.ship.modules[id], expected, `Stage ${stage} cache tier for ${id}`);
      }
    }

    const { game, CONFIG } = boot(7199);
    game.setStage(1, 1);
    game.state.sector = 2;
    clearEntities(game.state);
    freezeDirector(game.state);
    for (let index = 0; index < 100; index += 1) game.applyPickup({ kind: "module", dead: false, x: 0, y: 0 });
    for (const [id, tier] of Object.entries(game.state.ship.modules)) {
      assert.equal(tier, CONFIG.weapons.maxModuleTier, `Sector 2 did not expose ${id} Mk V`);
    }
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
    game.setStage(10, 1);
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

  test("Harrower keeps a circular arena while Leviathan owns a responsive rectangular field", () => {
    for (const layout of [{ width: 1280, height: 720 }, { width: 568, height: 320 }, { width: 1024, height: 768 }]) {
      for (const [stage, shape] of [[10, "circle"], [20, "field"]]) {
        const { browser, game, CONFIG } = boot(9000 + stage + layout.width, layout);
        const state = game.state;
        game.setStage(stage, 1);
        assert.equal(state.arena.shape, shape);
        assert.ok(Number.isFinite(state.arena.halfWidth) && Number.isFinite(state.arena.halfHeight));
        state.arena.active = true;
        state.arena.locked = true;
        state.arena.warning = Infinity;
        state.ship.x = state.arena.x + state.arena.halfWidth * 4;
        state.ship.y = state.arena.y - state.arena.halfHeight * 4;
        state.ship.vx = 500;
        state.ship.vy = -500;
        game.step(CONFIG.world.fixedStep);
        if (shape === "circle") {
          const maximum = state.arena.radius - CONFIG.bossArena.boundaryPadding - state.ship.radius;
          assert.ok(Math.hypot(state.ship.x - state.arena.x, state.ship.y - state.arena.y) <= maximum + 1e-7);
        } else {
          const inset = CONFIG.bossArena.boundaryPadding + state.ship.radius;
          assert.ok(state.ship.x >= state.arena.x - state.arena.halfWidth + inset - 1e-7);
          assert.ok(state.ship.x <= state.arena.x + state.arena.halfWidth - inset + 1e-7);
          assert.ok(state.ship.y >= state.arena.y - state.arena.halfHeight + inset - 1e-7);
          assert.ok(state.ship.y <= state.arena.y + state.arena.halfHeight - inset + 1e-7);
        }

        const before = { halfWidth: state.arena.halfWidth, halfHeight: state.arena.halfHeight };
        browser.window.innerWidth = Math.max(320, layout.height);
        browser.window.innerHeight = Math.max(320, layout.width * 0.5);
        browser.window.dispatchEvent({ type: "resize" });
        assert.equal(state.arena.shape, shape, "resize changed the authored arena shape");
        assert.ok(Number.isFinite(state.arena.halfWidth) && Number.isFinite(state.arena.halfHeight));
        if (shape === "field" && (browser.window.innerWidth !== layout.width || browser.window.innerHeight !== layout.height)) {
          assert.ok(state.arena.halfWidth !== before.halfWidth || state.arena.halfHeight !== before.halfHeight,
            "Leviathan field ignored viewport resize");
        }
      }
    }
  });

  test("compact Leviathan spawn keeps its body and every shield node inside the field on frame one", () => {
    const { game, CONFIG } = boot(9019, { width: 568, height: 320 });
    const state = game.state;
    game.setStage(20, 1);
    state.arena.warning = CONFIG.world.fixedStep * 0.5;
    game.step(CONFIG.world.fixedStep);
    const boss = state.boss;
    assert.ok(boss && boss.type === "leviathan");
    const left = state.arena.x - state.arena.halfWidth;
    const right = state.arena.x + state.arena.halfWidth;
    const top = state.arena.y - state.arena.halfHeight;
    const bottom = state.arena.y + state.arena.halfHeight;
    for (const entity of [boss].concat(boss.nodes)) {
      assert.ok(entity.x - entity.radius >= left - 1e-7, "compact boss component escaped left field edge");
      assert.ok(entity.x + entity.radius <= right + 1e-7, "compact boss component escaped right field edge");
      assert.ok(entity.y - entity.radius >= top - 1e-7, "compact boss component escaped top field edge");
      assert.ok(entity.y + entity.radius <= bottom + 1e-7, "compact boss component escaped bottom field edge");
    }
    const separations = boss.nodes.map((node) => Math.hypot(node.x - boss.x, node.y - boss.y));
    assert.ok(separations.every((distance, index) => Number.isFinite(distance) && distance >= boss.radius + boss.nodes[index].radius),
      "compact shield node overlapped the Leviathan body on spawn");
  });

  test("Leviathan reflects only direct body bullets while live nodes govern shield damage and HUD weakness", () => {
    const { browser, game, CONFIG } = boot(9020);
    const state = game.state;
    game.setStage(20, 1);
    runSteps(game, CONFIG.bossArena.warningSeconds + 0.1, CONFIG.world.fixedStep);
    const boss = state.boss;
    assert.ok(boss && boss.type === "leviathan");
    clearEntities(state);
    boss.attackTimer = Infinity;
    boss.secondaryTimer = Infinity;
    boss.action = null;
    boss.vx = boss.vy = 0;
    boss.reflectionShield.phase = "active";
    boss.reflectionShield.timer = 1;
    boss.reflectionShield.active = true;
    boss.reflectionShield.warning = false;
    const values = CONFIG.bosses.leviathan.reflectionShield;

    const beforeDirect = boss.health;
    game.damageBoss(40);
    approximately(boss.health, beforeDirect - 40 * values.damageMultiplier, 1e-9,
      "live reflection shield direct-damage multiplier");
    assert.equal(state.enemyBullets.length, 0, "non-projectile damage incorrectly created a reflection");

    const bodyBullet = (id, damage) => ({
      id,
      x: boss.x,
      y: boss.y,
      px: boss.x,
      py: boss.y,
      vx: 0,
      vy: 0,
      radius: 3,
      damage,
      life: 2,
      maxLife: 2,
      kind: "bolt",
      color: "#ffffff",
      pierce: 0,
      turnRate: 0,
      blastRadius: 0,
      hits: [],
      dead: false
    });
    const beforeBullet = boss.health;
    state.playerBullets.push(bodyBullet(990020, 17));
    game.step(CONFIG.world.fixedStep);
    approximately(boss.health, beforeBullet, 1e-9, "direct body bullet damaged an active reflector");
    const reflected = state.enemyBullets.find((bullet) => bullet.kind === "reflected");
    assert.ok(reflected, "active Leviathan did not reflect a direct body bullet");
    assert.equal(reflected.sourceBoss, "leviathan");
    approximately(reflected.damage, values.damage * CONFIG.difficulty.damageScale(1, 20), 1e-9,
      "reflected bullet damage");
    assert.equal(reflected.life, values.life);
    approximately(Math.hypot(reflected.vx, reflected.vy), values.speed, 1e-9, "reflected bullet speed");
    runSteps(game, 0.12, CONFIG.world.fixedStep);
    assert.match(browser.elements.get("boss-phase").textContent, /Reflector \d+ LIVE/);

    state.enemyBullets.length = 0;
    for (let index = 0; index < CONFIG.caps.enemyProjectiles; index += 1) {
      state.enemyBullets.push({
        id: 991000 + index,
        x: boss.x + 1000,
        y: boss.y + 1000,
        px: boss.x + 1000,
        py: boss.y + 1000,
        vx: 0,
        vy: 0,
        radius: 1,
        damage: 0,
        life: 10,
        maxLife: 10,
        dead: false
      });
    }
    state.playerBullets.push(bodyBullet(990021, 19));
    game.step(CONFIG.world.fixedStep);
    assert.equal(state.enemyBullets.length, CONFIG.caps.enemyProjectiles, "reflection exceeded the enemy projectile cap");
    assert.equal(state.playerBullets.some((bullet) => bullet.id === 990021), false,
      "capped reflection left its source bullet alive");

    state.enemyBullets.length = 0;
    for (const node of boss.nodes) node.health = 0;
    boss.reflectionShield.phase = "active";
    boss.reflectionShield.active = true;
    boss.reflectionShield.timer = 1;
    const exposedHealth = boss.health;
    state.playerBullets.push(bodyBullet(990022, 23));
    game.step(CONFIG.world.fixedStep);
    assert.equal(boss.reflectionShield.phase, "disabled");
    approximately(boss.health, exposedHealth - 23, 1e-9, "destroyed nodes did not expose Leviathan's body");
    assert.equal(state.enemyBullets.some((bullet) => bullet.kind === "reflected"), false);
    runSteps(game, 0.12, CONFIG.world.fixedStep);
    assert.doesNotMatch(browser.elements.get("boss-phase").textContent, /Reflector/,
      "boss HUD retained a disabled reflector weakness");
  });

  test("both authored bosses wait for every surviving arena escort before hyperspace", () => {
    for (const [stage, bossType] of [[10, "harrower"], [20, "leviathan"]]) {
      const { game, CONFIG } = boot(875 + stage);
      const state = game.state;
      game.setStage(stage, 1);
      runSteps(game, CONFIG.bossArena.warningSeconds + 0.1, CONFIG.world.fixedStep);
      assert.equal(state.boss && state.boss.type, bossType, `${bossType} did not enter its authored arena`);
      const escort = game.spawnAlien(stage === 20 ? "lancer" : "scout", {
        x: state.ship.x + 120,
        y: state.ship.y,
        health: 30,
        required: false,
        generation: state.encounterData.generation,
        noDrops: true
      });
      game.damageBoss(state.boss.maxHealth * 10);
      assert.equal(state.encounterData.bossDefeated, true);
      assert.equal(state.encounterData.complete, false, `${bossType} death ignored its surviving escort`);
      assert.equal(state.mode, "playing");
      assert.ok(escort && !escort.dead);
      game.killThreat(escort, "player");
      game.step(CONFIG.world.fixedStep);
      assert.equal(state.encounterData.complete, true);
      assert.equal(state.mode, "transition", `clean ${bossType} arena did not enter hyperspace`);
    }
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
      game.setStage(10, 1);
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
        game.setStage(20, 1);
        clearEntities(state);
        state.arena.warning = CONFIG.world.fixedStep * 0.5;
        state.ship.invulnerable = 1e9;
        game.step(CONFIG.world.fixedStep);
        assert.equal(state.boss && state.boss.type, "leviathan", `${layout.label} Leviathan did not spawn`);

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
        assert.equal(state.cinematic.fromEncounter, 20);
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

  test("deterministic full-build weapon fire traverses all twenty stages, both bosses, and the sector wrap within caps", () => {
    const { game, CONFIG } = boot(918273, { width: 1280, height: 720 });
    const state = game.state;
    const visited = new Set([state.encounter]);
    const bossTypes = new Set();
    for (const id of Object.keys(state.ship.modules)) state.ship.modules[id] = CONFIG.weapons.maxModuleTier;
    for (const [kind, timer] of Object.entries({
      rapid: "rapidTimer",
      triShot: "triShotTimer",
      piercing: "piercingTimer",
      arcBurst: "arcBurstTimer",
      novaLance: "novaLanceTimer",
      amplifier: "amplifierTimer",
      aegis: "aegisTimer"
    })) {
      state.ship[timer] = CONFIG.powerups[kind].duration * CONFIG.powerups.temporaryStackLimit;
    }
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
    const limit = Math.ceil(720 / CONFIG.world.fixedStep);
    for (let frame = 0; frame < limit && !(state.sector === 2 && state.encounter === 1); frame += 1) {
      if (state.upgradeDraft.phase === "choosing") {
        assert.equal(game.chooseEnhancement(0), true, "full journey stalled at an Enigma choice");
      }
      state.ship.invulnerable = 1e9;
      if (state.boss) bossTypes.add(state.boss.type);
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
      if (state.boss) bossTypes.add(state.boss.type);
      for (const [name, cap] of Object.entries(capByCollection)) {
        assert.ok(state[name].length <= cap, `${name} exceeded ${cap} during full journey`);
      }
      assert.ok(state.ship.drones.length <= CONFIG.caps.drones, "drones exceeded their cap during full journey");
      assert.ok(state.ship.orbitBlades.length <= 12, "Orbit Blades exceeded their runtime bound during full journey");
    }
    assert.equal(state.sector, 2, "weapon-driven journey did not wrap after Stage 20");
    assert.equal(state.encounter, 1);
    assert.deepEqual(Array.from(visited).sort((a, b) => a - b), Array.from({ length: 20 }, (_, index) => index + 1));
    assert.deepEqual(Array.from(bossTypes).sort(), ["harrower", "leviathan"]);
    assert.equal(state.bossesDefeated, 2, "both authored bosses were not defeated by weapon fire");
  });
};

function distanceSquaredForTest(first, second) {
  const dx = first.x - second.x;
  const dy = first.y - second.y;
  return dx * dx + dy * dy;
}

module.exports.boot = boot;
