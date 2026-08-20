"use strict";

const { assert, readProject } = require("./_harness");
const { buildBrowser, loadRuntimeScripts } = require("./_browser-harness");
const PROGRESS_KEY = "neon-voyage-progress-v1";
const SAVE_KEY = "neon-voyage-v1";
const LEGACY_MODULE_IDS = ["pulse", "homingSalvo", "radialArray", "prism", "seeker", "massDriver", "drone"];
const MODULE_IDS = LEGACY_MODULE_IDS.concat(["teslaCoil", "orbitBlades", "mineLayer", "shieldReactor", "overclock", "tractorField"]);
const LEGACY_TIMER_IDS = ["rapidTimer", "triShotTimer", "piercingTimer", "arcBurstTimer", "novaLanceTimer"];
const TIMER_IDS = LEGACY_TIMER_IDS.concat(["amplifierTimer", "aegisTimer"]);

function checkpoint(overrides) {
  const options = overrides || {};
  return {
    modules: Object.assign({
      pulse: 1,
      homingSalvo: 0,
      radialArray: 0,
      prism: 0,
      seeker: 0,
      massDriver: 0,
      drone: 0,
      teslaCoil: 0,
      orbitBlades: 0,
      mineLayer: 0,
      shieldReactor: 0,
      overclock: 0,
      tractorField: 0
    }, options.modules || {}),
    timers: Object.assign({
      rapidTimer: 0,
      triShotTimer: 0,
      piercingTimer: 0,
      arcBurstTimer: 0,
      novaLanceTimer: 0,
      amplifierTimer: 0,
      aegisTimer: 0
    }, options.timers || {})
  };
}

function progressRecord(maxUnlockedStage, lastPlayedStage, stageCheckpoints) {
  const checkpoints = {};
  for (let stage = 1; stage <= maxUnlockedStage; stage += 1) {
    checkpoints[String(stage)] = checkpoint(stageCheckpoints && stageCheckpoints[stage]);
  }
  return { schema: 3, maxUnlockedStage, lastPlayedStage, checkpoints };
}

function legacySchema2Record(maxUnlockedStage, lastPlayedStage, stageCheckpoints) {
  const checkpoints = {};
  for (let stage = 1; stage <= maxUnlockedStage; stage += 1) {
    const source = checkpoint(stageCheckpoints && stageCheckpoints[stage]);
    checkpoints[String(stage)] = {
      modules: Object.fromEntries(LEGACY_MODULE_IDS.map((id) => [id, source.modules[id]])),
      timers: Object.fromEntries(LEGACY_TIMER_IDS.map((id) => [id, source.timers[id]]))
    };
  }
  return { schema: 2, maxUnlockedStage, lastPlayedStage, checkpoints };
}

function storedProgress(storage) {
  return JSON.parse(storage.get(PROGRESS_KEY));
}

function boot(options) {
  const settings = options || {};
  const browser = buildBrowser({
    storage: settings.storage,
    maxTouchPoints: settings.maxTouchPoints || 0
  });
  if (settings.viewport) {
    browser.window.innerWidth = settings.viewport.width;
    browser.window.innerHeight = settings.viewport.height;
  }
  loadRuntimeScripts(browser);
  browser.document.readyState = "interactive";
  browser.emit(browser.document, "DOMContentLoaded");
  return { browser, game: browser.window.ND.game, CONFIG: browser.window.ND.CONFIG };
}

function stageCards(browser) {
  return browser.createdElements
    .filter((element) => element.className === "stage-card")
    .sort((a, b) => Number(a.dataset.stage) - Number(b.dataset.stage));
}

function finishCurrentStage(game, fixedStep) {
  const data = game.state.encounterData;
  game.state.asteroids.length = 0;
  game.state.aliens.length = 0;
  data.pendingSpawns.length = 0;
  data.requeue.length = 0;
  data.waveIndex = data.waveCount - 1;
  data.waveNumber = data.waveCount;
  data.waveSpawned = true;
  data.waveRequiredTotal = 0;
  data.waveRequiredCleared = 0;
  game.step(fixedStep);
}

function register(test) {
  test("stage progress defaults safely and builds the ordered locked checkpoint grid", () => {
    const { browser, game, CONFIG } = boot();
    const cards = stageCards(browser);

    assert.equal(game.progress.maxUnlockedStage, 1);
    assert.equal(game.progress.lastPlayedStage, 1);
    assert.equal(game.progress.schema, 3);
    assert.equal(browser.storage.has(PROGRESS_KEY), false);
    assert.equal(browser.elements.get("continue-button").disabled, true);
    assert.equal(cards.length, CONFIG.sector.encounters.length);
    cards.forEach((card, index) => {
      assert.equal(Number(card.dataset.stage), index + 1);
      assert.equal(card.disabled, index > 0);
    });
    assert.equal(cards[0].getAttribute("aria-current"), "step");
    assert.equal(browser.elements.get("menu-overlay").hasAttribute("inert"), false);
    assert.equal(browser.elements.get("pause-overlay").hasAttribute("inert"), true);
    assert.equal(browser.elements.get("gameover-overlay").hasAttribute("inert"), true);
    assert.equal(browser.elements.get("game").getAttribute("tabindex"), "-1");
    assert.equal(browser.document.activeElement, browser.elements.get("start-button"));
    assert.equal(typeof browser.window.ND.StagePreview.render, "function");
    assert.equal(browser.window.ND.StagePreview.render(browser.elements.get("game"), 1, 1), true);
  });

  test("corrupt, oversized, or unknown progress falls back without discarding the existing local record", () => {
    for (const raw of [
      "{bad-json",
      JSON.stringify({ schema: 99, maxUnlockedStage: 8, lastPlayedStage: 8 }),
      JSON.stringify({ schema: 1, maxUnlockedStage: 10, lastPlayedStage: 10 }),
      "x".repeat(20000)
    ]) {
      const storage = new Map([
        [SAVE_KEY, JSON.stringify({ highScore: 456, settings: { sound: false, reducedEffects: true } })],
        [PROGRESS_KEY, raw]
      ]);
      const { browser, game } = boot({ storage });
      assert.equal(game.progress.maxUnlockedStage, 1);
      assert.equal(game.progress.lastPlayedStage, 1);
      assert.equal(storage.get(PROGRESS_KEY), raw);
      assert.equal(browser.elements.get("menu-high-score").textContent, "000456");
      assert.equal(game.state.settings.sound, false);
      assert.equal(game.state.settings.reducedEffects, true);
    }

    const deniedStorage = {
      getItem() { throw new Error("storage denied"); },
      setItem() { throw new Error("storage denied"); },
      removeItem() { throw new Error("storage denied"); }
    };
    const denied = boot({ storage: deniedStorage });
    assert.equal(denied.game.progress.maxUnlockedStage, 1);
    assert.doesNotThrow(() => denied.browser.elements.get("start-button").click());
    assert.equal(denied.game.state.mode, "playing");
  });

  test("schema 1 progress migrates in place with base loadouts and keeps the local record", () => {
    const local = { highScore: 654321, settings: { sound: true, reducedEffects: false } };
    const storage = new Map([
      [SAVE_KEY, JSON.stringify(local)],
      [PROGRESS_KEY, JSON.stringify({ schema: 1, maxUnlockedStage: 5, lastPlayedStage: 3 })]
    ]);
    const { browser, game } = boot({ storage });
    assert.equal(game.progress.schema, 3);
    assert.equal(game.progress.maxUnlockedStage, 5);
    assert.equal(game.progress.lastPlayedStage, 3);
    assert.deepEqual(storedProgress(storage), progressRecord(5, 3));
    assert.equal(browser.elements.get("menu-high-score").textContent, "654321");
    assert.deepEqual(JSON.parse(storage.get(SAVE_KEY)), local);
  });

  test("strict schema 3 validation rejects tampering while accepting all twenty bounded checkpoints", () => {
    const invalid = [];
    const extraModule = progressRecord(2, 2);
    extraModule.checkpoints["2"].modules.unknown = 1;
    invalid.push(extraModule);
    const excessiveTier = progressRecord(2, 2);
    excessiveTier.checkpoints["2"].modules.pulse = 6;
    invalid.push(excessiveTier);
    const negativeTimer = progressRecord(2, 2);
    negativeTimer.checkpoints["2"].timers.rapidTimer = -1;
    invalid.push(negativeTimer);
    const excessiveTimer = progressRecord(2, 2);
    excessiveTimer.checkpoints["2"].timers.arcBurstTimer = 97;
    invalid.push(excessiveTimer);
    const missingStage = progressRecord(3, 2);
    delete missingStage.checkpoints["2"];
    invalid.push(missingStage);
    const extraStage = progressRecord(2, 2);
    extraStage.checkpoints["3"] = checkpoint();
    invalid.push(extraStage);

    for (const value of invalid) {
      const storage = new Map([
        [SAVE_KEY, JSON.stringify({ highScore: 45, settings: { sound: false, reducedEffects: true } })],
        [PROGRESS_KEY, JSON.stringify(value)]
      ]);
      const { browser, game } = boot({ storage });
      assert.equal(game.progress.maxUnlockedStage, 1);
      assert.equal(storage.get(PROGRESS_KEY), JSON.stringify(value));
      assert.equal(browser.elements.get("menu-high-score").textContent, "000045");
    }

    const saturatedCheckpoint = checkpoint({
      modules: Object.fromEntries(MODULE_IDS.map((id) => [id, 5])),
      timers: {
        rapidTimer: 111.98333333333333,
        triShotTimer: 111.98333333333333,
        piercingTimer: 103.98333333333333,
        arcBurstTimer: 95.98333333333333,
        novaLanceTimer: 119.98333333333333,
        amplifierTimer: 111.98333333333333,
        aegisTimer: 111.98333333333333
      }
    });
    const complete = progressRecord(20, 20, Object.fromEntries(
      Array.from({ length: 20 }, (_, index) => [index + 1, saturatedCheckpoint])
    ));
    const raw = JSON.stringify(complete);
    assert.ok(raw.length <= 16384, `full checkpoint record is ${raw.length} bytes`);
    const accepted = boot({ storage: new Map([[PROGRESS_KEY, raw]]) });
    assert.equal(accepted.game.progress.maxUnlockedStage, 20);
    assert.equal(accepted.game.progress.lastPlayedStage, 20);
  });

  test("strict legacy schema 2 checkpoints migrate in place without losing the original nine-stage arsenal", () => {
    const compatibleTierThree = legacySchema2Record(9, 9, {
      4: checkpoint({
        modules: Object.fromEntries(LEGACY_MODULE_IDS.map((id) => [id, 3])),
        timers: { rapidTimer: 10, triShotTimer: 10, piercingTimer: 10, arcBurstTimer: 9, novaLanceTimer: 12 }
      })
    });
    const storage = new Map([[PROGRESS_KEY, JSON.stringify(compatibleTierThree)]]);
    const compatible = boot({ storage });
    assert.equal(compatible.game.progress.schema, 3);
    assert.equal(compatible.game.progress.maxUnlockedStage, 9, "schema-2 checkpoint stopped loading");
    assert.equal(compatible.game.progress.lastPlayedStage, 9);
    assert.equal(compatible.game.progress.checkpoint(4).modules.drone, 3);
    for (const id of MODULE_IDS.slice(LEGACY_MODULE_IDS.length)) {
      assert.equal(compatible.game.progress.checkpoint(4).modules[id], 0, `${id} was not initialized during migration`);
    }
    for (const id of TIMER_IDS.slice(LEGACY_TIMER_IDS.length)) {
      assert.equal(compatible.game.progress.checkpoint(4).timers[id], 0, `${id} was not initialized during migration`);
    }
    assert.deepEqual(storedProgress(storage), progressRecord(9, 9, {
      4: checkpoint({
        modules: Object.fromEntries(LEGACY_MODULE_IDS.map((id) => [id, 3])),
        timers: { rapidTimer: 10, triShotTimer: 10, piercingTimer: 10, arcBurstTimer: 9, novaLanceTimer: 12 }
      })
    }));

    const unknownLegacy = legacySchema2Record(2, 2);
    unknownLegacy.checkpoints["2"].modules.unknown = 1;
    const rejected = boot({ storage: new Map([[PROGRESS_KEY, JSON.stringify(unknownLegacy)]]) });
    assert.equal(rejected.game.progress.maxUnlockedStage, 1, "tampered schema-2 record migrated");

    const excessiveLegacyTimer = legacySchema2Record(2, 2);
    excessiveLegacyTimer.checkpoints["2"].timers.rapidTimer = 40.01;
    const timerRejected = boot({ storage: new Map([[PROGRESS_KEY, JSON.stringify(excessiveLegacyTimer)]]) });
    assert.equal(timerRejected.game.progress.maxUnlockedStage, 1, "schema-2 timer above its historical cap migrated");
  });

  test("Continue rejects locked cards and restores only the selected Stage checkpoint loadout", () => {
    const savedCheckpoint = checkpoint({
      modules: { pulse: 3, homingSalvo: 2, prism: 1, teslaCoil: 2, tractorField: 1 },
      timers: { rapidTimer: 7, triShotTimer: 4, piercingTimer: 3, arcBurstTimer: 5, novaLanceTimer: 8, amplifierTimer: 6, aegisTimer: 9 }
    });
    const storage = new Map([[PROGRESS_KEY, JSON.stringify(progressRecord(5, 3, { 4: savedCheckpoint }))]]);
    const { browser, game } = boot({ storage });
    const cards = stageCards(browser);

    assert.equal(browser.elements.get("continue-button").disabled, false);
    browser.elements.get("continue-button").click();
    assert.equal(browser.elements.get("stage-select-modal").open, true);
    const stageFourLabel = cards[3].getAttribute("aria-label");
    assert.match(stageFourLabel, /OVERDRIVE, 7 seconds remaining/);
    assert.match(stageFourLabel, /TRI-SHOT, 4 seconds remaining/);
    assert.match(stageFourLabel, /NOVA LANCE, 8 seconds remaining/);
    assert.match(stageFourLabel, /AMPLIFIER, 6 seconds remaining/);
    assert.match(stageFourLabel, /AEGIS FIELD, 9 seconds remaining/);
    assert.ok(browser.createdElements.some((element) =>
      element.className === "stage-loadout-module is-temporary" && element.textContent === "7 timed · 42s"
    ), "Continue omitted the visual total for stacked timed enhancements");
    cards[8].click();
    assert.equal(game.state.mode, "menu", "locked card bypassed its runtime guard");

    cards[3].click();
    assert.equal(game.state.mode, "playing");
    assert.equal(game.state.sector, 1);
    assert.equal(game.state.encounter, 4);
    assert.equal(game.state.score, 0);
    assert.equal(game.state.ship.hull, 100);
    assert.equal(game.state.ship.shield, 0);
    assert.equal(game.state.ship.pulse, 100);
    assert.equal(game.state.ship.x, 0);
    assert.equal(game.state.ship.y, 0);
    assert.equal(game.state.ship.vx, 0);
    assert.equal(game.state.ship.vy, 0);
    assert.deepEqual(JSON.parse(JSON.stringify(game.state.ship.modules)), savedCheckpoint.modules);
    for (const timer of TIMER_IDS) assert.equal(game.state.ship[timer], savedCheckpoint.timers[timer]);
    assert.deepEqual(Object.keys(game.state.ship.weaponTimers), []);
    assert.equal(game.state.ship.drones.length, 0);
    assert.equal(game.state.playerBullets.length, 0);
    assert.equal(game.state.enemyBullets.length, 0);
    const moduleSlots = browser.createdElements.filter((element) => /(^|\s)module-slot(\s|$)/.test(element.className));
    assert.equal(moduleSlots.length, 5, "HUD reserved slots for unequipped permanent modules");
    assert.ok(moduleSlots.every((slot) => !/empty/i.test(slot.textContent)), "HUD exposed an EMPTY placeholder");
    const activeEffects = browser.createdElements.filter((element) => /(^|\s)active-effect-chip(\s|$)/.test(element.className));
    assert.equal(activeEffects.length, 7, "HUD omitted a live timed enhancement");
    assert.equal(browser.elements.get("active-effects").classList.contains("is-hidden"), false);
    assert.equal(game.progress.maxUnlockedStage, 5);
    assert.equal(game.progress.lastPlayedStage, 4);
    assert.deepEqual(storedProgress(storage), progressRecord(5, 4, { 4: savedCheckpoint }));
    assert.equal(browser.elements.get("stage-select-modal").open, false);
    assert.equal(browser.elements.get("menu-overlay").hasAttribute("inert"), true);
  });

  test("stage checkpoints remain independent and Pause Restart preserves the campaign", () => {
    const stage2 = checkpoint({ modules: { pulse: 2, prism: 1 }, timers: { triShotTimer: 6 } });
    const stage3 = checkpoint({ modules: { pulse: 3, drone: 2 }, timers: { arcBurstTimer: 4 } });
    const storage = new Map([[PROGRESS_KEY, JSON.stringify(progressRecord(3, 3, { 2: stage2, 3: stage3 }))]]);
    const { browser, game } = boot({ storage });
    browser.elements.get("continue-button").click();
    stageCards(browser)[1].click();
    assert.deepEqual(JSON.parse(JSON.stringify(game.state.ship.modules)), stage2.modules);
    assert.equal(game.state.ship.triShotTimer, 6);
    browser.elements.get("pause-button").click();
    browser.elements.get("restart-pause-button").click();
    assert.equal(game.state.mode, "playing");
    assert.equal(game.state.encounter, 2);
    assert.equal(browser.elements.get("new-game-modal").open, false);
    assert.equal(game.progress.maxUnlockedStage, 3);
    assert.deepEqual(storedProgress(storage).checkpoints["3"], stage3);

    browser.elements.get("pause-button").click();
    browser.elements.get("pause-menu-button").click();
    browser.elements.get("continue-button").click();
    stageCards(browser)[2].click();
    assert.deepEqual(JSON.parse(JSON.stringify(game.state.ship.modules)), stage3.modules);
    assert.equal(game.state.ship.arcBurstTimer, 4);
  });

  test("pickups, run end, and Main menu refresh the current stage checkpoint", () => {
    const pickupStorage = new Map();
    const pickupRun = boot({ storage: pickupStorage });
    pickupRun.browser.elements.get("start-button").click();
    pickupRun.game.applyPickup(pickupRun.game.spawnPickup(0, 0, "rapid"));
    pickupRun.game.applyPickup(pickupRun.game.spawnPickup(0, 0, "module"));
    let written = storedProgress(pickupStorage);
    assert.equal(written.checkpoints["1"].timers.rapidTimer, pickupRun.CONFIG.powerups.rapid.duration);
    assert.equal(written.checkpoints["1"].modules.pulse, 1);
    assert.equal(written.checkpoints["1"].modules.homingSalvo, 0,
      "a forced early module cache bypassed the Stage 3 module gate");
    pickupRun.game.state.ship.rapidTimer = 3.25;
    pickupRun.game.state.ship.modules.prism = 2;
    pickupRun.browser.elements.get("pause-button").click();
    pickupRun.browser.elements.get("pause-menu-button").click();
    written = storedProgress(pickupStorage);
    assert.equal(written.checkpoints["1"].timers.rapidTimer, 3.25);
    assert.equal(written.checkpoints["1"].modules.prism, 2);
    pickupRun.browser.elements.get("start-button").click();
    assert.equal(pickupRun.browser.elements.get("new-game-modal").open, true, "saved Stage 1 weapons did not trigger the warning");
    pickupRun.browser.elements.get("new-game-cancel-button").click();

    const deathStorage = new Map();
    const deathRun = boot({ storage: deathStorage });
    deathRun.browser.elements.get("start-button").click();
    deathRun.game.state.ship.modules.seeker = 2;
    deathRun.game.state.ship.novaLanceTimer = 6;
    deathRun.game.state.score = 1e12;
    deathRun.game.state.ship.hull = 1;
    deathRun.game.state.ship.invulnerable = 0;
    deathRun.game.state.asteroids.length = 0;
    deathRun.game.state.aliens.length = 0;
    deathRun.game.spawnAsteroid("rock", {
      x: 0, y: 0, velocityAngle: 0, speed: 0.25, health: 1000,
      required: false, threatCost: 0, noDrops: true, collisionGrace: 0
    });
    deathRun.game.step(deathRun.CONFIG.world.fixedStep);
    assert.equal(deathRun.game.state.mode, "gameover");
    written = storedProgress(deathStorage);
    assert.equal(written.checkpoints["1"].modules.seeker, 2);
    assert.equal(written.checkpoints["1"].timers.novaLanceTimer, deathRun.game.state.ship.novaLanceTimer);
    assert.ok(written.checkpoints["1"].timers.novaLanceTimer > 5.9);
    assert.equal(JSON.parse(deathStorage.get(SAVE_KEY)).highScore, 999999999,
      "extreme run score escaped the validated local-record ceiling");
    deathRun.browser.elements.get("restart-button").click();
    assert.equal(deathRun.browser.elements.get("new-game-modal").open, false);
    assert.equal(deathRun.game.state.ship.modules.seeker, 2);
    assert.equal(deathRun.game.state.ship.novaLanceTimer, written.checkpoints["1"].timers.novaLanceTimer);
    const acceptedClamp = boot({ storage: deathStorage });
    assert.equal(acceptedClamp.browser.elements.get("menu-high-score").textContent, "999999999",
      "clamped high score invalidated on reload");
  });

  test("New Game requires explicit confirmation, cancels safely, and erases only campaign data", () => {
    const html = readProject("index.html");
    assert.match(html, /Starting a new game erases all unlocked stages and saved weapons\./);
    assert.match(html, /Your local record and settings are kept\./);
    const savedLocal = { highScore: 9876, settings: { sound: false, reducedEffects: true } };
    const storage = new Map([
      [SAVE_KEY, JSON.stringify(savedLocal)],
      [PROGRESS_KEY, JSON.stringify(progressRecord(8, 7, {
        1: checkpoint({ modules: { pulse: 3 }, timers: { rapidTimer: 8 } }),
        7: checkpoint({ modules: { pulse: 3, drone: 2 }, timers: { novaLanceTimer: 9 } })
      }))]
    ]);
    const { browser, game } = boot({
      storage,
      maxTouchPoints: 5,
      viewport: { width: 844, height: 390 }
    });
    browser.elements.get("start-button").click();
    assert.equal(game.state.mode, "menu");
    assert.equal(browser.elements.get("new-game-modal").open, true);
    assert.equal(browser.document.activeElement, browser.elements.get("new-game-cancel-button"));
    browser.elements.get("new-game-cancel-button").click();
    assert.equal(browser.elements.get("new-game-modal").open, false);
    assert.equal(browser.document.activeElement, browser.elements.get("start-button"));
    assert.equal(game.progress.maxUnlockedStage, 8);
    assert.deepEqual(JSON.parse(storage.get(SAVE_KEY)), savedLocal);

    browser.elements.get("start-button").click();
    browser.window.innerWidth = 390;
    browser.window.innerHeight = 844;
    browser.window.dispatchEvent({ type: "resize" });
    assert.equal(browser.elements.get("new-game-modal").open, false);
    assert.equal(browser.elements.get("new-game-modal").hasAttribute("inert"), true);
    browser.window.innerWidth = 844;
    browser.window.innerHeight = 390;
    browser.window.dispatchEvent({ type: "resize" });
    assert.equal(browser.document.activeElement, browser.elements.get("start-button"));
    browser.elements.get("start-button").click();
    browser.elements.get("new-game-confirm-button").click();
    assert.equal(game.state.mode, "playing");
    assert.equal(game.state.sector, 1);
    assert.equal(game.state.encounter, 1);
    assert.equal(game.progress.maxUnlockedStage, 1);
    assert.equal(game.progress.lastPlayedStage, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(game.state.ship.modules)), checkpoint().modules);
    for (const timer of TIMER_IDS) assert.equal(game.state.ship[timer], 0);
    assert.deepEqual(storedProgress(storage), progressRecord(1, 1));
    assert.deepEqual(JSON.parse(storage.get(SAVE_KEY)), savedLocal);
  });

  test("a genuine clear snapshots the rewarded loadout for the next stage and restores it after reboot", () => {
    const storage = new Map([[PROGRESS_KEY, JSON.stringify(progressRecord(3, 3))]]);
    const first = boot({ storage });
    first.browser.elements.get("continue-button").click();
    stageCards(first.browser)[2].click();
    first.game.applyPickup(first.game.spawnPickup(0, 0, "rapid"));
    first.game.applyPickup(first.game.spawnPickup(0, 0, "novaLance"));
    finishCurrentStage(first.game, first.CONFIG.world.fixedStep);

    assert.equal(first.game.state.mode, "transition");
    assert.equal(first.game.progress.maxUnlockedStage, 4);
    assert.equal(first.game.progress.lastPlayedStage, 4);
    assert.equal(first.browser.elements.get("continue-button").disabled, false);
    const written = storedProgress(storage);
    assert.equal(written.schema, 3);
    assert.equal(written.checkpoints["4"].modules.homingSalvo, 1, "guaranteed reward was omitted from next checkpoint");
    assert.equal(written.checkpoints["4"].timers.rapidTimer, first.game.state.ship.rapidTimer);
    assert.equal(written.checkpoints["4"].timers.novaLanceTimer, first.game.state.ship.novaLanceTimer);
    assert.ok(written.checkpoints["4"].timers.rapidTimer > 9.9);
    first.game.state.ship.modules.homingSalvo = 3;
    assert.equal(written.checkpoints["4"].modules.homingSalvo, 1, "stored checkpoint aliased live ship modules");
    first.browser.elements.get("pause-button").click();
    first.browser.elements.get("pause-menu-button").click();
    assert.equal(storedProgress(storage).lastPlayedStage, 4, "leaving during transit replaced the newly unlocked checkpoint");
    assert.equal(storedProgress(storage).checkpoints["4"].modules.homingSalvo, 1);

    const reloaded = boot({ storage });
    assert.equal(reloaded.game.progress.maxUnlockedStage, 4);
    assert.equal(reloaded.game.progress.lastPlayedStage, 4);
    assert.equal(reloaded.browser.elements.get("continue-button").disabled, false);
    reloaded.browser.elements.get("continue-button").click();
    stageCards(reloaded.browser)[3].click();
    assert.equal(reloaded.game.state.ship.modules.homingSalvo, 1);
    assert.equal(reloaded.game.state.ship.rapidTimer, written.checkpoints["4"].timers.rapidTimer);
    assert.equal(reloaded.game.state.ship.novaLanceTimer, written.checkpoints["4"].timers.novaLanceTimer);
  });

  test("authored three-stage milestones stack their targeted module into the next checkpoint", () => {
    const milestones = [
      { stage: 3, moduleId: "homingSalvo", before: 0 },
      { stage: 6, moduleId: "drone", before: 2 },
      { stage: 9, moduleId: "shieldReactor", before: 1 },
      { stage: 12, moduleId: "prism", before: 2 },
      { stage: 15, moduleId: "overclock", before: 1 },
      { stage: 18, moduleId: "seeker", before: 2 }
    ];
    for (const item of milestones) {
      const stageLoadout = checkpoint({ modules: { [item.moduleId]: item.before } });
      const storage = new Map([[PROGRESS_KEY, JSON.stringify(progressRecord(item.stage, item.stage, {
        [item.stage]: stageLoadout
      }))]]);
      const first = boot({ storage });
      first.browser.elements.get("continue-button").click();
      stageCards(first.browser)[item.stage - 1].click();
      const beforeModules = JSON.parse(JSON.stringify(first.game.state.ship.modules));
      finishCurrentStage(first.game, first.CONFIG.world.fixedStep);

      assert.equal(first.game.state.mode, "transition", `Stage ${item.stage} did not clear`);
      assert.equal(first.game.state.ship.modules[item.moduleId], item.before + 1,
        `Stage ${item.stage} missed ${item.moduleId}`);
      for (const id of MODULE_IDS) {
        if (id !== item.moduleId) assert.equal(first.game.state.ship.modules[id], beforeModules[id],
          `Stage ${item.stage} changed non-target ${id}`);
      }
      const written = storedProgress(storage);
      assert.equal(written.maxUnlockedStage, item.stage + 1);
      assert.equal(written.checkpoints[String(item.stage + 1)].modules[item.moduleId], item.before + 1);

      const reloaded = boot({ storage });
      reloaded.browser.elements.get("continue-button").click();
      stageCards(reloaded.browser)[item.stage].click();
      assert.equal(reloaded.game.state.ship.modules[item.moduleId], item.before + 1,
        `Stage ${item.stage + 1} did not restore the rewarded checkpoint`);
    }
  });

  test("a capped targeted milestone falls back to one eligible permanent module", () => {
    const stage9 = checkpoint({ modules: { shieldReactor: 5 } });
    const storage = new Map([[PROGRESS_KEY, JSON.stringify(progressRecord(9, 9, { 9: stage9 }))]]);
    const { browser, game, CONFIG } = boot({ storage });
    browser.elements.get("continue-button").click();
    stageCards(browser)[8].click();
    const before = JSON.parse(JSON.stringify(game.state.ship.modules));
    finishCurrentStage(game, CONFIG.world.fixedStep);
    const changed = MODULE_IDS.filter((id) => game.state.ship.modules[id] !== before[id]);
    assert.deepEqual(changed, ["homingSalvo"]);
    assert.equal(game.state.ship.modules.shieldReactor, 5);
    assert.equal(game.state.ship.modules.homingSalvo, 1);
    assert.equal(storedProgress(storage).checkpoints["10"].modules.homingSalvo, 1);
  });

  test("stacked temporary caps and an Enigma choice persist without saving live draft state", () => {
    const storage = new Map([[PROGRESS_KEY, JSON.stringify(progressRecord(16, 16))]]);
    const first = boot({ storage });
    first.browser.elements.get("continue-button").click();
    stageCards(first.browser)[15].click();
    for (let index = 0; index < first.CONFIG.powerups.temporaryStackLimit + 2; index += 1) {
      first.game.applyPickup(first.game.spawnPickup(0, 0, "rapid"));
    }
    assert.equal(first.game.state.ship.rapidTimer,
      first.CONFIG.powerups.rapid.duration * first.CONFIG.powerups.temporaryStackLimit);
    first.game.setSeed(5511);
    first.game.applyPickup(first.game.spawnPickup(0, 0, "enigma"));
    const limit = Math.ceil(first.CONFIG.powerups.enigma.slowdownSeconds / first.CONFIG.world.fixedStep) + 2;
    for (let frame = 0; frame < limit && first.game.snapshot().enigma.phase !== "choosing"; frame += 1) {
      first.game.step(first.CONFIG.world.fixedStep);
    }
    const draft = first.game.snapshot().enigma;
    assert.equal(draft.phase, "choosing");
    const permanentIndex = draft.choices.findIndex((choice) => choice.kind === "module");
    const selectedModule = draft.choices[permanentIndex].moduleId;
    const stackedRemaining = first.game.state.ship.rapidTimer;
    assert.ok(stackedRemaining > first.CONFIG.powerups.rapid.duration * (first.CONFIG.powerups.temporaryStackLimit - 1));
    assert.ok(stackedRemaining <= first.CONFIG.powerups.rapid.duration * first.CONFIG.powerups.temporaryStackLimit);
    assert.equal(first.game.chooseEnhancement(permanentIndex), true);
    const written = storedProgress(storage);
    assert.equal(written.checkpoints["16"].timers.rapidTimer, stackedRemaining);
    assert.equal(written.checkpoints["16"].modules[selectedModule], first.game.state.ship.modules[selectedModule]);
    assert.equal("upgradeDraft" in written, false);
    assert.equal("enigma" in written, false);

    const reloaded = boot({ storage });
    reloaded.browser.elements.get("continue-button").click();
    stageCards(reloaded.browser)[15].click();
    assert.equal(reloaded.game.state.ship.rapidTimer, stackedRemaining);
    assert.equal(reloaded.game.state.ship.modules[selectedModule], first.game.state.ship.modules[selectedModule]);
    assert.equal(reloaded.game.snapshot().enigma.phase, "idle");
  });

  test("debug stage jumps never unlock campaign checkpoints and progress clamps at Stage 20", () => {
    const automatedStorage = new Map();
    const automated = boot({ storage: automatedStorage });
    automated.game.start();
    finishCurrentStage(automated.game, automated.CONFIG.world.fixedStep);
    assert.equal(automated.game.progress.maxUnlockedStage, 1, "debug automation unlocked campaign progress");
    assert.equal(automatedStorage.has(PROGRESS_KEY), false, "debug automation wrote campaign storage");
    automated.browser.elements.get("pause-button").click();
    automated.browser.elements.get("restart-pause-button").click();
    automated.game.applyPickup(automated.game.spawnPickup(0, 0, "rapid"));
    automated.browser.elements.get("pause-button").click();
    automated.browser.elements.get("pause-menu-button").click();
    assert.equal(automatedStorage.has(PROGRESS_KEY), false, "debug restart became campaign-eligible");

    const storage = new Map([[PROGRESS_KEY, JSON.stringify({ schema: 1, maxUnlockedStage: 2, lastPlayedStage: 2 })]]);
    const debug = boot({ storage });
    debug.game.start();
    debug.game.setStage(19, 1);
    finishCurrentStage(debug.game, debug.CONFIG.world.fixedStep);
    assert.equal(debug.game.progress.maxUnlockedStage, 2);
    assert.deepEqual(storedProgress(storage), progressRecord(2, 2));

    const sectorTwoStorage = new Map([[PROGRESS_KEY, JSON.stringify(progressRecord(2, 2))]]);
    const sectorTwo = boot({ storage: sectorTwoStorage });
    sectorTwo.browser.elements.get("continue-button").click();
    stageCards(sectorTwo.browser)[1].click();
    const beforeSectorTwo = sectorTwoStorage.get(PROGRESS_KEY);
    sectorTwo.game.state.sector = 2;
    sectorTwo.game.applyPickup(sectorTwo.game.spawnPickup(0, 0, "rapid"));
    sectorTwo.browser.elements.get("pause-button").click();
    sectorTwo.browser.elements.get("pause-menu-button").click();
    assert.equal(sectorTwoStorage.get(PROGRESS_KEY), beforeSectorTwo, "Sector 2 rewrote Sector 1 checkpoints");

    const completeStorage = new Map([[PROGRESS_KEY, JSON.stringify(progressRecord(20, 19))]]);
    const complete = boot({ storage: completeStorage });
    complete.browser.elements.get("continue-button").click();
    stageCards(complete.browser)[18].click();
    finishCurrentStage(complete.game, complete.CONFIG.world.fixedStep);
    assert.equal(complete.game.progress.maxUnlockedStage, 20);
    assert.equal(complete.game.progress.lastPlayedStage, 20);
  });

  test("portrait ownership closes Continue and landscape restores only the active menu overlay", () => {
    const storage = new Map([[PROGRESS_KEY, JSON.stringify(progressRecord(3, 2))]]);
    const { browser, game } = boot({
      storage,
      maxTouchPoints: 5,
      viewport: { width: 390, height: 844 }
    });
    browser.elements.get("continue-button").click();
    assert.equal(browser.elements.get("stage-select-modal").open, false);
    assert.equal(browser.elements.get("menu-overlay").hasAttribute("inert"), true);

    browser.window.innerWidth = 844;
    browser.window.innerHeight = 390;
    browser.window.dispatchEvent({ type: "resize" });
    assert.equal(game.mobile.orientationBlocked, false);
    assert.equal(browser.elements.get("menu-overlay").hasAttribute("inert"), false);
    assert.equal(browser.elements.get("pause-overlay").hasAttribute("inert"), true);
    assert.equal(browser.elements.get("gameover-overlay").hasAttribute("inert"), true);
    browser.elements.get("continue-button").click();
    assert.equal(browser.elements.get("stage-select-modal").open, true);
  });

  test("menu, pause, and game-over modes own focus while only active play exposes the canvas", () => {
    const { browser, game, CONFIG } = boot();
    const canvas = browser.elements.get("game");
    const start = browser.elements.get("start-button");
    const resume = browser.elements.get("resume-button");
    const restart = browser.elements.get("restart-button");

    assert.equal(browser.document.activeElement, start);
    assert.equal(canvas.getAttribute("tabindex"), "-1");
    browser.elements.get("settings-button").focus();
    game.mobile.updateOrientationState();
    assert.equal(browser.document.activeElement, browser.elements.get("settings-button"), "repeated presentation sync stole focus");

    start.click();
    assert.equal(game.state.mode, "playing");
    assert.equal(canvas.getAttribute("tabindex"), "0");
    assert.equal(browser.document.activeElement, canvas);

    browser.elements.get("pause-button").click();
    assert.equal(game.state.mode, "paused");
    assert.equal(canvas.getAttribute("tabindex"), "-1");
    assert.equal(browser.document.activeElement, resume);
    resume.click();
    assert.equal(game.state.mode, "playing");
    assert.equal(canvas.getAttribute("tabindex"), "0");
    assert.equal(browser.document.activeElement, canvas);

    game.state.asteroids.length = 0;
    game.state.aliens.length = 0;
    game.state.ship.hull = 1;
    game.state.ship.invulnerable = 0;
    game.spawnAsteroid("rock", {
      x: game.state.ship.x,
      y: game.state.ship.y,
      velocityAngle: 0,
      speed: 0.25,
      health: 1000,
      required: false,
      threatCost: 0,
      noDrops: true,
      collisionGrace: 0
    });
    game.step(CONFIG.world.fixedStep);
    assert.equal(game.state.mode, "gameover");
    assert.equal(canvas.getAttribute("tabindex"), "-1");
    assert.equal(game.state.presentation.gameoverPending, true);
    assert.equal(browser.elements.get("gameover-overlay").hasAttribute("inert"), true,
      "game-over overlay became interactive before the death presentation finished");
    assert.equal(browser.elements.get("gameover-overlay").getAttribute("aria-hidden"), "true");
    assert.equal(browser.elements.get("hud").classList.contains("is-hidden"), false,
      "HUD disappeared before the death presentation finished");
    assert.equal(browser.document.activeElement, canvas, "hidden Restart action took focus during the death presentation");
    assert.ok(game.state.shake > 0 && game.state.flash > 0);
    const frozenTime = game.state.time;
    const frozenPosition = { x: game.state.ship.x, y: game.state.ship.y };
    const deathEffect = game.state.effects[game.state.effects.length - 1];
    const deathEffectLife = deathEffect.life;
    browser.pumpFrames(20, 1000 / 60);
    assert.equal(game.state.mode, "gameover");
    assert.equal(game.state.presentation.gameoverPending, true);
    assert.equal(game.state.time, frozenTime, "game-over presentation advanced simulation time");
    assert.deepEqual({ x: game.state.ship.x, y: game.state.ship.y }, frozenPosition);
    assert.ok(deathEffect.life < deathEffectLife, "bounded death particles did not animate while combat stayed frozen");
    browser.pumpFrames(Math.ceil((CONFIG.presentation.gameoverEffectDuration + 0.2) * 60), 1000 / 60);
    assert.equal(game.state.presentation.gameoverPending, false);
    assert.equal(browser.elements.get("gameover-overlay").hasAttribute("inert"), false);
    assert.equal(browser.elements.get("gameover-overlay").getAttribute("aria-hidden"), "false");
    assert.equal(browser.elements.get("hud").classList.contains("is-hidden"), true);
    assert.equal(browser.document.activeElement, restart);
    assert.equal(game.state.shake, 0);
    assert.equal(game.state.flash, 0);

    restart.click();
    game.state.asteroids.length = 0;
    game.state.aliens.length = 0;
    game.state.ship.hull = 1;
    game.state.ship.invulnerable = 0;
    game.spawnAsteroid("rock", {
      x: game.state.ship.x,
      y: game.state.ship.y,
      velocityAngle: 0,
      speed: 0.25,
      health: 1000,
      required: false,
      threatCost: 0,
      noDrops: true,
      collisionGrace: 0
    });
    game.step(CONFIG.world.fixedStep);
    assert.equal(game.state.presentation.gameoverPending, true);
    assert.ok(game.state.shake > 0 && game.state.flash > 0);

    browser.elements.get("menu-button").click();
    assert.equal(game.state.mode, "menu");
    assert.equal(game.state.presentation.gameoverPending, false);
    assert.equal(game.state.presentation.gameoverRemaining, 0);
    assert.equal(game.state.shake, 0);
    assert.equal(game.state.flash, 0);
    assert.equal(browser.document.activeElement, start);
  });
}

module.exports = register;
