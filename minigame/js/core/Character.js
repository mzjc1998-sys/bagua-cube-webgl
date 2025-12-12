/**
 * 角色系统
 * 处理角色创建、属性、装备、技能等
 */

const { CLASSES, ATTRIBUTES, DICE, countYangYao } = require('../config/GameConfig.js');

class Character {
  constructor(config = {}) {
    // 基础信息
    this.id = config.id || this._generateId();
    this.name = config.name || '无名旅者';
    this.classId = config.classId || 'xun'; // 默认剑士
    this.level = config.level || 1;
    this.exp = config.exp || 0;

    // 获取职业信息
    this.classInfo = CLASSES[this.classId];

    // 初始属性（基于职业基础属性）
    this.baseStats = { ...this.classInfo.baseStats };

    // 当前属性（受装备和Buff影响）
    this.currentStats = { ...this.baseStats };

    // 当前状态
    this.currentHp = this.currentStats.hp;
    this.currentMp = this.currentStats.mp;

    // 装备槽
    this.equipment = {
      weapon: null,
      armor: null,
      accessory: null
    };

    // 技能列表
    this.skills = [];

    // Buff/Debuff 列表
    this.buffs = [];

    // 背包
    this.inventory = [];
    this.maxInventorySize = 20;

    // 货币
    this.gold = config.gold || 0;

    // 爻变记录（影响命运）
    this.yaoChanges = [];

    // 创建时间
    this.createdAt = Date.now();

    // 统计数据
    this.stats = {
      kills: 0,
      deaths: 0,
      bossKills: 0,
      totalDamage: 0,
      totalHealing: 0,
      roomsCleared: 0,
      diceRolls: []
    };
  }

  _generateId() {
    return 'char_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // =============== 属性计算 ===============

  // 根据阳爻数量计算属性加成
  calculateYangBonus(bits) {
    const yangCount = countYangYao(bits);
    // 阳爻越多，该属性加成越高
    return 1 + yangCount * 0.1; // 每个阳爻+10%
  }

  // 重新计算所有属性
  recalculateStats() {
    // 重置为基础属性
    this.currentStats = { ...this.baseStats };

    // 应用等级加成
    const levelBonus = 1 + (this.level - 1) * 0.05;
    for (const key in this.currentStats) {
      this.currentStats[key] = Math.floor(this.currentStats[key] * levelBonus);
    }

    // 应用装备加成
    for (const slot in this.equipment) {
      const item = this.equipment[slot];
      if (item && item.stats) {
        for (const stat in item.stats) {
          if (this.currentStats[stat] !== undefined) {
            this.currentStats[stat] += item.stats[stat];
          }
        }
      }
    }

    // 应用Buff加成
    for (const buff of this.buffs) {
      if (buff.stats) {
        for (const stat in buff.stats) {
          if (this.currentStats[stat] !== undefined) {
            if (buff.isPercentage) {
              this.currentStats[stat] = Math.floor(this.currentStats[stat] * (1 + buff.stats[stat] / 100));
            } else {
              this.currentStats[stat] += buff.stats[stat];
            }
          }
        }
      }
    }

    // 确保当前HP/MP不超过最大值
    this.currentHp = Math.min(this.currentHp, this.currentStats.hp);
    this.currentMp = Math.min(this.currentMp, this.currentStats.mp);
  }

  // =============== 战斗相关 ===============

  // 计算伤害
  calculateDamage(isPhysical = true) {
    let baseDamage = this.currentStats.attack;

    // 检查暴击
    const critRoll = DICE.roll(100);
    const isCrit = critRoll <= this.currentStats.critRate;

    if (isCrit) {
      baseDamage *= 2; // 暴击双倍伤害
    }

    // 骰子加成
    const diceRoll = DICE.roll(6);
    const diceEvent = DICE.d6Events[diceRoll];
    baseDamage = Math.floor(baseDamage * (1 + diceEvent.modifier * 0.2));

    return {
      damage: baseDamage,
      isCrit,
      diceRoll,
      diceEvent
    };
  }

  // 受到伤害
  takeDamage(damage, isPhysical = true) {
    // 检查闪避
    const dodgeRoll = DICE.roll(100);
    if (dodgeRoll <= this.currentStats.dodge) {
      return { dodged: true, damage: 0 };
    }

    // 计算减伤
    const defense = isPhysical ? this.currentStats.physDef : this.currentStats.magicDef;
    const reduction = defense / (defense + 100); // 防御公式
    const finalDamage = Math.floor(damage * (1 - reduction));

    this.currentHp = Math.max(0, this.currentHp - finalDamage);

    return {
      dodged: false,
      damage: finalDamage,
      isDead: this.currentHp <= 0
    };
  }

  // 恢复生命
  heal(amount) {
    const actualHeal = Math.min(amount, this.currentStats.hp - this.currentHp);
    this.currentHp += actualHeal;
    this.stats.totalHealing += actualHeal;
    return actualHeal;
  }

  // 恢复法力
  restoreMp(amount) {
    const actualRestore = Math.min(amount, this.currentStats.mp - this.currentMp);
    this.currentMp += actualRestore;
    return actualRestore;
  }

  // =============== 经验与等级 ===============

  // 获得经验
  gainExp(amount) {
    this.exp += amount;
    const expNeeded = this.getExpToNextLevel();

    let leveledUp = false;
    while (this.exp >= expNeeded && this.level < 99) {
      this.exp -= expNeeded;
      this.levelUp();
      leveledUp = true;
    }

    return leveledUp;
  }

  // 升级
  levelUp() {
    this.level++;

    // 提升基础属性
    const growthRate = this.currentStats.growthRate / 100;
    for (const stat in this.baseStats) {
      const growth = Math.floor(this.baseStats[stat] * 0.05 * (1 + growthRate));
      this.baseStats[stat] += growth;
    }

    // 重新计算属性
    this.recalculateStats();

    // 恢复HP/MP
    this.currentHp = this.currentStats.hp;
    this.currentMp = this.currentStats.mp;
  }

  // 升级所需经验
  getExpToNextLevel() {
    return Math.floor(100 * Math.pow(1.5, this.level - 1));
  }

  // =============== 装备管理 ===============

  // 装备物品
  equip(item, slot) {
    if (!['weapon', 'armor', 'accessory'].includes(slot)) return false;

    // 卸下当前装备
    const oldItem = this.equipment[slot];
    if (oldItem) {
      this.inventory.push(oldItem);
    }

    // 装备新物品
    this.equipment[slot] = item;

    // 从背包移除
    const idx = this.inventory.indexOf(item);
    if (idx > -1) {
      this.inventory.splice(idx, 1);
    }

    this.recalculateStats();
    return true;
  }

  // 卸下装备
  unequip(slot) {
    const item = this.equipment[slot];
    if (!item) return false;

    if (this.inventory.length >= this.maxInventorySize) {
      return false; // 背包已满
    }

    this.inventory.push(item);
    this.equipment[slot] = null;
    this.recalculateStats();
    return true;
  }

  // =============== 爻变系统 ===============

  // 执行爻变
  applyYaoChange(yaoIndex, newValue) {
    this.yaoChanges.push({
      index: yaoIndex,
      value: newValue,
      timestamp: Date.now()
    });

    // 爻变会影响后续事件（像更换seed）
    return this.yaoChanges;
  }

  // 获取当前命运卦象
  getCurrentHexagram() {
    // 下卦（当前状态）由角色职业决定
    const lowerTrigram = this.classInfo.trigram;

    // 上卦（目标状态）由最近的爻变决定
    let upperTrigram = '000'; // 默认乾卦
    if (this.yaoChanges.length > 0) {
      // 根据爻变计算上卦
      const changes = this.yaoChanges.slice(-3);
      upperTrigram = changes.map(c => c.value).join('').padEnd(3, '0').slice(0, 3);
    }

    return {
      lower: lowerTrigram,
      upper: upperTrigram,
      hexagram: upperTrigram + lowerTrigram
    };
  }

  // =============== 序列化 ===============

  // 转换为可存储的对象
  serialize() {
    return {
      id: this.id,
      name: this.name,
      classId: this.classId,
      level: this.level,
      exp: this.exp,
      baseStats: this.baseStats,
      currentHp: this.currentHp,
      currentMp: this.currentMp,
      equipment: this.equipment,
      skills: this.skills,
      inventory: this.inventory,
      gold: this.gold,
      yaoChanges: this.yaoChanges,
      createdAt: this.createdAt,
      stats: this.stats
    };
  }

  // 从存储对象恢复
  static deserialize(data) {
    const char = new Character(data);
    char.baseStats = data.baseStats || char.baseStats;
    char.currentHp = data.currentHp || char.currentStats.hp;
    char.currentMp = data.currentMp || char.currentStats.mp;
    char.equipment = data.equipment || char.equipment;
    char.skills = data.skills || [];
    char.inventory = data.inventory || [];
    char.gold = data.gold || 0;
    char.yaoChanges = data.yaoChanges || [];
    char.createdAt = data.createdAt || Date.now();
    char.stats = data.stats || char.stats;
    char.recalculateStats();
    return char;
  }
}

module.exports = Character;
