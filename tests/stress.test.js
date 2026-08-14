"use strict";

const { assert } = require("./_harness");
const gameplay = require("./gameplay.test");

function assertFiniteEntity(entity, label) {
  for (const key of ["x", "y", "vx", "vy", "radius", "health", "life"]) {
    if (key in entity) assert.ok(Number.isFinite(entity[key]), `${label}.${key} is not finite`);
  }
}

function assertCapped(runtime, peaks) {
  const { state } = runtime.game;
  const caps = runtime.CONFIG.caps;
  const mapping = {
    asteroids: caps.asteroids,
    aliens: caps.aliens,
    playerBullets: caps.playerProjectiles,
    enemyBullets: caps.enemyProjectiles,
    mines: caps.mines,
    pickups: caps.pickups,
    effects: state.settings.reducedEffects ? caps.reducedParticles : caps.particles,
    floaters: caps.floaters
  };
  for (const [name, cap] of Object.entries(mapping)) {
    peaks[name] = Math.max(peaks[name] || 0, state[name].length);
    assert.ok(state[name].length <= cap, `${name} exceeded cap ${cap}`);
    state[name].forEach((entity, index) => assertFiniteEntity(entity, `${name}[${index}]`));
  }
  peaks.drones = Math.max(peaks.drones || 0, state.ship.drones.length);
  assert.ok(state.ship.drones.length <= caps.drones, `drones exceeded cap ${caps.drones}`);
  state.ship.drones.forEach((drone, index) => assertFiniteEntity(drone, `drones[${index}]`));
  assertFiniteEntity(state.ship, "ship");
  assert.ok(Number.isFinite(state.score) && Number.isFinite(state.time) && Number.isFinite(state.runTime));
  assert.ok(Number.isFinite(state.camera.x) && Number.isFinite(state.camera.y));
  const enigma = runtime.game.snapshot().enigma;
  assert.ok(["idle", "slowing", "choosing"].includes(enigma.phase));
  assert.ok(Number.isFinite(enigma.elapsed) && Number.isFinite(enigma.timeScale));
  assert.ok(enigma.choices.length <= runtime.CONFIG.powerups.enigma.choiceCount);
  assert.equal(new Set(enigma.choices.map((choice) => choice.id)).size, enigma.choices.length);
}

function stress(seed, seconds) {
  const runtime = gameplay.boot(seed, { width: 960, height: 540 });
  const { game, CONFIG } = runtime;
  const state = game.state;
  const peaks = {};
  let stageChanges = 0;
  let enigmaChoices = 0;
  let nextEnigmaStep = 600;
  let previousStage = state.encounter;
  const totalSteps = Math.round(seconds / CONFIG.world.fixedStep);

  for (let step = 0; step < totalSteps; step += 1) {
    if (state.upgradeDraft.phase === "choosing") {
      assert.equal(game.chooseEnhancement(0), true, "stress could not resolve a mandatory Enigma choice");
      enigmaChoices += 1;
    }
    if (step >= nextEnigmaStep && state.mode === "playing" && state.upgradeDraft.phase === "idle") {
      assert.equal(game.applyPickup({ kind: "enigma", dead: false, x: state.ship.x, y: state.ship.y }), true);
      nextEnigmaStep += 1800;
    }
    const phase = step % 720;
    if (state.upgradeDraft.phase === "idle") {
      game.input.touchMoveX = phase < 180 ? 1 : phase < 360 ? 0 : phase < 540 ? -1 : 0;
      game.input.touchMoveY = phase < 180 ? 0 : phase < 360 ? 1 : phase < 540 ? 0 : -1;
      game.input.touchAimX = Math.cos(step * 0.021);
      game.input.touchAimY = Math.sin(step * 0.021);
      game.input.touchFire = true;
      if (step % 111 === 0) game.input.pressed.dash = true;
      if (step % 997 === 0) game.input.pressed.pulse = true;
    } else {
      game.input.touchMoveX = game.input.touchMoveY = 0;
      game.input.touchAimX = game.input.touchAimY = 0;
      game.input.touchFire = false;
    }

    // Deterministically retire one current-encounter threat at a time. Every authored asteroid,
    // alien, optional hazard, descendant, and boss add now belongs to the clean-field gate, so the
    // stress path must not bypass that contract while exercising every wave and handoff.
    if (step % 18 === 0 && state.encounterData && !state.encounterData.complete) {
      const data = state.encounterData;
      const target = state.asteroids.concat(state.aliens).find((entity) =>
        !entity.dead && entity.generation === data.generation
      );
      if (target) {
        const environmental = Boolean(target.type && step % 36 === 0);
        game.killThreat(target, environmental ? "asteroid" : "player");
      }
    }
    if (state.encounter === 9 && state.boss) game.damageBoss(state.boss.maxHealth * 0.2);

    game.step(CONFIG.world.fixedStep);
    if (state.ship.hull <= 0) {
      state.ship.hull = state.ship.maxHull;
      state.mode = "playing";
      state.ship.invulnerable = 2;
    }
    if (state.encounter !== previousStage) {
      stageChanges += 1;
      previousStage = state.encounter;
    }
    assertCapped(runtime, peaks);
  }
  return { runtime, peaks, stageChanges, enigmaChoices, snapshot: game.snapshot() };
}

module.exports = function register(test) {
  test("twenty-minute deterministic arcade stress stays finite and within every enforced collection cap", () => {
    const run = stress(440044, 1200);
    assert.ok(run.stageChanges >= 9, `stress run exercised only ${run.stageChanges} stage changes`);
    assert.ok(run.runtime.game.state.stats.spawned > 100, "stress run did not exercise enough spawning");
    assert.ok(run.peaks.asteroids >= 3, "stress run never produced asteroid pressure");
    assert.ok(run.peaks.aliens >= 1, "stress run never produced alien pressure");
    assert.ok(run.peaks.playerBullets >= 3, "stress run never produced player fire");
    assert.ok(run.peaks.effects >= 3, "stress run never produced effects");
    assert.ok(run.enigmaChoices >= 20, `stress resolved only ${run.enigmaChoices} Enigma choices`);
  });

  test("fixed seed and inputs reproduce the same long simulation", () => {
    const first = stress(777, 90);
    const second = stress(777, 90);
    assert.equal(first.stageChanges, second.stageChanges);
    assert.equal(first.enigmaChoices, second.enigmaChoices);
    assert.deepEqual(first.peaks, second.peaks);
    assert.equal(JSON.stringify(first.snapshot), JSON.stringify(second.snapshot));
  });
};
