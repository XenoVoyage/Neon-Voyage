"use strict";

const { assert, vm, readProject } = require("./_harness");
const browserSmoke = require("./browser-smoke.test");

const SCRIPTS = ["js/config.js", "js/core.js", "js/audio.js", "js/render.js", "js/game.js"];

function bootMobile(options) {
  const settings = Object.assign({ width: 844, height: 390, maxTouchPoints: 5 }, options || {});
  const browser = browserSmoke.buildBrowser(settings);
  browser.window.innerWidth = settings.width;
  browser.window.innerHeight = settings.height;
  for (const script of SCRIPTS) vm.runInContext(readProject(script), browser.context, { filename: script, timeout: 3000 });
  browser.document.readyState = "interactive";
  browser.emit(browser.document, "DOMContentLoaded");
  const game = browser.window.ND.game;
  assert.ok(game && game.mobile, "mobile debug contract is unavailable");
  return { browser, game, CONFIG: browser.window.ND.CONFIG };
}

function pointer(browser, elementId, type, pointerId, clientX, clientY) {
  browser.emit(browser.elements.get(elementId), type, {
    pointerId,
    pointerType: "touch",
    isPrimary: pointerId === 11,
    clientX,
    clientY,
    button: 0,
    buttons: type === "pointerup" || type === "pointercancel" || type === "lostpointercapture" ? 0 : 1
  });
}

function key(browser, type, value, code) {
  browser.window.dispatchEvent({
    type,
    key: value,
    code: code || `Key${String(value).toUpperCase()}`,
    repeat: false,
    preventDefault() {}
  });
}

function gamepad(buttonIndexes, axes) {
  const pressed = new Set(buttonIndexes || []);
  return {
    axes: axes || [0, 0, 0, 0],
    buttons: Array.from({ length: 12 }, (_, index) => ({ pressed: pressed.has(index) }))
  };
}

function rotate(browser, game, width, height) {
  browser.window.innerWidth = width;
  browser.window.innerHeight = height;
  browser.window.dispatchEvent({ type: "resize" });
  game.mobile.updateOrientationState();
}

module.exports = function register(test) {
  test("touch capability is device-driven and hybrid fine-pointer iPads retain controls", () => {
    const { browser, game } = bootMobile({
      maxTouchPoints: 5,
      mediaMatches: { "(pointer: coarse)": false, "(any-pointer: coarse)": false }
    });
    assert.equal(game.mobile.touchCapable, true);
    assert.equal(browser.document.body.classList.contains("is-touch-capable"), true);
    game.start();
    assert.equal(browser.elements.get("touch-controls").classList.contains("is-active"), true);
    assert.equal(game.state.mode, "playing");

    const coarse = bootMobile({
      maxTouchPoints: 0,
      mediaMatches: { "(pointer: coarse)": false, "(any-pointer: coarse)": true }
    });
    assert.equal(coarse.game.mobile.touchCapable, true, "coarse secondary pointer was not detected");
    assert.equal(coarse.browser.document.body.classList.contains("is-touch-capable"), true);
  });

  test("actual touch input promotes an initially fine-pointer device to touch capable", () => {
    const { browser, game } = bootMobile({ maxTouchPoints: 0 });
    assert.equal(game.mobile.touchCapable, false);
    game.start();
    pointer(browser, "move-zone", "pointerdown", 11, 760, 360);
    assert.equal(game.mobile.touchCapable, true);
    assert.equal(browser.document.body.classList.contains("is-touch-capable"), true);
    pointer(browser, "move-zone", "pointerup", 11, 760, 360);
  });

  test("two touch sticks track independent pointer IDs and aim stick fires", () => {
    const { browser, game } = bootMobile();
    game.start();
    pointer(browser, "move-zone", "pointerdown", 11, 760, 360);
    const moveX = game.input.touchMoveX;
    assert.ok(moveX > 0.2, "movement stick did not produce rightward input");

    pointer(browser, "aim-zone", "pointerdown", 22, 640, 250);
    assert.ok(game.input.touchAimY < -0.2, "aim stick did not produce upward aim");
    assert.equal(game.input.touchFire, true, "aim deflection did not start firing");
    assert.equal(game.input.touchMoveX, moveX, "aim finger stole movement pointer state");

    pointer(browser, "move-zone", "pointermove", 22, 520, 360);
    assert.equal(game.input.touchMoveX, moveX, "wrong pointer ID moved the movement stick");
    pointer(browser, "move-zone", "pointerup", 11, 760, 360);
    assert.equal(game.input.touchMoveX, 0);
    assert.ok(game.input.touchAimY < -0.2, "releasing movement also released aim");
    assert.equal(game.input.touchFire, true);
    pointer(browser, "aim-zone", "pointerup", 22, 640, 250);
    assert.equal(game.input.touchAimX, 0);
    assert.equal(game.input.touchAimY, 0);
    assert.equal(game.input.touchFire, false);
  });

  test("sticks use each visible ring center and edge while capture stays on its larger zone", () => {
    const { browser, game } = bootMobile();
    const moveZone = browser.elements.get("move-zone");
    const aimZone = browser.elements.get("aim-zone");
    moveZone.setBoundingClientRect({ left: 14, top: 250, width: 132, height: 132 });
    aimZone.setBoundingClientRect({ left: 698, top: 250, width: 132, height: 132 });
    moveZone._stickRing.setBoundingClientRect({ left: 28, top: 250, width: 104, height: 104 });
    aimZone._stickRing.setBoundingClientRect({ left: 712, top: 250, width: 104, height: 104 });
    game.start();

    // The visible ring centers intentionally differ from their larger zone
    // centers. A center touch must still be neutral.
    pointer(browser, "move-zone", "pointerdown", 11, 80, 302);
    pointer(browser, "aim-zone", "pointerdown", 22, 764, 302);
    assert.equal(game.input.touchMoveX, 0);
    assert.equal(game.input.touchMoveY, 0);
    assert.equal(game.input.touchAimX, 0);
    assert.equal(game.input.touchAimY, 0);
    assert.equal(game.input.touchFire, false);
    assert.equal(moveZone.hasPointerCapture(11), true, "movement capture moved off its touch zone");
    assert.equal(aimZone.hasPointerCapture(22), true, "aim capture moved off its touch zone");

    // Move to each ring's right edge: deflection clamps to the full range,
    // and aim deflection starts firing without disturbing movement ownership.
    pointer(browser, "move-zone", "pointermove", 11, 132, 302);
    pointer(browser, "aim-zone", "pointermove", 22, 816, 302);
    assert.ok(game.input.touchMoveX > 0.99 && game.input.touchMoveX <= 1);
    assert.equal(game.input.touchMoveY, 0);
    assert.ok(game.input.touchAimX > 0.99 && game.input.touchAimX <= 1);
    assert.equal(game.input.touchAimY, 0);
    assert.equal(game.input.touchFire, true);
    assert.equal(moveZone.hasPointerCapture(11), true);
    assert.equal(aimZone.hasPointerCapture(22), true);

    pointer(browser, "move-zone", "pointerup", 11, 132, 302);
    pointer(browser, "aim-zone", "pointerup", 22, 816, 302);
  });

  test("pointer cancel and lost capture always neutralize their own touch stick", () => {
    const { browser, game } = bootMobile();
    game.start();
    pointer(browser, "move-zone", "pointerdown", 11, 760, 360);
    pointer(browser, "aim-zone", "pointerdown", 22, 640, 250);
    pointer(browser, "move-zone", "pointercancel", 11, 760, 360);
    assert.equal(game.input.touchMoveX, 0);
    assert.equal(game.input.touchMoveY, 0);
    assert.equal(game.input.touchFire, true, "movement cancellation cleared the other stick");
    pointer(browser, "aim-zone", "lostpointercapture", 22, 640, 250);
    assert.equal(game.input.touchAimX, 0);
    assert.equal(game.input.touchAimY, 0);
    assert.equal(game.input.touchFire, false);
    pointer(browser, "aim-zone", "pointermove", 22, 760, 360);
    assert.equal(game.input.touchFire, false, "stale lost-capture pointer regained control");
  });

  test("visibility pause resets captured touch ownership before resume", () => {
    const { browser, game } = bootMobile();
    game.start();
    pointer(browser, "move-zone", "pointerdown", 11, 760, 360);
    pointer(browser, "aim-zone", "pointerdown", 22, 640, 250);
    browser.document.hidden = true;
    browser.document.visibilityState = "hidden";
    browser.emit(browser.document, "visibilitychange");
    assert.equal(game.state.mode, "paused");
    assert.equal(game.input.touchMoveX, 0);
    assert.equal(game.input.touchFire, false);

    browser.document.hidden = false;
    browser.document.visibilityState = "visible";
    browser.elements.get("resume-button").click();
    pointer(browser, "move-zone", "pointerdown", 33, 760, 360);
    assert.ok(game.input.touchMoveX > 0.2, "old captured pointer blocked a new movement gesture");
    pointer(browser, "move-zone", "pointerup", 33, 760, 360);
  });

  test("touch Dash and Pulse buttons activate gameplay without opening pause", () => {
    const { browser, game, CONFIG } = bootMobile();
    game.start();
    const ship = game.state.ship;
    browser.elements.get("touch-dash").click();
    browser.elements.get("touch-pulse").click();
    game.step(CONFIG.world.fixedStep);
    assert.equal(game.state.mode, "playing");
    assert.ok(ship.dashCooldown > 0, "Dash button was not consumed by gameplay");
    assert.ok(ship.pulse < 99.5, "Pulse button did not activate Void Pulse");
  });

  test("touch-device blur does not pause, while visibility loss still pauses", () => {
    const { browser, game } = bootMobile();
    game.start();
    pointer(browser, "move-zone", "pointerdown", 11, 760, 360);
    assert.notEqual(game.input.touchMoveX, 0, "movement gesture did not begin");
    browser.window.dispatchEvent({ type: "blur" });
    assert.equal(game.state.mode, "playing", "mobile browser chrome blur incorrectly opened pause");
    pointer(browser, "move-zone", "pointercancel", 11, 760, 360);
    browser.document.hidden = true;
    browser.document.visibilityState = "hidden";
    browser.emit(browser.document, "visibilitychange");
    assert.equal(game.state.mode, "paused", "hidden touch tab did not pause safely");
    assert.equal(game.state.pausedByVisibility, true);
  });

  test("desktop blur retains automatic pause behavior", () => {
    const { browser, game } = bootMobile({ maxTouchPoints: 0 });
    game.start();
    browser.window.dispatchEvent({ type: "blur" });
    assert.equal(game.state.mode, "paused");
    assert.equal(game.state.pausedByVisibility, true);
  });

  test("portrait gate freezes simulation and clears input until landscape resumes", () => {
    const { browser, game, CONFIG } = bootMobile({ width: 390, height: 844 });
    game.start();
    const overlay = browser.elements.get("orientation-overlay");
    assert.equal(game.mobile.orientationBlocked, true);
    assert.equal(overlay.classList.contains("is-visible"), true);
    assert.equal(overlay.getAttribute("aria-hidden"), "false");
    const shell = overlay.parentElement;
    if (shell && shell.children) {
      for (const child of Array.from(shell.children)) {
        if (child !== overlay) assert.equal(child.hasAttribute("inert"), true, "covered shell content was not inert");
      }
    }
    assert.equal(overlay.hasAttribute("inert"), false, "rotate gate made itself inert");
    for (const id of ["game", "menu-overlay", "controls-modal", "settings-modal", "touch-controls"]) {
      assert.equal(browser.elements.get(id).hasAttribute("inert"), true, `${id} was interactive behind the rotate gate`);
      assert.equal(browser.elements.get(id).inert, true, `${id} inert property did not reflect the gate`);
    }
    game.input.touchMoveX = 1;
    game.input.touchAimY = -1;
    game.input.touchFire = true;
    const before = game.state.runTime;
    game.step(CONFIG.world.fixedStep);
    assert.equal(game.state.runTime, before, "portrait mode advanced simulation");
    assert.equal(game.input.touchMoveX, 0, "portrait mode retained movement input");
    assert.equal(game.input.touchFire, false, "portrait mode retained fire input");
    assert.equal(game.state.mode, "playing", "orientation gate was incorrectly implemented as pause/menu state");

    browser.window.innerWidth = 844;
    browser.window.innerHeight = 390;
    browser.window.dispatchEvent({ type: "resize" });
    game.mobile.updateOrientationState();
    assert.equal(game.mobile.orientationBlocked, false);
    assert.equal(overlay.classList.contains("is-visible"), false);
    assert.equal(overlay.getAttribute("aria-hidden"), "true");
    if (shell && shell.children) {
      for (const child of Array.from(shell.children)) {
        if (child !== overlay) assert.equal(child.hasAttribute("inert"), false, "landscape left shell content inert");
      }
    }
    for (const id of ["game", "menu-overlay", "controls-modal", "settings-modal", "touch-controls"]) {
      assert.equal(browser.elements.get(id).hasAttribute("inert"), false, `${id} remained inert in landscape`);
      assert.equal(browser.elements.get(id).inert, false, `${id} inert property remained set in landscape`);
    }
    game.step(CONFIG.world.fixedStep);
    assert.ok(game.state.runTime > before, "landscape did not resume simulation");
    assert.equal(game.state.mode, "playing");
  });

  test("portrait gate owns the initial menu and rejects every covered action", () => {
    const { browser, game } = bootMobile({ width: 390, height: 844 });
    const overlay = browser.elements.get("orientation-overlay");
    const initialSound = game.state.settings.sound;
    const initialEffects = game.state.settings.reducedEffects;
    const coveredActions = [
      "start-button", "restart-button", "restart-pause-button", "resume-button",
      "pause-button", "pause-menu-button", "menu-button", "controls-button",
      "pause-controls-button", "settings-button", "pause-settings-button",
      "sound-button", "settings-sound-button", "motion-button", "settings-effects-button",
      "fullscreen-button", "settings-fullscreen-button", "touch-dash", "touch-pulse"
    ];

    assert.equal(game.mobile.orientationBlocked, true);
    assert.equal(overlay.classList.contains("is-visible"), true);
    assert.equal(overlay.getAttribute("aria-hidden"), "false");
    for (const id of coveredActions) {
      browser.elements.get(id).click();
      assert.equal(game.state.mode, "menu", `${id} escaped the portrait menu`);
      assert.equal(game.state.ship, null, `${id} created a run behind the portrait gate`);
      assert.equal(browser.elements.get("controls-modal").open, false, `${id} opened Controls over the gate`);
      assert.equal(browser.elements.get("settings-modal").open, false, `${id} opened Settings over the gate`);
      assert.equal(game.state.settings.sound, initialSound, `${id} changed sound in portrait`);
      assert.equal(game.state.settings.reducedEffects, initialEffects, `${id} changed effects in portrait`);
      assert.equal(browser.document.fullscreenElement, null, `${id} entered fullscreen in portrait`);
      assert.equal(overlay.classList.contains("is-visible"), true);
      assert.equal(overlay.getAttribute("aria-hidden"), "false");
    }

    rotate(browser, game, 844, 390);
    assert.equal(game.mobile.orientationBlocked, false);
    browser.elements.get("controls-button").click();
    assert.equal(browser.elements.get("controls-modal").open, true, "landscape Controls remained blocked");
    browser.elements.get("controls-close-button").click();
    browser.elements.get("settings-button").click();
    assert.equal(browser.elements.get("settings-modal").open, true, "landscape Settings remained blocked");
    browser.elements.get("settings-close-button").click();
    browser.elements.get("sound-button").click();
    assert.equal(game.state.settings.sound, !initialSound, "landscape Sound remained blocked");
    browser.elements.get("motion-button").click();
    assert.equal(game.state.settings.reducedEffects, !initialEffects, "landscape FX remained blocked");
    browser.elements.get("fullscreen-button").click();
    assert.equal(browser.document.fullscreenElement, browser.document.documentElement, "landscape fullscreen remained blocked");
    browser.elements.get("start-button").click();
    assert.equal(game.state.mode, "playing", "landscape Play remained blocked");
    assert.ok(game.state.ship, "landscape Play did not create a run");
  });

  test("portrait gate rejects active-run buttons, keys, and gamepad state without buffering", () => {
    const { browser, game, CONFIG } = bootMobile();
    game.start();
    game.step(CONFIG.world.fixedStep);
    game.state.score = 321;
    game.state.ship.hull = 77;
    const ship = game.state.ship;
    const encounter = game.state.encounterData;
    const runTime = game.state.runTime;
    const initialSound = game.state.settings.sound;
    const initialEffects = game.state.settings.reducedEffects;

    browser.elements.get("settings-button").click();
    assert.equal(browser.elements.get("settings-modal").open, true, "landscape Settings did not open before rotation");
    rotate(browser, game, 390, 844);
    assert.equal(game.mobile.orientationBlocked, true);
    assert.equal(browser.elements.get("settings-modal").open, false, "portrait gate did not close an existing dialog");

    for (const id of [
      "start-button", "restart-button", "restart-pause-button", "resume-button",
      "pause-button", "pause-menu-button", "menu-button", "controls-button",
      "pause-controls-button", "settings-button", "pause-settings-button",
      "sound-button", "settings-sound-button", "motion-button", "settings-effects-button",
      "fullscreen-button", "settings-fullscreen-button", "touch-dash", "touch-pulse"
    ]) {
      browser.elements.get(id).click();
      assert.equal(game.state.mode, "playing", `${id} changed mode through the portrait gate`);
      assert.equal(game.state.ship, ship, `${id} replaced or removed the active ship`);
      assert.equal(game.state.encounterData, encounter, `${id} replaced the active encounter`);
      assert.equal(game.state.runTime, runTime, `${id} advanced or reset run time`);
      assert.equal(game.state.score, 321, `${id} reset run score`);
      assert.equal(game.state.ship.hull, 77, `${id} reset ship state`);
      assert.equal(browser.elements.get("controls-modal").open, false, `${id} opened Controls over the gate`);
      assert.equal(browser.elements.get("settings-modal").open, false, `${id} opened Settings over the gate`);
      assert.equal(game.state.settings.sound, initialSound, `${id} changed sound in portrait`);
      assert.equal(game.state.settings.reducedEffects, initialEffects, `${id} changed effects in portrait`);
      assert.equal(browser.document.fullscreenElement, null, `${id} entered fullscreen in portrait`);
    }

    for (const entry of [
      ["p", "KeyP"], ["Escape", "Escape"], ["m", "KeyM"],
      ["w", "KeyW"], [" ", "Space"], ["Shift", "ShiftLeft"], ["e", "KeyE"]
    ]) {
      key(browser, "keydown", entry[0], entry[1]);
      assert.equal(game.state.mode, "playing", `${entry[1]} changed mode through the portrait gate`);
      assert.equal(game.state.ship, ship, `${entry[1]} replaced or removed the active ship`);
      assert.equal(game.state.runTime, runTime, `${entry[1]} mutated run time in portrait`);
      assert.equal(game.state.settings.sound, initialSound, `${entry[1]} changed settings in portrait`);
      assert.equal(Object.keys(game.input.keys).length, 0, `${entry[1]} buffered held input in portrait`);
      assert.equal(Object.keys(game.input.pressed).length, 0, `${entry[1]} buffered one-shot input in portrait`);
      key(browser, "keyup", entry[0], entry[1]);
    }

    let pad = gamepad([0, 1, 2, 9], [1, -1, 1, -1]);
    browser.window.navigator.getGamepads = () => [pad];
    browser.pumpFrames(3);

    assert.equal(game.state.mode, "playing", "portrait input changed the active mode");
    assert.equal(game.state.ship, ship, "portrait Restart reset the ship");
    assert.equal(game.state.encounterData, encounter, "portrait Restart reset the encounter");
    assert.equal(game.state.runTime, runTime, "portrait input advanced or reset run time");
    assert.equal(game.state.score, 321, "portrait input reset run score");
    assert.equal(game.state.ship.hull, 77, "portrait input reset the run ship");
    assert.equal(browser.elements.get("controls-modal").open, false);
    assert.equal(browser.elements.get("settings-modal").open, false);
    assert.equal(game.state.settings.sound, initialSound);
    assert.equal(game.state.settings.reducedEffects, initialEffects);
    assert.equal(browser.document.fullscreenElement, null);
    assert.equal(Object.keys(game.input.keys).length, 0, "portrait keyboard state was buffered");
    assert.equal(Object.keys(game.input.pressed).length, 0, "portrait one-shot input was buffered");
    assert.equal(game.input.pointerFire, false);
    assert.equal(game.input.touchFire, false);
    assert.equal(game.input.gamepadFire, false);
    assert.equal(game.input.gamepadMoveX, 0);
    assert.equal(game.input.gamepadMoveY, 0);
    assert.equal(game.input.gamepadAimX, 0);
    assert.equal(game.input.gamepadAimY, 0);
    assert.equal(browser.elements.get("orientation-overlay").classList.contains("is-visible"), true);
    assert.equal(browser.elements.get("orientation-overlay").getAttribute("aria-hidden"), "false");

    pad = gamepad([9], [0, 0, 0, 0]);
    browser.pumpFrames(1);

    rotate(browser, game, 844, 390);
    assert.equal(game.mobile.orientationBlocked, false);
    assert.equal(browser.elements.get("orientation-overlay").getAttribute("aria-hidden"), "true");
    browser.pumpFrames(1);
    assert.equal(game.state.mode, "playing", "held portrait gamepad menu became a fresh landscape pause edge");
    pad = gamepad([], [0, 0, 0, 0]);
    browser.pumpFrames(1);
    browser.elements.get("pause-button").click();
    assert.equal(game.state.mode, "paused", "landscape Pause remained blocked");
    browser.elements.get("resume-button").click();
    assert.equal(game.state.mode, "playing", "landscape Resume remained blocked");
    key(browser, "keydown", "p", "KeyP");
    assert.equal(game.state.mode, "paused", "landscape hardware pause remained blocked");
    key(browser, "keyup", "p", "KeyP");
    key(browser, "keydown", "Escape", "Escape");
    assert.equal(game.state.mode, "playing", "landscape hardware resume remained blocked");
    key(browser, "keyup", "Escape", "Escape");

    pad = gamepad([9]);
    browser.pumpFrames(1);
    assert.equal(game.state.mode, "paused", "landscape gamepad menu remained blocked");
    pad = gamepad([]);
    browser.pumpFrames(1);
    browser.elements.get("restart-pause-button").click();
    assert.equal(game.state.mode, "playing", "landscape Restart remained blocked");
    assert.notEqual(game.state.ship, ship, "landscape Restart did not replace the run");
    browser.elements.get("menu-button").click();
    assert.equal(game.state.mode, "menu", "landscape Main menu remained blocked");
  });

  test("orientation lock absence and rejection are both harmless", () => {
    const absent = bootMobile({ orientation: false });
    assert.doesNotThrow(() => absent.game.start());
    assert.doesNotThrow(() => absent.game.mobile.updateOrientationState());

    const rejected = bootMobile({
      orientation: {
        lock() {
          return { catch(handler) { handler(new Error("lock denied")); return this; } };
        }
      }
    });
    assert.doesNotThrow(() => rejected.game.start());
    assert.doesNotThrow(() => rejected.game.mobile.updateOrientationState());
    assert.equal(rejected.game.state.mode, "playing");
  });

  test("mobile shell declares safe viewport, landscape gate, and touch fallback contracts", () => {
    const html = readProject("index.html");
    const css = readProject("styles.css");
    assert.match(html, /name=["']viewport["'][^>]*viewport-fit=cover/i);
    assert.match(html, /id=["']orientation-overlay["']/i);
    assert.match(html, /id=["']orientation-overlay["'][^>]*|class=["'][^"']*orientation-overlay/);
    assert.match(css, /env\(safe-area-inset-(?:top|right|bottom|left)\)/);
    assert.match(css, /\.is-touch-capable\s+\.touch-controls\.is-active/);
    assert.match(css, /@media\s*\(any-pointer:\s*coarse\)/);
    assert.match(css, /\.orientation-overlay\.is-visible[\s\S]*?pointer-events:\s*auto/);
    assert.match(css, /#game[\s\S]*?touch-action:\s*none/);

    const zoneWidths = Array.from(css.matchAll(/(?:\.is-touch-capable\s+)?\.stick-zone\s*\{[^{}]*?\bwidth:\s*(\d+)px/g), (match) => Number(match[1]));
    const actionOffsets = Array.from(css.matchAll(/(?:\.is-touch-capable\s+)?\.touch-actions\s*\{[^{}]*?\bright:\s*calc\(var\(--safe-right\)\s*\+\s*(\d+)px\)/g), (match) => Number(match[1]));
    assert.deepEqual(zoneWidths, [132, 116, 118, 106], "touch-zone width contract changed unexpectedly");
    assert.deepEqual(actionOffsets, [140, 124, 126, 114], "touch-action offset contract changed unexpectedly");
    for (let index = 0; index < zoneWidths.length; index += 1) {
      assert.ok(actionOffsets[index] >= zoneWidths[index] + 8, "touch action overlaps the aim zone");
    }
  });
};
