// Floor progression is isolated from the existing time/phase modes.
const BOSS_RUSH_CONFIG = {
  // Reference: Phase-4 UFO is 3 × 300 HP; use 900 as the initial Rush budget.
  baseHp: 900,
  encounterPhase: 5, // Fixed compatibility baseline for boss summons, never a progression clock.
  startStats: { damage: 3, speed: 3, way: 3, weaponLevel: 4 },
  tierHpMultiplier: { low: 1, mid: 1.65, final: 2.4 },
  floorGrowth: { earlyEnd: 18, midEnd: 30, early: 1.11, mid: 1.08, late: 1.06 },
  damageScaling: { perCycle: 0.05, max: 1.5 },
  individualModifiers: { mini: 1, laser: 1, final: 1, phantom: 1, arsenal: 1, warship: 1, chronos: 1, elitegroup: 1 },
  eliteGroup: { count: 3, hpPerElite: 0.22, bgm: 'elitegroup' },
  // Boss-pattern summons are softened only in Rush. Early floors have fewer
  // rewards, so their durability catches up gradually instead of using the
  // fixed encounter phase at full strength from Floor 1.
  summonHpScaling: [
    { maxFloor: 2, multiplier: 0.55 },
    { maxFloor: 4, multiplier: 0.65 },
    { maxFloor: 6, multiplier: 0.75 },
    { maxFloor: 12, multiplier: 0.88 }
  ],
  weaponLevelMax: 8,
  wayMax: 10,
  rewards: [
    { id: 'ds', icon: '⚔', name: 'D&S BUNDLE', text: '공격력 +1 · 연사 레벨 +1', d: 1, s: 1 },
    { id: 'dw', icon: '✦', name: 'D&W BUNDLE', text: '공격력 +1 · 탄환 수 +1', d: 1, w: 1 },
    { id: 'sw', icon: '➶', name: 'S&W BUNDLE', text: '연사 레벨 +1 · 탄환 수 +1', s: 1, w: 1 },
    { id: 'dd', icon: '⚔', name: 'DOUBLE DAMAGE', text: '공격력 +2', d: 2 },
    { id: 'ss', icon: '»', name: 'DOUBLE SPEED', text: '연사 레벨 +2', s: 2 },
    { id: 'ww', icon: '✦', name: 'DOUBLE WAY', text: '탄환 수 +2 (최대 10)', w: 2 },
    { id: 'level', icon: '⬆', name: 'WEAPON LEVEL UP', text: '현재 무기 레벨 +1 (최대 8)' },
    { id: 'heal', icon: '♥', name: 'RECOVERY ×2', text: '회복 아이템 2개 효과 · 체력 최대 시 보호막' },
    { id: 'roulette', icon: '◇', name: 'ROULETTE CORE', text: '7종 중 무장 선택 · 현재 무기 레벨 유지' }
  ]
};

const BossRush = {
  active: false, floor: 1, state: 'idle', defeated: 0, lastBossByTier: {},
  choices: [], selected: false, damageRemainder: 0, groupMembers: [],
  best: 0, elapsed: 0, restarting: false,

  tierFor(floor) { return ['low', 'low', 'mid', 'mid', 'final', 'final'][(floor - 1) % 6]; },
  cycleFor(floor) { return Math.floor((floor - 1) / 6) + 1; },
  powerFor(floor) {
    const g = BOSS_RUSH_CONFIG.floorGrowth;
    return Math.pow(g.early, Math.min(floor, g.earlyEnd) - 1)
      * Math.pow(g.mid, Math.max(0, Math.min(floor, g.midEnd) - g.earlyEnd))
      * Math.pow(g.late, Math.max(0, floor - g.midEnd));
  },
  damageFor(floor) {
    const d = BOSS_RUSH_CONFIG.damageScaling;
    return Math.min(d.max, 1 + (this.cycleFor(floor) - 1) * d.perCycle);
  },
  summonHpMultiplierFor(floor = this.floor) {
    const band = BOSS_RUSH_CONFIG.summonHpScaling.find(entry => floor <= entry.maxFloor);
    return band ? band.multiplier : 1;
  },
  scaleBossSummons() {
    if (!this.active || this.state !== 'combat' || this.currentType === 'elitegroup') return;
    const multiplier = this.summonHpMultiplierFor();
    for (const enemy of enemies) {
      if (!enemy || enemy.bossRushHpScaled || enemy.isShipUnbreakableDebris) continue;
      enemy.bossRushHpScaled = true;
      if (!Number.isFinite(enemy.maxHp) || enemy.maxHp <= 0) continue;
      const hpRatio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
      enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * multiplier));
      // A summon killed in its spawn frame must stay dead; the low-floor
      // normalization must never revive a pending 0-HP entity.
      enemy.hp = hpRatio <= 0 ? 0 : Math.max(1, Math.round(enemy.maxHp * hpRatio));
    }
  },
  hpFor(floor, type, tier = this.tierFor(floor)) {
    return Math.round(BOSS_RUSH_CONFIG.baseHp * this.powerFor(floor)
      * BOSS_RUSH_CONFIG.tierHpMultiplier[tier]
      * (BOSS_RUSH_CONFIG.individualModifiers[type] ?? 1));
  },
  pools() {
    return { low: [...BossManager.hardBossTiers.mini, ...(ELITE_TYPES.some(entry => entry.bossRushEligible) ? ['elitegroup'] : [])],
      mid: [...BossManager.hardBossTiers.gundam], final: [...BossManager.hardBossTiers.final] };
  },
  pick(tier) {
    const pool = this.pools()[tier];
    const choices = pool.length > 1 ? pool.filter(type => type !== this.lastBossByTier[tier]) : pool;
    const type = choices[Math.floor(Math.random() * choices.length)];
    this.lastBossByTier[tier] = type;
    return type;
  },
  init() {
    this.overlay = document.getElementById('rush-modal');
    this.cards = document.getElementById('rush-cards');
    this.title = document.getElementById('rush-title');
    this.subtitle = document.getElementById('rush-subtitle');
    this.best = Math.max(0, Number(localStorage.getItem('bossrush_highest_floor')) || 0);
    const button = document.getElementById('bossrush-btn');
    button.style.display = localStorage.getItem('unlocked_bossrush') === 'true' ? 'block' : 'none';
    button.addEventListener('click', () => startGame('bossrush'));
    this.cards.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button || button.disabled) return;
      if (button.dataset.rushWeapon) this.chooseWeapon(button.dataset.rushWeapon);
      else if (button.dataset.rushReward) this.chooseReward(button.dataset.rushReward);
    });
    for (const type of ['touchstart', 'touchmove', 'touchend', 'mousedown', 'mouseup', 'click']) {
      this.overlay.addEventListener(type, event => event.stopPropagation());
    }
    document.getElementById('rush-menu').addEventListener('click', () => {
      this.cleanupField(); this.reset();
      gameState = 'ready'; uiLayer.style.display = 'none'; startScreen.style.display = 'flex';
      Sound.stopBGM();
    });
    document.getElementById('rush-retry').addEventListener('click', () => this.retry());
    document.getElementById('rush-debug-go').addEventListener('click', () => {
      if (!this.active) return;
      const value = Number(document.getElementById('rush-debug-floor').value);
      if (!Number.isFinite(value)) return;
      this.floor = Math.max(1, Math.min(999, Math.floor(value)));
      this.spawnFloor(document.getElementById('rush-debug-boss').value || null);
      this.updateDebug();
    });
    document.getElementById('rush-debug-reward').addEventListener('click', () => {
      if (this.active) { this.state = 'cleared'; setAdminOpen(false); this.enterReward(); }
    });
  },
  reset() {
    this.active = false; this.floor = 1; this.state = 'idle'; this.defeated = 0;
    this.choices = []; this.selected = false; this.lastBossByTier = {};
    this.damageRemainder = 0; this.groupMembers = []; this.elapsed = 0;
    this.currentType = null; this.currentTier = null;
    if (this.overlay) this.overlay.style.display = 'none';
    document.getElementById('rush-retry').style.display = 'none';
    document.getElementById('rush-debug').style.display = 'none';
  },
  retry() {
    // A retry is initiated while the previous run is still in the Boss Rush
    // game-over state. Clear that run before startGame rebuilds the common
    // game state, and lock the route so a double tap cannot start two runs.
    if (this.restarting) return;
    this.restarting = true;
    try {
      this.cleanupField();
      if (adminOpen) setAdminOpen(false);
      isPaused = false;
      gameState = 'ready';
      startGame('bossrush');
    } finally {
      this.restarting = false;
    }
  },
  start() {
    this.active = true;
    const stats = BOSS_RUSH_CONFIG.startStats;
    player.baseDamage = stats.damage; player.speedLevel = stats.speed;
    player.baseBulletCount = stats.way; player.weaponLevel = stats.weaponLevel;
    currentPhase = BOSS_RUSH_CONFIG.encounterPhase;
    this.startBest = this.best;
    this.showWeaponChoice(true);
    this.updateHud();
  },
  cleanupField() {
    BossManager.reset();
    enemies = []; enemyBullets = []; obstacles = []; bullets = []; items = [];
    pulseRings = []; flameParticles = []; chainLightning = []; chainHitMarkers = []; lightningBlades = [];
    particles = []; floatingTexts = [];
    killsSinceElite = 0; timeSinceElite = 0; queuedElites = 0;
    resetWeaponRuntimeState(); player.pulseTickTimer = 0;
    player.knockbackVx = 0; player.knockbackVy = 0;
    for (const key in keys) keys[key] = false;
    handleTouchEnd(); joystickEnd(); isMouseDown = false;
    player.targetX = player.x; player.targetY = player.y;
    this.groupMembers = [];
  },
  showWeaponChoice(initial = false) {
    this.state = initial ? 'startWeapon' : 'rewardWeapon'; this.selected = false;
    this.title.textContent = initial ? 'BOSS RUSH · 출격 무장' : 'ROULETTE CORE';
    this.subtitle.textContent = `7종 중 1개 선택 · 무기 Lv.${player.weaponLevel} 유지 · 시간 제한 없음`;
    this.cards.classList.add('rush-weapons');
      // The field roulette has no modal: reuse its seven-weapon pool and equip function.
    this.cards.innerHTML = START_WEAPONS.filter(type => type !== 'default').map(type => {
      const meta = WEAPON_META[type];
      return `<button class="rush-card" data-rush-weapon="${type}" style="--reward-color:${meta.color}"><span class="rush-icon">${meta.label}</span><strong>${meta.name}</strong><span>${START_WEAPON_DESCRIPTIONS[type]}</span></button>`;
    }).join('');
    this.openOverlay();
  },
  openOverlay() {
    this.overlay.style.display = 'flex';
    const first = this.cards.querySelector('button');
    if (first) first.focus();
  },
  lockCards() {
    this.selected = true;
    for (const card of this.cards.querySelectorAll('button')) card.disabled = true;
  },
  chooseWeapon(type) {
    if (!this.active || this.selected || !['startWeapon', 'rewardWeapon'].includes(this.state)
      || !START_WEAPONS.includes(type) || type === 'default') return;
    const initial = this.state === 'startWeapon';
    this.lockCards();
    const level = player.weaponLevel;
    // Preserve level even for a same-weapon selection (no implicit level-up reward).
    if (player.weaponType !== type) equipWeapon(type, WEAPON_META[type].color, WEAPON_META[type].name);
    player.weaponLevel = level;
    resetWeaponRuntimeState();
    if (!initial) this.floor++;
    this.spawnFloor();
  },
  spawnFloor(forcedType = null) {
    this.cleanupField();
    currentPhase = BOSS_RUSH_CONFIG.encounterPhase;
    this.overlay.style.display = 'none';
    this.currentTier = this.tierFor(this.floor);
    this.currentType = forcedType || this.pick(this.currentTier);
    if (forcedType) this.currentTier = Object.keys(this.pools()).find(tier => this.pools()[tier].includes(forcedType)) || this.currentTier;
    this.hpBudget = this.hpFor(this.floor, this.currentType, this.currentTier);
    this.state = 'combat';
    player.x = width / 2; player.y = height * 0.78;
    player.targetX = player.x; player.targetY = player.y;
    this.best = Math.max(this.best, this.floor);
    localStorage.setItem('bossrush_highest_floor', String(this.best));
    if (this.currentType === 'elitegroup') this.spawnEliteGroup();
    else {
      BossManager.spawnBossByType(this.currentType);
      const boss = BossManager.activeBoss;
      const ratio = this.hpBudget / boss.maxHp;
      if (boss.parts) {
        for (const part of Object.values(boss.parts)) part.hp = part.maxHp = Math.max(1, Math.round(part.maxHp * ratio));
        boss.hp = boss.maxHp = Object.values(boss.parts).reduce((sum, part) => sum + part.maxHp, 0);
      } else boss.hp = boss.maxHp = this.hpBudget;
      boss.bossRushFloor = this.floor;
    }
    this.updateHud();
    showFloatingText(`FLOOR ${this.floor} · ${this.currentTier.toUpperCase()}`, width / 2, height * 0.40, '#67e8f9');
    lastTime = performance.now();
  },
  spawnEliteGroup() {
    const pool = ELITE_TYPES.filter(entry => entry.bossRushEligible);
    const unused = [...pool];
    for (let i = 0; i < BOSS_RUSH_CONFIG.eliteGroup.count; i++) {
      if (!unused.length) unused.push(...pool);
      const definition = unused.splice(Math.floor(Math.random() * unused.length), 1)[0];
      const index = enemies.length;
      spawnElite(definition.id);
      const members = enemies.slice(index);
      const originalHp = members.reduce((sum, enemy) => sum + enemy.maxHp, 0);
      const budget = this.hpBudget * BOSS_RUSH_CONFIG.eliteGroup.hpPerElite;
      const groupId = `${this.floor}:${i}`;
      const anchor = members[0];
      const dx = width * (0.2 + i * 0.3) - anchor.x;
      const dy = height * (i === 1 ? 0.18 : 0.30) - anchor.y;
      for (const member of members) {
        member.x += dx; member.y += dy;
        member.hp = member.maxHp = Math.max(1, Math.round(budget * member.maxHp / originalHp));
        member.rushGroupId = groupId;
        this.groupMembers.push(member);
      }
    }
    BossManager.showBossBar('LOW BOSS : ELITE GROUP');
    Sound.playBGM(BOSS_RUSH_CONFIG.eliteGroup.bgm);
  },
  // Called at the start of update, before any entity iteration can be invalidated by cleanup.
  update(dt) {
    if (!this.active) return false;
    this.scaleBossSummons();
    if (this.state === 'combat' && this.currentType === 'elitegroup') {
      const survivors = enemies.filter(enemy => enemy.rushGroupId);
      if (!survivors.length) this.onDefeated();
      else {
        const remaining = new Set(survivors.map(enemy => enemy.rushGroupId)).size;
        const hp = survivors.reduce((sum, enemy) => sum + Math.max(0, enemy.hp), 0);
        BossManager.bossNameEl.textContent = `LOW BOSS : ELITE GROUP · ${remaining}/3`;
        BossManager.bossHpFill.style.width = `${Math.min(100, hp / (this.hpBudget * BOSS_RUSH_CONFIG.eliteGroup.count * BOSS_RUSH_CONFIG.eliteGroup.hpPerElite) * 100)}%`;
      }
    }
    if (this.state === 'cleared') this.enterReward();
    if (this.state !== 'combat') return true;
    this.elapsed += dt;
    this.updateHud();
    return false;
  },
  onDefeated() {
    if (!this.active || this.state !== 'combat') return;
    this.defeated++; this.state = 'cleared';
  },
  enterReward() {
    this.cleanupField();
    Sound.stopBGM();
    this.state = 'reward'; this.selected = false;
    this.choices = this.validRewards();
    for (let i = this.choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.choices[i], this.choices[j]] = [this.choices[j], this.choices[i]];
    }
    this.choices = this.choices.slice(0, 3);
    this.title.textContent = `FLOOR ${this.floor} CLEARED`;
    this.subtitle.textContent = 'CHOOSE ONE REWARD · 3개 중 하나 선택 · 시간 제한 없음';
    this.cards.classList.remove('rush-weapons');
    this.cards.innerHTML = this.choices.map(reward => `<button class="rush-card" data-rush-reward="${reward.id}"><span class="rush-icon">${reward.icon}</span><strong>${reward.name}</strong><span>${reward.text}</span></button>`).join('');
    this.openOverlay();
  },
  validRewards() {
    return BOSS_RUSH_CONFIG.rewards.filter(reward => {
      if (reward.id === 'level') return player.weaponLevel < BOSS_RUSH_CONFIG.weaponLevelMax;
      if (reward.d || reward.s) return true;
      if (reward.w) return player.baseBulletCount < BOSS_RUSH_CONFIG.wayMax;
      if (reward.id === 'heal') return player.hp < player.maxHp || player.shield < getMaxShield();
      return true;
    });
  },
  chooseReward(id) {
    if (!this.active || this.state !== 'reward' || this.selected) return;
    const reward = this.choices.find(entry => entry.id === id);
    if (!reward) return;
    this.lockCards();
    player.baseDamage += reward.d || 0;
    player.speedLevel += reward.s || 0;
    player.baseBulletCount = Math.min(BOSS_RUSH_CONFIG.wayMax, player.baseBulletCount + (reward.w || 0));
    if (id === 'level') player.weaponLevel = Math.min(BOSS_RUSH_CONFIG.weaponLevelMax, player.weaponLevel + 1);
    if (id === 'heal') { applyHealItem(); applyHealItem(); }
    if (id === 'roulette') { this.showWeaponChoice(false); return; }
    Sound.playUpgrade();
    this.floor++; this.spawnFloor();
  },
  resolveDamage(amount) {
    // Integer HP with a carried fractional remainder: +5% per cycle remains meaningful.
    const value = amount * this.damageFor(this.floor) + this.damageRemainder;
    const result = Math.floor(value + 1e-9);
    this.damageRemainder = value - result;
    return result;
  },
  updateHud() {
    modeBadge.style.display = 'inline-block'; modeBadge.style.color = '#67e8f9';
    modeBadge.textContent = `FLOOR ${this.floor} · CYCLE ${this.cycleFor(this.floor)}`;
    timeDisplay.textContent = `${String(Math.floor(this.elapsed / 60)).padStart(2, '0')}:${String(Math.floor(this.elapsed % 60)).padStart(2, '0')}`;
    scoreDisplay.textContent = score;
  },
  gameOver() {
    this.state = 'gameover';
    this.overlay.style.display = 'none';
    modalTitle.textContent = 'BOSS RUSH · 작전 종료';
    modalSub.textContent = this.floor > this.startBest ? 'NEW RECORD' : '다음 등반에 도전하세요.';
    modalScore.innerHTML = `REACHED FLOOR: ${this.floor}<br>최고 기록: ${this.best} · 처치 보스: ${this.defeated}<br>CYCLE ${this.cycleFor(this.floor)}`;
    document.getElementById('rush-retry').style.display = 'block';
    restartBtn.textContent = '시작 화면으로';
  },
  updateDebug() {
    document.getElementById('rush-debug').style.display = this.active ? 'block' : 'none';
    if (!this.active) return;
    document.getElementById('rush-debug-info').textContent = `FLOOR ${this.floor} / CYCLE ${this.cycleFor(this.floor)} / ${this.currentTier || 'LOW'}\nPower ${this.powerFor(this.floor).toFixed(3)} / HP ${this.hpBudget || 0}\nTier ×${BOSS_RUSH_CONFIG.tierHpMultiplier[this.currentTier] || 1} / Boss ×${BOSS_RUSH_CONFIG.individualModifiers[this.currentType] || 1}\nDamage ×${this.damageFor(this.floor).toFixed(2)}`;
  }
};
