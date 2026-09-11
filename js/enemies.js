let enemies = [];
let enemyBullets = [];
let obstacles = [];

let killsSinceElite = 0;
let timeSinceElite = 0;
let queuedElites = 0;

const baseHpTable = [0, 1, 1, 2, 3, 5, 7, 10, 14, 19, 26];
const HARD_BASIC_ENEMY_SPEED_MULTIPLIER = 0.80;

// Shared eligibility registry; spawnElite retains each type's existing AI factory.
const ELITE_TYPES = [
  { id: 1, name: '분열 거체', bossRushEligible: true },
  { id: 2, name: '포탑 요새', bossRushEligible: true },
  { id: 3, name: '돌진 파쇄체', bossRushEligible: true },
  { id: 4, name: '쌍벽둥이', bossRushEligible: true }
];

function calculatePhase(t) {
  // 하드 모드는 12분 공략을 위해 일반 모드와 별도의 페이즈 표를 사용한다.
  // 보스전 중에는 gameTime이 멈추므로, 보스 처치 속도와 무관하게 전투 구간의
  // 성장/난이도 진행은 이 표에 맞춰 유지된다.
  if (gameMode === 'hard') {
    if (t < 120) return 2;
    if (t < 240) return 3;
    if (t < 360) return 4;
    if (t < 420) return 5;
    if (t < 480) return 6;
    if (t < 600) return 7;
    if (t < 660) return 8;
    return 9;
  }

  if (t < 60) return 1;
  if (t < 120) return 2;
  if (t < 180) return 3;
  if (t < 300) return 4;
  if (t < 420) return 5;
  if (t < 540) return 6;
  if (t < 660) return 7;
  if (t < 780) return 8;
  if (t < 900) return 9;
  return 10;
}

function getPhase10Ramp(t) {
  if (t < 900) return 0;
  return Math.min(1.0, (t - 900) / 300);
}

// 일반 적 기본 체력: 페이즈 4에서 2배, 이후 페이즈마다 +2
function getEnemyBaseHp(phase) {
  if (phase < 4) return baseHpTable[phase] || 1;
  return baseHpTable[4] * 2 + (phase - 4) * 2;
}

// 페이즈 6부터 엘리트 강화 (모든 피해 2, 이동 속도 +15%)
function isEliteBuffed() {
  return currentPhase >= 6;
}
function getEliteSpeedMult() {
  return isEliteBuffed() ? 1.15 : 1.0;
}
function getEliteDamage() {
  return isEliteBuffed() ? 2 : 1;
}

// 모드 및 페이즈별 엘리트 대기열 최대 누적 수
function getMaxQueuedElites() {
  if (gameMode === 'hard') return 2;
  if (gameMode === 'infinite') {
    return currentPhase <= 6 ? 2 : 3;
  }
  return 1;
}

function getRandomSpawnEdge() {
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  const margin = 40 * scale;
  if (edge === 0) { x = Math.random() * width; y = -margin; }
  else if (edge === 1) { x = Math.random() * width; y = height + margin; }
  else if (edge === 2) { x = -margin; y = Math.random() * height; }
  else { x = width + margin; y = Math.random() * height; }
  return { x, y };
}

function spawnEnemy() {
  const pos = getRandomSpawnEdge();
  const p10 = getPhase10Ramp(gameTime);

  let baseHp = getEnemyBaseHp(currentPhase);
  if (currentPhase === 10) {
    baseHp += Math.floor(p10 * 25);
  }
  const variance = Math.floor(Math.random() * (baseHp * 0.2 + 1));
  let hp = Math.max(1, baseHp + variance);

  // 페이즈 4부터 가끔 대장 개체 등장 (기본 체력의 2배)
  const isLeader = currentPhase >= 4 && Math.random() < 0.08;
  if (isLeader) hp = hp * 2;

  const r = (Math.min(12, 7.5 + Math.floor(hp / 6)) + (isLeader ? 2.5 : 0)) * scale;
  const modeSpeedMultiplier = gameMode === 'hard' ? HARD_BASIC_ENEMY_SPEED_MULTIPLIER : 1;
  const speed = (0.95 + Math.random() * 0.55 + (currentPhase * 0.03) + p10 * 0.12) * scale * modeSpeedMultiplier;

  enemies.push({
    x: pos.x,
    y: pos.y,
    radius: r,
    speed: speed,
    hp: hp,
    maxHp: hp,
    isElite: false,
    isLeader: isLeader
  });
}

function spawnElite(forcedType) {
  const type = forcedType || ELITE_TYPES[Math.floor(Math.random() * ELITE_TYPES.length)].id;
  const pos = getRandomSpawnEdge();
  const pBase = baseHpTable[currentPhase] || 2;
  const spdMult = getEliteSpeedMult();
  let eliteName = "";

  if (type === 1) {
    eliteName = "분열 거체";
    const hp = pBase * 40;
    enemies.push({
      x: pos.x, y: pos.y,
      radius: 34 * scale,
      speed: 0.35 * scale * spdMult,
      hp: hp, maxHp: hp,
      isElite: true, eliteType: 1, splitStage: 0,
      isSplitChild: false
    });
  } else if (type === 2) {
    eliteName = "포탑 요새";
    const hp = pBase * 30;
    enemies.push({
      x: pos.x, y: pos.y,
      radius: 19 * scale,
      speed: 0.25 * scale * spdMult,
      hp: hp, maxHp: hp,
      isElite: true, eliteType: 2, shootTimer: 1.0,
      isSplitChild: false
    });
  } else if (type === 3) {
    eliteName = "돌진 파쇄체";
    const hp = pBase * 35;
    enemies.push({
      x: pos.x, y: pos.y,
      radius: 18 * scale,
      speed: 1.25 * scale * spdMult,
      hp: hp, maxHp: hp,
      isElite: true, eliteType: 3,
      dashState: 'idle',
      dashTimer: 1.8,
      dashAngle: 0,
      slowTimer: 0,
      isSplitChild: false
    });
  } else if (type === 4) {
    eliteName = "쌍벽둥이";
    const hp = Math.round(pBase * 12.5);
    const core = {
      x: pos.x, y: pos.y,
      radius: 17 * scale,
      speed: 0.3 * scale * spdMult,
      hp: hp, maxHp: hp,
      isElite: true, eliteType: 4, twinRole: 'core',
      twin: null,
      twinTimer: 0,
      twinLaser: false,
      enraged: false,
      isSplitChild: false
    };
    const orbitRadius = 110 * scale;
    const satHp = Math.max(1, Math.round(pBase * 13.5));
    const sat = {
      x: pos.x + orbitRadius, y: pos.y,
      radius: 12 * scale,
      speed: 0.3 * scale * spdMult,
      hp: satHp, maxHp: satHp,
      isElite: true, eliteType: 4, twinRole: 'satellite',
      twin: core,
      orbitAngle: 0,
      orbitRadius: orbitRadius,
      enraged: false,
      isSplitChild: true
    };
    core.twin = sat;
    enemies.push(core, sat);
  }

  showFloatingText(`⚠️ ELITE: [${eliteName}] 출현!`, width / 2, height * 0.32, '#ff4757');
  Sound.playPhaseAlert();
}

function checkEliteSpawn(dt) {
  if (currentPhase < 2) return;

  const isEliteAlive = enemies.some(e => e.isElite);

  if (!isEliteAlive && queuedElites > 0) {
    queuedElites--;
    killsSinceElite = 0;
    timeSinceElite = 0;
    spawnElite();
    return;
  }

  timeSinceElite += dt;
  const killsNeeded = 14 + (currentPhase - 2) * 6;

  if (killsSinceElite >= killsNeeded || timeSinceElite >= 36) {
    killsSinceElite = 0;
    timeSinceElite = 0;

    if (isEliteAlive) {
      // 모드 및 페이즈별 최대 대기열 수 확인 후 누적
      const maxQueue = getMaxQueuedElites();
      if (queuedElites < maxQueue) {
        queuedElites++;
      }
    } else {
      spawnElite();
    }
  }
}

function spawnObstacle() {
  const pos = getRandomSpawnEdge();
  const angle = Math.atan2((height / 2) - pos.y, (width / 2) - pos.x) + (Math.random() - 0.5) * 0.4;
  const speed = (0.35 + Math.random() * 0.4) * scale;
  obstacles.push({
    x: pos.x,
    y: pos.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: (11 + Math.random() * 7) * scale,
    rotation: 0,
    rotSpeed: (Math.random() - 0.5) * 0.02
  });
}

function handleEnemyDeath(e, index) {
  if (e.isBossEntity) {
    if (typeof BossManager !== 'undefined' && BossManager.handleShipEntityDeath) {
      BossManager.handleShipEntityDeath(e, index);
    }
    return;
  }

  Sound.playExplosion(e.isElite);
  addExplosion(e.x, e.y, e.isElite ? '#ff3838' : '#ff4757', e.isElite ? 22 : 10);
  score += (e.isElite ? 450 : (e.isLeader ? 80 : 30)) + e.maxHp * 3;

  if (e.isArsenalCaptain) {
    // ADAPTIVE SHIFT의 대장은 확률 판정 없이 4종 전용 코어를 보장한다.
    if (typeof BossManager !== 'undefined') BossManager.spawnArsenalRouletteCore(e.x, e.y);
    enemies.splice(index, 1);
    return;
  }

  if (e.isPattern7Green) {
    BossManager.specialDrops.push({
      x: e.x,
      y: e.y,
      radius: 9 * scale
    });
    showFloatingText("무적 실드 드랍!", e.x, e.y - 15 * scale, '#22c55e');
  }

  if (!e.isElite) {
    killsSinceElite++;
  } else {
    if (!e.isSplitChild && gameMode !== 'bossrush') {
      reduceItemCooldown(3.0);

      const roll = Math.random();
      if (roll < 0.30) {
        const roulettePool = ['omni', 'laser', 'drone', 'pulse', 'blackhole', 'flame', 'lightning'];
        const initialKind = roulettePool[0];

        items.push({
          x: e.x,
          y: e.y,
          vx: 0,
          vy: 0,
          radius: 9 * scale,
          shape: 'square',
          kind: initialKind,
          color: WEAPON_META[initialKind].color,
          label: WEAPON_META[initialKind].label,
          name: WEAPON_META[initialKind].name,
          isStationary: true,
          isRoulette: true,
          rouletteTimer: 1.5,
          rouletteInterval: 1.5,
          roulettePool: roulettePool,
          rouletteIndex: 0,
          lifeTime: 60.0
        });
        showFloatingText("룰렛 무장 코어 출현! (1분)", e.x, e.y - 15 * scale, '#ffd32a');
      // 하드 모드에서는 엘리트 처치 보상의 회복 확률만 10%에서 20%로 높인다.
      // 룰렛 코어의 기존 30% 확률과 다른 모드의 드롭률은 유지한다.
      } else if (roll < (gameMode === 'hard' ? 0.50 : 0.40)) {
        items.push({
          x: e.x,
          y: e.y,
          vx: 0,
          vy: 0,
          radius: 8.5 * scale,
          shape: 'circle',
          kind: 'heal',
          color: '#2ecc71',
          label: 'HP+',
          name: '체력 / 보호막',
          isStationary: true
        });
        showFloatingText("+체력 회복 드랍!", e.x, e.y - 15 * scale, '#2ecc71');
      }
    }
  }

  if (e.isElite && e.eliteType === 1 && e.splitStage < 2) {
    const nextStage = e.splitStage + 1;
    const childHp = Math.max(4, Math.floor(e.maxHp / 3));
    const childRadius = Math.max(12 * scale, e.radius * 0.72);
    const childSpeed = e.speed * 1.35;

    for (let s = -1; s <= 1; s += 2) {
      enemies.push({
        x: e.x + s * 14 * scale,
        y: e.y + s * 14 * scale,
        radius: childRadius,
        speed: childSpeed,
        hp: childHp,
        maxHp: childHp,
        isElite: true,
        eliteType: 1,
        splitStage: nextStage,
        rushGroupId: e.rushGroupId,
        // The child already derives its HP from the scaled parent; do not apply
        // the Boss Rush summon multiplier a second time on the next frame.
        bossRushHpScaled: e.bossRushHpScaled,
        isSplitChild: true
      });
    }
    showFloatingText("분열 증식!", e.x, e.y, '#e84118');
  }

  if (e.isElite && e.eliteType === 4 && e.twin) {
    const partner = e.twin;
    if (enemies.includes(partner) && partner !== e) {
      partner.twin = null;
      partner.enraged = true;
      partner.twinLaser = false;
      showFloatingText("😡 분노 개체 각성!", partner.x, partner.y - 18 * scale, '#ef4444');
      Sound.playEyeFlash();
    }
    e.twin = null;
  }

  enemies.splice(index, 1);

  if (e.isElite) {
    const isEliteStillAlive = enemies.some(enemy => enemy.isElite);
    if (!isEliteStillAlive && queuedElites > 0 && gameMode !== 'bossrush') {
      queuedElites--;
      killsSinceElite = 0;
      timeSinceElite = 0;
      setTimeout(() => {
        if (gameState === 'playing' && gameMode !== 'bossrush') spawnElite();
      }, 300);
    }
  }
}
