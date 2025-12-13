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

// ==================== 角色系统 ====================
// 默认角色（10级前使用最低属性）
const DEFAULT_CHARACTER = {
  name: '火柴人',
  color: '#666666',
  stats: {
    hp: 50,       // 最低生命
    spd: 0.7,     // 较慢移速
    dmg: 5,       // 最低伤害
    atkSpd: 0.8,  // 较慢攻速
    range: 0.12,  // 最短射程
    luck: 1       // 最低暴击
  },
  weapon: 'none',
  armor: 'none',
  description: '普通的火柴人'
};

// 职阶系统（10级后解锁）
// 参考以撒的结合设计：HP、移速、伤害、攻速、射程、幸运
const CLASS_TYPES = {
  warrior: {
    name: '战士',
    color: '#C62828',
    stats: {
      hp: 100,      // 生命值
      spd: 0.8,     // 移速 (1.0为基准)
      dmg: 12,      // 伤害
      atkSpd: 0.6,  // 攻速 (秒/次，越小越快)
      range: 0.15,  // 攻击范围
      luck: 5       // 幸运(暴击率%)
    },
    weapon: 'sword',
    armor: 'heavy',
    description: '均衡近战，高生命'
  },
  mage: {
    name: '法师',
    color: '#5E35B1',
    stats: {
      hp: 60,
      spd: 0.7,
      dmg: 18,      // 高伤害
      atkSpd: 0.8,  // 攻击慢
      range: 0.25,  // 远程
      luck: 3
    },
    weapon: 'staff',
    armor: 'robe',
    description: '脆皮高伤，远程攻击'
  },
  archer: {
    name: '弓箭手',
    color: '#2E7D32',
    stats: {
      hp: 70,
      spd: 1.0,     // 标准速度
      dmg: 10,
      atkSpd: 0.4,  // 攻击快
      range: 0.22,  // 远程
      luck: 8
    },
    weapon: 'bow',
    armor: 'light',
    description: '灵活远程，高攻速'
  },
  assassin: {
    name: '刺客',
    color: '#37474F',
    stats: {
      hp: 50,       // 最脆
      spd: 1.3,     // 最快
      dmg: 15,      // 高伤害
      atkSpd: 0.35, // 最快攻速
      range: 0.12,  // 近战
      luck: 20      // 高暴击
    },
    weapon: 'dagger',
    armor: 'light',
    description: '高速高暴击，极脆'
  },
  priest: {
    name: '牧师',
    color: '#FDD835',
    stats: {
      hp: 80,
      spd: 0.85,
      dmg: 6,       // 低伤害
      atkSpd: 0.7,
      range: 0.18,
      luck: 10,
      healRate: 2   // 每秒回血
    },
    weapon: 'wand',
    armor: 'robe',
    description: '持续回血，低伤害'
  },
  knight: {
    name: '骑士',
    color: '#1565C0',
    stats: {
      hp: 150,      // 最高血量
      spd: 0.6,     // 最慢
      dmg: 10,
      atkSpd: 0.8,  // 攻击慢
      range: 0.18,
      luck: 3,
      armor: 30     // 减伤%
    },
    weapon: 'lance',
    armor: 'heavy',
    description: '超高血量，移速极慢'
  }
};

let currentClass = 'none'; // 10级前无职业
let playerLevel = 1;
let playerExp = 0;
let expToNext = 60;  // 第一级只需60经验（3只僵尸）

// ==================== 技能系统 ====================
// 基于八卦设计的技能系统
// 八卦：乾(天)、坤(地)、震(雷)、巽(风)、坎(水)、离(火)、艮(山)、兑(泽)

// 宫位属性加成
const PALACE_BONUS = {
  '乾': { dmg: 1.2, luck: 5, description: '天之力：伤害+20%，暴击+5%' },
  '坤': { hp: 1.3, armor: 10, description: '地之护：生命+30%，护甲+10' },
  '震': { atkSpd: 0.8, spd: 1.15, description: '雷之速：攻速+20%，移速+15%' },
  '巽': { range: 1.2, spd: 1.1, description: '风之翼：射程+20%，移速+10%' },
  '坎': { healRate: 3, hp: 1.1, description: '水之愈：回血+3/秒，生命+10%' },
  '离': { dmg: 1.15, atkSpd: 0.9, description: '火之怒：伤害+15%，攻速+10%' },
  '艮': { armor: 20, hp: 1.2, description: '山之固：护甲+20，生命+20%' },
  '兑': { luck: 10, dmg: 1.1, description: '泽之泽：暴击+10%，伤害+10%' }
};

const SKILL_POOL = {
  // ===== 乾卦 ☰ 天 =====
  tianwei: {
    name: '天威',
    trigram: '乾',
    trigramName: '天',
    type: 'active',
    icon: '☰',
    color: '#FFD700',
    description: '天降神威，对周围敌人造成大量伤害',
    cooldown: 8,
    damage: 50,
    effect: 'spin_attack'
  },
  tiandao: {
    name: '天道',
    trigram: '乾',
    trigramName: '天',
    type: 'passive',
    icon: '👑',
    color: '#FFD700',
    description: '天命所归，每次攻击有概率造成双倍伤害',
    critBonus: 15,
    effect: 'crit_boost'
  },

  // ===== 坤卦 ☷ 地 =====
  dizhao: {
    name: '地召',
    trigram: '坤',
    trigramName: '地',
    type: 'active',
    icon: '☷',
    color: '#8B4513',
    description: '召唤大地之力，获得护盾抵挡伤害',
    cooldown: 12,
    duration: 3,
    effect: 'invincible'
  },
  dimai: {
    name: '地脉',
    trigram: '坤',
    trigramName: '地',
    type: 'passive',
    icon: '🏔️',
    color: '#8B4513',
    description: '大地滋养，持续恢复生命值',
    healRate: 2,
    effect: 'passive_heal'
  },

  // ===== 震卦 ☳ 雷 =====
  leiting: {
    name: '雷霆',
    trigram: '震',
    trigramName: '雷',
    type: 'active',
    icon: '☳',
    color: '#9400D3',
    description: '召唤雷霆，对前方敌人造成连锁伤害',
    cooldown: 5,
    damage: 35,
    effect: 'laser_beam'
  },
  leishen: {
    name: '雷神',
    trigram: '震',
    trigramName: '雷',
    type: 'passive',
    icon: '⚡',
    color: '#9400D3',
    description: '雷神庇佑，攻击速度大幅提升',
    atkSpdBoost: 0.3,
    effect: 'attack_speed_boost'
  },

  // ===== 巽卦 ☴ 风 =====
  fengren: {
    name: '风刃',
    trigram: '巽',
    trigramName: '风',
    type: 'active',
    icon: '☴',
    color: '#00CED1',
    description: '发射风刃，穿透多个敌人',
    cooldown: 3,
    damage: 25,
    effect: 'projectile_cdr'
  },
  fengxing: {
    name: '风行',
    trigram: '巽',
    trigramName: '风',
    type: 'active',
    icon: '🌬️',
    color: '#00CED1',
    description: '化身为风，瞬间移动一段距离',
    cooldown: 8,
    effect: 'blink'
  },

  // ===== 坎卦 ☵ 水 =====
  shuibo: {
    name: '水波',
    trigram: '坎',
    trigramName: '水',
    type: 'active',
    icon: '☵',
    color: '#1E90FF',
    description: '释放水波，减缓周围敌人速度',
    cooldown: 10,
    duration: 2,
    effect: 'root_aoe'
  },
  shuiyuan: {
    name: '水源',
    trigram: '坎',
    trigramName: '水',
    type: 'passive',
    icon: '💧',
    color: '#1E90FF',
    description: '水之治愈，受伤时恢复生命',
    healOnHit: 5,
    effect: 'lifesteal'
  },

  // ===== 离卦 ☲ 火 =====
  lieyan: {
    name: '烈焰',
    trigram: '离',
    trigramName: '火',
    type: 'active',
    icon: '☲',
    color: '#FF4500',
    description: '释放烈焰，灼烧周围所有敌人',
    cooldown: 6,
    damage: 40,
    effect: 'spin_attack'
  },
  huoling: {
    name: '火灵',
    trigram: '离',
    trigramName: '火',
    type: 'passive',
    icon: '🔥',
    color: '#FF4500',
    description: '火焰附体，攻击附带灼烧效果',
    burnDamage: 5,
    effect: 'burn_attack'
  },

  // ===== 艮卦 ☶ 山 =====
  shanshi: {
    name: '山石',
    trigram: '艮',
    trigramName: '山',
    type: 'active',
    icon: '☶',
    color: '#A0522D',
    description: '召唤巨石，砸向最近的敌人',
    cooldown: 7,
    damage: 45,
    effect: 'hook_pull'
  },
  shanzhen: {
    name: '山镇',
    trigram: '艮',
    trigramName: '山',
    type: 'passive',
    icon: '🛡️',
    color: '#A0522D',
    description: '山之坚固，减少受到的伤害',
    damageReduction: 15,
    effect: 'armor_stacking'
  },

  // ===== 兑卦 ☱ 泽 =====
  zezhao: {
    name: '泽沼',
    trigram: '兑',
    trigramName: '泽',
    type: 'active',
    icon: '☱',
    color: '#32CD32',
    description: '创造沼泽，困住踏入的敌人',
    cooldown: 10,
    damage: 30,
    duration: 5,
    effect: 'place_trap'
  },
  zelu: {
    name: '泽露',
    trigram: '兑',
    trigramName: '泽',
    type: 'passive',
    icon: '✨',
    color: '#32CD32',
    description: '泽之恩惠，击杀敌人恢复生命',
    healOnKill: 15,
    effect: 'kill_heal'
  }
};

// 玩家技能槽
let playerSkills = []; // 最多4个主动技能
let playerPassive = null; // 1个被动技能
let skillCooldowns = {}; // 技能冷却计时器

// 技能选择状态
let isSelectingSkill = false;
let skillChoices = []; // 4个待选技能

// 技能特效状态
let skillEffects = []; // 当前活跃的技能特效
let passiveStacks = {}; // 被动技能层数

// 技能长按提示状态
let skillTooltip = null; // { skill, x, y } 当前显示的技能提示
let longPressTimer = null; // 长按计时器
let skillHitBoxes = []; // 技能槽点击区域

// 职业选择状态
let isSelectingClass = false;

// 开始职业选择
function startClassSelection() {
  if (playerLevel >= 10 && currentClass === 'none') {
    isSelectingClass = true;
  }
}

// 选择职业
function selectClass(classId) {
  if (CLASS_TYPES[classId]) {
    currentClass = classId;
    isSelectingClass = false;
    // 更新属性
    const newStats = getPlayerStats();
    playerMaxHP = newStats.hp;
    playerHP = playerMaxHP; // 选择职业后满血
    saveGameData();
    console.log(`选择职业: ${CLASS_TYPES[classId].name}`);
  }
}

// 绘制职业选择UI
function drawClassSelectionUI() {
  // 半透明背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, W, H);

  // 标题
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎉 达到10级！选择你的职业', W / 2, 50);

  // 职业卡片
  const classKeys = Object.keys(CLASS_TYPES);
  const cardW = 100;
  const cardH = 140;
  const gap = 10;
  const totalW = classKeys.length * cardW + (classKeys.length - 1) * gap;
  const startX = (W - totalW) / 2;
  const startY = 90;

  classKeys.forEach((classId, i) => {
    const cls = CLASS_TYPES[classId];
    const x = startX + i * (cardW + gap);
    const y = startY;

    // 卡片背景
    ctx.fillStyle = 'rgba(40, 40, 50, 0.95)';
    ctx.fillRect(x, y, cardW, cardH);

    // 卡片边框
    ctx.strokeStyle = cls.color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, cardW, cardH);

    // 职业颜色块
    ctx.fillStyle = cls.color;
    ctx.fillRect(x + 10, y + 10, cardW - 20, 40);

    // 职业名称
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cls.name, x + cardW / 2, y + 30);

    // 属性简介
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.textAlign = 'left';
    ctx.fillText(`HP: ${cls.stats.hp}`, x + 8, y + 65);
    ctx.fillText(`伤害: ${cls.stats.dmg}`, x + 8, y + 80);
    ctx.fillText(`攻速: ${cls.stats.atkSpd}s`, x + 8, y + 95);
    ctx.fillText(`范围: ${(cls.stats.range * 100).toFixed(0)}`, x + 8, y + 110);

    // 描述
    ctx.fillStyle = '#888888';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cls.description.slice(0, 8), x + cardW / 2, y + cardH - 10);
  });

  // 提示
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('点击选择职业', W / 2, H - 30);
}

// 获取可用的技能列表（排除已拥有的）
function getAvailableSkills() {
  const ownedSkillIds = playerSkills.map(s => s.id);
  if (playerPassive) ownedSkillIds.push(playerPassive.id);

  const available = [];
  for (const [id, skill] of Object.entries(SKILL_POOL)) {
    if (!ownedSkillIds.includes(id)) {
      available.push({ id, ...skill });
    }
  }
  return available;
}

// 生成4个随机技能选项
function generateSkillChoices() {
  const available = getAvailableSkills();
  if (available.length === 0) return [];

  // 打乱顺序
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  // 取前4个（或更少）
  return available.slice(0, Math.min(4, available.length));
}

// 开始技能选择
function startSkillSelection() {
  skillChoices = generateSkillChoices();
  if (skillChoices.length > 0) {
    isSelectingSkill = true;
  }
}

// 选择技能
function selectSkill(index) {
  if (index < 0 || index >= skillChoices.length) return;

  const skill = skillChoices[index];
  if (skill.type === 'passive') {
    // 被动技能（只能有一个）
    if (playerPassive) {
      // 替换旧被动
      playerPassive = skill;
    } else {
      playerPassive = skill;
    }
    console.log(`获得被动技能: ${skill.name}`);
  } else {
    // 主动技能（最多4个）
    if (playerSkills.length < 4) {
      playerSkills.push(skill);
      skillCooldowns[skill.id] = 0;
      console.log(`获得技能: ${skill.name}`);
    } else {
      console.log('技能槽已满！');
    }
  }

  isSelectingSkill = false;
  skillChoices = [];
}

// 更新技能冷却
function updateSkillCooldowns(dt) {
  for (const skillId in skillCooldowns) {
    if (skillCooldowns[skillId] > 0) {
      skillCooldowns[skillId] -= dt;
    }
  }
}

// 自动释放技能
function autoUseSkills() {
  for (const skill of playerSkills) {
    if (skillCooldowns[skill.id] <= 0 && monsters.length > 0) {
      useSkill(skill);
      skillCooldowns[skill.id] = skill.cooldown;
    }
  }
}

// 使用技能
function useSkill(skill) {
  const nearestMonster = findNearestMonster();

  // 触发技能使用动画
  skillAnimTimer = 0.5;
  skillAnimName = skill.name;

  // 创建技能释放特效
  createSkillCastEffect(skill);

  switch (skill.effect) {
    case 'dash_attack': // 亚索Q
      createDashAttackEffect(skill);
      break;
    case 'invincible': // 亚索W
      createInvincibleEffect(skill);
      break;
    case 'root_aoe': // 拉克丝Q
      createRootAOEEffect(skill);
      break;
    case 'laser_beam': // 拉克丝R
      createLaserBeamEffect(skill);
      break;
    case 'spin_attack': // 德莱厄斯Q
    case 'spin_continuous': // 盖伦E
      createSpinAttackEffect(skill);
      break;
    case 'cone_attack': // 阿卡丽Q
      createConeAttackEffect(skill);
      break;
    case 'missile_swarm': // 卡莎Q
      createMissileSwarmEffect(skill);
      break;
    case 'multi_strike': // 剑圣Q
      createMultiStrikeEffect(skill);
      break;
    case 'blink': // EZ E
      createBlinkEffect(skill);
      break;
    case 'projectile_cdr': // EZ Q
      createProjectileEffect(skill);
      break;
    case 'hook_pull': // 锤石Q
    case 'grab_pull': // 机器人Q
    case 'pull_harpoon': // 派克Q
      createHookEffect(skill);
      break;
    case 'place_trap': // 金克丝E
    case 'poison_trap': // 提莫R
      createTrapEffect(skill);
      break;
    case 'bounce_shot': // MF Q
    case 'bouncing_blade': // 卡特Q
      createBounceEffect(skill);
      break;
    case 'aoe_silence': // 机器人R
      createAOESilenceEffect(skill);
      break;
    default:
      // 默认AOE伤害
      dealAOEDamage(skill.damage || 20, 0.2);
      createGenericSkillEffect(skill);
  }
}

// 创建技能释放特效
function createSkillCastEffect(skill) {
  // 技能名称显示
  attackEffects.push({
    type: 'skill_name',
    x: playerX,
    y: playerY,
    name: skill.name,
    icon: skill.icon,
    color: skill.color,
    timer: 0.8,
    duration: 0.8
  });

  // 技能光环
  attackEffects.push({
    type: 'skill_aura',
    x: playerX,
    y: playerY,
    color: skill.color,
    timer: 0.4,
    duration: 0.4
  });

  // 触发攻击动画
  isAttacking = true;
  attackAnimTimer = 0.4;
}

// 找到最近的怪物
function findNearestMonster() {
  let nearest = null;
  let minDist = Infinity;
  for (const m of monsters) {
    const dx = m.x - playerX;
    const dy = m.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      nearest = m;
    }
  }
  return nearest;
}

// ===== 技能特效实现 =====

// 突刺攻击（亚索Q）
function createDashAttackEffect(skill) {
  const angle = Math.atan2(smoothDirY, smoothDirX);
  skillEffects.push({
    type: 'dash',
    x: playerX,
    y: playerY,
    angle: angle,
    color: skill.color,
    duration: 0.3,
    timer: 0.3,
    damage: skill.damage
  });
  // 对前方敌人造成伤害
  dealDirectionalDamage(skill.damage, angle, 0.25);
}

// 无敌效果（亚索W）
function createInvincibleEffect(skill) {
  skillEffects.push({
    type: 'shield',
    x: playerX,
    y: playerY,
    color: skill.color,
    duration: skill.duration,
    timer: skill.duration
  });
  // 设置无敌状态
  playerInvincible = skill.duration;
}

// AOE定身（拉克丝Q）
function createRootAOEEffect(skill) {
  skillEffects.push({
    type: 'light_burst',
    x: playerX,
    y: playerY,
    radius: 0.25,
    color: skill.color,
    duration: 0.5,
    timer: 0.5
  });
  // 定身周围敌人
  for (const m of monsters) {
    const dx = m.x - playerX;
    const dy = m.y - playerY;
    if (Math.sqrt(dx * dx + dy * dy) < 0.25) {
      m.rooted = skill.duration;
    }
  }
}

// 激光（拉克丝R）
function createLaserBeamEffect(skill) {
  const angle = Math.atan2(smoothDirY || 0.1, smoothDirX || 0.1);
  skillEffects.push({
    type: 'laser',
    x: playerX,
    y: playerY,
    angle: angle,
    color: skill.color,
    duration: 0.8,
    timer: 0.8,
    width: 0.08
  });
  dealDirectionalDamage(skill.damage, angle, 0.8);
}

// 旋转攻击（盖伦E/德莱厄斯Q）
function createSpinAttackEffect(skill) {
  skillEffects.push({
    type: 'spin',
    x: playerX,
    y: playerY,
    radius: 0.2,
    color: skill.color,
    duration: skill.duration || 0.5,
    timer: skill.duration || 0.5,
    damage: skill.damage,
    tickRate: 0.2,
    lastTick: 0
  });
}

// 扇形攻击（阿卡丽Q）
function createConeAttackEffect(skill) {
  const angle = Math.atan2(smoothDirY || 0.1, smoothDirX || 0.1);
  skillEffects.push({
    type: 'cone',
    x: playerX,
    y: playerY,
    angle: angle,
    spread: Math.PI / 3,
    range: 0.25,
    color: skill.color,
    duration: 0.3,
    timer: 0.3
  });
  dealConeDamage(skill.damage, angle, Math.PI / 3, 0.25);
}

// 导弹群（卡莎Q）
function createMissileSwarmEffect(skill) {
  const count = skill.missiles || 6;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    skillEffects.push({
      type: 'missile',
      x: playerX,
      y: playerY,
      vx: Math.cos(angle) * 0.02,
      vy: Math.sin(angle) * 0.02,
      color: skill.color,
      duration: 1,
      timer: 1,
      damage: skill.damage / count
    });
  }
}

// 多重打击（剑圣Q）
function createMultiStrikeEffect(skill) {
  const targets = monsters.slice(0, skill.targets || 4);
  let delay = 0;
  for (const target of targets) {
    setTimeout(() => {
      skillEffects.push({
        type: 'strike',
        x: target.x,
        y: target.y,
        color: skill.color,
        duration: 0.2,
        timer: 0.2
      });
      target.hp -= skill.damage;
      target.hitTimer = 0.15;
    }, delay);
    delay += 150;
  }
  // 短暂无敌
  playerInvincible = 0.6;
}

// 闪现（EZ E）
function createBlinkEffect(skill) {
  const blinkDist = 0.2;
  const angle = Math.atan2(smoothDirY || 0.1, smoothDirX || 0.1);
  // 起点特效
  skillEffects.push({
    type: 'blink_start',
    x: playerX,
    y: playerY,
    color: skill.color,
    duration: 0.3,
    timer: 0.3
  });
  // 移动玩家
  playerX += Math.cos(angle) * blinkDist;
  playerY += Math.sin(angle) * blinkDist;
  // 终点特效
  skillEffects.push({
    type: 'blink_end',
    x: playerX,
    y: playerY,
    color: skill.color,
    duration: 0.3,
    timer: 0.3
  });
}

// 投射物（EZ Q）
function createProjectileEffect(skill) {
  const angle = Math.atan2(smoothDirY || 0.1, smoothDirX || 0.1);
  skillEffects.push({
    type: 'projectile',
    x: playerX,
    y: playerY,
    vx: Math.cos(angle) * 0.025,
    vy: Math.sin(angle) * 0.025,
    color: skill.color,
    duration: 1.5,
    timer: 1.5,
    damage: skill.damage,
    hit: false
  });
}

// 钩子（锤石Q/机器人Q/派克Q）
function createHookEffect(skill) {
  const nearest = findNearestMonster();
  if (!nearest) return;
  const dx = nearest.x - playerX;
  const dy = nearest.y - playerY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 0.4) return;

  skillEffects.push({
    type: 'hook',
    startX: playerX,
    startY: playerY,
    endX: nearest.x,
    endY: nearest.y,
    color: skill.color,
    duration: 0.4,
    timer: 0.4,
    target: nearest
  });
  // 拉近敌人
  const pullDist = dist * 0.6;
  nearest.x -= (dx / dist) * pullDist;
  nearest.y -= (dy / dist) * pullDist;
  nearest.hp -= skill.damage;
  nearest.hitTimer = 0.2;
}

// 陷阱（金克丝E/提莫R）
function createTrapEffect(skill) {
  skillEffects.push({
    type: 'trap',
    x: playerX + (Math.random() - 0.5) * 0.2,
    y: playerY + (Math.random() - 0.5) * 0.2,
    color: skill.color,
    duration: skill.duration || 10,
    timer: skill.duration || 10,
    damage: skill.damage,
    triggered: false,
    icon: skill.icon
  });
}

// 弹射攻击（MF Q/卡特Q）
function createBounceEffect(skill) {
  const target = findNearestMonster();
  if (!target) return;

  let currentTarget = target;
  let bounceCount = skill.bounces || 2;
  let damage = skill.damage;

  const bounce = (t, dmg, count) => {
    if (count <= 0 || !t) return;
    skillEffects.push({
      type: 'bounce_hit',
      x: t.x,
      y: t.y,
      color: skill.color,
      duration: 0.2,
      timer: 0.2
    });
    t.hp -= dmg;
    t.hitTimer = 0.15;

    // 找下一个目标
    setTimeout(() => {
      let nextTarget = null;
      let minDist = Infinity;
      for (const m of monsters) {
        if (m !== t && m.hp > 0) {
          const dx = m.x - t.x;
          const dy = m.y - t.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.3 && dist < minDist) {
            minDist = dist;
            nextTarget = m;
          }
        }
      }
      bounce(nextTarget, dmg * (skill.bounceMultiplier || 1), count - 1);
    }, 100);
  };

  bounce(currentTarget, damage, bounceCount);
}

// AOE沉默（机器人R）
function createAOESilenceEffect(skill) {
  skillEffects.push({
    type: 'electric_burst',
    x: playerX,
    y: playerY,
    radius: 0.25,
    color: skill.color,
    duration: 0.5,
    timer: 0.5
  });
  dealAOEDamage(skill.damage, 0.25);
}

// 通用技能特效
function createGenericSkillEffect(skill) {
  skillEffects.push({
    type: 'generic',
    x: playerX,
    y: playerY,
    color: skill.color,
    duration: 0.5,
    timer: 0.5,
    icon: skill.icon
  });
}

// ===== 伤害计算 =====

// AOE伤害
function dealAOEDamage(damage, radius) {
  for (const m of monsters) {
    const dx = m.x - playerX;
    const dy = m.y - playerY;
    if (Math.sqrt(dx * dx + dy * dy) < radius) {
      m.hp -= damage;
      m.hitTimer = 0.15;
    }
  }
}

// 方向性伤害
function dealDirectionalDamage(damage, angle, range) {
  for (const m of monsters) {
    const dx = m.x - playerX;
    const dy = m.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > range) continue;
    const mAngle = Math.atan2(dy, dx);
    let angleDiff = Math.abs(mAngle - angle);
    if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
    if (angleDiff < Math.PI / 4) {
      m.hp -= damage;
      m.hitTimer = 0.15;
    }
  }
}

// 扇形伤害
function dealConeDamage(damage, angle, spread, range) {
  for (const m of monsters) {
    const dx = m.x - playerX;
    const dy = m.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > range) continue;
    const mAngle = Math.atan2(dy, dx);
    let angleDiff = Math.abs(mAngle - angle);
    if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
    if (angleDiff < spread / 2) {
      m.hp -= damage;
      m.hitTimer = 0.15;
    }
  }
}

// 无敌时间
let playerInvincible = 0;

// 更新技能特效
function updateSkillEffects(dt) {
  // 更新无敌时间
  if (playerInvincible > 0) {
    playerInvincible -= dt;
  }

  // 更新怪物定身
  for (const m of monsters) {
    if (m.rooted && m.rooted > 0) {
      m.rooted -= dt;
    }
  }

  // 更新特效
  for (let i = skillEffects.length - 1; i >= 0; i--) {
    const effect = skillEffects[i];
    effect.timer -= dt;

    // 特效专属更新
    if (effect.type === 'spin' && effect.timer > 0) {
      effect.lastTick += dt;
      if (effect.lastTick >= effect.tickRate) {
        effect.lastTick = 0;
        dealAOEDamage(effect.damage / 3, effect.radius);
      }
      effect.x = playerX;
      effect.y = playerY;
    }

    if (effect.type === 'missile' || effect.type === 'projectile') {
      effect.x += effect.vx;
      effect.y += effect.vy;
      // 检测碰撞
      for (const m of monsters) {
        const dx = m.x - effect.x;
        const dy = m.y - effect.y;
        if (Math.sqrt(dx * dx + dy * dy) < 0.05 && !effect.hit) {
          m.hp -= effect.damage;
          m.hitTimer = 0.15;
          effect.hit = true;
          effect.timer = 0;
        }
      }
    }

    if (effect.type === 'trap' && !effect.triggered) {
      for (const m of monsters) {
        const dx = m.x - effect.x;
        const dy = m.y - effect.y;
        if (Math.sqrt(dx * dx + dy * dy) < 0.08) {
          m.hp -= effect.damage;
          m.hitTimer = 0.2;
          effect.triggered = true;
          effect.timer = 0.3; // 爆炸动画时间
          skillEffects.push({
            type: 'explosion',
            x: effect.x,
            y: effect.y,
            color: effect.color,
            duration: 0.3,
            timer: 0.3
          });
        }
      }
    }

    // 移除过期特效
    if (effect.timer <= 0) {
      skillEffects.splice(i, 1);
    }
  }
}

// 绘制技能特效
function drawSkillEffects(groundQuad) {
  for (const effect of skillEffects) {
    // 转换到屏幕坐标
    const screenX = effect.x - playerX + 0.5;
    const screenY = effect.y - playerY + 0.5;

    if (screenX < 0 || screenX > 1 || screenY < 0 || screenY > 1) continue;

    const pt = getGroundPoint(groundQuad, screenX, screenY);

    ctx.save();

    switch (effect.type) {
      case 'dash':
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 4;
        ctx.globalAlpha = effect.timer / effect.duration;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x + Math.cos(effect.angle) * 30, pt.y + Math.sin(effect.angle) * 30);
        ctx.stroke();
        break;

      case 'shield':
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.6;
        const shieldR = 25 * pt.scale;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y - 20, shieldR, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'light_burst':
      case 'electric_burst':
        ctx.fillStyle = effect.color;
        ctx.globalAlpha = effect.timer / effect.duration * 0.5;
        const burstR = effect.radius * 200 * pt.scale;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, burstR, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'laser':
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = effect.width * 200 * pt.scale;
        ctx.globalAlpha = effect.timer / effect.duration;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        const laserLen = 150;
        ctx.lineTo(pt.x + Math.cos(effect.angle) * laserLen, pt.y + Math.sin(effect.angle) * laserLen);
        ctx.stroke();
        // 光晕
        ctx.lineWidth = effect.width * 300 * pt.scale;
        ctx.globalAlpha = effect.timer / effect.duration * 0.3;
        ctx.stroke();
        break;

      case 'spin':
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.7;
        const spinR = effect.radius * 200 * pt.scale;
        const spinAngle = walkTime * 10;
        for (let i = 0; i < 4; i++) {
          const a = spinAngle + (i * Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y - 15);
          ctx.lineTo(pt.x + Math.cos(a) * spinR, pt.y - 15 + Math.sin(a) * spinR * 0.5);
          ctx.stroke();
        }
        break;

      case 'cone':
        ctx.fillStyle = effect.color;
        ctx.globalAlpha = effect.timer / effect.duration * 0.6;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        const coneR = effect.range * 200 * pt.scale;
        ctx.arc(pt.x, pt.y, coneR, effect.angle - effect.spread / 2, effect.angle + effect.spread / 2);
        ctx.closePath();
        ctx.fill();
        break;

      case 'missile':
      case 'projectile':
        ctx.fillStyle = effect.color;
        ctx.globalAlpha = effect.timer / effect.duration;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'strike':
      case 'bounce_hit':
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = effect.timer / effect.duration;
        const strikeR = 15 * (1 - effect.timer / effect.duration);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, strikeR, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'blink_start':
      case 'blink_end':
        ctx.fillStyle = effect.color;
        ctx.globalAlpha = effect.timer / effect.duration * 0.7;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 20 * (1 - effect.timer / effect.duration), 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'hook':
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = effect.timer / effect.duration;
        const startPt = getGroundPoint(groundQuad, effect.startX - playerX + 0.5, effect.startY - playerY + 0.5);
        const endPt = getGroundPoint(groundQuad, effect.endX - playerX + 0.5, effect.endY - playerY + 0.5);
        ctx.beginPath();
        ctx.moveTo(startPt.x, startPt.y);
        ctx.lineTo(endPt.x, endPt.y);
        ctx.stroke();
        break;

      case 'trap':
        if (!effect.triggered) {
          ctx.font = `${20 * pt.scale}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(effect.icon || '💣', pt.x, pt.y);
        }
        break;

      case 'explosion':
        ctx.fillStyle = effect.color;
        ctx.globalAlpha = effect.timer / effect.duration * 0.8;
        const expR = 30 * (1 - effect.timer / effect.duration) * pt.scale;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, expR, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'generic':
        ctx.font = `${30 * pt.scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.globalAlpha = effect.timer / effect.duration;
        ctx.fillText(effect.icon || '✨', pt.x, pt.y - 20);
        break;
    }

    ctx.restore();
  }
}

// ==================== 数据持久化 ====================
const SAVE_KEY = 'bagua_game_save';
const SAVE_VERSION = 2;  // 版本2: 新经验曲线

// 保存游戏数据
function saveGameData() {
  try {
    const saveData = {
      currentClass,
      playerLevel,
      playerExp,
      expToNext,
      currentPalace,
      version: SAVE_VERSION
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
      // 检查版本，旧版本数据自动重置
      if (!data.version || data.version < SAVE_VERSION) {
        console.log('检测到旧版本存档，自动重置');
        wx.removeStorageSync(SAVE_KEY);
        return false;  // 使用默认值
      }
      // 先加载等级
      if (typeof data.playerLevel === 'number' && data.playerLevel >= 1) {
        playerLevel = data.playerLevel;
      }
      // 只有10级以上才能使用职业
      if (playerLevel >= 10 && data.currentClass && CLASS_TYPES[data.currentClass]) {
        currentClass = data.currentClass;
      } else {
        currentClass = 'none';
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
      const character = getCurrentCharacter();
      console.log(`游戏数据已加载: ${character.name} Lv.${playerLevel}`);
      return true;
    }
  } catch (e) {
    console.error('加载游戏数据失败:', e);
  }
  return false;
}

// 重置游戏数据（新游戏）
function resetGameData() {
  try {
    // 先清除存储
    wx.removeStorageSync(SAVE_KEY);
    // 重置所有变量
    playerLevel = 1;
    playerExp = 0;
    expToNext = 60;  // 第一级只需60经验
    currentClass = 'none';
    currentPalace = '艮';
    // 保存新数据
    saveGameData();
    console.log('游戏数据已重置到1级');
    // 提示用户
    wx.showToast && wx.showToast({
      title: '已重置到1级',
      icon: 'success',
      duration: 1500
    });
    return true;
  } catch (e) {
    console.error('重置游戏数据失败:', e);
    return false;
  }
}

// 游戏启动时加载数据
loadGameData();

// 获取当前角色信息
function getCurrentCharacter() {
  // 10级后才能使用职业
  if (playerLevel >= 10 && currentClass !== 'none' && CLASS_TYPES[currentClass]) {
    return CLASS_TYPES[currentClass];
  }
  return DEFAULT_CHARACTER;
}

// 计算当前属性（基础 + 等级加成）
function getPlayerStats() {
  const character = getCurrentCharacter();
  const base = character.stats;
  const levelBonus = playerLevel - 1;
  // 等级成长：每级+3%基础属性（降低成长速度）
  const levelMult = 1 + levelBonus * 0.03;

  // 获取宫位加成
  const palace = PALACE_BONUS[currentPalace] || {};

  // 计算基础属性
  let hp = Math.floor(base.hp * levelMult);
  let spd = base.spd;
  let dmg = Math.floor(base.dmg * levelMult);
  let atkSpd = Math.max(0.2, base.atkSpd - levelBonus * 0.01);
  let range = base.range + levelBonus * 0.002;
  let luck = base.luck + levelBonus * 0.3;
  let healRate = base.healRate || 0;
  let armor = base.armor || 0;

  // 应用宫位加成
  if (palace.hp) hp = Math.floor(hp * palace.hp);
  if (palace.spd) spd *= palace.spd;
  if (palace.dmg) dmg = Math.floor(dmg * palace.dmg);
  if (palace.atkSpd) atkSpd = Math.max(0.15, atkSpd * palace.atkSpd);
  if (palace.range) range *= palace.range;
  if (palace.luck) luck += palace.luck;
  if (palace.healRate) healRate += palace.healRate;
  if (palace.armor) armor += palace.armor;

  return { hp, spd, dmg, atkSpd, range, luck, healRate, armor };
}

// ==================== 冒险系统 ====================
let gameState = 'idle'; // 'idle' | 'adventure' | 'gameover'
let isPaused = false;   // 暂停状态
let adventureTime = 0;
let killCount = 0;
let playerHP = 100;
let playerMaxHP = 100;
let playerMP = 100;       // 蓝量/魔法值
let playerMaxMP = 100;
let showDetailedStats = false;  // 是否显示详细数值
let playerX = 0.5;  // 玩家在地面上的位置 (0-1)
let playerY = 0.5;
let playerTargetX = 0.5;
let playerTargetY = 0.5;
let isMoving = false;
let lastAttackTime = 0;
// 平滑移动方向
let smoothDirX = 0;
let smoothDirY = 0;
let comboCount = 0;

// 攻击动画状态
let attackAnimTimer = 0;      // 攻击动画计时器
let attackAnimDuration = 0.3; // 攻击动画持续时间
let attackTargetX = 0;        // 攻击目标方向
let attackTargetY = 0;
let isAttacking = false;      // 是否正在攻击动画中
let attackEffects = [];       // 攻击特效列表

// 技能使用动画
let skillAnimTimer = 0;
let skillAnimName = '';       // 当前技能动画名称

// 怪物数组
let monsters = [];
let monsterSpawnTimer = 0;
let monsterSpawnInterval = 2.0; // 初始生成间隔

// 怪物类型定义
const MONSTER_TYPES = {
  zombie: {
    name: '僵尸',
    color: '#4A7C59',
    hp: 30,
    damage: 10,
    speed: 0.003,
    exp: 20,
    size: 0.8,
    unlockTime: 0,  // 0秒后出现
    drawType: 'zombie'
  },
  skeleton: {
    name: '骷髅',
    color: '#E0E0E0',
    hp: 25,
    damage: 15,
    speed: 0.004,
    exp: 25,
    size: 0.75,
    unlockTime: 20, // 20秒后出现
    drawType: 'skeleton'
  },
  ghost: {
    name: '幽灵',
    color: '#B0BEC5',
    hp: 20,
    damage: 12,
    speed: 0.005,
    exp: 30,
    size: 0.7,
    unlockTime: 40, // 40秒后出现
    drawType: 'ghost'
  },
  demon: {
    name: '恶魔',
    color: '#C62828',
    hp: 60,
    damage: 20,
    speed: 0.0025,
    exp: 50,
    size: 1.0,
    unlockTime: 60, // 60秒后出现
    drawType: 'demon'
  },
  darkKnight: {
    name: '黑骑士',
    color: '#37474F',
    hp: 80,
    damage: 25,
    speed: 0.002,
    exp: 70,
    size: 1.1,
    unlockTime: 90, // 90秒后出现
    drawType: 'knight'
  },
  boss: {
    name: '魔王',
    color: '#4A148C',
    hp: 200,
    damage: 35,
    speed: 0.0015,
    exp: 150,
    size: 1.4,
    unlockTime: 120, // 120秒后出现
    drawType: 'boss'
  }
};

// 获取可用的怪物类型（根据冒险时间）
function getAvailableMonsterTypes() {
  const available = [];
  for (const [key, info] of Object.entries(MONSTER_TYPES)) {
    if (adventureTime >= info.unlockTime) {
      available.push(key);
    }
  }
  return available;
}

// 计算怪物强化倍率（随时间增加）
function getMonsterScaling() {
  // 每30秒增加10%的属性
  const scaleFactor = 1 + Math.floor(adventureTime / 30) * 0.1;
  return Math.min(scaleFactor, 3.0); // 最多3倍
}

// 创建怪物（在玩家周围的世界坐标生成）
function spawnMonster() {
  // 在玩家周围0.5-0.8距离处生成
  const angle = Math.random() * Math.PI * 2;
  const distance = 0.5 + Math.random() * 0.3;
  const x = playerX + Math.cos(angle) * distance;
  const y = playerY + Math.sin(angle) * distance;

  // 根据时间选择怪物类型
  const available = getAvailableMonsterTypes();
  // 新解锁的怪物有更高概率出现
  let type;
  const rand = Math.random();
  if (rand < 0.3 && available.length > 1) {
    // 30%概率生成最新解锁的怪物
    type = available[available.length - 1];
  } else {
    // 70%概率随机选择
    type = available[Math.floor(Math.random() * available.length)];
  }

  const info = MONSTER_TYPES[type];
  const scaling = getMonsterScaling();

  monsters.push({
    type,
    x,
    y,
    hp: Math.floor(info.hp * scaling),
    maxHp: Math.floor(info.hp * scaling),
    damage: Math.floor(info.damage * scaling),
    speed: info.speed * (0.8 + Math.random() * 0.4) * (1 + scaling * 0.1), // 速度也略微增加
    exp: Math.floor(info.exp * scaling),
    size: info.size,
    hitTimer: 0, // 被击中闪烁
    walkPhase: Math.random() * Math.PI * 2, // 走路动画相位
    floatPhase: Math.random() * Math.PI * 2 // 漂浮动画相位（幽灵用）
  });
}

// 绘制怪物（统一入口）
function drawMonster(x, y, scale, monster, time) {
  const info = MONSTER_TYPES[monster.type];
  const drawType = info.drawType;

  switch (drawType) {
    case 'zombie':
      drawZombieType(x, y, scale, monster, time, info);
      break;
    case 'skeleton':
      drawSkeletonType(x, y, scale, monster, time, info);
      break;
    case 'ghost':
      drawGhostType(x, y, scale, monster, time, info);
      break;
    case 'demon':
      drawDemonType(x, y, scale, monster, time, info);
      break;
    case 'knight':
      drawKnightType(x, y, scale, monster, time, info);
      break;
    case 'boss':
      drawBossType(x, y, scale, monster, time, info);
      break;
    default:
      drawZombieType(x, y, scale, monster, time, info);
  }
}

// 绘制僵尸类型
function drawZombieType(x, y, scale, monster, time, info) {
  const s = scale * info.size;
  const personH = BASE_UNIT * 1.5 * s;
  const len = personH / 3.5;
  const headR = len * 0.45;
  const bodyLen = len * 1.2;
  const legLen = len * 0.9;
  const armLen = len * 0.7;

  const t = time * 3 + monster.walkPhase;
  const legSwing = Math.sin(t) * 0.4;
  const armSwing = Math.sin(t + Math.PI) * 0.3;

  ctx.save();
  ctx.translate(x, y);

  const baseColor = monster.hitTimer > 0 ? '#FFFFFF' : info.color;
  ctx.strokeStyle = baseColor;
  ctx.fillStyle = baseColor;
  ctx.lineWidth = Math.max(1, 2 * s);
  ctx.lineCap = 'round';

  const hipY = 0;
  const shoulderY = -bodyLen;
  const headY = shoulderY - headR;

  // 腿
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

  // 手臂（前伸）
  ctx.beginPath();
  ctx.moveTo(-len * 0.3, shoulderY);
  ctx.lineTo(-len * 0.3 + armLen * 0.8, shoulderY + Math.sin(armSwing) * armLen * 0.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.3, shoulderY);
  ctx.lineTo(len * 0.3 + armLen * 0.8, shoulderY + Math.sin(-armSwing) * armLen * 0.2);
  ctx.stroke();

  // 头
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(len * 0.1, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // 红眼
  ctx.fillStyle = '#FF0000';
  ctx.beginPath();
  ctx.arc(len * 0.05, headY - headR * 0.2, headR * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(len * 0.2, headY - headR * 0.2, headR * 0.15, 0, Math.PI * 2);
  ctx.fill();

  drawMonsterHPBar(len, headY, headR, monster);
  ctx.restore();
}

// 绘制骷髅类型
function drawSkeletonType(x, y, scale, monster, time, info) {
  const s = scale * info.size;
  const personH = BASE_UNIT * 1.5 * s;
  const len = personH / 3.5;
  const headR = len * 0.4;
  const bodyLen = len * 1.1;
  const legLen = len * 0.85;
  const armLen = len * 0.65;

  const t = time * 4 + monster.walkPhase;
  const legSwing = Math.sin(t) * 0.5;

  ctx.save();
  ctx.translate(x, y);

  const baseColor = monster.hitTimer > 0 ? '#FFFFFF' : info.color;
  ctx.strokeStyle = baseColor;
  ctx.fillStyle = baseColor;
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.lineCap = 'round';

  const hipY = 0;
  const shoulderY = -bodyLen;
  const headY = shoulderY - headR;

  // 骨腿
  ctx.beginPath();
  ctx.moveTo(-len * 0.15, hipY);
  ctx.lineTo(-len * 0.15 + Math.sin(legSwing) * legLen * 0.4, hipY + legLen);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.15, hipY);
  ctx.lineTo(len * 0.15 + Math.sin(-legSwing) * legLen * 0.4, hipY + legLen);
  ctx.stroke();

  // 脊椎（分节）
  for (let i = 0; i < 4; i++) {
    const segY = hipY - (bodyLen / 4) * i;
    ctx.beginPath();
    ctx.arc(0, segY, len * 0.08, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 肋骨
  ctx.beginPath();
  ctx.moveTo(-len * 0.25, shoulderY + bodyLen * 0.3);
  ctx.lineTo(len * 0.25, shoulderY + bodyLen * 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-len * 0.2, shoulderY + bodyLen * 0.5);
  ctx.lineTo(len * 0.2, shoulderY + bodyLen * 0.5);
  ctx.stroke();

  // 手臂（骨头）
  ctx.beginPath();
  ctx.moveTo(-len * 0.25, shoulderY);
  ctx.lineTo(-len * 0.25 - armLen * 0.5, shoulderY + armLen * 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.25, shoulderY);
  ctx.lineTo(len * 0.25 + armLen * 0.5, shoulderY + armLen * 0.3);
  ctx.stroke();

  // 头骨
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.stroke();

  // 眼眶（黑洞）
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(-len * 0.1, headY - headR * 0.1, headR * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(len * 0.1, headY - headR * 0.1, headR * 0.25, 0, Math.PI * 2);
  ctx.fill();

  // 牙齿
  ctx.strokeStyle = baseColor;
  ctx.beginPath();
  ctx.moveTo(-len * 0.12, headY + headR * 0.5);
  ctx.lineTo(len * 0.12, headY + headR * 0.5);
  ctx.stroke();

  drawMonsterHPBar(len, headY, headR, monster);
  ctx.restore();
}

// 绘制幽灵类型
function drawGhostType(x, y, scale, monster, time, info) {
  const s = scale * info.size;
  const personH = BASE_UNIT * 1.5 * s;
  const len = personH / 3.5;
  const headR = len * 0.5;

  // 漂浮动画
  const floatY = Math.sin(time * 2 + monster.floatPhase) * 5;
  const wobble = Math.sin(time * 3 + monster.floatPhase) * 0.1;

  ctx.save();
  ctx.translate(x, y + floatY);
  ctx.globalAlpha = 0.7; // 半透明

  const baseColor = monster.hitTimer > 0 ? '#FFFFFF' : info.color;
  ctx.fillStyle = baseColor;
  ctx.strokeStyle = baseColor;

  // 身体（飘逸的形状）
  ctx.beginPath();
  ctx.moveTo(0, -headR * 2);
  ctx.quadraticCurveTo(-len * 0.6, -headR, -len * 0.5 + wobble * len, len * 0.5);
  ctx.quadraticCurveTo(-len * 0.3, len * 0.3, 0, len * 0.6);
  ctx.quadraticCurveTo(len * 0.3, len * 0.3, len * 0.5 - wobble * len, len * 0.5);
  ctx.quadraticCurveTo(len * 0.6, -headR, 0, -headR * 2);
  ctx.fill();

  // 眼睛（发光）
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#00FFFF';
  ctx.beginPath();
  ctx.arc(-len * 0.15, -headR * 0.8, headR * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(len * 0.15, -headR * 0.8, headR * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  drawMonsterHPBar(len, -headR * 2, headR, monster);
  ctx.restore();
}

// 绘制恶魔类型
function drawDemonType(x, y, scale, monster, time, info) {
  const s = scale * info.size;
  const personH = BASE_UNIT * 1.5 * s;
  const len = personH / 3.5;
  const headR = len * 0.45;
  const bodyLen = len * 1.3;
  const legLen = len * 0.9;
  const armLen = len * 0.8;

  const t = time * 2.5 + monster.walkPhase;
  const legSwing = Math.sin(t) * 0.35;

  ctx.save();
  ctx.translate(x, y);

  const baseColor = monster.hitTimer > 0 ? '#FFFFFF' : info.color;
  ctx.strokeStyle = baseColor;
  ctx.fillStyle = baseColor;
  ctx.lineWidth = Math.max(1, 3 * s);
  ctx.lineCap = 'round';

  const hipY = 0;
  const shoulderY = -bodyLen;
  const headY = shoulderY - headR;

  // 粗壮的腿
  ctx.beginPath();
  ctx.moveTo(-len * 0.25, hipY);
  ctx.lineTo(-len * 0.3 + Math.sin(legSwing) * legLen * 0.3, hipY + legLen);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.25, hipY);
  ctx.lineTo(len * 0.3 + Math.sin(-legSwing) * legLen * 0.3, hipY + legLen);
  ctx.stroke();

  // 粗壮的身体
  ctx.lineWidth = Math.max(1, 4 * s);
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(0, shoulderY);
  ctx.stroke();

  // 强壮的手臂
  ctx.lineWidth = Math.max(1, 3 * s);
  ctx.beginPath();
  ctx.moveTo(-len * 0.4, shoulderY);
  ctx.lineTo(-len * 0.4 - armLen * 0.6, shoulderY + armLen * 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.4, shoulderY);
  ctx.lineTo(len * 0.4 + armLen * 0.6, shoulderY + armLen * 0.4);
  ctx.stroke();

  // 头
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // 角
  ctx.strokeStyle = '#8B0000';
  ctx.lineWidth = Math.max(1, 2 * s);
  ctx.beginPath();
  ctx.moveTo(-headR * 0.6, headY - headR * 0.5);
  ctx.lineTo(-headR * 0.8, headY - headR * 1.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(headR * 0.6, headY - headR * 0.5);
  ctx.lineTo(headR * 0.8, headY - headR * 1.5);
  ctx.stroke();

  // 发光的眼睛
  ctx.fillStyle = '#FFFF00';
  ctx.beginPath();
  ctx.arc(-len * 0.1, headY - headR * 0.1, headR * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(len * 0.1, headY - headR * 0.1, headR * 0.2, 0, Math.PI * 2);
  ctx.fill();

  drawMonsterHPBar(len, headY, headR * 1.5, monster);
  ctx.restore();
}

// 绘制黑骑士类型
function drawKnightType(x, y, scale, monster, time, info) {
  const s = scale * info.size;
  const personH = BASE_UNIT * 1.5 * s;
  const len = personH / 3.5;
  const headR = len * 0.4;
  const bodyLen = len * 1.4;
  const legLen = len * 1.0;
  const armLen = len * 0.8;

  const t = time * 2 + monster.walkPhase;
  const legSwing = Math.sin(t) * 0.3;

  ctx.save();
  ctx.translate(x, y);

  const baseColor = monster.hitTimer > 0 ? '#FFFFFF' : info.color;
  ctx.strokeStyle = baseColor;
  ctx.fillStyle = baseColor;
  ctx.lineWidth = Math.max(1, 3.5 * s);
  ctx.lineCap = 'round';

  const hipY = 0;
  const shoulderY = -bodyLen;
  const headY = shoulderY - headR;

  // 铠甲腿
  ctx.beginPath();
  ctx.moveTo(-len * 0.25, hipY);
  ctx.lineTo(-len * 0.25 + Math.sin(legSwing) * legLen * 0.25, hipY + legLen);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.25, hipY);
  ctx.lineTo(len * 0.25 + Math.sin(-legSwing) * legLen * 0.25, hipY + legLen);
  ctx.stroke();

  // 铠甲身体
  ctx.lineWidth = Math.max(1, 5 * s);
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(0, shoulderY);
  ctx.stroke();

  // 肩甲
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(-len * 0.4, shoulderY, len * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(len * 0.4, shoulderY, len * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // 手臂持剑
  ctx.lineWidth = Math.max(1, 3 * s);
  ctx.beginPath();
  ctx.moveTo(-len * 0.4, shoulderY);
  ctx.lineTo(-len * 0.5, shoulderY + armLen * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.4, shoulderY);
  ctx.lineTo(len * 0.6, shoulderY + armLen * 0.3);
  ctx.stroke();

  // 剑
  ctx.strokeStyle = '#78909C';
  ctx.lineWidth = Math.max(1, 2 * s);
  ctx.beginPath();
  ctx.moveTo(len * 0.6, shoulderY + armLen * 0.3);
  ctx.lineTo(len * 0.6, shoulderY - armLen * 0.8);
  ctx.stroke();

  // 头盔
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // 头盔面罩缝隙（眼睛）
  ctx.strokeStyle = '#FF4444';
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.beginPath();
  ctx.moveTo(-headR * 0.5, headY);
  ctx.lineTo(headR * 0.5, headY);
  ctx.stroke();

  drawMonsterHPBar(len, headY, headR, monster);
  ctx.restore();
}

// 绘制魔王类型
function drawBossType(x, y, scale, monster, time, info) {
  const s = scale * info.size;
  const personH = BASE_UNIT * 1.5 * s;
  const len = personH / 3.5;
  const headR = len * 0.55;
  const bodyLen = len * 1.5;
  const legLen = len * 1.0;
  const armLen = len * 0.9;

  const t = time * 1.5 + monster.walkPhase;
  const legSwing = Math.sin(t) * 0.25;
  const breathe = Math.sin(time * 2) * 0.05; // 呼吸效果

  ctx.save();
  ctx.translate(x, y);

  const baseColor = monster.hitTimer > 0 ? '#FFFFFF' : info.color;
  ctx.strokeStyle = baseColor;
  ctx.fillStyle = baseColor;
  ctx.lineWidth = Math.max(1, 4 * s);
  ctx.lineCap = 'round';

  const hipY = 0;
  const shoulderY = -bodyLen * (1 + breathe);
  const headY = shoulderY - headR;

  // 粗壮的腿
  ctx.beginPath();
  ctx.moveTo(-len * 0.3, hipY);
  ctx.lineTo(-len * 0.35 + Math.sin(legSwing) * legLen * 0.2, hipY + legLen);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.3, hipY);
  ctx.lineTo(len * 0.35 + Math.sin(-legSwing) * legLen * 0.2, hipY + legLen);
  ctx.stroke();

  // 巨大的身体
  ctx.lineWidth = Math.max(1, 6 * s);
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(0, shoulderY);
  ctx.stroke();

  // 披风效果
  ctx.strokeStyle = '#1A0033';
  ctx.lineWidth = Math.max(1, 2 * s);
  ctx.beginPath();
  ctx.moveTo(-len * 0.5, shoulderY);
  ctx.quadraticCurveTo(-len * 0.7, hipY, -len * 0.4, hipY + legLen * 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.5, shoulderY);
  ctx.quadraticCurveTo(len * 0.7, hipY, len * 0.4, hipY + legLen * 0.8);
  ctx.stroke();

  // 强壮的手臂
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = Math.max(1, 4 * s);
  ctx.beginPath();
  ctx.moveTo(-len * 0.5, shoulderY);
  ctx.lineTo(-len * 0.7, shoulderY + armLen * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(len * 0.5, shoulderY);
  ctx.lineTo(len * 0.7, shoulderY + armLen * 0.5);
  ctx.stroke();

  // 头
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // 王冠/角
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = Math.max(1, 2 * s);
  ctx.beginPath();
  ctx.moveTo(-headR * 0.5, headY - headR * 0.8);
  ctx.lineTo(-headR * 0.3, headY - headR * 1.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, headY - headR);
  ctx.lineTo(0, headY - headR * 1.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(headR * 0.5, headY - headR * 0.8);
  ctx.lineTo(headR * 0.3, headY - headR * 1.6);
  ctx.stroke();

  // 邪恶的眼睛
  ctx.fillStyle = '#FF0000';
  ctx.beginPath();
  ctx.arc(-len * 0.12, headY - headR * 0.15, headR * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(len * 0.12, headY - headR * 0.15, headR * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // 光芒效果
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + time;
    const rayLen = headR * 0.8;
    ctx.beginPath();
    ctx.moveTo(0, headY);
    ctx.lineTo(Math.cos(angle) * rayLen, headY + Math.sin(angle) * rayLen);
    ctx.stroke();
  }

  drawMonsterHPBar(len * 1.2, headY, headR * 1.8, monster);
  ctx.restore();
}

// 绘制怪物血条（通用）
function drawMonsterHPBar(len, headY, headR, monster) {
  if (monster.hp < monster.maxHp) {
    const barW = len * 2;
    const barH = 3;
    const barY = headY - headR - 8;
    ctx.fillStyle = '#333';
    ctx.fillRect(-barW / 2, barY, barW, barH);
    ctx.fillStyle = '#E53935';
    ctx.fillRect(-barW / 2, barY, barW * (monster.hp / monster.maxHp), barH);
  }
}

// 开始冒险
function startAdventure() {
  gameState = 'adventure';
  isPaused = false;
  adventureTime = 0;
  killCount = 0;
  const stats = getPlayerStats();
  playerMaxHP = stats.hp;
  playerHP = playerMaxHP;
  playerMaxMP = 100;  // 基础蓝量
  playerMP = playerMaxMP;
  showDetailedStats = false;
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
  // 重置平滑方向
  smoothDirX = 0;
  smoothDirY = 0;
  // 重置技能
  playerSkills = [];
  playerPassive = null;
  skillCooldowns = {};
  skillEffects = [];
  passiveStacks = {};
  isSelectingSkill = false;
  skillChoices = [];
  playerInvincible = 0;
  // 重置攻击动画
  attackAnimTimer = 0;
  isAttacking = false;
  attackEffects = [];
  skillAnimTimer = 0;
  skillAnimName = '';
  console.log('冒险开始！');
  // 开始时立即选择第一个技能
  startSkillSelection();
}

// 结束冒险
function endAdventure() {
  gameState = 'gameover';
  console.log(`冒险结束！击杀: ${killCount}, 存活时间: ${Math.floor(adventureTime)}秒`);
}

// 返回待机（死亡后重置所有数据）
function returnToIdle() {
  gameState = 'idle';
  isPaused = false;
  monsters = [];
  // 死亡后重置所有进度
  playerLevel = 1;
  playerExp = 0;
  expToNext = 60;
  currentClass = 'none';
  saveGameData();
  console.log('数据已重置，从1级重新开始');
}

// 暂停游戏
function pauseGame() {
  if (gameState === 'adventure') {
    isPaused = true;
    console.log('游戏已暂停');
  }
}

// 继续游戏
function resumeGame() {
  isPaused = false;
  console.log('游戏继续');
}

// 放弃当前冒险（从暂停菜单退出）
function quitAdventure() {
  isPaused = false;
  returnToIdle();
}

// 绘制暂停按钮
function drawPauseButton() {
  const btnSize = 36;
  const btnX = W - btnSize - 10;
  const btnY = 60;

  // 按钮背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.arc(btnX + btnSize / 2, btnY + btnSize / 2, btnSize / 2, 0, Math.PI * 2);
  ctx.fill();

  // 暂停图标（两条竖线）
  ctx.fillStyle = '#FFFFFF';
  const barW = 6;
  const barH = 16;
  const gap = 4;
  ctx.fillRect(btnX + btnSize / 2 - barW - gap / 2, btnY + (btnSize - barH) / 2, barW, barH);
  ctx.fillRect(btnX + btnSize / 2 + gap / 2, btnY + (btnSize - barH) / 2, barW, barH);

  return { x: btnX, y: btnY, size: btnSize };
}

// 绘制暂停菜单
function drawPauseMenu() {
  // 半透明遮罩
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, W, H);

  // 暂停标题
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⏸️ 游戏暂停', W / 2, H / 2 - 80);

  // 当前状态
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#AAAAAA';
  ctx.fillText(`Lv.${playerLevel}  击杀: ${killCount}  时间: ${Math.floor(adventureTime)}s`, W / 2, H / 2 - 40);

  // 继续按钮
  const btnW = 140;
  const btnH = 45;
  const btnX = (W - btnW) / 2;
  const resumeBtnY = H / 2;

  ctx.fillStyle = 'rgba(50, 150, 50, 0.9)';
  ctx.fillRect(btnX, resumeBtnY, btnW, btnH);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(btnX, resumeBtnY, btnW, btnH);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('▶ 继续游戏', btnX + btnW / 2, resumeBtnY + btnH / 2);

  // 退出按钮
  const quitBtnY = H / 2 + 60;
  ctx.fillStyle = 'rgba(150, 50, 50, 0.9)';
  ctx.fillRect(btnX, quitBtnY, btnW, btnH);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(btnX, quitBtnY, btnW, btnH);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('✕ 放弃冒险', btnX + btnW / 2, quitBtnY + btnH / 2);

  return {
    resumeBtn: { x: btnX, y: resumeBtnY, w: btnW, h: btnH },
    quitBtn: { x: btnX, y: quitBtnY, w: btnW, h: btnH }
  };
}

// 攻击怪物
function attackMonsters() {
  const stats = getPlayerStats();

  // 使用职业攻速
  if (walkTime - lastAttackTime < stats.atkSpd) return;

  let hitAny = false;
  let firstTarget = null;

  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i];
    const dx = m.x - playerX;
    const dy = m.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 使用职业攻击范围
    if (dist < stats.range) {
      // 记录第一个攻击目标（用于动画方向）
      if (!firstTarget) {
        firstTarget = m;
        attackTargetX = dx;
        attackTargetY = dy;
      }

      // 计算伤害（含暴击）
      let damage = stats.dmg;
      const isCrit = Math.random() * 100 < stats.luck;
      if (isCrit) {
        damage = Math.floor(damage * 2); // 暴击2倍伤害
      }

      m.hp -= damage;
      m.hitTimer = isCrit ? 0.25 : 0.15; // 暴击闪烁更久
      hitAny = true;

      // 创建攻击特效
      createAttackEffect(m.x, m.y, damage, isCrit);

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
          // 前10级经验需求增长较慢，之后加速
          if (playerLevel <= 10) {
            expToNext = 60 + (playerLevel - 1) * 20; // 60, 80, 100, 120...
          } else {
            expToNext = Math.floor(expToNext * 1.3); // 10级后增长加速
          }
          const newStats = getPlayerStats();
          playerMaxHP = newStats.hp;
          playerHP = Math.min(playerHP + 20, playerMaxHP);
          console.log(`升级! Lv.${playerLevel}`);
          saveGameData(); // 保存升级数据
          // 10级时触发职业选择
          if (playerLevel === 10 && currentClass === 'none') {
            startClassSelection();
          }
          // 触发技能选择
          else if (!isSelectingSkill && !isSelectingClass) {
            startSkillSelection();
          }
        }
      }
    }
  }

  if (hitAny) {
    lastAttackTime = walkTime;
    // 触发攻击动画
    isAttacking = true;
    attackAnimTimer = attackAnimDuration;
  }
}

// 创建攻击特效
function createAttackEffect(targetX, targetY, damage, isCrit) {
  const character = getCurrentCharacter();

  // 斩击特效
  attackEffects.push({
    type: 'slash',
    x: targetX,
    y: targetY,
    angle: Math.atan2(targetY - playerY, targetX - playerX),
    timer: 0.25,
    duration: 0.25,
    color: character.color || '#FFFFFF',
    size: isCrit ? 1.5 : 1.0
  });

  // 伤害数字
  attackEffects.push({
    type: 'damage_number',
    x: targetX + (Math.random() - 0.5) * 0.05,
    y: targetY,
    damage: damage,
    isCrit: isCrit,
    timer: 0.8,
    duration: 0.8,
    vy: -0.15 // 上升速度
  });

  // 暴击特效
  if (isCrit) {
    attackEffects.push({
      type: 'crit_burst',
      x: targetX,
      y: targetY,
      timer: 0.4,
      duration: 0.4
    });
  }
}

// 更新攻击特效
function updateAttackEffects(dt) {
  // 更新攻击动画
  if (attackAnimTimer > 0) {
    attackAnimTimer -= dt;
    if (attackAnimTimer <= 0) {
      isAttacking = false;
    }
  }

  // 更新技能动画
  if (skillAnimTimer > 0) {
    skillAnimTimer -= dt;
    if (skillAnimTimer <= 0) {
      skillAnimName = '';
    }
  }

  // 更新特效
  for (let i = attackEffects.length - 1; i >= 0; i--) {
    const effect = attackEffects[i];
    effect.timer -= dt;

    // 伤害数字上升
    if (effect.type === 'damage_number') {
      effect.y += effect.vy * dt;
    }

    // 移除过期特效
    if (effect.timer <= 0) {
      attackEffects.splice(i, 1);
    }
  }
}

// 绘制攻击特效
function drawAttackEffects(groundQuad) {
  for (const effect of attackEffects) {
    // 转换到屏幕坐标
    const screenX = effect.x - playerX + 0.5;
    const screenY = effect.y - playerY + 0.5;

    if (screenX < -0.2 || screenX > 1.2 || screenY < -0.2 || screenY > 1.2) continue;

    const pt = getGroundPoint(groundQuad, Math.max(0, Math.min(1, screenX)), Math.max(0, Math.min(1, screenY)));
    const progress = 1 - effect.timer / effect.duration;

    ctx.save();

    switch (effect.type) {
      case 'slash':
        // 斩击弧线
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 4 * effect.size * pt.scale;
        ctx.globalAlpha = 1 - progress;
        ctx.lineCap = 'round';

        const slashLen = 25 * effect.size * pt.scale;
        const slashAngle = effect.angle;
        const spread = Math.PI * 0.6;

        ctx.beginPath();
        ctx.arc(pt.x, pt.y - 10, slashLen,
          slashAngle - spread / 2 + progress * 0.3,
          slashAngle + spread / 2 + progress * 0.3);
        ctx.stroke();

        // 内层亮线
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2 * effect.size * pt.scale;
        ctx.globalAlpha = (1 - progress) * 0.8;
        ctx.stroke();
        break;

      case 'damage_number':
        // 伤害数字
        const fontSize = effect.isCrit ? 18 : 14;
        ctx.font = `bold ${fontSize * pt.scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = Math.min(1, effect.timer / 0.3);

        // 文字阴影
        ctx.fillStyle = '#000000';
        ctx.fillText(effect.damage.toString(), pt.x + 1, pt.y - 20 * pt.scale + 1);

        // 伤害数字
        ctx.fillStyle = effect.isCrit ? '#FF4444' : '#FFFFFF';
        ctx.fillText(effect.damage.toString(), pt.x, pt.y - 20 * pt.scale);

        // 暴击标签
        if (effect.isCrit) {
          ctx.font = `bold ${10 * pt.scale}px sans-serif`;
          ctx.fillStyle = '#FFD700';
          ctx.fillText('暴击!', pt.x, pt.y - 35 * pt.scale);
        }
        break;

      case 'crit_burst':
        // 暴击爆发效果
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 1 - progress;

        const burstRadius = 15 + progress * 25;
        const rays = 8;
        for (let i = 0; i < rays; i++) {
          const angle = (i / rays) * Math.PI * 2 + progress * Math.PI;
          const innerR = burstRadius * 0.3;
          const outerR = burstRadius;
          ctx.beginPath();
          ctx.moveTo(pt.x + Math.cos(angle) * innerR, pt.y - 10 + Math.sin(angle) * innerR * 0.5);
          ctx.lineTo(pt.x + Math.cos(angle) * outerR, pt.y - 10 + Math.sin(angle) * outerR * 0.5);
          ctx.stroke();
        }
        break;

      case 'skill_name':
        // 技能名称显示
        ctx.globalAlpha = progress < 0.2 ? progress * 5 : (1 - (progress - 0.2) / 0.8);
        const nameY = pt.y - 60 * pt.scale - progress * 20;

        // 背景条
        ctx.fillStyle = effect.color || '#FFFFFF';
        const nameWidth = ctx.measureText(effect.name).width + 30;
        ctx.fillRect(pt.x - nameWidth / 2, nameY - 12, nameWidth, 24);

        // 技能图标和名称
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${14 * pt.scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${effect.icon} ${effect.name}`, pt.x, nameY);
        break;

      case 'skill_aura':
        // 技能释放光环
        ctx.strokeStyle = effect.color || '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.globalAlpha = (1 - progress) * 0.8;

        const auraRadius = 20 + progress * 40;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y - 20, auraRadius * pt.scale, 0, Math.PI * 2);
        ctx.stroke();

        // 内层光环
        ctx.globalAlpha = (1 - progress) * 0.4;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y - 20, auraRadius * pt.scale * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        // 能量粒子
        ctx.fillStyle = effect.color || '#FFFFFF';
        ctx.globalAlpha = (1 - progress) * 0.6;
        for (let i = 0; i < 6; i++) {
          const pAngle = (i / 6) * Math.PI * 2 + progress * Math.PI * 3;
          const pRadius = auraRadius * pt.scale * (0.8 + Math.sin(progress * Math.PI * 2) * 0.2);
          const px = pt.x + Math.cos(pAngle) * pRadius;
          const py = pt.y - 20 + Math.sin(pAngle) * pRadius * 0.5;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
    }

    ctx.restore();
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

  // 生成怪物（在玩家周围生成）
  monsterSpawnTimer += dt;
  if (monsterSpawnTimer >= monsterSpawnInterval) {
    monsterSpawnTimer = 0;
    spawnMonster();
  }

  // 自动移动AI - 每帧计算移动方向
  const moveDir = calculateMoveDirection();

  // 平滑方向过渡（关键：避免抖动）
  const smoothFactor = 0.08; // 平滑系数，越小越平滑
  smoothDirX += (moveDir.dx - smoothDirX) * smoothFactor;
  smoothDirY += (moveDir.dy - smoothDirY) * smoothFactor;

  // 玩家持续移动（使用平滑后的方向）
  const stats = getPlayerStats();
  const baseSpeed = 0.007; // 降低基础速度
  const playerSpeed = baseSpeed * stats.spd * dt * 60;
  const dirLen = Math.sqrt(smoothDirX * smoothDirX + smoothDirY * smoothDirY);
  if (dirLen > 0.05) { // 只有方向足够明确时才移动
    playerX += (smoothDirX / dirLen) * playerSpeed;
    playerY += (smoothDirY / dirLen) * playerSpeed;
  }

  // 牧师被动回血
  if (stats.healRate > 0 && playerHP < playerMaxHP) {
    playerHP = Math.min(playerHP + stats.healRate * dt, playerMaxHP);
  }

  // 更新怪物（相对于玩家位置生成和移动）
  for (const m of monsters) {
    // 朝玩家移动
    const dx = playerX - m.x;
    const dy = playerY - m.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.05) {
      m.x += (dx / dist) * m.speed;
      m.y += (dy / dist) * m.speed;
    }

    // 攻击玩家（无敌时不受伤）
    if (dist < 0.08 && playerInvincible <= 0) {
      // 骑士护甲减伤
      const armorReduction = 1 - (stats.armor / 100);
      playerHP -= m.damage * dt * armorReduction;
      comboCount = 0;
    }

    // 更新被击中闪烁
    if (m.hitTimer > 0) {
      m.hitTimer -= dt;
    }
  }

  // 移除太远的怪物
  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i];
    const dx = m.x - playerX;
    const dy = m.y - playerY;
    if (Math.sqrt(dx * dx + dy * dy) > 2.0) {
      monsters.splice(i, 1);
    }
  }

  // 检查死亡
  if (playerHP <= 0) {
    playerHP = 0;
    endAdventure();
  }

  // 更新拾取物
  updateCollectibles(dt);
}

// 计算移动方向（平滑AI）
function calculateMoveDirection() {
  let dirX = 0;
  let dirY = 0;

  const stats = getPlayerStats();

  // 找出最近的怪物距离和危险怪物数量
  let nearestMonster = null;
  let nearestMonsterDist = Infinity;
  let dangerCount = 0; // 危险范围内的怪物数量
  const dangerZone = 0.06; // 危险距离（只有非常近才算危险）
  const attackRange = stats.range; // 使用职业攻击范围
  const optimalRange = stats.range * 0.7; // 最佳战斗距离

  for (const m of monsters) {
    const dx = playerX - m.x;
    const dy = playerY - m.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < nearestMonsterDist) {
      nearestMonsterDist = dist;
      nearestMonster = m;
    }

    if (dist < dangerZone) {
      dangerCount++;
    }
  }

  // 战斗AI逻辑：主动进攻！
  // 1. 只有被围攻（3个以上近身）才考虑后退
  // 2. 正常情况主动接近并攻击敌人
  // 3. 没有怪物时寻找物品或随机移动

  if (dangerCount >= 3) {
    // 被围攻，轻微后撤但不完全逃跑
    for (const m of monsters) {
      const dx = playerX - m.x;
      const dy = playerY - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.1 && dist > 0.001) {
        const force = (0.1 - dist) / 0.1;
        dirX += (dx / dist) * force * 0.8; // 降低逃跑力度
        dirY += (dy / dist) * force * 0.8;
      }
    }
  } else if (nearestMonster) {
    // 主动接近并攻击敌人！
    const dx = nearestMonster.x - playerX;
    const dy = nearestMonster.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0.01) {
      if (dist > optimalRange) {
        // 不在攻击范围内，积极接近敌人
        const approachForce = 1.5; // 增加接近力度
        dirX += (dx / dist) * approachForce;
        dirY += (dy / dist) * approachForce;
      }
      // 在攻击范围内时站定攻击，不后退！

      // 轻微环绕移动（让战斗更生动）
      const perpX = -dy / dist;
      const perpY = dx / dist;
      const circleForce = Math.sin(walkTime * 3) * 0.15;
      dirX += perpX * circleForce;
      dirY += perpY * circleForce;
    }
  }

  // 靠近安全的拾取物
  let nearestSafeCollectible = null;
  let nearestDist = Infinity;
  for (const c of collectibles) {
    const dx = c.x - playerX;
    const dy = c.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 检查这个拾取物是否安全
    let isSafe = true;
    for (const m of monsters) {
      const mdx = c.x - m.x;
      const mdy = c.y - m.y;
      if (Math.sqrt(mdx * mdx + mdy * mdy) < 0.25) {
        isSafe = false;
        break;
      }
    }

    if (isSafe && dist < nearestDist) {
      nearestDist = dist;
      nearestSafeCollectible = c;
    }
  }

  if (nearestSafeCollectible && nearestDist < 0.8) {
    const dx = nearestSafeCollectible.x - playerX;
    const dy = nearestSafeCollectible.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.01) {
      // 低血量时更倾向于拾取血瓶
      let priority = 0.5;
      if (nearestSafeCollectible.type === 'health' && playerHP < playerMaxHP * 0.5) {
        priority = 1.5;
      }
      dirX += (dx / dist) * priority;
      dirY += (dy / dist) * priority;
    }
  }

  // 如果没有怪物，轻微随机移动
  if (monsters.length === 0) {
    dirX += Math.sin(walkTime * 0.5) * 0.3;
    dirY += Math.cos(walkTime * 0.7) * 0.3;
  }

  return { dx: dirX, dy: dirY };
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

  // 在玩家周围0.2-0.5距离处生成
  const angle = Math.random() * Math.PI * 2;
  const distance = 0.2 + Math.random() * 0.3;

  collectibles.push({
    type,
    x: playerX + Math.cos(angle) * distance,
    y: playerY + Math.sin(angle) * distance,
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

  // 检测拾取和移除太远的物品
  for (let i = collectibles.length - 1; i >= 0; i--) {
    const c = collectibles[i];
    const dx = c.x - playerX;
    const dy = c.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 移除太远的物品
    if (dist > 1.5) {
      collectibles.splice(i, 1);
      continue;
    }

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
          // 前10级经验需求增长较慢，之后加速
          if (playerLevel <= 10) {
            expToNext = 60 + (playerLevel - 1) * 20;
          } else {
            expToNext = Math.floor(expToNext * 1.3);
          }
          const newStats = getPlayerStats();
          playerMaxHP = newStats.hp;
          playerHP = Math.min(playerHP + 20, playerMaxHP);
          saveGameData();
          // 触发技能选择
          if (!isSelectingSkill) {
            startSkillSelection();
          }
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

// ==================== 程序化地图生成 ====================
// 种子随机数生成器
function seededRandom(seed) {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// 根据世界坐标生成场景元素
function getWorldElements(worldX, worldY, radius) {
  const elements = [];
  const tileSize = 0.15; // 每个格子的大小

  // 遍历玩家周围的格子
  const minTileX = Math.floor((worldX - radius) / tileSize);
  const maxTileX = Math.floor((worldX + radius) / tileSize);
  const minTileY = Math.floor((worldY - radius) / tileSize);
  const maxTileY = Math.floor((worldY + radius) / tileSize);

  for (let tx = minTileX; tx <= maxTileX; tx++) {
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      // 使用格子坐标作为种子
      const seed = tx * 7919 + ty * 104729;
      const rand = seededRandom(seed);

      // 30%概率生成元素
      if (rand < 0.3) {
        const rand2 = seededRandom(seed + 1);
        const rand3 = seededRandom(seed + 2);
        const rand4 = seededRandom(seed + 3);

        // 确定类型
        let type;
        if (rand2 < 0.25) type = 'tree';
        else if (rand2 < 0.6) type = 'grass';
        else type = 'flower';

        // 在格子内随机偏移
        const elemX = tx * tileSize + rand3 * tileSize;
        const elemY = ty * tileSize + rand4 * tileSize;

        elements.push({
          type,
          x: elemX,
          y: elemY,
          seed: seed // 用于随机大小变化
        });
      }
    }
  }

  return elements;
}

// 待机模式的固定场景元素（向后兼容）
const idleGroundElements = [
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

  // 攻击动画进度 (0-1)
  const attackProgress = isAttacking ? (1 - attackAnimTimer / attackAnimDuration) : 0;
  const attackSwing = isAttacking ? Math.sin(attackProgress * Math.PI) * 1.5 : 0;

  // 手臂角度（攻击时向前挥舞）
  let rArm = Math.sin(t + Math.PI) * swingAmp * 0.6;
  let rForearm = Math.sin(t + Math.PI - 0.3) * swingAmp * 0.4 + 0.5;
  let lArm = Math.sin(t) * swingAmp * 0.6;
  let lForearm = Math.sin(t - 0.3) * swingAmp * 0.4 + 0.5;

  // 攻击时手臂动作
  if (isAttacking) {
    // 根据攻击目标方向决定用哪只手攻击
    const attackDirX = attackTargetX;
    const useRightArm = attackDirX * facingRight >= 0;

    if (useRightArm) {
      rArm = -0.5 - attackSwing; // 向前挥
      rForearm = 0.3 + attackSwing * 0.5;
    } else {
      lArm = -0.5 - attackSwing;
      lForearm = 0.3 + attackSwing * 0.5;
    }
  }

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

  // 绘制装备和武器（10级后有职业才显示）
  const character = getCurrentCharacter();

  // 绘制护甲（只有有护甲时才绘制）
  if (character.armor && character.armor !== 'none') {
    drawArmor(character.armor, 0, shoulderY, bodyLen, bodyW, headR, scale, character.color);
  }

  // 绘制武器（只有有武器时才绘制）
  if (character.weapon && character.weapon !== 'none') {
    const weaponAngle = Math.sin(t) * 0.3; // 武器随走路摆动
    if (drawRightFirst) {
      drawWeapon(character.weapon, lHandX, lHandY, scale, weaponAngle, facingRight);
    } else {
      drawWeapon(character.weapon, rHandX, rHandY, scale, weaponAngle, facingRight);
    }
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

  const isAdventure = (gameState === 'adventure' || gameState === 'gameover');

  if (isAdventure) {
    // 冒险模式：使用程序化生成的世界元素
    const worldElements = getWorldElements(playerX, playerY, 0.6);

    for (const elem of worldElements) {
      // 转换到屏幕坐标（相对于玩家位置）
      const screenX = elem.x - playerX + 0.5;
      const screenY = elem.y - playerY + 0.5;

      if (screenX >= 0.02 && screenX <= 0.98 && screenY >= 0.02 && screenY <= 0.98) {
        drawGroundElement(groundQuad, elem.type, screenX, screenY);
      }
    }

    // 绘制拾取物（世界坐标转屏幕坐标）
    for (const c of collectibles) {
      const screenX = c.x - playerX + 0.5;
      const screenY = c.y - playerY + 0.5;
      if (screenX >= 0.02 && screenX <= 0.98 && screenY >= 0.02 && screenY <= 0.98) {
        const pt = getGroundPoint(groundQuad, screenX, screenY);
        drawCollectible(pt.x, pt.y, pt.scale, c, walkTime);
      }
    }

    // 绘制怪物（世界坐标转屏幕坐标）
    for (const m of monsters) {
      const screenX = m.x - playerX + 0.5;
      const screenY = m.y - playerY + 0.5;
      if (screenX >= 0.02 && screenX <= 0.98 && screenY >= 0.02 && screenY <= 0.98) {
        const pt = getGroundPoint(groundQuad, screenX, screenY);
        drawMonster(pt.x, pt.y, pt.scale, m, walkTime);
      }
    }

    // 玩家始终在中心
    const centerPt = getGroundPoint(groundQuad, 0.5, 0.5);
    drawStickMan(centerPt.x, centerPt.y, centerPt.scale, walkTime, groundQuad);

    // 绘制技能特效
    drawSkillEffects(groundQuad);

    // 绘制攻击特效
    drawAttackEffects(groundQuad);

  } else {
    // 待机模式：使用固定的场景元素
    for (const elem of idleGroundElements) {
      elem.x += deltaOffset * normX;
      elem.y += deltaOffset * normY;
      elem.x = ((elem.x % 1.0) + 1.0) % 1.0;
      elem.y = ((elem.y % 1.0) + 1.0) % 1.0;
    }

    for (const elem of idleGroundElements) {
      drawGroundElement(groundQuad, elem.type, elem.x, elem.y);
    }

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
  const trigramIcons = { '乾': '☰', '坤': '☷', '震': '☳', '巽': '☴', '坎': '☵', '离': '☲', '艮': '☶', '兑': '☱' };
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${trigramIcons[currentPalace] || ''} ${currentPalace}宫`, 15, 25);
  // 显示宫位加成
  const palaceBonus = PALACE_BONUS[currentPalace];
  if (palaceBonus) {
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(palaceBonus.description, 15, 42);
  }
  if (gameState === 'idle') {
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillText('点击顶点切换视角', 15, palaceBonus ? 56 : 42);
  }

  // 左下角 - 角色状态面板
  const character = getCurrentCharacter();
  const stats = getPlayerStats();
  drawCharacterStatusPanel(character, stats);

  // 底部 - 开始冒险按钮（只在待机模式显示）
  if (gameState === 'idle') {
    // 居中的大按钮
    const btnW = 140;
    const btnH = 50;
    const btnX = (W - btnW) / 2;
    const btnY = H - btnH - 30;

    // 按钮阴影
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(btnX + 3, btnY + 3, btnW, btnH);

    // 按钮背景渐变效果
    ctx.fillStyle = 'rgba(180, 40, 40, 0.95)';
    ctx.fillRect(btnX, btnY, btnW, btnH);

    // 按钮高光
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(btnX, btnY, btnW, btnH / 2);

    // 按钮边框
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    // 按钮文字
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('开始冒险', btnX + btnW / 2, btnY + btnH / 2);

    // 小提示
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px sans-serif';
    ctx.fillText('点击顶点可切换八卦视角', W / 2, btnY - 15);

    // 重置数据按钮（右上角，红色醒目）
    const resetBtnW = 70;
    const resetBtnH = 28;
    const resetBtnX = W - resetBtnW - 10;
    const resetBtnY = 10;

    // 红色背景更醒目
    ctx.fillStyle = 'rgba(180, 60, 60, 0.9)';
    ctx.fillRect(resetBtnX, resetBtnY, resetBtnW, resetBtnH);
    ctx.strokeStyle = '#FF6666';
    ctx.lineWidth = 2;
    ctx.strokeRect(resetBtnX, resetBtnY, resetBtnW, resetBtnH);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('重置数据', resetBtnX + resetBtnW / 2, resetBtnY + resetBtnH / 2);
  }

  // 冒险模式UI
  if (gameState === 'adventure') {
    // 右上角 - 战斗信息
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(W - 115, 5, 110, 50);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`击杀: ${killCount}`, W - 10, 22);
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`金币: ${goldCollected}`, W - 10, 38);
    ctx.fillStyle = '#00BCD4';
    ctx.fillText(`时间: ${Math.floor(adventureTime)}s`, W - 10, 54);

    // 暂停按钮（右上角，战斗信息下方）
    drawPauseButton();

    // 操作提示（顶部中央）
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('点击头像查看详细属性', W / 2, 25);
  }

  // 暂停菜单（最高优先级显示）
  if (isPaused && gameState === 'adventure') {
    drawPauseMenu();
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

  // 技能HUD - 显示已获得的技能和冷却
  if (gameState === 'adventure' && !isSelectingSkill) {
    drawSkillHUD();
  }

  // 技能选择UI（全屏覆盖）
  if (isSelectingSkill && skillChoices.length > 0) {
    drawSkillSelectionUI();
  }

  // 职业选择UI（全屏覆盖，优先级高于技能选择）
  if (isSelectingClass) {
    drawClassSelectionUI();
  }
}

// 角色头像点击区域
let avatarHitBox = { x: 0, y: 0, w: 0, h: 0 };

// 绘制角色状态面板（左下角）
function drawCharacterStatusPanel(character, stats) {
  const panelX = 10;
  const panelY = H - 75;
  const avatarSize = 50;
  const barWidth = 100;
  const barHeight = 10;

  // 存储头像点击区域
  avatarHitBox = { x: panelX, y: panelY - 5, w: avatarSize, h: avatarSize + 25 };

  // 面板背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.beginPath();
  ctx.moveTo(panelX, panelY);
  ctx.lineTo(panelX + avatarSize + barWidth + 20, panelY);
  ctx.lineTo(panelX + avatarSize + barWidth + 20, panelY + avatarSize + 15);
  ctx.lineTo(panelX, panelY + avatarSize + 15);
  ctx.closePath();
  ctx.fill();

  // 头像背景
  ctx.fillStyle = character.color || '#666666';
  ctx.fillRect(panelX + 5, panelY + 5, avatarSize - 10, avatarSize - 10);

  // 头像边框
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX + 5, panelY + 5, avatarSize - 10, avatarSize - 10);

  // 绘制小人头像
  drawAvatarHead(panelX + avatarSize / 2, panelY + avatarSize / 2, avatarSize * 0.35, character.color);

  // 等级标签
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Lv.${playerLevel}`, panelX + avatarSize / 2, panelY + avatarSize + 8);

  // 条形图起始位置
  const barsX = panelX + avatarSize + 8;
  const barsY = panelY + 8;

  // HP条
  const hpRatio = gameState === 'adventure' ? Math.max(0, playerHP / playerMaxHP) : 1;
  drawStatusBar(barsX, barsY, barWidth, barHeight, hpRatio, '#4CAF50', '#2E7D32', 'HP');

  // MP条（蓝条）
  const mpRatio = Math.max(0, playerMP / playerMaxMP);
  drawStatusBar(barsX, barsY + barHeight + 4, barWidth, barHeight, mpRatio, '#2196F3', '#1565C0', 'MP');

  // EXP条
  const expRatio = playerExp / expToNext;
  drawStatusBar(barsX, barsY + (barHeight + 4) * 2, barWidth, barHeight, expRatio, '#9C27B0', '#6A1B9A', 'EXP');

  // 显示详细数值面板
  if (showDetailedStats) {
    drawDetailedStatsPanel(character, stats);
  }
}

// 绘制状态条
function drawStatusBar(x, y, width, height, ratio, fgColor, bgColor, label) {
  // 背景
  ctx.fillStyle = bgColor;
  ctx.fillRect(x, y, width, height);

  // 前景
  ctx.fillStyle = fgColor;
  ctx.fillRect(x, y, width * ratio, height);

  // 边框
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  // 标签
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '8px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 2, y + height / 2);
}

// 绘制头像中的小人头
function drawAvatarHead(x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);

  // 头
  ctx.fillStyle = color || '#666666';
  ctx.beginPath();
  ctx.arc(0, -size * 0.3, size * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // 身体
  ctx.strokeStyle = color || '#666666';
  ctx.lineWidth = size * 0.15;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.1);
  ctx.lineTo(0, size * 0.4);
  ctx.stroke();

  // 手臂
  ctx.beginPath();
  ctx.moveTo(-size * 0.35, size * 0.1);
  ctx.lineTo(size * 0.35, size * 0.1);
  ctx.stroke();

  // 腿
  ctx.beginPath();
  ctx.moveTo(0, size * 0.4);
  ctx.lineTo(-size * 0.25, size * 0.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, size * 0.4);
  ctx.lineTo(size * 0.25, size * 0.8);
  ctx.stroke();

  ctx.restore();
}

// 绘制详细数值面板
function drawDetailedStatsPanel(character, stats) {
  const panelW = 160;
  const panelH = 180;
  const panelX = 10;
  const panelY = H - 75 - panelH - 10;

  // 背景
  ctx.fillStyle = 'rgba(20, 20, 30, 0.95)';
  ctx.fillRect(panelX, panelY, panelW, panelH);

  // 边框
  ctx.strokeStyle = character.color || '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  // 标题栏
  ctx.fillStyle = character.color || '#666666';
  ctx.fillRect(panelX, panelY, panelW, 25);

  // 角色名称
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${character.name} Lv.${playerLevel}`, panelX + panelW / 2, panelY + 16);

  // 属性列表
  ctx.textAlign = 'left';
  ctx.font = '11px sans-serif';
  const lineHeight = 18;
  let y = panelY + 40;

  const statItems = [
    { label: '生命值', value: `${Math.ceil(playerHP)} / ${playerMaxHP}`, color: '#4CAF50' },
    { label: '魔法值', value: `${Math.ceil(playerMP)} / ${playerMaxMP}`, color: '#2196F3' },
    { label: '经验值', value: `${playerExp} / ${expToNext}`, color: '#9C27B0' },
    { label: '攻击力', value: stats.dmg.toString(), color: '#FF5722' },
    { label: '攻击速度', value: `${stats.atkSpd.toFixed(2)}s`, color: '#FFC107' },
    { label: '移动速度', value: stats.spd.toFixed(2), color: '#00BCD4' },
    { label: '攻击范围', value: (stats.range * 100).toFixed(0), color: '#8BC34A' },
    { label: '暴击率', value: `${stats.luck.toFixed(1)}%`, color: '#E91E63' }
  ];

  for (const item of statItems) {
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(item.label + ':', panelX + 10, y);
    ctx.fillStyle = item.color;
    ctx.textAlign = 'right';
    ctx.fillText(item.value, panelX + panelW - 10, y);
    ctx.textAlign = 'left';
    y += lineHeight;
  }

  // 描述
  ctx.fillStyle = '#888888';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(character.description, panelX + panelW / 2, panelY + panelH - 8);
}

// 绘制技能HUD
function drawSkillHUD() {
  const skillSlotSize = 42;
  const skillSpacing = 6;
  const startX = 12;
  const startY = H - 155; // 上移一点，给状态面板让位

  // 清空技能点击区域
  skillHitBoxes = [];

  const totalSkills = playerSkills.length;
  const hasPassive = playerPassive !== null;

  if (totalSkills === 0 && !hasPassive) return;

  // 计算背景大小
  const bgWidth = Math.max(totalSkills * (skillSlotSize + skillSpacing) + skillSpacing, hasPassive ? 90 : 50);
  const bgHeight = skillSlotSize + (hasPassive ? 28 : 10);

  // 背景面板（圆角效果）
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  const bgX = startX - 8;
  const bgY = startY - 8;
  const radius = 8;
  ctx.moveTo(bgX + radius, bgY);
  ctx.lineTo(bgX + bgWidth - radius, bgY);
  ctx.quadraticCurveTo(bgX + bgWidth, bgY, bgX + bgWidth, bgY + radius);
  ctx.lineTo(bgX + bgWidth, bgY + bgHeight - radius);
  ctx.quadraticCurveTo(bgX + bgWidth, bgY + bgHeight, bgX + bgWidth - radius, bgY + bgHeight);
  ctx.lineTo(bgX + radius, bgY + bgHeight);
  ctx.quadraticCurveTo(bgX, bgY + bgHeight, bgX, bgY + bgHeight - radius);
  ctx.lineTo(bgX, bgY + radius);
  ctx.quadraticCurveTo(bgX, bgY, bgX + radius, bgY);
  ctx.closePath();
  ctx.fill();

  // 绘制主动技能
  for (let i = 0; i < playerSkills.length; i++) {
    const skill = playerSkills[i];
    const x = startX + i * (skillSlotSize + skillSpacing);
    const y = startY;

    // 存储点击区域
    skillHitBoxes.push({
      skill: skill,
      x: x,
      y: y,
      w: skillSlotSize,
      h: skillSlotSize,
      type: 'active'
    });

    const cd = skillCooldowns[skill.id] || 0;
    const isReady = cd <= 0;

    // 技能槽背景（渐变效果）
    if (isReady) {
      // 就绪状态 - 亮色
      const gradient = ctx.createLinearGradient(x, y, x, y + skillSlotSize);
      gradient.addColorStop(0, skill.color || '#555555');
      gradient.addColorStop(1, shadeColor(skill.color || '#555555', -30));
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = '#333333';
    }
    ctx.fillRect(x, y, skillSlotSize, skillSlotSize);

    // 冷却遮罩（扇形）
    if (cd > 0) {
      const cdRatio = cd / skill.cooldown;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.moveTo(x + skillSlotSize / 2, y + skillSlotSize / 2);
      ctx.arc(x + skillSlotSize / 2, y + skillSlotSize / 2, skillSlotSize / 2 + 2,
        -Math.PI / 2, -Math.PI / 2 + cdRatio * Math.PI * 2);
      ctx.closePath();
      ctx.fill();

      // 冷却数字
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.ceil(cd).toString(), x + skillSlotSize / 2, y + skillSlotSize / 2);
    }

    // 技能图标
    if (isReady || cd < skill.cooldown * 0.3) {
      ctx.font = `${skillSlotSize * 0.55}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = isReady ? 1 : 0.5;
      ctx.fillText(skill.icon, x + skillSlotSize / 2, y + skillSlotSize / 2);
      ctx.globalAlpha = 1;
    }

    // 边框
    ctx.strokeStyle = isReady ? '#FFFFFF' : '#666666';
    ctx.lineWidth = isReady ? 2 : 1;
    ctx.strokeRect(x, y, skillSlotSize, skillSlotSize);

    // 就绪闪光效果
    if (isReady) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 3, y + skillSlotSize - 3);
      ctx.lineTo(x + 3, y + 3);
      ctx.lineTo(x + skillSlotSize - 3, y + 3);
      ctx.stroke();
    }
  }

  // 绘制被动技能
  if (playerPassive) {
    const passiveX = startX;
    const passiveY = startY + skillSlotSize + 4;
    const passiveW = 85;
    const passiveH = 18;

    // 存储点击区域
    skillHitBoxes.push({
      skill: playerPassive,
      x: passiveX,
      y: passiveY,
      w: passiveW,
      h: passiveH,
      type: 'passive'
    });

    // 被动技能背景
    const gradient = ctx.createLinearGradient(passiveX, passiveY, passiveX + passiveW, passiveY);
    gradient.addColorStop(0, playerPassive.color || '#666666');
    gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = gradient;
    ctx.fillRect(passiveX, passiveY, passiveW, passiveH);

    // 被动图标和名称
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${playerPassive.icon} ${playerPassive.name}`, passiveX + 4, passiveY + passiveH / 2);

    // 金色边框
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(passiveX, passiveY, passiveW, passiveH);
  }

  // 绘制技能提示
  if (skillTooltip) {
    drawSkillTooltip(skillTooltip.skill, skillTooltip.x, skillTooltip.y);
  }
}

// 颜色加深/变亮辅助函数
function shadeColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// 绘制技能提示框
function drawSkillTooltip(skill, tx, ty) {
  const tooltipW = 160;
  const tooltipH = 95;

  // 确保提示框在屏幕内
  let x = tx - tooltipW / 2;
  let y = ty - tooltipH - 10;
  if (x < 5) x = 5;
  if (x + tooltipW > W - 5) x = W - tooltipW - 5;
  if (y < 5) y = ty + 50;

  // 背景
  ctx.fillStyle = 'rgba(20, 20, 30, 0.95)';
  ctx.fillRect(x, y, tooltipW, tooltipH);

  // 边框
  ctx.strokeStyle = skill.color || '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, tooltipW, tooltipH);

  // 标题栏
  ctx.fillStyle = skill.color || '#FFFFFF';
  ctx.fillRect(x, y, tooltipW, 24);

  // 技能名称
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${skill.icon} ${skill.name}`, x + 8, y + 12);

  // 卦象
  ctx.fillStyle = '#AAAAAA';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  const triSymbols = { '乾': '☰', '坤': '☷', '震': '☳', '巽': '☴', '坎': '☵', '离': '☲', '艮': '☶', '兑': '☱' };
  ctx.fillText(skill.trigram ? `${triSymbols[skill.trigram]} ${skill.trigram}` : '', x + tooltipW - 8, y + 12);

  // 类型标签
  const isPassive = skill.type === 'passive';
  ctx.fillStyle = isPassive ? '#FFD700' : '#00BFFF';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(isPassive ? '⭐ 被动技能' : `⚔️ 主动 | CD: ${skill.cooldown}s`, x + 8, y + 38);

  // 描述（自动换行）
  ctx.fillStyle = '#DDDDDD';
  ctx.font = '10px sans-serif';
  const desc = skill.description || '无描述';
  const maxWidth = tooltipW - 16;
  let line = '';
  let lineY = y + 55;
  for (const char of desc) {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth) {
      ctx.fillText(line, x + 8, lineY);
      line = char;
      lineY += 13;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x + 8, lineY);

  // 伤害信息（如果有）
  if (skill.damage) {
    ctx.fillStyle = '#FF6B6B';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`伤害: ${skill.damage}`, x + tooltipW - 8, y + tooltipH - 8);
  }
}

// 绘制技能选择UI
function drawSkillSelectionUI() {
  // 半透明背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, W, H);

  // 标题
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎁 选择技能', W / 2, 50);

  ctx.fillStyle = '#AAAAAA';
  ctx.font = '12px sans-serif';
  ctx.fillText(`已拥有: ${playerSkills.length}/4 主动技能${playerPassive ? ' + 1被动' : ''}`, W / 2, 75);

  // 技能选项（2x2布局）
  const cardW = W * 0.42;
  const cardH = H * 0.28;
  const gapX = W * 0.04;
  const gapY = H * 0.03;
  const startX = (W - cardW * 2 - gapX) / 2;
  const startY = 95;

  for (let i = 0; i < skillChoices.length; i++) {
    const skill = skillChoices[i];
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);

    // 卡片背景
    const isPassive = skill.type === 'passive';
    const canSelect = isPassive || playerSkills.length < 4;

    ctx.fillStyle = canSelect ? 'rgba(40, 40, 60, 0.95)' : 'rgba(40, 40, 40, 0.7)';
    ctx.fillRect(x, y, cardW, cardH);

    // 边框颜色
    ctx.strokeStyle = isPassive ? '#FFD700' : skill.color || '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, cardW, cardH);

    // 技能图标
    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(skill.icon, x + cardW / 2, y + 35);

    // 技能名称
    ctx.fillStyle = skill.color || '#FFFFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(skill.name, x + cardW / 2, y + 60);

    // 卦象
    ctx.fillStyle = '#888888';
    ctx.font = '11px sans-serif';
    const trigramSymbols = { '乾': '☰', '坤': '☷', '震': '☳', '巽': '☴', '坎': '☵', '离': '☲', '艮': '☶', '兑': '☱' };
    const trigramText = skill.trigram ? `${trigramSymbols[skill.trigram] || ''} ${skill.trigram}卦` : '';
    ctx.fillText(trigramText, x + cardW / 2, y + 78);

    // 类型标签
    ctx.fillStyle = isPassive ? '#FFD700' : '#00BFFF';
    ctx.font = '10px sans-serif';
    ctx.fillText(isPassive ? '⭐ 被动' : `⚔️ 主动 CD:${skill.cooldown}s`, x + cardW / 2, y + 95);

    // 描述
    ctx.fillStyle = '#CCCCCC';
    ctx.font = '11px sans-serif';
    const desc = skill.description || '';
    // 自动换行
    const maxLineWidth = cardW - 20;
    let line = '';
    let lineY = y + 115;
    for (const char of desc) {
      const testLine = line + char;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxLineWidth) {
        ctx.fillText(line, x + cardW / 2, lineY);
        line = char;
        lineY += 14;
      } else {
        line = testLine;
      }
    }
    if (line) {
      ctx.fillText(line, x + cardW / 2, lineY);
    }

    // 不可选择提示
    if (!canSelect) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(x, y, cardW, cardH);
      ctx.fillStyle = '#FF4444';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('技能槽已满', x + cardW / 2, y + cardH / 2);
    }

    // 存储点击区域（用于触摸检测）
    skillChoices[i].hitBox = { x, y, w: cardW, h: cardH };
  }

  // 跳过按钮
  const skipBtnW = 100;
  const skipBtnH = 35;
  const skipBtnX = (W - skipBtnW) / 2;
  const skipBtnY = H - 60;

  ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
  ctx.fillRect(skipBtnX, skipBtnY, skipBtnW, skipBtnH);
  ctx.strokeStyle = '#AAAAAA';
  ctx.lineWidth = 2;
  ctx.strokeRect(skipBtnX, skipBtnY, skipBtnW, skipBtnH);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '14px sans-serif';
  ctx.fillText('跳过', skipBtnX + skipBtnW / 2, skipBtnY + skipBtnH / 2);
}

// ==================== 游戏循环 ====================
let lastTime = Date.now();

function gameLoop() {
  const now = Date.now();
  const dt = Math.min((now - lastTime) / 1000, 0.1); // 最大0.1秒，防止跳帧
  lastTime = now;

  // 暂停时只更新动画时间，不更新游戏逻辑
  if (!isPaused) {
    walkTime += dt;
    stickManSpeed += (targetSpeed - stickManSpeed) * SPEED_LERP;
    sceneOffset += BASE_SCENE_SPEED * stickManSpeed;

    // 更新冒险逻辑
    updateAdventure(dt);

    // 冒险模式下自动攻击和技能
    if (gameState === 'adventure') {
      attackMonsters();
      // 更新攻击特效
      updateAttackEffects(dt);
      // 更新技能冷却和自动释放（技能/职业选择时暂停）
      if (!isSelectingSkill && !isSelectingClass) {
        updateSkillCooldowns(dt);
        autoUseSkills();
      }
      updateSkillEffects(dt);
    }
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
    const tx = e.touches[0].clientX;
    const ty = e.touches[0].clientY;
    touchStart = { x: tx, y: ty, t: Date.now() };
    updateGroundQuadCache();

    // 清除之前的长按计时器
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    skillTooltip = null;

    // 检查是否点击了技能槽（冒险模式且非技能选择状态）
    if (gameState === 'adventure' && !isSelectingSkill) {
      for (const hb of skillHitBoxes) {
        if (tx >= hb.x && tx <= hb.x + hb.w && ty >= hb.y && ty <= hb.y + hb.h) {
          // 开始长按计时（300ms后显示提示）
          longPressTimer = setTimeout(() => {
            skillTooltip = {
              skill: hb.skill,
              x: hb.x + hb.w / 2,
              y: hb.y
            };
          }, 300);
          break;
        }
      }
    }
  }
});

wx.onTouchEnd((e) => {
  // 清除长按计时器和提示
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  const wasShowingTooltip = skillTooltip !== null;
  skillTooltip = null;

  if (!touchStart || !e.changedTouches.length) return;
  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  const dt = Date.now() - touchStart.t;
  const tx = touch.clientX;
  const ty = touch.clientY;

  // 如果正在显示技能提示，松开后不执行其他操作
  if (wasShowingTooltip) {
    touchStart = null;
    return;
  }

  // 暂停菜单状态 - 最高优先级
  if (isPaused && gameState === 'adventure') {
    const btnW = 140;
    const btnH = 45;
    const btnX = (W - btnW) / 2;
    const resumeBtnY = H / 2;
    const quitBtnY = H / 2 + 60;

    // 检查继续按钮
    if (tx >= btnX && tx <= btnX + btnW && ty >= resumeBtnY && ty <= resumeBtnY + btnH) {
      resumeGame();
      touchStart = null;
      return;
    }

    // 检查退出按钮
    if (tx >= btnX && tx <= btnX + btnW && ty >= quitBtnY && ty <= quitBtnY + btnH) {
      quitAdventure();
      touchStart = null;
      return;
    }

    touchStart = null;
    return;
  }

  // 冒险模式中检查暂停按钮
  if (gameState === 'adventure' && !isPaused && !isSelectingSkill && !isSelectingClass) {
    const btnSize = 36;
    const pauseBtnX = W - btnSize - 10;
    const pauseBtnY = 60;
    const centerX = pauseBtnX + btnSize / 2;
    const centerY = pauseBtnY + btnSize / 2;
    const dist = Math.sqrt((tx - centerX) ** 2 + (ty - centerY) ** 2);

    if (dist <= btnSize / 2 + 5) { // 稍微增大点击区域
      pauseGame();
      touchStart = null;
      return;
    }
  }

  // 职业选择状态
  if (isSelectingClass) {
    const classKeys = Object.keys(CLASS_TYPES);
    const cardW = 100;
    const cardH = 140;
    const gap = 10;
    const totalW = classKeys.length * cardW + (classKeys.length - 1) * gap;
    const startX = (W - totalW) / 2;
    const startY = 90;

    for (let i = 0; i < classKeys.length; i++) {
      const x = startX + i * (cardW + gap);
      const y = startY;
      if (tx >= x && tx <= x + cardW && ty >= y && ty <= y + cardH) {
        selectClass(classKeys[i]);
        touchStart = null;
        return;
      }
    }
    touchStart = null;
    return;
  }

  // 技能选择状态
  if (isSelectingSkill && skillChoices.length > 0) {
    // 检查是否点击了技能卡片
    for (let i = 0; i < skillChoices.length; i++) {
      const skill = skillChoices[i];
      if (skill.hitBox) {
        const hb = skill.hitBox;
        if (tx >= hb.x && tx <= hb.x + hb.w && ty >= hb.y && ty <= hb.y + hb.h) {
          // 检查是否可以选择
          const isPassive = skill.type === 'passive';
          const canSelect = isPassive || playerSkills.length < 4;
          if (canSelect) {
            selectSkill(i);
            touchStart = null;
            return;
          }
        }
      }
    }

    // 检查是否点击了跳过按钮
    const skipBtnW = 100;
    const skipBtnH = 35;
    const skipBtnX = (W - skipBtnW) / 2;
    const skipBtnY = H - 60;
    if (tx >= skipBtnX && tx <= skipBtnX + skipBtnW && ty >= skipBtnY && ty <= skipBtnY + skipBtnH) {
      isSelectingSkill = false;
      skillChoices = [];
      touchStart = null;
      return;
    }

    touchStart = null;
    return;
  }

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

  // 点击头像显示/隐藏详细数值
  if (tx >= avatarHitBox.x && tx <= avatarHitBox.x + avatarHitBox.w &&
      ty >= avatarHitBox.y && ty <= avatarHitBox.y + avatarHitBox.h) {
    showDetailedStats = !showDetailedStats;
    touchStart = null;
    return;
  }

  // 点击其他地方关闭详细数值面板
  if (showDetailedStats) {
    showDetailedStats = false;
    touchStart = null;
    return;
  }

  // 待机模式的交互
  if (dt < 300 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
    // 检查是否点击了"重置数据"按钮（右上角）
    if (gameState === 'idle') {
      const resetBtnW = 70;
      const resetBtnH = 28;
      const resetBtnX = W - resetBtnW - 10;
      const resetBtnY = 10;
      if (tx >= resetBtnX && tx <= resetBtnX + resetBtnW && ty >= resetBtnY && ty <= resetBtnY + resetBtnH) {
        resetGameData();
        touchStart = null;
        return;
      }
    }

    // 检查是否点击了"开始冒险"按钮（居中）
    const advBtnW = 140;
    const advBtnH = 50;
    const advBtnX = (W - advBtnW) / 2;
    const advBtnY = H - advBtnH - 30;
    if (tx >= advBtnX && tx <= advBtnX + advBtnW && ty >= advBtnY && ty <= advBtnY + advBtnH) {
      startAdventure();
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
