/**
 * 游戏状态管理器
 * 使用状态机模式管理游戏的各种状态
 */

import { EventBus, GameEvents } from './EventBus';

export enum GameState {
  LOADING = 'loading',
  MAIN_MENU = 'main_menu',
  CHARACTER_SELECT = 'character_select',
  MAP = 'map',
  BATTLE = 'battle',
  BATTLE_REWARD = 'battle_reward',
  CARD_REWARD = 'card_reward',
  EVENT = 'event',
  SHOP = 'shop',
  REST = 'rest',
  TREASURE = 'treasure',
  BOSS_REWARD = 'boss_reward',
  GAME_OVER = 'game_over',
  VICTORY = 'victory',
  SETTINGS = 'settings',
  COLLECTION = 'collection',
  ACHIEVEMENTS = 'achievements'
}

interface StateTransition {
  from: GameState;
  to: GameState;
  timestamp: number;
}

export class GameStateManager {
  private currentState: GameState = GameState.LOADING;
  private stateStack: GameState[] = [];
  private transitionHistory: StateTransition[] = [];
  private stateData: Map<GameState, any> = new Map();

  // 状态进入/退出回调
  private enterCallbacks: Map<GameState, Array<(data?: any) => void>> = new Map();
  private exitCallbacks: Map<GameState, Array<() => void>> = new Map();

  constructor() {
    // 初始化状态
    this.currentState = GameState.LOADING;
  }

  /**
   * 获取当前状态
   */
  get state(): GameState {
    return this.currentState;
  }

  /**
   * 检查是否处于某个状态
   */
  is(state: GameState): boolean {
    return this.currentState === state;
  }

  /**
   * 检查是否处于战斗相关状态
   */
  isInBattle(): boolean {
    return [
      GameState.BATTLE,
      GameState.BATTLE_REWARD,
      GameState.CARD_REWARD
    ].includes(this.currentState);
  }

  /**
   * 检查是否在游戏运行中
   */
  isInRun(): boolean {
    return ![
      GameState.LOADING,
      GameState.MAIN_MENU,
      GameState.CHARACTER_SELECT,
      GameState.SETTINGS,
      GameState.COLLECTION,
      GameState.ACHIEVEMENTS
    ].includes(this.currentState);
  }

  /**
   * 状态转换
   */
  transition(newState: GameState, data?: any): void {
    if (this.currentState === newState) {
      console.warn(`Already in state: ${newState}`);
      return;
    }

    const oldState = this.currentState;

    // 记录历史
    this.transitionHistory.push({
      from: oldState,
      to: newState,
      timestamp: Date.now()
    });

    // 保持历史记录在合理范围
    if (this.transitionHistory.length > 100) {
      this.transitionHistory.shift();
    }

    // 调用退出回调
    this.onExitState(oldState);

    // 更新状态
    this.currentState = newState;

    // 保存状态数据
    if (data) {
      this.stateData.set(newState, data);
    }

    // 调用进入回调
    this.onEnterState(newState, data);

    // 发送状态变化事件
    EventBus.emit(GameEvents.STATE_CHANGED, {
      from: oldState,
      to: newState,
      data
    });

    console.log(`State transition: ${oldState} -> ${newState}`);
  }

  /**
   * 压栈状态（用于叠加UI如设置、暂停等）
   */
  push(newState: GameState, data?: any): void {
    this.stateStack.push(this.currentState);
    this.transition(newState, data);
  }

  /**
   * 弹出状态，返回上一个状态
   */
  pop(): void {
    if (this.stateStack.length > 0) {
      const previousState = this.stateStack.pop()!;
      const previousData = this.stateData.get(previousState);
      this.transition(previousState, previousData);
    }
  }

  /**
   * 返回到指定状态（清除该状态之后的栈）
   */
  popTo(state: GameState): void {
    while (this.stateStack.length > 0 && this.stateStack[this.stateStack.length - 1] !== state) {
      this.stateStack.pop();
    }
    if (this.stateStack.length > 0) {
      this.pop();
    }
  }

  /**
   * 清除状态栈
   */
  clearStack(): void {
    this.stateStack = [];
  }

  /**
   * 注册状态进入回调
   */
  onEnter(state: GameState, callback: (data?: any) => void): void {
    if (!this.enterCallbacks.has(state)) {
      this.enterCallbacks.set(state, []);
    }
    this.enterCallbacks.get(state)!.push(callback);
  }

  /**
   * 注册状态退出回调
   */
  onExit(state: GameState, callback: () => void): void {
    if (!this.exitCallbacks.has(state)) {
      this.exitCallbacks.set(state, []);
    }
    this.exitCallbacks.get(state)!.push(callback);
  }

  /**
   * 获取状态数据
   */
  getStateData<T>(state?: GameState): T | undefined {
    return this.stateData.get(state || this.currentState);
  }

  /**
   * 设置状态数据
   */
  setStateData(data: any, state?: GameState): void {
    this.stateData.set(state || this.currentState, data);
  }

  /**
   * 获取转换历史
   */
  getHistory(): StateTransition[] {
    return [...this.transitionHistory];
  }

  /**
   * 获取上一个状态
   */
  getPreviousState(): GameState | null {
    if (this.transitionHistory.length < 2) return null;
    return this.transitionHistory[this.transitionHistory.length - 2].from;
  }

  private onEnterState(state: GameState, data?: any): void {
    const callbacks = this.enterCallbacks.get(state);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  private onExitState(state: GameState): void {
    const callbacks = this.exitCallbacks.get(state);
    if (callbacks) {
      callbacks.forEach(cb => cb());
    }
  }
}

export default GameStateManager;
