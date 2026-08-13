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
    var value = Number(sector);
    return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;
  }

  function sectorRoot(sector) {
    return Math.sqrt(safeSector(sector) - 1);
  }

  var difficultyCaps = {
    healthMultiplier: 3,
    bossHealthMultiplier: 3.6,
    damageMultiplier: 2,
    speedMultiplier: 1.45,
    fireRateMultiplier: 1.65,
    scoreMultiplier: 2.4
  };

  function healthScale(sector) {
    return Math.min(difficultyCaps.healthMultiplier, 1 + sectorRoot(sector) * 0.32);
  }

  function bossHealthScale(sector) {
    return Math.min(difficultyCaps.bossHealthMultiplier, 1 + sectorRoot(sector) * 0.44);
  }

  function damageScale(sector) {
    return Math.min(difficultyCaps.damageMultiplier, 1 + Math.log2(safeSector(sector)) * 0.16);
  }

  function speedScale(sector) {
    return Math.min(difficultyCaps.speedMultiplier, 1 + sectorRoot(sector) * 0.055);
  }

  function fireRateScale(sector) {
    return Math.min(difficultyCaps.fireRateMultiplier, 1 + sectorRoot(sector) * 0.08);
  }

  function scoreScale(sector) {
    return Math.min(difficultyCaps.scoreMultiplier, 1 + sectorRoot(sector) * 0.18);
  }

  window.ND.CONFIG = deepFreeze({
    version: "1.4.0",

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
      stickRadius: 46,
      moveDeadzone: 0.16,
      moveCurve: 1.45,
      moveMaxOutput: 0.72,
      aimDeadzone: 0.24,
      aimCurve: 1.25,
      aimMaxOutput: 1,
      aimFireThreshold: 0.12,
      aimTurnRate: 7.2
    },

    camera: {
      followSharpness: 8,
      bossFollowSharpness: 11,
      velocityLookAhead: 0.14,
      maxLookAhead: 145,
      maxShake: 24,
      parallaxLayers: [0.08, 0.2, 0.42]
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
      landmarkChunkRadius: 2,
      requeueEncounterThreats: true
    },

    caps: {
      playerProjectiles: 220,
      enemyProjectiles: 180,
      mines: 36,
      asteroids: 76,
      aliens: 30,
      bosses: 1,
      titans: 1,
      pickups: 16,
      drones: 9,
      particles: 640,
      reducedParticles: 220,
      shockwaves: 48,
      floaters: 64,
      activeAudioNodes: 24
    },

    sector: {
      encountersPerSector: 9,
      encounters: [
        {
          index: 1,
          id: "earthOrbit",
          label: "LEAVE EARTH ORBIT",
          completion: "waves",
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
          completion: "waves",
          goal: { type: "waves" },
          guaranteedReward: "moduleUpgrade",
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
          completion: "waves",
          goal: { type: "waves" },
          waves: [
            {
              label: "RESONANT SHARDS",
              required: [
                { family: "asteroid", kinds: ["crystal", "volatile"], count: 4, sectorStep: 0.5, cap: 6 }
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
          completion: "waves",
          goal: { type: "waves" },
          waves: [
            {
              label: "COLOSSAL WAKE",
              required: [
                { family: "asteroid", kinds: ["colossal"], count: 1, sectorStep: 0.25, cap: 2 },
                { family: "asteroid", kinds: ["armored"], count: 2, sectorStep: 0.4, cap: 3 }
              ]
            },
            {
              label: "RESONANT STORM",
              required: [
                { family: "asteroid", kinds: ["crystal", "volatile"], count: 5, sectorStep: 0.6, cap: 8 },
                { family: "asteroid", kinds: ["colossal"], count: 1, cap: 1 }
              ]
            }
          ]
        },
        {
          index: 5,
          id: "titanGate",
          label: "SHATTER THE TITAN GATE",
          completion: "waves",
          goal: { type: "titan" },
          waves: [
            {
              label: "TITAN",
              required: [
                { family: "asteroid", kinds: ["titan"], count: 1, cap: 1 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["rock", "volatile", "armored"], count: 3, sectorStep: 0.45, cap: 5 }
              ]
            }
          ]
        },
        {
          index: 6,
          id: "firstContact",
          label: "SURVIVE FIRST CONTACT",
          completion: "waves",
          goal: { type: "waves" },
          waves: [
            {
              label: "UNKNOWN SIGNALS",
              required: [
                { family: "alien", kinds: ["scout"], count: 3, sectorStep: 0.5, cap: 5 }
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
          completion: "waves",
          goal: { type: "waves" },
          waves: [
            {
              label: "INTERCEPTORS",
              required: [
                { family: "alien", kinds: ["scout"], count: 2, sectorStep: 0.4, cap: 3 },
                { family: "alien", kinds: ["striker"], count: 2, sectorStep: 0.5, cap: 4 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["rock", "volatile"], count: 2, cap: 2 }
              ]
            },
            {
              label: "BOMBER LINE",
              required: [
                { family: "alien", kinds: ["striker"], count: 3, sectorStep: 0.5, cap: 5 },
                { family: "alien", kinds: ["bomber"], count: 2, sectorStep: 0.35, cap: 3 }
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
          completion: "waves",
          goal: { type: "waves" },
          waves: [
            {
              label: "ESCORT WALL",
              required: [
                { family: "alien", kinds: ["scout", "striker"], count: 4, sectorStep: 0.6, cap: 6 },
                { family: "alien", kinds: ["bomber"], count: 2, sectorStep: 0.35, cap: 3 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["volatile", "armored"], count: 2, cap: 2 }
              ]
            },
            {
              label: "RAID COMMAND",
              required: [
                { family: "alien", kinds: ["striker", "bomber"], count: 4, sectorStep: 0.65, cap: 7 },
                { family: "alien", kinds: ["carrier"], count: 1, sectorStep: 0.25, cap: 2 }
              ],
              hazards: [
                { family: "asteroid", kinds: ["armored"], count: 2, cap: 2 }
              ]
            }
          ]
        },
        {
          index: 9,
          id: "boss",
          label: "CAPITAL SHIP DETECTED",
          completion: "bossDefeated",
          goal: { type: "boss" }
        }
      ]
    },

    bossArena: {
      warningSeconds: 3,
      radiusViewportRatio: 0.44,
      minRadius: 170,
      maxRadius: 520,
      viewportMargin: 12,
      boundaryPadding: 18,
      boundaryPush: 980,
      entryInvulnerability: 1.2,
      clearLooseProjectiles: true,
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
        threatCost: 2,
        mineralCore: true
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
        gateFragments: { count: 3, into: "rock", maxDeferred: 6 }
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
        pattern: { type: "droneLaunch", spawnType: "scout", count: 2, maxChildren: 4 }
      }
    },

    bosses: {
      harrower: {
        label: "HARROWER",
        faction: "alien",
        radius: 82,
        baseHealth: 420,
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
      }
    },

    weapons: {
      maxModuleTier: 3,
      maxInstalledModules: 7,
      stacking: "allOwnedModulesFire",
      startingModules: { pulse: 1 },
      modules: {
        pulse: {
          label: "Pulse Repeater",
          activation: "whileFiring",
          projectileType: "bolt",
          color: "#8ffcff",
          tiers: [
            { cooldown: 0.18, damage: 1, projectiles: 1, speed: 840, life: 0.95, spread: 0 },
            { cooldown: 0.165, damage: 0.95, projectiles: 2, speed: 860, life: 0.98, spread: 0.07 },
            { cooldown: 0.15, damage: 0.9, projectiles: 3, speed: 880, life: 1, spread: 0.11 }
          ]
        },
        homingSalvo: {
          label: "Homing Salvo",
          activation: "autonomous",
          projectileType: "missile",
          color: "#ffd166",
          tiers: [
            { cooldown: 4.6, damage: 2.3, projectiles: 1, speed: 400, life: 2.5, turnRate: 3.4, blastRadius: 34, range: 820 },
            { cooldown: 4, damage: 2.1, projectiles: 2, speed: 420, life: 2.6, turnRate: 3.7, blastRadius: 38, range: 860 },
            { cooldown: 3.4, damage: 2.4, projectiles: 2, speed: 445, life: 2.7, turnRate: 4, blastRadius: 42, range: 900 }
          ]
        },
        radialArray: {
          label: "Radial Array",
          activation: "autonomous",
          projectileType: "radial",
          color: "#9d8cff",
          tiers: [
            { cooldown: 5.8, damage: 0.9, projectiles: 8, speed: 470, life: 1.05, range: 560 },
            { cooldown: 5.1, damage: 0.95, projectiles: 10, speed: 500, life: 1.1, range: 600 },
            { cooldown: 4.5, damage: 1, projectiles: 12, speed: 530, life: 1.15, range: 640 }
          ]
        },
        prism: {
          label: "Prism Fan",
          activation: "whileFiring",
          projectileType: "prism",
          color: "#ff68dc",
          tiers: [
            { cooldown: 0.56, damage: 0.52, projectiles: 3, speed: 650, life: 0.64, spread: 0.28 },
            { cooldown: 0.53, damage: 0.5, projectiles: 5, speed: 680, life: 0.68, spread: 0.42 },
            { cooldown: 0.5, damage: 0.48, projectiles: 7, speed: 710, life: 0.72, spread: 0.56 }
          ]
        },
        seeker: {
          label: "Seeker Rack",
          activation: "whileFiring",
          projectileType: "missile",
          color: "#ffd166",
          tiers: [
            { cooldown: 1.2, damage: 3, projectiles: 1, speed: 390, life: 2.4, turnRate: 3.1, blastRadius: 42 },
            { cooldown: 1, damage: 2.9, projectiles: 2, speed: 410, life: 2.5, turnRate: 3.4, blastRadius: 46 },
            { cooldown: 0.85, damage: 2.8, projectiles: 3, speed: 430, life: 2.6, turnRate: 3.7, blastRadius: 50 }
          ]
        },
        massDriver: {
          label: "Mass Driver",
          activation: "whileFiring",
          projectileType: "slug",
          color: "#ffffff",
          tiers: [
            { cooldown: 1, damage: 4.2, projectiles: 1, speed: 1080, life: 1.15, pierce: 2 },
            { cooldown: 0.82, damage: 4.5, projectiles: 1, speed: 1140, life: 1.2, pierce: 3 },
            { cooldown: 0.68, damage: 4.8, projectiles: 1, speed: 1200, life: 1.25, pierce: 4 }
          ]
        },
        drone: {
          label: "Guardian Drone",
          activation: "autonomous",
          projectileType: "droneBolt",
          color: "#78ff9f",
          tiers: [
            { drones: 1, cooldown: 0.7, damage: 0.75, speed: 650, life: 0.85, orbitRadius: 46 },
            { drones: 2, cooldown: 0.62, damage: 0.78, speed: 680, life: 0.9, orbitRadius: 54 },
            { drones: 3, cooldown: 0.54, damage: 0.82, speed: 710, life: 0.95, orbitRadius: 62 }
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
      dropChance: 0.19,
      pityKills: 5,
      shield: {
        label: "SHIELD +60",
        weight: 22,
        amount: 60,
        cap: 100
      },
      rapid: {
        label: "OVERDRIVE",
        weight: 24,
        duration: 10,
        cooldownMultiplier: 0.68
      },
      repair: {
        label: "HULL REPAIR",
        weight: 20,
        amount: 34
      },
      triShot: {
        label: "TRI-SHOT",
        weight: 22,
        duration: 10,
        extraProjectiles: 2,
        minimumSpread: 0.22
      },
      piercing: {
        label: "PHASE ROUNDS",
        weight: 12,
        duration: 10,
        bonusPierce: 2
      },
      arcBurst: {
        label: "ARC BURST",
        weight: 14,
        duration: 9,
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
        weight: 10,
        duration: 12,
        cooldown: 0.78,
        damage: 4.8,
        speed: 1180,
        life: 1.05,
        pierce: 3,
        color: "#ffef9f"
      },
      pulseCharge: {
        label: "PULSE CHARGE",
        weight: 10,
        amount: 55
      },
      moduleUpgrade: {
        label: "MODULE UPGRADE",
        weight: 4,
        selection: "newThenLowestTier",
        maxTier: 3,
        persistsForRun: true,
        unlocksBlueprint: true
      }
    },

    difficulty: {
      caps: difficultyCaps,
      healthScale: healthScale,
      bossHealthScale: bossHealthScale,
      damageScale: damageScale,
      speedScale: speedScale,
      fireRateScale: fireRateScale,
      cooldownScale: function (sector) {
        return 1 / fireRateScale(sector);
      },
      scoreScale: scoreScale,
      scaledCooldown: function (baseCooldown, sector) {
        var cooldown = Number(baseCooldown);
        return Math.max(0.05, (Number.isFinite(cooldown) ? cooldown : 1) / fireRateScale(sector));
      }
    }
  });
}());
