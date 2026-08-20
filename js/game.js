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
  const PROGRESS_STORAGE_LIMIT = 16384;
  const TOUCH_INPUT_EPSILON = 0.0001;
  const LEGACY_MODULE_ORDER = ["pulse", "homingSalvo", "radialArray", "prism", "seeker", "massDriver", "drone"];
  const LEGACY_TEMP_WEAPON_TIMERS = ["rapidTimer", "triShotTimer", "piercingTimer", "arcBurstTimer", "novaLanceTimer"];
  const LEGACY_TEMP_WEAPON_LIMITS = Object.freeze({
    rapidTimer: 40,
    triShotTimer: 40,
    piercingTimer: 40,
    arcBurstTimer: 36,
    novaLanceTimer: 48
  });
  const MODULE_ORDER = Object.keys(CONFIG.weapons.modules);
  const ENCOUNTER_COUNT = CONFIG.sector.encounters.length;
  const TEMPORARY_UPGRADE_ORDER = ["rapid", "triShot", "piercing", "arcBurst", "novaLance", "amplifier", "aegis", "thruster"];
  const TEMPORARY_TIMER_BY_KIND = {
    rapid: "rapidTimer",
    triShot: "triShotTimer",
    piercing: "piercingTimer",
    arcBurst: "arcBurstTimer",
    novaLance: "novaLanceTimer",
    amplifier: "amplifierTimer",
    aegis: "aegisTimer",
    thruster: "thrusterTimer"
  };
  const TEMP_WEAPON_TIMERS = TEMPORARY_UPGRADE_ORDER.map((kind) => TEMPORARY_TIMER_BY_KIND[kind]);
  const SCHEMA_THREE_TEMP_WEAPON_TIMERS = Object.freeze([
    "rapidTimer", "triShotTimer", "piercingTimer", "arcBurstTimer",
    "novaLanceTimer", "amplifierTimer", "aegisTimer"
  ]);
  const SCHEMA_THREE_TEMP_WEAPON_LIMITS = Object.freeze({
    rapidTimer: 112,
    triShotTimer: 112,
    piercingTimer: 104,
    arcBurstTimer: 96,
    novaLanceTimer: 120,
    amplifierTimer: 112,
    aegisTimer: 112
  });
  const LEGACY_STAGE_TO_CURRENT = Object.freeze([
    0,
    1,
    2, 2, 2,
    3, 3, 3,
    4, 4,
    5,
    6, 6, 6, 6, 6,
    7, 7, 7, 7, 7
  ]);
  const TEMPORARY_KIND_BY_TIMER = Object.freeze(Object.fromEntries(
    Object.entries(TEMPORARY_TIMER_BY_KIND).map(([kind, timer]) => [timer, kind])
  ));
  const MODULE_DESCRIPTIONS = {
    pulse: "Stacks forward repeaters into the primary firing stream.",
    homingSalvo: "Launches a repeating autonomous volley of guided rockets.",
    radialArray: "Emits a rotating autonomous ring in every direction.",
    prism: "Adds a wider prism fan whenever the primary weapon fires.",
    seeker: "Adds guided missiles whenever the primary weapon fires.",
    massDriver: "Adds a heavy piercing rail shot to the firing stream.",
    drone: "Adds an orbiting guardian that finds and fires on threats.",
    teslaCoil: "Chains periodic lightning through a bounded line of nearby threats.",
    orbitBlades: "Adds rotating blades that repeatedly cut threats around the ship.",
    mineLayer: "Periodically leaves player mines that detonate near approaching threats.",
    shieldReactor: "Periodically restores a bounded reserve of defensive shields.",
    overclock: "Permanently shortens weapon cooldowns for a faster firing cadence.",
    tractorField: "Pulls nearby field pickups toward the ship for easier collection."
  };
  const SUPPORT_UPGRADE_ORDER = ["repair", "shield", "pulseCharge"];
  const temporaryStackLimit = Math.max(1, Math.floor(CONFIG.powerups.temporaryStackLimit || 1));
  const TEMP_WEAPON_LIMITS = Object.freeze(Object.fromEntries(TEMPORARY_UPGRADE_ORDER.map((kind) => [
    TEMPORARY_TIMER_BY_KIND[kind],
    CONFIG.powerups[kind].duration * temporaryStackLimit
  ])));
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
    objectiveStatus: byId("objective-status"),
    meters: byId("meters"),
    hullValue: byId("hull-value"),
    hullFill: byId("hull-fill"),
    hullTrack: byId("hull-fill") && byId("hull-fill").parentElement,
    shieldReadout: byId("shield-readout"),
    shieldValue: byId("shield-value"),
    pulseValue: byId("pulse-value"),
    pulseFill: byId("pulse-fill"),
    pulseTrack: byId("pulse-fill") && byId("pulse-fill").parentElement,
    moduleConsole: byId("module-console"),
    moduleStrip: byId("module-strip"),
    activeEffects: byId("active-effects"),
    activeEffectsList: byId("active-effects-list"),
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
    finalEncounter: byId("final-encounter"),
    finalCombo: byId("final-combo"),
    finalBosses: byId("final-bosses"),
    newRecord: byId("new-record"),
    soundButton: byId("sound-button"),
    pauseButton: byId("pause-button"),
    settingsSoundButton: byId("settings-sound-button"),
    settingsEffectsButton: byId("settings-effects-button"),
    settingsFullscreenButton: byId("settings-fullscreen-button"),
    controlsModal: byId("controls-modal"),
    settingsModal: byId("settings-modal"),
    stageSelectModal: byId("stage-select-modal"),
    newGameModal: byId("new-game-modal"),
    newGameCancelButton: byId("new-game-cancel-button"),
    enigmaUpgradeModal: byId("enigma-upgrade-modal"),
    enigmaUpgradeGrid: byId("enigma-upgrade-grid"),
    enigmaUpgradeStatus: byId("enigma-upgrade-status"),
    stageGrid: byId("stage-grid"),
    orientationOverlay: byId("orientation-overlay"),
    touchControls: byId("touch-controls"),
    touchPulse: byId("touch-pulse"),
    touchDash: byId("touch-dash"),
    moveZone: byId("move-zone"),
    aimZone: byId("aim-zone"),
    moveKnob: byId("move-knob"),
    aimKnob: byId("aim-knob")
  };

  const MAX_LOCAL_SCORE = 999999999;

  // Saved records are deliberately smaller and stricter than live simulation state.
  function validSave(value) {
    return Boolean(value) && typeof value === "object" &&
      Number.isFinite(value.highScore) && value.highScore >= 0 && value.highScore <= MAX_LOCAL_SCORE &&
      Boolean(value.settings) && typeof value.settings === "object" &&
      typeof value.settings.sound === "boolean" && typeof value.settings.reducedEffects === "boolean";
  }

  function exactKeys(value, expected) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const keys = Object.keys(value);
    return keys.length === expected.length && expected.every((key) => keys.includes(key));
  }

  function baseCheckpoint() {
    const modules = {};
    const timers = {};
    for (const id of MODULE_ORDER) modules[id] = Math.floor(CONFIG.weapons.startingModules[id] || 0);
    for (const timer of TEMP_WEAPON_TIMERS) timers[timer] = 0;
    return { modules, timers };
  }

  function validCheckpointShape(value, moduleIds, timerIds, timerLimits) {
    if (!exactKeys(value, ["modules", "timers"]) || !exactKeys(value.modules, moduleIds) ||
        !exactKeys(value.timers, timerIds)) return false;
    for (const id of moduleIds) {
      const tier = value.modules[id];
      const minimum = CONFIG.weapons.startingModules[id] || 0;
      if (!Number.isInteger(tier) || tier < minimum || tier > CONFIG.weapons.maxModuleTier) return false;
    }
    for (const timer of timerIds) {
      const remaining = value.timers[timer];
      if (!Number.isFinite(remaining) || remaining < 0 || remaining > timerLimits[timer]) return false;
    }
    return true;
  }

  function validCheckpoint(value) {
    return validCheckpointShape(value, MODULE_ORDER, TEMP_WEAPON_TIMERS, TEMP_WEAPON_LIMITS);
  }

  function validSchemaThreeCheckpoint(value) {
    return validCheckpointShape(
      value,
      MODULE_ORDER,
      SCHEMA_THREE_TEMP_WEAPON_TIMERS,
      SCHEMA_THREE_TEMP_WEAPON_LIMITS
    );
  }

  function cloneCheckpoint(value) {
    const fallback = validCheckpoint(value) ? value : baseCheckpoint();
    return { modules: { ...fallback.modules }, timers: { ...fallback.timers } };
  }

  function validSchemaOneProgress(value) {
    return exactKeys(value, ["schema", "maxUnlockedStage", "lastPlayedStage"]) && value.schema === 1 &&
      Number.isInteger(value.maxUnlockedStage) && value.maxUnlockedStage >= 1 && value.maxUnlockedStage <= 9 &&
      Number.isInteger(value.lastPlayedStage) && value.lastPlayedStage >= 1 && value.lastPlayedStage <= value.maxUnlockedStage;
  }

  function validSchemaTwoCheckpoint(value) {
    return validCheckpointShape(
      value,
      LEGACY_MODULE_ORDER,
      LEGACY_TEMP_WEAPON_TIMERS,
      LEGACY_TEMP_WEAPON_LIMITS
    );
  }

  function validCheckpointProgress(value, schema, maximum, checkpointValidator) {
    if (!exactKeys(value, ["schema", "maxUnlockedStage", "lastPlayedStage", "checkpoints"]) ||
        value.schema !== schema ||
        !Number.isInteger(value.maxUnlockedStage) || value.maxUnlockedStage < 1 || value.maxUnlockedStage > maximum ||
        !Number.isInteger(value.lastPlayedStage) || value.lastPlayedStage < 1 ||
        value.lastPlayedStage > value.maxUnlockedStage) return false;
    const stageKeys = Array.from({ length: value.maxUnlockedStage }, (_, index) => String(index + 1));
    return exactKeys(value.checkpoints, stageKeys) && Object.values(value.checkpoints).every(checkpointValidator);
  }

  function validSchemaTwoProgress(value) {
    return validCheckpointProgress(value, 2, 9, validSchemaTwoCheckpoint);
  }

  function validSchemaThreeProgress(value) {
    return validCheckpointProgress(value, 3, 20, validSchemaThreeCheckpoint);
  }

  function validProgress(value) {
    return validCheckpointProgress(value, 4, ENCOUNTER_COUNT, validCheckpoint);
  }

  function newProgress(maxUnlockedStage, lastPlayedStage) {
    const maximum = ENCOUNTER_COUNT;
    const unlocked = clamp(Math.floor(Number(maxUnlockedStage) || 1), 1, maximum);
    const last = clamp(Math.floor(Number(lastPlayedStage) || 1), 1, unlocked);
    const checkpoints = {};
    for (let stage = 1; stage <= unlocked; stage += 1) checkpoints[String(stage)] = baseCheckpoint();
    return { schema: 4, maxUnlockedStage: unlocked, lastPlayedStage: last, checkpoints };
  }

  function copyProgress(value) {
    const copy = newProgress(value.maxUnlockedStage, value.lastPlayedStage);
    for (const key of Object.keys(copy.checkpoints)) copy.checkpoints[key] = cloneCheckpoint(value.checkpoints[key]);
    return copy;
  }

  function legacyStageToCurrent(stage) {
    const legacyStage = clamp(Math.floor(Number(stage) || 1), 1, 20);
    return LEGACY_STAGE_TO_CURRENT[legacyStage] || ENCOUNTER_COUNT;
  }

  function mergeLegacyCheckpoint(target, source, moduleIds, timerIds) {
    for (const id of moduleIds) {
      if (!Object.prototype.hasOwnProperty.call(target.modules, id)) continue;
      target.modules[id] = Math.max(target.modules[id], Math.floor(Number(source.modules[id]) || 0));
    }
    for (const timer of timerIds) {
      if (!Object.prototype.hasOwnProperty.call(target.timers, timer)) continue;
      target.timers[timer] = Math.max(
        target.timers[timer],
        clamp(Number(source.timers[timer]) || 0, 0, TEMP_WEAPON_LIMITS[timer])
      );
    }
  }

  function migrateCheckpointProgress(value, moduleIds, timerIds) {
    const unlocked = legacyStageToCurrent(value.maxUnlockedStage);
    const last = clamp(legacyStageToCurrent(value.lastPlayedStage), 1, unlocked);
    const migrated = newProgress(unlocked, last);
    for (const key of Object.keys(value.checkpoints).sort((first, second) => Number(first) - Number(second))) {
      const target = migrated.checkpoints[String(legacyStageToCurrent(key))];
      mergeLegacyCheckpoint(target, value.checkpoints[key], moduleIds, timerIds);
    }
    return migrated;
  }

  function migrateProgress(value) {
    if (validProgress(value)) return copyProgress(value);
    if (validSchemaThreeProgress(value)) {
      return migrateCheckpointProgress(value, MODULE_ORDER, SCHEMA_THREE_TEMP_WEAPON_TIMERS);
    }
    if (validSchemaTwoProgress(value)) {
      return migrateCheckpointProgress(value, LEGACY_MODULE_ORDER, LEGACY_TEMP_WEAPON_TIMERS);
    }
    if (validSchemaOneProgress(value)) {
      return newProgress(
        legacyStageToCurrent(value.maxUnlockedStage),
        legacyStageToCurrent(value.lastPlayedStage)
      );
    }
    return newProgress(1, 1);
  }

  const saved = Core.safeReadJSON(null, STORAGE_KEY, {
    highScore: 0,
    settings: { sound: true, reducedEffects: false }
  }, validSave, 1024);
  const settings = {
    sound: saved.settings.sound,
    reducedEffects: saved.settings.reducedEffects
  };
  const savedProgress = Core.safeReadJSON(null, PROGRESS_STORAGE_KEY, null, (value) =>
    validProgress(value) || validSchemaThreeProgress(value) || validSchemaTwoProgress(value) ||
      validSchemaOneProgress(value), PROGRESS_STORAGE_LIMIT);
  const progress = migrateProgress(savedProgress);
  if (savedProgress && savedProgress.schema !== 4) {
    Core.safeWriteJSON(null, PROGRESS_STORAGE_KEY, progress, validProgress, PROGRESS_STORAGE_LIMIT);
  }
  let highScore = Math.floor(saved.highScore);
  const renderer = new ND.Renderer(canvas);
  const audio = new ND.AudioEngine({ muted: !settings.sound, maxNodes: CONFIG.caps.activeAudioNodes });
  let rng = Core.createRng(Date.now());
  let nextEntityId = 1;

  // Input sources converge here so simulation never depends on a browser event being repeated.
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
      captureTracked: false,
      aimMode: "idle",
      autoAimElapsed: 0,
      autoAimTarget: null
    }
  };
  const notedTouchEvents = new WeakSet();
  const handledTouchMoves = new WeakSet();
  let touchCapable = false;
  let orientationBlocked = false;
  let campaignProgressEligible = false;
  let gamepadRequiresNeutral = false;
  let gameoverInitialShake = 0;
  let gameoverInitialFlash = 0;
  let presentedMode = null;
  const stageButtons = [];
  let upgradeChoiceButtons = [];
  let upgradeChoiceCanvases = [];

  function idleUpgradeDraft() {
    return {
      phase: "idle",
      elapsed: 0,
      duration: Math.max(CONFIG.world.fixedStep, CONFIG.powerups.enigma.slowdownSeconds),
      timeScale: 1,
      choices: [],
      focusIndex: 0,
      x: 0,
      y: 0
    };
  }

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
        closeDialog(dom.newGameModal);
        closeDialog(dom.enigmaUpgradeModal);
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
    for (const dialog of [dom.controlsModal, dom.settingsModal, dom.stageSelectModal, dom.newGameModal, dom.enigmaUpgradeModal]) {
      if (!dialog) continue;
      if (orientationBlocked) dialog.setAttribute("inert", "");
      else dialog.removeAttribute("inert");
    }
    syncModePresentation();
    if (changed && !orientationBlocked) {
      if (state.mode === "playing" && state.upgradeDraft.phase === "choosing") presentUpgradeChoices();
      else focusPrimaryModeAction(state.mode);
    }
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
    arena: { active: false, locked: false, warning: 0, x: 0, y: 0, radius: 320, halfWidth: 0, halfHeight: 0 },
    combatField: { active: false, x: 0, y: 0, halfWidth: 0, halfHeight: 0 },
    sector: 1,
    encounter: 1,
    encounterData: null,
    cinematic: {
      active: false,
      phase: "idle",
      clearElapsed: 0,
      clearDuration: CONFIG.cinematic.clearHoldSeconds,
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
    presentation: {
      gameoverPending: false,
      gameoverRemaining: 0
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
    upgradeDraft: idleUpgradeDraft(),
    stats: { culled: 0, spawned: 0, kills: 0 }
  };

  function progressionStage() {
    return state.sector > 1 ? ENCOUNTER_COUNT :
      clamp(Math.floor(Number(state.encounter) || 1), 1, ENCOUNTER_COUNT);
  }

  function currentDropBand() {
    const bands = CONFIG.powerups.dropBands;
    const stage = progressionStage();
    let selected = bands[0];
    for (const band of bands) {
      if (stage >= band.minStage) selected = band;
      else break;
    }
    return selected;
  }

  function contentUnlocked(definition) {
    if (!definition) return false;
    return progressionStage() >= Math.max(1, Math.floor(Number(definition.unlockStage) || 1));
  }

  function rewardableModuleIds() {
    if (!state.ship) return [];
    const tierCap = Math.min(
      CONFIG.weapons.maxModuleTier,
      Math.max(1, Math.floor(Number(currentDropBand().rewardTierCap) || CONFIG.weapons.maxModuleTier))
    );
    return MODULE_ORDER.filter((id) => {
      const definition = CONFIG.weapons.modules[id];
      return contentUnlocked(definition) && (state.ship.modules[id] || 0) < tierCap;
    });
  }

  function saveLocal() {
    Core.safeWriteJSON(null, STORAGE_KEY, {
      highScore,
      settings: { sound: settings.sound, reducedEffects: settings.reducedEffects }
    }, validSave, 1024);
  }

  function saveProgress() {
    return Core.safeWriteJSON(null, PROGRESS_STORAGE_KEY, progress, validProgress, PROGRESS_STORAGE_LIMIT);
  }

  function checkpointFromShip(ship) {
    const checkpoint = baseCheckpoint();
    if (!ship) return checkpoint;
    for (const id of MODULE_ORDER) {
      const minimum = CONFIG.weapons.startingModules[id] || 0;
      checkpoint.modules[id] = clamp(Math.floor(Number(ship.modules?.[id]) || 0), minimum, CONFIG.weapons.maxModuleTier);
    }
    for (const timer of TEMP_WEAPON_TIMERS) {
      checkpoint.timers[timer] = clamp(Number(ship[timer]) || 0, 0, TEMP_WEAPON_LIMITS[timer]);
    }
    return checkpoint;
  }

  function saveCurrentStageCheckpoint(stage) {
    if (!campaignProgressEligible || state.sector !== 1 || !state.ship) return false;
    const target = clamp(Math.floor(Number(stage) || state.encounter || 1), 1, progress.maxUnlockedStage);
    progress.checkpoints[String(target)] = checkpointFromShip(state.ship);
    const savedCheckpoint = saveProgress();
    updateProgressUI();
    return savedCheckpoint;
  }

  function hasSavedCampaign() {
    if (progress.maxUnlockedStage > 1 || progress.lastPlayedStage > 1) return true;
    const checkpoint = progress.checkpoints["1"];
    const base = baseCheckpoint();
    return MODULE_ORDER.some((id) => checkpoint.modules[id] !== base.modules[id]) ||
      TEMP_WEAPON_TIMERS.some((timer) => checkpoint.timers[timer] > 0);
  }

  function resetCampaignProgress() {
    const fresh = newProgress(1, 1);
    progress.schema = fresh.schema;
    progress.maxUnlockedStage = fresh.maxUnlockedStage;
    progress.lastPlayedStage = fresh.lastPlayedStage;
    progress.checkpoints = fresh.checkpoints;
    saveProgress();
    updateProgressUI();
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
    return [dom.controlsModal, dom.settingsModal, dom.stageSelectModal, dom.newGameModal, dom.enigmaUpgradeModal]
      .some((dialog) => Boolean(dialog && dialog.open));
  }

  function focusPrimaryModeAction(mode) {
    if (orientationBlocked || touchCapable && isPortraitViewport() || anyDialogOpen()) return;
    if (mode === "gameover" && state.presentation.gameoverPending) return;
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
    const upgradeBlocksPlay = state.upgradeDraft.phase !== "idle";
    const gameoverPending = mode === "gameover" && state.presentation.gameoverPending;
    setOverlayState(dom.menuOverlay, mode === "menu");
    setOverlayState(dom.pauseOverlay, mode === "paused");
    setOverlayState(dom.gameoverOverlay, mode === "gameover" && !gameoverPending);
    const inRun = mode === "playing" || mode === "transition" || mode === "paused" || gameoverPending;
    show(dom.hud, inRun);
    show(dom.meters, inRun);
    show(dom.pauseButton, !upgradeBlocksPlay && (mode === "playing" || mode === "transition"));
    show(dom.objectiveHud, inRun);
    if (!inRun) show(dom.bossHud, false);
    if (dom.touchControls) dom.touchControls.classList.toggle("is-active", mode === "playing" && !upgradeBlocksPlay);
    canvas.style.cursor = mode === "playing" && !upgradeBlocksPlay ? "crosshair" : "default";
    const canvasTabIndex = mode === "playing" && !upgradeBlocksPlay ? 0 : -1;
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

  // A checkpoint restores weapons only; every battlefield and survival value starts clean.
  function resetRun(startStage, savedLoadout) {
    const initialStage = clamp(Math.floor(Number(startStage) || 1), 1, ENCOUNTER_COUNT);
    const loadout = cloneCheckpoint(savedLoadout);
    cancelUpgradeDraft();
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
      modules: { ...loadout.modules },
      weaponTimers: Object.create(null),
      drones: [],
      orbitBlades: []
    };
    for (const timer of TEMP_WEAPON_TIMERS) ship[timer] = loadout.timers[timer];
    state.time = 0;
    state.runTime = 0;
    state.camera.x = 0;
    state.camera.y = 0;
    state.ship = ship;
    state.aimWorld.x = 200;
    state.aimWorld.y = 0;
    for (const key of ["asteroids", "aliens", "playerBullets", "enemyBullets", "mines", "pickups", "effects", "floaters"]) {
      state[key].length = 0;
    }
    state.boss = null;
    state.arena = {
      active: false,
      locked: false,
      warning: 0,
      x: 0,
      y: 0,
      radius: 320,
      halfWidth: 0,
      halfHeight: 0
    };
    state.combatField = { active: false, x: 0, y: 0, halfWidth: 0, halfHeight: 0 };
    state.sector = 1;
    state.encounter = initialStage;
    state.encounterData = null;
    state.cinematic.active = false;
    state.cinematic.phase = "idle";
    state.cinematic.clearElapsed = 0;
    state.cinematic.elapsed = 0;
    state.cinematic.progress = 0;
    state.score = 0;
    state.combo = 1;
    state.comboTimer = 0;
    state.bestCombo = 1;
    state.bossesDefeated = 0;
    state.shake = 0;
    state.flash = 0;
    state.presentation.gameoverPending = false;
    state.presentation.gameoverRemaining = 0;
    gameoverInitialShake = 0;
    gameoverInitialFlash = 0;
    state.powerupTextTimer = 0;
    state.moduleSignature = "";
    state.activeEffectSignature = "";
    if (dom.powerupStatus) dom.powerupStatus.textContent = "";
    state.stats = { culled: 0, spawned: 0, kills: 0 };
    hideAnnouncement();
    beginEncounter();
  }

  function startRunAt(stage, eligible) {
    const requestedStage = Math.floor(Number(stage));
    if (!Number.isInteger(requestedStage) || requestedStage < 1 || requestedStage > progress.maxUnlockedStage) return false;
    const recordsCampaign = eligible !== false;
    audio.ensure();
    requestLandscapeLock();
    closeDialog(dom.controlsModal);
    closeDialog(dom.settingsModal);
    closeDialog(dom.stageSelectModal);
    closeDialog(dom.newGameModal);
    closeDialog(dom.enigmaUpgradeModal);
    if (recordsCampaign) {
      progress.lastPlayedStage = requestedStage;
      saveProgress();
      updateProgressUI();
    }
    campaignProgressEligible = recordsCampaign;
    resetRun(requestedStage, recordsCampaign ? progress.checkpoints[String(requestedStage)] : baseCheckpoint());
    setMode("playing");
    if (!touchCapable) canvas.focus({ preventScroll: true });
    updateUI(true);
    return true;
  }

  function beginNewCampaign() {
    resetCampaignProgress();
    return startRunAt(1);
  }

  function requestNewCampaign() {
    if (!hasSavedCampaign()) return beginNewCampaign();
    closeDialog(dom.controlsModal);
    closeDialog(dom.settingsModal);
    closeDialog(dom.stageSelectModal);
    openDialog(dom.newGameModal);
    dom.newGameCancelButton?.focus({ preventScroll: true });
    return false;
  }

  function cancelNewCampaign() {
    closeDialog(dom.newGameModal);
    if (!orientationBlocked) dom.startButton?.focus({ preventScroll: true });
  }

  function confirmNewCampaign() {
    closeDialog(dom.newGameModal);
    return beginNewCampaign();
  }

  function restartRun() {
    const stage = clamp(Math.floor(Number(state.encounter) || progress.lastPlayedStage || 1), 1, progress.maxUnlockedStage);
    return startRunAt(stage, campaignProgressEligible);
  }

  function returnToMenu() {
    cancelUpgradeDraft();
    saveCurrentStageCheckpoint();
    state.shake = 0;
    state.flash = 0;
    state.presentation.gameoverPending = false;
    state.presentation.gameoverRemaining = 0;
    gameoverInitialShake = 0;
    gameoverInitialFlash = 0;
    state.ship = null;
    state.boss = null;
    state.arena.active = false;
    state.combatField.active = false;
    setMode("menu");
    updateUI(true);
  }

  function togglePause(forcePause) {
    if (state.upgradeDraft.phase !== "idle") {
      if ((state.mode === "playing" || state.mode === "transition") && forcePause === true) {
        const heldGamepadButtons = input.lastGamepadButtons.slice();
        resetTransientInput();
        input.lastGamepadButtons = heldGamepadButtons;
        state.resumeMode = state.mode;
        closeDialog(dom.enigmaUpgradeModal);
        setMode("paused");
        return true;
      }
      if (state.mode === "paused" && forcePause !== true) {
        const heldGamepadButtons = input.lastGamepadButtons.slice();
        resetTransientInput();
        input.lastGamepadButtons = heldGamepadButtons;
        setMode(state.resumeMode === "transition" && state.cinematic.active ? "transition" : "playing");
        if (state.upgradeDraft.phase === "choosing") presentUpgradeChoices();
        return true;
      }
      return false;
    }
    if ((state.mode === "playing" || state.mode === "transition") && forcePause !== false) {
      resetTransientInput();
      if (touchCapable && state.ship) {
        state.ship.vx = 0;
        state.ship.vy = 0;
        state.ship.engine = 0;
        state.ship.dashTime = 0;
      }
      state.resumeMode = state.mode;
      setMode("paused");
    } else if (state.mode === "paused" && forcePause !== true) {
      setMode(state.resumeMode === "transition" && state.cinematic.active ? "transition" : "playing");
      if (!touchCapable) canvas.focus({ preventScroll: true });
    }
    return true;
  }

  function endRun() {
    if (state.mode === "gameover") return;
    cancelUpgradeDraft();
    saveCurrentStageCheckpoint();
    const oldHighScore = highScore;
    highScore = Math.min(MAX_LOCAL_SCORE, Math.max(highScore, Math.floor(state.score)));
    saveLocal();
    if (dom.finalScore) dom.finalScore.textContent = formatScore(state.score);
    if (dom.finalSector) dom.finalSector.textContent = String(state.sector);
    if (dom.finalEncounter) dom.finalEncounter.textContent = String(state.encounter);
    if (dom.finalCombo) dom.finalCombo.textContent = `×${state.bestCombo}`;
    if (dom.finalBosses) dom.finalBosses.textContent = String(state.bossesDefeated);
    show(dom.newRecord, highScore > oldHighScore);
    state.presentation.gameoverPending = true;
    state.presentation.gameoverRemaining = CONFIG.presentation.gameoverEffectDuration;
    gameoverInitialShake = Math.max(0, state.shake);
    gameoverInitialFlash = Math.max(0, state.flash);
    resetTransientInput();
    setMode("gameover");
    updateUI(true);
  }

  function openDialog(dialog) {
    if (!dialog || orientationBlocked) return;
    dialog.removeAttribute("inert");
    if (dialog.open) return;
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
      const loadout = global.document.createElement("span");
      loadout.className = "stage-loadout-summary";
      const loadoutLabel = stageCardText("stage-loadout-label", "Checkpoint loadout");
      const loadoutModules = global.document.createElement("span");
      loadoutModules.className = "stage-loadout-modules";
      loadout.appendChild(loadoutLabel);
      loadout.appendChild(loadoutModules);
      copy.appendChild(loadout);

      button.appendChild(preview);
      button.appendChild(copy);
      button.addEventListener("click", () => {
        if (orientationBlocked || state.mode !== "menu" || stage > progress.maxUnlockedStage) return;
        startRunAt(stage);
      });
      dom.stageGrid.appendChild(button);
      stageButtons.push({ stage, spec, button, status, loadoutModules });
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
      const checkpoint = unlocked ? cloneCheckpoint(progress.checkpoints[String(entry.stage)]) : null;
      const equipped = checkpoint ? MODULE_ORDER.filter((id) => checkpoint.modules[id] > 0) : [];
      const autonomous = checkpoint ? equipped.filter((id) => CONFIG.weapons.modules[id].activation === "autonomous") : [];
      const temporaryEntries = checkpoint ? TEMP_WEAPON_TIMERS.filter((timer) => checkpoint.timers[timer] > 0).map((timer) => ({
        kind: TEMPORARY_KIND_BY_TIMER[timer],
        seconds: Math.ceil(checkpoint.timers[timer])
      })) : [];
      const temporaryCount = temporaryEntries.length;
      const temporarySeconds = temporaryEntries.reduce((total, item) => total + item.seconds, 0);
      const loadoutDescription = checkpoint ? equipped.map((id) =>
        `${CONFIG.weapons.modules[id].label} Mk ${roman(checkpoint.modules[id])}${CONFIG.weapons.modules[id].activation === "autonomous" ? ", autonomous" : ""}`
      ).concat(temporaryEntries.map((item) => `${CONFIG.powerups[item.kind].label}, ${item.seconds} seconds remaining`)).join("; ") : "No checkpoint";
      entry.button.disabled = !unlocked;
      entry.button.setAttribute("aria-label", `Stage ${entry.stage}: ${entry.spec.label}. ${unlocked ? `Unlocked. Checkpoint loadout: ${loadoutDescription || "no weapons"}.` : "Locked."}`);
      if (current) entry.button.setAttribute("aria-current", "step");
      else entry.button.removeAttribute("aria-current");
      entry.status.textContent = unlocked ? (current ? "Last played" : "Unlocked") : "Locked";
      if (entry.loadoutModules) {
        entry.loadoutModules.textContent = "";
        const moduleCount = stageCardText("stage-loadout-module", unlocked ? `${equipped.length}/${MODULE_ORDER.length} modules` : "Locked");
        entry.loadoutModules.appendChild(moduleCount);
        if (unlocked) {
          const autoCount = stageCardText("stage-loadout-module", `${autonomous.length} auto`);
          entry.loadoutModules.appendChild(autoCount);
          if (temporaryCount) {
            const temporary = stageCardText("stage-loadout-module is-temporary", `${temporaryCount} timed · ${temporarySeconds}s`);
            entry.loadoutModules.appendChild(temporary);
          }
        }
      }
    }
  }

  function openStageSelect() {
    if (progress.maxUnlockedStage < 2 || state.mode !== "menu") return;
    updateProgressUI();
    closeDialog(dom.controlsModal);
    closeDialog(dom.settingsModal);
    closeDialog(dom.newGameModal);
    openDialog(dom.stageSelectModal);
    const target = stageButtons.find((entry) => entry.stage === progress.lastPlayedStage);
    target?.button.focus();
  }

  function unlockNextStage(completedStage) {
    const stage = clamp(Math.floor(Number(completedStage) || 1), 1, ENCOUNTER_COUNT);
    const nextStage = Math.min(ENCOUNTER_COUNT, stage + 1);
    progress.maxUnlockedStage = Math.max(progress.maxUnlockedStage, nextStage);
    progress.lastPlayedStage = nextStage;
    progress.checkpoints[String(nextStage)] = checkpointFromShip(state.ship);
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

  function bindButton(id, action, allowDuringUpgrade) {
    const button = byId(id);
    if (button) button.addEventListener("click", (event) => {
      if (orientationBlocked || state.upgradeDraft.phase !== "idle" && !allowDuringUpgrade) {
        event.preventDefault();
        return;
      }
      action(event);
    });
  }

  bindButton("start-button", requestNewCampaign);
  bindButton("continue-button", openStageSelect);
  bindButton("restart-button", restartRun);
  bindButton("restart-pause-button", restartRun);
  bindButton("resume-button", () => togglePause(false), true);
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
  bindButton("new-game-cancel-button", cancelNewCampaign);
  bindButton("new-game-confirm-button", confirmNewCampaign);
  bindButton("sound-button", toggleSound);
  bindButton("settings-sound-button", toggleSound);
  bindButton("settings-effects-button", toggleEffects);
  bindButton("settings-fullscreen-button", toggleFullscreen);
  if (dom.newGameModal) dom.newGameModal.addEventListener("cancel", (event) => {
    event.preventDefault();
    cancelNewCampaign();
  });
  if (dom.enigmaUpgradeModal) dom.enigmaUpgradeModal.addEventListener("cancel", (event) => {
    event.preventDefault();
  });
  function dashReady(ship) {
    return Boolean(ship) && ship.dashCooldown <= 0;
  }

  function pulseReady(ship) {
    return Boolean(ship) && ship.pulse >= CONFIG.voidPulse.activationThreshold;
  }

  function bindTouchAction(id, action, available) {
    const button = byId(id);
    if (!button) return;
    let touchActivation = false;
    button.addEventListener("pointerdown", (event) => {
      noteTouchInteraction(event);
      if (event.pointerType !== "touch") {
        touchActivation = false;
        return;
      }
      if (orientationBlocked || state.upgradeDraft.phase !== "idle" || !available()) return;
      touchActivation = true;
      action();
      event.preventDefault();
    }, { passive: false });
    button.addEventListener("click", (event) => {
      const directActivation = event.detail === 0;
      if (directActivation) touchActivation = false;
      else if (touchActivation) {
        touchActivation = false;
        event.preventDefault();
        return;
      }
      if (orientationBlocked || state.upgradeDraft.phase !== "idle" || !available()) {
        event.preventDefault();
        return;
      }
      action();
    });
    button.addEventListener("pointercancel", () => { touchActivation = false; });
  }

  bindTouchAction("touch-dash", () => { input.pressed.dash = true; }, () => dashReady(state.ship));
  bindTouchAction("touch-pulse", () => { input.pressed.pulse = true; }, () => pulseReady(state.ship));

  // Browser input handlers only write intent; the fixed-step update consumes that intent.
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
    if (state.upgradeDraft.phase !== "idle") {
      if (state.mode === "paused" && ["p", "escape"].includes(key) && !event.repeat) {
        togglePause(false);
        event.preventDefault();
      } else if (state.upgradeDraft.phase === "choosing" && ["1", "2", "3"].includes(key) && !event.repeat) {
        selectUpgradeChoice(Number(key) - 1);
        event.preventDefault();
      } else if (!["tab", "enter", "space"].includes(key)) {
        event.preventDefault();
      }
      return;
    }
    if (!input.keys[key]) input.pressed[key] = true;
    input.keys[key] = true;
    if (["space", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
    const dialogOpen = anyDialogOpen();
    if ((key === "p" || key === "escape") && !dialogOpen && !event.repeat && (state.mode === "playing" || state.mode === "transition" || state.mode === "paused")) {
      event.preventDefault();
      togglePause();
    }
    if (key === "m" && !event.repeat) toggleSound();
  }, { passive: false });

  global.addEventListener("keyup", (event) => {
    const key = normalizeKey(event);
    if (state.upgradeDraft.phase !== "idle") {
      delete input.keys[key];
      delete input.pressed[key];
      return;
    }
    if (orientationBlocked) {
      delete input.keys[key];
      delete input.pressed[key];
      return;
    }
    input.keys[key] = false;
  });

  canvas.addEventListener("pointermove", (event) => {
    if (orientationBlocked || state.upgradeDraft.phase !== "idle") return;
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
    if (orientationBlocked || state.upgradeDraft.phase !== "idle") return;
    if (event.pointerType === "touch") {
      beginTouchStick(event);
      return;
    }
    audio.ensure();
    input.pointerFire = true;
    input.pressed.primaryFire = true;
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
    const radius = Math.max(24, Number(CONFIG.mobileControls.stickRadius) || 56);
    let dx = clientX - stick.originX;
    let dy = clientY - stick.originY;
    let length = Math.hypot(dx, dy);
    if (length > radius) {
      const overshoot = length - radius;
      stick.originX += dx / length * overshoot;
      stick.originY += dy / length * overshoot;
      placeTouchStick(stick, stick.originX, stick.originY, canvas.getBoundingClientRect());
      dx = clientX - stick.originX;
      dy = clientY - stick.originY;
      length = Math.hypot(dx, dy);
    }
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
    const magnitude = Math.hypot(response.x, response.y);
    if (magnitude > TOUCH_INPUT_EPSILON) {
      stick.aimMode = "manual";
      stick.autoAimElapsed = 0;
      stick.autoAimTarget = null;
    }
    input.touchAimX = response.x;
    input.touchAimY = response.y;
    input.touchFire = magnitude > CONFIG.mobileControls.aimFireThreshold;
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
      stick.aimMode = "pending";
      stick.autoAimElapsed = 0;
      stick.autoAimTarget = null;
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
      stick.aimMode = "idle";
      stick.autoAimElapsed = 0;
      stick.autoAimTarget = null;
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

  function handleViewportResize() {
    renderer.resize();
    if (state.combatField.active) resizeCombatField();
    if (state.arena.active) resizeArena();
    updateOrientationState();
  }

  function handleOrientationChange() {
    clearTouchSticks();
    input.pointerFire = false;
    handleViewportResize();
  }

  global.addEventListener("resize", handleViewportResize);
  global.visualViewport?.addEventListener("resize", handleViewportResize);
  global.addEventListener("orientationchange", handleOrientationChange);
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
      togglePause(true);
    }
  });
  global.addEventListener("blur", () => {
    if (!touchCapable && (state.mode === "playing" || state.mode === "transition")) {
      togglePause(true);
    } else if (touchCapable) {
      clearTouchSticks();
      input.pointerFire = false;
    }
  });
  global.addEventListener("pagehide", () => {
    if (state.mode === "playing" || state.mode === "transition") {
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
    const gamepadAxesActive = pad.axes.some((axis) => Math.abs(Number(axis) || 0) > 0.19);
    if (state.upgradeDraft.phase !== "idle") {
      input.gamepadMoveX = input.gamepadMoveY = input.gamepadAimX = input.gamepadAimY = 0;
      input.gamepadFire = false;
      for (const key of Object.keys(input.pressed)) delete input.pressed[key];
      if (state.mode === "paused") {
        if (nowButtons[9] && !input.lastGamepadButtons[9]) togglePause(false);
      } else if (state.upgradeDraft.phase === "choosing") {
        if (nowButtons[14] && !input.lastGamepadButtons[14]) focusUpgradeChoice(-1);
        if (nowButtons[15] && !input.lastGamepadButtons[15]) focusUpgradeChoice(1);
        if (nowButtons[0] && !input.lastGamepadButtons[0]) selectUpgradeChoice(state.upgradeDraft.focusIndex);
      }
      input.lastGamepadButtons = nowButtons;
      return;
    }
    if (gamepadRequiresNeutral) {
      input.gamepadMoveX = input.gamepadMoveY = input.gamepadAimX = input.gamepadAimY = 0;
      input.gamepadFire = false;
      for (const key of Object.keys(input.pressed)) delete input.pressed[key];
      input.lastGamepadButtons = nowButtons;
      if (!nowButtons.some(Boolean) && !gamepadAxesActive) gamepadRequiresNeutral = false;
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

  // Encounter geometry is viewport-derived, while stage composition remains config-driven.
  function combatFieldHalfWidth() {
    return Math.max(CONFIG.combatField.minHalfWidth, renderer.width * CONFIG.combatField.halfWidthViewportRatio);
  }

  function combatFieldHalfHeight() {
    return Math.max(CONFIG.combatField.minHalfHeight, renderer.height * CONFIG.combatField.halfHeightViewportRatio);
  }

  function resizeArena() {
    const arena = state.arena;
    if (!arena) return;
    arena.halfWidth = state.combatField.active ? state.combatField.halfWidth : combatFieldHalfWidth();
    arena.halfHeight = state.combatField.active ? state.combatField.halfHeight : combatFieldHalfHeight();
    arena.radius = Math.hypot(arena.halfWidth, arena.halfHeight);
  }

  function constrainToArena(entity, padding, bounce) {
    const arena = state.arena;
    if (!arena || !arena.locked) return;
    const inset = Math.max(0, Number(entity.radius) || 0) + Math.max(0, Number(padding) || 0);
    const left = arena.x - Math.max(0, arena.halfWidth - inset);
    const right = arena.x + Math.max(0, arena.halfWidth - inset);
    const top = arena.y - Math.max(0, arena.halfHeight - inset);
    const bottom = arena.y + Math.max(0, arena.halfHeight - inset);
    const restitution = Math.max(0, Number(bounce) || 0);
    if (entity.x < left) {
      entity.x = left;
      if (entity.vx < 0) entity.vx = -entity.vx * restitution;
    } else if (entity.x > right) {
      entity.x = right;
      if (entity.vx > 0) entity.vx = -entity.vx * restitution;
    }
    if (entity.y < top) {
      entity.y = top;
      if (entity.vy < 0) entity.vy = -entity.vy * restitution;
    } else if (entity.y > bottom) {
      entity.y = bottom;
      if (entity.vy > 0) entity.vy = -entity.vy * restitution;
    }
  }

  function resizeCombatField() {
    const field = state.combatField;
    field.halfWidth = combatFieldHalfWidth();
    field.halfHeight = combatFieldHalfHeight();
    if (!state.ship || !field.active) return;
    field.halfWidth = Math.max(field.halfWidth, Math.abs(state.ship.x - field.x) + state.ship.radius);
    field.halfHeight = Math.max(field.halfHeight, Math.abs(state.ship.y - field.y) + state.ship.radius);
    clampCameraToCombatField();
  }

  function openCombatField() {
    const field = state.combatField;
    const ship = state.ship;
    field.active = true;
    field.x = state.camera.x;
    field.y = state.camera.y;
    resizeCombatField();
    // A carried hyperspace anchor can be slightly wider than the default
    // rectangle. The shared resize path grows this field around the camera
    // instead of moving the ship.
    ship.x = clamp(ship.x, field.x - field.halfWidth + ship.radius, field.x + field.halfWidth - ship.radius);
    ship.y = clamp(ship.y, field.y - field.halfHeight + ship.radius, field.y + field.halfHeight - ship.radius);
  }

  function beginEncounter() {
    const spec = CONFIG.sector.encounters[state.encounter - 1];
    const isBoss = Boolean(spec.bossType);
    openCombatField();
    state.encounterData = {
      spec,
      generation: `${state.sector}:${state.encounter}:${state.runTime.toFixed(2)}`,
      timer: 0,
      complete: false,
      guaranteedGranted: false,
      goalType: spec.goal.type,
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
      reinforcementDelay: 0,
      pendingSpawns: [],
      requeue: [],
      playerKills: 0,
      environmentalKills: 0,
      lastDeathCause: null,
      bossDefeated: false,
      bossRewardGranted: false,
      killsSincePowerup: 0
    };
    announce(isBoss ? "Alien capital ship incoming" : spec.label, isBoss ? 2.6 : 1.5);
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
    state.arena.x = state.combatField.x;
    state.arena.y = state.combatField.y;
    resizeArena();
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

  function bossHasLivingNodes() {
    const nodes = state.boss && state.boss.nodes;
    if (!nodes) return false;
    for (const node of nodes) if (!node.dead && Number(node.health) > 0) return true;
    return false;
  }

  function touchAutoAimEligible(target) {
    if (!target || target.dead || !Number.isFinite(Number(target.x)) || !Number.isFinite(Number(target.y)) ||
        !Number.isFinite(Number(target.health)) || Number(target.health) <= 0) return false;
    return target !== state.boss || !bossHasLivingNodes();
  }

  function touchAutoAimTargetValid(target) {
    if (!target || target.dead || !Number.isFinite(Number(target.x)) || !Number.isFinite(Number(target.y)) ||
        !Number.isFinite(Number(target.health)) || Number(target.health) <= 0) return false;
    if (state.asteroids.includes(target) || state.aliens.includes(target)) return true;
    if (!state.boss || state.boss.dead) return false;
    if (target === state.boss) return touchAutoAimEligible(target);
    return Boolean(state.boss.nodes && state.boss.nodes.includes(target));
  }

  function updateTouchAutoAim(dt, ship) {
    const stick = touchSticks.aim;
    if (stick.activeId === null || stick.aimMode === "idle" || stick.aimMode === "manual") return null;
    if (stick.aimMode === "pending") {
      const delay = Math.max(0, Number(CONFIG.mobileControls.autoAimHoldSeconds) || 0);
      stick.autoAimElapsed = Math.min(delay, stick.autoAimElapsed + dt);
      if (stick.autoAimElapsed < delay) return null;
      stick.aimMode = "auto";
    }
    if (!touchAutoAimTargetValid(stick.autoAimTarget)) {
      stick.autoAimTarget = nearestTarget(
        ship.x,
        ship.y,
        Number.POSITIVE_INFINITY,
        touchAutoAimEligible
      );
    }
    return touchAutoAimTargetValid(stick.autoAimTarget) ? stick.autoAimTarget : null;
  }

  function readAim(ship, autoAimTarget) {
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
    if (autoAimTarget) {
      state.aimWorld.x = autoAimTarget.x;
      state.aimWorld.y = autoAimTarget.y;
      return Math.atan2(autoAimTarget.y - ship.y, autoAimTarget.x - ship.x);
    }
    state.aimWorld.x = ship.x + Math.cos(ship.angle) * 400;
    state.aimWorld.y = ship.y + Math.sin(ship.angle) * 400;
    return ship.angle;
  }

  function nonTouchManualAimActive() {
    const x = (input.keys.l ? 1 : 0) - (input.keys.j ? 1 : 0) + input.gamepadAimX;
    const y = (input.keys.k ? 1 : 0) - (input.keys.i ? 1 : 0) + input.gamepadAimY;
    return Math.hypot(x, y) > 0.14 || input.pointerActive;
  }

  function shouldFire(autoAimTarget) {
    const touchFire = touchSticks.aim.activeId !== null && input.touchFire;
    return Boolean(input.keys.space || input.pressed.space || input.pointerFire || input.pressed.primaryFire ||
      touchFire || autoAimTarget || input.gamepadFire);
  }

  function constrainShipToCombatField(ship) {
    const field = state.combatField;
    if (!field.active) return;
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

  function moduleTierValues(ship, moduleId) {
    const tier = ship && ship.modules[moduleId] || 0;
    const definition = CONFIG.weapons.modules[moduleId];
    return tier > 0 && definition ? definition.tiers[tier - 1] : null;
  }

  function overclockCooldownMultiplier(ship) {
    const values = moduleTierValues(ship, "overclock");
    return values ? clamp(Number(values.cooldownMultiplier) || 1, 0.2, 1) : 1;
  }

  function amplifiedDamage(amount) {
    const multiplier = state.ship && state.ship.amplifierTimer > 0 ?
      Math.max(1, Number(CONFIG.powerups.amplifier.damageMultiplier) || 1) : 1;
    return Math.max(0, Number(amount) || 0) * multiplier;
  }

  function updateTractorField(dt) {
    const ship = state.ship;
    const values = moduleTierValues(ship, "tractorField");
    if (!values) return;
    const range = Math.max(0, Number(values.range) || 0);
    const strength = Math.max(0, Number(values.strength) || 0);
    const rangeSquared = range * range;
    for (const pickup of state.pickups) {
      if (pickup.dead) continue;
      const dx = ship.x - pickup.x;
      const dy = ship.y - pickup.y;
      const squared = dx * dx + dy * dy;
      if (squared <= 0.0001 || squared > rangeSquared) continue;
      const distance = Math.sqrt(squared);
      const acceleration = strength * (1 - distance / Math.max(1, range) * 0.45);
      pickup.vx += dx / distance * acceleration * dt;
      pickup.vy += dy / distance * acceleration * dt;
      const speed = Math.hypot(pickup.vx, pickup.vy);
      if (speed > 560) {
        pickup.vx = pickup.vx / speed * 560;
        pickup.vy = pickup.vy / speed * 560;
      }
    }
  }

  // Simulation systems below run only from the fixed-step update path.
  function updateShip(dt) {
    const ship = state.ship;
    const move = readMovement();
    const autoAimTarget = updateTouchAutoAim(dt, ship);
    const touchAimMagnitude = touchSticks.aim.activeId !== null || !touchCapable ?
      Math.hypot(input.touchAimX, input.touchAimY) : 0;
    const appliedAutoAimTarget = autoAimTarget && touchAimMagnitude <= TOUCH_INPUT_EPSILON && !nonTouchManualAimActive()
      ? autoAimTarget
      : null;
    const aim = readAim(ship, appliedAutoAimTarget);
    if (touchAimMagnitude > TOUCH_INPUT_EPSILON || appliedAutoAimTarget) {
      const turnScale = appliedAutoAimTarget ? 1 :
        clamp(touchAimMagnitude / Math.max(TOUCH_INPUT_EPSILON, CONFIG.mobileControls.aimMaxOutput), 0, 1);
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
    for (const timer of TEMP_WEAPON_TIMERS) ship[timer] = Math.max(0, ship[timer] - dt);
    ship.pulse = clamp(ship.pulse + dt * CONFIG.voidPulse.rechargePerSecond, 0, 100);

    if ((input.pressed.shift || input.pressed.dash) && dashReady(ship)) {
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

    if ((input.pressed.e || input.pressed.pulse) && pulseReady(ship)) activatePulse();
    if (state.mode !== "playing") return;

    if (ship.dashTime <= 0) {
      const thrusterActive = ship.thrusterTimer > 0;
      const acceleration = CONFIG.world.playerAcceleration * (thrusterActive
        ? Math.max(1, Number(CONFIG.powerups.thruster.accelerationMultiplier) || 1)
        : 1);
      const maximumSpeed = CONFIG.world.playerMaxSpeed * (thrusterActive
        ? Math.max(1, Number(CONFIG.powerups.thruster.maxSpeedMultiplier) || 1)
        : 1);
      ship.vx += move.x * acceleration * dt;
      ship.vy += move.y * acceleration * dt;
      const drag = Math.exp(-CONFIG.world.playerDrag * dt);
      ship.vx *= drag;
      ship.vy *= drag;
      const speed = Math.hypot(ship.vx, ship.vy);
      if (speed > maximumSpeed) {
        ship.vx = ship.vx / speed * maximumSpeed;
        ship.vy = ship.vy / speed * maximumSpeed;
      }
    }

    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    ship.engine = clamp(Math.hypot(move.x, move.y) + (ship.dashTime > 0 ? 0.8 : 0), 0, 1.6);
    constrainShipToCombatField(ship);
    if (!input.pointerActive) {
      state.aimWorld.x = ship.x + Math.cos(ship.angle) * 400;
      state.aimWorld.y = ship.y + Math.sin(ship.angle) * 400;
    }
    if (shouldFire(appliedAutoAimTarget)) fireModules(dt);
    else tickWeaponTimers(dt);
    updateDrones(dt);
    updateOrbitBlades(dt);
    updatePassiveModules(dt);
    updateTractorField(dt);
  }

  function tickWeaponTimers(dt) {
    const timers = state.ship.weaponTimers;
    for (const id of MODULE_ORDER) {
      if (CONFIG.weapons.modules[id].activation === "whileFiring") {
        timers[id] = Math.max(0, (timers[id] || 0) - dt);
      }
    }
  }

  function fireModules(dt) {
    const ship = state.ship;
    const rapid = ship.rapidTimer > 0 ? CONFIG.powerups.rapid.cooldownMultiplier : 1;
    const overclock = overclockCooldownMultiplier(ship);
    for (const id of MODULE_ORDER) {
      const tier = ship.modules[id] || 0;
      const definition = CONFIG.weapons.modules[id];
      if (!tier || definition.activation !== "whileFiring") continue;
      ship.weaponTimers[id] = Math.max(0, (ship.weaponTimers[id] || 0) - dt);
      if (ship.weaponTimers[id] > 0) continue;
      const values = definition.tiers[tier - 1];
      ship.weaponTimers[id] = values.cooldown * rapid * overclock;
      const baseCount = values.projectiles || 1;
      const count = ship.triShotTimer > 0 ? Math.max(3, baseCount + CONFIG.powerups.triShot.extraProjectiles) : baseCount;
      const spreadWidth = ship.triShotTimer > 0 ? Math.max(values.spread || 0, CONFIG.powerups.triShot.minimumSpread) : (values.spread || 0);
      for (let index = 0; index < count; index += 1) {
        const spread = count === 1 ? 0 : ((index / (count - 1)) - 0.5) * spreadWidth;
        spawnPlayerBullet(id, ship.x + Math.cos(ship.angle) * 23, ship.y + Math.sin(ship.angle) * 23, ship.angle + spread, values);
      }
      audio.weapon(id);
    }
    fireTemporaryWeapons(dt);
  }

  function fireTemporaryWeapons(dt) {
    const ship = state.ship;
    const overclock = overclockCooldownMultiplier(ship);
    if (ship.arcBurstTimer > 0) {
      ship.weaponTimers.arcBurst = Math.max(0, (ship.weaponTimers.arcBurst || 0) - dt);
      if (ship.weaponTimers.arcBurst <= 0) {
        const values = CONFIG.powerups.arcBurst;
        ship.weaponTimers.arcBurst = values.cooldown * overclock;
        for (let index = 0; index < values.projectiles; index += 1) {
          const offset = values.projectiles === 1 ? 0 : (index / (values.projectiles - 1) - 0.5) * values.spread;
          spawnTemporaryBullet("arc", ship.angle + offset, values);
        }
        audio.weapon("arcBurst");
      }
    }
    if (ship.novaLanceTimer > 0) {
      ship.weaponTimers.novaLance = Math.max(0, (ship.weaponTimers.novaLance || 0) - dt);
      if (ship.weaponTimers.novaLance <= 0) {
        const values = CONFIG.powerups.novaLance;
        ship.weaponTimers.novaLance = values.cooldown * overclock;
        spawnTemporaryBullet("lance", ship.angle, values);
        audio.weapon("novaLance");
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
      damage: amplifiedDamage(values.damage),
      life: values.life,
      maxLife: values.life,
      kind,
      color: values.color,
      pierce: values.pierce || 0,
      turnRate: 0,
      blastRadius: 0,
      hits: [],
      dead: false
    };
    state.playerBullets.push(bullet);
    return bullet;
  }

  function spawnPlayerBullet(moduleId, x, y, angle, values) {
    if (state.playerBullets.length >= CONFIG.caps.playerProjectiles) return null;
    const definition = CONFIG.weapons.modules[moduleId] || CONFIG.weapons.modules.drone;
    const kind = moduleId === "massDriver" ? "rail" : moduleId === "seeker" ? "missile" : definition.projectileType;
    const autonomousRange = definition.activation === "autonomous" ? Math.max(0, Number(values.range) || 0) : 0;
    const authoredLife = Math.max(CONFIG.world.fixedStep, Number(values.life) || CONFIG.world.fixedStep);
    const rangeLife = autonomousRange > 0 && Number(values.speed) > 0 ? autonomousRange / Number(values.speed) : authoredLife;
    const life = Math.max(CONFIG.world.fixedStep, Math.min(authoredLife, rangeLife));
    const bullet = {
      id: nextEntityId++,
      x, y, px: x, py: y,
      vx: Math.cos(angle) * values.speed,
      vy: Math.sin(angle) * values.speed,
      radius: kind === "missile" ? 4 : kind === "rail" ? 3.5 : 2.5,
      damage: amplifiedDamage(values.damage),
      life,
      maxLife: life,
      kind,
      sourceModule: moduleId,
      color: definition.color,
      pierce: (values.pierce || 0) + (state.ship.piercingTimer > 0 ? CONFIG.powerups.piercing.bonusPierce : 0),
      turnRate: values.turnRate || 0,
      targetRange: Math.max(0, Number(values.targetRange) || autonomousRange || 0),
      blastRadius: values.blastRadius || 0,
      hits: [],
      dead: false
    };
    state.playerBullets.push(bullet);
    return bullet;
  }

  function updateDrones(dt) {
    const ship = state.ship;
    const tier = ship.modules.drone || 0;
    const desired = tier ? Math.min(CONFIG.caps.drones, CONFIG.weapons.modules.drone.tiers[tier - 1].drones) : 0;
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
      const target = nearestTarget(drone.x, drone.y, Math.max(1, Number(values.range) || 1));
      if (target) {
        drone.angle = Math.atan2(target.y - drone.y, target.x - drone.x);
        if (drone.cooldown <= 0) {
          drone.cooldown = values.cooldown * overclockCooldownMultiplier(ship);
          if (spawnPlayerBullet("drone", drone.x, drone.y, drone.angle, values)) audio.weapon("drone");
        }
      } else {
        drone.angle = orbit + Math.PI / 2;
      }
    }
  }

  function hitPlayerTarget(target, amount, cause) {
    if (!target || target.dead) return false;
    if (target === state.boss) damageBoss(amount);
    else damageThreat(target, amount, null, cause || "player");
    return true;
  }

  function updateOrbitBlades(dt) {
    const ship = state.ship;
    const tier = ship.modules.orbitBlades || 0;
    const values = moduleTierValues(ship, "orbitBlades");
    const desired = values ? Math.min(12, Math.max(0, Math.floor(values.blades))) : 0;
    while (ship.orbitBlades.length < desired) {
      const index = ship.orbitBlades.length;
      ship.orbitBlades.push({ x: ship.x, y: ship.y, angle: 0, radius: 9, cooldown: index * 0.04 });
    }
    if (ship.orbitBlades.length > desired) ship.orbitBlades.length = desired;
    if (!values || !desired) return;
    const angularSpeed = 1.75 + tier * 0.09;
    const contactDamage = amplifiedDamage(values.damage);
    for (let index = 0; index < ship.orbitBlades.length; index += 1) {
      const blade = ship.orbitBlades[index];
      blade.angle = state.time * angularSpeed + index / desired * TAU;
      blade.x = ship.x + Math.cos(blade.angle) * values.orbitRadius;
      blade.y = ship.y + Math.sin(blade.angle) * values.orbitRadius;
      blade.cooldown = Math.max(0, blade.cooldown - dt);
      if (blade.cooldown > 0) continue;
      let target = null;
      for (const asteroid of state.asteroids) {
        if (!asteroid.dead && Core.circlesOverlap(blade.x, blade.y, blade.radius, asteroid.x, asteroid.y, asteroid.radius)) {
          target = asteroid;
          break;
        }
      }
      if (!target) {
        for (const alien of state.aliens) {
          if (!alien.dead && Core.circlesOverlap(blade.x, blade.y, blade.radius, alien.x, alien.y, alien.radius)) {
            target = alien;
            break;
          }
        }
      }
      if (!target && state.boss && Core.circlesOverlap(
        blade.x, blade.y, blade.radius, state.boss.x, state.boss.y, state.boss.radius
      )) target = state.boss;
      if (!target) continue;
      hitPlayerTarget(target, contactDamage, "orbitBlade");
      if (state.mode === "gameover") return;
      blade.cooldown = Math.max(CONFIG.world.fixedStep, values.hitCooldown);
      burst(blade.x, blade.y, CONFIG.weapons.modules.orbitBlades.color, settings.reducedEffects ? 1 : 3, 0.45);
    }
  }

  function nearestUnchainedTarget(x, y, range, hitIds) {
    let best = null;
    let bestSquared = range * range;
    const consider = (target) => {
      if (!target || target.dead || hitIds.has(target.id)) return;
      const squared = distanceSquared(x, y, target.x, target.y);
      if (squared < bestSquared) {
        best = target;
        bestSquared = squared;
      }
    };
    for (const asteroid of state.asteroids) consider(asteroid);
    for (const alien of state.aliens) consider(alien);
    consider(state.boss);
    return best;
  }

  function addChainEffect(x, y, targetX, targetY, color) {
    const cap = settings.reducedEffects ? CONFIG.caps.reducedParticles : CONFIG.caps.particles;
    if (state.effects.length >= cap) return;
    state.effects.push({
      x, y, targetX, targetY,
      vx: 0,
      vy: 0,
      type: "chain",
      layer: "front",
      radius: 0,
      color,
      life: settings.reducedEffects ? 0.1 : 0.16,
      maxLife: settings.reducedEffects ? 0.1 : 0.16,
      size: 1,
      dead: false
    });
  }

  function fireTeslaCoil(values) {
    const ship = state.ship;
    const hitIds = new Set();
    let x = ship.x;
    let y = ship.y;
    let range = values.range;
    let hits = 0;
    const maximumHits = Math.min(12, Math.max(1, Math.floor(values.chains || 1)));
    for (let index = 0; index < maximumHits; index += 1) {
      const target = nearestUnchainedTarget(x, y, range, hitIds);
      if (!target) break;
      addChainEffect(x, y, target.x, target.y, CONFIG.weapons.modules.teslaCoil.color);
      hitIds.add(target.id);
      x = target.x;
      y = target.y;
      range = values.chainRange;
      hitPlayerTarget(target, amplifiedDamage(values.damage), "teslaCoil");
      if (state.mode === "gameover") break;
      hits += 1;
    }
    if (hits) audio.weapon("teslaCoil");
    return hits;
  }

  function spawnPlayerMine(values, index, count) {
    if (state.mines.length >= CONFIG.caps.mines) return null;
    const ship = state.ship;
    const angle = ship.angle + Math.PI + (index - (count - 1) * 0.5) * 0.42;
    const x = ship.x + Math.cos(angle) * 25;
    const y = ship.y + Math.sin(angle) * 25;
    const mine = {
      id: nextEntityId++,
      owner: "player",
      sourceModule: "mineLayer",
      x, y,
      vx: ship.vx * 0.28 + Math.cos(angle) * 46,
      vy: ship.vy * 0.28 + Math.sin(angle) * 46,
      radius: 11,
      life: values.life,
      maxLife: values.life,
      triggerRadius: values.triggerRadius,
      blastRadius: values.blastRadius,
      damage: amplifiedDamage(values.damage),
      phase: index / Math.max(1, count) * TAU,
      armed: true,
      dead: false
    };
    state.mines.push(mine);
    return mine;
  }

  function updateTeslaCoil(dt) {
    const ship = state.ship;
    const values = moduleTierValues(ship, "teslaCoil");
    if (!values) return;
    ship.weaponTimers.teslaCoil = Math.max(0, (ship.weaponTimers.teslaCoil || 0) - dt);
    if (ship.weaponTimers.teslaCoil > 0) return;
    if (!fireTeslaCoil(values)) return;
    ship.weaponTimers.teslaCoil = values.cooldown * overclockCooldownMultiplier(ship);
  }

  function updateMineLayer(dt) {
    const ship = state.ship;
    const values = moduleTierValues(ship, "mineLayer");
    if (!values) return;
    ship.weaponTimers.mineLayer = Math.max(0, (ship.weaponTimers.mineLayer || 0) - dt);
    if (ship.weaponTimers.mineLayer > 0) return;
    if (!nearestTarget(ship.x, ship.y, Math.max(1, Number(values.range) || 1))) return;
    const count = Math.min(4, Math.max(1, Math.floor(values.mines || 1)));
    let spawned = 0;
    for (let index = 0; index < count; index += 1) if (spawnPlayerMine(values, index, count)) spawned += 1;
    if (!spawned) return;
    ship.weaponTimers.mineLayer = values.cooldown * overclockCooldownMultiplier(ship);
    audio.weapon("mineLayer");
    if (!settings.reducedEffects) addRing(ship.x, ship.y, CONFIG.weapons.modules.mineLayer.color, 4, 0.24, 32);
  }

  function updateShieldReactor(dt) {
    const ship = state.ship;
    const values = moduleTierValues(ship, "shieldReactor");
    if (!values) return;
    ship.weaponTimers.shieldReactor = Math.max(0, (ship.weaponTimers.shieldReactor || 0) - dt);
    if (ship.weaponTimers.shieldReactor > 0 || ship.shield >= CONFIG.powerups.shield.cap) return;
    ship.shield = Math.min(CONFIG.powerups.shield.cap, ship.shield + values.amount);
    ship.weaponTimers.shieldReactor = values.cooldown;
    addRing(ship.x, ship.y, CONFIG.weapons.modules.shieldReactor.color, 5, 0.34, 48);
    audio.pickup("shield");
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
      ship.weaponTimers[id] = values.cooldown * overclockCooldownMultiplier(ship);
      let spawned = 0;
      if (id === "homingSalvo") {
        const targetAngle = Math.atan2(target.y - ship.y, target.x - ship.x);
        for (let index = 0; index < values.projectiles; index += 1) {
          const offset = values.projectiles === 1 ? 0 : (index / (values.projectiles - 1) - 0.5) * 0.16;
          const angle = targetAngle + offset;
          if (spawnPlayerBullet(id, ship.x + Math.cos(angle) * 23, ship.y + Math.sin(angle) * 23, angle, values)) spawned += 1;
        }
        if (spawned) audio.weapon("homingSalvo");
      } else {
        const baseAngle = ship.angle + state.time * 0.42;
        for (let index = 0; index < values.projectiles; index += 1) {
          const angle = baseAngle + index / values.projectiles * TAU;
          if (spawnPlayerBullet(id, ship.x + Math.cos(angle) * 19, ship.y + Math.sin(angle) * 19, angle, values)) spawned += 1;
        }
        if (spawned) audio.weapon("radialArray");
      }
      if (spawned && !settings.reducedEffects) addRing(ship.x, ship.y, definition.color, 5, 0.26, id === "homingSalvo" ? 34 : 46);
    }
    updateTeslaCoil(dt);
    updateMineLayer(dt);
    updateShieldReactor(dt);
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
        if (mine.owner !== "player" && distanceSquared(ship.x, ship.y, mine.x, mine.y) <= radiusSquared) mine.dead = true;
      }
    }
    for (const asteroid of state.asteroids) {
      const dx = ship.x - asteroid.x;
      const dy = ship.y - asteroid.y;
      const squared = dx * dx + dy * dy;
      if (squared <= radiusSquared) {
        const distance = Math.sqrt(squared);
        if (distance > 0.001) {
          const proximity = 1 - clamp(distance / radius, 0, 1);
          const impulse = values.asteroidPullImpulse * (0.45 + proximity * 0.55);
          asteroid.vx += dx / distance * impulse;
          asteroid.vy += dy / distance * impulse;
          const speed = Math.hypot(asteroid.vx, asteroid.vy);
          if (speed > values.asteroidPullSpeedCap) {
            asteroid.vx = asteroid.vx / speed * values.asteroidPullSpeedCap;
            asteroid.vy = asteroid.vy / speed * values.asteroidPullSpeedCap;
          }
        }
        damageThreat(asteroid, amplifiedDamage(values.asteroidDamage), null);
      }
      if (state.mode === "gameover") return;
    }
    for (const alien of state.aliens) {
      if (distanceSquared(ship.x, ship.y, alien.x, alien.y) <= radiusSquared) damageThreat(alien, amplifiedDamage(values.alienDamage), null);
      if (state.mode === "gameover") return;
    }
    if (state.boss && distanceSquared(ship.x, ship.y, state.boss.x, state.boss.y) <= radiusSquared) damageBoss(amplifiedDamage(values.bossDamage));
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
    const spawnOptions = options || {};
    const definition = CONFIG.asteroids[kind] || CONFIG.asteroids.rock;
    if (state.asteroids.length >= CONFIG.caps.asteroids) return null;
    if (kind === "titan" && state.asteroids.some((item) => item.kind === "titan" && !item.dead)) return null;
    const automaticPosition = !Number.isFinite(spawnOptions.x);
    const compactRadius = definition.compactRadius && Math.min(renderer.width, renderer.height) < 600 ? definition.compactRadius : definition.radius;
    const requestedRadius = Number(spawnOptions.radius) || compactRadius;
    const radius = automaticPosition ? safeAutomaticRadius(requestedRadius) : requestedRadius;
    const position = automaticPosition ? spawnPosition(undefined, undefined, radius) : spawnOptions;
    if (!position) return null;
    if (automaticPosition && !state.combatField.active) applySpawnClearance(position, radius);
    const targetAngle = Number.isFinite(spawnOptions.velocityAngle) ? spawnOptions.velocityAngle :
      Math.atan2(state.ship.y - position.y, state.ship.x - position.x) + rng.range(-0.52, 0.52);
    const baseSpeed = Number.isFinite(Number(spawnOptions.speed)) ? Number(spawnOptions.speed) : rng.range(definition.speed[0], definition.speed[1]);
    const scaledSpeed = baseSpeed * CONFIG.difficulty.speedScale(state.sector, state.encounter);
    const surfaceDistance = Math.max(0, Math.hypot(position.x - state.ship.x, position.y - state.ship.y) - state.ship.radius - radius);
    const safeSpeed = automaticPosition && state.combatField.active ? surfaceDistance / CONFIG.combatField.spawnMinimumContactSeconds : scaledSpeed;
    const speed = Math.min(scaledSpeed, safeSpeed);
    const durabilityScale = Number.isFinite(spawnOptions.durabilityScale) ?
      clamp(spawnOptions.durabilityScale, 0.25, 4) : 1;
    const healthScale = CONFIG.difficulty.healthScale(state.sector, state.encounter) * durabilityScale;
    const health = Number.isFinite(spawnOptions.health) ? Math.max(0.01, spawnOptions.health) :
      Math.max(1, definition.baseHealth * healthScale * (radius / definition.radius));
    const maxHealth = Number.isFinite(spawnOptions.maxHealth) ? Math.max(health, spawnOptions.maxHealth) : health;
    const asteroidId = nextEntityId++;
    const variantNames = definition.variants ? Object.keys(definition.variants) : [];
    const hazardVariant = typeof spawnOptions.hazardVariant === "string" ? spawnOptions.hazardVariant :
      variantNames.length ? variantNames[asteroidId % variantNames.length] : null;
    const hazardValues = definition.hazard || null;
    const asteroid = {
      id: asteroidId,
      x: position.x,
      y: position.y,
      vx: Math.cos(targetAngle) * speed,
      vy: Math.sin(targetAngle) * speed,
      radius,
      kind,
      health,
      maxHealth,
      damage: definition.contactDamage * CONFIG.difficulty.damageScale(state.sector, state.encounter),
      score: Number.isFinite(spawnOptions.score) ? spawnOptions.score : spawnOptions.noScore ? 0 : definition.score,
      noDrops: Boolean(spawnOptions.noDrops),
      threatCost: Number.isFinite(spawnOptions.threatCost) ? spawnOptions.threatCost : definition.threatCost,
      generation: spawnOptions.generation || (state.encounterData && state.encounterData.generation),
      waveIndex: Number.isFinite(spawnOptions.waveIndex) ? spawnOptions.waveIndex : state.encounterData && state.encounterData.waveIndex,
      rotation: rng.range(0, TAU),
      rotationSpeed: rng.range(-0.65, 0.65) * (48 / Math.max(24, radius)),
      phase: rng.range(0, TAU),
      hazardVariant,
      hazardPhase: spawnOptions.hazardPhase || (hazardValues ? "cooldown" : null),
      hazardTimer: Number.isFinite(spawnOptions.hazardTimer) ? Math.max(0, spawnOptions.hazardTimer) :
        hazardValues ? Math.max(CONFIG.world.fixedStep, Number(hazardValues.cooldown) || 1) * 0.55 : 0,
      hazardAngle: Number.isFinite(spawnOptions.hazardAngle) ? spawnOptions.hazardAngle : rng.range(0, TAU),
      hazardHitTimer: Number.isFinite(spawnOptions.hazardHitTimer) ? Math.max(0, spawnOptions.hazardHitTimer) : 0,
      telegraph: null,
      hitFlash: Math.max(0, Number(spawnOptions.hitFlash) || 0),
      gateIndex: Math.max(0, Math.floor(Number(spawnOptions.gateIndex) || 0)),
      points: makeAsteroidPoints(radius),
      splitRemaining: Number.isFinite(spawnOptions.splitRemaining) ?
        Math.max(0, Math.floor(spawnOptions.splitRemaining)) :
        definition.split ? Math.max(1, Math.floor(definition.split.generations || 1)) : 0,
      required: spawnOptions.required !== false,
      collisionGrace: Math.max(0, Number.isFinite(spawnOptions.collisionGrace) ? spawnOptions.collisionGrace : automaticPosition ? CONFIG.combatField.spawnCollisionGraceSeconds : 0),
      dead: false
    };
    state.asteroids.push(asteroid);
    state.stats.spawned += 1;
    return asteroid;
  }

  function spawnAlien(type, options) {
    const spawnOptions = options || {};
    const definition = CONFIG.aliens[type] || CONFIG.aliens.scout;
    if (state.aliens.length >= CONFIG.caps.aliens) return null;
    const automaticPosition = !Number.isFinite(spawnOptions.x);
    const position = automaticPosition ? spawnPosition(0.75, 1.1, definition.radius) : spawnOptions;
    if (!position) return null;
    if (automaticPosition && !state.combatField.active) applySpawnClearance(position, definition.radius);
    const durabilityScale = Number.isFinite(spawnOptions.durabilityScale) ?
      clamp(spawnOptions.durabilityScale, 0.25, 4) : 1;
    const health = Number.isFinite(spawnOptions.health) ? Math.max(0.01, spawnOptions.health) :
      definition.baseHealth * CONFIG.difficulty.healthScale(state.sector, state.encounter) * durabilityScale;
    const maxHealth = Number.isFinite(spawnOptions.maxHealth) ? Math.max(health, spawnOptions.maxHealth) : health;
    const alienId = nextEntityId++;
    const lineageId = Number.isFinite(spawnOptions.lineageId) ? spawnOptions.lineageId : alienId;
    const parentLineageId = Number.isFinite(spawnOptions.parentLineageId) ? spawnOptions.parentLineageId :
      spawnOptions.parent && Number.isFinite(spawnOptions.parent.lineageId) ? spawnOptions.parent.lineageId : null;
    const alien = {
      id: alienId,
      lineageId,
      x: position.x,
      y: position.y,
      vx: 0,
      vy: 0,
      radius: definition.radius,
      type,
      health,
      maxHealth,
      speed: definition.baseSpeed * CONFIG.difficulty.speedScale(state.sector, state.encounter),
      damage: definition.contactDamage * CONFIG.difficulty.damageScale(state.sector, state.encounter),
      score: Number.isFinite(spawnOptions.score) ? spawnOptions.score : definition.score,
      noDrops: Boolean(spawnOptions.noDrops),
      threatCost: Number.isFinite(spawnOptions.threatCost) ? spawnOptions.threatCost : definition.threatCost,
      generation: spawnOptions.generation || (state.encounterData && state.encounterData.generation),
      waveIndex: Number.isFinite(spawnOptions.waveIndex) ? spawnOptions.waveIndex : state.encounterData && state.encounterData.waveIndex,
      angle: Math.atan2(state.ship.y - position.y, state.ship.x - position.x),
      heading: Math.atan2(state.ship.y - position.y, state.ship.x - position.x),
      aimAngle: Math.atan2(state.ship.y - position.y, state.ship.x - position.x),
      orbitDirection: rng.chance(0.5) ? 1 : -1,
      cooldown: Number.isFinite(spawnOptions.cooldown) ? Math.max(0, spawnOptions.cooldown) : rng.range(0.35, definition.baseCooldown),
      state: spawnOptions.state || "approach",
      stateTimer: Number.isFinite(spawnOptions.stateTimer) ? Math.max(0, spawnOptions.stateTimer) : 0,
      damageTimer: Number.isFinite(spawnOptions.damageTimer) ? Math.max(0, spawnOptions.damageTimer) : 0,
      beamAngle: Number.isFinite(spawnOptions.beamAngle) ? Core.normalizeAngle(spawnOptions.beamAngle) : null,
      telegraph: null,
      phase: rng.range(0, TAU),
      parentLineageId,
      parent: spawnOptions.parent || state.aliens.find((item) => !item.dead && item.lineageId === parentLineageId) || null,
      required: spawnOptions.required !== false,
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

  function threatPressure(family, kind, explicitCost) {
    if (Number.isFinite(explicitCost)) return Math.max(1, explicitCost);
    const definitions = family === "alien" ? CONFIG.aliens : CONFIG.asteroids;
    const definition = definitions[kind];
    return Math.max(1, definition && Number(definition.threatCost) || 1);
  }

  function currentWavePressure() {
    const data = state.encounterData;
    if (!data) return 0;
    let pressure = 0;
    for (const name of THREAT_ARRAYS) {
      for (const entity of state[name]) {
        if (entity.dead || entity.generation !== data.generation || entity.waveIndex !== data.waveIndex) continue;
        pressure += Math.max(1, Number(entity.threatCost) || 0);
      }
    }
    return pressure;
  }

  function currentWaveSpec() {
    const data = state.encounterData;
    return data && data.spec.waves && data.spec.waves[data.waveIndex] || null;
  }

  function currentReinforcements() {
    const wave = currentWaveSpec();
    return wave && wave.reinforcements || null;
  }

  function scaledGroupCount(group) {
    const root = Math.sqrt(Math.max(0, state.sector - 1));
    return Math.max(0, Math.min(group.cap || group.count, Math.floor(group.count + root * (group.sectorStep || 0))));
  }

  function balancedGroupKinds(kinds, count) {
    const choices = Array.isArray(kinds) && kinds.length ? kinds : [undefined];
    const total = Math.max(0, Math.floor(Number(count) || 0));
    if (!total) return [];
    const start = Math.floor(rng() * choices.length);
    const output = Array.from({ length: total }, (_, index) => choices[(start + index) % choices.length]);
    for (let index = output.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(rng() * (index + 1));
      const value = output[index];
      output[index] = output[swapIndex];
      output[swapIndex] = value;
    }
    return output;
  }

  function buildWaveQueue(wave) {
    const queue = [];
    const add = (group, required) => {
      const count = scaledGroupCount(group);
      const kinds = balancedGroupKinds(group.kinds, count);
      for (let index = 0; index < kinds.length; index += 1) {
        const kind = kinds[index];
        queue.push({
          family: group.family,
          kind,
          required,
          waveIndex: state.encounterData.waveIndex,
          durabilityScale: group.durabilityScale,
          announcement: index === 0 ? group.announcement : null
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
    data.reinforcementDelay = 0;
    spawnPendingWave(true, true);
    const reinforcements = currentReinforcements();
    if (reinforcements && data.pendingSpawns.length) {
      data.reinforcementDelay = reinforcements.intervalSeconds;
    }
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
      splitRemaining: entry.splitRemaining,
      hitFlash: entry.hitFlash,
      collisionGrace: entry.collisionGrace,
      gateIndex: entry.gateIndex,
      hazardVariant: entry.hazardVariant,
      hazardPhase: entry.hazardPhase,
      hazardTimer: entry.hazardTimer,
      hazardAngle: entry.hazardAngle,
      hazardHitTimer: entry.hazardHitTimer,
      state: entry.state,
      stateTimer: entry.stateTimer,
      cooldown: entry.cooldown,
      damageTimer: entry.damageTimer,
      beamAngle: entry.beamAngle,
      lineageId: entry.lineageId,
      parentLineageId: entry.parentLineageId
    };
    options.durabilityScale = entry.durabilityScale;
    const entity = entry.family === "alien" ? spawnAlien(entry.kind, options) : spawnAsteroid(entry.kind, options);
    if (entity && entry.announcement) {
      announce(entry.announcement, 1.8);
      audio.arena();
    }
    return entity;
  }

  function spawnPendingWave(releasePending, initialRelease) {
    const data = state.encounterData;
    if (!data) return false;
    let spawned = false;
    while (data.requeue.length) {
      const entry = data.requeue[0];
      const entity = spawnQueuedThreat(entry);
      if (!entity) {
        data.waveSpawned = false;
        return spawned;
      }
      data.requeue.shift();
      spawned = true;
    }

    if (releasePending !== false) {
      const reinforcements = currentReinforcements();
      const batchLimit = reinforcements ?
        Math.max(1, initialRelease ? reinforcements.initialBatch : reinforcements.batchSize) : Number.POSITIVE_INFINITY;
      const pressureLimit = reinforcements ? Math.max(1, reinforcements.activePressure) : Number.POSITIVE_INFINITY;
      let pressure = currentWavePressure();
      let released = 0;
      while (data.pendingSpawns.length && released < batchLimit) {
        const entry = data.pendingSpawns[0];
        const entryPressure = threatPressure(entry.family, entry.kind, entry.threatCost);
        if (pressure > 0 && pressure + entryPressure > pressureLimit) break;
        const entity = spawnQueuedThreat(entry);
        if (!entity) break;
        data.pendingSpawns.shift();
        pressure += Math.max(1, Number(entity.threatCost) || 0);
        released += 1;
        spawned = true;
      }
    }
    data.waveSpawned = data.pendingSpawns.length === 0 && data.requeue.length === 0;
    return spawned;
  }

  function updateEncounter(dt) {
    const data = state.encounterData;
    if (!data) return;
    data.timer += dt;
    if (data.spec.bossType) {
      updateBossEncounter(dt);
      return;
    }

    if (data.requeue.length) {
      data.waveDelay -= dt;
      if (data.waveDelay <= 0) {
        const spawned = spawnPendingWave(false, false);
        data.waveDelay = spawned ? 0 : CONFIG.combatField.waveSpawnRetrySeconds;
      }
    }
    if (data.pendingSpawns.length) {
      const reinforcements = currentReinforcements();
      data.reinforcementDelay = Math.max(0, data.reinforcementDelay - dt);
      const pressureReady = !reinforcements || currentWavePressure() <= reinforcements.refillAtPressure;
      if (!data.requeue.length && pressureReady && data.reinforcementDelay <= 0) {
        const spawned = spawnPendingWave(true, false);
        data.reinforcementDelay = spawned && reinforcements ? reinforcements.intervalSeconds :
          CONFIG.combatField.waveSpawnRetrySeconds;
      }
    }
    data.waveSpawned = data.pendingSpawns.length === 0 && data.requeue.length === 0;
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

  function clearCombatWorld(preservePresentation) {
    for (const name of THREAT_ARRAYS) state[name].length = 0;
    state.playerBullets.length = 0;
    state.enemyBullets.length = 0;
    state.mines.length = 0;
    state.pickups.length = 0;
    if (!preservePresentation) {
      state.effects.length = 0;
      state.floaters.length = 0;
    }
    if (state.ship) {
      state.ship.drones.length = 0;
      state.ship.orbitBlades.length = 0;
    }
  }

  function startCinematic(message) {
    const nextEncounter = state.encounter < ENCOUNTER_COUNT ? state.encounter + 1 : 1;
    const nextSector = state.encounter < ENCOUNTER_COUNT ? state.sector : state.sector + 1;
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
    const clearDuration = Math.max(0, Number(CONFIG.cinematic.clearHoldSeconds) || 0);
    clearCombatWorld(true);
    resetTransientInput();
    state.boss = null;
    state.arena.active = false;
    state.arena.locked = false;
    state.arena.warning = 0;
    state.cinematic = {
      active: true,
      phase: "clear",
      clearElapsed: 0,
      clearDuration,
      elapsed: 0,
      duration: CONFIG.cinematic.duration,
      progress: 0,
      directionX,
      directionY,
      speed: CONFIG.cinematic.speed,
      anchorX,
      anchorY,
      entryX: ship.x,
      entryY: ship.y,
      fromEncounter: state.encounter,
      toEncounter: nextEncounter,
      fromSector: state.sector,
      toSector: nextSector
    };
    ship.invulnerable = Math.max(ship.invulnerable,
      clearDuration + CONFIG.cinematic.duration + CONFIG.cinematic.exitInvulnerability);
    ship.vx = 0;
    ship.vy = 0;
    ship.angle = Math.atan2(directionY, directionX);
    ship.dashTime = 0;
    ship.engine = 0;
    setMode("transition");
    announce(message || "Stage clear", Math.max(0.5, clearDuration));
  }

  function finishEncounter(message) {
    const data = state.encounterData;
    if (!data || data.complete) return;
    if (state.upgradeDraft.phase !== "idle") return;
    data.complete = true;
    data.goalProgress = data.goalTarget;
    let rewardResult = null;
    const reward = data.spec.guaranteedReward;
    if (reward && !data.guaranteedGranted && reward.type === "moduleUpgrade") {
      data.guaranteedGranted = true;
      rewardResult = grantModuleUpgrade(
        "ARMORY LINK",
        reward.module,
        reward.tiers,
        false,
        false
      );
    }
    if (campaignProgressEligible && state.sector === 1) unlockNextStage(state.encounter);
    state.score += Math.round(300 * state.sector * CONFIG.difficulty.scoreScale(state.sector, state.encounter));
    const baseMessage = message || (data.goalType === "titan" ? "Titan shattered" : "Stage clear");
    startCinematic(rewardResult ? `${baseMessage} · ${rewardResult.summary}` : baseMessage);
  }

  function advanceEncounter() {
    const cinematic = state.cinematic;
    const shipX = state.ship.x;
    const shipY = state.ship.y;
    const anchorX = cinematic.anchorX || 0;
    const anchorY = cinematic.anchorY || 0;
    clearCombatWorld();
    if (state.encounter < ENCOUNTER_COUNT) {
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
    state.cinematic.phase = "idle";
    state.cinematic.progress = 1;
    resetTransientInput();
    setMode("playing");
    beginEncounter();
  }

  function beginCinematicTravel() {
    const cinematic = state.cinematic;
    const ship = state.ship;
    clearCombatWorld();
    resetTransientInput();
    state.boss = null;
    state.arena.active = false;
    state.arena.locked = false;
    state.arena.warning = 0;
    state.combatField.active = false;
    cinematic.phase = "travel";
    cinematic.elapsed = 0;
    cinematic.progress = 0;
    ship.vx = cinematic.directionX * cinematic.speed;
    ship.vy = cinematic.directionY * cinematic.speed;
    ship.angle = Math.atan2(cinematic.directionY, cinematic.directionX);
    ship.dashTime = 0;
    ship.engine = 1.6;
    ship.invulnerable = Math.max(ship.invulnerable,
      cinematic.duration + CONFIG.cinematic.exitInvulnerability);
  }

  function updateCinematic(dt) {
    const cinematic = state.cinematic;
    if (!cinematic.active) return;
    const ship = state.ship;
    if (cinematic.phase === "clear") {
      cinematic.clearElapsed = Math.min(cinematic.clearDuration, cinematic.clearElapsed + dt);
      ship.vx = 0;
      ship.vy = 0;
      ship.engine = 0;
      ship.dashTime = 0;
      ship.invulnerable = Math.max(ship.invulnerable,
        cinematic.clearDuration - cinematic.clearElapsed + cinematic.duration + CONFIG.cinematic.exitInvulnerability);
      updatePresentationEffects(dt, true);
      cleanupPresentationEffects(true);
      if (cinematic.clearElapsed >= cinematic.clearDuration) beginCinematicTravel();
      return;
    }
    cinematic.elapsed = Math.min(cinematic.duration, cinematic.elapsed + dt);
    cinematic.progress = clamp(cinematic.elapsed / Math.max(CONFIG.world.fixedStep, cinematic.duration), 0, 1);
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
    let magneticPullX = 0;
    let magneticPullY = 0;
    let magneticPullCap = 0;
    let magneticSpeedCap = Infinity;
    for (const asteroid of state.asteroids) {
      if (asteroid.dead) continue;
      updateAsteroidHazard(asteroid, dt);
      if (state.mode === "gameover") return;
      const magneticPull = magneticAsteroidPull(asteroid);
      if (magneticPull) {
        magneticPullX += magneticPull.x;
        magneticPullY += magneticPull.y;
        magneticPullCap = Math.max(magneticPullCap, magneticPull.cap);
        magneticSpeedCap = Math.min(magneticSpeedCap, magneticPull.speedCap);
      }
      asteroid.x += asteroid.vx * dt;
      asteroid.y += asteroid.vy * dt;
      asteroid.rotation += asteroid.rotationSpeed * dt;
      asteroid.hitFlash = Math.max(0, (asteroid.hitFlash || 0) - dt * 8);
      asteroid.collisionGrace = Math.max(0, (asteroid.collisionGrace || 0) - dt);
      if (state.arena.locked) constrainToArena(asteroid, 8, 0.55);
      else constrainThreatToCombatField(asteroid);
    }
    const pullMagnitude = Math.hypot(magneticPullX, magneticPullY);
    if (pullMagnitude > 0 && state.ship.dashTime <= 0) {
      const speedBeforePull = Math.hypot(state.ship.vx, state.ship.vy);
      const capped = Math.min(pullMagnitude, magneticPullCap);
      state.ship.vx += magneticPullX / pullMagnitude * capped * dt;
      state.ship.vy += magneticPullY / pullMagnitude * capped * dt;
      const speedAfterPull = Math.hypot(state.ship.vx, state.ship.vy);
      const permittedSpeed = Math.max(
        speedBeforePull,
        Math.min(CONFIG.world.playerMaxSpeed, Number.isFinite(magneticSpeedCap) ? magneticSpeedCap : CONFIG.world.playerMaxSpeed)
      );
      if (speedAfterPull > permittedSpeed) {
        state.ship.vx = state.ship.vx / speedAfterPull * permittedSpeed;
        state.ship.vy = state.ship.vy / speedAfterPull * permittedSpeed;
      }
    }
  }

  function magneticAsteroidPull(asteroid) {
    const definition = CONFIG.asteroids[asteroid.kind];
    const values = definition && definition.variants && definition.variants[asteroid.hazardVariant];
    if (!values || !Number.isFinite(Number(values.acceleration))) return null;
    const dx = asteroid.x - state.ship.x;
    const dy = asteroid.y - state.ship.y;
    const squared = dx * dx + dy * dy;
    const range = Math.max(0, Number(values.range) || 0);
    if (squared <= 0.0001 || squared > range * range) return null;
    const distance = Math.sqrt(squared);
    const acceleration = Math.max(0, Number(values.acceleration) || 0) *
      (1 - distance / Math.max(1, range) * 0.45);
    return {
      x: dx / distance * acceleration,
      y: dy / distance * acceleration,
      cap: Math.max(0, Number(values.totalAccelerationCap) || acceleration),
      speedCap: Math.max(1, Number(values.speedCap) || CONFIG.world.playerMaxSpeed)
    };
  }

  function updateAsteroidHazard(asteroid, dt) {
    const definition = CONFIG.asteroids[asteroid.kind];
    const values = definition && definition.hazard;
    if (!values) return;
    asteroid.hazardTimer = Math.max(0, (asteroid.hazardTimer || 0) - dt);
    asteroid.hazardHitTimer = Math.max(0, (asteroid.hazardHitTimer || 0) - dt);
    asteroid.hazardAngle += Math.max(0, Number(values.angularSpeed) || 0) * dt;
    if (asteroid.hazardTimer <= 0) {
      if (asteroid.hazardPhase === "cooldown") {
        asteroid.hazardPhase = "warning";
        asteroid.hazardTimer = Math.max(CONFIG.world.fixedStep, Number(values.warning) || 0.8);
      } else if (asteroid.hazardPhase === "warning") {
        asteroid.hazardPhase = "active";
        asteroid.hazardTimer = Math.max(CONFIG.world.fixedStep, Number(values.active) || 1);
        asteroid.hazardHitTimer = 0;
      } else {
        asteroid.hazardPhase = "cooldown";
        asteroid.hazardTimer = Math.max(CONFIG.world.fixedStep, Number(values.cooldown) || 4);
      }
    }
    if (asteroid.hazardPhase === "cooldown") {
      asteroid.telegraph = null;
      return;
    }
    const range = Math.max(1, Number(values.range) || 400);
    const cosine = Math.cos(asteroid.hazardAngle);
    const sine = Math.sin(asteroid.hazardAngle);
    asteroid.telegraph = {
      active: true,
      kind: asteroid.hazardPhase === "active" ? "radiationActive" : "radiationWarning",
      x: asteroid.x - cosine * range,
      y: asteroid.y - sine * range,
      angle: asteroid.hazardAngle,
      length: range * 2,
      width: Math.max(1, Number(values.width) || 16),
      color: asteroid.hazardPhase === "active" ? "#ffd56a" : "#ffecad"
    };
    if (asteroid.hazardPhase !== "active" || asteroid.hazardHitTimer > 0) return;
    const dx = state.ship.x - asteroid.x;
    const dy = state.ship.y - asteroid.y;
    const along = dx * cosine + dy * sine;
    const perpendicular = Math.abs(-dx * sine + dy * cosine);
    if (Math.abs(along) <= range && perpendicular <= asteroid.telegraph.width * 0.5 + state.ship.radius) {
      damagePlayer(
        Math.max(0, Number(values.damage) || 0) * CONFIG.difficulty.damageScale(state.sector, state.encounter),
        asteroid.x,
        asteroid.y
      );
      asteroid.hazardHitTimer = Math.max(CONFIG.world.fixedStep, Number(values.tick) || 0.3);
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
      const definition = CONFIG.aliens[alien.type];
      alien.cooldown -= dt;
      alien.stateTimer -= dt;
      alien.damageTimer = Math.max(0, (alien.damageTimer || 0) - dt);
      alien.telegraph = null;
      const dx = ship.x - alien.x;
      const dy = ship.y - alien.y;
      const distance = Math.hypot(dx, dy) || 1;
      alien.aimAngle = Math.atan2(dy, dx);

      if (alien.type === "scout") {
        const radial = distance > 285 ? 1 : distance < 155 ? -0.8 : 0;
        steerAlien(alien, dx / distance * radial + -dy / distance * alien.orbitDirection * 0.9, dy / distance * radial + dx / distance * alien.orbitDirection * 0.9, dt);
        if (alien.cooldown <= 0 && distance < 720) {
          alien.cooldown = CONFIG.difficulty.scaledCooldown(definition.baseCooldown, state.sector, state.encounter);
          const lead = leadPoint(alien.x, alien.y, definition.pattern.projectileSpeed);
          fireEnemyAt(alien.x, alien.y, lead.x, lead.y, definition.pattern.projectileSpeed, definition.pattern.damage,
            definition.pattern.projectiles || 1, definition.pattern.spread || 0, "#63f7c8", alien.type);
        }
      } else if (definition.pattern.type === "sweepingLaser") {
        const pattern = definition.pattern;
        const preferred = Math.max(1, Number(pattern.preferredRange) || 390);
        const retreat = Math.max(1, Number(pattern.retreatRange) || 250);
        if (alien.state === "beamWarning" || alien.state === "beamActive") {
          if (!Number.isFinite(alien.beamAngle)) alien.beamAngle = alien.aimAngle;
          if (alien.state === "beamActive") {
            const sweepAngularSpeed = Number.isFinite(Number(pattern.sweepAngularSpeed)) ? Number(pattern.sweepAngularSpeed) : 0;
            alien.beamAngle = Core.normalizeAngle(alien.beamAngle + sweepAngularSpeed * dt);
          }
          alien.vx *= Math.exp(-7 * dt);
          alien.vy *= Math.exp(-7 * dt);
          alien.telegraph = {
            active: true,
            kind: alien.state === "beamActive" ? "laserActive" : "laserWarning",
            x: alien.x,
            y: alien.y,
            angle: alien.beamAngle,
            length: Math.max(1, Number(pattern.range) || 560),
            width: Math.max(1, Number(pattern.width) || 18),
            color: alien.state === "beamActive" ? "#ff668d" : "#ffc1d2"
          };
          if (alien.state === "beamActive" && alien.damageTimer <= 0) {
            const beamCosine = Math.cos(alien.beamAngle);
            const beamSine = Math.sin(alien.beamAngle);
            const along = dx * beamCosine + dy * beamSine;
            const perpendicular = Math.abs(-dx * beamSine + dy * beamCosine);
            if (along >= 0 && along <= alien.telegraph.length && perpendicular <= alien.telegraph.width * 0.5 + ship.radius) {
              damagePlayer(Math.max(0, Number(pattern.damage) || 0) * CONFIG.difficulty.damageScale(state.sector, state.encounter), alien.x, alien.y);
              if (state.mode === "gameover") return;
              alien.damageTimer = Math.max(CONFIG.world.fixedStep, Number(pattern.tick) || 0.3);
            }
          }
          if (alien.stateTimer <= 0) {
            if (alien.state === "beamWarning") {
              alien.state = "beamActive";
              alien.stateTimer = Math.max(CONFIG.world.fixedStep, Number(pattern.active) || 1);
              alien.damageTimer = 0;
              audio.enemyWeapon(alien.type);
            } else {
              alien.state = "approach";
              alien.cooldown = CONFIG.difficulty.scaledCooldown(Number(pattern.cooldown) || definition.baseCooldown, state.sector, state.encounter);
            }
          }
        } else {
          const radial = distance > preferred ? 1 : distance < retreat ? -0.82 : 0;
          steerAlien(alien, dx / distance * radial + -dy / distance * alien.orbitDirection * 0.58,
            dy / distance * radial + dx / distance * alien.orbitDirection * 0.58, dt, 0.82);
          if (alien.cooldown <= 0 && distance < Math.max(1, Number(pattern.range) || 560)) {
            alien.state = "beamWarning";
            alien.stateTimer = Math.max(CONFIG.world.fixedStep, Number(pattern.warning) || 0.8);
            alien.beamAngle = alien.aimAngle;
          }
        }
      } else if (alien.type === "striker" || alien.type === "lancer") {
        if (alien.state === "telegraph") {
          alien.vx *= Math.exp(-7 * dt);
          alien.vy *= Math.exp(-7 * dt);
          if (alien.stateTimer <= 0) {
            alien.state = "charge";
            alien.stateTimer = definition.pattern.duration;
            const lead = leadPoint(alien.x, alien.y, alien.speed * definition.pattern.speedMultiplier);
            const chargeAngle = Math.atan2(lead.y - alien.y, lead.x - alien.x);
            alien.vx = Math.cos(chargeAngle) * alien.speed * definition.pattern.speedMultiplier;
            alien.vy = Math.sin(chargeAngle) * alien.speed * definition.pattern.speedMultiplier;
            audio.enemyWeapon(alien.type);
          }
        } else if (alien.state === "charge") {
          if (alien.stateTimer <= 0) {
            alien.state = "recover";
            alien.stateTimer = 0.7;
            alien.cooldown = CONFIG.difficulty.scaledCooldown(definition.baseCooldown, state.sector, state.encounter);
          }
        } else if (alien.state === "recover") {
          alien.vx *= Math.exp(-3 * dt);
          alien.vy *= Math.exp(-3 * dt);
          if (alien.stateTimer <= 0) alien.state = "approach";
        } else {
          steerAlien(alien, dx, dy, dt, distance > 360 ? 1 : 0.55);
          if (alien.cooldown <= 0 && distance < 620) {
            alien.state = "telegraph";
            alien.stateTimer = definition.pattern.warning;
          }
        }
      } else if (alien.type === "bomber") {
        const radial = distance > 430 ? 1 : distance < 280 ? -1 : 0;
        steerAlien(alien, dx / distance * radial + -dy / distance * alien.orbitDirection * 0.62, dy / distance * radial + dx / distance * alien.orbitDirection * 0.62, dt, 0.85);
        if (alien.cooldown <= 0 && distance < 650) {
          alien.cooldown = CONFIG.difficulty.scaledCooldown(CONFIG.aliens.bomber.baseCooldown, state.sector, state.encounter);
          const predicted = leadPoint(alien.x, alien.y, 260);
          spawnMine(alien.x, alien.y, predicted.x, predicted.y, CONFIG.aliens.bomber.pattern, alien.type);
        }
      } else if (definition.pattern.type === "droneLaunch") {
        const carrierPattern = definition.pattern;
        const preferred = Math.max(1, Number(carrierPattern.preferredRange) || 300);
        const retreat = Math.max(1, Number(carrierPattern.retreatRange) || 210);
        const launchRange = Math.max(preferred, Number(carrierPattern.launchRange) || 460);
        const radial = distance > preferred ? 1 : distance < retreat ? -1 : 0;
        steerAlien(alien, dx / distance * radial + -dy / distance * alien.orbitDirection * 0.35, dy / distance * radial + dx / distance * alien.orbitDirection * 0.35, dt, 0.72);
        if (alien.cooldown <= 0 && distance < launchRange) {
          alien.cooldown = CONFIG.difficulty.scaledCooldown(definition.baseCooldown, state.sector, state.encounter);
          const livingChildren = state.aliens.filter((item) => item.parentLineageId === alien.lineageId && !item.dead).length;
          const childCount = Math.min(
            carrierPattern.count,
            carrierPattern.maxChildren - livingChildren,
            CONFIG.caps.aliens - state.aliens.length
          );
          if (childCount > 0) {
            for (let childIndex = 0; childIndex < childCount; childIndex += 1) {
              const angleOffset = childCount === 1 ? 0 : childIndex - (childCount - 1) * 0.5;
              const child = spawnAlien(carrierPattern.spawnType, {
                x: alien.x + Math.cos(alien.angle + Math.PI + angleOffset) * 32,
                y: alien.y + Math.sin(alien.angle + Math.PI + angleOffset) * 32,
                generation: alien.generation,
                threatCost: 0,
                score: carrierPattern.childScore,
                noDrops: true,
                required: false,
                parent: alien
              });
              if (child) child.cooldown = 0.7;
            }
          }
        }
      } else {
        steerAlien(alien, dx, dy, dt, 0.7);
      }

      alien.x += alien.vx * dt;
      alien.y += alien.vy * dt;
      if (Math.hypot(alien.vx, alien.vy) > 1) alien.heading = Math.atan2(alien.vy, alien.vx);
      alien.angle = alien.heading;
      if (state.arena.locked) constrainToArena(alien, 10, 0.35);
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
      damage: damage * CONFIG.difficulty.damageScale(state.sector, state.encounter),
      color: color || "#ff5da9",
      life: life || 4,
      maxLife: life || 4,
      dead: false
    };
    state.enemyBullets.push(bullet);
    return bullet;
  }

  function spawnAsteroidShrapnel(asteroid, values) {
    if (!asteroid || !values) return 0;
    const available = Math.max(0, CONFIG.caps.enemyProjectiles - state.enemyBullets.length);
    const total = Math.min(Math.max(0, Math.floor(Number(values.count) || 0)), available);
    if (!total) return 0;
    const offset = rng.range(0, TAU);
    let spawned = 0;
    for (let index = 0; index < total; index += 1) {
      const angle = offset + index / total * TAU;
      const bullet = spawnEnemyBullet(
        asteroid.x + Math.cos(angle) * Math.max(4, asteroid.radius * 0.18),
        asteroid.y + Math.sin(angle) * Math.max(4, asteroid.radius * 0.18),
        angle,
        Math.max(1, Number(values.speed) || 1),
        Math.max(0, Number(values.damage) || 0),
        values.color || "#8ffcff",
        Math.max(CONFIG.world.fixedStep, Number(values.life) || 1)
      );
      if (!bullet) break;
      bullet.kind = "crystalShard";
      bullet.radius = Math.max(2, Number(values.radius) || 4);
      bullet.source = "crystalAsteroid";
      spawned += 1;
    }
    return spawned;
  }

  function fireEnemyAt(x, y, targetX, targetY, speed, damage, count, spread, color, source) {
    const total = Math.max(1, count || 1);
    const center = Math.atan2(targetY - y, targetX - x);
    for (let index = 0; index < total; index += 1) {
      const offset = total === 1 ? 0 : ((index / (total - 1)) - 0.5) * (spread || 0);
      spawnEnemyBullet(x, y, center + offset, speed, damage, color);
    }
    audio.enemyWeapon(source);
  }

  function bossSpawnPosition(boss, preferredAngle) {
    const arena = state.arena;
    const padding = bossNodePadding(boss);
    const rangeX = Math.max(0, arena.halfWidth - boss.radius - padding);
    const rangeY = Math.max(0, arena.halfHeight - boss.radius - padding);
    const directionX = Math.cos(preferredAngle);
    const directionY = Math.sin(preferredAngle);
    const scaleX = Math.abs(directionX) > 0.0001 ? rangeX / Math.abs(directionX) : Infinity;
    const scaleY = Math.abs(directionY) > 0.0001 ? rangeY / Math.abs(directionY) : Infinity;
    const scale = Math.min(scaleX, scaleY);
    const preferred = {
      x: arena.x + (Number.isFinite(scale) ? directionX * scale : 0),
      y: arena.y + (Number.isFinite(scale) ? directionY * scale : 0)
    };
    const ship = state.ship;
    const minimumDistance = ship.radius + boss.radius + CONFIG.combatField.spawnShipClearance;
    if (distanceSquared(preferred.x, preferred.y, ship.x, ship.y) >= minimumDistance * minimumDistance) return preferred;

    const corners = [
      { x: rangeX, y: rangeY },
      { x: -rangeX, y: rangeY },
      { x: -rangeX, y: -rangeY },
      { x: rangeX, y: -rangeY }
    ];
    const start = Math.floor(((preferredAngle % TAU + TAU) % TAU) / TAU * corners.length);
    let best = corners[start];
    let bestDistance = -Infinity;
    for (let offset = 0; offset < corners.length; offset += 1) {
      const candidate = corners[(start + offset) % corners.length];
      const x = arena.x + candidate.x;
      const y = arena.y + candidate.y;
      const candidateDistance = distanceSquared(x, y, ship.x, ship.y);
      if (candidateDistance > bestDistance) {
        best = candidate;
        bestDistance = candidateDistance;
      }
    }
    return { x: arena.x + best.x, y: arena.y + best.y };
  }

  function spawnMine(x, y, targetX, targetY, pattern, source) {
    if (state.mines.length >= CONFIG.caps.mines) return;
    const angle = Math.atan2(targetY - y, targetX - x);
    state.mines.push({
      id: nextEntityId++,
      owner: "enemy",
      x, y,
      vx: Math.cos(angle) * 115,
      vy: Math.sin(angle) * 115,
      radius: 15,
      fuse: pattern.fuse || 1.5,
      damage: (pattern.damage || 24) * CONFIG.difficulty.damageScale(state.sector, state.encounter),
      blastRadius: pattern.blastRadius || 74,
      phase: rng.range(0, TAU),
      armed: false,
      dead: false
    });
    audio.enemyWeapon(source || "bomber");
  }

  function spawnBoss() {
    const type = state.encounterData && state.encounterData.spec.bossType;
    const definition = CONFIG.bosses[type];
    if (!definition) return null;
    const spawnAngle = rng.range(0, TAU);
    const health = definition.baseHealth * CONFIG.difficulty.bossHealthScale(state.sector, state.encounter);
    const boss = {
      id: nextEntityId++,
      x: state.arena.x,
      y: state.arena.y,
      vx: 0,
      vy: 0,
      radius: definition.radius,
      type,
      health,
      maxHealth: health,
      damage: definition.contactDamage * CONFIG.difficulty.damageScale(state.sector, state.encounter),
      score: definition.score,
      phase: 0,
      angle: spawnAngle + Math.PI,
      rotation: 0,
      rotationSpeed: 0.35,
      attackTimer: 1.1,
      secondaryTimer: 3.2,
      telegraph: null,
      action: null,
      actionConfig: null,
      actionTimer: 0,
      nodes: null,
      reflectionShield: definition.reflectionShield ? {
        phase: "cooldown",
        timer: Math.max(CONFIG.world.fixedStep, Number(definition.reflectionShield.cooldown) || 1),
        active: false,
        warning: false,
        radius: definition.radius + 16
      } : null,
      dead: false
    };
    const nodeCount = Math.min(8, Math.max(0, Math.floor(definition.nodeCount || 3)));
    const nodeHealth = Math.max(1, Number(definition.nodeHealth) || 16);
    boss.nodes = Array.from({ length: nodeCount }, (_, index) => ({
      index,
      x: boss.x,
      y: boss.y,
      radius: 13,
      health: nodeHealth * CONFIG.difficulty.healthScale(state.sector, state.encounter),
      maxHealth: nodeHealth * CONFIG.difficulty.healthScale(state.sector, state.encounter)
    }));
    const position = bossSpawnPosition(boss, spawnAngle);
    boss.x = position.x;
    boss.y = position.y;
    boss.angle = Math.atan2(state.ship.y - boss.y, state.ship.x - boss.x);
    state.boss = boss;
    state.arena.locked = true;
    constrainToArena(boss, bossNodePadding(boss), 0);
    updateBossNodes(boss);
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
      const rewardResult = state.upgradeDraft.phase === "idle" ? grantBossCoreReward() : null;
      if (encounterThreatsRemaining() === 0 && !state.encounterData.complete) {
        const definition = CONFIG.bosses[state.encounterData.spec.bossType];
        finishEncounter(`${definition.label} defeated${rewardResult ? ` · ${rewardResult.summary}` : ""}`);
      } else if (rewardResult) {
        saveCurrentStageCheckpoint();
        announce(`Capital ship down · ${rewardResult.summary} · clear the escorts`, 2);
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
      const speed = phaseDefinition.moveSpeed * CONFIG.difficulty.speedScale(state.sector, state.encounter);
      const length = Math.hypot(desiredX, desiredY) || 1;
      const amount = 1 - Math.exp(-2.8 * dt);
      boss.vx = lerp(boss.vx, desiredX / length * speed, amount);
      boss.vy = lerp(boss.vy, desiredY / length * speed, amount);
    }
    boss.x += boss.vx * dt;
    boss.y += boss.vy * dt;
    boss.angle = Math.atan2(dy, dx);
    boss.rotation += boss.rotationSpeed * dt;
    constrainToArena(boss, bossNodePadding(boss), 0.42);
  }

  function updateBoss(dt) {
    const boss = state.boss;
    if (!boss || boss.dead) return;
    setBossPhase(boss);
    updateBossReflectionShield(boss, dt);
    boss.attackTimer -= dt;
    boss.secondaryTimer -= dt;
    boss.actionTimer -= dt;
    updateBossAction(boss, dt);
    if (state.mode === "gameover") return;
    moveBoss(boss, dt);
    updateBossAttacks(boss);
    if (boss.nodes) updateBossNodes(boss);
  }

  function updateBossReflectionShield(boss, dt) {
    const shield = boss.reflectionShield;
    const values = CONFIG.bosses[boss.type] && CONFIG.bosses[boss.type].reflectionShield;
    if (!shield || !values) return;
    const nodesAlive = Boolean(boss.nodes && boss.nodes.some((node) => node.health > 0));
    if (!nodesAlive) {
      shield.phase = "disabled";
      shield.timer = 0;
      shield.active = false;
      shield.warning = false;
      return;
    }
    if (shield.phase === "disabled") {
      shield.phase = "cooldown";
      shield.timer = Math.max(CONFIG.world.fixedStep, Number(values.cooldown) || 1);
    }
    shield.timer = Math.max(0, shield.timer - dt);
    if (shield.timer > 0) {
      shield.active = shield.phase === "active";
      shield.warning = shield.phase === "warning";
      return;
    }
    if (shield.phase === "cooldown") {
      shield.phase = "warning";
      shield.timer = Math.max(CONFIG.world.fixedStep, Number(values.warning) || 0.8);
    } else if (shield.phase === "warning") {
      shield.phase = "active";
      shield.timer = Math.max(CONFIG.world.fixedStep, Number(values.active) || 1.2);
      addRing(boss.x, boss.y, "#b79dff", boss.radius, 0.32, boss.radius + 28);
    } else {
      shield.phase = "cooldown";
      shield.timer = Math.max(CONFIG.world.fixedStep, Number(values.cooldown) || 3);
    }
    shield.active = shield.phase === "active";
    shield.warning = shield.phase === "warning";
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
        const chargeSpeed = (action.speed || 330) * CONFIG.difficulty.speedScale(state.sector, state.encounter);
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
      damagePlayer((action.damage || 28) * CONFIG.difficulty.damageScale(state.sector, state.encounter), boss.x, boss.y);
    }
    addRing(boss.x + Math.cos(boss.actionAngle) * 80, boss.y + Math.sin(boss.actionAngle) * 80, "#ff58df", 6, 0.32, 120);
    state.shake = Math.max(state.shake, 10);
    if (loud) audio.bossWeapon("beam");
  }

  function performBossAttack(boss, attack) {
    if (!attack) return;
    const color = boss.type === "leviathan" ? "#b77cff" : "#ff59d2";
    if (attack.type === "sweepingBeam") {
      boss.action = "beamWarning";
      boss.actionConfig = attack;
      boss.actionTimer = attack.warning;
      const lead = leadPoint(boss.x, boss.y, 950);
      boss.actionAngle = Math.atan2(lead.y - boss.y, lead.x - boss.x);
    } else if (attack.type === "crossVolley") {
      fireEnemyAt(boss.x, boss.y, state.ship.x, state.ship.y, attack.speed, attack.damage, attack.projectiles, attack.spread, color, boss.type);
    } else if (attack.type === "dashVolley") {
      fireEnemyAt(boss.x, boss.y, state.ship.x, state.ship.y, attack.speed, attack.damage, attack.projectiles, attack.spread, color, boss.type);
      const dashAngle = Math.atan2(state.ship.y - boss.y, state.ship.x - boss.x);
      const dashSpeed = attack.dashSpeed * CONFIG.difficulty.speedScale(state.sector, state.encounter);
      boss.vx = Math.cos(dashAngle) * dashSpeed;
      boss.vy = Math.sin(dashAngle) * dashSpeed;
      boss.action = "dash";
      boss.actionConfig = attack;
      boss.actionTimer = attack.dashDuration;
    } else if (attack.type === "droneLaunch") {
      const livingChildren = state.aliens.filter((alien) => alien.parent === boss && !alien.dead).length;
      const count = Math.min(
        Math.max(0, attack.count || 0),
        Math.max(0, (attack.maxChildren || attack.count || 0) - livingChildren),
        Math.max(0, CONFIG.caps.aliens - state.aliens.length)
      );
      for (let index = 0; index < count; index += 1) {
        const offset = (index - (count - 1) * 0.5) * 0.7;
        spawnAlien(attack.spawnType || "scout", {
          x: boss.x + Math.cos(boss.angle + Math.PI + offset) * 70,
          y: boss.y + Math.sin(boss.angle + Math.PI + offset) * 70,
          threatCost: 0,
          score: attack.childScore,
          noDrops: true,
          required: false,
          parent: boss,
          generation: state.encounterData.generation
        });
      }
    } else if (attack.type === "mineArc") {
      const count = Math.min(CONFIG.caps.mines, Math.max(0, Math.floor(attack.count || 0)));
      for (let index = 0; index < count; index += 1) {
        const angle = boss.angle + (index - (count - 1) / 2) * 0.45;
        spawnMine(boss.x, boss.y, boss.x + Math.cos(angle) * 400, boss.y + Math.sin(angle) * 400, {
          fuse: attack.fuse + index * (attack.fuseStep || 0),
          blastRadius: attack.blastRadius,
          damage: attack.damage
        }, boss.type);
      }
    }
  }

  function updateBossAttacks(boss) {
    const attacks = CONFIG.bosses[boss.type].phases[boss.phase].attacks;
    const primary = attacks[0];
    const secondary = attacks[1];
    if (boss.attackTimer <= 0 && !boss.action) {
      performBossAttack(boss, primary);
      boss.attackTimer = CONFIG.difficulty.scaledCooldown(primary.baseCooldown, state.sector, state.encounter);
    }
    if (boss.secondaryTimer <= 0 && !boss.action) {
      performBossAttack(boss, secondary);
      boss.secondaryTimer = CONFIG.difficulty.scaledCooldown(secondary.baseCooldown, state.sector, state.encounter);
    }
  }

  function updateBossNodes(boss) {
    const living = boss.nodes.filter((node) => node.health > 0);
    for (const node of living) {
      const orbit = state.time * (0.62 + boss.phase * 0.12) + node.index / boss.nodes.length * TAU;
      const desiredRadius = boss.radius + 46 + Math.sin(state.time * 0.8 + node.index) * 9;
      let radiusX = desiredRadius;
      let radiusY = desiredRadius;
      if (state.arena.locked) {
        radiusX = Math.min(
          desiredRadius,
          Math.max(0, state.arena.halfWidth - node.radius - Math.abs(boss.x - state.arena.x))
        );
        radiusY = Math.min(
          desiredRadius,
          Math.max(0, state.arena.halfHeight - node.radius - Math.abs(boss.y - state.arena.y))
        );
      }
      node.x = boss.x + Math.cos(orbit) * radiusX;
      node.y = boss.y + Math.sin(orbit) * radiusY;
    }
  }

  function bossNodePadding(boss) {
    let largestNodeRadius = 0;
    for (const node of boss.nodes || []) {
      if (node.health > 0) largestNodeRadius = Math.max(largestNodeRadius, Math.max(0, Number(node.radius) || 0));
    }
    return largestNodeRadius > 0 ? largestNodeRadius * 2 + 3 : 6;
  }

  function damageBoss(amount) {
    const boss = state.boss;
    if (state.mode === "gameover" || !boss || boss.dead) return;
    const shielded = boss.nodes && boss.nodes.some((node) => node.health > 0);
    const reflectionValues = CONFIG.bosses[boss.type] && CONFIG.bosses[boss.type].reflectionShield;
    const reflectionActive = shielded && boss.reflectionShield && boss.reflectionShield.active;
    const multiplier = reflectionActive ? clamp(Number(reflectionValues.damageMultiplier) || 0.25, 0.05, 1) : shielded ? 0.42 : 1;
    boss.health -= amount * multiplier;
    addFloater(boss.x, boss.y - boss.radius, shielded ? (reflectionActive ? "REFLECT" : "SHIELD") : Math.max(1, Math.round(amount)), shielded ? "#6fffff" : "#ffffff", 12);
    audio.impact(shielded ? "shield" : "boss", clamp(amount / 36, 0.2, 1));
    if (boss.health <= 0) killBoss();
  }

  function grantBossCoreReward() {
    const data = state.encounterData;
    if (!data || !data.bossDefeated || data.bossRewardGranted) return null;
    data.bossRewardGranted = true;
    return grantModuleUpgrade("BOSS CORE", null, 1, false, false);
  }

  function killBoss() {
    const boss = state.boss;
    if (!boss || boss.dead) return;
    boss.dead = true;
    state.encounterData.bossDefeated = true;
    state.score += Math.round(boss.score * CONFIG.difficulty.scoreScale(state.sector, state.encounter));
    state.bossesDefeated += 1;
    state.stats.kills += 1;
    state.ship.hull = Math.min(state.ship.maxHull, state.ship.hull + CONFIG.bossArena.victoryHeal);
    const bossImpact = burst(boss.x, boss.y, "#ff58df", settings.reducedEffects ? 45 : 100, 2.5);
    styleImpactSprite(bossImpact, boss.x, boss.y, "boss", Math.min(240, boss.radius * 2.35), "#ff58df");
    addRing(boss.x, boss.y, "#ffffff", 12, 1.1, state.arena.radius * 0.85);
    state.enemyBullets.length = 0;
    state.mines.length = 0;
    if (boss.nodes) for (const node of boss.nodes) node.health = 0;
    state.shake = 20;
    state.flash = 1;
    state.flashColor = "#ffffff";
    audio.destruction("boss", boss.radius);
    const rewardResult = state.upgradeDraft.phase === "idle" ? grantBossCoreReward() : null;
    state.boss = null;
    show(dom.bossHud, false);
    if (encounterThreatsRemaining() === 0) {
      finishEncounter(`${CONFIG.bosses[boss.type].label} defeated${rewardResult ? ` · ${rewardResult.summary}` : ""}`);
    } else if (rewardResult) {
      saveCurrentStageCheckpoint();
      announce(`Capital ship down · ${rewardResult.summary} · clear the escorts`, 2);
    } else {
      announce("Capital ship down — clear the escorts", 1.6);
    }
  }

  function nearestTarget(x, y, range, eligible) {
    let best = null;
    let bestSquared = range * range;
    const consider = (target) => {
      if (!target || target.dead || (eligible && !eligible(target))) return;
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
        const target = nearestTarget(bullet.x, bullet.y, Math.max(1, Number(bullet.targetRange) || 760));
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
      if (mine.owner === "player") {
        mine.life = Math.max(0, mine.life - dt);
        let triggered = false;
        const triggerSquared = mine.triggerRadius * mine.triggerRadius;
        for (const asteroid of state.asteroids) {
          if (!asteroid.dead && distanceSquared(mine.x, mine.y, asteroid.x, asteroid.y) <= triggerSquared) {
            triggered = true;
            break;
          }
        }
        if (!triggered) {
          for (const alien of state.aliens) {
            if (!alien.dead && distanceSquared(mine.x, mine.y, alien.x, alien.y) <= triggerSquared) {
              triggered = true;
              break;
            }
          }
        }
        if (!triggered && state.boss && distanceSquared(mine.x, mine.y, state.boss.x, state.boss.y) <= triggerSquared) triggered = true;
        if (triggered || mine.life <= 0) explodeMine(mine);
        if (state.mode === "gameover") return;
        continue;
      }
      mine.fuse -= dt;
      mine.armed = mine.fuse < 0.65;
      if (mine.fuse <= 0) explodeMine(mine);
      if (state.mode === "gameover") return;
    }
  }

  function explodeMine(mine) {
    if (!mine || mine.dead) return;
    mine.dead = true;
    if (mine.owner === "player") {
      const radiusSquared = mine.blastRadius * mine.blastRadius;
      for (const asteroid of state.asteroids) {
        if (!asteroid.dead && distanceSquared(mine.x, mine.y, asteroid.x, asteroid.y) <= radiusSquared) {
          damageThreat(asteroid, mine.damage, null, "playerMine");
          if (state.mode === "gameover") return;
        }
      }
      for (const alien of state.aliens) {
        if (!alien.dead && distanceSquared(mine.x, mine.y, alien.x, alien.y) <= radiusSquared) {
          damageThreat(alien, mine.damage, null, "playerMine");
          if (state.mode === "gameover") return;
        }
      }
      if (state.boss && distanceSquared(mine.x, mine.y, state.boss.x, state.boss.y) <= radiusSquared) damageBoss(mine.damage);
      addRing(mine.x, mine.y, CONFIG.weapons.modules.mineLayer.color, 5, 0.45, mine.blastRadius);
      const mineImpact = burst(mine.x, mine.y, CONFIG.weapons.modules.mineLayer.color, settings.reducedEffects ? 8 : 18, 1.2);
      styleImpactSprite(mineImpact, mine.x, mine.y, "explosion", Math.min(120, mine.blastRadius * 0.9), CONFIG.weapons.modules.mineLayer.color);
      audio.destruction("mine", mine.blastRadius);
      return;
    }
    if (distanceSquared(state.ship.x, state.ship.y, mine.x, mine.y) <= mine.blastRadius * mine.blastRadius) {
      damagePlayer(mine.damage, mine.x, mine.y);
    }
    addRing(mine.x, mine.y, "#ff6278", 5, 0.45, mine.blastRadius);
    const mineImpact = burst(mine.x, mine.y, "#ff7c72", settings.reducedEffects ? 8 : 18, 1.2);
    styleImpactSprite(mineImpact, mine.x, mine.y, "explosion", Math.min(120, mine.blastRadius * 0.9), "#ff7c72");
    audio.destruction("mine", mine.blastRadius);
  }

  function hitTargetWithBullet(bullet, target) {
    if (state.mode === "gameover" || bullet.dead || target.dead || bullet.hits.includes(target.id)) return false;
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
        if (state.mode === "gameover") return;
      }
      for (const alien of state.aliens) {
        if (alien !== directTarget && !alien.dead && distanceSquared(x, y, alien.x, alien.y) <= radiusSquared) damageThreat(alien, bullet.damage * 0.5, null);
        if (state.mode === "gameover") return;
      }
      addRing(x, y, bullet.color, 3, 0.32, bullet.blastRadius);
    }
    const impactMaterial = directTarget
      ? directTarget.kind ? "asteroid" : directTarget === state.boss ? "boss" : directTarget.type ? "alien" : "plasma"
      : "plasma";
    audio.impact(impactMaterial, clamp(bullet.damage / 40, 0.2, 1));
    const projectileImpact = burst(x, y, bullet.color, settings.reducedEffects ? 2 : 4, 0.55);
    styleImpactSprite(projectileImpact, x, y, "plasma", directTarget ? clamp(directTarget.radius * 0.9, 26, 62) : 30, bullet.color);
    if (bullet.pierce > 0) bullet.pierce -= 1;
    else bullet.dead = true;
  }

  function collidePlayerBullets() {
    for (const bullet of state.playerBullets) {
      if (state.mode === "gameover") return;
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
                const nodeImpact = burst(node.x, node.y, "#6fffff", settings.reducedEffects ? 10 : 22, 1.2);
                styleImpactSprite(nodeImpact, node.x, node.y, "explosion", 54, "#6fffff");
                state.score += 420;
                announce("Shield node destroyed", 0.85);
              }
            }
          }
        }
        if (!bullet.dead && !bullet.hits.includes(state.boss.id) && Core.segmentCircleHit(bullet.px, bullet.py, bullet.x, bullet.y, state.boss.x, state.boss.y, state.boss.radius + bullet.radius)) {
          bullet.hits.push(state.boss.id);
          if (state.boss.reflectionShield && state.boss.reflectionShield.active) {
            reflectPlayerBullet(bullet, state.boss);
          } else {
            damageBoss(bullet.damage);
            resolveBulletImpact(bullet, bullet.x, bullet.y, state.boss);
          }
        }
      }
      for (const asteroid of state.asteroids) {
        if (state.mode === "gameover") return;
        if (bullet.dead) break;
        hitTargetWithBullet(bullet, asteroid);
      }
      for (const alien of state.aliens) {
        if (state.mode === "gameover") return;
        if (bullet.dead) break;
        hitTargetWithBullet(bullet, alien);
      }
    }
  }

  function reflectPlayerBullet(bullet, boss) {
    const values = CONFIG.bosses[boss.type] && CONFIG.bosses[boss.type].reflectionShield;
    if (!values || bullet.dead) return false;
    bullet.dead = true;
    const incomingAngle = Math.atan2(bullet.vy || 0, bullet.vx || 1) + Math.PI;
    const reflected = spawnEnemyBullet(
      bullet.x,
      bullet.y,
      incomingAngle,
      Math.max(1, Number(values.speed) || 420),
      Math.max(0, Number(values.damage) || 12),
      "#c9a7ff",
      Math.max(CONFIG.world.fixedStep, Number(values.life) || 2.4)
    );
    if (reflected) {
      reflected.kind = "reflected";
      reflected.sourceBoss = boss.type;
    }
    addFloater(bullet.x, bullet.y, "REFLECT", "#d7c0ff", 11);
    const reflectionImpact = burst(bullet.x, bullet.y, "#b99cff", settings.reducedEffects ? 2 : 6, 0.7);
    styleImpactSprite(reflectionImpact, bullet.x, bullet.y, "shield", 46, "#b99cff");
    audio.impact("shield", 0.7);
    return true;
  }

  function collidePlayer() {
    const ship = state.ship;
    for (const bullet of state.enemyBullets) {
      if (state.mode === "gameover") return;
      if (bullet.dead) continue;
      if (Core.segmentCircleHit(bullet.px, bullet.py, bullet.x, bullet.y, ship.x, ship.y, ship.radius + bullet.radius)) {
        bullet.dead = true;
        damagePlayer(bullet.damage, bullet.x, bullet.y);
      }
    }
    for (const asteroid of state.asteroids) {
      if (state.mode === "gameover") return;
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
      if (state.mode === "gameover") return;
      if (!alien.dead && Core.circlesOverlap(ship.x, ship.y, ship.radius, alien.x, alien.y, alien.radius * 0.75)) {
        damagePlayer(alien.damage, alien.x, alien.y);
        if (state.mode === "gameover") return;
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
    if (state.mode === "gameover" || !entity || entity.dead) return;
    const isAsteroid = Boolean(entity.kind);
    const definition = isAsteroid ? CONFIG.asteroids[entity.kind] : CONFIG.aliens[entity.type];
    let multiplier = isAsteroid ? asteroidDamageMultiplier(entity, bullet) : 1;
    if (!isAsteroid && definition && definition.rangeArmor && cause !== "asteroid" && cause !== "environment") {
      const armorRange = Math.max(0, Number(definition.rangeArmor.distance) || 0);
      if (distanceSquared(entity.x, entity.y, state.ship.x, state.ship.y) > armorRange * armorRange) {
        multiplier *= clamp(Number(definition.rangeArmor.multiplier ?? definition.rangeArmor.damageMultiplier) || 1, 0.05, 1);
      }
    }
    entity.health -= amount * multiplier;
    if (isAsteroid) {
      entity.hitFlash = 1;
      if (bullet) {
        const bulletSpeed = Math.hypot(bullet.vx, bullet.vy) || 1;
        const massScale = 1 + Math.pow(Math.max(8, entity.radius) / 34, 2);
        const impulse = clamp(Math.max(0, Number(amount) || 0) * 38 / massScale, 0, 48);
        entity.vx += bullet.vx / bulletSpeed * impulse;
        entity.vy += bullet.vy / bulletSpeed * impulse;
        const speed = Math.hypot(entity.vx, entity.vy);
        const authoredMaximum = definition && Array.isArray(definition.speed) ? definition.speed[1] : 100;
        const speedCap = Math.max(160, authoredMaximum * 2.1);
        if (speed > speedCap) {
          entity.vx = entity.vx / speed * speedCap;
          entity.vy = entity.vy / speed * speedCap;
        }
      }
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
        health: kind === "auricShard" ? undefined : 1,
        threatCost: 0,
        score: Math.max(1, Math.round(CONFIG.asteroids[kind].score * 0.22)),
        noDrops: true,
        splitRemaining: Math.max(0, Math.floor(Number(splitRemaining) || 0)),
        required: parent.required,
        generation: parent.generation,
        waveIndex: parent.waveIndex,
        collisionGrace: CONFIG.combatField.asteroidCollisionGraceSeconds
      });
      if (child) spawned += 1;
    }
    // Required descendants expand the finite objective before the parent is credited as cleared.
    if (spawned && parent.required && state.encounterData && parent.generation === state.encounterData.generation) {
      state.encounterData.waveRequiredTotal += spawned;
      state.encounterData.stageRequiredTotal += spawned;
    }
    return spawned;
  }

  function killThreat(entity, cause) {
    if (state.mode === "gameover" || !entity || entity.dead) return false;
    const deathCause = cause || "player";
    entity.dead = true;
    const encounter = state.encounterData;
    const countsForWave = Boolean(encounter && entity.generation === encounter.generation && entity.required);
    if (countsForWave) {
      encounter.stageRequiredCleared += 1;
      if (entity.waveIndex === encounter.waveIndex) encounter.waveRequiredCleared += 1;
    }
    const rewarded = deathCause !== "asteroid" && deathCause !== "environment";
    if (encounter) {
      encounter.lastDeathCause = deathCause;
      if (rewarded) encounter.playerKills += 1;
      else encounter.environmentalKills += 1;
    }
    const definition = entity.kind ? CONFIG.asteroids[entity.kind] : CONFIG.aliens[entity.type];
    const variantValues = entity.kind && definition.variants && definition.variants[entity.hazardVariant];
    const deathExplosion = variantValues && variantValues.blastRadius ? variantValues : definition.deathExplosion;
    let pendingDeathExplosion = null;
    if (deathExplosion) {
      const blastRadius = Math.max(1, Number(deathExplosion.blastRadius) || Number(deathExplosion.radius) || 100);
      if (distanceSquared(entity.x, entity.y, state.ship.x, state.ship.y) <= blastRadius * blastRadius) {
        pendingDeathExplosion = {
          damage: Math.max(0, Number(deathExplosion.damage) || 0) * CONFIG.difficulty.damageScale(state.sector, state.encounter),
          x: entity.x,
          y: entity.y
        };
      }
      addRing(entity.x, entity.y, entity.kind === "corona" ? "#fff08a" : "#ffb347", 5, 0.55, blastRadius);
      state.shake = Math.max(state.shake, 8);
    }
    if (entity.kind && definition.deathBurst) {
      const burstData = definition.deathBurst;
      spawnFragments(entity, burstData.fragments, burstData.fragmentKind, burstData.fragmentRadius, burstData.fragmentSpeed, true, 0);
      addRing(entity.x, entity.y, "#ff9a45", 5, 0.55, Number(burstData.blastRadius) || 110);
    } else if (entity.kind && definition.split && entity.splitRemaining > 0) {
      const radius = Math.max(14, entity.radius * (definition.split.radiusScale || 0.42));
      spawnFragments(entity, definition.split.count, definition.split.into || "rock", radius, 135, false, entity.splitRemaining - 1);
    }
    if (entity.kind && definition.deathShrapnel) {
      const shardCount = spawnAsteroidShrapnel(entity, definition.deathShrapnel);
      if (shardCount) addRing(entity.x, entity.y, definition.deathShrapnel.color || "#8ffcff", 3, 0.32, entity.radius * 1.3);
    }
    state.stats.kills += 1;
    if (rewarded) {
      state.combo = clamp(state.combo + 1, 1, 20);
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      state.comboTimer = 2.8;
    }
    const multiplier = 1 + Math.floor((state.combo - 1) / 4) * 0.25;
    const earned = rewarded ? Math.round((entity.score || 0) * CONFIG.difficulty.scoreScale(state.sector, state.encounter) * multiplier) : 0;
    state.score += earned;
    if (rewarded) state.ship.pulse = Math.min(100, state.ship.pulse + 2.4 + (entity.threatCost || 0) * 0.8);
    addFloater(entity.x, entity.y - entity.radius, rewarded ? `+${earned}` : "IMPACT", rewarded ? "#ffffff" : "#ffd166", entity.radius > 70 ? 15 : 12);
    const deathColor = entity.kind === "volatile" || entity.hazardVariant === "explosive" ? "#ff9a45" :
      entity.kind === "auricColossus" || entity.kind === "auricShard" || entity.kind === "corona" ? "#ffd166" :
        entity.type ? "#79ffd4" : "#72e9ff";
    const deathImpact = burst(entity.x, entity.y, deathColor, settings.reducedEffects ? 6 : clamp(Math.round(entity.radius * 0.32), 8, 36), entity.radius > 70 ? 1.8 : 1.15);
    styleImpactSprite(
      deathImpact,
      entity.x,
      entity.y,
      entity.kind ? "asteroid" : "alien",
      clamp(entity.radius * 2.05, 44, 250),
      deathColor
    );
    state.shake = Math.max(state.shake, clamp(entity.radius * 0.06, 2, 10));
    audio.destruction(entity.kind ? "asteroid" : "alien", entity.radius);
    if (rewarded && !entity.noDrops) {
      if (encounter) encounter.killsSincePowerup += 1;
      const dropBand = currentDropBand();
      const pity = encounter && encounter.killsSincePowerup >= Math.max(1, Math.floor(Number(dropBand.pityKills) || 1));
      if (rng.chance(clamp(Number(dropBand.dropChance) || 0, 0, 1)) || pity) {
        if (spawnPickup(entity.x + rng.range(-18, 18), entity.y + rng.range(-18, 18))) {
          if (encounter) encounter.killsSincePowerup = 0;
        }
      }
    }
    // Resolve simultaneous blast damage last so a lethal trade snapshots the
    // kill, score, and drop state that the player actually earned.
    if (pendingDeathExplosion) {
      damagePlayer(pendingDeathExplosion.damage, pendingDeathExplosion.x, pendingDeathExplosion.y);
    }
    return true;
  }

  function damagePlayer(amount, sourceX, sourceY) {
    const ship = state.ship;
    if (!ship || ship.invulnerable > 0 || state.mode !== "playing") return false;
    const aegisReduction = ship.aegisTimer > 0 ? clamp(Number(CONFIG.powerups.aegis.damageReduction) || 0, 0, 0.9) : 0;
    let remaining = Math.max(0, Number(amount) || 0) * (1 - aegisReduction);
    let shieldAbsorbed = false;
    if (ship.shield > 0) {
      const drainMultiplier = Math.max(1, Number(CONFIG.powerups.shield.drainMultiplier) || 1);
      const shieldSpent = Math.min(ship.shield, remaining * drainMultiplier);
      shieldAbsorbed = shieldSpent > 0;
      ship.shield -= shieldSpent;
      remaining -= shieldSpent / drainMultiplier;
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
    const damageImpact = burst(ship.x, ship.y, "#ff6b7c", settings.reducedEffects ? 9 : 21, 1.3);
    styleImpactSprite(damageImpact, ship.x, ship.y, remaining > 0 || !shieldAbsorbed ? "hull" : "shield", 72, remaining > 0 ? "#ff6b7c" : "#8ffcff");
    audio.playerDamage(remaining > 0 || !shieldAbsorbed ? "hull" : "shield");
    if (ship.hull <= 0) {
      ship.hull = 0;
      const playerExplosion = burst(ship.x, ship.y, "#ffffff", settings.reducedEffects ? 34 : 80, 2.4);
      styleImpactSprite(playerExplosion, ship.x, ship.y, "explosion", 150, "#ffffff");
      audio.destruction("player", ship.radius);
      endRun();
    }
    return true;
  }

  function spawnPickup(x, y, forcedKind) {
    if (state.pickups.length >= CONFIG.caps.pickups) return null;
    let kind = forcedKind;
    if (!kind) {
      const band = currentDropBand();
      const weighted = [
        ["shield", CONFIG.powerups.shield],
        ["rapid", CONFIG.powerups.rapid],
        ["repair", CONFIG.powerups.repair],
        ["triShot", CONFIG.powerups.triShot],
        ["piercing", CONFIG.powerups.piercing],
        ["arcBurst", CONFIG.powerups.arcBurst],
        ["novaLance", CONFIG.powerups.novaLance],
        ["amplifier", CONFIG.powerups.amplifier],
        ["aegis", CONFIG.powerups.aegis],
        ["thruster", CONFIG.powerups.thruster],
        ["pulseCharge", CONFIG.powerups.pulseCharge],
        ["enigma", CONFIG.powerups.enigma]
      ].filter((item) => contentUnlocked(item[1])).map((item) => [item[0], Math.max(0, Number(item[1].weight) || 0)]);
      if (contentUnlocked(CONFIG.powerups.moduleUpgrade) && rewardableModuleIds().length && Number(band.moduleWeight) > 0) {
        weighted.push(["module", Number(band.moduleWeight)]);
      }
      const totalWeight = weighted.reduce((sum, item) => sum + item[1], 0);
      if (totalWeight <= 0) return null;
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

  function shuffledUpgradeIds(items) {
    const shuffled = items.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = rng.int(0, index);
      const value = shuffled[index];
      shuffled[index] = shuffled[swapIndex];
      shuffled[swapIndex] = value;
    }
    return shuffled;
  }

  function moduleUpgradeChoice(moduleId) {
    const definition = CONFIG.weapons.modules[moduleId];
    const currentTier = state.ship.modules[moduleId] || 0;
    const nextTier = Math.min(CONFIG.weapons.maxModuleTier, currentTier + 1);
    const nextValues = definition.tiers[nextTier - 1] || {};
    const rangeDescription = Number(nextValues.range) > 0 ? ` Effective range ${Math.round(nextValues.range)}.` : "";
    return {
      id: `module:${moduleId}`,
      enhancementId: moduleId,
      kind: "module",
      permanence: "permanent",
      activation: definition.activation,
      moduleId,
      nextTier,
      title: definition.label,
      tier: currentTier ? `Mk ${roman(currentTier)} → Mk ${roman(nextTier)}` : "Install Mk I",
      description: `${MODULE_DESCRIPTIONS[moduleId]}${rangeDescription}`
    };
  }

  function temporaryUpgradeChoice(kind) {
    const timer = TEMPORARY_TIMER_BY_KIND[kind];
    const values = CONFIG.powerups[kind];
    return {
      id: `temporary:${kind}`,
      enhancementId: kind,
      kind: "temporary",
      permanence: "temporary",
      activation: kind === "amplifier" || kind === "aegis" ? "passive" : "whileFiring",
      timer,
      title: values.label,
      tier: `+${values.duration}s`,
      description: `Adds ${values.duration} seconds and stacks up to ${TEMP_WEAPON_LIMITS[timer]} seconds.`
    };
  }

  function supportUpgradeChoice(kind) {
    const values = CONFIG.powerups[kind];
    const title = kind === "repair" ? "Hull Restoration" : kind === "shield" ? "Shield Reserve" : "Pulse Reserve";
    return {
      id: `support:${kind}`,
      enhancementId: kind,
      kind: "support",
      permanence: "run-only",
      activation: "instant",
      title,
      tier: `+${values.amount}`,
      description: kind === "repair" ? "Repairs hull immediately; overflow converts into score." :
        kind === "shield" ? "Restores shields immediately; overflow converts into score." :
          "Recharges Void Pulse immediately; overflow converts into score."
    };
  }

  function buildUpgradeChoices() {
    const choiceCount = Math.max(1, Math.floor(CONFIG.powerups.enigma.choiceCount));
    const permanentIds = shuffledUpgradeIds(rewardableModuleIds());
    const temporaryIds = shuffledUpgradeIds(TEMPORARY_UPGRADE_ORDER.filter((kind) => {
      const timer = TEMPORARY_TIMER_BY_KIND[kind];
      return contentUnlocked(CONFIG.powerups[kind]) && state.ship[timer] < TEMP_WEAPON_LIMITS[timer] - 0.0001;
    }));
    const supportIds = shuffledUpgradeIds(SUPPORT_UPGRADE_ORDER.filter((kind) => contentUnlocked(CONFIG.powerups[kind])));
    const selected = [];
    const used = new Set();
    const addChoice = (choice) => {
      if (!choice || used.has(choice.id) || selected.length >= choiceCount) return;
      selected.push(choice);
      used.add(choice.id);
    };

    const permanentOffered = permanentIds.length && rng.chance(clamp(Number(currentDropBand().permanentDraftChance) || 0, 0, 1));
    if (permanentOffered) addChoice(moduleUpgradeChoice(permanentIds.shift()));
    if (temporaryIds.length) addChoice(temporaryUpgradeChoice(temporaryIds.shift()));

    const remainder = shuffledUpgradeIds(
      temporaryIds.map((kind) => temporaryUpgradeChoice(kind))
        .concat(supportIds.map((kind) => supportUpgradeChoice(kind)))
    );
    for (const choice of remainder) addChoice(choice);
    return shuffledUpgradeIds(selected).slice(0, choiceCount);
  }

  function upgradeChoiceElement(tagName, className, text) {
    const element = global.document.createElement(tagName);
    element.className = className;
    element.textContent = text;
    return element;
  }

  function upgradeActivationLabel(activation) {
    if (activation === "whileFiring") return "While firing";
    if (activation === "autonomous") return "Autonomous";
    if (activation === "passive") return "Passive";
    return "Instant";
  }

  function buildUpgradeChoiceButton(choice, index) {
    const button = global.document.createElement("button");
    button.type = "button";
    button.id = `enigma-choice-${index + 1}`;
    button.className = `upgrade-card is-${choice.activation} is-${choice.permanence}`;
    button.dataset.choiceIndex = String(index);
    button.dataset.enhancementId = choice.enhancementId;
    button.setAttribute("aria-keyshortcuts", String(index + 1));
    const permanenceLabel = choice.permanence === "run-only" ? "run only" : choice.permanence;
    const activationLabel = upgradeActivationLabel(choice.activation).toLowerCase();
    button.setAttribute("aria-label", `${choice.title}. ${choice.tier}. ${permanenceLabel}. ${activationLabel}. ${choice.description}`);

    const heading = upgradeChoiceElement("span", "upgrade-card-head", "");
    const kind = upgradeChoiceElement("span", "upgrade-card-kind", "");
    const key = upgradeChoiceElement("span", "upgrade-card-key", String(index + 1));
    key.setAttribute("aria-hidden", "true");
    kind.appendChild(key);
    kind.appendChild(upgradeChoiceElement("span", "",
      choice.kind === "module" ? "Permanent system" : choice.kind === "temporary" ? "Timed effect" : "Instant support"
    ));
    heading.appendChild(kind);
    heading.appendChild(upgradeChoiceElement("span", "upgrade-card-tier", choice.tier));
    button.appendChild(heading);
    button.appendChild(upgradeChoiceElement("strong", "upgrade-card-title", choice.title));
    const previewFrame = upgradeChoiceElement("span", "upgrade-card-preview-frame", "");
    previewFrame.setAttribute("aria-hidden", "true");
    const preview = global.document.createElement("canvas");
    preview.className = "upgrade-card-preview";
    preview.width = 240;
    preview.height = 64;
    preview.setAttribute("aria-hidden", "true");
    previewFrame.appendChild(preview);
    button.appendChild(previewFrame);
    button.upgradePreviewCanvas = preview;
    button.appendChild(upgradeChoiceElement("span", "upgrade-card-description", choice.description));
    const tags = upgradeChoiceElement("span", "upgrade-card-tags", "");
    tags.appendChild(upgradeChoiceElement("span", `upgrade-card-tag is-${choice.permanence}`, choice.permanence === "run-only" ? "Run only" : choice.permanence));
    tags.appendChild(upgradeChoiceElement("span", `upgrade-card-tag is-${choice.activation}`, upgradeActivationLabel(choice.activation)));
    button.appendChild(tags);
    button.addEventListener("click", () => selectUpgradeChoice(index));
    return button;
  }

  function presentUpgradeChoices() {
    if (orientationBlocked || state.mode !== "playing" || state.upgradeDraft.phase !== "choosing" || !dom.enigmaUpgradeModal || !dom.enigmaUpgradeGrid) return false;
    if (upgradeChoiceButtons.length !== state.upgradeDraft.choices.length) {
      dom.enigmaUpgradeGrid.textContent = "";
      upgradeChoiceCanvases = [];
      upgradeChoiceButtons = state.upgradeDraft.choices.map((choice, index) => {
        const button = buildUpgradeChoiceButton(choice, index);
        upgradeChoiceCanvases.push(button.upgradePreviewCanvas);
        dom.enigmaUpgradeGrid.appendChild(button);
        return button;
      });
    }
    if (!dom.enigmaUpgradeModal.open) openDialog(dom.enigmaUpgradeModal);
    state.upgradeDraft.focusIndex = clamp(state.upgradeDraft.focusIndex, 0, Math.max(0, upgradeChoiceButtons.length - 1));
    upgradeChoiceButtons[state.upgradeDraft.focusIndex]?.focus({ preventScroll: true });
    if (dom.enigmaUpgradeStatus) dom.enigmaUpgradeStatus.textContent = "Combat paused. Choose one of three enhancements.";
    syncModePresentation();
    return true;
  }

  function focusUpgradeChoice(direction) {
    if (orientationBlocked || state.mode !== "playing" || state.upgradeDraft.phase !== "choosing" || !upgradeChoiceButtons.length) return false;
    const count = upgradeChoiceButtons.length;
    state.upgradeDraft.focusIndex = (state.upgradeDraft.focusIndex + direction + count) % count;
    upgradeChoiceButtons[state.upgradeDraft.focusIndex].focus({ preventScroll: true });
    return true;
  }

  function beginUpgradeDraft(x, y) {
    if (!state.ship || state.upgradeDraft.phase !== "idle") return false;
    const choices = buildUpgradeChoices();
    if (choices.length !== CONFIG.powerups.enigma.choiceCount) return false;
    state.upgradeDraft = {
      phase: "slowing",
      elapsed: 0,
      duration: Math.max(CONFIG.world.fixedStep, CONFIG.powerups.enigma.slowdownSeconds),
      timeScale: 1,
      choices,
      focusIndex: 0,
      x: Number.isFinite(Number(x)) ? Number(x) : state.ship.x,
      y: Number.isFinite(Number(y)) ? Number(y) : state.ship.y
    };
    upgradeChoiceButtons = [];
    upgradeChoiceCanvases = [];
    if (dom.enigmaUpgradeGrid) dom.enigmaUpgradeGrid.textContent = "";
    if (dom.enigmaUpgradeStatus) dom.enigmaUpgradeStatus.textContent = "Enigma signal acquired. Time dilation active.";
    resetTransientInput();
    state.ship.invulnerable = Math.max(
      state.ship.invulnerable,
      state.upgradeDraft.duration + CONFIG.powerups.enigma.resumeInvulnerability
    );
    syncModePresentation();
    announce("Enigma signal · choose your evolution", state.upgradeDraft.duration + 0.4);
    state.flash = Math.max(state.flash, settings.reducedEffects ? 0.28 : 0.72);
    state.flashColor = "#b77cff";
    addRing(state.upgradeDraft.x, state.upgradeDraft.y, "#bd83ff", 8, 0.72, 190);
    burst(state.upgradeDraft.x, state.upgradeDraft.y, "#ff79e4", settings.reducedEffects ? 8 : 24, 1.35);
    return true;
  }

  function advanceUpgradeDraft(dt) {
    const draft = state.upgradeDraft;
    if (draft.phase === "idle") return 1;
    if (draft.phase === "choosing") return 0;
    draft.elapsed = Math.min(draft.duration, draft.elapsed + dt);
    const remaining = clamp(1 - draft.elapsed / draft.duration, 0, 1);
    draft.timeScale = remaining * remaining * (3 - 2 * remaining);
    if (draft.elapsed >= draft.duration) {
      draft.phase = "choosing";
      draft.timeScale = 0;
      presentUpgradeChoices();
      syncModePresentation();
      return 0;
    }
    return draft.timeScale;
  }

  function cancelUpgradeDraft() {
    closeDialog(dom.enigmaUpgradeModal);
    state.upgradeDraft = idleUpgradeDraft();
    upgradeChoiceButtons = [];
    upgradeChoiceCanvases = [];
    if (dom.enigmaUpgradeGrid) dom.enigmaUpgradeGrid.textContent = "";
    if (dom.enigmaUpgradeStatus) dom.enigmaUpgradeStatus.textContent = "";
    syncModePresentation();
  }

  function addTemporaryUpgrade(kind) {
    const timer = TEMPORARY_TIMER_BY_KIND[kind];
    const values = CONFIG.powerups[kind];
    if (!timer || !values) return null;
    const before = state.ship[timer];
    state.ship[timer] = clamp(before + values.duration, 0, TEMP_WEAPON_LIMITS[timer]);
    return {
      title: values.label,
      summary: `${values.label} · ${Math.ceil(state.ship[timer])}s stacked`,
      changed: state.ship[timer] > before
    };
  }

  function addSupportUpgrade(kind) {
    let changed = false;
    if (kind === "repair") {
      const before = state.ship.hull;
      state.ship.hull = Math.min(state.ship.maxHull, state.ship.hull + CONFIG.powerups.repair.amount);
      changed = state.ship.hull > before;
    } else if (kind === "shield") {
      const before = state.ship.shield;
      state.ship.shield = Math.min(CONFIG.powerups.shield.cap, state.ship.shield + CONFIG.powerups.shield.amount);
      changed = state.ship.shield > before;
    } else if (kind === "pulseCharge") {
      const before = state.ship.pulse;
      state.ship.pulse = Math.min(100, state.ship.pulse + CONFIG.powerups.pulseCharge.amount);
      changed = state.ship.pulse > before;
    }
    if (!changed) state.score += 500;
    const label = kind === "repair" ? "Hull restored" : kind === "shield" ? "Shields restored" : "Void Pulse charged";
    return { title: label, summary: changed ? label : "System overflow · +500 score", changed: true };
  }

  function selectUpgradeChoice(index) {
    if (orientationBlocked || state.mode !== "playing" || state.upgradeDraft.phase !== "choosing") return false;
    const choiceIndex = Math.floor(Number(index));
    const choice = state.upgradeDraft.choices[choiceIndex];
    if (!choice) return false;
    const selectedButton = upgradeChoiceButtons[choiceIndex];
    selectedButton?.setAttribute("aria-pressed", "true");
    for (const button of upgradeChoiceButtons) button.disabled = true;

    let result;
    if (choice.kind === "module") result = grantModuleUpgrade("ENIGMA", choice.moduleId, 1, false, false);
    else if (choice.kind === "temporary") result = addTemporaryUpgrade(choice.enhancementId);
    else result = addSupportUpgrade(choice.enhancementId);

    closeDialog(dom.enigmaUpgradeModal);
    state.upgradeDraft = idleUpgradeDraft();
    upgradeChoiceButtons = [];
    upgradeChoiceCanvases = [];
    resetTransientInput();
    gamepadRequiresNeutral = true;
    if (state.ship) state.ship.invulnerable = Math.max(state.ship.invulnerable, CONFIG.powerups.enigma.resumeInvulnerability);
    syncModePresentation();
    announce(result.summary, 1.9);
    if (dom.enigmaUpgradeStatus) dom.enigmaUpgradeStatus.textContent = `${result.summary}. Combat resumed.`;
    saveCurrentStageCheckpoint();
    updateUI(true);
    if (!touchCapable) canvas.focus({ preventScroll: true });
    return true;
  }

  function applyPickup(pickup) {
    if (!pickup || pickup.dead || !state.ship) return false;
    // Freeze every later pickup behind the pending decision so generated cards
    // cannot become stale while the Enigma slowdown is still simulating.
    if (state.upgradeDraft.phase !== "idle") return false;
    if (pickup.kind === "enigma" && !beginUpgradeDraft(pickup.x, pickup.y)) return false;
    pickup.dead = true;
    const ship = state.ship;
    if (pickup.kind === "enigma") {
      // The selected card owns the checkpoint write after time dilation completes.
    } else if (pickup.kind === "shield") {
      ship.shield = Math.min(CONFIG.powerups.shield.cap, ship.shield + CONFIG.powerups.shield.amount);
      showPowerup("SHIELD ONLINE");
    } else if (TEMPORARY_TIMER_BY_KIND[pickup.kind]) {
      const result = addTemporaryUpgrade(pickup.kind);
      showPowerup(result.summary);
    } else if (pickup.kind === "repair") {
      ship.hull = Math.min(ship.maxHull, ship.hull + CONFIG.powerups.repair.amount);
      showPowerup("HULL REPAIRED");
    } else if (pickup.kind === "pulseCharge") {
      ship.pulse = Math.min(100, ship.pulse + CONFIG.powerups.pulseCharge.amount);
      showPowerup("VOID PULSE CHARGED");
    } else if (pickup.kind === "module") {
      grantModuleUpgrade("MODULE CACHE", null, 1, false);
    }
    if (pickup.kind !== "enigma") saveCurrentStageCheckpoint();
    burst(pickup.x, pickup.y, pickup.kind === "enigma" ? "#c584ff" : "#ffffff", settings.reducedEffects ? 6 : 14, 0.9);
    audio.pickup(pickup.kind);
    return true;
  }

  function grantModuleUpgrade(source, preferredModule, tierCount, shouldAnnounce, shouldShowStatus) {
    const modules = state.ship.modules;
    const eligibleIds = rewardableModuleIds();
    const preferred = eligibleIds.includes(preferredModule) ? preferredModule : null;
    const unopened = eligibleIds.filter((id) => !modules[id]);
    let selected = preferred;
    if (!selected && unopened.length) selected = unopened[0];
    else if (!selected && eligibleIds.length) {
      const lowest = Math.min(...eligibleIds.map((id) => modules[id] || 0));
      selected = eligibleIds.find((id) => (modules[id] || 0) === lowest) || null;
    }
    if (!selected) {
      state.ship.hull = Math.min(state.ship.maxHull, state.ship.hull + 25);
      state.score += 500;
      if (shouldShowStatus !== false) showPowerup(`${source} // SYSTEM OVERFLOW`);
      return { moduleId: null, tier: 0, title: "System overflow", summary: "System overflow · +500 score", overflow: true };
    }
    const levels = Math.max(1, Math.floor(Number(tierCount) || 1));
    const tierCap = Math.min(CONFIG.weapons.maxModuleTier, Math.max(1, Math.floor(Number(currentDropBand().rewardTierCap) || CONFIG.weapons.maxModuleTier)));
    modules[selected] = Math.min(tierCap, (modules[selected] || 0) + levels);
    const label = CONFIG.weapons.modules[selected].label;
    const summary = `${label} Mk ${roman(modules[selected])} · permanent`;
    if (shouldShowStatus !== false) showPowerup(`${source} // PERMANENT · ${label} MK ${roman(modules[selected])}`);
    if (shouldAnnounce !== false) announce(summary, 1.7);
    audio.upgrade();
    state.moduleSignature = "";
    return { moduleId: selected, tier: modules[selected], title: label, summary, overflow: false };
  }

  function showPowerup(text) {
    state.powerupTextTimer = 4;
    if (dom.powerupStatus) dom.powerupStatus.textContent = text;
  }

  function roman(value) {
    return ["—", "I", "II", "III", "IV", "V"][clamp(Math.floor(value), 0, CONFIG.weapons.maxModuleTier)];
  }

  function styleImpactSprite(effect, x, y, material, size, color) {
    if (!effect) return null;
    effect.x = x;
    effect.y = y;
    effect.vx = 0;
    effect.vy = 0;
    effect.type = "sprite";
    effect.material = String(material || "plasma");
    effect.layer = "front";
    effect.radius = 0;
    effect.color = color || "#ffffff";
    effect.size = clamp(Number(size) || 36, 18, 260);
    return effect;
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
    let lastEffect = null;
    for (let index = 0; index < total; index += 1) {
      const angle = rng.range(0, TAU);
      const speed = rng.range(35, 155) * (force || 1);
      const life = rng.range(0.25, 0.72) * Math.min(1.5, force || 1);
      lastEffect = {
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
      };
      state.effects.push(lastEffect);
    }
    return lastEffect;
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

  function updatePresentationEffects(dt, includeFloaters) {
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
    if (includeFloaters) {
      for (const floater of state.floaters) {
        floater.x += floater.vx * dt;
        floater.y += floater.vy * dt;
        floater.life -= dt;
        if (floater.life <= 0) floater.dead = true;
      }
    }
  }

  function cleanupPresentationEffects(includeFloaters) {
    Core.cleanupCapped(state.effects, (item) => !item.dead && Number.isFinite(item.x) && Number.isFinite(item.y),
      settings.reducedEffects ? CONFIG.caps.reducedParticles : CONFIG.caps.particles);
    if (includeFloaters) {
      Core.cleanupCapped(state.floaters, (item) => !item.dead && Number.isFinite(item.x) && Number.isFinite(item.y),
        CONFIG.caps.floaters);
    }
  }

  function updateEffects(dt) {
    updatePresentationEffects(dt, true);
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
            // Preserve the finite encounter state exactly; culling is relocation, never completion.
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
              splitRemaining: entity.splitRemaining,
              hitFlash: entity.hitFlash,
              collisionGrace: entity.collisionGrace,
              gateIndex: entity.gateIndex,
              hazardVariant: entity.hazardVariant,
              hazardPhase: entity.hazardPhase,
              hazardTimer: entity.hazardTimer,
              hazardAngle: entity.hazardAngle,
              hazardHitTimer: entity.hazardHitTimer,
              state: entity.state,
              stateTimer: entity.stateTimer,
              cooldown: entity.cooldown,
              damageTimer: entity.damageTimer,
              beamAngle: entity.beamAngle,
              lineageId: entity.lineageId,
              parentLineageId: entity.parentLineageId
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
    const projectedX = ship.x + ship.vx * lookScale;
    const projectedY = ship.y + ship.vy * lookScale;
    let targetX = projectedX;
    let targetY = projectedY;
    let sharpness = CONFIG.camera.followSharpness;
    if (state.mode === "transition" && state.cinematic.active) {
      targetX = ship.x - (state.cinematic.anchorX || 0);
      targetY = ship.y - (state.cinematic.anchorY || 0);
      sharpness = CONFIG.cinematic.cameraSharpness;
    } else if (state.combatField.active) {
      const deadZoneX = renderer.width * CONFIG.camera.deadZoneHalfWidthViewportRatio;
      const deadZoneY = renderer.height * CONFIG.camera.deadZoneHalfHeightViewportRatio;
      targetX = state.camera.x;
      targetY = state.camera.y;
      if (projectedX < state.camera.x - deadZoneX) targetX = projectedX + deadZoneX;
      else if (projectedX > state.camera.x + deadZoneX) targetX = projectedX - deadZoneX;
      if (projectedY < state.camera.y - deadZoneY) targetY = projectedY + deadZoneY;
      else if (projectedY > state.camera.y + deadZoneY) targetY = projectedY - deadZoneY;
      const bounds = combatCameraBounds();
      targetX = clamp(targetX, bounds.left, bounds.right);
      targetY = clamp(targetY, bounds.top, bounds.bottom);
    }
    const amount = 1 - Math.exp(-sharpness * dt);
    state.camera.x = lerp(state.camera.x, targetX, amount);
    state.camera.y = lerp(state.camera.y, targetY, amount);
    if (state.combatField.active && state.mode !== "transition") clampCameraToCombatField();
  }

  function combatCameraBounds() {
    const field = state.combatField;
    const horizontalInset = renderer.width * 0.5;
    const verticalInset = renderer.height * 0.5;
    const horizontalTravel = Math.max(0, field.halfWidth - horizontalInset);
    const verticalTravel = Math.max(0, field.halfHeight - verticalInset);
    return {
      left: field.x - horizontalTravel,
      right: field.x + horizontalTravel,
      top: field.y - verticalTravel,
      bottom: field.y + verticalTravel
    };
  }

  function clampCameraToCombatField() {
    const field = state.combatField;
    if (!field || !field.active) return;
    const bounds = combatCameraBounds();
    state.camera.x = clamp(state.camera.x, bounds.left, bounds.right);
    state.camera.y = clamp(state.camera.y, bounds.top, bounds.bottom);
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
      state.ship.orbitBlades,
      state.boss && state.boss.nodes,
      state.boss
    ];
    const points = [state.camera, state.aimWorld, state.arena, state.combatField];
    for (const asteroid of state.asteroids) if (asteroid.telegraph) points.push(asteroid.telegraph);
    for (const alien of state.aliens) if (alien.telegraph) points.push(alien.telegraph);
    if (state.upgradeDraft.phase !== "idle") points.push(state.upgradeDraft);
    if (state.boss && state.boss.telegraph) points.push(state.boss.telegraph);
    Core.rebaseOrigin(state.ship, collections, points, CONFIG.world.floatingOriginThreshold, CONFIG.world.chunkSize * 16);
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
    const simulationDt = state.mode === "playing" ? dt * advanceUpgradeDraft(dt) : dt;
    if (simulationDt <= 0) {
      updateUI(false);
      clearPressed();
      return;
    }
    state.time += simulationDt;
    state.runTime += simulationDt;
    if (state.mode === "transition") {
      updateCinematic(simulationDt);
      if (state.mode === "transition") updateCamera(simulationDt);
      state.shake = Math.max(0, state.shake - simulationDt * 24);
      state.flash = Math.max(0, state.flash - simulationDt * 2.8);
      if (state.announcementTimer > 0) {
        state.announcementTimer -= simulationDt;
        if (state.announcementTimer <= 0) hideAnnouncement();
      }
      updateUI(false);
      clearPressed();
      return;
    }
    updateShip(simulationDt);
    updateEncounter(simulationDt);
    if (state.mode === "gameover") {
      clearPressed();
      return;
    }
    updateAsteroids(simulationDt);
    if (state.mode === "gameover") {
      clearPressed();
      return;
    }
    updateAliens(simulationDt);
    if (state.mode === "gameover") {
      clearPressed();
      return;
    }
    collideAsteroidsAndAliens();
    if (state.mode === "gameover") {
      clearPressed();
      return;
    }
    updateProjectiles(simulationDt);
    updateMines(simulationDt);
    if (state.mode === "gameover") {
      clearPressed();
      return;
    }
    collidePlayerBullets();
    if (state.mode === "gameover") {
      clearPressed();
      return;
    }
    if (state.mode === "playing" && !state.encounterData.spec.bossType) updateEncounter(0);
    if (state.mode === "playing") collidePlayer();
    if (state.mode === "gameover") {
      clearPressed();
      return;
    }
    updateEffects(simulationDt);
    cullWorld();
    updateCamera(simulationDt);
    rebaseIfNeeded();

    state.comboTimer = Math.max(0, state.comboTimer - simulationDt);
    if (state.comboTimer <= 0) state.combo = 1;
    state.shake = Math.max(0, state.shake - simulationDt * 24);
    state.flash = Math.max(0, state.flash - simulationDt * 2.8);
    state.powerupTextTimer = Math.max(0, (state.powerupTextTimer || 0) - simulationDt);
    if (state.powerupTextTimer <= 0 && dom.powerupStatus) dom.powerupStatus.textContent = "";
    if (state.announcementTimer > 0) {
      state.announcementTimer -= simulationDt;
      if (state.announcementTimer <= 0) hideAnnouncement();
    }
    audio.musicTick(state.time, state.boss ? 1 : clamp((state.asteroids.length + state.aliens.length) / 12, 0.15, 0.9));
    state.uiTimer -= simulationDt;
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
    dom.moduleStrip.setAttribute("role", "list");
    dom.moduleStrip.removeAttribute("aria-live");
    const equipped = MODULE_ORDER.filter((id) => (state.ship.modules[id] || 0) > 0);
    if (dom.moduleConsole) dom.moduleConsole.classList.toggle("is-hidden", equipped.length === 0);
    let autonomousCount = 0;
    const accessibleModules = [];
    for (const id of equipped) {
      const tier = state.ship.modules[id] || 0;
      const slot = global.document.createElement("div");
      slot.className = "module-slot";
      slot.setAttribute("role", "listitem");
      const name = global.document.createElement("span");
      name.className = "module-name";
      const definition = CONFIG.weapons.modules[id];
      const autonomous = definition.activation === "autonomous";
      if (autonomous) autonomousCount += 1;
      accessibleModules.push(`${definition.label}, Mark ${roman(tier)}${autonomous ? ", autonomous" : ""}`);
      name.textContent = definition.label;
      const rank = global.document.createElement("span");
      rank.className = "module-rank";
      rank.textContent = `Mk ${roman(tier)}`;
      if (autonomous) {
        const badge = global.document.createElement("span");
        badge.className = "module-auto-badge";
        badge.textContent = "AUTO";
        rank.appendChild(badge);
      }
      slot.setAttribute(
        "aria-label",
        `${definition.label}, ${autonomous ? "autonomous, " : ""}Mark ${roman(tier)}`
      );
      slot.appendChild(name);
      slot.appendChild(rank);
      dom.moduleStrip.appendChild(slot);
    }
    if (equipped.length) {
      const summary = global.document.createElement("div");
      summary.className = "module-compact-summary";
      summary.setAttribute("role", "listitem");
      summary.setAttribute("aria-label", `${equipped.length} permanent systems. ${accessibleModules.join("; ")}`);
      if (equipped.length === 1) {
        const id = equipped[0];
        summary.textContent = `${CONFIG.weapons.modules[id].label} · Mk ${roman(state.ship.modules[id])}`;
      } else {
        summary.textContent = `${equipped.length} SYSTEMS · ${autonomousCount} AUTO`;
      }
      dom.moduleStrip.appendChild(summary);
    }
  }

  function updateActiveEffectsUI() {
    if (!dom.activeEffects || !dom.activeEffectsList || !state.ship) return;
    const active = TEMP_WEAPON_TIMERS.map((timer) => ({
      timer,
      kind: TEMPORARY_KIND_BY_TIMER[timer],
      seconds: Math.ceil(state.ship[timer])
    })).filter((entry) => entry.seconds > 0);
    const signature = active.map((entry) => `${entry.kind}:${entry.seconds}`).join("|");
    dom.activeEffects.classList.toggle("is-hidden", active.length === 0);
    if (!active.length) {
      if (state.activeEffectSignature || dom.activeEffectsList.textContent) dom.activeEffectsList.textContent = "";
      state.activeEffectSignature = "";
      return;
    }
    if (signature === state.activeEffectSignature) return;
    state.activeEffectSignature = signature;
    dom.activeEffectsList.textContent = "";
    dom.activeEffectsList.setAttribute("role", "list");
    const accessibleEffects = [];
    for (const entry of active) {
      const label = CONFIG.powerups[entry.kind].label;
      accessibleEffects.push(`${label}, ${entry.seconds} seconds remaining`);
      const chip = global.document.createElement("div");
      chip.className = "active-effect-chip";
      chip.setAttribute("role", "listitem");
      chip.setAttribute("aria-label", `${label}, ${entry.seconds} seconds remaining`);
      const name = global.document.createElement("span");
      name.className = "active-effect-name";
      name.textContent = label;
      const time = global.document.createElement("span");
      time.className = "active-effect-time";
      time.textContent = `${entry.seconds}s`;
      chip.appendChild(name);
      chip.appendChild(time);
      dom.activeEffectsList.appendChild(chip);
    }
    const summary = global.document.createElement("div");
    summary.className = "active-effect-compact-summary";
    summary.setAttribute("role", "listitem");
    summary.setAttribute("aria-label", `${active.length} timed effects. ${accessibleEffects.join("; ")}`);
    summary.textContent = active.length === 1
      ? `${CONFIG.powerups[active[0].kind].label} · ${active[0].seconds}s`
      : `${active.length} EFFECTS · ${active.reduce((total, entry) => total + entry.seconds, 0)}s`;
    dom.activeEffectsList.appendChild(summary);
  }

  function objectiveText() {
    const data = state.encounterData;
    if (!data) return "Stand by";
    if (state.mode === "transition" && state.cinematic.active) {
      return state.cinematic.phase === "travel" ? `Transit ${Math.round(state.cinematic.progress * 100)}%` : "Stage clear";
    }
    if (data.spec.bossType) {
      if (state.arena.warning > 0) return `Capital ship arrives in ${state.arena.warning.toFixed(1)}s`;
      if (data.bossDefeated) return `Clear remaining threats · ${encounterThreatsRemaining()}`;
      if (state.boss) return `Break ${CONFIG.bosses[state.boss.type].label}`;
      return "Signal collapsing";
    }
    const remaining = encounterThreatsRemaining();
    if (data.goalType === "titan") return remaining ? `Destroy all threats · ${remaining}` : "Area clear";
    if (currentReinforcements()) return `${data.waveLabel} · ${remaining} threats`;
    return `Wave ${data.waveNumber}/${data.waveCount} · ${remaining} threats`;
  }

  function updateTouchActionUI(button, usable, label) {
    if (!button) return;
    if (!usable && global.document.activeElement === button) {
      if (anyDialogOpen()) button.blur();
      else canvas.focus({ preventScroll: true });
    }
    button.disabled = !usable;
    button.classList.toggle("is-usable", usable);
    button.setAttribute("aria-hidden", String(!usable));
    button.setAttribute("aria-label", usable ? `${label} ready` : `${label} unavailable`);
    button.tabIndex = usable ? 0 : -1;
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
    const shieldPoints = Math.max(0, Math.round(state.ship.shield));
    if (dom.shieldReadout) {
      dom.shieldReadout.classList.toggle("is-hidden", shieldPoints <= 0);
      dom.shieldReadout.setAttribute("aria-valuemax", String(CONFIG.powerups.shield.cap));
      dom.shieldReadout.setAttribute("aria-valuenow", String(shieldPoints));
      dom.shieldReadout.setAttribute("aria-valuetext", `${shieldPoints} shield points`);
    }
    if (dom.shieldValue) dom.shieldValue.textContent = String(shieldPoints);
    const pulseRatio = clamp(state.ship.pulse / 100, 0, 1);
    if (dom.pulseValue) dom.pulseValue.textContent = pulseRatio >= 0.995 ? "READY" : `${Math.round(pulseRatio * 100)}%`;
    if (dom.pulseFill) {
      dom.pulseFill.style.transform = `scaleX(${pulseRatio})`;
      dom.pulseFill.classList.toggle("is-ready", pulseRatio >= 0.995);
    }
    if (dom.pulseTrack) dom.pulseTrack.setAttribute("aria-valuenow", String(Math.round(pulseRatio * 100)));
    const touchActionsActive = touchCapable && !orientationBlocked && state.mode === "playing" && state.upgradeDraft.phase === "idle";
    updateTouchActionUI(dom.touchDash, touchActionsActive && dashReady(state.ship), "Dash");
    updateTouchActionUI(dom.touchPulse, touchActionsActive && pulseReady(state.ship), "Void Pulse");
    if (dom.objectiveStatus) {
      const nextObjective = objectiveText();
      if (dom.objectiveStatus.textContent !== nextObjective) dom.objectiveStatus.textContent = nextObjective;
    }
    updateModuleUI();
    updateActiveEffectsUI();

    if (state.boss) {
      const ratio = clamp(state.boss.health / state.boss.maxHealth, 0, 1);
      show(dom.bossHud, true);
      if (dom.bossName) dom.bossName.textContent = CONFIG.bosses[state.boss.type].label;
      if (dom.bossPhase) {
        const livingNodes = state.boss.nodes ? state.boss.nodes.filter((node) => node.health > 0).length : 0;
        const reflection = state.boss.reflectionShield;
        const defense = reflection && livingNodes ? ` · Reflector ${livingNodes}${reflection.active ? " LIVE" : reflection.warning ? " CHARGING" : ""}` : "";
        dom.bossPhase.textContent = `Phase ${state.boss.phase + 1}${defense}`;
      }
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
    if (dom.settingsEffectsButton) {
      dom.settingsEffectsButton.textContent = effectsText;
      dom.settingsEffectsButton.setAttribute("aria-pressed", String(!settings.reducedEffects));
      dom.settingsEffectsButton.setAttribute("aria-label", settings.reducedEffects ? "Use full visual effects" : "Use reduced visual effects");
    }
    const fullscreen = Boolean(global.document.fullscreenElement);
    if (dom.settingsFullscreenButton) {
      dom.settingsFullscreenButton.textContent = fullscreen ? "Exit" : "Enter";
      dom.settingsFullscreenButton.setAttribute("aria-label", fullscreen ? "Exit fullscreen" : "Enter fullscreen");
    }
  }

  // Tests receive one intentional deterministic surface instead of reaching through globals.
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
        amplifierTimer: state.ship.amplifierTimer,
        aegisTimer: state.ship.aegisTimer,
        thrusterTimer: state.ship.thrusterTimer,
        modules: { ...state.ship.modules },
        weaponTimers: { ...state.ship.weaponTimers },
        orbitBlades: state.ship.orbitBlades.map((blade) => ({ ...blade }))
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
      presentation: { ...state.presentation },
      enigma: {
        phase: state.upgradeDraft.phase,
        elapsed: state.upgradeDraft.elapsed,
        duration: state.upgradeDraft.duration,
        timeScale: state.upgradeDraft.timeScale,
        choices: state.upgradeDraft.choices.map((choice) => ({
          id: choice.id,
          enhancementId: choice.enhancementId,
          kind: choice.kind,
          permanence: choice.permanence,
          activation: choice.activation,
          title: choice.title,
          tier: choice.tier,
          moduleId: choice.moduleId || null
        }))
      },
      boss: state.boss ? {
        type: state.boss.type,
        x: state.boss.x,
        y: state.boss.y,
        health: state.boss.health,
        maxHealth: state.boss.maxHealth,
        phase: state.boss.phase,
        livingNodes: state.boss.nodes ? state.boss.nodes.filter((node) => node.health > 0).length : 0,
        reflectionShield: state.boss.reflectionShield ? { ...state.boss.reflectionShield } : null
      } : null,
      stageHazards: state.asteroids.filter((asteroid) => asteroid.hazardVariant || asteroid.hazardPhase).map((asteroid) => ({
        id: asteroid.id,
        kind: asteroid.kind,
        variant: asteroid.hazardVariant,
        phase: asteroid.hazardPhase,
        timer: asteroid.hazardTimer,
        angle: asteroid.hazardAngle
      })),
      dropBand: { ...currentDropBand() },
      arena: { ...state.arena },
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
    state.cinematic.phase = "idle";
    state.presentation.gameoverPending = false;
    state.presentation.gameoverRemaining = 0;
    setMode("playing");
    state.sector = clamp(Math.floor(Number(sector) || state.sector || 1), 1, 999);
    state.encounter = clamp(Math.floor(Number(stage) || 1), 1, ENCOUNTER_COUNT);
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
    return startRunAt(1, false);
  }

  const debugApi = Object.freeze({
    start: debugStartRun,
    step: update,
    snapshot: debugSnapshot,
    state,
    input,
    setSeed: debugSetSeed,
    setStage: debugSetStage,
    spawnAsteroid: (kind, options) => spawnAsteroid(kind, options),
    spawnAlien: (type, options) => spawnAlien(type, options),
    spawnPickup: (x, y, kind) => spawnPickup(x, y, kind),
    applyPickup: (pickup) => applyPickup(pickup),
    chooseEnhancement: (index) => selectUpgradeChoice(index),
    damageThreat: (entity, amount, cause) => damageThreat(entity, amount, null, cause || "player"),
    killThreat: (entity, cause) => killThreat(entity, cause || "player"),
    collideThreats: collideAsteroidsAndAliens,
    damageBoss,
    activatePulse,
    progress: Object.freeze({
      get schema() { return progress.schema; },
      get maxUnlockedStage() { return progress.maxUnlockedStage; },
      get lastPlayedStage() { return progress.lastPlayedStage; },
      checkpoint(stage) { return cloneCheckpoint(progress.checkpoints[String(stage)]); }
    }),
    mobile: Object.freeze({
      get touchCapable() { return touchCapable; },
      get orientationBlocked() { return orientationBlocked; },
      get movePointerId() { return touchSticks.move.activeId; },
      get aimPointerId() { return touchSticks.aim.activeId; },
      get moveOrigin() { return { x: touchSticks.move.originX, y: touchSticks.move.originY }; },
      get aimOrigin() { return { x: touchSticks.aim.originX, y: touchSticks.aim.originY }; },
      get aimMode() { return touchSticks.aim.aimMode; },
      get autoAimElapsed() { return touchSticks.aim.autoAimElapsed; },
      get autoAimTarget() { return touchSticks.aim.autoAimTarget; },
      get autoAimTargetId() { return touchSticks.aim.autoAimTarget && touchSticks.aim.autoAimTarget.id || null; },
      clearTouchSticks,
      updateOrientationState
    })
  });
  ND.game = debugApi;

  function updateGameoverPresentation(dt) {
    if (state.mode !== "gameover" || !state.presentation.gameoverPending) return;
    const duration = Math.max(CONFIG.world.fixedStep, CONFIG.presentation.gameoverEffectDuration);
    state.presentation.gameoverRemaining = Math.max(0, state.presentation.gameoverRemaining - dt);
    updatePresentationEffects(dt, false);
    cleanupPresentationEffects(false);
    const ratio = state.presentation.gameoverRemaining / duration;
    state.shake = gameoverInitialShake * ratio;
    state.flash = gameoverInitialFlash * ratio;
    if (state.presentation.gameoverRemaining === 0) {
      state.presentation.gameoverPending = false;
      state.shake = 0;
      state.flash = 0;
      syncModePresentation();
      focusPrimaryModeAction("gameover");
    }
  }

  let previousTime = 0;
  let accumulator = 0;
  function renderUpgradeChoicePreviews(seconds) {
    if (state.upgradeDraft.phase !== "choosing" || !dom.enigmaUpgradeModal?.open ||
        !ND.EnigmaPreview || typeof ND.EnigmaPreview.render !== "function") return;
    for (let index = 0; index < upgradeChoiceCanvases.length; index += 1) {
      ND.EnigmaPreview.render(
        upgradeChoiceCanvases[index],
        state.upgradeDraft.choices[index],
        seconds,
        settings.reducedEffects
      );
    }
  }

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
      if (state.mode === "gameover") updateGameoverPresentation(frameDelta);
    }
    renderer.render(state, seconds, input.pointerActive);
    renderUpgradeChoicePreviews(seconds);
    global.requestAnimationFrame(frame);
  }

  setMode("menu");
  updateOrientationState();
  updateProgressUI();
  updateSettingsUI();
  updateUI(true);
  global.requestAnimationFrame(frame);
})(window);
