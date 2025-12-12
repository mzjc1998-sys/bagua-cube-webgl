/**
 * 八卦立方体 - 微信小游戏
 * 四维超立方体的三维投影 - 时空切片
 * 边长10m的正方体内部视角
 */

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

const sysInfo = wx.getSystemInfoSync();
const W = sysInfo.windowWidth;
const H = sysInfo.windowHeight;
const DPR = sysInfo.pixelRatio;

canvas.width = W * DPR;
canvas.height = H * DPR;

// ==================== 颜色配置 ====================
const COLOR_BG = '#eef2f7';

function getNodeColor(bits) {
  let ones = 0;
  for (const c of bits) if (c === '1') ones++;
  const gray = Math.round(255 * (1 - ones / 3));
  return `rgb(${gray},${gray},${gray})`;
}

function getEdgeColor(val) {
  return val === 0 ? '#FFFFFF' : '#000000';
}

// ==================== 八卦数据 ====================
const bitsToName = {
  '000': '乾', '001': '兑', '010': '离', '011': '震',
  '100': '巽', '101': '坎', '110': '艮', '111': '坤'
};

const trigramPos = {};
const trigramBits = ['000', '001', '010', '011', '100', '101', '110', '111'];

for (const bits of trigramBits) {
  const b0 = bits[0], b1 = bits[1], b2 = bits[2];
  const x = (b2 === '1') ? 1 : -1;
  const y = (b0 === '1') ? 1 : -1;
  const z = (b1 === '1') ? 1 : -1;
  trigramPos[bits] = { x, y, z, bits, name: bitsToName[bits] };
}

// 边
const edges = [];
for (let i = 0; i < trigramBits.length; i++) {
  for (let j = i + 1; j < trigramBits.length; j++) {
    const a = trigramBits[i];
    const b = trigramBits[j];
    let diffBit = -1;
    let diffCount = 0;
    for (let k = 0; k < 3; k++) {
      if (a[k] !== b[k]) {
        diffBit = k;
        diffCount++;
      }
    }
    if (diffCount === 1) {
      const val = parseInt(a[diffBit]);
      edges.push({ a, b, diffBit, val });
    }
  }
}

// 宫位对
const palacePairs = {
  '乾': ['000', '111'], '坤': ['111', '000'],
  '兑': ['001', '110'], '艮': ['110', '001'],
  '离': ['010', '101'], '坎': ['101', '010'],
  '震': ['011', '100'], '巽': ['100', '011']
};

let currentPalace = '艮';

function getFrontBits() { return palacePairs[currentPalace][0]; }
function getBackBits() { return palacePairs[currentPalace][1]; }

// ==================== 向量运算 ====================
function vecSub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function vecLength(v) { return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z); }
function vecNorm(v) { const L = vecLength(v) || 1; return { x: v.x / L, y: v.y / L, z: v.z / L }; }

function neighborBitsForUp(bits) {
  const b0 = bits[0], b1 = bits[1], b2 = bits[2];
  const flipped = b1 === '0' ? '1' : '0';
  return '' + b0 + flipped + b2;
}

function basisForPalace(frontBits, backBits) {
  const pA = trigramPos[frontBits];
  const pB = trigramPos[backBits];
  const forward = vecNorm(vecSub(pB, pA));

  const qBits = neighborBitsForUp(frontBits);
  const q = trigramPos[qBits];
  let upCand = vecSub(q, pA);
  const projLen = upCand.x * forward.x + upCand.y * forward.y + upCand.z * forward.z;
  upCand = { x: upCand.x - forward.x * projLen, y: upCand.y - forward.y * projLen, z: upCand.z - forward.z * projLen };
  const up = vecNorm(upCand);

  let right = {
    x: up.y * forward.z - up.z * forward.y,
    y: up.z * forward.x - up.x * forward.z,
    z: up.x * forward.y - up.y * forward.x
  };
  right = vecNorm(right);

  return [right.x, right.y, right.z, up.x, up.y, up.z, forward.x, forward.y, forward.z];
}

const palaceBases = {};
for (const name in palacePairs) {
  const [f, b] = palacePairs[name];
  palaceBases[name] = basisForPalace(f, b);
}

// ==================== 3D 变换 ====================
let rotX = 0, rotY = 0, rotZ = Math.PI;
const zoom = 1.0;

function applyPalaceMat(p) {
  const m = palaceBases[currentPalace];
  if (!m) return p;
  return {
    x: m[0] * p.x + m[1] * p.y + m[2] * p.z,
    y: m[3] * p.x + m[4] * p.y + m[5] * p.z,
    z: m[6] * p.x + m[7] * p.y + m[8] * p.z
  };
}

function rotate3D(p) {
  let v = applyPalaceMat(p);
  let x = v.x * zoom, y = v.y * zoom, z = v.z * zoom;
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
  const scale = Math.min(W, H) * 0.25;
  return { x: pr.x * scale + W / 2, y: -pr.y * scale + H / 2, z: pr.z };
}

let projCache = new Map();

function updateProjCache() {
  projCache.clear();
  for (const bits in trigramPos) {
    projCache.set(bits, project(trigramPos[bits]));
  }
}

// ==================== 动画状态 ====================
let walkTime = 0;
const CUBE_SIZE = 10;
let sceneOffset = 0;
let stickManSpeed = 0.7;
let targetSpeed = 0.7;
const SPEED_LERP = 0.05;
const BASE_SCENE_SPEED = 0.004;

const poseState = { facing: 0, initialized: false };

function lerp(a, b, t) { return a + (b - a) * t; }

function lerpAngle(a, b, t) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

// ==================== 职阶系统 ====================
const CLASS_TYPES = {
  warrior: {
    name: '战士',
    color: '#C62828',
    stats: { str: 10, agi: 5, int: 3, vit: 8 },
    weapon: 'sword',
    armor: 'heavy',
    description: '近战物理输出，高生命值'
  },
  mage: {
    name: '法师',
    color: '#5E35B1',
    stats: { str: 2, agi: 4, int: 12, vit: 4 },
    weapon: 'staff',
    armor: 'robe',
    description: '远程魔法输出，高智力'
  },
  archer: {
    name: '弓箭手',
    color: '#2E7D32',
    stats: { str: 5, agi: 12, int: 4, vit: 5 },
    weapon: 'bow',
    armor: 'light',
    description: '远程物理输出，高敏捷'
  },
  assassin: {
    name: '刺客',
    color: '#37474F',
    stats: { str: 7, agi: 10, int: 3, vit: 4 },
    weapon: 'dagger',
    armor: 'light',
    description: '高爆发，高暴击'
  },
  priest: {
    name: '牧师',
    color: '#FDD835',
    stats: { str: 2, agi: 3, int: 10, vit: 7 },
    weapon: 'wand',
    armor: 'robe',
    description: '治疗辅助，高恢复'
  },
  knight: {
    name: '骑士',
    color: '#1565C0',
    stats: { str: 8, agi: 4, int: 4, vit: 12 },
    weapon: 'lance',
    armor: 'heavy',
    description: '坦克职业，高防御'
  }
};

let currentClass = 'warrior';
let playerLevel = 1;
let playerExp = 0;
let expToNext = 100;

// ==================== 数据持久化 ====================
const SAVE_KEY = 'bagua_game_save';

// 保存游戏数据
function saveGameData() {
  try {
    const saveData = {
      currentClass,
      playerLevel,
      playerExp,
      expToNext,
      currentPalace,
      version: 1
    };
    wx.setStorageSync(SAVE_KEY, JSON.stringify(saveData));
    console.log('游戏数据已保存');
  } catch (e) {
    console.error('保存游戏数据失败:', e);
  }
}

// 加载游戏数据
function loadGameData() {
  try {
    const saved = wx.getStorageSync(SAVE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.currentClass && CLASS_TYPES[data.currentClass]) {
        currentClass = data.currentClass;
      }
      if (typeof data.playerLevel === 'number' && data.playerLevel >= 1) {
        playerLevel = data.playerLevel;
      }
      if (typeof data.playerExp === 'number' && data.playerExp >= 0) {
        playerExp = data.playerExp;
      }
      if (typeof data.expToNext === 'number' && data.expToNext > 0) {
        expToNext = data.expToNext;
      }
      if (data.currentPalace && palacePairs[data.currentPalace]) {
        currentPalace = data.currentPalace;
      }
      console.log(`游戏数据已加载: ${CLASS_TYPES[currentClass].name} Lv.${playerLevel}`);
      return true;
    }
  } catch (e) {
    console.error('加载游戏数据失败:', e);
  }
  return false;
}

// 游戏启动时加载数据
loadGameData();

// 计算当前属性（基础 + 等级加成）
function getPlayerStats() {
  const base = CLASS_TYPES[currentClass].stats;
  const levelBonus = playerLevel - 1;
  return {
    str: base.str + levelBonus * 2,
    agi: base.agi + levelBonus * 2,
    int: base.int + levelBonus * 2,
    vit: base.vit + levelBonus * 2,
    hp: (base.vit + levelBonus * 2) * 10,
    mp: (base.int + levelBonus * 2) * 5,
    atk: base.str + levelBonus * 2 + Math.floor(base.agi / 2),
    def: Math.floor(base.vit / 2) + levelBonus
  };
}

// ==================== 冒险系统 ====================
let gameState = 'idle'; // 'idle' | 'adventure' | 'gameover'
let adventureTime = 0;
let killCount = 0;
let playerHP = 100;
let playerMaxHP = 100;
let playerX = 0.5;  // 玩家在地面上的位置 (0-1)
let playerY = 0.5;
let playerTargetX = 0.5;
let playerTargetY = 0.5;
let isMoving = false;
let lastAttackTime = 0;
let attackCooldown = 0.5; // 攻击冷却时间(秒)
let comboCount = 0;

// 怪物数组
let monsters = [];
let monsterSpawnTimer = 0;
let monsterSpawnInterval = 2.0; // 初始生成间隔

// 僵尸怪物定义
const MONSTER_TYPES = {
  zombie: {
    name: '僵尸',
    color: '#4A7C59',
    hp: 30,
    damage: 10,
    speed: 0.003,
    exp: 20,
    size: 0.8
  }
};

// 创建怪物
function spawnMonster() {
  // 从四面八方生成
  const side = Math.floor(Math.random() * 4);
  let x, y;
  switch (side) {
    case 0: x = Math.random(); y = 0; break;      // 上
    case 1: x = Math.random(); y = 1; break;      // 下
    case 2: x = 0; y = Math.random(); break;      // 左
    case 3: x = 1; y = Math.random(); break;      // 右
  }

  const type = 'zombie';
  const info = MONSTER_TYPES[type];
  monsters.push({
    type,
    x,
    y,
    hp: info.hp,
    maxHp: info.hp,
    damage: info.damage,
    speed: info.speed * (0.8 + Math.random() * 0.4), // 速度有些随机
    exp: info.exp,
    size: info.size,
    hitTimer: 0, // 被击中闪烁
    walkPhase: Math.random() * Math.PI * 2 // 走路动画相位
  });
}

// 绘制僵尸
function drawZombie(x, y, scale, monster, time) {
  const info = MONSTER_TYPES[monster.type];
  const s = scale * info.size;
  const personH = BASE_UNIT * 1.5 * s;
  const len = personH / 3.5;
  const headR = len * 0.45;
  const bodyLen = len * 1.2;
  const legLen = len * 0.9;
  const armLen = len * 0.7;

  // 走路动画
  const t = time * 3 + monster.walkPhase;
  const legSwing = Math.sin(t) * 0.4;
  const armSwing = Math.sin(t + Math.PI) * 0.3;

  ctx.save();
  ctx.translate(x, y);

  // 被击中时闪白
  const baseColor = monster.hitTimer > 0 ? '#FFFFFF' : info.color;
  const darkColor = monster.hitTimer > 0 ? '#CCCCCC' : '#2D4A35';

  ctx.strokeStyle = baseColor;
  ctx.fillStyle = baseColor;
  ctx.lineWidth = Math.max(1, 2 * s);
  ctx.lineCap = 'round';

  const hipY = 0;
  const shoulderY = -bodyLen;
  const headY = shoulderY - headR;

  // 腿（僵硬的走路姿势）
  ctx.beginPath();
  ctx.moveTo(-len * 0.2, hipY);
  ctx.lineTo(-len * 0.2 + Math.sin(legSwing) * legLen * 0.3, hipY + legLen);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.2, hipY);
  ctx.lineTo(len * 0.2 + Math.sin(-legSwing) * legLen * 0.3, hipY + legLen);
  ctx.stroke();

  // 身体
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(0, shoulderY);
  ctx.stroke();

  // 手臂（僵尸标志性的前伸手臂）
  ctx.beginPath();
  ctx.moveTo(-len * 0.3, shoulderY);
  ctx.lineTo(-len * 0.3 + armLen * 0.8, shoulderY + Math.sin(armSwing) * armLen * 0.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.3, shoulderY);
  ctx.lineTo(len * 0.3 + armLen * 0.8, shoulderY + Math.sin(-armSwing) * armLen * 0.2);
  ctx.stroke();

  // 头（略大，歪斜）
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(len * 0.1, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // 眼睛（红色发光）
  ctx.fillStyle = '#FF0000';
  ctx.beginPath();
  ctx.arc(len * 0.05, headY - headR * 0.2, headR * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(len * 0.2, headY - headR * 0.2, headR * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // 血条
  if (monster.hp < monster.maxHp) {
    const barW = len * 2;
    const barH = 3;
    const barY = headY - headR - 8;
    ctx.fillStyle = '#333';
    ctx.fillRect(-barW / 2, barY, barW, barH);
    ctx.fillStyle = '#E53935';
    ctx.fillRect(-barW / 2, barY, barW * (monster.hp / monster.maxHp), barH);
  }

  ctx.restore();
}

// 开始冒险
function startAdventure() {
  gameState = 'adventure';
  adventureTime = 0;
  killCount = 0;
  const stats = getPlayerStats();
  playerMaxHP = stats.hp;
  playerHP = playerMaxHP;
  playerX = 0.5;
  playerY = 0.5;
  playerTargetX = 0.5;
  playerTargetY = 0.5;
  isMoving = false;
  monsters = [];
  monsterSpawnTimer = 0;
  monsterSpawnInterval = 2.0;
  comboCount = 0;
  // 重置拾取物
  collectibles = [];
  collectibleSpawnTimer = 0;
  goldCollected = 0;
  autoMoveTimer = 0;
  console.log('冒险开始！');
}

// 结束冒险
function endAdventure() {
  gameState = 'gameover';
  console.log(`冒险结束！击杀: ${killCount}, 存活时间: ${Math.floor(adventureTime)}秒`);
}

// 返回待机
function returnToIdle() {
  gameState = 'idle';
  monsters = [];
}

// 攻击怪物
function attackMonsters() {
  if (walkTime - lastAttackTime < attackCooldown) return;

  const stats = getPlayerStats();
  const attackRange = 0.15; // 攻击范围
  let hitAny = false;

  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i];
    const dx = m.x - playerX;
    const dy = m.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < attackRange) {
      m.hp -= stats.atk;
      m.hitTimer = 0.15;
      hitAny = true;

      if (m.hp <= 0) {
        // 怪物死亡
        playerExp += m.exp;
        killCount++;
        comboCount++;
        monsters.splice(i, 1);

        // 升级检测
        while (playerExp >= expToNext) {
          playerExp -= expToNext;
          playerLevel++;
          expToNext = Math.floor(expToNext * 1.5);
          const newStats = getPlayerStats();
          playerMaxHP = newStats.hp;
          playerHP = Math.min(playerHP + 20, playerMaxHP);
          console.log(`升级! Lv.${playerLevel}`);
          saveGameData(); // 保存升级数据
        }
      }
    }
  }

  if (hitAny) {
    lastAttackTime = walkTime;
  }
}

// 更新冒险逻辑
function updateAdventure(dt) {
  if (gameState !== 'adventure') return;

  adventureTime += dt;

  // 难度随时间增加
  if (adventureTime > 30) monsterSpawnInterval = 1.5;
  if (adventureTime > 60) monsterSpawnInterval = 1.0;
  if (adventureTime > 120) monsterSpawnInterval = 0.7;

  // 生成怪物
  monsterSpawnTimer += dt;
  if (monsterSpawnTimer >= monsterSpawnInterval) {
    monsterSpawnTimer = 0;
    spawnMonster();
  }

  // 玩家移动
  if (isMoving) {
    const dx = playerTargetX - playerX;
    const dy = playerTargetY - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.01) {
      const speed = 0.008;
      playerX += (dx / dist) * speed;
      playerY += (dy / dist) * speed;
      playerX = Math.max(0.1, Math.min(0.9, playerX));
      playerY = Math.max(0.1, Math.min(0.9, playerY));
    } else {
      isMoving = false;
    }
  }

  // 更新怪物
  for (const m of monsters) {
    // 朝玩家移动
    const dx = playerX - m.x;
    const dy = playerY - m.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.05) {
      m.x += (dx / dist) * m.speed;
      m.y += (dy / dist) * m.speed;
    }

    // 攻击玩家
    if (dist < 0.08) {
      playerHP -= m.damage * dt;
      comboCount = 0;
    }

    // 更新被击中闪烁
    if (m.hitTimer > 0) {
      m.hitTimer -= dt;
    }
  }

  // 检查死亡
  if (playerHP <= 0) {
    playerHP = 0;
    endAdventure();
  }

  // 更新拾取物
  updateCollectibles(dt);

  // 自动移动AI（躲避怪物+拾取物品）
  if (!isMoving) {
    autoMoveAI();
  }
}

// ==================== 拾取物系统 ====================
let collectibles = [];
let collectibleSpawnTimer = 0;
const collectibleSpawnInterval = 3.0;
let goldCollected = 0;

const COLLECTIBLE_TYPES = {
  gold: { name: '金币', color: '#FFD700', value: 10, size: 0.02 },
  health: { name: '血瓶', color: '#FF6B6B', value: 20, size: 0.025 },
  exp: { name: '经验球', color: '#9C27B0', value: 15, size: 0.018 }
};

function spawnCollectible() {
  const types = Object.keys(COLLECTIBLE_TYPES);
  const type = types[Math.floor(Math.random() * types.length)];
  const info = COLLECTIBLE_TYPES[type];

  collectibles.push({
    type,
    x: 0.1 + Math.random() * 0.8,
    y: 0.1 + Math.random() * 0.8,
    value: info.value,
    size: info.size,
    bobPhase: Math.random() * Math.PI * 2
  });
}

function updateCollectibles(dt) {
  // 生成拾取物
  collectibleSpawnTimer += dt;
  if (collectibleSpawnTimer >= collectibleSpawnInterval && collectibles.length < 8) {
    collectibleSpawnTimer = 0;
    spawnCollectible();
  }

  // 检测拾取
  for (let i = collectibles.length - 1; i >= 0; i--) {
    const c = collectibles[i];
    const dx = c.x - playerX;
    const dy = c.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.08) {
      // 拾取成功
      const info = COLLECTIBLE_TYPES[c.type];
      if (c.type === 'gold') {
        goldCollected += c.value;
      } else if (c.type === 'health') {
        playerHP = Math.min(playerHP + c.value, playerMaxHP);
      } else if (c.type === 'exp') {
        playerExp += c.value;
        // 检查升级
        while (playerExp >= expToNext) {
          playerExp -= expToNext;
          playerLevel++;
          expToNext = Math.floor(expToNext * 1.5);
          const newStats = getPlayerStats();
          playerMaxHP = newStats.hp;
          playerHP = Math.min(playerHP + 20, playerMaxHP);
          saveGameData();
        }
      }
      collectibles.splice(i, 1);
    }
  }
}

function drawCollectible(x, y, scale, collectible, time) {
  const info = COLLECTIBLE_TYPES[collectible.type];
  const bob = Math.sin(time * 4 + collectible.bobPhase) * 3;
  const size = BASE_UNIT * 0.3 * scale;

  ctx.save();
  ctx.translate(x, y + bob);

  if (collectible.type === 'gold') {
    // 金币 - 圆形
    ctx.fillStyle = info.color;
    ctx.beginPath();
    ctx.arc(0, -size / 2, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#B8860B';
    ctx.font = `bold ${size * 0.4}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, -size / 2);
  } else if (collectible.type === 'health') {
    // 血瓶 - 瓶子形状
    ctx.fillStyle = info.color;
    ctx.fillRect(-size * 0.2, -size, size * 0.4, size * 0.8);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-size * 0.1, -size * 0.5, size * 0.2, size * 0.1);
    ctx.fillRect(-size * 0.05, -size * 0.6, size * 0.1, size * 0.3);
  } else if (collectible.type === 'exp') {
    // 经验球 - 星形
    ctx.fillStyle = info.color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 72 - 90) * Math.PI / 180;
      const r = size * 0.4;
      if (i === 0) ctx.moveTo(Math.cos(angle) * r, -size / 2 + Math.sin(angle) * r);
      else ctx.lineTo(Math.cos(angle) * r, -size / 2 + Math.sin(angle) * r);
      const angle2 = ((i * 72 + 36) - 90) * Math.PI / 180;
      ctx.lineTo(Math.cos(angle2) * r * 0.4, -size / 2 + Math.sin(angle2) * r * 0.4);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

// ==================== 自动移动AI ====================
let autoMoveTimer = 0;

function autoMoveAI() {
  autoMoveTimer += 0.016;
  if (autoMoveTimer < 0.5) return; // 每0.5秒决策一次
  autoMoveTimer = 0;

  // 计算最佳移动方向
  let bestX = playerX;
  let bestY = playerY;
  let bestScore = -Infinity;

  // 尝试多个方向
  const directions = [
    { dx: 0, dy: 0 },
    { dx: 0.1, dy: 0 },
    { dx: -0.1, dy: 0 },
    { dx: 0, dy: 0.1 },
    { dx: 0, dy: -0.1 },
    { dx: 0.07, dy: 0.07 },
    { dx: -0.07, dy: 0.07 },
    { dx: 0.07, dy: -0.07 },
    { dx: -0.07, dy: -0.07 }
  ];

  for (const dir of directions) {
    const testX = Math.max(0.1, Math.min(0.9, playerX + dir.dx));
    const testY = Math.max(0.1, Math.min(0.9, playerY + dir.dy));

    let score = 0;

    // 远离怪物得分（负距离权重高）
    for (const m of monsters) {
      const dx = testX - m.x;
      const dy = testY - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.15) {
        score -= (0.15 - dist) * 100; // 太近扣分很多
      } else {
        score += dist * 10; // 远离得分
      }
    }

    // 靠近拾取物得分
    for (const c of collectibles) {
      const dx = testX - c.x;
      const dy = testY - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // 只有在安全时才考虑拾取
      let isSafe = true;
      for (const m of monsters) {
        const mdx = c.x - m.x;
        const mdy = c.y - m.y;
        if (Math.sqrt(mdx * mdx + mdy * mdy) < 0.2) {
          isSafe = false;
          break;
        }
      }
      if (isSafe) {
        score += (0.5 - dist) * 30; // 靠近拾取物加分
        if (c.type === 'health' && playerHP < playerMaxHP * 0.5) {
          score += 50; // 低血量时血瓶加分更多
        }
      }
    }

    // 靠近怪物攻击得分（在安全范围内）
    for (const m of monsters) {
      const dx = testX - m.x;
      const dy = testY - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.1 && dist < 0.2) {
        score += 20; // 在攻击范围内得分
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestX = testX;
      bestY = testY;
    }
  }

  // 设置目标位置
  if (bestX !== playerX || bestY !== playerY) {
    playerTargetX = bestX;
    playerTargetY = bestY;
    isMoving = true;
  }
}

// ==================== 场景元素 ====================
const groundElements = [
  { type: 'tree', x: 0.12, y: 0.18 },
  { type: 'tree', x: 0.82, y: 0.28 },
  { type: 'grass', x: 0.28, y: 0.38 },
  { type: 'flower', x: 0.68, y: 0.12 },
  { type: 'grass', x: 0.42, y: 0.58 },
  { type: 'tree', x: 0.22, y: 0.72 },
  { type: 'flower', x: 0.58, y: 0.42 },
  { type: 'grass', x: 0.78, y: 0.62 },
  { type: 'tree', x: 0.48, y: 0.88 },
  { type: 'flower', x: 0.32, y: 0.52 },
  { type: 'grass', x: 0.72, y: 0.82 },
];

let lastSceneOffset = 0;

function getGroundPoint(groundQuad, x, y) {
  const p00 = groundQuad.farRight;
  const p10 = groundQuad.nearRight;
  const p01 = groundQuad.nearLeft;
  const p11 = groundQuad.farLeft;
  const screenX = (1-x)*(1-y)*p00.x + x*(1-y)*p10.x + (1-x)*y*p01.x + x*y*p11.x;
  const screenY = (1-x)*(1-y)*p00.y + x*(1-y)*p10.y + (1-x)*y*p01.y + x*y*p11.y;
  const distTo010 = Math.sqrt(x*x + y*y);
  const scale = 1.0 - distTo010 * 0.4;
  return { x: screenX, y: screenY, scale: Math.max(0.3, scale) };
}

function getDiamondCenter(groundQuad) { return getGroundPoint(groundQuad, 0.5, 0.5); }

// ==================== 绘制场景元素 ====================
// 比例说明：边长10m，人高1.7m(17%)，树高3m(30%)，草高0.3m(3%)，花高0.5m(5%)
// 屏幕上地面高度约为 H * 0.3，所以基础单位 = H * 0.3 / 10 = H * 0.03
const BASE_UNIT = Math.min(W, H) * 0.03;  // 1米在屏幕上的像素

function drawTree(x, y, scale) {
  const h = BASE_UNIT * 3 * scale;  // 树高3米
  const trunkH = h * 0.35;
  const crownH = h * 0.65;
  ctx.strokeStyle = '#5D4037';
  ctx.lineWidth = Math.max(1, 1.5 * scale);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - trunkH);
  ctx.stroke();
  ctx.strokeStyle = '#2E7D32';
  ctx.beginPath();
  ctx.moveTo(x, y - trunkH - crownH);
  ctx.lineTo(x - crownH * 0.4, y - trunkH);
  ctx.lineTo(x + crownH * 0.4, y - trunkH);
  ctx.closePath();
  ctx.stroke();
}

function drawGrass(x, y, scale) {
  const h = BASE_UNIT * 0.3 * scale;  // 草高0.3米
  ctx.strokeStyle = '#4CAF50';
  ctx.lineWidth = Math.max(1, 0.8 * scale);
  ctx.beginPath(); ctx.moveTo(x - 2 * scale, y); ctx.lineTo(x - 3 * scale, y - h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h * 1.2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 2 * scale, y); ctx.lineTo(x + 3 * scale, y - h); ctx.stroke();
}

function drawFlower(x, y, scale) {
  const h = BASE_UNIT * 0.5 * scale;  // 花高0.5米
  ctx.strokeStyle = '#4CAF50';
  ctx.lineWidth = Math.max(1, 0.8 * scale);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
  ctx.strokeStyle = '#FF6B6B';
  ctx.lineWidth = Math.max(1, 1.5 * scale);
  const flowerSize = BASE_UNIT * 0.12 * scale;
  const cx = x, cy = y - h;
  ctx.beginPath(); ctx.moveTo(cx, cy - flowerSize); ctx.lineTo(cx, cy + flowerSize); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - flowerSize, cy); ctx.lineTo(cx + flowerSize, cy); ctx.stroke();
}

// ==================== 武器绘制 ====================
function drawWeapon(weaponType, handX, handY, scale, angle, facingRight) {
  const s = scale * 0.8;
  const flip = facingRight;
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(angle);
  ctx.scale(flip, 1);

  switch (weaponType) {
    case 'sword': // 剑
      ctx.strokeStyle = '#757575';
      ctx.lineWidth = Math.max(1, 2 * s);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -BASE_UNIT * 0.8 * s);
      ctx.stroke();
      // 剑刃
      ctx.strokeStyle = '#B0BEC5';
      ctx.lineWidth = Math.max(1, 3 * s);
      ctx.beginPath();
      ctx.moveTo(0, -BASE_UNIT * 0.8 * s);
      ctx.lineTo(0, -BASE_UNIT * 1.5 * s);
      ctx.stroke();
      // 剑尖
      ctx.beginPath();
      ctx.moveTo(0, -BASE_UNIT * 1.5 * s);
      ctx.lineTo(0, -BASE_UNIT * 1.7 * s);
      ctx.strokeStyle = '#CFD8DC';
      ctx.lineWidth = Math.max(1, 1 * s);
      ctx.stroke();
      // 护手
      ctx.strokeStyle = '#8D6E63';
      ctx.lineWidth = Math.max(1, 2 * s);
      ctx.beginPath();
      ctx.moveTo(-BASE_UNIT * 0.15 * s, -BASE_UNIT * 0.75 * s);
      ctx.lineTo(BASE_UNIT * 0.15 * s, -BASE_UNIT * 0.75 * s);
      ctx.stroke();
      break;

    case 'staff': // 法杖
      ctx.strokeStyle = '#5D4037';
      ctx.lineWidth = Math.max(1, 2 * s);
      ctx.beginPath();
      ctx.moveTo(0, BASE_UNIT * 0.3 * s);
      ctx.lineTo(0, -BASE_UNIT * 1.8 * s);
      ctx.stroke();
      // 法杖头部水晶
      ctx.fillStyle = '#7E57C2';
      ctx.beginPath();
      ctx.arc(0, -BASE_UNIT * 1.9 * s, BASE_UNIT * 0.12 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#B39DDB';
      ctx.lineWidth = 1;
      ctx.stroke();
      break;

    case 'bow': // 弓
      ctx.strokeStyle = '#8D6E63';
      ctx.lineWidth = Math.max(1, 2 * s);
      ctx.beginPath();
      ctx.arc(BASE_UNIT * 0.3 * s, -BASE_UNIT * 0.5 * s, BASE_UNIT * 0.8 * s, Math.PI * 0.7, Math.PI * 1.3);
      ctx.stroke();
      // 弓弦
      ctx.strokeStyle = '#BDBDBD';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(BASE_UNIT * 0.05 * s, BASE_UNIT * 0.2 * s);
      ctx.lineTo(BASE_UNIT * 0.05 * s, -BASE_UNIT * 1.2 * s);
      ctx.stroke();
      break;

    case 'dagger': // 匕首
      ctx.strokeStyle = '#424242';
      ctx.lineWidth = Math.max(1, 1.5 * s);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -BASE_UNIT * 0.5 * s);
      ctx.stroke();
      ctx.strokeStyle = '#90A4AE';
      ctx.lineWidth = Math.max(1, 2.5 * s);
      ctx.beginPath();
      ctx.moveTo(0, -BASE_UNIT * 0.5 * s);
      ctx.lineTo(0, -BASE_UNIT * 0.9 * s);
      ctx.stroke();
      break;

    case 'wand': // 魔杖
      ctx.strokeStyle = '#FFF8E1';
      ctx.lineWidth = Math.max(1, 1.5 * s);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -BASE_UNIT * 1.0 * s);
      ctx.stroke();
      // 魔杖顶部星星
      ctx.fillStyle = '#FFD54F';
      ctx.beginPath();
      const starY = -BASE_UNIT * 1.1 * s;
      for (let i = 0; i < 5; i++) {
        const a = (i * 72 - 90) * Math.PI / 180;
        const r = BASE_UNIT * 0.08 * s;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, starY + Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, starY + Math.sin(a) * r);
        const a2 = ((i * 72 + 36) - 90) * Math.PI / 180;
        ctx.lineTo(Math.cos(a2) * r * 0.4, starY + Math.sin(a2) * r * 0.4);
      }
      ctx.closePath();
      ctx.fill();
      break;

    case 'lance': // 长枪
      ctx.strokeStyle = '#5D4037';
      ctx.lineWidth = Math.max(1, 2.5 * s);
      ctx.beginPath();
      ctx.moveTo(0, BASE_UNIT * 0.5 * s);
      ctx.lineTo(0, -BASE_UNIT * 2.0 * s);
      ctx.stroke();
      // 枪头
      ctx.fillStyle = '#78909C';
      ctx.beginPath();
      ctx.moveTo(0, -BASE_UNIT * 2.0 * s);
      ctx.lineTo(-BASE_UNIT * 0.08 * s, -BASE_UNIT * 2.3 * s);
      ctx.lineTo(0, -BASE_UNIT * 2.5 * s);
      ctx.lineTo(BASE_UNIT * 0.08 * s, -BASE_UNIT * 2.3 * s);
      ctx.closePath();
      ctx.fill();
      break;
  }
  ctx.restore();
}

// 绘制护甲效果
function drawArmor(armorType, x, shoulderY, bodyLen, bodyW, headR, scale, classColor) {
  const s = scale;
  switch (armorType) {
    case 'heavy': // 重甲
      ctx.strokeStyle = classColor;
      ctx.lineWidth = Math.max(2, 4 * s);
      // 胸甲
      ctx.beginPath();
      ctx.moveTo(-bodyW * 1.3, shoulderY);
      ctx.lineTo(-bodyW * 1.3, shoulderY + bodyLen * 0.6);
      ctx.lineTo(bodyW * 1.3, shoulderY + bodyLen * 0.6);
      ctx.lineTo(bodyW * 1.3, shoulderY);
      ctx.stroke();
      // 肩甲
      ctx.beginPath();
      ctx.arc(-bodyW * 1.5, shoulderY, bodyW * 0.4, 0, Math.PI, true);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bodyW * 1.5, shoulderY, bodyW * 0.4, 0, Math.PI, true);
      ctx.stroke();
      break;

    case 'light': // 轻甲
      ctx.strokeStyle = classColor;
      ctx.lineWidth = Math.max(1, 2 * s);
      // 皮甲
      ctx.beginPath();
      ctx.moveTo(-bodyW, shoulderY + bodyLen * 0.2);
      ctx.lineTo(-bodyW, shoulderY + bodyLen * 0.5);
      ctx.lineTo(bodyW, shoulderY + bodyLen * 0.5);
      ctx.lineTo(bodyW, shoulderY + bodyLen * 0.2);
      ctx.stroke();
      break;

    case 'robe': // 法袍
      ctx.strokeStyle = classColor;
      ctx.lineWidth = Math.max(1, 1.5 * s);
      // 长袍
      ctx.beginPath();
      ctx.moveTo(-bodyW * 0.8, shoulderY);
      ctx.lineTo(-bodyW * 1.2, shoulderY + bodyLen * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bodyW * 0.8, shoulderY);
      ctx.lineTo(bodyW * 1.2, shoulderY + bodyLen * 1.5);
      ctx.stroke();
      // 兜帽轮廓
      ctx.beginPath();
      ctx.arc(0, shoulderY - headR * 0.5, headR * 1.3, Math.PI * 0.8, Math.PI * 0.2, true);
      ctx.stroke();
      break;
  }
}

// ==================== 火柴人 ====================
function getStickManDirection(groundQuad) {
  const zeroPos = getZeroGroundCoords(groundQuad);
  const dx = zeroPos.x - 0.5;
  const dy = zeroPos.y - 0.5;
  return Math.atan2(dx, -dy);
}

function drawStickMan(x, y, scale, time, groundQuad) {
  const speed = stickManSpeed;
  const t = time * (4 + speed * 6);
  const targetFacing = groundQuad ? getStickManDirection(groundQuad) : 0;
  const facing = poseState.initialized ? lerpAngle(poseState.facing, targetFacing, 0.1) : targetFacing;
  poseState.facing = facing;
  poseState.initialized = true;

  const sideView = Math.abs(Math.sin(facing));
  const facingRight = Math.sin(facing) >= 0 ? 1 : -1;
  const facingAway = Math.cos(facing);

  // 人高1.7米，头0.25m，躯干0.6m，腿0.85m
  const personH = BASE_UNIT * 1.7 * scale;
  const len = personH / 3.8;  // 基础单位
  const headR = len * 0.5;    // 头半径 ~0.25m
  const bodyLen = len * 1.3;  // 躯干 ~0.6m
  const legLen = len * 1.0;   // 腿 ~0.85m (大腿+小腿)
  const armLen = len * 0.7;   // 手臂
  const bodyW = len * 0.4 * (0.3 + Math.abs(facingAway) * 0.7);

  const swingAmp = 0.5 + speed * 0.3;
  const rThigh = Math.sin(t) * swingAmp;
  const rShin = Math.sin(t - 0.5) * swingAmp * 0.8 - 0.3;
  const lThigh = Math.sin(t + Math.PI) * swingAmp;
  const lShin = Math.sin(t + Math.PI - 0.5) * swingAmp * 0.8 - 0.3;
  const rArm = Math.sin(t + Math.PI) * swingAmp * 0.6;
  const rForearm = Math.sin(t + Math.PI - 0.3) * swingAmp * 0.4 + 0.5;
  const lArm = Math.sin(t) * swingAmp * 0.6;
  const lForearm = Math.sin(t - 0.3) * swingAmp * 0.4 + 0.5;
  const bounce = Math.abs(Math.sin(t * 2)) * 2 * scale * speed;

  ctx.save();
  ctx.translate(x, y - bounce);

  const hipY = 0;
  const shoulderY = hipY - bodyLen;
  const headY = shoulderY - len * 0.3 - headR;
  const rHipX = bodyW * facingRight;
  const lHipX = -bodyW * facingRight;
  const rShoulderX = bodyW * 1.2 * facingRight;
  const lShoulderX = -bodyW * 1.2 * facingRight;
  const legSwingX = sideView * facingRight;

  const rKneeX = rHipX + Math.sin(rThigh) * legLen * legSwingX;
  const rKneeY = hipY + Math.cos(rThigh) * legLen;
  const rFootX = rKneeX + Math.sin(rThigh + rShin) * legLen * legSwingX;
  const rFootY = rKneeY + Math.cos(rThigh + rShin) * legLen;
  const lKneeX = lHipX + Math.sin(lThigh) * legLen * legSwingX;
  const lKneeY = hipY + Math.cos(lThigh) * legLen;
  const lFootX = lKneeX + Math.sin(lThigh + lShin) * legLen * legSwingX;
  const lFootY = lKneeY + Math.cos(lThigh + lShin) * legLen;
  const rElbowX = rShoulderX + Math.sin(rArm) * armLen * legSwingX;
  const rElbowY = shoulderY + Math.cos(rArm) * armLen;
  const rHandX = rElbowX + Math.sin(rArm + rForearm) * armLen * legSwingX;
  const rHandY = rElbowY + Math.cos(rArm + rForearm) * armLen;
  const lElbowX = lShoulderX + Math.sin(lArm) * armLen * legSwingX;
  const lElbowY = shoulderY + Math.cos(lArm) * armLen;
  const lHandX = lElbowX + Math.sin(lArm + lForearm) * armLen * legSwingX;
  const lHandY = lElbowY + Math.cos(lArm + lForearm) * armLen;

  ctx.strokeStyle = '#333333';
  ctx.fillStyle = '#333333';
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const rLegForward = rThigh > 0;
  const drawRightFirst = facingAway > 0 ? !rLegForward : rLegForward;
  const frontColor = '#333333';
  const backColor = '#666666';

  ctx.strokeStyle = backColor;
  if (drawRightFirst) {
    ctx.beginPath(); ctx.moveTo(rHipX, hipY); ctx.lineTo(rKneeX, rKneeY); ctx.lineTo(rFootX, rFootY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rShoulderX, shoulderY); ctx.lineTo(rElbowX, rElbowY); ctx.lineTo(rHandX, rHandY); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(lHipX, hipY); ctx.lineTo(lKneeX, lKneeY); ctx.lineTo(lFootX, lFootY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lShoulderX, shoulderY); ctx.lineTo(lElbowX, lElbowY); ctx.lineTo(lHandX, lHandY); ctx.stroke();
  }

  ctx.strokeStyle = frontColor;
  ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(0, shoulderY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lHipX, hipY); ctx.lineTo(rHipX, hipY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lShoulderX, shoulderY); ctx.lineTo(rShoulderX, shoulderY); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, headY, headR, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = frontColor;
  if (drawRightFirst) {
    ctx.beginPath(); ctx.moveTo(lHipX, hipY); ctx.lineTo(lKneeX, lKneeY); ctx.lineTo(lFootX, lFootY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lShoulderX, shoulderY); ctx.lineTo(lElbowX, lElbowY); ctx.lineTo(lHandX, lHandY); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(rHipX, hipY); ctx.lineTo(rKneeX, rKneeY); ctx.lineTo(rFootX, rFootY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rShoulderX, shoulderY); ctx.lineTo(rElbowX, rElbowY); ctx.lineTo(rHandX, rHandY); ctx.stroke();
  }

  // 绘制装备和武器
  const classInfo = CLASS_TYPES[currentClass];

  // 绘制护甲
  drawArmor(classInfo.armor, 0, shoulderY, bodyLen, bodyW, headR, scale, classInfo.color);

  // 绘制武器（在前手）
  const weaponAngle = Math.sin(t) * 0.3; // 武器随走路摆动
  if (drawRightFirst) {
    drawWeapon(classInfo.weapon, lHandX, lHandY, scale, weaponAngle, facingRight);
  } else {
    drawWeapon(classInfo.weapon, rHandX, rHandY, scale, weaponAngle, facingRight);
  }

  ctx.restore();
}

function getZeroGroundCoords(groundQuad) {
  const zero = projCache.get('000');
  if (!zero) return { x: 0.5, y: 0.5 };
  const p00 = groundQuad.farRight;
  const p10 = groundQuad.nearRight;
  const p01 = groundQuad.nearLeft;
  const xAxis = { x: p10.x - p00.x, y: p10.y - p00.y };
  const yAxis = { x: p01.x - p00.x, y: p01.y - p00.y };
  const v = { x: zero.x - p00.x, y: zero.y - p00.y };
  const det = xAxis.x * yAxis.y - xAxis.y * yAxis.x;
  if (Math.abs(det) < 0.001) return { x: 0.5, y: 0.5 };
  const gx = (v.x * yAxis.y - v.y * yAxis.x) / det;
  const gy = (xAxis.x * v.y - xAxis.y * v.x) / det;
  return { x: gx, y: gy };
}

function drawGroundElement(groundQuad, type, x, y) {
  // 严格限制在正方形面内 (0-1 范围)
  if (x < 0.02 || x > 0.98 || y < 0.02 || y > 0.98) return;
  const pt = getGroundPoint(groundQuad, x, y);
  if (type === 'tree') drawTree(pt.x, pt.y, pt.scale);
  else if (type === 'grass') drawGrass(pt.x, pt.y, pt.scale);
  else if (type === 'flower') drawFlower(pt.x, pt.y, pt.scale);
}

function drawGroundScene(groundQuad) {
  const zeroPos = getZeroGroundCoords(groundQuad);
  const dirX = 0.5 - zeroPos.x;
  const dirY = 0.5 - zeroPos.y;
  const len = Math.sqrt(dirX * dirX + dirY * dirY);
  const normX = len > 0.01 ? dirX / len : 0;
  const normY = len > 0.01 ? dirY / len : 0;
  const deltaOffset = sceneOffset - lastSceneOffset;
  lastSceneOffset = sceneOffset;

  // 冒险模式下计算相机偏移（让玩家保持在中心）
  const isAdventure = (gameState === 'adventure' || gameState === 'gameover');
  const cameraOffsetX = isAdventure ? (0.5 - playerX) : 0;
  const cameraOffsetY = isAdventure ? (0.5 - playerY) : 0;

  // 待机模式下场景元素移动
  if (gameState === 'idle') {
    for (const elem of groundElements) {
      elem.x += deltaOffset * normX;
      elem.y += deltaOffset * normY;
      elem.x = ((elem.x % 1.0) + 1.0) % 1.0;
      elem.y = ((elem.y % 1.0) + 1.0) % 1.0;
    }
  }

  // 绘制地面元素（带相机偏移）
  for (const elem of groundElements) {
    let drawX = elem.x + cameraOffsetX;
    let drawY = elem.y + cameraOffsetY;
    // 冒险模式下元素可以超出边界（但仍需在可视范围内）
    if (isAdventure) {
      if (drawX >= -0.2 && drawX <= 1.2 && drawY >= -0.2 && drawY <= 1.2) {
        drawX = Math.max(0.02, Math.min(0.98, drawX));
        drawY = Math.max(0.02, Math.min(0.98, drawY));
        drawGroundElement(groundQuad, elem.type, drawX, drawY);
      }
    } else {
      drawGroundElement(groundQuad, elem.type, elem.x, elem.y);
    }
  }

  // 冒险模式：绘制拾取物（带相机偏移）
  if (isAdventure) {
    for (const c of collectibles) {
      const drawX = c.x + cameraOffsetX;
      const drawY = c.y + cameraOffsetY;
      if (drawX >= 0.02 && drawX <= 0.98 && drawY >= 0.02 && drawY <= 0.98) {
        const pt = getGroundPoint(groundQuad, drawX, drawY);
        drawCollectible(pt.x, pt.y, pt.scale, c, walkTime);
      }
    }
  }

  // 冒险模式：绘制怪物（带相机偏移）
  if (isAdventure) {
    for (const m of monsters) {
      const drawX = m.x + cameraOffsetX;
      const drawY = m.y + cameraOffsetY;
      if (drawX >= 0.02 && drawX <= 0.98 && drawY >= 0.02 && drawY <= 0.98) {
        const pt = getGroundPoint(groundQuad, drawX, drawY);
        drawZombie(pt.x, pt.y, pt.scale, m, walkTime);
      }
    }
  }

  // 绘制玩家（冒险模式下始终在中心）
  if (isAdventure) {
    const centerPt = getGroundPoint(groundQuad, 0.5, 0.5);
    drawStickMan(centerPt.x, centerPt.y, centerPt.scale, walkTime, groundQuad);
  } else {
    const stickPt = getDiamondCenter(groundQuad);
    drawStickMan(stickPt.x, stickPt.y, stickPt.scale, walkTime, groundQuad);
  }
}

// ==================== 点击检测 ====================
function hitTest(px, py) {
  let best = null;
  let bestD2 = Infinity;
  const hitRadius = 25;
  const frontBits = getFrontBits();
  for (const bits in trigramPos) {
    if (bits === frontBits) continue;
    const p = projCache.get(bits);
    if (!p) continue;
    const dx = px - p.x;
    const dy = py - p.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < hitRadius * hitRadius && d2 < bestD2) {
      bestD2 = d2;
      best = bits;
    }
  }
  return best;
}

// ==================== 主绘制函数 ====================
function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, W, H);

  updateProjCache();
  const frontBits = getFrontBits();

  // 绘制边
  const visibleEdges = edges.filter(e => e.a !== frontBits && e.b !== frontBits);
  const sortedEdges = visibleEdges.map(e => {
    const pa = projCache.get(e.a);
    const pb = projCache.get(e.b);
    return { ...e, pa, pb, avgZ: (pa.z + pb.z) / 2 };
  }).sort((a, b) => a.avgZ - b.avgZ);

  for (const e of sortedEdges) {
    ctx.beginPath();
    ctx.moveTo(e.pa.x, e.pa.y);
    ctx.lineTo(e.pb.x, e.pb.y);
    ctx.strokeStyle = getEdgeColor(e.val);
    ctx.lineWidth = e.avgZ > 0 ? 4 : 3;
    if (e.val === 0) {
      ctx.save();
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = e.avgZ > 0 ? 6 : 5;
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = e.avgZ > 0 ? 3 : 2;
    }
    ctx.stroke();
  }

  // 绘制顶点
  const sortedVerts = trigramBits
    .filter(bits => bits !== frontBits)
    .map(bits => ({ bits, p: projCache.get(bits), name: bitsToName[bits] }))
    .sort((a, b) => a.p.z - b.p.z);

  for (const v of sortedVerts) {
    const p = v.p;
    const isFront = p.z > 0;
    const radius = isFront ? 12 : 9;
    const nodeColor = getNodeColor(v.bits);
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = '#666666';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = nodeColor;
    ctx.fill();
    ctx.fillStyle = '#333333';
    ctx.font = isFront ? 'bold 13px sans-serif' : '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(v.bits, p.x, p.y - radius - 12);
  }

  // 地面场景
  const visibleVerts = trigramBits
    .filter(bits => bits !== getFrontBits())
    .map(bits => ({ bits, p: projCache.get(bits) }))
    .filter(v => v.p);
  visibleVerts.sort((a, b) => b.p.y - a.p.y);

  if (visibleVerts.length >= 4) {
    const bottom4 = visibleVerts.slice(0, 4);
    const bottomPt = bottom4[0].p;
    const sidePts = bottom4.slice(1, 3);
    const leftPt = sidePts[0].p.x < sidePts[1].p.x ? sidePts[0].p : sidePts[1].p;
    const rightPt = sidePts[0].p.x < sidePts[1].p.x ? sidePts[1].p : sidePts[0].p;
    const topPt = bottom4[3].p;
    const groundQuad = { nearLeft: leftPt, nearRight: rightPt, farLeft: topPt, farRight: bottomPt };
    drawGroundScene(groundQuad);
  }

  // UI - 左上角宫位信息
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`宫视角: ${currentPalace}宫`, 15, 25);
  if (gameState === 'idle') {
    ctx.font = '11px sans-serif';
    ctx.fillText('点击顶点切换视角', 15, 42);
  }

  // 右上角 - 职阶信息面板
  const classInfo = CLASS_TYPES[currentClass];
  const stats = getPlayerStats();
  const panelX = W - 130;
  const panelY = 10;

  // 面板背景
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(panelX - 5, panelY, 125, 95);

  // 职阶名称
  ctx.fillStyle = classInfo.color;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${classInfo.name} Lv.${playerLevel}`, panelX, panelY + 15);

  // 属性
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '10px sans-serif';
  ctx.fillText(`力量:${stats.str} 敏捷:${stats.agi}`, panelX, panelY + 32);
  ctx.fillText(`智力:${stats.int} 体力:${stats.vit}`, panelX, panelY + 45);
  ctx.fillText(`HP:${stats.hp} MP:${stats.mp}`, panelX, panelY + 58);
  ctx.fillText(`攻击:${stats.atk} 防御:${stats.def}`, panelX, panelY + 71);

  // 切换提示（只在待机模式显示）
  if (gameState === 'idle') {
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '9px sans-serif';
    ctx.fillText('点击此处切换职阶', panelX, panelY + 88);
  }

  // 底部 - 职阶图标（只在待机模式显示）
  if (gameState === 'idle') {
    const iconSize = 35;
    const iconY = H - iconSize - 15;
    const iconSpacing = 45;
    const classKeys = Object.keys(CLASS_TYPES);
    const totalWidth = classKeys.length * iconSpacing - (iconSpacing - iconSize);
    const startX = (W - totalWidth) / 2;

    for (let i = 0; i < classKeys.length; i++) {
      const key = classKeys[i];
      const info = CLASS_TYPES[key];
      const ix = startX + i * iconSpacing;

      // 图标背景
      ctx.fillStyle = key === currentClass ? info.color : 'rgba(100,100,100,0.6)';
      ctx.fillRect(ix, iconY, iconSize, iconSize);

      // 边框
      if (key === currentClass) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(ix, iconY, iconSize, iconSize);
      }

      // 职阶首字
      ctx.fillStyle = key === currentClass ? '#FFFFFF' : '#CCCCCC';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(info.name[0], ix + iconSize / 2, iconY + iconSize / 2 + 5);
    }

    // 底部提示
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('点击下方图标切换职阶', W / 2, iconY - 5);

    // 开始冒险按钮 - 左下角
    const btnW = 90;
    const btnH = 35;
    const btnX = 15;
    const btnY = H - btnH - 20;

    // 按钮背景
    ctx.fillStyle = 'rgba(200, 50, 50, 0.9)';
    ctx.fillRect(btnX, btnY, btnW, btnH);

    // 按钮边框
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    // 按钮文字
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('开始冒险', btnX + btnW / 2, btnY + btnH / 2);
  }

  // 冒险模式UI
  if (gameState === 'adventure') {
    // 冒险模式 - 底部HP血条
    const hpBarW = W * 0.6;
    const hpBarH = 20;
    const hpBarX = (W - hpBarW) / 2;
    const hpBarY = H - 70;

    // 血条背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(hpBarX - 5, hpBarY - 5, hpBarW + 10, hpBarH + 25);

    // 血条底
    ctx.fillStyle = '#333333';
    ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);

    // 血条
    const hpRatio = Math.max(0, playerHP / playerMaxHP);
    const hpColor = hpRatio > 0.5 ? '#4CAF50' : hpRatio > 0.25 ? '#FF9800' : '#F44336';
    ctx.fillStyle = hpColor;
    ctx.fillRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH);

    // HP数值
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`HP: ${Math.ceil(playerHP)} / ${playerMaxHP}`, W / 2, hpBarY + hpBarH / 2 + 1);

    // 信息显示
    ctx.font = '11px sans-serif';
    ctx.fillText(`击杀: ${killCount}  金币: ${goldCollected}  时间: ${Math.floor(adventureTime)}s`, W / 2, hpBarY + hpBarH + 12);

    // 操作提示
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px sans-serif';
    ctx.fillText('角色自动移动躲避怪物 | 点击可手动控制', W / 2, 60);
  }

  // 游戏结束UI
  if (gameState === 'gameover') {
    // 游戏结束画面
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#FF4444';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('游戏结束', W / 2, H / 2 - 60);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '18px sans-serif';
    ctx.fillText(`击杀数: ${killCount}`, W / 2, H / 2 - 20);
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`金币: ${goldCollected}`, W / 2, H / 2 + 10);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`存活时间: ${Math.floor(adventureTime)}秒`, W / 2, H / 2 + 40);

    // 重新开始按钮
    const btnW = 120;
    const btnH = 45;
    const btnX = (W - btnW) / 2;
    const btnY = H / 2 + 80;

    ctx.fillStyle = 'rgba(50, 150, 50, 0.9)';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('返回', btnX + btnW / 2, btnY + btnH / 2);
  }
}

// ==================== 游戏循环 ====================
let lastTime = Date.now();

function gameLoop() {
  const now = Date.now();
  const dt = Math.min((now - lastTime) / 1000, 0.1); // 最大0.1秒，防止跳帧
  lastTime = now;

  walkTime += dt;
  stickManSpeed += (targetSpeed - stickManSpeed) * SPEED_LERP;
  sceneOffset += BASE_SCENE_SPEED * stickManSpeed;

  // 更新冒险逻辑
  updateAdventure(dt);

  // 冒险模式下自动攻击
  if (gameState === 'adventure') {
    attackMonsters();
  }

  draw();
  requestAnimationFrame(gameLoop);
}

// ==================== 触摸事件 ====================
let touchStart = null;
let cachedGroundQuad = null;

// 缓存地面四边形用于点击检测
function updateGroundQuadCache() {
  const frontBits = getFrontBits();
  const visibleVerts = trigramBits
    .filter(bits => bits !== frontBits)
    .map(bits => ({ bits, p: projCache.get(bits) }))
    .filter(v => v.p);
  visibleVerts.sort((a, b) => b.p.y - a.p.y);

  if (visibleVerts.length >= 4) {
    const bottom4 = visibleVerts.slice(0, 4);
    const bottomPt = bottom4[0].p;
    const sidePts = bottom4.slice(1, 3);
    const leftPt = sidePts[0].p.x < sidePts[1].p.x ? sidePts[0].p : sidePts[1].p;
    const rightPt = sidePts[0].p.x < sidePts[1].p.x ? sidePts[1].p : sidePts[0].p;
    const topPt = bottom4[3].p;
    cachedGroundQuad = { nearLeft: leftPt, nearRight: rightPt, farLeft: topPt, farRight: bottomPt };
  }
}

// 屏幕坐标转地面坐标
function screenToGround(sx, sy) {
  if (!cachedGroundQuad) return null;
  const q = cachedGroundQuad;
  // 简化：使用逆双线性插值近似
  const p00 = q.farRight;
  const p10 = q.nearRight;
  const p01 = q.nearLeft;
  const p11 = q.farLeft;

  // 迭代求解
  let gx = 0.5, gy = 0.5;
  for (let iter = 0; iter < 10; iter++) {
    const px = (1-gx)*(1-gy)*p00.x + gx*(1-gy)*p10.x + (1-gx)*gy*p01.x + gx*gy*p11.x;
    const py = (1-gx)*(1-gy)*p00.y + gx*(1-gy)*p10.y + (1-gx)*gy*p01.y + gx*gy*p11.y;
    const errX = sx - px;
    const errY = sy - py;
    if (Math.abs(errX) < 1 && Math.abs(errY) < 1) break;
    // 简单梯度下降
    gx += errX * 0.002;
    gy += errY * 0.002;
    gx = Math.max(0, Math.min(1, gx));
    gy = Math.max(0, Math.min(1, gy));
  }
  return { x: gx, y: gy };
}

wx.onTouchStart((e) => {
  if (e.touches.length > 0) {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
    updateGroundQuadCache();
  }
});

wx.onTouchEnd((e) => {
  if (!touchStart || !e.changedTouches.length) return;
  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  const dt = Date.now() - touchStart.t;
  const tx = touch.clientX;
  const ty = touch.clientY;

  // 游戏结束状态 - 检查返回按钮
  if (gameState === 'gameover') {
    const btnW = 120;
    const btnH = 45;
    const btnX = (W - btnW) / 2;
    const btnY = H / 2 + 80;
    if (tx >= btnX && tx <= btnX + btnW && ty >= btnY && ty <= btnY + btnH) {
      returnToIdle();
      touchStart = null;
      return;
    }
    touchStart = null;
    return;
  }

  // 冒险模式 - 点击移动
  if (gameState === 'adventure') {
    const groundPos = screenToGround(tx, ty);
    if (groundPos) {
      // 屏幕坐标转世界坐标（因为相机跟随玩家，屏幕中心=玩家位置）
      const worldX = groundPos.x - 0.5 + playerX;
      const worldY = groundPos.y - 0.5 + playerY;
      // 限制在有效范围内
      if (worldX >= 0.1 && worldX <= 0.9 && worldY >= 0.1 && worldY <= 0.9) {
        playerTargetX = worldX;
        playerTargetY = worldY;
        isMoving = true;
      }
    }
    touchStart = null;
    return;
  }

  // 待机模式的交互
  if (dt < 300 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
    // 检查是否点击了"开始冒险"按钮（左下角）
    const advBtnW = 90;
    const advBtnH = 35;
    const advBtnX = 15;
    const advBtnY = H - advBtnH - 20;
    if (tx >= advBtnX && tx <= advBtnX + advBtnW && ty >= advBtnY && ty <= advBtnY + advBtnH) {
      startAdventure();
      touchStart = null;
      return;
    }

    // 检查是否点击了底部职阶图标
    const iconSize = 35;
    const iconY = H - iconSize - 15;
    const iconSpacing = 45;
    const classKeys = Object.keys(CLASS_TYPES);
    const totalWidth = classKeys.length * iconSpacing - (iconSpacing - iconSize);
    const startX = (W - totalWidth) / 2;

    if (ty >= iconY && ty <= iconY + iconSize) {
      for (let i = 0; i < classKeys.length; i++) {
        const ix = startX + i * iconSpacing;
        if (tx >= ix && tx <= ix + iconSize) {
          currentClass = classKeys[i];
          console.log(`切换职阶: ${CLASS_TYPES[currentClass].name}`);
          saveGameData(); // 保存职阶选择
          touchStart = null;
          return;
        }
      }
    }

    // 检查是否点击了右上角面板（切换到下一职阶）
    const panelX = W - 130;
    const panelY = 10;
    if (tx >= panelX - 5 && tx <= panelX + 120 && ty >= panelY && ty <= panelY + 95) {
      const keys = Object.keys(CLASS_TYPES);
      const currentIdx = keys.indexOf(currentClass);
      currentClass = keys[(currentIdx + 1) % keys.length];
      console.log(`切换职阶: ${CLASS_TYPES[currentClass].name}`);
      saveGameData(); // 保存职阶选择
      touchStart = null;
      return;
    }

    // 检查是否点击了立方体顶点
    const hit = hitTest(tx, ty);
    if (hit) {
      const name = bitsToName[hit];
      if (palacePairs[name]) {
        currentPalace = name;
        rotX = 0; rotY = 0; rotZ = Math.PI;
        saveGameData(); // 保存宫位选择
      }
    }
  }
  touchStart = null;
});

// ==================== 启动 ====================
console.log('========================================');
console.log('八卦立方体 - Canvas 2D 模式');
console.log('版本: 1.0.0');
console.log('========================================');

requestAnimationFrame(gameLoop);
