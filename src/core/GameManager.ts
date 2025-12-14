/**
 * 游戏管理器 - 单例模式
 * 负责管理游戏全局状态和各子系统
 */

import { EventBus, GameEvents } from './EventBus';
import { GameStateManager, GameState } from './GameStateManager';
import { Player } from '../entity/Player';
import { SaveManager } from './SaveManager';
import { MetaProgress } from './MetaProgress';

export interface GameConfig {
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  platform: 'wechat' | 'web' | 'native';
}

export interface RunState {
  player: Player;
  currentFloor: number;
  currentRoom: string;
  gold: number;
  seed: number;
  turnCount: number;
  roomsCleared: number;
}

export class GameManager {
  private static _instance: GameManager;

  // 配置
  public config: GameConfig;

  // 游戏状态
  public stateManager: GameStateManager;
  public saveManager: SaveManager;
  public metaProgress: MetaProgress;

  // 当前运行状态
  public runState: RunState | null = null;

  // 是否正在运行中
  public isRunning: boolean = false;

  private constructor() {
    this.stateManager = new GameStateManager();
    this.saveManager = new SaveManager();
    this.metaProgress = new MetaProgress();
  }

  public static get instance(): GameManager {
    if (!GameManager._instance) {
      GameManager._instance = new GameManager();
    }
    return GameManager._instance;
  }

  /**
   * 初始化游戏
   */
  public async init(config: GameConfig): Promise<void> {
    this.config = config;

    // 加载永久进度
    await this.metaProgress.load();

    // 检查是否有未完成的游戏
    const savedRun = await this.saveManager.loadRunState();
    if (savedRun) {
      this.runState = savedRun;
      this.isRunning = true;
    }

    // 进入主菜单
    this.stateManager.transition(GameState.MAIN_MENU);

    console.log('GameManager initialized');
  }

  /**
   * 开始新游戏
   */
  public startNewRun(characterId: string): void {
    // 创建玩家
    const player = new Player(characterId);

    // 生成随机种子
    const seed = Date.now();

    this.runState = {
      player,
      currentFloor: 1,
      currentRoom: 'start',
      gold: 99,
      seed,
      turnCount: 0,
      roomsCleared: 0
    };

    this.isRunning = true;

    // 保存初始状态
    this.saveManager.saveRunState(this.runState);

    // 发送事件
    EventBus.emit(GameEvents.RUN_STARTED, { characterId, seed });

    // 进入地图界面
    this.stateManager.transition(GameState.MAP);
  }

  /**
   * 继续游戏
   */
  public continueRun(): void {
    if (!this.runState) {
      console.error('No saved run to continue');
      return;
    }

    this.isRunning = true;
    this.stateManager.transition(GameState.MAP);
  }

  /**
   * 结束当前游戏
   */
  public endRun(victory: boolean): void {
    if (!this.runState) return;

    // 计算奖励
    const rewards = this.calculateRunRewards(victory);

    // 更新永久进度
    this.metaProgress.addCurrency('crystal', rewards.crystal);
    this.metaProgress.incrementStat('runsCompleted');

    if (victory) {
      this.metaProgress.incrementStat('victories');
      this.metaProgress.checkUnlocks();
    }

    // 保存永久进度
    this.metaProgress.save();

    // 清除当前运行存档
    this.saveManager.clearRunState();

    // 发送事件
    EventBus.emit(GameEvents.RUN_ENDED, { victory, rewards });

    this.runState = null;
    this.isRunning = false;

    // 进入结算界面
    this.stateManager.transition(victory ? GameState.VICTORY : GameState.GAME_OVER);
  }

  /**
   * 计算运行奖励
   */
  private calculateRunRewards(victory: boolean): { crystal: number; baguaShards: number } {
    const run = this.runState!;

    let crystal = 0;
    crystal += run.currentFloor * 10; // 每层10玄晶
    crystal += run.roomsCleared * 2;  // 每个房间2玄晶
    if (victory) crystal += 50;       // 通关奖励

    const baguaShards = victory ? 1 : 0;

    return { crystal, baguaShards };
  }

  /**
   * 获取玩家
   */
  public get player(): Player | null {
    return this.runState?.player || null;
  }

  /**
   * 增加金币
   */
  public addGold(amount: number): void {
    if (!this.runState) return;
    this.runState.gold += amount;
    EventBus.emit(GameEvents.GOLD_CHANGED, { gold: this.runState.gold, change: amount });
  }

  /**
   * 消费金币
   */
  public spendGold(amount: number): boolean {
    if (!this.runState || this.runState.gold < amount) return false;
    this.runState.gold -= amount;
    EventBus.emit(GameEvents.GOLD_CHANGED, { gold: this.runState.gold, change: -amount });
    return true;
  }

  /**
   * 保存游戏状态
   */
  public saveGame(): void {
    if (this.runState) {
      this.saveManager.saveRunState(this.runState);
    }
  }

  /**
   * 设置屏幕尺寸
   */
  public setScreenSize(width: number, height: number): void {
    this.config.screenWidth = width;
    this.config.screenHeight = height;
  }
}

export default GameManager;
