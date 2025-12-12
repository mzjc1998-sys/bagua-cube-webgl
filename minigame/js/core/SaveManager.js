/**
 * 存档管理器
 * 线上/线下分离存档系统
 *
 * 规则：
 * - 角色死亡时，线下部分归零，需要重新开档
 * - 线上部分保留（家园、储物箱等）
 */

const Character = require('./Character.js');

const SAVE_KEYS = {
  OFFLINE: 'bagua_save_offline_v1',  // 线下存档（角色、冒险进度）
  ONLINE: 'bagua_save_online_v1',    // 线上存档（家园、储物箱）
  SETTINGS: 'bagua_settings_v1'       // 游戏设置
};

class SaveManager {
  constructor() {
    this.offlineData = null;
    this.onlineData = null;
    this.settings = null;
  }

  // =============== 线下存档 ===============
  // 角色死亡会清空

  // 保存线下数据
  saveOffline(data) {
    const saveData = {
      character: data.character ? data.character.serialize() : null,
      adventure: data.adventure || null,
      currentRoom: data.currentRoom || null,
      currentWave: data.currentWave || 0,
      seed: data.seed || null,
      timestamp: Date.now()
    };

    try {
      wx.setStorageSync(SAVE_KEYS.OFFLINE, JSON.stringify(saveData));
      this.offlineData = saveData;
      return true;
    } catch (e) {
      console.error('保存线下数据失败:', e);
      return false;
    }
  }

  // 加载线下数据
  loadOffline() {
    try {
      const raw = wx.getStorageSync(SAVE_KEYS.OFFLINE);
      if (!raw) return null;

      const data = JSON.parse(raw);
      this.offlineData = data;

      // 恢复角色对象
      if (data.character) {
        data.character = Character.deserialize(data.character);
      }

      return data;
    } catch (e) {
      console.error('加载线下数据失败:', e);
      return null;
    }
  }

  // 清空线下数据（角色死亡时调用）
  clearOffline() {
    try {
      wx.removeStorageSync(SAVE_KEYS.OFFLINE);
      this.offlineData = null;
      return true;
    } catch (e) {
      console.error('清空线下数据失败:', e);
      return false;
    }
  }

  // 检查是否有线下存档
  hasOfflineSave() {
    try {
      const raw = wx.getStorageSync(SAVE_KEYS.OFFLINE);
      return !!raw;
    } catch (e) {
      return false;
    }
  }

  // =============== 线上存档 ===============
  // 永久保存，不会因角色死亡而丢失

  // 保存线上数据
  saveOnline(data) {
    const saveData = {
      // 家园数据
      home: data.home || {
        level: 1,
        furniture: [],
        decorations: []
      },
      // 储物箱
      storage: data.storage || [],
      storageSize: data.storageSize || 50,
      // 线上货币
      gems: data.gems || 0,
      // 解锁的成就
      achievements: data.achievements || [],
      // 收集的图鉴
      collection: data.collection || {
        enemies: [],
        items: [],
        hexagrams: []
      },
      // 历史记录
      history: data.history || {
        totalRuns: 0,
        bestLevel: 0,
        totalPlayTime: 0,
        charactersCreated: []
      },
      // 时间戳
      timestamp: Date.now()
    };

    try {
      wx.setStorageSync(SAVE_KEYS.ONLINE, JSON.stringify(saveData));
      this.onlineData = saveData;
      return true;
    } catch (e) {
      console.error('保存线上数据失败:', e);
      return false;
    }
  }

  // 加载线上数据
  loadOnline() {
    try {
      const raw = wx.getStorageSync(SAVE_KEYS.ONLINE);
      if (!raw) {
        // 创建默认的线上数据
        const defaultData = {
          home: { level: 1, furniture: [], decorations: [] },
          storage: [],
          storageSize: 50,
          gems: 0,
          achievements: [],
          collection: { enemies: [], items: [], hexagrams: [] },
          history: { totalRuns: 0, bestLevel: 0, totalPlayTime: 0, charactersCreated: [] },
          timestamp: Date.now()
        };
        this.saveOnline(defaultData);
        return defaultData;
      }

      const data = JSON.parse(raw);
      this.onlineData = data;
      return data;
    } catch (e) {
      console.error('加载线上数据失败:', e);
      return null;
    }
  }

  // 添加物品到储物箱
  addToStorage(item) {
    if (!this.onlineData) this.loadOnline();

    if (this.onlineData.storage.length >= this.onlineData.storageSize) {
      return false; // 储物箱已满
    }

    this.onlineData.storage.push(item);
    this.saveOnline(this.onlineData);
    return true;
  }

  // 从储物箱取出物品
  removeFromStorage(itemIndex) {
    if (!this.onlineData) this.loadOnline();

    if (itemIndex < 0 || itemIndex >= this.onlineData.storage.length) {
      return null;
    }

    const item = this.onlineData.storage.splice(itemIndex, 1)[0];
    this.saveOnline(this.onlineData);
    return item;
  }

  // 记录角色死亡
  recordDeath(character) {
    if (!this.onlineData) this.loadOnline();

    // 更新历史记录
    this.onlineData.history.totalRuns++;
    if (character.level > this.onlineData.history.bestLevel) {
      this.onlineData.history.bestLevel = character.level;
    }

    // 记录这个角色
    this.onlineData.history.charactersCreated.push({
      name: character.name,
      class: character.classId,
      level: character.level,
      deathTime: Date.now(),
      stats: character.stats
    });

    // 只保留最近50个角色记录
    if (this.onlineData.history.charactersCreated.length > 50) {
      this.onlineData.history.charactersCreated.shift();
    }

    this.saveOnline(this.onlineData);

    // 清空线下存档
    this.clearOffline();
  }

  // =============== 游戏设置 ===============

  // 保存设置
  saveSettings(settings) {
    const data = {
      sound: settings.sound !== undefined ? settings.sound : true,
      music: settings.music !== undefined ? settings.music : true,
      vibration: settings.vibration !== undefined ? settings.vibration : true,
      language: settings.language || 'zh',
      quality: settings.quality || 'high',
      autoSave: settings.autoSave !== undefined ? settings.autoSave : true,
      showDamageNumbers: settings.showDamageNumbers !== undefined ? settings.showDamageNumbers : true,
      timestamp: Date.now()
    };

    try {
      wx.setStorageSync(SAVE_KEYS.SETTINGS, JSON.stringify(data));
      this.settings = data;
      return true;
    } catch (e) {
      console.error('保存设置失败:', e);
      return false;
    }
  }

  // 加载设置
  loadSettings() {
    try {
      const raw = wx.getStorageSync(SAVE_KEYS.SETTINGS);
      if (!raw) {
        // 返回默认设置
        const defaultSettings = {
          sound: true,
          music: true,
          vibration: true,
          language: 'zh',
          quality: 'high',
          autoSave: true,
          showDamageNumbers: true
        };
        this.settings = defaultSettings;
        return defaultSettings;
      }

      const data = JSON.parse(raw);
      this.settings = data;
      return data;
    } catch (e) {
      console.error('加载设置失败:', e);
      return null;
    }
  }

  // =============== 工具方法 ===============

  // 获取存档信息摘要
  getSaveSummary() {
    const offline = this.loadOffline();
    const online = this.loadOnline();

    return {
      hasCharacter: !!(offline && offline.character),
      characterName: offline?.character?.name || null,
      characterLevel: offline?.character?.level || 0,
      characterClass: offline?.character?.classId || null,
      totalRuns: online?.history?.totalRuns || 0,
      bestLevel: online?.history?.bestLevel || 0,
      storageUsed: online?.storage?.length || 0,
      storageSize: online?.storageSize || 50
    };
  }

  // 完全重置（调试用）
  resetAll() {
    try {
      wx.removeStorageSync(SAVE_KEYS.OFFLINE);
      wx.removeStorageSync(SAVE_KEYS.ONLINE);
      wx.removeStorageSync(SAVE_KEYS.SETTINGS);
      this.offlineData = null;
      this.onlineData = null;
      this.settings = null;
      return true;
    } catch (e) {
      console.error('重置失败:', e);
      return false;
    }
  }
}

// 导出单例
module.exports = new SaveManager();
