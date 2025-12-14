/**
 * 敌人数据配置
 * 包含所有敌人的定义
 */

import { Element } from '../card/Card';
import { EnemyData, IntentType } from '../entity/Enemy';

/**
 * 敌人数据库
 */
export const ENEMIES_DATA: Record<string, EnemyData> = {

  // ==================== 第一层：土牢 ====================

  slime: {
    id: 'slime',
    name: '史莱姆',
    hpMin: 12,
    hpMax: 18,
    element: Element.WATER,
    actions: [
      { type: IntentType.ATTACK, value: 5, weight: 70 },
      { type: IntentType.DEFEND, value: 4, weight: 30 }
    ]
  },

  skeleton: {
    id: 'skeleton',
    name: '骷髅兵',
    hpMin: 25,
    hpMax: 32,
    element: Element.EARTH,
    patterns: [IntentType.ATTACK, IntentType.ATTACK, IntentType.DEFEND],
    actions: [
      { type: IntentType.ATTACK, value: 8, weight: 50 },
      { type: IntentType.DEFEND, value: 6, weight: 50 }
    ]
  },

  goblin: {
    id: 'goblin',
    name: '哥布林',
    hpMin: 15,
    hpMax: 20,
    element: Element.EARTH,
    actions: [
      { type: IntentType.ATTACK, value: 4, weight: 60 },
      { type: IntentType.ATTACK_BUFF, value: 3, secondaryValue: 1, buffType: 'strength', weight: 40 }
    ]
  },

  mud_golem: {
    id: 'mud_golem',
    name: '泥巨人',
    hpMin: 40,
    hpMax: 50,
    element: Element.EARTH,
    isElite: true,
    actions: [
      { type: IntentType.ATTACK, value: 12, weight: 40 },
      { type: IntentType.DEFEND, value: 10, weight: 30 },
      { type: IntentType.ATTACK_DEFEND, value: 8, secondaryValue: 8, weight: 30 }
    ]
  },

  // 第一层BOSS
  earth_titan: {
    id: 'earth_titan',
    name: '土行傀儡',
    hpMin: 150,
    hpMax: 180,
    element: Element.EARTH,
    isBoss: true,
    actions: [
      { type: IntentType.ATTACK, value: 14, weight: 35 },
      { type: IntentType.DEFEND, value: 15, weight: 25 },
      { type: IntentType.BUFF, value: 2, buffType: 'strength', weight: 20 },
      { type: IntentType.ATTACK, value: 6, weight: 20, times: 3 }
    ]
  },

  // ==================== 第二层：水狱 ====================

  water_sprite: {
    id: 'water_sprite',
    name: '水精灵',
    hpMin: 20,
    hpMax: 28,
    element: Element.WATER,
    actions: [
      { type: IntentType.ATTACK, value: 6, weight: 50 },
      { type: IntentType.DEBUFF, value: 1, debuffType: 'weak', weight: 30 },
      { type: IntentType.HEAL, value: 5, weight: 20 }
    ]
  },

  kraken_spawn: {
    id: 'kraken_spawn',
    name: '海怪幼崽',
    hpMin: 30,
    hpMax: 38,
    element: Element.WATER,
    patterns: [IntentType.ATTACK, IntentType.ATTACK, IntentType.BUFF, IntentType.ATTACK],
    actions: [
      { type: IntentType.ATTACK, value: 9, weight: 50 },
      { type: IntentType.BUFF, value: 2, buffType: 'strength', weight: 50 }
    ]
  },

  deep_one: {
    id: 'deep_one',
    name: '深海异形',
    hpMin: 50,
    hpMax: 65,
    element: Element.WATER,
    isElite: true,
    actions: [
      { type: IntentType.ATTACK, value: 15, weight: 35 },
      { type: IntentType.DEBUFF, value: 2, debuffType: 'frail', weight: 25 },
      { type: IntentType.ATTACK_DEBUFF, value: 10, debuffType: 'weak', weight: 40 }
    ]
  },

  // 第二层BOSS
  abyssal_lord: {
    id: 'abyssal_lord',
    name: '玄冥蛟龙',
    hpMin: 200,
    hpMax: 240,
    element: Element.WATER,
    isBoss: true,
    actions: [
      { type: IntentType.ATTACK, value: 18, weight: 30 },
      { type: IntentType.DEBUFF, value: 2, debuffType: 'vulnerable', weight: 20 },
      { type: IntentType.ATTACK, value: 8, weight: 25, times: 3 },
      { type: IntentType.HEAL, value: 15, weight: 15 },
      { type: IntentType.BUFF, value: 3, buffType: 'strength', weight: 10 }
    ]
  },

  // ==================== 第三层：火窟 ====================

  fire_imp: {
    id: 'fire_imp',
    name: '火焰小鬼',
    hpMin: 22,
    hpMax: 30,
    element: Element.FIRE,
    actions: [
      { type: IntentType.ATTACK, value: 7, weight: 60 },
      { type: IntentType.DEBUFF, value: 2, debuffType: 'burn', weight: 40 }
    ]
  },

  lava_hound: {
    id: 'lava_hound',
    name: '熔岩犬',
    hpMin: 35,
    hpMax: 45,
    element: Element.FIRE,
    patterns: [IntentType.ATTACK, IntentType.ATTACK, IntentType.ATTACK_BUFF],
    actions: [
      { type: IntentType.ATTACK, value: 10, weight: 50 },
      { type: IntentType.ATTACK_BUFF, value: 7, secondaryValue: 2, buffType: 'strength', weight: 50 }
    ]
  },

  flame_wizard: {
    id: 'flame_wizard',
    name: '火焰法师',
    hpMin: 55,
    hpMax: 70,
    element: Element.FIRE,
    isElite: true,
    actions: [
      { type: IntentType.ATTACK, value: 5, weight: 30, times: 4 },
      { type: IntentType.DEBUFF, value: 3, debuffType: 'burn', weight: 30 },
      { type: IntentType.BUFF, value: 3, buffType: 'strength', weight: 20 },
      { type: IntentType.ATTACK, value: 20, weight: 20 }
    ]
  },

  // 第三层BOSS
  phoenix: {
    id: 'phoenix',
    name: '赤炎凤凰',
    hpMin: 250,
    hpMax: 300,
    element: Element.FIRE,
    isBoss: true,
    actions: [
      { type: IntentType.ATTACK, value: 22, weight: 25 },
      { type: IntentType.ATTACK, value: 10, weight: 25, times: 3 },
      { type: IntentType.DEBUFF, value: 4, debuffType: 'burn', weight: 20 },
      { type: IntentType.BUFF, value: 2, buffType: 'strength', weight: 15 },
      { type: IntentType.HEAL, value: 20, weight: 15 }
    ]
  },

  // ==================== 第四层：金殿 ====================

  bronze_automaton: {
    id: 'bronze_automaton',
    name: '青铜傀儡',
    hpMin: 40,
    hpMax: 50,
    element: Element.METAL,
    patterns: [IntentType.DEFEND, IntentType.ATTACK, IntentType.ATTACK],
    actions: [
      { type: IntentType.ATTACK, value: 12, weight: 50 },
      { type: IntentType.DEFEND, value: 10, weight: 50 }
    ]
  },

  steel_warrior: {
    id: 'steel_warrior',
    name: '钢铁战士',
    hpMin: 50,
    hpMax: 60,
    element: Element.METAL,
    actions: [
      { type: IntentType.ATTACK, value: 14, weight: 50 },
      { type: IntentType.DEFEND, value: 12, weight: 30 },
      { type: IntentType.ATTACK_DEFEND, value: 10, secondaryValue: 8, weight: 20 }
    ]
  },

  gold_guardian: {
    id: 'gold_guardian',
    name: '金甲守卫',
    hpMin: 70,
    hpMax: 85,
    element: Element.METAL,
    isElite: true,
    actions: [
      { type: IntentType.ATTACK, value: 18, weight: 35 },
      { type: IntentType.DEFEND, value: 20, weight: 30 },
      { type: IntentType.BUFF, value: 3, buffType: 'metallicize', weight: 20 },
      { type: IntentType.ATTACK_DEFEND, value: 12, secondaryValue: 12, weight: 15 }
    ]
  },

  // 第四层BOSS
  metal_titan: {
    id: 'metal_titan',
    name: '金甲战神',
    hpMin: 300,
    hpMax: 350,
    element: Element.METAL,
    isBoss: true,
    actions: [
      { type: IntentType.ATTACK, value: 25, weight: 25 },
      { type: IntentType.DEFEND, value: 25, weight: 20 },
      { type: IntentType.ATTACK, value: 12, weight: 20, times: 3 },
      { type: IntentType.BUFF, value: 5, buffType: 'metallicize', weight: 15 },
      { type: IntentType.ATTACK_DEFEND, value: 15, secondaryValue: 15, weight: 20 }
    ]
  },

  // ==================== 第五层：木林 ====================

  forest_sprite: {
    id: 'forest_sprite',
    name: '森林精灵',
    hpMin: 35,
    hpMax: 45,
    element: Element.WOOD,
    actions: [
      { type: IntentType.ATTACK, value: 8, weight: 40 },
      { type: IntentType.HEAL, value: 8, weight: 30 },
      { type: IntentType.BUFF, value: 2, buffType: 'regen', weight: 30 }
    ]
  },

  vine_beast: {
    id: 'vine_beast',
    name: '藤蔓兽',
    hpMin: 50,
    hpMax: 65,
    element: Element.WOOD,
    actions: [
      { type: IntentType.ATTACK, value: 12, weight: 40 },
      { type: IntentType.DEBUFF, value: 2, debuffType: 'entangle', weight: 30 },
      { type: IntentType.ATTACK, value: 6, weight: 30, times: 3 }
    ]
  },

  ancient_treant: {
    id: 'ancient_treant',
    name: '远古树人',
    hpMin: 80,
    hpMax: 100,
    element: Element.WOOD,
    isElite: true,
    actions: [
      { type: IntentType.ATTACK, value: 16, weight: 30 },
      { type: IntentType.BUFF, value: 5, buffType: 'thorns', weight: 25 },
      { type: IntentType.HEAL, value: 15, weight: 25 },
      { type: IntentType.SUMMON, weight: 20, buffType: 'forest_sprite' }
    ]
  },

  // 第五层BOSS
  wood_demon: {
    id: 'wood_demon',
    name: '青木妖藤',
    hpMin: 350,
    hpMax: 400,
    element: Element.WOOD,
    isBoss: true,
    actions: [
      { type: IntentType.ATTACK, value: 20, weight: 25 },
      { type: IntentType.DEBUFF, value: 3, debuffType: 'entangle', weight: 15 },
      { type: IntentType.BUFF, value: 8, buffType: 'thorns', weight: 20 },
      { type: IntentType.HEAL, value: 25, weight: 15 },
      { type: IntentType.SUMMON, weight: 15, buffType: 'vine_beast' },
      { type: IntentType.ATTACK, value: 10, weight: 10, times: 4 }
    ]
  },

  // ==================== 第六层：混沌界（最终BOSS）====================

  chaos_spawn: {
    id: 'chaos_spawn',
    name: '混沌之子',
    hpMin: 60,
    hpMax: 80,
    element: Element.NONE,
    actions: [
      { type: IntentType.ATTACK, value: 15, weight: 40 },
      { type: IntentType.DEBUFF, value: 2, debuffType: 'vulnerable', weight: 30 },
      { type: IntentType.DEBUFF, value: 2, debuffType: 'weak', weight: 30 }
    ]
  },

  // 最终BOSS
  taiji_beast: {
    id: 'taiji_beast',
    name: '太极阴阳兽',
    hpMin: 500,
    hpMax: 600,
    element: Element.NONE,
    isBoss: true,
    actions: [
      { type: IntentType.ATTACK, value: 30, weight: 20 },
      { type: IntentType.ATTACK, value: 15, weight: 20, times: 3 },
      { type: IntentType.DEBUFF, value: 3, debuffType: 'vulnerable', weight: 15 },
      { type: IntentType.DEBUFF, value: 3, debuffType: 'weak', weight: 15 },
      { type: IntentType.BUFF, value: 5, buffType: 'strength', weight: 10 },
      { type: IntentType.HEAL, value: 30, weight: 10 },
      { type: IntentType.DEFEND, value: 30, weight: 10 }
    ]
  }
};

/**
 * 获取某层的普通敌人
 */
export function getFloorEnemies(floor: number): EnemyData[] {
  const floorEnemies: Record<number, string[]> = {
    1: ['slime', 'skeleton', 'goblin'],
    2: ['water_sprite', 'kraken_spawn'],
    3: ['fire_imp', 'lava_hound'],
    4: ['bronze_automaton', 'steel_warrior'],
    5: ['forest_sprite', 'vine_beast'],
    6: ['chaos_spawn']
  };

  const enemyIds = floorEnemies[floor] || [];
  return enemyIds.map(id => ENEMIES_DATA[id]).filter(Boolean);
}

/**
 * 获取某层的精英敌人
 */
export function getFloorElites(floor: number): EnemyData[] {
  const floorElites: Record<number, string[]> = {
    1: ['mud_golem'],
    2: ['deep_one'],
    3: ['flame_wizard'],
    4: ['gold_guardian'],
    5: ['ancient_treant'],
    6: []
  };

  const enemyIds = floorElites[floor] || [];
  return enemyIds.map(id => ENEMIES_DATA[id]).filter(Boolean);
}

/**
 * 获取某层的BOSS
 */
export function getFloorBoss(floor: number): EnemyData | null {
  const floorBosses: Record<number, string> = {
    1: 'earth_titan',
    2: 'abyssal_lord',
    3: 'phoenix',
    4: 'metal_titan',
    5: 'wood_demon',
    6: 'taiji_beast'
  };

  const bossId = floorBosses[floor];
  return bossId ? ENEMIES_DATA[bossId] : null;
}

export default ENEMIES_DATA;
