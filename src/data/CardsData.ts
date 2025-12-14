/**
 * 卡牌数据配置
 * 包含所有游戏中的卡牌定义
 */

import {
  CardData,
  CardType,
  CardRarity,
  Element,
  TargetType
} from '../card/Card';

/**
 * 卡牌数据库
 */
export const CARDS_DATA: Record<string, CardData> = {

  // ==================== 基础卡 ====================

  strike: {
    id: 'strike',
    name: '横劈',
    nameUpgraded: '横劈+',
    description: '造成 {damage} 点伤害',
    descriptionUpgraded: '造成 {damage} 点伤害',
    type: CardType.ATTACK,
    rarity: CardRarity.STARTER,
    cost: 1,
    element: Element.NONE,
    targetType: TargetType.SINGLE_ENEMY,
    exhaust: false,
    effects: [
      { type: 'damage', value: 6, valueUpgraded: 9, target: TargetType.SINGLE_ENEMY }
    ]
  },

  defend: {
    id: 'defend',
    name: '格挡',
    nameUpgraded: '格挡+',
    description: '获得 {armor} 点护甲',
    type: CardType.SKILL,
    rarity: CardRarity.STARTER,
    cost: 1,
    element: Element.NONE,
    targetType: TargetType.SELF,
    exhaust: false,
    effects: [
      { type: 'armor', value: 5, valueUpgraded: 8 }
    ]
  },

  // ==================== 普通攻击卡 ====================

  double_strike: {
    id: 'double_strike',
    name: '连斩',
    nameUpgraded: '连斩+',
    description: '造成 {damage} 点伤害两次',
    type: CardType.ATTACK,
    rarity: CardRarity.COMMON,
    cost: 1,
    element: Element.METAL,
    targetType: TargetType.SINGLE_ENEMY,
    exhaust: false,
    effects: [
      { type: 'damage', value: 4, valueUpgraded: 6, target: TargetType.SINGLE_ENEMY },
      { type: 'damage', value: 4, valueUpgraded: 6, target: TargetType.SINGLE_ENEMY }
    ]
  },

  heavy_blow: {
    id: 'heavy_blow',
    name: '重击',
    nameUpgraded: '重击+',
    description: '造成 {damage} 点伤害',
    type: CardType.ATTACK,
    rarity: CardRarity.COMMON,
    cost: 2,
    element: Element.EARTH,
    targetType: TargetType.SINGLE_ENEMY,
    exhaust: false,
    effects: [
      { type: 'damage', value: 14, valueUpgraded: 18, target: TargetType.SINGLE_ENEMY }
    ]
  },

  cleave: {
    id: 'cleave',
    name: '横扫',
    nameUpgraded: '横扫+',
    description: '对所有敌人造成 {damage} 点伤害',
    type: CardType.ATTACK,
    rarity: CardRarity.COMMON,
    cost: 1,
    element: Element.METAL,
    targetType: TargetType.ALL_ENEMIES,
    exhaust: false,
    effects: [
      { type: 'damage', value: 8, valueUpgraded: 11, target: TargetType.ALL_ENEMIES }
    ]
  },

  quick_slash: {
    id: 'quick_slash',
    name: '疾风剑',
    nameUpgraded: '疾风剑+',
    description: '造成 {damage} 点伤害，抽1张牌',
    type: CardType.ATTACK,
    rarity: CardRarity.COMMON,
    cost: 1,
    element: Element.WOOD,
    targetType: TargetType.SINGLE_ENEMY,
    exhaust: false,
    effects: [
      { type: 'damage', value: 5, valueUpgraded: 8, target: TargetType.SINGLE_ENEMY },
      { type: 'draw', value: 1 }
    ]
  },

  // ==================== 普通技能卡 ====================

  shroud: {
    id: 'shroud',
    name: '金钟罩',
    nameUpgraded: '金钟罩+',
    description: '获得 {armor} 点护甲',
    type: CardType.SKILL,
    rarity: CardRarity.COMMON,
    cost: 2,
    element: Element.METAL,
    targetType: TargetType.SELF,
    exhaust: false,
    effects: [
      { type: 'armor', value: 12, valueUpgraded: 16 }
    ]
  },

  meditation: {
    id: 'meditation',
    name: '冥想',
    nameUpgraded: '冥想+',
    description: '获得 2 点能量',
    type: CardType.SKILL,
    rarity: CardRarity.COMMON,
    cost: 0,
    element: Element.WATER,
    targetType: TargetType.SELF,
    exhaust: true,
    effects: [
      { type: 'energy', value: 2, valueUpgraded: 3 }
    ]
  },

  battle_cry: {
    id: 'battle_cry',
    name: '战吼',
    nameUpgraded: '战吼+',
    description: '所有敌人获得 1 层易伤',
    type: CardType.SKILL,
    rarity: CardRarity.COMMON,
    cost: 0,
    element: Element.FIRE,
    targetType: TargetType.ALL_ENEMIES,
    exhaust: false,
    effects: [
      { type: 'debuff', condition: 'vulnerable', value: 1, valueUpgraded: 2, target: TargetType.ALL_ENEMIES }
    ]
  },

  // ==================== 稀有攻击卡 ====================

  whirlwind: {
    id: 'whirlwind',
    name: '旋风斩',
    nameUpgraded: '旋风斩+',
    description: '消耗所有能量。对所有敌人造成 {damage} x 能量点伤害',
    type: CardType.ATTACK,
    rarity: CardRarity.UNCOMMON,
    cost: -1, // X费用
    element: Element.WOOD,
    targetType: TargetType.ALL_ENEMIES,
    exhaust: false,
    effects: [
      { type: 'damage_per_energy', value: 5, valueUpgraded: 8, target: TargetType.ALL_ENEMIES }
    ]
  },

  flame_burst: {
    id: 'flame_burst',
    name: '烈焰爆',
    nameUpgraded: '烈焰爆+',
    description: '造成 {damage} 点伤害，使敌人获得 2 层灼烧',
    type: CardType.ATTACK,
    rarity: CardRarity.UNCOMMON,
    cost: 2,
    element: Element.FIRE,
    targetType: TargetType.SINGLE_ENEMY,
    exhaust: false,
    effects: [
      { type: 'damage', value: 10, valueUpgraded: 14, target: TargetType.SINGLE_ENEMY },
      { type: 'debuff', condition: 'burn', value: 2, valueUpgraded: 3, target: TargetType.SINGLE_ENEMY }
    ]
  },

  armor_break: {
    id: 'armor_break',
    name: '破甲',
    nameUpgraded: '破甲+',
    description: '造成 {damage} 点伤害，使敌人获得 2 层脆弱',
    type: CardType.ATTACK,
    rarity: CardRarity.UNCOMMON,
    cost: 1,
    element: Element.METAL,
    targetType: TargetType.SINGLE_ENEMY,
    exhaust: false,
    effects: [
      { type: 'damage', value: 6, valueUpgraded: 9, target: TargetType.SINGLE_ENEMY },
      { type: 'debuff', condition: 'frail', value: 2, valueUpgraded: 3, target: TargetType.SINGLE_ENEMY }
    ]
  },

  water_jet: {
    id: 'water_jet',
    name: '水流击',
    nameUpgraded: '水流击+',
    description: '造成 {damage} 点伤害，若敌人有减益，伤害翻倍',
    type: CardType.ATTACK,
    rarity: CardRarity.UNCOMMON,
    cost: 1,
    element: Element.WATER,
    targetType: TargetType.SINGLE_ENEMY,
    exhaust: false,
    effects: [
      { type: 'damage', value: 7, valueUpgraded: 10, target: TargetType.SINGLE_ENEMY, condition: 'double_if_debuffed' }
    ]
  },

  // ==================== 稀有技能卡 ====================

  iron_wave: {
    id: 'iron_wave',
    name: '铁浪',
    nameUpgraded: '铁浪+',
    description: '获得 {armor} 点护甲，造成 {damage} 点伤害',
    type: CardType.SKILL,
    rarity: CardRarity.UNCOMMON,
    cost: 1,
    element: Element.METAL,
    targetType: TargetType.SINGLE_ENEMY,
    exhaust: false,
    effects: [
      { type: 'armor', value: 5, valueUpgraded: 7 },
      { type: 'damage', value: 5, valueUpgraded: 7, target: TargetType.SINGLE_ENEMY }
    ]
  },

  focus: {
    id: 'focus',
    name: '聚神',
    nameUpgraded: '聚神+',
    description: '抽 2 张牌',
    type: CardType.SKILL,
    rarity: CardRarity.UNCOMMON,
    cost: 1,
    costUpgraded: 0,
    element: Element.WATER,
    targetType: TargetType.SELF,
    exhaust: false,
    effects: [
      { type: 'draw', value: 2, valueUpgraded: 3 }
    ]
  },

  // ==================== 能力卡 ====================

  power_stance: {
    id: 'power_stance',
    name: '蓄力姿态',
    nameUpgraded: '蓄力姿态+',
    description: '获得 2 点力量',
    type: CardType.POWER,
    rarity: CardRarity.UNCOMMON,
    cost: 1,
    element: Element.FIRE,
    targetType: TargetType.SELF,
    exhaust: false,
    effects: [
      { type: 'strength', value: 2, valueUpgraded: 3 }
    ]
  },

  demon_form: {
    id: 'demon_form',
    name: '恶魔形态',
    nameUpgraded: '恶魔形态+',
    description: '每回合开始获得 2 点力量',
    type: CardType.POWER,
    rarity: CardRarity.RARE,
    cost: 3,
    element: Element.FIRE,
    targetType: TargetType.SELF,
    exhaust: false,
    effects: [
      { type: 'buff', condition: 'demon_form', value: 2, valueUpgraded: 3 }
    ]
  },

  metallicize: {
    id: 'metallicize',
    name: '金身',
    nameUpgraded: '金身+',
    description: '每回合结束获得 3 点护甲',
    type: CardType.POWER,
    rarity: CardRarity.UNCOMMON,
    cost: 1,
    element: Element.METAL,
    targetType: TargetType.SELF,
    exhaust: false,
    effects: [
      { type: 'buff', condition: 'metallicize', value: 3, valueUpgraded: 4 }
    ]
  },

  // ==================== 史诗卡 ====================

  execute: {
    id: 'execute',
    name: '斩杀',
    nameUpgraded: '斩杀+',
    description: '造成 {damage} 点伤害。若敌人生命值低于50%，伤害翻倍',
    type: CardType.ATTACK,
    rarity: CardRarity.RARE,
    cost: 2,
    element: Element.METAL,
    targetType: TargetType.SINGLE_ENEMY,
    exhaust: false,
    effects: [
      { type: 'damage', value: 12, valueUpgraded: 16, target: TargetType.SINGLE_ENEMY, condition: 'execute' }
    ]
  },

  offering: {
    id: 'offering',
    name: '献祭',
    nameUpgraded: '献祭+',
    description: '失去 6 点生命，获得 2 点能量，抽 3 张牌',
    type: CardType.SKILL,
    rarity: CardRarity.RARE,
    cost: 0,
    element: Element.FIRE,
    targetType: TargetType.SELF,
    exhaust: true,
    effects: [
      { type: 'self_damage', value: 6 },
      { type: 'energy', value: 2 },
      { type: 'draw', value: 3, valueUpgraded: 5 }
    ]
  },

  barricade: {
    id: 'barricade',
    name: '壁垒',
    nameUpgraded: '壁垒+',
    description: '护甲不再在回合开始时消失',
    type: CardType.POWER,
    rarity: CardRarity.RARE,
    cost: 3,
    costUpgraded: 2,
    element: Element.EARTH,
    targetType: TargetType.SELF,
    exhaust: false,
    effects: [
      { type: 'buff', condition: 'barricade', value: 1 }
    ]
  },

  // ==================== 五行特殊卡 ====================

  metal_qi: {
    id: 'metal_qi',
    name: '金之气',
    nameUpgraded: '金之气+',
    description: '获得 1 层金属性亲和。造成 {damage} 点金属性伤害',
    type: CardType.ATTACK,
    rarity: CardRarity.UNCOMMON,
    cost: 1,
    element: Element.METAL,
    targetType: TargetType.SINGLE_ENEMY,
    exhaust: false,
    effects: [
      { type: 'buff', condition: 'metal_affinity', value: 1 },
      { type: 'damage', value: 8, valueUpgraded: 12, target: TargetType.SINGLE_ENEMY }
    ]
  },

  wood_qi: {
    id: 'wood_qi',
    name: '木之气',
    nameUpgraded: '木之气+',
    description: '获得 1 层木属性亲和。恢复 {heal} 点生命',
    type: CardType.SKILL,
    rarity: CardRarity.UNCOMMON,
    cost: 1,
    element: Element.WOOD,
    targetType: TargetType.SELF,
    exhaust: false,
    effects: [
      { type: 'buff', condition: 'wood_affinity', value: 1 },
      { type: 'heal', value: 6, valueUpgraded: 10 }
    ]
  },

  water_qi: {
    id: 'water_qi',
    name: '水之气',
    nameUpgraded: '水之气+',
    description: '获得 1 层水属性亲和。抽 2 张牌',
    type: CardType.SKILL,
    rarity: CardRarity.UNCOMMON,
    cost: 1,
    element: Element.WATER,
    targetType: TargetType.SELF,
    exhaust: false,
    effects: [
      { type: 'buff', condition: 'water_affinity', value: 1 },
      { type: 'draw', value: 2, valueUpgraded: 3 }
    ]
  },

  fire_qi: {
    id: 'fire_qi',
    name: '火之气',
    nameUpgraded: '火之气+',
    description: '获得 1 层火属性亲和。获得 1 点力量',
    type: CardType.SKILL,
    rarity: CardRarity.UNCOMMON,
    cost: 1,
    element: Element.FIRE,
    targetType: TargetType.SELF,
    exhaust: false,
    effects: [
      { type: 'buff', condition: 'fire_affinity', value: 1 },
      { type: 'strength', value: 1, valueUpgraded: 2 }
    ]
  },

  earth_qi: {
    id: 'earth_qi',
    name: '土之气',
    nameUpgraded: '土之气+',
    description: '获得 1 层土属性亲和。获得 {armor} 点护甲',
    type: CardType.SKILL,
    rarity: CardRarity.UNCOMMON,
    cost: 1,
    element: Element.EARTH,
    targetType: TargetType.SELF,
    exhaust: false,
    effects: [
      { type: 'buff', condition: 'earth_affinity', value: 1 },
      { type: 'armor', value: 8, valueUpgraded: 12 }
    ]
  },

  // ==================== 诅咒牌 ====================

  curse_pain: {
    id: 'curse_pain',
    name: '痛苦',
    description: '不可打出。回合结束时受到 1 点伤害',
    type: CardType.CURSE,
    rarity: CardRarity.SPECIAL,
    cost: -2, // 不可打出
    element: Element.NONE,
    targetType: TargetType.NONE,
    exhaust: false,
    ethereal: true,
    effects: []
  },

  curse_decay: {
    id: 'curse_decay',
    name: '衰败',
    description: '不可打出。抽到此牌时受到 1 点伤害',
    type: CardType.CURSE,
    rarity: CardRarity.SPECIAL,
    cost: -2,
    element: Element.NONE,
    targetType: TargetType.NONE,
    exhaust: false,
    effects: []
  },

  // ==================== 状态牌 ====================

  wound: {
    id: 'wound',
    name: '创伤',
    description: '不可打出',
    type: CardType.STATUS,
    rarity: CardRarity.SPECIAL,
    cost: -2,
    element: Element.NONE,
    targetType: TargetType.NONE,
    exhaust: false,
    effects: []
  },

  dazed: {
    id: 'dazed',
    name: '眩晕',
    description: '不可打出。虚无',
    type: CardType.STATUS,
    rarity: CardRarity.SPECIAL,
    cost: -2,
    element: Element.NONE,
    targetType: TargetType.NONE,
    exhaust: false,
    ethereal: true,
    effects: []
  },

  burn: {
    id: 'burn',
    name: '灼伤',
    description: '不可打出。回合结束时受到 2 点伤害',
    type: CardType.STATUS,
    rarity: CardRarity.SPECIAL,
    cost: -2,
    element: Element.FIRE,
    targetType: TargetType.NONE,
    exhaust: false,
    effects: []
  }
};

/**
 * 按稀有度获取卡牌
 */
export function getCardsByRarity(rarity: CardRarity): CardData[] {
  return Object.values(CARDS_DATA).filter(c => c.rarity === rarity);
}

/**
 * 按类型获取卡牌
 */
export function getCardsByType(type: CardType): CardData[] {
  return Object.values(CARDS_DATA).filter(c => c.type === type);
}

/**
 * 按元素获取卡牌
 */
export function getCardsByElement(element: Element): CardData[] {
  return Object.values(CARDS_DATA).filter(c => c.element === element);
}

/**
 * 获取可获得的卡牌（排除诅咒和状态）
 */
export function getObtainableCards(): CardData[] {
  return Object.values(CARDS_DATA).filter(c =>
    c.rarity !== CardRarity.SPECIAL &&
    c.type !== CardType.CURSE &&
    c.type !== CardType.STATUS
  );
}

export default CARDS_DATA;
