const player = {
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,
  knockbackVx: 0,
  knockbackVy: 0,
  radius: 9,
  speed: 270,
  angle: -Math.PI / 2,
  maxHp: 5,
  hp: 5,
  shield: 0,
  maxShield: 2,
  invincibleTimer: 0,
  superInvincibleTimer: 0,

  baseDamage: 1.0,
  speedLevel: 1,
  baseBulletCount: 1,

  weaponType: 'default',
  weaponLevel: 1,

  shootCooldown: 0,
  laserTimer: 0,
  laserAngle: 0,
  laserStartAngle: 0,
  isLaserFiring: false,

  pulseChargeTimer: 0,
  pulseTickTimer: 0,
  pulseDisableTimer: 0,
  blackHoleShootTimer: 0,
  lightningBladeTimer: 0,
  lightningThrowTimer: 0
};

const keys = {
  w: false, a: false, s: false, d: false,
  ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false
};

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k in keys) keys[k] = true;
  if (e.key in keys) keys[e.key] = true;
});
window.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (k in keys) keys[k] = false;
  if (e.key in keys) keys[e.key] = false;
});

function toLocal(clientX, clientY) {
  const rect = container.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function setMoveTargetFromClient(clientX, clientY) {
  const p = toLocal(clientX, clientY);
  player.targetX = Math.max(player.radius, Math.min(width - player.radius, p.x));
  player.targetY = Math.max(player.radius, Math.min(height - player.radius, p.y));
}

const joystick = {
  active: false,
  originX: 0, originY: 0,
  curX: 0, curY: 0,
  dirX: 0, dirY: 0,
  strength: 0,
  maxRadius: 55,
  deadZone: 0.12
};
let joystickMode = localStorage.getItem('joystick_pc') === 'true';

function joystickStart(clientX, clientY) {
  const p = toLocal(clientX, clientY);
  joystick.active = true;
  joystick.originX = p.x; joystick.originY = p.y;
  joystick.curX = p.x; joystick.curY = p.y;
  joystick.dirX = 0; joystick.dirY = 0; joystick.strength = 0;
}

function joystickMove(clientX, clientY) {
  if (!joystick.active) return;
  const p = toLocal(clientX, clientY);
  const maxR = joystick.maxRadius * scale;
  let dx = p.x - joystick.originX;
  let dy = p.y - joystick.originY;
  const dist = Math.hypot(dx, dy);

  if (dist > maxR) {
    dx = dx / dist * maxR;
    dy = dy / dist * maxR;
  }
  joystick.curX = joystick.originX + dx;
  joystick.curY = joystick.originY + dy;

  const ratio = Math.min(1, dist / maxR);
  if (ratio < joystick.deadZone || dist === 0) {
    joystick.dirX = 0; joystick.dirY = 0; joystick.strength = 0;
  } else {
    joystick.dirX = dx / Math.hypot(dx, dy);
    joystick.dirY = dy / Math.hypot(dx, dy);
    joystick.strength = ratio;
  }
}

function joystickEnd() {
  joystick.active = false;
  joystick.dirX = 0; joystick.dirY = 0; joystick.strength = 0;
}

function setJoystickMode(on) {
  joystickMode = on;
  localStorage.setItem('joystick_pc', on ? 'true' : 'false');
  joystickEnd();
  if (typeof showFloatingText === 'function' && width > 0) {
    showFloatingText(on ? "🕹️ 조이스틱 모드 ON" : "🖱️ 클릭 이동 모드", width / 2, height * 0.5, '#38bdf8');
  }
}

let activeTouchId = null;

function handleTouchStart(e) {
  if (gameState !== 'playing' || (typeof isPaused !== 'undefined' && isPaused) || activeTouchId !== null) return;
  if (e.target.closest('button, input')) return;
  const t = e.changedTouches[0];
  if (!Sound.initialized) Sound.init();
  activeTouchId = t.identifier;
  joystickStart(t.clientX, t.clientY);
}

function handleTouchMove(e) {
  if (activeTouchId === null || gameState !== 'playing' || (typeof isPaused !== 'undefined' && isPaused)) return;
  for (const t of e.changedTouches) {
    if (t.identifier === activeTouchId) {
      joystickMove(t.clientX, t.clientY);
      break;
    }
  }
}

function handleTouchEnd(e) {
  if (!e) { activeTouchId = null; joystickEnd(); return; }
  for (const t of e.changedTouches) {
    if (t.identifier === activeTouchId) {
      activeTouchId = null;
      joystickEnd();
      break;
    }
  }
}

window.addEventListener('touchstart', handleTouchStart, { passive: false });
window.addEventListener('touchmove', e => {
  e.preventDefault();
  handleTouchMove(e);
}, { passive: false });
window.addEventListener('touchend', handleTouchEnd);
window.addEventListener('touchcancel', handleTouchEnd);

let isMouseDown = false;

window.addEventListener('mousedown', e => {
  if (e.button !== 0 || gameState !== 'playing' || (typeof isPaused !== 'undefined' && isPaused)) return;
  if (e.target.closest('button, input')) return;
  if (!Sound.initialized) Sound.init();
  isMouseDown = true;
  if (joystickMode) joystickStart(e.clientX, e.clientY);
  else setMoveTargetFromClient(e.clientX, e.clientY);
});
window.addEventListener('mousemove', e => {
  if (!isMouseDown || gameState !== 'playing' || (typeof isPaused !== 'undefined' && isPaused)) return;
  if (joystickMode) joystickMove(e.clientX, e.clientY);
  else setMoveTargetFromClient(e.clientX, e.clientY);
});
window.addEventListener('mouseup', () => { isMouseDown = false; if (activeTouchId === null) joystickEnd(); });
window.addEventListener('blur', () => { isMouseDown = false; if (activeTouchId === null) joystickEnd(); });

window.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'j' && !e.repeat && !e.target.closest('input')) {
    setJoystickMode(!joystickMode);
  }
});

function distToSegment(p1, p2, p) {
  const l2 = (p2.x - p1.x)**2 + (p2.y - p1.y)**2;
  if (l2 === 0) return Math.hypot(p.x - p1.x, p.y - p1.y);
  let t = ((p.x - p1.x) * (p2.x - p1.x) + (p.y - p1.y) * (p2.y - p1.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (p1.x + t * (p2.x - p1.x)), p.y - (p1.y + t * (p2.y - p1.y)));
}

function getMaxShield() {
  return currentPhase >= 4 ? 4 : player.maxShield;
}

function updateHpUI() {
  hpDisplay.textContent = '♥'.repeat(Math.max(0, player.hp)) + '♡'.repeat(Math.max(0, player.maxHp - player.hp));
  shieldDisplay.textContent = '🛡️'.repeat(player.shield);
}

function takeDamage(amount = 1, opts = {}) {
  if (gameMode === 'bossrush' && BossRush.state !== 'combat') return;
  if (player.superInvincibleTimer > 0 && !opts.ignoreSuper) return;
  // 피해량은 HUD·체력·보호막 모두에서 항상 정수 단위로만 처리한다.
  let resolvedAmount = Math.max(1, Math.round(Number(amount) || 1));

  if (player.shield > 0) {
    player.shield--;
    player.invincibleTimer = 0.9;
    Sound.playShield();
    showFloatingText("보호막 방어!", player.x, player.y - 15 * scale, '#ffd32a');
    addExplosion(player.x, player.y, '#ffd32a', 12);
    updateHpUI();
    return;
  }

  if (gameMode === 'bossrush') resolvedAmount = BossRush.resolveDamage(resolvedAmount);
  player.hp -= resolvedAmount;
  player.invincibleTimer = 1.1;
  Sound.playHit();
  addExplosion(player.x, player.y, '#ff4757', 14);
  if (resolvedAmount >= 2) showFloatingText(`-${resolvedAmount} 강타!`, player.x, player.y - 15 * scale, '#ff4757');
  updateHpUI();

  if (player.hp <= 0) {
    gameState = 'gameover';
    // 탄환만 지우면 CHRONOS 본체/시계 상태가 다음 시작까지 남는다.
    // 사망 시점에 보스전을 완전히 종료해 어떤 모드로 재시작해도
    // 이전 보스의 갱신 루프가 이어지지 않게 한다.
    if (typeof BossManager !== 'undefined') BossManager.reset();
    showGameOverModal();
  }
}

function firePlayerBullets(count, dmg, color, rad) {
  let spreadAngles = [];
  if (count === 1) spreadAngles = [0];
  else if (count === 2) spreadAngles = [-0.035, 0.035];
  else if (count === 3) spreadAngles = [-0.12, 0, 0.12];
  else if (count === 4) spreadAngles = [-0.10, -0.03, 0.03, 0.10];
  else if (count === 5) spreadAngles = [-0.20, -0.10, 0, 0.10, 0.20];
  else {
    // 6발의 기존 펼침 각도를 그대로 유지하면서 7~10발도 실제로 생성한다.
    // 최상위 단계의 화면 점유율이 과도해지지 않도록 최대 10발, ±0.41rad로 제한한다.
    const bulletCount = Math.max(6, Math.min(10, Math.floor(count)));
    const halfSpread = 0.25 + (bulletCount - 6) * 0.04;
    const step = (halfSpread * 2) / (bulletCount - 1);
    for (let i = 0; i < bulletCount; i++) {
      spreadAngles.push(-halfSpread + step * i);
    }
  }

  for (let sp of spreadAngles) {
    bullets.push({
      x: player.x, y: player.y,
      vx: Math.cos(player.angle + sp) * 9.5 * scale,
      vy: Math.sin(player.angle + sp) * 9.5 * scale,
      radius: rad, color: color, damage: dmg,
      weaponKind: player.weaponType
    });
  }
}

function checkLaserHit(angle, level, dt) {
  const laserLen = Math.max(width, height) * 1.4;
  const x2 = player.x + Math.cos(angle) * laserLen;
  const y2 = player.y + Math.sin(angle) * laserLen;

  const laserWidth = (5 + (level - 1) * 3.5) * scale;
  const laserMults = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.2, 5.0];
  const laserTickDmg = Math.max(0.01, (typeof roundDamage === 'function' ? roundDamage(player.baseDamage * laserMults[level - 1]) : Math.round(player.baseDamage * laserMults[level - 1] * 100) / 100));

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const dist = distToSegment({ x: player.x, y: player.y }, { x: x2, y: y2 }, { x: e.x, y: e.y });
    if (dist < e.radius + laserWidth) {
      e.laserCooldown = (e.laserCooldown || 0) - dt;
      if (e.laserCooldown <= 0) {
        if (typeof applyEnemyDamage === 'function') applyEnemyDamage(e, laserTickDmg, e.x, e.y, WEAPON_META.laser.color); else e.hp -= laserTickDmg;
        e.laserCooldown = 0.12;
        addExplosion(e.x, e.y, '#ff4757', 1);
        if (e.hp <= 0) {
          handleEnemyDeath(e, i);
        }
      }
    }
  }

  if (BossManager.activeBoss) {
    const b = BossManager.activeBoss;
    const dist = distToSegment({ x: player.x, y: player.y }, { x: x2, y: y2 }, { x: b.x, y: b.y });
    if (dist < b.radius + laserWidth) {
      b.laserCooldown = (b.laserCooldown || 0) - dt;
      if (b.laserCooldown <= 0) {
        // 레이저는 연속 빔이므로 별도 투사체는 없지만, 전방 접촉에서는 피해/부가 효과를 만들지 않는다.
        const swallowedByCollapse = BossManager.isChronosBeamAbsorbed(player.x, player.y, b.x, b.y);
        if (!swallowedByCollapse && !BossManager.isPhantomShieldedAt(player.x, player.y)) {
          BossManager.takeDamage(laserTickDmg, null, WEAPON_META.laser.color, { x: player.x, y: player.y }, 'laser');
          addExplosion(b.x, b.y, '#ff4757', 2);
        }
        b.laserCooldown = 0.12;
      }
    }

    for (const pr of BossManager.getVulnerablePrisms()) {
      const d = distToSegment({ x: player.x, y: player.y }, { x: x2, y: y2 }, { x: pr.x, y: pr.y });
      if (d < pr.r + laserWidth) BossManager.damagePrism(pr.prism, laserTickDmg, WEAPON_META.laser.color);
    }
  }

  for (let j = enemyBullets.length - 1; j >= 0; j--) {
    const eb = enemyBullets[j];
    if (eb.isDestructible) {
      const dist = distToSegment({ x: player.x, y: player.y }, { x: x2, y: y2 }, { x: eb.x, y: eb.y });
      if (dist < eb.radius + laserWidth) {
        eb.laserCooldown = (eb.laserCooldown || 0) - dt;
        if (eb.laserCooldown <= 0) {
          eb.hp -= laserTickDmg;
          eb.laserCooldown = 0.12;
          addExplosion(eb.x, eb.y, '#ffd32a', 1);
          if (eb.hp <= 0) {
            addExplosion(eb.x, eb.y, '#ff4757', 14);
            Sound.playExplosion(false);
            enemyBullets.splice(j, 1);
          }
        }
      }
    }
  }
}
