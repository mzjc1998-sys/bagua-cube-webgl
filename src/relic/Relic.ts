/**
 * 遗物基类
 * 遗物是提供被动效果的装备
 */

import { EventBus, GameEvents } from '../core/EventBus';
import { Player } from '../entity/Player';
import { Entity } from '../entity/Entity';
import { Card } from '../card/Card';

/**
 * 遗物稀有度
 */
export enum RelicRarity {
  STARTER = 'starter',    // 初始遗物
  COMMON = 'common',      // 普通
  UNCOMMON = 'uncommon',  // 稀有
  RARE = 'rare',          // 史诗
  BOSS = 'boss',          // BOSS遗物
  EVENT = 'event',        // 事件遗物
  SHOP = 'shop'           // 商店遗物
}

/**
 * 遗物数据接口
 */
export interface RelicData {
  id: string;
  name: string;
  description: string;
  rarity: RelicRarity;
  flavorText?: string;
  counter?: number;  // 计数器（某些遗物需要）
}

/**
 * 遗物基类
 */
export class Relic {
  public readonly id: string;
  public name: string;
  public description: string;
  public rarity: RelicRarity;
  public flavorText: string;

  // 计数器（如"每打出5张牌触发"）
  protected counter: number = 0;
  protected maxCounter: number = 0;

  // 是否激活
  protected active: boolean = true;

  constructor(data: RelicData) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.rarity = data.rarity;
    this.flavorText = data.flavorText || '';
    if (data.counter) {
      this.maxCounter = data.counter;
    }
  }

  /**
   * 获得遗物时触发
   */
  onObtain(player: Player): void {
    // 子类可覆盖
  }

  /**
   * 战斗开始时触发
   */
  onBattleStart(player: Player): void {
    // 子类可覆盖
  }

  /**
   * 战斗结束时触发
   */
  onBattleEnd(player: Player, victory: boolean): void {
    // 子类可覆盖
  }

  /**
   * 回合开始时触发
   */
  onTurnStart(player: Player): void {
    // 子类可覆盖
  }

  /**
   * 回合结束时触发
   */
  onTurnEnd(player: Player): void {
    // 子类可覆盖
  }

  /**
   * 打出卡牌时触发
   */
  onCardPlayed(player: Player, card: Card): void {
    // 子类可覆盖
  }

  /**
   * 受到伤害时触发
   */
  onDamageTaken(player: Player, damage: number): void {
    // 子类可覆盖
  }

  /**
   * 获得护甲时触发
   */
  onArmorGained(player: Player, amount: number): void {
    // 子类可覆盖
  }

  /**
   * 击杀敌人时触发
   */
  onEnemyKilled(player: Player, enemy: Entity): void {
    // 子类可覆盖
  }

  /**
   * 进入房间时触发
   */
  onRoomEntered(player: Player, roomType: string): void {
    // 子类可覆盖
  }

  /**
   * 增加计数器
   */
  protected incrementCounter(player: Player): boolean {
    if (this.maxCounter <= 0) return false;

    this.counter++;
    if (this.counter >= this.maxCounter) {
      this.counter = 0;
      this.onCounterTriggered(player);
      return true;
    }
    return false;
  }

  /**
   * 计数器触发时
   */
  protected onCounterTriggered(player: Player): void {
    // 子类覆盖实现
    EventBus.emit(GameEvents.RELIC_TRIGGERED, { relic: this });
  }

  /**
   * 重置计数器
   */
  protected resetCounter(): void {
    this.counter = 0;
  }

  /**
   * 设置激活状态
   */
  setActive(active: boolean): void {
    this.active = active;
  }

  /**
   * 获取计数器进度（用于UI显示）
   */
  getCounterProgress(): { current: number; max: number } | null {
    if (this.maxCounter <= 0) return null;
    return { current: this.counter, max: this.maxCounter };
  }

  /**
   * 序列化
   */
  serialize(): object {
    return {
      id: this.id,
      counter: this.counter,
      active: this.active
    };
  }
}

// ==================== 具体遗物实现 ====================

/**
 * 青锋剑 - 剑客初始遗物
 * 攻击牌伤害+2
 */
export class GreenSword extends Relic {
  constructor() {
    super({
      id: 'green_sword',
      name: '青锋剑',
      description: '攻击牌造成的伤害+2',
      rarity: RelicRarity.STARTER,
      flavorText: '一把陪伴多年的青锋剑，剑刃依然锋利。'
    });
  }

  onCardPlayed(player: Player, card: Card): void {
    // 攻击伤害加成在Card的damage计算中处理
    // 这里可以触发视觉效果
  }
}

/**
 * 八卦镜 - 道士初始遗物
 * 每回合第一次受到伤害时，反弹10%伤害
 */
export class BaguaMirror extends Relic {
  private triggeredThisTurn: boolean = false;

  constructor() {
    super({
      id: 'bagua_mirror',
      name: '八卦镜',
      description: '每回合第一次受到伤害时，反弹10%伤害给攻击者',
      rarity: RelicRarity.STARTER,
      flavorText: '古老的八卦镜，蕴含着神秘的力量。'
    });
  }

  onTurnStart(player: Player): void {
    this.triggeredThisTurn = false;
  }

  onDamageTaken(player: Player, damage: number): void {
    if (!this.triggeredThisTurn && damage > 0) {
      this.triggeredThisTurn = true;
      const reflectDamage = Math.floor(damage * 0.1);
      // 反弹伤害的实现需要知道攻击者
      EventBus.emit(GameEvents.RELIC_TRIGGERED, {
        relic: this,
        effect: 'reflect',
        value: reflectDamage
      });
    }
  }
}

/**
 * 符咒袋 - 术士初始遗物
 * 每打出3张技能牌，抽1张牌
 */
export class TalismanBag extends Relic {
  constructor() {
    super({
      id: 'talisman_bag',
      name: '符咒袋',
      description: '每打出3张技能牌，抽1张牌',
      rarity: RelicRarity.STARTER,
      flavorText: '装满各种符咒的袋子，散发着淡淡的墨香。',
      counter: 3
    });
  }

  onCardPlayed(player: Player, card: Card): void {
    if (card.type === 'skill') {
      this.incrementCounter(player);
    }
  }

  protected onCounterTriggered(player: Player): void {
    super.onCounterTriggered(player);
    EventBus.emit('request_draw_cards', { count: 1 });
  }
}

/**
 * 念珠 - 武僧初始遗物
 * 每回合结束时获得3点护甲
 */
export class PrayerBeads extends Relic {
  constructor() {
    super({
      id: 'prayer_beads',
      name: '念珠',
      description: '每回合结束时获得3点护甲',
      rarity: RelicRarity.STARTER,
      flavorText: '虔诚的念珠，每一颗都承载着祈祷。'
    });
  }

  onTurnEnd(player: Player): void {
    player.gainArmor(3);
    EventBus.emit(GameEvents.RELIC_TRIGGERED, { relic: this });
  }
}

/**
 * 血玉 - 普通遗物
 * 战斗结束后恢复5点生命
 */
export class BloodJade extends Relic {
  constructor() {
    super({
      id: 'blood_jade',
      name: '血玉',
      description: '战斗胜利后恢复5点生命',
      rarity: RelicRarity.COMMON,
      flavorText: '血红色的玉石，温暖而神秘。'
    });
  }

  onBattleEnd(player: Player, victory: boolean): void {
    if (victory) {
      player.heal(5);
      EventBus.emit(GameEvents.RELIC_TRIGGERED, { relic: this });
    }
  }
}

/**
 * 金刚印 - 稀有遗物
 * 战斗开始时获得2点力量
 */
export class VajraSeal extends Relic {
  constructor() {
    super({
      id: 'vajra_seal',
      name: '金刚印',
      description: '战斗开始时获得2点力量',
      rarity: RelicRarity.UNCOMMON,
      flavorText: '金刚不坏之印，赋予持有者无穷力量。'
    });
  }

  onBattleStart(player: Player): void {
    player.modifyStrength(2);
    EventBus.emit(GameEvents.RELIC_TRIGGERED, { relic: this });
  }
}

/**
 * 遗物注册表
 */
export const RELICS: Record<string, new () => Relic> = {
  green_sword: GreenSword,
  bagua_mirror: BaguaMirror,
  talisman_bag: TalismanBag,
  prayer_beads: PrayerBeads,
  blood_jade: BloodJade,
  vajra_seal: VajraSeal
};

/**
 * 创建遗物实例
 */
export function createRelic(relicId: string): Relic | null {
  const RelicClass = RELICS[relicId];
  if (!RelicClass) {
    console.warn(`Unknown relic: ${relicId}`);
    return null;
  }
  return new RelicClass();
}

export default Relic;
