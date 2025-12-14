/**
 * Meta进度管理器
 * 管理永久解锁、成就和货币
 */

import { EventBus, GameEvents } from './EventBus';

/**
 * 成就数据
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
  progress?: number;
  maxProgress?: number;
}

/**
 * Meta进度数据
 */
export interface MetaProgressData {
  // 货币
  crystal: number;      // 玄晶
  baguaShards: number;  // 八卦碎片

  // 统计
  runsCompleted: number;
  victories: number;
  totalDeaths: number;
  highestFloor: number;
  cardsCollected: number;
  relicsCollected: number;
  enemiesKilled: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalHealing: number;
  totalGoldEarned: number;
  totalArmorGained: number;

  // 解锁
  unlockedCharacters: string[];
  unlockedCards: string[];
  unlockedRelics: string[];

  // 成就
  achievements: string[];

  // 时间戳
  firstPlayTime: number;
  lastPlayTime: number;
  totalPlayTime: number;
}

/**
 * 成就定义
 */
const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_win',
    name: '初出茅庐',
    description: '首次通关地牢',
    icon: 'trophy',
    unlocked: false
  },
  {
    id: 'floor_3',
    name: '深入虎穴',
    description: '到达第3层',
    icon: 'stairs',
    unlocked: false
  },
  {
    id: 'floor_6',
    name: '地牢征服者',
    description: '到达第6层',
    icon: 'crown',
    unlocked: false
  },
  {
    id: 'no_damage',
    name: '毫发无伤',
    description: '在一场战斗中不受任何伤害',
    icon: 'shield',
    unlocked: false
  },
  {
    id: 'speed_run',
    name: '疾风迅雷',
    description: '在15分钟内通关',
    icon: 'lightning',
    unlocked: false
  },
  {
    id: 'armor_1000',
    name: '铜墙铁壁',
    description: '累计获得1000点护甲',
    icon: 'wall',
    unlocked: false,
    progress: 0,
    maxProgress: 1000
  },
  {
    id: 'damage_10000',
    name: '战神降临',
    description: '累计造成10000点伤害',
    icon: 'sword',
    unlocked: false,
    progress: 0,
    maxProgress: 10000
  },
  {
    id: 'cards_50',
    name: '收藏家',
    description: '收集50种不同的卡牌',
    icon: 'cards',
    unlocked: false,
    progress: 0,
    maxProgress: 50
  },
  {
    id: 'runs_10',
    name: '坚持不懈',
    description: '完成10次游戏',
    icon: 'repeat',
    unlocked: false,
    progress: 0,
    maxProgress: 10
  },
  {
    id: 'boss_rush',
    name: 'BOSS猎人',
    description: '击败所有BOSS',
    icon: 'skull',
    unlocked: false
  }
];

const STORAGE_KEY = 'dungeon_roguelike_meta';

/**
 * Meta进度管理器
 */
export class MetaProgress {
  private data: MetaProgressData;

  constructor() {
    this.data = this.getDefaultData();
  }

  /**
   * 获取默认数据
   */
  private getDefaultData(): MetaProgressData {
    return {
      crystal: 0,
      baguaShards: 0,
      runsCompleted: 0,
      victories: 0,
      totalDeaths: 0,
      highestFloor: 0,
      cardsCollected: 0,
      relicsCollected: 0,
      enemiesKilled: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      totalHealing: 0,
      totalGoldEarned: 0,
      totalArmorGained: 0,
      unlockedCharacters: ['swordsman'], // 默认解锁剑客
      unlockedCards: [],
      unlockedRelics: [],
      achievements: [],
      firstPlayTime: Date.now(),
      lastPlayTime: Date.now(),
      totalPlayTime: 0
    };
  }

  /**
   * 加载进度
   */
  async load(): Promise<void> {
    try {
      let json: string | null = null;

      if (typeof wx !== 'undefined') {
        json = wx.getStorageSync(STORAGE_KEY);
      } else if (typeof localStorage !== 'undefined') {
        json = localStorage.getItem(STORAGE_KEY);
      }

      if (json) {
        const loaded = JSON.parse(json);
        this.data = { ...this.getDefaultData(), ...loaded };
      }
    } catch (e) {
      console.error('加载Meta进度失败:', e);
    }

    this.data.lastPlayTime = Date.now();
  }

  /**
   * 保存进度
   */
  save(): void {
    try {
      const json = JSON.stringify(this.data);

      if (typeof wx !== 'undefined') {
        wx.setStorageSync(STORAGE_KEY, json);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, json);
      }
    } catch (e) {
      console.error('保存Meta进度失败:', e);
    }
  }

  // ==================== 货币操作 ====================

  /**
   * 添加货币
   */
  addCurrency(type: 'crystal' | 'baguaShards', amount: number): void {
    this.data[type] += amount;
    this.save();
  }

  /**
   * 消费货币
   */
  spendCurrency(type: 'crystal' | 'baguaShards', amount: number): boolean {
    if (this.data[type] < amount) return false;
    this.data[type] -= amount;
    this.save();
    return true;
  }

  /**
   * 获取货币数量
   */
  getCurrency(type: 'crystal' | 'baguaShards'): number {
    return this.data[type];
  }

  // ==================== 统计操作 ====================

  /**
   * 增加统计
   */
  incrementStat(stat: keyof MetaProgressData, amount: number = 1): void {
    if (typeof this.data[stat] === 'number') {
      (this.data[stat] as number) += amount;
      this.checkStatAchievements(stat);
    }
  }

  /**
   * 设置统计（取最大值）
   */
  setStatMax(stat: keyof MetaProgressData, value: number): void {
    if (typeof this.data[stat] === 'number') {
      (this.data[stat] as number) = Math.max(this.data[stat] as number, value);
    }
  }

  /**
   * 获取统计
   */
  getStat(stat: keyof MetaProgressData): number {
    const value = this.data[stat];
    return typeof value === 'number' ? value : 0;
  }

  // ==================== 解锁操作 ====================

  /**
   * 解锁角色
   */
  unlockCharacter(characterId: string): boolean {
    if (this.data.unlockedCharacters.includes(characterId)) return false;
    this.data.unlockedCharacters.push(characterId);
    this.save();
    EventBus.emit(GameEvents.CHARACTER_UNLOCKED, { characterId });
    return true;
  }

  /**
   * 检查角色是否已解锁
   */
  isCharacterUnlocked(characterId: string): boolean {
    return this.data.unlockedCharacters.includes(characterId);
  }

  /**
   * 解锁卡牌
   */
  unlockCard(cardId: string): boolean {
    if (this.data.unlockedCards.includes(cardId)) return false;
    this.data.unlockedCards.push(cardId);
    this.data.cardsCollected = this.data.unlockedCards.length;
    this.save();
    EventBus.emit(GameEvents.CARD_UNLOCKED, { cardId });
    return true;
  }

  /**
   * 解锁遗物
   */
  unlockRelic(relicId: string): boolean {
    if (this.data.unlockedRelics.includes(relicId)) return false;
    this.data.unlockedRelics.push(relicId);
    this.data.relicsCollected = this.data.unlockedRelics.length;
    this.save();
    return true;
  }

  // ==================== 成就系统 ====================

  /**
   * 检查并解锁成就
   */
  checkUnlocks(): void {
    // 检查通关相关
    if (this.data.victories >= 1) {
      this.unlockAchievement('first_win');
    }

    // 检查楼层相关
    if (this.data.highestFloor >= 3) {
      this.unlockAchievement('floor_3');
    }
    if (this.data.highestFloor >= 6) {
      this.unlockAchievement('floor_6');
    }

    // 检查游戏次数
    if (this.data.runsCompleted >= 10) {
      this.unlockAchievement('runs_10');
    }

    // 检查角色解锁条件
    if (this.data.highestFloor >= 2) {
      this.unlockCharacter('taoist');
    }
    if (this.data.cardsCollected >= 50) {
      this.unlockCharacter('sorcerer');
    }
  }

  /**
   * 检查统计相关成就
   */
  private checkStatAchievements(stat: keyof MetaProgressData): void {
    if (stat === 'totalArmorGained' && this.data.totalArmorGained >= 1000) {
      this.unlockAchievement('armor_1000');
      this.unlockCharacter('monk');
    }
    if (stat === 'totalDamageDealt' && this.data.totalDamageDealt >= 10000) {
      this.unlockAchievement('damage_10000');
    }
  }

  /**
   * 解锁成就
   */
  unlockAchievement(achievementId: string): boolean {
    if (this.data.achievements.includes(achievementId)) return false;
    this.data.achievements.push(achievementId);
    this.save();
    EventBus.emit(GameEvents.ACHIEVEMENT_UNLOCKED, { achievementId });
    return true;
  }

  /**
   * 检查成就是否已解锁
   */
  isAchievementUnlocked(achievementId: string): boolean {
    return this.data.achievements.includes(achievementId);
  }

  /**
   * 获取所有成就状态
   */
  getAllAchievements(): Achievement[] {
    return ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: this.data.achievements.includes(a.id)
    }));
  }

  // ==================== 数据访问 ====================

  /**
   * 获取完整数据
   */
  getData(): MetaProgressData {
    return { ...this.data };
  }

  /**
   * 重置进度（慎用）
   */
  reset(): void {
    this.data = this.getDefaultData();
    this.save();
  }
}

export default MetaProgress;
