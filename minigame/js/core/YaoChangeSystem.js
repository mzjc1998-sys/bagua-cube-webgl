/**
 * 爻变系统
 * 爻变会影响后续冒险遇到的事件和道具
 * 类似《我的世界》中途更换seed
 */

const { DICE, TRIGRAMS, getBitsName } = require('../config/GameConfig.js');

// 爻辞 - 每爻代表一种可能性
const YAO_MEANINGS = {
  // 初爻（第一爻，最下）
  0: {
    yang: { name: '潜龙勿用', meaning: '积蓄力量', effect: 'boost_defense' },
    yin: { name: '履霜坚冰', meaning: '小心谨慎', effect: 'reduce_enemy' }
  },
  // 二爻
  1: {
    yang: { name: '见龙在田', meaning: '展现实力', effect: 'boost_attack' },
    yin: { name: '直方大', meaning: '稳扎稳打', effect: 'boost_exp' }
  },
  // 三爻（上爻）
  2: {
    yang: { name: '终日乾乾', meaning: '全力以赴', effect: 'boost_crit' },
    yin: { name: '含章可贞', meaning: '韬光养晦', effect: 'boost_drop' }
  }
};

// 爻变效果
const YAO_EFFECTS = {
  boost_defense: {
    name: '防御强化',
    description: '后续敌人攻击力降低10%',
    modifier: { enemyAttack: 0.9 }
  },
  reduce_enemy: {
    name: '敌数减少',
    description: '每波敌人数量-1',
    modifier: { enemyCount: -1 }
  },
  boost_attack: {
    name: '攻击强化',
    description: '玩家攻击力提升15%',
    modifier: { playerAttack: 1.15 }
  },
  boost_exp: {
    name: '经验加成',
    description: '经验获取提升20%',
    modifier: { expMultiplier: 1.2 }
  },
  boost_crit: {
    name: '暴击强化',
    description: '暴击率提升10%',
    modifier: { critRate: 10 }
  },
  boost_drop: {
    name: '掉落提升',
    description: '掉落率提升25%',
    modifier: { dropRate: 1.25 }
  }
};

// 384种可能性 = 64卦 × 6爻
// 每个六爻都有不同的爻辞和效果

class YaoChangeSystem {
  constructor() {
    this.currentSeed = null;
    this.yaoChanges = [];
    this.activeEffects = [];
  }

  // 初始化种子
  initSeed(seed = null) {
    this.currentSeed = seed || Date.now();
    this.yaoChanges = [];
    this.activeEffects = [];
    return this.currentSeed;
  }

  // 执行爻变
  changeYao(yaoIndex, newValue) {
    if (yaoIndex < 0 || yaoIndex > 5) return null;

    // 记录爻变
    const change = {
      index: yaoIndex,
      oldValue: null, // 可以记录旧值
      newValue: newValue, // '0' 或 '1'
      timestamp: Date.now()
    };

    this.yaoChanges.push(change);

    // 获取爻辞
    const trigramYaoIndex = yaoIndex % 3; // 0, 1, 2
    const yaoMeaning = YAO_MEANINGS[trigramYaoIndex][newValue === '0' ? 'yang' : 'yin'];

    // 应用效果
    const effect = YAO_EFFECTS[yaoMeaning.effect];
    this.activeEffects.push({
      ...effect,
      fromYao: yaoIndex,
      timestamp: Date.now()
    });

    // 更新种子（像换seed一样影响后续生成）
    this.currentSeed = this._mutateSeed(this.currentSeed, yaoIndex, newValue);

    return {
      change,
      yaoMeaning,
      effect,
      newSeed: this.currentSeed
    };
  }

  // 变异种子
  _mutateSeed(seed, yaoIndex, value) {
    // 简单的种子变异算法
    const mutation = (yaoIndex + 1) * (value === '0' ? 7 : 13);
    return ((seed * 1103515245 + mutation) % 2147483647);
  }

  // 根据当前种子生成随机事件
  generateEvent(roomNumber) {
    const events = [
      { type: 'treasure', name: '宝箱', probability: 0.2 },
      { type: 'trap', name: '陷阱', probability: 0.15 },
      { type: 'merchant', name: '神秘商人', probability: 0.1 },
      { type: 'shrine', name: '古老神龛', probability: 0.08 },
      { type: 'challenge', name: '精英挑战', probability: 0.12 },
      { type: 'rest', name: '休息点', probability: 0.1 },
      { type: 'none', name: '无事件', probability: 0.25 }
    ];

    // 使用种子影响概率
    const rng = this._seededRandom(this.currentSeed + roomNumber);

    // 应用爻变效果
    let modifiedEvents = events.map(e => {
      let prob = e.probability;

      for (const effect of this.activeEffects) {
        if (e.type === 'trap' && effect.modifier.enemyAttack) {
          prob *= 0.8; // 陷阱减少
        }
        if (e.type === 'treasure' && effect.modifier.dropRate) {
          prob *= effect.modifier.dropRate;
        }
      }

      return { ...e, probability: prob };
    });

    // 归一化概率
    const total = modifiedEvents.reduce((sum, e) => sum + e.probability, 0);
    modifiedEvents = modifiedEvents.map(e => ({ ...e, probability: e.probability / total }));

    // 选择事件
    let cumulative = 0;
    for (const event of modifiedEvents) {
      cumulative += event.probability;
      if (rng < cumulative) {
        return event;
      }
    }

    return { type: 'none', name: '无事件' };
  }

  // 根据当前种子生成敌人配置
  generateEnemyConfig(waveNumber) {
    let config = {
      count: Math.min(5, 1 + Math.floor(waveNumber / 2)),
      level: Math.ceil(waveNumber * 0.8),
      attackMultiplier: 1,
      hasBoss: waveNumber % 10 === 0,
      hasElite: waveNumber % 5 === 0
    };

    // 应用爻变效果
    for (const effect of this.activeEffects) {
      if (effect.modifier.enemyCount) {
        config.count = Math.max(1, config.count + effect.modifier.enemyCount);
      }
      if (effect.modifier.enemyAttack) {
        config.attackMultiplier *= effect.modifier.enemyAttack;
      }
    }

    return config;
  }

  // 计算经验修正
  getExpMultiplier() {
    let multiplier = 1;
    for (const effect of this.activeEffects) {
      if (effect.modifier.expMultiplier) {
        multiplier *= effect.modifier.expMultiplier;
      }
    }
    return multiplier;
  }

  // 计算掉落率修正
  getDropRateMultiplier() {
    let multiplier = 1;
    for (const effect of this.activeEffects) {
      if (effect.modifier.dropRate) {
        multiplier *= effect.modifier.dropRate;
      }
    }
    return multiplier;
  }

  // 获取当前卦象（六爻）
  getCurrentHexagram() {
    if (this.yaoChanges.length === 0) {
      return '000000'; // 乾卦
    }

    // 从爻变记录构建六爻
    let hexagram = ['0', '0', '0', '0', '0', '0'];
    for (const change of this.yaoChanges) {
      hexagram[change.index] = change.newValue;
    }

    return hexagram.join('');
  }

  // 获取上下卦
  getTrigramPair() {
    const hex = this.getCurrentHexagram();
    return {
      lower: hex.slice(0, 3), // 下卦（初二三爻）
      upper: hex.slice(3, 6), // 上卦（四五上爻）
      lowerName: getBitsName(hex.slice(0, 3)),
      upperName: getBitsName(hex.slice(3, 6))
    };
  }

  // 解读卦象
  interpretHexagram() {
    const pair = this.getTrigramPair();

    return {
      hexagram: this.getCurrentHexagram(),
      lower: {
        bits: pair.lower,
        name: pair.lowerName,
        meaning: '当前状态'
      },
      upper: {
        bits: pair.upper,
        name: pair.upperName,
        meaning: '目标状态'
      },
      interpretation: this._generateInterpretation(pair),
      activeEffects: this.activeEffects
    };
  }

  // 生成卦象解读
  _generateInterpretation(pair) {
    const interpretations = {
      '乾乾': '大吉，万事顺利，可大胆前进',
      '坤坤': '宜守不宜攻，积蓄力量',
      '乾坤': '天地交泰，阴阳调和',
      '坤乾': '地天泰，吉祥如意',
      '震震': '雷动风行，速战速决',
      '离离': '光明璀璨，洞察一切',
      '坎坎': '险中求胜，需要谨慎',
      '艮艮': '稳如磐石，宜静不宜动'
    };

    const key = pair.lowerName + pair.upperName;
    return interpretations[key] || `${pair.lowerName}之${pair.upperName}，变化莫测`;
  }

  // 投骰决定是否触发爻变
  rollForYaoChange() {
    const roll = DICE.roll(6);

    // 6点触发爻变
    if (roll === 6) {
      // 随机选择一爻
      const yaoIndex = Math.floor(Math.random() * 6);
      // 随机决定阴阳
      const newValue = Math.random() < 0.5 ? '0' : '1';

      return {
        triggered: true,
        roll,
        yaoIndex,
        newValue
      };
    }

    return {
      triggered: false,
      roll
    };
  }

  // 种子随机数生成器
  _seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // 序列化
  serialize() {
    return {
      currentSeed: this.currentSeed,
      yaoChanges: this.yaoChanges,
      activeEffects: this.activeEffects
    };
  }

  // 反序列化
  static deserialize(data) {
    const system = new YaoChangeSystem();
    system.currentSeed = data.currentSeed;
    system.yaoChanges = data.yaoChanges || [];
    system.activeEffects = data.activeEffects || [];
    return system;
  }
}

module.exports = YaoChangeSystem;
