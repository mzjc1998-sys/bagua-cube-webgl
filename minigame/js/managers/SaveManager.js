/**
 * 存档管理器
 * 处理游戏存档和读档
 */
class SaveManager {
  constructor() {
    // 存档key前缀
    this.keyPrefix = 'dawn_adventure_';

    // 最大存档数量
    this.maxSlots = 10;

    // 自动存档槽位
    this.autoSaveSlot = 'auto';
  }

  /**
   * 保存游戏
   */
  save(data, slot = 0) {
    try {
      const key = this.getKey(slot);
      const saveData = {
        ...data,
        timestamp: Date.now(),
        version: 1
      };

      wx.setStorageSync(key, JSON.stringify(saveData));
      console.log(`[SaveManager] 保存成功: slot ${slot}`);
      return true;
    } catch (e) {
      console.error('[SaveManager] 保存失败:', e);
      return false;
    }
  }

  /**
   * 读取存档
   */
  load(slot = 0) {
    try {
      const key = this.getKey(slot);
      const raw = wx.getStorageSync(key);

      if (!raw) {
        console.log(`[SaveManager] 存档不存在: slot ${slot}`);
        return null;
      }

      const data = JSON.parse(raw);
      console.log(`[SaveManager] 读取成功: slot ${slot}`);
      return data;
    } catch (e) {
      console.error('[SaveManager] 读取失败:', e);
      return null;
    }
  }

  /**
   * 自动存档
   */
  autoSave(data) {
    return this.save(data, this.autoSaveSlot);
  }

  /**
   * 读取自动存档
   */
  loadAutoSave() {
    return this.load(this.autoSaveSlot);
  }

  /**
   * 删除存档
   */
  delete(slot) {
    try {
      const key = this.getKey(slot);
      wx.removeStorageSync(key);
      console.log(`[SaveManager] 删除成功: slot ${slot}`);
      return true;
    } catch (e) {
      console.error('[SaveManager] 删除失败:', e);
      return false;
    }
  }

  /**
   * 检查存档是否存在
   */
  exists(slot = 0) {
    try {
      const key = this.getKey(slot);
      const raw = wx.getStorageSync(key);
      return !!raw;
    } catch (e) {
      return false;
    }
  }

  /**
   * 获取所有存档信息
   */
  getAllSaves() {
    const saves = [];

    // 自动存档
    const autoSave = this.load(this.autoSaveSlot);
    if (autoSave) {
      saves.push({
        slot: this.autoSaveSlot,
        isAuto: true,
        ...autoSave
      });
    }

    // 手动存档
    for (let i = 0; i < this.maxSlots; i++) {
      const data = this.load(i);
      if (data) {
        saves.push({
          slot: i,
          isAuto: false,
          ...data
        });
      }
    }

    return saves;
  }

  /**
   * 获取存档key
   */
  getKey(slot) {
    return `${this.keyPrefix}save_${slot}`;
  }

  /**
   * 格式化时间戳
   */
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hour}:${minute}`;
  }

  /**
   * 清除所有存档
   */
  clearAll() {
    try {
      // 清除自动存档
      this.delete(this.autoSaveSlot);

      // 清除手动存档
      for (let i = 0; i < this.maxSlots; i++) {
        this.delete(i);
      }

      console.log('[SaveManager] 已清除所有存档');
      return true;
    } catch (e) {
      console.error('[SaveManager] 清除失败:', e);
      return false;
    }
  }

  /**
   * 导出存档数据（用于云同步等）
   */
  exportData() {
    return {
      saves: this.getAllSaves(),
      exportTime: Date.now()
    };
  }

  /**
   * 导入存档数据
   */
  importData(exportedData) {
    if (!exportedData || !exportedData.saves) {
      return false;
    }

    try {
      for (const save of exportedData.saves) {
        const slot = save.slot;
        delete save.slot;
        delete save.isAuto;
        this.save(save, slot);
      }
      return true;
    } catch (e) {
      console.error('[SaveManager] 导入失败:', e);
      return false;
    }
  }
}

export default SaveManager;
