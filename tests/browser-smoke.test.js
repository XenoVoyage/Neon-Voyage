"use strict";

const { assert, readProject } = require("./_harness");
const { buildBrowser, loadRuntimeScripts } = require("./_browser-harness");

module.exports = function register(test) {
  test("bounded synthesized audio exposes material and weapon-specific cues", () => {
    const browser = buildBrowser();
    loadRuntimeScripts(browser);
    const audio = new browser.window.ND.AudioEngine({ maxNodes: 999 });
    assert.equal(audio.maxNodes, 24);
    assert.equal(audio.volume, 0.8, "new sessions did not receive the louder configured mix");
    for (const method of [
      "weapon", "impact", "destruction", "pickup", "upgrade", "dash", "pulse",
      "playerDamage", "enemyWeapon", "bossWeapon", "bossCue", "arena", "musicTick", "setVolume"
    ]) assert.equal(typeof audio[method], "function", `missing audio cue ${method}`);
    for (const retired of ["shoot", "hit", "explode", "damage", "alienShot", "weaponSwitch"]) {
      assert.equal(audio[retired], undefined, `retired generic cue remains: ${retired}`);
    }
    const source = readProject("js/audio.js");
    for (const weapon of [
      "pulse", "massDriver", "prism", "seeker", "homingSalvo", "radialArray", "drone",
      "teslaCoil", "mineLayer", "arcBurst", "novaLance"
    ]) assert.ok(source.includes(`weapon === "${weapon}"`), `missing authored cue for ${weapon}`);
    assert.doesNotThrow(() => {
      audio.weapon("pulse");
      audio.impact("asteroid", 1);
      audio.destruction("alien", 40);
      audio.pickup("shield");
      audio.playerDamage("hull");
      audio.enemyWeapon("gunship");
      audio.bossWeapon("beam");
    }, "locked or unavailable Web Audio must remain optional");

    assert.equal(new browser.window.ND.AudioEngine({ volume: 0 }).volume, 0,
      "explicit silence was replaced by the default volume");
    const gainTargets = [];
    audio.context = { currentTime: 4 };
    audio.master = {
      gain: {
        value: audio.volume,
        cancelScheduledValues(time) { gainTargets.push(["cancel", time]); },
        setTargetAtTime(value, time, duration) { gainTargets.push(["target", value, time, duration]); }
      }
    };
    assert.equal(audio.setVolume(0.45), 0.45);
    assert.deepEqual(gainTargets.at(-1), ["target", 0.45, 4, 0.025]);
    audio.setMuted(true);
    assert.equal(audio.setVolume(0.25), 0.25);
    assert.deepEqual(gainTargets.at(-1), ["target", 0, 4, 0.025], "muted volume change leaked sound");
    assert.equal(audio.setVolume(9), 1);
    assert.equal(audio.setVolume(-3), 0);
    assert.equal(audio.setVolume(Number.NaN), 0, "invalid volume replaced the last valid level");
  });

  test("browser VM boots local scripts, renders frames, and starts a run", () => {
    const browser = buildBrowser();
    loadRuntimeScripts(browser);
    browser.document.readyState = "interactive";
    browser.emit(browser.document, "DOMContentLoaded");
    browser.window.dispatchEvent({ type: "load" });
    browser.pumpFrames(8);

    assert.ok(browser.window.ND.CONFIG, "configuration did not attach");
    assert.ok(browser.window.ND.Core, "core did not attach");
    assert.equal(typeof browser.window.ND.AudioEngine, "function");
    assert.equal(typeof browser.window.ND.Renderer, "function");
    const rendererProbe = new browser.window.ND.Renderer(browser.elements.get("game"));
    rendererProbe.render({
      mode: "menu",
      camera: { x: 0, y: 0 },
      sector: 1,
      settings: { reducedEffects: false }
    }, 0);
    assert.ok(browser.frameQueue.length <= 4, "animation loop multiplied unexpectedly");

    const start = browser.elements.get("start-button");
    assert.ok(start, "start button is missing");
    start.click();
    browser.pumpFrames(180);
    assert.ok(browser.frameQueue.length <= 4, "animation loop multiplied after start");
    assert.ok(
      !browser.elements.get("hud").classList.contains("is-hidden"),
      "HUD did not become visible after starting"
    );
  });

  test("generated Enigma cards own one unfocusable local preview canvas each", () => {
    const browser = buildBrowser({ now: 1700000000200 });
    loadRuntimeScripts(browser);
    browser.document.readyState = "interactive";
    browser.emit(browser.document, "DOMContentLoaded");
    const game = browser.window.ND.game;
    game.start();
    game.setStage(7, 1);
    game.setSeed(3817);
    assert.equal(game.applyPickup(game.spawnPickup(0, 0, "enigma")), true);
    const fixedStep = browser.window.ND.CONFIG.world.fixedStep;
    const limit = Math.ceil(browser.window.ND.CONFIG.powerups.enigma.slowdownSeconds / fixedStep) + 2;
    for (let frame = 0; frame < limit && game.snapshot().enigma.phase !== "choosing"; frame += 1) game.step(fixedStep);
    assert.equal(game.snapshot().enigma.phase, "choosing");

    const cards = browser.createdElements.filter((element) => /(^|\s)upgrade-card(\s|$)/.test(element.className));
    assert.equal(cards.length, 3);
    for (const card of cards) {
      const frames = card.querySelectorAll(".upgrade-card-preview-frame");
      const previews = card.querySelectorAll(".upgrade-card-preview");
      assert.equal(frames.length, 1, "card did not own exactly one preview frame");
      assert.equal(previews.length, 1, "card did not own exactly one preview canvas");
      assert.equal(frames[0].getAttribute("aria-hidden"), "true");
      assert.equal(previews[0].tagName, "CANVAS");
      assert.equal(previews[0].getAttribute("aria-hidden"), "true");
      assert.equal(previews[0].getAttribute("tabindex"), null, "decorative preview entered the tab order");
      assert.ok(card.getAttribute("aria-label")?.includes(game.snapshot().enigma.choices[Number(card.dataset.choiceIndex)].title));
    }
    assert.equal(browser.document.activeElement, cards[0], "card focus did not remain on the actionable button");
    browser.pumpFrames(3);
    assert.equal(browser.document.activeElement, cards[0], "preview rendering stole card focus");
  });

  test("touch landscape loadouts expose one compact accessible summary for modules and timed effects", () => {
    const browser = buildBrowser({ now: 1700000000300, maxTouchPoints: 5 });
    browser.window.innerWidth = 568;
    browser.window.innerHeight = 320;
    loadRuntimeScripts(browser);
    browser.document.readyState = "interactive";
    browser.emit(browser.document, "DOMContentLoaded");
    const game = browser.window.ND.game;
    game.start();
    game.setStage(7, 1);
    for (const id of Object.keys(game.state.ship.modules)) game.state.ship.modules[id] = 0;
    game.state.ship.modules.pulse = 5;
    game.state.ship.modules.homingSalvo = 4;
    game.state.ship.modules.teslaCoil = 3;
    game.state.moduleSignature = "";
    for (const kind of ["rapid", "amplifier", "aegis", "thruster"]) {
      game.applyPickup(game.spawnPickup(0, 0, kind));
    }
    for (let frame = 0; frame < 10; frame += 1) game.step(browser.window.ND.CONFIG.world.fixedStep);

    const moduleStrip = browser.elements.get("module-strip");
    const effectList = browser.elements.get("active-effects-list");
    const moduleSummaries = moduleStrip.querySelectorAll(".module-compact-summary");
    const effectSummaries = effectList.querySelectorAll(".active-effect-compact-summary");
    assert.equal(moduleSummaries.length, 1);
    assert.equal(effectSummaries.length, 1);
    assert.equal(moduleSummaries[0].textContent, "3 SYSTEMS · 2 AUTO");
    assert.equal(effectSummaries[0].textContent, "4 EFFECTS · 180s");
    assert.match(moduleSummaries[0].getAttribute("aria-label"), /3 permanent systems\./);
    for (const label of ["Pulse Repeater", "Homing Salvo", "Tesla Coil"]) {
      assert.ok(moduleSummaries[0].getAttribute("aria-label").includes(label), `compact modules omitted ${label}`);
    }
    assert.match(effectSummaries[0].getAttribute("aria-label"), /4 timed effects\./);
    for (const label of ["OVERDRIVE", "DAMAGE AMPLIFIER", "AEGIS FIELD", "THRUSTER SURGE"]) {
      assert.ok(effectSummaries[0].getAttribute("aria-label").includes(label), `compact effects omitted ${label}`);
    }
    assert.equal(moduleStrip.querySelectorAll(".module-slot").length, 3, "desktop module detail was not retained");
    assert.equal(effectList.querySelectorAll(".active-effect-chip").length, 4, "desktop effect detail was not retained");
  });
};
