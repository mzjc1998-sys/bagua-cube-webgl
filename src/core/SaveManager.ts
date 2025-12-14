/**
 * 存档管理器
 * 负责游戏数据的保存和加载
 */

import { RunState } from './GameManager';

const STORAGE_KEYS = {
  RUN_STATE: 'dungeon_roguelike_run',
  META_PROGRESS: 'dungeon_roguelike_meta',
  SETTINGS: 'dungeon_roguelike_settings'
};

/**
 * 存档管理器
 */
export class SaveManager {
  private useCloud: boolean = false;

  constructor() {
    // 检测平台
    this.useCloud = this.isWechatPlatform();
  }

  /**
   * 检测是否是微信平台
   */
  private isWechatPlatform(): boolean {
    return typeof wx !== 'undefined' && wx.cloud;
  }

  /**
   * 保存运行状态
   */
  async saveRunState(state: RunState): Promise<void> {
    const data = this.serializeRunState(state);

    if (this.useCloud) {
      await this.saveToCloud(STORAGE_KEYS.RUN_STATE, data);
    }

    // 始终保存到本地作为备份
    this.saveToLocal(STORAGE_KEYS.RUN_STATE, data);
  }

  /**
   * 加载运行状态
   */
  async loadRunState(): Promise<RunState | null> {
    let data = null;

    if (this.useCloud) {
      data = await this.loadFromCloud(STORAGE_KEYS.RUN_STATE);
    }

    if (!data) {
      data = this.loadFromLocal(STORAGE_KEYS.RUN_STATE);
    }

    if (data) {
      return this.deserializeRunState(data);
    }

    return null;
  }

  /**
   * 清除运行状态
   */
  async clearRunState(): Promise<void> {
    if (this.useCloud) {
      await this.deleteFromCloud(STORAGE_KEYS.RUN_STATE);
    }
    this.deleteFromLocal(STORAGE_KEYS.RUN_STATE);
  }

  /**
   * 保存设置
   */
  saveSettings(settings: object): void {
    this.saveToLocal(STORAGE_KEYS.SETTINGS, settings);
  }

  /**
   * 加载设置
   */
  loadSettings(): object | null {
    return this.loadFromLocal(STORAGE_KEYS.SETTINGS);
  }

  /**
   * 序列化运行状态
   */
  private serializeRunState(state: RunState): object {
    return {
      player: state.player.serialize(),
      currentFloor: state.currentFloor,
      currentRoom: state.currentRoom,
      gold: state.gold,
      seed: state.seed,
      turnCount: state.turnCount,
      roomsCleared: state.roomsCleared,
      timestamp: Date.now()
    };
  }

  /**
   * 反序列化运行状态
   */
  private deserializeRunState(data: any): RunState {
    // 需要Player类的deserialize方法
    const { Player } = require('../entity/Player');

    return {
      player: Player.deserialize(data.player),
      currentFloor: data.currentFloor,
      currentRoom: data.currentRoom,
      gold: data.gold,
      seed: data.seed,
      turnCount: data.turnCount,
      roomsCleared: data.roomsCleared
    };
  }

  // ==================== 本地存储 ====================

  private saveToLocal(key: string, data: object): void {
    try {
      const json = JSON.stringify(data);

      if (this.isWechatPlatform()) {
        wx.setStorageSync(key, json);
      } else {
        localStorage.setItem(key, json);
      }
    } catch (e) {
      console.error('保存到本地存储失败:', e);
    }
  }

  private loadFromLocal(key: string): object | null {
    try {
      let json: string;

      if (this.isWechatPlatform()) {
        json = wx.getStorageSync(key);
      } else {
        json = localStorage.getItem(key) || '';
      }

      if (json) {
        return JSON.parse(json);
      }
    } catch (e) {
      console.error('从本地存储加载失败:', e);
    }
    return null;
  }

  private deleteFromLocal(key: string): void {
    try {
      if (this.isWechatPlatform()) {
        wx.removeStorageSync(key);
      } else {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.error('删除本地存储失败:', e);
    }
  }

  // ==================== 云存储（微信） ====================

  private async saveToCloud(key: string, data: object): Promise<void> {
    if (!this.isWechatPlatform()) return;

    try {
      const db = wx.cloud.database();
      const collection = db.collection('saves');

      // 先查询是否存在
      const result = await collection.where({
        _openid: '{openid}',  // 微信云开发会自动替换
        key: key
      }).get();

      if (result.data.length > 0) {
        // 更新
        await collection.doc(result.data[0]._id).update({
          data: {
            value: data,
            updateTime: new Date()
          }
        });
      } else {
        // 新增
        await collection.add({
          data: {
            key: key,
            value: data,
            createTime: new Date(),
            updateTime: new Date()
          }
        });
      }
    } catch (e) {
      console.error('保存到云存储失败:', e);
    }
  }

  private async loadFromCloud(key: string): Promise<object | null> {
    if (!this.isWechatPlatform()) return null;

    try {
      const db = wx.cloud.database();
      const result = await db.collection('saves').where({
        _openid: '{openid}',
        key: key
      }).get();

      if (result.data.length > 0) {
        return result.data[0].value;
      }
    } catch (e) {
      console.error('从云存储加载失败:', e);
    }
    return null;
  }

  private async deleteFromCloud(key: string): Promise<void> {
    if (!this.isWechatPlatform()) return;

    try {
      const db = wx.cloud.database();
      const result = await db.collection('saves').where({
        _openid: '{openid}',
        key: key
      }).get();

      if (result.data.length > 0) {
        await db.collection('saves').doc(result.data[0]._id).remove();
      }
    } catch (e) {
      console.error('删除云存储失败:', e);
    }
  }
}

export default SaveManager;
