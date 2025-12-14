/**
 * 卡牌基类
 * 定义卡牌的基本属性和行为
 */

import { EventBus, GameEvents } from '../core/EventBus';
import { Player } from '../entity/Player';
import { Enemy } from '../entity/Enemy';
import { Entity } from '../entity/Entity';

/**
 * 卡牌类型
 */
export enum CardType {
  ATTACK = 'attack',    // 攻击牌
  SKILL = 'skill',      // 技能牌
  POWER = 'power',      // 能力牌（永久效果）
  STATUS = 'status',    // 状态牌（负面）
  CURSE = 'curse'       // 诅咒牌（极负面）
}

/**
 * 卡牌稀有度
 */
export enum CardRarity {
  STARTER = 'starter',      // 初始卡
  COMMON = 'common',        // 普通
  UNCOMMON = 'uncommon',    // 稀有
  RARE = 'rare',            // 史诗
  LEGENDARY = 'legendary',  // 传说
  SPECIAL = 'special'       // 特殊（不可获得）
}

/**
 * 五行元素
 */
export enum Element {
  NONE = 'none',      // 无属性
  METAL = 'metal',    // 金
  WOOD = 'wood',      // 木
  WATER = 'water',    // 水
  FIRE = 'fire',      // 火
  EARTH = 'earth'     // 土
}

/**
 * 卡牌目标类型
 */
export enum TargetType {
  NONE = 'none',              // 无目标
  SELF = 'self',              // 自己
  SINGLE_ENEMY = 'single',    // 单个敌人
  ALL_ENEMIES = 'all',        // 所有敌人
  RANDOM_ENEMY = 'random'     // 随机敌人
}

/**
 * 卡牌效果接口
 */
export interface CardEffect {
  type: string;
  value: number;
  valueUpgraded?: number;
  target?: TargetType;
  condition?: string;
  duration?: number;
}

/**
 * 卡牌数据接口
 */
export interface CardData {
  id: string;
  name: string;
  nameUpgraded?: string;
  description: string;
  descriptionUpgraded?: string;
  type: CardType;
  rarity: CardRarity;
  cost: number;
  costUpgraded?: number;
  element: Element;
  targetType: TargetType;
  exhaust: boolean;
  ethereal?: boolean;     // 回合结束时消耗
  innate?: boolean;       // 战斗开始时在手牌
  retain?: boolean;       // 回合结束时保留
  effects: CardEffect[];
}

/**
 * 卡牌类
 */
export class Card {
  // 唯一实例ID
  public readonly uuid: string;

  // 基础属性
  public readonly id: string;
  public name: string;
  public description: string;
  public type: CardType;
  public rarity: CardRarity;
  public cost: number;
  public element: Element;
  public targetType: TargetType;

  // 特殊属性
  public exhaust: boolean;
  public ethereal: boolean;
  public innate: boolean;
  public retain: boolean;

  // 效果
  public effects: CardEffect[];

  // 升级状态
  public upgraded: boolean = false;

  // 原始数据（用于重置）
  private originalData: CardData;

  // 临时修改（战斗中）
  public tempCostModifier: number = 0;

  constructor(data: CardData) {
    this.uuid = this.generateUUID();
    this.originalData = { ...data };

    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.type = data.type;
    this.rarity = data.rarity;
    this.cost = data.cost;
    this.element = data.element;
    this.targetType = data.targetType;
    this.exhaust = data.exhaust;
    this.ethereal = data.ethereal || false;
    this.innate = data.innate || false;
    this.retain = data.retain || false;
    this.effects = [...data.effects];
  }

  /**
   * 生成UUID
   */
  private generateUUID(): string {
    return 'card_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 获取实际费用（包含修改器）
   */
  get actualCost(): number {
    return Math.max(0, this.cost + this.tempCostModifier);
  }

  /**
   * 是否可以打出
   */
  canPlay(player: Player): boolean {
    // 检查能量
    if (player.energy < this.actualCost) return false;

    // 检查是否需要目标
    if (this.targetType === TargetType.SINGLE_ENEMY) {
      // 需要有活着的敌人
      // 这个检查应该在BattleManager中进行
    }

    // 诅咒和状态牌通常不能打出
    if (this.type === CardType.CURSE || this.type === CardType.STATUS) {
      // 除非有特殊效果允许
      return this.hasPlayableEffect();
    }

    return true;
  }

  /**
   * 检查是否有可打出效果
   */
  private hasPlayableEffect(): boolean {
    return this.effects.some(e => e.type === 'playable');
  }

  /**
   * 打出卡牌
   */
  play(owner: Player, target: Entity | null, allEnemies: Enemy[]): void {
    // 执行所有效果
    for (const effect of this.effects) {
      this.executeEffect(effect, owner, target, allEnemies);
    }

    // 发送事件
    EventBus.emit(GameEvents.CARD_PLAYED, {
      card: this,
      owner,
      target
    });
  }

  /**
   * 执行单个效果
   */
  protected executeEffect(
    effect: CardEffect,
    owner: Player,
    target: Entity | null,
    allEnemies: Enemy[]
  ): void {
    const value = this.getEffectValue(effect);

    switch (effect.type) {
      case 'damage':
        this.executeDamage(value, owner, target, allEnemies, effect.target);
        break;

      case 'armor':
      case 'block':
        owner.gainArmor(value + owner.dexterity);
        break;

      case 'heal':
        owner.heal(value);
        break;

      case 'draw':
        // 通过BattleManager抽牌
        EventBus.emit('request_draw_cards', { count: value });
        break;

      case 'energy':
        owner.gainEnergy(value);
        break;

      case 'buff':
        owner.applyBuff(effect.condition!, value, effect.duration);
        break;

      case 'debuff':
        this.applyDebuffToTarget(effect.condition!, value, target, allEnemies, effect.target, effect.duration);
        break;

      case 'damage_per_energy':
        // 消耗所有能量造成伤害
        const energyDamage = value * owner.energy;
        owner.energy = 0;
        this.executeDamage(energyDamage, owner, target, allEnemies, effect.target);
        break;

      case 'strength':
        owner.modifyStrength(value);
        break;

      case 'dexterity':
        owner.modifyDexterity(value);
        break;

      // 更多效果类型...
    }
  }

  /**
   * 获取效果值
   */
  private getEffectValue(effect: CardEffect): number {
    if (this.upgraded && effect.valueUpgraded !== undefined) {
      return effect.valueUpgraded;
    }
    return effect.value;
  }

  /**
   * 执行伤害
   */
  private executeDamage(
    baseDamage: number,
    owner: Player,
    target: Entity | null,
    allEnemies: Enemy[],
    targetType?: TargetType
  ): void {
    const damage = baseDamage + owner.strength;

    switch (targetType || this.targetType) {
      case TargetType.SINGLE_ENEMY:
        if (target) {
          target.takeDamage(damage, owner, this.element);
        }
        break;

      case TargetType.ALL_ENEMIES:
        for (const enemy of allEnemies) {
          if (enemy.isAlive()) {
            enemy.takeDamage(damage, owner, this.element);
          }
        }
        break;

      case TargetType.RANDOM_ENEMY:
        const aliveEnemies = allEnemies.filter(e => e.isAlive());
        if (aliveEnemies.length > 0) {
          const randomEnemy = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          randomEnemy.takeDamage(damage, owner, this.element);
        }
        break;
    }
  }

  /**
   * 对目标施加减益
   */
  private applyDebuffToTarget(
    debuffType: string,
    value: number,
    target: Entity | null,
    allEnemies: Enemy[],
    targetType?: TargetType,
    duration?: number
  ): void {
    const applyTo = (entity: Entity) => {
      entity.applyDebuff(debuffType, value, duration);
    };

    switch (targetType || this.targetType) {
      case TargetType.SINGLE_ENEMY:
        if (target) applyTo(target);
        break;

      case TargetType.ALL_ENEMIES:
        allEnemies.filter(e => e.isAlive()).forEach(applyTo);
        break;

      case TargetType.RANDOM_ENEMY:
        const aliveEnemies = allEnemies.filter(e => e.isAlive());
        if (aliveEnemies.length > 0) {
          const randomEnemy = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          applyTo(randomEnemy);
        }
        break;
    }
  }

  /**
   * 升级卡牌
   */
  upgrade(): boolean {
    if (this.upgraded) return false;
    if (this.type === CardType.CURSE || this.type === CardType.STATUS) return false;

    this.upgraded = true;

    // 更新名称
    if (this.originalData.nameUpgraded) {
      this.name = this.originalData.nameUpgraded;
    } else {
      this.name = this.name + '+';
    }

    // 更新描述
    if (this.originalData.descriptionUpgraded) {
      this.description = this.originalData.descriptionUpgraded;
    }

    // 更新费用
    if (this.originalData.costUpgraded !== undefined) {
      this.cost = this.originalData.costUpgraded;
    }

    EventBus.emit(GameEvents.CARD_UPGRADED, { card: this });

    return true;
  }

  /**
   * 获取显示用描述（替换变量）
   */
  getDisplayDescription(owner?: Player): string {
    let desc = this.description;

    // 计算实际伤害值
    for (const effect of this.effects) {
      const value = this.getEffectValue(effect);
      let displayValue = value;

      // 加入力量加成
      if (effect.type === 'damage' && owner) {
        displayValue = value + owner.strength;
      }
      // 加入敏捷加成
      if ((effect.type === 'armor' || effect.type === 'block') && owner) {
        displayValue = value + owner.dexterity;
      }

      desc = desc.replace(`{${effect.type}}`, displayValue.toString());
      desc = desc.replace('{value}', displayValue.toString());
    }

    return desc;
  }

  /**
   * 重置临时修改
   */
  resetTempModifiers(): void {
    this.tempCostModifier = 0;
  }

  /**
   * 克隆卡牌
   */
  clone(): Card {
    const cloned = new Card(this.originalData);
    if (this.upgraded) {
      cloned.upgrade();
    }
    return cloned;
  }

  /**
   * 序列化
   */
  serialize(): object {
    return {
      id: this.id,
      upgraded: this.upgraded
    };
  }

  /**
   * 获取五行相克伤害倍率
   */
  static getElementMultiplier(attackElement: Element, defenseElement: Element): number {
    // 相克关系：金克木、木克土、土克水、水克火、火克金
    const overcomeMap: Record<Element, Element> = {
      [Element.METAL]: Element.WOOD,
      [Element.WOOD]: Element.EARTH,
      [Element.EARTH]: Element.WATER,
      [Element.WATER]: Element.FIRE,
      [Element.FIRE]: Element.METAL,
      [Element.NONE]: Element.NONE
    };

    if (attackElement === Element.NONE || defenseElement === Element.NONE) {
      return 1.0;
    }

    if (overcomeMap[attackElement] === defenseElement) {
      return 1.5; // 克制，伤害+50%
    }

    if (overcomeMap[defenseElement] === attackElement) {
      return 0.75; // 被克制，伤害-25%
    }

    return 1.0;
  }
}

export default Card;
