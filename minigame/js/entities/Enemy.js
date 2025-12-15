/**
 * 敌人类
 * 处理敌人AI、攻击、移动等
 */
class Enemy {
  constructor(x, y, type = 'normal') {
    // 位置
    this.x = x;
    this.y = y;
    this.spawnX = x;
    this.spawnY = y;

    // 类型
    this.type = type;

    // 根据类型设置属性
    this.initStats(type);

    // AI状态
    this.state = 'idle'; // idle, patrol, chase, attack, retreat
    this.stateTimer = 0;
    this.target = null;

    // 移动
    this.targetX = x;
    this.targetY = y;
    this.facingAngle = Math.random() * Math.PI * 2;

    // 攻击
    this.attackCooldown = 0;
    this.isAttacking = false;
    this.attackAnimation = 0;

    // 受击
    this.hitFlash = 0;
    this.knockbackX = 0;
    this.knockbackY = 0;

    // 掉落
    this.expReward = 20;
    this.dropChance = 0.3;

    // 唯一ID
    this.id = Math.random().toString(36).substr(2, 9);
  }

  /**
   * 根据类型初始化属性
   */
  initStats(type) {
    switch (type) {
      case 'elite':
        this.maxHP = 80;
        this.hp = 80;
        this.attack = 20;
        this.defense = 8;
        this.speed = 0.04;
        this.attackRange = 1.8;
        this.attackSpeed = 1000;
        this.aggroRange = 8;
        this.radius = 16;
        this.color = '#9C27B0';
        this.expReward = 50;
        this.dropChance = 0.6;
        break;

      case 'boss':
        this.maxHP = 300;
        this.hp = 300;
        this.attack = 35;
        this.defense = 15;
        this.speed = 0.03;
        this.attackRange = 2.5;
        this.attackSpeed = 1500;
        this.aggroRange = 12;
        this.radius = 24;
        this.color = '#F44336';
        this.expReward = 200;
        this.dropChance = 1.0;
        break;

      case 'patrol':
        this.maxHP = 30;
        this.hp = 30;
        this.attack = 8;
        this.defense = 2;
        this.speed = 0.05;
        this.attackRange = 1.2;
        this.attackSpeed = 800;
        this.aggroRange = 5;
        this.radius = 10;
        this.color = '#FF9800';
        this.expReward = 15;
        this.dropChance = 0.2;
        this.patrolRadius = 3;
        break;

      case 'ranged':
        this.maxHP = 25;
        this.hp = 25;
        this.attack = 12;
        this.defense = 1;
        this.speed = 0.035;
        this.attackRange = 6;
        this.attackSpeed = 1200;
        this.aggroRange = 8;
        this.radius = 10;
        this.color = '#2196F3';
        this.expReward = 25;
        this.dropChance = 0.25;
        this.isRanged = true;
        this.preferredDistance = 4;
        break;

      default: // normal
        this.maxHP = 40;
        this.hp = 40;
        this.attack = 12;
        this.defense = 3;
        this.speed = 0.045;
        this.attackRange = 1.3;
        this.attackSpeed = 700;
        this.aggroRange = 6;
        this.radius = 12;
        this.color = '#E91E63';
        this.expReward = 20;
        this.dropChance = 0.3;
    }
  }

  /**
   * 更新AI
   */
  update(deltaTime, player, dungeon) {
    // 更新冷却和动画
    if (this.attackCooldown > 0) this.attackCooldown -= deltaTime;
    if (this.attackAnimation > 0) {
      this.attackAnimation -= deltaTime;
      if (this.attackAnimation <= 0) this.isAttacking = false;
    }
    if (this.hitFlash > 0) this.hitFlash -= deltaTime;
    if (this.stateTimer > 0) this.stateTimer -= deltaTime;

    // 处理击退
    if (this.knockbackX !== 0 || this.knockbackY !== 0) {
      const newX = this.x + this.knockbackX * deltaTime * 0.01;
      const newY = this.y + this.knockbackY * deltaTime * 0.01;
      if (dungeon.isWalkable(newX, newY)) {
        this.x = newX;
        this.y = newY;
      }
      this.knockbackX *= 0.9;
      this.knockbackY *= 0.9;
      if (Math.abs(this.knockbackX) < 0.01) this.knockbackX = 0;
      if (Math.abs(this.knockbackY) < 0.01) this.knockbackY = 0;
      return;
    }

    // 计算与玩家的距离
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);

    // AI状态机
    this.updateAI(deltaTime, player, distToPlayer, dungeon);

    // 移动
    this.updateMovement(deltaTime, dungeon);
  }

  /**
   * AI状态机
   */
  updateAI(deltaTime, player, distToPlayer, dungeon) {
    switch (this.state) {
      case 'idle':
        // 检测玩家
        if (distToPlayer <= this.aggroRange) {
          this.state = 'chase';
          this.target = player;
        } else if (this.type === 'patrol' && this.stateTimer <= 0) {
          this.state = 'patrol';
          this.setPatrolTarget();
        }
        break;

      case 'patrol':
        // 巡逻中检测玩家
        if (distToPlayer <= this.aggroRange) {
          this.state = 'chase';
          this.target = player;
        } else {
          // 到达巡逻点
          const patrolDist = Math.sqrt(
            Math.pow(this.targetX - this.x, 2) +
            Math.pow(this.targetY - this.y, 2)
          );
          if (patrolDist < 0.5) {
            this.state = 'idle';
            this.stateTimer = 1000 + Math.random() * 2000;
          }
        }
        break;

      case 'chase':
        // 追击玩家
        if (distToPlayer > this.aggroRange * 1.5) {
          // 脱离追击
          this.state = 'retreat';
          this.target = null;
        } else if (distToPlayer <= this.attackRange) {
          // 进入攻击范围
          this.state = 'attack';
        } else {
          // 继续追击
          if (this.isRanged && distToPlayer <= this.preferredDistance) {
            // 远程敌人保持距离
            this.state = 'attack';
          } else {
            this.targetX = player.x;
            this.targetY = player.y;
          }
        }
        break;

      case 'attack':
        // 攻击状态
        if (distToPlayer > this.attackRange * 1.2 && !this.isRanged) {
          this.state = 'chase';
        } else if (this.isRanged && distToPlayer > this.attackRange) {
          this.state = 'chase';
        } else if (distToPlayer > this.aggroRange * 1.5) {
          this.state = 'retreat';
          this.target = null;
        } else {
          // 面向玩家
          this.facingAngle = Math.atan2(player.y - this.y, player.x - this.x);

          // 尝试攻击
          if (this.attackCooldown <= 0) {
            this.startAttack();
          }
        }
        break;

      case 'retreat':
        // 返回出生点
        this.targetX = this.spawnX;
        this.targetY = this.spawnY;
        const distToSpawn = Math.sqrt(
          Math.pow(this.spawnX - this.x, 2) +
          Math.pow(this.spawnY - this.y, 2)
        );
        if (distToSpawn < 0.5) {
          this.state = 'idle';
          this.hp = Math.min(this.maxHP, this.hp + this.maxHP * 0.1); // 回血
        }
        // 途中再次发现玩家
        if (distToPlayer <= this.aggroRange * 0.8) {
          this.state = 'chase';
          this.target = player;
        }
        break;
    }
  }

  /**
   * 设置巡逻目标点
   */
  setPatrolTarget() {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * (this.patrolRadius || 3);
    this.targetX = this.spawnX + Math.cos(angle) * dist;
    this.targetY = this.spawnY + Math.sin(angle) * dist;
  }

  /**
   * 更新移动
   */
  updateMovement(deltaTime, dungeon) {
    if (this.isAttacking) return;

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0.1) {
      const moveSpeed = this.speed * deltaTime * 0.1;
      const moveX = (dx / dist) * Math.min(moveSpeed, dist);
      const moveY = (dy / dist) * Math.min(moveSpeed, dist);

      const newX = this.x + moveX;
      const newY = this.y + moveY;

      if (dungeon.isWalkable(newX, this.y)) {
        this.x = newX;
      }
      if (dungeon.isWalkable(this.x, newY)) {
        this.y = newY;
      }

      // 更新面朝方向
      if (moveX !== 0 || moveY !== 0) {
        this.facingAngle = Math.atan2(moveY, moveX);
      }
    }
  }

  /**
   * 开始攻击
   */
  startAttack() {
    this.isAttacking = true;
    this.attackAnimation = 300;
    this.attackCooldown = this.attackSpeed;
    return true;
  }

  /**
   * 获取攻击区域
   */
  getAttackArea() {
    return {
      x: this.x + Math.cos(this.facingAngle) * this.attackRange * 0.5,
      y: this.y + Math.sin(this.facingAngle) * this.attackRange * 0.5,
      radius: this.attackRange
    };
  }

  /**
   * 计算伤害
   */
  calculateDamage() {
    const variance = this.attack * 0.15;
    return Math.floor(this.attack + (Math.random() - 0.5) * 2 * variance);
  }

  /**
   * 受到伤害
   */
  takeDamage(damage, knockbackAngle = null) {
    const actualDamage = Math.max(1, damage - this.defense);
    this.hp -= actualDamage;
    this.hitFlash = 150;

    // 击退
    if (knockbackAngle !== null) {
      const knockbackForce = 5;
      this.knockbackX = Math.cos(knockbackAngle) * knockbackForce;
      this.knockbackY = Math.sin(knockbackAngle) * knockbackForce;
    }

    // 被攻击后立即进入追击状态
    if (this.state === 'idle' || this.state === 'patrol') {
      this.state = 'chase';
    }

    return actualDamage;
  }

  /**
   * 是否死亡
   */
  isDead() {
    return this.hp <= 0;
  }

  /**
   * 获取掉落物
   */
  getDrops() {
    const drops = [];

    // 经验
    drops.push({
      type: 'exp',
      value: this.expReward,
      x: this.x,
      y: this.y
    });

    // 物品掉落
    if (Math.random() < this.dropChance) {
      const itemType = Math.random();
      if (itemType < 0.5) {
        drops.push({
          type: 'health',
          value: 20,
          x: this.x + (Math.random() - 0.5),
          y: this.y + (Math.random() - 0.5)
        });
      } else if (itemType < 0.8) {
        drops.push({
          type: 'coin',
          value: 10 + Math.floor(Math.random() * 20),
          x: this.x + (Math.random() - 0.5),
          y: this.y + (Math.random() - 0.5)
        });
      } else {
        drops.push({
          type: 'equipment',
          rarity: this.type === 'boss' ? 'rare' : this.type === 'elite' ? 'uncommon' : 'common',
          x: this.x + (Math.random() - 0.5),
          y: this.y + (Math.random() - 0.5)
        });
      }
    }

    return drops;
  }
}

export default Enemy;
