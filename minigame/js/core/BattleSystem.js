/**
 * 战斗系统
 * 博德之门/战锤40K风格的骰子机制
 */

const { DICE, SPACETIME } = require('../config/GameConfig.js');

// 敌人模板
const ENEMY_TEMPLATES = {
  // 基础敌人
  slime: {
    name: '史莱姆',
    type: 'normal',
    baseStats: { hp: 50, attack: 10, physDef: 5, magicDef: 5, speed: 80 },
    expReward: 10,
    goldReward: 5,
    dropRate: 0.3
  },
  goblin: {
    name: '哥布林',
    type: 'normal',
    baseStats: { hp: 80, attack: 18, physDef: 10, magicDef: 5, speed: 100 },
    expReward: 20,
    goldReward: 10,
    dropRate: 0.35
  },
  skeleton: {
    name: '骷髅兵',
    type: 'normal',
    baseStats: { hp: 60, attack: 22, physDef: 15, magicDef: 3, speed: 90 },
    expReward: 25,
    goldReward: 12,
    dropRate: 0.35
  },
  wolf: {
    name: '暗狼',
    type: 'normal',
    baseStats: { hp: 70, attack: 25, physDef: 8, magicDef: 8, speed: 130 },
    expReward: 30,
    goldReward: 15,
    dropRate: 0.4
  },

  // 精英敌人
  orc_warrior: {
    name: '兽人战士',
    type: 'elite',
    baseStats: { hp: 200, attack: 40, physDef: 25, magicDef: 15, speed: 85 },
    expReward: 80,
    goldReward: 50,
    dropRate: 0.6
  },
  dark_mage: {
    name: '暗黑法师',
    type: 'elite',
    baseStats: { hp: 120, attack: 55, physDef: 10, magicDef: 40, speed: 95 },
    expReward: 90,
    goldReward: 60,
    dropRate: 0.65
  },

  // Boss
  boss_golem: {
    name: '远古石像',
    type: 'boss',
    baseStats: { hp: 500, attack: 60, physDef: 50, magicDef: 30, speed: 60 },
    expReward: 300,
    goldReward: 200,
    dropRate: 1.0,
    specialAbilities: ['石化凝视', '地震践踏']
  },
  boss_dragon: {
    name: '火龙',
    type: 'boss',
    baseStats: { hp: 800, attack: 80, physDef: 40, magicDef: 50, speed: 100 },
    expReward: 500,
    goldReward: 350,
    dropRate: 1.0,
    specialAbilities: ['龙息', '飞翔冲击', '尾扫']
  }
};

// 根据时期/区域选择敌人
const AREA_ENEMIES = {
  forest: ['slime', 'goblin', 'wolf'],
  cave: ['skeleton', 'goblin', 'orc_warrior'],
  ruins: ['skeleton', 'dark_mage', 'orc_warrior'],
  volcano: ['wolf', 'orc_warrior', 'boss_dragon']
};

class Enemy {
  constructor(template, level = 1) {
    const t = ENEMY_TEMPLATES[template];
    if (!t) throw new Error('Unknown enemy template: ' + template);

    this.id = 'enemy_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    this.templateId = template;
    this.name = t.name;
    this.type = t.type;
    this.level = level;

    // 根据等级缩放属性
    const scale = 1 + (level - 1) * 0.15;
    this.maxHp = Math.floor(t.baseStats.hp * scale);
    this.currentHp = this.maxHp;
    this.attack = Math.floor(t.baseStats.attack * scale);
    this.physDef = Math.floor(t.baseStats.physDef * scale);
    this.magicDef = Math.floor(t.baseStats.magicDef * scale);
    this.speed = t.baseStats.speed;

    this.expReward = Math.floor(t.expReward * scale);
    this.goldReward = Math.floor(t.goldReward * scale);
    this.dropRate = t.dropRate;
    this.specialAbilities = t.specialAbilities || [];

    // Boss特殊属性
    if (this.type === 'boss') {
      this.hasBlessing = true; // Boss有赐福
      this.blessingType = this._generateBlessing();
    }
  }

  _generateBlessing() {
    const blessings = [
      { name: '力量赐福', stat: 'attack', bonus: 0.2 },
      { name: '生命赐福', stat: 'hp', bonus: 0.3 },
      { name: '速度赐福', stat: 'moveSpeed', bonus: 0.15 },
      { name: '防御赐福', stat: 'physDef', bonus: 0.25 }
    ];
    return blessings[Math.floor(Math.random() * blessings.length)];
  }

  takeDamage(damage) {
    this.currentHp = Math.max(0, this.currentHp - damage);
    return this.currentHp <= 0;
  }

  // 敌人攻击
  performAttack() {
    const diceRoll = DICE.roll(6);
    const event = DICE.d6Events[diceRoll];

    let damage = this.attack;
    damage = Math.floor(damage * (1 + event.modifier * 0.2));

    return {
      damage,
      diceRoll,
      event,
      isCritical: diceRoll === 6
    };
  }
}

class BattleSystem {
  constructor() {
    this.currentBattle = null;
    this.battleLog = [];
    this.turnCount = 0;
  }

  // 开始战斗
  startBattle(player, enemies) {
    this.currentBattle = {
      player,
      enemies: enemies.map(e => e instanceof Enemy ? e : new Enemy(e.template, e.level)),
      state: 'active',
      turnOrder: [],
      currentTurn: 0
    };

    this.battleLog = [];
    this.turnCount = 0;

    // 计算行动顺序（基于速度）
    this._calculateTurnOrder();

    this._log('战斗开始！');
    return this.currentBattle;
  }

  // 计算行动顺序
  _calculateTurnOrder() {
    const combatants = [
      { type: 'player', entity: this.currentBattle.player, speed: this.currentBattle.player.currentStats.moveSpeed }
    ];

    for (const enemy of this.currentBattle.enemies) {
      combatants.push({ type: 'enemy', entity: enemy, speed: enemy.speed });
    }

    // 按速度排序
    combatants.sort((a, b) => b.speed - a.speed);
    this.currentBattle.turnOrder = combatants;
  }

  // 执行玩家攻击
  playerAttack(targetIndex) {
    if (!this.currentBattle || this.currentBattle.state !== 'active') return null;

    const player = this.currentBattle.player;
    const target = this.currentBattle.enemies[targetIndex];

    if (!target || target.currentHp <= 0) return null;

    // 计算伤害
    const attackResult = player.calculateDamage(true);

    // 应用防御
    const defense = target.physDef;
    const reduction = defense / (defense + 100);
    const finalDamage = Math.floor(attackResult.damage * (1 - reduction));

    // 造成伤害
    const killed = target.takeDamage(finalDamage);

    // 记录
    const log = {
      type: 'player_attack',
      attacker: player.name,
      target: target.name,
      damage: finalDamage,
      isCrit: attackResult.isCrit,
      diceRoll: attackResult.diceRoll,
      diceEvent: attackResult.diceEvent,
      killed
    };

    this._log(`${player.name} 攻击 ${target.name}，骰子${attackResult.diceRoll}(${attackResult.diceEvent.name})，造成 ${finalDamage} 点伤害${attackResult.isCrit ? ' (暴击!)' : ''}`);

    if (killed) {
      this._log(`${target.name} 被击败！`);
      this._handleEnemyDeath(target, targetIndex);
    }

    // 检查战斗结束
    this._checkBattleEnd();

    return log;
  }

  // 执行敌人攻击
  enemyAttack(enemyIndex) {
    if (!this.currentBattle || this.currentBattle.state !== 'active') return null;

    const enemy = this.currentBattle.enemies[enemyIndex];
    const player = this.currentBattle.player;

    if (!enemy || enemy.currentHp <= 0) return null;

    // 敌人攻击
    const attackResult = enemy.performAttack();

    // 玩家受伤
    const damageResult = player.takeDamage(attackResult.damage, true);

    const log = {
      type: 'enemy_attack',
      attacker: enemy.name,
      target: player.name,
      damage: damageResult.damage,
      dodged: damageResult.dodged,
      diceRoll: attackResult.diceRoll,
      diceEvent: attackResult.event
    };

    if (damageResult.dodged) {
      this._log(`${enemy.name} 攻击 ${player.name}，但被闪避了！`);
    } else {
      this._log(`${enemy.name} 攻击 ${player.name}，骰子${attackResult.diceRoll}(${attackResult.event.name})，造成 ${damageResult.damage} 点伤害`);
    }

    if (damageResult.isDead) {
      this._log(`${player.name} 倒下了...`);
      this.currentBattle.state = 'defeat';
    }

    return log;
  }

  // 处理敌人死亡
  _handleEnemyDeath(enemy, index) {
    const player = this.currentBattle.player;

    // 获得经验
    const leveledUp = player.gainExp(enemy.expReward);
    if (leveledUp) {
      this._log(`${player.name} 升级到 ${player.level} 级！`);
    }

    // 获得金币
    player.gold += enemy.goldReward;
    this._log(`获得 ${enemy.goldReward} 金币`);

    // 更新统计
    player.stats.kills++;
    if (enemy.type === 'boss') {
      player.stats.bossKills++;

      // Boss赐福
      if (enemy.hasBlessing) {
        this._log(`获得 ${enemy.blessingType.name}！`);
      }
    }

    // 掉落判定
    if (Math.random() < enemy.dropRate) {
      const drop = this._generateDrop(enemy);
      if (drop) {
        player.inventory.push(drop);
        this._log(`获得道具: ${drop.name}`);
      }
    }

    // 从敌人列表移除
    this.currentBattle.enemies.splice(index, 1);
  }

  // 生成掉落物
  _generateDrop(enemy) {
    const drops = [
      { name: '生命药水', type: 'consumable', effect: { heal: 50 } },
      { name: '法力药水', type: 'consumable', effect: { restoreMp: 30 } },
      { name: '力量结晶', type: 'material', rarity: 'common' },
      { name: '防护符文', type: 'material', rarity: 'uncommon' }
    ];

    // Boss有更好的掉落
    if (enemy.type === 'boss') {
      drops.push(
        { name: '远古遗物', type: 'equipment', slot: 'accessory', stats: { attack: 10, critRate: 5 }, rarity: 'rare' },
        { name: '龙鳞护甲', type: 'equipment', slot: 'armor', stats: { physDef: 20, hp: 50 }, rarity: 'epic' }
      );
    }

    return drops[Math.floor(Math.random() * drops.length)];
  }

  // 检查战斗结束
  _checkBattleEnd() {
    if (!this.currentBattle) return;

    const aliveEnemies = this.currentBattle.enemies.filter(e => e.currentHp > 0);

    if (aliveEnemies.length === 0) {
      this.currentBattle.state = 'victory';
      this._log('战斗胜利！');
    }
  }

  // 使用技能
  useSkill(skillIndex, targetIndex) {
    // TODO: 实现技能系统
    return null;
  }

  // 使用道具
  useItem(itemIndex) {
    if (!this.currentBattle) return null;

    const player = this.currentBattle.player;
    const item = player.inventory[itemIndex];

    if (!item || item.type !== 'consumable') return null;

    let result = { used: true, item };

    if (item.effect.heal) {
      const healed = player.heal(item.effect.heal);
      this._log(`使用 ${item.name}，恢复 ${healed} 点生命`);
      result.healed = healed;
    }

    if (item.effect.restoreMp) {
      const restored = player.restoreMp(item.effect.restoreMp);
      this._log(`使用 ${item.name}，恢复 ${restored} 点法力`);
      result.restored = restored;
    }

    // 移除物品
    player.inventory.splice(itemIndex, 1);

    return result;
  }

  // 尝试逃跑
  tryEscape() {
    if (!this.currentBattle) return null;

    const diceRoll = DICE.roll(6);
    const player = this.currentBattle.player;

    // 基础逃跑概率50%，速度越高越容易逃跑
    let escapeChance = 50 + (player.currentStats.moveSpeed - 100) / 2;
    escapeChance = Math.min(90, Math.max(10, escapeChance));

    const escaped = (diceRoll >= 4) || (Math.random() * 100 < escapeChance && diceRoll >= 2);

    if (escaped) {
      this._log('成功逃跑！');
      this.currentBattle.state = 'escaped';
    } else {
      this._log('逃跑失败！');
    }

    return { escaped, diceRoll };
  }

  // 记录日志
  _log(message) {
    this.battleLog.push({
      turn: this.turnCount,
      message,
      timestamp: Date.now()
    });
  }

  // 获取战斗状态
  getBattleState() {
    return this.currentBattle;
  }

  // 获取战斗日志
  getBattleLog() {
    return this.battleLog;
  }

  // 生成一波敌人
  static generateWave(waveNumber, area = 'forest') {
    const areaEnemies = AREA_ENEMIES[area] || AREA_ENEMIES.forest;

    // 敌人数量随波次增加
    const enemyCount = Math.min(5, 1 + Math.floor(waveNumber / 2));

    // 每5波有精英，每10波有Boss
    const hasBoss = waveNumber % 10 === 0;
    const hasElite = waveNumber % 5 === 0 && !hasBoss;

    const enemies = [];

    // 添加普通敌人
    for (let i = 0; i < enemyCount - (hasBoss ? 1 : 0) - (hasElite ? 1 : 0); i++) {
      const template = areaEnemies[Math.floor(Math.random() * areaEnemies.length)];
      const level = Math.ceil(waveNumber * 0.8);
      enemies.push(new Enemy(template, level));
    }

    // 添加精英
    if (hasElite) {
      const eliteTemplates = ['orc_warrior', 'dark_mage'];
      const template = eliteTemplates[Math.floor(Math.random() * eliteTemplates.length)];
      enemies.push(new Enemy(template, waveNumber));
    }

    // 添加Boss
    if (hasBoss) {
      const bossTemplates = ['boss_golem', 'boss_dragon'];
      const template = bossTemplates[Math.floor(Math.random() * bossTemplates.length)];
      enemies.push(new Enemy(template, waveNumber));
    }

    return enemies;
  }
}

module.exports = {
  BattleSystem,
  Enemy,
  ENEMY_TEMPLATES,
  AREA_ENEMIES
};
