/**
 * 事件总线 - 发布/订阅模式
 * 用于游戏各系统之间的解耦通信
 */

type EventCallback = (...args: any[]) => void;

interface EventListener {
  callback: EventCallback;
  context?: any;
  once: boolean;
}

class EventBusClass {
  private listeners: Map<string, EventListener[]> = new Map();

  /**
   * 订阅事件
   */
  on(event: string, callback: EventCallback, context?: any): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push({ callback, context, once: false });
  }

  /**
   * 订阅一次性事件
   */
  once(event: string, callback: EventCallback, context?: any): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push({ callback, context, once: true });
  }

  /**
   * 取消订阅
   */
  off(event: string, callback?: EventCallback, context?: any): void {
    if (!callback) {
      // 移除所有该事件的监听器
      this.listeners.delete(event);
      return;
    }

    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.findIndex(
        listener => listener.callback === callback && (!context || listener.context === context)
      );
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  /**
   * 发送事件
   */
  emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) return;

    // 复制数组以避免在遍历时修改
    const listeners = [...eventListeners];

    for (const listener of listeners) {
      if (listener.context) {
        listener.callback.apply(listener.context, args);
      } else {
        listener.callback(...args);
      }

      // 移除一次性监听器
      if (listener.once) {
        this.off(event, listener.callback, listener.context);
      }
    }
  }

  /**
   * 清除所有监听器
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * 获取事件监听器数量
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.length || 0;
  }
}

// 单例导出
export const EventBus = new EventBusClass();

/**
 * 游戏事件常量
 */
export const GameEvents = {
  // 游戏状态
  STATE_CHANGED: 'state_changed',
  RUN_STARTED: 'run_started',
  RUN_ENDED: 'run_ended',

  // 战斗相关
  BATTLE_START: 'battle_start',
  BATTLE_END: 'battle_end',
  TURN_START: 'turn_start',
  TURN_END: 'turn_end',
  PLAYER_TURN_START: 'player_turn_start',
  PLAYER_TURN_END: 'player_turn_end',
  ENEMY_TURN_START: 'enemy_turn_start',
  ENEMY_TURN_END: 'enemy_turn_end',

  // 卡牌相关
  CARD_DRAWN: 'card_drawn',
  CARD_PLAYED: 'card_played',
  CARD_DISCARDED: 'card_discarded',
  CARD_EXHAUSTED: 'card_exhausted',
  CARD_ADDED: 'card_added',
  CARD_REMOVED: 'card_removed',
  CARD_UPGRADED: 'card_upgraded',
  DECK_SHUFFLED: 'deck_shuffled',

  // 伤害/治疗
  DAMAGE_DEALT: 'damage_dealt',
  DAMAGE_TAKEN: 'damage_taken',
  HEAL: 'heal',
  ARMOR_GAINED: 'armor_gained',
  ARMOR_LOST: 'armor_lost',

  // 状态效果
  BUFF_APPLIED: 'buff_applied',
  BUFF_REMOVED: 'buff_removed',
  BUFF_STACKED: 'buff_stacked',
  DEBUFF_APPLIED: 'debuff_applied',
  DEBUFF_REMOVED: 'debuff_removed',

  // 能量
  ENERGY_GAINED: 'energy_gained',
  ENERGY_SPENT: 'energy_spent',
  ENERGY_RESTORED: 'energy_restored',

  // 地牢进度
  ROOM_ENTERED: 'room_entered',
  ROOM_CLEARED: 'room_cleared',
  FLOOR_STARTED: 'floor_started',
  FLOOR_CLEARED: 'floor_cleared',
  BOSS_ENCOUNTERED: 'boss_encountered',
  BOSS_DEFEATED: 'boss_defeated',

  // 奖励与资源
  GOLD_CHANGED: 'gold_changed',
  RELIC_OBTAINED: 'relic_obtained',
  RELIC_TRIGGERED: 'relic_triggered',
  CARD_REWARD_OFFERED: 'card_reward_offered',
  CARD_REWARD_SELECTED: 'card_reward_selected',

  // 实体
  PLAYER_HP_CHANGED: 'player_hp_changed',
  PLAYER_DIED: 'player_died',
  ENEMY_SPAWNED: 'enemy_spawned',
  ENEMY_HP_CHANGED: 'enemy_hp_changed',
  ENEMY_DIED: 'enemy_died',
  ENEMY_INTENT_CHANGED: 'enemy_intent_changed',

  // 事件/商店
  EVENT_STARTED: 'event_started',
  EVENT_CHOICE_MADE: 'event_choice_made',
  SHOP_ENTERED: 'shop_entered',
  SHOP_ITEM_PURCHASED: 'shop_item_purchased',

  // Meta进度
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  CHARACTER_UNLOCKED: 'character_unlocked',
  CARD_UNLOCKED: 'card_unlocked',

  // UI
  UI_CARD_SELECTED: 'ui_card_selected',
  UI_CARD_DESELECTED: 'ui_card_deselected',
  UI_TARGET_SELECTED: 'ui_target_selected',
  UI_TOOLTIP_SHOW: 'ui_tooltip_show',
  UI_TOOLTIP_HIDE: 'ui_tooltip_hide'
} as const;

export type GameEventType = typeof GameEvents[keyof typeof GameEvents];
