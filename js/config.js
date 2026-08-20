(function () {
  "use strict";

  window.ND = window.ND || {};

  function deepFreeze(value) {
    if (!value || (typeof value !== "object" && typeof value !== "function") || Object.isFrozen(value)) {
      return value;
    }
    if (typeof value === "function") return Object.freeze(value);
    Object.getOwnPropertyNames(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return Object.freeze(value);
  }

  function safeSector(sector) {
    const value = Number(sector);
    return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;
  }

  function sectorRoot(sector) {
    return Math.sqrt(safeSector(sector) - 1);
  }

  function safeStage(stage) {
    const value = Number(stage);
    return Number.isFinite(value) ? Math.max(1, Math.min(20, Math.floor(value))) : 1;
  }

  function stageProgress(stage) {
    const amount = (safeStage(stage) - 1) / 19;
    return amount * amount * (3 - amount * 2);
  }

  function stageMultiplier(stage, maximum) {
    return 1 + stageProgress(stage) * (maximum - 1);
  }

  const difficultyCaps = {
    healthMultiplier: 3,
    bossHealthMultiplier: 3.6,
    damageMultiplier: 2,
    speedMultiplier: 1.45,
    fireRateMultiplier: 1.65,
    scoreMultiplier: 2.4
  };

  function healthScale(sector, stage) {
    return Math.min(
      difficultyCaps.healthMultiplier,
      (1 + sectorRoot(sector) * 0.32) * stageMultiplier(stage, 1.38)
    );
  }

  function bossHealthScale(sector, stage) {
    return Math.min(
      difficultyCaps.bossHealthMultiplier,
      (1 + sectorRoot(sector) * 0.44) * stageMultiplier(stage, 1.5)
    );
  }

  function damageScale(sector, stage) {
    return Math.min(
      difficultyCaps.damageMultiplier,
      (1 + Math.log2(safeSector(sector)) * 0.16) * stageMultiplier(stage, 1.22)
    );
  }

  function speedScale(sector, stage) {
    return Math.min(
      difficultyCaps.speedMultiplier,
      (1 + sectorRoot(sector) * 0.055) * stageMultiplier(stage, 1.12)
    );
  }

  function fireRateScale(sector, stage) {
    return Math.min(
      difficultyCaps.fireRateMultiplier,
      (1 + sectorRoot(sector) * 0.08) * stageMultiplier(stage, 1.18)
    );
  }

  function scoreScale(sector, stage) {
    return Math.min(
      difficultyCaps.scoreMultiplier,
      (1 + sectorRoot(sector) * 0.18) * stageMultiplier(stage, 1.18)
    );
  }

  window.ND.CONFIG = deepFreeze({
    version: "v2026.8.20d",

    world: {
      fixedStep: 1 / 60,
      maxFrameDelta: 0.05,
      chunkSize: 960,
      floatingOriginThreshold: 80000,
      playerMaxSpeed: 560,
      playerDashSpeed: 980,
      playerAcceleration: 1550,
      playerDrag: 2.25,
      spawnSafetyRadius: 260
    },

    mobileControls: {
      stickRadius: 56,
      moveDeadzone: 0.16,
      moveCurve: 1.45,
      moveMaxOutput: 0.72,
      aimDeadzone: 0.24,
      aimCurve: 1.25,
      aimMaxOutput: 1,
      aimFireThreshold: 0.12,
      aimTurnRate: 7.2,
      autoAimHoldSeconds: 0.1
    },

    camera: {
      followSharpness: 8,
      velocityLookAhead: 0.14,
      maxLookAhead: 145,
      maxShake: 24
    },

    presentation: {
      gameoverEffectDuration: 1.2
    },

    combatField: {
      halfWidthViewportRatio: 0.43,
      halfHeightViewportRatio: 0.39,
      minHalfWidth: 120,
      minHalfHeight: 100,
      cameraSharpness: 15,
      boundaryBounce: 0.16,
      spawnEdgeSpan: 0.96,
      spawnShipClearance: 72,
      spawnThreatClearance: 18,
      spawnCandidateCount: 24,
      spawnMinimumRadius: 24,
      spawnMinimumContactSeconds: 2.2,
      spawnCollisionGraceSeconds: 2.2,
      threatBoundaryPadding: 8,
      threatBoundaryBounce: 0.32,
      asteroidRestitution: 0.72,
      asteroidCollisionGraceSeconds: 0.22,
      waveSpawnRetrySeconds: 0.08,
      interWaveSeconds: 0.7
    },

    cinematic: {
      clearHoldSeconds: 1,
      duration: 1.65,
      directionX: 0,
      directionY: -1,
      speed: 640,
      cameraSharpness: 9,
      exitInvulnerability: 0.8
    },

    culling: {
      spawnMinViewports: 0.72,
      spawnMaxViewports: 1.25,
      softCullViewports: 2.35,
      hardCullViewports: 3.1,
      projectileMargin: 180,
      requeueEncounterThreats: true
    },

    caps: {
      playerProjectiles: 220,
      enemyProjectiles: 180,
      mines: 36,
      asteroids: 76,
      aliens: 30,
      pickups: 16,
      drones: 9,
      particles: 640,
      reducedParticles: 220,
      floaters: 64,
      activeAudioNodes: 24
    },

    sector: {
      encounters: [
        {
          index: 1,
          id: "earthOrbit",
          label: "LEAVE EARTH ORBIT",
          goal: { type: "waves" },
          waves: [
            {
              label: "ORBITAL DEBRIS",
              required: [
                { family: "asteroid", kinds: ["rock"], count: 3, cap: 3 }
              ]
            },
            {
              label: "FRACTURE LINE",
              required: [
                { family: "asteroid", kinds: ["rock", "crystal"], count: 4, sectorStep: 0.7, cap: 6 }
              ]
            },
            {
              label: "BELT CORE",
              required: [
                { family: "asteroid", kinds: ["rock", "crystal", "volatile"], count: 5, sectorStep: 1, cap: 8 }
              ]
            }
          ]
        },
        {
          index: 2,
          id: "innerBelt",
          label: "CROSS THE INNER BELT",
          goal: { type: "waves" },
          waves: [
            {
              label: "CRYSTAL VEIN",
              required: [
                { family: "asteroid", kinds: ["rock"], count: 2, cap: 2 },
                { family: "asteroid", kinds: ["crystal"], count: 2, sectorStep: 0.5, cap: 3 }
              ]
            },
            {
              label: "VOLATILE POCKET",
              required: [
                { family: "asteroid", kinds: ["rock", "crystal"], count: 3, sectorStep: 0.6, cap: 5 },
                { family: "asteroid", kinds: ["volatile"], count: 2, sectorStep: 0.4, cap: 3 }
              ]
            },
            {
              label: "ARMORED HEART",
              required: [
                { family: "asteroid", kinds: ["crystal", "volatile"], count: 3, sectorStep: 0.6, cap: 5 },
                { family: "asteroid", kinds: ["armored"], count: 2, sectorStep: 0.5, cap: 4 }
              ]
            }
          ]
        },
        {
          index: 3,
          id: "deepDrift",
          label: "ENTER THE DEEP DRIFT",
          goal: { type: "waves" },
          guaranteedReward: { type: "moduleUpgrade", module: "homingSalvo", tiers: 1 },
          waves: [
            {
              label: "RESONANT SHARDS",
              required: [
                { family: "asteroid", kinds: ["crystal", "volatile"], count: 5, sectorStep: 0.5, cap: 7 }
              ]
            },
            {
              label: "VOLATILE LATTICE",
              required: [
                { family: "asteroid", kinds: ["volatile", "armored"], count: 5, sectorStep: 0.6, cap: 7 }
              ]
            },
            {
              label: "ANOMALY CORE",
              required: [
                { family: "asteroid", kinds: ["crystal", "volatile", "armored"], count: 6, sectorStep: 0.7, cap: 9 }
              ]
            }
          ]
        },
        {
          index: 4,
          id: "shatteredFrontier",
          label: "CROSS THE SHATTERED FRONTIER",
          goal: { type: "waves" },
          waves: [
            {
              label: "AURIC WAKE",
              required: [
                { family: "asteroid", kinds: ["auricColossus"], count: 1, sectorStep: 0.2, cap: 2 },
                { family: "asteroid", kinds: ["armored"], count: 3, sectorStep: 0.4, cap: 5 },
                { family: "asteroid", kinds: ["rock", "crystal"], count: 4, sectorStep: 0.55, cap: 7 }
              ]
            },
            {
              label: "RESONANT STORM",
              required: [
                { family: "asteroid", kinds: ["crystal", "volatile"], count: 6, sectorStep: 0.65, cap: 9 },
                { family: "asteroid", kinds: ["armored"], count: 3, sectorStep: 0.4, cap: 5 },
                { family: "asteroid", kinds: ["colossal"], count: 1, cap: 1 }
              ]
            }
          ]
        },
        {
          index: 5,
          id: "titanGate",
          label: "SHATTER THE TITAN GATE",
          goal: { type: "titan" },
          waves: [
            {
              label: "TITAN",
              required: [
                { family: "asteroid", kinds: ["titan"], count: 1, cap: 1 },
                { family: "asteroid", kinds: ["auricColossus"], count: 1, cap: 1 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["rock", "crystal", "volatile", "armored"], count: 5, sectorStep: 0.5, cap: 8 }
              ]
            }
          ]
        },
        {
          index: 6,
          id: "firstContact",
          label: "SURVIVE FIRST CONTACT",
          goal: { type: "waves" },
          guaranteedReward: { type: "moduleUpgrade", module: "drone", tiers: 1 },
          waves: [
            {
              label: "UNKNOWN SIGNALS",
              required: [
                { family: "alien", kinds: ["scout"], count: 4, sectorStep: 0.5, cap: 6 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["crystal"], count: 2, cap: 2 }
              ]
            },
            {
              label: "SCOUT SCREEN",
              required: [
                { family: "alien", kinds: ["scout"], count: 4, sectorStep: 0.6, cap: 6 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["rock", "crystal"], count: 2, cap: 2 }
              ]
            }
          ]
        },
        {
          index: 7,
          id: "strikeWing",
          label: "BREAK THE STRIKE WING",
          goal: { type: "waves" },
          waves: [
            {
              label: "INTERCEPTORS",
              required: [
                { family: "alien", kinds: ["scout"], count: 3, sectorStep: 0.4, cap: 5 },
                { family: "alien", kinds: ["striker"], count: 2, sectorStep: 0.5, cap: 4 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["rock", "volatile"], count: 2, cap: 2 }
              ]
            },
            {
              label: "STRIKE LINE",
              required: [
                { family: "alien", kinds: ["scout"], count: 2, sectorStep: 0.4, cap: 4 },
                { family: "alien", kinds: ["striker"], count: 3, sectorStep: 0.5, cap: 5 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["crystal", "armored"], count: 2, cap: 2 }
              ]
            }
          ]
        },
        {
          index: 8,
          id: "raidFleet",
          label: "BREAK THE RAID FLEET",
          goal: { type: "waves" },
          waves: [
            {
              label: "BOMBER ESCORT",
              required: [
                { family: "alien", kinds: ["scout"], count: 2, sectorStep: 0.35, cap: 4 },
                { family: "alien", kinds: ["striker"], count: 2, sectorStep: 0.4, cap: 4 },
                { family: "alien", kinds: ["bomber"], count: 2, sectorStep: 0.35, cap: 3 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["volatile", "armored"], count: 2, cap: 2 }
              ]
            },
            {
              label: "RAID COMMAND",
              required: [
                { family: "alien", kinds: ["striker"], count: 2, sectorStep: 0.4, cap: 4 },
                { family: "alien", kinds: ["bomber"], count: 2, sectorStep: 0.35, cap: 4 },
                { family: "alien", kinds: ["carrier"], count: 1, sectorStep: 0.25, cap: 2 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["armored"], count: 3, sectorStep: 0.35, cap: 5 }
              ]
            }
          ]
        },
        {
          index: 9,
          id: "commandScreen",
          label: "BREAK THE COMMAND SCREEN",
          goal: { type: "waves" },
          guaranteedReward: { type: "moduleUpgrade", module: "shieldReactor", tiers: 1 },
          waves: [
            {
              label: "COMMAND PICKETS",
              required: [
                { family: "alien", kinds: ["scout"], count: 3, sectorStep: 0.45, cap: 5 },
                { family: "alien", kinds: ["striker"], count: 2, sectorStep: 0.4, cap: 4 },
                { family: "alien", kinds: ["bomber"], count: 2, sectorStep: 0.35, cap: 4 },
                { family: "alien", kinds: ["carrier"], count: 1, sectorStep: 0.2, cap: 2 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["volatile"], count: 1, cap: 2 }
              ]
            },
            {
              label: "CAPITAL SCREEN",
              required: [
                { family: "alien", kinds: ["scout"], count: 2, sectorStep: 0.35, cap: 4 },
                { family: "alien", kinds: ["striker"], count: 2, sectorStep: 0.4, cap: 4 },
                { family: "alien", kinds: ["bomber"], count: 2, sectorStep: 0.35, cap: 4 },
                { family: "alien", kinds: ["carrier"], count: 2, sectorStep: 0.2, cap: 3 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["colossal", "armored"], count: 1, cap: 2 }
              ]
            }
          ]
        },
        {
          index: 10,
          id: "bossHarrower",
          label: "CAPITAL SHIP DETECTED",
          goal: { type: "boss" },
          bossType: "harrower"
        },
        {
          index: 11,
          id: "ionGraveyard",
          label: "ENTER THE ION GRAVEYARD",
          goal: { type: "waves" },
          waves: [
            {
              label: "CHARGED SHARDS",
              required: [
                { family: "asteroid", kinds: ["razor"], count: 4, sectorStep: 0.55, cap: 6 },
                { family: "asteroid", kinds: ["crystal"], count: 3, sectorStep: 0.35, cap: 5 }
              ]
            },
            {
              label: "STATIC TIDE",
              required: [
                { family: "asteroid", kinds: ["razor"], count: 4, sectorStep: 0.65, cap: 7 },
                { family: "asteroid", kinds: ["prismatic"], count: 2, sectorStep: 0.3, cap: 3 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["volatile"], count: 1, sectorStep: 0.25, cap: 3 }
              ]
            }
          ]
        },
        {
          index: 12,
          id: "prismRift",
          label: "CROSS THE PRISM RIFT",
          goal: { type: "waves" },
          guaranteedReward: { type: "moduleUpgrade", module: "prism", tiers: 1 },
          waves: [
            {
              label: "PRISM BLOOM",
              required: [
                { family: "asteroid", kinds: ["auricColossus"], count: 1, sectorStep: 0.15, cap: 2 },
                { family: "asteroid", kinds: ["prismatic"], count: 2, sectorStep: 0.3, cap: 3 },
                { family: "asteroid", kinds: ["crystal"], count: 5, sectorStep: 0.5, cap: 7 }
              ]
            },
            {
              label: "REFRACTION FAULT",
              required: [
                { family: "asteroid", kinds: ["prismatic"], count: 3, sectorStep: 0.35, cap: 4 },
                { family: "asteroid", kinds: ["volatile"], count: 3, sectorStep: 0.5, cap: 5 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["razor"], count: 2, sectorStep: 0.35, cap: 3 }
              ]
            }
          ]
        },
        {
          index: 13,
          id: "gravityScar",
          label: "DESCEND THE GRAVITY SCAR",
          goal: { type: "waves" },
          waves: [
            {
              label: "HEAVY DRIFT",
              required: [
                { family: "asteroid", kinds: ["rock", "crystal", "armored"], count: 7, sectorStep: 0.95, cap: 12 },
                { family: "asteroid", kinds: ["auricColossus"], count: 1, cap: 1 },
                { family: "asteroid", kinds: ["monolith"], count: 1, cap: 1 }
              ]
            },
            {
              label: "COLLAPSE RING",
              required: [
                { family: "asteroid", kinds: ["monolith"], count: 1, sectorStep: 0.2, cap: 2 },
                { family: "asteroid", kinds: ["prismatic"], count: 3, sectorStep: 0.35, cap: 5 },
                { family: "asteroid", kinds: ["razor"], count: 5, sectorStep: 0.55, cap: 8 }
              ]
            }
          ]
        },
        {
          index: 14,
          id: "fracturedHalo",
          label: "BREACH THE FRACTURED HALO",
          goal: { type: "waves" },
          waves: [
            {
              label: "SPLINTER HALO",
              required: [
                { family: "asteroid", kinds: ["auricColossus"], count: 1, sectorStep: 0.15, cap: 2 },
                { family: "asteroid", kinds: ["razor"], count: 6, sectorStep: 0.7, cap: 9 },
                { family: "asteroid", kinds: ["prismatic"], count: 3, sectorStep: 0.35, cap: 5 }
              ]
            },
            {
              label: "BROKEN GIANTS",
              required: [
                { family: "asteroid", kinds: ["prismatic"], count: 1, sectorStep: 0.4, cap: 3 },
                { family: "asteroid", kinds: ["monolith"], count: 1, cap: 1 },
                { family: "asteroid", kinds: ["colossal"], count: 1, cap: 1 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["volatile"], count: 5, sectorStep: 0.5, cap: 8 },
                { family: "asteroid", kinds: ["razor"], count: 2, sectorStep: 0.3, cap: 4 }
              ]
            }
          ]
        },
        {
          index: 15,
          id: "anomalyCrown",
          label: "SHATTER THE ANOMALY CROWN",
          goal: { type: "waves" },
          guaranteedReward: { type: "moduleUpgrade", module: "overclock", tiers: 1 },
          waves: [
            {
              label: "CORONA VEIL",
              required: [
                { family: "asteroid", kinds: ["prismatic"], count: 3, sectorStep: 0.45, cap: 5 },
                { family: "asteroid", kinds: ["razor"], count: 4, sectorStep: 0.55, cap: 7 },
                { family: "asteroid", kinds: ["corona"], count: 1, sectorStep: 0.15, cap: 2 },
                { family: "asteroid", kinds: ["auricColossus"], count: 1, sectorStep: 0.15, cap: 2 }
              ]
            },
            {
              label: "ANOMALY HEART",
              required: [
                { family: "asteroid", kinds: ["prismatic"], count: 3, sectorStep: 0.35, cap: 5 },
                { family: "asteroid", kinds: ["razor"], count: 1, sectorStep: 0.35, cap: 3 },
                { family: "asteroid", kinds: ["titan"], count: 1, cap: 1 },
                { family: "asteroid", kinds: ["auricColossus"], count: 1, cap: 1 },
                { family: "asteroid", kinds: ["corona"], count: 1, sectorStep: 0.15, cap: 2 }
              ]
            }
          ]
        },
        {
          index: 16,
          id: "vanguardSwarm",
          label: "SCATTER THE VANGUARD SWARM",
          goal: { type: "waves" },
          waves: [
            {
              label: "LANCER PROBE",
              required: [
                { family: "alien", kinds: ["lancer"], count: 3, sectorStep: 0.5, cap: 5 },
                { family: "alien", kinds: ["scout"], count: 2, sectorStep: 0.35, cap: 4 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["razor"], count: 2, sectorStep: 0.3, cap: 3 }
              ]
            },
            {
              label: "VANGUARD LINE",
              required: [
                { family: "alien", kinds: ["lancer"], count: 4, sectorStep: 0.55, cap: 7 },
                { family: "alien", kinds: ["scout"], count: 2, sectorStep: 0.35, cap: 4 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["prismatic"], count: 1, sectorStep: 0.2, cap: 2 }
              ]
            }
          ]
        },
        {
          index: 17,
          id: "nullPhalanx",
          label: "BREAK THE NULL PHALANX",
          goal: { type: "waves" },
          waves: [
            {
              label: "NULL SPEARS",
              required: [
                { family: "alien", kinds: ["lancer"], count: 4, sectorStep: 0.55, cap: 7 },
                { family: "alien", kinds: ["scout"], count: 2, sectorStep: 0.35, cap: 4 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["razor"], count: 2, sectorStep: 0.3, cap: 3 }
              ]
            },
            {
              label: "GUNSHIP SCREEN",
              required: [
                { family: "alien", kinds: ["gunship"], count: 2, sectorStep: 0.35, cap: 4 },
                { family: "alien", kinds: ["lancer"], count: 3, sectorStep: 0.5, cap: 5 },
                { family: "alien", kinds: ["scout"], count: 2, sectorStep: 0.35, cap: 4 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["monolith"], count: 1, sectorStep: 0.2, cap: 2 }
              ]
            }
          ]
        },
        {
          index: 18,
          id: "siegeChoir",
          label: "SILENCE THE SIEGE CHOIR",
          goal: { type: "waves" },
          guaranteedReward: { type: "moduleUpgrade", module: "seeker", tiers: 1 },
          waves: [
            {
              label: "LASER CANTICLE",
              required: [
                { family: "alien", kinds: ["gunship"], count: 2, sectorStep: 0.35, cap: 4 },
                { family: "alien", kinds: ["lancer"], count: 3, sectorStep: 0.5, cap: 5 },
                { family: "alien", kinds: ["scout"], count: 2, sectorStep: 0.35, cap: 4 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["prismatic"], count: 2, sectorStep: 0.3, cap: 3 }
              ]
            },
            {
              label: "CARRIER CHORUS",
              required: [
                { family: "alien", kinds: ["broodCarrier"], count: 1, sectorStep: 0.15, cap: 2 },
                { family: "alien", kinds: ["gunship"], count: 2, sectorStep: 0.35, cap: 4 },
                { family: "alien", kinds: ["lancer"], count: 3, sectorStep: 0.5, cap: 5 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["corona"], count: 1, sectorStep: 0.15, cap: 2 },
                { family: "asteroid", kinds: ["razor"], count: 2, sectorStep: 0.35, cap: 4 }
              ]
            }
          ]
        },
        {
          index: 19,
          id: "sovereignGuard",
          label: "BREAK THE SOVEREIGN GUARD",
          goal: { type: "waves" },
          waves: [
            {
              label: "SOVEREIGN GUARD",
              required: [
                { family: "alien", kinds: ["broodCarrier"], count: 1, sectorStep: 0.15, cap: 2 },
                { family: "alien", kinds: ["gunship"], count: 2, sectorStep: 0.35, cap: 4 },
                { family: "alien", kinds: ["lancer"], count: 3, sectorStep: 0.5, cap: 5 },
                { family: "alien", kinds: ["scout"], count: 2, sectorStep: 0.35, cap: 4 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["monolith"], count: 1, sectorStep: 0.2, cap: 2 },
                { family: "asteroid", kinds: ["corona"], count: 1, sectorStep: 0.15, cap: 2 }
              ]
            },
            {
              label: "THRONE SCREEN",
              required: [
                { family: "alien", kinds: ["broodCarrier"], count: 2, sectorStep: 0.2, cap: 3 },
                { family: "alien", kinds: ["gunship"], count: 3, sectorStep: 0.4, cap: 5 },
                { family: "alien", kinds: ["lancer"], count: 2, sectorStep: 0.4, cap: 4 },
                { family: "alien", kinds: ["scout"], count: 1, sectorStep: 0.3, cap: 3 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["corona"], count: 1, sectorStep: 0.15, cap: 2 },
                { family: "asteroid", kinds: ["prismatic"], count: 1, sectorStep: 0.25, cap: 3 }
              ]
            }
          ]
        },
        {
          index: 20,
          id: "bossLeviathan",
          label: "LEVIATHAN SIGNAL DETECTED",
          goal: { type: "boss" },
          bossType: "leviathan"
        }
      ]
    },

    bossArena: {
      warningSeconds: 3,
      entryInvulnerability: 1.2,
      victoryHeal: 20
    },

    asteroids: {
      rock: {
        label: "Rock",
        radius: 34,
        baseHealth: 3,
        speed: [68, 108],
        contactDamage: 24,
        score: 70,
        threatCost: 1,
        split: { count: 2, radiusScale: 0.55, generations: 1 }
      },
      crystal: {
        label: "Crystal",
        radius: 42,
        baseHealth: 5,
        speed: [58, 90],
        contactDamage: 27,
        score: 125,
        threatCost: 2
      },
      volatile: {
        label: "Volatile",
        radius: 38,
        baseHealth: 4,
        speed: [62, 96],
        contactDamage: 30,
        score: 145,
        threatCost: 2,
        deathBurst: { fragments: 8, fragmentKind: "rock", fragmentRadius: 14, fragmentSpeed: 205 }
      },
      armored: {
        label: "Armored",
        radius: 56,
        baseHealth: 11,
        speed: [44, 70],
        contactDamage: 36,
        score: 240,
        threatCost: 3,
        damageTakenMultiplier: 0.58,
        weakSpotMultiplier: 1.8,
        split: { count: 2, into: "rock", generations: 1 }
      },
      colossal: {
        label: "Colossal",
        radius: 98,
        baseHealth: 26,
        speed: [30, 48],
        contactDamage: 46,
        score: 520,
        threatCost: 7,
        split: { count: 3, into: "rock", radiusScale: 0.46, generations: 2 }
      },
      titan: {
        label: "Titan",
        radius: 148,
        compactRadius: 104,
        baseHealth: 62,
        speed: [20, 34],
        contactDamage: 58,
        score: 1350,
        threatCost: 16,
        healthGates: [0.75, 0.5, 0.25],
        gateFragments: { count: 3, into: "rock" }
      },
      razor: {
        label: "Razor",
        radius: 28,
        baseHealth: 4,
        speed: [90, 145],
        contactDamage: 30,
        score: 155,
        threatCost: 2,
        split: { count: 2, into: "rock", radiusScale: 0.5, generations: 1 }
      },
      prismatic: {
        label: "Prismatic",
        radius: 50,
        baseHealth: 13,
        speed: [46, 75],
        contactDamage: 38,
        score: 330,
        threatCost: 4,
        split: { count: 3, into: "crystal", radiusScale: 0.4, generations: 1 }
      },
      monolith: {
        label: "Monolith",
        radius: 105,
        compactRadius: 88,
        baseHealth: 36,
        speed: [24, 42],
        contactDamage: 50,
        score: 720,
        threatCost: 9,
        healthGates: [0.66, 0.33],
        gateFragments: { count: 2, into: "razor" }
      },
      auricColossus: {
        label: "Auric Colossus",
        radius: 112,
        compactRadius: 94,
        baseHealth: 34,
        speed: [24, 40],
        contactDamage: 52,
        score: 850,
        threatCost: 11,
        split: { count: 3, into: "auricShard", radiusScale: 0.46, generations: 2 }
      },
      auricShard: {
        label: "Auric Shard",
        radius: 48,
        baseHealth: 8,
        speed: [58, 88],
        contactDamage: 34,
        score: 210,
        threatCost: 3,
        split: { count: 2, into: "auricShard", radiusScale: 0.52, generations: 1 },
        variants: {
          explosive: { blastRadius: 120, damage: 24 },
          magnetic: { range: 300, acceleration: 240, totalAccelerationCap: 360, speedCap: 360 }
        }
      },
      corona: {
        label: "Corona",
        radius: 72,
        baseHealth: 22,
        speed: [36, 58],
        contactDamage: 44,
        score: 520,
        threatCost: 7,
        hazard: {
          type: "rotatingBeam",
          warning: 1.1,
          active: 1.5,
          cooldown: 5.2,
          range: 520,
          width: 18,
          angularSpeed: 0.75,
          damage: 18,
          tick: 0.32
        },
        deathExplosion: { radius: 160, damage: 22 }
      }
    },

    aliens: {
      scout: {
        label: "Scout",
        radius: 17,
        baseHealth: 3,
        baseSpeed: 155,
        baseCooldown: 1.65,
        score: 115,
        threatCost: 1,
        contactDamage: 20,
        pattern: { type: "chaseStrafe", projectiles: 1, projectileSpeed: 285, damage: 12 }
      },
      striker: {
        label: "Striker",
        radius: 23,
        baseHealth: 6,
        baseSpeed: 122,
        baseCooldown: 1.3,
        score: 190,
        threatCost: 2,
        contactDamage: 27,
        pattern: { type: "telegraphCharge", warning: 0.62, duration: 0.55, speedMultiplier: 3.1 }
      },
      bomber: {
        label: "Bomber",
        radius: 29,
        baseHealth: 10,
        baseSpeed: 88,
        baseCooldown: 2.45,
        score: 285,
        threatCost: 3,
        contactDamage: 32,
        pattern: { type: "mineDrop", fuse: 1.4, blastRadius: 72, damage: 24 }
      },
      carrier: {
        label: "Carrier",
        radius: 40,
        baseHealth: 20,
        baseSpeed: 58,
        baseCooldown: 2.2,
        score: 520,
        threatCost: 6,
        contactDamage: 38,
        pattern: {
          type: "droneLaunch",
          spawnType: "scout",
          count: 2,
          maxChildren: 4,
          childScore: 35,
          preferredRange: 300,
          retreatRange: 210,
          launchRange: 460
        }
      },
      lancer: {
        label: "Lancer",
        radius: 22,
        baseHealth: 8,
        baseSpeed: 142,
        baseCooldown: 1.1,
        score: 250,
        threatCost: 3,
        contactDamage: 31,
        pattern: { type: "telegraphCharge", warning: 0.5, duration: 0.62, speedMultiplier: 3.45 }
      },
      gunship: {
        label: "Gunship",
        radius: 34,
        baseHealth: 16,
        baseSpeed: 92,
        baseCooldown: 4.8,
        score: 390,
        threatCost: 4,
        contactDamage: 35,
        pattern: {
          type: "sweepingLaser",
          warning: 0.85,
          active: 1.05,
          cooldown: 4.8,
          range: 560,
          width: 18,
          damage: 18,
          tick: 0.3,
          sweepAngularSpeed: 0.42,
          preferredRange: 390,
          retreatRange: 250
        }
      },
      broodCarrier: {
        label: "Brood Carrier",
        radius: 50,
        baseHealth: 40,
        baseSpeed: 50,
        baseCooldown: 4.4,
        score: 820,
        threatCost: 9,
        contactDamage: 44,
        rangeArmor: { distance: 300, multiplier: 0.3 },
        pattern: {
          type: "droneLaunch",
          spawnType: "lancer",
          count: 2,
          maxChildren: 6,
          childScore: 45,
          preferredRange: 270,
          retreatRange: 180,
          launchRange: 460
        }
      }
    },

    bosses: {
      harrower: {
        label: "HARROWER",
        radius: 82,
        baseHealth: 500,
        score: 5600,
        contactDamage: 44,
        phases: [
          {
            id: "hunter",
            enterAtHealth: 1,
            moveSpeed: 72,
            attacks: [
              { type: "sweepingBeam", baseCooldown: 4.6, warning: 1, duration: 1.6, damage: 28, sweepSpeed: 0.62 },
              { type: "droneLaunch", baseCooldown: 5.6, count: 2, maxChildren: 4, childScore: 35 }
            ]
          },
          {
            id: "crossfire",
            enterAtHealth: 0.65,
            moveSpeed: 92,
            attacks: [
              { type: "crossVolley", baseCooldown: 1.35, projectiles: 5, spread: 0.62, speed: 290, damage: 13 },
              { type: "mineArc", baseCooldown: 3.8, count: 4, fuse: 1.5, fuseStep: 0.12, blastRadius: 76, damage: 24 }
            ]
          },
          {
            id: "annihilator",
            enterAtHealth: 0.3,
            moveSpeed: 112,
            attacks: [
              { type: "dashVolley", baseCooldown: 2.2, projectiles: 7, spread: 0.9, speed: 320, damage: 14, dashSpeed: 280, dashDuration: 0.46 },
              { type: "sweepingBeam", baseCooldown: 3.7, warning: 0.75, duration: 1.8, damage: 34, sweepSpeed: 0.78 }
            ]
          }
        ]
      },
      leviathan: {
        label: "LEVIATHAN",
        radius: 96,
        baseHealth: 980,
        score: 10000,
        contactDamage: 50,
        reflectionShield: {
          warning: 1,
          active: 1.6,
          cooldown: 4.8,
          damage: 12,
          speed: 420,
          life: 2.4,
          damageMultiplier: 0.25
        },
        phases: [
          {
            id: "stalker",
            enterAtHealth: 1,
            moveSpeed: 82,
            attacks: [
              { type: "sweepingBeam", baseCooldown: 4.1, warning: 0.9, duration: 1.75, damage: 30, sweepSpeed: 0.68 },
              { type: "droneLaunch", baseCooldown: 4.8, spawnType: "lancer", count: 3, maxChildren: 6, childScore: 45 }
            ]
          },
          {
            id: "siege",
            enterAtHealth: 0.65,
            moveSpeed: 104,
            attacks: [
              { type: "crossVolley", baseCooldown: 1.15, projectiles: 7, spread: 0.82, speed: 320, damage: 14 },
              { type: "mineArc", baseCooldown: 3.2, count: 5, fuse: 1.35, fuseStep: 0.1, blastRadius: 82, damage: 26 }
            ]
          },
          {
            id: "devourer",
            enterAtHealth: 0.3,
            moveSpeed: 126,
            attacks: [
              { type: "dashVolley", baseCooldown: 1.85, projectiles: 9, spread: 1.05, speed: 350, damage: 16, dashSpeed: 330, dashDuration: 0.5 },
              { type: "sweepingBeam", baseCooldown: 3.1, warning: 0.62, duration: 2, damage: 38, sweepSpeed: 0.92 }
            ]
          }
        ]
      }
    },

    weapons: {
      maxModuleTier: 5,
      startingModules: { pulse: 1 },
      modules: {
        pulse: {
          label: "Pulse Repeater",
          unlockStage: 1,
          activation: "whileFiring",
          projectileType: "bolt",
          color: "#8ffcff",
          tiers: [
            { cooldown: 0.18, damage: 1, projectiles: 1, speed: 840, life: 0.95, spread: 0 },
            { cooldown: 0.165, damage: 0.95, projectiles: 2, speed: 860, life: 0.98, spread: 0.07 },
            { cooldown: 0.15, damage: 0.9, projectiles: 3, speed: 880, life: 1, spread: 0.11 },
            { cooldown: 0.138, damage: 0.86, projectiles: 4, speed: 900, life: 1.02, spread: 0.15 },
            { cooldown: 0.128, damage: 0.82, projectiles: 5, speed: 920, life: 1.04, spread: 0.19 }
          ]
        },
        homingSalvo: {
          label: "Homing Salvo",
          unlockStage: 3,
          activation: "autonomous",
          projectileType: "missile",
          color: "#ffd166",
          tiers: [
            { cooldown: 4.6, damage: 2.3, projectiles: 1, speed: 400, life: 2.5, turnRate: 3.4, blastRadius: 34, range: 480 },
            { cooldown: 4, damage: 2.1, projectiles: 2, speed: 420, life: 2.6, turnRate: 3.7, blastRadius: 38, range: 530 },
            { cooldown: 3.4, damage: 2.4, projectiles: 2, speed: 445, life: 2.7, turnRate: 4, blastRadius: 42, range: 580 },
            { cooldown: 3, damage: 2.25, projectiles: 3, speed: 470, life: 2.8, turnRate: 4.3, blastRadius: 46, range: 630 },
            { cooldown: 2.6, damage: 2.2, projectiles: 4, speed: 495, life: 2.9, turnRate: 4.6, blastRadius: 50, range: 680 }
          ]
        },
        radialArray: {
          label: "Radial Array",
          unlockStage: 5,
          activation: "autonomous",
          projectileType: "radial",
          color: "#9d8cff",
          tiers: [
            { cooldown: 5.8, damage: 0.9, projectiles: 8, speed: 470, life: 1.05, range: 360 },
            { cooldown: 5.1, damage: 0.95, projectiles: 10, speed: 500, life: 1.1, range: 400 },
            { cooldown: 4.5, damage: 1, projectiles: 12, speed: 530, life: 1.15, range: 440 },
            { cooldown: 4, damage: 0.96, projectiles: 16, speed: 560, life: 1.2, range: 480 },
            { cooldown: 3.5, damage: 0.92, projectiles: 20, speed: 590, life: 1.25, range: 520 }
          ]
        },
        prism: {
          label: "Prism Fan",
          unlockStage: 12,
          activation: "whileFiring",
          projectileType: "prism",
          color: "#ff68dc",
          tiers: [
            { cooldown: 0.56, damage: 0.52, projectiles: 3, speed: 650, life: 0.64, spread: 0.28 },
            { cooldown: 0.53, damage: 0.5, projectiles: 5, speed: 680, life: 0.68, spread: 0.42 },
            { cooldown: 0.5, damage: 0.48, projectiles: 7, speed: 710, life: 0.72, spread: 0.56 },
            { cooldown: 0.47, damage: 0.46, projectiles: 9, speed: 740, life: 0.76, spread: 0.7 },
            { cooldown: 0.44, damage: 0.44, projectiles: 11, speed: 770, life: 0.8, spread: 0.84 }
          ]
        },
        seeker: {
          label: "Seeker Rack",
          unlockStage: 17,
          activation: "whileFiring",
          projectileType: "missile",
          color: "#ffd166",
          tiers: [
            { cooldown: 1.2, damage: 3, projectiles: 1, speed: 390, life: 2.4, turnRate: 3.1, blastRadius: 42, targetRange: 500 },
            { cooldown: 1, damage: 2.9, projectiles: 2, speed: 410, life: 2.5, turnRate: 3.4, blastRadius: 46, targetRange: 545 },
            { cooldown: 0.85, damage: 2.8, projectiles: 3, speed: 430, life: 2.6, turnRate: 3.7, blastRadius: 50, targetRange: 590 },
            { cooldown: 0.72, damage: 2.7, projectiles: 4, speed: 450, life: 2.7, turnRate: 4, blastRadius: 54, targetRange: 635 },
            { cooldown: 0.62, damage: 2.6, projectiles: 5, speed: 470, life: 2.8, turnRate: 4.3, blastRadius: 58, targetRange: 680 }
          ]
        },
        massDriver: {
          label: "Mass Driver",
          unlockStage: 19,
          activation: "whileFiring",
          projectileType: "slug",
          color: "#ffffff",
          tiers: [
            { cooldown: 1, damage: 4.2, projectiles: 1, speed: 1080, life: 1.15, pierce: 2 },
            { cooldown: 0.82, damage: 4.5, projectiles: 1, speed: 1140, life: 1.2, pierce: 3 },
            { cooldown: 0.68, damage: 4.8, projectiles: 1, speed: 1200, life: 1.25, pierce: 4 },
            { cooldown: 0.58, damage: 5.1, projectiles: 1, speed: 1260, life: 1.3, pierce: 5 },
            { cooldown: 0.5, damage: 5.4, projectiles: 1, speed: 1320, life: 1.35, pierce: 6 }
          ]
        },
        drone: {
          label: "Guardian Drone",
          unlockStage: 6,
          activation: "autonomous",
          projectileType: "droneBolt",
          color: "#78ff9f",
          tiers: [
            { drones: 1, cooldown: 0.7, damage: 0.75, speed: 650, life: 0.85, orbitRadius: 46, range: 360 },
            { drones: 2, cooldown: 0.62, damage: 0.78, speed: 680, life: 0.9, orbitRadius: 54, range: 410 },
            { drones: 3, cooldown: 0.54, damage: 0.82, speed: 710, life: 0.95, orbitRadius: 62, range: 460 },
            { drones: 4, cooldown: 0.49, damage: 0.86, speed: 740, life: 1, orbitRadius: 70, range: 510 },
            { drones: 5, cooldown: 0.44, damage: 0.9, speed: 770, life: 1.05, orbitRadius: 78, range: 560 }
          ]
        },
        teslaCoil: {
          label: "Tesla Coil",
          unlockStage: 9,
          activation: "autonomous",
          color: "#84f7ff",
          tiers: [
            { cooldown: 4.8, damage: 1.4, chains: 2, range: 360, chainRange: 130 },
            { cooldown: 4.25, damage: 1.55, chains: 3, range: 420, chainRange: 150 },
            { cooldown: 3.7, damage: 1.75, chains: 4, range: 480, chainRange: 170 },
            { cooldown: 3.2, damage: 1.95, chains: 5, range: 540, chainRange: 195 },
            { cooldown: 2.75, damage: 2.2, chains: 6, range: 600, chainRange: 220 }
          ]
        },
        orbitBlades: {
          label: "Orbit Blades",
          unlockStage: 11,
          activation: "autonomous",
          color: "#ff7be5",
          tiers: [
            { blades: 1, damage: 0.85, orbitRadius: 58, hitCooldown: 0.72 },
            { blades: 2, damage: 0.9, orbitRadius: 66, hitCooldown: 0.64 },
            { blades: 3, damage: 0.98, orbitRadius: 74, hitCooldown: 0.56 },
            { blades: 4, damage: 1.08, orbitRadius: 84, hitCooldown: 0.48 },
            { blades: 5, damage: 1.2, orbitRadius: 94, hitCooldown: 0.4 }
          ]
        },
        mineLayer: {
          label: "Mine Layer",
          unlockStage: 14,
          activation: "autonomous",
          color: "#ffb454",
          tiers: [
            { cooldown: 7, damage: 4, mines: 1, life: 8, triggerRadius: 54, blastRadius: 76, range: 280 },
            { cooldown: 6.2, damage: 4.4, mines: 1, life: 9, triggerRadius: 58, blastRadius: 84, range: 320 },
            { cooldown: 5.4, damage: 4.8, mines: 2, life: 10, triggerRadius: 62, blastRadius: 92, range: 360 },
            { cooldown: 4.7, damage: 5.2, mines: 2, life: 11, triggerRadius: 67, blastRadius: 102, range: 400 },
            { cooldown: 4.1, damage: 5.8, mines: 3, life: 12, triggerRadius: 72, blastRadius: 112, range: 440 }
          ]
        },
        shieldReactor: {
          label: "Shield Reactor",
          unlockStage: 9,
          activation: "autonomous",
          color: "#74e9ff",
          tiers: [
            { cooldown: 14, amount: 6 },
            { cooldown: 12.5, amount: 8 },
            { cooldown: 11, amount: 10 },
            { cooldown: 9.5, amount: 12 },
            { cooldown: 8, amount: 14 }
          ]
        },
        overclock: {
          label: "Overclock Matrix",
          unlockStage: 15,
          activation: "passive",
          color: "#ff7a6e",
          tiers: [
            { cooldownMultiplier: 0.94 },
            { cooldownMultiplier: 0.89 },
            { cooldownMultiplier: 0.84 },
            { cooldownMultiplier: 0.79 },
            { cooldownMultiplier: 0.74 }
          ]
        },
        tractorField: {
          label: "Tractor Field",
          unlockStage: 7,
          activation: "passive",
          color: "#9b8cff",
          tiers: [
            { range: 140, strength: 180 },
            { range: 180, strength: 230 },
            { range: 220, strength: 290 },
            { range: 270, strength: 370 },
            { range: 320, strength: 470 }
          ]
        }
      }
    },

    voidPulse: {
      rechargePerSecond: 4.2,
      activationThreshold: 99.5,
      radius: 280,
      asteroidDamage: 2.25,
      alienDamage: 2.5,
      bossDamage: 2.25,
      clearEnemyProjectiles: true,
      clearMines: true
    },

    powerups: {
      temporaryStackLimit: 4,
      dropBands: [
        { minStage: 1, dropChance: 0.26, pityKills: 4, moduleWeight: 0, permanentDraftChance: 0, rewardTierCap: 1 },
        { minStage: 3, dropChance: 0.28, pityKills: 4, moduleWeight: 0, permanentDraftChance: 0.3, rewardTierCap: 2 },
        { minStage: 4, dropChance: 0.29, pityKills: 4, moduleWeight: 8, permanentDraftChance: 0.35, rewardTierCap: 2 },
        { minStage: 6, dropChance: 0.31, pityKills: 4, moduleWeight: 12, permanentDraftChance: 0.5, rewardTierCap: 3 },
        { minStage: 11, dropChance: 0.34, pityKills: 3, moduleWeight: 18, permanentDraftChance: 0.7, rewardTierCap: 4 },
        { minStage: 16, dropChance: 0.38, pityKills: 3, moduleWeight: 24, permanentDraftChance: 0.9, rewardTierCap: 5 }
      ],
      shield: {
        label: "SHIELD +30",
        unlockStage: 1,
        weight: 25,
        amount: 30,
        cap: 60,
        drainMultiplier: 1.25
      },
      rapid: {
        label: "OVERDRIVE",
        unlockStage: 1,
        weight: 26,
        duration: 28,
        cooldownMultiplier: 0.68
      },
      repair: {
        label: "HULL REPAIR",
        unlockStage: 1,
        weight: 22,
        amount: 34
      },
      triShot: {
        label: "TRI-SHOT",
        unlockStage: 2,
        weight: 26,
        duration: 28,
        extraProjectiles: 2,
        minimumSpread: 0.22
      },
      piercing: {
        label: "PHASE ROUNDS",
        unlockStage: 4,
        weight: 20,
        duration: 26,
        bonusPierce: 2
      },
      arcBurst: {
        label: "ARC BURST",
        unlockStage: 6,
        weight: 20,
        duration: 24,
        cooldown: 0.34,
        damage: 0.72,
        projectiles: 7,
        speed: 610,
        life: 0.68,
        spread: 0.92,
        color: "#9d8cff"
      },
      novaLance: {
        label: "NOVA LANCE",
        unlockStage: 11,
        weight: 18,
        duration: 30,
        cooldown: 0.78,
        damage: 4.8,
        speed: 1180,
        life: 1.05,
        pierce: 3,
        color: "#ffef9f"
      },
      amplifier: {
        label: "DAMAGE AMPLIFIER",
        unlockStage: 9,
        weight: 24,
        duration: 28,
        damageMultiplier: 1.45
      },
      aegis: {
        label: "AEGIS FIELD",
        unlockStage: 8,
        weight: 24,
        duration: 28,
        damageReduction: 0.32
      },
      pulseCharge: {
        label: "PULSE CHARGE",
        unlockStage: 1,
        weight: 18,
        amount: 55
      },
      enigma: {
        label: "ENIGMA",
        unlockStage: 3,
        weight: 14,
        choiceCount: 3,
        slowdownSeconds: 0.72,
        resumeInvulnerability: 1
      },
      moduleUpgrade: {
        unlockStage: 4
      }
    },

    difficulty: {
      caps: difficultyCaps,
      healthScale: healthScale,
      bossHealthScale: bossHealthScale,
      damageScale: damageScale,
      speedScale: speedScale,
      fireRateScale: fireRateScale,
      scoreScale: scoreScale,
      scaledCooldown: function (baseCooldown, sector, stage) {
        const cooldown = Number(baseCooldown);
        return Math.max(0.05, (Number.isFinite(cooldown) ? cooldown : 1) / fireRateScale(sector, stage));
      }
    }
  });
}());
