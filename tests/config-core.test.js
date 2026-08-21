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

  test("Neon Voyage v2026.8.21e configuration is present and deeply immutable", () => {
    assert.equal(CONFIG.version, "v2026.8.21e");
    assert.ok(CONFIG.presentation.gameoverEffectDuration >= 1 && CONFIG.presentation.gameoverEffectDuration <= 2);
    assert.ok(CONFIG.mobileControls.autoAimHoldSeconds > 0 && CONFIG.mobileControls.autoAimHoldSeconds <= 0.25);
    assert.deepEqual(JSON.parse(JSON.stringify(CONFIG.audio)), {
      defaultVolume: 0.8,
      minVolume: 0,
      maxVolume: 1,
      volumeStep: 0.05,
      mixGain: 1.7,
      maxVoiceGain: 0.22,
      limiterThreshold: -8,
      limiterKnee: 6,
      limiterRatio: 8,
      limiterAttack: 0.003,
      limiterRelease: 0.18
    });
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
    assert.ok(CONFIG.combatField.halfWidthViewportRatio > 0.5 && CONFIG.combatField.halfWidthViewportRatio <= 1);
    assert.ok(CONFIG.combatField.halfHeightViewportRatio > 0.5 && CONFIG.combatField.halfHeightViewportRatio <= 1);
    assert.ok(CONFIG.camera.deadZoneHalfWidthViewportRatio > 0 && CONFIG.camera.deadZoneHalfWidthViewportRatio < 0.5);
    assert.ok(CONFIG.camera.deadZoneHalfHeightViewportRatio > 0 && CONFIG.camera.deadZoneHalfHeightViewportRatio < 0.5);
    assert.ok(Number.isSafeInteger(CONFIG.targetIndicators.maxVisible) && CONFIG.targetIndicators.maxVisible <= 8);
    assert.ok(CONFIG.targetIndicators.minimumSeparation >= CONFIG.targetIndicators.iconRadius * 2);
    for (const [name, value] of Object.entries(CONFIG.caps)) {
      assert.ok(Number.isSafeInteger(value) && value > 0, `${name} cap must be a positive integer`);
      assert.ok(value <= 1000, `${name} cap is unexpectedly large`);
    }
    assert.ok(CONFIG.caps.drones >= 3 && CONFIG.caps.drones <= 9);
    assert.ok(CONFIG.caps.activeAudioNodes <= 24);
  });

  test("seven authored stages reach first contact early and end with two distinct bosses", () => {
    const stages = CONFIG.sector.encounters;
    assert.equal(stages.length, 7);
    stages.forEach((stage, index) => assert.equal(stage.index, index + 1));
    assert.deepEqual(Array.from(stages, (stage) => stage.id), [
      "earthOrbit",
      "titanBreach",
      "firstContact",
      "shatteredFront",
      "bossHarrower",
      "anomalySiege",
      "bossLeviathan"
    ]);
    assert.deepEqual(Array.from(stages.filter((stage) => stage.goal.type === "boss"), (stage) => stage.index), [5, 7]);
    assert.deepEqual(Array.from(stages.filter((stage) => stage.goal.type === "boss"), (stage) => stage.bossType), ["harrower", "leviathan"]);
    for (const stage of stages.filter((stage) => stage.goal.type !== "boss")) {
      assert.ok(["waves", "titan"].includes(stage.goal.type), `${stage.id} needs a finite structural goal`);
      assert.ok(Array.isArray(stage.waves) && stage.waves.length > 0, `${stage.id} needs waves`);
      for (const wave of stage.waves) {
        assert.ok(Array.isArray(wave.required) && wave.required.length > 0, `${stage.id}/${wave.label} needs required groups`);
        if (wave.reinforcements) {
          const release = wave.reinforcements;
          assert.ok(Number.isFinite(release.activePressure) && release.activePressure > 0);
          assert.ok(Number.isFinite(release.refillAtPressure) && release.refillAtPressure >= 0 &&
            release.refillAtPressure < release.activePressure);
          assert.ok(Number.isSafeInteger(release.initialBatch) && release.initialBatch > 0);
          assert.ok(Number.isSafeInteger(release.batchSize) && release.batchSize > 0 &&
            release.batchSize <= release.initialBatch);
          assert.ok(Number.isFinite(release.intervalSeconds) && release.intervalSeconds >= 0 &&
            release.intervalSeconds <= 2);
        }
        for (const group of wave.required.concat(wave.hazards || [])) {
          assert.ok(["asteroid", "alien"].includes(group.family), `unknown family ${group.family}`);
          assert.ok(Array.isArray(group.kinds) && group.kinds.length > 0);
          assert.ok(Number.isSafeInteger(group.count) && group.count > 0);
          assert.ok(Number.isSafeInteger(group.cap) && group.cap >= group.count);
          if ("durabilityScale" in group) {
            assert.ok(Number.isFinite(group.durabilityScale) && group.durabilityScale >= 0.25 && group.durabilityScale <= 4);
          }
        }
      }
    }
    for (const stage of stages.slice(0, 2)) {
      for (const wave of stage.waves) {
        for (const group of wave.required.concat(wave.hazards || [])) {
          assert.equal(group.family, "asteroid", `${stage.id} introduces aliens before First Contact`);
        }
      }
    }
    for (const stage of [stages[2], stages[3], stages[5]]) {
      assert.ok(stage.waves.some((wave) => wave.required.some((group) => group.family === "alien")), `${stage.id} lacks required alien spacecraft`);
    }
    const firstWave = stages[0].waves[0];
    assert.equal(firstWave.required.length, 1);
    assert.equal(firstWave.required[0].family, "asteroid");
    assert.deepEqual(Array.from(firstWave.required[0].kinds), ["rock"]);
    assert.equal(firstWave.required[0].count, 3, "first wave must contain exactly three asteroids");
    assert.equal(firstWave.required[0].cap, 3, "first wave must not scale above three asteroids");
    assert.equal("minimumSeconds" in stages[1].goal, false, "Titan victory must not be time-gated");
    assert.ok(stages[1].waves.some((wave) => wave.required.some((group) => group.kinds.includes("titan"))), "Stage 2 lacks its Titan");
    assert.deepEqual(Array.from(stages[2].waves[0].required[0].kinds), ["scout"]);
    assert.equal(stages[2].waves[0].required[0].count, 1, "Stage 3 must open with one alien contact");
    assert.ok(stages[3].waves.every((wave) => wave.required.some((group) => group.family === "alien")), "Stage 4 must sustain mixed alien combat");
    assert.ok(CONFIG.bossArena.warningSeconds > 0);

    const beltSurge = stages[1].waves;
    assert.equal(beltSurge.length, 1, "Titan Breach must play as one continuous finite surge");
    assert.equal(beltSurge[0].label, "TITAN BREACH");
    assert.deepEqual(JSON.parse(JSON.stringify(beltSurge[0].reinforcements)), {
      activePressure: 12,
      refillAtPressure: 4,
      initialBatch: 5,
      batchSize: 2,
      intervalSeconds: 0.4
    });
    assert.equal(beltSurge[0].required.reduce((total, group) => total + group.count, 0), 10);
    assert.equal(beltSurge[0].required.filter((group) => group.kinds.includes("colossal"))
      .reduce((total, group) => total + group.count, 0), 1);
    assert.equal(beltSurge[0].required.filter((group) => group.kinds.includes("titan"))
      .reduce((total, group) => total + group.count, 0), 1);

    const authoredCounts = stages.map((stage) => stage.waves ? stage.waves.reduce((stageTotal, wave) =>
      stageTotal + wave.required.concat(wave.hazards || []).reduce((waveTotal, group) => waveTotal + group.count, 0), 0) : null);
    assert.deepEqual(Array.from(authoredCounts), [7, 10, 11, 13, null, 14, null]);

    const firstAuthoredStage = (family, kind) => stages.find((stage) => (stage.waves || []).some((wave) =>
      wave.required.concat(wave.hazards || []).some((group) => group.family === family && group.kinds.includes(kind))
    ))?.index;
    assert.equal(firstAuthoredStage("asteroid", "auricColossus"), 4);
    assert.equal(firstAuthoredStage("asteroid", "corona"), 6);
    assert.equal(firstAuthoredStage("alien", "scout"), 3);
    assert.equal(firstAuthoredStage("alien", "striker"), 3);
    assert.equal(firstAuthoredStage("alien", "bomber"), 4);
    assert.equal(firstAuthoredStage("alien", "carrier"), 4);
    assert.equal(firstAuthoredStage("alien", "lancer"), 6);
    assert.equal(firstAuthoredStage("alien", "gunship"), 4);
    assert.equal(firstAuthoredStage("alien", "broodCarrier"), 6);

    const milestoneRewards = JSON.parse(JSON.stringify(stages
      .filter((stage) => stage.guaranteedReward)
      .map((stage) => [stage.index, stage.guaranteedReward])));
    assert.deepEqual(milestoneRewards, [
      [1, { type: "moduleUpgrade", module: "homingSalvo", tiers: 1 }],
      [2, { type: "moduleUpgrade", module: "tractorField", tiers: 1 }],
      [3, { type: "moduleUpgrade", module: "drone", tiers: 1 }],
      [4, { type: "moduleUpgrade", module: "radialArray", tiers: 1 }],
      [6, { type: "moduleUpgrade", module: "seeker", tiers: 1 }]
    ], "campaign milestones must deliver utility before and between bosses");
  });

  test("hyperspace configuration is finite, directional, and fast", () => {
    const cinematic = CONFIG.cinematic;
    assert.ok(cinematic.clearHoldSeconds >= 0.5 && cinematic.clearHoldSeconds <= 2);
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
    assert.deepEqual(JSON.parse(JSON.stringify(CONFIG.asteroids.crystal.deathShrapnel)), {
      count: 8,
      speed: 245,
      life: 1.65,
      damage: 9,
      radius: 4,
      color: "#8ffcff"
    });
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
      generations: 2,
      separationSpeed: 38,
      velocityInheritance: 0.86
    });
    assert.deepEqual(JSON.parse(JSON.stringify(CONFIG.asteroids.auricShard.split)), {
      count: 2,
      into: "auricShard",
      radiusScale: 0.52,
      generations: 1,
      separationSpeed: 26,
      velocityInheritance: 0.9
    });
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
    assert.deepEqual(Object.fromEntries(Object.entries(CONFIG.aliens).map(([kind, alien]) => [kind, alien.baseHealth])), {
      scout: 7,
      striker: 12,
      bomber: 17,
      carrier: 30,
      lancer: 15,
      gunship: 27,
      broodCarrier: 60
    });
    const stageThreeScoutHealth = CONFIG.aliens.scout.baseHealth * CONFIG.difficulty.healthScale(1, 3);
    assert.ok(Math.ceil(stageThreeScoutHealth / CONFIG.weapons.modules.pulse.tiers[0].damage) >= 8,
      "first contact still collapses in fewer than eight starting-weapon hits");
    assert.equal(CONFIG.aliens.carrier.pattern.spawnType, "scout");
    assert.equal(CONFIG.aliens.carrier.pattern.count, 2);
    assert.equal(CONFIG.aliens.carrier.pattern.maxChildren, 3);
    assert.equal(CONFIG.aliens.carrier.pattern.childScore, 35);
    assert.equal(CONFIG.aliens.gunship.pattern.type, "sweepingLaser");
    assert.ok(CONFIG.aliens.gunship.pattern.warning > 0 && CONFIG.aliens.gunship.pattern.active > 0);
    assert.ok(CONFIG.aliens.gunship.pattern.range > CONFIG.aliens.gunship.pattern.preferredRange);
    assert.equal(CONFIG.aliens.gunship.pattern.sweepAngularSpeed, 0.42);
    assert.equal(CONFIG.aliens.broodCarrier.pattern.spawnType, "lancer");
    assert.equal(CONFIG.aliens.broodCarrier.pattern.maxChildren, 4);
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

  test("field rewards are frequent, long-lived, and span five bounded seven-stage bands", () => {
    const powerups = CONFIG.powerups;
    assert.deepEqual(JSON.parse(JSON.stringify(powerups.dropBands)), [
      { minStage: 1, dropChance: 0.44, pityKills: 3, moduleWeight: 0, permanentDraftChance: 0, rewardTierCap: 1 },
      { minStage: 2, dropChance: 0.48, pityKills: 2, moduleWeight: 10, permanentDraftChance: 0.35, rewardTierCap: 2 },
      { minStage: 3, dropChance: 0.52, pityKills: 2, moduleWeight: 16, permanentDraftChance: 0.5, rewardTierCap: 3 },
      { minStage: 5, dropChance: 0.56, pityKills: 2, moduleWeight: 22, permanentDraftChance: 0.72, rewardTierCap: 4 },
      { minStage: 7, dropChance: 0.6, pityKills: 2, moduleWeight: 28, permanentDraftChance: 0.9, rewardTierCap: 5 }
    ]);
    for (let index = 1; index < powerups.dropBands.length; index += 1) {
      assert.ok(powerups.dropBands[index].minStage > powerups.dropBands[index - 1].minStage);
      assert.ok(powerups.dropBands[index].dropChance >= powerups.dropBands[index - 1].dropChance);
      assert.ok(powerups.dropBands[index].rewardTierCap >= powerups.dropBands[index - 1].rewardTierCap);
    }
    assert.equal(powerups.temporaryStackLimit, 4);
    assert.equal(powerups.rapid.duration, 45);
    assert.equal(powerups.triShot.duration, 45);
    for (const kind of ["shield", "rapid", "triShot", "arcBurst", "novaLance", "amplifier", "aegis", "thruster", "repair", "piercing", "pulseCharge", "enigma"]) {
      assert.ok(powerups[kind] && powerups[kind].weight > 0, `${kind} must appear in the weighted pool`);
    }
    for (const kind of ["rapid", "triShot", "piercing", "arcBurst", "novaLance", "amplifier", "aegis", "thruster"]) {
      assert.ok(powerups[kind].duration >= 40 && powerups[kind].duration <= 50, `${kind} duration is not a useful finite interval`);
    }
    assert.deepEqual(Object.fromEntries([
      "shield", "rapid", "repair", "pulseCharge", "triShot", "enigma", "piercing",
      "moduleUpgrade", "arcBurst", "aegis", "amplifier", "novaLance", "thruster"
    ].map((id) => [id, powerups[id].unlockStage])), {
      shield: 1,
      rapid: 1,
      repair: 1,
      pulseCharge: 1,
      triShot: 1,
      enigma: 2,
      piercing: 2,
      moduleUpgrade: 2,
      arcBurst: 2,
      aegis: 3,
      amplifier: 3,
      novaLance: 4,
      thruster: 2
    });
    assert.equal(powerups.shield.amount, 30);
    assert.equal(powerups.shield.cap, 60);
    assert.equal(powerups.shield.drainMultiplier, 1.25);
    assert.equal(powerups.amplifier.damageMultiplier, 1.45);
    assert.equal(powerups.aegis.damageReduction, 0.32);
    assert.ok(powerups.thruster.accelerationMultiplier > 1 && powerups.thruster.maxSpeedMultiplier > 1);
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
      for (let stage = 2; stage <= CONFIG.sector.encounters.length; stage += 1) {
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
      homingSalvo: 1,
      radialArray: 2,
      prism: 4,
      seeker: 6,
      massDriver: 6,
      drone: 3,
      teslaCoil: 4,
      orbitBlades: 4,
      mineLayer: 5,
      shieldReactor: 3,
      overclock: 5,
      tractorField: 2
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
    assert.ok(pulse.asteroidPullImpulse > 0 && pulse.asteroidPullImpulse <= 400);
    assert.ok(pulse.asteroidPullSpeedCap >= pulse.asteroidPullImpulse && pulse.asteroidPullSpeedCap <= 600);
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

  test("finite-entity checks and origin rebasing preserve valid positions", () => {
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
