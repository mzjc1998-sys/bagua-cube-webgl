/**
 * 玩家类
 * 继承自Entity，包含玩家特有的属性和行为
 */

import { Entity, BuffType } from './Entity';
import { EventBus, GameEvents } from '../core/EventBus';
import { Card, CardData } from '../card/Card';
import { Deck } from '../card/Deck';
import { Relic } from '../relic/Relic';
import { CharacterData, CHARACTERS } from '../data/Characters';

/**
 * 玩家类
 */
export class Player extends Entity {
  // 角色信息
  public characterId: string;
  public characterName: string;

  // 能量
  private _energy: number = 3;
  private _maxEnergy: number = 3;

  // 牌组
  public deck: Deck;

  // 遗物
  public relics: Relic[] = [];

  // 金币（由GameManager管理，这里做引用）
  // public gold: number = 0;

  constructor(characterId: string) {
    const charData = CHARACTERS[characterId];
    if (!charData) {
      throw new Error(`Unknown character: ${characterId}`);
    }

    super(`player_${characterId}`, charData.name, charData.startingHp);

    this.characterId = characterId;
    this.characterName = charData.name;
    this._maxEnergy = charData.startingEnergy || 3;
    this._energy = this._maxEnergy;

    // 初始化牌组
    this.deck = new Deck();
    this.initializeStartingDeck(charData);

    // 初始化遗物
    this.initializeStartingRelics(charData);
  }

  // Getters
  get energy(): number { return this._energy; }
  set energy(value: number) { this._energy = Math.max(0, value); }

  get maxEnergy(): number { return this._maxEnergy; }

  /**
   * 初始化起始牌组
   */
  private initializeStartingDeck(charData: CharacterData): void {
    for (const cardId of charData.startingDeck) {
      this.deck.addCard(cardId);
    }
  }

  /**
   * 初始化起始遗物
   */
  private initializeStartingRelics(charData: CharacterData): void {
    if (charData.startingRelic) {
      // this.addRelic(charData.startingRelic);
    }
  }

  /**
   * 消费能量
   */
  spendEnergy(amount: number): boolean {
    if (this._energy < amount) return false;
    this._energy -= amount;
    EventBus.emit(GameEvents.ENERGY_SPENT, { amount, remaining: this._energy });
    return true;
  }

  /**
   * 获得能量
   */
  gainEnergy(amount: number): void {
    this._energy += amount;
    EventBus.emit(GameEvents.ENERGY_GAINED, { amount, total: this._energy });
  }

  /**
   * 重置能量（回合开始）
   */
  resetEnergy(): void {
    this._energy = this._maxEnergy;
    EventBus.emit(GameEvents.ENERGY_RESTORED, { energy: this._energy });
  }

  /**
   * 增加最大能量
   */
  increaseMaxEnergy(amount: number): void {
    this._maxEnergy += amount;
  }

  /**
   * 添加卡牌到牌组
   */
  addCardToDeck(card: Card): void {
    this.deck.addCardInstance(card);
    EventBus.emit(GameEvents.CARD_ADDED, { card });
  }

  /**
   * 从牌组移除卡牌
   */
  removeCardFromDeck(cardUuid: string): boolean {
    const removed = this.deck.removeCard(cardUuid);
    if (removed) {
      EventBus.emit(GameEvents.CARD_REMOVED, { cardUuid });
    }
    return removed;
  }

  /**
   * 添加遗物
   */
  addRelic(relic: Relic): void {
    this.relics.push(relic);
    relic.onObtain(this);
    EventBus.emit(GameEvents.RELIC_OBTAINED, { relic });
  }

  /**
   * 检查是否有某个遗物
   */
  hasRelic(relicId: string): boolean {
    return this.relics.some(r => r.id === relicId);
  }

  /**
   * 获取遗物
   */
  getRelic(relicId: string): Relic | undefined {
    return this.relics.find(r => r.id === relicId);
  }

  /**
   * 回合开始处理
   */
  onTurnStart(): void {
    super.onTurnStart();

    // 触发遗物效果
    for (const relic of this.relics) {
      relic.onTurnStart(this);
    }
  }

  /**
   * 回合结束处理
   */
  onTurnEnd(): void {
    super.onTurnEnd();

    // 触发遗物效果
    for (const relic of this.relics) {
      relic.onTurnEnd(this);
    }
  }

  /**
   * 战斗开始处理
   */
  onBattleStart(): void {
    super.onBattleStart();

    // 触发遗物效果
    for (const relic of this.relics) {
      relic.onBattleStart(this);
    }
  }

  /**
   * 战斗结束处理
   */
  onBattleEnd(victory: boolean): void {
    // 触发遗物效果
    for (const relic of this.relics) {
      relic.onBattleEnd(this, victory);
    }

    // 清除战斗中的临时Buff
    // 保留力量、敏捷等能力Buff取决于游戏设计
  }

  /**
   * 受伤时处理
   */
  takeDamage(amount: number, source: Entity | null = null, element: any = null): number {
    const actualDamage = super.takeDamage(amount, source, element);

    // 触发遗物效果
    if (actualDamage > 0) {
      for (const relic of this.relics) {
        relic.onDamageTaken(this, actualDamage);
      }
    }

    // 更新HP事件
    EventBus.emit(GameEvents.PLAYER_HP_CHANGED, {
      hp: this.hp,
      maxHp: this.maxHp,
      change: -actualDamage
    });

    return actualDamage;
  }

  /**
   * 治疗时处理
   */
  heal(amount: number): number {
    const actualHeal = super.heal(amount);

    if (actualHeal > 0) {
      EventBus.emit(GameEvents.PLAYER_HP_CHANGED, {
        hp: this.hp,
        maxHp: this.maxHp,
        change: actualHeal
      });
    }

    return actualHeal;
  }

  /**
   * 获得护甲时处理
   */
  gainArmor(amount: number): void {
    super.gainArmor(amount);

    // 触发遗物效果
    for (const relic of this.relics) {
      relic.onArmorGained(this, amount);
    }
  }

  /**
   * 死亡处理
   */
  protected onDeath(): void {
    EventBus.emit(GameEvents.PLAYER_DIED, { player: this });
  }

  /**
   * 使用卡牌时处理（由BattleManager调用）
   */
  onCardPlayed(card: Card): void {
    // 触发遗物效果
    for (const relic of this.relics) {
      relic.onCardPlayed(this, card);
    }
  }

  /**
   * 击杀敌人时处理
   */
  onEnemyKilled(enemy: Entity): void {
    // 触发遗物效果
    for (const relic of this.relics) {
      relic.onEnemyKilled(this, enemy);
    }
  }

  /**
   * 进入房间时处理
   */
  onRoomEntered(roomType: string): void {
    // 触发遗物效果
    for (const relic of this.relics) {
      relic.onRoomEntered(this, roomType);
    }
  }

  /**
   * 序列化
   */
  serialize(): object {
    return {
      ...super.serialize(),
      characterId: this.characterId,
      energy: this._energy,
      maxEnergy: this._maxEnergy,
      deck: this.deck.serialize(),
      relics: this.relics.map(r => r.serialize())
    };
  }

  /**
   * 反序列化
   */
  static deserialize(data: any): Player {
    const player = new Player(data.characterId);
    player._hp = data.hp;
    player._maxHp = data.maxHp;
    player._armor = data.armor;
    player._energy = data.energy;
    player._maxEnergy = data.maxEnergy;

    // 恢复牌组
    if (data.deck) {
      player.deck = Deck.deserialize(data.deck);
    }

    // 恢复遗物
    if (data.relics) {
      // player.relics = data.relics.map(Relic.deserialize);
    }

    // 恢复Buff
    if (data.buffs) {
      for (const [key, buff] of data.buffs) {
        player.buffs.set(key, buff);
      }
    }

    return player;
  }
}

export default Player;
