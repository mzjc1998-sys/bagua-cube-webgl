/**
 * 玩家类
 * 处理玩家移动、属性、攻击等
 */
class Player {
  constructor(x, y) {
    // 位置
    this.x = x;
    this.y = y;

    // 移动
    this.targetX = x;
    this.targetY = y;
    this.speed = 0.08; // 每帧移动速度
    this.isMoving = false;

    // 属性
    this.maxHP = 100;
    this.hp = 100;
    this.attack = 15;
    this.defense = 5;
    this.attackRange = 1.5;
    this.attackSpeed = 500; // 攻击间隔（毫秒）

    // 攻击状态
    this.isAttacking = false;
    this.attackCooldown = 0;
    this.attackTarget = null;
    this.attackAnimation = 0;

    // 翻滚闪避
    this.isRolling = false;
    this.rollCooldown = 0;
    this.rollDuration = 300;
    this.rollSpeed = 0.2;
    this.rollDirection = { x: 0, y: 0 };
    this.rollTimer = 0;

    // 无敌帧
    this.invincible = false;
    this.invincibleTimer = 0;
    this.invincibleDuration = 500;

    // 视觉
    this.radius = 12;
    this.color = '#4CAF50';
    this.facingAngle = 0; // 面朝方向

    // 拾取范围
    this.pickupRange = 1.0;

    // 经验和等级
    this.level = 1;
    this.exp = 0;
    this.expToNextLevel = 100;

    // 装备加成
    this.bonusAttack = 0;
    this.bonusDefense = 0;
    this.bonusSpeed = 0;

    // 黑色粉末/染黑系统
    this.darkness = 0; // 总暗度 0-100
    this.maxDarkness = 100;
    this.blackenedParts = {
      head: 0,      // 每个部位 0-100
      bodyUpper: 0,
      bodyLower: 0,
      armL: 0,
      armR: 0,
      legL: 0,
      legR: 0
    };
    this.evolutionReady = false;
    this.evolutionChoices = null;
  }

  /**
   * 设置移动目标
   */
  setMoveTarget(targetX, targetY) {
    this.targetX = targetX;
    this.targetY = targetY;
    this.isMoving = true;

    // 计算面朝方向
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    if (dx !== 0 || dy !== 0) {
      this.facingAngle = Math.atan2(dy, dx);
    }
  }

  /**
   * 开始翻滚
   */
  roll(dirX, dirY) {
    if (this.rollCooldown > 0 || this.isRolling) return false;

    // 归一化方向
    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    if (len === 0) {
      // 使用面朝方向
      dirX = Math.cos(this.facingAngle);
      dirY = Math.sin(this.facingAngle);
    } else {
      dirX /= len;
      dirY /= len;
    }

    this.isRolling = true;
    this.rollTimer = this.rollDuration;
    this.rollDirection = { x: dirX, y: dirY };
    this.invincible = true;
    this.invincibleTimer = this.rollDuration;

    return true;
  }

  /**
   * 攻击
   */
  startAttack() {
    if (this.attackCooldown > 0 || this.isAttacking || this.isRolling) return false;

    this.isAttacking = true;
    this.attackAnimation = 200; // 攻击动画时长
    this.attackCooldown = this.attackSpeed;

    return true;
  }

  /**
   * 获取攻击位置和范围
   */
  getAttackArea() {
    const attackX = this.x + Math.cos(this.facingAngle) * this.attackRange;
    const attackY = this.y + Math.sin(this.facingAngle) * this.attackRange;
    return {
      x: attackX,
      y: attackY,
      radius: this.attackRange
    };
  }

  /**
   * 计算伤害值
   */
  calculateDamage() {
    const baseDamage = this.attack + this.bonusAttack;
    // 随机浮动 ±20%
    const variance = baseDamage * 0.2;
    return Math.floor(baseDamage + (Math.random() - 0.5) * 2 * variance);
  }

  /**
   * 受到伤害
   */
  takeDamage(damage) {
    if (this.invincible) return 0;

    // 计算实际伤害
    const actualDamage = Math.max(1, damage - (this.defense + this.bonusDefense));
    this.hp = Math.max(0, this.hp - actualDamage);

    // 受击无敌
    this.invincible = true;
    this.invincibleTimer = this.invincibleDuration;

    return actualDamage;
  }

  /**
   * 治疗
   */
  heal(amount) {
    this.hp = Math.min(this.maxHP, this.hp + amount);
  }

  /**
   * 获取经验
   */
  gainExp(amount) {
    this.exp += amount;
    while (this.exp >= this.expToNextLevel) {
      this.exp -= this.expToNextLevel;
      this.levelUp();
    }
  }

  /**
   * 升级
   */
  levelUp() {
    this.level++;
    this.maxHP += 10;
    this.hp = this.maxHP;
    this.attack += 3;
    this.defense += 1;
    this.expToNextLevel = Math.floor(this.expToNextLevel * 1.5);
  }

  /**
   * 更新
   */
  update(deltaTime, dungeon, collisionManager = null) {
    // 更新冷却
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
    }
    if (this.rollCooldown > 0) {
      this.rollCooldown -= deltaTime;
    }
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= deltaTime;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
      }
    }
    if (this.attackAnimation > 0) {
      this.attackAnimation -= deltaTime;
      if (this.attackAnimation <= 0) {
        this.isAttacking = false;
      }
    }

    // 翻滚移动
    if (this.isRolling) {
      this.rollTimer -= deltaTime;

      const rollMoveX = this.rollDirection.x * this.rollSpeed * deltaTime * 0.1;
      const rollMoveY = this.rollDirection.y * this.rollSpeed * deltaTime * 0.1;

      let newX = this.x + rollMoveX;
      let newY = this.y + rollMoveY;

      // 分步检测翻滚碰撞（防止穿墙）
      const steps = 4;
      const stepX = rollMoveX / steps;
      const stepY = rollMoveY / steps;

      for (let i = 0; i < steps; i++) {
        const testX = this.x + stepX;
        const testY = this.y + stepY;

        // 地形碰撞检测（带半径）
        if (dungeon.isWalkableWithRadius) {
          if (!dungeon.isWalkableWithRadius(testX, testY, 0.3)) {
            // 碰到墙壁，解决碰撞
            const resolved = dungeon.resolveWallCollision(testX, testY, 0.3);
            this.x = resolved.x;
            this.y = resolved.y;
            break;
          }
        } else if (!dungeon.isWalkable(testX, testY)) {
          break;
        }

        this.x = testX;
        this.y = testY;
      }

      // 尸体/墙壁实体碰撞
      if (collisionManager) {
        const resolved = collisionManager.resolveCollision(this.x, this.y, 0.3);
        this.x = resolved.x;
        this.y = resolved.y;
      }

      // 最终墙壁碰撞修正
      if (dungeon.resolveWallCollision) {
        const wallResolved = dungeon.resolveWallCollision(this.x, this.y, 0.3);
        this.x = wallResolved.x;
        this.y = wallResolved.y;
      }

      if (this.rollTimer <= 0) {
        this.isRolling = false;
        this.rollCooldown = 800; // 翻滚冷却
      }
      return;
    }

    // 普通移动
    if (this.isMoving && !this.isAttacking) {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0.1) {
        const moveSpeed = (this.speed + this.bonusSpeed) * deltaTime * 0.1;
        const moveX = (dx / dist) * Math.min(moveSpeed, dist);
        const moveY = (dy / dist) * Math.min(moveSpeed, dist);

        let newX = this.x + moveX;
        let newY = this.y + moveY;

        // 地形碰撞检测（使用带半径的检测）
        if (dungeon.isWalkableWithRadius) {
          // X轴移动
          if (dungeon.isWalkableWithRadius(newX, this.y, 0.3)) {
            this.x = newX;
          }
          // Y轴移动
          if (dungeon.isWalkableWithRadius(this.x, newY, 0.3)) {
            this.y = newY;
          }
        } else {
          // 兼容旧方法
          if (dungeon.isWalkable(newX, this.y)) {
            this.x = newX;
          }
          if (dungeon.isWalkable(this.x, newY)) {
            this.y = newY;
          }
        }

        // 尸体/墙壁实体碰撞
        if (collisionManager) {
          const resolved = collisionManager.resolveCollision(this.x, this.y, 0.3);
          this.x = resolved.x;
          this.y = resolved.y;
        }

        // 最终墙壁碰撞修正（防止卡墙角）
        if (dungeon.resolveWallCollision) {
          const wallResolved = dungeon.resolveWallCollision(this.x, this.y, 0.3);
          this.x = wallResolved.x;
          this.y = wallResolved.y;
        }

        // 更新面朝方向
        if (moveX !== 0 || moveY !== 0) {
          this.facingAngle = Math.atan2(moveY, moveX);
        }
      } else {
        this.isMoving = false;
      }
    }
  }

  /**
   * 是否死亡
   */
  isDead() {
    return this.hp <= 0;
  }

  /**
   * 收集黑色粉末
   */
  collectDust(amount) {
    if (this.evolutionReady) return;

    // 随机选择一个部位染黑
    const parts = Object.keys(this.blackenedParts);
    const availableParts = parts.filter(p => this.blackenedParts[p] < 100);

    if (availableParts.length === 0) {
      // 所有部位已染黑
      this.checkEvolutionReady();
      return;
    }

    // 随机选择部位
    const targetPart = availableParts[Math.floor(Math.random() * availableParts.length)];
    const addAmount = amount * 2; // 每个粉末增加的染黑度

    this.blackenedParts[targetPart] = Math.min(100, this.blackenedParts[targetPart] + addAmount);

    // 更新总暗度
    this.updateTotalDarkness();
  }

  /**
   * 更新总暗度
   */
  updateTotalDarkness() {
    const parts = Object.keys(this.blackenedParts);
    let total = 0;
    for (const part of parts) {
      total += this.blackenedParts[part];
    }
    this.darkness = total / parts.length;

    // 检查是否可以进化
    this.checkEvolutionReady();
  }

  /**
   * 检查是否可以进化
   */
  checkEvolutionReady() {
    const allBlackened = Object.values(this.blackenedParts).every(v => v >= 100);
    if (allBlackened && !this.evolutionReady) {
      this.evolutionReady = true;
      // 生成进化选项
      this.evolutionChoices = this.generateEvolutionChoices();
    }
  }

  /**
   * 生成进化选项
   */
  generateEvolutionChoices() {
    const allChoices = [
      { id: 'shadow', name: '疾行寄生', desc: '移动速度+50%，攻击附带毒素', color: '#2a1a1a' },
      { id: 'void', name: '铁壳宿主', desc: '生命上限+100，受伤时有几率闪避', color: '#1a1a1a' },
      { id: 'abyss', name: '狂暴变异', desc: '攻击力+80%，攻击范围增大', color: '#2a0a0a' },
      { id: 'corruption', name: '腐蚀血脉', desc: '攻击附带腐蚀，持续伤害敌人', color: '#3a1a1a' },
      { id: 'darkness', name: '完全共生', desc: '技能冷却减半，翻滚距离增加', color: '#1a0a0a' }
    ];

    // 随机选择3个
    const shuffled = allChoices.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  /**
   * 选择进化
   */
  evolve(choiceId) {
    if (!this.evolutionReady || !this.evolutionChoices) return false;

    const choice = this.evolutionChoices.find(c => c.id === choiceId);
    if (!choice) return false;

    // 应用进化效果
    switch (choiceId) {
      case 'shadow':
        this.bonusSpeed += 0.04;
        this.bonusAttack += 5;
        this.color = choice.color;
        break;
      case 'void':
        this.maxHP += 100;
        this.hp = this.maxHP;
        this.color = choice.color;
        break;
      case 'abyss':
        this.attack = Math.floor(this.attack * 1.8);
        this.attackRange *= 1.3;
        this.color = choice.color;
        break;
      case 'corruption':
        this.bonusAttack += 10;
        this.color = choice.color;
        break;
      case 'darkness':
        this.attackSpeed *= 0.5;
        this.rollDuration *= 1.5;
        this.color = choice.color;
        break;
    }

    // 重置染黑状态，可以再次收集
    this.evolutionReady = false;
    this.evolutionChoices = null;
    for (const part in this.blackenedParts) {
      this.blackenedParts[part] = 0;
    }
    this.darkness = 0;

    return true;
  }

  /**
   * 获取部位染黑程度
   */
  getBlackenedParts() {
    return this.blackenedParts;
  }

  /**
   * 获取状态
   */
  getState() {
    return {
      x: this.x,
      y: this.y,
      hp: this.hp,
      maxHP: this.maxHP,
      level: this.level,
      exp: this.exp,
      expToNextLevel: this.expToNextLevel,
      isMoving: this.isMoving,
      isAttacking: this.isAttacking,
      isRolling: this.isRolling,
      invincible: this.invincible
    };
  }
}

export default Player;
