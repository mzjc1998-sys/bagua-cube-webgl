/**
 * 实体基类
 * 玩家和敌人的共同基类
 */

import { EventBus, GameEvents } from '../core/EventBus';
import { Element } from '../card/Card';

/**
 * Buff/Debuff 类型
 */
export enum BuffType {
  // 增益
  STRENGTH = 'strength',           // 力量：增加攻击伤害
  DEXTERITY = 'dexterity',         // 敏捷：增加护甲值
  REGEN = 'regen',                 // 回复：回合开始恢复HP
  THORNS = 'thorns',               // 荆棘：受击时反伤
  ARTIFACT = 'artifact',           // 神器：抵消负面效果
  INTANGIBLE = 'intangible',       // 无实体：受到伤害降为1
  METALLICIZE = 'metallicize',     // 金属化：回合结束获得护甲
  PLATED_ARMOR = 'plated_armor',   // 板甲：回合结束获得护甲，受击减少

  // 减益
  WEAK = 'weak',                   // 虚弱：造成伤害-25%
  VULNERABLE = 'vulnerable',       // 易伤：受到伤害+50%
  FRAIL = 'frail',                 // 脆弱：获得护甲-25%
  POISON = 'poison',               // 中毒：回合开始受到伤害
  BURN = 'burn',                   // 灼烧：回合结束受到伤害
  SLOW = 'slow',                   // 迟缓：下回合少抽牌
  ENTANGLE = 'entangle',           // 缠绕：无法打攻击牌
  CONFUSED = 'confused',           // 混乱：卡牌费用随机
  CONSTRAINED = 'constrained',     // 束缚：无法获得力量

  // 五行相关
  METAL_AFFINITY = 'metal_affinity',
  WOOD_AFFINITY = 'wood_affinity',
  WATER_AFFINITY = 'water_affinity',
  FIRE_AFFINITY = 'fire_affinity',
  EARTH_AFFINITY = 'earth_affinity'
}

/**
 * Buff/Debuff 实例
 */
export interface BuffInstance {
  type: BuffType | string;
  value: number;
  duration?: number;  // undefined = 永久
  source?: string;    // 来源标识
}

/**
 * 伤害信息
 */
export interface DamageInfo {
  amount: number;
  source: Entity | null;
  element: Element;
  isThorns?: boolean;
  isPoison?: boolean;
  ignoreArmor?: boolean;
}

/**
 * 实体基类
 */
export abstract class Entity {
  // 基础属性
  public id: string;
  public name: string;

  // 生命值
  protected _hp: number;
  protected _maxHp: number;

  // 护甲
  protected _armor: number = 0;

  // Buff/Debuff列表
  protected buffs: Map<string, BuffInstance> = new Map();

  // 五行属性
  public element: Element = Element.NONE;

  constructor(id: string, name: string, maxHp: number) {
    this.id = id;
    this.name = name;
    this._maxHp = maxHp;
    this._hp = maxHp;
  }

  // Getters
  get hp(): number { return this._hp; }
  get maxHp(): number { return this._maxHp; }
  get armor(): number { return this._armor; }

  /**
   * 是否存活
   */
  isAlive(): boolean {
    return this._hp > 0;
  }

  /**
   * 获取力量值
   */
  get strength(): number {
    return this.getBuffValue(BuffType.STRENGTH);
  }

  /**
   * 获取敏捷值
   */
  get dexterity(): number {
    return this.getBuffValue(BuffType.DEXTERITY);
  }

  /**
   * 受到伤害
   */
  takeDamage(amount: number, source: Entity | null = null, element: Element = Element.NONE): number {
    const damageInfo: DamageInfo = { amount, source, element };
    return this.processDamage(damageInfo);
  }

  /**
   * 处理伤害
   */
  protected processDamage(damageInfo: DamageInfo): number {
    let damage = damageInfo.amount;

    // 应用易伤
    if (this.hasBuff(BuffType.VULNERABLE)) {
      damage = Math.floor(damage * 1.5);
    }

    // 应用无实体
    if (this.hasBuff(BuffType.INTANGIBLE)) {
      damage = 1;
    }

    // 五行相克
    if (damageInfo.element !== Element.NONE && this.element !== Element.NONE) {
      const multiplier = this.getElementMultiplier(damageInfo.element, this.element);
      damage = Math.floor(damage * multiplier);
    }

    // 护甲减伤
    if (!damageInfo.ignoreArmor && this._armor > 0) {
      if (this._armor >= damage) {
        this._armor -= damage;
        EventBus.emit(GameEvents.ARMOR_LOST, { entity: this, amount: damage });
        damage = 0;
      } else {
        damage -= this._armor;
        EventBus.emit(GameEvents.ARMOR_LOST, { entity: this, amount: this._armor });
        this._armor = 0;
      }
    }

    // 扣血
    if (damage > 0) {
      this._hp = Math.max(0, this._hp - damage);

      EventBus.emit(GameEvents.DAMAGE_TAKEN, {
        entity: this,
        amount: damage,
        source: damageInfo.source,
        element: damageInfo.element
      });

      // 荆棘反伤
      if (damageInfo.source && !damageInfo.isThorns && this.hasBuff(BuffType.THORNS)) {
        const thornsValue = this.getBuffValue(BuffType.THORNS);
        damageInfo.source.takeDamage(thornsValue, this, Element.NONE);
      }

      // 板甲减少
      if (this.hasBuff(BuffType.PLATED_ARMOR)) {
        this.decrementBuff(BuffType.PLATED_ARMOR, 1);
      }

      // 检查死亡
      if (this._hp <= 0) {
        this.onDeath();
      }
    }

    return damage;
  }

  /**
   * 获取五行相克倍率
   */
  private getElementMultiplier(attackElement: Element, defenseElement: Element): number {
    const overcomeMap: Record<Element, Element> = {
      [Element.METAL]: Element.WOOD,
      [Element.WOOD]: Element.EARTH,
      [Element.EARTH]: Element.WATER,
      [Element.WATER]: Element.FIRE,
      [Element.FIRE]: Element.METAL,
      [Element.NONE]: Element.NONE
    };

    if (overcomeMap[attackElement] === defenseElement) {
      return 1.5; // 克制
    }
    if (overcomeMap[defenseElement] === attackElement) {
      return 0.75; // 被克制
    }
    return 1.0;
  }

  /**
   * 治疗
   */
  heal(amount: number): number {
    const actualHeal = Math.min(amount, this._maxHp - this._hp);
    this._hp += actualHeal;

    if (actualHeal > 0) {
      EventBus.emit(GameEvents.HEAL, {
        entity: this,
        amount: actualHeal
      });
    }

    return actualHeal;
  }

  /**
   * 获得护甲
   */
  gainArmor(amount: number): void {
    // 脆弱减少护甲
    if (this.hasBuff(BuffType.FRAIL)) {
      amount = Math.floor(amount * 0.75);
    }

    this._armor += amount;

    EventBus.emit(GameEvents.ARMOR_GAINED, {
      entity: this,
      amount
    });
  }

  /**
   * 设置护甲
   */
  setArmor(amount: number): void {
    this._armor = Math.max(0, amount);
  }

  /**
   * 应用Buff
   */
  applyBuff(type: BuffType | string, value: number, duration?: number): void {
    const key = type.toString();

    if (this.buffs.has(key)) {
      // 叠加
      const existing = this.buffs.get(key)!;
      existing.value += value;
      if (duration !== undefined) {
        existing.duration = Math.max(existing.duration || 0, duration);
      }
      EventBus.emit(GameEvents.BUFF_STACKED, { entity: this, type, value: existing.value });
    } else {
      // 新增
      this.buffs.set(key, { type, value, duration });
      EventBus.emit(GameEvents.BUFF_APPLIED, { entity: this, type, value, duration });
    }
  }

  /**
   * 应用Debuff
   */
  applyDebuff(type: BuffType | string, value: number, duration?: number): void {
    // 检查神器抵消
    if (this.hasBuff(BuffType.ARTIFACT)) {
      this.decrementBuff(BuffType.ARTIFACT, 1);
      return;
    }

    this.applyBuff(type, value, duration);
    EventBus.emit(GameEvents.DEBUFF_APPLIED, { entity: this, type, value, duration });
  }

  /**
   * 移除Buff
   */
  removeBuff(type: BuffType | string): void {
    const key = type.toString();
    if (this.buffs.has(key)) {
      this.buffs.delete(key);
      EventBus.emit(GameEvents.BUFF_REMOVED, { entity: this, type });
    }
  }

  /**
   * 减少Buff数值
   */
  decrementBuff(type: BuffType | string, amount: number = 1): void {
    const key = type.toString();
    const buff = this.buffs.get(key);
    if (buff) {
      buff.value -= amount;
      if (buff.value <= 0) {
        this.removeBuff(type);
      }
    }
  }

  /**
   * 检查是否有Buff
   */
  hasBuff(type: BuffType | string): boolean {
    return this.buffs.has(type.toString());
  }

  /**
   * 获取Buff值
   */
  getBuffValue(type: BuffType | string): number {
    const buff = this.buffs.get(type.toString());
    return buff?.value || 0;
  }

  /**
   * 获取所有Buff
   */
  getAllBuffs(): BuffInstance[] {
    return Array.from(this.buffs.values());
  }

  /**
   * 回合开始处理
   */
  onTurnStart(): void {
    // 回复
    if (this.hasBuff(BuffType.REGEN)) {
      this.heal(this.getBuffValue(BuffType.REGEN));
    }

    // 中毒
    if (this.hasBuff(BuffType.POISON)) {
      const poisonDamage = this.getBuffValue(BuffType.POISON);
      this.takeDamage(poisonDamage, null, Element.NONE);
      this.decrementBuff(BuffType.POISON, 1);
    }
  }

  /**
   * 回合结束处理
   */
  onTurnEnd(): void {
    // 灼烧
    if (this.hasBuff(BuffType.BURN)) {
      const burnDamage = this.getBuffValue(BuffType.BURN);
      this.takeDamage(burnDamage, null, Element.FIRE);
      this.decrementBuff(BuffType.BURN, 1);
    }

    // 金属化
    if (this.hasBuff(BuffType.METALLICIZE)) {
      this.gainArmor(this.getBuffValue(BuffType.METALLICIZE));
    }

    // 板甲
    if (this.hasBuff(BuffType.PLATED_ARMOR)) {
      this.gainArmor(this.getBuffValue(BuffType.PLATED_ARMOR));
    }

    // 减少回合制Buff的持续时间
    this.tickBuffDurations();
  }

  /**
   * Buff持续时间流逝
   */
  protected tickBuffDurations(): void {
    const toRemove: string[] = [];

    this.buffs.forEach((buff, key) => {
      if (buff.duration !== undefined) {
        buff.duration--;
        if (buff.duration <= 0) {
          toRemove.push(key);
        }
      }
    });

    toRemove.forEach(key => {
      this.removeBuff(key);
    });
  }

  /**
   * 战斗开始时重置
   */
  onBattleStart(): void {
    this._armor = 0;
    // 清除非永久Buff
    this.clearTemporaryBuffs();
  }

  /**
   * 清除临时Buff
   */
  protected clearTemporaryBuffs(): void {
    const toRemove: string[] = [];

    this.buffs.forEach((buff, key) => {
      // 虚弱、易伤、脆弱等持续时间Buff需要保留处理
      // 力量、敏捷等能力Buff需要保留
      if (buff.duration !== undefined) {
        // 有持续时间的Buff可能需要清除
      }
    });

    toRemove.forEach(key => this.removeBuff(key));
  }

  /**
   * 死亡处理
   */
  protected abstract onDeath(): void;

  /**
   * 修改力量
   */
  modifyStrength(amount: number): void {
    if (amount > 0) {
      this.applyBuff(BuffType.STRENGTH, amount);
    } else if (amount < 0) {
      this.decrementBuff(BuffType.STRENGTH, -amount);
    }
  }

  /**
   * 修改敏捷
   */
  modifyDexterity(amount: number): void {
    if (amount > 0) {
      this.applyBuff(BuffType.DEXTERITY, amount);
    } else if (amount < 0) {
      this.decrementBuff(BuffType.DEXTERITY, -amount);
    }
  }

  /**
   * 序列化
   */
  serialize(): object {
    return {
      id: this.id,
      name: this.name,
      hp: this._hp,
      maxHp: this._maxHp,
      armor: this._armor,
      element: this.element,
      buffs: Array.from(this.buffs.entries())
    };
  }
}

export default Entity;
