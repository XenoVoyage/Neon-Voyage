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

  test("Neon Voyage v2026.8.15c configuration is present and deeply immutable", () => {
    assert.equal(CONFIG.version, "v2026.8.15c");
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

  test("twenty authored stages place a distinct boss at every tenth encounter", () => {
    const stages = CONFIG.sector.encounters;
    assert.equal(CONFIG.sector.encountersPerSector, 20);
    assert.equal(stages.length, 20);
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
      "commandScreen",
      "bossHarrower",
      "ionGraveyard",
      "prismRift",
      "gravityScar",
      "fracturedHalo",
      "anomalyCrown",
      "vanguardSwarm",
      "nullPhalanx",
      "siegeChoir",
      "sovereignGuard",
      "bossLeviathan"
    ]);
    assert.deepEqual(Array.from(stages.filter((stage) => stage.goal.type === "boss"), (stage) => stage.index), [10, 20]);
    assert.deepEqual(Array.from(stages.filter((stage) => stage.goal.type === "boss"), (stage) => stage.bossType), ["harrower", "leviathan"]);
    for (const stage of stages.filter((stage) => stage.goal.type !== "boss")) {
      assert.ok(["waves", "titan"].includes(stage.goal.type), `${stage.id} needs a finite structural goal`);
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
    for (const stage of stages.slice(5, 9)) {
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
    for (const stage of stages.slice(5, 9)) {
      for (const wave of stage.waves) {
        assert.ok((wave.hazards || []).some((group) => group.family === "asteroid"), `${stage.id}/${wave.label} lacks mixed asteroid pressure`);
      }
    }
    for (const stage of stages.slice(10, 15)) {
      for (const wave of stage.waves) {
        for (const group of wave.required.concat(wave.hazards || [])) {
          assert.equal(group.family, "asteroid", `${stage.id} must remain an evolved anomaly field`);
        }
        const guaranteedMassiveRoots = wave.required.concat(wave.hazards || []).reduce((total, group) => {
          const allMassive = group.family === "asteroid" && group.kinds.every((kind) => CONFIG.asteroids[kind].radius >= 90);
          return total + (allMassive ? group.cap || group.count : 0);
        }, 0);
        assert.ok(guaranteedMassiveRoots <= 2, `${stage.id}/${wave.label} clusters too many massive roots`);
      }
    }
    for (const stage of stages.slice(15, 19)) {
      assert.ok(stage.waves.some((wave) => wave.required.some((group) => group.family === "alien")), `${stage.id} lacks second-arc aliens`);
    }
    assert.ok(CONFIG.bossArena.warningSeconds > 0);

    const authoredCounts = stages.map((stage) => stage.waves ? stage.waves.reduce((stageTotal, wave) =>
      stageTotal + wave.required.concat(wave.hazards || []).reduce((waveTotal, group) => waveTotal + group.count, 0), 0) : null);
    assert.deepEqual(Array.from(authoredCounts), [
      12, 14, 16, 18, 7,
      12, 14, 16, 18, null,
      14, 16, 18, 20, 16,
      14, 16, 18, 20, null
    ], "ordinary stage pressure must rise within each authored arc");

    const firstAuthoredStage = (family, kind) => stages.find((stage) => (stage.waves || []).some((wave) =>
      wave.required.concat(wave.hazards || []).some((group) => group.family === family && group.kinds.includes(kind))
    ))?.index;
    assert.equal(firstAuthoredStage("asteroid", "auricColossus"), 4);
    assert.equal(firstAuthoredStage("asteroid", "corona"), 15);
    assert.equal(firstAuthoredStage("alien", "scout"), 6);
    assert.equal(firstAuthoredStage("alien", "striker"), 7);
    assert.equal(firstAuthoredStage("alien", "bomber"), 8);
    assert.equal(firstAuthoredStage("alien", "carrier"), 8);
    assert.equal(firstAuthoredStage("alien", "lancer"), 16);
    assert.equal(firstAuthoredStage("alien", "gunship"), 17);
    assert.equal(firstAuthoredStage("alien", "broodCarrier"), 18);

    const milestoneRewards = JSON.parse(JSON.stringify(stages
      .filter((stage) => stage.guaranteedReward)
      .map((stage) => [stage.index, stage.guaranteedReward])));
    assert.deepEqual(milestoneRewards, [
      [3, { type: "moduleUpgrade", module: "homingSalvo", tiers: 1 }],
      [6, { type: "moduleUpgrade", module: "drone", tiers: 1 }],
      [9, { type: "moduleUpgrade", module: "shieldReactor", tiers: 1 }],
      [12, { type: "moduleUpgrade", module: "prism", tiers: 1 }],
      [15, { type: "moduleUpgrade", module: "overclock", tiers: 1 }],
      [18, { type: "moduleUpgrade", module: "seeker", tiers: 1 }]
    ], "campaign milestones must punctuate each three-stage progression band");
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

  test("asteroids keep finite physical families while evolved variants own bounded counterplay", () => {
    assert.ok(Object.keys(CONFIG.asteroids).length >= 12);
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
    assert.deepEqual(JSON.parse(JSON.stringify(CONFIG.asteroids.auricColossus.split)), {
      count: 3,
      into: "auricShard",
      radiusScale: 0.46,
      generations: 2
    });
    assert.equal(CONFIG.asteroids.auricShard.split.count, 2);
    assert.equal(CONFIG.asteroids.auricShard.split.generations, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(CONFIG.asteroids.auricShard.variants)), {
      explosive: { blastRadius: 120, damage: 24 },
      magnetic: { range: 300, acceleration: 240, totalAccelerationCap: 360, speedCap: 360 }
    });
    const corona = CONFIG.asteroids.corona;
    assert.equal(corona.hazard.type, "rotatingBeam");
    assert.ok(corona.hazard.warning > 0 && corona.hazard.active > 0 && corona.hazard.cooldown > 0);
    assert.ok(corona.hazard.range > corona.radius && corona.hazard.width > 0 && corona.hazard.tick > 0);
    assert.ok(corona.deathExplosion.radius > corona.radius && corona.deathExplosion.damage > 0);

    assert.ok(Object.keys(CONFIG.aliens).length >= 7);
    assert.ok(Object.values(CONFIG.aliens).every((alien) => alien.pattern && alien.pattern.type));
    assert.equal(CONFIG.aliens.carrier.pattern.spawnType, "scout");
    assert.equal(CONFIG.aliens.carrier.pattern.count, 2);
    assert.equal(CONFIG.aliens.carrier.pattern.maxChildren, 4);
    assert.equal(CONFIG.aliens.carrier.pattern.childScore, 35);
    assert.equal(CONFIG.aliens.gunship.pattern.type, "sweepingLaser");
    assert.ok(CONFIG.aliens.gunship.pattern.warning > 0 && CONFIG.aliens.gunship.pattern.active > 0);
    assert.ok(CONFIG.aliens.gunship.pattern.range > CONFIG.aliens.gunship.pattern.preferredRange);
    assert.equal(CONFIG.aliens.gunship.pattern.sweepAngularSpeed, 0.42);
    assert.equal(CONFIG.aliens.broodCarrier.pattern.spawnType, "lancer");
    assert.equal(CONFIG.aliens.broodCarrier.pattern.maxChildren, 6);
    assert.deepEqual(JSON.parse(JSON.stringify(CONFIG.aliens.broodCarrier.rangeArmor)), {
      distance: 300,
      multiplier: 0.3
    });
    assert.ok(Object.keys(CONFIG.bosses).length >= 2);
    assert.notEqual(CONFIG.bosses.harrower.label, CONFIG.bosses.leviathan.label);
    assert.equal("arenaShape" in CONFIG.bosses.harrower, false);
    assert.equal("arenaShape" in CONFIG.bosses.leviathan, false);
    assert.deepEqual(JSON.parse(JSON.stringify(CONFIG.bosses.leviathan.reflectionShield)), {
      warning: 1,
      active: 1.6,
      cooldown: 4.8,
      damage: 12,
      speed: 420,
      life: 2.4,
      damageMultiplier: 0.25
    });
  });

  test("field rewards unlock by stage and use the six bounded drop bands", () => {
    const powerups = CONFIG.powerups;
    assert.deepEqual(JSON.parse(JSON.stringify(powerups.dropBands)), [
      { minStage: 1, dropChance: 0.26, pityKills: 4, moduleWeight: 0, permanentDraftChance: 0, rewardTierCap: 1 },
      { minStage: 3, dropChance: 0.28, pityKills: 4, moduleWeight: 0, permanentDraftChance: 0.3, rewardTierCap: 2 },
      { minStage: 4, dropChance: 0.29, pityKills: 4, moduleWeight: 8, permanentDraftChance: 0.35, rewardTierCap: 2 },
      { minStage: 6, dropChance: 0.31, pityKills: 4, moduleWeight: 12, permanentDraftChance: 0.5, rewardTierCap: 3 },
      { minStage: 11, dropChance: 0.34, pityKills: 3, moduleWeight: 18, permanentDraftChance: 0.7, rewardTierCap: 4 },
      { minStage: 16, dropChance: 0.38, pityKills: 3, moduleWeight: 24, permanentDraftChance: 0.9, rewardTierCap: 5 }
    ]);
    for (let index = 1; index < powerups.dropBands.length; index += 1) {
      assert.ok(powerups.dropBands[index].minStage > powerups.dropBands[index - 1].minStage);
      assert.ok(powerups.dropBands[index].dropChance >= powerups.dropBands[index - 1].dropChance);
      assert.ok(powerups.dropBands[index].rewardTierCap >= powerups.dropBands[index - 1].rewardTierCap);
    }
    assert.equal(powerups.temporaryStackLimit, 4);
    assert.equal(powerups.rapid.duration, 28);
    assert.equal(powerups.triShot.duration, 28);
    for (const kind of ["shield", "rapid", "triShot", "arcBurst", "novaLance", "amplifier", "aegis", "repair", "piercing", "pulseCharge", "enigma"]) {
      assert.ok(powerups[kind] && powerups[kind].weight > 0, `${kind} must appear in the weighted pool`);
    }
    for (const kind of ["rapid", "triShot", "piercing", "arcBurst", "novaLance", "amplifier", "aegis"]) {
      assert.ok(powerups[kind].duration >= 24 && powerups[kind].duration <= 30, `${kind} duration is not a useful finite interval`);
    }
    assert.deepEqual(Object.fromEntries([
      "shield", "rapid", "repair", "pulseCharge", "triShot", "enigma", "piercing",
      "moduleUpgrade", "arcBurst", "aegis", "amplifier", "novaLance"
    ].map((id) => [id, powerups[id].unlockStage])), {
      shield: 1,
      rapid: 1,
      repair: 1,
      pulseCharge: 1,
      triShot: 2,
      enigma: 3,
      piercing: 4,
      moduleUpgrade: 4,
      arcBurst: 6,
      aegis: 8,
      amplifier: 9,
      novaLance: 11
    });
    assert.equal(powerups.shield.amount, 30);
    assert.equal(powerups.shield.cap, 60);
    assert.equal(powerups.shield.drainMultiplier, 1.25);
    assert.equal(powerups.amplifier.damageMultiplier, 1.45);
    assert.equal(powerups.aegis.damageReduction, 0.32);
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
      let previousStage = fn(1, 1);
      for (let stage = 2; stage <= CONFIG.sector.encountersPerSector; stage += 1) {
        const currentStage = fn(1, stage);
        assert.ok(Number.isFinite(currentStage) && currentStage >= previousStage, `${name} stage curve must be finite and monotonic`);
        assert.ok(currentStage <= difficulty.caps[capName]);
        previousStage = currentStage;
      }
    }
    assert.ok(difficulty.scaledCooldown(2, 1, 20) < difficulty.scaledCooldown(2, 1, 1));
  });

  test("thirteen permanent modules stack through Mk V with bounded active, autonomous, and passive effects", () => {
    const modules = CONFIG.weapons.modules;
    const moduleCount = Object.keys(modules).length;
    assert.equal(moduleCount, 13);
    assert.equal(CONFIG.weapons.maxModuleTier, 5);
    assert.equal(CONFIG.weapons.startingModules.pulse, 1);
    assert.deepEqual(Object.fromEntries(Object.entries(modules).map(([id, module]) => [id, module.unlockStage])), {
      pulse: 1,
      homingSalvo: 3,
      radialArray: 5,
      prism: 12,
      seeker: 17,
      massDriver: 19,
      drone: 6,
      teslaCoil: 9,
      orbitBlades: 11,
      mineLayer: 14,
      shieldReactor: 9,
      overclock: 15,
      tractorField: 7
    });
    for (const [name, module] of Object.entries(modules)) {
      assert.equal(module.tiers.length, CONFIG.weapons.maxModuleTier, `${name} tier count`);
      assert.ok(["whileFiring", "autonomous", "passive"].includes(module.activation), `${name} activation`);
      for (const tier of module.tiers) assert.ok(Object.values(tier).every(Number.isFinite), `${name} tier values must be finite`);
    }
    assert.equal(modules.homingSalvo.activation, "autonomous");
    assert.equal(modules.radialArray.activation, "autonomous");
    for (const id of ["homingSalvo", "radialArray", "drone", "teslaCoil", "mineLayer"]) {
      for (const tier of modules[id].tiers) {
        assert.ok(tier.range > 0 && tier.range <= 1000);
        if ("projectiles" in tier) assert.ok(Number.isSafeInteger(tier.projectiles) && tier.projectiles > 0 && tier.projectiles <= 20);
      }
      for (let tier = 1; tier < modules[id].tiers.length; tier += 1) {
        assert.ok(modules[id].tiers[tier].range >= modules[id].tiers[tier - 1].range, `${id} range decreased at tier ${tier + 1}`);
      }
    }
    assert.equal(modules.homingSalvo.tiers[4].projectiles, 4);
    assert.equal(modules.radialArray.tiers[4].projectiles, 20);
    assert.equal(modules.drone.tiers[4].drones, 5);
    assert.equal(modules.teslaCoil.tiers[4].chains, 6);
    assert.equal(modules.orbitBlades.tiers[4].blades, 5);
    assert.equal(modules.mineLayer.tiers[4].mines, 3);
    assert.equal(modules.shieldReactor.tiers[4].amount, 14);
    assert.equal(modules.overclock.tiers[4].cooldownMultiplier, 0.74);
    assert.equal(modules.tractorField.tiers[4].range, 320);
    assert.ok(modules.teslaCoil.tiers.every((tier) => tier.cooldown > 0 && tier.damage > 0 && tier.chains <= 6));
    assert.ok(modules.orbitBlades.tiers.every((tier) => tier.blades <= CONFIG.caps.drones && tier.hitCooldown > 0));
    assert.ok(modules.mineLayer.tiers.every((tier) => tier.mines <= CONFIG.caps.mines && tier.life > 0));
    assert.ok(modules.shieldReactor.tiers.every((tier) => tier.cooldown > 0 && tier.amount > 0));
    assert.ok(modules.overclock.tiers.every((tier) => tier.cooldownMultiplier > 0.5 && tier.cooldownMultiplier <= 1));
    assert.ok(modules.tractorField.tiers.every((tier) => tier.range > 0 && tier.strength > 0));
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
