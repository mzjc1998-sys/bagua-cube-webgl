/**
 * 游戏配置 - 八卦立方体 Roguelike
 *
 * 核心理念：
 * - 计算机是二进制，易的象数也是二进制
 * - 0=阳爻，1=阴爻
 * - 爻序：从下到上
 * - 乾000，坤111
 * - 64卦 = 两个比特正方体叠加 = 4D超立方体
 * - 384种可能性 = 64卦 × 6面镜像
 */

// =============== 八卦定义 (用户修正版) ===============
// 爻序：从下到上，乾000 坤111
const TRIGRAMS = {
  '000': { name: '乾', symbol: '☰', element: '天', nature: '刚健' },
  '001': { name: '兑', symbol: '☱', element: '泽', nature: '喜悦' },
  '010': { name: '离', symbol: '☲', element: '火', nature: '光明' },
  '011': { name: '震', symbol: '☳', element: '雷', nature: '动' },
  '100': { name: '巽', symbol: '☴', element: '风', nature: '入' },
  '101': { name: '坎', symbol: '☵', element: '水', nature: '险' },
  '110': { name: '艮', symbol: '☶', element: '山', nature: '止' },
  '111': { name: '坤', symbol: '☷', element: '地', nature: '柔顺' }
};

// 获取卦名
const getBitsName = (bits) => TRIGRAMS[bits]?.name || '?';
const getBitsSymbol = (bits) => TRIGRAMS[bits]?.symbol || '?';

// 计算阳爻数量 (0的个数)
const countYangYao = (bits) => {
  let count = 0;
  for (const c of bits) {
    if (c === '0') count++;
  }
  return count;
};

// =============== 属性系统 ===============
// 根据用户设定，每个卦对应两个属性
const ATTRIBUTES = {
  '111': { // 坤 ☷
    id: 'kun',
    name: '坤',
    symbol: '☷',
    primary: { name: '生命值', key: 'hp' },
    secondary: { name: '恢复速度', key: 'hpRegen' },
    color: '#8B4513'
  },
  '000': { // 乾 ☰
    id: 'qian',
    name: '乾',
    symbol: '☰',
    primary: { name: '攻击力', key: 'attack' },
    secondary: { name: '暴击率', key: 'critRate' },
    color: '#FFD700'
  },
  '011': { // 震 ☳
    id: 'zhen',
    name: '震',
    symbol: '☳',
    primary: { name: '移动速度', key: 'moveSpeed' },
    secondary: { name: '闪避', key: 'dodge' },
    color: '#32CD32'
  },
  '100': { // 巽 ☴
    id: 'xun',
    name: '巽',
    symbol: '☴',
    primary: { name: '侦测范围', key: 'detectRange' },
    secondary: { name: '攻击范围', key: 'attackRange' },
    color: '#87CEEB'
  },
  '101': { // 坎 ☵
    id: 'kan',
    name: '坎',
    symbol: '☵',
    primary: { name: '法术利用率', key: 'spellEff' },
    secondary: { name: '法力值', key: 'mp' },
    color: '#4169E1'
  },
  '110': { // 艮 ☶
    id: 'gen',
    name: '艮',
    symbol: '☶',
    primary: { name: '物理防御', key: 'physDef' },
    secondary: { name: '魔法防御', key: 'magicDef' },
    color: '#A0522D'
  },
  '010': { // 离 ☲
    id: 'li',
    name: '离',
    symbol: '☲',
    primary: { name: '攻击速度', key: 'attackSpeed' },
    secondary: { name: '技能冷却', key: 'cooldown' },
    color: '#FF4500'
  },
  '001': { // 兑 ☱
    id: 'dui',
    name: '兑',
    symbol: '☱',
    primary: { name: '成长速度', key: 'growthRate' },
    secondary: { name: '幸运', key: 'luck' },
    color: '#FF69B4'
  }
};

// =============== 职业系统 ===============
const CLASSES = {
  dui: {
    id: 'dui',
    name: 'Caster',
    nameCN: '术士',
    trigram: '001',
    symbol: '☱',
    description: '精通法术，擅长远程魔法攻击',
    baseStats: {
      hp: 80, mp: 150, attack: 60, physDef: 30, magicDef: 50,
      moveSpeed: 90, attackSpeed: 80, critRate: 10, dodge: 15,
      luck: 20, growthRate: 15, spellEff: 120
    },
    weapon: 'staff',
    color: '#9932CC'
  },
  li: {
    id: 'li',
    name: 'Archer',
    nameCN: '弓手',
    trigram: '010',
    symbol: '☲',
    description: '精准远程攻击，高暴击高攻速',
    baseStats: {
      hp: 90, mp: 80, attack: 85, physDef: 35, magicDef: 35,
      moveSpeed: 105, attackSpeed: 120, critRate: 25, dodge: 20,
      luck: 12, growthRate: 10, spellEff: 60
    },
    weapon: 'bow',
    color: '#FF6347'
  },
  zhen: {
    id: 'zhen',
    name: 'Lancer',
    nameCN: '枪兵',
    trigram: '011',
    symbol: '☳',
    description: '迅捷如雷，高机动性近战',
    baseStats: {
      hp: 100, mp: 60, attack: 90, physDef: 45, magicDef: 30,
      moveSpeed: 130, attackSpeed: 100, critRate: 15, dodge: 30,
      luck: 8, growthRate: 10, spellEff: 40
    },
    weapon: 'lance',
    color: '#00FF7F'
  },
  xun: {
    id: 'xun',
    name: 'Saber',
    nameCN: '剑士',
    trigram: '100',
    symbol: '☴',
    description: '平衡型近战，攻防兼备',
    baseStats: {
      hp: 110, mp: 70, attack: 95, physDef: 50, magicDef: 40,
      moveSpeed: 100, attackSpeed: 95, critRate: 18, dodge: 18,
      luck: 10, growthRate: 10, spellEff: 50
    },
    weapon: 'sword',
    color: '#00CED1'
  },
  kan: {
    id: 'kan',
    name: 'Assassin',
    nameCN: '刺客',
    trigram: '101',
    symbol: '☵',
    description: '暗影杀手，高暴击高闪避',
    baseStats: {
      hp: 85, mp: 90, attack: 100, physDef: 30, magicDef: 35,
      moveSpeed: 125, attackSpeed: 110, critRate: 35, dodge: 35,
      luck: 15, growthRate: 8, spellEff: 70
    },
    weapon: 'dagger',
    color: '#483D8B'
  },
  gen: {
    id: 'gen',
    name: 'Rider',
    nameCN: '骑士',
    trigram: '110',
    symbol: '☶',
    description: '铁壁防御，坚不可摧',
    baseStats: {
      hp: 150, mp: 50, attack: 75, physDef: 80, magicDef: 60,
      moveSpeed: 85, attackSpeed: 75, critRate: 8, dodge: 5,
      luck: 8, growthRate: 8, spellEff: 30
    },
    weapon: 'shield',
    color: '#8B4513'
  },
  kun: {
    id: 'kun',
    name: 'Berserker',
    nameCN: '狂战士',
    trigram: '111',
    symbol: '☷',
    description: '狂暴战士，高生命高攻击',
    baseStats: {
      hp: 180, mp: 30, attack: 110, physDef: 40, magicDef: 25,
      moveSpeed: 95, attackSpeed: 85, critRate: 20, dodge: 8,
      luck: 5, growthRate: 12, spellEff: 20
    },
    weapon: 'axe',
    color: '#8B0000'
  }
};

// =============== 宫位系统 ===============
// 八宫 = 八种视角看同一个物体
const PALACES = {
  qian: { name: '乾宫', bits: '000', description: '本自具足，一切的源头', isOrigin: true },
  dui: { name: '兑宫', bits: '001', description: '喜悦之地' },
  li: { name: '离宫', bits: '010', description: '光明之境' },
  zhen: { name: '震宫', bits: '011', description: '雷动之域' },
  xun: { name: '巽宫', bits: '100', description: '风行之所' },
  kan: { name: '坎宫', bits: '101', description: '险水之渊' },
  gen: { name: '艮宫', bits: '110', description: '止山之巅' },
  kun: { name: '坤宫', bits: '111', description: '现实所处的位面', isReality: true }
};

// =============== 骰子系统 (博德之门/战锤40K风格) ===============
const DICE = {
  // D6 骰子事件映射
  d6Events: {
    1: { name: '大失败', type: 'critical_fail', modifier: -2 },
    2: { name: '失败', type: 'fail', modifier: -1 },
    3: { name: '勉强', type: 'barely', modifier: 0 },
    4: { name: '成功', type: 'success', modifier: 0 },
    5: { name: '良好', type: 'good', modifier: 1 },
    6: { name: '大成功', type: 'critical_success', modifier: 2 }
  },

  // 投骰子
  roll: (sides = 6) => Math.floor(Math.random() * sides) + 1,

  // 带修正的投骰
  rollWithModifier: (modifier = 0, sides = 6) => {
    const base = Math.floor(Math.random() * sides) + 1;
    return Math.max(1, Math.min(sides, base + modifier));
  }
};

// =============== 时空间系统 ===============
// 世界是正六边形时空间拼凑的莫比乌斯环
const SPACETIME = {
  // 天干
  heavenlyStems: ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'],
  // 地支
  earthlyBranches: ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'],

  // 生成时空间编号
  generateSpaceTimeId: () => {
    const stem = SPACETIME.heavenlyStems[Math.floor(Math.random() * 10)];
    const branch = SPACETIME.earthlyBranches[Math.floor(Math.random() * 12)];
    return stem + branch;
  }
};

// =============== 颜色定义 ===============
const COLORS = {
  // 爻的颜色
  YANG: '#E8E4D9',      // 阳爻 - 亮色（星光）
  YIN: '#2A2520',       // 阴爻 - 暗色
  YIN_LINE: 'rgba(42, 37, 32, 0.6)',  // 阴爻连线（只显示阴爻）

  // 星星颜色
  STAR_BRIGHT: '#FFFACD', // 明亮星星（阳）
  STAR_DIM: '#4A4540',    // 暗淡星星（阴）

  // 宫位颜色
  QIAN_PALACE: '#FFD700',  // 乾宫 - 金色
  KUN_PALACE: '#8B4513',   // 坤宫 - 土色

  // UI 颜色
  BG: '#0A0A12',           // 深空背景
  BG_GRADIENT_TOP: '#0F0F1A',
  BG_GRADIENT_BOTTOM: '#050508',
  HUD_BG: 'rgba(20, 20, 35, 0.85)',
  TEXT: '#E8E4D9',
  TEXT_DIM: 'rgba(232, 228, 217, 0.6)',
  ACCENT: '#FFD700',
  DANGER: '#FF4444',
  SUCCESS: '#44FF44',
  MANA: '#4488FF'
};

// =============== 游戏状态 ===============
const GAME_STATES = {
  TITLE: 'title',           // 标题画面
  MAIN_MENU: 'main_menu',   // 主菜单（立方体界面）
  CREATE_CHAR: 'create',    // 创建角色
  ADVENTURE: 'adventure',   // 冒险中
  BATTLE: 'battle',         // 战斗
  QIAN_PALACE: 'qian',      // 乾宫（系统/线上功能）
  PAUSE: 'pause',           // 暂停
  GAME_OVER: 'game_over'    // 游戏结束
};

// =============== 导出 ===============
module.exports = {
  TRIGRAMS,
  ATTRIBUTES,
  CLASSES,
  PALACES,
  DICE,
  SPACETIME,
  COLORS,
  GAME_STATES,
  getBitsName,
  getBitsSymbol,
  countYangYao
};
