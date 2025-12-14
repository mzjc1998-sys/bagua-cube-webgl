/**
 * 敌人类
 * 继承自Entity，包含敌人特有的属性和AI行为
 */

import { Entity, BuffType } from './Entity';
import { EventBus, GameEvents } from '../core/EventBus';
import { Element } from '../card/Card';
import { Player } from './Player';

/**
 * 敌人意图类型
 */
export enum IntentType {
  ATTACK = 'attack',
  DEFEND = 'defend',
  BUFF = 'buff',
  DEBUFF = 'debuff',
  ATTACK_DEFEND = 'attack_defend',
  ATTACK_BUFF = 'attack_buff',
  SUMMON = 'summon',
  HEAL = 'heal',
  UNKNOWN = 'unknown',
  SLEEPING = 'sleeping',
  ESCAPE = 'escape'
}

/**
 * 敌人意图
 */
export interface EnemyIntent {
  type: IntentType;
  value?: number;
  secondaryValue?: number;
  buffType?: string;
  debuffType?: string;
  description?: string;
  icon?: string;
  times?: number;  // 多段攻击次数
}

/**
 * 敌人行动模式
 */
export interface EnemyAction {
  type: IntentType;
  value: number;
  secondaryValue?: number;
  weight: number;
  buffType?: string;
  debuffType?: string;
  times?: number;
  condition?: (enemy: Enemy, player: Player) => boolean;
}

/**
 * 敌人数据接口
 */
export interface EnemyData {
  id: string;
  name: string;
  hpMin: number;
  hpMax: number;
  element: Element;
  actions: EnemyAction[];
  patterns?: IntentType[];  // 固定行动模式
  isBoss?: boolean;
  isElite?: boolean;
}

/**
 * 敌人类
 */
export class Enemy extends Entity {
  // 敌人类型标识
  public enemyType: string;
  public isBoss: boolean = false;
  public isElite: boolean = false;

  // 行动模式
  private actions: EnemyAction[] = [];
  private patterns: IntentType[] | null = null;
  private patternIndex: number = 0;
  private lastAction: IntentType | null = null;

  // 当前意图
  private currentIntent: EnemyIntent | null = null;

  // BOSS阶段（如果是BOSS）
  private phase: number = 1;

  constructor(data: EnemyData) {
    // 随机生成HP
    const hp = Math.floor(Math.random() * (data.hpMax - data.hpMin + 1)) + data.hpMin;
    super(data.id + '_' + Math.random().toString(36).substr(2, 6), data.name, hp);

    this.enemyType = data.id;
    this.element = data.element;
    this.actions = data.actions;
    this.patterns = data.patterns || null;
    this.isBoss = data.isBoss || false;
    this.isElite = data.isElite || false;
  }

  /**
   * 获取当前意图
   */
  getCurrentIntent(): EnemyIntent | null {
    return this.currentIntent;
  }

  /**
   * 决定下一个意图
   */
  decideNextIntent(): void {
    if (this.patterns) {
      // 使用固定模式
      this.currentIntent = this.getPatternIntent();
    } else {
      // 使用权重随机
      this.currentIntent = this.getWeightedRandomIntent();
    }
  }

  /**
   * 获取固定模式的意图
   */
  private getPatternIntent(): EnemyIntent {
    if (!this.patterns || this.patterns.length === 0) {
      return { type: IntentType.UNKNOWN };
    }

    const intentType = this.patterns[this.patternIndex];
    this.patternIndex = (this.patternIndex + 1) % this.patterns.length;

    // 找到对应的action获取数值
    const action = this.actions.find(a => a.type === intentType);

    return {
      type: intentType,
      value: action?.value,
      secondaryValue: action?.secondaryValue,
      buffType: action?.buffType,
      debuffType: action?.debuffType,
      times: action?.times
    };
  }

  /**
   * 获取权重随机的意图
   */
  private getWeightedRandomIntent(): EnemyIntent {
    // 过滤可用的行动
    const availableActions = this.actions.filter(action => {
      // 可以添加条件检查
      if (action.condition) {
        // 需要访问玩家状态，暂时跳过条件检查
      }
      return true;
    });

    if (availableActions.length === 0) {
      return { type: IntentType.UNKNOWN };
    }

    // 计算总权重
    const totalWeight = availableActions.reduce((sum, a) => sum + a.weight, 0);

    // 随机选择
    let random = Math.random() * totalWeight;
    let selected = availableActions[0];

    for (const action of availableActions) {
      random -= action.weight;
      if (random <= 0) {
        selected = action;
        break;
      }
    }

    this.lastAction = selected.type;

    return {
      type: selected.type,
      value: selected.value,
      secondaryValue: selected.secondaryValue,
      buffType: selected.buffType,
      debuffType: selected.debuffType,
      times: selected.times || 1
    };
  }

  /**
   * 执行当前意图
   */
  executeIntent(player: Player, allEnemies: Enemy[]): void {
    if (!this.currentIntent) return;

    const intent = this.currentIntent;
    const times = intent.times || 1;

    switch (intent.type) {
      case IntentType.ATTACK:
        for (let i = 0; i < times; i++) {
          const damage = this.calculateDamage(intent.value || 0);
          player.takeDamage(damage, this, this.element);
        }
        break;

      case IntentType.DEFEND:
        this.gainArmor(intent.value || 0);
        break;

      case IntentType.ATTACK_DEFEND:
        // 攻击
        const atkDamage = this.calculateDamage(intent.value || 0);
        player.takeDamage(atkDamage, this, this.element);
        // 防御
        this.gainArmor(intent.secondaryValue || 0);
        break;

      case IntentType.BUFF:
        if (intent.buffType) {
          this.applyBuff(intent.buffType, intent.value || 1);
        }
        break;

      case IntentType.DEBUFF:
        if (intent.debuffType) {
          player.applyDebuff(intent.debuffType, intent.value || 1);
        }
        break;

      case IntentType.ATTACK_BUFF:
        // 攻击
        const damage2 = this.calculateDamage(intent.value || 0);
        player.takeDamage(damage2, this, this.element);
        // Buff
        if (intent.buffType) {
          this.applyBuff(intent.buffType, intent.secondaryValue || 1);
        }
        break;

      case IntentType.HEAL:
        this.heal(intent.value || 0);
        break;

      case IntentType.SUMMON:
        // 召唤逻辑需要BattleManager支持
        EventBus.emit('enemy_summon', { summoner: this, summonType: intent.buffType });
        break;

      case IntentType.SLEEPING:
        // 睡眠中不行动
        break;

      case IntentType.ESCAPE:
        // 逃跑逻辑
        EventBus.emit('enemy_escape', { enemy: this });
        break;
    }
  }

  /**
   * 计算伤害（考虑力量加成和虚弱状态）
   */
  private calculateDamage(baseDamage: number): number {
    let damage = baseDamage + this.strength;

    // 虚弱减伤
    if (this.hasBuff(BuffType.WEAK)) {
      damage = Math.floor(damage * 0.75);
    }

    return Math.max(0, damage);
  }

  /**
   * 更新BOSS阶段
   */
  updatePhase(): void {
    if (!this.isBoss) return;

    const hpPercent = this.hp / this.maxHp;

    if (hpPercent <= 0.25 && this.phase < 3) {
      this.phase = 3;
      this.onPhaseChange(3);
    } else if (hpPercent <= 0.5 && this.phase < 2) {
      this.phase = 2;
      this.onPhaseChange(2);
    }
  }

  /**
   * 阶段变化处理
   */
  protected onPhaseChange(newPhase: number): void {
    EventBus.emit('boss_phase_change', {
      enemy: this,
      phase: newPhase
    });

    // 子类可以覆盖实现特殊效果
  }

  /**
   * 受伤后检查阶段
   */
  takeDamage(amount: number, source: Entity | null = null, element: Element = Element.NONE): number {
    const actualDamage = super.takeDamage(amount, source, element);

    if (this.isBoss && actualDamage > 0) {
      this.updatePhase();
    }

    // 更新HP事件
    EventBus.emit(GameEvents.ENEMY_HP_CHANGED, {
      enemy: this,
      hp: this.hp,
      maxHp: this.maxHp,
      change: -actualDamage
    });

    return actualDamage;
  }

  /**
   * 死亡处理
   */
  protected onDeath(): void {
    EventBus.emit(GameEvents.ENEMY_DIED, {
      enemy: this,
      isBoss: this.isBoss,
      isElite: this.isElite
    });
  }

  /**
   * 回合开始处理
   */
  onTurnStart(): void {
    super.onTurnStart();
  }

  /**
   * 回合结束处理
   */
  onTurnEnd(): void {
    super.onTurnEnd();
  }

  /**
   * 战斗开始处理
   */
  onBattleStart(): void {
    super.onBattleStart();
    this.patternIndex = 0;
    this.phase = 1;
  }

  /**
   * 获取意图描述文本
   */
  getIntentDescription(): string {
    if (!this.currentIntent) return '';

    const intent = this.currentIntent;
    const times = intent.times || 1;
    const timesStr = times > 1 ? ` x${times}` : '';

    switch (intent.type) {
      case IntentType.ATTACK:
        return `攻击 ${intent.value}${timesStr}`;
      case IntentType.DEFEND:
        return `防御 ${intent.value}`;
      case IntentType.ATTACK_DEFEND:
        return `攻击 ${intent.value} + 防御 ${intent.secondaryValue}`;
      case IntentType.BUFF:
        return `增益: ${intent.buffType}`;
      case IntentType.DEBUFF:
        return `减益: ${intent.debuffType}`;
      case IntentType.HEAL:
        return `治疗 ${intent.value}`;
      case IntentType.SUMMON:
        return '召唤';
      case IntentType.SLEEPING:
        return '睡眠中';
      case IntentType.UNKNOWN:
        return '???';
      default:
        return '';
    }
  }

  /**
   * 获取意图图标
   */
  getIntentIcon(): string {
    if (!this.currentIntent) return 'unknown';

    switch (this.currentIntent.type) {
      case IntentType.ATTACK:
        return 'sword';
      case IntentType.DEFEND:
        return 'shield';
      case IntentType.ATTACK_DEFEND:
        return 'sword_shield';
      case IntentType.BUFF:
        return 'arrow_up';
      case IntentType.DEBUFF:
        return 'skull';
      case IntentType.HEAL:
        return 'heart';
      case IntentType.SUMMON:
        return 'summon';
      case IntentType.SLEEPING:
        return 'zzz';
      default:
        return 'unknown';
    }
  }

  /**
   * 序列化
   */
  serialize(): object {
    return {
      ...super.serialize(),
      enemyType: this.enemyType,
      isBoss: this.isBoss,
      isElite: this.isElite,
      phase: this.phase,
      patternIndex: this.patternIndex,
      currentIntent: this.currentIntent
    };
  }

  /**
   * 从数据创建敌人
   */
  static fromData(data: EnemyData): Enemy {
    return new Enemy(data);
  }
}

export default Enemy;
