"use strict";

const { assert, vm, readProject, approximately } = require("./_harness");
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
  return { browser, game, CONFIG: browser.window.ND.CONFIG, Core: browser.window.ND.Core };
}

function pointer(browser, elementId, type, pointerId, clientX, clientY) {
  const isStick = elementId === "move-zone" || elementId === "aim-zone";
  if (!isStick) return rawPointer(browser, browser.elements.get(elementId), type, pointerId, clientX, clientY);

  const sessions = browser._legacyStickPointers || (browser._legacyStickPointers = new Map());
  const zone = browser.elements.get(elementId);
  const canvas = browser.elements.get("game");
  if (type === "pointerdown") {
    const ring = zone._stickRing;
    const ringBounds = ring.getBoundingClientRect();
    const canvasBounds = canvas.getBoundingClientRect();
    const oldCenterX = ringBounds.left + ringBounds.width / 2;
    const oldCenterY = ringBounds.top + ringBounds.height / 2;
    const originX = canvasBounds.left + canvasBounds.width * (elementId === "move-zone" ? 0.22 : 0.78);
    const originY = canvasBounds.top + canvasBounds.height * 0.55;
    const session = { offsetX: originX - oldCenterX, offsetY: originY - oldCenterY };
    sessions.set(pointerId, session);
    rawPointer(browser, canvas, type, pointerId, originX, originY);
    return rawPointer(browser, canvas, "pointermove", pointerId, clientX + session.offsetX, clientY + session.offsetY);
  }

  const session = sessions.get(pointerId) || { offsetX: 0, offsetY: 0 };
  const event = rawPointer(browser, canvas, type, pointerId, clientX + session.offsetX, clientY + session.offsetY);
  if (type === "pointerup" || type === "pointercancel" || type === "lostpointercapture") sessions.delete(pointerId);
  return event;
}

function rawPointer(browser, target, type, pointerId, clientX, clientY, additions) {
  const event = new browser.window.PointerEvent(type, Object.assign({
    pointerId,
    pointerType: "touch",
    isPrimary: pointerId === 11,
    clientX,
    clientY,
    button: 0,
    buttons: type === "pointerup" || type === "pointercancel" || type === "lostpointercapture" ? 0 : 1
  }, additions || {}));
  if (target === browser.window) browser.window.dispatchEvent(event);
  else if (target === browser.document) browser.emit(browser.document, type, event);
  else target.dispatchEvent(event);
  return event;
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
  test("mobile stick response is radial, symmetric, bounded, and configuration-driven", () => {
    const { browser, game, CONFIG } = bootMobile();
    assert.deepEqual(
      JSON.parse(JSON.stringify(CONFIG.mobileControls)),
      {
        stickRadius: 46,
        moveDeadzone: 0.16,
        moveCurve: 1.45,
        moveMaxOutput: 0.72,
        aimDeadzone: 0.24,
        aimCurve: 1.25,
        aimMaxOutput: 1,
        aimFireThreshold: 0.12,
        aimTurnRate: 7.2
      }
    );

    const centerX = 250;
    const centerY = 200;
    const size = 100;
    const limit = CONFIG.mobileControls.stickRadius;
    const directions = Array.from({ length: 8 }, (_, index) => {
      const angle = index * Math.PI / 4;
      return { x: Math.cos(angle), y: Math.sin(angle), label: `${index * 45} degrees` };
    });
    const cases = [
      { id: "move-zone", kind: "move", deadzone: CONFIG.mobileControls.moveDeadzone, curve: CONFIG.mobileControls.moveCurve, maximum: CONFIG.mobileControls.moveMaxOutput },
      { id: "aim-zone", kind: "aim", deadzone: CONFIG.mobileControls.aimDeadzone, curve: CONFIG.mobileControls.aimCurve, maximum: CONFIG.mobileControls.aimMaxOutput }
    ];
    for (const item of cases) {
      const zone = browser.elements.get(item.id);
      zone._stickRing.setBoundingClientRect({ left: centerX - size / 2, top: centerY - size / 2, width: size, height: size });
    }
    game.start();

    let pointerId = 100;
    for (const item of cases) {
      for (const radius of [0, item.deadzone * 0.5, item.deadzone, 0.5, 1]) {
        const expectedMagnitude = radius <= item.deadzone ? 0 :
          Math.pow((radius - item.deadzone) / (1 - item.deadzone), item.curve) * item.maximum;
        for (const direction of directions) {
          pointerId += 1;
          pointer(browser, item.id, "pointerdown", pointerId, centerX + direction.x * limit * radius, centerY + direction.y * limit * radius);
          const actualX = item.kind === "move" ? game.input.touchMoveX : game.input.touchAimX;
          const actualY = item.kind === "move" ? game.input.touchMoveY : game.input.touchAimY;
          approximately(actualX, direction.x * expectedMagnitude, 1e-7, `${item.kind} ${direction.label} x at ${radius}`);
          approximately(actualY, direction.y * expectedMagnitude, 1e-7, `${item.kind} ${direction.label} y at ${radius}`);
          approximately(Math.hypot(actualX, actualY), expectedMagnitude, 1e-7, `${item.kind} magnitude at ${radius}`);
          assert.ok(Math.hypot(actualX, actualY) <= item.maximum + 1e-9, `${item.kind} exceeded its configured output cap`);
          if (expectedMagnitude > 0) {
            approximately(Math.atan2(actualY, actualX), Math.atan2(direction.y, direction.x), 1e-7, `${item.kind} direction at ${radius}`);
          }
          if (item.kind === "aim") {
            assert.equal(game.input.touchFire, expectedMagnitude > CONFIG.mobileControls.aimFireThreshold, `aim fire threshold at ${radius}`);
          }
          pointer(browser, item.id, "pointerup", pointerId, centerX, centerY);
        }
      }
    }
  });

  test("touch aim follows the requested vector accurately at a bounded turn rate", () => {
    const { browser, game, CONFIG, Core } = bootMobile();
    const aimZone = browser.elements.get("aim-zone");
    aimZone._stickRing.setBoundingClientRect({ left: 200, top: 150, width: 100, height: 100 });
    game.start();
    game.state.asteroids.length = 0;
    game.state.aliens.length = 0;
    game.state.ship.angle = 0;
    game.state.ship.vx = 0;
    game.state.ship.vy = 0;

    pointer(browser, "aim-zone", "pointerdown", 22, 250, 200 - CONFIG.mobileControls.stickRadius);
    const requested = -Math.PI / 2;
    approximately(Math.atan2(game.input.touchAimY, game.input.touchAimX), requested, 1e-9, "touch aim vector");
    let previous = game.state.ship.angle;
    const maximumTurn = CONFIG.mobileControls.aimTurnRate * CONFIG.world.fixedStep;
    for (let index = 0; index < 20; index += 1) {
      game.step(CONFIG.world.fixedStep);
      const turn = Math.abs(Core.angleDelta(previous, game.state.ship.angle));
      assert.ok(turn <= maximumTurn + 1e-9, `touch aim exceeded turn cap on frame ${index}`);
      assert.ok(Math.abs(Core.angleDelta(game.state.ship.angle, requested)) <= Math.abs(Core.angleDelta(previous, requested)) + 1e-9, "touch aim turned away from its requested vector");
      previous = game.state.ship.angle;
    }
    approximately(game.state.ship.angle, requested, 1e-7, "eventual touch aim heading");
    approximately(
      Math.atan2(game.state.aimWorld.y - game.state.ship.y, game.state.aimWorld.x - game.state.ship.x),
      requested,
      1e-7,
      "touch aim world vector"
    );
    pointer(browser, "aim-zone", "pointerup", 22, 250, 200 - CONFIG.mobileControls.stickRadius);
  });

  test("low-band touch fire turns and shoots along its shaped aim vector", () => {
    const { browser, game, CONFIG, Core } = bootMobile();
    const aimZone = browser.elements.get("aim-zone");
    const centerX = 250;
    const centerY = 200;
    const size = 100;
    const limit = CONFIG.mobileControls.stickRadius;
    aimZone._stickRing.setBoundingClientRect({ left: centerX - size / 2, top: centerY - size / 2, width: size, height: size });
    game.start();
    game.state.asteroids.length = 0;
    game.state.aliens.length = 0;
    game.state.playerBullets.length = 0;
    game.state.ship.angle = 0;
    game.state.ship.vx = 0;
    game.state.ship.vy = 0;
    game.state.ship.weaponTimers.pulse = 0;

    const shapedMagnitude = (CONFIG.mobileControls.aimFireThreshold + 0.14) * 0.5;
    assert.ok(shapedMagnitude > CONFIG.mobileControls.aimFireThreshold && shapedMagnitude < 0.14);
    const rawMagnitude = CONFIG.mobileControls.aimDeadzone +
      (1 - CONFIG.mobileControls.aimDeadzone) *
      Math.pow(shapedMagnitude / CONFIG.mobileControls.aimMaxOutput, 1 / CONFIG.mobileControls.aimCurve);
    pointer(browser, "aim-zone", "pointerdown", 22, centerX, centerY - limit * rawMagnitude);
    const actualMagnitude = Math.hypot(game.input.touchAimX, game.input.touchAimY);
    approximately(actualMagnitude, shapedMagnitude, 1e-7, "low-band shaped aim magnitude");
    assert.ok(actualMagnitude > CONFIG.mobileControls.aimFireThreshold && actualMagnitude < 0.14);
    assert.equal(game.input.touchFire, true);

    const oldHeading = game.state.ship.angle;
    game.step(CONFIG.world.fixedStep);
    assert.ok(game.state.ship.angle < oldHeading, "low-band touch aim fired without turning toward the requested vector");
    assert.ok(game.state.playerBullets.length > 0, "low-band touch aim did not fire");
    const bullet = game.state.playerBullets[0];
    const bulletHeading = Math.atan2(bullet.vy, bullet.vx);
    approximately(Core.angleDelta(bulletHeading, game.state.ship.angle), 0, 1e-7, "low-band projectile heading");
    assert.ok(Math.abs(Core.angleDelta(bulletHeading, oldHeading)) > 0.01, "low-band touch fire used the old ship heading");
    pointer(browser, "aim-zone", "pointerup", 22, centerX, centerY - limit * rawMagnitude);
  });

  test("barely active touch aim shares one epsilon without snapping or firing", () => {
    const { game, CONFIG, Core } = bootMobile();
    game.start();
    game.state.asteroids.length = 0;
    game.state.aliens.length = 0;
    game.state.ship.angle = 0;
    game.state.ship.vx = 0;
    game.state.ship.vy = 0;
    game.input.pointerActive = false;
    game.input.touchAimX = 0;
    game.input.touchAimY = -0.0005;
    game.input.touchFire = false;

    const maximumTurn = CONFIG.mobileControls.aimTurnRate * CONFIG.world.fixedStep;
    game.step(CONFIG.world.fixedStep);
    assert.ok(game.state.ship.angle < 0, "barely active touch aim was ignored by aim ownership");
    assert.ok(Math.abs(Core.angleDelta(0, game.state.ship.angle)) <= maximumTurn + 1e-9, "barely active touch aim snapped instead of turning within its cap");
    assert.equal(game.state.playerBullets.length, 0, "barely active touch aim fired below the configured threshold");
    approximately(
      Math.atan2(game.state.aimWorld.y - game.state.ship.y, game.state.aimWorld.x - game.state.ship.x),
      game.state.ship.angle,
      1e-7,
      "barely active touch aim anchor"
    );
  });

  test("releasing touch aim preserves heading while movement reanchors the aim vector", () => {
    const { browser, game, CONFIG } = bootMobile();
    const moveZone = browser.elements.get("move-zone");
    const aimZone = browser.elements.get("aim-zone");
    moveZone._stickRing.setBoundingClientRect({ left: 100, top: 150, width: 100, height: 100 });
    aimZone._stickRing.setBoundingClientRect({ left: 650, top: 150, width: 100, height: 100 });
    game.start();
    game.state.asteroids.length = 0;
    game.state.aliens.length = 0;
    game.state.ship.angle = 0;
    game.state.ship.vx = 0;
    game.state.ship.vy = 0;

    pointer(browser, "aim-zone", "pointerdown", 22, 700, 200);
    for (let frame = 0; frame < 12; frame += 1) game.step(CONFIG.world.fixedStep);
    approximately(game.state.ship.angle, 0, 1e-9, "rightward touch heading");
    pointer(browser, "aim-zone", "pointerup", 22, 700, 200);
    pointer(browser, "move-zone", "pointerdown", 11, 150, 229);
    for (let frame = 0; frame < 60; frame += 1) game.step(CONFIG.world.fixedStep);
    approximately(game.state.ship.angle, 0, 1e-9, "neutral touch heading after movement");
    approximately(game.state.aimWorld.x, game.state.ship.x + 400, 1e-7, "neutral aim anchor x");
    approximately(game.state.aimWorld.y, game.state.ship.y, 1e-7, "neutral aim anchor y");
    pointer(browser, "move-zone", "pointerup", 11, 150, 229);
  });

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

  test("observed touch clears stale mouse aim on hybrid devices", () => {
    const { browser, game, CONFIG } = bootMobile({ maxTouchPoints: 5 });
    game.start();
    game.state.asteroids.length = 0;
    game.state.aliens.length = 0;
    browser.emit(browser.elements.get("game"), "pointermove", {
      pointerId: 1,
      pointerType: "mouse",
      clientX: 12,
      clientY: 12
    });
    assert.equal(game.input.pointerActive, true);

    const aimZone = browser.elements.get("aim-zone");
    aimZone._stickRing.setBoundingClientRect({ left: 650, top: 150, width: 100, height: 100 });
    pointer(browser, "aim-zone", "pointerdown", 22, 700, 200);
    assert.equal(game.input.pointerActive, false, "touch aim retained a stale mouse cursor target");
    for (let frame = 0; frame < 12; frame += 1) game.step(CONFIG.world.fixedStep);
    pointer(browser, "aim-zone", "pointerup", 22, 700, 200);
    const heading = game.state.ship.angle;
    game.step(CONFIG.world.fixedStep);
    approximately(game.state.ship.angle, heading, 1e-9, "released hybrid touch aim snapped back to mouse");
  });

  test("desktop mouse aim and fire remain independent from dynamic touch sticks", () => {
    const { browser, game, CONFIG } = bootMobile({ maxTouchPoints: 0 });
    const canvas = browser.elements.get("game");
    game.start();
    game.state.asteroids.length = 0;
    game.state.aliens.length = 0;
    game.state.playerBullets.length = 0;
    game.state.ship.weaponTimers.pulse = 0;

    rawPointer(browser, canvas, "pointermove", 1, 780, 100, { pointerType: "mouse" });
    rawPointer(browser, canvas, "pointerdown", 1, 780, 100, { pointerType: "mouse" });
    assert.equal(game.input.pointerActive, true);
    assert.equal(game.input.pointerFire, true);
    assert.equal(game.mobile.movePointerId, null);
    assert.equal(game.mobile.aimPointerId, null);
    assert.equal(game.input.touchFire, false);
    game.step(CONFIG.world.fixedStep);
    assert.ok(game.state.playerBullets.length > 0, "desktop mouse fire stopped working");

    rawPointer(browser, browser.window, "pointerup", 1, 780, 100, { pointerType: "mouse" });
    assert.equal(game.input.pointerFire, false, "desktop mouse release did not stop firing");
    assert.equal(game.mobile.touchCapable, false, "mouse input incorrectly promoted desktop to touch mode");
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
    assert.equal(game.input.touchMoveX, moveX, "aim pointer changed the movement stick after crossing halves");
    assert.equal(game.mobile.aimPointerId, 22, "aim pointer changed ownership after crossing halves");
    const crossedAimMagnitude = Math.hypot(game.input.touchAimX, game.input.touchAimY);
    assert.ok(crossedAimMagnitude > 0.2, "aim pointer stopped responding after crossing halves");
    pointer(browser, "move-zone", "pointerup", 11, 760, 360);
    assert.equal(game.input.touchMoveX, 0);
    approximately(Math.hypot(game.input.touchAimX, game.input.touchAimY), crossedAimMagnitude, 1e-9, "releasing movement changed aim magnitude");
    assert.equal(game.mobile.aimPointerId, 22, "releasing movement also released aim ownership");
    assert.equal(game.input.touchFire, true);
    pointer(browser, "aim-zone", "pointerup", 22, 640, 250);
    assert.equal(game.input.touchAimX, 0);
    assert.equal(game.input.touchAimY, 0);
    assert.equal(game.input.touchFire, false);
  });

  test("dynamic sticks relocate to arbitrary touches and clamp knob travel to the configured radius", () => {
    const { browser, game, CONFIG } = bootMobile();
    const canvas = browser.elements.get("game");
    const moveZone = browser.elements.get("move-zone");
    const aimZone = browser.elements.get("aim-zone");
    const moveKnob = browser.elements.get("move-knob");
    const aimKnob = browser.elements.get("aim-knob");
    canvas.setBoundingClientRect({ left: 10, top: 20, width: 844, height: 390 });
    game.start();

    const moveDown = rawPointer(browser, canvas, "pointerdown", 11, 103, 137);
    const aimDown = rawPointer(browser, canvas, "pointerdown", 22, 747, 286);
    assert.equal(moveDown.defaultPrevented, true, "movement activation did not own its browser gesture");
    assert.equal(aimDown.defaultPrevented, true, "aim activation did not own its browser gesture");
    assert.equal(game.mobile.movePointerId, 11);
    assert.equal(game.mobile.aimPointerId, 22);
    assert.deepEqual(JSON.parse(JSON.stringify(game.mobile.moveOrigin)), { x: 103, y: 137 });
    assert.deepEqual(JSON.parse(JSON.stringify(game.mobile.aimOrigin)), { x: 747, y: 286 });
    assert.equal(moveZone.classList.contains("is-engaged"), true);
    assert.equal(aimZone.classList.contains("is-engaged"), true);
    assert.equal(moveZone.style["--stick-x"], "93px");
    assert.equal(moveZone.style["--stick-y"], "117px");
    assert.equal(aimZone.style["--stick-x"], "737px");
    assert.equal(aimZone.style["--stick-y"], "266px");
    assert.equal(game.input.touchMoveX, 0);
    assert.equal(game.input.touchMoveY, 0);
    assert.equal(game.input.touchAimX, 0);
    assert.equal(game.input.touchAimY, 0);
    assert.equal(game.input.touchFire, false);
    assert.equal(moveKnob.style.transform, "translate(-50%, -50%)");
    assert.equal(aimKnob.style.transform, "translate(-50%, -50%)");
    assert.equal(canvas.hasPointerCapture(11), true);
    assert.equal(canvas.hasPointerCapture(22), true);

    rawPointer(browser, canvas, "pointermove", 11, 103 + CONFIG.mobileControls.stickRadius * 4, 137);
    rawPointer(browser, canvas, "pointermove", 22, 747, 286 - CONFIG.mobileControls.stickRadius * 4);
    assert.ok(game.input.touchMoveX > CONFIG.mobileControls.moveMaxOutput - 0.01 && game.input.touchMoveX <= CONFIG.mobileControls.moveMaxOutput);
    assert.equal(game.input.touchMoveY, 0);
    assert.equal(game.input.touchAimX, 0);
    assert.ok(game.input.touchAimY < -CONFIG.mobileControls.aimMaxOutput + 0.01 && game.input.touchAimY >= -CONFIG.mobileControls.aimMaxOutput);
    assert.equal(game.input.touchFire, true);
    assert.equal(moveKnob.style.transform, `translate(calc(-50% + ${CONFIG.mobileControls.stickRadius}px), calc(-50% + 0px))`);
    assert.equal(aimKnob.style.transform, `translate(calc(-50% + 0px), calc(-50% + ${-CONFIG.mobileControls.stickRadius}px))`);

    rawPointer(browser, browser.window, "pointerup", 11, 900, 137);
    rawPointer(browser, browser.window, "pointerup", 22, 747, -20);
    assert.equal(moveZone.classList.contains("is-engaged"), false);
    assert.equal(aimZone.classList.contains("is-engaged"), false);
    assert.equal(moveZone.style["--stick-x"], undefined);
    assert.equal(aimZone.style["--stick-y"], undefined);
    assert.equal(moveKnob.style.transform, "translate(-50%, -50%)");
    assert.equal(aimKnob.style.transform, "translate(-50%, -50%)");
  });

  test("canvas touch activation classifies playable halves and rejects non-playfield starts", () => {
    const { browser, game, CONFIG } = bootMobile();
    const canvas = browser.elements.get("game");
    canvas.setBoundingClientRect({ left: 20, top: 10, width: 800, height: 360 });
    game.start();

    for (const [pointerId, x, y] of [
      [31, 19, 180],
      [32, 821, 180],
      [33, 200, 9],
      [34, 600, 371]
    ]) {
      const event = rawPointer(browser, canvas, "pointerdown", pointerId, x, y);
      assert.equal(event.defaultPrevented, false, `outside pointer ${pointerId} was incorrectly claimed`);
      assert.equal(game.mobile.movePointerId, null);
      assert.equal(game.mobile.aimPointerId, null);
    }

    for (const id of ["touch-dash", "touch-pulse", "pause-button", "sound-button"]) {
      rawPointer(browser, browser.elements.get(id), "pointerdown", 40, 700, 200);
      assert.equal(game.mobile.movePointerId, null, `${id} activated movement`);
      assert.equal(game.mobile.aimPointerId, null, `${id} activated aim`);
      assert.equal(game.input.touchFire, false, `${id} activated fire`);
    }

    rawPointer(browser, canvas, "pointerdown", 51, 21, 18);
    assert.equal(game.mobile.movePointerId, 51, "top-left playable point did not activate movement");
    rawPointer(browser, canvas, "pointermove", 51, 800, 18);
    assert.ok(game.input.touchMoveX > CONFIG.mobileControls.moveMaxOutput - 0.01, "movement pointer stopped when crossing into the other half");
    assert.equal(game.mobile.aimPointerId, null, "movement pointer changed ownership after crossing halves");
    assert.equal(game.input.touchFire, false);

    rawPointer(browser, canvas, "pointerdown", 52, 200, 300);
    assert.equal(game.mobile.movePointerId, 51, "second left-side pointer stole movement ownership");
    assert.equal(game.mobile.aimPointerId, null, "ignored left-side pointer activated aim");

    rawPointer(browser, canvas, "pointerdown", 61, 420, 369);
    assert.equal(game.mobile.aimPointerId, 61, "midpoint/right playable point did not activate aim");
    rawPointer(browser, canvas, "pointermove", 61, 420, 369 - CONFIG.mobileControls.stickRadius);
    assert.equal(game.input.touchFire, true);
    assert.equal(game.mobile.movePointerId, 51, "aim activation stole movement ownership");

    rawPointer(browser, browser.window, "pointerup", 51, 800, 18);
    rawPointer(browser, browser.window, "pointerup", 61, 420, 320);
    assert.equal(game.mobile.movePointerId, null);
    assert.equal(game.mobile.aimPointerId, null);
  });

  test("aim turn speed scales with stick magnitude and stays below its configured maximum", () => {
    function measure(rawMagnitude, pointerId) {
      const { browser, game, CONFIG, Core } = bootMobile();
      const canvas = browser.elements.get("game");
      game.start();
      game.state.asteroids.length = 0;
      game.state.aliens.length = 0;
      game.state.ship.angle = 0;
      game.state.ship.vx = 0;
      game.state.ship.vy = 0;
      const originX = 700;
      const originY = 210;
      rawPointer(browser, canvas, "pointerdown", pointerId, originX, originY);
      rawPointer(browser, canvas, "pointermove", pointerId, originX, originY - CONFIG.mobileControls.stickRadius * rawMagnitude);
      const shapedMagnitude = Math.hypot(game.input.touchAimX, game.input.touchAimY);
      game.step(CONFIG.world.fixedStep);
      const actualTurn = Math.abs(Core.angleDelta(0, game.state.ship.angle));
      const expectedTurn = CONFIG.mobileControls.aimTurnRate * CONFIG.world.fixedStep *
        Math.min(1, shapedMagnitude / CONFIG.mobileControls.aimMaxOutput);
      approximately(actualTurn, expectedTurn, 1e-9, `aim turn at raw magnitude ${rawMagnitude}`);
      rawPointer(browser, browser.window, "pointerup", pointerId, originX, originY);
      return { actualTurn, shapedMagnitude, CONFIG };
    }

    const half = measure(0.5, 71);
    const full = measure(1, 72);
    assert.ok(half.shapedMagnitude > 0 && half.shapedMagnitude < full.shapedMagnitude, "aim shaping lost its analog range");
    assert.ok(half.actualTurn > 0 && half.actualTurn < full.actualTurn, "partial aim deflection did not turn more slowly");
    approximately(full.actualTurn, full.CONFIG.mobileControls.aimTurnRate * full.CONFIG.world.fixedStep, 1e-9, "full aim turn cap");
    assert.equal(full.CONFIG.mobileControls.aimTurnRate, 7.2);
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

  test("outside terminal events clear fire when pointer capture is missing or throws", () => {
    for (const captureMode of ["missing", "throws"]) {
      const { browser, game, CONFIG } = bootMobile();
      const canvas = browser.elements.get("game");
      if (captureMode === "missing") {
        canvas.setPointerCapture = undefined;
        canvas.releasePointerCapture = undefined;
        canvas.hasPointerCapture = undefined;
      } else {
        canvas.setPointerCapture = () => { throw new Error("capture denied"); };
        canvas.releasePointerCapture = () => { throw new Error("release denied"); };
        canvas.hasPointerCapture = () => true;
      }
      game.start();
      const pointerId = captureMode === "missing" ? 81 : 82;
      rawPointer(browser, canvas, "pointerdown", pointerId, 700, 200);
      rawPointer(browser, browser.window, "pointermove", pointerId, 700, 200 - CONFIG.mobileControls.stickRadius);
      assert.equal(game.input.touchFire, true, `${captureMode} capture did not reproduce active fire`);

      const terminal = captureMode === "missing" ? "pointerup" : "pointercancel";
      rawPointer(browser, browser.window, terminal, pointerId, 900, -40);
      assert.equal(game.mobile.aimPointerId, null, `${captureMode} capture retained aim ownership`);
      assert.equal(game.input.touchAimX, 0);
      assert.equal(game.input.touchAimY, 0);
      assert.equal(game.input.touchFire, false, `${captureMode} capture left automatic fire latched`);

      rawPointer(browser, browser.window, "pointermove", pointerId, 720, 180);
      assert.equal(game.input.touchFire, false, `${captureMode} stale pointer restarted fire`);
      const freshId = pointerId + 20;
      rawPointer(browser, canvas, "pointerdown", freshId, 650, 220);
      rawPointer(browser, browser.window, "pointermove", freshId, 650 + CONFIG.mobileControls.stickRadius, 220);
      assert.equal(game.mobile.aimPointerId, freshId, `${captureMode} capture blocked a fresh pointer`);
      assert.equal(game.input.touchFire, true);
      rawPointer(browser, browser.window, "pointerup", freshId, 700, 220);
    }
  });

  test("Pulse and Dash cannot create or preserve stuck automatic fire", () => {
    const { browser, game, CONFIG } = bootMobile();
    const canvas = browser.elements.get("game");
    game.start();
    rawPointer(browser, canvas, "pointerdown", 91, 690, 210);
    rawPointer(browser, canvas, "pointermove", 91, 690, 210 - CONFIG.mobileControls.stickRadius);
    assert.equal(game.input.touchFire, true);

    browser.elements.get("touch-pulse").click();
    browser.elements.get("touch-dash").click();
    game.step(CONFIG.world.fixedStep);
    assert.ok(game.state.ship.dashCooldown > 0, "Dash was not consumed during aim fire");
    assert.ok(game.state.ship.pulse < 99.5, "Pulse was not consumed during aim fire");
    rawPointer(browser, browser.window, "pointerup", 91, 690, 100);
    assert.equal(game.input.touchFire, false, "action-button sequence left fire latched");

    browser.elements.get("touch-pulse").click();
    browser.elements.get("touch-dash").click();
    assert.equal(game.input.touchFire, false, "action buttons created fire without an aim pointer");
    assert.equal(game.mobile.aimPointerId, null);
  });

  test("touch blur clears active sticks without pausing and stale IDs stay inert", () => {
    const { browser, game, CONFIG } = bootMobile();
    const canvas = browser.elements.get("game");
    game.start();
    rawPointer(browser, canvas, "pointerdown", 101, 160, 210);
    rawPointer(browser, canvas, "pointermove", 101, 160 + CONFIG.mobileControls.stickRadius, 210);
    rawPointer(browser, canvas, "pointerdown", 102, 680, 210);
    rawPointer(browser, canvas, "pointermove", 102, 680, 210 - CONFIG.mobileControls.stickRadius);
    assert.equal(game.input.touchFire, true);

    browser.window.dispatchEvent({ type: "blur" });
    assert.equal(game.state.mode, "playing", "touch browser-chrome blur paused the run");
    assert.equal(game.mobile.movePointerId, null);
    assert.equal(game.mobile.aimPointerId, null);
    assert.equal(game.input.touchMoveX, 0);
    assert.equal(game.input.touchFire, false);
    rawPointer(browser, browser.window, "pointermove", 102, 720, 100);
    assert.equal(game.input.touchFire, false, "blurred stale pointer restarted fire");

    rawPointer(browser, canvas, "pointerdown", 103, 700, 200);
    rawPointer(browser, canvas, "pointermove", 103, 700 + CONFIG.mobileControls.stickRadius, 200);
    assert.equal(game.input.touchFire, true, "fresh aim pointer failed after blur");
    rawPointer(browser, browser.window, "pointerup", 103, 760, 200);
  });

  test("pagehide and run-mode transitions clear aim ownership and fire", () => {
    const terminalCases = [
      {
        label: "pagehide",
        trigger(browser) { browser.window.dispatchEvent({ type: "pagehide" }); },
        expectedMode: "paused"
      },
      {
        label: "pause",
        trigger(browser) { browser.elements.get("pause-button").click(); },
        expectedMode: "paused"
      },
      {
        label: "menu",
        trigger(browser, game) { game.state.mode = "paused"; browser.elements.get("pause-menu-button").click(); },
        expectedMode: "menu"
      }
    ];

    for (const [index, item] of terminalCases.entries()) {
      const { browser, game, CONFIG } = bootMobile();
      const canvas = browser.elements.get("game");
      game.start();
      const pointerId = 111 + index;
      rawPointer(browser, canvas, "pointerdown", pointerId, 690, 210);
      rawPointer(browser, canvas, "pointermove", pointerId, 690, 210 - CONFIG.mobileControls.stickRadius);
      assert.equal(game.input.touchFire, true, `${item.label} precondition failed`);
      item.trigger(browser, game);
      assert.equal(game.state.mode, item.expectedMode, `${item.label} mode mismatch`);
      assert.equal(game.mobile.aimPointerId, null, `${item.label} retained aim ownership`);
      assert.equal(game.input.touchFire, false, `${item.label} retained fire`);
      rawPointer(browser, browser.window, "pointermove", pointerId, 750, 80);
      assert.equal(game.input.touchFire, false, `${item.label} stale pointer restarted fire`);
    }

    const transition = bootMobile();
    transition.game.start();
    const transitionCanvas = transition.browser.elements.get("game");
    rawPointer(transition.browser, transitionCanvas, "pointerdown", 121, 700, 210);
    rawPointer(transition.browser, transitionCanvas, "pointermove", 121, 700, 210 - transition.CONFIG.mobileControls.stickRadius);
    const data = transition.game.state.encounterData;
    transition.game.state.asteroids.length = 0;
    transition.game.state.aliens.length = 0;
    data.waveIndex = data.waveCount - 1;
    data.waveNumber = data.waveCount;
    data.pendingSpawns.length = 0;
    data.requeue.length = 0;
    data.waveSpawned = true;
    data.waveRequiredTotal = data.waveRequiredCleared = 1;
    data.stageRequiredTotal = data.stageRequiredCleared = 1;
    data.goalProgress = data.goalTarget - 1;
    transition.game.step(transition.CONFIG.world.fixedStep);
    assert.equal(transition.game.state.mode, "transition", "stage clear did not enter transition");
    assert.equal(transition.game.input.touchFire, false, "transition retained touch fire");
    assert.equal(transition.game.mobile.aimPointerId, null, "transition retained aim ownership");

    const gameover = bootMobile();
    gameover.game.start();
    const gameoverCanvas = gameover.browser.elements.get("game");
    rawPointer(gameover.browser, gameoverCanvas, "pointerdown", 122, 700, 210);
    rawPointer(gameover.browser, gameoverCanvas, "pointermove", 122, 700, 210 - gameover.CONFIG.mobileControls.stickRadius);
    const ship = gameover.game.state.ship;
    gameover.game.state.asteroids.length = 0;
    gameover.game.state.aliens.length = 0;
    ship.hull = 1;
    ship.invulnerable = 0;
    gameover.game.spawnAsteroid("rock", {
      x: ship.x,
      y: ship.y,
      velocityAngle: 0,
      speed: 0.25,
      health: 1000,
      required: false,
      threatCost: 0,
      noDrops: true,
      collisionGrace: 0
    });
    gameover.game.step(gameover.CONFIG.world.fixedStep);
    assert.equal(gameover.game.state.mode, "gameover", "fatal contact did not enter game over");
    assert.equal(gameover.game.input.touchFire, false, "game over retained touch fire");
    assert.equal(gameover.game.mobile.aimPointerId, null, "game over retained aim ownership");
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
    assert.equal(browser.elements.get("game").hasPointerCapture(11), false, "visibility pause retained movement capture");
    assert.equal(browser.elements.get("game").hasPointerCapture(22), false, "visibility pause retained aim capture");

    browser.document.hidden = false;
    browser.document.visibilityState = "visible";
    browser.elements.get("resume-button").click();
    pointer(browser, "move-zone", "pointerdown", 33, 760, 360);
    assert.ok(game.input.touchMoveX > 0.2, "old captured pointer blocked a new movement gesture");
    pointer(browser, "move-zone", "pointerup", 33, 760, 360);
  });

  test("manual pause neutralizes held sticks and ship velocity before fresh touch resumes", () => {
    const { browser, game, CONFIG } = bootMobile();
    game.start();
    game.state.asteroids.length = 0;
    game.state.aliens.length = 0;
    const canvas = browser.elements.get("game");

    pointer(browser, "move-zone", "pointerdown", 11, 760, 360);
    pointer(browser, "aim-zone", "pointerdown", 22, 640, 250);
    assert.equal(canvas.hasPointerCapture(11), true);
    assert.equal(canvas.hasPointerCapture(22), true);
    assert.notEqual(game.input.touchMoveX, 0);
    assert.notEqual(game.input.touchAimY, 0);
    game.state.ship.vx = 143;
    game.state.ship.vy = -87;

    browser.elements.get("pause-button").click();
    assert.equal(game.state.mode, "paused");
    assert.equal(game.input.touchMoveX, 0);
    assert.equal(game.input.touchMoveY, 0);
    assert.equal(game.input.touchAimX, 0);
    assert.equal(game.input.touchAimY, 0);
    assert.equal(game.input.touchFire, false);
    assert.equal(canvas.hasPointerCapture(11), false, "pause retained movement pointer capture");
    assert.equal(canvas.hasPointerCapture(22), false, "pause retained aim pointer capture");
    assert.equal(game.state.ship.vx, 0, "paused ship retained horizontal drift");
    assert.equal(game.state.ship.vy, 0, "paused ship retained vertical drift");

    // Captured fingers can still emit stale movement while an overlay opens.
    // Neither those events nor their old IDs may regain ownership on resume.
    pointer(browser, "move-zone", "pointermove", 11, 820, 302);
    pointer(browser, "aim-zone", "pointermove", 22, 720, 302);
    browser.elements.get("resume-button").click();
    const beforeX = game.state.ship.x;
    const beforeY = game.state.ship.y;
    pointer(browser, "move-zone", "pointermove", 11, 820, 302);
    pointer(browser, "aim-zone", "pointermove", 22, 720, 302);
    game.step(CONFIG.world.fixedStep);
    assert.equal(game.input.touchMoveX, 0, "stale movement pointer regained ownership");
    assert.equal(game.input.touchMoveY, 0, "stale movement pointer regained ownership");
    assert.equal(game.input.touchFire, false, "stale aim pointer resumed firing");
    assert.equal(game.state.ship.x, beforeX, "ship drifted after a neutral resume");
    assert.equal(game.state.ship.y, beforeY, "ship drifted after a neutral resume");

    pointer(browser, "move-zone", "pointerdown", 33, 760, 360);
    pointer(browser, "aim-zone", "pointerdown", 44, 640, 250);
    assert.notEqual(game.input.touchMoveX, 0, "fresh movement pointer could not take ownership");
    assert.notEqual(game.input.touchAimY, 0, "fresh aim pointer could not take ownership");
    assert.equal(canvas.hasPointerCapture(33), true);
    assert.equal(canvas.hasPointerCapture(44), true);
    pointer(browser, "move-zone", "pointerup", 33, 760, 360);
    pointer(browser, "aim-zone", "pointerup", 44, 640, 250);
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

  test("browser touch smoke moves, aims, fires, and returns to neutral through real PointerEvents", () => {
    const { browser, game, CONFIG } = bootMobile();
    const canvas = browser.elements.get("game");
    game.start();
    game.state.asteroids.length = 0;
    game.state.aliens.length = 0;
    game.state.playerBullets.length = 0;
    game.state.ship.vx = 0;
    game.state.ship.vy = 0;
    game.state.ship.weaponTimers.pulse = 0;
    const startX = game.state.ship.x;

    rawPointer(browser, canvas, "pointerdown", 131, 160, 230);
    rawPointer(browser, canvas, "pointermove", 131, 160 + CONFIG.mobileControls.stickRadius, 230);
    rawPointer(browser, canvas, "pointerdown", 132, 680, 230);
    rawPointer(browser, canvas, "pointermove", 132, 680, 230 - CONFIG.mobileControls.stickRadius);
    browser.pumpFrames(30);
    assert.ok(game.state.ship.x > startX, "touch smoke did not move the ship right");
    assert.ok(game.state.ship.angle < -0.1, "touch smoke did not turn the ship upward");
    assert.ok(game.state.playerBullets.length > 0, "touch smoke did not fire a projectile");

    rawPointer(browser, browser.window, "pointerup", 131, 900, 230);
    rawPointer(browser, browser.window, "pointerup", 132, 680, -20);
    assert.equal(game.input.touchMoveX, 0);
    assert.equal(game.input.touchMoveY, 0);
    assert.equal(game.input.touchAimX, 0);
    assert.equal(game.input.touchAimY, 0);
    assert.equal(game.input.touchFire, false);
    game.state.playerBullets.length = 0;
    game.state.ship.weaponTimers.pulse = 0;
    browser.pumpFrames(2);
    assert.equal(game.state.playerBullets.length, 0, "touch smoke kept firing after both fingers released");
  });

  test("desktop blur retains automatic pause behavior", () => {
    const { browser, game } = bootMobile({ maxTouchPoints: 0 });
    game.start();
    game.state.ship.vx = 123;
    game.state.ship.vy = -45;
    browser.window.dispatchEvent({ type: "blur" });
    assert.equal(game.state.mode, "paused");
    assert.equal(game.state.pausedByVisibility, true);
    assert.equal(game.state.ship.vx, 123, "desktop blur discarded intentional inertial state");
    assert.equal(game.state.ship.vy, -45, "desktop blur discarded intentional inertial state");
  });

  test("portrait gate freezes simulation and clears input until landscape resumes", () => {
    const { browser, game, CONFIG } = bootMobile();
    game.start();
    pointer(browser, "move-zone", "pointerdown", 11, 760, 360);
    pointer(browser, "aim-zone", "pointerdown", 22, 640, 250);
    assert.equal(browser.elements.get("game").hasPointerCapture(11), true);
    assert.equal(browser.elements.get("game").hasPointerCapture(22), true);
    rotate(browser, game, 390, 844);
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
    assert.equal(browser.elements.get("game").hasPointerCapture(11), false, "portrait gate retained movement capture");
    assert.equal(browser.elements.get("game").hasPointerCapture(22), false, "portrait gate retained aim capture");
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
    assert.doesNotMatch(html, /name=["']viewport["'][^>]*(?:maximum-scale=1|user-scalable=no)/i, "page zoom must remain accessible outside direct game gestures");
    assert.match(html, /id=["']orientation-overlay["']/i);
    assert.match(html, /id=["']orientation-overlay["'][^>]*|class=["'][^"']*orientation-overlay/);
    assert.match(css, /env\(safe-area-inset-(?:top|right|bottom|left)\)/);
    assert.match(css, /\.is-touch-capable\s+\.touch-controls\.is-active/);
    assert.match(css, /@media\s*\(any-pointer:\s*coarse\)/);
    assert.match(css, /\.orientation-overlay\.is-visible[\s\S]*?pointer-events:\s*auto/);
    assert.match(css, /#game[\s\S]*?touch-action:\s*none/);
    assert.match(css, /#game-shell\s*\{[^}]*touch-action:\s*manipulation/i, "double-tap zoom is not disabled for the game shell");
    assert.match(css, /#game-shell\s*\{[^}]*overscroll-behavior:\s*none/i, "the fullscreen shell can still hand gestures to page scrolling");

    const zoneWidths = Array.from(css.matchAll(/(?:\.is-touch-capable\s+)?\.stick-zone\s*\{[^{}]*?\bwidth:\s*(\d+)px/g), (match) => Number(match[1]));
    const actionOffsets = Array.from(css.matchAll(/(?:\.is-touch-capable\s+)?\.touch-actions\s*\{[^{}]*?\bright:\s*calc\(var\(--safe-right\)\s*\+\s*(\d+)px\)/g), (match) => Number(match[1]));
    assert.deepEqual(zoneWidths, [132, 116, 118, 106], "touch-zone width contract changed unexpectedly");
    assert.deepEqual(actionOffsets, [140, 124, 126, 114], "touch-action offset contract changed unexpectedly");
    for (let index = 0; index < zoneWidths.length; index += 1) {
      assert.ok(actionOffsets[index] >= zoneWidths[index] + 8, "touch action overlaps the aim zone");
    }
  });
};
