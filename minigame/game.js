/**
 * 八卦立方体 Roguelike - 微信小游戏入口
 */

// 获取主 Canvas
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// 获取系统信息
const sysInfo = wx.getSystemInfoSync();
const W = sysInfo.windowWidth;
const H = sysInfo.windowHeight;
const DPR = sysInfo.pixelRatio;

// 设置 Canvas 尺寸
canvas.width = W * DPR;
canvas.height = H * DPR;

// =============== 绘制圆角矩形辅助函数 ===============
function drawRoundRect(x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// =============== 游戏配置 ===============
const CLASSES = {
  dui: { name: 'Caster', nameCN: '术士', color: '#9932CC',
         stats: { hp: 80, mp: 150, attack: 60, defense: 30, speed: 90 } },
  li: { name: 'Archer', nameCN: '弓手', color: '#FF6347',
        stats: { hp: 90, mp: 80, attack: 85, defense: 35, speed: 105 } },
  zhen: { name: 'Lancer', nameCN: '枪兵', color: '#00FF7F',
          stats: { hp: 100, mp: 60, attack: 90, defense: 45, speed: 130 } },
  xun: { name: 'Saber', nameCN: '剑士', color: '#00CED1',
         stats: { hp: 110, mp: 70, attack: 95, defense: 50, speed: 100 } },
  kan: { name: 'Assassin', nameCN: '刺客', color: '#483D8B',
         stats: { hp: 85, mp: 90, attack: 100, defense: 30, speed: 125 } },
  gen: { name: 'Rider', nameCN: '骑士', color: '#8B4513',
         stats: { hp: 150, mp: 50, attack: 75, defense: 80, speed: 85 } },
  kun: { name: 'Berserker', nameCN: '狂战士', color: '#8B0000',
         stats: { hp: 180, mp: 30, attack: 110, defense: 40, speed: 95 } }
};

const COLORS = {
  BG_TOP: '#0F0F1A',
  BG_BOTTOM: '#050508',
  TEXT: '#E8E4D9',
  ACCENT: '#FFD700',
  DANGER: '#FF4444',
  SUCCESS: '#44FF44',
  MANA: '#4488FF'
};

// =============== 游戏状态 ===============
let gameState = 'title'; // title, create, menu, adventure, battle, gameover
let selectedClassIndex = 0;
let currentCharacter = null;
let currentWave = 0;
let enemies = [];
let battleLog = [];
let touchStart = null;

// 星星动画
let starTime = 0;

// =============== 立方体顶点（用于星座显示） ===============
const vertices = [
  { x: -1, y: -1, z: -1, brightness: 1.0 },
  { x: 1, y: -1, z: -1, brightness: 0.77 },
  { x: -1, y: 1, z: -1, brightness: 0.77 },
  { x: 1, y: 1, z: -1, brightness: 0.54 },
  { x: -1, y: -1, z: 1, brightness: 0.77 },
  { x: 1, y: -1, z: 1, brightness: 0.54 },
  { x: -1, y: 1, z: 1, brightness: 0.54 },
  { x: 1, y: 1, z: 1, brightness: 0.3 }
];

// 立方体边
const edges = [
  [0, 1], [2, 3], [4, 5], [6, 7],
  [0, 2], [1, 3], [4, 6], [5, 7],
  [0, 4], [1, 5], [2, 6], [3, 7]
];

// =============== 3D 渲染 ===============
const rotX = Math.atan(1 / Math.sqrt(2));
const rotY = -Math.PI / 4;
const rotZ = Math.PI;
const cubeSize = Math.min(W, H) * 0.25;

function rotate3D(p) {
  let { x, y, z } = p;
  const cy = Math.cos(rotY), sy = Math.sin(rotY);
  let x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
  const cx = Math.cos(rotX), sx = Math.sin(rotX);
  let y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
  const cz = Math.cos(rotZ), sz = Math.sin(rotZ);
  let x3 = x1 * cz - y2 * sz, y3 = x1 * sz + y2 * cz;
  return { x: x3, y: y3, z: z2 };
}

function project(p) {
  const pr = rotate3D(p);
  return {
    x: pr.x * cubeSize + W / 2,
    y: -pr.y * cubeSize + H / 2,
    z: pr.z
  };
}

// =============== 绘制函数 ===============
function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, COLORS.BG_TOP);
  gradient.addColorStop(1, COLORS.BG_BOTTOM);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  // 背景星星
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  for (let i = 0; i < 50; i++) {
    const sx = (Math.sin(i * 7.3) * 0.5 + 0.5) * W;
    const sy = (Math.cos(i * 11.7) * 0.5 + 0.5) * H;
    ctx.beginPath();
    ctx.arc(sx, sy, 1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStar(x, y, brightness, size) {
  const twinkle = 0.85 + 0.15 * Math.sin(starTime + x * 0.1);
  const alpha = brightness * twinkle;

  // 光晕
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
  gradient.addColorStop(0, `rgba(255,250,205,${alpha})`);
  gradient.addColorStop(0.5, `rgba(255,250,205,${alpha * 0.3})`);
  gradient.addColorStop(1, 'rgba(255,250,205,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, size * 2, 0, Math.PI * 2);
  ctx.fill();

  // 核心
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawCube() {
  // 投影所有顶点
  const projected = vertices.map((v, i) => ({
    ...v,
    idx: i,
    p: project(v)
  })).sort((a, b) => b.p.z - a.p.z);

  // 画边（虚线）
  ctx.strokeStyle = 'rgba(100,90,80,0.4)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  for (const [i, j] of edges) {
    const p1 = project(vertices[i]);
    const p2 = project(vertices[j]);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // 画星星（顶点）
  for (const v of projected) {
    const size = 4 + 3 * (1 - (v.p.z + 1) / 2);
    drawStar(v.p.x, v.p.y, v.brightness, size);
  }
}

function drawButton(x, y, w, h, text, color, active) {
  ctx.fillStyle = active ? `rgba(${hexToRgb(color)},0.3)` : `rgba(${hexToRgb(color)},0.15)`;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  drawRoundRect(x - w/2, y - h/2, w, h, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// =============== 场景渲染 ===============
function renderTitle() {
  drawBackground();
  drawCube();

  // 标题
  ctx.fillStyle = COLORS.ACCENT;
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('八卦立方体', W / 2, H * 0.12);

  ctx.fillStyle = COLORS.TEXT;
  ctx.font = '14px sans-serif';
  ctx.fillText('Roguelike · 先天八卦', W / 2, H * 0.18);

  // 开始按钮
  drawButton(W / 2, H * 0.78, 160, 45, '开始游戏', COLORS.ACCENT, false);
}

function renderCreateChar() {
  drawBackground();

  ctx.fillStyle = COLORS.ACCENT;
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('选择职业', W / 2, 45);

  const classIds = Object.keys(CLASSES);
  const cls = CLASSES[classIds[selectedClassIndex]];

  // 职业卡片
  const cardY = 80;
  const cardH = 180;
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.strokeStyle = cls.color;
  ctx.lineWidth = 2;
  drawRoundRect(20, cardY, W - 40, cardH, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = cls.color;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(cls.name, W / 2, cardY + 35);

  ctx.fillStyle = COLORS.TEXT;
  ctx.font = '16px sans-serif';
  ctx.fillText(cls.nameCN, W / 2, cardY + 60);

  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  const stats = cls.stats;
  ctx.fillText(`HP: ${stats.hp}   攻击: ${stats.attack}   防御: ${stats.defense}`, 35, cardY + 95);
  ctx.fillText(`MP: ${stats.mp}   速度: ${stats.speed}`, 35, cardY + 115);

  // 左右箭头
  ctx.fillStyle = COLORS.ACCENT;
  ctx.font = '32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('<', 30, cardY + cardH / 2);
  ctx.fillText('>', W - 30, cardY + cardH / 2);

  // 页码
  ctx.fillStyle = COLORS.TEXT;
  ctx.font = '12px sans-serif';
  ctx.fillText(`${selectedClassIndex + 1} / ${classIds.length}`, W / 2, cardY + cardH - 15);

  // 创建按钮
  drawButton(W / 2, H - 70, 140, 42, '开始冒险', COLORS.ACCENT, false);
}

function renderMenu() {
  drawBackground();
  drawCube();

  // 角色信息
  if (currentCharacter) {
    ctx.fillStyle = 'rgba(20,20,35,0.85)';
    drawRoundRect(10, 10, 170, 90, 10);
    ctx.fill();

    ctx.fillStyle = COLORS.ACCENT;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(currentCharacter.name, 20, 30);

    ctx.fillStyle = COLORS.TEXT;
    ctx.font = '12px sans-serif';
    ctx.fillText(`Lv.${currentCharacter.level} ${currentCharacter.className}`, 20, 48);

    // HP条
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(20, 55, 150, 8);
    ctx.fillStyle = COLORS.SUCCESS;
    ctx.fillRect(20, 55, 150 * (currentCharacter.hp / currentCharacter.maxHp), 8);
    ctx.fillStyle = COLORS.TEXT;
    ctx.font = '10px sans-serif';
    ctx.fillText(`HP: ${currentCharacter.hp}/${currentCharacter.maxHp}`, 20, 78);
  }

  // 按钮
  drawButton(W / 2 - 60, H - 55, 90, 38, '冒险', COLORS.DANGER, false);
  drawButton(W / 2 + 60, H - 55, 90, 38, '乾宫', COLORS.ACCENT, false);
}

function renderAdventure() {
  drawBackground();

  ctx.fillStyle = COLORS.TEXT;
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`第 ${currentWave + 1} 波`, W / 2, 35);

  // 角色状态
  if (currentCharacter) {
    ctx.fillStyle = 'rgba(20,20,35,0.85)';
    drawRoundRect(10, 10, 150, 70, 10);
    ctx.fill();

    ctx.fillStyle = COLORS.TEXT;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${currentCharacter.name} Lv.${currentCharacter.level}`, 20, 30);

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(20, 40, 130, 6);
    ctx.fillStyle = COLORS.SUCCESS;
    ctx.fillRect(20, 40, 130 * (currentCharacter.hp / currentCharacter.maxHp), 6);
    ctx.fillStyle = COLORS.TEXT;
    ctx.font = '10px sans-serif';
    ctx.fillText(`HP: ${currentCharacter.hp}/${currentCharacter.maxHp}`, 20, 62);
  }

  drawButton(W / 2, H / 2, 130, 45, '进入战斗', COLORS.DANGER, false);
  drawButton(W / 2, H / 2 + 60, 130, 45, '返回', COLORS.TEXT, false);
}

function renderBattle() {
  ctx.fillStyle = '#0A0A12';
  ctx.fillRect(0, 0, W, H);

  // 敌人
  ctx.fillStyle = COLORS.TEXT;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('敌人', W / 2, 25);

  const enemyY = 80;
  enemies.forEach((enemy, i) => {
    const x = W / (enemies.length + 1) * (i + 1);
    ctx.font = '28px sans-serif';
    ctx.fillStyle = enemy.type === 'boss' ? COLORS.DANGER : COLORS.TEXT;
    ctx.fillText(enemy.type === 'boss' ? 'BOSS' : 'MOB', x, enemyY);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = COLORS.TEXT;
    ctx.fillText(enemy.name, x, enemyY + 25);
    ctx.fillText(`${enemy.hp}/${enemy.maxHp}`, x, enemyY + 40);

    // HP条
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x - 25, enemyY + 45, 50, 5);
    ctx.fillStyle = COLORS.DANGER;
    ctx.fillRect(x - 25, enemyY + 45, 50 * (enemy.hp / enemy.maxHp), 5);
    ctx.fillStyle = COLORS.TEXT;
  });

  // 玩家
  if (currentCharacter) {
    const playerY = H - 130;
    ctx.font = '24px sans-serif';
    ctx.fillStyle = COLORS.ACCENT;
    ctx.fillText('PLAYER', W / 2, playerY);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = COLORS.TEXT;
    ctx.fillText(currentCharacter.name, W / 2, playerY + 30);
    ctx.fillText(`HP: ${currentCharacter.hp}/${currentCharacter.maxHp}`, W / 2, playerY + 48);

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(W / 2 - 50, playerY + 55, 100, 7);
    ctx.fillStyle = COLORS.SUCCESS;
    ctx.fillRect(W / 2 - 50, playerY + 55, 100 * (currentCharacter.hp / currentCharacter.maxHp), 7);
  }

  // 战斗日志
  ctx.fillStyle = 'rgba(232,228,217,0.7)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  battleLog.slice(-3).forEach((msg, i) => {
    ctx.fillText(msg, 15, H / 2 + 10 + i * 16);
  });

  // 按钮
  drawButton(W / 2 - 50, H - 45, 75, 32, '攻击', COLORS.DANGER, false);
  drawButton(W / 2 + 50, H - 45, 75, 32, '逃跑', COLORS.MANA, false);
}

function renderGameOver() {
  ctx.fillStyle = '#0A0A12';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = COLORS.DANGER;
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('游戏结束', W / 2, H / 3);

  ctx.fillStyle = COLORS.TEXT;
  ctx.font = '14px sans-serif';
  ctx.fillText(`最终等级: ${currentCharacter ? currentCharacter.level : 1}`, W / 2, H / 3 + 35);
  ctx.fillText(`击败波数: ${currentWave}`, W / 2, H / 3 + 55);

  drawButton(W / 2, H * 0.6, 140, 42, '重新开始', COLORS.ACCENT, false);
}

// =============== 游戏逻辑 ===============
function createCharacter(classId) {
  const cls = CLASSES[classId];
  currentCharacter = {
    name: '旅者',
    classId,
    className: cls.nameCN,
    level: 1,
    exp: 0,
    hp: cls.stats.hp,
    maxHp: cls.stats.hp,
    mp: cls.stats.mp,
    maxMp: cls.stats.mp,
    attack: cls.stats.attack,
    defense: cls.stats.defense,
    speed: cls.stats.speed
  };
}

function generateEnemies() {
  const count = Math.min(4, 1 + Math.floor(currentWave / 3));
  enemies = [];
  const names = ['史莱姆', '哥布林', '骷髅兵', '暗狼'];
  const isBoss = (currentWave + 1) % 5 === 0;

  for (let i = 0; i < count; i++) {
    const baseHp = 30 + currentWave * 10;
    enemies.push({
      name: isBoss && i === 0 ? '远古石像' : names[Math.floor(Math.random() * names.length)],
      type: isBoss && i === 0 ? 'boss' : 'normal',
      hp: isBoss && i === 0 ? baseHp * 3 : baseHp,
      maxHp: isBoss && i === 0 ? baseHp * 3 : baseHp,
      attack: 8 + currentWave * 3
    });
  }
}

function playerAttack() {
  if (enemies.length === 0) return;

  const target = enemies[0];
  const damage = Math.max(1, currentCharacter.attack - 5);
  const roll = Math.floor(Math.random() * 6) + 1;
  const finalDamage = Math.floor(damage * (0.8 + roll * 0.1));

  target.hp = Math.max(0, target.hp - finalDamage);
  battleLog.push(`你攻击${target.name}，骰子${roll}，造成${finalDamage}伤害`);

  if (target.hp <= 0) {
    battleLog.push(`${target.name}被击败！`);
    enemies.shift();
    currentCharacter.exp += 20;
    if (currentCharacter.exp >= currentCharacter.level * 50) {
      currentCharacter.level++;
      currentCharacter.maxHp += 10;
      currentCharacter.hp = currentCharacter.maxHp;
      currentCharacter.attack += 3;
      battleLog.push(`升级到${currentCharacter.level}级！`);
    }
  }

  if (enemies.length === 0) {
    battleLog.push('胜利！进入下一波');
    setTimeout(() => {
      currentWave++;
      gameState = 'adventure';
    }, 1000);
    return;
  }

  // 敌人反击
  setTimeout(enemyAttack, 500);
}

function enemyAttack() {
  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;
    const damage = Math.max(1, enemy.attack - currentCharacter.defense / 2);
    currentCharacter.hp = Math.max(0, currentCharacter.hp - damage);
    battleLog.push(`${enemy.name}攻击你，造成${damage}伤害`);

    if (currentCharacter.hp <= 0) {
      battleLog.push('你倒下了...');
      setTimeout(() => { gameState = 'gameover'; }, 1000);
      return;
    }
  }
}

// =============== 触摸处理 ===============
wx.onTouchStart((e) => {
  if (e.touches.length > 0) {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  }
});

wx.onTouchEnd((e) => {
  if (!touchStart || !e.changedTouches.length) return;
  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  const dt = Date.now() - touchStart.t;
  touchStart = null;

  if (dt < 300 && Math.abs(dx) < 30 && Math.abs(dy) < 30) {
    handleTap(touch.clientX, touch.clientY);
  }
});

function handleTap(x, y) {
  const classIds = Object.keys(CLASSES);

  switch (gameState) {
    case 'title':
      if (y > H * 0.7 && y < H * 0.86) {
        gameState = 'create';
      }
      break;

    case 'create':
      if (x < 50) {
        selectedClassIndex = (selectedClassIndex - 1 + classIds.length) % classIds.length;
      } else if (x > W - 50) {
        selectedClassIndex = (selectedClassIndex + 1) % classIds.length;
      } else if (y > H - 100) {
        createCharacter(classIds[selectedClassIndex]);
        gameState = 'menu';
      }
      break;

    case 'menu':
      if (y > H - 80) {
        if (x < W / 2) {
          gameState = 'adventure';
        } else {
          wx.showToast({ title: '乾宫开发中', icon: 'none' });
        }
      }
      break;

    case 'adventure':
      if (y > H / 2 - 30 && y < H / 2 + 30) {
        generateEnemies();
        battleLog = ['战斗开始！'];
        gameState = 'battle';
      } else if (y > H / 2 + 30 && y < H / 2 + 90) {
        gameState = 'menu';
      }
      break;

    case 'battle':
      if (y > H - 70) {
        if (x < W / 2) {
          playerAttack();
        } else {
          gameState = 'adventure';
        }
      }
      break;

    case 'gameover':
      if (y > H * 0.5 && y < H * 0.7) {
        currentCharacter = null;
        currentWave = 0;
        selectedClassIndex = 0;
        gameState = 'create';
      }
      break;
  }
}

// =============== 游戏循环 ===============
function gameLoop() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  starTime += 0.05;

  switch (gameState) {
    case 'title': renderTitle(); break;
    case 'create': renderCreateChar(); break;
    case 'menu': renderMenu(); break;
    case 'adventure': renderAdventure(); break;
    case 'battle': renderBattle(); break;
    case 'gameover': renderGameOver(); break;
  }

  requestAnimationFrame(gameLoop);
}

// 启动
console.log('游戏初始化...');
console.log('屏幕尺寸:', W, 'x', H, 'DPR:', DPR);

// 先画一帧测试
ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
ctx.fillStyle = '#0F0F1A';
ctx.fillRect(0, 0, W, H);
ctx.fillStyle = '#FFD700';
ctx.font = 'bold 24px sans-serif';
ctx.textAlign = 'center';
ctx.fillText('加载中...', W / 2, H / 2);

// 启动游戏循环
setTimeout(() => {
  console.log('启动游戏循环');
  requestAnimationFrame(gameLoop);
}, 100);

console.log('八卦立方体初始化完成');
