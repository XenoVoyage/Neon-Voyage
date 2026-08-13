"use strict";

const { assert, vm, readProject } = require("./_harness");
const browserSmoke = require("./browser-smoke.test");

const SCRIPTS = ["js/config.js", "js/core.js", "js/audio.js", "js/render.js", "js/game.js"];
const PROGRESS_KEY = "neon-voyage-progress-v1";
const SAVE_KEY = "neon-voyage-v1";

function boot(options) {
  const settings = options || {};
  const browser = browserSmoke.buildBrowser({
    storage: settings.storage,
    maxTouchPoints: settings.maxTouchPoints || 0
  });
  if (settings.viewport) {
    browser.window.innerWidth = settings.viewport.width;
    browser.window.innerHeight = settings.viewport.height;
  }
  for (const script of SCRIPTS) vm.runInContext(readProject(script), browser.context, { filename: script, timeout: 3000 });
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

  test("corrupt or unknown progress falls back without discarding the existing local record", () => {
    for (const raw of ["{bad-json", JSON.stringify({ schema: 2, maxUnlockedStage: 8, lastPlayedStage: 8 }), "x".repeat(300)]) {
      const storage = new Map([
        [SAVE_KEY, JSON.stringify({ highScore: 456, settings: { sound: false, reducedEffects: true } })],
        [PROGRESS_KEY, raw]
      ]);
      const { browser, game } = boot({ storage });
      assert.equal(game.progress.maxUnlockedStage, 1);
      assert.equal(game.progress.lastPlayedStage, 1);
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

  test("Continue rejects locked cards and starts any unlocked authored stage as a fresh Sector 1 run", () => {
    const storage = new Map([[PROGRESS_KEY, JSON.stringify({ schema: 1, maxUnlockedStage: 5, lastPlayedStage: 3 })]]);
    const { browser, game } = boot({ storage });
    const cards = stageCards(browser);

    assert.equal(browser.elements.get("continue-button").disabled, false);
    browser.elements.get("continue-button").click();
    assert.equal(browser.elements.get("stage-select-modal").open, true);
    cards[8].click();
    assert.equal(game.state.mode, "menu", "locked card bypassed its runtime guard");

    cards[3].click();
    assert.equal(game.state.mode, "playing");
    assert.equal(game.state.sector, 1);
    assert.equal(game.state.encounter, 4);
    assert.equal(game.state.score, 0);
    assert.equal(game.state.ship.hull, 100);
    assert.deepEqual(Object.keys(game.state.ship.modules), ["pulse"]);
    assert.equal(game.progress.maxUnlockedStage, 5);
    assert.equal(game.progress.lastPlayedStage, 4);
    assert.deepEqual(JSON.parse(storage.get(PROGRESS_KEY)), { schema: 1, maxUnlockedStage: 5, lastPlayedStage: 4 });
    assert.equal(browser.elements.get("stage-select-modal").open, false);
    assert.equal(browser.elements.get("menu-overlay").hasAttribute("inert"), true);
  });

  test("New Game always starts Stage 1 while retaining earned unlocks", () => {
    const storage = new Map([[PROGRESS_KEY, JSON.stringify({ schema: 1, maxUnlockedStage: 8, lastPlayedStage: 7 })]]);
    const { browser, game } = boot({ storage });
    browser.elements.get("start-button").click();
    assert.equal(game.state.sector, 1);
    assert.equal(game.state.encounter, 1);
    assert.equal(game.progress.maxUnlockedStage, 8);
    assert.equal(game.progress.lastPlayedStage, 1);
    assert.deepEqual(JSON.parse(storage.get(PROGRESS_KEY)), { schema: 1, maxUnlockedStage: 8, lastPlayedStage: 1 });
  });

  test("a genuine clear unlocks the next checkpoint before transit and persists across boot", () => {
    const storage = new Map();
    const first = boot({ storage });
    first.browser.elements.get("start-button").click();
    finishCurrentStage(first.game, first.CONFIG.world.fixedStep);

    assert.equal(first.game.state.mode, "transition");
    assert.equal(first.game.progress.maxUnlockedStage, 2);
    assert.equal(first.game.progress.lastPlayedStage, 2);
    assert.equal(first.browser.elements.get("continue-button").disabled, false);
    assert.deepEqual(JSON.parse(storage.get(PROGRESS_KEY)), { schema: 1, maxUnlockedStage: 2, lastPlayedStage: 2 });

    const reloaded = boot({ storage });
    assert.equal(reloaded.game.progress.maxUnlockedStage, 2);
    assert.equal(reloaded.game.progress.lastPlayedStage, 2);
    assert.equal(reloaded.browser.elements.get("continue-button").disabled, false);
  });

  test("debug stage jumps never unlock campaign checkpoints and progress clamps at Stage 9", () => {
    const automatedStorage = new Map();
    const automated = boot({ storage: automatedStorage });
    automated.game.start();
    finishCurrentStage(automated.game, automated.CONFIG.world.fixedStep);
    assert.equal(automated.game.progress.maxUnlockedStage, 1, "debug automation unlocked campaign progress");

    const storage = new Map([[PROGRESS_KEY, JSON.stringify({ schema: 1, maxUnlockedStage: 2, lastPlayedStage: 2 })]]);
    const debug = boot({ storage });
    debug.game.start();
    debug.game.setStage(8, 1);
    finishCurrentStage(debug.game, debug.CONFIG.world.fixedStep);
    assert.equal(debug.game.progress.maxUnlockedStage, 2);
    assert.deepEqual(JSON.parse(storage.get(PROGRESS_KEY)), { schema: 1, maxUnlockedStage: 2, lastPlayedStage: 1 });

    const completeStorage = new Map([[PROGRESS_KEY, JSON.stringify({ schema: 1, maxUnlockedStage: 9, lastPlayedStage: 8 })]]);
    const complete = boot({ storage: completeStorage });
    complete.browser.elements.get("continue-button").click();
    stageCards(complete.browser)[7].click();
    finishCurrentStage(complete.game, complete.CONFIG.world.fixedStep);
    assert.equal(complete.game.progress.maxUnlockedStage, 9);
    assert.equal(complete.game.progress.lastPlayedStage, 9);
  });

  test("portrait ownership closes Continue and landscape restores only the active menu overlay", () => {
    const storage = new Map([[PROGRESS_KEY, JSON.stringify({ schema: 1, maxUnlockedStage: 3, lastPlayedStage: 2 })]]);
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
    assert.equal(browser.document.activeElement, restart);

    browser.elements.get("menu-button").click();
    assert.equal(game.state.mode, "menu");
    assert.equal(browser.document.activeElement, start);
  });
}

module.exports = register;
