/**
 * 角色数据配置
 * 定义所有可玩角色
 */

/**
 * 角色数据接口
 */
export interface CharacterData {
  id: string;
  name: string;
  title: string;
  description: string;
  startingHp: number;
  startingEnergy: number;
  startingDeck: string[];
  startingRelic?: string;
  color: string;
  unlockCondition?: {
    type: 'default' | 'floor' | 'cards' | 'wins' | 'achievement';
    value?: number;
    achievementId?: string;
  };
}

/**
 * 角色数据库
 */
export const CHARACTERS: Record<string, CharacterData> = {

  swordsman: {
    id: 'swordsman',
    name: '剑客',
    title: '青锋剑士',
    description: '擅长连续攻击，造成大量伤害。连续打出攻击牌可获得额外伤害加成。',
    startingHp: 80,
    startingEnergy: 3,
    startingDeck: [
      'strike', 'strike', 'strike', 'strike', 'strike',
      'defend', 'defend', 'defend', 'defend',
      'double_strike'
    ],
    startingRelic: 'green_sword',
    color: '#4a9eff',
    unlockCondition: {
      type: 'default'
    }
  },

  taoist: {
    id: 'taoist',
    name: '道士',
    title: '太极真人',
    description: '精通五行之术，可以改变卡牌属性，利用五行相克造成额外伤害。',
    startingHp: 75,
    startingEnergy: 3,
    startingDeck: [
      'strike', 'strike', 'strike', 'strike',
      'defend', 'defend', 'defend', 'defend',
      'metal_qi', 'water_qi'
    ],
    startingRelic: 'bagua_mirror',
    color: '#9b59b6',
    unlockCondition: {
      type: 'floor',
      value: 2
    }
  },

  sorcerer: {
    id: 'sorcerer',
    name: '术士',
    title: '符咒大师',
    description: '擅长诅咒和控制，可以让敌人随机获得诅咒牌，削弱敌人。',
    startingHp: 70,
    startingEnergy: 3,
    startingDeck: [
      'strike', 'strike', 'strike', 'strike',
      'defend', 'defend', 'defend', 'defend',
      'battle_cry', 'meditation'
    ],
    startingRelic: 'talisman_bag',
    color: '#27ae60',
    unlockCondition: {
      type: 'cards',
      value: 50
    }
  },

  monk: {
    id: 'monk',
    name: '武僧',
    title: '少林弟子',
    description: '防御大师，擅长积累护甲。不出牌时可以额外获得护甲。',
    startingHp: 85,
    startingEnergy: 3,
    startingDeck: [
      'strike', 'strike', 'strike', 'strike',
      'defend', 'defend', 'defend', 'defend', 'defend',
      'shroud'
    ],
    startingRelic: 'prayer_beads',
    color: '#f39c12',
    unlockCondition: {
      type: 'achievement',
      achievementId: 'armor_1000'
    }
  }
};

/**
 * 获取已解锁的角色
 */
export function getUnlockedCharacters(metaProgress: any): CharacterData[] {
  return Object.values(CHARACTERS).filter(char => {
    if (!char.unlockCondition || char.unlockCondition.type === 'default') {
      return true;
    }

    switch (char.unlockCondition.type) {
      case 'floor':
        return metaProgress.highestFloor >= char.unlockCondition.value!;
      case 'cards':
        return metaProgress.cardsCollected >= char.unlockCondition.value!;
      case 'wins':
        return metaProgress.victories >= char.unlockCondition.value!;
      case 'achievement':
        return metaProgress.achievements?.includes(char.unlockCondition.achievementId);
      default:
        return false;
    }
  });
}

/**
 * 检查角色是否已解锁
 */
export function isCharacterUnlocked(characterId: string, metaProgress: any): boolean {
  const char = CHARACTERS[characterId];
  if (!char) return false;

  if (!char.unlockCondition || char.unlockCondition.type === 'default') {
    return true;
  }

  switch (char.unlockCondition.type) {
    case 'floor':
      return metaProgress.highestFloor >= char.unlockCondition.value!;
    case 'cards':
      return metaProgress.cardsCollected >= char.unlockCondition.value!;
    case 'wins':
      return metaProgress.victories >= char.unlockCondition.value!;
    case 'achievement':
      return metaProgress.achievements?.includes(char.unlockCondition.achievementId);
    default:
      return false;
  }
}

export default CHARACTERS;
