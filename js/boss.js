const BossManager = {
  activeBoss: null,
  bossType: null,
  bossBarContainer: null,
  bossNameEl: null,
  bossHpFill: null,

  patternQueue: [],
  currentPattern: null,
  state: 'idle',
  stateTimer: 0,
  cooldownDuration: 3.5,
  patternStep: 0,
  subTimer: 0,

  p1State: null,
  p1Timer: 0,
  p1Angle: 0,

  finalP1State: 'preview',
  finalP1Timer: 0,
  finalP1Angle: 0,
  finalP1BurstCount: 0,
  finalP1Cycle: 0,

  p6ShowWarning: false,

  p8Step: 0,
  p8Timer: 0,
  p8AimAngle: 0,
  p8LockedAngle: 0,
  p8Phase: 'aim',

  bossBullets: [],
  markers: [],
  lasers: [],
  specialDrops: [],
  delayedBombards: [],
  sideBitDrones: [],
  beams: [],
  containers: [],
  // 팬텀 보스 전용 공간 기믹. 기존 보스의 투사체 상태와 분리한다.
  phantomPortals: [],
  phantomPlayerPortalCooldown: 0,
  phantomFortresses: [],

  // CHRONOS 전용 시간 조작 오브젝트. 기존 보스 투사체 배열과 분리한다.
  chronosBlackholes: [],
  chronosPreviews: [],
  chronosPositionStrikes: [],
  // THREE MOMENTS는 다음 패턴과 병행될 수 있는 유일한 기억 준비 패턴이다.
  // 진행 중인 위치 포착은 현재 패턴과 분리해 관리한다.
  chronosPositionSequences: [],
  chronosDelayedVolleys: [],
  chronosMeteorSerial: 0,
  CHRONOS_MEMORY_REPLAY_DELAY: 4.0,
  CHRONOS_REPLAY_WARNING: 0.85,
  CHRONOS_REPLAY_DAMAGE_MULTIPLIER: 0.75,

  // ARSENAL FRAME 전용 경고/근거리 레이저. 기존 보스 효과와 분리해
  // 사망·재시작·관리자 보스 교체 시 해당 보스의 흔적만 안전하게 제거한다.
  arsenalWarnings: [],
  arsenalLasers: [],
  ARSENAL_WEAPONS: ['fabricator', 'duelist', 'disruptor', 'breaker'],
  ARSENAL_SHIELDS: ['laser', 'pulse', 'blackhole', 'flame'],
  ARSENAL_WEAPON_LABELS: {
    fabricator: 'FABRICATOR',
    duelist: 'DUELIST',
    disruptor: 'DISRUPTOR',
    breaker: 'BREAKER'
  },
  ARSENAL_WEAPON_META: {
    fabricator: { color: '#22c55e', glow: '#86efac', glyph: '⚙', icon: 'gear' },
    duelist: { color: '#facc15', glow: '#fef08a', glyph: '✦', icon: 'blade' },
    disruptor: { color: '#a855f7', glow: '#d8b4fe', glyph: 'ϟ', icon: 'split' },
    breaker: { color: '#f97316', glow: '#fdba74', glyph: '◆', icon: 'hammer' }
  },
  ARSENAL_SHIELD_META: {
    laser: { label: 'RED / LASER', color: '#ef4444', glyph: 'L' },
    pulse: { label: 'BLUE / PULSE', color: '#22d3ee', glyph: 'P' },
    blackhole: { label: 'PURPLE / BLACKHOLE', color: '#a855f7', glyph: 'B' },
    flame: { label: 'ORANGE / FLAME', color: '#f97316', glyph: 'F' }
  },
  // 8분 목표 스펙 D/S/W/무기 Lv = 6/6/6/8 기준 1차값.
  // Laser Lv.8 회전빔 1틱(약 30)에 양산기는 생존하고, P2 장갑 병기는 기존 70에서
  // 105 HP로 강화해 Pulse/Blackhole/Flame의 광역 처리 이점을 분명히 남긴다.
  ARSENAL_SUMMON_HP_MULTIPLIERS: { mass: 3, armored: 7.5, overload: 2 },

  lz1ShotCount: 0,
  lz1Timer: 0,
  lz2Volley: 0,
  lz2Timer: 0,

  shipMode: 1,
  shipModeChanged: false,
  shipRecoveryDrone: null,
  shipRecoveryTarget: null,
  shipRecoveryProtectedPart: null,
  shipDebrisCounter: 0,
  shipPatternTimer: 0,
  shipPatternState: null,
  shipPatternIndex: 0,
  shipCircleDirection: 1,
  shipCircleStartAngle: -Math.PI / 2,
  shipCircleAngle: -Math.PI / 2,
  shipCircleDuration: 0,
  shipCircleElapsed: 0,
  shipChargeTargets: [],
  shipChargeIndex: 0,
  shipChargeTimer: 0,
  shipChargeState: null,
  shipDrones: [],
  shipHazard: null,
  shipRecoveryStart: null,
  shipRecoveryTargetPoint: null,
  shipRecoveryCenter: null,
  shipRecoveryRadius: 0,
  shipRecoveryDir: null,
  shipRecoveryPerp: null,
  shipRecoveryArcStart: 0,
  shipRecoveryArcDirection: 1,
  shipRecoveryDebrisTimer: 0,
  shipZoningBulletTimer: 0,
  shipPatternStateLaser: null,
  shipPatternStateAim: null,
  shipPatternLastShot: 0,

  init() {
    this.bossBarContainer = document.getElementById('boss-bar-container');
    this.bossNameEl = document.getElementById('boss-name');
    this.bossHpFill = document.getElementById('boss-hp-fill');
  },

  // 하드 모드는 등급만 요청하고, 실제 보스는 후보군에서 선택한다.
  // 새 보스를 추가할 때 이 후보군과 spawnBossByType만 확장하면 시간표를 건드릴 필요가 없다.
  hardBossTiers: {
    mini: ['mini', 'laser'],
    gundam: ['final', 'phantom', 'arsenal'],
    final: ['warship', 'chronos']
  },
  HARD_MODE_HP_MULTIPLIER: 1.5,

  applyHardModeHpMultiplier() {
    const boss = this.activeBoss;
    if (gameMode !== 'hard' || !boss || boss.hardModeHpScaled) return;

    if (boss.parts) {
      for (const part of Object.values(boss.parts)) {
        part.maxHp = Math.max(1, Math.round(part.maxHp * this.HARD_MODE_HP_MULTIPLIER));
        part.hp = part.maxHp;
      }
      boss.maxHp = Object.values(boss.parts).reduce((sum, part) => sum + part.maxHp, 0);
      boss.hp = boss.maxHp;
    } else {
      boss.maxHp = Math.max(1, Math.round(boss.maxHp * this.HARD_MODE_HP_MULTIPLIER));
      boss.hp = boss.maxHp;
    }
    boss.hardModeHpScaled = true;
  },

  spawnFromTier(tier) {
    const candidates = this.hardBossTiers[tier];
    if (!candidates || candidates.length === 0 || this.activeBoss) return;
    const type = candidates[Math.floor(Math.random() * candidates.length)];
    this.spawnBossByType(type);
    if (this.activeBoss) this.activeBoss.hardBossTier = tier;
  },

  spawnBossByType(type) {
    if (type === 'mini') this.spawnMiniBoss();
    else if (type === 'laser') this.spawnLaserBoss();
    else if (type === 'final') this.spawnFinalBoss();
    else if (type === 'phantom') this.spawnPhantomBoss();
    else if (type === 'warship') this.spawnWarshipBoss();
    else if (type === 'chronos') this.spawnChronosBoss();
    else if (type === 'arsenal') this.spawnArsenalBoss();
    this.applyHardModeHpMultiplier();
  },

  clearFieldOnBossSpawn() {
    for (let e of enemies) {
      addExplosion(e.x, e.y, e.isElite ? '#ff3838' : '#ff4757', e.isElite ? 16 : 8);
    }
    for (let obs of obstacles) {
      addExplosion(obs.x, obs.y, '#95a5a6', 10);
    }
    enemies = [];
    obstacles = [];
    enemyBullets = [];
    this.phantomFortresses = [];
  },

  spawnMiniBoss() {
    if (this.activeBoss) return;
    this.bossType = 'mini';
    const pBase = baseHpTable[currentPhase] || 2;
    const hp = pBase * 300;

    this.activeBoss = {
      name: "MOTHERSHIP UFO (미니 보스)",
      x: width / 2,
      y: -70 * scale,
      targetY: height * 0.2,
      baseY: height * 0.2,
      radius: 38 * scale,
      hp: hp,
      maxHp: hp,
      angle: 0
    };

    this.clearFieldOnBossSpawn();
    this.patternQueue = this.generateMiniQueue();
    this.state = 'entering';
    this.stateTimer = 0;
    this.showBossBar("MINI BOSS : MOTHERSHIP UFO");
    Sound.playPhaseAlert();
    Sound.playBGM('miniboss');
    showFloatingText("🚨 WARNING: MOTHERSHIP UFO APPROACHING! 🚨", width / 2, height * 0.32, '#ff4757');
  },

  spawnFinalBoss() {
    if (this.activeBoss) return;
    this.bossType = 'final';
    const pBase = baseHpTable[currentPhase] || 2;
    const hp = pBase * 800;

    this.activeBoss = {
      name: "RX-GUNDAM (건담 보스)",
      x: width / 2,
      y: -90 * scale,
      targetY: height * 0.22,
      baseY: height * 0.22,
      radius: 46 * scale,
      hp: hp,
      maxHp: hp,
      angle: 0,
      eyeFlashTimer: 0
    };

    this.clearFieldOnBossSpawn();
    this.patternQueue = this.generateFinalQueue();
    this.state = 'entering';
    this.stateTimer = 0;
    this.showBossBar("GUNDAM BOSS : RX-GUNDAM");
    Sound.playGundamBeam();
    Sound.playBGM('finalboss');
    showFloatingText("⚔️ WARNING: FINAL BOSS GUNDAM ENGAGED! ⚔️", width / 2, height * 0.32, '#facc15');
  },

  spawnPhantomBoss() {
    if (this.activeBoss) return;
    this.bossType = 'phantom';
    const pBase = baseHpTable[currentPhase] || 2;
    const hp = pBase * 900;

    this.activeBoss = {
      name: "PHANTOM (팬텀)",
      x: width / 2,
      y: -90 * scale,
      // 상단 대기가 아닌 화면 정중앙에서 전장을 장악한다.
      targetY: height * 0.50,
      baseY: height * 0.50,
      radius: 44 * scale,
      hp: hp,
      maxHp: hp,
      angle: 0,
      // +X가 보스 전방이다. 전방 보호막과 후방 코어는 이 값을 함께 따른다.
      facingAngle: Math.PI / 2,
      targetFacingAngle: Math.PI / 2,
      shieldFlash: 0,
      shieldBlockTimer: 0,
      phantom: null,
      phantomPendingWarp: null,
      collapseUsed: false
    };

    this.clearFieldOnBossSpawn();
    this.clearPhantomPortals();
    this.clearPhantomFortresses();
    this.patternQueue = this.generatePhantomQueue();
    this.state = 'entering';
    this.stateTimer = 0;
    this.showBossBar("MIDDLE BOSS : PHANTOM");
    Sound.playEyeFlash();
    Sound.playBGM('phantom');
    showFloatingText("🌀 WARNING: PHANTOM WARP SIGNATURE DETECTED! 🌀", width / 2, height * 0.32, '#a78bfa');
  },

  spawnWarshipBoss() {
    if (this.activeBoss) return;
    this.bossType = 'warship';

    const phaseBase = typeof getEnemyBaseHp === 'function' ? getEnemyBaseHp(currentPhase) : (baseHpTable[currentPhase] || 1);
    const p10 = typeof getPhase10Ramp === 'function' ? getPhase10Ramp(gameTime) : 0;
    const phaseEnemyHp = Math.max(1, phaseBase + Math.floor(p10 * 25));

    const turretMax = phaseEnemyHp * 300;
    const coreMax = phaseEnemyHp * 800;

    this.activeBoss = {
      name: "CRIMSON DREADNOUGHT (전함 보스)",
      x: width / 2,
      y: -120 * scale,
      targetY: height * 0.18,
      baseY: height * 0.18,
      radius: 58 * scale,
      hp: turretMax * 2 + coreMax,
      maxHp: turretMax * 2 + coreMax,
      angle: 0,
      shipWidth: Math.min(width * 0.72, 290 * scale),
      parts: {
        left: { id: 'left', name: '좌 포탑', hp: turretMax, maxHp: turretMax, alive: true, radius: 27 * scale, flash: 0 },
        right: { id: 'right', name: '우 포탑', hp: turretMax, maxHp: turretMax, alive: true, radius: 27 * scale, flash: 0 },
        core: { id: 'core', name: '중앙 갑판', hp: coreMax, maxHp: coreMax, alive: true, radius: 58 * scale, flash: 0 }
      },
      shipMode: 1
    };

    this.shipMode = 1;
    this.shipModeChanged = false;
    this.shipRecoveryDrone = null;
    this.shipRecoveryTarget = null;
    this.shipRecoveryProtectedPart = null;
    this.shipDebrisCounter = 0;
    this.shipPatternTimer = 0;
    this.shipPatternState = null;
    this.shipPatternIndex = 0;
    this.shipCircleDirection = Math.random() < 0.5 ? 1 : -1;
    this.shipCircleStartAngle = -Math.PI / 2;
    this.shipCircleAngle = this.shipCircleStartAngle;
    this.shipCircleDuration = 6.8;
    this.shipCircleElapsed = 0;
    this.shipChargeTargets = [];
    this.shipChargeIndex = 0;
    this.shipChargeTimer = 0;
    this.shipChargeState = null;
    this.shipDrones = [];
    this.shipHazard = null;
    this.shipRecoveryStart = null;
    this.shipRecoveryTargetPoint = null;
    this.shipRecoveryCenter = null;
    this.shipRecoveryRadius = 0;
    this.shipRecoveryDir = null;
    this.shipRecoveryPerp = null;
    this.shipRecoveryArcStart = 0;
    this.shipRecoveryArcDirection = 1;
    this.shipRecoveryDebrisTimer = 0;
    this.shipZoningBulletTimer = 0;
    this.shipPatternStateLaser = null;
    this.shipPatternStateAim = null;
    this.shipPatternLastShot = 0;

    this.clearFieldOnBossSpawn();
    this.patternQueue = this.generateWarshipQueue();
    this.state = 'entering';
    this.stateTimer = 0;
    this.showBossBar("FINAL BOSS : CRIMSON DREADNOUGHT");
    Sound.playPhaseAlert();
    Sound.playBGM('warshipboss');
    showFloatingText("🚨 WARNING: CRIMSON DREADNOUGHT INBOUND! 🚨", width / 2, height * 0.32, '#ef4444');
  },

  spawnChronosBoss() {
    if (this.activeBoss) return;
    this.bossType = 'chronos';
    const phaseBase = typeof getEnemyBaseHp === 'function' ? getEnemyBaseHp(currentPhase) : (baseHpTable[currentPhase] || 1);
    const p10 = typeof getPhase10Ramp === 'function' ? getPhase10Ramp(gameTime) : 0;
    const hp = Math.max(1, phaseBase + Math.floor(p10 * 25)) * 1400;

    this.activeBoss = {
      name: 'CHRONOS (크로노스)',
      x: width / 2,
      y: -105 * scale,
      targetY: height * 0.27,
      baseY: height * 0.27,
      radius: 62 * scale,
      hp, maxHp: hp,
      angle: 0,
      chronos: {
        phase: 1,
        transition: null,
        pattern: null,
        memories: [],
        positionMemory: [],
        collapseActive: false,
        stunTimer: 0,
        ultimateUsed: false,
        ultimateCooldown: 0,
        flash: null,
        ringAngle: 0,
        phaseAnnouncement: 0
      }
    };

    this.clearFieldOnBossSpawn();
    this.clearChronosTemporal();
    this.patternQueue = this.generateChronosQueue(1);
    this.state = 'entering';
    this.stateTimer = 0;
    this.showBossBar('FINAL BOSS : CHRONOS');
    Sound.playPhaseAlert();
    Sound.playBGM('chronos');
    showFloatingText('⏳ WARNING: CHRONOS TEMPORAL SIGNATURE DETECTED! ⏳', width / 2, height * 0.32, '#fde68a');
  },

  spawnArsenalBoss() {
    if (this.activeBoss) return;
    this.bossType = 'arsenal';
    const phaseHp = typeof getEnemyBaseHp === 'function'
      ? getEnemyBaseHp(currentPhase)
      : (baseHpTable[currentPhase] || 2);
    const hp = Math.max(1, phaseHp) * 800;
    const playerShieldType = this.ARSENAL_SHIELDS.includes(player.weaponType) ? player.weaponType : null;
    const initialShieldPool = this.ARSENAL_SHIELDS.filter(type => type !== playerShieldType);
    const shieldType = initialShieldPool[Math.floor(Math.random() * initialShieldPool.length)];
    const currentWeapon = this.ARSENAL_WEAPONS[Math.floor(Math.random() * this.ARSENAL_WEAPONS.length)];

    this.activeBoss = {
      name: 'ARSENAL FRAME (아스널 프레임)',
      x: width / 2,
      y: -100 * scale,
      targetY: height * 0.27,
      baseY: height * 0.27,
      radius: 52 * scale,
      hp,
      maxHp: hp,
      angle: 0,
      arsenal: {
        shieldType,
        shieldFlash: 0,
        shieldShiftTimer: 0,
        currentWeapon,
        previousWeapon: null,
        pendingWeapon: null,
        weaponPatternCount: 0,
        weaponChangeCount: 0,
        overrideStack: 0,
        adaptiveShiftPending: false,
        overloadPending: false,
        lastPattern: null,
        pattern: null,
        overheatTimer: 0,
        firstActionPending: true,
        initialAdaptiveShift: true
      }
    };

    this.clearFieldOnBossSpawn();
    this.clearArsenalBattleObjects();
    this.patternQueue = [];
    this.currentPattern = null;
    this.state = 'entering';
    this.stateTimer = 0;
    this.showBossBar('MIDDLE BOSS : ARSENAL FRAME');
    this.updateArsenalBossBar();
    Sound.playPhaseAlert();
    Sound.playBGM('arsenal');
    showFloatingText('⚙️ WARNING: ARSENAL FRAME DEPLOYED! ⚙️', width / 2, height * 0.32, '#fbbf24');
  },

  spawnLaserBoss() {
    if (this.activeBoss) return;
    this.bossType = 'laser';
    const pBase = baseHpTable[currentPhase] || 2;
    const hp = pBase * 320;

    this.activeBoss = {
      name: "PRISM CORE (레이저 보스)",
      x: width / 2,
      y: height / 2,
      targetY: height / 2,
      baseY: height / 2,
      radius: 34 * scale,
      hp: hp,
      maxHp: hp,
      angle: 0,
      spawnAlpha: 0,
      prisms: [],
      prismRegenTimer: 0
    };
    this.initPrisms();

    this.clearFieldOnBossSpawn();
    this.patternQueue = this.generateLaserQueue();
    this.state = 'entering';
    this.stateTimer = 0;
    this.showBossBar("HARD BOSS : PRISM CORE");
    Sound.playPhaseAlert();
    Sound.playBGM('laserboss'); // bgm_miniboss2.mp3 재생으로 변경
    showFloatingText("🔺 WARNING: PRISM CORE ONLINE! 🔺", width / 2, height * 0.32, '#f472b6');
  },

  generateLaserQueue() {
    let q = [1, 2, 3, 4];
    while (q.length < 6) {
      q.push(Math.floor(Math.random() * 3) + 1);
    }
    return q.sort(() => Math.random() - 0.5);
  },

  castResidualLaser(label) {
    const b = this.activeBoss;
    if (!b) return;
    const toPlayer = Math.atan2(player.y - b.y, player.x - b.x);
    const offsetDeg = 10 + Math.random() * 20;
    const offset = (offsetDeg * Math.PI / 180) * (Math.random() < 0.5 ? 1 : -1);
    this.beams.push({
      follow: true,
      ox: b.x, oy: b.y,
      angle: toPlayer + offset,
      width: 12 * scale,
      warnTimer: 1.2, fireTimer: Infinity, active: false,
      tracking: false,
      persistent: true,
      color: '#fb923c'
    });
    showFloatingText(label, b.x, b.y - b.radius - 16 * scale, '#fb923c');
  },

  PRISM_COUNT: 6,
  PRISM_HP: 3,
  PRISM_HIT_INVINCIBLE: 1.0,
  PRISM_REGEN_DELAY: 10.0,

  initPrisms() {
    const b = this.activeBoss;
    b.prisms = [];
    for (let i = 0; i < this.PRISM_COUNT; i++) {
      b.prisms.push({ hp: this.PRISM_HP, alive: true, flash: 0, invincible: 0 });
    }
    b.prismRegenTimer = 0;
  },

  getPrismPos(i) {
    const b = this.activeBoss;
    const a = b.angle + i * Math.PI / 3;
    return {
      x: b.x + Math.cos(a) * b.radius * 0.95,
      y: b.y + Math.sin(a) * b.radius * 0.95,
      r: b.radius * 0.24
    };
  },

  hasPersistentBeam() {
    return this.beams.some(bm => bm.persistent);
  },

  getVulnerablePrisms() {
    const b = this.activeBoss;
    if (!b || this.bossType !== 'laser' || !b.prisms || !this.hasPersistentBeam()) return [];
    const list = [];
    for (let i = 0; i < b.prisms.length; i++) {
      const p = b.prisms[i];
      if (!p.alive || p.invincible > 0) continue;
      const pos = this.getPrismPos(i);
      list.push({ x: pos.x, y: pos.y, r: pos.r, radius: pos.r, prism: p, isPrism: true });
    }
    return list;
  },

  findPrismHit(x, y, rad) {
    const b = this.activeBoss;
    if (!b || this.bossType !== 'laser' || !b.prisms) return null;
    if (!this.hasPersistentBeam()) return null;
    for (let i = 0; i < b.prisms.length; i++) {
      const p = b.prisms[i];
      if (!p.alive || p.invincible > 0) continue;
      const pos = this.getPrismPos(i);
      if (Math.hypot(pos.x - x, pos.y - y) < pos.r + rad) return p;
    }
    return null;
  },

  damagePrism(prism, amount = 1, damageColor = '#ffffff') {
    const b = this.activeBoss;
    if (!prism.alive || prism.invincible > 0) return;
    // Prism durability is a hit-count mechanic, not ordinary HP. Every valid
    // contact removes exactly one of three layers regardless of weapon damage.
    const damage = 1;
    prism.hp = Math.max(0, prism.hp - 1);
    const idxForText = b.prisms.indexOf(prism);
    const prismPosForText = this.getPrismPos(idxForText);
    if (typeof showDamageNumber === 'function') showDamageNumber(damage, prismPosForText.x, prismPosForText.y, damageColor, 100);
    prism.flash = 0.15;
    prism.invincible = this.PRISM_HIT_INVINCIBLE;
    const idx = b.prisms.indexOf(prism);
    const pos = this.getPrismPos(idx);
    addExplosion(pos.x, pos.y, '#fbcfe8', 4);

    if (prism.hp <= 0) {
      prism.alive = false;
      Sound.playExplosion(false);
      addExplosion(pos.x, pos.y, '#f472b6', 14);

      const remaining = b.prisms.filter(p => p.alive).length;
      const destroyed = b.prisms.length - remaining;
      if (remaining === 0) {
        this.onAllPrismsDestroyed();
      } else {
        showFloatingText(`프리즘 파괴! (${remaining} 남음)`, pos.x, pos.y - 12 * scale, '#fbcfe8');
        if (destroyed % 2 === 0) {
          this.castResidualLaser("▬ 프리즘 반응! 잔류 레이저 추가!");
          Sound.playEyeFlash();
        }
      }
    }
  },

  onAllPrismsDestroyed() {
    const b = this.activeBoss;
    let removed = 0;
    for (let i = this.beams.length - 1; i >= 0; i--) {
      if (this.beams[i].persistent) {
        this.beams.splice(i, 1);
        removed++;
      }
    }
    Sound.playBomb();
    addExplosion(b.x, b.y, '#fb923c', 30);
    showFloatingText(removed > 0 ? "💥 프리즘 붕괴! 잔류 레이저 소멸!" : "💥 프리즘 붕괴!", width / 2, height * 0.35, '#fb923c');
    b.prismRegenTimer = this.PRISM_REGEN_DELAY;
  },

  updatePrisms(dt) {
    const b = this.activeBoss;
    if (!b || !b.prisms) return;
    for (const p of b.prisms) {
      if (p.flash > 0) p.flash -= dt;
      if (p.invincible > 0) p.invincible -= dt;
    }
    if (b.prismRegenTimer > 0) {
      b.prismRegenTimer -= dt;
      if (b.prismRegenTimer <= 0) {
        this.initPrisms();
        showFloatingText("프리즘 재생성!", b.x, b.y - b.radius - 16 * scale, '#f472b6');
        Sound.playPhaseAlert();
      }
    }
  },

  activeTempBeamCount() {
    let n = 0;
    for (const bm of this.beams) if (!bm.persistent) n++;
    return n;
  },

  generateMiniQueue() {
    let q = [1, 2, 3, 4];
    while (q.length < 6) {
      q.push(Math.floor(Math.random() * 4) + 1);
    }
    return q.sort(() => Math.random() - 0.5);
  },

  generateFinalQueue() {
    let q = [1, 2, 3, 4, 5, 6, 7, 8];
    const poolWithout7 = [1, 2, 3, 4, 5, 6, 8];
    while (q.length < 10) {
      q.push(poolWithout7[Math.floor(Math.random() * poolWithout7.length)]);
    }
    return q.sort(() => Math.random() - 0.5);
  },

  generatePhantomQueue() {
    let q = [1, 2, 3, 4, 5, 6, 7];
    while (q.length < 10) q.push(Math.floor(Math.random() * 7) + 1);
    return q.sort(() => Math.random() - 0.5);
  },

  hasActivePhantomPortals() {
    return this.phantomPortals.some(portal => portal.life > 0);
  },

  generateWarshipQueue() {
    let q;
    if (this.shipMode === 1) {
      q = [1, 2, 3, 4, 5];
      while (q.length < 8) q.push(Math.floor(Math.random() * 5) + 1);
    } else if (this.shipMode === 2) {
      q = [1];
    } else {
      q = [1, 2, 3, 4, 5];
      while (q.length < 8) q.push(Math.floor(Math.random() * 5) + 1);
    }
    return q.sort(() => Math.random() - 0.5);
  },

  generateChronosQueue(phase = 1) {
    if (phase === 1) return [1, 2, 3, 1, 4, 2, 3];
    if (phase === 2) return [1, 5, 6, 2, 8, 7, 1, 5];
    const c = this.activeBoss?.chronos;
    return c?.ultimateUsed ? [1, 9, 2, 10, 11, 7, 1] : [1, 9, 2, 10, 11, 7, 12, 1];
  },

  startNextPattern() {
    if (this.bossType === 'arsenal') {
      this.startNextArsenalAction();
      return;
    }
    if (this.patternQueue.length === 0) {
      if (this.bossType === 'mini') this.patternQueue = this.generateMiniQueue();
      else if (this.bossType === 'laser') this.patternQueue = this.generateLaserQueue();
      else if (this.bossType === 'phantom') this.patternQueue = this.generatePhantomQueue();
      else if (this.bossType === 'warship') this.patternQueue = this.generateWarshipQueue();
      else if (this.bossType === 'chronos') this.patternQueue = this.generateChronosQueue(this.activeBoss?.chronos?.phase || 1);
      else this.patternQueue = this.generateFinalQueue();
    }
    this.currentPattern = this.patternQueue.shift();
    if (this.bossType === 'phantom' && this.activeBoss && !this.activeBoss.collapseUsed && this.activeBoss.hp / this.activeBoss.maxHp <= 0.35) {
      this.currentPattern = 8;
      this.activeBoss.collapseUsed = true;
    }
    // 3/4 게이트는 패턴 종료 뒤에도 15초간 맵 기믹으로 남는다. 살아 있는 게이트가
    // 있으면 3/4를 다시 선택하지 않고 일반 탄막/이동 패턴으로 자연스럽게 잇는다.
    if (this.bossType === 'phantom' && this.currentPattern !== 8 && this.hasActivePhantomPortals() && (this.currentPattern === 3 || this.currentPattern === 4)) {
      const followUps = [1, 2, 5, 6, 7];
      this.currentPattern = followUps[Math.floor(Math.random() * followUps.length)];
    }
    this.state = 'pattern';
    this.stateTimer = 0;
    this.patternStep = 0;
    this.subTimer = 0;
    this.p1State = null;
    this.p6ShowWarning = false;
    this.p8Step = 0;
    this.p8Phase = 'aim';
    this.p8Timer = 0;

    this.finalP1State = 'preview';
    this.finalP1Timer = 0;
    this.finalP1Angle = 0;
    this.finalP1BurstCount = 0;
    this.finalP1Cycle = 0;

    this.lz1ShotCount = 0;
    this.lz1Timer = 0;
    this.lz2Volley = 0;
    this.lz2Timer = 0;

    this.shipPatternTimer = 0;
    this.shipPatternState = null;
    this.shipPatternIndex = 0;
    this.shipChargeTimer = 0;
    this.shipChargeState = null;
    this.shipPatternStateLaser = null;
    this.shipPatternStateAim = null;
    this.shipZoningBulletTimer = 0;
    this.shipPatternLastShot = 0;

    if (this.bossType === 'phantom' && this.activeBoss) {
      this.activeBoss.phantom = { step: 0, timer: 0, count: 0, volleys: 0, rotations: 0, warned: false };
      this.activeBoss.phantomPendingWarp = null;
    }

    if (this.bossType === 'laser') {
      this.startLaserPattern();
      return;
    }

    if (this.bossType === 'warship') {
      this.startWarshipPattern();
      return;
    }

    if (this.bossType === 'chronos') {
      this.startChronosPattern();
      return;
    }

    if (this.bossType === 'mini' && this.currentPattern === 3) {
      this.markers.push({
        x: player.x, y: player.y,
        radius: 95 * scale,
        timer: 2.0, maxTimer: 2.0,
        color: '#ef4444'
      });
      showFloatingText("⚠️ 원형 포격 경보!", player.x, player.y - 20 * scale, '#ef4444');
      this.setCooldown();
    } else if (this.bossType === 'mini' && this.currentPattern === 4) {
      this.executeMiniPattern4();
      this.setCooldown();
    } else if (this.bossType === 'final' && this.currentPattern === 3) {
      this.delayedBombards.push(
        { spawnIn: 0.0, bombTimer: 4.0, radius: 90 * scale },
        { spawnIn: 1.0, bombTimer: 3.5, radius: 90 * scale },
        { spawnIn: 2.0, bombTimer: 3.0, radius: 90 * scale }
      );
      showFloatingText("⚠️ 광역 궤도 폭격 발동!", player.x, player.y - 20 * scale, '#ef4444');
      this.setCooldown();
    } else if (this.bossType === 'final' && this.currentPattern === 4) {
      this.executeFinalPattern4();
      this.setCooldown();
    }
  },

  setCooldown() {
    this.state = 'cooldown';
    this.stateTimer = 0;
    this.cooldownDuration = this.bossType === 'laser'
      ? 2.0 + Math.random() * 1.5
      : this.bossType === 'arsenal'
        ? 1.6 + Math.random() * 0.9
        : 3.0 + Math.random() * 2.0;
  },

  startLaserPattern() {
    const b = this.activeBoss;
    if (this.currentPattern === 1) {
      this.lz1ShotCount = 0;
      this.lz1Timer = 0.3;
      showFloatingText("⚡ 연속 조준 레이저!", b.x, b.y - b.radius - 16 * scale, '#f472b6');
    } else if (this.currentPattern === 2) {
      this.lz2Volley = 0;
      this.lz2Timer = 0;
      this.fireRadialVolley(0);
      showFloatingText("✳ 전방위 프리즘 레이저!", b.x, b.y - b.radius - 16 * scale, '#f472b6');
    } else if (this.currentPattern === 3) {
      this.spawnContainers(3 + Math.floor(Math.random() * 2));
      const sweepDuration = 2.0;
      const sweepTurns = 1.25;
      const startAngle = Math.random() * Math.PI * 2;
      const sweepSpeed = (Math.PI * 2 * sweepTurns / sweepDuration) * (Math.random() < 0.5 ? 1 : -1);
      for (let k = 0; k < 4; k++) {
        this.beams.push({
          follow: true,
          ox: b.x, oy: b.y,
          angle: startAngle + k * Math.PI / 2,
          width: 24 * scale,
          warnTimer: 2.0, fireTimer: sweepDuration, active: false,
          tracking: false,
          sweep: true,
          sweepSpeed: sweepSpeed,
          blocked: true,
          silent: k !== 0,
          color: '#f472b6'
        });
      }
      showFloatingText("☢ 프리즘 메가 레이저 충전! 컨테이너 뒤로 숨어라!", width / 2, height * 0.3, '#f472b6');
      Sound.playEyeFlash();
    } else if (this.currentPattern === 4) {
      if (this.hasPersistentBeam()) {
        this.startNextPattern();
        return;
      }
      this.castResidualLaser("▬ 잔류 레이저 설치!");
    }
  },

  spawnContainers(count) {
    const b = this.activeBoss;
    this.containers = [];
    const r = 22 * scale;
    const margin = r + 12 * scale;
    const minFromBoss = b.radius + 70 * scale;
    const minBetween = r * 2 + 40 * scale;

    for (let n = 0; n < count; n++) {
      let placed = false;
      for (let attempt = 0; attempt < 40 && !placed; attempt++) {
        const x = margin + Math.random() * (width - margin * 2);
        const y = margin + Math.random() * (height - margin * 2);
        if (Math.hypot(x - b.x, y - b.y) < minFromBoss) continue;
        if (this.containers.some(c => Math.hypot(c.x - x, c.y - y) < minBetween)) continue;
        this.containers.push({ x, y, radius: r, spawnAlpha: 0 });
        placed = true;
      }
    }
  },

  clearContainers() {
    for (const c of this.containers) {
      addExplosion(c.x, c.y, '#94a3b8', 12);
    }
    this.containers = [];
  },

  hexToRgba(hex, alpha) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  },

  isShadowed(ox, oy, tx, ty) {
    const o = { x: ox, y: oy };
    const t = { x: tx, y: ty };
    for (const c of this.containers) {
      if (distToSegment(o, t, { x: c.x, y: c.y }) < c.radius) return true;
    }
    return false;
  },

  getBeamLength(bm) {
    let len = Math.max(width, height) * 1.6;
    if (!bm.blocked) return len;
    const dx = Math.cos(bm.angle);
    const dy = Math.sin(bm.angle);
    const halfW = bm.width / 2;
    for (const c of this.containers) {
      const fx = c.x - bm.ox;
      const fy = c.y - bm.oy;
      const tCenter = fx * dx + fy * dy;
      if (tCenter <= 0) continue;
      const perp = Math.abs(fx * dy - fy * dx);
      const hitR = c.radius + halfW * 0.5;
      if (perp >= hitR) continue;
      const t = tCenter - Math.sqrt(hitR * hitR - perp * perp);
      if (t > 0 && t < len) len = t;
    }
    return len;
  },

  fireRadialVolley(parity) {
    const b = this.activeBoss;
    const beamCount = 12;
    const step = (Math.PI * 2) / beamCount;
    const offset = parity === 0 ? 0 : step / 2;

    for (let i = 0; i < beamCount; i++) {
      this.beams.push({
        follow: true,
        ox: b.x, oy: b.y,
        angle: offset + i * step,
        width: 11 * scale,
        baseWidth: 11 * scale,
        grow: true,
        fireTotal: 0.5,
        warnTimer: 0.5, fireTimer: 0.5, active: false,
        tracking: false,
        silent: i !== 0,
        color: '#f472b6'
      });
    }
  },

  updateLaserPatterns(dt) {
    const b = this.activeBoss;

    if (this.currentPattern === 1) {
      const totalShots = 15;
      this.lz1Timer += dt;
      if (this.lz1ShotCount < totalShots && this.lz1Timer >= 0.3) {
        this.lz1Timer = 0;
        this.lz1ShotCount++;
        this.beams.push({
          follow: true,
          ox: b.x, oy: b.y,
          angle: Math.atan2(player.y - b.y, player.x - b.x),
          width: 5 * scale,
          baseWidth: 5 * scale,
          grow: true,
          fireTotal: 0.15,
          warnTimer: 0.5, fireTimer: 0.15, active: false,
          tracking: false,
          color: '#f472b6'
        });
        this.beams.push({
          follow: true,
          ox: b.x, oy: b.y,
          angle: Math.random() * Math.PI * 2,
          width: 5 * scale,
          baseWidth: 5 * scale,
          grow: true,
          fireTotal: 0.15,
          warnTimer: 0.5, fireTimer: 0.15, active: false,
          tracking: false,
          silent: true,
          color: '#a78bfa'
        });
      }
      if (this.lz1ShotCount >= totalShots && this.activeTempBeamCount() === 0) {
        this.setCooldown();
      }

    } else if (this.currentPattern === 2) {
      this.lz2Timer += dt;
      if (this.lz2Timer >= 1.1) {
        this.lz2Timer = 0;
        this.lz2Volley++;
        if (this.lz2Volley >= 4) {
          this.setCooldown();
        } else {
          this.fireRadialVolley(this.lz2Volley % 2);
        }
      }

    } else if (this.currentPattern === 3) {
      if (this.activeTempBeamCount() === 0) {
        this.clearContainers();
        this.setCooldown();
      }

    } else if (this.currentPattern === 4) {
      if (this.stateTimer >= 1.5) {
        this.setCooldown();
      }
    }
  },

  getWarshipPartPositions() {
    const b = this.activeBoss;
    if (!b || this.bossType !== 'warship') return {};
    const y = b.y + 8 * scale;
    const gap = b.shipWidth * 0.34;
    return {
      left: { x: b.x - gap, y, radius: b.parts.left.radius },
      right: { x: b.x + gap, y, radius: b.parts.right.radius },
      core: { x: b.x, y: b.y + 2 * scale, radius: b.parts.core.radius }
    };
  },

  getPlayerTargetables() {
    const result = [];
    const b = this.activeBoss;
    if (!b) return result;

    if (this.bossType === 'warship') {
      const pos = this.getWarshipPartPositions();
      const isRecoveryProtected = part => this.shipRecoveryDrone && this.shipRecoveryProtectedPart === part;
      if (b.parts.left.alive && !isRecoveryProtected(b.parts.left)) result.push({ x: pos.left.x, y: pos.left.y, radius: pos.left.radius, shipPart: b.parts.left });
      if (b.parts.right.alive && !isRecoveryProtected(b.parts.right)) result.push({ x: pos.right.x, y: pos.right.y, radius: pos.right.radius, shipPart: b.parts.right });
      if (this.shipRecoveryDrone && this.shipRecoveryDrone.hp > 0) result.push(this.shipRecoveryDrone);
      for (const e of enemies) {
        if (e.isBossEntity && e.isShipDestructibleDebris && e.hp > 0) result.push(e);
      }
      if (b.parts.left.alive === false && b.parts.right.alive === false && b.parts.core.alive) {
        result.push({ x: pos.core.x, y: pos.core.y, radius: pos.core.radius, shipPart: b.parts.core });
      }
      return result;
    }

    result.push(b);
    if (this.bossType === 'laser') {
      for (const pr of this.getVulnerablePrisms()) result.push(pr);
    }
    return result;
  },

  getWarshipCombatPartAt(x, y, radius = 0) {
    const b = this.activeBoss;
    if (!b || this.bossType !== 'warship') return null;
    const pos = this.getWarshipPartPositions();
    const candidates = [];
    const isRecoveryProtected = part => this.shipRecoveryDrone && this.shipRecoveryProtectedPart === part;
    if (b.parts.left.alive && !isRecoveryProtected(b.parts.left)) candidates.push({ part: b.parts.left, p: pos.left });
    if (b.parts.right.alive && !isRecoveryProtected(b.parts.right)) candidates.push({ part: b.parts.right, p: pos.right });
    if (b.parts.left.alive === false && b.parts.right.alive === false && b.parts.core.alive) candidates.push({ part: b.parts.core, p: pos.core });
    let best = null;
    let bestD = Infinity;
    for (const c of candidates) {
      const d = Math.hypot(c.p.x - x, c.p.y - y);
      if (d <= c.p.radius + radius && d < bestD) { bestD = d; best = c.part; }
    }
    return best;
  },

  getWarshipCombatPartOnSegment(x1, y1, x2, y2, extraRadius = 0) {
    const b = this.activeBoss;
    if (!b || this.bossType !== 'warship') return null;
    const pos = this.getWarshipPartPositions();
    const candidates = [];
    const isRecoveryProtected = part => this.shipRecoveryDrone && this.shipRecoveryProtectedPart === part;
    if (b.parts.left.alive && !isRecoveryProtected(b.parts.left)) candidates.push({ part: b.parts.left, p: pos.left });
    if (b.parts.right.alive && !isRecoveryProtected(b.parts.right)) candidates.push({ part: b.parts.right, p: pos.right });
    if (!b.parts.left.alive && !b.parts.right.alive && b.parts.core.alive) candidates.push({ part: b.parts.core, p: pos.core });
    let best = null;
    let bestT = Infinity;
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    for (const c of candidates) {
      let t = ((c.p.x - x1) * dx + (c.p.y - y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = x1 + dx * t, py = y1 + dy * t;
      const d = Math.hypot(c.p.x - px, c.p.y - py);
      if (d <= c.p.radius + extraRadius && t < bestT) { bestT = t; best = c.part; }
    }
    return best;
  },

  syncWarshipMode() {
    const b = this.activeBoss;
    if (!b || this.bossType !== 'warship') return;
    const left = b.parts.left.alive;
    const right = b.parts.right.alive;
    const next = left && right ? 1 : (left || right ? 2 : 3);
    b.shipMode = next;
    if (this.shipMode !== next) {
      this.shipMode = next;
      this.shipModeChanged = true;
      if (next === 3) {
        // M2의 수리 상태가 남아 있으면 M3 패턴 종료를 막을 수 있으므로 즉시 정리한다.
        if (this.shipRecoveryDrone) {
          const droneIndex = enemies.indexOf(this.shipRecoveryDrone);
          if (droneIndex >= 0) enemies.splice(droneIndex, 1);
        }
        this.shipRecoveryDrone = null;
        this.shipRecoveryTarget = null;
        this.shipRecoveryProtectedPart = null;
        this.shipRecoveryDebrisTimer = 0;
        this.shipRecoveryStart = null;
        this.shipRecoveryTargetPoint = null;
        this.shipRecoveryCenter = null;
        this.shipRecoveryRadius = 0;
        this.shipRecoveryDir = null;
        this.shipRecoveryPerp = null;
        this.shipRecoveryArcStart = 0;
        this.shipRecoveryArcDirection = 1;
        this.patternQueue = this.generateWarshipQueue();
        this.currentPattern = null;
      }
      showFloatingText(next === 2 ? "⚠️ 포탑 손상! 회복 프로토콜 가동!" : "🔥 모든 포탑 파괴! 총력전 모드!", b.x, b.y + b.radius + 28 * scale, next === 2 ? '#22c55e' : '#ef4444');
    }
  },

  startWarshipPattern() {
    const b = this.activeBoss;
    this.syncWarshipMode();
    if (!b) return;
    // M2에서 M3로 넘어가는 프레임에는 이전 패턴 번호를 폐기한다.
    // 새 M3 큐가 준비된 뒤 쿨다운을 거쳐 정상적으로 첫 패턴을 시작한다.
    if (this.shipMode === 3 && !Number.isInteger(this.currentPattern)) {
      this.setCooldown();
      return;
    }

    if (this.shipMode === 1) {
      if (this.currentPattern === 1) {
        this.shipPatternState = 'spread';
        this.shipPatternTimer = 0;
        this.shipPatternIndex = 0;
      } else if (this.currentPattern === 2) {
        this.shipPatternState = 'dual';
        this.shipPatternTimer = 0;
        this.shipPatternIndex = 0;
      } else if (this.currentPattern === 3) {
        this.shipPatternState = 'dual';
        this.shipPatternTimer = 0;
        this.shipPatternIndex = 0;
      } else if (this.currentPattern === 4 || this.currentPattern === 5) {
        this.shipPatternState = 'orbit';
        this.shipPatternTimer = 0;
        this.shipCircleDirection = this.currentPattern === 4 ? 1 : -1;
        this.shipCircleStartAngle = -Math.PI / 2;
        this.shipCircleAngle = this.shipCircleStartAngle;
        this.shipCircleElapsed = 0;
        this.shipCircleDuration = 7.0;
        if (this.currentPattern === 4) this.shipCircleDirection = 1;
        showFloatingText(this.currentPattern === 4 ? "↻ 함선 선회 기동" : "↺ 함선 선회 기동", width / 2, height * 0.26, '#fca5a5');
      }
      return;
    }

    if (this.shipMode === 2) {
      this.shipPatternState = 'recovery';
      this.shipPatternTimer = 0;
      this.shipDebrisCounter = 0;
      this.beginShipRecovery();
      return;
    }

    // mode 3
    this.shipPatternState = 'assault';
    this.shipPatternTimer = 0;
    this.shipPatternIndex = 0;
    this.shipChargeIndex = 0;
    this.shipChargeTimer = 0;
    this.shipChargeState = null;
    if (this.currentPattern === 1) {
      const formationY = Math.max(72 * scale, Math.min(height * 0.42, height * (0.22 + Math.random() * 0.16)));
      const formationXs = [0.18, 0.39, 0.61, 0.82];
      this.shipDrones = [];
      for (let i = 0; i < formationXs.length; i++) {
        const side = i < formationXs.length / 2 ? -1 : 1;
        this.shipDrones.push({
          x: b.x + side * 34 * scale, y: b.y + 22 * scale,
          radius: 10 * scale, side, state: 'roam', shots: 0, lastShot: 0,
          roamTarget: this.getWarshipDroneRoamPoint(),
          roamElapsed: 0, roamDuration: 3.4 + Math.random() * 1.4,
          retargetTimer: 0.45 + Math.random() * 0.45,
          lineTarget: { x: width * formationXs[i], y: formationY }, angle: Math.PI / 2
        });
      }
      showFloatingText("⚠️ 전장 기동 드론 전개!", b.x, b.y + b.radius + 22 * scale, '#fca5a5');
      // 드론은 이후 패턴과 병행한다. 패턴 발동 즉시 다음 패턴 준비를 시작한다.
      this.setCooldown();
    } else if (this.currentPattern === 2) {
      this.shipHazard = { x: player.x, y: player.y, radius: 155 * scale * 0.7, age: 0, bombardTimer: 0, damageTimer: 0 };
    } else if (this.currentPattern === 3) {
      this.spawnShipDebrisPair();
      this.setShipNextPatternCountdown();
    } else if (this.currentPattern === 4) {
      this.shipCircleDirection = Math.random() < 0.5 ? 1 : -1;
      this.shipCircleStartAngle = -Math.PI / 2;
      this.shipCircleAngle = this.shipCircleStartAngle;
      this.shipCircleElapsed = 0;
      this.shipCircleDuration = 7.0;
    } else if (this.currentPattern === 5) {
      const points = [0.2, 0.5, 0.8];
      const order = points.sort(() => Math.random() - 0.5);
      order.push(order[Math.floor(Math.random() * 3)]);
      this.shipChargeTargets = order;
      this.shipChargeIndex = 0;
      this.shipChargeTimer = 0;
      this.shipChargeState = 'move';
      this.shipPatternLastShot = 0;
    }
  },

  getWarshipDroneRoamPoint() {
    const margin = 40 * scale;
    return {
      x: margin + Math.random() * Math.max(1, width - margin * 2),
      y: Math.max(margin, height * 0.14) + Math.random() * Math.max(1, height * 0.68 - margin)
    };
  },

  updateWarshipAssaultDrones(dt, b) {
    for (const d of this.shipDrones) {
      if (d.state === 'done') continue;
      if (d.state === 'roam') {
        d.roamElapsed += dt;
        d.retargetTimer -= dt;
        const point = d.roamTarget || (d.roamTarget = this.getWarshipDroneRoamPoint());
        const dx = point.x - d.x, dy = point.y - d.y;
        const dist = Math.hypot(dx, dy);
        const step = Math.min(dist, 145 * scale * dt);
        if (dist > 0.001) { d.x += dx / dist * step; d.y += dy / dist * step; }
        if (dist < 10 * scale || d.retargetTimer <= 0) {
          d.roamTarget = this.getWarshipDroneRoamPoint();
          d.retargetTimer = 0.55 + Math.random() * 0.6;
        }
        if (d.roamElapsed >= d.roamDuration) d.state = 'lineup';
      } else if (d.state === 'lineup') {
        const dx = d.lineTarget.x - d.x, dy = d.lineTarget.y - d.y;
        const dist = Math.hypot(dx, dy);
        const step = Math.min(dist, 205 * scale * dt);
        if (dist > 0.001) { d.x += dx / dist * step; d.y += dy / dist * step; }
        if (dist < 5 * scale) { d.x = d.lineTarget.x; d.y = d.lineTarget.y; d.state = 'fire'; d.lastShot = 0; }
      } else if (d.state === 'fire') {
        d.lastShot += dt;
        if (d.lastShot >= 0.24 && d.shots < 10) {
          d.lastShot = 0;
          d.shots++;
          this.bossBullets.push({
            x: d.x, y: d.y, vx: 0, vy: 5.8 * scale,
            radius: 3.2 * scale, color: '#ef4444'
          });
        }
        if (d.shots >= 10) d.state = 'return';
      } else if (d.state === 'return') {
        const returnX = b.x + d.side * 34 * scale;
        const returnY = b.y + 22 * scale;
        const dx = returnX - d.x, dy = returnY - d.y;
        const dist = Math.hypot(dx, dy);
        const step = Math.min(dist, 115 * scale * dt);
        if (dist > 0.001) { d.x += dx / dist * step; d.y += dy / dist * step; }
        if (dist < 5 * scale) d.state = 'done';
      }
    }
    if (this.shipDrones.length && this.shipDrones.every(d => d.state === 'done')) this.shipDrones = [];
  },

  beginShipRecovery() {
    const b = this.activeBoss;
    if (!b) return;
    const target = !b.parts.left.alive ? b.parts.left : b.parts.right;
    const source = b.parts.left.alive ? b.parts.left : b.parts.right;
    if (!target || !source) return;

    const positions = this.getWarshipPartPositions();
    const start = { x: positions[source.id].x, y: positions[source.id].y };
    const targetPoint = { x: positions[target.id].x, y: positions[target.id].y };
    const dx = targetPoint.x - start.x;
    const dy = targetPoint.y - start.y;
    const distance = Math.hypot(dx, dy);
    const radius = distance * 0.5;
    const dir = distance > 0.001 ? { x: dx / distance, y: dy / distance } : { x: 1, y: 0 };
    const perp = { x: -dir.y, y: dir.x };

    this.shipRecoveryTarget = target;
    this.shipRecoveryProtectedPart = source;
    this.shipRecoveryStart = start;
    this.shipRecoveryTargetPoint = targetPoint;
    this.shipRecoveryCenter = { x: (start.x + targetPoint.x) * 0.5, y: (start.y + targetPoint.y) * 0.5 };
    this.shipRecoveryRadius = radius;
    this.shipRecoveryDir = dir;
    this.shipRecoveryPerp = perp;
    // 좌 포탑 → 우 포탑은 반시계, 우 포탑 → 좌 포탑은 시계 방향으로
    // 항상 화면 아래쪽을 크게 경유하는 반원 궤적을 만든다.
    this.shipRecoveryArcStart = source.id === 'left' ? Math.PI : 0;
    this.shipRecoveryArcDirection = source.id === 'left' ? -1 : 1;

    const drone = {
      x: start.x, y: start.y, radius: 13 * scale,
      hp: Math.max(1, source.hp * 1.5),
      maxHp: Math.max(1, source.hp * 1.5),
      sourceHp: Math.max(1, source.hp), targetId: target.id,
      isBossEntity: true, isShipRecoveryDrone: true,
      recoveryElapsed: 0, recoveryDuration: 30,
      startX: start.x, startY: start.y,
      targetX: targetPoint.x, targetY: targetPoint.y,
      alive: true
    };
    this.shipRecoveryDrone = drone;
    enemies.push(drone);
    this.spawnShipRecoveryElite();
    showFloatingText(`🟢 ${target.name} 수리 드론 출격! (약 30초)`, b.x, b.y + b.radius + 22 * scale, '#22c55e');
  },

  spawnShipRecoveryElite() {
    const b = this.activeBoss;
    if (!b) return;
    const type = 1 + Math.floor(Math.random() * 3);
    const pBase = typeof getEnemyBaseHp === 'function' ? getEnemyBaseHp(currentPhase) : 2;
    const speedMult = typeof getEliteSpeedMult === 'function' ? getEliteSpeedMult() : 1;
    const x = b.x, y = b.y + 8 * scale;
    let elite;

    if (type === 1) {
      const hp = pBase * 40;
      elite = { x, y, radius: 34 * scale, speed: 0.35 * scale * speedMult, hp, maxHp: hp, isElite: true, eliteType: 1, splitStage: 0, isSplitChild: false };
    } else if (type === 2) {
      const hp = pBase * 30;
      elite = { x, y, radius: 19 * scale, speed: 0.25 * scale * speedMult, hp, maxHp: hp, isElite: true, eliteType: 2, shootTimer: 1.0, isSplitChild: false };
    } else {
      const hp = pBase * 35;
      elite = { x, y, radius: 18 * scale, speed: 1.25 * scale * speedMult, hp, maxHp: hp, isElite: true, eliteType: 3, dashState: 'idle', dashTimer: 1.8, dashAngle: 0, slowTimer: 0, isSplitChild: false };
    }
    enemies.push(elite);
    showFloatingText("⚠️ 수리 지원 엘리트 출격!", x, y - 24 * scale, '#fca5a5');
  },

  spawnShipRecoveryDebris() {
    const b = this.activeBoss;
    if (!b || !this.shipRecoveryTarget) return;
    const side = this.shipRecoveryTarget.id === 'left' ? -1 : 1;
    const x = b.x + side * 35 * scale;
    const y = b.y + 24 * scale;
    const angle = Math.atan2(player.y - y, player.x - x);
    enemies.push({
      x, y, radius: 16 * scale,
      speed: 0.45 * scale,
      hp: 1, maxHp: 1,
      isBossEntity: true,
      isShipUnbreakableDebris: true,
      debrisSide: side,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.08,
      vx: Math.cos(angle) * 0.45 * scale,
      vy: Math.sin(angle) * 0.45 * scale
    });
  },

  spawnShipDebrisPair() {
    const b = this.activeBoss;
    if (!b) return;
    const pBase = typeof getEnemyBaseHp === 'function' ? getEnemyBaseHp(currentPhase) : 2;
    const hp = Math.max(2, Math.floor(pBase * 40 * 0.5));
    const spawnY = Math.max(54 * scale, b.y + 46 * scale);

    // 기존 필드의 엘리트 분열 거체와 동일한 적 정의를 사용하되,
    // 이 패턴에서만 체력을 절반으로 낮춘 두 기를 고정 소환한다.
    for (const side of [-1, 1]) {
      const x = Math.max(34 * scale, Math.min(width - 34 * scale, b.x + side * 72 * scale));
      enemies.push({
        x, y: spawnY,
        radius: 34 * scale,
        speed: 0.35 * scale * (typeof getEliteSpeedMult === 'function' ? getEliteSpeedMult() : 1),
        hp, maxHp: hp,
        isElite: true, eliteType: 1, splitStage: 0,
        isSplitChild: false,
        isWarshipPatternEntity: true
      });
    }

    showFloatingText("⚠️ 약화된 분열 거체 2기 출격!", width / 2, height * 0.3, '#fca5a5');
  },

  splitShipDebris(e) {
    if (!e.isShipDestructibleDebris || e.shipDebrisStage >= 1) return;
    const childHp = Math.max(1, Math.floor(e.maxHp / 2));
    const childR = Math.max(7 * scale, e.radius * 0.62);
    for (const dir of [-1, 1]) {
      const a = Math.atan2(player.y - e.y, player.x - e.x) + dir * 0.45;
      enemies.push({
        x: e.x, y: e.y, radius: childR,
        speed: 1.0 * scale,
        hp: childHp, maxHp: childHp,
        isBossEntity: true,
        isShipDestructibleDebris: true,
        shipDebrisStage: 1,
        vx: Math.cos(a) * 1.0 * scale,
        vy: Math.sin(a) * 1.0 * scale
      });
    }
  },

  handleShipEntityDeath(e, index) {
    if (!e || !e.isBossEntity) return;
    if (index >= 0 && enemies[index] === e) enemies.splice(index, 1);
    addExplosion(e.x, e.y, e.isShipRecoveryDrone ? '#22c55e' : '#fca5a5', 16);
    Sound.playExplosion(false);

    if (e.isShipRecoveryDrone) {
      this.shipRecoveryDrone = null;
      this.shipRecoveryProtectedPart = null;
      this.shipRecoveryArcStart = 0;
      this.shipRecoveryArcDirection = 1;
      if (this.shipRecoveryTarget && this.activeBoss) {
        const target = this.shipRecoveryTarget;
        const source = target.id === 'left' ? this.activeBoss.parts.right : this.activeBoss.parts.left;
        target.alive = false;
        target.hp = 0;
        if (gameMode !== 'bossrush') items.push({
          x: this.getWarshipPartPositions()[target.id].x,
          y: this.getWarshipPartPositions()[target.id].y,
          vx: 0, vy: 0, radius: 8.5 * scale,
          shape: 'circle', kind: 'heal', color: '#2ecc71', label: 'HP+', name: '체력 / 보호막', isStationary: true
        });
        showFloatingText(gameMode === 'bossrush' ? '수리 드론 격추!' : '🟢 수리 드론 격추! 회복 아이템 드롭!', e.x, e.y - 18 * scale, '#22c55e');
        if (source.alive) {
          source.alive = false;
          source.hp = 0;
          addExplosion(this.getWarshipPartPositions()[source.id].x, this.getWarshipPartPositions()[source.id].y, '#ef4444', 20);
        }
        this.syncWarshipMode();
        this.shipModeChanged = true;
      }
      return;
    }

    if (e.isShipDestructibleDebris) this.splitShipDebris(e);
  },

  setShipNextPatternCountdown() {
    this.shipPatternTimer = 0;
  },

  endWarshipPattern(transition = true) {
    if (this.shipRecoveryDrone && this.currentPattern !== 1) return;
    if (transition) this.syncWarshipMode();
    this.setCooldown();
    if (this.shipModeChanged) {
      this.shipModeChanged = false;
      this.patternQueue = [];
    }
  },

  updateWarshipPatterns(dt) {
    const b = this.activeBoss;
    if (!b) return;
    this.shipPatternTimer += dt;
    const positions = this.getWarshipPartPositions();

    if (this.shipMode === 1) {
      if (this.currentPattern === 1) {
        const interval = 0.09;
        const shotsPerCycle = 16;
        const cycleDuration = shotsPerCycle * interval + 0.45;
        if (this.shipPatternTimer >= interval && this.shipPatternIndex < shotsPerCycle * 2) {
          this.shipPatternTimer = 0;
          const totalIndex = this.shipPatternIndex;
          const cycleIndex = totalIndex % shotsPerCycle;
          const t = cycleIndex / (shotsPerCycle - 1);
          const spread = Math.PI * 0.78 * t;
          for (const p of [b.parts.left, b.parts.right]) {
            if (!p.alive) continue;
            const pp = positions[p.id];
            const centerAngle = Math.atan2(player.y - pp.y, player.x - pp.x);
            for (const a of [centerAngle - spread, centerAngle + spread]) {
              this.bossBullets.push({
                x: pp.x, y: pp.y,
                vx: Math.cos(a) * 2.5 * scale,
                vy: Math.sin(a) * 2.5 * scale,
                radius: 3.2 * scale, color: '#ef4444'
              });
            }
          }
          this.shipPatternIndex++;
        }
        if (this.shipPatternIndex >= shotsPerCycle * 2 && this.shipPatternTimer >= cycleDuration - 0.05) {
          this.endWarshipPattern();
        }
      } else if (this.currentPattern === 2 || this.currentPattern === 3) {
        const launcher = this.currentPattern === 2 ? b.parts.left : b.parts.right;
        const laserPart = this.currentPattern === 2 ? b.parts.right : b.parts.left;
        if (!launcher.alive || !laserPart.alive) { this.endWarshipPattern(); return; }

        if (!this.shipPatternStateLaser) {
          this.shipPatternStateLaser = { elapsed: 0, missileTimer: 0 };
        }
        this.shipPatternStateLaser.elapsed += dt;
        this.shipPatternStateLaser.missileTimer += dt;

        if (this.shipPatternStateLaser.missileTimer >= 1.0 && this.shipPatternStateLaser.elapsed <= 5.0) {
          this.shipPatternStateLaser.missileTimer -= 1.0;
          const lp = positions[launcher.id];
          const missileHp = Math.max(1, Math.round((typeof getEnemyBaseHp === 'function' ? getEnemyBaseHp(currentPhase) : 1) * 10));
          enemyBullets.push({
            x: lp.x, y: lp.y, vx: 0, vy: 0,
            radius: 8.5 * scale, hp: missileHp, maxHp: missileHp,
            isDestructible: true, isHoming: true, isShipHomingMissile: true, damage: 1, color: '#ff4d4d'
          });
          Sound.playEnemyShoot();
        }

        const third = width / 3;
        const sideWidth = width * 0.5;
        const leftSide = this.currentPattern === 3;
        const x = leftSide ? 0 : width * 0.5;
        const laser = this.lasers.find(l => l.isShipSideLaser);
        if (!laser) {
          this.lasers.push({
            type: 'ship_side', x, width: sideWidth,
            // 실제 측면 레이저가 화면을 가르기 전에 1초간 위험 영역을 보여 준다.
            warnTimer: 1.0, fireTimer: 5.0, active: false, isShipSideLaser: true, huge: true
          });
        }

        if (this.shipPatternStateLaser.elapsed >= 5.0) {
          this.lasers = this.lasers.filter(l => !l.isShipSideLaser);
          this.shipPatternStateLaser = null;
          this.endWarshipPattern();
        }
      } else if (this.currentPattern === 4 || this.currentPattern === 5) {
        this.shipCircleElapsed += dt;
        const progress = Math.min(1, this.shipCircleElapsed / this.shipCircleDuration);
        const centerX = width / 2, centerY = height * 0.52;
        const rx = Math.max(width * 0.42, 105 * scale), ry = Math.max(height * 0.39, 170 * scale);
        this.shipCircleAngle = this.shipCircleStartAngle + this.shipCircleDirection * progress * Math.PI * 2;
        b.x = centerX + Math.cos(this.shipCircleAngle) * rx;
        b.y = centerY + Math.sin(this.shipCircleAngle) * ry;

        if (!this.shipPatternStateAim) {
          this.shipPatternStateAim = { aimTimer: 0, shotTimer: 0, shotCooldown: 0, lockedAngle: null };
        }
        const state = this.shipPatternStateAim;
        state.aimTimer += dt;
        state.shotTimer += dt;
        state.shotCooldown -= dt;

        // 선회 이동으로 갱신된 실제 포탑 좌표를 사용해야 조준선이 어긋나지 않는다.
        const livePositions = this.getWarshipPartPositions();
        const firingTurret = this.currentPattern === 4 ? b.parts.left : b.parts.right;
        const zoningTurret = this.currentPattern === 4 ? b.parts.right : b.parts.left;

        if (firingTurret.alive && !this.beams.some(bm => bm.isShipAimBeam && bm.active)) {
          const fp = livePositions[firingTurret.id];
          if (state.aimTimer >= 1.1 && state.shotCooldown <= 0) {
            state.aimTimer = 0;
            state.shotCooldown = 0.9;
            const angle = Math.atan2(player.y - fp.y, player.x - fp.x);
            this.beams.push({
              follow: false, ox: fp.x, oy: fp.y, angle,
              width: 4 * scale, baseWidth: 4 * scale, activeWidth: 16 * scale,
              warnTimer: 0.8, fireTimer: 0.3, active: false, tracking: true, turnSpeedWarn: 30, turnSpeedFire: 0,
              color: '#ef4444', isShipAimBeam: true, shipTurretId: firingTurret.id, targetX: player.x, targetY: player.y
            });
          }
        }

        if (zoningTurret.alive) {
          const zp = livePositions[zoningTurret.id];
          if (state.shotTimer >= 0.55) {
            state.shotTimer = 0;
            const a = Math.atan2(player.y - zp.y, player.x - zp.x);
            this.bossBullets.push({
              x: zp.x, y: zp.y,
              vx: Math.cos(a) * 3.4 * scale,
              vy: Math.sin(a) * 3.4 * scale,
              radius: 17 * scale, color: '#facc15', isLargeZoningBullet: true
            });
          }
        }

        if (progress >= 1) {
          this.shipPatternStateAim = null;
          this.shipZoningBulletTimer = 0;
          b.x = width / 2;
          b.y = b.targetY;
          this.endWarshipPattern();
        }
      }
      return;
    }

    if (this.shipMode === 2) {
      if (!this.shipRecoveryDrone) {
        this.syncWarshipMode();
        this.setCooldown();
        return;
      }
      const d = this.shipRecoveryDrone;
      d.recoveryElapsed += dt;
      const t = Math.min(1, d.recoveryElapsed / d.recoveryDuration);

      const center = this.shipRecoveryCenter;
      const radius = this.shipRecoveryRadius;
      if (center && Number.isFinite(radius)) {
        const theta = this.shipRecoveryArcStart + this.shipRecoveryArcDirection * Math.PI * t;
        d.x = center.x + Math.cos(theta) * radius;
        d.y = center.y + Math.sin(theta) * radius;
      }

      if (this.shipRecoveryDebrisTimer <= 0) this.shipRecoveryDebrisTimer = 8.0;
      this.shipRecoveryDebrisTimer -= dt;
      if (this.shipRecoveryDebrisTimer <= 0) {
        this.shipRecoveryDebrisTimer += 8.0;
        this.spawnShipRecoveryDebris();
      }

      if (t >= 1) {
        const target = this.shipRecoveryTarget;
        const source = target.id === 'left' ? b.parts.right : b.parts.left;
        const amount = Math.floor(source.hp * 0.5);
        target.alive = true;
        target.maxHp = source.maxHp;
        target.hp = Math.min(target.maxHp, Math.max(1, amount));
        target.flash = 1;
        const idx = enemies.indexOf(d);
        if (idx >= 0) enemies.splice(idx, 1);
        this.shipRecoveryDrone = null;
        this.shipRecoveryProtectedPart = null;
        this.shipRecoveryDebrisTimer = 0;
        showFloatingText(`🔧 ${target.name} 복구! HP ${Math.round(amount)} 회복`, target.x, target.y - 22 * scale, '#22c55e');
        this.shipRecoveryStart = null;
        this.shipRecoveryTargetPoint = null;
        this.shipRecoveryCenter = null;
        this.shipRecoveryDir = null;
        this.shipRecoveryPerp = null;
        this.shipRecoveryArcStart = 0;
        this.shipRecoveryArcDirection = 1;
        this.patternQueue = [];
        this.syncWarshipMode();
        this.setCooldown();
      }
      return;
    }

    // Mode 3
    if (this.currentPattern === 1) {
      // 드론 갱신은 update()에서 패턴과 다음 쿨다운에 걸쳐 독립적으로 처리한다.
    } else if (this.currentPattern === 2) {
      const hz = this.shipHazard;
      if (!hz) { this.setCooldown(); return; }
      hz.age += dt;
      const hazardDx = player.x - hz.x, hazardDy = player.y - hz.y;
      const hazardDistance = Math.hypot(hazardDx, hazardDy);
      const hazardStep = Math.min(hazardDistance, Math.max(0, player.speed || 0) * 0.3 * dt);
      if (hazardDistance > 0.001) {
        hz.x += hazardDx / hazardDistance * hazardStep;
        hz.y += hazardDy / hazardDistance * hazardStep;
      }
      hz.damageTimer += dt;

      if (hz.age >= 2.0) {
        hz.bombardTimer += dt;
        if (hz.bombardTimer >= 0.34) {
          hz.bombardTimer = 0;
          const a = Math.random() * Math.PI * 2;
          const rr = Math.sqrt(Math.random()) * hz.radius * 0.82;
          this.markers.push({ x: hz.x + Math.cos(a) * rr, y: hz.y + Math.sin(a) * rr, radius: 28 * scale, timer: 0.42, maxTimer: 0.42, color: '#ef4444' });
        }
        if (hz.damageTimer >= 0.22) {
          hz.damageTimer = 0;
          if (Math.hypot(player.x - hz.x, player.y - hz.y) < hz.radius + player.radius) takeDamage();
        }
      }
      if (hz.age >= 7.0) { this.shipHazard = null; this.endWarshipPattern(false); }
    } else if (this.currentPattern === 3) {
      // Pattern activation immediately starts the cooldown/next-pattern preparation.
      if (this.shipPatternTimer >= 1.0) this.endWarshipPattern(false);
    } else if (this.currentPattern === 4) {
      this.shipCircleElapsed += dt;
      const progress = Math.min(1, this.shipCircleElapsed / this.shipCircleDuration);
      const centerX = width / 2, centerY = height * 0.52;
      const rx = Math.max(width * 0.42, 105 * scale), ry = Math.max(height * 0.39, 170 * scale);
      this.shipCircleAngle = this.shipCircleStartAngle + this.shipCircleDirection * progress * Math.PI * 2;
      b.x = centerX + Math.cos(this.shipCircleAngle) * rx;
      b.y = centerY + Math.sin(this.shipCircleAngle) * ry;
      if (!this.shipPatternLastShot) this.shipPatternLastShot = 0;
      this.shipPatternLastShot += dt;
      if (this.shipPatternLastShot >= 0.28) {
        this.shipPatternLastShot = 0;
        const a = Math.atan2(player.y - b.y, player.x - b.x);
        for (const spread of [-0.16, 0, 0.16]) {
          const shotA = a + spread;
          this.bossBullets.push({
            x: b.x, y: b.y,
            vx: Math.cos(shotA) * 7.2 * scale,
            vy: Math.sin(shotA) * 7.2 * scale,
            radius: 3.8 * scale, color: '#ef4444'
          });
        }
      }
      if (progress >= 1) {
        this.shipPatternLastShot = 0;
        b.x = width / 2; b.y = b.targetY;
        this.endWarshipPattern(false);
      }
    } else if (this.currentPattern === 5) {
      const targets = this.shipChargeTargets;
      if (!Array.isArray(targets) || targets.length === 0) { this.endWarshipPattern(false); return; }
      // 중단/재개 중 남은 인덱스나 상태값이 있어도 P5가 패턴 상태에 고정되지 않게 보정한다.
      if (!['move', 'warning', 'return'].includes(this.shipChargeState)) this.shipChargeState = 'move';
      if (!Number.isInteger(this.shipChargeIndex) || this.shipChargeIndex < 0 || this.shipChargeIndex >= targets.length) this.shipChargeState = 'return';
      const moveShipTo = (targetX, targetY, speed) => {
        const dx = targetX - b.x, dy = targetY - b.y;
        const distance = Math.hypot(dx, dy);
        const step = Math.min(distance, speed * scale * dt);
        if (distance > 0.001) { b.x += dx / distance * step; b.y += dy / distance * step; }
        return distance <= 4 * scale;
      };
      const fireSlowYellowShot = () => {
        const a = Math.atan2(player.y - b.y, player.x - b.x);
        this.bossBullets.push({
          x: b.x, y: b.y + 28 * scale,
          vx: Math.cos(a) * 3.4 * scale, vy: Math.sin(a) * 3.4 * scale,
          radius: 9 * scale, color: '#facc15', isLargeZoningBullet: true
        });
      };

      if (this.shipChargeState === 'move') {
        const targetX = width * targets[this.shipChargeIndex];
        this.shipPatternLastShot += dt;
        if (this.shipPatternLastShot >= 0.62) {
          this.shipPatternLastShot = 0;
          fireSlowYellowShot();
        }
        if (moveShipTo(targetX, b.targetY, 190)) {
          b.x = targetX; b.y = b.targetY;
          this.shipChargeState = 'warning';
          this.shipChargeTimer = 0.32;
          const pp = { x: b.x, y: b.y + 58 * scale };
          this.markers.push({ x: pp.x, y: pp.y, radius: 52 * scale, timer: 0.32, maxTimer: 0.32, color: '#ff2020', shipChargeMarker: true });
          this.beams.push({
            follow: false, ox: pp.x, oy: pp.y, angle: Math.PI / 2,
            width: 30 * scale, baseWidth: 30 * scale, warnTimer: 0.32, fireTimer: 0.9,
            active: false, tracking: false, color: '#ef4444', isShipPierceCharge: true
          });
        }
      } else if (this.shipChargeState === 'warning') {
        this.shipChargeTimer -= dt;
        if (this.shipChargeTimer <= 0) {
          const pp = { x: b.x, y: b.y + 58 * scale };
          this.bossBullets.push({
            x: pp.x, y: pp.y, vx: 0, vy: 9.5 * scale,
            radius: 13 * scale, length: 130 * scale, color: '#ff1f1f', isPiercing: true, hitPlayerOnce: false
          });
          this.shipChargeIndex++;
          this.shipChargeState = this.shipChargeIndex >= targets.length ? 'return' : 'move';
          this.shipPatternLastShot = 0;
        }
      } else if (this.shipChargeState === 'return') {
        if (moveShipTo(width / 2, b.targetY, 205)) {
          b.x = width / 2; b.y = b.targetY;
          this.shipChargeState = null;
          this.shipChargeTargets = [];
          this.shipPatternLastShot = 0;
          this.endWarshipPattern(false);
        }
      }
    }
  },

  showBossBar(name) {
    if (!this.bossBarContainer) this.init();
    this.bossNameEl.textContent = name;
    this.bossNameEl.style.color = '';
    this.bossHpFill.style.width = '100%';
    this.bossBarContainer.style.display = 'block';
  },

  hideBossBar() {
    if (this.bossBarContainer) {
      this.bossBarContainer.style.display = 'none';
    }
  },

  updateWarshipBossBar() {
    if (!this.activeBoss || this.bossType !== 'warship') return;
    const parts = this.activeBoss.parts;
    const exposedCore = !parts.left.alive && !parts.right.alive;
    const total = parts.left.hp + parts.right.hp + (exposedCore ? parts.core.hp : parts.core.maxHp);
    const max = parts.left.maxHp + parts.right.maxHp + (exposedCore ? parts.core.maxHp : parts.core.maxHp);
    this.bossHpFill.style.width = `${Math.max(0, Math.min(1, total / max)) * 100}%`;
    let label = 'FINAL BOSS : CRIMSON DREADNOUGHT';
    if (this.shipMode === 1) label += ' · 좌/우 포탑';
    else if (this.shipMode === 2) label += ' · 수리 중';
    else label += ' · 중앙 갑판';
    this.bossNameEl.textContent = label;
  },

  // source는 공격이 날아온 위치다. 팬텀만 이를 이용해 전방/측면/후방을 판정한다.
  takeDamage(amount, targetPart = null, damageColor = '#ffffff', source = null, attackKind = null) {
    if (!this.activeBoss) return;

    if (this.bossType === 'warship') {
      const b = this.activeBoss;
      let part = targetPart;
      if (!part || !b.parts[part.id]) part = this.getWarshipCombatPartAt(player.x, player.y, 0);
      if (!part || !part.alive) return;
      if (this.shipRecoveryDrone && this.shipRecoveryProtectedPart === part) return { blocked: true, multiplier: 0 };
      if (part.id === 'core' && (b.parts.left.alive || b.parts.right.alive)) return;
      const damage = typeof roundDamage === 'function' ? Math.max(0.01, roundDamage(amount)) : amount;
      part.hp = Math.max(0, (typeof roundDamage === 'function' ? roundDamage(part.hp - damage) : part.hp - damage));
      if (typeof showDamageNumber === 'function') {
        const pp = this.getWarshipPartPositions()[part.id];
        showDamageNumber(damage, pp.x, pp.y, damageColor, 100);
      }
      part.flash = 0.08;
      if (part.hp <= 0) {
        part.hp = 0;
        part.alive = false;
        const pp = this.getWarshipPartPositions()[part.id];
        addExplosion(pp.x, pp.y, part.id === 'core' ? '#facc15' : '#ef4444', part.id === 'core' ? 45 : 28);
        Sound.playExplosion(true);
        showFloatingText(`💥 ${part.name} 파괴!`, pp.x, pp.y - part.radius - 18 * scale, '#ef4444');
        if (part.id !== 'core') {
          this.syncWarshipMode();
          this.shipModeChanged = true;
          this.patternQueue = [];
          if (this.state === 'pattern') this.setCooldown();
        } else {
          this.onBossDefeated();
          return;
        }
      }
      this.updateWarshipBossBar();
      return;
    }

    // 페이즈 전환 중에는 시간 코어가 닫혀 있어 전투 상태가 섞이지 않는다.
    if (this.bossType === 'chronos' && this.activeBoss.chronos?.transition) {
      return { blocked: true, multiplier: 0 };
    }

    if (this.bossType === 'phantom') {
      const hit = this.getPhantomHitZone(source?.x ?? player.x, source?.y ?? player.y);
      if (hit === 'front') {
        this.registerPhantomShieldBlock();
        return { blocked: true, multiplier: 0 };
      }
      amount *= hit === 'rear' ? 1.5 : 1.0;
    }

    let arsenalMultiplier = 1;
    if (this.bossType === 'arsenal' && this.activeBoss.arsenal) {
      const resolvedAttackKind = attackKind || player.weaponType || 'default';
      arsenalMultiplier = this.getArsenalShieldMultiplier(resolvedAttackKind);
      amount *= arsenalMultiplier;
      this.activeBoss.arsenal.shieldFlash = 0.13;
    }

    const damage = typeof roundDamage === 'function' ? Math.max(0.01, roundDamage(amount)) : amount;
    this.activeBoss.hp = Math.max(0, (typeof roundDamage === 'function' ? roundDamage(this.activeBoss.hp - damage) : this.activeBoss.hp - damage));
    if (typeof showDamageNumber === 'function') showDamageNumber(damage, this.activeBoss.x, this.activeBoss.y, damageColor, 100);

    if (gameMode === 'normal' && this.bossType === 'mini' && this.activeBoss.hp <= 100) {
      this.activeBoss.hp = 0;
      this.hideBossBar();
      this.resetProjectiles();
      triggerGundamEnding();
      return;
    }

    const ratio = Math.max(0, this.activeBoss.hp / this.activeBoss.maxHp);
    this.bossHpFill.style.width = `${(ratio * 100).toFixed(1)}%`;
    if (this.bossType === 'chronos') {
      this.bossNameEl.textContent = `FINAL BOSS : CHRONOS · PHASE ${this.activeBoss.chronos.phase}`;
    } else if (this.bossType === 'arsenal') {
      this.updateArsenalBossBar();
    }

    if (this.activeBoss.hp <= 0) {
      this.onBossDefeated();
    }
    return {
      blocked: false,
      multiplier: this.bossType === 'phantom' && this.getPhantomHitZone(source?.x ?? player.x, source?.y ?? player.y) === 'rear'
        ? 1.5
        : arsenalMultiplier
    };
  },

  onBossDefeated() {
    if (gameMode === 'bossrush' && BossRush.state !== 'combat') return;
    Sound.playExplosion(true);
    addExplosion(this.activeBoss.x, this.activeBoss.y, '#facc15', 35);
    showFloatingText("🏆 BOSS DESTROYED!!", width / 2, height * 0.35, '#ffd32a');
    score += this.bossType === 'mini' ? 5000 : (this.bossType === 'laser' ? 7000 : ((this.bossType === 'warship' || this.bossType === 'chronos') ? 22000 : 15000));

    for (let i = 0; i < (gameMode === 'bossrush' ? 0 : 3); i++) {
      const angle = (i * Math.PI * 2 / 3);
      items.push({
        x: this.activeBoss.x + Math.cos(angle) * 30 * scale,
        y: this.activeBoss.y + Math.sin(angle) * 30 * scale,
        vx: Math.cos(angle) * 0.35 * scale,
        vy: Math.sin(angle) * 0.35 * scale,
        radius: 8.5 * scale,
        shape: 'circle',
        kind: 'heal',
        color: '#2ecc71',
        label: 'HP+',
        name: '체력 / 보호막'
      });
    }

    // 전투 중 4종 무장으로 제한됐던 빌드를 보스전 뒤 원래 7종 풀로 되돌릴 수 있게 한다.
    if (this.bossType === 'arsenal' && gameMode !== 'bossrush') {
      const roulettePool = ['omni', 'laser', 'drone', 'pulse', 'blackhole', 'flame', 'lightning'];
      const initialKind = roulettePool[0];
      items.push({
        x: this.activeBoss.x,
        y: this.activeBoss.y + 34 * scale,
        vx: 0,
        vy: 0.28 * scale,
        radius: 10 * scale,
        shape: 'square',
        kind: initialKind,
        color: WEAPON_META[initialKind].color,
        label: WEAPON_META[initialKind].label,
        name: WEAPON_META[initialKind].name,
        isRoulette: true,
        rouletteTimer: 1.2,
        rouletteInterval: 1.2,
        roulettePool,
        rouletteIndex: 0,
        lifeTime: 60.0
      });
    }

    const deadType = this.bossType;
    const deadTier = this.activeBoss.hardBossTier;
    this.activeBoss = null;
    this.hideBossBar();
    this.resetProjectiles();

    if (gameMode === 'bossrush') {
      BossRush.onDefeated();
      return;
    }

    // 건담급 후보에는 기존 final 타입도 포함된다. 종료 여부는 보스 타입이 아닌
    // 하드 모드에서 선택된 등급으로 판단해야 8분 보스 처치 후 진행이 이어진다.
    if (gameMode === 'hard' && deadTier === 'final') {
      Sound.stopBGM();
      setTimeout(() => {
        showHardEndingModal();
      }, 1500);
    } else if (gameMode.startsWith('practice_')) {
      Sound.stopBGM();
      setTimeout(() => {
        showPracticeClearModal(deadType);
      }, 1500);
    } else if (gameMode === 'hard' || gameMode === 'infinite') {
      Sound.playBGM('normal');
    }
  },

  resetProjectiles() {
    this.bossBullets = [];
    this.markers = [];
    this.lasers = [];
    this.specialDrops = [];
    this.delayedBombards = [];
    this.sideBitDrones = [];
    this.beams = [];
    this.containers = [];
    this.clearPhantomPortals();
    this.clearPhantomFortresses();
    this.clearChronosTemporal();
    this.clearArsenalBattleObjects();
  },

  clearChronosTemporal() {
    this.chronosBlackholes = [];
    this.chronosPreviews = [];
    this.chronosPositionStrikes = [];
    this.chronosPositionSequences = [];
    this.chronosDelayedVolleys = [];
    // 붕괴 패턴이 끝나거나 보스전이 정리되면 전용 운석만 제거한다.
    obstacles = obstacles.filter(obstacle => !obstacle.isChronosMeteor);
    this.bossBullets = this.bossBullets.filter(bullet => !bullet.isChronos);
    if (this.activeBoss?.chronos) {
      this.activeBoss.chronos.memories = [];
      this.activeBoss.chronos.positionMemory = [];
      this.activeBoss.chronos.collapseActive = false;
      this.activeBoss.chronos.flash = null;
    }
  },

  executeMiniPattern4() {
    const pBase = baseHpTable[currentPhase] || 1;
    const hp = pBase * 2;
    for (let i = 0; i < 5; i++) {
      const pos = getRandomSpawnEdge();
      enemies.push({
        x: pos.x, y: pos.y,
        radius: 8 * scale,
        speed: (1.0 + Math.random() * 0.5) * scale,
        hp: hp, maxHp: hp,
        isElite: false
      });
    }
    showFloatingText("호위 함선 출격!", this.activeBoss.x, this.activeBoss.y + 20 * scale, '#ff4757');
  },

  executeFinalPattern4() {
    const pBase = baseHpTable[currentPhase] || 1;
    for (let i = 0; i < 3; i++) {
      enemies.push({
        x: this.activeBoss.x + (i - 1) * 30 * scale,
        y: this.activeBoss.y + 20 * scale,
        radius: 7 * scale,
        speed: 2.2 * scale,
        hp: pBase, maxHp: pBase,
        isElite: false
      });
    }
    showFloatingText("고속 비트 사출!", this.activeBoss.x, this.activeBoss.y + 20 * scale, '#38bdf8');
  },

  update(dt) {
    if (!this.activeBoss) return;
    const b = this.activeBoss;

    if (b.parts) {
      for (const key of ['left','right','core']) if (b.parts[key].flash > 0) b.parts[key].flash -= dt;
    }

    if (b.eyeFlashTimer > 0) {
      b.eyeFlashTimer -= dt;
      if (b.eyeFlashTimer <= 0) {
        b.eyeFlashTimer = 0;
      }
    } else if (this.bossType === 'arsenal' && b.arsenal) {
      if (b.arsenal.shieldFlash > 0) b.arsenal.shieldFlash -= dt;
      if (b.arsenal.shieldShiftTimer > 0) b.arsenal.shieldShiftTimer -= dt;
    }
    if (this.bossType === 'phantom') {
      if (b.shieldFlash > 0) b.shieldFlash -= dt;
      if (b.shieldBlockTimer > 0) b.shieldBlockTimer -= dt;
      if (b.phantomWarning) {
        b.phantomWarning.timer -= dt;
        if (b.phantomWarning.timer <= 0) b.phantomWarning = null;
      }
    }

    if (gameState === 'playing') {
      const bodyR = b.radius * 0.85;
      if (this.bossType === 'warship') {
        const targets = this.getPlayerTargetables().filter(t => t.shipPart);
        for (const t of targets) {
          const dx = player.x - t.x, dy = player.y - t.y;
          const dist = Math.hypot(dx, dy);
          const minDist = player.radius + t.radius;
          if (dist < minDist) {
            if (player.invincibleTimer <= 0) takeDamage(1, { ignoreSuper: true });
            player.x = Math.max(player.radius, Math.min(width - player.radius, t.x + (dist > 0.001 ? dx / dist : 0) * minDist));
            player.y = Math.max(player.radius, Math.min(height - player.radius, t.y + (dist > 0.001 ? dy / dist : -1) * minDist));
            player.targetX = player.x; player.targetY = player.y;
          }
        }
      }
      const dx = player.x - b.x;
      const dy = player.y - b.y;
      const dist = Math.hypot(dx, dy);
      const minDist = player.radius + bodyR;
      if (this.bossType !== 'warship' && dist < minDist) {
        if (player.invincibleTimer <= 0) takeDamage(1, { ignoreSuper: true });

        const nx = dist > 0.001 ? dx / dist : 0;
        const ny = dist > 0.001 ? dy / dist : -1;
        player.x = Math.max(player.radius, Math.min(width - player.radius, b.x + nx * minDist));
        player.y = Math.max(player.radius, Math.min(height - player.radius, b.y + ny * minDist));
        player.targetX = player.x;
        player.targetY = player.y;
      }
    }

    if (this.state === 'entering') {
      if (this.bossType === 'laser') {
        b.spawnAlpha = Math.min(1, b.spawnAlpha + dt * 0.8);
        if (b.spawnAlpha >= 1) this.setCooldown();
      } else {
        b.y += dt * 70 * scale;
        if (b.y >= b.targetY) {
          b.y = b.targetY;
          this.setCooldown();
        }
      }
      return;
    }

    if (this.bossType === 'laser') {
      this.updatePrisms(dt);
      const isMegaLaser = (this.state === 'pattern' && this.currentPattern === 3);
      if (!isMegaLaser) {
        b.x = width / 2 + Math.sin(gameTime * 1.1) * (width * 0.16);
        b.y = b.baseY + Math.sin(gameTime * 0.8) * (height * 0.05);
      }
    } else if (this.bossType === 'warship') {
      if (!(this.state === 'pattern' && (this.currentPattern === 4 || this.currentPattern === 5))) {
        b.x += (width / 2 - b.x) * Math.min(1, dt * 1.5);
        b.y += (b.targetY - b.y) * Math.min(1, dt * 1.5);
      }
    } else if (this.bossType === 'phantom') {
      if (this.state !== 'pattern') {
        b.x += (width / 2 - b.x) * Math.min(1, dt * 2.2);
        b.y += (b.targetY - b.y) * Math.min(1, dt * 2.2);
        // 패턴 사이의 회복 시간에도 방패를 꾸준히 돌려 전투가 멈춘 느낌을 없앤다.
        b.facingAngle = this.normalizeAngle(b.facingAngle + dt * 0.58);
      }
    } else if (this.bossType === 'chronos') {
      b.x = width / 2 + Math.sin(gameTime * 0.42) * width * 0.06;
      b.y = b.targetY + Math.sin(gameTime * 0.65) * 5 * scale;
    } else if (this.bossType === 'arsenal') {
      // DISRUPTOR/OVERLOAD 이동은 패턴 함수가 직접 담당한다.
      if (this.state !== 'pattern' || ![5, 6, 11].includes(this.currentPattern)) {
        b.x += (width / 2 - b.x) * Math.min(1, dt * 2.0);
        b.y += (b.targetY - b.y) * Math.min(1, dt * 2.0);
      }
    } else if (this.bossType === 'final' && this.currentPattern === 2 && this.state === 'pattern') {
      const margin = 35 * scale;
      b.x = width / 2 + Math.sin(this.stateTimer * 2.0) * (width / 2 - margin);
    } else {
      b.x = width / 2 + Math.sin(gameTime * 1.6) * (width * 0.28);
    }
    b.angle += dt * 1.5;

    // M3-P1의 드론은 다음 패턴의 준비/실행 중에도 필드를 돌아다니고 직선 탄막을 완성한다.
    if (this.bossType === 'warship' && this.shipMode === 3 && this.shipDrones.length > 0) {
      this.updateWarshipAssaultDrones(dt, b);
    }

    const chronosLocked = this.bossType === 'chronos' && this.updateChronosState(dt, b);

    if (this.state === 'cooldown') {
      this.stateTimer += dt;
      if (!chronosLocked && this.stateTimer >= this.cooldownDuration) {
        this.startNextPattern();
      }
    } else if (this.state === 'pattern') {
      this.stateTimer += dt;
      if (this.bossType === 'mini') {
        this.updateMiniPatterns(dt);
      } else if (this.bossType === 'laser') {
        this.updateLaserPatterns(dt);
      } else if (this.bossType === 'phantom') {
        this.updatePhantomPatterns(dt);
      } else if (this.bossType === 'warship') {
        this.updateWarshipPatterns(dt);
      } else if (this.bossType === 'chronos') {
        if (!chronosLocked) this.updateChronosPatterns(dt);
      } else if (this.bossType === 'arsenal') {
        this.updateArsenalPatterns(dt);
      } else {
        this.updateFinalPatterns(dt);
      }
    }

    this.updatePhantomPortals(dt);
    if (this.bossType === 'arsenal') this.updateArsenalHazards(dt);
    this.updateProjectiles(dt);
  },

  updateMiniPatterns(dt) {
    const b = this.activeBoss;
    this.subTimer += dt;
    const speedFactor = (gameMode === 'hard') ? 0.85 : 1.0;

    if (this.currentPattern === 1) {
      if (!this.p1State) {
        this.p1State = 'preview';
        this.p1Timer = 0;
        this.p1Angle = Math.atan2(player.y - b.y, player.x - b.x);
      }

      this.p1Timer += dt;

      if (this.p1State === 'preview') {
        if (this.p1Timer >= 0.35) {
          Sound.playEnemyShoot();
          const baseAngle = this.p1Angle;
          for (let i = -2; i <= 2; i++) {
            const a = baseAngle + i * 0.18;
            this.bossBullets.push({
              x: b.x, y: b.y + 10 * scale,
              vx: Math.cos(a) * 3.8 * scale * speedFactor,
              vy: Math.sin(a) * 3.8 * scale * speedFactor,
              radius: 5 * scale, color: '#ff4757'
            });
          }
          this.patternStep++;
          this.p1State = 'delay';
          this.p1Timer = 0;
        }
      } else if (this.p1State === 'delay') {
        if (this.p1Timer >= 0.35) {
          if (this.patternStep >= 3) {
            this.p1State = null;
            this.setCooldown();
          } else {
            this.p1State = 'preview';
            this.p1Timer = 0;
            this.p1Angle = Math.atan2(player.y - b.y, player.x - b.x);
          }
        }
      }
    } else if (this.currentPattern === 2) {
      if (this.subTimer >= 0.55 && this.patternStep < 3) {
        this.subTimer = 0;
        this.patternStep++;
        Sound.playEnemyShoot();
        const a = Math.atan2(player.y - b.y, player.x - b.x);
        this.bossBullets.push({
          x: b.x, y: b.y + 10 * scale,
          vx: Math.cos(a) * 5.2 * scale * speedFactor,
          vy: Math.sin(a) * 5.2 * scale * speedFactor,
          radius: 7 * scale, color: '#facc15'
        });
        if (this.patternStep >= 3) this.setCooldown();
      }
    }
  },

  updateFinalPatterns(dt) {
    const b = this.activeBoss;
    this.subTimer += dt;
    const speedFactor = (gameMode === 'hard') ? 0.85 : 1.0;

    if (this.currentPattern === 1) {
      this.finalP1Timer += dt;

      if (this.finalP1State === 'preview') {
        if (this.finalP1Timer < 0.1) {
          this.finalP1Angle = Math.atan2(player.y - b.y, player.x - b.x);
        }
        if (this.finalP1Timer >= 0.35) {
          this.finalP1State = 'burst';
          this.finalP1Timer = 0.2;
          this.finalP1BurstCount = 0;
        }
      } else if (this.finalP1State === 'burst') {
        if (this.finalP1Timer >= 0.2) {
          this.finalP1Timer = 0;
          Sound.playShoot('laser');
          const baseAngle = this.finalP1Angle;
          for (let i = -1.5; i <= 1.5; i += 1.0) {
            const a = baseAngle + i * 0.12;
            this.bossBullets.push({
              x: b.x, y: b.y + 15 * scale,
              vx: Math.cos(a) * 7.5 * scale * speedFactor,
              vy: Math.sin(a) * 7.5 * scale * speedFactor,
              radius: 3 * scale, color: '#38bdf8'
            });
          }
          this.finalP1BurstCount++;
          if (this.finalP1BurstCount >= 3) {
            this.finalP1Cycle++;
            if (this.finalP1Cycle >= 4) {
              this.setCooldown();
            } else {
              this.finalP1State = 'preview';
              this.finalP1Timer = 0;
            }
          }
        }
      }
    } else if (this.currentPattern === 2) {
      if (this.subTimer >= 0.09 && this.patternStep < 35) {
        this.subTimer = 0;
        this.patternStep++;
        this.bossBullets.push({
          x: b.x + (Math.random() - 0.5) * 50 * scale,
          y: b.y + 20 * scale,
          vx: 0, vy: 2.4 * scale * speedFactor,
          swayTimer: Math.random() * Math.PI * 2,
          radius: 4.5 * scale, color: '#f59e0b', isSwayBullet: true
        });
      }
      if (this.stateTimer >= 4.8) this.setCooldown();
    } else if (this.currentPattern === 5) {
      if (this.patternStep === 0) {
        this.patternStep = 1;
        this.lasers.push({
          type: 'center', x: width * 0.25, width: width * 0.5,
          warnTimer: 2.0, fireTimer: 3.0, active: false
        });
      }
      if (this.stateTimer >= 4.85 && this.patternStep === 1) {
        this.patternStep = 2;
        this.lasers.push({
          type: 'left', x: 0, width: width * 0.32,
          warnTimer: 0.8, fireTimer: 2.0, active: false
        });
        this.lasers.push({
          type: 'right', x: width * 0.68, width: width * 0.32,
          warnTimer: 0.8, fireTimer: 2.0, active: false
        });

        this.sideBitDrones.push({ x: width * 0.16, y: 35 * scale, timer: 2.8, maxTimer: 2.8 });
        this.sideBitDrones.push({ x: width * 0.84, y: 35 * scale, timer: 2.8, maxTimer: 2.8 });
      }
      if (this.stateTimer >= 8.2) this.setCooldown();
    } else if (this.currentPattern === 6) {
      if (this.patternStep === 0) {
        b.eyeFlashTimer = 0.9;
        this.p6ShowWarning = true;
        Sound.playEyeFlash();
        this.patternStep = 1;
        this.dashTargetX = player.x;
        this.dashTargetY = player.y;
      } else if (this.patternStep === 1 && this.stateTimer >= 0.9) {
        b.eyeFlashTimer = 0;
        this.p6ShowWarning = false;
        this.patternStep = 2;
        Sound.playGundamBeam();
      } else if (this.patternStep === 2) {
        b.x += (this.dashTargetX - b.x) * 0.12;
        b.y += (this.dashTargetY - b.y) * 0.12;
        if (this.stateTimer >= 1.7) this.patternStep = 3;
      } else if (this.patternStep === 3) {
        b.y += (b.targetY - b.y) * 0.08;
        if (this.stateTimer >= 2.6) {
          b.y = b.targetY;
          this.setCooldown();
        }
      }
    } else if (this.currentPattern === 7) {
      if (this.patternStep === 0) {
        this.patternStep = 1;
        Sound.playGundamBeam();
        showFloatingText("⚠️ 초록 드론을 파괴하여 10초 무적을 획득하라!!", width / 2, height * 0.38, '#22c55e');

        const pBase = baseHpTable[currentPhase] || 2;
        for (let i = 0; i < 5; i++) {
          const isGreen = (i === 2);
          enemies.push({
            x: width * 0.2 + i * (width * 0.15),
            y: height * 0.45,
            radius: 8 * scale,
            speed: 0.8 * scale,
            hp: pBase, maxHp: pBase,
            isElite: false,
            isPattern7Drone: true,
            isPattern7Green: isGreen
          });
        }
      }

      if (this.stateTimer >= 10.0 && this.patternStep === 1) {
        this.patternStep = 2;
        Sound.playBomb();

        for (let i = enemies.length - 1; i >= 0; i--) {
          if (enemies[i].isPattern7Drone) {
            addExplosion(enemies[i].x, enemies[i].y, '#ff4757', 10);
            enemies.splice(i, 1);
          }
        }

        this.lasers.push({
          type: 'screen_nuke', x: 0, width: width,
          warnTimer: 0, fireTimer: 1.5, active: true
        });
      }
      if (this.stateTimer >= 12.0) this.setCooldown();
    } else if (this.currentPattern === 8) {
      this.p8Timer += dt;

      if (this.p8Phase === 'aim') {
        this.p8AimAngle = Math.atan2(player.y - b.y, player.x - b.x);
        if (this.p8Timer >= 1.0) {
          this.p8Phase = 'locked';
          this.p8LockedAngle = this.p8AimAngle;
          this.p8Timer = 0;
        }
      } else if (this.p8Phase === 'locked') {
        if (this.p8Timer >= 0.2) {
          this.p8Phase = 'fire';
          this.p8Timer = 0;
        }
      } else if (this.p8Phase === 'fire') {
        Sound.playShoot('laser');
        for (let offset of [-8, 8]) {
          this.bossBullets.push({
            x: b.x + offset * scale,
            y: b.y + 10 * scale,
            vx: Math.cos(this.p8LockedAngle) * 16.0 * scale * speedFactor,
            vy: Math.sin(this.p8LockedAngle) * 16.0 * scale * speedFactor,
            radius: 2.5 * scale,
            length: 42 * scale,
            color: '#ef4444',
            isElongatedLaser: true
          });
        }
        this.p8Step++;
        if (this.p8Step >= 5) {
          this.setCooldown();
        } else {
          this.p8Phase = 'aim';
          this.p8Timer = 0;
        }
      }
    }
  },

  updateArsenalBossBar() {
    const a = this.activeBoss?.arsenal;
    if (!a || !this.bossNameEl) return;
    const shield = this.ARSENAL_SHIELD_META[a.shieldType];
    const weapon = this.ARSENAL_WEAPON_LABELS[a.currentWeapon];
    this.bossNameEl.textContent = `ARSENAL FRAME · ${shield.label} · ${weapon}`;
    this.bossNameEl.style.color = this.ARSENAL_WEAPON_META[a.currentWeapon].color;
  },

  beginArsenalPattern(patternId) {
    const b = this.activeBoss;
    const a = b?.arsenal;
    if (!b || !a) return;
    this.currentPattern = patternId;
    this.state = 'pattern';
    this.stateTimer = 0;
    this.patternStep = 0;
    this.subTimer = 0;
    a.pattern = { timer: 0, step: 0, count: 0, shotTimer: 0, warned: false };
    this.startArsenalPattern(patternId);
  },

  startNextArsenalAction() {
    const b = this.activeBoss;
    const a = b?.arsenal;
    if (!b || !a) return;

    // 첫 교전은 반드시 실드 변화와 전용 무장 코어 규칙부터 학습시킨다.
    if (a.firstActionPending) {
      a.firstActionPending = false;
      this.beginArsenalPattern(9);
      return;
    }

    // 안전한 패턴 경계에서만 예약 이벤트를 처리한다.
    if (a.overloadPending) {
      a.overloadPending = false;
      this.beginArsenalPattern(11);
      return;
    }
    if (a.adaptiveShiftPending) {
      a.adaptiveShiftPending = false;
      this.beginArsenalPattern(9);
      return;
    }
    if (a.pendingWeapon) {
      const requested = a.pendingWeapon;
      a.pendingWeapon = null;
      this.applyArsenalWeaponChange(requested, true);
      if (a.overloadPending || a.adaptiveShiftPending) {
        this.startNextArsenalAction();
        return;
      }
    } else if (a.weaponPatternCount >= 3) {
      const choices = this.ARSENAL_WEAPONS.filter(weapon => weapon !== a.currentWeapon);
      const next = choices[Math.floor(Math.random() * choices.length)];
      this.applyArsenalWeaponChange(next, false);
      this.spawnBossWeaponCore(b.x, b.y);
      if (a.adaptiveShiftPending) {
        this.startNextArsenalAction();
        return;
      }
    }

    const patternMap = {
      fabricator: [1, 2],
      duelist: [3, 4],
      disruptor: [5, 6],
      breaker: [7, 8]
    };
    const pool = patternMap[a.currentWeapon];
    const available = pool.filter(id => id !== a.lastPattern);
    const nextPattern = available[Math.floor(Math.random() * available.length)];
    a.lastPattern = nextPattern;
    this.beginArsenalPattern(nextPattern);
  },

  applyArsenalWeaponChange(nextWeapon, forcedByPlayer = false) {
    const a = this.activeBoss?.arsenal;
    if (!a || !this.ARSENAL_WEAPONS.includes(nextWeapon)) return false;
    if (nextWeapon === a.currentWeapon) {
      showFloatingText('CURRENT WEAPON MAINTAINED', this.activeBoss.x, this.activeBoss.y - this.activeBoss.radius - 18 * scale, '#94a3b8');
      return false;
    }

    const oldWeapon = a.currentWeapon;
    if (forcedByPlayer && nextWeapon === a.previousWeapon) {
      a.overrideStack = Math.min(3, a.overrideStack + 1);
      const message = a.overrideStack >= 3 ? 'ARSENAL OVERLOAD RESERVED' : (a.overrideStack === 2 ? 'OVERRIDE WARNING' : 'OVERRIDE DETECTED');
      showFloatingText(message, this.activeBoss.x, this.activeBoss.y - this.activeBoss.radius - 30 * scale, a.overrideStack >= 3 ? '#ef4444' : '#fbbf24');
    }

    a.previousWeapon = oldWeapon;
    a.currentWeapon = nextWeapon;
    a.weaponPatternCount = 0;
    a.weaponChangeCount++;
    if (a.weaponChangeCount >= 4) a.adaptiveShiftPending = true;
    if (a.overrideStack >= 3) a.overloadPending = true;
    this.updateArsenalBossBar();
    Sound.playEyeFlash();
    showFloatingText(`${forcedByPlayer ? 'OVERRIDE' : 'WEAPON SHIFT'}: ${this.ARSENAL_WEAPON_LABELS[nextWeapon]}`, this.activeBoss.x, this.activeBoss.y - this.activeBoss.radius - 16 * scale, '#fbbf24');
    return true;
  },

  queueArsenalWeaponOverride(nextWeapon) {
    const a = this.activeBoss?.arsenal;
    if (!a || this.bossType !== 'arsenal' || !this.ARSENAL_WEAPONS.includes(nextWeapon)) return false;
    a.pendingWeapon = nextWeapon;
    showFloatingText(`NEXT WEAPON: ${this.ARSENAL_WEAPON_LABELS[nextWeapon]}`, player.x, player.y - 24 * scale, '#fbbf24');
    Sound.playUpgrade();
    return true;
  },

  finishArsenalAttack() {
    const a = this.activeBoss?.arsenal;
    if (!a) return;
    a.weaponPatternCount++;
    a.pattern = null;
    this.setCooldown();
  },

  getArsenalPhaseHp() {
    return Math.max(1, typeof getEnemyBaseHp === 'function'
      ? getEnemyBaseHp(currentPhase)
      : (baseHpTable[currentPhase] || 2));
  },

  spawnArsenalSummon(kind, x, y, extra = {}) {
    const multiplier = this.ARSENAL_SUMMON_HP_MULTIPLIERS[kind] || 2;
    const hp = Math.max(1, Math.round(this.getArsenalPhaseHp() * multiplier));
    const lineUnit = kind === 'armored';
    const summon = {
      x, y,
      radius: (lineUnit ? 12 : 9) * scale,
      speed: (lineUnit ? 0 : 0.82) * scale,
      hp, maxHp: hp,
      isElite: false,
      isArsenalSummon: true,
      isArsenalLineUnit: lineUnit,
      isArsenalOverloadSummon: kind === 'overload',
      ...extra
    };
    enemies.push(summon);
    return summon;
  },

  spawnArsenalCaptain() {
    const b = this.activeBoss;
    if (!b) return;
    // ADAPTIVE SHIFT의 대장 개체는 교체 코어를 보장하는 핵심 목표다.
    // 기존 체력의 두 배로 올려, 무장 상성 교체를 체감할 여유를 준다.
    const hp = this.getArsenalPhaseHp() * 4;
    const x = Math.max(24 * scale, Math.min(width - 24 * scale, b.x));
    const y = Math.max(24 * scale, Math.min(height - 24 * scale, b.y + b.radius + 34 * scale));
    enemies.push({
      x, y,
      radius: 14 * scale,
      speed: 0.7 * scale,
      hp, maxHp: hp,
      isElite: false,
      isLeader: true,
      isArsenalSummon: true,
      isArsenalCaptain: true,
      // 대장은 블랙홀 피해는 받되 위치가 빨려 들어가지는 않는다.
      isBlackHoleImmune: true
    });
    showFloatingText('ADAPTIVE CAPTAIN · CORE GUARANTEED', x, y - 20 * scale, '#fde68a');
  },

  spawnArsenalRouletteCore(x, y) {
    const roulettePool = ['laser', 'pulse', 'blackhole', 'flame'];
    const initialKind = roulettePool[0];
    items.push({
      x, y, vx: 0, vy: 0,
      radius: 11 * scale,
      shape: 'square',
      kind: initialKind,
      color: this.ARSENAL_SHIELD_META[initialKind].color,
      label: this.ARSENAL_SHIELD_META[initialKind].glyph,
      name: WEAPON_META[initialKind].name,
      isStationary: true,
      isRoulette: true,
      isArsenalRoulette: true,
      rouletteTimer: 0.8,
      rouletteInterval: 0.8,
      roulettePool,
      rouletteIndex: 0,
      lifeTime: 30.0
    });
    showFloatingText('ARSENAL 4-WEAPON CORE', x, y - 18 * scale, '#fde68a');
  },

  spawnBossWeaponCore(x, y) {
    const pool = [...this.ARSENAL_WEAPONS];
    const initial = pool[0];
    const meta = this.ARSENAL_WEAPON_META[initial];
    items.push({
      x: Math.max(18 * scale, Math.min(width - 18 * scale, x)),
      y: Math.max(18 * scale, Math.min(height - 18 * scale, y)),
      vx: (Math.random() - 0.5) * 0.24 * scale,
      vy: 0.62 * scale,
      radius: 12 * scale,
      shape: 'square',
      kind: 'bossWeapon',
      color: meta.color,
      label: meta.glyph,
      name: this.ARSENAL_WEAPON_LABELS[initial],
      isStationary: false,
      isEjectedBossCore: true,
      isBossWeaponCore: true,
      arsenalIcon: meta.icon,
      arsenalWeaponKey: initial,
      rouletteTimer: 0.7,
      rouletteInterval: 0.7,
      roulettePool: pool,
      rouletteIndex: 0,
      lifeTime: 10.0
    });
    addExplosion(x, y, meta.color, 10);
    showFloatingText('WEAPON OVERRIDE CORE EJECTED · 10s', x, y - 18 * scale, meta.color);
  },

  fireArsenalAimed(count = 3, speed = 4.3, spread = 0.16, color = '#fbbf24', angleOverride = null) {
    const b = this.activeBoss;
    if (!b) return;
    const base = angleOverride ?? Math.atan2(player.y - b.y, player.x - b.x);
    const start = -(count - 1) * 0.5;
    for (let i = 0; i < count; i++) {
      const angle = base + (start + i) * spread;
      this.bossBullets.push({
        x: b.x, y: b.y,
        vx: Math.cos(angle) * speed * scale,
        vy: Math.sin(angle) * speed * scale,
        radius: 4.2 * scale,
        damage: 1,
        color,
        isArsenal: true
      });
    }
    Sound.playEnemyShoot();
  },

  fireArsenalRadial(offset = 0, color = this.ARSENAL_WEAPON_META.duelist.color) {
    const b = this.activeBoss;
    if (!b) return;
    const slots = 16;
    const gapStart = Math.floor(((offset / (Math.PI * 2)) * slots + slots) % slots);
    for (let i = 0; i < slots; i++) {
      if (i === gapStart || i === (gapStart + 1) % slots) continue;
      const angle = offset + i * Math.PI * 2 / slots;
      this.bossBullets.push({
        x: b.x, y: b.y,
        vx: Math.cos(angle) * 3.35 * scale,
        vy: Math.sin(angle) * 3.35 * scale,
        radius: 4 * scale,
        damage: 1,
        color,
        isArsenal: true
      });
    }
    Sound.playEnemyShoot();
  },

  pushArsenalLineWarning(x1, y1, x2, y2, life = 0.5, color = '#ef4444') {
    this.arsenalWarnings.push({ kind: 'line', x1, y1, x2, y2, life, maxLife: life, color });
  },

  pushArsenalCircleWarning(x, y, radius, life = 0.7, color = '#f97316') {
    this.arsenalWarnings.push({ kind: 'circle', x, y, radius, life, maxLife: life, color });
  },

  pushArsenalRepulsionWarning(x, y, radius, life = 0.85) {
    this.arsenalWarnings.push({
      kind: 'repulsion', x, y, radius,
      startRadius: 9 * scale,
      life, maxLife: life,
      color: this.ARSENAL_WEAPON_META.breaker.color
    });
  },

  addArsenalSweepLaser(duration = 4.2, warning = 0.8, arms = 2, spin = 0.62, options = {}) {
    const b = this.activeBoss;
    if (!b) return;
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < arms; i++) {
      this.arsenalLasers.push({
        angle: base + i * Math.PI * 2 / arms,
        startAngle: base + i * Math.PI * 2 / arms,
        length: 150 * scale,
        width: 12 * scale,
        warning,
        life: duration,
        duration,
        elapsed: 0,
        spin,
        totalRotation: options.totalRotation || 0,
        warningStyle: options.warningStyle || 'line',
        color: options.color || this.ARSENAL_WEAPON_META.breaker.color,
        active: false,
        followBoss: true
      });
    }
  },

  beginArsenalHighSpeedSweep() {
    const direction = Math.random() < 0.5 ? -1 : 1;
    this.addArsenalSweepLaser(1.0, 1.0, 2, 0, {
      totalRotation: direction * Math.PI * 4,
      warningStyle: 'laserArm',
      color: this.ARSENAL_WEAPON_META.breaker.color
    });
  },

  spawnArsenalRepulsionAdds(count = 6, overload = false) {
    const margin = 22 * scale;
    for (let i = 0; i < count; i++) {
      const edge = i % 4;
      const lane = 0.18 + ((i * 0.27) % 0.64);
      let x, y;
      if (edge === 0) { x = -margin; y = height * lane; }
      else if (edge === 1) { x = width + margin; y = height * lane; }
      else if (edge === 2) { x = width * lane; y = -margin; }
      else { x = width * lane; y = height + margin; }
      this.spawnArsenalSummon(overload ? 'overload' : 'mass', x, y, {
        arsenalWeaponMode: 'breaker'
      });
    }
  },

  applyArsenalRepulsion(x, y, radius, force) {
    const dx = player.x - x;
    const dy = player.y - y;
    const dist = Math.hypot(dx, dy);
    if (dist >= radius + player.radius) return;
    const nx = dist > 0.001 ? dx / dist : 0;
    const ny = dist > 0.001 ? dy / dist : 1;
    player.knockbackVx = (player.knockbackVx || 0) + nx * force * scale;
    player.knockbackVy = (player.knockbackVy || 0) + ny * force * scale;
    player.targetX = player.x;
    player.targetY = player.y;
  },

  spawnArsenalArmoredFormation(overload = false) {
    for (let i = 0; i < 3; i++) {
      const fromLeft = i % 2 === 0;
      const y = height * (0.48 + i * 0.15);
      this.spawnArsenalSummon('armored', fromLeft ? 18 * scale : width - 18 * scale, y, {
        vx: (fromLeft ? 1 : -1) * 1.05 * scale,
        vy: 0,
        arsenalMoveMode: 'horizontal',
        arsenalWeaponMode: 'fabricator',
        isPulseReactive: true,
        isArsenalOverloadSummon: overload,
        // 일반 P2는 병기 처리와 회피 동선이 목적이며, 병기 사격은 하지 않는다.
        arsenalNoFire: !overload,
        shootTimer: 0.45 + i * 0.23,
        arsenalShootInterval: overload ? 0.88 : 1.15
      });
    }
    for (let i = 0; i < 2; i++) {
      const x = width * (i === 0 ? 0.22 : 0.78);
      const centerY = height * (i === 0 ? 0.18 : 0.27);
      const sweepY = i === 0 ? 12 * scale : height - 12 * scale;
      // P2의 지속시간 안에도 상단→하단→상단 변주가 읽히도록, 화면 높이를 기준으로 속도를 잡는다.
      const sweepSpeed = Math.max(2.4 * scale, height / 140);
      this.spawnArsenalSummon('armored', x, overload ? centerY : sweepY, {
        vx: 0, vy: (i === 0 ? 1 : -1) * sweepSpeed,
        // P2의 상단 병기 둘은 화면 끝에서 끝까지 왕복해 활동 영역을 가른다.
        // OVERLOAD의 기존 짧은 상하 운동은 별도 연출로 보존한다.
        arsenalMoveMode: overload ? 'vertical' : 'verticalSweep',
        arsenalAnchorX: x,
        arsenalAnchorY: centerY,
        arsenalMovePhase: i * Math.PI,
        arsenalMoveAmplitude: height * 0.095,
        arsenalWeaponMode: 'fabricator',
        isPulseReactive: true,
        isArsenalOverloadSummon: overload,
        arsenalNoFire: !overload,
        // 이 두 병기는 블랙홀 피해 대상이지만, 흡입으로 진형이 무너지지 않는다.
        isBlackHoleImmune: !overload,
        shootTimer: 0.7 + i * 0.3,
        arsenalShootInterval: overload ? 0.88 : 1.15
      });
    }
  },

  moveArsenalBossToward(x, y, speed, dt) {
    const b = this.activeBoss;
    if (!b) return true;
    const dx = x - b.x;
    const dy = y - b.y;
    const dist = Math.hypot(dx, dy);
    const step = speed * scale * dt;
    if (dist <= step || dist < 0.001) {
      b.x = x; b.y = y;
      return true;
    }
    b.x += dx / dist * step;
    b.y += dy / dist * step;
    return false;
  },

  startArsenalPattern(id) {
    const b = this.activeBoss;
    const p = b?.arsenal?.pattern;
    if (!b || !p) return;
    const names = {
      1: 'MASS PRODUCTION', 2: 'ARMORED LINE', 3: 'PRECISION SHOT', 4: 'OPEN FIELD',
      5: 'ORBITAL SHIFT', 6: 'ZIGZAG DRIVE', 7: 'REPULSION', 8: 'CLOSE RANGE SWEEP',
      9: 'ADAPTIVE SHIFT', 11: 'ARSENAL OVERLOAD'
    };
    const modeColor = id === 9 ? '#38bdf8'
      : id === 11 ? '#ef4444'
      : this.ARSENAL_WEAPON_META[b.arsenal.currentWeapon].color;
    showFloatingText(names[id], b.x, b.y - b.radius - 18 * scale, modeColor);

    if (id === 2) {
      // 하단 3기는 좌우 왕복, 상단 2기는 보스 좌우에서 상하 왕복한다.
      this.spawnArsenalArmoredFormation(false);
    } else if (id === 3) {
      p.burstShot = 0;
      p.burstTimer = 0;
    } else if (id === 5) {
      p.orbitAngle = Math.atan2(b.y - player.y, b.x - player.x);
      p.shotTimer = 0;
    } else if (id === 6) {
      const left = width * 0.18;
      const right = width * 0.82;
      p.targets = [
        { x: left, y: height * 0.22 },
        { x: right, y: height * 0.42 },
        { x: left, y: height * 0.62 },
        { x: right, y: height * 0.24 },
        { x: width / 2, y: b.targetY }
      ];
      if (Math.random() < 0.5) {
        for (const target of p.targets) target.x = width - target.x;
      }
      p.targetIndex = 0;
      p.moveState = 'warning';
      p.timer = 0;
      p.fireTimer = 0;
      p.volleyWarning = false;
      this.pushArsenalLineWarning(b.x, b.y, p.targets[0].x, p.targets[0].y, 0.65);
    } else if (id === 7) {
      this.spawnArsenalRepulsionAdds(6, false);
      this.pushArsenalRepulsionWarning(b.x, b.y, 170 * scale, 0.85);
      Sound.playEyeFlash();
    } else if (id === 8) {
      p.sweepCount = 1;
      p.sweepState = 'running';
      p.timer = 0;
      this.beginArsenalHighSpeedSweep();
    } else if (id === 9) {
      p.initialShift = b.arsenal.initialAdaptiveShift;
      b.arsenal.initialAdaptiveShift = false;
      b.arsenal.shieldShiftTimer = 1.6;
      Sound.playShield();
    } else if (id === 11) {
      p.step = 0;
      p.timer = 0;
      b.arsenal.shieldShiftTimer = 1.5;
      Sound.playPhaseAlert();
      showFloatingText('⚠️ ALL WEAPON SYSTEMS RELEASE ⚠️', width / 2, height * 0.38, '#ef4444');
    }
  },

  updateArsenalPatterns(dt) {
    const b = this.activeBoss;
    const a = b?.arsenal;
    const p = a?.pattern;
    if (!b || !a || !p) { this.setCooldown(); return; }
    p.timer += dt;
    p.shotTimer += dt;

    if (this.currentPattern === 1) {
      if (p.count < 6 && p.shotTimer >= 0.55) {
        p.shotTimer = 0;
        const side = p.count % 2 === 0 ? -1 : 1;
        this.spawnArsenalSummon('mass', b.x + side * b.radius * 0.72, b.y + 10 * scale, {
          arsenalWeaponMode: 'fabricator'
        });
        p.count++;
        addExplosion(b.x + side * b.radius * 0.72, b.y + 10 * scale, this.ARSENAL_WEAPON_META.fabricator.color, 5);
      }
      if (p.count >= 6 && p.timer >= 4.2) this.finishArsenalAttack();
    } else if (this.currentPattern === 2) {
      if (p.timer >= 5.2) this.finishArsenalAttack();
    } else if (this.currentPattern === 3) {
      if (p.count >= 5) {
        if (p.timer >= 0.75) this.finishArsenalAttack();
        return;
      }
      if (!p.warned && p.burstShot === 0 && p.timer >= 0) {
        p.warned = true;
        p.timer = 0;
        p.lockedAngle = Math.atan2(player.y - b.y, player.x - b.x);
        this.pushArsenalLineWarning(b.x, b.y, b.x + Math.cos(p.lockedAngle) * Math.max(width, height), b.y + Math.sin(p.lockedAngle) * Math.max(width, height), 0.42, this.ARSENAL_WEAPON_META.duelist.color);
      } else if (p.timer >= 0.42) {
        p.burstTimer += dt;
        if (p.burstShot < 3 && p.burstTimer >= 0.105) {
          p.burstTimer = 0;
          const angle = p.lockedAngle;
          this.bossBullets.push({ x: b.x, y: b.y, vx: Math.cos(angle) * 5.75 * scale, vy: Math.sin(angle) * 5.75 * scale, radius: 4 * scale, damage: 1, color: this.ARSENAL_WEAPON_META.duelist.color, isArsenal: true });
          Sound.playEnemyShoot();
          p.burstShot++;
        }
        if (p.burstShot >= 3) {
          p.count++;
          p.warned = false;
          p.burstShot = 0;
          p.burstTimer = 0;
          p.timer = p.count >= 5 ? 0 : -0.22;
        }
      }
    } else if (this.currentPattern === 4) {
      if (p.count < 4 && p.shotTimer >= 0.48) {
        p.shotTimer = 0;
        this.fireArsenalRadial(p.count * 0.27, this.ARSENAL_WEAPON_META.duelist.color);
        p.count++;
      }
      if (p.count >= 4 && p.timer >= 2.8) this.finishArsenalAttack();
    } else if (this.currentPattern === 5) {
      p.orbitAngle += dt * 0.92;
      const orbitRadius = Math.min(width, height) * 0.32;
      const tx = Math.max(b.radius, Math.min(width - b.radius, player.x + Math.cos(p.orbitAngle) * orbitRadius));
      const ty = Math.max(b.radius, Math.min(height - b.radius, player.y + Math.sin(p.orbitAngle) * orbitRadius));
      b.x += (tx - b.x) * Math.min(1, dt * 5.5);
      b.y += (ty - b.y) * Math.min(1, dt * 5.5);
      if (p.shotTimer >= 0.9) { p.shotTimer = 0; this.fireArsenalAimed(2, 3.7, 0.2, '#a78bfa'); }
      if (p.timer >= 6.2) this.finishArsenalAttack();
    } else if (this.currentPattern === 6) {
      const target = p.targets[p.targetIndex];
      if (!target) { this.finishArsenalAttack(); return; }
      if (p.moveState === 'warning') {
        if (p.timer >= 0.65) { p.timer = 0; p.moveState = 'move'; p.fireTimer = 0; p.volleyWarning = false; }
      } else {
        // 이동 사격은 사전 조준선 -> 3발 발사 순서를 지켜 읽을 수 있게 한다.
        p.fireTimer += dt;
        if (!p.volleyWarning && p.fireTimer >= 0.72) {
          p.lockedAngle = Math.atan2(player.y - b.y, player.x - b.x);
          this.pushArsenalLineWarning(b.x, b.y, b.x + Math.cos(p.lockedAngle) * Math.max(width, height), b.y + Math.sin(p.lockedAngle) * Math.max(width, height), 0.32, this.ARSENAL_WEAPON_META.disruptor.color);
          p.fireTimer = 0;
          p.volleyWarning = true;
        } else if (p.volleyWarning && p.fireTimer >= 0.32) {
          p.fireTimer = 0;
          p.volleyWarning = false;
          this.fireArsenalAimed(3, 3.45, 0.105, this.ARSENAL_WEAPON_META.disruptor.color, p.lockedAngle);
        }
        if (this.moveArsenalBossToward(target.x, target.y, 315, dt)) {
          p.targetIndex++;
          p.timer = 0;
          p.moveState = 'warning';
          p.fireTimer = 0;
          p.volleyWarning = false;
          const next = p.targets[p.targetIndex];
          if (next) this.pushArsenalLineWarning(b.x, b.y, next.x, next.y, 0.65);
        }
      }
    } else if (this.currentPattern === 7) {
      if (!p.repulsed && p.timer >= 0.85) {
        p.repulsed = true;
        this.applyArsenalRepulsion(b.x, b.y, 170 * scale, 610);
        Sound.playBomb();
        addExplosion(b.x, b.y, this.ARSENAL_WEAPON_META.breaker.color, 22);
      }
      if (p.timer >= 2.05) this.finishArsenalAttack();
    } else if (this.currentPattern === 8) {
      if (p.sweepState === 'running' && this.arsenalLasers.length === 0) {
        if (p.sweepCount >= 4) {
          this.finishArsenalAttack();
        } else {
          p.sweepState = 'gap';
          p.timer = 0;
        }
      } else if (p.sweepState === 'gap' && p.timer >= 1.0) {
        p.sweepCount++;
        p.sweepState = 'running';
        p.timer = 0;
        this.beginArsenalHighSpeedSweep();
      }
    } else if (this.currentPattern === 9) {
      if (p.step === 0 && p.timer >= 0.6) {
        p.step = 1;
        const playerShieldType = this.ARSENAL_SHIELDS.includes(player.weaponType) ? player.weaponType : null;
        const choices = this.ARSENAL_SHIELDS.filter(type =>
          type !== a.shieldType && (!p.initialShift || type !== playerShieldType)
        );
        a.shieldType = choices[Math.floor(Math.random() * choices.length)];
        a.shieldFlash = 0.5;
        this.updateArsenalBossBar();
        Sound.playShield();
      }
      if (p.step === 1 && p.timer >= 1.15) {
        p.step = 2;
        this.spawnArsenalCaptain();
      }
      if (p.timer >= 1.7) {
        a.weaponChangeCount = 0;
        a.pattern = null;
        this.setCooldown();
      }
    } else if (this.currentPattern === 11) {
      this.updateArsenalOverload(dt, b, a, p);
    }
  },

  updateArsenalOverload(dt, b, a, p) {
    if (p.step === 0) {
      this.moveArsenalBossToward(width / 2, height * 0.34, 240, dt);
      if (p.timer >= 1.35) {
        p.step = 1; p.timer = 0;
        this.spawnArsenalArmoredFormation(true);
        showFloatingText('FABRICATOR · REINFORCED FORMATION', b.x, b.y - b.radius - 18 * scale, this.ARSENAL_WEAPON_META.fabricator.color);
      }
    } else if (p.step === 1 && p.timer >= 2.15) {
      p.step = 2; p.timer = 0; p.targetIndex = 0;
      p.targets = [
        { x: width * 0.20, y: height * 0.28 },
        { x: width * 0.80, y: height * 0.42 },
        { x: width * 0.24, y: height * 0.52 },
        { x: width / 2, y: height * 0.34 }
      ];
      p.moveDelay = 0.38;
      p.shotTimer = 0;
      this.pushArsenalLineWarning(b.x, b.y, p.targets[0].x, p.targets[0].y, 0.38, this.ARSENAL_WEAPON_META.disruptor.color);
      showFloatingText('DISRUPTOR · SATURATION DRIVE', b.x, b.y - b.radius - 18 * scale, this.ARSENAL_WEAPON_META.disruptor.color);
    } else if (p.step === 2) {
      if (p.moveDelay > 0) {
        p.moveDelay -= dt;
        return;
      }
      const target = p.targets[p.targetIndex];
      if (p.shotTimer >= 0.24) {
        p.shotTimer = 0;
        this.fireArsenalAimed(5, 3.7, 0.10, this.ARSENAL_WEAPON_META.disruptor.color);
      }
      if (!target || this.moveArsenalBossToward(target.x, target.y, 390, dt)) {
        p.targetIndex++;
        const next = p.targets[p.targetIndex];
        if (next) {
          p.moveDelay = 0.30;
          p.shotTimer = 0;
          this.pushArsenalLineWarning(b.x, b.y, next.x, next.y, 0.30, this.ARSENAL_WEAPON_META.disruptor.color);
        }
        else {
          p.step = 3; p.timer = 0;
          p.sweepCount = 1;
          p.sweepState = 'running';
          this.clearArsenalSummons(true);
          this.beginArsenalHighSpeedSweep();
          showFloatingText('BREAKER · DOUBLE SWEEP', b.x, b.y - b.radius - 18 * scale, this.ARSENAL_WEAPON_META.breaker.color);
        }
      }
    } else if (p.step === 3) {
      this.moveArsenalBossToward(width / 2, height * 0.34, 250, dt);
      if (p.sweepState === 'running' && this.arsenalLasers.length === 0) {
        if (p.sweepCount >= 2) {
          p.step = 4; p.timer = 0; p.duelCount = 0; p.burstShot = 0; p.burstTimer = 0;
          p.duelState = 'warning';
          p.lockedAngle = Math.atan2(player.y - b.y, player.x - b.x);
          this.pushArsenalLineWarning(b.x, b.y, b.x + Math.cos(p.lockedAngle) * Math.max(width, height), b.y + Math.sin(p.lockedAngle) * Math.max(width, height), 0.38, this.ARSENAL_WEAPON_META.duelist.color);
          showFloatingText('DUELIST · TRIPLE BURST', b.x, b.y - b.radius - 18 * scale, this.ARSENAL_WEAPON_META.duelist.color);
        } else {
          p.sweepState = 'gap';
          p.timer = 0;
        }
      } else if (p.sweepState === 'gap' && p.timer >= 0.65) {
        p.sweepCount++;
        p.sweepState = 'running';
        p.timer = 0;
        this.beginArsenalHighSpeedSweep();
      }
    } else if (p.step === 4) {
      if (p.duelState === 'warning' && p.timer >= 0.38) {
        p.duelState = 'burst';
        p.burstTimer = 0;
      } else if (p.duelState === 'burst') {
        p.burstTimer += dt;
        if (p.burstShot < 3 && p.burstTimer >= 0.10) {
          p.burstTimer = 0;
          const angle = p.lockedAngle;
          this.bossBullets.push({ x: b.x, y: b.y, vx: Math.cos(angle) * 5.9 * scale, vy: Math.sin(angle) * 5.9 * scale, radius: 4 * scale, damage: 1, color: this.ARSENAL_WEAPON_META.duelist.color, isArsenal: true });
          Sound.playEnemyShoot();
          p.burstShot++;
        }
        if (p.burstShot >= 3) {
          p.duelCount++;
          if (p.duelCount >= 3) {
            p.step = 5; p.timer = 0; p.repulsed = false;
            this.spawnArsenalRepulsionAdds(6, true);
            this.pushArsenalRepulsionWarning(b.x, b.y, 165 * scale, 0.78);
          } else {
            p.duelState = 'warning';
            p.burstShot = 0;
            p.timer = 0;
            p.lockedAngle = Math.atan2(player.y - b.y, player.x - b.x);
            this.pushArsenalLineWarning(b.x, b.y, b.x + Math.cos(p.lockedAngle) * Math.max(width, height), b.y + Math.sin(p.lockedAngle) * Math.max(width, height), 0.38, this.ARSENAL_WEAPON_META.duelist.color);
          }
        }
      }
    } else if (p.step === 5) {
      if (!p.repulsed && p.timer >= 0.78) {
        p.repulsed = true;
        this.applyArsenalRepulsion(b.x, b.y, 165 * scale, 670);
        this.fireArsenalRadial(0.18, this.ARSENAL_WEAPON_META.breaker.color);
        Sound.playBomb();
      }
      if (p.timer >= 2.35) {
        this.clearArsenalSummons(true);
        a.overrideStack = 0;
        a.overheatTimer = 2.0;
        p.step = 6; p.timer = 0;
        showFloatingText('OVERHEAT · FREE ATTACK', b.x, b.y - b.radius - 18 * scale, '#67e8f9');
      }
    } else if (p.step === 6) {
      a.overheatTimer = Math.max(0, 2.0 - p.timer);
      if (p.timer >= 2.0) {
        a.overheatTimer = 0;
        a.pattern = null;
        this.setCooldown();
      }
    }
  },

  updateArsenalHazards(dt) {
    for (let i = this.arsenalWarnings.length - 1; i >= 0; i--) {
      this.arsenalWarnings[i].life -= dt;
      if (this.arsenalWarnings[i].life <= 0) this.arsenalWarnings.splice(i, 1);
    }
    const b = this.activeBoss;
    for (let i = this.arsenalLasers.length - 1; i >= 0; i--) {
      const laser = this.arsenalLasers[i];
      if (laser.warning > 0) {
        laser.warning -= dt;
        if (laser.warning <= 0) { laser.active = true; Sound.playLaserBeam(); }
        continue;
      }
      laser.life -= dt;
      laser.elapsed = (laser.elapsed || 0) + dt;
      if (laser.totalRotation) {
        const progress = Math.max(0, Math.min(1, laser.elapsed / Math.max(0.001, laser.duration)));
        // 시작과 끝은 묵직하게, 중앙 구간은 급가속하는 비선형 회전.
        const eased = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        laser.angle = laser.startAngle + laser.totalRotation * eased;
      } else {
        laser.angle += laser.spin * dt;
      }
      if (laser.active && b && gameState === 'playing' && player.invincibleTimer <= 0) {
        const x2 = b.x + Math.cos(laser.angle) * laser.length;
        const y2 = b.y + Math.sin(laser.angle) * laser.length;
        if (distToSegment({ x: b.x, y: b.y }, { x: x2, y: y2 }, { x: player.x, y: player.y }) < laser.width * 0.5 + player.radius) takeDamage(1);
      }
      if (laser.life <= 0) this.arsenalLasers.splice(i, 1);
    }
  },

  clearArsenalSummons(overloadOnly = false) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (!e.isArsenalSummon) continue;
      if (overloadOnly && !e.isArsenalOverloadSummon) continue;
      addExplosion(e.x, e.y, '#fbbf24', 7);
      enemies.splice(i, 1);
    }
  },

  clearArsenalBattleObjects() {
    this.arsenalWarnings = [];
    this.arsenalLasers = [];
    this.bossBullets = this.bossBullets.filter(bullet => !bullet.isArsenal);
    this.clearArsenalSummons(false);
    items = items.filter(item => !item.isArsenalRoulette && !item.isBossWeaponCore);
    if (this.activeBoss?.arsenal) {
      this.activeBoss.arsenal.pendingWeapon = null;
      this.activeBoss.arsenal.pattern = null;
    }
  },

  getArsenalShieldMultiplier(attackKind) {
    const a = this.activeBoss?.arsenal;
    if (!a || this.bossType !== 'arsenal') return 1;
    return attackKind === a.shieldType ? 1.2 : 0.8;
  },

  forceArsenalShield(shieldType) {
    const a = this.activeBoss?.arsenal;
    if (!a || !this.ARSENAL_SHIELDS.includes(shieldType)) return false;
    a.shieldType = shieldType;
    a.shieldFlash = 0.5;
    this.updateArsenalBossBar();
    return true;
  },

  forceArsenalWeapon(weapon) {
    return this.applyArsenalWeaponChange(weapon, false);
  },

  forceArsenalAdaptiveShift() {
    const a = this.activeBoss?.arsenal;
    if (!a) return false;
    a.adaptiveShiftPending = true;
    if (this.state !== 'pattern') this.startNextArsenalAction();
    return true;
  },

  forceArsenalOverload() {
    const a = this.activeBoss?.arsenal;
    if (!a) return false;
    a.overrideStack = 3;
    a.overloadPending = true;
    if (this.state !== 'pattern') this.startNextArsenalAction();
    return true;
  },

  normalizeAngle(angle) {
    while (angle <= -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    return angle;
  },

  getPhantomHitZone(sourceX = player.x, sourceY = player.y) {
    const b = this.activeBoss;
    if (!b || this.bossType !== 'phantom') return 'side';
    const hitAngle = Math.atan2(sourceY - b.y, sourceX - b.x);
    const difference = Math.abs(this.normalizeAngle(hitAngle - b.facingAngle));
    if (difference <= 0.95) return 'front';
    if (difference >= Math.PI - 0.95) return 'rear';
    return 'side';
  },

  isPhantomShieldedAt(sourceX = player.x, sourceY = player.y) {
    if (this.getPhantomHitZone(sourceX, sourceY) !== 'front') return false;
    this.registerPhantomShieldBlock();
    return true;
  },

  registerPhantomShieldBlock() {
    const b = this.activeBoss;
    if (!b || this.bossType !== 'phantom') return;
    b.shieldFlash = 0.16;
    if ((b.shieldBlockTimer || 0) <= 0) {
      b.shieldBlockTimer = 0.14;
      Sound.playShield();
    }
  },

  setPhantomFacing(b, angle) {
    b.targetFacingAngle = this.normalizeAngle(angle);
  },

  turnPhantomToward(b, angle, dt, speed = 2.7) {
    const diff = this.normalizeAngle(angle - b.facingAngle);
    b.facingAngle = this.normalizeAngle(b.facingAngle + Math.max(-speed * dt, Math.min(speed * dt, diff)));
  },

  facePhantomAtPlayer(b, dt, speed = 4.8) {
    const angle = Math.atan2(player.y - b.y, player.x - b.x);
    this.setPhantomFacing(b, angle);
    this.turnPhantomToward(b, angle, dt, speed);
  },

  randomPhantomPoint() {
    const margin = 62 * scale;
    return {
      x: margin + Math.random() * Math.max(1, width - margin * 2),
      y: height * (0.18 + Math.random() * 0.46)
    };
  },

  randomPhantomArenaPoint() {
    const margin = 64 * scale;
    return {
      x: margin + Math.random() * Math.max(1, width - margin * 2),
      y: height * (0.16 + Math.random() * 0.68)
    };
  },

  beginPhantomRam(b, p) {
    const margin = b.radius + 18 * scale;
    const angle = Math.atan2(player.y - b.y, player.x - b.x);
    const distance = Math.max(160 * scale, Math.hypot(player.x - b.x, player.y - b.y));
    const targetX = Math.max(margin, Math.min(width - margin, b.x + Math.cos(angle) * distance));
    const targetY = Math.max(margin, Math.min(height - margin, b.y + Math.sin(angle) * distance));
    p.startX = b.x;
    p.startY = b.y;
    p.targetX = targetX;
    p.targetY = targetY;
    p.ramProgress = 0;
    p.timer = 0.60;
    p.step = 'warn';
    this.setPhantomFacing(b, angle);
    b.phantomRamWarning = { x1: b.x, y1: b.y, x2: targetX, y2: targetY, timer: p.timer, maxTimer: p.timer };
    this.warnPhantom(b, `SHIELD RAM ${p.ramIndex + 1}/3`, p.timer);
    Sound.playEyeFlash();
  },

  warnPhantom(b, label, duration = 0.35) {
    b.phantomWarning = { label, timer: duration, maxTimer: duration };
    showFloatingText(`⚠ ${label}`, b.x, b.y - b.radius - 18 * scale, '#f0abfc');
  },

  queuePhantomWarp(b, point = this.randomPhantomPoint()) {
    // 목적지를 1초 동안 붉게 노출해, 이동 전에 대응할 시간을 보장한다.
    b.phantomPendingWarp = { x: point.x, y: point.y, timer: 1.0, maxTimer: 1.0 };
    showFloatingText('⚠ WARP INCOMING', point.x, point.y - 28 * scale, '#ff4d6d');
  },

  updatePhantomWarp(b, dt) {
    const warp = b.phantomPendingWarp;
    if (!warp) return false;
    warp.timer -= dt;
    if (warp.timer > 0) return true;
    addExplosion(b.x, b.y, '#7c3aed', 9);
    b.x = warp.x;
    b.y = warp.y;
    b.phantomPendingWarp = null;
    b.facingAngle = Math.atan2(player.y - b.y, player.x - b.x);
    b.targetFacingAngle = b.facingAngle;
    addExplosion(b.x, b.y, '#c4b5fd', 12);
    Sound.playEyeFlash();
    return false;
  },

  clearPhantomPortals() {
    this.phantomPortals = [];
    this.phantomPlayerPortalCooldown = 0;
  },

  clearPhantomFortresses() {
    for (const fortress of this.phantomFortresses) {
      const index = enemies.indexOf(fortress);
      if (index >= 0) enemies.splice(index, 1);
    }
    this.phantomFortresses = [];
  },

  findSafePhantomPortalPoint(existingNodes, minPlayerDistance, minNodeDistance) {
    const margin = 48 * scale;
    const minX = margin, maxX = Math.max(margin, width - margin);
    const minY = margin, maxY = Math.max(margin, height - margin);
    let best = null;
    let bestScore = -Infinity;
    for (let attempt = 0; attempt < 64; attempt++) {
      const point = { x: minX + Math.random() * (maxX - minX), y: minY + Math.random() * (maxY - minY) };
      const playerDistance = Math.hypot(point.x - player.x, point.y - player.y);
      const nodeDistance = existingNodes.length ? Math.min(...existingNodes.map(node => Math.hypot(point.x - node.x, point.y - node.y))) : Infinity;
      if (playerDistance >= minPlayerDistance && nodeDistance >= minNodeDistance) return point;
      // 좁은 모바일 화면에서도 가능한 한 가장 안전하고 이격된 후보를 사용한다.
      const score = Math.min(playerDistance / minPlayerDistance, nodeDistance / minNodeDistance);
      if (score > bestScore) { best = point; bestScore = score; }
    }
    return best || { x: width / 2, y: height * 0.2 };
  },

  spawnPhantomPortals(count = 1, lifetime = 10) {
    this.clearPhantomPortals();
    if (!this.activeBoss) return;
    const existingNodes = [];
    const minDimension = Math.min(width, height);
    const minPlayerDistance = Math.min(155 * scale, minDimension * 0.30);
    // 복수 게이트는 모든 입구/출구를 서로 떨어뜨려 읽기 쉽게 만든다.
    const minNodeDistance = Math.min(count >= 4 ? 108 * scale : 145 * scale, minDimension * (count >= 4 ? 0.24 : 0.32));
    for (let i = 0; i < count; i++) {
      const entrance = this.findSafePhantomPortalPoint(existingNodes, minPlayerDistance, minNodeDistance);
      existingNodes.push(entrance);
      const exit = this.findSafePhantomPortalPoint(existingNodes, minPlayerDistance, minNodeDistance);
      existingNodes.push(exit);
      this.phantomPortals.push({
        entrance: { ...entrance, radius: 20 * scale },
        exit: { ...exit, radius: 20 * scale },
        // 생성 패턴이 끝난 뒤부터 지정된 시간 동안 유지한다.
        pendingActivation: true,
        life: lifetime,
        maxLife: lifetime
      });
    }
  },

  spawnPhantomFortresses(b) {
    this.clearPhantomFortresses();
    const spawned = [];
    const minDistance = Math.min(185 * scale, Math.min(width, height) * 0.34);
    // 일반 필드의 포탑 요새(type 2)는 현재 페이즈 기본 HP의 30배다.
    // 팬텀 패턴 소환체는 그 절반만 사용하며, 보스 본체 HP와는 무관하다.
    const fieldTurretHp = (baseHpTable[currentPhase] || 2) * 30;
    const fortressHp = Math.max(1, Math.round(fieldTurretHp * 0.5));
    for (let i = 0; i < 2; i++) {
      const point = this.findSafePhantomPortalPoint(spawned, minDistance, minDistance);
      const fortress = {
        x: point.x, y: point.y,
        radius: 26 * scale,
        hp: fortressHp,
        maxHp: fortressHp,
        speed: 0,
        isPhantomFortress: true,
        shootTimer: 0.7 + Math.random() * 0.6,
        color: '#fb7185'
      };
      enemies.push(fortress);
      this.phantomFortresses.push(fortress);
      spawned.push(fortress);
    }
    showFloatingText('⚠ FORTRESS TURRETS DEPLOYED', b.x, b.y - b.radius - 22 * scale, '#fb7185');
  },

  applyPhantomPatternRotation(b, p, dt) {
    if (!Number.isFinite(p.rotationSpeed)) {
      p.rotationSpeed = 0.36 + Math.random() * 0.72;
      p.rotationDirection = Math.random() < 0.5 ? -1 : 1;
      p.rotationFlipTimer = 0.85 + Math.random() * 1.15;
    }
    p.rotationFlipTimer -= dt;
    if (p.rotationFlipTimer <= 0) {
      p.rotationDirection *= -1;
      p.rotationFlipTimer = 1.0 + Math.random() * 1.6;
    }
    b.facingAngle = this.normalizeAngle(b.facingAngle + p.rotationDirection * p.rotationSpeed * dt);
  },

  firePhantomRadial(b, count = 12, speed = 3.8, rotation = 0, color = '#c084fc') {
    for (let i = 0; i < count; i++) {
      const a = rotation + i * Math.PI * 2 / count;
      this.bossBullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * speed * scale, vy: Math.sin(a) * speed * scale, radius: 3.8 * scale, color });
    }
    Sound.playEnemyShoot();
  },

  firePhantomPortalVolley(b, bulletsPerPortal = 3, color = '#67e8f9') {
    for (const portal of this.phantomPortals) {
      const base = Math.atan2(portal.entrance.y - b.y, portal.entrance.x - b.x);
      for (let i = 0; i < bulletsPerPortal; i++) {
        const a = base + (i - (bulletsPerPortal - 1) / 2) * 0.12;
        this.bossBullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * 5.0 * scale, vy: Math.sin(a) * 5.0 * scale, radius: 3.5 * scale, color });
      }
    }
    Sound.playEnemyShoot();
  },

  updatePhantomPortals(dt) {
    if (this.phantomPlayerPortalCooldown > 0) this.phantomPlayerPortalCooldown -= dt;
    for (let i = this.phantomPortals.length - 1; i >= 0; i--) {
      const portal = this.phantomPortals[i];
      if (portal.pendingActivation) {
        // 생성한 3/4 패턴이 끝나는 순간부터 수명을 계산한다. 이후 다른 패턴으로
        // 넘어가도 시간을 멈추지 않아 맵 기믹의 지속시간이 일관된다.
        if (this.state === 'pattern') continue;
        portal.pendingActivation = false;
      }
      portal.life -= dt;
      if (portal.life <= 0) { this.phantomPortals.splice(i, 1); continue; }
      if (gameState === 'playing' && this.phantomPlayerPortalCooldown <= 0 && Math.hypot(player.x - portal.entrance.x, player.y - portal.entrance.y) < player.radius + portal.entrance.radius) {
        const angle = Math.atan2(player.y - portal.entrance.y, player.x - portal.entrance.x);
        player.x = Math.max(player.radius, Math.min(width - player.radius, portal.exit.x + Math.cos(angle) * (portal.exit.radius + player.radius + 3 * scale)));
        player.y = Math.max(player.radius, Math.min(height - player.radius, portal.exit.y + Math.sin(angle) * (portal.exit.radius + player.radius + 3 * scale)));
        player.targetX = player.x;
        player.targetY = player.y;
        this.phantomPlayerPortalCooldown = 0.45;
        addExplosion(portal.exit.x, portal.exit.y, '#67e8f9', 7);
      }
    }
  },

  updatePhantomPatterns(dt) {
    const b = this.activeBoss;
    if (!b) return;
    const p = b.phantom || (b.phantom = { step: 0, timer: 0, count: 0, volleys: 0, rotations: 0, warned: false });
    // 패턴 재개/테스트 상태에서도 누적 카운터가 NaN이 되지 않도록 기본값을 보장한다.
    if (!Number.isFinite(p.timer)) p.timer = 0;
    if (!Number.isFinite(p.count)) p.count = 0;
    if (!Number.isFinite(p.volleys)) p.volleys = 0;
    // 텔레포트 경고가 끝날 때까지 어떤 공격도 실행하지 않는다.
    if (this.updatePhantomWarp(b, dt)) return;

    if (this.currentPattern === 1) { // PHANTOM TURN
      if (!p.warned) {
        p.warned = true;
        p.warningTimer = 0.35;
        p.turnDuration = 12.0 + Math.random() * 4.0; // 충분한 회전을 보장하는 긴 패턴
        p.turnElapsed = 0;
        p.turnSpeed = 0.52 + Math.random() * 1.05;
        p.turnDirection = Math.random() < 0.5 ? -1 : 1;
        const reversalCount = 1 + Math.floor(Math.random() * 2);
        // 방향 전환은 균등하게 벌려 배치해, 짧은 시간에 되돌아가는 느낌을 막는다.
        p.turnReversals = Array.from({ length: reversalCount }, (_, index) => {
          const base = p.turnDuration * (index + 1) / (reversalCount + 1);
          return base + (Math.random() - 0.5) * 0.9;
        });
        p.nextReversal = 0;
        p.shotTimer = 0.28 + Math.random() * 0.34;
        this.warnPhantom(b, 'PHANTOM TURN');
        return;
      }
      if (p.warningTimer > 0) { p.warningTimer -= dt; if (p.warningTimer > 0) return; p.warningTimer = 0; }
      p.turnElapsed += dt;
      if (p.nextReversal < p.turnReversals.length && p.turnElapsed >= p.turnReversals[p.nextReversal]) {
        p.turnDirection *= -1;
        p.nextReversal++;
      }
      b.facingAngle = this.normalizeAngle(b.facingAngle + p.turnDirection * p.turnSpeed * dt);
      p.shotTimer -= dt;
      if (p.shotTimer <= 0) {
        this.firePhantomRadial(b, 8, 3.5, b.facingAngle, '#c084fc');
        p.shotTimer = 0.28 + Math.random() * 0.42;
      }
      if (p.turnElapsed >= p.turnDuration) this.setCooldown();
    } else if (this.currentPattern === 2) { // PHANTOM JUMP
      if (!p.warned) { p.warned = true; p.repetitions = 1 + Math.floor(Math.random() * 3); this.queuePhantomWarp(b); return; }
      this.applyPhantomPatternRotation(b, p, dt);
      if (p.step === 0) { p.step = 1; p.timer = 0.30; return; }
      if (p.step === 1) {
        p.timer -= dt;
        if (p.timer > 0) return;
        this.firePhantomRadial(b, 12, 3.8, p.volleys * Math.PI / 12, '#f0abfc');
        p.volleys++; p.timer = 0.7;
        if (p.volleys >= 5) { p.volleys = 0; p.count++; p.step = 0; if (p.count >= p.repetitions) this.setCooldown(); else this.queuePhantomWarp(b); }
      }
    } else if (this.currentPattern === 3 || this.currentPattern === 4) { // PHANTOM GATE / GATE CROSS
      if (!p.warned) { p.warned = true; this.spawnPhantomPortals(this.currentPattern === 3 ? 1 : 2, 15); p.timer = 0.4; this.warnPhantom(b, this.currentPattern === 3 ? 'PHANTOM GATE' : 'GATE CROSS', 0.4); return; }
      this.applyPhantomPatternRotation(b, p, dt);
      p.timer -= dt;
      if (p.timer > 0) return;
      this.firePhantomPortalVolley(b, this.currentPattern === 3 ? 3 : 2, this.currentPattern === 3 ? '#67e8f9' : '#f9a8d4');
      p.timer = this.currentPattern === 3 ? 0.48 : 0.38;
      p.count++;
      if (p.count >= (this.currentPattern === 3 ? 9 : 12)) this.setCooldown();
    } else if (this.currentPattern === 5) { // SHIELD RAM
      if (!p.warned) {
        p.warned = true;
        p.ramIndex = 0;
        this.beginPhantomRam(b, p);
        return;
      }
      if (p.step === 'warn') {
        p.timer -= dt;
        if (b.phantomRamWarning) b.phantomRamWarning.timer = Math.max(0, p.timer);
        this.turnPhantomToward(b, b.targetFacingAngle, dt, 10);
        if (p.timer > 0) return;
        b.phantomRamWarning = null;
        p.step = 'dash';
        Sound.playGundamBeam();
        return;
      }
      if (p.step === 'dash') {
        p.ramProgress += dt / 0.48;
        const t = Math.min(1, p.ramProgress);
        b.x = p.startX + (p.targetX - p.startX) * t;
        b.y = p.startY + (p.targetY - p.startY) * t;
        if (t < 1) return;
        p.ramIndex++;
        if (p.ramIndex < 3) {
          this.beginPhantomRam(b, p);
        } else {
          p.step = 'return';
          p.returnTimer = 0;
        }
        return;
      }
      // 세 번째 돌진 뒤에는 중앙으로 안전하게 복귀하고 다음 패턴으로 넘긴다.
      p.returnTimer += dt;
      b.x += (width / 2 - b.x) * Math.min(1, dt * 2.8);
      b.y += (height * 0.50 - b.y) * Math.min(1, dt * 2.8);
      if (p.returnTimer >= 0.65) this.setCooldown();
    } else if (this.currentPattern === 6) { // FORTRESS TURRETS
      if (!p.warned) {
        p.warned = true;
        p.timer = 0.45;
        this.warnPhantom(b, 'FORTRESS TURRETS', 0.45);
        return;
      }
      this.applyPhantomPatternRotation(b, p, dt);
      p.timer -= dt;
      if (p.timer > 0) return;
      if (p.step === 0) {
        this.spawnPhantomFortresses(b);
        p.step = 1;
        p.timer = 0.55;
        return;
      }
      // 요새가 전장을 유지하는 동안 본체는 짧은 탄막만 보태고 패턴은 종료한다.
      this.firePhantomRadial(b, 6, 3.2, b.facingAngle, '#fda4af');
      this.setCooldown();
    } else if (this.currentPattern === 7) { // ROTATING FORTRESS
      if (!p.warned) {
        p.warned = true;
        p.warningTimer = 0.4;
        p.route = Array.from({ length: 4 }, () => this.randomPhantomArenaPoint());
        p.routeIndex = 0;
        p.step = 'roam';
        p.shotTimer = 0.85;
        this.warnPhantom(b, 'ROTATING FORTRESS', 0.4);
        return;
      }
      if (p.warningTimer > 0) { p.warningTimer -= dt; if (p.warningTimer > 0) return; p.warningTimer = 0; }
      // 위치와 상관없이 전방 보호막을 계속 돌려 후방을 추적하게 만든다.
      b.facingAngle = this.normalizeAngle(b.facingAngle + dt * 1.05);
      p.shotTimer -= dt;
      if (p.shotTimer <= 0) {
        this.firePhantomRadial(b, 10, 3.25, b.facingAngle, '#c4b5fd');
        p.shotTimer = 1.05 + Math.random() * 0.38;
      }
      const destination = p.step === 'roam' ? p.route[p.routeIndex] : { x: width / 2, y: height * 0.50 };
      const dx = destination.x - b.x;
      const dy = destination.y - b.y;
      const distance = Math.hypot(dx, dy);
      const move = Math.min(distance, 155 * scale * dt);
      if (distance > 0.001) {
        b.x += dx / distance * move;
        b.y += dy / distance * move;
      }
      if (distance > 7 * scale) return;
      if (p.step === 'roam' && ++p.routeIndex < p.route.length) return;
      if (p.step === 'roam') {
        p.step = 'return';
        return;
      }
      this.setCooldown();
    } else if (this.currentPattern === 8) { // PHANTOM COLLAPSE
      if (!p.warned) { p.warned = true; this.clearPhantomPortals(); this.queuePhantomWarp(b, { x: width / 2, y: height * 0.50 }); return; }
      if (p.step === 0) { this.spawnPhantomPortals(4); p.step = 1; p.timer = 0.45; this.warnPhantom(b, 'PHANTOM COLLAPSE', 0.45); return; }
      p.timer -= dt;
      if (p.timer > 0) return;
      if (p.step === 1) {
        this.applyPhantomPatternRotation(b, p, dt);
        this.firePhantomPortalVolley(b, 2, '#f0abfc'); p.count++; p.timer = 0.38;
        if (p.count >= 10) { p.step = 2; p.count = 0; }
      } else if (p.step === 2) {
        b.facingAngle = this.normalizeAngle(b.facingAngle + dt * 1.5); p.count += dt;
        if (p.count >= 1.8) { p.step = 3; this.queuePhantomWarp(b); }
      } else if (p.step === 3 && !b.phantomPendingWarp) {
        this.spawnPhantomPortals(4); p.step = 4; p.count = 0; p.timer = 0.4; this.warnPhantom(b, 'COLLAPSE: SECOND GATE', 0.4);
      } else if (p.step === 4) {
        this.applyPhantomPatternRotation(b, p, dt);
        this.firePhantomPortalVolley(b, 2, '#f9a8d4'); p.count++; p.timer = 0.42;
        if (p.count >= 8) this.setCooldown();
      }
    }
  },

  startChronosPattern() {
    const b = this.activeBoss;
    const c = b?.chronos;
    if (!b || !c || c.transition || c.stunTimer > 0) { this.setCooldown(); return; }

    const labels = {
      1: 'CLOCK SHOT', 2: 'SECOND HAND', 3: 'MEMORY MARK', 4: 'SMALL COLLAPSE',
      5: 'CROSS TIME', 6: 'THREE MOMENTS', 7: 'TIME WAVE', 8: 'EVENT HORIZON',
      9: 'DOUBLE MEMORY', 10: 'REVERSE HISTORY', 11: 'SHATTERED TIME', 12: 'END OF TIME'
    };
    c.pattern = { id: this.currentPattern, timer: 0, step: 0, shotTimer: 0, captures: [] };
    c.positionMemory = [];
    showFloatingText(`⏳ ${labels[this.currentPattern] || 'TEMPORAL EVENT'}`, b.x, b.y - b.radius - 20 * scale, '#fde68a');

    if (this.currentPattern === 4) this.startChronosCollapse(1, { duration: 6.2, strength: 115 * scale, moving: false });
    else if (this.currentPattern === 8) this.startChronosCollapse(1, { duration: 7.2, strength: 140 * scale, moving: true });
    else if (this.currentPattern === 11) this.startChronosCollapse(2, { duration: 7.5, strength: 95 * scale, moving: true });
  },

  updateChronosState(dt, b) {
    const c = b?.chronos;
    if (!c) return false;
    c.ringAngle += dt;
    if (c.flash) {
      c.flash.timer -= dt;
      if (c.flash.timer <= 0) c.flash = null;
    }
    if (c.ultimateCooldown > 0) c.ultimateCooldown -= dt;

    // 페이즈 전환은 현재 시공간 오브젝트를 완전히 정리한 뒤 무적 연출로 분리한다.
    const ratio = Math.max(0, b.hp / b.maxHp);
    const targetPhase = c.phase === 1 && ratio <= 0.70 ? 2 : (c.phase === 2 && ratio <= 0.35 ? 3 : 0);
    if (!c.transition && targetPhase) this.startChronosPhaseTransition(targetPhase);

    this.updateChronosBlackholes(dt, b);
    this.updateChronosDelayedVolleys(dt, c);
    this.updateChronosPreviews(dt);
    // Pattern 6의 위치 포착은 붕괴를 포함한 다음 패턴이 진행 중이어도 계속된다.
    this.updateChronosPositionSequences(dt, c);
    if (!c.collapseActive) this.updateChronosPositionStrikes(dt, b);
    // END OF TIME에서만 붕괴 중 시계는 계속 진행하지만, 붕괴가 끝나기 전에는 재생되지 않는다.
    if (!c.collapseActive || c.memories.some(memory => memory.isUltimate)) this.updateChronosMemories(dt, b);

    if (c.transition) {
      c.transition.timer -= dt;
      if (c.transition.timer <= 0) {
        const nextPhase = c.transition.target;
        c.transition = null;
        c.phase = nextPhase;
        c.pattern = null;
        c.phaseAnnouncement = 1.0;
        this.clearChronosTemporal();
        this.patternQueue = this.generateChronosQueue(nextPhase);
        this.currentPattern = null;
        this.state = 'cooldown';
        this.stateTimer = 0;
        this.cooldownDuration = 1.8;
        this.bossNameEl.textContent = `FINAL BOSS : CHRONOS · PHASE ${nextPhase}`;
        Sound.playPhaseAlert();
        showFloatingText(nextPhase === 2 ? '⌛ PHASE 2 — INTERFERENCE' : '💥 PHASE 3 — CATASTROPHE', width / 2, height * 0.36, nextPhase === 2 ? '#bae6fd' : '#e9d5ff');
      }
      return true;
    }

    if (c.stunTimer > 0) {
      c.stunTimer -= dt;
      return true;
    }
    return false;
  },

  startChronosPhaseTransition(target) {
    const b = this.activeBoss;
    const c = b?.chronos;
    if (!b || !c || c.transition) return;
    this.clearChronosTemporal();
    c.transition = { target, timer: target === 2 ? 1.45 : 1.75, maxTimer: target === 2 ? 1.45 : 1.75 };
    c.flash = { color: target === 2 ? '#67e8f9' : '#c4b5fd', timer: 0.35, maxTimer: 0.35 };
    c.pattern = null;
    Sound.playGundamBeam();
  },

  updateChronosPatterns(dt) {
    const b = this.activeBoss;
    const c = b?.chronos;
    const p = c?.pattern;
    if (!b || !c || !p) { this.setCooldown(); return; }
    p.timer += dt;

    if (p.id === 1) {
      if (p.step === 0) {
        this.fireChronosClockShot(b, Math.atan2(player.y - b.y, player.x - b.x), { volleyCount: 4, volleyInterval: 0.38, angleStep: 0.025 });
        p.step = 1;
      }
      if (p.timer >= 2.6) this.endChronosPattern();
    } else if (p.id === 2) {
      p.shotTimer += dt;
      if (p.step === 0) {
        p.step = 1;
        // 항상 3시에서 시작해 위·아래 중 한 방향으로 9시까지 반원을 쓸어 준다.
        p.startAngle = 0;
        p.direction = Math.random() < 0.5 ? -1 : 1;
        p.sweepAmount = Math.PI * (1.08 + Math.random() * 0.20);
      }
      if (p.shotTimer >= 0.46 && p.timer <= 3.8) {
        p.shotTimer = 0;
        const a = p.startAngle + p.direction * p.sweepAmount * Math.min(1, p.timer / 3.8);
        this.fireChronosClockShot(b, a, { count: 3, spread: 0.13, speed: 2.8, color: '#fbbf24', volleyCount: 1 });
      }
      if (p.timer >= 4.15) this.endChronosPattern();
    } else if (p.id === 3) {
      if (p.step === 0) {
        const data = this.fireChronosClockShot(b, Math.atan2(player.y - b.y, player.x - b.x), { volleyCount: 4, volleyInterval: 0.38, angleStep: 0.022 });
        this.recordChronosMemory(data);
        p.step = 1;
      }
      if (p.timer >= 6.1) this.endChronosPattern();
    } else if (p.id === 4 || p.id === 8 || p.id === 11) {
      if (!c.collapseActive && this.chronosBlackholes.length === 0) this.endChronosPattern();
    } else if (p.id === 5) {
      if (p.step === 0) {
        const data = this.fireChronosWave('vertical', 1, { laneCount: 8, volleyCount: 3, volleyInterval: 0.55 });
        this.recordChronosMemory(data);
        p.step = 1;
      }
      if (p.timer >= 2.9 && p.step === 1) {
        this.fireChronosWave('horizontal', Math.random() < 0.5 ? 1 : -1, { laneCount: 8, volleyCount: 3, volleyInterval: 0.55 });
        p.step = 2;
      }
      if (p.timer >= 6.4) this.endChronosPattern();
    } else if (p.id === 6) {
      if (p.step === 0) {
        this.beginChronosPositionSequence(false);
        p.step = 1;
        // 포착 자체는 분리된 시퀀스로 이어지므로, 즉시 다음 패턴 준비를 시작한다.
        this.endChronosPattern(0.25);
      }
    } else if (p.id === 7) {
      if (p.step === 0) {
        const data = this.fireChronosWave('vertical', Math.random() < 0.5 ? 1 : -1, { volleyCount: 4, volleyInterval: 0.50 });
        this.recordChronosMemory(data);
        p.step = 1;
      }
      if (p.timer >= 1.8 && p.step === 1) {
        this.fireChronosWave('horizontal', Math.random() < 0.5 ? 1 : -1, { volleyCount: 4, volleyInterval: 0.50 });
        p.step = 2;
      }
      if (p.timer >= 6.5) this.endChronosPattern();
    } else if (p.id === 9) {
      if (p.step === 0) {
        const data = this.fireChronosClockShot(b, Math.atan2(player.y - b.y, player.x - b.x), { volleyCount: 4, volleyInterval: 0.36, angleStep: 0.028 });
        this.recordChronosMemory(data, { delay: this.CHRONOS_MEMORY_REPLAY_DELAY });
        p.step = 1;
      }
      if (p.timer >= 1.2 && p.step === 1) {
        const data = this.fireChronosWave('horizontal', Math.random() < 0.5 ? 1 : -1, { volleyCount: 3, volleyInterval: 0.52 });
        this.recordChronosMemory(data, { delay: 5.65 });
        p.step = 2;
      }
      if (p.timer >= 8.4) this.endChronosPattern();
    } else if (p.id === 10) {
      if (p.timer >= p.captures.length * 0.72 && p.captures.length < 3) {
        const point = { x: player.x, y: player.y };
        p.captures.push(point);
        this.addChronosFlash('#facc15', 0.16);
        showFloatingText(`REVERSE MEMORY ${p.captures.length}/3`, point.x, point.y - 18 * scale, '#fde68a');
      }
      if (p.captures.length === 3 && p.step === 0) {
        this.recordChronosMemory({ kind: 'positions', points: p.captures.map(point => ({ ...point })), reverse: true }, { direction: -1 });
        p.step = 1;
      }
      if (p.timer >= 9.2) this.endChronosPattern();
    } else if (p.id === 12) {
      this.updateChronosEndOfTime(dt, b, c, p);
    }
  },

  updateChronosEndOfTime(dt, b, c, p) {
    if (p.step === 0) {
      const data = this.fireChronosClockShot(b, Math.atan2(player.y - b.y, player.x - b.x), { volleyCount: 3, volleyInterval: 0.36, angleStep: 0.03 });
      this.recordChronosMemory(data, { isUltimate: true });
      p.step = 1;
    }
    if (p.timer >= 0.8 && p.step === 1) {
      this.startChronosCollapse(1, { duration: 2.25, strength: 120 * scale, moving: false });
      p.step = 2;
    }
    if (p.timer >= 4.25 && p.step === 2 && !c.collapseActive) {
      this.fireChronosWave('horizontal', Math.random() < 0.5 ? 1 : -1, { simple: true, volleyCount: 3, volleyInterval: 0.48 });
      p.step = 3;
    }
    if (p.timer >= 6.75 && p.step === 3) {
      this.bossBullets = this.bossBullets.filter(bullet => !bullet.isChronos);
      this.chronosPreviews = [];
      c.ultimateUsed = true;
      c.stunTimer = 2.0;
      this.addChronosFlash('#dbeafe', 0.45);
      Sound.playBomb();
      showFloatingText('⌛ TIME BREAK — FREE DAMAGE WINDOW', width / 2, height * 0.40, '#dbeafe');
      this.endChronosPattern();
    }
  },

  endChronosPattern(cooldownOverride = null) {
    const c = this.activeBoss?.chronos;
    if (c) c.pattern = null;
    this.setCooldown();
    if (cooldownOverride !== null) this.cooldownDuration = cooldownOverride;
  },

  addChronosFlash(color, duration = 0.25) {
    const c = this.activeBoss?.chronos;
    if (c) c.flash = { color, timer: duration, maxTimer: duration };
  },

  recordChronosMemory(data, options = {}) {
    const c = this.activeBoss?.chronos;
    if (!c || !data || c.transition) return;
    const maxMemories = c.phase >= 3 ? 2 : 1;
    if (c.memories.length >= maxMemories) {
      const displaced = c.memories.shift();
      this.removeChronosMemoryPreview(displaced?.id);
    }
    const memory = {
      id: `${gameTime.toFixed(3)}-${Math.random().toString(16).slice(2)}`,
      data,
      timer: 0,
      delay: options.delay || this.CHRONOS_MEMORY_REPLAY_DELAY,
      direction: options.direction || 1,
      isUltimate: !!options.isUltimate,
      previewId: options.previewId || null
    };
    c.memories.push(memory);
    this.createChronosMemoryPreview(memory);
    this.addChronosFlash('#facc15', 0.22);
    Sound.playEyeFlash();
    showFloatingText('MEMORY RECORDED', width / 2, height * 0.18, '#fde68a');
    return memory;
  },

  updateChronosMemories(dt, b) {
    const c = b?.chronos;
    if (!c) return;
    for (let i = c.memories.length - 1; i >= 0; i--) {
      const memory = c.memories[i];
      if (c.collapseActive && !memory.isUltimate) continue;
      memory.timer += dt;
      if (memory.timer >= memory.delay && !c.collapseActive) {
        this.replayChronosMemory(memory, b);
        this.removeChronosMemoryPreview(memory.id);
        c.memories.splice(i, 1);
      }
    }
  },

  createChronosMemoryPreview(memory) {
    const existing = memory.previewId && this.chronosPreviews.find(preview => preview.id === memory.previewId);
    if (existing) {
      existing.id = memory.id;
      existing.data = memory.data;
      existing.persistent = true;
      existing.capturing = false;
      return;
    }
    this.chronosPreviews.push({ id: memory.id, data: memory.data, persistent: true, capturing: false });
  },

  removeChronosMemoryPreview(memoryId) {
    if (!memoryId) return;
    this.chronosPreviews = this.chronosPreviews.filter(preview => preview.id !== memoryId);
  },

  replayChronosMemory(memory, b) {
    const replayOptions = { replay: true, damage: this.CHRONOS_REPLAY_DAMAGE_MULTIPLIER };
    const data = memory.data;
    this.addChronosFlash('#bae6fd', 0.28);
    Sound.playGundamBeam();
    if (data.kind === 'clockShot') this.fireChronosClockShot(b, data.angle, {
      ...replayOptions, origin: data.origin, count: data.count, spread: data.spread, speed: data.speed,
      volleyCount: data.volleyCount, volleyInterval: data.volleyInterval, angleStep: data.angleStep
    });
    else if (data.kind === 'wave') this.fireChronosWave(data.axis, data.direction, {
      ...replayOptions, lanes: data.lanes, speed: data.speed,
      volleyCount: data.volleyCount, volleyInterval: data.volleyInterval
    });
    else if (data.kind === 'positions') {
      const points = data.reverse ? [...data.points].reverse() : data.points.map(point => ({ ...point }));
      this.chronosPositionStrikes.push({ points, timer: 0.34, index: 0, cycle: 0, cycles: 1, interval: 0.56, damage: this.CHRONOS_REPLAY_DAMAGE_MULTIPLIER });
    }
  },

  updateChronosPreviews(dt) {
    for (let i = this.chronosPreviews.length - 1; i >= 0; i--) {
      const preview = this.chronosPreviews[i];
      if (preview.persistent) continue;
      preview.life -= dt;
      if (preview.life <= 0) this.chronosPreviews.splice(i, 1);
    }
  },

  beginChronosPositionSequence(reverse = false) {
    const sequenceId = `position-${weaponAnimTime.toFixed(3)}-${Math.random().toString(16).slice(2)}`;
    this.chronosPositionSequences.push({
      id: sequenceId,
      reverse,
      timer: 0,
      nextCaptureAt: 0,
      captureInterval: 1.30,
      points: [],
      finished: false
    });
    // 첫 위치부터 푸른 수정으로 명시하고, 기억이 완성될 때까지도 다음 패턴과 병행한다.
    this.chronosPreviews.push({
      id: sequenceId,
      data: { kind: 'positions', points: [] },
      persistent: true,
      capturing: true
    });
  },

  updateChronosPositionSequences(dt, c) {
    for (let i = this.chronosPositionSequences.length - 1; i >= 0; i--) {
      const sequence = this.chronosPositionSequences[i];
      sequence.timer += dt;
      if (sequence.points.length < 3 && sequence.timer >= sequence.nextCaptureAt) {
        const point = { x: player.x, y: player.y };
        sequence.points.push(point);
        sequence.nextCaptureAt += sequence.captureInterval;
        const preview = this.chronosPreviews.find(entry => entry.id === sequence.id);
        if (preview) preview.data.points = sequence.points.map(saved => ({ ...saved }));
        this.addChronosFlash('#facc15', 0.16);
        Sound.playEyeFlash();
        showFloatingText(`MEMORY ${sequence.points.length}/3`, point.x, point.y - 20 * scale, '#bae6fd');
      }
      if (!sequence.finished && sequence.points.length === 3) {
        sequence.finished = true;
        const memory = this.recordChronosMemory({
          kind: 'positions',
          points: sequence.points.map(point => ({ ...point })),
          reverse: sequence.reverse
        }, { direction: sequence.reverse ? -1 : 1, previewId: sequence.id });
        if (memory) {
          const preview = this.chronosPreviews.find(entry => entry.id === memory.id);
          if (preview) preview.capturing = false;
        }
        this.chronosPositionSequences.splice(i, 1);
      }
    }
  },

  updateChronosPositionStrikes(dt, b) {
    for (let i = this.chronosPositionStrikes.length - 1; i >= 0; i--) {
      const strike = this.chronosPositionStrikes[i];
      strike.timer -= dt;
      if (strike.timer > 0) continue;
      if (strike.index >= strike.points.length) {
        strike.cycle++;
        if (strike.cycle >= strike.cycles) {
          this.chronosPositionStrikes.splice(i, 1);
          continue;
        }
        strike.index = 0;
      }
      this.fireChronosPositionBurst(strike.points[strike.index], strike.damage);
      strike.index++;
      strike.timer = strike.interval;
    }
  },

  fireChronosPositionBurst(point, damage = 1) {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count;
      this.bossBullets.push({
        x: point.x, y: point.y, vx: Math.cos(angle) * 2.55 * scale, vy: Math.sin(angle) * 2.55 * scale,
        radius: 4.2 * scale, color: '#bae6fd', damage, isChronos: true, isChronosReplay: true
      });
    }
    addExplosion(point.x, point.y, '#bae6fd', 8);
  },

  spawnChronosClockVolley(data, options = {}) {
    const color = options.replay ? '#d7fbff' : (options.color || '#fbbf24');
    const damage = options.damage ?? 1;
    const start = -(data.count - 1) * 0.5;
    for (let i = 0; i < data.count; i++) {
      const a = data.angle + (start + i) * data.spread;
      this.bossBullets.push({
        x: data.origin.x, y: data.origin.y, vx: Math.cos(a) * data.speed * scale, vy: Math.sin(a) * data.speed * scale,
        radius: 3.8 * scale, color, damage, isChronos: true, isChronosReplay: !!options.replay
      });
    }
  },

  spawnChronosWaveVolley(data, options = {}) {
    const color = options.replay ? '#d7fbff' : '#fbbf24';
    const damage = options.damage ?? 1;
    for (const lane of data.lanes) {
      const x = data.axis === 'vertical' ? lane : (data.direction > 0 ? -16 * scale : width + 16 * scale);
      const y = data.axis === 'vertical' ? (data.direction > 0 ? -16 * scale : height + 16 * scale) : lane;
      this.bossBullets.push({
        x, y,
        vx: data.axis === 'vertical' ? 0 : data.direction * data.speed * scale,
        vy: data.axis === 'vertical' ? data.direction * data.speed * scale : 0,
        radius: 5.5 * scale, color, damage, isChronos: true, isChronosReplay: !!options.replay
      });
    }
  },

  updateChronosDelayedVolleys(dt, c) {
    if (c?.collapseActive) return;
    for (let i = this.chronosDelayedVolleys.length - 1; i >= 0; i--) {
      const volley = this.chronosDelayedVolleys[i];
      volley.timer -= dt;
      if (volley.timer > 0) continue;
      if (volley.kind === 'clockShot') this.spawnChronosClockVolley(volley.data, volley.options);
      else if (volley.kind === 'wave') this.spawnChronosWaveVolley(volley.data, volley.options);
      this.chronosDelayedVolleys.splice(i, 1);
    }
  },

  fireChronosClockShot(b, angle, options = {}) {
    const count = options.count ?? 7;
    const spread = options.spread ?? 0.17;
    const speed = options.speed ?? 3.1;
    const origin = options.origin ? { ...options.origin } : { x: b.x, y: b.y + 18 * scale };
    const volleyCount = Math.max(1, options.volleyCount ?? 4);
    const volleyInterval = options.volleyInterval ?? 0.38;
    const angleStep = options.angleStep ?? 0.02;
    const data = { kind: 'clockShot', origin, angle, count, spread, speed, volleyCount, volleyInterval, angleStep };
    this.spawnChronosClockVolley(data, options);
    for (let volley = 1; volley < volleyCount; volley++) {
      this.chronosDelayedVolleys.push({
        kind: 'clockShot', timer: volley * volleyInterval,
        data: { ...data, angle: angle + angleStep * volley },
        options: { replay: !!options.replay, damage: options.damage ?? 1, color: options.color }
      });
    }
    return data;
  },

  fireChronosWave(axis, direction, options = {}) {
    const laneCount = Math.max(1, options.laneCount ?? 10);
    const lanes = options.lanes ? [...options.lanes] : (axis === 'vertical'
      ? Array.from({ length: laneCount }, (_, i) => (i + 0.5) / laneCount * width)
      : Array.from({ length: laneCount }, (_, i) => (i + 0.5) / laneCount * height));
    const speed = options.speed ?? 2.9;
    const volleyCount = Math.max(1, options.volleyCount ?? 3);
    const volleyInterval = options.volleyInterval ?? 0.52;
    const data = { kind: 'wave', axis, direction, lanes, speed, volleyCount, volleyInterval };
    this.spawnChronosWaveVolley(data, options);
    for (let volley = 1; volley < volleyCount; volley++) {
      this.chronosDelayedVolleys.push({
        kind: 'wave', timer: volley * volleyInterval, data,
        options: { replay: !!options.replay, damage: options.damage ?? 1 }
      });
    }
    return data;
  },

  startChronosCollapse(count, options = {}) {
    const b = this.activeBoss;
    const c = b?.chronos;
    if (!b || !c) return;
    this.chronosBlackholes = [];
    // 붕괴 진입 후 예약 탄막이 뒤늦게 발사되는 일을 막는다.
    this.chronosDelayedVolleys = [];
    this.bossBullets = this.bossBullets.filter(bullet => !bullet.isChronos);
    const duration = options.duration ?? 5.5;
    const strength = options.strength ?? 70 * scale;
    const moving = !!options.moving;
    const gravityRadius = Math.hypot(width, height) * 1.15;
    const visualBase = Math.min(width, height) * (count === 1 ? 0.36 : 0.28);
    for (let i = 0; i < count; i++) {
      const side = count === 1 ? (Math.random() < 0.5 ? -1 : 1) : (i === 0 ? -1 : 1);
      const x = count === 1 ? (side < 0 ? width * 0.16 : width * 0.84) : width * (i === 0 ? 0.23 : 0.77);
      const y = count === 1 ? height * (0.30 + Math.random() * 0.34) : height * (i === 0 ? 0.32 : 0.66);
      this.chronosBlackholes.push({
        id: ++this.chronosMeteorSerial,
        x, y, radius: gravityRadius, gravityRadius, visualRadius: visualBase,
        coreRadius: visualBase * (count === 1 ? 0.24 : 0.21),
        life: duration, maxLife: duration, strength, moving, moveAngle: Math.random() * Math.PI * 2,
        speed: (moving ? 24 : 0) * scale, phase: Math.random() * Math.PI * 2,
        meteorTimer: 0.10 + i * 0.22
      });
    }
    c.collapseActive = true;
    this.addChronosFlash('#f97316', 0.24);
    Sound.playBomb();
    showFloatingText('☄ CHRONOS COLLAPSE', width / 2, height * 0.22, '#fdba74');
  },

  updateChronosBlackholes(dt, b) {
    const c = b?.chronos;
    if (!c) return;
    for (let i = this.chronosBlackholes.length - 1; i >= 0; i--) {
      const hole = this.chronosBlackholes[i];
      hole.life -= dt;
      hole.gravityRadius = Math.hypot(width, height) * 1.15;
      hole.radius = hole.gravityRadius;
      if (hole.moving) {
        hole.moveAngle += dt * 0.42;
        hole.x += Math.cos(hole.moveAngle + hole.phase) * hole.speed * dt;
        hole.y += Math.sin(hole.moveAngle * 0.72 + hole.phase) * hole.speed * dt;
        const margin = Math.min(hole.visualRadius * 0.72, Math.min(width, height) * 0.18);
        hole.x = Math.max(margin, Math.min(width - margin, hole.x));
        hole.y = Math.max(margin, Math.min(height - margin, hole.y));
      }
      hole.meteorTimer -= dt;
      if (hole.life > 0.85 && hole.meteorTimer <= 0) {
        this.spawnChronosCollapseMeteor(hole);
        hole.meteorTimer = 0.72 + Math.random() * 0.28;
      }
      if (gameState === 'playing') {
        const dx = hole.x - player.x, dy = hole.y - player.y;
        const distance = Math.hypot(dx, dy);
        if (distance < hole.gravityRadius && distance > 0.001) {
          const falloff = 0.30 + 0.70 * (1 - distance / hole.gravityRadius);
          const step = Math.min(distance * 0.26, hole.strength * falloff * dt);
          player.x = Math.max(player.radius, Math.min(width - player.radius, player.x + dx / distance * step));
          player.y = Math.max(player.radius, Math.min(height - player.radius, player.y + dy / distance * step));
          player.targetX = player.x; player.targetY = player.y;
        }
      }
      if (hole.life <= 0) this.chronosBlackholes.splice(i, 1);
    }
    this.updateChronosCollapseMeteors(dt);
    c.collapseActive = this.chronosBlackholes.length > 0;
    if (!c.collapseActive) this.clearChronosCollapseMeteors();
  },

  spawnChronosCollapseMeteor(hole) {
    const side = Math.floor(Math.random() * 4);
    const margin = 28 * scale;
    let x, y;
    if (side === 0) { x = -margin; y = Math.random() * height; }
    else if (side === 1) { x = width + margin; y = Math.random() * height; }
    else if (side === 2) { x = Math.random() * width; y = -margin; }
    else { x = Math.random() * width; y = height + margin; }
    const angle = Math.atan2(hole.y - y, hole.x - x) + (Math.random() - 0.5) * 0.18;
    const speed = (1.45 + Math.random() * 0.65) * scale;
    obstacles.push({
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      radius: (13 + Math.random() * 8) * scale,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.055,
      isChronosMeteor: true,
      chronosHoleId: hole.id
    });
  },

  updateChronosCollapseMeteors(dt) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const meteor = obstacles[i];
      if (!meteor.isChronosMeteor) continue;
      let hole = this.chronosBlackholes.find(candidate => candidate.id === meteor.chronosHoleId);
      if (!hole && this.chronosBlackholes.length > 0) {
        hole = this.chronosBlackholes.reduce((best, candidate) =>
          Math.hypot(candidate.x - meteor.x, candidate.y - meteor.y) < Math.hypot(best.x - meteor.x, best.y - meteor.y) ? candidate : best
        );
      }
      if (!hole) continue;
      const dx = hole.x - meteor.x, dy = hole.y - meteor.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= hole.coreRadius + meteor.radius * 0.55) {
        addExplosion(meteor.x, meteor.y, '#fb923c', 8);
        obstacles.splice(i, 1);
        continue;
      }
      if (distance > 0.001) {
        const currentSpeed = Math.min(3.8 * scale, Math.hypot(meteor.vx, meteor.vy) + 0.85 * scale * dt);
        const turn = Math.min(0.24, dt * 7.0);
        meteor.vx += ((dx / distance) * currentSpeed - meteor.vx) * turn;
        meteor.vy += ((dy / distance) * currentSpeed - meteor.vy) * turn;
      }
    }
  },

  clearChronosCollapseMeteors() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
      if (!obstacles[i].isChronosMeteor) continue;
      addExplosion(obstacles[i].x, obstacles[i].y, '#fb923c', 5);
      obstacles.splice(i, 1);
    }
  },

  absorbChronosPlayerBullet(bullet, dt) {
    if (this.bossType !== 'chronos' || this.chronosBlackholes.length === 0 || !bullet) return false;
    for (const hole of this.chronosBlackholes) {
      const dx = hole.x - bullet.x, dy = hole.y - bullet.y;
      const distance = Math.hypot(dx, dy);
      const gravityRadius = hole.gravityRadius || hole.radius;
      if (distance > gravityRadius || distance <= 0.001) continue;
      const projectileCore = bullet.isBlackHole ? (bullet.coreRadius || 0) : (bullet.radius || 0);
      if (distance <= hole.coreRadius + projectileCore) {
        addExplosion(bullet.x, bullet.y, '#fb923c', 4);
        return true;
      }
      // 투사체는 화면 전역에서 눈에 띄게 휘어야 하므로 플레이어보다 강한 흡인 계수를 사용한다.
      const falloff = 0.36 + 0.64 * (1 - distance / gravityRadius);
      const bulletPull = Math.max(320 * scale, hole.strength * 2.65);
      const step = Math.min(distance * 0.38, bulletPull * falloff * dt);
      bullet.x += dx / distance * step;
      bullet.y += dy / distance * step;
      if (Number.isFinite(bullet.vx) && Number.isFinite(bullet.vy)) {
        const velocityPull = (0.12 + 0.30 * falloff) * scale;
        bullet.vx += dx / distance * velocityPull;
        bullet.vy += dy / distance * velocityPull;
      }
    }
    return false;
  },

  isChronosBeamAbsorbed(x1, y1, x2, y2) {
    if (this.bossType !== 'chronos' || this.chronosBlackholes.length === 0) return false;
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy || 1;
    return this.chronosBlackholes.some(hole => {
      const t = Math.max(0, Math.min(1, ((hole.x - x1) * dx + (hole.y - y1) * dy) / lenSq));
      return Math.hypot(hole.x - (x1 + dx * t), hole.y - (y1 + dy * t)) <= hole.coreRadius;
    });
  },

  forceChronosPhase(targetPhase) {
    const b = this.activeBoss;
    const c = b?.chronos;
    if (!b || !c || targetPhase <= c.phase || targetPhase > 3) return false;
    b.hp = b.maxHp * (targetPhase === 2 ? 0.65 : 0.30);
    c.phase = targetPhase - 1;
    this.startChronosPhaseTransition(targetPhase);
    return true;
  },

  forceChronosEndOfTime() {
    const b = this.activeBoss;
    const c = b?.chronos;
    if (!b || !c || c.transition) return false;
    this.clearChronosTemporal();
    this.currentPattern = 12;
    this.state = 'pattern';
    this.stateTimer = 0;
    this.startChronosPattern();
    return true;
  },

  updateProjectiles(dt) {
    for (let i = this.delayedBombards.length - 1; i >= 0; i--) {
      const db = this.delayedBombards[i];
      db.spawnIn -= dt;
      if (db.spawnIn <= 0) {
        this.markers.push({
          x: player.x, y: player.y,
          radius: db.radius,
          timer: db.bombTimer, maxTimer: db.bombTimer,
          color: '#ef4444'
        });
        this.delayedBombards.splice(i, 1);
      }
    }

    for (let i = this.sideBitDrones.length - 1; i >= 0; i--) {
      const bit = this.sideBitDrones[i];
      bit.timer -= dt;
      if (bit.timer <= 0) {
        addExplosion(bit.x, bit.y, '#38bdf8', 14);
        this.sideBitDrones.splice(i, 1);
      }
    }

    for (let i = this.bossBullets.length - 1; i >= 0; i--) {
      const b = this.bossBullets[i];
      // 피격으로 플레이어가 사망하면 takeDamage()가 BossManager.reset()을 호출해
      // 같은 프레임 안에서 배열 전체를 비울 수 있다. 이미 제거된 인덱스는 건너뛴다.
      if (!b) continue;
      if (b.isSwayBullet) {
        b.swayTimer += dt * 4;
        b.x += Math.sin(b.swayTimer) * 2.5 * scale;
        b.y += b.vy;
      } else {
        b.x += b.vx;
        b.y += b.vy;
      }

      // 팬텀 포탈을 지난 적 탄환은 출구에서 플레이어를 다시 조준하고 감속한다.
      if (b.phantomPortalCooldown > 0) b.phantomPortalCooldown -= dt;
      if (this.phantomPortals.length > 0 && (b.phantomPortalCooldown || 0) <= 0) {
        for (const portal of this.phantomPortals) {
          if (Math.hypot(b.x - portal.entrance.x, b.y - portal.entrance.y) < b.radius + portal.entrance.radius) {
            const speed = Math.max(1.8 * scale, Math.hypot(b.vx, b.vy) * 0.78);
            const angle = Math.atan2(player.y - portal.exit.y, player.x - portal.exit.x);
            b.x = portal.exit.x;
            b.y = portal.exit.y;
            b.vx = Math.cos(angle) * speed;
            b.vy = Math.sin(angle) * speed;
            b.phantomPortalCooldown = 0.40;
            b.phantomTeleported = true;
            addExplosion(portal.exit.x, portal.exit.y, '#67e8f9', 4);
            break;
          }
        }
      }

      if (b.x < -40 || b.x > width + 40 || b.y < -40 || b.y > height + 40) {
        this.bossBullets.splice(i, 1);
        continue;
      }

      if (gameState === 'playing' && player.invincibleTimer <= 0) {
        if (Math.hypot(player.x - b.x, player.y - b.y) < player.radius + b.radius) {
          takeDamage(b.damage || 1);
          // A fatal hit resets every BossManager projectile collection. Stop this
          // frame immediately instead of continuing with stale array indices.
          if (gameState !== 'playing') return;
          this.bossBullets.splice(i, 1);
        }
      }
    }

    for (let i = this.markers.length - 1; i >= 0; i--) {
      const m = this.markers[i];
      if (!m) continue;
      m.timer -= dt;
      if (m.timer <= 0) {
        Sound.playBomb();
        addExplosion(m.x, m.y, '#ef4444', 26);
        if (gameState === 'playing' && player.invincibleTimer <= 0) {
          if (Math.hypot(player.x - m.x, player.y - m.y) < m.radius + player.radius) {
            takeDamage();
            if (gameState !== 'playing') return;
          }
        }
        this.markers.splice(i, 1);
      }
    }

    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      if (!l) continue;
      if (l.warnTimer > 0) {
        l.warnTimer -= dt;
        if (l.warnTimer <= 0) {
          l.active = true;
          if (!l.silent) Sound.playLaserBeam();
        }
      } else if (l.active) {
        l.fireTimer -= dt;
        if (gameState === 'playing' && player.invincibleTimer <= 0) {
          let hit;
          if (l.type === 'screen_nuke') hit = true;
          else if (l.orient === 'h') hit = (player.y + player.radius >= l.y && player.y - player.radius <= l.y + l.height);
          else hit = (player.x + player.radius >= l.x && player.x - player.radius <= l.x + l.width);
          if (hit) {
            takeDamage();
            if (gameState !== 'playing') return;
          }
        }
        if (l.fireTimer <= 0) {
          this.lasers.splice(i, 1);
        }
      }
    }

    const beamOrigin = this.activeBoss;
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const bm = this.beams[i];
      if (!bm) continue;
      if (bm.shipTurretId && this.bossType === 'warship') {
        const turret = this.getWarshipPartPositions()[bm.shipTurretId];
        if (turret) { bm.ox = turret.x; bm.oy = turret.y; }
      } else if (bm.follow && beamOrigin) {
        bm.ox = beamOrigin.x;
        bm.oy = beamOrigin.y;
      }

      const shipAimTrackingActive = !bm.isShipAimBeam || bm.warnTimer > 0.05;
      if (bm.tracking && shipAimTrackingActive) {
        const desired = Math.atan2(player.y - bm.oy, player.x - bm.ox);
        let diff = desired - bm.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        const maxTurn = (bm.active ? bm.turnSpeedFire : bm.turnSpeedWarn) * dt;
        // M1-P4/5 조준 빔은 매 프레임 최단 회전 방향을 다시 계산한다.
        // 이전처럼 최초 회전 방향을 고정하면 먼 거리에서 플레이어가 반대편으로 이동했을 때 한 바퀴를 돌아 조준을 놓칠 수 있다.
        if (bm.isShipAimBeam) bm.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));
        else {
          if (!bm.turnDir) bm.turnDir = diff >= 0 ? 1 : -1;
          let dirDiff = diff * bm.turnDir;
          if (dirDiff < 0) dirDiff += Math.PI * 2;
          bm.angle += Math.min(maxTurn, dirDiff) * bm.turnDir;
        }
      }

      if (bm.warnTimer > 0) {
        bm.warnTimer -= dt;
        if (bm.warnTimer <= 0) {
          // 발사 직전 한 번 더 현재 좌표를 기준으로 잠가 장거리 조준 오차를 없앤다.
          if (bm.isShipAimBeam) bm.angle = Math.atan2(player.y - bm.oy, player.x - bm.ox);
          bm.active = true;
          if (!bm.silent) Sound.playLaserBeam();
        }
      } else if (bm.active) {
        bm.fireTimer -= dt;
        if (bm.sweep) bm.angle += bm.sweepSpeed * dt;
        if (bm.grow) {
          const progress = Math.max(0, Math.min(1, 1 - bm.fireTimer / bm.fireTotal));
          bm.width = bm.baseWidth * (0.25 + 0.75 * progress);
        }
        if (gameState === 'playing' && player.invincibleTimer <= 0) {
          const len = this.getBeamLength(bm);
          const p2 = { x: bm.ox + Math.cos(bm.angle) * len, y: bm.oy + Math.sin(bm.angle) * len };
          const dist = distToSegment({ x: bm.ox, y: bm.oy }, p2, { x: player.x, y: player.y });
          const shadowed = bm.blocked && this.isShadowed(bm.ox, bm.oy, player.x, player.y);
          if (dist < bm.width / 2 + player.radius && !shadowed) {
            takeDamage();
            if (gameState !== 'playing') return;
          }
        }
        if (bm.fireTimer <= 0) {
          this.beams.splice(i, 1);
        }
      }
    }

    for (let i = this.specialDrops.length - 1; i >= 0; i--) {
      const d = this.specialDrops[i];
      if (!d) continue;
      if (Math.hypot(player.x - d.x, player.y - d.y) < player.radius + d.radius) {
        player.superInvincibleTimer = 10.0;
        Sound.playShield();
        showFloatingText("⚡ 10초간 무적 가동! (보스 본체 충돌 주의) ⚡", player.x, player.y - 15 * scale, '#ffd32a');
        this.specialDrops.splice(i, 1);
      }
    }
  },

  draw(ctx) {
    const b = this.activeBoss;

    if (this.bossType === 'chronos' && b) this.drawChronosEffects(ctx, b);
    if (this.bossType === 'arsenal' && b) this.drawArsenalEffects(ctx, b);

    if (this.bossType === 'mini' && this.currentPattern === 1 && this.p1State === 'preview' && b) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 71, 87, 0.7)';
      ctx.lineWidth = 1.5 * scale;
      ctx.setLineDash([6, 6]);
      for (let i = -2; i <= 2; i++) {
        const a = this.p1Angle + i * 0.18;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y + 10 * scale);
        ctx.lineTo(b.x + Math.cos(a) * Math.max(width, height), b.y + 10 * scale + Math.sin(a) * Math.max(width, height));
        ctx.stroke();
      }
      ctx.restore();
    }

    if (this.bossType === 'final' && this.currentPattern === 1 && this.finalP1State === 'preview' && b) {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.lineWidth = 1.5 * scale;
      ctx.setLineDash([6, 6]);
      for (let i = -1.5; i <= 1.5; i += 1.0) {
        const a = this.finalP1Angle + i * 0.12;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y + 15 * scale);
        ctx.lineTo(b.x + Math.cos(a) * Math.max(width, height), b.y + 15 * scale + Math.sin(a) * Math.max(width, height));
        ctx.stroke();
      }
      ctx.restore();
    }

    if (this.bossType === 'final' && this.p6ShowWarning && b) {
      ctx.save();
      const bounce = Math.sin(gameTime * 24) * 6 * scale;

      ctx.fillStyle = `rgba(239, 68, 68, ${0.18 + Math.sin(gameTime * 20) * 0.08})`;
      ctx.fillRect(b.x - 45 * scale, b.y, 90 * scale, height - b.y);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${Math.round(24 * scale)}px -apple-system, sans-serif`;
      ctx.fillStyle = '#ff0033';
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 18 * scale;
      ctx.fillText("⚠️ DANGER ⚠️", b.x, b.y + b.radius + 26 * scale);

      ctx.font = `900 ${Math.round(36 * scale)}px sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ff0033';
      ctx.shadowBlur = 24 * scale;
      ctx.fillText("↓↓↓", b.x, b.y + b.radius + 64 * scale + bounce);
      ctx.restore();
    }

    if (this.bossType === 'final' && this.currentPattern === 7 && this.state === 'pattern' && this.stateTimer < 10.0 && b) {
      ctx.save();
      const progress = Math.min(1.0, this.stateTimer / 10.0);
      
      ctx.fillStyle = `rgba(255, 71, 87, ${progress * 0.22})`;
      ctx.fillRect(0, 0, width, height);

      const maxCoreRadius = 65 * scale;
      const currentCoreRadius = (8 * scale) + (maxCoreRadius - 8 * scale) * progress;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2 * scale;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(b.x, b.y + 15 * scale, maxCoreRadius, 0, Math.PI * 2);
      ctx.stroke();

      const grad = ctx.createRadialGradient(b.x, b.y + 15 * scale, 0, b.x, b.y + 15 * scale, currentCoreRadius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, '#ff4757');
      grad.addColorStop(1, 'rgba(255, 71, 87, 0.85)');
      ctx.fillStyle = grad;
      ctx.shadowColor = '#ff4757';
      ctx.shadowBlur = (20 + progress * 40) * scale;
      ctx.beginPath();
      ctx.arc(b.x, b.y + 15 * scale, currentCoreRadius, 0, Math.PI * 2);
      ctx.fill();

      const shrinkRadius = (1 - progress) * (width * 0.45) + currentCoreRadius;
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3 * scale;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(b.x, b.y + 15 * scale, shrinkRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    if (this.bossType === 'final' && this.currentPattern === 8 && this.state === 'pattern' && b) {
      ctx.save();
      const isLocked = (this.p8Phase === 'locked');
      const angle = isLocked ? this.p8LockedAngle : this.p8AimAngle;

      ctx.strokeStyle = isLocked ? '#ff0000' : 'rgba(255, 71, 87, 0.45)';
      ctx.lineWidth = (isLocked ? 2.5 : 1.5) * scale;
      if (!isLocked) ctx.setLineDash([8, 6]);

      for (let offset of [-8, 8]) {
        const sx = b.x + offset * scale;
        const sy = b.y + 10 * scale;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(angle) * Math.max(width, height), sy + Math.sin(angle) * Math.max(width, height));
        ctx.stroke();
      }
      ctx.restore();
    }

    for (let bit of this.sideBitDrones) {
      ctx.save();
      ctx.translate(bit.x, bit.y);
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5 * scale;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12 * scale;

      ctx.beginPath();
      ctx.moveTo(0, -18 * scale);
      ctx.lineTo(16 * scale, 0);
      ctx.lineTo(0, 22 * scale);
      ctx.lineTo(-16 * scale, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 4 * scale, 5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.bossType === 'warship' && this.shipHazard) {
      const hz = this.shipHazard;
      ctx.save();
      const pulse = 1 + Math.sin(gameTime * 8) * 0.04;
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(hz.x, hz.y, hz.radius * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.62;
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 4 * scale;
      ctx.beginPath(); ctx.arc(hz.x, hz.y, hz.radius * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 2 * scale;
      ctx.setLineDash([10 * scale, 8 * scale]);
      ctx.beginPath(); ctx.arc(hz.x, hz.y, hz.radius * 0.86, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    for (let sd of this.shipDrones) {
      ctx.save();
      ctx.translate(sd.x, sd.y);
      ctx.globalAlpha = 0.98;
      ctx.fillStyle = '#1f2937';
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 2 * scale;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10 * scale;
      ctx.beginPath();
      ctx.moveTo(0, -10 * scale);
      ctx.lineTo(8 * scale, 0);
      ctx.lineTo(0, 10 * scale);
      ctx.lineTo(-8 * scale, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      if (sd.state === 'fire') {
        ctx.strokeStyle = 'rgba(239,68,68,0.75)';
        ctx.lineWidth = 1.5 * scale;
        ctx.setLineDash([5 * scale, 5 * scale]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(sd.angle) * Math.max(width,height), Math.sin(sd.angle) * Math.max(width,height));
        ctx.stroke();
      }
      ctx.restore();
    }

    for (let m of this.markers) {
      ctx.save();
      const progress = 1 - (m.timer / m.maxTimer);
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius * progress, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (let l of this.lasers) {
      ctx.save();
      const isH = l.orient === 'h';
      const rx = isH ? 0 : l.x;
      const ry = isH ? l.y : 0;
      const rw = isH ? width : l.width;
      const rh = isH ? l.height : height;

      if (l.warnTimer > 0) {
        ctx.fillStyle = `rgba(239, 68, 68, ${0.15 + Math.sin(gameTime * 18) * 0.1})`;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = '#ef4444';
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(rx, ry, rw, rh);
      } else if (l.active) {
        const grad = isH
          ? ctx.createLinearGradient(0, ry, 0, ry + rh)
          : ctx.createLinearGradient(rx, 0, rx + rw, 0);
        grad.addColorStop(0, 'rgba(239, 68, 68, 0.7)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0.7)');
        ctx.fillStyle = grad;
        ctx.fillRect(rx, ry, rw, rh);
      }
      ctx.restore();
    }

    for (let c of this.containers) {
      c.spawnAlpha = Math.min(1, c.spawnAlpha + 0.08);
      ctx.save();
      ctx.globalAlpha = c.spawnAlpha;
      ctx.translate(c.x, c.y);
      const s = c.radius;
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.5 * scale;
      ctx.beginPath();
      ctx.rect(-s, -s * 0.8, s * 2, s * 1.6);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5 * scale;
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.85, k * s * 0.4);
        ctx.lineTo(s * 0.85, k * s * 0.4);
        ctx.stroke();
      }
      ctx.fillStyle = '#facc15';
      ctx.font = `bold ${Math.round(8 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("SAFE", 0, 0);
      ctx.restore();
    }

    for (let bm of this.beams) {
      const len = this.getBeamLength(bm);
      const x2 = bm.ox + Math.cos(bm.angle) * len;
      const y2 = bm.oy + Math.sin(bm.angle) * len;
      ctx.save();
      ctx.lineCap = 'round';

      if (bm.sweep && bm.warnTimer > 0) {
        const arcR = this.activeBoss ? this.activeBoss.radius + 22 * scale : 60 * scale;
        const dir = Math.sign(bm.sweepSpeed);
        ctx.strokeStyle = `rgba(244, 114, 182, ${0.5 + Math.sin(gameTime * 12) * 0.3})`;
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.arc(bm.ox, bm.oy, arcR, bm.angle, bm.angle + dir * Math.PI * 0.75, dir < 0);
        ctx.stroke();
      }

      if (bm.warnTimer > 0) {
        const pulse = 0.35 + Math.sin(gameTime * 20) * 0.15;
        const drawWidth = bm.isShipAimBeam ? 4 * scale : bm.width;
        ctx.strokeStyle = this.hexToRgba(bm.color, pulse * 0.65);
        ctx.lineWidth = drawWidth;
        ctx.beginPath();
        ctx.moveTo(bm.ox, bm.oy);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${pulse + 0.3})`;
        ctx.lineWidth = 1.5 * scale;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(bm.ox, bm.oy);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      } else if (bm.active) {
        ctx.strokeStyle = bm.color;
        ctx.globalAlpha = 0.35;
        const drawWidth = bm.isShipAimBeam ? (bm.activeWidth || 16 * scale) : bm.width;
        ctx.lineWidth = drawWidth * 1.8;
        ctx.beginPath();
        ctx.moveTo(bm.ox, bm.oy);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.lineWidth = drawWidth;
        ctx.beginPath();
        ctx.moveTo(bm.ox, bm.oy);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(2 * scale, drawWidth * 0.4);
        ctx.beginPath();
        ctx.moveTo(bm.ox, bm.oy);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();
    }

    for (let d of this.specialDrops) {
      ctx.save();
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius * (1.2 + Math.sin(gameTime * 8) * 0.2), 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(8 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("INV", d.x, d.y);
      ctx.restore();
    }

    this.drawPhantomPortals(ctx);

    for (let bBullet of this.bossBullets) {
      ctx.save();
      if (bBullet.isElongatedLaser) {
        ctx.strokeStyle = bBullet.color;
        ctx.lineWidth = bBullet.radius * 2.2;
        ctx.lineCap = 'round';
        ctx.shadowColor = bBullet.color;
        ctx.shadowBlur = 10 * scale;

        const norm = Math.hypot(bBullet.vx, bBullet.vy) || 1;
        const len = bBullet.length || 38 * scale;
        const tailX = bBullet.x - (bBullet.vx / norm) * len;
        const tailY = bBullet.y - (bBullet.vy / norm) * len;

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(bBullet.x, bBullet.y);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = bBullet.radius * 1.0;
        ctx.beginPath();
        ctx.moveTo(tailX * 0.85 + bBullet.x * 0.15, tailY * 0.85 + bBullet.y * 0.15);
        ctx.lineTo(bBullet.x, bBullet.y);
        ctx.stroke();
      } else {
        ctx.fillStyle = bBullet.color;
        ctx.shadowColor = bBullet.color;
        ctx.shadowBlur = 8 * scale;
        ctx.beginPath();
        ctx.arc(bBullet.x, bBullet.y, bBullet.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (!this.activeBoss) return;
    ctx.save();
    ctx.translate(b.x, b.y);

    if (this.bossType === 'mini') {
      this.drawUFO(ctx, b);
    } else if (this.bossType === 'laser') {
      ctx.globalAlpha = b.spawnAlpha !== undefined ? b.spawnAlpha : 1;
      this.drawLaserBoss(ctx, b);
    } else if (this.bossType === 'phantom') {
      this.drawPhantomBoss(ctx, b);
    } else if (this.bossType === 'warship') {
      this.drawWarshipBoss(ctx, b);
    } else if (this.bossType === 'chronos') {
      this.drawChronosBoss(ctx, b);
    } else if (this.bossType === 'arsenal') {
      this.drawArsenalBoss(ctx, b);
    } else {
      this.drawGundamBoss(ctx, b);
    }
    ctx.restore();
  },

  drawLaserBoss(ctx, b) {
    const r = b.radius;
    const charging = (this.state === 'pattern' && this.currentPattern === 3);

    const vulnerable = this.hasPersistentBeam();
    const prismColors = vulnerable
      ? { 3: '#9a3412', 2: '#ea580c', 1: '#fdba74' }
      : { 3: '#831843', 2: '#be185d', 1: '#f472b6' };
    const edgeColor = vulnerable ? '#fb923c' : '#f472b6';
    const brightEdge = vulnerable ? '#ffedd5' : '#fce7f3';
    ctx.save();
    ctx.rotate(b.angle);
    ctx.lineWidth = 2 * scale;
    for (let i = 0; i < 6; i++) {
      const p = b.prisms ? b.prisms[i] : null;
      if (p && !p.alive) continue;

      const a = i * Math.PI / 3;
      const px = Math.cos(a) * r * 0.95;
      const py = Math.sin(a) * r * 0.95;
      const hp = p ? p.hp : this.PRISM_HP;
      const flashing = p && p.flash > 0;
      const hitInvincible = p && p.invincible > 0 && !flashing;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a);
      if (hitInvincible) {
        ctx.globalAlpha *= 0.45 + Math.abs(Math.sin(gameTime * 18)) * 0.35;
        ctx.fillStyle = '#64748b';
        ctx.strokeStyle = '#cbd5e1';
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = flashing ? '#ffffff' : prismColors[hp];
        ctx.strokeStyle = hp <= 1 ? brightEdge : edgeColor;
        ctx.shadowColor = hp <= 1 ? brightEdge : edgeColor;
        ctx.shadowBlur = (hp <= 1 ? 14 : 8) * scale;
      }
      ctx.beginPath();
      ctx.moveTo(r * 0.28, 0);
      ctx.lineTo(-r * 0.14, r * 0.16);
      ctx.lineTo(-r * 0.14, -r * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    if (b.prismRegenTimer > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(244, 114, 182, 0.35)';
      ctx.lineWidth = 2 * scale;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2 * (1 - b.prismRegenTimer / this.PRISM_REGEN_DELAY));
      ctx.stroke();
      ctx.restore();
    }

    const frameColor = vulnerable ? '#fed7aa' : '#fbcfe8';
    const coreMid = vulnerable ? (charging ? '#fdba74' : '#fb923c') : (charging ? '#fda4af' : '#f472b6');
    const coreEdge = vulnerable ? 'rgba(251, 146, 60, 0.6)' : 'rgba(244, 114, 182, 0.6)';
    const coreGlow = vulnerable ? '#fb923c' : '#f472b6';

    ctx.save();
    ctx.rotate(-b.angle * 1.5);
    ctx.strokeStyle = frameColor;
    ctx.lineWidth = 2.5 * scale;
    drawPolygon(ctx, 0, 0, r * 0.62, 6, 0);
    ctx.stroke();
    ctx.restore();

    const coreR = r * (charging ? 0.42 + Math.sin(gameTime * 22) * 0.06 : 0.34);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.45, coreMid);
    grad.addColorStop(1, coreEdge);
    ctx.fillStyle = grad;
    ctx.shadowColor = coreGlow;
    ctx.shadowBlur = (charging ? 30 : 14) * scale;
    ctx.beginPath();
    ctx.arc(0, 0, coreR, 0, Math.PI * 2);
    ctx.fill();
  },

  drawUFO(ctx, b) {
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.ellipse(0, 0, b.radius, b.radius * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
      const a = b.angle + (i * Math.PI / 4);
      const lx = Math.cos(a) * (b.radius * 0.82);
      const ly = Math.sin(a) * (b.radius * 0.38);
      ctx.fillStyle = (i % 2 === 0) ? '#facc15' : '#ef4444';
      ctx.beginPath();
      ctx.arc(lx, ly, 3.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.beginPath();
    ctx.ellipse(0, -b.radius * 0.18, b.radius * 0.48, b.radius * 0.32, 0, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 10 * scale;
    ctx.beginPath();
    ctx.arc(0, 0, 8 * scale, 0, Math.PI * 2);
    ctx.fill();
  },

  drawArsenalEffects(ctx, b) {
    for (const warning of this.arsenalWarnings) {
      const fade = Math.max(0, warning.life / warning.maxLife);
      ctx.save();
      ctx.strokeStyle = this.hexToRgba(warning.color, 0.62 + Math.sin(weaponAnimTime * 22) * 0.24);
      ctx.shadowColor = warning.color;
      ctx.shadowBlur = 12 * scale;
      ctx.lineWidth = 3 * scale;
      ctx.setLineDash([10 * scale, 7 * scale]);
      if (warning.kind === 'line') {
        ctx.beginPath(); ctx.moveTo(warning.x1, warning.y1); ctx.lineTo(warning.x2, warning.y2); ctx.stroke();
      } else if (warning.kind === 'repulsion') {
        const progress = 1 - fade;
        const eased = 1 - Math.pow(1 - progress, 2.4);
        const currentRadius = warning.startRadius + (warning.radius - warning.startRadius) * eased;
        ctx.setLineDash([]);
        ctx.lineWidth = (3 + progress * 7) * scale;
        ctx.globalAlpha = 0.48 + progress * 0.45;
        ctx.beginPath(); ctx.arc(warning.x, warning.y, currentRadius, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.18 + progress * 0.20;
        ctx.fillStyle = warning.color;
        ctx.beginPath(); ctx.arc(warning.x, warning.y, currentRadius, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = this.hexToRgba(warning.color, 0.09 + (1 - fade) * 0.08);
        ctx.beginPath(); ctx.arc(warning.x, warning.y, warning.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }

    for (const laser of this.arsenalLasers) {
      const x2 = b.x + Math.cos(laser.angle) * laser.length;
      const y2 = b.y + Math.sin(laser.angle) * laser.length;
      ctx.save();
      ctx.lineCap = 'round';
      if (laser.warning > 0) {
        if (laser.warningStyle === 'laserArm') {
          ctx.strokeStyle = `rgba(249, 115, 22, ${0.15 + Math.sin(weaponAnimTime * 24) * 0.06})`;
          ctx.lineWidth = laser.width * 2.6;
          ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.strokeStyle = `rgba(255, 237, 213, ${0.68 + Math.sin(weaponAnimTime * 24) * 0.22})`;
          ctx.lineWidth = 2.5 * scale;
          ctx.setLineDash([4 * scale, 5 * scale]);
        } else {
          ctx.strokeStyle = `rgba(249, 115, 22, ${0.42 + Math.sin(weaponAnimTime * 20) * 0.22})`;
          ctx.lineWidth = 3 * scale;
          ctx.setLineDash([8 * scale, 6 * scale]);
        }
      } else {
        ctx.strokeStyle = this.hexToRgba(laser.color || '#f97316', 0.34);
        ctx.shadowColor = laser.color || '#f97316'; ctx.shadowBlur = 14 * scale;
        ctx.lineWidth = laser.width * 1.8;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.strokeStyle = laser.color || '#fb923c';
        ctx.lineWidth = laser.width;
      }
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(x2, y2); ctx.stroke();
      if (laser.warning <= 0) {
        ctx.strokeStyle = '#fff7ed'; ctx.lineWidth = Math.max(2 * scale, laser.width * 0.32);
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(x2, y2); ctx.stroke();
      }
      ctx.restore();
    }
  },

  drawArsenalBoss(ctx, b) {
    const a = b.arsenal;
    const r = b.radius;
    const shield = this.ARSENAL_SHIELD_META[a.shieldType];
    const weaponMeta = this.ARSENAL_WEAPON_META[a.currentWeapon];
    const shiftPulse = a.shieldShiftTimer > 0 ? 1 + Math.sin(weaponAnimTime * 24) * 0.12 : 1;

    // 외곽 실드는 색상뿐 아니라 문자/분할 문양으로도 현재 대응 무기를 전달한다.
    ctx.save();
    ctx.rotate(-weaponAnimTime * 0.35);
    ctx.strokeStyle = a.shieldFlash > 0 ? '#ffffff' : shield.color;
    ctx.shadowColor = shield.color;
    ctx.shadowBlur = (a.shieldShiftTimer > 0 ? 28 : 17) * scale;
    ctx.lineWidth = (a.shieldFlash > 0 ? 6 : 4) * scale;
    ctx.setLineDash([14 * scale, 7 * scale]);
    ctx.beginPath(); ctx.arc(0, 0, r * 1.18 * shiftPulse, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2;
      ctx.save(); ctx.rotate(angle); ctx.translate(r * 1.18 * shiftPulse, 0); ctx.rotate(weaponAnimTime * 0.35);
      ctx.fillStyle = '#ffffff'; ctx.font = `900 ${Math.round(9 * scale)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(shield.glyph, 0, 0); ctx.restore();
    }
    // 비대칭 선두 마커가 반시계 회전 방향을 한눈에 보여준다.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(r * 1.34, 0);
    ctx.lineTo(r * 1.13, -7 * scale);
    ctx.lineTo(r * 1.13, 7 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 본체와 현재 무장 모듈은 실드와 다른 기계 계열 색으로 분리한다.
    ctx.save();
    ctx.fillStyle = '#1e293b'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 3 * scale;
    ctx.shadowColor = '#64748b'; ctx.shadowBlur = 10 * scale;
    drawPolygon(ctx, 0, 0, r * 0.82, 6, Math.PI / 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#334155';
    ctx.fillRect(-r * 0.55, -r * 0.18, r * 1.1, r * 0.56);

    // 실드와 반대로 무장 프레임 전체가 시계 방향으로 계속 공전한다.
    ctx.rotate(weaponAnimTime * 0.72);
    ctx.shadowColor = weaponMeta.color;
    ctx.shadowBlur = 13 * scale;
    if (a.currentWeapon === 'fabricator') {
      ctx.fillStyle = weaponMeta.color;
      ctx.fillRect(-r * 0.98, -r * 0.45, r * 0.34, r * 0.72);
      ctx.fillRect(r * 0.64, -r * 0.45, r * 0.34, r * 0.72);
    } else if (a.currentWeapon === 'duelist') {
      ctx.strokeStyle = weaponMeta.color; ctx.lineWidth = 7 * scale;
      ctx.beginPath(); ctx.moveTo(0, -r * 0.25); ctx.lineTo(0, -r * 1.02); ctx.stroke();
      ctx.fillStyle = weaponMeta.glow; ctx.beginPath(); ctx.arc(0, -r * 0.28, r * 0.16, 0, Math.PI * 2); ctx.fill();
    } else if (a.currentWeapon === 'disruptor') {
      ctx.fillStyle = weaponMeta.color;
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(side * r * 0.68, r * 0.05); ctx.lineTo(side * r * 1.12, r * 0.42); ctx.lineTo(side * r * 0.58, r * 0.46); ctx.closePath(); ctx.fill();
      }
    } else {
      ctx.strokeStyle = weaponMeta.color; ctx.lineWidth = 6 * scale;
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.arc(0, 0, r * 0.72, side < 0 ? Math.PI * 0.52 : -Math.PI * 0.48, side < 0 ? Math.PI * 1.05 : Math.PI * 0.05); ctx.stroke();
      }
    }
    ctx.fillStyle = weaponMeta.glow;
    ctx.beginPath(); ctx.arc(r * 0.43, -r * 0.57, 4 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 중앙 3분할 코어: 강제 왕복 선택의 누적치를 항상 표시한다.
    ctx.save();
    const coreR = r * 0.30;
    for (let i = 0; i < 3; i++) {
      const lit = i < a.overrideStack;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, coreR, -Math.PI / 2 + i * Math.PI * 2 / 3 + 0.05, -Math.PI / 2 + (i + 1) * Math.PI * 2 / 3 - 0.05);
      ctx.closePath();
      ctx.fillStyle = lit ? (a.overrideStack >= 3 ? '#ef4444' : '#fbbf24') : '#0f172a';
      ctx.strokeStyle = lit ? '#ffffff' : '#475569';
      ctx.shadowColor = lit ? ctx.fillStyle : 'transparent'; ctx.shadowBlur = lit ? 12 * scale : 0;
      ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 3.5 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f8fafc'; ctx.font = `900 ${Math.round(8 * scale)}px sans-serif`;
    const stateLabel = a.overheatTimer > 0 ? 'OVERHEAT' : this.ARSENAL_WEAPON_LABELS[a.currentWeapon];
    ctx.fillText(stateLabel, 0, r + 16 * scale);
    ctx.restore();
  },

  drawChronosEffects(ctx, b) {
    const c = b.chronos;
    if (!c) return;

    // MEMORY와 REPLAY는 화면 전체의 색만으로도 즉시 구분할 수 있게 처리한다.
    if (c.flash) {
      const alpha = Math.max(0, c.flash.timer / c.flash.maxTimer) * 0.18;
      ctx.save();
      ctx.fillStyle = this.hexToRgba(c.flash.color, alpha);
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    for (const hole of this.chronosBlackholes) {
      const life = Math.max(0, hole.life / hole.maxLife);
      const pulse = 1 + Math.sin(weaponAnimTime * 8 + hole.phase) * 0.055;
      const visualRadius = hole.visualRadius || hole.radius;
      ctx.save();
      const halo = ctx.createRadialGradient(hole.x, hole.y, hole.coreRadius * 0.25, hole.x, hole.y, visualRadius * pulse);
      halo.addColorStop(0, 'rgba(2, 6, 23, 0.98)');
      halo.addColorStop(0.22, 'rgba(127, 29, 29, 0.92)');
      halo.addColorStop(0.56, 'rgba(249, 115, 22, 0.38)');
      halo.addColorStop(0.82, 'rgba(250, 204, 21, 0.13)');
      halo.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(hole.x, hole.y, visualRadius * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(251, 146, 60, ${0.62 + life * 0.34})`;
      ctx.shadowColor = '#f97316'; ctx.shadowBlur = 22 * scale;
      ctx.lineWidth = 3.2 * scale;
      ctx.setLineDash([7 * scale, 6 * scale]);
      ctx.beginPath(); ctx.arc(hole.x, hole.y, visualRadius * 0.72 * pulse, -weaponAnimTime * 1.8, -weaponAnimTime * 1.8 + Math.PI * 1.72); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#020617';
      ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.coreRadius * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fef3c7'; ctx.lineWidth = 2 * scale; ctx.stroke();
      ctx.fillStyle = '#ffedd5'; ctx.font = `900 ${Math.max(8, Math.round(8 * scale))}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('CHRONOS COLLAPSE', hole.x, hole.y + visualRadius + 11 * scale);
      ctx.restore();
    }

    for (const preview of this.chronosPreviews) {
      const data = preview.data;
      const alpha = preview.persistent
        ? 0.50 + Math.sin(weaponAnimTime * 5.5 + (preview.capturing ? 0.8 : 0)) * 0.12
        : 0.32 + 0.42 * Math.max(0, preview.life / preview.maxLife);
      ctx.save();
      ctx.strokeStyle = `rgba(186, 230, 253, ${alpha})`;
      ctx.fillStyle = `rgba(186, 230, 253, ${alpha * 0.28})`;
      ctx.lineWidth = 2 * scale;
      ctx.setLineDash([8 * scale, 7 * scale]);
      if (data.kind === 'clockShot') {
        const start = -(data.count - 1) * 0.5;
        for (let i = 0; i < data.count; i++) {
          const a = data.angle + (start + i) * data.spread;
          ctx.beginPath(); ctx.moveTo(data.origin.x, data.origin.y);
          ctx.lineTo(data.origin.x + Math.cos(a) * Math.max(width, height), data.origin.y + Math.sin(a) * Math.max(width, height)); ctx.stroke();
        }
      } else if (data.kind === 'wave') {
        for (const lane of data.lanes) {
          if (data.axis === 'vertical') ctx.fillRect(lane - 6 * scale, 0, 12 * scale, height);
          else ctx.fillRect(0, lane - 6 * scale, width, 12 * scale);
        }
      } else if (data.kind === 'positions') {
        for (const point of data.points) {
          ctx.save();
          ctx.translate(point.x, point.y);
          ctx.rotate(Math.PI / 4 + weaponAnimTime * 0.5);
          ctx.fillStyle = `rgba(56, 189, 248, ${alpha * 0.45})`;
          ctx.strokeStyle = `rgba(186, 230, 253, ${Math.min(1, alpha + 0.22)})`;
          ctx.lineWidth = 2.2 * scale;
          ctx.beginPath(); ctx.moveTo(0, -12 * scale); ctx.lineTo(10 * scale, 0); ctx.lineTo(0, 12 * scale); ctx.lineTo(-10 * scale, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.restore();
          ctx.setLineDash([5 * scale, 4 * scale]);
          ctx.beginPath(); ctx.arc(point.x, point.y, 20 * scale, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([8 * scale, 7 * scale]);
        }
      }
      ctx.restore();
    }

    // 위치 기억은 재생 직전이 아니라 기억된 순간부터 수정으로 남고, 각 수정이 순서대로 폭발한다.
    for (const strike of this.chronosPositionStrikes) {
      for (let i = strike.index; i < strike.points.length; i++) {
        const point = strike.points[i];
        const pulse = 1 + Math.sin(weaponAnimTime * 10 + i) * 0.08;
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(Math.PI / 4 - weaponAnimTime * 0.8);
        ctx.fillStyle = 'rgba(14, 165, 233, 0.38)';
        ctx.strokeStyle = '#d7fbff';
        ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 15 * scale;
        ctx.lineWidth = 2.8 * scale;
        ctx.beginPath(); ctx.moveTo(0, -14 * scale * pulse); ctx.lineTo(11 * scale * pulse, 0); ctx.lineTo(0, 14 * scale * pulse); ctx.lineTo(-11 * scale * pulse, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }
  },

  drawChronosBoss(ctx, b) {
    const c = b.chronos;
    const r = b.radius;
    const phase = c.phase;
    const t = c.ringAngle;
    const outerColor = phase === 1 ? '#fbbf24' : (phase === 2 ? '#67e8f9' : '#c4b5fd');
    const coreColor = phase === 1 ? '#fef3c7' : (phase === 2 ? '#e0f2fe' : '#ede9fe');

    ctx.save();
    ctx.rotate(t * 0.12);
    ctx.strokeStyle = outerColor;
    ctx.shadowColor = outerColor;
    ctx.shadowBlur = 16 * scale;
    ctx.lineWidth = 3 * scale;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.96, 0, Math.PI * 2); ctx.stroke();
    if (phase >= 2) {
      ctx.rotate(-t * 0.34);
      ctx.strokeStyle = '#fef3c7'; ctx.lineWidth = 2 * scale;
      ctx.setLineDash([9 * scale, 6 * scale]);
      ctx.beginPath(); ctx.arc(0, 0, r * 1.18, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (phase >= 3) {
      ctx.rotate(t * 0.52);
      ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2 * scale;
      for (let i = 0; i < 7; i++) {
        const a = i * Math.PI * 2 / 7;
        ctx.save(); ctx.rotate(a);
        ctx.fillStyle = '#ddd6fe'; ctx.fillRect(r * 1.28, -2.5 * scale, 12 * scale, 5 * scale);
        ctx.restore();
      }
    }
    ctx.restore();

    // 대칭 본체와 중앙 시계. Phase 2부터는 균열, Phase 3부터는 노출된 시간 코어가 드러난다.
    ctx.save();
    ctx.fillStyle = phase === 1 ? '#4c3b12' : (phase === 2 ? '#164e63' : '#312e81');
    ctx.strokeStyle = outerColor;
    ctx.lineWidth = 3 * scale;
    ctx.shadowColor = outerColor; ctx.shadowBlur = 12 * scale;
    ctx.beginPath();
    ctx.moveTo(-r * 1.20, 0); ctx.lineTo(-r * 0.52, -r * 0.58); ctx.lineTo(0, -r * 0.82);
    ctx.lineTo(r * 0.52, -r * 0.58); ctx.lineTo(r * 1.20, 0); ctx.lineTo(r * 0.52, r * 0.58);
    ctx.lineTo(0, r * 0.82); ctx.lineTo(-r * 0.52, r * 0.58); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();

    const faceR = r * 0.57;
    ctx.save();
    const face = ctx.createRadialGradient(0, 0, faceR * 0.1, 0, 0, faceR);
    face.addColorStop(0, phase === 3 ? '#ffffff' : coreColor);
    face.addColorStop(0.60, phase === 1 ? '#f59e0b' : (phase === 2 ? '#38bdf8' : '#8b5cf6'));
    face.addColorStop(1, '#0f172a');
    ctx.fillStyle = face; ctx.shadowColor = outerColor; ctx.shadowBlur = 18 * scale;
    ctx.beginPath(); ctx.arc(0, 0, faceR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 2 * scale; ctx.stroke();
    ctx.shadowBlur = 0;
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 6;
      const inner = faceR * (i % 3 === 0 ? 0.74 : 0.82);
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = (i % 3 === 0 ? 2.5 : 1.4) * scale;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner); ctx.lineTo(Math.cos(a) * faceR * 0.94, Math.sin(a) * faceR * 0.94); ctx.stroke();
    }
    // 긴 흰 바늘은 항상 흐르는 현재 시간이다.
    const whiteAngle = -Math.PI / 2 + t * 0.46;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.2 * scale;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(whiteAngle) * faceR * 0.78, Math.sin(whiteAngle) * faceR * 0.78); ctx.stroke();

    // 붉은 짧은 바늘은 기억이 있을 때만 움직이며, 한 바퀴 완료가 곧 REPLAY다.
    const memories = c.memories.slice(-2);
    for (let i = 0; i < memories.length; i++) {
      const hand = memories[i];
      const progress = Math.min(1, hand.timer / hand.delay);
      const a = -Math.PI / 2 + hand.direction * progress * Math.PI * 2;
      ctx.strokeStyle = i === 0 ? '#ef4444' : '#fb7185';
      ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 8 * scale;
      ctx.lineWidth = (i === 0 ? 2.6 : 2.0) * scale;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * faceR * (i === 0 ? 0.48 : 0.40), Math.sin(a) * faceR * (i === 0 ? 0.48 : 0.40)); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 4 * scale, 0, Math.PI * 2); ctx.fill();
    if (phase >= 2) {
      ctx.strokeStyle = phase === 2 ? '#fef3c7' : '#e9d5ff'; ctx.lineWidth = 2 * scale;
      ctx.beginPath(); ctx.moveTo(-faceR * 0.70, -faceR * 0.15); ctx.lineTo(-faceR * 0.20, faceR * 0.12); ctx.lineTo(faceR * 0.12, -faceR * 0.42); ctx.lineTo(faceR * 0.68, faceR * 0.25); ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.max(9, Math.round(9 * scale))}px sans-serif`;
    ctx.fillStyle = phase === 1 ? '#fde68a' : (phase === 2 ? '#bae6fd' : '#e9d5ff');
    const subtitle = c.transition ? 'TEMPORAL SHIFT' : (c.stunTimer > 0 ? 'TIME BREAK' : `CHRONOS · PHASE ${phase}`);
    ctx.fillText(subtitle, 0, r + 17 * scale);
    ctx.restore();
  },

  drawWarshipBoss(ctx, b) {
    const r = b.radius;
    const pos = this.getWarshipPartPositions();
    const left = b.parts.left, right = b.parts.right, core = b.parts.core;
    ctx.save();
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 18 * scale;

    // 중앙 갑판: 포탑이 모두 파괴된 뒤에만 타격 가능
    ctx.fillStyle = (!left.alive && !right.alive) ? '#8f1d1d' : '#4b1116';
    ctx.strokeStyle = (!left.alive && !right.alive) ? '#ffb4b4' : '#b91c1c';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(-b.shipWidth * 0.44, 12 * scale);
    ctx.lineTo(-b.shipWidth * 0.28, -14 * scale);
    ctx.lineTo(-b.shipWidth * 0.12, -r * 0.72);
    ctx.lineTo(b.shipWidth * 0.12, -r * 0.72);
    ctx.lineTo(b.shipWidth * 0.28, -14 * scale);
    ctx.lineTo(b.shipWidth * 0.44, 12 * scale);
    ctx.lineTo(b.shipWidth * 0.32, 44 * scale);
    ctx.lineTo(-b.shipWidth * 0.32, 44 * scale);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = (!left.alive && !right.alive) ? '#ef4444' : '#65151b';
    ctx.beginPath(); ctx.rect(-b.shipWidth * 0.20, -12 * scale, b.shipWidth * 0.40, 50 * scale); ctx.fill();
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(-5 * scale, -4 * scale, 10 * scale, 32 * scale);

    const drawTurret = (part, side) => {
      const pp = pos[part.id];
      ctx.save();
      ctx.translate(pp.x - b.x, pp.y - b.y);
      if (!part.alive) {
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#374151';
        ctx.strokeStyle = '#6b7280';
        ctx.beginPath(); ctx.arc(0, 0, part.radius * 0.82, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 4 * scale;
        ctx.beginPath(); ctx.moveTo(-12*scale,-8*scale); ctx.lineTo(12*scale,8*scale); ctx.moveTo(12*scale,-8*scale); ctx.lineTo(-12*scale,8*scale); ctx.stroke();
        ctx.restore(); return;
      }
      ctx.fillStyle = part.flash > 0 ? '#ffffff' : '#9f1239';
      ctx.strokeStyle = '#fecaca';
      ctx.lineWidth = 2.5 * scale;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10 * scale;
      ctx.beginPath(); ctx.roundRect(-part.radius, -part.radius * 0.68, part.radius * 2, part.radius * 1.36, 6 * scale); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#450a0a';
      ctx.beginPath(); ctx.arc(0, 0, part.radius * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#f87171'; ctx.lineWidth = 4 * scale;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(side * part.radius * 0.95, 0); ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-part.radius * 0.65, part.radius * 0.48, part.radius * 1.3 * Math.max(0, part.hp / part.maxHp), 3 * scale);
      ctx.restore();
    };

    drawTurret(left, -1);
    drawTurret(right, 1);

    // M2 수리 중에는 살아남은 포탑을 명확한 보호막으로 표시한다.
    const protectedPart = this.shipRecoveryProtectedPart;
    if (this.shipMode === 2 && this.shipRecoveryDrone && protectedPart && protectedPart.alive) {
      const shieldPos = pos[protectedPart.id];
      const sx = shieldPos.x - b.x, sy = shieldPos.y - b.y;
      const pulse = 1 + Math.sin(gameTime * 8) * 0.06;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.strokeStyle = 'rgba(110, 231, 183, 0.92)';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 18 * scale;
      ctx.lineWidth = 3.5 * scale;
      ctx.beginPath(); ctx.arc(0, 0, protectedPart.radius * 1.45 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
      ctx.beginPath(); ctx.arc(0, 0, protectedPart.radius * 1.42 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#dcfce7';
      ctx.font = `900 ${Math.round(8 * scale)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('SHIELD', 0, -protectedPart.radius * 1.8);
      ctx.restore();
    }

    // 함체 창/에너지 코어
    ctx.fillStyle = (!left.alive && !right.alive) ? '#fff7ed' : '#7f1d1d';
    ctx.shadowColor = (!left.alive && !right.alive) ? '#facc15' : '#ef4444';
    ctx.shadowBlur = (!left.alive && !right.alive) ? 24 * scale : 10 * scale;
    ctx.beginPath(); ctx.arc(0, 8 * scale, 10 * scale, 0, Math.PI * 2); ctx.fill();

    // 상태 텍스트
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(9 * scale)}px sans-serif`;
    ctx.fillStyle = '#fee2e2';
    ctx.fillText(this.shipMode === 1 ? 'CRIMSON DREADNOUGHT' : this.shipMode === 2 ? 'REPAIR MODE' : 'TOTAL WAR', 0, 58 * scale);

    ctx.restore();
  },

  drawGundamBoss(ctx, b) {
    ctx.scale(scale * 1.15, scale * 1.15);

    ctx.fillStyle = '#1e3799';
    ctx.fillRect(-70, 25, 140, 50);

    ctx.fillStyle = '#e55039';
    ctx.fillRect(-28, 38, 56, 42);
    ctx.fillStyle = '#f6b93b';
    ctx.fillRect(-24, 40, 16, 12);
    ctx.fillRect(8, 40, 16, 12);

    ctx.fillStyle = '#e55039';
    ctx.beginPath();
    ctx.moveTo(-8, 18); ctx.lineTo(8, 18); ctx.lineTo(0, 30); ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f8f9fa';
    ctx.beginPath();
    ctx.moveTo(-18, -6); ctx.lineTo(18, -6); ctx.lineTo(15, 18); ctx.lineTo(-15, 18); ctx.closePath();
    ctx.fill();

    if (b.eyeFlashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 30;
    } else {
      ctx.fillStyle = '#78e08f';
      ctx.shadowColor = '#78e08f';
      ctx.shadowBlur = 8;
    }
    ctx.fillRect(-12, 0, 8, 5);
    ctx.fillRect(4, 0, 8, 5);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-26, -30); ctx.lineTo(26, -30); ctx.lineTo(20, -4); ctx.lineTo(-20, -4); ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f6b93b';
    ctx.shadowColor = '#f6b93b';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, -20); ctx.lineTo(-65, -68); ctx.lineTo(-25, -24); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -20); ctx.lineTo(65, -68); ctx.lineTo(25, -24); ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#e55039';
    ctx.fillRect(-6, -28, 12, 12);
  },

  drawPhantomPortals(ctx) {
    for (const portal of this.phantomPortals) {
      const drawOne = (node, color, label, direction) => {
        const pulse = 1 + Math.sin(gameTime * 8 + node.x * 0.01) * 0.10;
        ctx.save();
        ctx.translate(node.x, node.y);
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14 * scale;
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.arc(0, 0, node.radius * pulse, gameTime * direction, gameTime * direction + Math.PI * 1.65);
        ctx.stroke();
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, node.radius * 0.75, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(8 * scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 0, 0);
        ctx.restore();
      };
      drawOne(portal.entrance, '#c084fc', 'IN', 1);
      drawOne(portal.exit, '#67e8f9', 'OUT', -1);
    }
  },

  drawPhantomBoss(ctx, b) {
    const r = b.radius;
    const pulse = 0.92 + Math.sin(gameTime * 9) * 0.06;
    ctx.save();
    ctx.rotate(b.facingAngle || 0);

    ctx.strokeStyle = '#ddd6fe';
    ctx.fillStyle = 'rgba(49, 46, 129, 0.96)';
    ctx.lineWidth = 2.5 * scale;
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 18 * scale;
    drawPolygon(ctx, 0, 0, r * pulse, 6, 0);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1e1b4b';
    drawPolygon(ctx, 0, 0, r * 0.54, 4, Math.PI / 4);
    ctx.fill();

    // 뒤(-X)의 대형 노출 코어. 본체 위로 겹쳐 그 위치와 약점임을 즉시 읽게 한다.
    const coreX = -r * 0.71;
    const coreRadius = r * 0.30 * pulse;
    ctx.fillStyle = 'rgba(69, 10, 10, 0.96)';
    ctx.strokeStyle = '#fecaca';
    ctx.lineWidth = 3 * scale;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 16 * scale;
    ctx.beginPath();
    ctx.arc(coreX, 0, coreRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(coreX, 0, coreRadius * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff1f2';
    ctx.font = `bold ${Math.round(7 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CORE', coreX, 0);

    // +X 전방의 두꺼운 반원형 보호막.
    ctx.strokeStyle = b.shieldFlash > 0 ? '#ffffff' : '#f0abfc';
    ctx.lineWidth = (b.shieldFlash > 0 ? 8 : 5) * scale;
    ctx.shadowColor = '#e879f9';
    ctx.shadowBlur = 20 * scale;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.14, -0.95, 0.95);
    ctx.stroke();

    ctx.fillStyle = '#f5f3ff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 12 * scale;
    ctx.fillRect(r * 0.25, -r * 0.16, r * 0.25, r * 0.32);
    ctx.restore();

    if (b.phantomRamWarning) {
      const ram = b.phantomRamWarning;
      const x1 = ram.x1 - b.x, y1 = ram.y1 - b.y;
      const x2 = ram.x2 - b.x, y2 = ram.y2 - b.y;
      const fade = Math.max(0, ram.timer / ram.maxTimer);
      const angle = Math.atan2(y2 - y1, x2 - x1);
      ctx.save();
      ctx.strokeStyle = `rgba(255, 45, 65, ${0.72 + Math.sin(gameTime * 24) * 0.24})`;
      ctx.shadowColor = '#ff304f';
      ctx.shadowBlur = 16 * scale;
      ctx.lineWidth = (4 + (1 - fade) * 2) * scale;
      ctx.setLineDash([12 * scale, 7 * scale]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fecaca';
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - Math.cos(angle - 0.45) * 18 * scale, y2 - Math.sin(angle - 0.45) * 18 * scale);
      ctx.lineTo(x2 - Math.cos(angle + 0.45) * 18 * scale, y2 - Math.sin(angle + 0.45) * 18 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if (b.phantomPendingWarp) {
      const w = b.phantomPendingWarp;
      ctx.save();
      // 이 함수는 보스 좌표로 translate된 상태이므로 목적지를 로컬 좌표로 변환한다.
      const wx = w.x - b.x;
      const wy = w.y - b.y;
      const radius = Math.max(r * 1.7, 56 * scale) * (1 + Math.sin(gameTime * 14) * 0.08);
      ctx.fillStyle = `rgba(239, 68, 68, ${0.16 + Math.sin(gameTime * 18) * 0.06})`;
      ctx.beginPath();
      ctx.arc(wx, wy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 80, 80, ${0.72 + Math.sin(gameTime * 20) * 0.22})`;
      ctx.lineWidth = 4 * scale;
      ctx.setLineDash([9 * scale, 5 * scale]);
      ctx.beginPath();
      ctx.arc(wx, wy, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fecaca';
      ctx.font = `900 ${Math.round(11 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('WARP', wx, wy);
      ctx.restore();
    }
  },

  reset() {
    // 활성 보스 객체가 살아 있을 때 전용 상태부터 닫아, 같은 프레임의
    // 사망/재시작 처리에서 예약 패턴이나 코어 참조가 이어지지 않게 한다.
    this.clearArsenalBattleObjects();
    this.clearChronosTemporal();
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].isBossEntity) enemies.splice(i, 1);
    }
    this.activeBoss = null;
    this.bossType = null;
    this.patternQueue = [];
    this.currentPattern = null;
    this.state = 'idle';
    this.stateTimer = 0;
    this.patternStep = 0;
    this.subTimer = 0;
    this.cooldownDuration = 3.5;
    this.shipMode = 1;
    this.shipModeChanged = false;
    this.shipRecoveryDrone = null;
    this.shipRecoveryTarget = null;
    this.shipRecoveryProtectedPart = null;
    this.shipDrones = [];
    this.shipHazard = null;
    this.shipRecoveryStart = null;
    this.shipRecoveryTargetPoint = null;
    this.shipRecoveryCenter = null;
    this.shipRecoveryRadius = 0;
    this.shipRecoveryDir = null;
    this.shipRecoveryPerp = null;
    this.shipRecoveryArcStart = 0;
    this.shipRecoveryArcDirection = 1;
    this.shipRecoveryDebrisTimer = 0;
    this.shipChargeState = null;
    this.shipZoningBulletTimer = 0;
    this.shipPatternStateLaser = null;
    this.shipPatternStateAim = null;
    this.shipPatternLastShot = 0;
    this.hideBossBar();
    this.resetProjectiles();
  }
};
