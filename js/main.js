const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('game-container');

const uiLayer = document.getElementById('ui-layer');
const hpDisplay = document.getElementById('hp-display');
const shieldDisplay = document.getElementById('shield-display');
const timeDisplay = document.getElementById('time-display');
const scoreDisplay = document.getElementById('score-display');
const modeBadge = document.getElementById('mode-badge');
const pauseBtn = document.getElementById('pause-btn');

const bgmVolSlider = document.getElementById('bgm-vol');
const bgmVolVal = document.getElementById('bgm-vol-val');
const sfxVolSlider = document.getElementById('sfx-vol');
const sfxVolVal = document.getElementById('sfx-vol-val');

// 일시정지 모달 관련 요소
const pauseModal = document.getElementById('pause-modal');
const pauseStatDmg = document.getElementById('pause-stat-dmg');
const pauseStatSpd = document.getElementById('pause-stat-spd');
const pauseStatCount = document.getElementById('pause-stat-count');
const pauseStatWeapon = document.getElementById('pause-stat-weapon');

const pauseBgmVolSlider = document.getElementById('pause-bgm-vol');
const pauseBgmVolVal = document.getElementById('pause-bgm-vol-val');
const pauseSfxVolSlider = document.getElementById('pause-sfx-vol');
const pauseSfxVolVal = document.getElementById('pause-sfx-vol-val');

const resumeBtn = document.getElementById('resume-btn');
const pauseQuitBtn = document.getElementById('pause-quit-btn');

const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const hardBtn = document.getElementById('hard-btn');
const infiniteBtn = document.getElementById('infinite-btn');
const testMinibossBtn = document.getElementById('test-miniboss-btn');
const testLaserbossBtn = document.getElementById('test-laserboss-btn');
const testFinalbossBtn = document.getElementById('test-finalboss-btn');
const testWarshipbossBtn = document.getElementById('test-warshipboss-btn');
const testChronosbossBtn = document.getElementById('test-chronosboss-btn');
const testArsenalbossBtn = document.getElementById('test-arsenalboss-btn');

const resultModal = document.getElementById('result-modal');
const modalTitle = document.getElementById('modal-title');
const modalSub = document.getElementById('modal-sub');
const modalScore = document.getElementById('modal-score');
const codeRewardArea = document.getElementById('code-reward-area');
const rewardTitle = document.getElementById('reward-title');
const rewardCode = document.getElementById('reward-code');
const rewardDesc = document.getElementById('reward-desc');
const restartBtn = document.getElementById('restart-btn');

const secretTrigger = document.getElementById('secret-trigger');
const secretModal = document.getElementById('secret-modal');
const secretInput = document.getElementById('secret-input');
const secretSubmitBtn = document.getElementById('secret-submit-btn');
const secretCloseBtn = document.getElementById('secret-close-btn');

const loadoutSelector = document.getElementById('loadout-selector');
const startGuide = document.getElementById('start-guide');
const loadoutPrevBtn = document.getElementById('loadout-prev');
const loadoutNextBtn = document.getElementById('loadout-next');
const loadoutPreviewCanvas = document.getElementById('loadout-preview-canvas');
const loadoutPreviewCtx = loadoutPreviewCanvas ? loadoutPreviewCanvas.getContext('2d') : null;
const loadoutName = document.getElementById('loadout-name');
const loadoutLevel = document.getElementById('loadout-level');
const loadoutDescription = document.getElementById('loadout-description');
const loadoutSelected = document.getElementById('loadout-selected');

let width = 0;
let height = 0;
let scale = 1.0;

let gameState = 'ready';
let gameMode = 'normal';
let isPaused = false; // [1.6 추가] 일시정지 상태 변수
let score = 0;
let gameTime = 0;
let currentPhase = 1;
let lastTime = performance.now();
let nukeFlashAlpha = 0;

let bullets = [];
let items = [];
let particles = [];
let floatingTexts = [];
let pulseRings = [];

let basicSinceBomb = 0;
let targetBomb = 8;
let basicSinceCore = 0;
let targetCore = 5;
let coreCycle = 0; // 0: 첫 코어는 룰렛, 이후 1 이상은 LvUp 코어
let blackHoleShootTimer = 0;

let enemyTimer = 0;
let obsTimer = 0;
let itemTimer = 0;
let hardItemSegmentIndex = 0;
let hardItemDropCount = 0;
let secScoreTimer = 0;
let droneShootTimer = 0;
let weaponAnimTime = 0;
let flameTickTimer = 0;
let flameEmitTimer = 0;
let flameParticles = [];
let lightningBlades = [];
let chainLightning = [];
let chainHitMarkers = [];
// 한 번의 번개 칼날 탄환이 같은 보스에게
// '직격 체인 + 복귀 체인'을 중복 생성하지 않도록 한다.
const MAX_ACTIVE_CHAIN_LIGHTNING = 24;
let lightningOrbitPhase = 0;
let ignitionDecayTimer = 0;

let miniBossSpawned = false;
let gundamBossSpawned = false;
let finalBossSpawned = false;
let lastInfiniteBossTime = 0;

const OMNI_BULLET_COLOR = '#2563eb';

const WEAPON_META = {
  'omni': { color: '#2563eb', label: '360', name: '방사형 무장' },
  'laser': { color: '#ff4757', label: 'LSR', name: '레이저 무장' },
  'drone': { color: '#22c55e', label: 'DRN', name: '유도 드론 무장' },
  'pulse': { color: '#00d2d3', label: 'PLS', name: '펄스 폭발' },
  'blackhole': { color: '#8b5cf6', label: 'BHL', name: '블랙홀 무장' },
  'flame': { color: '#f59e0b', label: 'FLM', name: '화염 무장' },
  'lightning': { color: '#facc15', label: 'LTB', name: '번개 칼날' }
};

const START_WEAPONS = ['default', 'omni', 'laser', 'drone', 'pulse', 'blackhole', 'flame', 'lightning'];
const START_WEAPON_DESCRIPTIONS = {
  default: '기본 탄환을 안정적으로 발사합니다.',
  omni: '플레이어 주변 360도로 탄환을 발사합니다.',
  laser: '강력한 레이저를 집중 발사합니다.',
  drone: '유도 드론과 함께 공격합니다.',
  pulse: '주변을 충격파로 공격합니다.',
  blackhole: '기본 탄환과 블랙홀을 함께 운용합니다.',
  flame: '근거리 부채꼴 화염으로 공격합니다.',
  lightning: '번개 칼날 탄환이 적을 연쇄 공격합니다.'
};
let selectedStartWeapon = localStorage.getItem('roadout_selected_weapon');
if (!START_WEAPONS.includes(selectedStartWeapon)) selectedStartWeapon = 'default';

function getStartWeaponMeta(kind) {
  if (kind === 'default') return { color: '#38bdf8', label: 'DEF', name: '기본 무장' };
  return WEAPON_META[kind];
}

function drawLoadoutPreview() {
  if (!loadoutPreviewCtx) return;
  const ctx = loadoutPreviewCtx;
  const w = loadoutPreviewCanvas.width;
  const h = loadoutPreviewCanvas.height;
  ctx.clearRect(0, 0, w, h);

  const meta = getStartWeaponMeta(selectedStartWeapon);
  const cx = w / 2, cy = h / 2 + 2, r = 27;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = meta.color;
  ctx.shadowColor = meta.color;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.35);
  ctx.lineTo(r * 0.82, r * 0.95);
  ctx.lineTo(0, r * 0.50);
  ctx.lineTo(-r * 0.82, r * 0.95);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();

  // 무장별 간단한 실루엣/장식
  ctx.save();
  ctx.strokeStyle = meta.color;
  ctx.fillStyle = meta.color;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = meta.color;
  ctx.shadowBlur = 8;
  if (selectedStartWeapon === 'omni') {
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(cx, cy, 38, 0, Math.PI * 2); ctx.stroke();
  } else if (selectedStartWeapon === 'laser') {
    ctx.beginPath(); ctx.moveTo(cx, cy - 48); ctx.lineTo(cx, cy - 22); ctx.stroke();
  } else if (selectedStartWeapon === 'drone') {
    ctx.beginPath(); ctx.arc(cx - 32, cy, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 32, cy, 7, 0, Math.PI * 2); ctx.stroke();
  } else if (selectedStartWeapon === 'pulse') {
    ctx.beginPath(); ctx.arc(cx, cy, 43, 0, Math.PI * 2); ctx.stroke();
  } else if (selectedStartWeapon === 'blackhole') {
    ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 31, 0, Math.PI * 2); ctx.globalAlpha = 0.55; ctx.stroke();
  } else if (selectedStartWeapon === 'flame') {
    ctx.beginPath(); ctx.moveTo(cx - 26, cy - 36); ctx.lineTo(cx, cy - 58); ctx.lineTo(cx + 26, cy - 36); ctx.stroke();
  } else if (selectedStartWeapon === 'lightning') {
    ctx.beginPath(); ctx.moveTo(cx - 10, cy - 35); ctx.lineTo(cx + 3, cy - 12); ctx.lineTo(cx - 5, cy - 10); ctx.lineTo(cx + 10, cy + 15); ctx.stroke();
  }
  ctx.restore();
}

function updateLoadoutUI() {
  if (!loadoutSelector) return;
  const meta = getStartWeaponMeta(selectedStartWeapon);
  loadoutName.textContent = meta.name;
  loadoutName.style.color = meta.color;
  loadoutLevel.textContent = 'Lv.1로 시작';
  loadoutDescription.textContent = START_WEAPON_DESCRIPTIONS[selectedStartWeapon] || '';
  loadoutSelected.textContent = `선택: ${meta.name}`;
  drawLoadoutPreview();
}

function setSelectedStartWeapon(nextIndex) {
  const idx = START_WEAPONS.indexOf(selectedStartWeapon);
  selectedStartWeapon = START_WEAPONS[(idx + nextIndex + START_WEAPONS.length) % START_WEAPONS.length];
  localStorage.setItem('roadout_selected_weapon', selectedStartWeapon);
  updateLoadoutUI();
}

function unlockLoadoutSelector(showAlert = false) {
  localStorage.setItem('unlocked_roadout', 'true');
  // 숙련 플레이어에게는 규칙 안내 대신 같은 시작 화면 영역에 무장 선택기를 표시한다.
  // 두 패널을 동시에 쌓지 않아 모바일에서도 작전 시작 버튼이 밀려나지 않는다.
  if (startGuide) startGuide.style.display = 'none';
  if (loadoutSelector) loadoutSelector.style.display = 'block';
  updateLoadoutUI();
  if (showAlert) alert('⚡ [ROADOUT] 출격 무장 선택 프로토콜이 활성화되었습니다!\n일반/하드/무한 모드 시작 전에 원하는 무장을 선택할 수 있습니다.');
}

const gundam = {
  active: false,
  y: 0,
  targetY: 0,
  beamFired: false,
  beamAlpha: 0
};

const MIN_SHORT_SIDE = 320;

function fitContainer() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw === 0 || vh === 0) return;

  const isLandscape = vw > vh;
  document.body.classList.toggle('landscape', isLandscape);
  const ratio = isLandscape ? 16 / 9 : 9 / 16;

  let w, h;
  if (vw / vh > ratio) { h = vh; w = h * ratio; }
  else { w = vw; h = w / ratio; }

  const shortSide = Math.min(w, h);
  if (shortSide < MIN_SHORT_SIDE) {
    const k = MIN_SHORT_SIDE / shortSide;
    w *= k;
    h *= k;
  }

  container.style.width = `${Math.floor(w)}px`;
  container.style.height = `${Math.floor(h)}px`;
}

function rescaleWorld(sx, sy, sr) {
  const remap = (o, withRadius = true, withVel = true) => {
    if (!o) return;
    o.x *= sx;
    o.y *= sy;
    if (withRadius && o.radius !== undefined) o.radius *= sr;
    if (withVel && o.vx !== undefined) { o.vx *= sr; o.vy *= sr; }
  };

  player.x *= sx; player.y *= sy;
  player.targetX *= sx; player.targetY *= sy;
  player.knockbackVx *= sr; player.knockbackVy *= sr;

  for (const e of enemies) {
    remap(e);
    e.speed *= sr;
    if (e.orbitRadius) e.orbitRadius *= sr;
    if (e.arsenalAnchorX !== undefined) e.arsenalAnchorX *= sx;
    if (e.arsenalAnchorY !== undefined) e.arsenalAnchorY *= sy;
    if (e.arsenalMoveAmplitude !== undefined) e.arsenalMoveAmplitude *= sy;
  }
  for (const eb of enemyBullets) remap(eb);
  for (const o of obstacles) remap(o);
  for (const b of bullets) remap(b);
  for (const it of items) remap(it);
  for (const p of particles) remap(p);
  for (const ft of floatingTexts) { ft.x *= sx; ft.y *= sy; ft.vy *= sr; }
  for (const r of pulseRings) remap(r, true, false);

  const boss = BossManager.activeBoss;
  if (boss) {
    boss.x *= sx; boss.y *= sy;
    boss.targetY *= sy; boss.baseY *= sy;
    boss.radius *= sr;
    if (boss.shipWidth) boss.shipWidth *= sx;
    if (boss.parts) {
      for (const key of ['left','right','core']) {
        if (boss.parts[key] && boss.parts[key].radius) boss.parts[key].radius *= sr;
      }
    }
  }
  for (const bb of BossManager.bossBullets) { remap(bb); if (bb.length) bb.length *= sr; }
  for (const m of BossManager.markers) remap(m, true, false);
  for (const l of BossManager.lasers) {
    if (l.orient === 'h') { l.y *= sy; l.height *= sy; }
    else { l.x *= sx; l.width *= sx; }
  }
  for (const d of BossManager.specialDrops) remap(d, true, false);
  for (const bit of BossManager.sideBitDrones) { bit.x *= sx; bit.y *= sy; }
  for (const bm of BossManager.beams) { bm.ox *= sx; bm.oy *= sy; bm.width *= sr; }
  for (const c of BossManager.containers) remap(c, true, false);
  for (const portal of BossManager.phantomPortals) {
    remap(portal.entrance, true, false);
    remap(portal.exit, true, false);
  }
  for (const hole of BossManager.chronosBlackholes) {
    hole.x *= sx; hole.y *= sy;
    hole.visualRadius *= sr;
    hole.coreRadius *= sr;
    hole.gravityRadius = Math.hypot(width, height) * 1.15;
    hole.radius = hole.gravityRadius;
    hole.strength *= sr;
    hole.speed *= sr;
  }
  for (const warning of BossManager.arsenalWarnings) {
    if (warning.kind === 'line') {
      warning.x1 *= sx; warning.y1 *= sy;
      warning.x2 *= sx; warning.y2 *= sy;
    } else {
      warning.x *= sx; warning.y *= sy; warning.radius *= sr;
    }
  }
  for (const laser of BossManager.arsenalLasers) {
    laser.length *= sr;
    laser.width *= sr;
  }
  for (const db of BossManager.delayedBombards) db.radius *= sr;
  if (BossManager.dashTargetX !== undefined) { BossManager.dashTargetX *= sx; BossManager.dashTargetY *= sy; }

  gundam.y *= sy;
  gundam.targetY *= sy;
}

function resize() {
  const rect = container.getBoundingClientRect();
  const newWidth = Math.round(rect.width);
  const newHeight = Math.round(rect.height);
  if (newWidth === 0 || newHeight === 0) return;
  if (newWidth === width && newHeight === height) return;

  const prevWidth = width;
  const prevHeight = height;
  const prevScale = scale;

  width = newWidth;
  height = newHeight;
  canvas.width = width;
  canvas.height = height;
  scale = Math.max(0.9, Math.min(width, height) / 380);

  player.radius = 9 * scale;
  player.speed = 270 * scale;

  if (prevWidth > 0 && prevHeight > 0) {
    rescaleWorld(width / prevWidth, height / prevHeight, scale / prevScale);
  }

  player.x = Math.max(player.radius, Math.min(width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(height - player.radius, player.y));
  player.targetX = Math.max(player.radius, Math.min(width - player.radius, player.targetX));
  player.targetY = Math.max(player.radius, Math.min(height - player.radius, player.targetY));
}

const ro = new ResizeObserver(() => resize());
ro.observe(container);
window.addEventListener('resize', fitContainer);
window.addEventListener('orientationchange', fitContainer);

// 메인 볼륨 슬라이더 이벤트
bgmVolSlider.addEventListener('input', (e) => {
  const val = parseInt(e.target.value);
  bgmVolVal.textContent = `${val}%`;
  pauseBgmVolSlider.value = val;
  pauseBgmVolVal.textContent = `${val}%`;
  Sound.setBGMVolume(val / 100);
});

sfxVolSlider.addEventListener('input', (e) => {
  const val = parseInt(e.target.value);
  sfxVolVal.textContent = `${val}%`;
  pauseSfxVolSlider.value = val;
  pauseSfxVolVal.textContent = `${val}%`;
  Sound.setSFXVolume(val / 100);
});

// 일시정지 볼륨 슬라이더 이벤트 (메인과 양방향 연동)
pauseBgmVolSlider.addEventListener('input', (e) => {
  const val = parseInt(e.target.value);
  pauseBgmVolVal.textContent = `${val}%`;
  bgmVolSlider.value = val;
  bgmVolVal.textContent = `${val}%`;
  Sound.setBGMVolume(val / 100);
});

pauseSfxVolSlider.addEventListener('input', (e) => {
  const val = parseInt(e.target.value);
  pauseSfxVolVal.textContent = `${val}%`;
  sfxVolSlider.value = val;
  sfxVolVal.textContent = `${val}%`;
  Sound.setSFXVolume(val / 100);
});

// [1.6 추가] 일시정지 토글 함수
function togglePause(force) {
  if (gameState !== 'playing') return;
  if (adminOpen) return;

  const next = force !== undefined ? force : !isPaused;
  isPaused = next;

  if (isPaused) {
    // 플레이어 기체 스탯 정보 갱신
    pauseStatDmg.textContent = player.baseDamage.toFixed(1);
    pauseStatSpd.textContent = `Lv.${player.speedLevel}`;
    pauseStatCount.textContent = player.baseBulletCount;
    const wName = player.weaponType === 'default' ? '기본' : WEAPON_META[player.weaponType].name;
    pauseStatWeapon.textContent = `${wName} (Lv.${player.weaponLevel})`;

    // 슬라이더 값 동기화
    const bgmPercent = Math.round(Sound.bgmVolume * 100);
    pauseBgmVolSlider.value = bgmPercent;
    pauseBgmVolVal.textContent = `${bgmPercent}%`;

    const sfxPercent = Math.round(Sound.sfxVolume * 100);
    pauseSfxVolSlider.value = sfxPercent;
    pauseSfxVolVal.textContent = `${sfxPercent}%`;

    // 일시정지 중 잔여 키 입력 및 조이스틱 상태 리셋
    for (const k in keys) keys[k] = false;
    handleTouchEnd();
    isMouseDown = false;
    joystickEnd();

    pauseModal.style.display = 'flex';
  } else {
    pauseModal.style.display = 'none';
    lastTime = performance.now(); // 시간 폭증(delta spike) 방지
  }
}

pauseBtn.addEventListener('click', () => togglePause(true));
resumeBtn.addEventListener('click', () => togglePause(false));
pauseQuitBtn.addEventListener('click', () => {
  togglePause(false);
  if (BossRush.active) { BossRush.cleanupField(); BossRush.reset(); }
  uiLayer.style.display = 'none';
  startScreen.style.display = 'flex';
  gameState = 'ready';
  Sound.stopBGM();
});

// 일시정지 모달 내 클릭이 캔버스 터치/조작으로 새어나가지 않도록 차단
for (const ev of ['touchstart', 'touchmove', 'touchend', 'mousedown', 'mousemove', 'mouseup']) {
  pauseModal.addEventListener(ev, e => e.stopPropagation(), { passive: false });
}

function drawPolygon(ctx, x, y, radius, sides, rotation) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i * 2 * Math.PI / sides);
    const px = x + radius * Math.cos(a);
    const py = y + radius * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function addExplosion(x, y, color = '#ff9f43', count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 2.5 + 1) * scale;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: (Math.random() * 2 + 1.2) * scale,
      color,
      alpha: 1
    });
  }
}

function showFloatingText(text, x, y, color = '#fff') {
  floatingTexts.push({ text, x, y, color, alpha: 1, vy: -1.0 * scale });
}


function roundDamage(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function showDamageNumber(amount, x, y, color = '#ffffff', displayMultiplier = 1) {
  const raw = Math.abs(Number(amount));
  const multiplier = Number.isFinite(displayMultiplier) ? displayMultiplier : 1;
  const shown = raw * multiplier;
  const value = multiplier === 1
    ? Math.max(1, Math.round(shown))
    : Math.max(1, Math.round((shown + Number.EPSILON) * 100) / 100);
  floatingTexts.push({
    text: String(value), x, y: y - 4 * scale,
    color, alpha: 1, vy: -0.55 * scale,
    damageNumber: true
  });
}

function applyEnemyDamage(enemy, amount, x = enemy.x, y = enemy.y, damageColor = '#ffffff', showEliteDamage = true) {
  const damage = Math.max(0, roundDamage(amount));
  if (damage <= 0) return 0;
  enemy.hp = Math.max(0, roundDamage(enemy.hp - damage));
  // 모든 일반 적/엘리트의 피해량을 동일하게 100배 표시한다.
  // 실제 내부 피해 연산은 기존 그대로 유지한다.
  if (showEliteDamage || !enemy.isElite) showDamageNumber(damage, x, y, damageColor, 100);
  return damage;
}

function ensureIgnition(target) {
  if (!target) return;
  if (!Number.isFinite(target.ignitionSeconds)) target.ignitionSeconds = 0;
  if (target.ignitionHitThisTick !== true) target.ignitionHitThisTick = false;
}

function getIgnitionMultiplier(target) {
  ensureIgnition(target);
  const t = Math.min(5, Math.max(0, target.ignitionSeconds));

  // 0~1초: 빠르게 상승(잡몹 구간)
  // 1~4초: 완만하게 상승
  // 4~5초: 다시 빠르게 상승
  if (t <= 1) {
    const p = t;
    return 1 + 1.2 * (p * p * (3 - 2 * p)); // 1.0 -> 2.2
  }
  if (t <= 4) {
    const p = (t - 1) / 3;
    return 2.2 + 0.6 * (p * p * (3 - 2 * p)); // 2.2 -> 2.8
  }
  const p = t - 4;
  return 2.8 + 1.2 * (p * p * (3 - 2 * p)); // 2.8 -> 4.0
}

function applyFlameIgnition(target, baseDamage, x, y) {
  ensureIgnition(target);
  const multiplier = getIgnitionMultiplier(target);
  const damage = roundDamage(baseDamage * multiplier);
  target.ignitionHitThisTick = true;
  target.ignitionSeconds = Math.min(5, target.ignitionSeconds + 0.08);
  return { damage, multiplier, isMax: multiplier >= 3.999 };
}

function updateIgnition(dt) {
  ignitionDecayTimer += dt;
  if (ignitionDecayTimer < 0.08) return;
  const ticks = Math.floor(ignitionDecayTimer / 0.08);
  ignitionDecayTimer -= ticks * 0.08;

  const targets = [];
  for (const e of enemies) if (e && !e.isBossEntity) targets.push(e);
  if (BossManager.activeBoss) {
    if (BossManager.bossType === 'warship') {
      for (const part of Object.values(BossManager.activeBoss.parts)) targets.push(part);
    } else {
      targets.push(BossManager.activeBoss);
      if (BossManager.bossType === 'laser' && BossManager.activeBoss.prisms) {
        for (const p of BossManager.activeBoss.prisms) targets.push(p);
      }
    }
  }

  for (const target of targets) {
    ensureIgnition(target);
    if (target.ignitionHitThisTick) {
      target.ignitionHitThisTick = false;
    } else {
      target.ignitionSeconds = Math.max(0, target.ignitionSeconds - 0.08 * ticks);
    }
  }
}

function updateFlameEffect(dt) {
  if (player.weaponType !== 'flame') {
    flameEmitTimer = 0;
    flameParticles = [];
    return;
  }

  const level = Math.max(1, Math.min(8, player.weaponLevel));
  const halfAngle = (10 + (level - 1) * (65 / 7)) * (Math.PI / 180);
  const range = getFlameRange();

  flameEmitTimer += dt;
  const emitInterval = 0.035;
  while (flameEmitTimer >= emitInterval) {
    flameEmitTimer -= emitInterval;

    // 한 번에 여러 갈래를 내뿜되, 모든 화염은 실제 공격 부채꼴 내부에서만 생성된다.
    const streams = 2 + (level >= 5 ? 1 : 0);
    for (let i = 0; i < streams; i++) {
      const edgeJitter = 0.12 + Math.random() * 0.76;
      const angleOffset = (Math.random() * 2 - 1) * halfAngle * edgeJitter;
      const startRadius = (7 + Math.random() * 10) * scale;
      const maxTravel = range * (0.82 + Math.random() * 0.18);
      const widthRatio = 0.055 + Math.random() * 0.09;
      flameParticles.push({
        t: 0,
        life: 0.16 + Math.random() * 0.11,
        angleOffset,
        startRadius,
        maxTravel,
        widthRatio,
        wobble: (0.012 + Math.random() * 0.025) * (Math.random() < 0.5 ? -1 : 1),
        phase: Math.random() * Math.PI * 2,
        widthScale: 0.78 + Math.random() * 0.38
      });
    }
  }

  for (let i = flameParticles.length - 1; i >= 0; i--) {
    const f = flameParticles[i];
    f.t += dt / f.life;
    if (f.t >= 1) flameParticles.splice(i, 1);
  }

  // 이펙트 입자 수를 제한해 장시간 플레이 시에도 비용이 누적되지 않게 한다.
  if (flameParticles.length > 44) {
    flameParticles.splice(0, flameParticles.length - 44);
  }
}

function getFlameRange() {
  // 플레이어 화염만 조금 확장한다. ARSENAL FRAME을 비롯한 보스 패턴에는 적용하지 않는다.
  return 130 * scale;
}

function getItemInterval() {
  if (gameMode === 'hard') return getHardItemInterval();

  const base = 12.0 + (currentPhase - 1) * 1.0;
  return currentPhase >= 4 ? base * 2 : base;
}

// 하드 모드의 기존 시간대별 공급표다. 첫 8개만 아래의 오프닝 간격을 우선 사용하며,
// 이후에는 이 표의 현재 시간대 간격으로 복귀한다. 보스전 중 타이머는 20% 속도로 진행된다.
const HARD_ITEM_INTERVALS = [
  { until: 120, interval: 15 }, // 0~2분 기본값(첫 8개 가속 종료 후 사용)
  { until: 180, interval: 12 }, // 2~3분: 5회
  { until: 300, interval: 15 }, // 3~5분: 8회
  { until: 420, interval: 15 }, // 5~7분: 8회
  { until: 480, interval: 12 }, // 7~8분: 5회
  { until: 600, interval: 15 }, // 8~10분: 8회
  { until: 660, interval: 12 }, // 10~11분: 5회
  { until: 720, interval: 10 }  // 11~12분: 6회
];
const HARD_OPENING_ITEM_COUNT = 8;
const HARD_OPENING_ITEM_INTERVAL = 12;

function getHardItemSegmentIndex(time = gameTime) {
  const index = HARD_ITEM_INTERVALS.findIndex(entry => time < entry.until);
  return index === -1 ? HARD_ITEM_INTERVALS.length - 1 : index;
}

function getHardItemInterval(time = gameTime) {
  if (hardItemDropCount < HARD_OPENING_ITEM_COUNT) return HARD_OPENING_ITEM_INTERVAL;
  return HARD_ITEM_INTERVALS[getHardItemSegmentIndex(time)].interval;
}

function advanceHardItemTimer(dt, isBossFight) {
  // 보스전은 기존 규칙대로 20% 속도로만 진행한다. gameTime이 멈춰 있으므로
  // 구간 경계 계산은 하지 않는다.
  if (isBossFight) {
    itemTimer += dt * 0.2;
    const interval = getHardItemInterval();
    if (itemTimer + 1e-8 >= interval) {
      spawnItem();
      itemTimer = 0;
    }
    return;
  }

  // 프레임이 시간 경계를 넘는 경우, 경계 전 구간의 마지막 아이템을 먼저
  // 처리한 뒤 남은 프레임 시간을 다음 구간에 전달한다.
  let remainingDt = dt;
  let segmentTime = Math.max(0, gameTime - dt);
  const lastIndex = HARD_ITEM_INTERVALS.length - 1;

  while (remainingDt > 1e-8) {
    hardItemSegmentIndex = getHardItemSegmentIndex(segmentTime);
    const isLastSegment = hardItemSegmentIndex === lastIndex;
    const boundary = isLastSegment ? Infinity : HARD_ITEM_INTERVALS[hardItemSegmentIndex].until;
    const slice = Math.min(remainingDt, Math.max(0, boundary - segmentTime));

    if (slice <= 1e-8) {
      if (isLastSegment) break;
      hardItemSegmentIndex++;
      itemTimer = 0;
      segmentTime = boundary;
      continue;
    }

    itemTimer += slice;
    const interval = getHardItemInterval(segmentTime);
    if (itemTimer + 1e-8 >= interval) {
      spawnItem();
      itemTimer = 0;
    }

    segmentTime += slice;
    remainingDt -= slice;
    if (!isLastSegment && segmentTime >= boundary - 1e-8) {
      hardItemSegmentIndex++;
      itemTimer = 0;
    }
  }
}

// 목표는 보정 기준일 뿐이며, 아이템을 보장하는 값은 아니다.
const HARD_GROWTH_TARGETS = [
  { time: 0, damage: 1, speed: 1, count: 1 },
  { time: 300, damage: 3, speed: 3, count: 3 },
  { time: 480, damage: 6, speed: 6, count: 6 },
  { time: 660, damage: 10, speed: 10, count: 10 },
  { time: 720, damage: 10, speed: 10, count: 10 }
];

function getHardGrowthTarget(time = gameTime) {
  const first = HARD_GROWTH_TARGETS[0];
  if (time <= first.time) return { ...first };

  for (let i = 1; i < HARD_GROWTH_TARGETS.length; i++) {
    const next = HARD_GROWTH_TARGETS[i];
    if (time <= next.time) {
      const previous = HARD_GROWTH_TARGETS[i - 1];
      const ratio = (time - previous.time) / (next.time - previous.time);
      return {
        damage: previous.damage + (next.damage - previous.damage) * ratio,
        speed: previous.speed + (next.speed - previous.speed) * ratio,
        count: previous.count + (next.count - previous.count) * ratio
      };
    }
  }

  return { ...HARD_GROWTH_TARGETS[HARD_GROWTH_TARGETS.length - 1] };
}

function getHardOvergrowthPenalty(value, target) {
  const excess = Math.floor(value - target + 1e-6);
  if (excess < 2) return 0;
  if (excess === 2) return 0.02;
  if (excess === 3) return 0.03;
  return 0.05;
}

function getHardHealBonus() {
  const hpRatio = player.maxHp > 0 ? player.hp / player.maxHp : 1;
  if (hpRatio >= 0.8) return 0;
  if (hpRatio >= 0.6) return 0.02;
  if (hpRatio >= 0.4) return 0.05;
  if (hpRatio >= 0.2) return 0.10;
  return 0.15;
}

function getHardBasicDropWeights() {
  // 기준 확률 D/S/W/H = 30/30/30/10. 과성장 항목만 최대 5%p 줄이고,
  // 줄어든 확률은 나머지 세 항목에 균등하게 돌려 낮은 스탯을 직접 밀어주지 않는다.
  const weights = { dmg: 0.30, spd: 0.30, count: 0.30, heal: 0.10 };
  const target = getHardGrowthTarget();
  const comparisons = [
    { key: 'dmg', value: player.baseDamage, target: target.damage },
    { key: 'spd', value: player.speedLevel, target: target.speed },
    { key: 'count', value: player.baseBulletCount, target: target.count }
  ];

  for (const entry of comparisons) {
    const penalty = getHardOvergrowthPenalty(entry.value, entry.target);
    if (penalty <= 0) continue;

    weights[entry.key] -= penalty;
    const redistributed = penalty / 3;
    for (const key of Object.keys(weights)) {
      if (key !== entry.key) weights[key] += redistributed;
    }
  }

  // HP 보정은 D/S/W에서만 균등 차감한다. 최대 H는 30%로 제한하여
  // 회복 아이템이 고정적으로 지배적인 결과가 되지 않게 한다.
  const requestedHealBonus = getHardHealBonus();
  const allowedHealBonus = Math.min(requestedHealBonus, 0.30 - weights.heal);
  if (allowedHealBonus > 0) {
    weights.heal += allowedHealBonus;
    const deduction = allowedHealBonus / 3;
    weights.dmg -= deduction;
    weights.spd -= deduction;
    weights.count -= deduction;
  }

  return weights;
}

function pickHardBasicItem() {
  const basicPool = {
    heal: { kind: 'heal', color: '#2ecc71', label: 'HP+', name: '체력 / 보호막' },
    dmg: { kind: 'dmg', color: '#ff6b6b', label: 'DMG', name: '화력 강화' },
    count: { kind: 'count', color: '#38bdf8', label: 'WAY', name: '탄환 추가' },
    spd: { kind: 'spd', color: '#f1c40f', label: 'SPD', name: '연사 가속' }
  };
  const weights = getHardBasicDropWeights();
  let roll = Math.random();

  for (const key of ['dmg', 'spd', 'count', 'heal']) {
    roll -= weights[key];
    if (roll < 0) return basicPool[key];
  }

  // 부동소수점 오차로 경계값을 넘는 경우에만 마지막 항목을 사용한다.
  return basicPool.heal;
}

function reduceItemCooldown(sec) {
  const currentItemInterval = getItemInterval();
  itemTimer = Math.min(currentItemInterval, itemTimer + sec);
  showFloatingText("아이템 리젠 -3초!", player.x, player.y - 25 * scale, '#38bdf8');
}

function triggerNuke() {
  Sound.playBomb();
  nukeFlashAlpha = 0.75;
  let gain = 0;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (!e.isElite) {
      addExplosion(e.x, e.y, '#ff4757', 10);
      gain += 25;
      enemies.splice(i, 1);
    } else {
      applyEnemyDamage(e, 20 * scale);
      addExplosion(e.x, e.y, '#ffd32a', 6);
      if (e.hp <= 0) {
        handleEnemyDeath(e, i);
      }
    }
  }

  if (BossManager.activeBoss) {
    BossManager.takeDamage(40 * scale, null, '#ffd32a', { x: player.x, y: player.y }, 'bomb');
  }

  for (let obs of obstacles) {
    addExplosion(obs.x, obs.y, '#95a5a6', 12);
    gain += 40;
  }
  obstacles = [];
  enemyBullets = [];
  score += gain;
  showFloatingText("FIELD CLEARED!", width / 2, height / 2, '#ffd32a');
}

function applyHealItem() {
  Sound.playItem();
  if (player.hp < player.maxHp) {
    player.hp++;
    showFloatingText('+체력 회복', player.x, player.y - 15 * scale, '#2ecc71');
  } else if (player.shield < getMaxShield()) {
    player.shield++;
    showFloatingText('+보호막 획득!', player.x, player.y - 15 * scale, '#ffd32a');
  } else {
    score += 200;
    showFloatingText('+200점 (보호막 최대)', player.x, player.y - 15 * scale, '#ffd32a');
  }
  updateHpUI();
}

function getPulseAuraRadius() {
  return (35 + player.weaponLevel * 9) * scale;
}

const PULSE_DAMAGE_MULTIPLIER = 2.5;
const PULSE_AURA_TICK_INTERVAL = 0.15;

function triggerPulseExplosion(cx, cy) {
  Sound.playExplosion(true);
  addExplosion(cx, cy, '#00d2d3', 12);
  nukeFlashAlpha = Math.max(nukeFlashAlpha, 0.12);

  // 펄스 폭발 탄환이 방해물/엘리트/보스에 적중한 지점에
  // 1초 동안 잔류하는 펄스 폭풍을 생성한다.
  // 충전 영역(aura)의 2배 크기로 설정한다.
  const stormRadius = getPulseAuraRadius() * 2.0;
  pulseRings.push({
    x: cx,
    y: cy,
    radius: stormRadius,
    life: 1.0,
    maxLife: 1.0,
    tickTimer: 0,
    alpha: 1
  });
  if (pulseRings.length > 12) pulseRings.shift();
}

function resetWeaponRuntimeState() {
  player.shootCooldown = 0;
  player.laserTimer = 0;
  player.isLaserFiring = false;
  player.pulseChargeTimer = 0;
  blackHoleShootTimer = 0;
  flameTickTimer = 0;
  player.lightningBladeTimer = 0;
  player.lightningThrowTimer = 0;
  lightningBlades = [];
  chainLightning = [];
  chainHitMarkers = [];
  lightningOrbitPhase = 0;
  ignitionDecayTimer = 0;
}

function getBlackHoleInterval() {
  // 연사 Lv.1 = 6초, Lv.20 = 2초. Lv.20 이후에는 2초로 고정한다.
  const lv = Math.max(1, Math.min(20, player.speedLevel));
  return 6.0 - (lv - 1) * (4.0 / 19.0);
}

function getBlackHoleMaxRadius() {
  // 블랙홀 전체 크기를 상향 조정한다. Lv.8은 기존보다 확실히 크게,
  // 저레벨도 너무 작지 않도록 시작 크기 역시 함께 키운다.
  const pulseMaxRadius = (35 + 8 * 9) * scale;
  return pulseMaxRadius * 1.55;
}

function getBlackHoleRadius(levelOverride = null) {
  const level = Math.max(1, Math.min(8, levelOverride ?? player.weaponLevel));
  const maxRadius = getBlackHoleMaxRadius();
  const levelRatio = 0.35 + (level - 1) * (0.65 / 7);
  return maxRadius * levelRatio;
}

function getBlackHoleCoreRadius() {
  return getBlackHoleRadius() * 0.18;
}

function fireBlackHole() {
  const angle = player.angle;
  const damage = player.baseDamage * 0.9;
  const radius = getBlackHoleRadius();
  const travelSpeed = 4.06 * scale * 0.8;
  blackHoleShootTimer = 0;
  Sound.playShoot('blackhole');
  bullets.push({
    x: player.x,
    y: player.y,
    vx: Math.cos(angle) * travelSpeed,
    vy: Math.sin(angle) * travelSpeed,
    // 블랙홀은 발사 직후 플레이어가 범위 안에 있으므로
    // 플레이어가 주변부에서 완전히 벗어나기 전까지 흡입을 활성화하지 않는다.
    baseSpeed: travelSpeed * 0.7,
    radius: radius,
    coreRadius: getBlackHoleCoreRadius(),
    color: WEAPON_META.blackhole.color,
    damage,
    isBlackHole: true,
    weaponKind: 'blackhole',
    tickTimer: 0,
    pullArmed: false,
    angle
  });
}


function levelUpCurrentWeapon(color = '#67e8f9') {
  const kind = player.weaponType;
  if (kind === 'default') {
    // 기본 무장은 LvUp 코어의 영향을 받지 않도록 한다.
    showFloatingText('기본 무장은 레벨업 코어를 사용할 수 없습니다.', player.x, player.y - 20 * scale, '#94a3b8');
    return;
  }

  Sound.playUpgrade();
  const currentLevel = Math.max(1, Math.min(8, player.weaponLevel || 1));
  if (currentLevel < 8) {
    player.weaponLevel = currentLevel + 1;
    showFloatingText(`${WEAPON_META[kind].name} Lv.${player.weaponLevel} 레벨업!`, player.x, player.y - 20 * scale, color);
  } else {
    score += 500;
    showFloatingText('MAX 보너스 +500', player.x, player.y - 20 * scale, color);
  }
}

function equipWeapon(kind, color, name) {
  // 엘리트가 드랍하는 룰렛 코어 전용 처리:
  // 같은 무기면 +1레벨, 다른 무기면 현재 레벨을 유지한 채 무기만 교체한다.
  Sound.playUpgrade();
  const currentLevel = Math.max(1, Math.min(8, player.weaponLevel || 1));

  if (player.weaponType === kind) {
    if (currentLevel < 8) {
      player.weaponLevel = currentLevel + 1;
      showFloatingText(`${name} Lv.${player.weaponLevel} 진화!`, player.x, player.y - 20 * scale, color);
    } else {
      score += 500;
      showFloatingText('MAX 보너스 +500', player.x, player.y - 20 * scale, color);
    }
  } else {
    player.weaponType = kind;
    player.weaponLevel = currentLevel;
    resetWeaponRuntimeState();
    showFloatingText(`무장 교체: ${name} (Lv.${player.weaponLevel})`, player.x, player.y - 20 * scale, color);
  }
}

function equipArsenalWeapon(kind, color, name) {
  // ARSENAL 전용 코어는 현재 레벨을 보존한 채 무기만 바꾼다.
  // 같은 무기가 표시된 순간 획득해도 무료 레벨업이나 점수 보너스는 없다.
  Sound.playUpgrade();
  const currentLevel = Math.max(1, Math.min(8, player.weaponLevel || 1));
  if (player.weaponType !== kind) {
    player.weaponType = kind;
    player.weaponLevel = currentLevel;
    resetWeaponRuntimeState();
    showFloatingText(`ARSENAL 무장 교체: ${name} (Lv.${currentLevel})`, player.x, player.y - 20 * scale, color);
  } else {
    showFloatingText(`${name} Lv.${currentLevel} 유지`, player.x, player.y - 20 * scale, color);
  }
}

function spawnItem() {
  const pos = getRandomSpawnEdge();
  const angle = Math.atan2((height / 2) - pos.y, (width / 2) - pos.x) + (Math.random() - 0.5) * 0.4;
  let itemData;

  const isBossFight = !!BossManager.activeBoss;

  if (!isBossFight && basicSinceBomb >= targetBomb) {
    itemData = { shape: 'circle', kind: 'bomb', color: '#ffd32a', label: 'BOMB', name: '필드 클리어 폭탄!' };
    basicSinceBomb = 0;
    targetBomb = Math.floor(Math.random() * 4) + 12;
  } else if (basicSinceCore >= targetCore) {
    if (coreCycle === 0) {
      // 최초 무장은 기존처럼 첫 5개의 일반 강화 후 룰렛 코어로 제공한다.
      const roulettePool = ['omni', 'laser', 'drone', 'pulse', 'blackhole', 'flame', 'lightning'];
      const initialKind = roulettePool.includes(player.weaponType)
        ? roulettePool[roulettePool.indexOf(player.weaponType)]
        : roulettePool[0];

      itemData = {
        shape: 'square',
        kind: initialKind,
        color: WEAPON_META[initialKind].color,
        label: WEAPON_META[initialKind].label,
        name: WEAPON_META[initialKind].name,
        isRoulette: true,
        rouletteTimer: 1.5,
        rouletteInterval: 1.5,
        roulettePool,
        rouletteIndex: roulettePool.indexOf(initialKind)
      };
    } else {
      itemData = {
        shape: 'square',
        kind: 'lvup',
        color: '#67e8f9',
        label: 'LV+',
        name: '무기 레벨업 코어'
      };
    }

    basicSinceCore = 0;
    coreCycle++;
    // 첫 코어 이후부터는 일반 강화 8~10개마다 LvUp 코어가 등장한다.
    targetCore = Math.floor(Math.random() * 3) + 8;
  } else {
    basicSinceBomb++;
    basicSinceCore++;

    // 일반/무한 모드는 기존 균등 풀을 보존하고, 하드 모드만 가변 확률을 적용한다.
    const basicPool = [
      { kind: 'heal', color: '#2ecc71', label: 'HP+', name: '체력 / 보호막' },
      { kind: 'dmg', color: '#ff6b6b', label: 'DMG', name: '화력 강화' },
      { kind: 'count', color: '#38bdf8', label: 'WAY', name: '탄환 추가' },
      { kind: 'spd', color: '#f1c40f', label: 'SPD', name: '연사 가속' }
    ];
    const picked = gameMode === 'hard'
      ? pickHardBasicItem()
      : basicPool[Math.floor(Math.random() * basicPool.length)];
    itemData = { shape: 'circle', ...picked };
  }

  const itemSpeed = 0.45 * scale;
  items.push({
    x: pos.x,
    y: pos.y,
    vx: Math.cos(angle) * itemSpeed,
    vy: Math.sin(angle) * itemSpeed,
    radius: 8.5 * scale,
    ...itemData
  });
  if (gameMode === 'hard') hardItemDropCount++;
}

function triggerGundamEnding() {
  gameState = 'ending';
  Sound.stopBGM();
  gundam.active = true;
  gundam.y = height + 180 * scale;
  gundam.targetY = height * 0.52;
}


function getLightningBladeDamage() {
  // 번개 칼날 직격 피해는 현재 공격력의 1.2배.
  return Math.max(0.5, roundDamage(player.baseDamage * 1.2));
}

function getLightningProjectileRadius() {
  // 일반 탄환(기본 반지름 3 * scale)의 2배 크기.
  return 7.5 * scale;
}

function getLightningProjectileSpeed() {
  return 9.5 * scale;
}

function getLightningChainRange() {
  // 체인 라이트닝 전이 가능 거리는 항상 현재 블랙홀 Lv.8 최대 반지름과 동일하게 유지한다.
  return getBlackHoleMaxRadius();
}

function lightningTargetId(target) {
  if (!target) return null;
  // 대상 래퍼가 매번 새로 만들어져도 실제 게임 객체의 참조를 ID로 사용한다.
  // 이렇게 해야 체인/유도 탄환이 같은 대상을 중복 타격하지 않는다.
  if (target.entity && typeof target.entity === 'object') return target.entity;
  return target;
}

function getLightningBounceTargetId(target) {
  return lightningTargetId(target);
}

function getLightningBounceTargets(x, y, visited) {
  const candidates = [];
  const chainRange = getLightningChainRange();
  const add = target => {
    if (!target) return;
    const id = getLightningBounceTargetId(target);
    if (id == null || visited.has(id)) return;

    const targetRadius = Math.max(0, target.radius || 0);
    if (Math.hypot(target.x - x, target.y - y) > chainRange + targetRadius) return;
    candidates.push(target);
  };

  for (const e of enemies) {
    if (!e || e.hp <= 0 || e.isBossEntity || e.isShipUnbreakableDebris) continue;
    add({ kind: 'enemy', entity: e, x: e.x, y: e.y, radius: e.radius, isElite: !!e.isElite });
  }

  if (BossManager.activeBoss) {
    if (BossManager.bossType === 'warship') {
      for (const t of BossManager.getPlayerTargetables().filter(t => t.shipPart)) {
        if (!t.shipPart || !t.shipPart.alive) continue;
        add({ kind: 'warship', entity: t.shipPart, bossTarget: t, x: t.x, y: t.y, radius: t.radius, isBoss: true });
      }
    } else if (BossManager.bossType === 'laser') {
      for (const pr of BossManager.getVulnerablePrisms()) {
        if (!pr.prism || !pr.prism.alive) continue;
        add({ kind: 'prism', entity: pr.prism, bossTarget: pr, x: pr.x, y: pr.y, radius: pr.r, isBoss: true });
      }
      const b = BossManager.activeBoss;
      if (b && b.hp > 0) add({ kind: 'boss', entity: b, x: b.x, y: b.y, radius: b.radius, isBoss: true });
    } else {
      const b = BossManager.activeBoss;
      if (b && b.hp > 0) add({ kind: 'boss', entity: b, x: b.x, y: b.y, radius: b.radius, isBoss: true });
    }
  }

  candidates.sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
  return candidates;
}

function steerLightningProjectileToNextTarget(bullet) {
  const visited = bullet.hitIds || new Set();
  const candidates = getLightningBounceTargets(bullet.x, bullet.y, visited);
  const target = candidates[0] || null;
  if (!target) return false;

  const speed = getLightningProjectileSpeed();

  // 보스에게 전이될 때는 바로 멈추지 않고 보스를 관통해서 조금 더 이동한 뒤
  // 다시 돌아와 충돌한다. 실제 피해는 되돌아오는 구간에서 1회만 적용한다.
  if (target.isBoss) {
    const dx = target.x - bullet.x;
    const dy = target.y - bullet.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const dirX = dx / len;
    const dirY = dy / len;
    const passDistance = Math.max(210 * scale, (target.radius || 30) * 4.05);

    bullet.homing = false;
    bullet.target = target;
    bullet.bossManeuver = {
      phase: 'pass',
      target,
      passX: target.x + dirX * passDistance,
      passY: target.y + dirY * passDistance,
      returnX: target.x,
      returnY: target.y
    };
    bullet.vx = dirX * speed;
    bullet.vy = dirY * speed;
    bullet.angle = Math.atan2(dirY, dirX);
    return true;
  }

  const angle = Math.atan2(target.y - bullet.y, target.x - bullet.x);
  bullet.vx = Math.cos(angle) * speed;
  bullet.vy = Math.sin(angle) * speed;
  bullet.target = target;
  bullet.homing = true;
  bullet.bossManeuver = null;
  return true;
}

function fireLightningBlade() {
  const speed = getLightningProjectileSpeed();
  const damage = getLightningBladeDamage();
  const radius = getLightningProjectileRadius();

  bullets.push({
    x: player.x,
    y: player.y,
    vx: Math.cos(player.angle) * speed,
    vy: Math.sin(player.angle) * speed,
    radius,
    color: WEAPON_META.lightning.color,
    damage,
    isLightningBlade: true,
    weaponKind: 'lightning',
    bounceRemaining: Math.max(1, Math.floor(player.baseBulletCount)),
    hitIds: new Set(),
    homing: false,
    target: null,
    angle: player.angle,
    bossManeuver: null,
    chainSpawned: false,
    // 보스 피격 횟수 = 1 + floor(탄환 수 / 2)
    // 1: 1회, 2~3: 2회, 4~5: 3회, 6~7: 4회, 8~9: 5회, 10: 6회
    bossPierceRemaining: Math.floor(Math.max(1, player.baseBulletCount) / 2),
    bossHitCount: 0
  });
  Sound.playShoot('lightning');
}

function isBulletBlockedByTwinLaser(bullet) {
  if (!bullet) return false;
  for (const e of enemies) {
    if (!e || !e.isElite || e.eliteType !== 4 || e.twinRole !== 'core' || !e.twinLaser || !e.twin) continue;
    const d = distToSegment({ x: e.x, y: e.y }, { x: e.twin.x, y: e.twin.y }, { x: bullet.x, y: bullet.y });
    // 레이저 두께를 넉넉하게 적용해서 모든 플레이어 탄환이 확실히 소멸하도록 한다.
    if (d < bullet.radius + 7 * scale) return true;
  }
  return false;
}

function spawnChainLightning(sourceTarget, directDamage) {
  if (!sourceTarget) return null;

  // 보스의 잡몹 패턴 등으로 짧은 시간에 여러 번 적중하더라도
  // 체인 객체가 무한히 누적되지 않도록 하드 리밋을 둔다.
  if (chainLightning.length >= MAX_ACTIVE_CHAIN_LIGHTNING) return null;

  const maxJumps = Math.max(1, Math.min(8, player.weaponLevel));
  const chain = {
    current: { ...sourceTarget, x: sourceTarget.x, y: sourceTarget.y },
    baseDamage: Math.max(0.01, roundDamage(directDamage)),
    remaining: maxJumps,
    totalHits: 0,
    maxHits: maxJumps,
    visited: new Set([lightningTargetId(sourceTarget)]),
    hitCounts: new Map(),
    // Prime the first jump so its arc is visible immediately after impact.
    timer: 0.07,
    jumpInterval: 0.07,
    segments: [],
    ended: false
  };
  chainLightning.push(chain);
  return chain;
}

function getChainLightningDamage(chain, target) {
  const id = lightningTargetId(target);
  const hitCount = chain.hitCounts.get(id) || 0;
  const multiplier = hitCount === 0 ? 0.15 : 0.10;
  return Math.max(0.01, roundDamage(chain.baseDamage * multiplier));
}

function recordChainLightningHit(chain, target) {
  const id = lightningTargetId(target);
  chain.hitCounts.set(id, (chain.hitCounts.get(id) || 0) + 1);
}

function markLightningChainHit(target) {
  if (!target) return;
  chainHitMarkers.push({
    x: target.x,
    y: target.y,
    radius: Math.max(8 * scale, (target.radius || 10) + 6 * scale),
    life: 0.22,
    maxLife: 0.22
  });
}

function damageLightningTarget(target, damage, damageColor = '#ffffff', source = null) {
  if (!target) return false;
  const dealt = Math.max(0, roundDamage(damage));
  if (dealt <= 0) return false;

  if (target.kind === 'boss' && BossManager.isPhantomShieldedAt(source?.x ?? player.x, source?.y ?? player.y)) return false;

  if (target.kind === 'enemy') {
    const idx = enemies.indexOf(target.entity);
    if (idx < 0 || target.entity.hp <= 0) return false;
    applyEnemyDamage(target.entity, dealt, target.entity.x, target.entity.y, damageColor, false);
    showDamageNumber(dealt, target.entity.x, target.entity.y, damageColor, 100);
    if (target.entity.hp <= 0) handleEnemyDeath(target.entity, idx);
    return true;
  }
  if (target.kind === 'missile') {
    const idx = enemyBullets.indexOf(target.entity);
    if (idx < 0 || !target.entity.isDestructible || target.entity.hp <= 0) return false;
    target.entity.hp = Math.max(0, roundDamage(target.entity.hp - dealt));
    showDamageNumber(dealt, target.entity.x, target.entity.y, damageColor, 100);
    addExplosion(target.entity.x, target.entity.y, '#facc15', 3);
    if (target.entity.hp <= 0) {
      addExplosion(target.entity.x, target.entity.y, '#ff4757', 14);
      Sound.playExplosion(false);
      enemyBullets.splice(idx, 1);
    }
    return true;
  }
  if (target.kind === 'obstacle') {
    const idx = obstacles.indexOf(target.entity);
    if (idx < 0) return false;
    showDamageNumber(dealt, target.entity.x, target.entity.y, damageColor, 100);
    addExplosion(target.entity.x, target.entity.y, '#facc15', 8);
    obstacles.splice(idx, 1);
    return true;
  }
  if (target.kind === 'warship') {
    const bx = target.bossTarget?.x ?? target.entity?.x ?? target.x;
    const by = target.bossTarget?.y ?? target.entity?.y ?? target.y;
    BossManager.takeDamage(dealt, target.bossTarget?.shipPart || target.entity, damageColor, source, 'lightning');
    showDamageNumber(dealt, bx, by, damageColor, 100);
    return true;
  }
  if (target.kind === 'prism') {
    BossManager.damagePrism(target.entity, dealt, damageColor);
    showDamageNumber(dealt, target.x, target.y, damageColor, target.isBoss ? 100 : 1);
    return true;
  }
  if (target.kind === 'boss') {
    BossManager.takeDamage(dealt, null, damageColor, source || { x: player.x, y: player.y }, 'lightning');
    showDamageNumber(dealt, target.x, target.y, damageColor, target.isBoss ? 100 : 1);
    return true;
  }
  return false;
}

function getLightningProjectileHitTargetAt(x, y, radius) {
  for (const e of enemies) {
    if (!e || e.hp <= 0 || e.isBossEntity || e.isShipUnbreakableDebris) continue;
    if (Math.hypot(e.x - x, e.y - y) < e.radius + radius) {
      return { kind: 'enemy', entity: e, x: e.x, y: e.y, radius: e.radius, isElite: !!e.isElite };
    }
  }

  for (let j = enemyBullets.length - 1; j >= 0; j--) {
    const eb = enemyBullets[j];
    if (!eb || !eb.isDestructible || eb.hp <= 0) continue;
    if (Math.hypot(eb.x - x, eb.y - y) < eb.radius + radius) {
      return { kind: 'missile', entity: eb, x: eb.x, y: eb.y, radius: eb.radius, isMissile: true };
    }
  }

  // 운석 등의 방해물은 파괴하지 않되, 번개 칼날의 진행을 막는 충돌체로 취급한다.
  // 따라서 칼날이 운석을 통과하거나 반대편에서 다시 적을 맞히는 일이 없도록 한다.
  for (let j = obstacles.length - 1; j >= 0; j--) {
    const obs = obstacles[j];
    if (!obs) continue;
    if (Math.hypot(obs.x - x, obs.y - y) < obs.radius + radius) {
      return { kind: 'obstacleBlock', entity: obs, x: obs.x, y: obs.y, radius: obs.radius };
    }
  }

  if (BossManager.activeBoss) {
    if (BossManager.bossType === 'warship') {
      const target = BossManager.getWarshipCombatPartAt(x, y, radius);
      if (target) {
        return {
          kind: 'warship',
          entity: target,
          bossTarget: target,
          x: target.x,
          y: target.y,
          radius: target.radius,
          isBoss: true
        };
      }
    } else if (BossManager.bossType === 'laser') {
      const prism = BossManager.findPrismHit(x, y, radius);
      if (prism) {
        return { kind: 'prism', entity: prism, x: prism.x, y: prism.y, radius: prism.r, isBoss: true };
      }
      const b = BossManager.activeBoss;
      if (b && Math.hypot(b.x - x, b.y - y) < b.radius + radius) {
        return { kind: 'boss', entity: b, x: b.x, y: b.y, radius: b.radius, isBoss: true };
      }
    } else {
      const b = BossManager.activeBoss;
      if (b && Math.hypot(b.x - x, b.y - y) < b.radius + radius) {
        return { kind: 'boss', entity: b, x: b.x, y: b.y, radius: b.radius, isBoss: true };
      }
    }
  }

  return null;
}

function isLightningBossTargetAlive(target) {
  if (!target || !target.isBoss || !BossManager.activeBoss) return false;
  if (target.kind === 'prism') return !!(target.entity && target.entity.alive && BossManager.bossType === 'laser');
  if (target.kind === 'warship') return !!(target.entity && target.entity.alive && BossManager.bossType === 'warship');
  if (target.kind === 'boss') return !!(BossManager.activeBoss && BossManager.activeBoss.hp > 0);
  return !!BossManager.activeBoss;
}

function startLightningBossManeuver(bullet, target, speed) {
  if (!bullet || !target || !target.isBoss || !isLightningBossTargetAlive(target)) return false;

  const dx = target.x - bullet.x;
  const dy = target.y - bullet.y;
  const distanceToTarget = Math.hypot(dx, dy);

  // 첫 관통에서는 보스까지의 방향을 사용하고, 이미 한 번 복귀한 뒤
  // 같은 보스를 다시 관통할 때는 현재 탄환의 진행 방향을 사용한다.
  // 복귀 직후에는 bullet.x/y가 보스 중심과 같기 때문에 단순히 target-bullet
  // 방향을 계산하면 (0,0)이 되어 후속 관통 거리가 0이 되는 문제가 있다.
  let dirX;
  let dirY;
  if (distanceToTarget > 0.001) {
    dirX = dx / distanceToTarget;
    dirY = dy / distanceToTarget;
  } else {
    const currentAngle = Number.isFinite(bullet.angle) ? bullet.angle : Math.atan2(bullet.vy || 0, bullet.vx || 1);
    dirX = Math.cos(currentAngle);
    dirY = Math.sin(currentAngle);
  }

  // 모든 보스(레이저 프리즘/본체, UFO, 건담, 전함 파츠)에 동일한 관통-복귀 연출을 적용한다.
  // 전진 거리는 현재 3배 기준을 유지한다.
  const passDistance = Math.max(210 * scale, (target.radius || 30) * 4.05);
  bullet.homing = false;
  bullet.target = target;
  bullet.bossManeuver = {
    phase: 'pass',
    target,
    passX: target.x + dirX * passDistance,
    passY: target.y + dirY * passDistance,
    returnX: target.x,
    returnY: target.y,
    returnHitDone: false
  };
  bullet.vx = dirX * speed;
  bullet.vy = dirY * speed;
  bullet.angle = Math.atan2(dirY, dirX);
  return true;
}

function spawnBossSingleHitChain(target) {
  // 보스에 대해서는 일반 체인 전파 시스템을 사용하지 않는다.
  // 한 번의 보스 타격마다 정확히 1회, 공격력의 0.3배만 추가하고 즉시 종료한다.
  if (!target || !target.isBoss || !isLightningBossTargetAlive(target)) return false;

  const chainDamage = Math.max(0.01, roundDamage(player.baseDamage * 0.3));
  const beforeBoss = BossManager.activeBoss;

  // 시각 효과는 한 번의 체인 세그먼트로만 남기고, 실제 피해는 단 한 번만 준다.
  if (!damageLightningTarget(target, chainDamage, '#facc15')) return false;
  markLightningChainHit(target);
  chainLightning.push({
    singleBossStrike: true,
    target,
    life: 0.14,
    segments: [{ x1: target.x, y1: target.y, x2: target.x, y2: target.y, life: 0.14 }]
  });

  // 체인 피해로 보스가 사망한 경우에도 추가 처리를 절대 하지 않는다.
  if (!BossManager.activeBoss || BossManager.activeBoss !== beforeBoss || !isLightningBossTargetAlive(target)) return true;
  return true;
}

function handleLightningBossReturnHit(bullet, target) {
  if (!bullet || !target || !target.isBoss || bullet.bossManeuver?.returnHitDone) return false;
  if (!isLightningBossTargetAlive(target)) return false;
  const damage = getLightningBladeDamage();
  const beforeBoss = BossManager.activeBoss;
  if (!damageLightningTarget(target, damage, '#ffffff', { x: bullet.x, y: bullet.y })) return false;

  bullet.bossManeuver.returnHitDone = true;
  addExplosion(target.x, target.y, '#facc15', 3);

  // 복귀 타격에서도 체인 라이트닝은 정확히 1회만 발생하며,
  // 해당 체인은 보스에게 0.3배의 공격력 피해를 주고 즉시 종료한다.
  spawnBossSingleHitChain(target);

  // 복귀 타격으로 보스가 사망했거나 보스 객체가 교체되었다면
  // 이후에는 절대로 죽은 보스를 향한 추가 기믹을 생성하지 않는다.
  if (!BossManager.activeBoss || BossManager.activeBoss !== beforeBoss || !isLightningBossTargetAlive(target)) return true;
  return true;
}

function blockLightningBulletOnObstacle(bullet) {
  if (!bullet) return false;
  const hit = getLightningProjectileHitTargetAt(bullet.x, bullet.y, bullet.radius);
  if (!hit || hit.kind !== 'obstacleBlock') return false;
  addExplosion(hit.x, hit.y, '#95a5a6', 5);
  return true;
}

function handleLightningProjectileHit(bullet, target) {
  const id = lightningTargetId(target);
  if (id == null || bullet.hitIds.has(id)) return false;

  // 전방 보호막은 직격과 그 뒤에 이어질 번개 연쇄까지 시작 자체를 소멸시킨다.
  if (target.kind === 'boss' && BossManager.isPhantomShieldedAt(bullet.x, bullet.y)) return false;

  const damage = getLightningBladeDamage();
  const beforeBoss = target.isBoss ? BossManager.activeBoss : null;
  if (!damageLightningTarget(target, damage, '#ffffff')) return false;
  bullet.hitIds.add(id);

  addExplosion(target.x, target.y, '#facc15', 3);

  // 직접 타격으로 보스/보스 파츠가 죽은 경우에는
  // 더 이상 죽은 대상을 향한 체인/관통 연출을 생성하지 않는다.
  const targetStillAlive = !target.isBoss || (BossManager.activeBoss === beforeBoss && isLightningBossTargetAlive(target));
  if (!targetStillAlive) return false;

  bullet.bounceRemaining = Math.max(0, bullet.bounceRemaining - 1);

  if (target.isBoss) {
    // 보스에 적중하면 직격 + 보스 전용 단일 체인 1회를 적용한다.
    // 보스용 체인은 전이하지 않고 공격력의 0.3배만 주고 즉시 끝난다.
    spawnBossSingleHitChain(target);
    bullet.bossHitCount = 1;

    // 탄환 수 2개당 1회씩 추가 관통-복귀 타격.
    if (bullet.bossPierceRemaining > 0) {
      bullet.bossPierceRemaining -= 1;
      const speed = getLightningProjectileSpeed();
      startLightningBossManeuver(bullet, target, speed);
      return true;
    }

    // 추가 관통 횟수가 없으면 첫 타격으로 즉시 탄환 종료.
    return false;
  }

  // 일반 적/엘리트에 적중할 때는 이전 규칙대로 체인 라이트닝을 생성한다.
  // 이 호출이 1.7.18에서 빠져 잡몹 대상 체인 라이트닝이 전혀 발생하지 않았다.
  // 한 번의 직접 적중마다 체인은 최대 1개만 생성된다.
  spawnChainLightning(target, damage);

  if (bullet.bounceRemaining > 0 && steerLightningProjectileToNextTarget(bullet)) {
    // 다음 적을 향해 즉시 방향을 전환한다.
    return true;
  }
  return false;
}

function updateLightningChain(dt) {
  // 한 프레임에서 체인 하나가 처리할 수 있는 전이는 정확히 1회로 제한한다.
  // 이렇게 하면 보스 패턴 전환 직후 여러 체인이 겹쳐도 한 프레임 폭주를 막을 수 있다.
  const MAX_CHAIN_STEPS_PER_FRAME = 24;
  let processedThisFrame = 0;

  for (let i = chainLightning.length - 1; i >= 0; i--) {
    const chain = chainLightning[i];

    if (chain.singleBossStrike) {
      for (let j = chain.segments.length - 1; j >= 0; j--) {
        chain.segments[j].life -= dt;
        if (chain.segments[j].life <= 0) chain.segments.splice(j, 1);
      }
      if (chain.segments.length === 0) chainLightning.splice(i, 1);
      continue;
    }

    // 안전장치: 어떤 이유로든 체인 1개가 정해진 최대 타격 수를
    // 넘어가며 누적되지 않도록 강제로 종료한다.
    if (chain.totalHits >= chain.maxHits || chain.remaining <= 0) {
      chainLightning.splice(i, 1);
      continue;
    }

    if (processedThisFrame >= MAX_CHAIN_STEPS_PER_FRAME) continue;

    chain.timer += dt;
    if (chain.timer < chain.jumpInterval) continue;
    chain.timer -= chain.jumpInterval;
    processedThisFrame++;

    const current = chain.current;
    if (!current) {
      chainLightning.splice(i, 1);
      continue;
    }

    // 보스 대상은 한 번의 update에서 여러 번 연속 타격하지 않고,
    // 체인 간격마다 한 번씩만 타격한다.
    // 같은 체인에서 재피격되면 getChainLightningDamage()가 0.10배를 적용한다.
    if (current.isBoss) {
      if (!isLightningBossTargetAlive(current)) {
        chainLightning.splice(i, 1);
        continue;
      }

      const beforeBoss = BossManager.activeBoss;
      const dmg = getChainLightningDamage(chain, current);
      if (!damageLightningTarget(current, dmg, '#facc15')) {
        chainLightning.splice(i, 1);
        continue;
      }

      recordChainLightningHit(chain, current);
      markLightningChainHit(current);
      chain.totalHits++;
      chain.remaining--;
      chain.segments.push({ x1: current.x, y1: current.y, x2: current.x, y2: current.y, life: 0.14 });

      // 보스가 이번 체인 피해로 사망했거나 전투 대상이 교체되면
      // 죽은 보스를 계속 참조하지 않고 즉시 해당 체인을 종료한다.
      if (!BossManager.activeBoss || BossManager.activeBoss !== beforeBoss || !isLightningBossTargetAlive(current)) {
        chainLightning.splice(i, 1);
      }
      continue;
    }

    const candidates = getLightningBounceTargets(current.x, current.y, chain.visited);
    const target = candidates[0] || null;
    if (!target) {
      chainLightning.splice(i, 1);
      continue;
    }

    const segmentLife = chain.totalHits === 0 ? 0.24 : 0.14;
    chain.segments.push({ x1: current.x, y1: current.y, x2: target.x, y2: target.y, life: segmentLife, maxLife: segmentLife });
    const targetDamage = getChainLightningDamage(chain, target);
    if (!damageLightningTarget(target, targetDamage, '#facc15')) {
      chainLightning.splice(i, 1);
      continue;
    }

    recordChainLightningHit(chain, target);
    markLightningChainHit(target);
    chain.visited.add(lightningTargetId(target));
    chain.current = { ...target, x: target.x, y: target.y };
    chain.remaining--;
    chain.totalHits++;

    // 방금 전이된 대상이 보스이고, 그 피해로 보스가 죽었다면
    // 다음 틱에 죽은 보스를 다시 처리하지 않도록 즉시 종료한다.
    if (target.isBoss && !isLightningBossTargetAlive(target)) {
      chainLightning.splice(i, 1);
    }
  }

  for (let i = chainLightning.length - 1; i >= 0; i--) {
    const c = chainLightning[i];
    for (let j = c.segments.length - 1; j >= 0; j--) {
      c.segments[j].life -= dt;
      if (c.segments[j].life <= 0) c.segments.splice(j, 1);
    }
    if (c.totalHits >= c.maxHits || (c.remaining <= 0 && c.segments.length === 0)) chainLightning.splice(i, 1);
  }

  for (let i = chainHitMarkers.length - 1; i >= 0; i--) {
    chainHitMarkers[i].life -= dt;
    if (chainHitMarkers[i].life <= 0) chainHitMarkers.splice(i, 1);
  }
}

function update(dt) {
  if (gameState !== 'playing' && gameState !== 'ending') return;
  // [1.6 수정] 관리자 패널 혹은 일시정지 상태일 때 전체 로직 일시 중단
  if (adminOpen || isPaused) return;

  if (BossRush.update(dt)) return;

  const isBossFight = !!BossManager.activeBoss || BossRush.active;

  if (gameState === 'playing') {
    weaponAnimTime += dt;
    updateFlameEffect(dt);
    updateLightningChain(dt);
    let moveX = 0, moveY = 0;
    if (keys.w || keys.ArrowUp) moveY -= 1;
    if (keys.s || keys.ArrowDown) moveY += 1;
    if (keys.a || keys.ArrowLeft) moveX -= 1;
    if (keys.d || keys.ArrowRight) moveX += 1;

    if (moveX !== 0 || moveY !== 0) {
      const len = Math.hypot(moveX, moveY);
      player.x = Math.max(player.radius, Math.min(width - player.radius, player.x + (moveX / len) * player.speed * dt));
      player.y = Math.max(player.radius, Math.min(height - player.radius, player.y + (moveY / len) * player.speed * dt));
      player.targetX = player.x;
      player.targetY = player.y;
    } else if (joystick.active) {
      const spd = player.speed * joystick.strength * dt;
      player.x = Math.max(player.radius, Math.min(width - player.radius, player.x + joystick.dirX * spd));
      player.y = Math.max(player.radius, Math.min(height - player.radius, player.y + joystick.dirY * spd));
      player.targetX = player.x;
      player.targetY = player.y;
    } else {
      const toTargetX = player.targetX - player.x;
      const toTargetY = player.targetY - player.y;
      const dist = Math.hypot(toTargetX, toTargetY);
      if (dist > 0.5) {
        const maxMoveStep = player.speed * 1.3 * dt;
        if (dist <= maxMoveStep) {
          player.x = player.targetX;
          player.y = player.targetY;
        } else {
          player.x += (toTargetX / dist) * maxMoveStep;
          player.y += (toTargetY / dist) * maxMoveStep;
        }
      }
    }

    // BREAKER의 충격파는 좌표를 순간 변경하지 않고 관성이 남는 속도 벡터를 부여한다.
    // 이동 입력으로 밀림을 상쇄할 수 있으며, 감속하면서 자연스럽게 정지한다.
    if (Math.abs(player.knockbackVx || 0) > 0.5 || Math.abs(player.knockbackVy || 0) > 0.5) {
      const knockX = (player.knockbackVx || 0) * dt;
      const knockY = (player.knockbackVy || 0) * dt;
      const oldX = player.x;
      const oldY = player.y;
      player.x = Math.max(player.radius, Math.min(width - player.radius, player.x + knockX));
      player.y = Math.max(player.radius, Math.min(height - player.radius, player.y + knockY));
      player.targetX = Math.max(player.radius, Math.min(width - player.radius, player.targetX + (player.x - oldX)));
      player.targetY = Math.max(player.radius, Math.min(height - player.radius, player.targetY + (player.y - oldY)));
      const damping = Math.exp(-4.2 * dt);
      player.knockbackVx *= damping;
      player.knockbackVy *= damping;
      if (player.x <= player.radius || player.x >= width - player.radius) player.knockbackVx = 0;
      if (player.y <= player.radius || player.y >= height - player.radius) player.knockbackVy = 0;
    } else {
      player.knockbackVx = 0;
      player.knockbackVy = 0;
    }

    if (!isBossFight) {
      gameTime += dt;
      secScoreTimer += dt;
      if (secScoreTimer >= 1) {
        score += 10;
        secScoreTimer = 0;
      }

      const newPhase = calculatePhase(gameTime);
      if (newPhase !== currentPhase) {
        currentPhase = newPhase;
        Sound.playPhaseAlert();
        showFloatingText(`⚠️ PHASE ${currentPhase} 진입!`, width / 2, height * 0.28, '#ff4757');
      }

      const mins = String(Math.floor(gameTime / 60)).padStart(2, '0');
      const secs = String(Math.floor(gameTime % 60)).padStart(2, '0');
      timeDisplay.textContent = `${mins}:${secs}`;
      scoreDisplay.textContent = score;

      if (gameMode === 'normal') {
        if (gameTime >= 300 && !miniBossSpawned) {
          miniBossSpawned = true;
          BossManager.spawnMiniBoss();
        }
      } else if (gameMode === 'hard') {
        if (gameTime >= 300 && !miniBossSpawned) {
          miniBossSpawned = true;
          BossManager.spawnFromTier('mini');
        }
        if (gameTime >= 480 && !gundamBossSpawned) {
          gundamBossSpawned = true;
          BossManager.spawnFromTier('gundam');
        }
        if (gameTime >= 720 && !finalBossSpawned) {
          finalBossSpawned = true;
          BossManager.spawnFromTier('final');
        }
      } else if (gameMode === 'infinite') {
        if (gameTime - lastInfiniteBossTime >= 300) {
          lastInfiniteBossTime = gameTime;
          const cycle = Math.floor(gameTime / 300);
          if (cycle % 2 === 1) {
            BossManager.spawnMiniBoss();
          } else {
            const finalTypes = ['final', 'phantom', 'arsenal', 'warship', 'chronos'];
            BossManager.spawnBossByType(finalTypes[Math.floor(Math.random() * finalTypes.length)]);
          }
        }
      }

      checkEliteSpawn(dt);

      enemyTimer += dt;
      obsTimer += dt;

      const p10 = getPhase10Ramp(gameTime);
      const spawnInterval = Math.max(0.22, 0.75 - (currentPhase - 1) * 0.04 - p10 * 0.05);
      if (enemyTimer >= spawnInterval) {
        spawnEnemy();
        if (currentPhase >= 5 && Math.random() < 0.3) spawnEnemy();
        if (currentPhase >= 8 && Math.random() < 0.4) spawnEnemy();
        enemyTimer = 0;
      }

      const obsInterval = Math.max(2.8, 5.2 - (currentPhase - 1) * 0.22 - p10 * 0.3);
      if (obsTimer >= obsInterval) {
        spawnObstacle();
        obsTimer = 0;
      }
    }

    if (gameMode === 'hard') {
      advanceHardItemTimer(dt, isBossFight);
    } else if (gameMode !== 'bossrush') {
      itemTimer += dt * (isBossFight ? 0.2 : 1.0);
      const currentItemInterval = getItemInterval();
      if (itemTimer >= currentItemInterval) {
        spawnItem();
        itemTimer = 0;
      }
    }
  }

  BossManager.update(dt);
  if (gameState !== 'playing' && gameState !== 'ending') return;
  updateIgnition(dt);

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.blackHoleSlowFactor = 1;

    if (e.isBossEntity) {
      if (e.isShipUnbreakableDebris) {
        e.x += e.vx || 0; e.y += e.vy || 0;
        e.rotation = (e.rotation || 0) + (e.rotSpeed || 0);
      }
      if (e.x < -150 * scale || e.x > width + 150 * scale || e.y < -150 * scale || e.y > height + 150 * scale) {
        enemies.splice(i, 1);
      }
      continue;
    }

    // 팬텀의 포탑 요새: 이동하지 않는 별도 파괴 목표이며 유도탄은 enemyBullets를
    // 사용하므로 팬텀 포탈의 보스 탄환 재배치 대상이 되지 않는다.
    if (e.isPhantomFortress) {
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        e.shootTimer = 1.55 + Math.random() * 0.55;
        const missileHp = Math.max(1, Math.round(e.maxHp * 0.025));
        enemyBullets.push({
          x: e.x, y: e.y, vx: 0, vy: 0,
          radius: 8 * scale,
          hp: missileHp, maxHp: missileHp,
          isDestructible: true,
          isHoming: true,
          isPhantomFortressMissile: true,
          damage: getEliteDamage(),
          color: '#fb7185'
        });
        Sound.playEnemyShoot();
      }
      if (player.invincibleTimer <= 0 && Math.hypot(player.x - e.x, player.y - e.y) < player.radius + e.radius) {
        takeDamage(1);
      }
      continue;
    }

    if (e.isArsenalLineUnit) {
      if (e.arsenalMoveMode === 'vertical') {
        e.x = e.arsenalAnchorX;
        e.y = e.arsenalAnchorY + Math.sin(weaponAnimTime * 1.65 + (e.arsenalMovePhase || 0)) * e.arsenalMoveAmplitude;
      } else if (e.arsenalMoveMode === 'verticalSweep') {
        e.x = e.arsenalAnchorX;
        e.y += e.vy || 0;
        const minY = e.radius;
        const maxY = height - e.radius;
        if (e.y <= minY || e.y >= maxY) {
          e.y = Math.max(minY, Math.min(maxY, e.y));
          e.vy *= -1;
        }
      } else {
        e.x += e.vx || 0;
        const minX = e.radius;
        const maxX = width - e.radius;
        if (e.x <= minX || e.x >= maxX) {
          e.x = Math.max(minX, Math.min(maxX, e.x));
          e.vx *= -1;
        }
      }

      e.shootTimer = (e.shootTimer || 0) - dt;
      if (!e.arsenalNoFire && e.shootTimer <= 0) {
        e.shootTimer = e.arsenalShootInterval || 1.25;
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        BossManager.bossBullets.push({
          x: e.x, y: e.y,
          vx: Math.cos(angle) * 3.15 * scale,
          vy: Math.sin(angle) * 3.15 * scale,
          radius: 3.5 * scale,
          damage: 1,
          color: BossManager.ARSENAL_WEAPON_META.fabricator.color,
          isArsenal: true
        });
        Sound.playEnemyShoot();
      }
      if (player.invincibleTimer <= 0 && Math.hypot(player.x - e.x, player.y - e.y) < player.radius + e.radius) {
        takeDamage(1);
      }
      continue;
    }

    if (e.isElite && e.eliteType === 4) {
      if (e.enraged) {
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        const step = player.speed * 0.8 * dt;
        e.x += Math.cos(angle) * step;
        e.y += Math.sin(angle) * step;
      } else if (e.twinRole === 'core') {
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(angle) * e.speed;
        e.y += Math.sin(angle) * e.speed;

        e.twinTimer += dt;
        if (!e.twinLaser && e.twinTimer >= 3.0) {
          e.twinTimer = 0;
          e.twinLaser = true;
          Sound.playLaserBeam();
        } else if (e.twinLaser && e.twinTimer >= 3.0) {
          e.twinTimer = 0;
          e.twinLaser = false;
        }

        if (e.twinLaser && e.twin && player.invincibleTimer <= 0) {
          const d = distToSegment({ x: e.x, y: e.y }, { x: e.twin.x, y: e.twin.y }, { x: player.x, y: player.y });
          if (d < player.radius + 5 * scale) takeDamage(getEliteDamage());
        }
      } else if (e.twinRole === 'satellite' && e.twin) {
        e.orbitAngle += dt * 1.5;
        e.x = e.twin.x + Math.cos(e.orbitAngle) * e.orbitRadius;
        e.y = e.twin.y + Math.sin(e.orbitAngle) * e.orbitRadius;
      }
    } else if (e.isElite && e.eliteType === 3) {
      if (e.dashState === 'idle') {
        e.dashTimer -= dt;
        let currentSpeed = e.speed;
        if (e.slowTimer > 0) {
          e.slowTimer -= dt;
          currentSpeed *= 0.85;
        }
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(angle) * currentSpeed;
        e.y += Math.sin(angle) * currentSpeed;

        const distToPlayer = Math.hypot(player.x - e.x, player.y - e.y);
        const isInsideScreen = (e.x >= e.radius && e.x <= width - e.radius && e.y >= e.radius && e.y <= height - e.radius);
        const canReachPlayer = distToPlayer <= 320 * scale;

        if (e.dashTimer <= 0 && isInsideScreen && canReachPlayer) {
          e.dashState = 'windup';
          e.dashTimer = 0.3;
          e.dashAngle = Math.atan2(player.y - e.y, player.x - e.x);
        }
      } else if (e.dashState === 'windup') {
        e.dashTimer -= dt;
        if (e.dashTimer <= 0) {
          e.dashState = 'dashing';
          e.dashTimer = 1.2;
          Sound.playShoot('omni');
        }
      } else if (e.dashState === 'dashing') {
        e.dashTimer -= dt;
        const dashSpeed = 4.4 * scale * getEliteSpeedMult();
        e.x += Math.cos(e.dashAngle) * dashSpeed;
        e.y += Math.sin(e.dashAngle) * dashSpeed;

        for (let k = obstacles.length - 1; k >= 0; k--) {
          const obs = obstacles[k];
          if (Math.hypot(obs.x - e.x, obs.y - e.y) < e.radius + obs.radius) {
            addExplosion(obs.x, obs.y, '#95a5a6', 15);
            Sound.playExplosion(false);
            obstacles.splice(k, 1);
          }
        }

        if (e.dashTimer <= 0) {
          e.dashState = 'idle';
          e.dashTimer = 2.0;
        }
      }
    } else {
      const angle = Math.atan2(player.y - e.y, player.x - e.x);
      const moveSpeed = e.speed * (e.blackHoleSlowFactor ?? 1);
      e.x += Math.cos(angle) * moveSpeed;
      e.y += Math.sin(angle) * moveSpeed;
    }

    if (e.isElite && e.eliteType === 2) {
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        e.shootTimer = 2.8;
        const missileHp = Math.max(1, Math.round(e.maxHp * 0.1));
        enemyBullets.push({
          x: e.x, y: e.y,
          vx: 0, vy: 0,
          radius: 8.5 * scale,
          hp: missileHp,
          maxHp: missileHp,
          isDestructible: true,
          isHoming: true,
          damage: getEliteDamage()
        });
        Sound.playEnemyShoot();
      }
    }

    if (player.invincibleTimer <= 0 && Math.hypot(player.x - e.x, player.y - e.y) < player.radius + e.radius) {
      takeDamage(e.isElite ? getEliteDamage() : 1);
      if (!e.isElite) {
        enemies.splice(i, 1);
      }
    }
  }

  if (player.invincibleTimer > 0) player.invincibleTimer -= dt;
  if (player.superInvincibleTimer > 0) player.superInvincibleTimer -= dt;

  if (gameState === 'playing') {
    let nearestTarget = null;
    let minDist = Infinity;

    for (let e of enemies) {
      if (e.isShipUnbreakableDebris) continue;
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < minDist) { minDist = d; nearestTarget = e; }
    }
    for (let eb of enemyBullets) {
      if (eb.isDestructible) {
        const d = Math.hypot(eb.x - player.x, eb.y - player.y);
        if (d < minDist) { minDist = d; nearestTarget = eb; }
      }
    }
    for (const target of BossManager.getPlayerTargetables()) {
      const d = Math.hypot(target.x - player.x, target.y - player.y);
      if (d < minDist) { minDist = d; nearestTarget = target; }
    }

    let targetAngle = -Math.PI / 2;
    if (nearestTarget) {
      targetAngle = Math.atan2(nearestTarget.y - player.y, nearestTarget.x - player.x);
    }

    let diff = targetAngle - player.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    player.angle += diff * 0.25;

    player.shootCooldown -= dt;
    const baseCooldown = Math.max(0.10, 0.44 * Math.pow(0.86, player.speedLevel - 1));

    if (player.shootCooldown <= 0) {
      if (player.weaponType === 'default') {
        Sound.playShoot(player.weaponType);
        firePlayerBullets(player.baseBulletCount, player.baseDamage, '#38bdf8', 3 * scale);
        player.shootCooldown = baseCooldown;

      } else if (player.weaponType === 'omni') {
        Sound.playShoot('omni');
        const omniCountMults = [1.0, 2.0, 2.3, 2.8, 3.0, 3.4, 3.8, 4.0];
        const omniDmgMults = [1.0, 1.0, 0.9, 0.9, 0.8, 0.8, 0.7, 0.6];
        // 방사형은 탄환 수 10에서 Lv.8 기준 40발이 되지 않도록 별도 안전 상한을 둔다.
        const finalCount = Math.min(30, Math.max(1, Math.ceil(player.baseBulletCount * omniCountMults[player.weaponLevel - 1])));
        const finalDmg = Math.max(1, roundDamage(player.baseDamage * omniDmgMults[player.weaponLevel - 1]));

        const step = (Math.PI * 2) / finalCount;
        for (let i = 0; i < finalCount; i++) {
          const a = player.angle + i * step;
          bullets.push({
            x: player.x, y: player.y,
            vx: Math.cos(a) * 7.5 * scale, vy: Math.sin(a) * 7.5 * scale,
            radius: 5.2 * scale, color: OMNI_BULLET_COLOR, damage: finalDmg, weaponKind: 'omni'
          });
        }
        player.shootCooldown = baseCooldown / 0.75;

      } else if (player.weaponType === 'laser') {
        Sound.playShoot('laser');
        const finalDmg = Math.max(0.01, roundDamage(player.baseDamage * 1.2));
        const finalCount = Math.max(1, Math.ceil(player.baseBulletCount * 0.5));
        firePlayerBullets(finalCount, finalDmg, '#ff4757', 3 * scale);
        player.shootCooldown = baseCooldown / 0.5;

      } else if (player.weaponType === 'drone') {
        Sound.playShoot('drone');
        const finalDmg = Math.max(1, roundDamage(player.baseDamage * 0.8));
        const finalCount = Math.max(1, Math.ceil(player.baseBulletCount * 0.5));
        firePlayerBullets(finalCount, finalDmg, WEAPON_META.drone.color, 3 * scale);
        player.shootCooldown = baseCooldown / 1.0;

      } else if (player.weaponType === 'pulse') {
        player.shootCooldown = baseCooldown;
      } else if (player.weaponType === 'blackhole') {
        // 블랙홀 무장도 기본 탄환을 계속 발사하고, 별도의 주기로 블랙홀을 추가 발사한다.
        Sound.playShoot('blackhole');
        firePlayerBullets(player.baseBulletCount, player.baseDamage, WEAPON_META.blackhole.color, 3 * scale);
        player.shootCooldown = baseCooldown / 1.0;
      } else if (player.weaponType === 'flame') {
        // 화염은 별도의 지속 부채꼴 장판형 공격이므로 기본 탄환을 만들지 않는다.
        player.shootCooldown = baseCooldown;
      } else if (player.weaponType === 'lightning') {
        // 번개 칼날의 연사 배율은 0.5배를 사용한다.
        fireLightningBlade();
        player.shootCooldown = baseCooldown / 0.5;
      }
    }

    if (player.weaponType === 'blackhole') {
      blackHoleShootTimer += dt;
      if (blackHoleShootTimer >= getBlackHoleInterval()) {
        fireBlackHole();
      }
    }

    if (player.weaponType === 'drone') {
      const droneCount = player.weaponLevel;
      const droneDmg = Math.max(1, roundDamage(player.baseDamage * 0.8));
      const droneCooldown = (baseCooldown / 1.0) / 0.5;

      droneShootTimer += dt;
      if (droneShootTimer >= droneCooldown) {
        droneShootTimer = 0;
        Sound.playShoot('drone');
        for (let i = 0; i < droneCount; i++) {
          const dAngle = weaponAnimTime * 2.5 + (i * Math.PI * 2 / droneCount);
          const dx = player.x + Math.cos(dAngle) * 26 * scale;
          const dy = player.y + Math.sin(dAngle) * 26 * scale;
          bullets.push({
            x: dx, y: dy,
            vx: Math.cos(dAngle) * 3.5 * scale, vy: Math.sin(dAngle) * 3.5 * scale,
            radius: 4 * scale, color: WEAPON_META.drone.color, damage: droneDmg, isDroneBullet: true, weaponKind: 'drone'
          });
        }
      }
    }

    if (player.weaponType === 'flame') {
      const flameHalfAngle = (10 + (player.weaponLevel - 1) * (65 / 7)) * (Math.PI / 180);
      const flameRange = getFlameRange();
      const level = Math.max(1, Math.min(8, player.weaponLevel));
      const bulletConversion = 0.125 + (level - 1) * (0.875 / 7);
      const speedConversion = 0.1 + (level - 1) * (0.5 / 7);
      const convertedAttack = player.baseDamage
        + player.baseBulletCount * bulletConversion
        + player.speedLevel * speedConversion;
      const flameBaseDamage = Math.max(0.5, roundDamage(convertedAttack * 0.1));

      flameTickTimer += dt;
      if (flameTickTimer >= 0.08) {
        const ticks = Math.floor(flameTickTimer / 0.08);
        flameTickTimer -= ticks * 0.08;

        const applyToPoint = (x, y, radius, onHit) => {
          const dx = x - player.x;
          const dy = y - player.y;
          const dist = Math.hypot(dx, dy);
          if (dist > flameRange + radius || dist < 0.001) return;
          let diff = Math.atan2(dy, dx) - player.angle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          const edgePadding = Math.asin(Math.min(1, radius / Math.max(radius, dist)));
          if (Math.abs(diff) <= flameHalfAngle + edgePadding) onHit();
        };

        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          applyToPoint(e.x, e.y, e.radius, () => {
            for (let n = 0; n < ticks; n++) {
              const ignition = applyFlameIgnition(e, flameBaseDamage, e.x, e.y);
              applyEnemyDamage(e, ignition.damage, e.x, e.y, ignition.isMax ? WEAPON_META.flame.color : '#ffffff');
              addExplosion(e.x, e.y, WEAPON_META.flame.color, 1);
              if (e.hp <= 0) {
                handleEnemyDeath(e, j);
                break;
              }
            }
          });
        }

        // 보스/엘리트가 소환하는 유도탄도 화염 부채꼴의 정상적인 공격 대상이다.
        // 운석(obstacles)은 여전히 파괴 대상이 아니다.
        for (let j = enemyBullets.length - 1; j >= 0; j--) {
          const eb = enemyBullets[j];
          if (!eb || !eb.isDestructible || eb.hp <= 0) continue;
          applyToPoint(eb.x, eb.y, eb.radius || 0, () => {
            for (let n = 0; n < ticks; n++) {
              if (!enemyBullets.includes(eb)) break;
              const missileDamage = Math.max(0.01, roundDamage(flameBaseDamage));
              eb.hp = Math.max(0, roundDamage(eb.hp - missileDamage));
              showDamageNumber(missileDamage, eb.x, eb.y, WEAPON_META.flame.color, 100);
              addExplosion(eb.x, eb.y, WEAPON_META.flame.color, 1);
              if (eb.hp <= 0) {
                addExplosion(eb.x, eb.y, '#ff4757', 12);
                Sound.playExplosion(false);
                enemyBullets.splice(j, 1);
                break;
              }
            }
          });
        }

        if (BossManager.activeBoss) {
          if (BossManager.bossType === 'warship') {
            for (const t of BossManager.getPlayerTargetables().filter(t => t.shipPart)) {
              applyToPoint(t.x, t.y, t.radius || 0, () => {
                for (let n = 0; n < ticks; n++) {
                  const part = t.shipPart;
                  if (!part || !part.alive) break;
                  const ignition = applyFlameIgnition(part, flameBaseDamage, t.x, t.y);
                  BossManager.takeDamage(ignition.damage, part, ignition.isMax ? WEAPON_META.flame.color : '#ffffff', { x: player.x, y: player.y }, 'flame');
                }
              });
            }
          } else if (BossManager.bossType === 'laser') {
            const laserBoss = BossManager.activeBoss;
            for (const pr of BossManager.getVulnerablePrisms()) {
              applyToPoint(pr.x, pr.y, pr.r || 0, () => {
                for (let n = 0; n < ticks; n++) {
                  const ignition = applyFlameIgnition(pr.prism, flameBaseDamage, pr.x, pr.y);
                  BossManager.damagePrism(pr.prism, ignition.damage, ignition.isMax ? WEAPON_META.flame.color : '#ffffff');
                  if (!pr.prism.alive) break;
                }
              });
            }
            // 수정의 피격 가능 여부와 별개로 레이저 보스 본체도 화염 공격 대상이다.
            // 본체가 먼저 파괴되어 수정 처리 도중 상태가 초기화되는 일을 피하려고 마지막에 판정한다.
            if (BossManager.activeBoss === laserBoss) {
              applyToPoint(laserBoss.x, laserBoss.y, laserBoss.radius || 0, () => {
                for (let n = 0; n < ticks; n++) {
                  if (BossManager.activeBoss !== laserBoss) break;
                  const ignition = applyFlameIgnition(laserBoss, flameBaseDamage, laserBoss.x, laserBoss.y);
                  BossManager.takeDamage(ignition.damage, null, ignition.isMax ? WEAPON_META.flame.color : '#ffffff', { x: player.x, y: player.y }, 'flame');
                }
              });
            }
          } else {
            const b = BossManager.activeBoss;
            applyToPoint(b.x, b.y, b.radius || 0, () => {
              if (BossManager.isPhantomShieldedAt(player.x, player.y)) return;
              for (let n = 0; n < ticks; n++) {
                const ignition = applyFlameIgnition(b, flameBaseDamage, b.x, b.y);
                BossManager.takeDamage(ignition.damage, null, ignition.isMax ? WEAPON_META.flame.color : '#ffffff', { x: player.x, y: player.y }, 'flame');
              }
            });
          }
        }
      }
    }

    if (player.weaponType === 'laser') {
      player.laserTimer += dt;
      const laserInterval = Math.max(1.0, 5.0 * Math.pow(0.86, player.speedLevel - 1));
      const totalAngleDeg = (player.weaponLevel >= 8) ? 1080 : (360 + (player.weaponLevel - 1) * 90);
      const totalAngleRad = totalAngleDeg * (Math.PI / 180);
      const laserDuration = 1.2 + (player.weaponLevel - 1) * 0.2;

      if (!player.isLaserFiring) {
        if (player.laserTimer >= laserInterval) {
          player.isLaserFiring = true;
          player.laserTimer = 0;
          player.laserStartAngle = player.angle;
          player.laserAngle = player.angle;
          Sound.playShoot('laser');
        }
      } else {
        const progress = Math.min(1.0, player.laserTimer / laserDuration);
        player.laserAngle = player.laserStartAngle + progress * totalAngleRad;

        checkLaserHit(player.laserAngle, player.weaponLevel, dt);

        if (player.laserTimer >= laserDuration) {
          player.isLaserFiring = false;
          player.laserTimer = 0;
        }
      }
    }

    if (player.weaponType === 'pulse') {
      // 폭발 후 재충전 대기 없이 충전 영역과 틱 피해를 항상 유지한다.
      player.pulseChargeTimer += dt;
      player.pulseTickTimer += dt;

      const chargeDuration = Math.max(1.0, 3.0 * Math.pow(0.86, player.speedLevel - 1));
      const auraRadius = getPulseAuraRadius();
      const auraTickDmg = Math.max(0.5, roundDamage(player.baseDamage * 0.25));

      if (player.pulseTickTimer >= PULSE_AURA_TICK_INTERVAL) {
        player.pulseTickTimer = 0;
        for (let e of enemies) {
          if (Math.hypot(player.x - e.x, player.y - e.y) < auraRadius + e.radius) {
            applyEnemyDamage(e, auraTickDmg);
            showDamageNumber(auraTickDmg, e.x, e.y, '#00d2d3');
            addExplosion(e.x, e.y, '#00d2d3', 1);
            if (e.hp <= 0) handleEnemyDeath(e, enemies.indexOf(e));
          }
        }
        if (BossManager.activeBoss) {
          const b = BossManager.activeBoss;
          if (BossManager.bossType === 'warship') {
            const targets = BossManager.getPlayerTargetables().filter(t => t.shipPart);
            let nearest = null, nearestDist = Infinity;
            for (const t of targets) {
              const d = Math.hypot(player.x - t.x, player.y - t.y);
              if (d < nearestDist) { nearestDist = d; nearest = t; }
            }
            if (nearest && nearestDist < auraRadius + nearest.radius) {
              BossManager.takeDamage(auraTickDmg, nearest.shipPart, '#00d2d3', { x: player.x, y: player.y }, 'pulse');
              showDamageNumber(auraTickDmg, nearest.x, nearest.y, '#00d2d3', 100);
              addExplosion(nearest.x, nearest.y, '#00d2d3', 1);
            }
          } else if (Math.hypot(player.x - b.x, player.y - b.y) < auraRadius + b.radius) {
            if (!BossManager.isPhantomShieldedAt(player.x, player.y)) {
              BossManager.takeDamage(auraTickDmg, null, '#00d2d3', { x: player.x, y: player.y }, 'pulse');
              showDamageNumber(auraTickDmg, b.x, b.y, '#00d2d3', 100);
              addExplosion(b.x, b.y, '#00d2d3', 1);
            }
          }
          for (const pr of BossManager.getVulnerablePrisms()) {
            if (Math.hypot(player.x - pr.x, player.y - pr.y) < auraRadius + pr.r) {
              BossManager.damagePrism(pr.prism, auraTickDmg, '#00d2d3');
              showDamageNumber(auraTickDmg, pr.x, pr.y, '#00d2d3', 100);
            }
          }
        }
        for (let j = enemyBullets.length - 1; j >= 0; j--) {
          const eb = enemyBullets[j];
          if (!eb.isDestructible) continue;
          if (Math.hypot(player.x - eb.x, player.y - eb.y) < auraRadius + eb.radius) {
            eb.hp = Math.max(0, roundDamage(eb.hp - auraTickDmg));
            showDamageNumber(auraTickDmg, eb.x, eb.y, '#00d2d3');
            addExplosion(eb.x, eb.y, '#00d2d3', 1);
            if (eb.hp <= 0) {
              addExplosion(eb.x, eb.y, '#ff4757', 14);
              Sound.playExplosion(false);
              enemyBullets.splice(j, 1);
            }
          }
        }
      }

      if (player.pulseChargeTimer >= chargeDuration) {
        player.pulseChargeTimer = 0;
        player.pulseTickTimer = 0;
        Sound.playExplosion(false);
        showFloatingText("PULSE EXPLOSION!", player.x, player.y - 20 * scale, '#00d2d3');

        const bulletCount = player.weaponLevel;
        const step = (Math.PI * 2) / bulletCount;
        const stormDmg = Math.max(0.01, roundDamage(player.baseDamage * PULSE_DAMAGE_MULTIPLIER));

        for (let i = 0; i < bulletCount; i++) {
          const a = (bulletCount === 1) ? player.angle : (player.angle + i * step);
          bullets.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(a) * 13.0 * scale,
            vy: Math.sin(a) * 13.0 * scale,
            radius: 8.5 * scale,
            color: '#00d2d3',
            damage: stormDmg,
            isPulseStorm: true,
            // 펄스 폭발탄은 진행 방향 기준 좌우 30도 안의 대상에만 약하게 유도된다.
            pulseHoming: true,
            weaponKind: 'pulse',
            hitCooldowns: new Map()
          });
        }
      }
    }
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];

    // 쌍벽둥이 연결 레이저는 일반 탄환뿐 아니라 특수 탄환/무기 탄환까지 모두 차단한다.
    // 특수 무기의 전용 처리보다 먼저 판정해야 빠져나가는 탄환이 없어진다.
    if (isBulletBlockedByTwinLaser(b)) {
      addExplosion(b.x, b.y, '#22d3ee', 3);
      bullets.splice(i, 1);
      continue;
    }

    // CHRONOS의 붕괴 블랙홀은 모든 플레이어 투사체의 무기별 후속 처리보다 먼저 흡수한다.
    // 따라서 번개 체인, 펄스, 화염, 플레이어 블랙홀 같은 secondary effect도 발생하지 않는다.
    if (BossManager.absorbChronosPlayerBullet(b, dt)) {
      bullets.splice(i, 1);
      continue;
    }

    if (b.isLightningBlade) {
      const speed = getLightningProjectileSpeed();

      // 보스 전이 연출: 보스를 관통해 지정 지점까지 갔다가 되돌아오며 적중한다.
      if (b.bossManeuver) {
        const maneuver = b.bossManeuver;
        const target = maneuver.target;
        if (!target || (target.isBoss && !isLightningBossTargetAlive(target))) {
          bullets.splice(i, 1);
          continue;
        }

        if (maneuver.phase === 'pass') {
          const dx = maneuver.passX - b.x;
          const dy = maneuver.passY - b.y;
          const dist = Math.hypot(dx, dy);
          const step = speed;
          if (dist <= step) {
            b.x = maneuver.passX;
            b.y = maneuver.passY;
            maneuver.phase = 'return';
            b.vx = (maneuver.returnX - b.x) / Math.max(0.001, Math.hypot(maneuver.returnX - b.x, maneuver.returnY - b.y)) * speed;
            b.vy = (maneuver.returnY - b.y) / Math.max(0.001, Math.hypot(maneuver.returnX - b.x, maneuver.returnY - b.y)) * speed;
          } else {
            b.x += (dx / dist) * step;
            b.y += (dy / dist) * step;
          }
          if (blockLightningBulletOnObstacle(b)) {
            bullets.splice(i, 1);
            continue;
          }
          b.angle = Math.atan2(b.vy, b.vx);
          continue;
        }

        const rdx = maneuver.returnX - b.x;
        const rdy = maneuver.returnY - b.y;
        const rdist = Math.hypot(rdx, rdy);
        if (rdist <= speed + b.radius + (target.radius || 0) * 0.25) {
          b.x = maneuver.returnX;
          b.y = maneuver.returnY;

          // 복귀 구간에서는 이미 한 번 맞은 보스라도 추가 1회 직격한다.
          // hitIds를 우회하되, 무한 반복은 returnHitDone으로 차단한다.
          if (!maneuver.returnHitDone) {
            handleLightningBossReturnHit(b, target);
          }

          b.bossManeuver = null;
          if (!BossManager.activeBoss || !isLightningBossTargetAlive(target)) {
            bullets.splice(i, 1);
            continue;
          }

          // 남은 관통 횟수가 있으면 같은 보스를 대상으로 다시 관통한다.
          // 각 회차마다 직격 1회 + 단일 체인 1회를 추가한다.
          if (b.bossPierceRemaining > 0) {
            b.bossPierceRemaining -= 1;
            startLightningBossManeuver(b, target, speed);
            continue;
          }

          bullets.splice(i, 1);
          continue;
        }

        b.x += (rdx / rdist) * speed;
        b.y += (rdy / rdist) * speed;
        if (blockLightningBulletOnObstacle(b)) {
          bullets.splice(i, 1);
          continue;
        }
        b.angle = Math.atan2(b.vy, b.vx);
        continue;
      }

      // 일반 전이: 대상에게 부드럽게 선회시키지 않고, 매 프레임 대상 중심을
      // 정확히 향하도록 보정한다. 이렇게 해야 빠른 탄환이 대상을 빙빙 돌며
      // 영원히 적중하지 않는 현상을 방지할 수 있다.
      if (b.homing) {
        const target = b.target;
        const targetId = lightningTargetId(target);
        if (!target || targetId == null || b.hitIds.has(targetId) || !Number.isFinite(target.x) || !Number.isFinite(target.y)) {
          // 현재 대상이 사라졌다면 즉시 다음 전이 대상을 찾는다.
          if (!steerLightningProjectileToNextTarget(b)) {
            bullets.splice(i, 1);
            continue;
          }
        }

        const tx = b.target.x;
        const ty = b.target.y;
        const dx = tx - b.x;
        const dy = ty - b.y;
        const dist = Math.hypot(dx, dy);
        const hitRadius = b.radius + Math.max(0, b.target.radius || 0);

        // 이번 프레임 이동량보다 대상이 가까우면 바로 적중 처리한다.
        if (dist <= hitRadius + speed) {
          b.x = tx;
          b.y = ty;
          const shouldContinue = handleLightningProjectileHit(b, b.target);
          if (!shouldContinue) {
            bullets.splice(i, 1);
          }
          continue;
        }

        const angle = Math.atan2(dy, dx);
        b.vx = Math.cos(angle) * speed;
        b.vy = Math.sin(angle) * speed;
        b.angle = angle;
      }

      b.angle = Math.atan2(b.vy, b.vx);
      b.x += b.vx;
      b.y += b.vy;

      if (b.x < -40 || b.x > width + 40 || b.y < -40 || b.y > height + 40) {
        bullets.splice(i, 1);
        continue;
      }

      const hitTarget = getLightningProjectileHitTargetAt(b.x, b.y, b.radius);
      if (hitTarget && !b.hitIds.has(lightningTargetId(hitTarget))) {
        if (hitTarget.kind === 'obstacleBlock') {
          addExplosion(hitTarget.x, hitTarget.y, '#95a5a6', 5);
          bullets.splice(i, 1);
          continue;
        }
        const shouldContinue = handleLightningProjectileHit(b, hitTarget);
        if (!shouldContinue) {
          bullets.splice(i, 1);
        }
        continue;
      }
      continue;
    }

    if (b.isBlackHole) {
      let hasCoreTarget = false;
      let hasHeavyTarget = false;
      let hasHeavyCoreTarget = false;

      // 발사 직후에는 플레이어가 블랙홀 중심에 있으므로 흡입을 금지한다.
      // 플레이어가 블랙홀의 주변부 범위를 완전히 벗어나면 그 순간부터 흡입을 활성화하고,
      // 이후에는 다시 범위 안으로 들어와도 비활성화하지 않는다.
      if (!b.pullArmed) {
        const playerDistance = Math.hypot(player.x - b.x, player.y - b.y);
        if (playerDistance > b.radius + player.radius) {
          b.pullArmed = true;
        }
      }

      // 일반 적은 주변부에서 중심으로 끌어당긴다.
      if (b.pullArmed) {
        for (const e of enemies) {
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        const dist = Math.hypot(dx, dy);
        if (dist >= b.radius + e.radius) continue;

        // 팬텀 포탑 요새는 블랙홀 피해 대상이지만, 배치된 요새 자체는 흡입/감속되지 않는다.
        if (e.isPhantomFortress) {
          hasHeavyTarget = true;
          continue;
        }

        if (e.isElite || e.isBlackHoleImmune) {
          // 엘리트/고정 병기는 흡인하지 않는다. 중심부 접촉은 주변부보다 더 크게 감속한다.
          if (dist <= b.coreRadius + e.radius) hasHeavyCoreTarget = true;
          else hasHeavyTarget = true;
          continue;
        }

        if (dist <= b.coreRadius + e.radius) {
          hasCoreTarget = true;
          continue;
        }

        // 블랙홀 주변부의 일반 적은 이동 속도를 60% 감소시키면서
        // 중심 방향으로 더 강하게 끌어당긴다.
        e.blackHoleSlowFactor = Math.min(e.blackHoleSlowFactor ?? 1, 0.40);
        if (dist > 0.001) {
          const pullSpeed = 165 * scale;
          const pullStep = Math.min(pullSpeed * dt, dist * 0.42);
          e.x += (dx / dist) * pullStep;
          e.y += (dy / dist) * pullStep;
        }
        }
      }

      // 보스/보스 파츠와 접촉하면 주변부는 절반, 중심부는 20%까지 낮춘다.
      if (BossManager.activeBoss) {
        const bossTargets = BossManager.bossType === 'warship'
          ? BossManager.getPlayerTargetables().filter(t => t.shipPart)
          : BossManager.bossType === 'laser'
            ? BossManager.getVulnerablePrisms()
            : [BossManager.activeBoss];

        for (const target of bossTargets) {
          const targetRadius = target.radius ?? target.r ?? 0;
          const targetDistance = Math.hypot(target.x - b.x, target.y - b.y);
          if (targetDistance < b.radius + targetRadius) {
            if (targetDistance <= b.coreRadius + targetRadius) hasHeavyCoreTarget = true;
            else hasHeavyTarget = true;
            break;
          }
        }
      }

      // 엘리트/보스는 중심부에서 원래 속도의 20%, 주변부에서 50%로 감속한다.
      // 일반 적 중심부 적중은 기존의 78% 감속 규칙을 유지한다.
      const moveMultiplier = hasHeavyCoreTarget ? 0.20 : (hasHeavyTarget ? 0.50 : (hasCoreTarget ? 0.78 : 1.0));
      const moveSpeed = b.baseSpeed * moveMultiplier;
      b.vx = Math.cos(b.angle) * moveSpeed;
      b.vy = Math.sin(b.angle) * moveSpeed;
      b.x += b.vx;
      b.y += b.vy;

      if (b.x < -b.radius * 2 || b.x > width + b.radius * 2 || b.y < -b.radius * 2 || b.y > height + b.radius * 2) {
        bullets.splice(i, 1);
        continue;
      }

      b.tickTimer += dt;
      if (b.tickTimer >= 0.12) {
        const ticks = Math.floor(b.tickTimer / 0.12);
        b.tickTimer -= ticks * 0.12;
        const tickDamage = Math.max(0.5, roundDamage(player.baseDamage * 0.2));

        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          const d = Math.hypot(e.x - b.x, e.y - b.y);
          if (d < b.coreRadius + e.radius) {
            applyEnemyDamage(e, tickDamage * ticks, e.x, e.y, WEAPON_META.blackhole.color);
            addExplosion(e.x, e.y, '#8b5cf6', 1);
            if (e.hp <= 0) handleEnemyDeath(e, j);
          }
        }

        if (BossManager.activeBoss) {
          if (BossManager.bossType === 'warship') {
            const targets = BossManager.getPlayerTargetables().filter(t => t.shipPart);
            for (const t of targets) {
              if (Math.hypot(t.x - b.x, t.y - b.y) < b.coreRadius + t.radius) {
                BossManager.takeDamage(tickDamage * ticks, t, WEAPON_META.blackhole.color, { x: b.x, y: b.y }, 'blackhole');
              }
            }
          } else if (BossManager.bossType === 'laser') {
            for (const pr of BossManager.getVulnerablePrisms()) {
              if (Math.hypot(pr.x - b.x, pr.y - b.y) < b.coreRadius + pr.r) {
                for (let n = 0; n < ticks; n++) BossManager.damagePrism(pr.prism, tickDamage, WEAPON_META.blackhole.color);
              }
            }
          } else if (Math.hypot(BossManager.activeBoss.x - b.x, BossManager.activeBoss.y - b.y) < b.coreRadius + BossManager.activeBoss.radius) {
            if (BossManager.isPhantomShieldedAt(b.x, b.y)) {
              bullets.splice(i, 1);
              continue;
            }
            for (let n = 0; n < ticks; n++) BossManager.takeDamage(tickDamage, null, WEAPON_META.blackhole.color, { x: b.x, y: b.y }, 'blackhole');
          }
        }
      }
      continue;
    }

    if (b.isDroneBullet) {
      let target = null;
      let minD = Infinity;
      const bulletHeading = Math.atan2(b.vy, b.vx);

      const potentialTargets = [...enemies, ...enemyBullets.filter(eb => eb.isDestructible)];
      if (BossManager.activeBoss) potentialTargets.push(BossManager.activeBoss, ...BossManager.getVulnerablePrisms());

      for (let e of potentialTargets) {
        const d = Math.hypot(e.x - b.x, e.y - b.y);
        if (d < minD) {
          const angleToEnemy = Math.atan2(e.y - b.y, e.x - b.x);
          let angleDiff = angleToEnemy - bulletHeading;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

          if (Math.abs(angleDiff) <= Math.PI / 3) {
            minD = d;
            target = e;
          }
        }
      }

      if (target) {
        const desired = Math.atan2(target.y - b.y, target.x - b.x);
        let current = Math.atan2(b.vy, b.vx);
        let diff = desired - current;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        current += diff * 0.065;
        const spd = 4.2 * scale;
        b.vx = Math.cos(current) * spd;
        b.vy = Math.sin(current) * spd;
      }
    }

    // 펄스 폭발탄은 현재 진행 방향을 크게 꺾지 않는다. ±30° 안의 가장 가까운
    // 적만 아주 약하게 따라가므로, 방사형 회피·착탄 성격은 유지된다.
    if (b.isPulseStorm && b.pulseHoming) {
      const heading = Math.atan2(b.vy, b.vx);
      const candidates = [...enemies];
      if (BossManager.activeBoss) {
        if (BossManager.bossType === 'warship') candidates.push(...BossManager.getPlayerTargetables().filter(entry => entry.shipPart));
        else candidates.push(BossManager.activeBoss, ...BossManager.getVulnerablePrisms());
      }
      let target = null;
      let nearest = Infinity;
      for (const candidate of candidates) {
        if (!candidate || !Number.isFinite(candidate.x) || !Number.isFinite(candidate.y)) continue;
        const dx = candidate.x - b.x;
        const dy = candidate.y - b.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= nearest || distance < 0.001) continue;
        let difference = Math.atan2(dy, dx) - heading;
        while (difference < -Math.PI) difference += Math.PI * 2;
        while (difference > Math.PI) difference -= Math.PI * 2;
        if (Math.abs(difference) <= Math.PI / 6) { target = candidate; nearest = distance; }
      }
      if (target) {
        let difference = Math.atan2(target.y - b.y, target.x - b.x) - heading;
        while (difference < -Math.PI) difference += Math.PI * 2;
        while (difference > Math.PI) difference -= Math.PI * 2;
        const angle = heading + difference * 0.045;
        const speed = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(angle) * speed;
        b.vy = Math.sin(angle) * speed;
      }
    }

    b.x += b.vx;
    b.y += b.vy;

    if (b.x < -30 || b.x > width + 30 || b.y < -30 || b.y > height + 30) {
      bullets.splice(i, 1);
      continue;
    }

    let hitObstacle = false;
    for (let obs of obstacles) {
      if (Math.hypot(obs.x - b.x, obs.y - b.y) < obs.radius + b.radius) {
        if (b.isPulseStorm) {
          triggerPulseExplosion(b.x, b.y);
        } else {
          addExplosion(b.x, b.y, '#95a5a6', 2);
        }
        bullets.splice(i, 1);
        hitObstacle = true;
        break;
      }
    }
    if (hitObstacle) continue;

    if (BossManager.activeBoss && BossManager.bossType === 'warship') {
      if (b.isPulseStorm) {
        const target = BossManager.getWarshipCombatPartAt(b.x, b.y, b.radius);
        if (target) {
          const lastHit = b.hitCooldowns.get(target) || 0;
          if (gameTime - lastHit >= 0.08) {
            b.hitCooldowns.set(target, gameTime);
            BossManager.takeDamage(b.damage, target, WEAPON_META.pulse.color, { x: b.x, y: b.y }, 'pulse');
          }
          triggerPulseExplosion(b.x, b.y);
          bullets.splice(i, 1);
          continue;
        }
      } else {
        const target = BossManager.getWarshipCombatPartAt(b.x, b.y, b.radius);
        if (target) {
          BossManager.takeDamage(b.damage, target, b.isDroneBullet ? WEAPON_META.drone.color : '#ffffff', { x: b.x, y: b.y }, b.weaponKind || player.weaponType);
          addExplosion(b.x, b.y, b.color, 3);
          bullets.splice(i, 1);
          continue;
        }
      }
    }

    if (BossManager.activeBoss && BossManager.bossType === 'laser') {
      const prism = BossManager.findPrismHit(b.x, b.y, b.radius);
      if (prism) {
        if (b.isPulseStorm) {
          BossManager.damagePrism(prism, b.damage, WEAPON_META.pulse.color);
          triggerPulseExplosion(b.x, b.y);
          bullets.splice(i, 1);
          continue;
        } else {
          BossManager.damagePrism(prism, b.damage, b.isDroneBullet ? WEAPON_META.drone.color : '#ffffff');
          addExplosion(b.x, b.y, b.color, 3);
          bullets.splice(i, 1);
          continue;
        }
      }
    }

    if (BossManager.activeBoss && BossManager.bossType !== 'warship' && Math.hypot(BossManager.activeBoss.x - b.x, BossManager.activeBoss.y - b.y) < BossManager.activeBoss.radius + b.radius) {
      if (BossManager.isPhantomShieldedAt(b.x, b.y)) {
        bullets.splice(i, 1);
        continue;
      }
      BossManager.takeDamage(b.damage, null, b.isDroneBullet ? WEAPON_META.drone.color : (b.isPulseStorm ? WEAPON_META.pulse.color : '#ffffff'), { x: b.x, y: b.y }, b.weaponKind || player.weaponType);
      if (b.isPulseStorm) {
        triggerPulseExplosion(b.x, b.y);
      } else {
        addExplosion(b.x, b.y, b.color, 3);
      }
      bullets.splice(i, 1);
      continue;
    }

    let hitMissile = false;
    for (let j = enemyBullets.length - 1; j >= 0; j--) {
      const eb = enemyBullets[j];
      if (eb.isDestructible && Math.hypot(eb.x - b.x, eb.y - b.y) < eb.radius + b.radius) {
        if (b.isPulseStorm) {
          const lastHit = b.hitCooldowns.get(eb) || 0;
          if (gameTime - lastHit < 0.08) continue;
          b.hitCooldowns.set(eb, gameTime);
        }
        eb.hp -= b.damage;
        addExplosion(b.x, b.y, '#ffd32a', 3);
        if (eb.hp <= 0) {
          addExplosion(eb.x, eb.y, '#ff4757', 14);
          Sound.playExplosion(false);
          enemyBullets.splice(j, 1);
        }
        if (!b.isPulseStorm) {
          bullets.splice(i, 1);
          hitMissile = true;
          break;
        }
      }
    }
    if (hitMissile) continue;

    let consumed = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (e.isBossEntity && e.isShipUnbreakableDebris) continue;
      if (Math.hypot(e.x - b.x, e.y - b.y) < e.radius + b.radius) {
        if (b.isPulseStorm) {
          if (e.isElite || e.isPulseReactive) {
            applyEnemyDamage(e, b.damage, e.x, e.y, WEAPON_META.pulse.color);
            triggerPulseExplosion(b.x, b.y);
            bullets.splice(i, 1);
            if (e.hp <= 0) handleEnemyDeath(e, j);
            consumed = true;
            break;
          } else {
            const lastHit = b.hitCooldowns.get(e) || 0;
            if (gameTime - lastHit >= 0.08) {
              b.hitCooldowns.set(e, gameTime);
              applyEnemyDamage(e, b.damage, e.x, e.y, b.isDroneBullet ? WEAPON_META.drone.color : '#ffffff');
              addExplosion(b.x, b.y, b.color, 2);
              if (e.hp <= 0) handleEnemyDeath(e, j);
            }
          }
        } else {
          applyEnemyDamage(e, b.damage, e.x, e.y, b.isDroneBullet ? WEAPON_META.drone.color : '#ffffff');
          addExplosion(b.x, b.y, b.color, 3);
          bullets.splice(i, 1);

          if (e.isElite && e.eliteType === 3 && e.dashState !== 'dashing') {
            e.slowTimer = 0.25;
          }
          if (e.hp <= 0) handleEnemyDeath(e, j);
          consumed = true;
          break;
        }
      }
    }
    if (consumed) continue;
  }

  const hardSpeedFactor = (gameMode === 'hard') ? 0.85 : 1.0;

  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const eb = enemyBullets[i];

    if (eb.isHoming) {
      const desiredAngle = Math.atan2(player.y - eb.y, player.x - eb.x);
      const mSpeed = 1.35 * scale * hardSpeedFactor;
      eb.vx = Math.cos(desiredAngle) * mSpeed;
      eb.vy = Math.sin(desiredAngle) * mSpeed;
    }

    eb.x += eb.vx;
    eb.y += eb.vy;

    if (eb.x < -30 || eb.x > width + 30 || eb.y < -30 || eb.y > height + 30) {
      enemyBullets.splice(i, 1);
      continue;
    }

    let hitObs = false;
    for (let k = obstacles.length - 1; k >= 0; k--) {
      const obs = obstacles[k];
      if (Math.hypot(obs.x - eb.x, obs.y - eb.y) < obs.radius + eb.radius) {
        addExplosion(eb.x, eb.y, '#ff4757', 15);
        addExplosion(obs.x, obs.y, '#95a5a6', 15);
        Sound.playExplosion(false);
        obstacles.splice(k, 1);
        enemyBullets.splice(i, 1);
        hitObs = true;
        break;
      }
    }
    if (hitObs) continue;

    if (player.invincibleTimer <= 0 && Math.hypot(player.x - eb.x, player.y - eb.y) < player.radius + eb.radius) {
      takeDamage(eb.damage || 1);
      enemyBullets.splice(i, 1);
    }
  }

  const despawnMargin = 120 * scale;
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.x += obs.vx;
    obs.y += obs.vy;
    obs.rotation += obs.rotSpeed;

    if (obs.x < -despawnMargin || obs.x > width + despawnMargin || obs.y < -despawnMargin || obs.y > height + despawnMargin) {
      obstacles.splice(i, 1);
      continue;
    }

    if (player.invincibleTimer <= 0 && Math.hypot(player.x - obs.x, player.y - obs.y) < player.radius + obs.radius * 0.8) {
      takeDamage();
    }
  }

  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    item.x += item.vx;
    item.y += item.vy;

    if (item.lifeTime !== undefined) {
      item.lifeTime -= dt;
      if (item.lifeTime <= 0) {
        addExplosion(item.x, item.y, item.color, 8);
        items.splice(i, 1);
        continue;
      }
    }

    if (item.isBossWeaponCore) {
      item.rouletteTimer -= dt;
      if (item.rouletteTimer <= 0) {
        item.rouletteTimer = item.rouletteInterval || 0.7;
        item.rouletteIndex = (item.rouletteIndex + 1) % item.roulettePool.length;
        const nextWeapon = item.roulettePool[item.rouletteIndex];
        const meta = BossManager.ARSENAL_WEAPON_META[nextWeapon];
        item.arsenalWeaponKey = nextWeapon;
        item.name = BossManager.ARSENAL_WEAPON_LABELS[nextWeapon];
        item.color = meta.color;
        item.label = meta.glyph;
        item.arsenalIcon = meta.icon;
      }
    } else if (item.isRoulette) {
      item.rouletteTimer -= dt;
      if (item.rouletteTimer <= 0) {
        item.rouletteTimer = item.rouletteInterval || 2.0;
        item.rouletteIndex = (item.rouletteIndex + 1) % item.roulettePool.length;
        const newKind = item.roulettePool[item.rouletteIndex];
        item.kind = newKind;
        item.color = item.isArsenalRoulette ? BossManager.ARSENAL_SHIELD_META[newKind].color : WEAPON_META[newKind].color;
        item.label = item.isArsenalRoulette ? BossManager.ARSENAL_SHIELD_META[newKind].glyph : WEAPON_META[newKind].label;
        item.name = WEAPON_META[newKind].name;
      }
    }

    if (Math.hypot(player.x - item.x, player.y - item.y) < player.radius + item.radius) {
      if (item.shape === 'circle') {
        if (item.kind === 'heal') {
          applyHealItem();
        } else if (item.kind === 'dmg') {
          Sound.playItem();
          player.baseDamage += 0.6;
          showFloatingText("화력 강화!", player.x, player.y - 15 * scale, '#ff6b6b');
        } else if (item.kind === 'count') {
          Sound.playItem();
          player.baseBulletCount = Math.min(10, player.baseBulletCount + 1);
          showFloatingText("탄환 수 증가!", player.x, player.y - 15 * scale, '#38bdf8');
        } else if (item.kind === 'spd') {
          Sound.playItem();
          player.speedLevel++;
          showFloatingText("연사 가속!", player.x, player.y - 15 * scale, '#f1c40f');
        } else if (item.kind === 'bomb') {
          triggerNuke();
        }
      } else if (item.shape === 'square') {
        if (item.isBossWeaponCore) {
          BossManager.queueArsenalWeaponOverride(item.arsenalWeaponKey);
        } else if (item.isArsenalRoulette) {
          equipArsenalWeapon(item.kind, item.color, item.name);
        } else if (item.isRoulette) {
          // 엘리트 드랍 룰렛 코어: 무기 교체/동일 무기 레벨업
          equipWeapon(item.kind, item.color, item.name);
        } else if (item.kind === 'lvup') {
          // 필드 코어: 현재 무기는 유지하고 레벨만 상승
          levelUpCurrentWeapon(item.color);
        }
      }

      addExplosion(item.x, item.y, item.color, 10);
      items.splice(i, 1);
      continue;
    }

    if (item.x < -despawnMargin || item.x > width + despawnMargin || item.y < -despawnMargin || item.y > height + despawnMargin) {
      items.splice(i, 1);
    }
  }

  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y += ft.vy;
    ft.alpha -= dt * 1.3;
    if (ft.alpha <= 0) floatingTexts.splice(i, 1);
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= dt * 2.0;
    if (p.alpha <= 0) particles.splice(i, 1);
  }
  // 잔류 펄스 폭풍: 1초 동안 0.2초 간격으로 틱 피해를 준다.
  for (let i = pulseRings.length - 1; i >= 0; i--) {
    const storm = pulseRings[i];
    storm.life -= dt;
    storm.tickTimer += dt;
    storm.alpha = Math.min(1, storm.life / storm.maxLife + 0.15);

    if (storm.tickTimer >= 0.2) {
      const ticks = Math.floor(storm.tickTimer / 0.2);
      storm.tickTimer -= ticks * 0.2;
      const stormDmg = player.baseDamage * 0.25 * ticks;

      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (Math.hypot(e.x - storm.x, e.y - storm.y) < storm.radius + e.radius) {
          applyEnemyDamage(e, stormDmg, e.x, e.y, WEAPON_META.pulse.color);
          addExplosion(e.x, e.y, '#00d2d3', 1);
          if (e.hp <= 0) handleEnemyDeath(e, j);
        }
      }

      if (BossManager.activeBoss) {
        if (BossManager.bossType === 'warship') {
          const targets = BossManager.getPlayerTargetables().filter(t => t.shipPart);
          for (const t of targets) {
            if (Math.hypot(t.x - storm.x, t.y - storm.y) < storm.radius + t.radius) {
              BossManager.takeDamage(stormDmg, t, WEAPON_META.pulse.color, { x: storm.x, y: storm.y }, 'pulse');
            }
          }
        } else if (BossManager.bossType === 'laser') {
          for (const pr of BossManager.getVulnerablePrisms()) {
            if (Math.hypot(pr.x - storm.x, pr.y - storm.y) < storm.radius + pr.r) {
              BossManager.damagePrism(pr.prism, stormDmg, WEAPON_META.pulse.color);
            }
          }
        } else if (Math.hypot(BossManager.activeBoss.x - storm.x, BossManager.activeBoss.y - storm.y) < storm.radius + BossManager.activeBoss.radius) {
          if (!BossManager.isPhantomShieldedAt(storm.x, storm.y)) {
            BossManager.takeDamage(stormDmg, null, WEAPON_META.pulse.color, { x: storm.x, y: storm.y }, 'pulse');
          }
        }
      }
    }

    if (storm.life <= 0) pulseRings.splice(i, 1);
  }
  if (nukeFlashAlpha > 0) {
    nukeFlashAlpha = Math.max(0, nukeFlashAlpha - dt * 2.5);
  }

  if (gameState === 'ending') {
    if (gundam.y > gundam.targetY) {
      gundam.y -= dt * 320 * scale;
    } else if (!gundam.beamFired) {
      gundam.beamFired = true;
      Sound.playGundamBeam();
      for (let e of enemies) addExplosion(e.x, e.y, '#ff4757', 16);
      for (let obs of obstacles) addExplosion(obs.x, obs.y, '#f1c40f', 20);
      enemies = []; obstacles = []; items = []; bullets = []; enemyBullets = [];

      setTimeout(() => {
        showNormalEndingModal();
      }, 2400);
    }

    if (gundam.beamFired && gundam.beamAlpha < 1) {
      gundam.beamAlpha = Math.min(1, gundam.beamAlpha + dt * 3);
    }
  }
}

function drawBossWeaponCoreItem(item) {
  const meta = BossManager.ARSENAL_WEAPON_META[item.arsenalWeaponKey] || BossManager.ARSENAL_WEAPON_META.fabricator;
  const r = item.radius;
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(weaponAnimTime * 1.6);
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = meta.color;
  ctx.shadowColor = meta.color;
  ctx.shadowBlur = 14 * scale;
  ctx.lineWidth = 2.4 * scale;

  if (meta.icon === 'gear') {
    drawPolygon(ctx, 0, 0, r * 1.05, 8, Math.PI / 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = meta.color;
    ctx.fillRect(-r * 0.38, -r * 0.38, r * 0.76, r * 0.76);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-r * 0.13, -r * 0.13, r * 0.26, r * 0.26);
  } else if (meta.icon === 'blade') {
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.15); ctx.lineTo(r * 0.82, 0); ctx.lineTo(0, r * 1.15); ctx.lineTo(-r * 0.82, 0); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = meta.glow; ctx.lineWidth = 3 * scale;
    ctx.beginPath(); ctx.moveTo(0, -r * 0.74); ctx.lineTo(0, r * 0.62); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * 0.34, r * 0.25); ctx.lineTo(r * 0.34, r * 0.25); ctx.stroke();
  } else if (meta.icon === 'split') {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * r * 0.15, -r); ctx.lineTo(side * r, 0); ctx.lineTo(side * r * 0.15, r); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.strokeStyle = meta.glow; ctx.lineWidth = 2.6 * scale;
    ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.65); ctx.lineTo(r * 0.18, -r * 0.1); ctx.lineTo(-r * 0.18, r * 0.12); ctx.lineTo(r * 0.2, r * 0.66); ctx.stroke();
  } else {
    drawPolygon(ctx, 0, 0, r * 1.08, 6, Math.PI / 6);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = meta.color;
    ctx.fillRect(-r * 0.48, -r * 0.72, r * 0.96, r * 0.62);
    ctx.fillRect(-r * 0.14, -r * 0.12, r * 0.28, r * 0.84);
  }
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.fillRect((width * 0.2 + gameTime * 8 * scale) % width, (height * 0.15 + gameTime * 15 * scale) % height, 1.5 * scale, 1.5 * scale);
  ctx.fillRect((width * 0.7 - gameTime * 10 * scale) % width, (height * 0.65 + gameTime * 25 * scale) % height, 1.5 * scale, 1.5 * scale);

  for (let p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (let obs of obstacles) {
    ctx.save();
    ctx.translate(obs.x, obs.y);
    ctx.rotate(obs.rotation);
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  for (let item of items) {
    ctx.save();
    if (item.lifeTime !== undefined && item.lifeTime < 5 && Math.floor(item.lifeTime * 6) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }
    ctx.fillStyle = item.color;
    ctx.shadowColor = item.color;
    ctx.shadowBlur = 8 * scale;

    if (item.isStationary || item.isBossWeaponCore) {
      ctx.strokeStyle = item.isBossWeaponCore ? item.color : (item.isArsenalRoulette ? item.color : (item.isRoulette ? '#a855f7' : '#ffd32a'));
      ctx.lineWidth = 1.5 * scale;
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.radius * (1.3 + Math.sin(weaponAnimTime * 8) * 0.2), 0, Math.PI * 2);
      ctx.stroke();
      if (item.isBossWeaponCore) {
        ctx.strokeStyle = '#ffffff';
        ctx.setLineDash([4 * scale, 4 * scale]);
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.radius * 1.75, -weaponAnimTime * 2, -weaponAnimTime * 2 + Math.PI * 1.55);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    if (item.isBossWeaponCore) {
      drawBossWeaponCoreItem(item);
    } else if (item.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.rect(item.x - item.radius, item.y - item.radius, item.radius * 2, item.radius * 2);
      ctx.fill();
    }

    if (!item.isBossWeaponCore) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(8.5 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, item.x, item.y);
    }
    ctx.restore();
  }

  BossManager.draw(ctx);

  for (let storm of pulseRings) {
    ctx.save();
    const fade = Math.max(0, Math.min(1, storm.life / storm.maxLife));
    ctx.globalAlpha = 0.22 + fade * 0.25;
    ctx.fillStyle = 'rgba(0, 210, 211, 0.12)';
    ctx.beginPath();
    ctx.arc(storm.x, storm.y, storm.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(0, 210, 211, ${0.28 + fade * 0.22})`;
    ctx.lineWidth = 6 * scale;
    ctx.beginPath();
    ctx.arc(storm.x, storm.y, storm.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(127, 245, 246, ${0.42 + fade * 0.35})`;
    ctx.lineWidth = 1.5 * scale;
    ctx.setLineDash([8 * scale, 6 * scale]);
    ctx.beginPath();
    ctx.arc(storm.x, storm.y, storm.radius * (0.88 + fade * 0.08), -weaponAnimTime * 5, -weaponAnimTime * 5 + Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (let b of bullets) {
    ctx.save();
    if (b.isLightningBlade) {
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle || Math.atan2(b.vy, b.vx));
      ctx.globalAlpha = 0.96;
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 7 * scale;
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.2 * scale;
      ctx.beginPath();
      ctx.moveTo(-6 * scale, 0);
      ctx.lineTo(-2 * scale, -2.8 * scale);
      ctx.lineTo(1 * scale, -1.0 * scale);
      ctx.lineTo(6 * scale, 0);
      ctx.lineTo(1 * scale, 1.0 * scale);
      ctx.lineTo(-2 * scale, 2.8 * scale);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = '#fff7ae';
      ctx.beginPath();
      ctx.arc(0, 0, 1.6 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.isBlackHole) {
      const pulse = 1 + Math.sin(weaponAnimTime * 10) * 0.05;

      // 보스를 가리지 않도록 전체 블랙홀 효과의 불투명도와 블러를 낮춘다.
      ctx.shadowColor = 'rgba(139, 92, 246, 0.45)';
      ctx.shadowBlur = 7 * scale;
      ctx.fillStyle = 'rgba(139, 92, 246, 0.07)';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * pulse, 0, Math.PI * 2);
      ctx.fill();

      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
      grad.addColorStop(0, 'rgba(5, 1, 13, 0.78)');
      grad.addColorStop(0.24, 'rgba(18, 5, 43, 0.50)');
      grad.addColorStop(0.68, 'rgba(139, 92, 246, 0.30)');
      grad.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(196, 181, 253, 0.40)';
      ctx.lineWidth = 1.2 * scale;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 0.72, weaponAnimTime * 2, weaponAnimTime * 2 + Math.PI * 1.55);
      ctx.stroke();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.coreRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(221, 214, 254, 0.48)';
      ctx.lineWidth = 1 * scale;
      ctx.stroke();
    } else if (b.isPulseStorm) {
      ctx.translate(b.x, b.y);
      ctx.rotate(gameTime * 14);

      ctx.fillStyle = '#00d2d3';
      ctx.shadowColor = '#00d2d3';
      ctx.shadowBlur = 14 * scale;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, b.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 * scale;
      for (let k = 0; k < 3; k++) {
        const ra = (k * Math.PI * 2 / 3);
        ctx.beginPath();
        ctx.moveTo(Math.cos(ra) * b.radius * 0.5, Math.sin(ra) * b.radius * 0.5);
        ctx.lineTo(Math.cos(ra) * b.radius * 1.35, Math.sin(ra) * b.radius * 1.35);
        ctx.stroke();
      }
    } else {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 1.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  for (let eb of enemyBullets) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#ff3838';
    ctx.beginPath();
    ctx.arc(eb.x, eb.y, eb.radius * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(eb.x, eb.y, eb.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(eb.x, eb.y, eb.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    if (eb.isDestructible) {
      const bw = eb.radius * 2.2;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(eb.x - bw/2, eb.y - eb.radius - 6 * scale, bw, 2.5 * scale);
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(eb.x - bw/2, eb.y - eb.radius - 6 * scale, bw * (eb.hp / eb.maxHp), 2.5 * scale);
    }
    ctx.restore();
  }

  for (let e of enemies) {
    if (!(e.isElite && e.eliteType === 4 && e.twinRole === 'core' && e.twin)) continue;
    ctx.save();
    ctx.lineCap = 'round';
    if (e.twinLaser) {
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.35)';
      ctx.lineWidth = 16 * scale;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.twin.x, e.twin.y); ctx.stroke();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 8 * scale;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.twin.x, e.twin.y); ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3 * scale;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.twin.x, e.twin.y); ctx.stroke();
    } else {
      const blinking = e.twinTimer >= 2.4;
      const alpha = blinking ? (Math.floor(gameTime * 12) % 2 === 0 ? 0.9 : 0.15) : 0.4;
      ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
      ctx.lineWidth = (blinking ? 3 : 2) * scale;
      ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.twin.x, e.twin.y); ctx.stroke();
    }
    ctx.restore();
  }

  for (let e of enemies) {
    ctx.save();

    if (e.isShipUnbreakableDebris) {
      // 수리 중 떨어지는 잔해는 일반 운석과 같은 색/재질로만 표현하고 타깃이 되지 않는다.
      ctx.translate(e.x, e.y);
      ctx.rotate(e.rotation || 0);
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    } else if (e.isPhantomFortress) {
      const pulse = 1 + Math.sin(gameTime * 5 + e.x * 0.01) * 0.05;
      ctx.fillStyle = '#7f1d1d';
      ctx.shadowColor = '#fb7185';
      ctx.shadowBlur = 15 * scale;
      drawPolygon(ctx, e.x, e.y, e.radius * pulse, 6, Math.PI / 6);
      ctx.fill();
      ctx.strokeStyle = '#fecdd3';
      ctx.lineWidth = 2.5 * scale;
      ctx.stroke();
      ctx.fillStyle = '#fda4af';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius * 0.30, 0, Math.PI * 2);
      ctx.fill();

      const barW = e.radius * 2.15;
      const barY = e.y - e.radius - 10 * scale;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(e.x - barW / 2, barY, barW, 4 * scale);
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(e.x - barW / 2, barY, barW * Math.max(0, e.hp / e.maxHp), 4 * scale);
      ctx.fillStyle = '#ffe4e6';
      ctx.font = `bold ${Math.round(8 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FORTRESS', e.x, e.y + e.radius + 11 * scale);
    } else if (e.isArsenalSummon) {
      const isCaptain = !!e.isArsenalCaptain;
      const isArmored = !!e.isArsenalLineUnit;
      const modeColor = e.arsenalWeaponMode && BossManager.ARSENAL_WEAPON_META[e.arsenalWeaponMode]
        ? BossManager.ARSENAL_WEAPON_META[e.arsenalWeaponMode].color
        : null;
      const bodyColor = isCaptain ? '#38bdf8'
        : (modeColor || (isArmored ? '#22c55e' : (e.isArsenalOverloadSummon ? '#fb7185' : '#22c55e')));
      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = isCaptain ? '#ffffff' : '#fde68a';
      ctx.lineWidth = (isCaptain ? 3 : 2) * scale;
      ctx.shadowColor = bodyColor;
      ctx.shadowBlur = (isCaptain ? 18 : 10) * scale;
      if (isArmored) {
        ctx.beginPath();
        ctx.roundRect(e.x - e.radius * 1.15, e.y - e.radius * 0.7, e.radius * 2.3, e.radius * 1.4, 4 * scale);
      } else {
        drawPolygon(ctx, e.x, e.y, e.radius * 1.1, isCaptain ? 6 : 4, gameTime * (isCaptain ? -1.4 : 2.2));
      }
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.radius * 0.28, 0, Math.PI * 2); ctx.fill();

      const barW = e.radius * 2.1;
      const barY = e.y - e.radius - 8 * scale;
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(e.x - barW / 2, barY, barW, 3.5 * scale);
      ctx.fillStyle = bodyColor; ctx.fillRect(e.x - barW / 2, barY, barW * Math.max(0, e.hp / e.maxHp), 3.5 * scale);
      if (isCaptain) {
        ctx.fillStyle = '#fff7ed'; ctx.font = `900 ${Math.round(7 * scale)}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('CAPTAIN', e.x, e.y + e.radius + 10 * scale);
      }
    } else if (e.isElite) {
      if (e.eliteType === 4) {
        const isCore = e.twinRole === 'core';
        const bodyColor = e.enraged ? '#ef4444' : (isCore ? '#0891b2' : '#22d3ee');
        const pulse = e.enraged ? 1 + Math.sin(gameTime * 20) * 0.12 : 1;
        ctx.fillStyle = bodyColor;
        ctx.shadowColor = bodyColor;
        ctx.shadowBlur = (e.enraged ? 18 : 12) * scale;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = e.enraged ? '#fecaca' : '#cffafe';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        if (isCore) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.radius * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (e.eliteType === 1) {
        ctx.fillStyle = '#e84118';
        ctx.shadowColor = '#e84118';
        ctx.shadowBlur = 16 * scale;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fbc531';
        ctx.lineWidth = 3.5 * scale;
        ctx.stroke();
      } else if (e.eliteType === 2) {
        ctx.fillStyle = '#e67e22';
        ctx.shadowColor = '#e67e22';
        ctx.shadowBlur = 12 * scale;
        drawPolygon(ctx, e.x, e.y, e.radius * 1.15, 6, gameTime * 1.5);
        ctx.fill();

        ctx.fillStyle = '#d35400';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.eliteType === 3) {
        if (e.dashState === 'windup') {
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 56, 56, 0.9)';
          ctx.lineWidth = 3.5 * scale;
          ctx.setLineDash([8, 4]);
          ctx.beginPath();
          ctx.moveTo(e.x, e.y);
          const arrowLen = 130 * scale;
          const ax = e.x + Math.cos(e.dashAngle) * arrowLen;
          const ay = e.y + Math.sin(e.dashAngle) * arrowLen;
          ctx.lineTo(ax, ay);
          ctx.stroke();

          ctx.fillStyle = '#ff3838';
          ctx.beginPath();
          ctx.arc(ax, ay, 6 * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.fillStyle = e.dashState === 'dashing' ? '#ff3838' : '#00cec9';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 14 * scale;
        drawPolygon(ctx, e.x, e.y, e.radius * 1.25, 4, e.dashState === 'dashing' ? e.dashAngle : gameTime * 4.0);
        ctx.fill();
      }

      const barW = e.radius * 1.8;
      const barH = 3.5 * scale;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - barW / 2, e.y - e.radius - 8 * scale, barW, barH);
      ctx.fillStyle = '#fbc531';
      const fillRatio = Math.max(0, e.hp / e.maxHp);
      ctx.fillRect(e.x - barW / 2, e.y - e.radius - 8 * scale, barW * fillRatio, barH);

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(8 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(Math.ceil(e.hp * 100), e.x, e.y - e.radius - 11 * scale);

    } else {
      const ratio = Math.min(1, (e.hp - 1) / 18);
      ctx.fillStyle = e.isPattern7Green ? '#22c55e' : (ratio > 0.45 ? '#8e44ad' : '#ff4757');
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();

      if (e.isLeader) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.5 * scale;
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 8 * scale;
        ctx.stroke();
      }

      if (e.hp > 1) {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(8.5 * scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.ceil(e.hp), e.x, e.y);
      }
    }

    ctx.restore();
  }

  if (player.isLaserFiring) {
    ctx.save();
    const laserLen = Math.max(width, height) * 1.4;
    const x2 = player.x + Math.cos(player.laserAngle) * laserLen;
    const y2 = player.y + Math.sin(player.laserAngle) * laserLen;
    const w = (5 + (player.weaponLevel - 1) * 3.5) * scale;

    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 71, 87, 0.3)';
    ctx.lineWidth = w * 2.0;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 71, 87, 0.85)';
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2 * scale, w * 0.35);
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  if (player.weaponType === 'pulse' && gameState === 'playing') {
    ctx.save();
    const auraRadius = getPulseAuraRadius();
    const chargeDuration = Math.max(1.0, 3.0 * Math.pow(0.86, player.speedLevel - 1));
    const chargeProgress = Math.min(1.0, player.pulseChargeTimer / chargeDuration);

    ctx.strokeStyle = `rgba(0, 210, 211, ${0.12 + chargeProgress * 0.15})`;
    ctx.lineWidth = (8 + chargeProgress * 4) * scale;
    ctx.beginPath();
    ctx.arc(player.x, player.y, auraRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(0, 210, 211, ${0.4 + chargeProgress * 0.45})`;
    ctx.lineWidth = (2 + chargeProgress * 2) * scale;
    ctx.setLineDash([8 * scale, 6 * scale]);
    ctx.lineDashOffset = -weaponAnimTime * 62 * scale;
    ctx.beginPath();
    ctx.arc(player.x, player.y, auraRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 충전 진행을 따라 네 개의 시간차 핀이 실제로 공전하도록 표시한다.
    ctx.setLineDash([]);
    const orbitAngle = weaponAnimTime * (2.2 + chargeProgress * 2.8);
    ctx.strokeStyle = `rgba(165, 243, 252, ${0.42 + chargeProgress * 0.42})`;
    ctx.lineWidth = 2 * scale;
    for (let i = 0; i < 4; i++) {
      const a = orbitAngle + i * Math.PI / 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, auraRadius * 0.91, a, a + 0.34 + chargeProgress * 0.2);
      ctx.stroke();
    }

    ctx.fillStyle = `rgba(0, 210, 211, ${0.06 + chargeProgress * 0.1})`;
    ctx.beginPath();
    ctx.arc(player.x, player.y, auraRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (player.weaponType === 'flame') {
    ctx.save();
    const level = Math.max(1, Math.min(8, player.weaponLevel));
    const flameHalfAngle = (10 + (level - 1) * (65 / 7)) * (Math.PI / 180);
      const flameRange = getFlameRange();

    // 실제 피해 범위와 1:1로 맞는 부채꼴 클리핑 영역.
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.arc(player.x, player.y, flameRange, player.angle - flameHalfAngle, player.angle + flameHalfAngle);
    ctx.closePath();
    ctx.clip();

    // 아주 옅은 잔광을 깔고, 그 위에 작은 부채꼴 화염들을 연속 방출한다.
    ctx.globalAlpha = 0.085;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.arc(player.x, player.y, flameRange, player.angle - flameHalfAngle, player.angle + flameHalfAngle);
    ctx.closePath();
    ctx.fill();

    for (let i = 0; i < flameParticles.length; i++) {
      const f = flameParticles[i];
      const progress = Math.max(0, Math.min(1, f.t));
      const ease = 1 - Math.pow(1 - progress, 1.7);
      const radius = f.startRadius + (f.maxTravel - f.startRadius) * ease;
      const wobble = Math.sin(progress * Math.PI * 2 + f.phase) * f.wobble * (0.35 + progress);
      const centerAngle = player.angle + f.angleOffset + wobble;
      const half = flameHalfAngle * f.widthRatio * f.widthScale * (1 - progress * 0.18);
      const inner = Math.max(0, radius - flameRange * (0.06 + progress * 0.025));
      const outer = Math.min(flameRange, radius + flameRange * (0.095 + (1 - progress) * 0.055));
      const lifeAlpha = Math.sin(progress * Math.PI);
      const alpha = (0.24 + 0.18 * (1 - progress)) * lifeAlpha;
      const color = i % 3 === 0 ? '#fbbf24' : (i % 3 === 1 ? '#fb923c' : '#f59e0b');

      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(player.x + Math.cos(centerAngle - half) * inner, player.y + Math.sin(centerAngle - half) * inner);
      ctx.arc(player.x, player.y, outer, centerAngle - half, centerAngle + half);
      ctx.lineTo(player.x + Math.cos(centerAngle + half) * inner, player.y + Math.sin(centerAngle + half) * inner);
      ctx.arc(player.x, player.y, inner, centerAngle + half, centerAngle - half, true);
      ctx.closePath();
      ctx.fill();
    }

    // 분사구 근처의 짧고 두꺼운 화염을 추가해 '뿜어내는' 인상을 강화한다.
    const nozzlePulse = 0.88 + Math.sin(weaponAnimTime * 38) * 0.08;
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.arc(player.x, player.y, flameRange * 0.24 * nozzlePulse, player.angle - flameHalfAngle * 0.42, player.angle + flameHalfAngle * 0.42);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  if (player.weaponType === 'drone') {
    const droneCount = player.weaponLevel;
    for (let i = 0; i < droneCount; i++) {
      const dAngle = weaponAnimTime * 2.5 + (i * Math.PI * 2 / droneCount);
      const dx = player.x + Math.cos(dAngle) * 26 * scale;
      const dy = player.y + Math.sin(dAngle) * 26 * scale;

      ctx.save();
      ctx.fillStyle = WEAPON_META.drone.color;
      ctx.shadowColor = WEAPON_META.drone.color;
      ctx.shadowBlur = 8 * scale;
      ctx.beginPath();
      ctx.arc(dx, dy, 4.5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(dx, dy, 1.8 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 번개 칼날 탄환 렌더링

  // 발화 상태의 적은 현재 발화 강도에 비례한 주황색의 옅은 원이 일렁인다.
  const ignitionTargets = [];
  for (const e of enemies) {
    if (e && !e.isBossEntity && Number(e.ignitionSeconds) > 0) ignitionTargets.push(e);
  }
  if (BossManager.activeBoss) {
    if (BossManager.bossType === 'warship') {
      for (const part of Object.values(BossManager.activeBoss.parts || {})) {
        if (part && Number(part.ignitionSeconds) > 0 && part.alive !== false) ignitionTargets.push(part);
      }
    } else {
      const b = BossManager.activeBoss;
      if (b && Number(b.ignitionSeconds) > 0 && b.hp > 0) ignitionTargets.push(b);
      if (BossManager.bossType === 'laser' && b && b.prisms) {
        for (const pr of b.prisms) {
          if (pr && Number(pr.ignitionSeconds) > 0 && pr.alive !== false) ignitionTargets.push(pr);
        }
      }
    }
  }
  for (const target of ignitionTargets) {
    const t = Math.min(5, Math.max(0, Number(target.ignitionSeconds) || 0));
    const intensity = t / 5;
    const radius = Math.max(8 * scale, (target.radius || target.r || 10) + (7 + 8 * intensity) * scale);
    const pulse = 1 + Math.sin(weaponAnimTime * (8 + 4 * intensity) + (target.x + target.y) * 0.02) * (0.08 + 0.05 * intensity);
    ctx.save();
    ctx.globalAlpha = 0.12 + 0.28 * intensity;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = (1.5 + 1.7 * intensity) * scale;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = (4 + 7 * intensity) * scale;
    ctx.beginPath();
    ctx.arc(target.x, target.y, radius * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 체인 라이트닝에 전이된 대상을 노란색 원으로 강조한다.
  for (const marker of chainHitMarkers) {
    ctx.save();
    const fade = Math.max(0, marker.life / marker.maxLife);
    const pulse = 1 + (1 - fade) * 0.35;
    ctx.globalAlpha = fade;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.4 * scale;
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 7 * scale;
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, marker.radius * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (const chain of chainLightning) {
    for (const seg of chain.segments) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, seg.life / (seg.maxLife || 0.14));
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      const mx = (seg.x1 + seg.x2) * 0.5 + Math.sin(weaponAnimTime * 80 + seg.x1) * 7 * scale;
      const my = (seg.y1 + seg.y2) * 0.5 + Math.cos(weaponAnimTime * 74 + seg.y2) * 7 * scale;
      ctx.lineTo(mx, my);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
      ctx.strokeStyle = '#fff7ae';
      ctx.lineWidth = 1.1 * scale;
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.save();
  if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 10) % 2 === 0) {
    ctx.globalAlpha = 0.3;
  }

  if (player.superInvincibleTimer > 0) {
    ctx.save();
    const fade = Math.min(1, player.superInvincibleTimer / 1.5);
    ctx.globalAlpha = fade;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3 * scale;
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 14 * scale;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 14 * scale, gameTime * 4, gameTime * 4 + Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (player.shield > 0) {
    ctx.save();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = (player.shield === 2 ? 3.5 : 2) * scale;
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 10 * scale;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 7 * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const sides = Math.min(10, 2 + player.weaponLevel);
  const colorMap = {
    'default': '#38bdf8',
    'omni': '#2563eb',
    'drone': '#22c55e',
    'laser': '#ff4757',
    'pulse': '#00d2d3',
    'blackhole': '#8b5cf6',
    'flame': '#f59e0b',
    'lightning': '#facc15'
  };
  const pColor = colorMap[player.weaponType];

  ctx.fillStyle = pColor;
  ctx.shadowColor = pColor;
  ctx.shadowBlur = (8 + player.weaponLevel * 1.5) * scale;
  
  drawPolygon(ctx, player.x, player.y, player.radius * 1.35, sides, player.angle);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(player.x, player.y, 2.5 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  for (let ft of floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.alpha);
    ctx.fillStyle = ft.color;
    ctx.font = `bold ${Math.round((ft.damageNumber ? 15 : 13) * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    if (ft.damageNumber) {
      ctx.shadowColor = 'rgba(0,0,0,0.75)';
      ctx.shadowBlur = 2 * scale;
    } else {
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4 * scale;
    }
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }

  if (nukeFlashAlpha > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${nukeFlashAlpha})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  if (joystick.active && gameState === 'playing' && !isPaused) {
    ctx.save();
    const maxR = joystick.maxRadius * scale;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(joystick.originX, joystick.originY, maxR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = `rgba(56, 189, 248, ${0.45 + joystick.strength * 0.4})`;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10 * scale;
    ctx.beginPath();
    ctx.arc(joystick.curX, joystick.curY, 18 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (gundam.active) {
    drawGundam(gundam.y);

    if (gundam.beamFired) {
      ctx.save();
      ctx.globalAlpha = gundam.beamAlpha;
      const grad = ctx.createLinearGradient(0, 0, width, 0);
      grad.addColorStop(0, 'rgba(255, 75, 145, 0)');
      grad.addColorStop(0.2, 'rgba(255, 75, 145, 0.9)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.8, 'rgba(255, 75, 145, 0.9)');
      grad.addColorStop(1, 'rgba(255, 75, 145, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, gundam.y - 30 * scale);

      ctx.fillStyle = `rgba(255, 255, 255, ${0.4 * gundam.beamAlpha})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      ctx.save();
      ctx.font = `900 ${Math.round(28 * scale)}px -apple-system, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ff4757';
      ctx.shadowBlur = 18 * scale;
      ctx.textAlign = 'center';
      ctx.fillText("건담이 지구를 지켰다!", width / 2, height * 0.26);
      ctx.restore();
    }
  }
}

function drawGundam(cy) {
  const cx = width / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

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

  ctx.fillStyle = '#78e08f';
  ctx.shadowColor = '#78e08f';
  ctx.shadowBlur = 8;
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
  ctx.restore();
}

function showGameOverModal() {
  modalTitle.textContent = "작전 실패";
  modalTitle.style.color = "#ff4757";
  modalSub.textContent = "외계 함대의 공세를 버티지 못했습니다.";
  modalScore.innerHTML = `최종 점수: ${score}점<br><span style="font-size:13px;color:#94a3b8;">생존 시간: ${timeDisplay.textContent} (Phase ${currentPhase})</span>`;
  codeRewardArea.style.display = "none";
  resultModal.style.display = "flex";
  if (BossRush.active) BossRush.gameOver();
  Sound.stopBGM();
}

function showNormalEndingModal() {
  gameState = 'ready';
  modalTitle.textContent = "★ 작전 종료 ★";
  modalTitle.style.color = "#facc15";
  modalSub.textContent = "갑자기 나타난 거대 로봇이 모든 적을 일격에 섬멸했습니다!";
  modalScore.innerHTML = `최종 점수: ${score}점<br><span style="font-size:13px;color:#38bdf8;">"지구는 지켜졌으나, 당신의 모든 공로는 건담이 가져갔습니다..."</span>`;
  
  rewardTitle.textContent = "🎉 [하드 모드 인가 프로토콜]";
  rewardCode.textContent = "gundam";
  rewardDesc.textContent = "시작 화면 우측 상단 구석을 터치하여 코드를 입력하면 하드 모드가 해금됩니다!";
  codeRewardArea.style.display = "block";
  restartBtn.textContent = "시작 화면으로";
  resultModal.style.display = "flex";
  Sound.stopBGM();
}

function showHardEndingModal() {
  gameState = 'ready';
  modalTitle.textContent = "👑 하드 모드 제패! 👑";
  modalTitle.style.color = "#facc15";
  modalSub.textContent = "최종 병기 건담을 파괴하고 진정한 우주의 영웅이 되었습니다!";
  modalScore.innerHTML = `최종 점수: ${score}점<br><span style="font-size:13px;color:#facc15;">"한계를 초월한 무한 전장으로의 길이 열렸습니다!"</span>`;
  
  rewardTitle.textContent = "🌌 [무한·보스 러시 모드 인가 프로토콜]";
  rewardCode.textContent = "infinite / bossrush";
  rewardDesc.textContent = "각 코드를 입력하면 무한 모드와 보스 러시 모드가 해금됩니다!";
  codeRewardArea.style.display = "block";
  restartBtn.textContent = "시작 화면으로";
  resultModal.style.display = "flex";
  Sound.stopBGM();
}

function showPracticeClearModal(bossType) {
  gameState = 'ready';
  modalTitle.textContent = "🎯 보스전 테스트 완료!";
  modalTitle.style.color = "#38bdf8";
  modalSub.textContent = bossType === 'mini' ? "미니 보스 격파에 성공했습니다!"
    : bossType === 'laser' ? "레이저 보스 프리즘 코어 격파에 성공했습니다!"
    : bossType === 'warship' ? "전함 보스 크림슨 드레드노트 격파에 성공했습니다!"
    : bossType === 'chronos' ? "최종보스 CHRONOS 격파에 성공했습니다!"
    : bossType === 'arsenal' ? "중간보스 ARSENAL FRAME 격파에 성공했습니다!" : "건담 보스 격파에 성공했습니다!";
  modalScore.innerHTML = `획득 점수: ${score}점`;
  codeRewardArea.style.display = "none";
  restartBtn.textContent = "시작 화면으로";
  resultModal.style.display = "flex";
  Sound.stopBGM();
}

function gameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  update(dt);
  draw();

  requestAnimationFrame(gameLoop);
}

function startGame(mode = 'normal') {
  Sound.init();
  gameMode = mode;

  if (gameMode === 'hard') {
    modeBadge.style.display = 'inline-block';
    modeBadge.style.color = '#ef4444';
    modeBadge.textContent = '[하드]';
  } else if (gameMode === 'infinite') {
    modeBadge.style.display = 'inline-block';
    modeBadge.style.color = '#c084fc';
    modeBadge.textContent = '[무한]';
  } else {
    modeBadge.style.display = 'none';
  }

  startScreen.style.display = "none";
  resultModal.style.display = "none";
  uiLayer.style.display = "flex";
  resetGameData();
  gameState = 'playing';

  if (gameMode === 'bossrush') { BossRush.start(); return; }
  Sound.playBGM('normal');
}

function startBossPractice(type) {
  Sound.init();
  gameMode = 'practice_' + type;

  const badge = {
    mini: { color: '#f59e0b', text: '[미니보스전]', phase: 4 },
    laser: { color: '#f472b6', text: '[레이저보스전]', phase: 5 },
    final: { color: '#ec4899', text: '[건담보스전]', phase: 7 },
    arsenal: { color: '#fbbf24', text: '[ARSENAL FRAME 중간보스전]', phase: 8 },
    warship: { color: '#ef4444', text: '[전함보스전]', phase: 7 },
    chronos: { color: '#c4b5fd', text: '[크로노스 최종보스전]', phase: 9 }
  }[type];
  modeBadge.style.display = 'inline-block';
  modeBadge.style.color = badge.color;
  modeBadge.textContent = badge.text;

  startScreen.style.display = "none";
  resultModal.style.display = "none";
  uiLayer.style.display = "flex";
  resetGameData();

  currentPhase = badge.phase;
  if (type === 'arsenal') {
    // 8분 목표 스펙에서 소환체 상성과 패턴을 바로 검증할 수 있는 기준 세팅.
    player.baseDamage = 6;
    player.speedLevel = 6;
    player.baseBulletCount = 6;
    player.weaponLevel = 8;
    player.weaponType = 'laser';
    resetWeaponRuntimeState();
  }
  gameState = 'playing';

  if (type === 'mini') {
    miniBossSpawned = true;
    BossManager.spawnMiniBoss();
  } else if (type === 'laser') {
    miniBossSpawned = true;
    BossManager.spawnLaserBoss();
  } else if (type === 'final') {
    finalBossSpawned = true;
    BossManager.spawnFinalBoss();
  } else if (type === 'warship') {
    finalBossSpawned = true;
    BossManager.spawnWarshipBoss();
  } else if (type === 'chronos') {
    finalBossSpawned = true;
    BossManager.spawnChronosBoss();
  } else if (type === 'arsenal') {
    gundamBossSpawned = true;
    BossManager.spawnArsenalBoss();
  }
}

function resetGameData() {
  BossRush.reset();
  score = 0;
  secScoreTimer = 0;
  enemyTimer = 0;
  obsTimer = 0;
  itemTimer = 0;
  hardItemSegmentIndex = 0;
  hardItemDropCount = 0;
  droneShootTimer = 0;
  blackHoleShootTimer = 0;
  weaponAnimTime = 0;
  nukeFlashAlpha = 0;

  killsSinceElite = 0;
  timeSinceElite = 0;
  queuedElites = 0;

  miniBossSpawned = false;
  gundamBossSpawned = false;
  finalBossSpawned = false;
  lastInfiniteBossTime = 0;

  if (gameMode === 'hard') {
    gameTime = 0;
    currentPhase = 2;
  } else {
    gameTime = 0;
    currentPhase = 1;
  }

  basicSinceBomb = 0;
  targetBomb = 8;
  basicSinceCore = 0;
  targetCore = 5;
  coreCycle = 0;

  keys.w = false; keys.a = false; keys.s = false; keys.d = false;
  keys.ArrowUp = false; keys.ArrowLeft = false; keys.ArrowDown = false; keys.ArrowRight = false;

  player.x = width / 2;
  player.y = height * 0.75;
  player.targetX = player.x;
  player.targetY = player.y;
  player.knockbackVx = 0;
  player.knockbackVy = 0;
  player.hp = player.maxHp;
  player.shield = 0;
  player.invincibleTimer = 0;
  player.superInvincibleTimer = 0;

  player.baseDamage = 1.0;
  player.speedLevel = 1;
  player.baseBulletCount = 1;

  // 일반/하드/무한 모드는 ROADOUT에서 선택한 무장으로 Lv.1 시작
  const canUseRoadout = ['normal', 'hard', 'infinite'].includes(gameMode) && localStorage.getItem('unlocked_roadout') === 'true';
  player.weaponType = canUseRoadout && START_WEAPONS.includes(selectedStartWeapon) ? selectedStartWeapon : 'default';
  player.weaponLevel = 1;
  player.shootCooldown = 0;

  player.laserTimer = 0;
  player.laserAngle = -Math.PI / 2;
  player.laserStartAngle = -Math.PI / 2;
  player.isLaserFiring = false;
  player.pulseChargeTimer = 0;
  player.pulseTickTimer = 0;
  player.blackHoleShootTimer = 0;
  player.lightningBladeTimer = 0;
  player.lightningThrowTimer = 0;
  player.angle = -Math.PI / 2;

  gundam.active = false;
  gundam.beamFired = false;
  gundam.beamAlpha = 0;

  bullets = [];
  enemyBullets = [];
  enemies = [];
  obstacles = [];
  items = [];
  particles = [];
  floatingTexts = [];
  pulseRings = [];

  isPaused = false;
  if (pauseModal) pauseModal.style.display = 'none';
  if (adminOpen) setAdminOpen(false);
  BossManager.reset();
  updateHpUI();
  lastTime = performance.now();
}

secretTrigger.addEventListener('click', () => {
  Sound.init();
  secretModal.style.display = 'flex';
  secretInput.value = '';
  secretInput.focus();
});

secretCloseBtn.addEventListener('click', () => {
  secretModal.style.display = 'none';
});

secretSubmitBtn.addEventListener('click', () => {
  const code = secretInput.value.trim().toLowerCase();
  if (code === 'roadout') {
    Sound.playUpgrade();
    secretModal.style.display = 'none';
    unlockLoadoutSelector(true);
  } else if (code === 'bossrush') {
    Sound.playUpgrade();
    secretModal.style.display = 'none';
    localStorage.setItem('unlocked_bossrush', 'true');
    document.getElementById('bossrush-btn').style.display = 'block';
    showFloatingText('BOSS RUSH 해금!', width / 2, height * 0.38, '#67e8f9');
    document.getElementById('bossrush-btn').focus();
  } else if (code === 'gundam') {
    Sound.playUpgrade();
    secretModal.style.display = 'none';
    hardBtn.style.display = 'block';
    localStorage.setItem('unlocked_hard', 'true');
    alert("🔥 [하드 모드] 프로토콜이 해금되었습니다!\n2페이즈부터 시작하며 5분 미니보스, 8분 건담급 보스, 12분 최종보스가 등장합니다.");
  } else if (code === 'infinite') {
    Sound.playUpgrade();
    secretModal.style.display = 'none';
    infiniteBtn.style.display = 'block';
    localStorage.setItem('unlocked_infinite', 'true');
    alert("🌌 [무한 모드] 프로토콜이 해금되었습니다!\n5분 주기로 미니 보스와 최종 보스가 연속 출현합니다.");
  } else if (code === 'miniboss') {
    Sound.playUpgrade();
    secretModal.style.display = 'none';
    testMinibossBtn.style.display = 'block';
    localStorage.setItem('unlocked_miniboss', 'true');
    alert("🛸 [미니 보스전] 단독 테스트 버튼이 해금되었습니다!");
  } else if (code === 'laserboss') {
    Sound.playUpgrade();
    secretModal.style.display = 'none';
    testLaserbossBtn.style.display = 'block';
    localStorage.setItem('unlocked_laserboss', 'true');
    alert("🔺 [레이저 보스전] 단독 테스트 버튼이 해금되었습니다!");
  } else if (code === 'warshipboss') {
    Sound.playUpgrade();
    secretModal.style.display = 'none';
    testWarshipbossBtn.style.display = 'block';
    localStorage.setItem('unlocked_warshipboss', 'true');
    alert("🚢 [전함 보스전] 단독 테스트 버튼이 해금되었습니다!");
  } else if (code === 'chronosboss') {
    Sound.playUpgrade();
    secretModal.style.display = 'none';
    testChronosbossBtn.style.display = 'block';
    localStorage.setItem('unlocked_chronosboss', 'true');
    alert("⏳ [CHRONOS 보스전] 단독 테스트 버튼이 해금되었습니다!");
  } else if (code === 'arsenalboss') {
    Sound.playUpgrade();
    secretModal.style.display = 'none';
    testArsenalbossBtn.style.display = 'block';
    localStorage.setItem('unlocked_arsenalboss', 'true');
    alert("⚙️ [ARSENAL FRAME 보스전] 단독 테스트 버튼이 해금되었습니다!\n기준 스펙 6/6/6/8로 시작합니다.");
  } else if (code === 'finalboss') {
    Sound.playUpgrade();
    secretModal.style.display = 'none';
    testFinalbossBtn.style.display = 'block';
    localStorage.setItem('unlocked_finalboss', 'true');
    alert("🤖 [최종 보스전] 단독 테스트 버튼이 해금되었습니다!");
  } else {
    alert("유효하지 않은 프로토콜입니다.");
  }
});

if (localStorage.getItem('unlocked_hard') === 'true') {
  hardBtn.style.display = 'block';
}
if (localStorage.getItem('unlocked_infinite') === 'true') {
  infiniteBtn.style.display = 'block';
}
if (localStorage.getItem('unlocked_miniboss') === 'true') {
  testMinibossBtn.style.display = 'block';
}
if (localStorage.getItem('unlocked_laserboss') === 'true') {
  testLaserbossBtn.style.display = 'block';
}
if (localStorage.getItem('unlocked_finalboss') === 'true') {
  testFinalbossBtn.style.display = 'block';
}
if (localStorage.getItem('unlocked_warshipboss') === 'true') {
  testWarshipbossBtn.style.display = 'block';
}
if (localStorage.getItem('unlocked_chronosboss') === 'true') {
  testChronosbossBtn.style.display = 'block';
}
if (localStorage.getItem('unlocked_arsenalboss') === 'true') {
  testArsenalbossBtn.style.display = 'block';
}

if (localStorage.getItem('unlocked_roadout') === 'true') {
  unlockLoadoutSelector(false);
}
if (loadoutPrevBtn) loadoutPrevBtn.addEventListener('click', () => setSelectedStartWeapon(-1));
if (loadoutNextBtn) loadoutNextBtn.addEventListener('click', () => setSelectedStartWeapon(1));

startBtn.addEventListener('click', () => startGame('normal'));
hardBtn.addEventListener('click', () => startGame('hard'));
infiniteBtn.addEventListener('click', () => startGame('infinite'));
testMinibossBtn.addEventListener('click', () => startBossPractice('mini'));
testLaserbossBtn.addEventListener('click', () => startBossPractice('laser'));
testFinalbossBtn.addEventListener('click', () => startBossPractice('final'));
testWarshipbossBtn.addEventListener('click', () => startBossPractice('warship'));
testChronosbossBtn.addEventListener('click', () => startBossPractice('chronos'));
testArsenalbossBtn.addEventListener('click', () => startBossPractice('arsenal'));

restartBtn.addEventListener('click', () => {
  if (BossRush.active) { BossRush.cleanupField(); BossRush.reset(); }
  if (adminOpen) setAdminOpen(false);
  togglePause(false);
  // 결과 화면에 머무는 동안에도 이전 보스 상태가 남지 않도록 한 번 더 정리한다.
  // startGame/startBossPractice의 초기화 전에 실행되어 재시작 모드와 무관하게 안전하다.
  if (typeof BossManager !== 'undefined') BossManager.reset();
  resultModal.style.display = "none";
  uiLayer.style.display = "none";
  startScreen.style.display = "flex";
  gameState = 'ready';
  Sound.stopBGM();
});

// ===== 관리자 모드 =====
let adminOpen = false;
const adminPanel = document.getElementById('admin-panel');
const adminStatsEl = document.getElementById('admin-stats');
const adminCloseBtn = document.getElementById('admin-close-btn');
const adminBossDeleteBtn = document.getElementById('admin-boss-delete');

const clampNum = (v, min, max) => Math.max(min, Math.min(max, v));

const ADMIN_STATS = [
  { key: 'hp', label: '체력', get: () => player.hp,
    set: v => { player.hp = clampNum(v, 1, player.maxHp); updateHpUI(); } },
  { key: 'shield', label: '보호막', get: () => player.shield,
    set: v => { player.shield = clampNum(v, 0, getMaxShield()); updateHpUI(); } },
  { key: 'baseDamage', label: '공격력', get: () => +player.baseDamage.toFixed(1),
    set: v => { player.baseDamage = Math.max(1, v); } },
  { key: 'speedLevel', label: '연사 레벨', get: () => player.speedLevel,
    set: v => { player.speedLevel = Math.max(1, v); } },
  { key: 'baseBulletCount', label: '탄환 수 (최대 10)', get: () => player.baseBulletCount,
    set: v => { player.baseBulletCount = clampNum(v, 1, 10); } },
  { key: 'weaponLevel', label: '무기 레벨', get: () => player.weaponLevel,
    set: v => { player.weaponLevel = clampNum(v, 1, 8); } }
];

function adminStatRow(def, group) {
  return `<div class="admin-stat">
    <span class="admin-label">${def.label}</span>
    <button class="admin-btn admin-step" data-group="${group}" data-key="${def.key}" data-delta="-1">−</button>
    <span class="admin-val" data-val="${group}:${def.key}">${def.get()}</span>
    <button class="admin-btn admin-step" data-group="${group}" data-key="${def.key}" data-delta="1">+</button>
  </div>`;
}

function renderAdminPanel() {
  BossRush.updateDebug();
  adminStatsEl.innerHTML = ADMIN_STATS.map(d => adminStatRow(d, 'stat')).join('');
  const hasBoss = !!BossManager.activeBoss;
  adminBossDeleteBtn.disabled = !hasBoss;
  adminBossDeleteBtn.style.opacity = hasBoss ? '1' : '0.4';
  for (const btn of adminPanel.querySelectorAll('[data-boss]')) {
    btn.disabled = hasBoss;
    btn.style.opacity = hasBoss ? '0.4' : '1';
  }
}

function refreshAdminValues() {
  for (const d of ADMIN_STATS) {
    const el = adminPanel.querySelector(`[data-val="stat:${d.key}"]`);
    if (el) el.textContent = d.get();
  }
}

function isAdminAvailable() {
  return (gameMode.startsWith('practice_') || BossRush.active) && gameState === 'playing';
}

function setAdminOpen(open) {
  if (open && !isAdminAvailable()) return;
  adminOpen = open;
  adminPanel.classList.toggle('open', open);
  if (open) {
    for (const k in keys) keys[k] = false;
    handleTouchEnd();
    isMouseDown = false;
    joystickEnd();
    renderAdminPanel();
  } else {
    lastTime = performance.now();
  }
}

function adminEquipWeapon(kind) {
  player.weaponType = kind;
  player.shootCooldown = 0;
  player.laserTimer = 0;
  player.isLaserFiring = false;
  player.pulseChargeTimer = 0;
  player.lightningBladeTimer = 0;
  player.lightningThrowTimer = 0;
  lightningBlades = [];
  chainLightning = [];
  chainHitMarkers = [];
  lightningOrbitPhase = 0;
  showFloatingText(`[관리자] 무장: ${kind === 'default' ? '기본' : WEAPON_META[kind].name}`, player.x, player.y - 20 * scale, '#38bdf8');
}

function adminSpawnItem(kind) {
  const basicMap = {
    heal: { shape: 'circle', kind: 'heal', color: '#2ecc71', label: 'HP+', name: '체력 / 보호막' },
    dmg: { shape: 'circle', kind: 'dmg', color: '#ff6b6b', label: 'DMG', name: '화력 강화' },
    count: { shape: 'circle', kind: 'count', color: '#38bdf8', label: 'WAY', name: '탄환 추가' },
    spd: { shape: 'circle', kind: 'spd', color: '#f1c40f', label: 'SPD', name: '연사 가속' },
    bomb: { shape: 'circle', kind: 'bomb', color: '#ffd32a', label: 'BOMB', name: '필드 클리어 폭탄!' },
    lvup: { shape: 'square', kind: 'lvup', color: '#67e8f9', label: 'LV+', name: '무기 레벨업 코어' }
  };
  let itemData;
  if (kind === 'roulette') {
    const roulettePool = ['omni', 'laser', 'drone', 'pulse', 'blackhole', 'flame', 'lightning'];
    const initialKind = roulettePool[0];
    itemData = {
      shape: 'square', kind: initialKind,
      color: WEAPON_META[initialKind].color, label: WEAPON_META[initialKind].label, name: WEAPON_META[initialKind].name,
      isRoulette: true, rouletteTimer: 2.0, rouletteInterval: 2.0, roulettePool, rouletteIndex: 0
    };
  } else {
    itemData = basicMap[kind];
  }
  if (!itemData) return;

  items.push({
    x: clampNum(player.x, 20 * scale, width - 20 * scale),
    y: clampNum(player.y - 60 * scale, 20 * scale, height - 20 * scale),
    vx: 0, vy: 0,
    radius: 8.5 * scale,
    isStationary: true,
    ...itemData
  });
}

function adminSpawnBoss(type) {
  if (BossRush.active) { BossRush.spawnFloor(type === 'gundam' ? 'final' : type); renderAdminPanel(); return; }
  if (BossManager.activeBoss) {
    showFloatingText("[관리자] 보스가 이미 있습니다. 먼저 삭제하세요", width / 2, height * 0.35, '#ef4444');
    return;
  }
  if (type === 'mini') BossManager.spawnMiniBoss();
  else if (type === 'laser') BossManager.spawnLaserBoss();
  else if (type === 'gundam') BossManager.spawnFinalBoss();
  else if (type === 'phantom') BossManager.spawnPhantomBoss();
  else if (type === 'warship') BossManager.spawnWarshipBoss();
  else if (type === 'chronos') BossManager.spawnChronosBoss();
  else if (type === 'arsenal') BossManager.spawnArsenalBoss();
  renderAdminPanel();
}

function adminChronosAction(action) {
  const b = BossManager.activeBoss;
  if (!b || BossManager.bossType !== 'chronos') {
    showFloatingText('[관리자] 먼저 CHRONOS를 소환하세요', width / 2, height * 0.35, '#c4b5fd');
    return;
  }
  if (action === 'phase2') BossManager.forceChronosPhase(2);
  else if (action === 'phase3') BossManager.forceChronosPhase(3);
  else if (action === 'ultimate') BossManager.forceChronosEndOfTime();
  else if (action === 'damage') BossManager.takeDamage(Math.max(1, b.maxHp * 0.10), null, '#c4b5fd');
  refreshAdminValues();
}

function adminArsenalAction(action) {
  if (!BossManager.activeBoss || BossManager.bossType !== 'arsenal') {
    showFloatingText('[관리자] 먼저 ARSENAL FRAME을 소환하세요', width / 2, height * 0.35, '#fbbf24');
    return;
  }
  if (action.startsWith('shield-')) BossManager.forceArsenalShield(action.slice(7));
  else if (action.startsWith('weapon-')) BossManager.forceArsenalWeapon(action.slice(7));
  else if (action === 'shift') BossManager.forceArsenalAdaptiveShift();
  else if (action === 'overload') BossManager.forceArsenalOverload();
  refreshAdminValues();
}

function adminDeleteBoss() {
  if (BossRush.active) { BossRush.state = 'cleared'; setAdminOpen(false); BossRush.enterReward(); return; }
  if (!BossManager.activeBoss) return;
  const b = BossManager.activeBoss;
  addExplosion(b.x, b.y, '#facc15', 30);
  BossManager.reset();
  showFloatingText("[관리자] 보스 삭제", width / 2, height * 0.35, '#38bdf8');
  renderAdminPanel();
}

adminPanel.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;

  if (btn.dataset.group) {
    const list = ADMIN_STATS;
    const def = list.find(d => d.key === btn.dataset.key);
    if (def) def.set(def.get() + Number(btn.dataset.delta));
    refreshAdminValues();
  } else if (btn.dataset.equip) {
    adminEquipWeapon(btn.dataset.equip);
    refreshAdminValues();
  } else if (btn.dataset.item) {
    adminSpawnItem(btn.dataset.item);
  } else if (btn.dataset.elite) {
    spawnElite(Number(btn.dataset.elite));
  } else if (btn.dataset.boss) {
    adminSpawnBoss(btn.dataset.boss);
  } else if (btn.dataset.chronosAction) {
    adminChronosAction(btn.dataset.chronosAction);
  } else if (btn.dataset.arsenalAction) {
    adminArsenalAction(btn.dataset.arsenalAction);
  }
});
adminCloseBtn.addEventListener('click', () => setAdminOpen(false));
adminBossDeleteBtn.addEventListener('click', adminDeleteBoss);

for (const ev of ['touchstart', 'touchmove', 'touchend', 'mousedown', 'mousemove', 'mouseup']) {
  adminPanel.addEventListener(ev, e => e.stopPropagation(), { passive: false });
}

// [1.6 추가] Esc 키 이벤트 처리 (일시정지 토글 및 열린 모달 닫기)
window.addEventListener('keydown', e => {
  if (gameState === 'ready' && localStorage.getItem('unlocked_roadout') === 'true' && !e.target.closest('input')) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); setSelectedStartWeapon(-1); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); setSelectedStartWeapon(1); return; }
  }
  if (e.key === 'Escape') {
    if (secretModal.style.display === 'flex') {
      secretModal.style.display = 'none';
      return;
    }
    if (adminOpen) {
      setAdminOpen(false);
      return;
    }
    if (gameState === 'playing') {
      togglePause();
    }
    return;
  }

  if (e.key.toLowerCase() === 't' && !e.repeat && isAdminAvailable()) {
    setAdminOpen(!adminOpen);
  }
});

BossRush.init();
fitContainer();
resize();
requestAnimationFrame(gameLoop);
