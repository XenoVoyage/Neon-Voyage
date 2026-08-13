(function attachGame(global) {
  "use strict";

  const ND = global.ND || (global.ND = {});
  const CONFIG = ND.CONFIG;
  const Core = ND.Core;
  if (!CONFIG || !Core || !ND.Renderer || !ND.AudioEngine) return;

  const TAU = Math.PI * 2;
  const clamp = Core.clamp;
  const lerp = Core.lerp;
  const distanceSquared = Core.distanceSquared;
  const STORAGE_KEY = "neon-voyage-v1";
  const PROGRESS_STORAGE_KEY = "neon-voyage-progress-v1";
  const PROGRESS_STORAGE_LIMIT = 256;
  const TOUCH_INPUT_EPSILON = 0.0001;
  const MODULE_ORDER = Object.keys(CONFIG.weapons.modules).slice(0, CONFIG.weapons.maxInstalledModules);
  const THREAT_ARRAYS = ["asteroids", "aliens"];

  const byId = (id) => global.document.getElementById(id);
  const canvas = byId("game");
  if (!canvas) return;

  const dom = {
    hud: byId("hud"),
    score: byId("score"),
    combo: byId("combo"),
    highScore: byId("high-score"),
    menuHighScore: byId("menu-high-score"),
    sector: byId("sector"),
    encounter: byId("encounter"),
    wave: byId("wave"),
    bossHud: byId("boss-hud"),
    bossName: byId("boss-name"),
    bossPhase: byId("boss-phase"),
    bossHealthTrack: byId("boss-health-track"),
    bossHealthFill: byId("boss-health-fill"),
    bossHealthValue: byId("boss-health-value"),
    objectiveHud: byId("objective-hud"),
    objectiveLabel: byId("objective-label"),
    objectiveStatus: byId("objective-status"),
    meters: byId("meters"),
    hullValue: byId("hull-value"),
    hullFill: byId("hull-fill"),
    hullTrack: byId("hull-fill") && byId("hull-fill").parentElement,
    pulseValue: byId("pulse-value"),
    pulseFill: byId("pulse-fill"),
    pulseTrack: byId("pulse-fill") && byId("pulse-fill").parentElement,
    moduleStrip: byId("module-strip"),
    powerupStatus: byId("powerup-status"),
    announcement: byId("announcement"),
    menuOverlay: byId("menu-overlay"),
    startButton: byId("start-button"),
    continueButton: byId("continue-button"),
    pauseOverlay: byId("pause-overlay"),
    resumeButton: byId("resume-button"),
    gameoverOverlay: byId("gameover-overlay"),
    restartButton: byId("restart-button"),
    finalScore: byId("final-score"),
    finalSector: byId("final-sector"),
    finalWave: byId("final-wave"),
    finalCombo: byId("final-combo"),
    finalBosses: byId("final-bosses"),
    newRecord: byId("new-record"),
    soundButton: byId("sound-button"),
    motionButton: byId("motion-button"),
    fullscreenButton: byId("fullscreen-button"),
    pauseButton: byId("pause-button"),
    settingsSoundButton: byId("settings-sound-button"),
    settingsEffectsButton: byId("settings-effects-button"),
    settingsFullscreenButton: byId("settings-fullscreen-button"),
    controlsModal: byId("controls-modal"),
    settingsModal: byId("settings-modal"),
    stageSelectModal: byId("stage-select-modal"),
    stageGrid: byId("stage-grid"),
    orientationOverlay: byId("orientation-overlay"),
    touchControls: byId("touch-controls"),
    moveZone: byId("move-zone"),
    aimZone: byId("aim-zone"),
    moveKnob: byId("move-knob"),
    aimKnob: byId("aim-knob")
  };

  function validSave(value) {
    return Boolean(value) && typeof value === "object" &&
      Number.isFinite(value.highScore) && value.highScore >= 0 && value.highScore <= 999999999 &&
      Boolean(value.settings) && typeof value.settings === "object" &&
      typeof value.settings.sound === "boolean" && typeof value.settings.reducedEffects === "boolean";
  }

  function validProgress(value) {
    const maximum = CONFIG.sector.encountersPerSector;
    return Boolean(value) && typeof value === "object" && !Array.isArray(value) &&
      value.schema === 1 &&
      Number.isInteger(value.maxUnlockedStage) && value.maxUnlockedStage >= 1 && value.maxUnlockedStage <= maximum &&
      Number.isInteger(value.lastPlayedStage) && value.lastPlayedStage >= 1 && value.lastPlayedStage <= value.maxUnlockedStage;
  }

  const saved = Core.safeReadJSON(null, STORAGE_KEY, {
    highScore: 0,
    settings: { sound: true, reducedEffects: false }
  }, validSave, 1024);
  const settings = {
    sound: saved.settings.sound,
    reducedEffects: saved.settings.reducedEffects
  };
  const savedProgress = Core.safeReadJSON(null, PROGRESS_STORAGE_KEY, {
    schema: 1,
    maxUnlockedStage: 1,
    lastPlayedStage: 1
  }, validProgress, PROGRESS_STORAGE_LIMIT);
  const progress = {
    schema: 1,
    maxUnlockedStage: savedProgress.maxUnlockedStage,
    lastPlayedStage: savedProgress.lastPlayedStage
  };
  let highScore = Math.floor(saved.highScore);
  const renderer = new ND.Renderer(canvas);
  const audio = new ND.AudioEngine({ muted: !settings.sound, maxNodes: CONFIG.caps.activeAudioNodes });
  let rng = Core.createRng(Date.now());
  let nextEntityId = 1;

  const input = {
    keys: Object.create(null),
    pressed: Object.create(null),
    pointerX: renderer.width * 0.72,
    pointerY: renderer.height * 0.5,
    pointerActive: false,
    pointerFire: false,
    touchMoveX: 0,
    touchMoveY: 0,
    touchAimX: 0,
    touchAimY: 0,
    touchFire: false,
    gamepadMoveX: 0,
    gamepadMoveY: 0,
    gamepadAimX: 0,
    gamepadAimY: 0,
    gamepadFire: false,
    lastGamepadButtons: []
  };
  const touchSticks = {
    move: {
      kind: "move",
      zone: dom.moveZone,
      knob: dom.moveKnob,
      activeId: null,
      originX: 0,
      originY: 0,
      captureTracked: false
    },
    aim: {
      kind: "aim",
      zone: dom.aimZone,
      knob: dom.aimKnob,
      activeId: null,
      originX: 0,
      originY: 0,
      captureTracked: false
    }
  };
  const notedTouchEvents = new WeakSet();
  const handledTouchMoves = new WeakSet();
  let touchCapable = false;
  let orientationBlocked = false;
  let campaignProgressEligible = false;
  let presentedMode = null;
  const stageButtons = [];

  function mediaMatches(query) {
    try {
      return Boolean(global.matchMedia && global.matchMedia(query).matches);
    } catch {
      return false;
    }
  }

  function detectTouchCapability() {
    const navigator = global.navigator || {};
    return Number(navigator.maxTouchPoints || navigator.msMaxTouchPoints || 0) > 0 ||
      mediaMatches("(pointer: coarse)") || mediaMatches("(any-pointer: coarse)");
  }

  function isPortraitViewport() {
    const width = Number(global.innerWidth) || renderer.width;
    const height = Number(global.innerHeight) || renderer.height;
    return height > width;
  }

  function setTouchCapable(value) {
    touchCapable = Boolean(value);
    if (global.document.body) global.document.body.classList.toggle("is-touch-capable", touchCapable);
  }

  function updateOrientationState() {
    if (!touchCapable && detectTouchCapability()) setTouchCapable(true);
    const nextBlocked = touchCapable && isPortraitViewport();
    const changed = nextBlocked !== orientationBlocked;
    if (changed) {
      const heldGamepadButtons = nextBlocked ? null : input.lastGamepadButtons.slice();
      orientationBlocked = nextBlocked;
      resetTransientInput();
      if (heldGamepadButtons) input.lastGamepadButtons = heldGamepadButtons;
      if (orientationBlocked) {
        closeDialog(dom.controlsModal);
        closeDialog(dom.settingsModal);
        closeDialog(dom.stageSelectModal);
      }
    }
    if (changed && dom.orientationOverlay) {
      dom.orientationOverlay.classList.toggle("is-visible", orientationBlocked);
      dom.orientationOverlay.setAttribute("aria-hidden", String(!orientationBlocked));
      const shell = dom.orientationOverlay.parentElement;
      if (shell && shell.children) {
        for (const child of Array.from(shell.children)) {
          if (child === dom.orientationOverlay) continue;
          if (orientationBlocked) child.setAttribute("inert", "");
          else child.removeAttribute("inert");
        }
      }
    }
    for (const dialog of [dom.controlsModal, dom.settingsModal, dom.stageSelectModal]) {
      if (!dialog) continue;
      if (orientationBlocked) dialog.setAttribute("inert", "");
      else dialog.removeAttribute("inert");
    }
    syncModePresentation();
    if (changed && !orientationBlocked) focusPrimaryModeAction(state.mode);
    return orientationBlocked;
  }

  function noteTouchInteraction(event) {
    if (!event || event.pointerType !== "touch") return;
    if (notedTouchEvents.has(event)) return;
    notedTouchEvents.add(event);
    if (!touchCapable) setTouchCapable(true);
    input.pointerActive = false;
    input.pointerFire = false;
    updateOrientationState();
    if (event.type === "pointerdown" && event.isPrimary &&
        !touchStickForPointer(event.pointerId) &&
        (touchSticks.move.activeId !== null || touchSticks.aim.activeId !== null)) {
      clearTouchSticks();
    }
  }

  function requestLandscapeLock() {
    if (!touchCapable) return;
    try {
      const orientation = global.screen && global.screen.orientation;
      const result = orientation && typeof orientation.lock === "function" ? orientation.lock("landscape") : null;
      if (result && typeof result.catch === "function") result.catch(() => {});
    } catch {
      // Screen orientation locking is optional and unsupported by iOS Safari.
    }
  }

  setTouchCapable(detectTouchCapability());

  const state = {
    mode: "menu",
    time: 0,
    runTime: 0,
    settings,
    worldOffset: { x: 0, y: 0 },
    camera: { x: 0, y: 0, zoom: 1 },
    ship: null,
    aimWorld: { x: 200, y: 0 },
    asteroids: [],
    aliens: [],
    playerBullets: [],
    enemyBullets: [],
    mines: [],
    pickups: [],
    effects: [],
    floaters: [],
    boss: null,
    arena: { active: false, locked: false, warning: 0, x: 0, y: 0, radius: 320 },
    combatField: { active: false, x: 0, y: 0, halfWidth: 0, halfHeight: 0 },
    sector: 1,
    encounter: 1,
    encounterData: null,
    cinematic: {
      active: false,
      elapsed: 0,
      duration: CONFIG.cinematic.duration,
      progress: 0,
      directionX: CONFIG.cinematic.directionX,
      directionY: CONFIG.cinematic.directionY,
      speed: CONFIG.cinematic.speed,
      fromEncounter: 1,
      toEncounter: 1,
      fromSector: 1,
      toSector: 1
    },
    score: 0,
    combo: 1,
    comboTimer: 0,
    bestCombo: 1,
    bossesDefeated: 0,
    shake: 0,
    flash: 0,
    flashColor: "#ff667a",
    announcementTimer: 0,
    uiTimer: 0,
    pausedByVisibility: false,
    stats: { culled: 0, spawned: 0, kills: 0 }
  };

  function saveLocal() {
    Core.safeWriteJSON(null, STORAGE_KEY, {
      highScore,
      settings: { sound: settings.sound, reducedEffects: settings.reducedEffects }
    }, validSave, 1024);
  }

  function saveProgress() {
    return Core.safeWriteJSON(null, PROGRESS_STORAGE_KEY, progress, validProgress, PROGRESS_STORAGE_LIMIT);
  }

  function formatScore(value) {
    return String(Math.max(0, Math.floor(value))).padStart(6, "0");
  }

  function show(element, visible) {
    if (element) element.classList.toggle("is-hidden", !visible);
  }

  function setOverlayState(element, visible) {
    if (!element) return;
    const interactive = Boolean(visible) && !orientationBlocked;
    element.classList.toggle("is-visible", Boolean(visible));
    element.setAttribute("aria-hidden", String(!interactive));
    if (interactive) element.removeAttribute("inert");
    else element.setAttribute("inert", "");
  }

  function anyDialogOpen() {
    return [dom.controlsModal, dom.settingsModal, dom.stageSelectModal].some((dialog) => Boolean(dialog && dialog.open));
  }

  function focusPrimaryModeAction(mode) {
    if (orientationBlocked || touchCapable && isPortraitViewport() || anyDialogOpen()) return;
    const target = mode === "menu" ? dom.startButton : mode === "paused" ? dom.resumeButton : mode === "gameover" ? dom.restartButton : null;
    target?.focus({ preventScroll: true });
  }

  function announce(text, seconds) {
    if (!dom.announcement) return;
    dom.announcement.textContent = text;
    dom.announcement.classList.add("is-visible");
    state.announcementTimer = Math.max(0.5, seconds || 1.7);
  }

  function hideAnnouncement() {
    if (dom.announcement) dom.announcement.classList.remove("is-visible");
  }

  function syncModePresentation() {
    const mode = state.mode;
    setOverlayState(dom.menuOverlay, mode === "menu");
    setOverlayState(dom.pauseOverlay, mode === "paused");
    setOverlayState(dom.gameoverOverlay, mode === "gameover");
    const inRun = mode === "playing" || mode === "transition" || mode === "paused";
    show(dom.hud, inRun);
    show(dom.meters, inRun);
    show(dom.pauseButton, mode === "playing" || mode === "transition");
    show(dom.objectiveHud, inRun);
    if (!inRun) show(dom.bossHud, false);
    if (dom.touchControls) dom.touchControls.classList.toggle("is-active", mode === "playing");
    canvas.style.cursor = mode === "playing" ? "crosshair" : "default";
    const canvasTabIndex = mode === "playing" ? 0 : -1;
    canvas.tabIndex = canvasTabIndex;
    canvas.setAttribute("tabindex", String(canvasTabIndex));
  }

  function setMode(mode) {
    if (state.mode !== mode) clearTouchSticks();
    state.mode = mode;
    syncModePresentation();
    if (presentedMode !== mode) {
      presentedMode = mode;
      focusPrimaryModeAction(mode);
    }
  }

  function resetRun(startStage) {
    const initialStage = clamp(Math.floor(Number(startStage) || 1), 1, CONFIG.sector.encountersPerSector);
    resetTransientInput();
    audio.resetTimeline();
    const ship = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 15,
      angle: 0,
      hull: 100,
      maxHull: 100,
      shield: 0,
      invulnerable: 1.2,
      engine: 0,
      dashTime: 0,
      dashCooldown: 0,
      pulse: 100,
      rapidTimer: 0,
      triShotTimer: 0,
      piercingTimer: 0,
      arcBurstTimer: 0,
      novaLanceTimer: 0,
      modules: { ...CONFIG.weapons.startingModules },
      weaponTimers: Object.create(null),
      drones: []
    };
    state.time = 0;
    state.runTime = 0;
    state.worldOffset.x = 0;
    state.worldOffset.y = 0;
    state.camera.x = 0;
    state.camera.y = 0;
    state.ship = ship;
    state.aimWorld.x = 200;
    state.aimWorld.y = 0;
    for (const key of ["asteroids", "aliens", "playerBullets", "enemyBullets", "mines", "pickups", "effects", "floaters"]) {
      state[key].length = 0;
    }
    state.boss = null;
    state.arena = { active: false, locked: false, warning: 0, x: 0, y: 0, radius: 320 };
    state.combatField = { active: false, x: 0, y: 0, halfWidth: 0, halfHeight: 0 };
    state.sector = 1;
    state.encounter = initialStage;
    state.encounterData = null;
    state.cinematic.active = false;
    state.cinematic.elapsed = 0;
    state.cinematic.progress = 0;
    state.score = 0;
    state.combo = 1;
    state.comboTimer = 0;
    state.bestCombo = 1;
    state.bossesDefeated = 0;
    state.shake = 0;
    state.flash = 0;
    state.powerupText = "";
    state.powerupTextTimer = 0;
    if (dom.powerupStatus) dom.powerupStatus.textContent = "";
    state.stats = { culled: 0, spawned: 0, kills: 0 };
    hideAnnouncement();
    beginEncounter();
  }

  function startRunAt(stage) {
    const requestedStage = Math.floor(Number(stage));
    if (!Number.isInteger(requestedStage) || requestedStage < 1 || requestedStage > progress.maxUnlockedStage) return false;
    audio.ensure();
    requestLandscapeLock();
    closeDialog(dom.controlsModal);
    closeDialog(dom.settingsModal);
    closeDialog(dom.stageSelectModal);
    progress.lastPlayedStage = requestedStage;
    saveProgress();
    updateProgressUI();
    campaignProgressEligible = true;
    resetRun(requestedStage);
    setMode("playing");
    if (!touchCapable) canvas.focus({ preventScroll: true });
    updateUI(true);
    return true;
  }

  function startNewRun() {
    return startRunAt(1);
  }

  function returnToMenu() {
    state.ship = null;
    state.boss = null;
    state.arena.active = false;
    state.combatField.active = false;
    setMode("menu");
    updateUI(true);
  }

  function togglePause(forcePause) {
    if ((state.mode === "playing" || state.mode === "transition") && forcePause !== false) {
      resetTransientInput();
      if (touchCapable && state.ship) {
        state.ship.vx = 0;
        state.ship.vy = 0;
        state.ship.engine = 0;
        state.ship.dashTime = 0;
      }
      state.resumeMode = state.mode;
      state.mode = "paused";
      setMode("paused");
    } else if (state.mode === "paused" && forcePause !== true) {
      state.pausedByVisibility = false;
      setMode(state.resumeMode === "transition" && state.cinematic.active ? "transition" : "playing");
      if (!touchCapable) canvas.focus({ preventScroll: true });
    }
  }

  function endRun() {
    if (state.mode === "gameover") return;
    const oldHighScore = highScore;
    highScore = Math.max(highScore, Math.floor(state.score));
    saveLocal();
    if (dom.finalScore) dom.finalScore.textContent = formatScore(state.score);
    if (dom.finalSector) dom.finalSector.textContent = String(state.sector);
    if (dom.finalWave) dom.finalWave.textContent = String(state.encounter);
    if (dom.finalCombo) dom.finalCombo.textContent = `×${state.bestCombo}`;
    if (dom.finalBosses) dom.finalBosses.textContent = String(state.bossesDefeated);
    show(dom.newRecord, highScore > oldHighScore);
    setMode("gameover");
    updateUI(true);
  }

  function openDialog(dialog) {
    if (!dialog || orientationBlocked) return;
    dialog.removeAttribute("inert");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function stageCardText(className, text) {
    const element = global.document.createElement("span");
    element.className = className;
    element.textContent = text;
    return element;
  }

  function buildStageGrid() {
    if (!dom.stageGrid || stageButtons.length) return;
    for (const spec of CONFIG.sector.encounters) {
      const stage = spec.index;
      const button = global.document.createElement("button");
      button.type = "button";
      button.className = "stage-card";
      button.dataset.stage = String(stage);

      const preview = global.document.createElement("canvas");
      preview.className = "stage-preview";
      preview.width = 320;
      preview.height = 180;
      preview.setAttribute("aria-hidden", "true");

      const copy = global.document.createElement("span");
      copy.className = "stage-card-copy";
      copy.appendChild(stageCardText("stage-card-index", `Stage ${String(stage).padStart(2, "0")}`));
      copy.appendChild(stageCardText("stage-card-title", spec.label));
      const status = stageCardText("stage-card-status", "Locked");
      copy.appendChild(status);

      button.appendChild(preview);
      button.appendChild(copy);
      button.addEventListener("click", () => {
        if (orientationBlocked || state.mode !== "menu" || stage > progress.maxUnlockedStage) return;
        startRunAt(stage);
      });
      dom.stageGrid.appendChild(button);
      stageButtons.push({ stage, spec, button, status });
      if (ND.StagePreview && typeof ND.StagePreview.render === "function") ND.StagePreview.render(preview, stage, 1);
    }
  }

  function updateProgressUI() {
    buildStageGrid();
    const canContinue = progress.maxUnlockedStage >= 2;
    if (dom.continueButton) {
      dom.continueButton.disabled = !canContinue;
      dom.continueButton.setAttribute("aria-disabled", String(!canContinue));
    }
    for (const entry of stageButtons) {
      const unlocked = entry.stage <= progress.maxUnlockedStage;
      const current = unlocked && entry.stage === progress.lastPlayedStage;
      entry.button.disabled = !unlocked;
      entry.button.setAttribute("aria-label", `Stage ${entry.stage}: ${entry.spec.label}. ${unlocked ? "Unlocked" : "Locked"}.`);
      if (current) entry.button.setAttribute("aria-current", "step");
      else entry.button.removeAttribute("aria-current");
      entry.status.textContent = unlocked ? (current ? "Last played" : "Unlocked") : "Locked";
    }
  }

  function openStageSelect() {
    if (progress.maxUnlockedStage < 2 || state.mode !== "menu") return;
    updateProgressUI();
    closeDialog(dom.controlsModal);
    closeDialog(dom.settingsModal);
    openDialog(dom.stageSelectModal);
    const target = stageButtons.find((entry) => entry.stage === progress.lastPlayedStage);
    target?.button.focus({ preventScroll: true });
  }

  function unlockNextStage(completedStage) {
    const stage = clamp(Math.floor(Number(completedStage) || 1), 1, CONFIG.sector.encountersPerSector);
    const nextStage = Math.min(CONFIG.sector.encountersPerSector, stage + 1);
    progress.maxUnlockedStage = Math.max(progress.maxUnlockedStage, nextStage);
    progress.lastPlayedStage = nextStage;
    saveProgress();
    updateProgressUI();
  }

  function toggleSound() {
    settings.sound = !settings.sound;
    audio.setEnabled(settings.sound);
    if (settings.sound) audio.ensure();
    saveLocal();
    updateSettingsUI();
  }

  function toggleEffects() {
    settings.reducedEffects = !settings.reducedEffects;
    if (settings.reducedEffects && state.effects.length > CONFIG.caps.reducedParticles) {
      state.effects.splice(0, state.effects.length - CONFIG.caps.reducedParticles);
    }
    saveLocal();
    updateSettingsUI();
  }

  function toggleFullscreen() {
    const document = global.document;
    try {
      const result = document.fullscreenElement && document.exitFullscreen ? document.exitFullscreen() :
        document.documentElement.requestFullscreen ? document.documentElement.requestFullscreen() : null;
      if (result && typeof result.catch === "function") result.catch(() => {});
      requestLandscapeLock();
    } catch {
      // Fullscreen is optional and may be denied when the file is opened locally.
    }
  }

  function bindButton(id, action) {
    const button = byId(id);
    if (button) button.addEventListener("click", (event) => {
      if (orientationBlocked) {
        event.preventDefault();
        return;
      }
      action(event);
    });
  }

  bindButton("start-button", startNewRun);
  bindButton("continue-button", openStageSelect);
  bindButton("restart-button", startNewRun);
  bindButton("restart-pause-button", startNewRun);
  bindButton("resume-button", () => togglePause(false));
  bindButton("pause-button", () => togglePause());
  bindButton("pause-menu-button", returnToMenu);
  bindButton("menu-button", returnToMenu);
  bindButton("controls-button", () => openDialog(dom.controlsModal));
  bindButton("pause-controls-button", () => openDialog(dom.controlsModal));
  bindButton("settings-button", () => openDialog(dom.settingsModal));
  bindButton("pause-settings-button", () => openDialog(dom.settingsModal));
  bindButton("controls-close-button", () => closeDialog(dom.controlsModal));
  bindButton("settings-close-button", () => closeDialog(dom.settingsModal));
  bindButton("stage-select-close-button", () => closeDialog(dom.stageSelectModal));
  bindButton("sound-button", toggleSound);
  bindButton("settings-sound-button", toggleSound);
  bindButton("motion-button", toggleEffects);
  bindButton("settings-effects-button", toggleEffects);
  bindButton("fullscreen-button", toggleFullscreen);
  bindButton("settings-fullscreen-button", toggleFullscreen);
  function bindTouchAction(id, action) {
    const button = byId(id);
    if (!button) return;
    let touchActivation = false;
    button.addEventListener("pointerdown", (event) => {
      noteTouchInteraction(event);
      if (orientationBlocked || event.pointerType !== "touch") return;
      touchActivation = true;
      action();
      event.preventDefault();
    }, { passive: false });
    button.addEventListener("click", (event) => {
      if (orientationBlocked) {
        event.preventDefault();
        return;
      }
      if (touchActivation) {
        touchActivation = false;
        event.preventDefault();
        return;
      }
      action();
    });
    button.addEventListener("pointercancel", () => { touchActivation = false; });
  }

  bindTouchAction("touch-dash", () => { input.pressed.dash = true; });
  bindTouchAction("touch-pulse", () => { input.pressed.pulse = true; });

  function normalizeKey(event) {
    if (event.code === "Space") return "space";
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") return "shift";
    return event.key.toLowerCase();
  }

  function resetTransientInput() {
    for (const key of Object.keys(input.keys)) delete input.keys[key];
    for (const key of Object.keys(input.pressed)) delete input.pressed[key];
    input.pointerFire = false;
    input.touchMoveX = 0;
    input.touchMoveY = 0;
    input.touchAimX = 0;
    input.touchAimY = 0;
    input.touchFire = false;
    input.gamepadMoveX = 0;
    input.gamepadMoveY = 0;
    input.gamepadAimX = 0;
    input.gamepadAimY = 0;
    input.gamepadFire = false;
    input.lastGamepadButtons = [];
    clearTouchSticks();
  }

  function resetBlockedInput() {
    const heldGamepadButtons = input.lastGamepadButtons;
    resetTransientInput();
    input.lastGamepadButtons = heldGamepadButtons;
  }

  global.addEventListener("keydown", (event) => {
    const key = normalizeKey(event);
    if (orientationBlocked) {
      resetBlockedInput();
      event.preventDefault();
      return;
    }
    if (!input.keys[key]) input.pressed[key] = true;
    input.keys[key] = true;
    if (["space", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
    const dialogOpen = Boolean(dom.controlsModal && dom.controlsModal.open || dom.settingsModal && dom.settingsModal.open);
    if ((key === "p" || key === "escape") && !dialogOpen && !event.repeat && (state.mode === "playing" || state.mode === "transition" || state.mode === "paused")) {
      event.preventDefault();
      togglePause();
    }
    if (key === "m" && !event.repeat) toggleSound();
  }, { passive: false });

  global.addEventListener("keyup", (event) => {
    const key = normalizeKey(event);
    if (orientationBlocked) {
      delete input.keys[key];
      delete input.pressed[key];
      return;
    }
    input.keys[key] = false;
  });

  canvas.addEventListener("pointermove", (event) => {
    if (orientationBlocked) return;
    if (event.pointerType === "touch") {
      handledTouchMoves.add(event);
      updateTouchStick(event);
      return;
    }
    const bounds = canvas.getBoundingClientRect();
    input.pointerX = event.clientX - bounds.left;
    input.pointerY = event.clientY - bounds.top;
    input.pointerActive = true;
  });
  canvas.addEventListener("pointerdown", (event) => {
    noteTouchInteraction(event);
    if (orientationBlocked) return;
    if (event.pointerType === "touch") {
      beginTouchStick(event);
      return;
    }
    audio.ensure();
    input.pointerFire = true;
    input.pointerActive = true;
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener("pointerup", (event) => {
    finishPointer(event);
  });
  canvas.addEventListener("pointercancel", (event) => {
    finishPointer(event);
  });
  canvas.addEventListener("lostpointercapture", (event) => {
    finishPointer(event);
  });
  canvas.addEventListener("pointerout", endInactivePointer);
  canvas.addEventListener("pointerleave", endInactivePointer);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  function shapeTouchVector(x, y, deadzone, curve, maxOutput) {
    const length = Math.min(1, Math.hypot(x, y));
    const threshold = clamp(Number(deadzone) || 0, 0, 0.95);
    if (length <= threshold || length <= 0.0001) return { x: 0, y: 0 };
    const exponent = Math.max(0.1, Number(curve) || 1);
    const maximum = clamp(Number(maxOutput) || 0, 0, 1);
    const magnitude = Math.pow((length - threshold) / (1 - threshold), exponent) * maximum;
    return { x: x / length * magnitude, y: y / length * magnitude };
  }

  function touchStickForPointer(pointerId) {
    if (touchSticks.move.activeId === pointerId) return touchSticks.move;
    if (touchSticks.aim.activeId === pointerId) return touchSticks.aim;
    return null;
  }

  function placeTouchStick(stick, clientX, clientY, canvasBounds) {
    if (!stick.zone) return;
    stick.zone.classList.add("is-engaged");
    stick.zone.style.setProperty("--stick-x", `${clientX - canvasBounds.left}px`);
    stick.zone.style.setProperty("--stick-y", `${clientY - canvasBounds.top}px`);
  }

  function resetTouchStickVisual(stick) {
    if (stick.knob) stick.knob.style.transform = "translate(-50%, -50%)";
    if (!stick.zone) return;
    stick.zone.classList.remove("is-engaged");
    stick.zone.style.removeProperty("--stick-x");
    stick.zone.style.removeProperty("--stick-y");
  }

  function writeTouchStick(stick, clientX, clientY) {
    const radius = Math.max(24, Number(CONFIG.mobileControls.stickRadius) || 46);
    const dx = clientX - stick.originX;
    const dy = clientY - stick.originY;
    const length = Math.hypot(dx, dy);
    const scale = length > radius ? radius / length : 1;
    const x = dx * scale;
    const y = dy * scale;
    if (stick.knob) {
      stick.knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    }
    if (stick.kind === "move") {
      const response = shapeTouchVector(
        x / radius,
        y / radius,
        CONFIG.mobileControls.moveDeadzone,
        CONFIG.mobileControls.moveCurve,
        CONFIG.mobileControls.moveMaxOutput
      );
      input.touchMoveX = response.x;
      input.touchMoveY = response.y;
      return;
    }
    const response = shapeTouchVector(
      x / radius,
      y / radius,
      CONFIG.mobileControls.aimDeadzone,
      CONFIG.mobileControls.aimCurve,
      CONFIG.mobileControls.aimMaxOutput
    );
    input.touchAimX = response.x;
    input.touchAimY = response.y;
    input.touchFire = Math.hypot(response.x, response.y) > CONFIG.mobileControls.aimFireThreshold;
  }

  function beginTouchStick(event) {
    if (!event || event.pointerType !== "touch" || orientationBlocked || state.mode !== "playing") return false;
    if (touchStickForPointer(event.pointerId)) return false;
    const bounds = canvas.getBoundingClientRect();
    const localX = event.clientX - bounds.left;
    const localY = event.clientY - bounds.top;
    if (localX < 0 || localY < 0 || localX > bounds.width || localY > bounds.height) return false;
    const stick = localX < bounds.width * 0.5 ? touchSticks.move : touchSticks.aim;
    if (stick.activeId !== null) return false;
    stick.activeId = event.pointerId;
    stick.originX = event.clientX;
    stick.originY = event.clientY;
    stick.captureTracked = false;
    if (stick.kind === "move") input.touchMoveX = input.touchMoveY = 0;
    else {
      input.touchAimX = input.touchAimY = 0;
      input.touchFire = false;
    }
    placeTouchStick(stick, event.clientX, event.clientY, bounds);
    try {
      canvas.setPointerCapture?.(event.pointerId);
      stick.captureTracked = typeof canvas.hasPointerCapture === "function" && canvas.hasPointerCapture(event.pointerId);
    } catch {
      // Global terminal listeners still release the stick when capture is unavailable.
    }
    audio.ensure();
    requestLandscapeLock();
    event.preventDefault();
    return true;
  }

  function updateTouchStick(event) {
    const stick = event && touchStickForPointer(event.pointerId);
    if (!stick || orientationBlocked || state.mode !== "playing") return false;
    writeTouchStick(stick, event.clientX, event.clientY);
    event.preventDefault?.();
    return true;
  }

  function clearTouchStick(stick) {
    const pointerId = stick.activeId;
    stick.activeId = null;
    stick.originX = 0;
    stick.originY = 0;
    stick.captureTracked = false;
    if (pointerId !== null && typeof canvas.releasePointerCapture === "function") {
      try {
        if (!canvas.hasPointerCapture || canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
      } catch {
        // The browser may have already released capture for this terminal event.
      }
    }
    resetTouchStickVisual(stick);
    if (stick.kind === "move") input.touchMoveX = input.touchMoveY = 0;
    else {
      input.touchAimX = input.touchAimY = 0;
      input.touchFire = false;
    }
  }

  function clearTouchSticks() {
    clearTouchStick(touchSticks.move);
    clearTouchStick(touchSticks.aim);
  }

  function endTouchStick(event) {
    const stick = event && touchStickForPointer(event.pointerId);
    if (!stick) return false;
    clearTouchStick(stick);
    return true;
  }

  function finishPointer(event) {
    if (endTouchStick(event)) return true;
    if (!event || event.pointerType !== "touch") input.pointerFire = false;
    return false;
  }

  function endInactivePointer(event) {
    if (event && event.buttons === 0) finishPointer(event);
  }

  function reconcileTouchCaptures() {
    if (typeof canvas.hasPointerCapture !== "function") return;
    for (const stick of [touchSticks.move, touchSticks.aim]) {
      if (stick.activeId === null || !stick.captureTracked) continue;
      try {
        if (!canvas.hasPointerCapture(stick.activeId)) clearTouchStick(stick);
      } catch {
        clearTouchStick(stick);
      }
    }
  }

  function clearEndedNativeTouches(event) {
    if (!event || !event.touches || event.touches.length !== 0) return;
    clearTouchSticks();
    input.pointerFire = false;
  }

  global.addEventListener("resize", () => {
    renderer.resize();
    if (state.arena.active) state.arena.radius = arenaRadius();
    if (state.combatField.active) resizeCombatField();
    updateOrientationState();
  });
  global.addEventListener("orientationchange", updateOrientationState);
  global.addEventListener("pointerdown", noteTouchInteraction, { capture: true, passive: true });
  global.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" && !handledTouchMoves.has(event)) updateTouchStick(event);
  }, { passive: false });
  global.addEventListener("pointerup", (event) => {
    finishPointer(event);
  }, { capture: true });
  global.addEventListener("pointercancel", (event) => {
    finishPointer(event);
  }, { capture: true });
  global.addEventListener("pointerout", endInactivePointer, { capture: true });
  global.addEventListener("pointerleave", endInactivePointer, { capture: true });
  global.document.addEventListener("touchend", clearEndedNativeTouches, { passive: true });
  global.document.addEventListener("touchcancel", () => {
    clearTouchSticks();
    input.pointerFire = false;
  }, { passive: true });
  global.document.addEventListener("fullscreenchange", updateSettingsUI);
  global.document.addEventListener("visibilitychange", () => {
    if (global.document.hidden && (state.mode === "playing" || state.mode === "transition")) {
      state.pausedByVisibility = true;
      togglePause(true);
    }
  });
  global.addEventListener("blur", () => {
    if (!touchCapable && (state.mode === "playing" || state.mode === "transition")) {
      state.pausedByVisibility = true;
      togglePause(true);
    } else if (touchCapable) {
      clearTouchSticks();
      input.pointerFire = false;
    }
  });
  global.addEventListener("pagehide", () => {
    if (state.mode === "playing" || state.mode === "transition") {
      state.pausedByVisibility = true;
      togglePause(true);
    } else clearTouchSticks();
  });
  global.document.addEventListener("freeze", () => {
    clearTouchSticks();
    input.pointerFire = false;
  });
  global.addEventListener("pageshow", (event) => {
    if (!event || event.persisted) {
      clearTouchSticks();
      input.pointerFire = false;
    }
  });

  function deadzone(value, edge) {
    const magnitude = Math.abs(value);
    if (magnitude <= edge) return 0;
    return Math.sign(value) * (magnitude - edge) / (1 - edge);
  }

  function pollGamepad() {
    if (!global.navigator || typeof global.navigator.getGamepads !== "function") return;
    const pads = global.navigator.getGamepads();
    const pad = pads && Array.from(pads).find(Boolean);
    if (!pad) {
      input.gamepadMoveX = input.gamepadMoveY = input.gamepadAimX = input.gamepadAimY = 0;
      input.gamepadFire = false;
      if (orientationBlocked) input.lastGamepadButtons = [];
      return;
    }
    const nowButtons = pad.buttons.map((button) => Boolean(button.pressed));
    if (orientationBlocked) {
      input.gamepadMoveX = input.gamepadMoveY = input.gamepadAimX = input.gamepadAimY = 0;
      input.gamepadFire = false;
      for (const key of Object.keys(input.pressed)) delete input.pressed[key];
      input.lastGamepadButtons = nowButtons;
      return;
    }
    input.gamepadMoveX = deadzone(pad.axes[0] || 0, 0.16);
    input.gamepadMoveY = deadzone(pad.axes[1] || 0, 0.16);
    input.gamepadAimX = deadzone(pad.axes[2] || 0, 0.19);
    input.gamepadAimY = deadzone(pad.axes[3] || 0, 0.19);
    input.gamepadFire = Boolean(pad.buttons[0] && pad.buttons[0].pressed) || Math.abs(input.gamepadAimX) + Math.abs(input.gamepadAimY) > 0.32;
    if (nowButtons[1] && !input.lastGamepadButtons[1]) input.pressed.dash = true;
    if (nowButtons[2] && !input.lastGamepadButtons[2]) input.pressed.pulse = true;
    if (nowButtons[9] && !input.lastGamepadButtons[9] && (state.mode === "playing" || state.mode === "transition" || state.mode === "paused")) togglePause();
    input.lastGamepadButtons = nowButtons;
  }

  function arenaRadius() {
    const shortSide = Math.min(renderer.width, renderer.height);
    const desired = clamp(shortSide * CONFIG.bossArena.radiusViewportRatio, CONFIG.bossArena.minRadius, CONFIG.bossArena.maxRadius);
    const viewportCap = Math.max(CONFIG.bossArena.boundaryPadding + 8, shortSide * 0.5 - CONFIG.bossArena.viewportMargin);
    return Math.min(desired, viewportCap);
  }

  function resizeCombatField() {
    const field = state.combatField;
    field.halfWidth = Math.max(CONFIG.combatField.minHalfWidth, renderer.width * CONFIG.combatField.halfWidthViewportRatio);
    field.halfHeight = Math.max(CONFIG.combatField.minHalfHeight, renderer.height * CONFIG.combatField.halfHeightViewportRatio);
    if (!state.ship || !field.active) return;
    field.halfWidth = Math.max(field.halfWidth, Math.abs(state.ship.x - field.x) + state.ship.radius);
    field.halfHeight = Math.max(field.halfHeight, Math.abs(state.ship.y - field.y) + state.ship.radius);
  }

  function openCombatField() {
    const field = state.combatField;
    const ship = state.ship;
    field.active = true;
    field.x = state.camera.x;
    field.y = state.camera.y;
    resizeCombatField();
    // A carried hyperspace anchor can be slightly wider than the default
    // rectangle after leaving the circular boss arena. The shared resize path
    // grows this field around the camera instead of moving the ship.
    ship.x = clamp(ship.x, field.x - field.halfWidth + ship.radius, field.x + field.halfWidth - ship.radius);
    ship.y = clamp(ship.y, field.y - field.halfHeight + ship.radius, field.y + field.halfHeight - ship.radius);
  }

  function beginEncounter() {
    const spec = CONFIG.sector.encounters[state.encounter - 1];
    const isBoss = spec.id === "boss";
    if (isBoss) state.combatField.active = false;
    else openCombatField();
    state.encounterData = {
      spec,
      generation: `${state.sector}:${state.encounter}:${state.runTime.toFixed(2)}`,
      timer: 0,
      complete: false,
      guaranteedGranted: false,
      goalType: spec.goal ? spec.goal.type : spec.completion,
      goalTarget: isBoss ? 1 : spec.waves.length,
      goalProgress: 0,
      waveIndex: isBoss ? -1 : 0,
      waveNumber: isBoss ? 0 : 1,
      waveCount: isBoss ? 0 : spec.waves.length,
      waveLabel: isBoss ? "CAPITAL SHIP" : spec.waves[0].label,
      waveDelay: 0,
      waveSpawned: false,
      waveRequiredTotal: 0,
      waveRequiredCleared: 0,
      stageRequiredTotal: 0,
      stageRequiredCleared: 0,
      pendingSpawns: [],
      requeue: [],
      playerKills: 0,
      environmentalKills: 0,
      lastDeathCause: null,
      bossDefeated: false,
      killsSincePowerup: 0
    };
    announce(isBoss ? "Alien capital ship — arena forming" : spec.label, isBoss ? 2.6 : 1.5);
    if (isBoss) beginBossWarning();
    else spawnWave(0);
    updateUI(true);
  }

  function beginBossWarning() {
    for (const name of THREAT_ARRAYS) {
      for (const entity of state[name]) entity.dead = true;
    }
    state.enemyBullets.length = 0;
    state.mines.length = 0;
    state.arena.active = true;
    state.arena.locked = false;
    state.arena.warning = CONFIG.bossArena.warningSeconds;
    state.arena.x = state.ship.x;
    state.arena.y = state.ship.y;
    state.arena.radius = arenaRadius();
    state.ship.invulnerable = Math.max(state.ship.invulnerable, CONFIG.bossArena.entryInvulnerability);
    audio.bossCue();
  }

  function readMovement() {
    let x = (input.keys.d || input.keys.arrowright ? 1 : 0) - (input.keys.a || input.keys.arrowleft ? 1 : 0);
    let y = (input.keys.s || input.keys.arrowdown ? 1 : 0) - (input.keys.w || input.keys.arrowup ? 1 : 0);
    const touchMoveOwned = !touchCapable || touchSticks.move.activeId !== null;
    x += (touchMoveOwned ? input.touchMoveX : 0) + input.gamepadMoveX;
    y += (touchMoveOwned ? input.touchMoveY : 0) + input.gamepadMoveY;
    const length = Math.hypot(x, y);
    return length > 1 ? { x: x / length, y: y / length } : { x, y };
  }

  function readAim(ship) {
    const touchAimOwned = !touchCapable || touchSticks.aim.activeId !== null;
    const touchLength = touchAimOwned ? Math.hypot(input.touchAimX, input.touchAimY) : 0;
    if (touchLength > TOUCH_INPUT_EPSILON) {
      const angle = Math.atan2(input.touchAimY, input.touchAimX);
      state.aimWorld.x = ship.x + Math.cos(angle) * 400;
      state.aimWorld.y = ship.y + Math.sin(angle) * 400;
      return angle;
    }
    let x = (input.keys.l ? 1 : 0) - (input.keys.j ? 1 : 0) + input.gamepadAimX;
    let y = (input.keys.k ? 1 : 0) - (input.keys.i ? 1 : 0) + input.gamepadAimY;
    if (Math.hypot(x, y) > 0.14) {
      const angle = Math.atan2(y, x);
      state.aimWorld.x = ship.x + Math.cos(angle) * 400;
      state.aimWorld.y = ship.y + Math.sin(angle) * 400;
      return angle;
    }
    if (input.pointerActive) {
      state.aimWorld.x = input.pointerX - renderer.width / 2 + state.camera.x;
      state.aimWorld.y = input.pointerY - renderer.height / 2 + state.camera.y;
      return Math.atan2(state.aimWorld.y - ship.y, state.aimWorld.x - ship.x);
    }
    state.aimWorld.x = ship.x + Math.cos(ship.angle) * 400;
    state.aimWorld.y = ship.y + Math.sin(ship.angle) * 400;
    return ship.angle;
  }

  function shouldFire() {
    const touchFire = touchSticks.aim.activeId !== null &&
      Math.hypot(input.touchAimX, input.touchAimY) > CONFIG.mobileControls.aimFireThreshold;
    return Boolean(input.keys.space || input.pointerFire || touchFire || input.gamepadFire);
  }

  function constrainShipToCombatField(ship) {
    const field = state.combatField;
    if (!field.active || state.arena.active) return;
    const bounce = CONFIG.combatField.boundaryBounce;
    const left = field.x - field.halfWidth + ship.radius;
    const right = field.x + field.halfWidth - ship.radius;
    const top = field.y - field.halfHeight + ship.radius;
    const bottom = field.y + field.halfHeight - ship.radius;
    if (ship.x < left) {
      ship.x = left;
      if (ship.vx < 0) ship.vx = -ship.vx * bounce;
    } else if (ship.x > right) {
      ship.x = right;
      if (ship.vx > 0) ship.vx = -ship.vx * bounce;
    }
    if (ship.y < top) {
      ship.y = top;
      if (ship.vy < 0) ship.vy = -ship.vy * bounce;
    } else if (ship.y > bottom) {
      ship.y = bottom;
      if (ship.vy > 0) ship.vy = -ship.vy * bounce;
    }
  }

  function updateShip(dt) {
    const ship = state.ship;
    const move = readMovement();
    const aim = readAim(ship);
    const touchAimMagnitude = touchSticks.aim.activeId !== null || !touchCapable ?
      Math.hypot(input.touchAimX, input.touchAimY) : 0;
    if (touchAimMagnitude > TOUCH_INPUT_EPSILON) {
      const turnScale = clamp(touchAimMagnitude / Math.max(TOUCH_INPUT_EPSILON, CONFIG.mobileControls.aimMaxOutput), 0, 1);
      const maximumTurn = CONFIG.mobileControls.aimTurnRate * turnScale * dt;
      const turn = clamp(Core.angleDelta(ship.angle, aim), -maximumTurn, maximumTurn);
      ship.angle += turn;
      state.aimWorld.x = ship.x + Math.cos(ship.angle) * 400;
      state.aimWorld.y = ship.y + Math.sin(ship.angle) * 400;
    } else {
      ship.angle = aim;
    }
    ship.invulnerable = Math.max(0, ship.invulnerable - dt);
    ship.dashCooldown = Math.max(0, ship.dashCooldown - dt);
    ship.dashTime = Math.max(0, ship.dashTime - dt);
    ship.rapidTimer = Math.max(0, ship.rapidTimer - dt);
    ship.triShotTimer = Math.max(0, ship.triShotTimer - dt);
    ship.piercingTimer = Math.max(0, ship.piercingTimer - dt);
    ship.arcBurstTimer = Math.max(0, ship.arcBurstTimer - dt);
    ship.novaLanceTimer = Math.max(0, ship.novaLanceTimer - dt);
    ship.pulse = clamp(ship.pulse + dt * CONFIG.voidPulse.rechargePerSecond, 0, 100);

    if ((input.pressed.shift || input.pressed.dash) && ship.dashCooldown <= 0) {
      const dashAngle = Math.hypot(move.x, move.y) > 0.1 ? Math.atan2(move.y, move.x) : ship.angle;
      ship.vx = Math.cos(dashAngle) * CONFIG.world.playerDashSpeed;
      ship.vy = Math.sin(dashAngle) * CONFIG.world.playerDashSpeed;
      ship.dashTime = 0.19;
      ship.dashCooldown = 1.05;
      ship.invulnerable = Math.max(ship.invulnerable, 0.27);
      state.shake = Math.max(state.shake, 4);
      burst(ship.x, ship.y, "#ff58da", 9, 1.1);
      audio.dash();
    }

    if ((input.pressed.e || input.pressed.pulse) && ship.pulse >= CONFIG.voidPulse.activationThreshold) activatePulse();
    if (state.mode !== "playing") return;

    if (ship.dashTime <= 0) {
      const acceleration = CONFIG.world.playerAcceleration;
      ship.vx += move.x * acceleration * dt;
      ship.vy += move.y * acceleration * dt;
      const drag = Math.exp(-CONFIG.world.playerDrag * dt);
      ship.vx *= drag;
      ship.vy *= drag;
      const speed = Math.hypot(ship.vx, ship.vy);
      if (speed > CONFIG.world.playerMaxSpeed) {
        ship.vx = ship.vx / speed * CONFIG.world.playerMaxSpeed;
        ship.vy = ship.vy / speed * CONFIG.world.playerMaxSpeed;
      }
    }

    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    ship.engine = clamp(Math.hypot(move.x, move.y) + (ship.dashTime > 0 ? 0.8 : 0), 0, 1.6);
    if (state.arena.active && state.arena.locked) {
      Core.constrainToCircle(ship, state.arena.x, state.arena.y, state.arena.radius - CONFIG.bossArena.boundaryPadding, 0.1);
    } else constrainShipToCombatField(ship);
    if (!input.pointerActive) {
      state.aimWorld.x = ship.x + Math.cos(ship.angle) * 400;
      state.aimWorld.y = ship.y + Math.sin(ship.angle) * 400;
    }
    if (shouldFire()) fireModules(dt);
    else tickWeaponTimers(dt);
    updateDrones(dt);
    updatePassiveModules(dt);
  }

  function tickWeaponTimers(dt) {
    const timers = state.ship.weaponTimers;
    for (const id of MODULE_ORDER) {
      if (CONFIG.weapons.modules[id].activation !== "autonomous") {
        timers[id] = Math.max(0, (timers[id] || 0) - dt);
      }
    }
  }

  function fireModules(dt) {
    const ship = state.ship;
    const rapid = ship.rapidTimer > 0 ? CONFIG.powerups.rapid.cooldownMultiplier : 1;
    for (const id of MODULE_ORDER) {
      const tier = ship.modules[id] || 0;
      const definition = CONFIG.weapons.modules[id];
      if (!tier || definition.activation === "autonomous") continue;
      ship.weaponTimers[id] = Math.max(0, (ship.weaponTimers[id] || 0) - dt);
      if (ship.weaponTimers[id] > 0) continue;
      const values = definition.tiers[tier - 1];
      ship.weaponTimers[id] = values.cooldown * rapid;
      const baseCount = values.projectiles || 1;
      const count = ship.triShotTimer > 0 ? Math.max(3, baseCount + CONFIG.powerups.triShot.extraProjectiles) : baseCount;
      const spreadWidth = ship.triShotTimer > 0 ? Math.max(values.spread || 0, CONFIG.powerups.triShot.minimumSpread) : (values.spread || 0);
      for (let index = 0; index < count; index += 1) {
        const spread = count === 1 ? 0 : ((index / (count - 1)) - 0.5) * spreadWidth;
        spawnPlayerBullet(id, ship.x + Math.cos(ship.angle) * 23, ship.y + Math.sin(ship.angle) * 23, ship.angle + spread, values);
      }
      audio.shoot(id === "massDriver" ? "rail" : id === "prism" ? "scatter" : id === "seeker" ? "plasma" : "pulse");
    }
    fireTemporaryWeapons(dt);
  }

  function fireTemporaryWeapons(dt) {
    const ship = state.ship;
    if (ship.arcBurstTimer > 0) {
      ship.weaponTimers.arcBurst = Math.max(0, (ship.weaponTimers.arcBurst || 0) - dt);
      if (ship.weaponTimers.arcBurst <= 0) {
        const values = CONFIG.powerups.arcBurst;
        ship.weaponTimers.arcBurst = values.cooldown;
        for (let index = 0; index < values.projectiles; index += 1) {
          const offset = values.projectiles === 1 ? 0 : (index / (values.projectiles - 1) - 0.5) * values.spread;
          spawnTemporaryBullet("arc", ship.angle + offset, values);
        }
        audio.shoot("scatter");
      }
    }
    if (ship.novaLanceTimer > 0) {
      ship.weaponTimers.novaLance = Math.max(0, (ship.weaponTimers.novaLance || 0) - dt);
      if (ship.weaponTimers.novaLance <= 0) {
        const values = CONFIG.powerups.novaLance;
        ship.weaponTimers.novaLance = values.cooldown;
        spawnTemporaryBullet("lance", ship.angle, values);
        audio.shoot("rail");
      }
    }
  }

  function spawnTemporaryBullet(kind, angle, values) {
    if (state.playerBullets.length >= CONFIG.caps.playerProjectiles) return null;
    const ship = state.ship;
    const x = ship.x + Math.cos(angle) * 23;
    const y = ship.y + Math.sin(angle) * 23;
    const bullet = {
      id: nextEntityId++, x, y, px: x, py: y,
      vx: Math.cos(angle) * values.speed,
      vy: Math.sin(angle) * values.speed,
      radius: kind === "lance" ? 4 : 3,
      damage: values.damage,
      life: values.life,
      maxLife: values.life,
      kind,
      color: values.color,
      pierce: values.pierce || 0,
      turnRate: 0,
      blastRadius: 0,
      droneShot: false,
      hits: [],
      dead: false
    };
    state.playerBullets.push(bullet);
    return bullet;
  }

  function spawnPlayerBullet(moduleId, x, y, angle, values, droneShot) {
    if (state.playerBullets.length >= CONFIG.caps.playerProjectiles) return null;
    const definition = CONFIG.weapons.modules[moduleId] || CONFIG.weapons.modules.drone;
    const kind = moduleId === "massDriver" ? "rail" : moduleId === "seeker" ? "missile" : definition.projectileType;
    const bullet = {
      id: nextEntityId++,
      x, y, px: x, py: y,
      vx: Math.cos(angle) * values.speed,
      vy: Math.sin(angle) * values.speed,
      radius: kind === "missile" ? 4 : kind === "rail" ? 3.5 : 2.5,
      damage: values.damage,
      life: values.life,
      maxLife: values.life,
      kind,
      color: definition.color,
      pierce: (values.pierce || 0) + (state.ship.piercingTimer > 0 ? CONFIG.powerups.piercing.bonusPierce : 0),
      turnRate: values.turnRate || 0,
      blastRadius: values.blastRadius || 0,
      droneShot: Boolean(droneShot),
      hits: [],
      dead: false
    };
    state.playerBullets.push(bullet);
    return bullet;
  }

  function updateDrones(dt) {
    const ship = state.ship;
    const tier = ship.modules.drone || 0;
    const desired = tier ? CONFIG.weapons.modules.drone.tiers[tier - 1].drones : 0;
    while (ship.drones.length < desired) ship.drones.push({ x: ship.x, y: ship.y, angle: 0, cooldown: rng.range(0, 0.5) });
    if (ship.drones.length > desired) ship.drones.length = desired;
    if (!tier) return;
    const values = CONFIG.weapons.modules.drone.tiers[tier - 1];
    for (let index = 0; index < ship.drones.length; index += 1) {
      const drone = ship.drones[index];
      const orbit = state.time * 1.4 + index / ship.drones.length * TAU;
      drone.x = ship.x + Math.cos(orbit) * values.orbitRadius;
      drone.y = ship.y + Math.sin(orbit) * values.orbitRadius;
      drone.cooldown -= dt;
      const target = nearestTarget(drone.x, drone.y, 680);
      if (target) {
        drone.angle = Math.atan2(target.y - drone.y, target.x - drone.x);
        if (drone.cooldown <= 0) {
          drone.cooldown = values.cooldown;
          spawnPlayerBullet("drone", drone.x, drone.y, drone.angle, values, true);
        }
      } else {
        drone.angle = orbit + Math.PI / 2;
      }
    }
  }

  function updatePassiveModules(dt) {
    const ship = state.ship;
    for (const id of ["homingSalvo", "radialArray"]) {
      const tier = ship.modules[id] || 0;
      if (!tier) continue;
      const definition = CONFIG.weapons.modules[id];
      const values = definition.tiers[tier - 1];
      ship.weaponTimers[id] = Math.max(0, (ship.weaponTimers[id] || 0) - dt);
      if (ship.weaponTimers[id] > 0) continue;
      const target = nearestTarget(ship.x, ship.y, values.range);
      if (!target) continue;
      ship.weaponTimers[id] = values.cooldown;
      if (id === "homingSalvo") {
        const targetAngle = Math.atan2(target.y - ship.y, target.x - ship.x);
        for (let index = 0; index < values.projectiles; index += 1) {
          const offset = values.projectiles === 1 ? 0 : (index / (values.projectiles - 1) - 0.5) * 0.16;
          const angle = targetAngle + offset;
          spawnPlayerBullet(id, ship.x + Math.cos(angle) * 23, ship.y + Math.sin(angle) * 23, angle, values, false);
        }
        audio.shoot("plasma");
      } else {
        for (let index = 0; index < values.projectiles; index += 1) {
          const angle = ship.angle + index / values.projectiles * TAU;
          spawnPlayerBullet(id, ship.x + Math.cos(angle) * 19, ship.y + Math.sin(angle) * 19, angle, values, false);
        }
        audio.shoot("scatter");
      }
    }
  }

  function activatePulse() {
    const ship = state.ship;
    ship.pulse = 0;
    const values = CONFIG.voidPulse;
    const radius = values.radius;
    const radiusSquared = radius * radius;
    if (values.clearEnemyProjectiles) {
      for (const bullet of state.enemyBullets) {
        if (distanceSquared(ship.x, ship.y, bullet.x, bullet.y) <= radiusSquared) bullet.dead = true;
      }
    }
    if (values.clearMines) {
      for (const mine of state.mines) {
        if (distanceSquared(ship.x, ship.y, mine.x, mine.y) <= radiusSquared) mine.dead = true;
      }
    }
    for (const asteroid of state.asteroids) {
      if (distanceSquared(ship.x, ship.y, asteroid.x, asteroid.y) <= radiusSquared) damageThreat(asteroid, values.asteroidDamage, null);
    }
    for (const alien of state.aliens) {
      if (distanceSquared(ship.x, ship.y, alien.x, alien.y) <= radiusSquared) damageThreat(alien, values.alienDamage, null);
    }
    if (state.boss && distanceSquared(ship.x, ship.y, state.boss.x, state.boss.y) <= radiusSquared) damageBoss(values.bossDamage);
    addRing(ship.x, ship.y, "#ff58df", 8, 0.75, radius);
    burst(ship.x, ship.y, "#81fbff", settings.reducedEffects ? 18 : 42, 1.8);
    state.shake = Math.max(state.shake, 12);
    state.flash = Math.max(state.flash, 0.6);
    state.flashColor = "#b35cff";
    audio.pulse();
  }

  function spawnPosition(minFactor, maxFactor, threatRadius) {
    const field = state.combatField;
    if (field.active && !state.arena.active) {
      const radius = Math.max(0, Number(threatRadius) || 0);
      const inset = radius + CONFIG.combatField.threatBoundaryPadding;
      const rangeX = Math.max(0, field.halfWidth - inset) * CONFIG.combatField.spawnEdgeSpan;
      const rangeY = Math.max(0, field.halfHeight - inset) * CONFIG.combatField.spawnEdgeSpan;
      const candidates = [
        { x: -rangeX, y: -rangeY },
        { x: rangeX, y: -rangeY },
        { x: rangeX, y: rangeY },
        { x: -rangeX, y: rangeY }
      ];
      const count = Math.max(4, Math.floor(CONFIG.combatField.spawnCandidateCount));
      const perimeterCount = Math.max(1, count - candidates.length);
      const perimeter = Math.max(1, 4 * (rangeX + rangeY));
      const offset = rng.range(0, 1);
      for (let index = 0; candidates.length < count; index += 1) {
        let distance = ((index + offset) / perimeterCount % 1) * perimeter;
        if (distance < rangeX * 2) candidates.push({ x: -rangeX + distance, y: -rangeY });
        else if ((distance -= rangeX * 2) < rangeY * 2) candidates.push({ x: rangeX, y: -rangeY + distance });
        else if ((distance -= rangeY * 2) < rangeX * 2) candidates.push({ x: rangeX - distance, y: rangeY });
        else {
          distance -= rangeX * 2;
          candidates.push({ x: -rangeX, y: rangeY - distance });
        }
      }
      const threats = [];
      for (const name of THREAT_ARRAYS) {
        for (const entity of state[name]) if (!entity.dead) threats.push(entity);
      }
      let best = null;
      for (const candidate of candidates) {
        const x = field.x + candidate.x;
        const y = field.y + candidate.y;
        const shipSurface = Math.hypot(x - state.ship.x, y - state.ship.y) - state.ship.radius - radius;
        let threatSurface = Infinity;
        for (const entity of threats) {
          threatSurface = Math.min(threatSurface, Math.hypot(x - entity.x, y - entity.y) - radius - entity.radius);
        }
        const shipSafe = shipSurface >= CONFIG.combatField.spawnShipClearance;
        const threatSafe = threatSurface >= CONFIG.combatField.spawnThreatClearance;
        const safetyRank = shipSafe ? threatSafe ? 3 : 2 : threatSafe ? 1 : 0;
        const score = safetyRank * 100000 + Math.min(1000, shipSurface) + Math.min(1000, threatSurface) * 0.35;
        if (!best || score > best.score) best = { x, y, score, safe: shipSafe && threatSafe };
      }
      if (!best || !best.safe) return null;
      return {
        x: best.x,
        y: best.y,
        angle: Math.atan2(best.y - state.ship.y, best.x - state.ship.x)
      };
    }
    const diagonal = Math.hypot(renderer.width, renderer.height);
    const minimum = Math.max(CONFIG.world.spawnSafetyRadius, diagonal * (minFactor || CONFIG.culling.spawnMinViewports));
    const maximum = Math.max(minimum + 20, diagonal * (maxFactor || CONFIG.culling.spawnMaxViewports));
    const angle = rng.range(0, TAU);
    const radius = rng.range(minimum, maximum);
    return {
      x: state.ship.x + Math.cos(angle) * radius,
      y: state.ship.y + Math.sin(angle) * radius,
      angle
    };
  }

  function applySpawnClearance(position, radius) {
    const ship = state.ship;
    if (!ship || !position) return position;
    const dx = position.x - ship.x;
    const dy = position.y - ship.y;
    const distance = Math.hypot(dx, dy);
    const contactClearance = ship.radius + Math.max(0, radius || 0) + CONFIG.combatField.spawnShipClearance;
    const minimum = state.combatField.active ? contactClearance : Math.max(CONFIG.world.spawnSafetyRadius, contactClearance);
    if (distance >= minimum) return position;
    const angle = distance > 0.001 ? Math.atan2(dy, dx) :
      Number.isFinite(position.angle) ? position.angle : rng.range(0, TAU);
    position.x = ship.x + Math.cos(angle) * minimum;
    position.y = ship.y + Math.sin(angle) * minimum;
    position.angle = angle;
    return position;
  }

  function constrainThreatToCombatField(entity) {
    const field = state.combatField;
    if (!field.active || state.arena.active) return;
    const escapeMargin = Math.max(renderer.width, renderer.height) * 0.75;
    if (Math.abs(entity.x - field.x) > field.halfWidth + escapeMargin ||
        Math.abs(entity.y - field.y) > field.halfHeight + escapeMargin) return;
    const inset = Math.max(0, entity.radius || 0) + CONFIG.combatField.threatBoundaryPadding;
    const rangeX = Math.max(0, field.halfWidth - inset);
    const rangeY = Math.max(0, field.halfHeight - inset);
    const left = field.x - rangeX;
    const right = field.x + rangeX;
    const top = field.y - rangeY;
    const bottom = field.y + rangeY;
    const bounce = CONFIG.combatField.threatBoundaryBounce;
    if (entity.x < left) {
      entity.x = left;
      if (entity.vx < 0) entity.vx = -entity.vx * bounce;
    } else if (entity.x > right) {
      entity.x = right;
      if (entity.vx > 0) entity.vx = -entity.vx * bounce;
    }
    if (entity.y < top) {
      entity.y = top;
      if (entity.vy < 0) entity.vy = -entity.vy * bounce;
    } else if (entity.y > bottom) {
      entity.y = bottom;
      if (entity.vy > 0) entity.vy = -entity.vy * bounce;
    }
  }

  function makeAsteroidPoints(radius, count) {
    const points = [];
    const total = count || clamp(Math.round(radius / 8), 8, 16);
    for (let index = 0; index < total; index += 1) {
      points.push({
        angle: index / total * TAU,
        radius: radius * rng.range(0.76, 1.04)
      });
    }
    return points;
  }

  function safeAutomaticRadius(radius) {
    const field = state.combatField;
    if (!field.active || state.arena.active) return radius;
    const minimum = Math.min(radius, CONFIG.combatField.spawnMinimumRadius);
    const clearance = CONFIG.combatField.spawnShipClearance;
    const padding = CONFIG.combatField.threatBoundaryPadding;
    const span = CONFIG.combatField.spawnEdgeSpan;
    const ship = state.ship;
    const surfaceAtCorner = (candidateRadius) => {
      const x = Math.max(0, field.halfWidth - candidateRadius - padding) * span;
      const y = Math.max(0, field.halfHeight - candidateRadius - padding) * span;
      return Math.hypot(x, y) - ship.radius - candidateRadius;
    };
    if (surfaceAtCorner(radius) >= clearance) return radius;
    let low = minimum;
    let high = radius;
    for (let iteration = 0; iteration < 18; iteration += 1) {
      const middle = (low + high) * 0.5;
      if (surfaceAtCorner(middle) >= clearance) low = middle;
      else high = middle;
    }
    return Math.min(radius, low);
  }

  function spawnAsteroid(kind, options) {
    const settingsValue = options || {};
    const definition = CONFIG.asteroids[kind] || CONFIG.asteroids.rock;
    if (state.asteroids.length >= CONFIG.caps.asteroids) return null;
    if (kind === "titan" && state.asteroids.some((item) => item.kind === "titan" && !item.dead)) return null;
    const automaticPosition = !Number.isFinite(settingsValue.x);
    const compactRadius = definition.compactRadius && Math.min(renderer.width, renderer.height) < 600 ? definition.compactRadius : definition.radius;
    const requestedRadius = Number(settingsValue.radius) || compactRadius;
    const radius = automaticPosition ? safeAutomaticRadius(requestedRadius) : requestedRadius;
    const position = automaticPosition ? spawnPosition(undefined, undefined, radius) : settingsValue;
    if (!position) return null;
    if (automaticPosition && !state.combatField.active) applySpawnClearance(position, radius);
    const targetAngle = Number.isFinite(settingsValue.velocityAngle) ? settingsValue.velocityAngle :
      Math.atan2(state.ship.y - position.y, state.ship.x - position.x) + rng.range(-0.52, 0.52);
    const baseSpeed = Number.isFinite(Number(settingsValue.speed)) ? Number(settingsValue.speed) : rng.range(definition.speed[0], definition.speed[1]);
    const scaledSpeed = baseSpeed * CONFIG.difficulty.speedScale(state.sector);
    const surfaceDistance = Math.max(0, Math.hypot(position.x - state.ship.x, position.y - state.ship.y) - state.ship.radius - radius);
    const safeSpeed = automaticPosition && state.combatField.active ? surfaceDistance / CONFIG.combatField.spawnMinimumContactSeconds : scaledSpeed;
    const speed = Math.min(scaledSpeed, safeSpeed);
    const healthScale = CONFIG.difficulty.healthScale(state.sector);
    const health = Number.isFinite(settingsValue.health) ? Math.max(0.01, settingsValue.health) :
      Math.max(1, definition.baseHealth * healthScale * (radius / definition.radius));
    const maxHealth = Number.isFinite(settingsValue.maxHealth) ? Math.max(health, settingsValue.maxHealth) : health;
    const asteroid = {
      id: nextEntityId++,
      x: position.x,
      y: position.y,
      vx: Math.cos(targetAngle) * speed,
      vy: Math.sin(targetAngle) * speed,
      cruiseSpeed: speed,
      radius,
      kind,
      health,
      maxHealth,
      damage: definition.contactDamage * CONFIG.difficulty.damageScale(state.sector),
      score: Number.isFinite(settingsValue.score) ? settingsValue.score : settingsValue.noScore ? 0 : definition.score,
      noDrops: Boolean(settingsValue.noDrops),
      threatCost: Number.isFinite(settingsValue.threatCost) ? settingsValue.threatCost : definition.threatCost,
      generation: settingsValue.generation || (state.encounterData && state.encounterData.generation),
      waveIndex: Number.isFinite(settingsValue.waveIndex) ? settingsValue.waveIndex : state.encounterData && state.encounterData.waveIndex,
      rotation: rng.range(0, TAU),
      rotationSpeed: rng.range(-0.65, 0.65) * (48 / Math.max(24, radius)),
      phase: rng.range(0, TAU),
      hitFlash: Math.max(0, Number(settingsValue.hitFlash) || 0),
      gateIndex: Math.max(0, Math.floor(Number(settingsValue.gateIndex) || 0)),
      points: makeAsteroidPoints(radius),
      fragment: Boolean(settingsValue.fragment),
      ballisticFragment: Boolean(settingsValue.ballisticFragment),
      splitRemaining: Number.isFinite(settingsValue.splitRemaining) ?
        Math.max(0, Math.floor(settingsValue.splitRemaining)) :
        definition.split ? Math.max(1, Math.floor(definition.split.generations || 1)) : 0,
      required: settingsValue.required !== false,
      collisionGrace: Math.max(0, Number.isFinite(settingsValue.collisionGrace) ? settingsValue.collisionGrace : automaticPosition ? CONFIG.combatField.spawnCollisionGraceSeconds : 0),
      dead: false
    };
    state.asteroids.push(asteroid);
    state.stats.spawned += 1;
    return asteroid;
  }

  function spawnAlien(type, options) {
    const settingsValue = options || {};
    const definition = CONFIG.aliens[type] || CONFIG.aliens.scout;
    if (state.aliens.length >= CONFIG.caps.aliens) return null;
    const automaticPosition = !Number.isFinite(settingsValue.x);
    const position = automaticPosition ? spawnPosition(0.75, 1.1, definition.radius) : settingsValue;
    if (!position) return null;
    if (automaticPosition && !state.combatField.active) applySpawnClearance(position, definition.radius);
    const health = Number.isFinite(settingsValue.health) ? Math.max(0.01, settingsValue.health) :
      definition.baseHealth * CONFIG.difficulty.healthScale(state.sector);
    const maxHealth = Number.isFinite(settingsValue.maxHealth) ? Math.max(health, settingsValue.maxHealth) : health;
    const alien = {
      id: nextEntityId++,
      x: position.x,
      y: position.y,
      vx: 0,
      vy: 0,
      radius: definition.radius,
      type,
      health,
      maxHealth,
      speed: definition.baseSpeed * CONFIG.difficulty.speedScale(state.sector),
      damage: definition.contactDamage * CONFIG.difficulty.damageScale(state.sector),
      score: Number.isFinite(settingsValue.score) ? settingsValue.score : definition.score,
      noDrops: Boolean(settingsValue.noDrops),
      threatCost: Number.isFinite(settingsValue.threatCost) ? settingsValue.threatCost : definition.threatCost,
      generation: settingsValue.generation || (state.encounterData && state.encounterData.generation),
      waveIndex: Number.isFinite(settingsValue.waveIndex) ? settingsValue.waveIndex : state.encounterData && state.encounterData.waveIndex,
      angle: Math.atan2(state.ship.y - position.y, state.ship.x - position.x),
      heading: Math.atan2(state.ship.y - position.y, state.ship.x - position.x),
      aimAngle: Math.atan2(state.ship.y - position.y, state.ship.x - position.x),
      orbitDirection: rng.chance(0.5) ? 1 : -1,
      cooldown: rng.range(0.35, definition.baseCooldown),
      state: "approach",
      stateTimer: 0,
      phase: rng.range(0, TAU),
      children: 0,
      parent: settingsValue.parent || null,
      required: settingsValue.required !== false,
      dead: false
    };
    state.aliens.push(alien);
    state.stats.spawned += 1;
    return alien;
  }

  function encounterLivingThreats() {
    const generation = state.encounterData && state.encounterData.generation;
    let total = 0;
    for (const name of THREAT_ARRAYS) {
      for (const entity of state[name]) {
        if (!entity.dead && entity.generation === generation) total += 1;
      }
    }
    return total;
  }

  function encounterThreatsRemaining() {
    const data = state.encounterData;
    if (!data) return 0;
    return encounterLivingThreats() + data.pendingSpawns.length + data.requeue.length;
  }

  function scaledGroupCount(group) {
    const root = Math.sqrt(Math.max(0, state.sector - 1));
    return Math.max(0, Math.min(group.cap || group.count, Math.floor(group.count + root * (group.sectorStep || 0))));
  }

  function buildWaveQueue(wave) {
    const queue = [];
    const add = (group, required) => {
      const count = scaledGroupCount(group);
      for (let index = 0; index < count; index += 1) {
        queue.push({
          family: group.family,
          kind: rng.pick(group.kinds),
          required,
          waveIndex: state.encounterData.waveIndex
        });
      }
    };
    for (const group of wave.required || []) add(group, true);
    for (const group of wave.hazards || []) add(group, false);
    return queue;
  }

  function spawnWave(index) {
    const data = state.encounterData;
    const wave = data && data.spec.waves && data.spec.waves[index];
    if (!wave) return false;
    data.waveIndex = index;
    data.waveNumber = index + 1;
    data.waveLabel = wave.label;
    data.waveSpawned = false;
    data.waveRequiredCleared = 0;
    data.pendingSpawns = buildWaveQueue(wave);
    data.waveRequiredTotal = data.pendingSpawns.filter((entry) => entry.required).length;
    data.stageRequiredTotal += data.waveRequiredTotal;
    data.waveDelay = 0;
    spawnPendingWave();
    announce(`Wave ${data.waveNumber}/${data.waveCount} — ${data.waveLabel}`, 1.25);
    return true;
  }

  function spawnQueuedThreat(entry) {
    const data = state.encounterData;
    if (!data || !entry) return null;
    const options = {
      generation: data.generation,
      required: entry.required,
      waveIndex: entry.waveIndex,
      health: entry.health,
      maxHealth: entry.maxHealth,
      radius: entry.radius,
      score: entry.score,
      noDrops: entry.noDrops,
      threatCost: entry.threatCost,
      fragment: entry.fragment,
      ballisticFragment: entry.ballisticFragment,
      splitRemaining: entry.splitRemaining,
      hitFlash: entry.hitFlash,
      collisionGrace: entry.collisionGrace,
      gateIndex: entry.gateIndex
    };
    return entry.family === "alien" ? spawnAlien(entry.kind, options) : spawnAsteroid(entry.kind, options);
  }

  function spawnPendingWave() {
    const data = state.encounterData;
    if (!data) return false;
    let spawned = false;
    while (data.requeue.length || data.pendingSpawns.length) {
      const fromRequeue = data.requeue.length > 0;
      const entry = fromRequeue ? data.requeue[0] : data.pendingSpawns[0];
      const entity = spawnQueuedThreat(entry);
      if (!entity) break;
      if (fromRequeue) data.requeue.shift();
      else data.pendingSpawns.shift();
      spawned = true;
    }
    data.waveSpawned = data.pendingSpawns.length === 0 && data.requeue.length === 0;
    return spawned;
  }

  function updateEncounter(dt) {
    const data = state.encounterData;
    if (!data) return;
    data.timer += dt;
    if (data.spec.id === "boss") {
      updateBossEncounter(dt);
      return;
    }

    if (!data.waveSpawned) {
      data.waveDelay -= dt;
      if (data.waveDelay <= 0) {
        const spawned = spawnPendingWave();
        data.waveDelay = spawned ? 0 : CONFIG.combatField.waveSpawnRetrySeconds;
      }
    }
    const waveClear = data.waveSpawned && data.waveRequiredCleared >= data.waveRequiredTotal && encounterThreatsRemaining() === 0;
    if (!waveClear) return;
    data.goalProgress = Math.max(data.goalProgress, data.waveNumber);
    if (data.waveIndex + 1 < data.waveCount) {
      data.waveDelay += dt;
      if (data.waveDelay >= CONFIG.combatField.interWaveSeconds) spawnWave(data.waveIndex + 1);
    } else if (!data.complete) {
      finishEncounter();
    }
  }

  function clearCombatWorld() {
    for (const name of THREAT_ARRAYS) state[name].length = 0;
    state.playerBullets.length = 0;
    state.enemyBullets.length = 0;
    state.mines.length = 0;
    state.pickups.length = 0;
    state.effects.length = 0;
    state.floaters.length = 0;
    if (state.ship) state.ship.drones.length = 0;
  }

  function startCinematic(message) {
    const nextEncounter = state.encounter < CONFIG.sector.encountersPerSector ? state.encounter + 1 : 1;
    const nextSector = state.encounter < CONFIG.sector.encountersPerSector ? state.sector : state.sector + 1;
    const ship = state.ship;
    let directionX = ship.vx;
    let directionY = ship.vy;
    let directionLength = Math.hypot(directionX, directionY);
    if (directionLength < 24) {
      directionX = state.aimWorld.x - ship.x;
      directionY = state.aimWorld.y - ship.y;
      directionLength = Math.hypot(directionX, directionY);
    }
    if (directionLength < 0.001) {
      directionX = CONFIG.cinematic.directionX;
      directionY = CONFIG.cinematic.directionY;
      directionLength = Math.hypot(directionX, directionY) || 1;
    }
    directionX /= directionLength;
    directionY /= directionLength;
    const anchorX = ship.x - state.camera.x;
    const anchorY = ship.y - state.camera.y;
    clearCombatWorld();
    resetTransientInput();
    state.boss = null;
    state.arena.active = false;
    state.arena.locked = false;
    state.arena.warning = 0;
    state.combatField.active = false;
    state.cinematic = {
      active: true,
      elapsed: 0,
      duration: CONFIG.cinematic.duration,
      progress: 0,
      directionX,
      directionY,
      speed: CONFIG.cinematic.speed,
      anchorX,
      anchorY,
      startX: ship.x,
      startY: ship.y,
      entryX: ship.x,
      entryY: ship.y,
      fromEncounter: state.encounter,
      toEncounter: nextEncounter,
      fromSector: state.sector,
      toSector: nextSector
    };
    ship.invulnerable = Math.max(ship.invulnerable, CONFIG.cinematic.duration + CONFIG.cinematic.exitInvulnerability);
    ship.vx = directionX * state.cinematic.speed;
    ship.vy = directionY * state.cinematic.speed;
    ship.angle = Math.atan2(directionY, directionX);
    ship.dashTime = 0;
    ship.engine = 1.6;
    setMode("transition");
    announce(message || "Stage clear", Math.min(1.45, CONFIG.cinematic.duration));
  }

  function finishEncounter(message) {
    const data = state.encounterData;
    if (!data || data.complete) return;
    data.complete = true;
    data.goalProgress = data.goalTarget;
    if (data.spec.guaranteedReward === "moduleUpgrade" && !data.guaranteedGranted) {
      data.guaranteedGranted = true;
      grantModuleUpgrade("ARMORY LINK");
    }
    if (campaignProgressEligible) unlockNextStage(state.encounter);
    state.score += Math.round(300 * state.sector * CONFIG.difficulty.scoreScale(state.sector));
    startCinematic(message || (data.spec.id === "titanGate" ? "Titan shattered" : "Stage clear"));
  }

  function advanceEncounter() {
    const cinematic = state.cinematic;
    const shipX = state.ship.x;
    const shipY = state.ship.y;
    const anchorX = cinematic.anchorX || 0;
    const anchorY = cinematic.anchorY || 0;
    clearCombatWorld();
    if (state.encounter < CONFIG.sector.encountersPerSector) {
      state.encounter += 1;
    } else {
      state.sector += 1;
      state.encounter = 1;
    }
    state.ship.x = shipX;
    state.ship.y = shipY;
    state.ship.vx = 0;
    state.ship.vy = 0;
    state.ship.angle = Math.atan2(cinematic.directionY, cinematic.directionX);
    state.ship.engine = 0;
    state.ship.dashTime = 0;
    state.ship.invulnerable = Math.max(state.ship.invulnerable, CONFIG.cinematic.exitInvulnerability);
    state.camera.x = shipX - anchorX;
    state.camera.y = shipY - anchorY;
    state.aimWorld.x = shipX + cinematic.directionX * 400;
    state.aimWorld.y = shipY + cinematic.directionY * 400;
    cinematic.entryX = shipX;
    cinematic.entryY = shipY;
    state.cinematic.active = false;
    state.cinematic.progress = 1;
    resetTransientInput();
    setMode("playing");
    beginEncounter();
  }

  function updateCinematic(dt) {
    const cinematic = state.cinematic;
    if (!cinematic.active) return;
    cinematic.elapsed = Math.min(cinematic.duration, cinematic.elapsed + dt);
    cinematic.progress = clamp(cinematic.elapsed / Math.max(CONFIG.world.fixedStep, cinematic.duration), 0, 1);
    const ship = state.ship;
    ship.vx = cinematic.directionX * cinematic.speed;
    ship.vy = cinematic.directionY * cinematic.speed;
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    state.camera.x = ship.x - (cinematic.anchorX || 0);
    state.camera.y = ship.y - (cinematic.anchorY || 0);
    ship.angle = Math.atan2(cinematic.directionY, cinematic.directionX);
    ship.engine = 1.6;
    ship.dashTime = 0;
    ship.invulnerable = cinematic.duration - cinematic.elapsed + CONFIG.cinematic.exitInvulnerability;
    state.aimWorld.x = ship.x + cinematic.directionX * 400;
    state.aimWorld.y = ship.y + cinematic.directionY * 400;
    if (cinematic.elapsed >= cinematic.duration) advanceEncounter();
  }

  function updateAsteroids(dt) {
    for (const asteroid of state.asteroids) {
      if (asteroid.dead) continue;
      asteroid.x += asteroid.vx * dt;
      asteroid.y += asteroid.vy * dt;
      asteroid.rotation += asteroid.rotationSpeed * dt;
      asteroid.hitFlash = Math.max(0, (asteroid.hitFlash || 0) - dt * 8);
      asteroid.collisionGrace = Math.max(0, (asteroid.collisionGrace || 0) - dt);
      if (state.arena.locked) Core.constrainToCircle(asteroid, state.arena.x, state.arena.y, state.arena.radius - 8, 0.55);
      else constrainThreatToCombatField(asteroid);
    }
  }

  function avoidance(entity) {
    let ax = 0;
    let ay = 0;
    for (const asteroid of state.asteroids) {
      if (asteroid.dead) continue;
      const dx = entity.x - asteroid.x;
      const dy = entity.y - asteroid.y;
      const safe = entity.radius + asteroid.radius + 72;
      const squared = dx * dx + dy * dy;
      if (squared > 0.001 && squared < safe * safe) {
        const strength = (1 - Math.sqrt(squared) / safe) * 1.5;
        ax += dx / Math.sqrt(squared) * strength;
        ay += dy / Math.sqrt(squared) * strength;
      }
    }
    for (const other of state.aliens) {
      if (other === entity || other.dead) continue;
      const dx = entity.x - other.x;
      const dy = entity.y - other.y;
      const safe = entity.radius + other.radius + 26;
      const squared = dx * dx + dy * dy;
      if (squared > 0.001 && squared < safe * safe) {
        ax += dx / squared * 90;
        ay += dy / squared * 90;
      }
    }
    return { x: ax, y: ay };
  }

  function steerAlien(alien, desiredX, desiredY, dt, multiplier) {
    const avoid = avoidance(alien);
    desiredX += avoid.x;
    desiredY += avoid.y;
    const length = Math.hypot(desiredX, desiredY) || 1;
    const targetVx = desiredX / length * alien.speed * (multiplier || 1);
    const targetVy = desiredY / length * alien.speed * (multiplier || 1);
    const amount = 1 - Math.exp(-4.5 * dt);
    alien.vx = lerp(alien.vx, targetVx, amount);
    alien.vy = lerp(alien.vy, targetVy, amount);
  }

  function leadPoint(originX, originY, projectileSpeed) {
    const ship = state.ship;
    const distance = Math.hypot(ship.x - originX, ship.y - originY);
    const time = clamp(distance / projectileSpeed, 0, 1.5);
    return { x: ship.x + ship.vx * time * 0.72, y: ship.y + ship.vy * time * 0.72 };
  }

  function updateAliens(dt) {
    const ship = state.ship;
    for (const alien of state.aliens) {
      if (alien.dead) continue;
      alien.cooldown -= dt;
      alien.stateTimer -= dt;
      const dx = ship.x - alien.x;
      const dy = ship.y - alien.y;
      const distance = Math.hypot(dx, dy) || 1;
      alien.aimAngle = Math.atan2(dy, dx);

      if (alien.type === "scout") {
        const radial = distance > 285 ? 1 : distance < 155 ? -0.8 : 0;
        steerAlien(alien, dx / distance * radial + -dy / distance * alien.orbitDirection * 0.9, dy / distance * radial + dx / distance * alien.orbitDirection * 0.9, dt);
        if (alien.cooldown <= 0 && distance < 720) {
          alien.cooldown = CONFIG.difficulty.scaledCooldown(CONFIG.aliens.scout.baseCooldown, state.sector);
          const lead = leadPoint(alien.x, alien.y, CONFIG.aliens.scout.pattern.projectileSpeed);
          fireEnemyAt(alien.x, alien.y, lead.x, lead.y, CONFIG.aliens.scout.pattern.projectileSpeed, CONFIG.aliens.scout.pattern.damage, 1, 0, "#63f7c8");
        }
      } else if (alien.type === "striker") {
        if (alien.state === "telegraph") {
          alien.vx *= Math.exp(-7 * dt);
          alien.vy *= Math.exp(-7 * dt);
          if (alien.stateTimer <= 0) {
            alien.state = "charge";
            alien.stateTimer = CONFIG.aliens.striker.pattern.duration;
            const lead = leadPoint(alien.x, alien.y, alien.speed * CONFIG.aliens.striker.pattern.speedMultiplier);
            const chargeAngle = Math.atan2(lead.y - alien.y, lead.x - alien.x);
            alien.vx = Math.cos(chargeAngle) * alien.speed * CONFIG.aliens.striker.pattern.speedMultiplier;
            alien.vy = Math.sin(chargeAngle) * alien.speed * CONFIG.aliens.striker.pattern.speedMultiplier;
          }
        } else if (alien.state === "charge") {
          if (alien.stateTimer <= 0) {
            alien.state = "recover";
            alien.stateTimer = 0.7;
            alien.cooldown = CONFIG.difficulty.scaledCooldown(CONFIG.aliens.striker.baseCooldown, state.sector);
          }
        } else if (alien.state === "recover") {
          alien.vx *= Math.exp(-3 * dt);
          alien.vy *= Math.exp(-3 * dt);
          if (alien.stateTimer <= 0) alien.state = "approach";
        } else {
          steerAlien(alien, dx, dy, dt, distance > 360 ? 1 : 0.55);
          if (alien.cooldown <= 0 && distance < 620) {
            alien.state = "telegraph";
            alien.stateTimer = CONFIG.aliens.striker.pattern.warning;
          }
        }
      } else if (alien.type === "bomber") {
        const radial = distance > 430 ? 1 : distance < 280 ? -1 : 0;
        steerAlien(alien, dx / distance * radial + -dy / distance * alien.orbitDirection * 0.62, dy / distance * radial + dx / distance * alien.orbitDirection * 0.62, dt, 0.85);
        if (alien.cooldown <= 0 && distance < 650) {
          alien.cooldown = CONFIG.difficulty.scaledCooldown(CONFIG.aliens.bomber.baseCooldown, state.sector);
          const predicted = leadPoint(alien.x, alien.y, 260);
          spawnMine(alien.x, alien.y, predicted.x, predicted.y, CONFIG.aliens.bomber.pattern);
        }
      } else {
        const radial = distance > 560 ? 1 : distance < 390 ? -1 : 0;
        steerAlien(alien, dx / distance * radial + -dy / distance * alien.orbitDirection * 0.35, dy / distance * radial + dx / distance * alien.orbitDirection * 0.35, dt, 0.72);
        if (alien.cooldown <= 0 && distance < 790) {
          alien.cooldown = CONFIG.difficulty.scaledCooldown(CONFIG.aliens.carrier.baseCooldown, state.sector);
          const livingChildren = state.aliens.filter((item) => item.parent === alien && !item.dead).length;
          if (livingChildren < CONFIG.aliens.carrier.pattern.maxChildren && state.aliens.length < CONFIG.caps.aliens - 1) {
            for (let childIndex = 0; childIndex < 2 && state.aliens.length < CONFIG.caps.aliens; childIndex += 1) {
              const child = spawnAlien("scout", {
                x: alien.x + Math.cos(alien.angle + Math.PI + (childIndex ? 0.5 : -0.5)) * 32,
                y: alien.y + Math.sin(alien.angle + Math.PI + (childIndex ? 0.5 : -0.5)) * 32,
                generation: alien.generation,
                threatCost: 0,
                score: 35,
                noDrops: true,
                required: false,
                parent: alien
              });
              if (child) child.cooldown = 0.7;
            }
          } else {
            fireEnemyAt(alien.x, alien.y, ship.x, ship.y, 265, 13, 3, 0.26, "#ff5aa5");
          }
        }
      }

      alien.x += alien.vx * dt;
      alien.y += alien.vy * dt;
      if (Math.hypot(alien.vx, alien.vy) > 1) alien.heading = Math.atan2(alien.vy, alien.vx);
      alien.angle = alien.heading;
      if (state.arena.locked) Core.constrainToCircle(alien, state.arena.x, state.arena.y, state.arena.radius - 10, 0.35);
      else constrainThreatToCombatField(alien);
    }
  }

  function collideAsteroidsAndAliens() {
    collideAsteroidPairs();
    for (const asteroid of state.asteroids) {
      if (asteroid.dead) continue;
      for (const alien of state.aliens) {
        if (alien.dead) continue;
        if (!Core.circlesOverlap(asteroid.x, asteroid.y, asteroid.radius * 0.78, alien.x, alien.y, alien.radius * 0.82)) continue;
        const dx = alien.x - asteroid.x;
        const dy = alien.y - asteroid.y;
        const distance = Math.hypot(dx, dy);
        const impactX = distance > 0.001 ? dx / distance : (asteroid.id < alien.id ? 1 : -1);
        const impactY = distance > 0.001 ? dy / distance : 0;
        const overlap = asteroid.radius + alien.radius - distance;
        if (overlap > 0) {
          alien.x += impactX * overlap;
          alien.y += impactY * overlap;
        }
        const relativeVx = alien.vx - asteroid.vx;
        const relativeVy = alien.vy - asteroid.vy;
        const closingSpeed = -(relativeVx * impactX + relativeVy * impactY);
        if (closingSpeed <= 0) continue;
        killThreat(alien, "asteroid");
        damageThreat(asteroid, Math.max(0.6, alien.maxHealth * 0.16), null, "environment");
        asteroid.vx -= impactX * Math.min(45, alien.radius * 1.2);
        asteroid.vy -= impactY * Math.min(45, alien.radius * 1.2);
        addRing(alien.x, alien.y, "#ffd166", 3, 0.28, alien.radius * 2.2);
        if (asteroid.dead) break;
      }
    }
  }

  function collideAsteroidPairs() {
    const asteroids = state.asteroids;
    const restitution = CONFIG.combatField.asteroidRestitution;
    for (let firstIndex = 0; firstIndex < asteroids.length; firstIndex += 1) {
      const first = asteroids[firstIndex];
      if (first.dead) continue;
      for (let secondIndex = firstIndex + 1; secondIndex < asteroids.length; secondIndex += 1) {
        const second = asteroids[secondIndex];
        if (second.dead) continue;
        if (first.collisionGrace > 0 || second.collisionGrace > 0) continue;
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const minimum = first.radius + second.radius;
        const squared = dx * dx + dy * dy;
        if (squared >= minimum * minimum) continue;
        const distance = Math.sqrt(squared);
        const normalX = distance > 0.001 ? dx / distance : (first.id < second.id ? 1 : -1);
        const normalY = distance > 0.001 ? dy / distance : 0;
        const overlap = minimum - distance;
        const firstMass = Math.max(1, first.radius * first.radius);
        const secondMass = Math.max(1, second.radius * second.radius);
        const totalMass = firstMass + secondMass;
        first.x -= normalX * overlap * secondMass / totalMass;
        first.y -= normalY * overlap * secondMass / totalMass;
        second.x += normalX * overlap * firstMass / totalMass;
        second.y += normalY * overlap * firstMass / totalMass;
        const relativeNormalSpeed = (second.vx - first.vx) * normalX + (second.vy - first.vy) * normalY;
        if (relativeNormalSpeed >= 0) continue;
        const impulse = -(1 + restitution) * relativeNormalSpeed / (1 / firstMass + 1 / secondMass);
        first.vx -= impulse / firstMass * normalX;
        first.vy -= impulse / firstMass * normalY;
        second.vx += impulse / secondMass * normalX;
        second.vy += impulse / secondMass * normalY;
      }
    }
  }

  function spawnEnemyBullet(x, y, angle, speed, damage, color, life) {
    if (state.enemyBullets.length >= CONFIG.caps.enemyProjectiles) return null;
    const bullet = {
      id: nextEntityId++,
      x, y, px: x, py: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 3.5,
      damage: damage * CONFIG.difficulty.damageScale(state.sector),
      color: color || "#ff5da9",
      life: life || 4,
      maxLife: life || 4,
      dead: false
    };
    state.enemyBullets.push(bullet);
    return bullet;
  }

  function fireEnemyAt(x, y, targetX, targetY, speed, damage, count, spread, color) {
    const total = Math.max(1, count || 1);
    const center = Math.atan2(targetY - y, targetX - x);
    for (let index = 0; index < total; index += 1) {
      const offset = total === 1 ? 0 : ((index / (total - 1)) - 0.5) * (spread || 0);
      spawnEnemyBullet(x, y, center + offset, speed, damage, color);
    }
    audio.alienShot();
  }

  function spawnMine(x, y, targetX, targetY, pattern) {
    if (state.mines.length >= CONFIG.caps.mines) return;
    const angle = Math.atan2(targetY - y, targetX - x);
    state.mines.push({
      id: nextEntityId++,
      x, y,
      vx: Math.cos(angle) * 115,
      vy: Math.sin(angle) * 115,
      radius: 15,
      fuse: pattern.fuse || 1.5,
      damage: (pattern.damage || 24) * CONFIG.difficulty.damageScale(state.sector),
      blastRadius: pattern.blastRadius || 74,
      phase: rng.range(0, TAU),
      armed: false,
      dead: false
    });
  }

  function spawnBoss() {
    const type = "harrower";
    const definition = CONFIG.bosses[type];
    const spawnAngle = rng.range(0, TAU);
    const spawnDistance = state.arena.radius * 0.52;
    const health = definition.baseHealth * CONFIG.difficulty.bossHealthScale(state.sector);
    const boss = {
      id: nextEntityId++,
      x: state.arena.x + Math.cos(spawnAngle) * spawnDistance,
      y: state.arena.y + Math.sin(spawnAngle) * spawnDistance,
      vx: 0,
      vy: 0,
      radius: definition.radius,
      type,
      health,
      maxHealth: health,
      damage: definition.contactDamage * CONFIG.difficulty.damageScale(state.sector),
      score: definition.score,
      phase: 0,
      angle: spawnAngle + Math.PI,
      rotation: 0,
      rotationSpeed: 0.35,
      points: null,
      attackTimer: 1.1,
      secondaryTimer: 3.2,
      spiralAngle: rng.range(0, TAU),
      telegraph: null,
      action: null,
      actionConfig: null,
      actionTimer: 0,
      nodes: null,
      dead: false
    };
    boss.nodes = Array.from({ length: 3 }, (_, index) => ({
      index,
      x: boss.x,
      y: boss.y,
      radius: 13,
      health: 16 * CONFIG.difficulty.healthScale(state.sector),
      maxHealth: 16 * CONFIG.difficulty.healthScale(state.sector)
    }));
    state.boss = boss;
    state.arena.locked = true;
    state.arena.warning = 0;
    state.enemyBullets.length = 0;
    state.ship.invulnerable = Math.max(state.ship.invulnerable, 0.8);
    announce(definition.label, 2);
    audio.arena();
    show(dom.bossHud, true);
  }

  function updateBossEncounter(dt) {
    if (state.arena.warning > 0) {
      state.arena.warning = Math.max(0, state.arena.warning - dt);
      if (state.arena.warning <= 0 && !state.boss) spawnBoss();
      return;
    }
    if (state.encounterData.bossDefeated) {
      if (encounterThreatsRemaining() === 0 && !state.encounterData.complete) {
        finishEncounter(`${CONFIG.bosses.harrower.label} defeated`);
      }
      return;
    }
    if (state.boss) updateBoss(dt);
  }

  function setBossPhase(boss) {
    const ratio = boss.health / boss.maxHealth;
    const previous = boss.phase;
    const phases = CONFIG.bosses[boss.type].phases;
    boss.phase = ratio <= phases[2].enterAtHealth ? 2 : ratio <= phases[1].enterAtHealth ? 1 : 0;
    if (boss.phase !== previous) {
      boss.attackTimer = 0.4;
      boss.secondaryTimer = 1.2;
      boss.telegraph = null;
      boss.action = null;
      boss.actionConfig = null;
      state.enemyBullets.length = 0;
      state.ship.invulnerable = Math.max(state.ship.invulnerable, 0.45);
      announce(`Phase ${boss.phase + 1}`, 1.2);
      addRing(boss.x, boss.y, "#ff58df", 4, 0.65, 180);
      state.shake = Math.max(state.shake, 9);
    }
  }

  function moveBoss(boss, dt) {
    const definition = CONFIG.bosses[boss.type];
    const phaseDefinition = definition.phases[boss.phase];
    const dx = state.ship.x - boss.x;
    const dy = state.ship.y - boss.y;
    const distance = Math.hypot(dx, dy) || 1;
    let desiredX;
    let desiredY;
    const radial = distance > 420 ? 1 : distance < 260 ? -0.75 : 0;
    desiredX = dx / distance * radial - dy / distance * (boss.phase === 2 ? 0.95 : 0.58);
    desiredY = dy / distance * radial + dx / distance * (boss.phase === 2 ? 0.95 : 0.58);
    if (boss.action === "charge" || boss.action === "chargeWarning" || boss.action === "dash") {
      // Velocity is committed when the warning finishes.
    } else {
      const speed = phaseDefinition.moveSpeed * CONFIG.difficulty.speedScale(state.sector);
      const length = Math.hypot(desiredX, desiredY) || 1;
      const amount = 1 - Math.exp(-2.8 * dt);
      boss.vx = lerp(boss.vx, desiredX / length * speed, amount);
      boss.vy = lerp(boss.vy, desiredY / length * speed, amount);
    }
    boss.x += boss.vx * dt;
    boss.y += boss.vy * dt;
    boss.angle = Math.atan2(dy, dx);
    boss.rotation += boss.rotationSpeed * dt;
    Core.constrainToCircle(boss, state.arena.x, state.arena.y, state.arena.radius - 6, 0.42);
  }

  function updateBoss(dt) {
    const boss = state.boss;
    if (!boss || boss.dead) return;
    setBossPhase(boss);
    boss.attackTimer -= dt;
    boss.secondaryTimer -= dt;
    boss.actionTimer -= dt;
    updateBossAction(boss, dt);
    moveBoss(boss, dt);
    updateHarrower(boss);
    if (boss.nodes) updateBossNodes(boss);
  }

  function updateBossAction(boss, dt) {
    if (!boss.action) return;
    if (boss.action === "chargeWarning") {
      boss.vx *= Math.exp(-8 * dt);
      boss.vy *= Math.exp(-8 * dt);
      boss.telegraph = {
        active: true,
        x: boss.x,
        y: boss.y,
        angle: boss.actionAngle,
        length: state.arena.radius * 2.2,
        width: 8,
        color: "#ff7659"
      };
      if (boss.actionTimer <= 0) {
        const action = boss.actionConfig || {};
        boss.action = "charge";
        boss.actionTimer = action.duration || 0.75;
        boss.telegraph = null;
        const chargeSpeed = (action.speed || 330) * CONFIG.difficulty.speedScale(state.sector);
        boss.vx = Math.cos(boss.actionAngle) * chargeSpeed;
        boss.vy = Math.sin(boss.actionAngle) * chargeSpeed;
      }
    } else if (boss.action === "charge" && boss.actionTimer <= 0) {
      boss.action = null;
      boss.actionConfig = null;
      boss.vx *= 0.25;
      boss.vy *= 0.25;
    } else if (boss.action === "beamWarning") {
      boss.telegraph = {
        active: true,
        x: boss.x,
        y: boss.y,
        angle: boss.actionAngle,
        length: state.arena.radius * 2.3,
        width: 6 + boss.phase * 2,
        color: "#ff58df"
      };
      if (boss.actionTimer <= 0) {
        const action = boss.actionConfig || {};
        boss.action = "beamActive";
        boss.actionTimer = action.duration || 1.4;
        boss.beamDamageTimer = 0;
        boss.beamSounded = false;
        boss.sweepDirection = rng.chance(0.5) ? 1 : -1;
        boss.telegraph.width = 22 + boss.phase * 5;
      }
    } else if (boss.action === "beamActive") {
      const action = boss.actionConfig || {};
      boss.actionAngle += (action.sweepSpeed || 0.65) * boss.sweepDirection * dt;
      boss.telegraph = {
        active: true,
        x: boss.x,
        y: boss.y,
        angle: boss.actionAngle,
        length: state.arena.radius * 2.3,
        width: 22 + boss.phase * 5,
        color: "#ff58df"
      };
      boss.beamDamageTimer -= dt;
      if (boss.beamDamageTimer <= 0) {
        fireBossBeam(boss, !boss.beamSounded);
        boss.beamSounded = true;
        boss.beamDamageTimer = 0.18;
      }
      if (boss.actionTimer <= 0) {
        boss.action = null;
        boss.actionConfig = null;
        boss.telegraph = null;
      }
    } else if (boss.action === "dash" && boss.actionTimer <= 0) {
      boss.action = null;
      boss.actionConfig = null;
      boss.vx *= 0.3;
      boss.vy *= 0.3;
    }
  }

  function fireBossBeam(boss, loud) {
    const ship = state.ship;
    const action = boss.actionConfig || {};
    const dx = ship.x - boss.x;
    const dy = ship.y - boss.y;
    const forward = dx * Math.cos(boss.actionAngle) + dy * Math.sin(boss.actionAngle);
    const perpendicular = Math.abs(-dx * Math.sin(boss.actionAngle) + dy * Math.cos(boss.actionAngle));
    if (forward > 0 && perpendicular < 24 + boss.phase * 5) {
      damagePlayer((action.damage || 28) * CONFIG.difficulty.damageScale(state.sector), boss.x, boss.y);
    }
    addRing(boss.x + Math.cos(boss.actionAngle) * 80, boss.y + Math.sin(boss.actionAngle) * 80, "#ff58df", 6, 0.32, 120);
    state.shake = Math.max(state.shake, 10);
    if (loud) audio.explode(true);
  }

  function updateHarrower(boss) {
    const phase = boss.phase;
    const attacks = CONFIG.bosses.harrower.phases[phase].attacks;
    const primary = attacks[0];
    const secondary = attacks[1];
    if (boss.attackTimer <= 0 && !boss.action) {
      if (phase === 0) {
        boss.action = "beamWarning";
        boss.actionConfig = primary;
        boss.actionTimer = primary.warning;
        const lead = leadPoint(boss.x, boss.y, 900);
        boss.actionAngle = Math.atan2(lead.y - boss.y, lead.x - boss.x);
      } else if (phase === 1) {
        fireEnemyAt(boss.x, boss.y, state.ship.x, state.ship.y, primary.speed, primary.damage, primary.projectiles, primary.spread, "#ff59d2");
      } else {
        fireEnemyAt(boss.x, boss.y, state.ship.x, state.ship.y, primary.speed, primary.damage, primary.projectiles, primary.spread, "#d968ff");
        const dashAngle = Math.atan2(state.ship.y - boss.y, state.ship.x - boss.x);
        const dashSpeed = primary.dashSpeed * CONFIG.difficulty.speedScale(state.sector);
        boss.vx = Math.cos(dashAngle) * dashSpeed;
        boss.vy = Math.sin(dashAngle) * dashSpeed;
        boss.action = "dash";
        boss.actionTimer = primary.dashDuration;
      }
      boss.attackTimer = CONFIG.difficulty.scaledCooldown(primary.baseCooldown, state.sector);
    }
    if (boss.secondaryTimer <= 0 && !boss.action) {
      if (phase === 0) {
        for (let index = 0; index < secondary.count && state.aliens.length < CONFIG.caps.aliens; index += 1) {
          spawnAlien("scout", {
            x: boss.x + Math.cos(boss.angle + Math.PI + (index ? 0.7 : -0.7)) * 70,
            y: boss.y + Math.sin(boss.angle + Math.PI + (index ? 0.7 : -0.7)) * 70,
            threatCost: 0,
            score: secondary.childScore,
            noDrops: true,
            required: false,
            generation: state.encounterData.generation
          });
        }
      } else if (phase === 1) {
        for (let index = 0; index < secondary.count; index += 1) {
          const angle = boss.angle + (index - (secondary.count - 1) / 2) * 0.45;
          spawnMine(boss.x, boss.y, boss.x + Math.cos(angle) * 400, boss.y + Math.sin(angle) * 400, {
            fuse: secondary.fuse + index * secondary.fuseStep,
            blastRadius: secondary.blastRadius,
            damage: secondary.damage
          });
        }
      } else {
        boss.action = "beamWarning";
        boss.actionConfig = secondary;
        boss.actionTimer = secondary.warning;
        const lead = leadPoint(boss.x, boss.y, 950);
        boss.actionAngle = Math.atan2(lead.y - boss.y, lead.x - boss.x);
      }
      boss.secondaryTimer = CONFIG.difficulty.scaledCooldown(secondary.baseCooldown, state.sector);
    }
  }

  function updateBossNodes(boss) {
    const living = boss.nodes.filter((node) => node.health > 0);
    for (const node of living) {
      const orbit = state.time * (0.62 + boss.phase * 0.12) + node.index / boss.nodes.length * TAU;
      const radius = boss.radius + 46 + Math.sin(state.time * 0.8 + node.index) * 9;
      node.x = boss.x + Math.cos(orbit) * radius;
      node.y = boss.y + Math.sin(orbit) * radius;
    }
  }

  function damageBoss(amount) {
    const boss = state.boss;
    if (!boss || boss.dead) return;
    const shielded = boss.nodes && boss.nodes.some((node) => node.health > 0);
    boss.health -= amount * (shielded ? 0.42 : 1);
    addFloater(boss.x, boss.y - boss.radius, shielded ? "SHIELD" : Math.max(1, Math.round(amount)), shielded ? "#6fffff" : "#ffffff", 12);
    audio.hit();
    if (boss.health <= 0) killBoss();
  }

  function killBoss() {
    const boss = state.boss;
    if (!boss || boss.dead) return;
    boss.dead = true;
    state.encounterData.bossDefeated = true;
    state.score += Math.round(boss.score * CONFIG.difficulty.scoreScale(state.sector));
    state.bossesDefeated += 1;
    state.stats.kills += 1;
    state.ship.hull = Math.min(state.ship.maxHull, state.ship.hull + CONFIG.bossArena.victoryHeal);
    burst(boss.x, boss.y, "#ff58df", settings.reducedEffects ? 45 : 100, 2.5);
    addRing(boss.x, boss.y, "#ffffff", 12, 1.1, state.arena.radius * 0.85);
    state.enemyBullets.length = 0;
    state.mines.length = 0;
    if (boss.nodes) for (const node of boss.nodes) node.health = 0;
    state.shake = 20;
    state.flash = 1;
    state.flashColor = "#ffffff";
    audio.explode(true);
    grantModuleUpgrade("BOSS CORE");
    state.boss = null;
    show(dom.bossHud, false);
    if (encounterThreatsRemaining() === 0) finishEncounter(`${CONFIG.bosses[boss.type].label} defeated`);
    else announce("Capital ship down — clear the escorts", 1.6);
  }

  function nearestTarget(x, y, range) {
    let best = null;
    let bestSquared = range * range;
    const consider = (target) => {
      if (!target || target.dead) return;
      const squared = distanceSquared(x, y, target.x, target.y);
      if (squared < bestSquared) {
        best = target;
        bestSquared = squared;
      }
    };
    for (const asteroid of state.asteroids) consider(asteroid);
    for (const alien of state.aliens) consider(alien);
    if (state.boss) {
      if (state.boss.nodes) for (const node of state.boss.nodes) if (node.health > 0) consider(node);
      consider(state.boss);
    }
    return best;
  }

  function updateProjectiles(dt) {
    for (const bullet of state.playerBullets) {
      if (bullet.dead) continue;
      bullet.px = bullet.x;
      bullet.py = bullet.y;
      if (bullet.kind === "missile" && bullet.turnRate > 0) {
        const target = nearestTarget(bullet.x, bullet.y, 760);
        if (target) {
          const current = Math.atan2(bullet.vy, bullet.vx);
          const desired = Math.atan2(target.y - bullet.y, target.x - bullet.x);
          const turn = clamp(Core.angleDelta(current, desired), -bullet.turnRate * dt, bullet.turnRate * dt);
          const speed = Math.hypot(bullet.vx, bullet.vy);
          bullet.vx = Math.cos(current + turn) * speed;
          bullet.vy = Math.sin(current + turn) * speed;
        }
      }
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      if (bullet.life <= 0) bullet.dead = true;
    }
    for (const bullet of state.enemyBullets) {
      if (bullet.dead) continue;
      bullet.px = bullet.x;
      bullet.py = bullet.y;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      if (bullet.life <= 0) bullet.dead = true;
    }
  }

  function updateMines(dt) {
    for (const mine of state.mines) {
      if (mine.dead) continue;
      mine.x += mine.vx * dt;
      mine.y += mine.vy * dt;
      mine.vx *= Math.exp(-2.4 * dt);
      mine.vy *= Math.exp(-2.4 * dt);
      mine.fuse -= dt;
      mine.armed = mine.fuse < 0.65;
      if (mine.fuse <= 0) explodeMine(mine);
    }
  }

  function explodeMine(mine) {
    if (!mine || mine.dead) return;
    mine.dead = true;
    if (distanceSquared(state.ship.x, state.ship.y, mine.x, mine.y) <= mine.blastRadius * mine.blastRadius) {
      damagePlayer(mine.damage, mine.x, mine.y);
    }
    addRing(mine.x, mine.y, "#ff6278", 5, 0.45, mine.blastRadius);
    burst(mine.x, mine.y, "#ff7c72", settings.reducedEffects ? 8 : 18, 1.2);
    audio.explode(false);
  }

  function hitTargetWithBullet(bullet, target) {
    if (bullet.dead || target.dead || bullet.hits.includes(target.id)) return false;
    if (!Core.segmentCircleHit(bullet.px, bullet.py, bullet.x, bullet.y, target.x, target.y, target.radius + bullet.radius)) return false;
    bullet.hits.push(target.id);
    damageThreat(target, bullet.damage, bullet);
    resolveBulletImpact(bullet, target.x, target.y, target);
    return true;
  }

  function resolveBulletImpact(bullet, x, y, directTarget) {
    if (bullet.blastRadius > 0) {
      const radiusSquared = bullet.blastRadius * bullet.blastRadius;
      for (const asteroid of state.asteroids) {
        if (asteroid !== directTarget && !asteroid.dead && distanceSquared(x, y, asteroid.x, asteroid.y) <= radiusSquared) damageThreat(asteroid, bullet.damage * 0.5, null);
      }
      for (const alien of state.aliens) {
        if (alien !== directTarget && !alien.dead && distanceSquared(x, y, alien.x, alien.y) <= radiusSquared) damageThreat(alien, bullet.damage * 0.5, null);
      }
      addRing(x, y, bullet.color, 3, 0.32, bullet.blastRadius);
    }
    burst(x, y, bullet.color, settings.reducedEffects ? 2 : 4, 0.55);
    if (bullet.pierce > 0) bullet.pierce -= 1;
    else bullet.dead = true;
  }

  function collidePlayerBullets() {
    for (const bullet of state.playerBullets) {
      if (bullet.dead) continue;
      if (state.boss) {
        if (state.boss.nodes) {
          for (const node of state.boss.nodes) {
            if (node.health <= 0 || bullet.dead || bullet.hits.includes(`n${node.index}`)) continue;
            if (Core.segmentCircleHit(bullet.px, bullet.py, bullet.x, bullet.y, node.x, node.y, node.radius + bullet.radius)) {
              bullet.hits.push(`n${node.index}`);
              node.health -= bullet.damage;
              resolveBulletImpact(bullet, node.x, node.y, null);
              if (node.health <= 0) {
                node.health = 0;
                burst(node.x, node.y, "#6fffff", settings.reducedEffects ? 10 : 22, 1.2);
                state.score += 420;
                announce("Shield node destroyed", 0.85);
              }
            }
          }
        }
        if (!bullet.dead && !bullet.hits.includes(state.boss.id) && Core.segmentCircleHit(bullet.px, bullet.py, bullet.x, bullet.y, state.boss.x, state.boss.y, state.boss.radius + bullet.radius)) {
          bullet.hits.push(state.boss.id);
          damageBoss(bullet.damage);
          resolveBulletImpact(bullet, bullet.x, bullet.y, state.boss);
        }
      }
      for (const asteroid of state.asteroids) {
        if (bullet.dead) break;
        hitTargetWithBullet(bullet, asteroid);
      }
      for (const alien of state.aliens) {
        if (bullet.dead) break;
        hitTargetWithBullet(bullet, alien);
      }
    }
  }

  function collidePlayer() {
    const ship = state.ship;
    for (const bullet of state.enemyBullets) {
      if (bullet.dead) continue;
      if (Core.segmentCircleHit(bullet.px, bullet.py, bullet.x, bullet.y, ship.x, ship.y, ship.radius + bullet.radius)) {
        bullet.dead = true;
        damagePlayer(bullet.damage, bullet.x, bullet.y);
      }
    }
    for (const asteroid of state.asteroids) {
      if (!asteroid.dead && Core.circlesOverlap(ship.x, ship.y, ship.radius, asteroid.x, asteroid.y, asteroid.radius * 0.82)) {
        const dx = ship.x - asteroid.x;
        const dy = ship.y - asteroid.y;
        const distance = Math.hypot(dx, dy);
        const normalX = distance > 0.001 ? dx / distance : (ship.x >= asteroid.x ? 1 : -1);
        const normalY = distance > 0.001 ? dy / distance : 0;
        const minimum = ship.radius + asteroid.radius * 0.82;
        const overlap = minimum - distance;
        if (overlap > 0) {
          ship.x += normalX * (overlap + 0.5);
          ship.y += normalY * (overlap + 0.5);
        }
        const relativeNormalSpeed = (ship.vx - asteroid.vx) * normalX + (ship.vy - asteroid.vy) * normalY;
        if (relativeNormalSpeed < 0) {
          ship.vx -= normalX * relativeNormalSpeed;
          ship.vy -= normalY * relativeNormalSpeed;
        }
        if (damagePlayer(asteroid.damage, asteroid.x, asteroid.y)) {
          asteroid.vx -= normalX * 70;
          asteroid.vy -= normalY * 70;
        }
      }
    }
    for (const alien of state.aliens) {
      if (!alien.dead && Core.circlesOverlap(ship.x, ship.y, ship.radius, alien.x, alien.y, alien.radius * 0.75)) {
        damagePlayer(alien.damage, alien.x, alien.y);
        damageThreat(alien, 2.5, null);
      }
    }
    if (state.boss && Core.circlesOverlap(ship.x, ship.y, ship.radius, state.boss.x, state.boss.y, state.boss.radius * 0.78)) {
      damagePlayer(state.boss.damage, state.boss.x, state.boss.y);
    }
    for (const pickup of state.pickups) {
      if (!pickup.dead && Core.circlesOverlap(ship.x, ship.y, ship.radius + 3, pickup.x, pickup.y, 14)) applyPickup(pickup);
    }
  }

  function asteroidDamageMultiplier(asteroid, bullet) {
    if (asteroid.kind !== "armored") return 1;
    const definition = CONFIG.asteroids.armored;
    if (!bullet) return definition.damageTakenMultiplier;
    const impactAngle = Math.atan2(bullet.y - asteroid.y, bullet.x - asteroid.x);
    const weakAngle = asteroid.rotation + 0.2;
    return Math.abs(Core.angleDelta(impactAngle, weakAngle)) < 0.42 ? definition.weakSpotMultiplier : definition.damageTakenMultiplier;
  }

  function damageThreat(entity, amount, bullet, cause) {
    if (!entity || entity.dead) return;
    const isAsteroid = Boolean(entity.kind);
    const multiplier = isAsteroid ? asteroidDamageMultiplier(entity, bullet) : 1;
    entity.health -= amount * multiplier;
    if (isAsteroid) {
      entity.hitFlash = 1;
      processHealthGates(entity);
    }
    if (entity.health <= 0) killThreat(entity, cause || "player");
  }

  function processHealthGates(asteroid) {
    const definition = CONFIG.asteroids[asteroid.kind];
    if (!definition || !definition.healthGates) return;
    while (asteroid.gateIndex < definition.healthGates.length && asteroid.health / asteroid.maxHealth <= definition.healthGates[asteroid.gateIndex]) {
      const gate = definition.gateFragments;
      asteroid.gateIndex += 1;
      spawnFragments(asteroid, gate.count, gate.into, asteroid.radius * 0.24, 135, false);
      addRing(asteroid.x, asteroid.y, "#ffd166", 4, 0.45, asteroid.radius * 1.3);
      state.shake = Math.max(state.shake, 6);
    }
  }

  function spawnFragments(parent, count, kind, radius, speed, circular, splitRemaining) {
    const available = Math.max(0, CONFIG.caps.asteroids - state.asteroids.length);
    const total = Math.min(count, available);
    const offset = rng.range(0, TAU);
    let spawned = 0;
    for (let index = 0; index < total; index += 1) {
      const angle = circular ? offset + index / total * TAU : offset + index / Math.max(1, total) * TAU + rng.range(-0.2, 0.2);
      const spawnDistance = Math.max(parent.radius + radius + 3, radius * (total > 4 ? 2.25 : 1.35));
      const child = spawnAsteroid(kind, {
        x: parent.x + Math.cos(angle) * spawnDistance,
        y: parent.y + Math.sin(angle) * spawnDistance,
        velocityAngle: angle,
        speed: speed * rng.range(circular ? 0.96 : 0.72, circular ? 1.04 : 1.22),
        radius,
        health: 1,
        threatCost: 0,
        score: Math.max(1, Math.round(CONFIG.asteroids[kind].score * 0.22)),
        noDrops: true,
        fragment: true,
        ballisticFragment: circular,
        splitRemaining: Math.max(0, Math.floor(Number(splitRemaining) || 0)),
        required: parent.required,
        generation: parent.generation,
        waveIndex: parent.waveIndex,
        collisionGrace: CONFIG.combatField.asteroidCollisionGraceSeconds
      });
      if (child) spawned += 1;
    }
    if (spawned && parent.required && state.encounterData && parent.generation === state.encounterData.generation) {
      state.encounterData.waveRequiredTotal += spawned;
      state.encounterData.stageRequiredTotal += spawned;
    }
    return spawned;
  }

  function killThreat(entity, cause) {
    if (!entity || entity.dead || entity.deathProcessed) return false;
    entity.dead = true;
    entity.deathProcessed = true;
    entity.deathCause = cause || "player";
    const encounter = state.encounterData;
    const countsForWave = Boolean(encounter && entity.generation === encounter.generation && entity.required);
    if (countsForWave) {
      encounter.stageRequiredCleared += 1;
      if (entity.waveIndex === encounter.waveIndex) encounter.waveRequiredCleared += 1;
    }
    const rewarded = entity.deathCause !== "asteroid" && entity.deathCause !== "environment";
    if (encounter) {
      encounter.lastDeathCause = entity.deathCause;
      if (rewarded) encounter.playerKills += 1;
      else encounter.environmentalKills += 1;
    }
    const definition = entity.kind ? CONFIG.asteroids[entity.kind] : CONFIG.aliens[entity.type];
    if (entity.kind === "volatile") {
      const burstData = CONFIG.asteroids.volatile.deathBurst;
      spawnFragments(entity, burstData.fragments, burstData.fragmentKind, burstData.fragmentRadius, burstData.fragmentSpeed, true, 0);
      addRing(entity.x, entity.y, "#ff9a45", 5, 0.55, 110);
    } else if (entity.kind && definition.split && entity.splitRemaining > 0) {
      const radius = Math.max(14, entity.radius * (definition.split.radiusScale || 0.42));
      spawnFragments(entity, definition.split.count, definition.split.into || "rock", radius, 135, false, entity.splitRemaining - 1);
    }
    state.stats.kills += 1;
    if (rewarded) {
      state.combo = clamp(state.combo + 1, 1, 20);
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      state.comboTimer = 2.8;
    }
    const multiplier = 1 + Math.floor((state.combo - 1) / 4) * 0.25;
    const earned = rewarded ? Math.round((entity.score || 0) * CONFIG.difficulty.scoreScale(state.sector) * multiplier) : 0;
    state.score += earned;
    if (rewarded) state.ship.pulse = Math.min(100, state.ship.pulse + 2.4 + (entity.threatCost || 0) * 0.8);
    addFloater(entity.x, entity.y - entity.radius, rewarded ? `+${earned}` : "IMPACT", rewarded ? "#ffffff" : "#ffd166", entity.radius > 70 ? 15 : 12);
    burst(entity.x, entity.y, entity.kind === "volatile" ? "#ff9a45" : entity.type ? "#79ffd4" : "#72e9ff", settings.reducedEffects ? 6 : clamp(Math.round(entity.radius * 0.32), 8, 36), entity.radius > 70 ? 1.8 : 1.15);
    state.shake = Math.max(state.shake, clamp(entity.radius * 0.06, 2, 10));
    if (entity.radius > 70 || entity.type === "carrier") audio.explode(true);
    else audio.explode(false);
    if (rewarded && !entity.noDrops) {
      if (encounter) encounter.killsSincePowerup += 1;
      const pity = encounter && encounter.killsSincePowerup >= CONFIG.powerups.pityKills;
      if (rng.chance(CONFIG.powerups.dropChance) || pity) {
        if (spawnPickup(entity.x + rng.range(-18, 18), entity.y + rng.range(-18, 18))) {
          if (encounter) encounter.killsSincePowerup = 0;
        }
      }
    }
    return true;
  }

  function damagePlayer(amount, sourceX, sourceY) {
    const ship = state.ship;
    if (!ship || ship.invulnerable > 0 || state.mode !== "playing") return false;
    let remaining = amount;
    if (ship.shield > 0) {
      const absorbed = Math.min(ship.shield, remaining);
      ship.shield -= absorbed;
      remaining -= absorbed;
    }
    if (remaining > 0) ship.hull -= remaining;
    ship.invulnerable = 0.72;
    state.combo = 1;
    state.comboTimer = 0;
    const angle = Math.atan2(ship.y - sourceY, ship.x - sourceX);
    ship.vx += Math.cos(angle) * 180;
    ship.vy += Math.sin(angle) * 180;
    state.shake = Math.max(state.shake, 13);
    state.flash = Math.max(state.flash, 0.9);
    state.flashColor = "#ff516d";
    burst(ship.x, ship.y, "#ff6b7c", settings.reducedEffects ? 9 : 21, 1.3);
    audio.damage();
    if (ship.hull <= 0) {
      ship.hull = 0;
      burst(ship.x, ship.y, "#ffffff", settings.reducedEffects ? 34 : 80, 2.4);
      endRun();
    }
    return true;
  }

  function spawnPickup(x, y, forcedKind) {
    if (state.pickups.length >= CONFIG.caps.pickups) return null;
    let kind = forcedKind;
    if (!kind) {
      const weighted = [
        ["shield", CONFIG.powerups.shield.weight],
        ["rapid", CONFIG.powerups.rapid.weight],
        ["repair", CONFIG.powerups.repair.weight],
        ["triShot", CONFIG.powerups.triShot.weight],
        ["piercing", CONFIG.powerups.piercing.weight],
        ["arcBurst", CONFIG.powerups.arcBurst.weight],
        ["novaLance", CONFIG.powerups.novaLance.weight],
        ["pulseCharge", CONFIG.powerups.pulseCharge.weight],
        ["module", CONFIG.powerups.moduleUpgrade.weight]
      ];
      const totalWeight = weighted.reduce((sum, item) => sum + item[1], 0);
      let roll = rng.range(0, totalWeight);
      kind = weighted[weighted.length - 1][0];
      for (const item of weighted) {
        roll -= item[1];
        if (roll <= 0) {
          kind = item[0];
          break;
        }
      }
    }
    const pickup = {
      id: nextEntityId++,
      x,
      y,
      vx: rng.range(-18, 18),
      vy: rng.range(-18, 18),
      radius: 13,
      kind,
      phase: rng.range(0, TAU),
      life: 16,
      dead: false
    };
    state.pickups.push(pickup);
    return pickup;
  }

  function applyPickup(pickup) {
    if (pickup.dead) return;
    pickup.dead = true;
    const ship = state.ship;
    if (pickup.kind === "shield") {
      ship.shield = Math.min(CONFIG.powerups.shield.cap, ship.shield + CONFIG.powerups.shield.amount);
      showPowerup("SHIELD ONLINE");
    } else if (pickup.kind === "rapid") {
      ship.rapidTimer = Math.max(ship.rapidTimer, CONFIG.powerups.rapid.duration);
      showPowerup("OVERDRIVE ACTIVE");
    } else if (pickup.kind === "triShot") {
      ship.triShotTimer = Math.max(ship.triShotTimer, CONFIG.powerups.triShot.duration);
      showPowerup("TRI-SHOT ACTIVE");
    } else if (pickup.kind === "piercing") {
      ship.piercingTimer = Math.max(ship.piercingTimer, CONFIG.powerups.piercing.duration);
      showPowerup("PHASE ROUNDS ACTIVE");
    } else if (pickup.kind === "arcBurst") {
      ship.arcBurstTimer = Math.max(ship.arcBurstTimer, CONFIG.powerups.arcBurst.duration);
      showPowerup("ARC BURST ACTIVE");
    } else if (pickup.kind === "novaLance") {
      ship.novaLanceTimer = Math.max(ship.novaLanceTimer, CONFIG.powerups.novaLance.duration);
      showPowerup("NOVA LANCE ACTIVE");
    } else if (pickup.kind === "repair") {
      ship.hull = Math.min(ship.maxHull, ship.hull + CONFIG.powerups.repair.amount);
      showPowerup("HULL REPAIRED");
    } else if (pickup.kind === "pulseCharge") {
      ship.pulse = Math.min(100, ship.pulse + CONFIG.powerups.pulseCharge.amount);
      showPowerup("VOID PULSE CHARGED");
    } else {
      grantModuleUpgrade("MODULE CACHE");
    }
    burst(pickup.x, pickup.y, "#ffffff", settings.reducedEffects ? 6 : 14, 0.9);
    audio.pickup();
  }

  function grantModuleUpgrade(source) {
    const modules = state.ship.modules;
    const unopened = MODULE_ORDER.filter((id) => !modules[id]);
    let selected;
    if (unopened.length) selected = unopened[0];
    else {
      const lowest = Math.min(...MODULE_ORDER.map((id) => modules[id] || 0));
      const eligible = MODULE_ORDER.filter((id) => (modules[id] || 0) === lowest && modules[id] < CONFIG.weapons.maxModuleTier);
      selected = eligible[0];
    }
    if (!selected) {
      state.ship.hull = Math.min(state.ship.maxHull, state.ship.hull + 25);
      state.score += 500;
      showPowerup(`${source} // SYSTEM OVERFLOW`);
      return;
    }
    modules[selected] = Math.min(CONFIG.weapons.maxModuleTier, (modules[selected] || 0) + 1);
    const label = CONFIG.weapons.modules[selected].label;
    showPowerup(`${source} // ${label} MK ${roman(modules[selected])}`);
    announce(`${label} Mk ${roman(modules[selected])}`, 1.7);
    audio.weaponSwitch();
    state.moduleSignature = "";
  }

  function showPowerup(text) {
    state.powerupText = text;
    state.powerupTextTimer = 4;
    if (dom.powerupStatus) dom.powerupStatus.textContent = text;
  }

  function roman(value) {
    return ["—", "I", "II", "III"][clamp(Math.floor(value), 0, 3)];
  }

  function addRing(x, y, color, startRadius, life, targetRadius) {
    const cap = settings.reducedEffects ? CONFIG.caps.reducedParticles : CONFIG.caps.particles;
    if (state.effects.length >= cap) return;
    state.effects.push({
      x, y,
      vx: 0,
      vy: 0,
      type: "ring",
      layer: "back",
      radius: startRadius,
      startRadius,
      targetRadius,
      color,
      life,
      maxLife: life,
      size: 1,
      dead: false
    });
  }

  function burst(x, y, color, count, force) {
    const cap = settings.reducedEffects ? CONFIG.caps.reducedParticles : CONFIG.caps.particles;
    const total = Math.min(count, Math.max(0, cap - state.effects.length));
    for (let index = 0; index < total; index += 1) {
      const angle = rng.range(0, TAU);
      const speed = rng.range(35, 155) * (force || 1);
      const life = rng.range(0.25, 0.72) * Math.min(1.5, force || 1);
      state.effects.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        type: "spark",
        layer: rng.chance(0.22) ? "back" : "front",
        radius: 0,
        color,
        life,
        maxLife: life,
        size: rng.range(2, 6) * Math.min(1.6, force || 1),
        dead: false
      });
    }
  }

  function addFloater(x, y, text, color, size) {
    if (state.floaters.length >= CONFIG.caps.floaters) state.floaters.shift();
    state.floaters.push({
      x, y,
      vx: rng.range(-7, 7),
      vy: -34,
      text: String(text),
      color,
      size,
      life: 0.75,
      maxLife: 0.75,
      dead: false
    });
  }

  function updateEffects(dt) {
    for (const effect of state.effects) {
      effect.x += effect.vx * dt;
      effect.y += effect.vy * dt;
      effect.vx *= Math.exp(-2.4 * dt);
      effect.vy *= Math.exp(-2.4 * dt);
      effect.life -= dt;
      if (effect.type === "ring") {
        const progress = 1 - clamp(effect.life / effect.maxLife, 0, 1);
        effect.radius = lerp(effect.startRadius, effect.targetRadius, 1 - Math.pow(1 - progress, 2));
      }
      if (effect.life <= 0) effect.dead = true;
    }
    for (const floater of state.floaters) {
      floater.x += floater.vx * dt;
      floater.y += floater.vy * dt;
      floater.life -= dt;
      if (floater.life <= 0) floater.dead = true;
    }
    for (const pickup of state.pickups) {
      pickup.x += pickup.vx * dt;
      pickup.y += pickup.vy * dt;
      pickup.vx *= Math.exp(-1.3 * dt);
      pickup.vy *= Math.exp(-1.3 * dt);
      pickup.life -= dt;
      if (pickup.life <= 0) pickup.dead = true;
    }
  }

  function cullWorld() {
    const ship = state.ship;
    const diagonal = Math.max(640, Math.hypot(renderer.width, renderer.height));
    const hardRadius = diagonal * CONFIG.culling.hardCullViewports;
    const softRadius = diagonal * CONFIG.culling.softCullViewports;
    const projectileRadius = diagonal * 1.1 + CONFIG.culling.projectileMargin;
    const data = state.encounterData;

    if (!state.arena.locked) {
      for (const name of THREAT_ARRAYS) {
        for (const entity of state[name]) {
          if (entity.dead || !Core.beyondRadius(entity, ship.x, ship.y, hardRadius)) continue;
          entity.dead = true;
          state.stats.culled += 1;
          if (CONFIG.culling.requeueEncounterThreats && data && !data.complete && entity.generation === data.generation) {
            data.requeue.push({
              family: entity.type ? "alien" : "asteroid",
              kind: entity.type || entity.kind,
              required: entity.required !== false,
              waveIndex: entity.waveIndex,
              health: entity.health,
              maxHealth: entity.maxHealth,
              radius: entity.radius,
              score: entity.score,
              noDrops: entity.noDrops,
              threatCost: entity.threatCost,
              fragment: entity.fragment,
              ballisticFragment: entity.ballisticFragment,
              splitRemaining: entity.splitRemaining,
              hitFlash: entity.hitFlash,
              collisionGrace: entity.collisionGrace,
              gateIndex: entity.gateIndex
            });
            data.waveSpawned = false;
            data.waveDelay = 0;
          }
        }
      }
    }
    for (const bullet of state.playerBullets) if (Core.beyondRadius(bullet, ship.x, ship.y, projectileRadius)) bullet.dead = true;
    for (const bullet of state.enemyBullets) if (Core.beyondRadius(bullet, ship.x, ship.y, projectileRadius)) bullet.dead = true;
    for (const mine of state.mines) if (Core.beyondRadius(mine, ship.x, ship.y, softRadius)) mine.dead = true;
    for (const pickup of state.pickups) if (Core.beyondRadius(pickup, ship.x, ship.y, softRadius)) pickup.dead = true;
    for (const effect of state.effects) if (Core.beyondRadius(effect, ship.x, ship.y, softRadius)) effect.dead = true;
    for (const floater of state.floaters) if (Core.beyondRadius(floater, ship.x, ship.y, softRadius)) floater.dead = true;

    Core.cleanupCapped(state.asteroids, (item) => !item.dead && Core.isFiniteEntity(item), CONFIG.caps.asteroids);
    Core.cleanupCapped(state.aliens, (item) => !item.dead && Core.isFiniteEntity(item), CONFIG.caps.aliens);
    Core.cleanupCapped(state.playerBullets, (item) => !item.dead && Core.isFiniteEntity(item), CONFIG.caps.playerProjectiles);
    Core.cleanupCapped(state.enemyBullets, (item) => !item.dead && Core.isFiniteEntity(item), CONFIG.caps.enemyProjectiles);
    Core.cleanupCapped(state.mines, (item) => !item.dead && Core.isFiniteEntity(item), CONFIG.caps.mines);
    Core.cleanupCapped(state.pickups, (item) => !item.dead && Core.isFiniteEntity(item), CONFIG.caps.pickups);
    Core.cleanupCapped(state.effects, (item) => !item.dead && Number.isFinite(item.x) && Number.isFinite(item.y), settings.reducedEffects ? CONFIG.caps.reducedParticles : CONFIG.caps.particles);
    Core.cleanupCapped(state.floaters, (item) => !item.dead && Number.isFinite(item.x) && Number.isFinite(item.y), CONFIG.caps.floaters);
  }

  function updateCamera(dt) {
    const ship = state.ship;
    const lookSpeed = Math.hypot(ship.vx, ship.vy);
    const lookScale = lookSpeed > 0.01 ? Math.min(CONFIG.camera.maxLookAhead, lookSpeed * CONFIG.camera.velocityLookAhead) / lookSpeed : 0;
    let targetX = ship.x + ship.vx * lookScale;
    let targetY = ship.y + ship.vy * lookScale;
    let sharpness = CONFIG.camera.followSharpness;
    if (state.mode === "transition" && state.cinematic.active) {
      targetX = ship.x - (state.cinematic.anchorX || 0);
      targetY = ship.y - (state.cinematic.anchorY || 0);
      sharpness = CONFIG.cinematic.cameraSharpness;
    } else if (state.combatField.active && !state.arena.active) {
      targetX = state.combatField.x;
      targetY = state.combatField.y;
      sharpness = CONFIG.combatField.cameraSharpness;
    } else if (state.arena.locked) {
      targetX = state.arena.x;
      targetY = state.arena.y;
      sharpness = CONFIG.camera.bossFollowSharpness;
    }
    const amount = 1 - Math.exp(-sharpness * dt);
    state.camera.x = lerp(state.camera.x, targetX, amount);
    state.camera.y = lerp(state.camera.y, targetY, amount);
  }

  function rebaseIfNeeded() {
    const collections = [
      state.asteroids,
      state.aliens,
      state.playerBullets,
      state.enemyBullets,
      state.mines,
      state.pickups,
      state.effects,
      state.floaters,
      state.ship.drones,
      state.boss && state.boss.nodes,
      state.boss
    ];
    const points = [state.camera, state.aimWorld, state.arena, state.combatField];
    if (state.boss && state.boss.telegraph) points.push(state.boss.telegraph);
    const result = Core.rebaseOrigin(state.ship, collections, points, CONFIG.world.floatingOriginThreshold, CONFIG.world.chunkSize * 16);
    if (result.rebased) {
      state.worldOffset.x += result.dx;
      state.worldOffset.y += result.dy;
    }
  }

  function clearPressed() {
    for (const key of Object.keys(input.pressed)) delete input.pressed[key];
  }

  function update(dt) {
    if (orientationBlocked) {
      resetBlockedInput();
      return;
    }
    if ((state.mode !== "playing" && state.mode !== "transition") || !state.ship) {
      clearPressed();
      return;
    }
    state.time += dt;
    state.runTime += dt;
    if (state.mode === "transition") {
      updateCinematic(dt);
      if (state.mode === "transition") updateCamera(dt);
      state.shake = Math.max(0, state.shake - dt * 24);
      state.flash = Math.max(0, state.flash - dt * 2.8);
      if (state.announcementTimer > 0) {
        state.announcementTimer -= dt;
        if (state.announcementTimer <= 0) hideAnnouncement();
      }
      updateUI(false);
      clearPressed();
      return;
    }
    updateShip(dt);
    updateEncounter(dt);
    updateAsteroids(dt);
    updateAliens(dt);
    collideAsteroidsAndAliens();
    updateProjectiles(dt);
    updateMines(dt);
    collidePlayerBullets();
    if (state.mode === "playing" && state.encounterData.spec.id !== "boss") updateEncounter(0);
    if (state.mode === "playing") collidePlayer();
    updateEffects(dt);
    cullWorld();
    updateCamera(dt);
    rebaseIfNeeded();

    state.comboTimer = Math.max(0, state.comboTimer - dt);
    if (state.comboTimer <= 0) state.combo = 1;
    state.shake = Math.max(0, state.shake - dt * 24);
    state.flash = Math.max(0, state.flash - dt * 2.8);
    state.powerupTextTimer = Math.max(0, (state.powerupTextTimer || 0) - dt);
    if (state.powerupTextTimer <= 0 && dom.powerupStatus) dom.powerupStatus.textContent = "";
    if (state.announcementTimer > 0) {
      state.announcementTimer -= dt;
      if (state.announcementTimer <= 0) hideAnnouncement();
    }
    audio.musicTick(state.time, state.boss ? 1 : clamp((state.asteroids.length + state.aliens.length) / 12, 0.15, 0.9));
    state.uiTimer -= dt;
    if (state.uiTimer <= 0) {
      state.uiTimer = 0.08;
      updateUI(false);
    }
    clearPressed();
  }

  function updateModuleUI() {
    if (!dom.moduleStrip || !state.ship) return;
    const signature = MODULE_ORDER.map((id) => `${id}:${state.ship.modules[id] || 0}`).join("|");
    if (signature === state.moduleSignature) return;
    state.moduleSignature = signature;
    dom.moduleStrip.textContent = "";
    for (let index = 0; index < MODULE_ORDER.length; index += 1) {
      const id = MODULE_ORDER[index];
      const tier = state.ship.modules[id] || 0;
      const slot = global.document.createElement("div");
      slot.className = `module-slot${tier ? " is-equipped" : ""}`;
      const number = global.document.createElement("span");
      number.className = "module-index";
      number.textContent = String(index + 1).padStart(2, "0");
      const name = global.document.createElement("span");
      name.className = "module-name";
      const definition = CONFIG.weapons.modules[id];
      name.textContent = tier ? `${definition.activation === "autonomous" ? "Auto · " : ""}${definition.label}` : "Empty";
      const rank = global.document.createElement("span");
      rank.className = "module-rank";
      rank.textContent = tier ? `Mk ${roman(tier)}` : "—";
      slot.appendChild(number);
      slot.appendChild(name);
      slot.appendChild(rank);
      dom.moduleStrip.appendChild(slot);
    }
  }

  function objectiveText() {
    const data = state.encounterData;
    if (!data) return "Stand by";
    if (state.mode === "transition" && state.cinematic.active) return `Transit ${Math.round(state.cinematic.progress * 100)}%`;
    if (data.spec.id === "boss") {
      if (state.arena.warning > 0) return `Arena lock in ${state.arena.warning.toFixed(1)}s`;
      if (data.bossDefeated) return `Clear remaining threats · ${encounterThreatsRemaining()}`;
      if (state.boss) return `Break ${CONFIG.bosses[state.boss.type].label}`;
      return "Signal collapsing";
    }
    const remaining = encounterThreatsRemaining();
    if (data.goalType === "titan") return remaining ? `Destroy all threats · ${remaining}` : "Area clear";
    return `Wave ${data.waveNumber}/${data.waveCount} · ${remaining} threats`;
  }

  function updateUI(force) {
    if (dom.score) dom.score.textContent = formatScore(state.score);
    if (dom.highScore) dom.highScore.textContent = formatScore(Math.max(highScore, state.score));
    if (dom.menuHighScore) dom.menuHighScore.textContent = formatScore(highScore);
    if (!state.ship) {
      updateSettingsUI();
      return;
    }
    if (dom.combo) {
      dom.combo.textContent = `Combo ×${state.combo}`;
      dom.combo.classList.toggle("is-hot", state.combo >= 5);
    }
    if (dom.sector) dom.sector.textContent = String(state.sector).padStart(2, "0");
    if (dom.encounter) dom.encounter.textContent = state.encounterData ? state.encounterData.spec.label : "Stage";
    if (dom.wave) dom.wave.textContent = String(state.encounterData && state.encounterData.waveNumber || state.encounter);
    const hullRatio = clamp(state.ship.hull / state.ship.maxHull, 0, 1);
    if (dom.hullValue) dom.hullValue.textContent = `${Math.round(hullRatio * 100)}%`;
    if (dom.hullFill) dom.hullFill.style.transform = `scaleX(${hullRatio})`;
    if (dom.hullTrack) dom.hullTrack.setAttribute("aria-valuenow", String(Math.round(hullRatio * 100)));
    const pulseRatio = clamp(state.ship.pulse / 100, 0, 1);
    if (dom.pulseValue) dom.pulseValue.textContent = pulseRatio >= 0.995 ? "READY" : `${Math.round(pulseRatio * 100)}%`;
    if (dom.pulseFill) {
      dom.pulseFill.style.transform = `scaleX(${pulseRatio})`;
      dom.pulseFill.classList.toggle("is-ready", pulseRatio >= 0.995);
    }
    if (dom.pulseTrack) dom.pulseTrack.setAttribute("aria-valuenow", String(Math.round(pulseRatio * 100)));
    if (dom.objectiveStatus) {
      const nextObjective = objectiveText();
      if (dom.objectiveStatus.textContent !== nextObjective) dom.objectiveStatus.textContent = nextObjective;
    }
    updateModuleUI();

    if (state.boss) {
      const ratio = clamp(state.boss.health / state.boss.maxHealth, 0, 1);
      show(dom.bossHud, true);
      if (dom.bossName) dom.bossName.textContent = CONFIG.bosses[state.boss.type].label;
      if (dom.bossPhase) dom.bossPhase.textContent = `Phase ${state.boss.phase + 1}`;
      if (dom.bossHealthFill) dom.bossHealthFill.style.transform = `scaleX(${ratio})`;
      if (dom.bossHealthTrack) dom.bossHealthTrack.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
      if (dom.bossHealthValue) dom.bossHealthValue.textContent = `${Math.round(ratio * 100)} percent`;
    } else {
      show(dom.bossHud, false);
    }
    if (force) updateSettingsUI();
  }

  function updateSettingsUI() {
    const soundText = settings.sound ? "On" : "Off";
    if (dom.soundButton) {
      dom.soundButton.textContent = `Sound ${soundText}`;
      dom.soundButton.setAttribute("aria-pressed", String(settings.sound));
      dom.soundButton.setAttribute("aria-label", settings.sound ? "Mute sound" : "Enable sound");
    }
    if (dom.settingsSoundButton) {
      dom.settingsSoundButton.textContent = soundText;
      dom.settingsSoundButton.setAttribute("aria-pressed", String(settings.sound));
      dom.settingsSoundButton.setAttribute("aria-label", settings.sound ? "Turn sound off" : "Turn sound on");
    }
    const effectsText = settings.reducedEffects ? "Reduced" : "Full";
    if (dom.motionButton) {
      dom.motionButton.textContent = `FX ${effectsText}`;
      dom.motionButton.setAttribute("aria-pressed", String(settings.reducedEffects));
      dom.motionButton.setAttribute("aria-label", settings.reducedEffects ? "Use full visual effects" : "Use reduced visual effects");
    }
    if (dom.settingsEffectsButton) {
      dom.settingsEffectsButton.textContent = effectsText;
      dom.settingsEffectsButton.setAttribute("aria-pressed", String(!settings.reducedEffects));
      dom.settingsEffectsButton.setAttribute("aria-label", settings.reducedEffects ? "Use full visual effects" : "Use reduced visual effects");
    }
    const fullscreen = Boolean(global.document.fullscreenElement);
    if (dom.fullscreenButton) {
      dom.fullscreenButton.textContent = fullscreen ? "Window" : "Screen";
      dom.fullscreenButton.setAttribute("aria-label", fullscreen ? "Exit fullscreen" : "Enter fullscreen");
    }
    if (dom.settingsFullscreenButton) {
      dom.settingsFullscreenButton.textContent = fullscreen ? "Exit" : "Enter";
      dom.settingsFullscreenButton.setAttribute("aria-label", fullscreen ? "Exit fullscreen" : "Enter fullscreen");
    }
  }

  function debugSnapshot() {
    return {
      mode: state.mode,
      sector: state.sector,
      encounter: state.encounter,
      score: state.score,
      ship: state.ship ? {
        x: state.ship.x,
        y: state.ship.y,
        vx: state.ship.vx,
        vy: state.ship.vy,
        hull: state.ship.hull,
        shield: state.ship.shield,
        rapidTimer: state.ship.rapidTimer,
        triShotTimer: state.ship.triShotTimer,
        piercingTimer: state.ship.piercingTimer,
        arcBurstTimer: state.ship.arcBurstTimer,
        novaLanceTimer: state.ship.novaLanceTimer,
        modules: { ...state.ship.modules },
        weaponTimers: { ...state.ship.weaponTimers }
      } : null,
      objective: state.encounterData ? {
        type: state.encounterData.goalType,
        progress: state.encounterData.goalProgress,
        target: state.encounterData.goalTarget,
        complete: state.encounterData.complete,
        waveIndex: state.encounterData.waveIndex,
        waveNumber: state.encounterData.waveNumber,
        waveCount: state.encounterData.waveCount,
        waveLabel: state.encounterData.waveLabel,
        waveSpawned: state.encounterData.waveSpawned,
        waveRequiredTotal: state.encounterData.waveRequiredTotal,
        waveRequiredCleared: state.encounterData.waveRequiredCleared,
        stageRequiredTotal: state.encounterData.stageRequiredTotal,
        stageRequiredCleared: state.encounterData.stageRequiredCleared,
        pendingSpawns: state.encounterData.pendingSpawns.length,
        requeue: state.encounterData.requeue.length,
        threatsRemaining: encounterThreatsRemaining(),
        bossDefeated: state.encounterData.bossDefeated,
        playerKills: state.encounterData.playerKills,
        environmentalKills: state.encounterData.environmentalKills,
        lastDeathCause: state.encounterData.lastDeathCause
      } : null,
      cinematic: { ...state.cinematic },
      combatField: { ...state.combatField },
      progress: {
        maxUnlockedStage: progress.maxUnlockedStage,
        lastPlayedStage: progress.lastPlayedStage
      },
      counts: {
        asteroids: state.asteroids.length,
        aliens: state.aliens.length,
        playerBullets: state.playerBullets.length,
        enemyBullets: state.enemyBullets.length,
        mines: state.mines.length,
        pickups: state.pickups.length,
        effects: state.effects.length
      },
      stats: { ...state.stats }
    };
  }

  function debugSetStage(stage, sector) {
    campaignProgressEligible = false;
    if (!state.ship) resetRun();
    state.cinematic.active = false;
    setMode("playing");
    state.sector = clamp(Math.floor(Number(sector) || state.sector || 1), 1, 999);
    state.encounter = clamp(Math.floor(Number(stage) || 1), 1, CONFIG.sector.encountersPerSector);
    clearCombatWorld();
    state.boss = null;
    state.arena.active = false;
    state.arena.locked = false;
    state.combatField.active = false;
    state.ship.x = 0;
    state.ship.y = 0;
    state.ship.vx = 0;
    state.ship.vy = 0;
    state.camera.x = 0;
    state.camera.y = 0;
    beginEncounter();
    return debugSnapshot();
  }

  function debugSetSeed(seed) {
    const value = Number(seed);
    const normalized = Number.isFinite(value) ? value >>> 0 : 1;
    rng = Core.createRng(normalized);
    return normalized;
  }

  function debugStartRun() {
    const started = startNewRun();
    campaignProgressEligible = false;
    return started;
  }

  const debugApi = Object.freeze({
    start: debugStartRun,
    step: update,
    snapshot: debugSnapshot,
    state,
    input,
    setSeed: debugSetSeed,
    setStage: debugSetStage,
    beginStage: debugSetStage,
    spawnAsteroid: (kind, options) => spawnAsteroid(kind, options),
    spawnAlien: (type, options) => spawnAlien(type, options),
    spawnPickup: (x, y, kind) => spawnPickup(x, y, kind),
    applyPickup: (pickup) => applyPickup(pickup),
    damageThreat: (entity, amount, cause) => damageThreat(entity, amount, null, cause || "player"),
    killThreat: (entity, cause) => killThreat(entity, cause || "player"),
    collideThreats: collideAsteroidsAndAliens,
    damageBoss,
    activatePulse,
    progress: Object.freeze({
      get maxUnlockedStage() { return progress.maxUnlockedStage; },
      get lastPlayedStage() { return progress.lastPlayedStage; }
    }),
    mobile: Object.freeze({
      get touchCapable() { return touchCapable; },
      get orientationBlocked() { return orientationBlocked; },
      get movePointerId() { return touchSticks.move.activeId; },
      get aimPointerId() { return touchSticks.aim.activeId; },
      get moveOrigin() { return { x: touchSticks.move.originX, y: touchSticks.move.originY }; },
      get aimOrigin() { return { x: touchSticks.aim.originX, y: touchSticks.aim.originY }; },
      clearTouchSticks,
      updateOrientationState
    }),
    config: CONFIG
  });
  ND.GameDebug = debugApi;
  ND.game = debugApi;

  let previousTime = 0;
  let accumulator = 0;
  function frame(timestamp) {
    const seconds = timestamp * 0.001;
    if (!previousTime) previousTime = seconds;
    const frameDelta = clamp(seconds - previousTime, 0, CONFIG.world.maxFrameDelta);
    previousTime = seconds;
    reconcileTouchCaptures();
    pollGamepad();
    if (!orientationBlocked && (state.mode === "playing" || state.mode === "transition")) {
      accumulator += frameDelta;
      let safety = 0;
      while (accumulator >= CONFIG.world.fixedStep && safety < 5) {
        update(CONFIG.world.fixedStep);
        accumulator -= CONFIG.world.fixedStep;
        safety += 1;
      }
      if (safety >= 5) accumulator = 0;
    } else {
      accumulator = 0;
    }
    renderer.render(state, seconds);
    global.requestAnimationFrame(frame);
  }

  setMode("menu");
  updateOrientationState();
  updateProgressUI();
  updateSettingsUI();
  updateUI(true);
  global.requestAnimationFrame(frame);
})(window);
