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

  test("Neon Voyage v2026.8.15 configuration is present and deeply immutable", () => {
    assert.equal(CONFIG.version, "v2026.8.15");
    assert.ok(CONFIG.presentation.gameoverEffectDuration > 0 && CONFIG.presentation.gameoverEffectDuration <= 1);
    collectFrozen(CONFIG, new Set());
  });

  test("calendar versions keep year-month-day order with an optional daily revision", () => {
    const match = CONFIG.version.match(/^v(\d{4})\.(\d{1,2})\.(\d{1,2})([a-z])?$/);
    assert.ok(match, "version must use vYYYY.M.D with an optional lowercase revision suffix");
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    assert.ok(year >= 2026, "calendar version year cannot predate the adopted scheme");
    assert.ok(month >= 1 && month <= 12, "calendar version month is invalid");
    assert.equal(new Date(Date.UTC(year, month - 1, day)).getUTCDate(), day, "calendar version day is invalid");
    assert.equal(match[2], String(month), "calendar version month must not have a leading zero");
    assert.equal(match[3], String(day), "calendar version day must not have a leading zero");
  });

  test("fixed-step simulation and every runtime collection have conservative finite caps", () => {
    assert.ok(CONFIG.world.fixedStep >= 1 / 240 && CONFIG.world.fixedStep <= 1 / 30);
    assert.ok(CONFIG.world.maxFrameDelta >= CONFIG.world.fixedStep && CONFIG.world.maxFrameDelta <= 0.1);
    for (const [name, value] of Object.entries(CONFIG.caps)) {
      assert.ok(Number.isSafeInteger(value) && value > 0, `${name} cap must be a positive integer`);
      assert.ok(value <= 1000, `${name} cap is unexpectedly large`);
    }
    assert.ok(CONFIG.caps.drones >= 3 && CONFIG.caps.drones <= 9);
    assert.ok(CONFIG.caps.activeAudioNodes <= 24);
  });

  test("nine stages keep the Titan before first contact and the alien boss last", () => {
    const stages = CONFIG.sector.encounters;
    assert.equal(CONFIG.sector.encountersPerSector, 9);
    assert.equal(stages.length, 9);
    stages.forEach((stage, index) => assert.equal(stage.index, index + 1));
    assert.deepEqual(Array.from(stages, (stage) => stage.id), [
      "earthOrbit",
      "innerBelt",
      "deepDrift",
      "shatteredFrontier",
      "titanGate",
      "firstContact",
      "strikeWing",
      "raidFleet",
      "boss"
    ]);
    assert.deepEqual(Array.from(stages, (stage) => stage.goal.type), [
      "waves", "waves", "waves", "waves", "titan", "waves", "waves", "waves", "boss"
    ]);
    for (const stage of stages.slice(0, 8)) {
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
    for (const stage of stages.slice(0, 5)) {
      assert.ok(!/alien|scout|strike|raid|fleet|carrier|bomber/i.test(stage.label), `${stage.id} label foreshadows alien spacecraft too early`);
      for (const wave of stage.waves) {
        assert.ok(!/alien|scout|strike|raid|fleet|carrier|bomber/i.test(wave.label), `${stage.id}/${wave.label} uses a stale alien label`);
        for (const group of wave.required.concat(wave.hazards || [])) {
          assert.equal(group.family, "asteroid", `${stage.id} introduces aliens before First Contact`);
        }
      }
    }
    for (const stage of stages.slice(5, 8)) {
      assert.ok(stage.waves.some((wave) => wave.required.some((group) => group.family === "alien")), `${stage.id} lacks required alien spacecraft`);
    }
    const firstWave = stages[0].waves[0];
    assert.equal(firstWave.required.length, 1);
    assert.equal(firstWave.required[0].family, "asteroid");
    assert.deepEqual(Array.from(firstWave.required[0].kinds), ["rock"]);
    assert.equal(firstWave.required[0].count, 3, "first wave must contain exactly three asteroids");
    assert.equal(firstWave.required[0].cap, 3, "first wave must not scale above three asteroids");
    assert.equal("minimumSeconds" in stages[4].goal, false, "Titan victory must not be time-gated");
    assert.ok(stages[4].waves.some((wave) => wave.required.some((group) => group.kinds.includes("titan"))), "Stage 5 lacks its Titan");
    for (const stage of stages.slice(5, 8)) {
      for (const wave of stage.waves) {
        assert.ok((wave.hazards || []).some((group) => group.family === "asteroid"), `${stage.id}/${wave.label} lacks mixed asteroid pressure`);
      }
    }
    assert.ok(CONFIG.bossArena.warningSeconds > 0);

    const milestoneRewards = JSON.parse(JSON.stringify(stages
      .filter((stage) => stage.guaranteedReward)
      .map((stage) => [stage.index, stage.guaranteedReward])));
    assert.deepEqual(milestoneRewards, [
      [2, { type: "moduleUpgrade", module: "homingSalvo", tiers: 1 }],
      [4, { type: "moduleUpgrade", module: "radialArray", tiers: 1 }],
      [6, { type: "moduleUpgrade", module: "drone", tiers: 1 }],
      [8, { type: "moduleUpgrade", module: "radialArray", tiers: 1 }]
    ], "campaign milestones must target the authored autonomous modules");
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
    assert.deepEqual(JSON.parse(JSON.stringify(CONFIG.asteroids.colossal.split)), {
      count: 3,
      into: "rock",
      radiusScale: 0.46,
      generations: 2
    });
    assert.equal(CONFIG.asteroids.rock.split.generations, 1, "ordinary rocks must not split recursively");
    assert.ok(CONFIG.asteroids.titan.healthGates.length >= 3);
    assert.ok(Object.keys(CONFIG.aliens).length >= 4);
    assert.ok(Object.values(CONFIG.aliens).every((alien) => alien.pattern && alien.pattern.type));
    assert.equal(CONFIG.aliens.carrier.pattern.spawnType, "scout");
    assert.equal(CONFIG.aliens.carrier.pattern.count, 2);
    assert.equal(CONFIG.aliens.carrier.pattern.maxChildren, 4);
    assert.equal(CONFIG.aliens.carrier.pattern.childScore, 35);
    assert.ok(Object.keys(CONFIG.bosses).length >= 1);
    assert.ok(Object.values(CONFIG.bosses).every((boss) => boss.faction === "alien"));
  });

  test("field buffs include stackable timed weapons, Enigma drafts, and permanent upgrades", () => {
    const powerups = CONFIG.powerups;
    assert.equal(powerups.dropChance, 0.26);
    assert.equal(powerups.pityKills, 4);
    assert.equal(powerups.temporaryStackLimit, 4);
    assert.equal(powerups.rapid.duration, 10);
    assert.equal(powerups.triShot.duration, 10);
    for (const kind of ["shield", "rapid", "triShot", "arcBurst", "novaLance", "repair", "piercing", "pulseCharge", "enigma", "moduleUpgrade"]) {
      assert.ok(powerups[kind] && powerups[kind].weight > 0, `${kind} must appear in the weighted pool`);
    }
    for (const kind of ["arcBurst", "novaLance"]) {
      assert.ok(powerups[kind].duration >= 6 && powerups[kind].duration <= 20, `${kind} duration is not a useful finite interval`);
    }
    assert.equal(powerups.moduleUpgrade.weight, 7);
    assert.equal(powerups.enigma.weight, 12);
    assert.equal(powerups.enigma.choiceCount, 3);
    assert.equal(powerups.enigma.slowdownSeconds, 0.72);
    assert.equal(powerups.enigma.resumeInvulnerability, 1);
    assert.ok(powerups.enigma.slowdownSeconds >= CONFIG.world.fixedStep && powerups.enigma.slowdownSeconds <= 1.5);
    assert.equal("salvage" in powerups, false, "collectible salvage progression must remain removed");
  });

  test("difficulty scaling is monotonic, sublinear, finite, and capped", () => {
    const difficulty = CONFIG.difficulty;
    const scalePairs = [
      ["healthScale", "healthMultiplier"],
      ["bossHealthScale", "bossHealthMultiplier"],
      ["damageScale", "damageMultiplier"],
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

  test("seven permanent weapon modules stack through Mk V with bounded autonomous passives", () => {
    const modules = CONFIG.weapons.modules;
    assert.equal(Object.keys(modules).length, 7);
    assert.equal(CONFIG.weapons.maxInstalledModules, 7);
    assert.equal(CONFIG.weapons.maxModuleTier, 5);
    assert.equal(CONFIG.weapons.startingModules.pulse, 1);
    for (const [name, module] of Object.entries(modules)) {
      assert.equal(module.tiers.length, CONFIG.weapons.maxModuleTier, `${name} tier count`);
      for (const tier of module.tiers) {
        assert.ok(tier.cooldown > 0.04 && tier.cooldown <= (module.activation === "autonomous" ? 6 : 2));
        assert.ok(tier.damage > 0 && tier.damage < 10);
      }
    }
    assert.equal(modules.homingSalvo.activation, "autonomous");
    assert.equal(modules.radialArray.activation, "autonomous");
    for (const id of ["homingSalvo", "radialArray"]) {
      for (const tier of modules[id].tiers) {
        assert.ok(tier.range > 0 && tier.range <= 1000);
        assert.ok(Number.isSafeInteger(tier.projectiles) && tier.projectiles > 0 && tier.projectiles <= 20);
      }
    }
    assert.equal(modules.homingSalvo.tiers[4].projectiles, 4);
    assert.equal(modules.radialArray.tiers[4].projectiles, 20);
    assert.equal(modules.drone.tiers[4].drones, 5);
    assert.ok(modules.homingSalvo.tiers[4].cooldown < modules.homingSalvo.tiers[0].cooldown);
    assert.ok(modules.radialArray.tiers[4].cooldown < modules.radialArray.tiers[0].cooldown);
    assert.ok(modules.drone.tiers[4].cooldown < modules.drone.tiers[0].cooldown);
  });

  test("Void Pulse is a finite local defense with bounded damage", () => {
    const pulse = CONFIG.voidPulse;
    assert.ok(pulse.radius >= 180 && pulse.radius <= 320);
    assert.ok(pulse.asteroidDamage > 0 && pulse.asteroidDamage <= 3);
    assert.ok(pulse.alienDamage > 0 && pulse.alienDamage <= 3);
    assert.ok(pulse.bossDamage > 0 && pulse.bossDamage <= 3);
    assert.equal(pulse.clearEnemyProjectiles, true);
    assert.equal(pulse.clearMines, true);
    assert.ok(pulse.rechargePerSecond > 0 && pulse.rechargePerSecond <= 5);
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

  test("storage and capped-array helpers fail safely", () => {
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

  test("world constraints and origin rebasing preserve finite positions", () => {
    const circle = { x: 300, y: 400, radius: 10, vx: 300, vy: 400 };
    assert.equal(Core.constrainToCircle(circle, 0, 0, 100, 0.25), true);
    approximately(Math.hypot(circle.x, circle.y), 90, 1e-9);
    assert.ok(circle.vx * circle.x + circle.vy * circle.y <= 0);
    const poisoned = { x: NaN, y: 2, vx: 3, vy: 4 };
    assert.equal(Core.isFiniteEntity(poisoned), false);

    const anchor = { x: 150, y: 20 };
    const threat = { x: 175, y: 30 };
    const landmark = { centerX: 200, centerY: 40 };
    Core.rebaseOrigin(anchor, [[threat]], [landmark], 100, 50);
    assert.deepEqual([anchor.x, anchor.y], [0, 20]);
    assert.deepEqual([threat.x, threat.y], [25, 30]);
    assert.deepEqual([landmark.centerX, landmark.centerY], [50, 40]);
  });
};
