/**
 * 战斗管理器
 * 负责管理整个战斗流程
 */

import { EventBus, GameEvents } from '../core/EventBus';
import { GameManager } from '../core/GameManager';
import { GameState } from '../core/GameStateManager';
import { Player } from '../entity/Player';
import { Enemy } from '../entity/Enemy';
import { Card } from '../card/Card';
import { Deck } from '../card/Deck';
import { Entity } from '../entity/Entity';

/**
 * 战斗阶段
 */
export enum BattlePhase {
  NOT_STARTED = 'not_started',
  PLAYER_TURN = 'player_turn',
  ENEMY_TURN = 'enemy_turn',
  VICTORY = 'victory',
  DEFEAT = 'defeat'
}

/**
 * 战斗状态
 */
export interface BattleState {
  phase: BattlePhase;
  turn: number;
  player: Player;
  enemies: Enemy[];
  drawPile: Card[];
  discardPile: Card[];
  exhaustPile: Card[];
  hand: Card[];
  isPlayerTurn: boolean;
}

/**
 * 战斗配置
 */
export interface BattleConfig {
  initialEnergy: number;
  initialDraw: number;
  drawPerTurn: number;
  maxHandSize: number;
  armorDecayPerTurn: boolean;
}

const DEFAULT_CONFIG: BattleConfig = {
  initialEnergy: 3,
  initialDraw: 5,
  drawPerTurn: 5,
  maxHandSize: 10,
  armorDecayPerTurn: false
};

/**
 * 战斗管理器类
 */
export class BattleManager {
  private static _instance: BattleManager;

  private state: BattleState | null = null;
  private config: BattleConfig = DEFAULT_CONFIG;

  // 战斗中的临时监听器
  private battleListeners: Array<{ event: string; callback: Function }> = [];

  private constructor() {
    this.setupEventListeners();
  }

  public static get instance(): BattleManager {
    if (!BattleManager._instance) {
      BattleManager._instance = new BattleManager();
    }
    return BattleManager._instance;
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听抽牌请求
    EventBus.on('request_draw_cards', (data: { count: number }) => {
      this.drawCards(data.count);
    });
  }

  /**
   * 获取当前战斗状态
   */
  get battleState(): BattleState | null {
    return this.state;
  }

  /**
   * 是否正在战斗中
   */
  get isInBattle(): boolean {
    return this.state !== null &&
      this.state.phase !== BattlePhase.NOT_STARTED &&
      this.state.phase !== BattlePhase.VICTORY &&
      this.state.phase !== BattlePhase.DEFEAT;
  }

  /**
   * 开始战斗
   */
  startBattle(enemies: Enemy[], config?: Partial<BattleConfig>): void {
    const player = GameManager.instance.player;
    if (!player) {
      console.error('No player found!');
      return;
    }

    // 合并配置
    this.config = { ...DEFAULT_CONFIG, ...config };

    // 准备牌组
    const deck = player.deck.getCards();
    const shuffled = this.shuffleArray([...deck]);

    // 初始化战斗状态
    this.state = {
      phase: BattlePhase.NOT_STARTED,
      turn: 0,
      player,
      enemies,
      drawPile: shuffled,
      discardPile: [],
      exhaustPile: [],
      hand: [],
      isPlayerTurn: false
    };

    // 战斗开始处理
    player.onBattleStart();
    enemies.forEach(enemy => enemy.onBattleStart());

    // 发送战斗开始事件
    EventBus.emit(GameEvents.BATTLE_START, {
      enemies: enemies.map(e => ({ id: e.id, name: e.name, hp: e.hp, maxHp: e.maxHp }))
    });

    // 决定敌人首回合意图
    this.decideEnemyIntents();

    // 开始第一个玩家回合
    this.startPlayerTurn();
  }

  /**
   * 开始玩家回合
   */
  private startPlayerTurn(): void {
    if (!this.state) return;

    this.state.turn++;
    this.state.phase = BattlePhase.PLAYER_TURN;
    this.state.isPlayerTurn = true;

    const player = this.state.player;

    // 重置能量
    player.resetEnergy();

    // 回合开始效果
    player.onTurnStart();

    // 护甲衰减（可选规则）
    if (this.config.armorDecayPerTurn) {
      player.setArmor(0);
    }

    // 抽牌
    const drawCount = this.state.turn === 1 ? this.config.initialDraw : this.config.drawPerTurn;
    this.drawCards(drawCount);

    // 发送事件
    EventBus.emit(GameEvents.PLAYER_TURN_START, { turn: this.state.turn });
    EventBus.emit(GameEvents.TURN_START, { turn: this.state.turn, entity: player });
  }

  /**
   * 结束玩家回合
   */
  endPlayerTurn(): void {
    if (!this.state || !this.state.isPlayerTurn) return;

    this.state.isPlayerTurn = false;
    const player = this.state.player;

    // 回合结束效果
    player.onTurnEnd();

    // 处理手牌
    this.handleEndOfTurnHand();

    // 发送事件
    EventBus.emit(GameEvents.PLAYER_TURN_END, { turn: this.state.turn });

    // 检查战斗结束
    if (this.checkBattleEnd()) return;

    // 开始敌人回合
    this.startEnemyTurn();
  }

  /**
   * 处理回合结束时的手牌
   */
  private handleEndOfTurnHand(): void {
    if (!this.state) return;

    const toDiscard: Card[] = [];
    const toExhaust: Card[] = [];

    for (const card of this.state.hand) {
      if (card.ethereal) {
        // 虚无牌消耗
        toExhaust.push(card);
      } else if (!card.retain) {
        // 非保留牌弃掉
        toDiscard.push(card);
      }
    }

    // 移除并处理
    for (const card of toExhaust) {
      this.exhaustCard(card);
    }
    for (const card of toDiscard) {
      this.discardCard(card);
    }
  }

  /**
   * 开始敌人回合
   */
  private async startEnemyTurn(): Promise<void> {
    if (!this.state) return;

    this.state.phase = BattlePhase.ENEMY_TURN;

    EventBus.emit(GameEvents.ENEMY_TURN_START, { turn: this.state.turn });

    // 依次执行每个敌人的行动
    for (const enemy of this.state.enemies) {
      if (!enemy.isAlive()) continue;

      // 回合开始效果
      enemy.onTurnStart();

      // 执行意图
      await this.executeEnemyAction(enemy);

      // 回合结束效果
      enemy.onTurnEnd();

      // 检查玩家是否死亡
      if (!this.state.player.isAlive()) {
        this.endBattle(false);
        return;
      }
    }

    EventBus.emit(GameEvents.ENEMY_TURN_END, { turn: this.state.turn });

    // 检查战斗结束
    if (this.checkBattleEnd()) return;

    // 决定下回合意图
    this.decideEnemyIntents();

    // 开始新的玩家回合
    this.startPlayerTurn();
  }

  /**
   * 执行敌人行动
   */
  private async executeEnemyAction(enemy: Enemy): Promise<void> {
    const intent = enemy.getCurrentIntent();
    if (!intent) return;

    // 添加动画延迟
    await this.delay(500);

    enemy.executeIntent(this.state!.player, this.state!.enemies);

    // 动画延迟
    await this.delay(300);
  }

  /**
   * 决定所有敌人的意图
   */
  private decideEnemyIntents(): void {
    if (!this.state) return;

    for (const enemy of this.state.enemies) {
      if (enemy.isAlive()) {
        enemy.decideNextIntent();
        EventBus.emit(GameEvents.ENEMY_INTENT_CHANGED, {
          enemy: enemy.id,
          intent: enemy.getCurrentIntent()
        });
      }
    }
  }

  /**
   * 打出卡牌
   */
  playCard(cardUuid: string, targetId?: string): boolean {
    if (!this.state || !this.state.isPlayerTurn) {
      console.warn('Cannot play card: not player turn');
      return false;
    }

    // 找到卡牌
    const cardIndex = this.state.hand.findIndex(c => c.uuid === cardUuid);
    if (cardIndex === -1) {
      console.warn('Card not in hand:', cardUuid);
      return false;
    }

    const card = this.state.hand[cardIndex];
    const player = this.state.player;

    // 检查是否可以打出
    if (!card.canPlay(player)) {
      console.warn('Cannot play card:', card.name);
      return false;
    }

    // 检查能量
    if (player.energy < card.actualCost) {
      console.warn('Not enough energy');
      return false;
    }

    // 获取目标
    let target: Entity | null = null;
    if (targetId) {
      target = this.state.enemies.find(e => e.id === targetId) || null;
    }

    // 消耗能量
    player.spendEnergy(card.actualCost);

    // 从手牌移除
    this.state.hand.splice(cardIndex, 1);

    // 执行卡牌效果
    card.play(player, target, this.state.enemies);

    // 处理卡牌去向
    if (card.exhaust) {
      this.state.exhaustPile.push(card);
      EventBus.emit(GameEvents.CARD_EXHAUSTED, { card });
    } else {
      this.state.discardPile.push(card);
      EventBus.emit(GameEvents.CARD_DISCARDED, { card });
    }

    // 检查战斗结束
    this.checkBattleEnd();

    return true;
  }

  /**
   * 抽牌
   */
  drawCards(count: number): Card[] {
    if (!this.state) return [];

    const drawnCards: Card[] = [];

    for (let i = 0; i < count; i++) {
      // 手牌已满
      if (this.state.hand.length >= this.config.maxHandSize) {
        break;
      }

      // 抽牌堆空了，洗牌
      if (this.state.drawPile.length === 0) {
        if (this.state.discardPile.length === 0) {
          break; // 没牌可抽
        }
        this.shuffleDiscardIntoDraw();
      }

      // 抽一张牌
      const card = this.state.drawPile.pop()!;
      this.state.hand.push(card);
      drawnCards.push(card);

      EventBus.emit(GameEvents.CARD_DRAWN, { card });
    }

    return drawnCards;
  }

  /**
   * 弃牌
   */
  discardCard(card: Card): void {
    if (!this.state) return;

    const index = this.state.hand.indexOf(card);
    if (index > -1) {
      this.state.hand.splice(index, 1);
    }

    this.state.discardPile.push(card);
    card.resetTempModifiers();

    EventBus.emit(GameEvents.CARD_DISCARDED, { card });
  }

  /**
   * 消耗卡牌
   */
  exhaustCard(card: Card): void {
    if (!this.state) return;

    const index = this.state.hand.indexOf(card);
    if (index > -1) {
      this.state.hand.splice(index, 1);
    }

    this.state.exhaustPile.push(card);

    EventBus.emit(GameEvents.CARD_EXHAUSTED, { card });
  }

  /**
   * 洗弃牌堆入抽牌堆
   */
  private shuffleDiscardIntoDraw(): void {
    if (!this.state) return;

    this.state.drawPile = this.shuffleArray([...this.state.discardPile]);
    this.state.discardPile = [];

    EventBus.emit(GameEvents.DECK_SHUFFLED, {});
  }

  /**
   * 检查战斗结束
   */
  private checkBattleEnd(): boolean {
    if (!this.state) return false;

    // 检查玩家死亡
    if (!this.state.player.isAlive()) {
      this.endBattle(false);
      return true;
    }

    // 检查所有敌人死亡
    const allEnemiesDead = this.state.enemies.every(e => !e.isAlive());
    if (allEnemiesDead) {
      this.endBattle(true);
      return true;
    }

    return false;
  }

  /**
   * 结束战斗
   */
  private endBattle(victory: boolean): void {
    if (!this.state) return;

    this.state.phase = victory ? BattlePhase.VICTORY : BattlePhase.DEFEAT;

    // 清理战斗状态
    this.cleanupBattle();

    // 发送战斗结束事件
    EventBus.emit(GameEvents.BATTLE_END, { victory });

    // 转换游戏状态
    if (victory) {
      GameManager.instance.stateManager.transition(GameState.BATTLE_REWARD);
    } else {
      GameManager.instance.endRun(false);
    }
  }

  /**
   * 清理战斗
   */
  private cleanupBattle(): void {
    // 重置所有卡牌的临时修改
    if (this.state) {
      [...this.state.hand, ...this.state.drawPile, ...this.state.discardPile].forEach(card => {
        card.resetTempModifiers();
      });
    }

    // 清理临时监听器
    this.battleListeners.forEach(({ event, callback }) => {
      EventBus.off(event, callback as any);
    });
    this.battleListeners = [];
  }

  /**
   * 获取可攻击的敌人
   */
  getAliveEnemies(): Enemy[] {
    return this.state?.enemies.filter(e => e.isAlive()) || [];
  }

  /**
   * 获取手牌
   */
  getHand(): Card[] {
    return this.state?.hand || [];
  }

  /**
   * 获取抽牌堆数量
   */
  getDrawPileCount(): number {
    return this.state?.drawPile.length || 0;
  }

  /**
   * 获取弃牌堆数量
   */
  getDiscardPileCount(): number {
    return this.state?.discardPile.length || 0;
  }

  /**
   * 工具方法：洗牌
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * 工具方法：延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default BattleManager;
