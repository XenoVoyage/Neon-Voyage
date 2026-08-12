"use strict";

const { assert, loadBrowserScript, approximately } = require("./_harness");

function collectFrozen(value, seen) {
  if (!value || (typeof value !== "object" && typeof value !== "function") || seen.has(value)) return;
  seen.add(value);
  assert.ok(Object.isFrozen(value), "configuration must be deeply frozen");
  if (typeof value === "function") return;
  for (const key of Object.getOwnPropertyNames(value)) collectFrozen(value[key], seen);
}

module.exports = function register(test) {
  const configRuntime = loadBrowserScript("js/config.js");
  const CONFIG = configRuntime.window.ND.CONFIG;

  test("Neon Voyage 1.1 configuration is present and deeply immutable", () => {
    assert.equal(CONFIG.version, "1.1.0");
    collectFrozen(CONFIG, new Set());
  });

  test("fixed-step simulation and every entity family have conservative finite caps", () => {
    assert.ok(CONFIG.world.fixedStep >= 1 / 240 && CONFIG.world.fixedStep <= 1 / 30);
    assert.ok(CONFIG.world.maxFrameDelta >= CONFIG.world.fixedStep && CONFIG.world.maxFrameDelta <= 0.1);
    for (const [name, value] of Object.entries(CONFIG.caps)) {
      assert.ok(Number.isSafeInteger(value) && value > 0, `${name} cap must be a positive integer`);
      assert.ok(value <= 1000, `${name} cap is unexpectedly large`);
    }
    assert.equal(CONFIG.caps.bosses, 1);
    assert.equal(CONFIG.caps.titans, 1);
    assert.ok(CONFIG.caps.activeAudioNodes <= 24);
  });

  test("five stages expose finite waves and goals in the required order", () => {
    const stages = CONFIG.sector.encounters;
    assert.equal(CONFIG.sector.encountersPerSector, 5);
    assert.equal(stages.length, 5);
    stages.forEach((stage, index) => assert.equal(stage.index, index + 1));
    assert.deepEqual(Array.from(stages, (stage) => stage.id), ["beltBreach", "deepBelt", "alienRaid", "titanEvent", "boss"]);
    assert.deepEqual(Array.from(stages, (stage) => stage.goal.type), ["waves", "waves", "waves", "titan", "boss"]);
    for (const stage of stages.slice(0, 4)) {
      assert.equal(stage.completion, "waves", `${stage.id} must use finite wave completion`);
      assert.ok(Array.isArray(stage.waves) && stage.waves.length > 0, `${stage.id} needs waves`);
      for (const wave of stage.waves) {
        assert.ok(Array.isArray(wave.required) && wave.required.length > 0, `${stage.id}/${wave.label} needs required groups`);
        for (const group of wave.required.concat(wave.hazards || [])) {
          assert.ok(["asteroid", "alien"].includes(group.family), `unknown family ${group.family}`);
          assert.ok(Array.isArray(group.kinds) && group.kinds.length > 0);
          assert.ok(Number.isSafeInteger(group.count) && group.count > 0);
          assert.ok(Number.isSafeInteger(group.cap) && group.cap >= group.count);
        }
      }
    }
    const firstWave = stages[0].waves[0];
    assert.equal(firstWave.required.length, 1);
    assert.equal(firstWave.required[0].family, "asteroid");
    assert.deepEqual(Array.from(firstWave.required[0].kinds), ["rock"]);
    assert.equal(firstWave.required[0].count, 3, "first wave must contain exactly three asteroids");
    assert.equal(firstWave.required[0].cap, 3, "first wave must not scale above three asteroids");
    assert.equal("minimumSeconds" in stages[3].goal, false, "Titan victory must not be time-gated");
    assert.equal(stages[4].suspendWorldStreaming, true);
    assert.ok(CONFIG.bossArena.warningSeconds > 0);
  });

  test("hyperspace configuration is finite, directional, and fast", () => {
    const cinematic = CONFIG.cinematic;
    assert.ok(cinematic.duration > 0 && cinematic.duration <= 3);
    assert.ok(Number.isFinite(cinematic.directionX) && Number.isFinite(cinematic.directionY));
    assert.ok(Math.hypot(cinematic.directionX, cinematic.directionY) > 0);
    assert.ok(cinematic.speed >= CONFIG.world.playerMaxSpeed);
    assert.ok(cinematic.exitInvulnerability > 0);
    assert.ok(CONFIG.combatField.interWaveSeconds >= 0 && CONFIG.combatField.interWaveSeconds <= 1.5);
  });

  test("asteroids are physical hazards only while aliens own normal ranged attacks", () => {
    assert.ok(Object.keys(CONFIG.asteroids).length >= 6);
    for (const [kind, asteroid] of Object.entries(CONFIG.asteroids)) {
      assert.equal("attack" in asteroid, false, `${kind} must not define an attack`);
      assert.ok(Array.isArray(asteroid.speed) && asteroid.speed[0] > 0 && asteroid.speed[1] >= asteroid.speed[0]);
    }
    assert.equal("asteroidPursuit" in CONFIG, false, "asteroid pursuit must be removed from configuration");
    assert.ok(CONFIG.asteroids.volatile.deathBurst.fragments >= 6);
    assert.ok(CONFIG.asteroids.titan.healthGates.length >= 3);
    assert.ok(Object.keys(CONFIG.aliens).length >= 4);
    assert.ok(Object.values(CONFIG.aliens).every((alien) => alien.pattern && alien.pattern.type));
    assert.ok(Object.keys(CONFIG.bosses).length >= 1);
    assert.ok(Object.values(CONFIG.bosses).every((boss) => boss.faction === "alien"));
  });

  test("frequent independent field buffs include ten-second Rapid and Tri-Shot", () => {
    const powerups = CONFIG.powerups;
    assert.ok(powerups.dropChance >= 0.15, "field drops are too rare for the arcade target");
    assert.ok(powerups.pityKills <= 10, "pickup pity counter must guarantee a drop within ten kills");
    assert.equal(powerups.rapid.duration, 10);
    assert.equal(powerups.triShot.duration, 10);
    for (const kind of ["shield", "rapid", "triShot", "repair", "piercing", "pulseCharge", "moduleUpgrade"]) {
      assert.ok(powerups[kind] && powerups[kind].weight > 0, `${kind} must appear in the weighted pool`);
    }
    assert.equal("salvage" in powerups, false, "collectible salvage progression was removed in 1.1");
  });

  test("difficulty scaling is monotonic, sublinear, finite, and capped", () => {
    const difficulty = CONFIG.difficulty;
    const scalePairs = [
      ["healthScale", "healthMultiplier"],
      ["bossHealthScale", "bossHealthMultiplier"],
      ["damageScale", "damageMultiplier"],
      ["threatScale", "threatMultiplier"],
      ["speedScale", "speedMultiplier"],
      ["fireRateScale", "fireRateMultiplier"],
      ["scoreScale", "scoreMultiplier"]
    ];
    for (const [name, capName] of scalePairs) {
      const fn = difficulty[name];
      let previous = fn(1);
      approximately(previous, 1, 1e-12, `${name}(1)`);
      for (const sector of [2, 3, 5, 10, 25, 100, 1000, 1e9]) {
        const current = fn(sector);
        assert.ok(Number.isFinite(current) && current >= previous, `${name} must be finite and monotonic`);
        assert.ok(current <= difficulty.caps[capName], `${name} exceeded its cap`);
        previous = current;
      }
    }
  });

  test("five permanent weapon modules have bounded viable tiers", () => {
    const modules = CONFIG.weapons.modules;
    assert.equal(Object.keys(modules).length, 5);
    assert.equal(CONFIG.weapons.startingModules.pulse, 1);
    assert.equal(CONFIG.weapons.stacking, "allOwnedModulesFire");
    for (const [name, module] of Object.entries(modules)) {
      assert.equal(module.tiers.length, CONFIG.weapons.maxModuleTier, `${name} tier count`);
      for (const tier of module.tiers) {
        assert.ok(tier.cooldown > 0.04 && tier.cooldown <= 2);
        assert.ok(tier.damage > 0 && tier.damage < 10);
      }
    }
  });

  const Core = loadBrowserScript("js/core.js").window.ND.Core;

  test("core collision, angle, and seeded random helpers are deterministic", () => {
    assert.equal(Core.clamp(12, 0, 10), 10);
    approximately(Core.normalizeAngle(Math.PI * 3), -Math.PI, 1e-12);
    assert.equal(Core.segmentCircleHit(-4, 0, 4, 0, 0, 0, 1), true);
    assert.equal(Core.segmentCircleHit(-4, 3, 4, 3, 0, 0, 1), false);
    const first = Core.createRng("voyage");
    const second = Core.createRng("voyage");
    for (let index = 0; index < 100; index += 1) assert.equal(first(), second());
  });

  test("storage, pooling, and capped-array helpers fail safely", () => {
    const data = new Map();
    const storage = { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
    const valid = (value) => value && Number.isFinite(value.score) && value.score >= 0;
    assert.equal(Core.safeWriteJSON(storage, "record", { score: 12 }, valid, 64), true);
    assert.equal(Core.safeReadJSON(storage, "record", null, valid, 64).score, 12);
    data.set("record", "not-json");
    assert.equal(Core.safeReadJSON(storage, "record", "fallback", valid, 64), "fallback");
    const values = [{ alive: false }, { alive: true }, { alive: true }];
    Core.cleanupCapped(values, (entry) => entry.alive, 1);
    assert.equal(values.length, 1);
  });

  test("rectangle and circle constraints contain extreme outward velocity", () => {
    const circle = { x: 300, y: 400, radius: 10, vx: 300, vy: 400 };
    assert.equal(Core.constrainToCircle(circle, 0, 0, 100, 0.25), true);
    approximately(Core.distance(0, 0, circle.x, circle.y), 90, 1e-9);
    assert.ok(circle.vx * circle.x + circle.vy * circle.y <= 0);
    const poisoned = { x: NaN, y: 2, vx: 3, vy: 4 };
    assert.equal(Core.isFiniteEntity(poisoned), false);
  });
};
