/**
 * 地牢游戏主引擎
 * Minecraft Dungeons 风格的等轴测动作游戏
 * 弹幕射击 + 火柴人风格
 */
import IsometricRenderer from './IsometricRenderer.js';
import DungeonGenerator from '../dungeon/DungeonGenerator.js';
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import CombatManager from '../combat/CombatManager.js';
import ItemManager from '../items/ItemManager.js';
import ProjectileManager from '../combat/ProjectileManager.js';
import StickFigure from '../entities/StickFigure.js';
import ParasiteManager from '../combat/ParasiteManager.js';
import CollisionManager from '../combat/CollisionManager.js';

class DungeonGame {
  constructor() {
    // 画布
    this.canvas = null;
    this.ctx = null;
    this.screenWidth = 0;
    this.screenHeight = 0;

    // 模块
    this.renderer = new IsometricRenderer();
    this.dungeonGenerator = new DungeonGenerator();
    this.combatManager = new CombatManager();
    this.itemManager = new ItemManager();
    this.projectileManager = new ProjectileManager();
    this.parasiteManager = new ParasiteManager();
    this.collisionManager = new CollisionManager();

    // 火柴人渲染器
    this.playerStickFigure = new StickFigure('#FF8800'); // 橙色火柴人（Alan Becker风格）
    this.enemyStickFigures = new Map();

    // 游戏对象
    this.player = null;
    this.enemies = [];
    this.dungeon = null;

    // 输入状态
    this.joystick = {
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      radius: 60,
      // 存储当前方向和力度，用于持续移动
      dirX: 0,
      dirY: 0,
      strength: 0
    };

    // 攻击输入状态
    this.attackInput = {
      active: false,
      touchId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      holdTime: 0,           // 按住时间
      isHolding: false,      // 是否长按中
      isDragging: false,     // 是否滑动中
      autoAttackInterval: 300, // 自动攻击间隔
      autoAttackTimer: 0,
      dragThreshold: 20      // 滑动阈值
    };

    // 游戏状态
    this.gameState = 'playing'; // playing, paused, gameover, victory
    this.currentFloor = 1;
    this.killCount = 0;
    this.coins = 0;

    // 时间
    this.lastTime = 0;
    this.deltaTime = 0;

    // UI区域
    this.attackButton = null;
    this.rollButton = null;
  }

  /**
   * 初始化游戏
   */
  init() {
    // 创建画布
    this.canvas = wx.createCanvas();
    this.ctx = this.canvas.getContext('2d');

    // 获取屏幕尺寸
    const info = wx.getSystemInfoSync();
    this.screenWidth = info.windowWidth;
    this.screenHeight = info.windowHeight;

    this.canvas.width = this.screenWidth * info.pixelRatio;
    this.canvas.height = this.screenHeight * info.pixelRatio;
    this.ctx.scale(info.pixelRatio, info.pixelRatio);

    // 设置渲染器
    this.renderer.setScreenSize(this.screenWidth, this.screenHeight);

    // 绑定输入
    this.bindInput();

    // 设置战斗回调
    this.combatManager.onEnemyKilled = (enemy) => {
      this.killCount++;
      // 激活死亡火柴人的布娃娃
      const stickFigure = this.enemyStickFigures.get(enemy);
      if (stickFigure) {
        const impactAngle = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
        stickFigure.activateRagdoll(stickFigure.getAnimatedBones('idle', 0), impactAngle, 8);

        // 添加尸体碰撞体
        const corpseIndex = this.collisionManager.corpses.length;
        this.collisionManager.addCorpse(enemy.x, enemy.y, 0.4);
        // 存储碰撞索引用于更新位置
        stickFigure.corpseCollisionIndex = corpseIndex;
      }
    };

    // 设置弹幕回调
    this.projectileManager.onEnemyHit = (enemy, damage, projectile) => {
      this.combatManager.showDamageNumber(enemy.x, enemy.y, damage, '#FFD700');
      if (enemy.isDead() && this.combatManager.onEnemyKilled) {
        this.combatManager.onEnemyKilled(enemy);
      }
    };

    this.projectileManager.onPlayerHit = (player, damage, projectile) => {
      this.combatManager.showDamageNumber(player.x, player.y, damage, '#FF4444');
    };

    // 生成第一层地牢
    this.generateNewFloor();

    // 开始游戏循环
    this.lastTime = Date.now();
    this.gameLoop();

    console.log('[DungeonGame] 游戏初始化完成');
  }

  /**
   * 生成新楼层
   */
  generateNewFloor() {
    // 生成地牢
    this.dungeon = this.dungeonGenerator.generate({
      width: 40 + this.currentFloor * 5,
      height: 40 + this.currentFloor * 5,
      roomCount: 6 + this.currentFloor,
      minRoomSize: 5,
      maxRoomSize: 10,
      seed: Date.now()
    });

    // 创建玩家
    if (!this.player) {
      this.player = new Player(
        this.dungeon.spawnPoint.x,
        this.dungeon.spawnPoint.y
      );
    } else {
      // 保留玩家属性，更新位置
      this.player.x = this.dungeon.spawnPoint.x;
      this.player.y = this.dungeon.spawnPoint.y;
      this.player.hp = this.player.maxHP; // 回满血
    }

    // 生成敌人
    this.enemies = [];
    for (const spawn of this.dungeon.enemySpawns) {
      const enemy = new Enemy(spawn.x, spawn.y, spawn.type);
      // 根据楼层增强敌人
      enemy.maxHP = Math.floor(enemy.maxHP * (1 + this.currentFloor * 0.2));
      enemy.hp = enemy.maxHP;
      enemy.attack = Math.floor(enemy.attack * (1 + this.currentFloor * 0.15));
      this.enemies.push(enemy);
    }

    // 设置相机
    this.renderer.setCamera(this.player.x, this.player.y);

    // 清理物品
    this.itemManager.clear();
    this.combatManager.clear();
    this.projectileManager.clear();
    this.parasiteManager.clear();
    this.collisionManager.clear();
    this.enemyStickFigures.clear();

    // 生成墙壁实体
    this.generateWallEntities();

    // 重置玩家火柴人
    this.playerStickFigure.reset();
  }

  /**
   * 生成墙壁实体（房间内的装饰/障碍物）
   */
  generateWallEntities() {
    const rooms = this.dungeon.rooms;

    for (let i = 1; i < rooms.length; i++) {
      const room = rooms[i];

      // 跳过太小的房间
      if (room.width < 6 || room.height < 6) continue;

      // 30% 概率生成墙壁实体
      if (Math.random() < 0.3) {
        // 在房间中央生成短墙或柱子
        const wallType = Math.random();

        if (wallType < 0.5) {
          // 水平短墙
          const wallX = room.x + 2;
          const wallY = room.centerY;
          const wallLength = Math.min(room.width - 4, 3 + Math.floor(Math.random() * 2));
          this.collisionManager.addWall(wallX, wallY, wallX + wallLength, wallY, 0.3);
        } else {
          // 柱子（矩形）
          const pillarX = room.centerX - 0.4 + (Math.random() - 0.5) * 2;
          const pillarY = room.centerY - 0.4 + (Math.random() - 0.5) * 2;
          this.collisionManager.addRectWall(pillarX, pillarY, 0.8, 0.8);
        }
      }

      // 大房间可能有多个障碍物
      if (room.width >= 8 && room.height >= 8 && Math.random() < 0.4) {
        // 角落柱子
        const corners = [
          { x: room.x + 1.5, y: room.y + 1.5 },
          { x: room.x + room.width - 2, y: room.y + 1.5 },
          { x: room.x + 1.5, y: room.y + room.height - 2 },
          { x: room.x + room.width - 2, y: room.y + room.height - 2 }
        ];

        // 随机选择1-2个角落放柱子
        const selectedCorners = corners.sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2));
        for (const corner of selectedCorners) {
          this.collisionManager.addRectWall(corner.x, corner.y, 0.6, 0.6);
        }
      }
    }
  }

  /**
   * 绑定输入事件
   */
  bindInput() {
    wx.onTouchStart((e) => {
      for (const touch of e.touches) {
        this.handleTouchStart(touch.identifier, touch.clientX, touch.clientY);
      }
    });

    wx.onTouchMove((e) => {
      for (const touch of e.touches) {
        this.handleTouchMove(touch.identifier, touch.clientX, touch.clientY);
      }
    });

    wx.onTouchEnd((e) => {
      for (const touch of e.changedTouches) {
        this.handleTouchEnd(touch.identifier, touch.clientX, touch.clientY);
      }
    });
  }

  /**
   * 处理触摸开始
   */
  handleTouchStart(id, x, y) {
    // 进化选择界面
    if (this.gameState === 'evolution') {
      this.handleEvolutionTouch(x, y);
      return;
    }

    // 检查攻击按钮（支持长按和滑动）
    if (this.attackButton && this.isInCircle(x, y, this.attackButton)) {
      this.attackInput.active = true;
      this.attackInput.touchId = id;
      this.attackInput.startX = x;
      this.attackInput.startY = y;
      this.attackInput.currentX = x;
      this.attackInput.currentY = y;
      this.attackInput.holdTime = 0;
      this.attackInput.isHolding = true;
      this.attackInput.isDragging = false;
      this.attackInput.autoAttackTimer = 0;
      // 立即攻击一次
      this.performAttack();
      return;
    }

    // 检查翻滚按钮
    if (this.rollButton && this.isInCircle(x, y, this.rollButton)) {
      if (this.joystick.active) {
        const dx = this.joystick.currentX - this.joystick.startX;
        const dy = this.joystick.currentY - this.joystick.startY;
        // 使用修正后的坐标转换
        const worldDirX = (dx + dy) * 0.7071;
        const worldDirY = (dy - dx) * 0.7071;
        this.player.roll(worldDirX, worldDirY);
      } else {
        // 没有摇杆输入时使用面朝方向
        this.player.roll(Math.cos(this.player.facingAngle), Math.sin(this.player.facingAngle));
      }
      return;
    }

    // 左半屏幕是摇杆
    if (x < this.screenWidth * 0.5) {
      this.joystick.active = true;
      this.joystick.startX = x;
      this.joystick.startY = y;
      this.joystick.currentX = x;
      this.joystick.currentY = y;
      this.joystick.touchId = id;
      // 初始化方向为零（刚触摸时还没有移动）
      this.joystick.dirX = 0;
      this.joystick.dirY = 0;
      this.joystick.strength = 0;
    }
  }

  /**
   * 处理触摸移动
   */
  handleTouchMove(id, x, y) {
    // 攻击按钮滑动
    if (this.attackInput.active && this.attackInput.touchId === id) {
      this.attackInput.currentX = x;
      this.attackInput.currentY = y;

      const dx = x - this.attackInput.startX;
      const dy = y - this.attackInput.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 判断是否开始滑动
      if (dist > this.attackInput.dragThreshold) {
        this.attackInput.isDragging = true;
        // 滑动时设置攻击方向（使用修正后的坐标转换）
        const worldDirX = (dx + dy) * 0.7071;
        const worldDirY = (dy - dx) * 0.7071;
        this.player.facingAngle = Math.atan2(worldDirY, worldDirX);
      }
      return;
    }

    // 移动摇杆
    if (this.joystick.active && this.joystick.touchId === id) {
      this.joystick.currentX = x;
      this.joystick.currentY = y;
      this.updateJoystickDirection();
    }
  }

  /**
   * 更新摇杆方向（存储方向供持续移动使用）
   */
  updateJoystickDirection() {
    const dx = this.joystick.currentX - this.joystick.startX;
    const dy = this.joystick.currentY - this.joystick.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      // 等轴测坐标转换
      const worldDirX = (dx + dy) * 0.7071;
      const worldDirY = (dy - dx) * 0.7071;

      // 归一化
      const worldDist = Math.sqrt(worldDirX * worldDirX + worldDirY * worldDirY);
      if (worldDist > 0) {
        this.joystick.dirX = worldDirX / worldDist;
        this.joystick.dirY = worldDirY / worldDist;
        this.joystick.strength = Math.min(dist / this.joystick.radius, 1);
      }
    } else {
      this.joystick.dirX = 0;
      this.joystick.dirY = 0;
      this.joystick.strength = 0;
    }
  }

  /**
   * 应用摇杆输入（在update中持续调用）
   */
  applyJoystickInput() {
    if (!this.joystick.active || this.joystick.strength === 0) return;

    const targetX = this.player.x + this.joystick.dirX * this.joystick.strength * 0.15;
    const targetY = this.player.y + this.joystick.dirY * this.joystick.strength * 0.15;

    this.player.setMoveTarget(targetX, targetY);
  }

  /**
   * 处理触摸结束
   */
  handleTouchEnd(id, x, y) {
    // 攻击按钮松开
    if (this.attackInput.touchId === id) {
      // 如果是滑动攻击，松开时执行一次攻击
      if (this.attackInput.isDragging) {
        this.performAttack();
      }
      this.attackInput.active = false;
      this.attackInput.isHolding = false;
      this.attackInput.isDragging = false;
      this.attackInput.touchId = null;
    }

    // 摇杆松开
    if (this.joystick.touchId === id) {
      this.joystick.active = false;
      this.joystick.dirX = 0;
      this.joystick.dirY = 0;
      this.joystick.strength = 0;
      this.player.isMoving = false;
    }
  }

  /**
   * 执行攻击（发射弹幕，自动瞄准最近敌人或使用当前朝向）
   */
  performAttack() {
    // 检查攻击冷却
    if (this.player.attackCooldown > 0) return;

    // 如果不是滑动状态，自动瞄准最近的敌人
    if (!this.attackInput.isDragging) {
      const nearestEnemy = this.findNearestEnemy();
      if (nearestEnemy) {
        const dx = nearestEnemy.x - this.player.x;
        const dy = nearestEnemy.y - this.player.y;
        this.player.facingAngle = Math.atan2(dy, dx);
      }
    }

    // 发射弹幕
    this.projectileManager.firePlayerProjectile(this.player, {
      damage: this.player.calculateDamage(),
      speed: 0.4,
      maxRange: 15,
      color: '#FFD700'
    });

    // 设置攻击冷却和动画状态
    this.player.attackCooldown = this.player.attackSpeed;
    this.player.isAttacking = true;
    this.player.attackAnimation = 150;
  }

  /**
   * 查找最近的敌人
   */
  findNearestEnemy() {
    let nearest = null;
    let nearestDist = Infinity;
    const maxAutoAimRange = 8; // 自动瞄准范围

    for (const enemy of this.enemies) {
      if (enemy.isDead()) continue;

      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < nearestDist && dist <= maxAutoAimRange) {
        nearestDist = dist;
        nearest = enemy;
      }
    }

    return nearest;
  }

  /**
   * 更新攻击输入（用于长按自动攻击）
   */
  updateAttackInput() {
    if (!this.attackInput.isHolding) return;

    this.attackInput.holdTime += this.deltaTime;
    this.attackInput.autoAttackTimer += this.deltaTime;

    // 长按时自动连续攻击
    if (this.attackInput.autoAttackTimer >= this.attackInput.autoAttackInterval) {
      this.attackInput.autoAttackTimer = 0;
      this.performAttack();
    }
  }

  /**
   * 检查点是否在圆内
   */
  isInCircle(x, y, circle) {
    const dx = x - circle.x;
    const dy = y - circle.y;
    return dx * dx + dy * dy <= circle.radius * circle.radius;
  }

  /**
   * 游戏主循环
   */
  gameLoop() {
    const now = Date.now();
    this.deltaTime = Math.min(now - this.lastTime, 50);
    this.lastTime = now;

    this.update();
    this.render();

    requestAnimationFrame(() => this.gameLoop());
  }

  /**
   * 更新游戏逻辑
   */
  update() {
    if (this.gameState !== 'playing') return;

    // 持续应用摇杆输入（修复：即使不滑动也能持续移动）
    this.applyJoystickInput();

    // 更新攻击输入（长按自动攻击）
    this.updateAttackInput();

    // 更新玩家（传入碰撞管理器）
    this.player.update(this.deltaTime, this.dungeonGenerator, this.collisionManager);

    // 更新玩家火柴人动画
    this.playerStickFigure.update(this.deltaTime, {
      isMoving: this.player.isMoving,
      isRunning: this.player.isMoving && this.joystick.active,
      isAttacking: false, // 弹幕攻击不需要近战动画
      isShooting: this.player.isAttacking,
      isRolling: this.player.isRolling,
      isDead: this.player.isDead(),
      isHit: this.player.invincible && this.player.invincibleTimer > 400
    });

    // 更新敌人
    for (const enemy of this.enemies) {
      if (!enemy.isDead()) {
        enemy.update(this.deltaTime, this.player, this.dungeonGenerator, this.collisionManager);
      }

      // 更新敌人火柴人动画
      let stickFigure = this.enemyStickFigures.get(enemy);
      if (!stickFigure) {
        stickFigure = new StickFigure(enemy.color);
        // 尸体蜷缩后产生寄生虫和经验球（直接在敌人位置）
        stickFigure.onExpReady = () => {
          // 在敌人位置产生一些寄生虫
          this.parasiteManager.addParasiteSource(enemy.x, enemy.y, 15 + (enemy.expReward || 10) * 0.2);

          // 在敌人位置产生像素风经验球
          this.itemManager.addDrop({
            type: 'exp',
            x: enemy.x,
            y: enemy.y,
            value: enemy.expReward || 10
          });
        };
        // 断裂处喷射寄生虫（offsetX/Y 已经是世界坐标偏移）
        stickFigure.onDustSpray = (worldOffsetX, worldOffsetY, amount, angle, force) => {
          const spawnX = enemy.x + worldOffsetX;
          const spawnY = enemy.y + worldOffsetY;
          this.parasiteManager.sprayParasiteAt(spawnX, spawnY, amount, angle, force);
        };
        this.enemyStickFigures.set(enemy, stickFigure);
      }
      stickFigure.update(this.deltaTime, {
        isMoving: enemy.state === 'chase' || enemy.state === 'patrol',
        isAttacking: enemy.isAttacking,
        isDead: enemy.isDead(),
        isHit: enemy.hitFlash > 0
      });

      // 更新尸体碰撞位置（跟随两半身体的中心）
      if (stickFigure.isDying && stickFigure.corpseCollisionIndex !== undefined) {
        const corpseIndex = stickFigure.corpseCollisionIndex;
        if (stickFigure.upperHalf && stickFigure.lowerHalf) {
          // 尸体位置为两半的中心
          const corpseX = enemy.x + (stickFigure.upperHalf.x + stickFigure.lowerHalf.x) / 2 * 0.03;
          const corpseY = enemy.y + (stickFigure.upperHalf.y + stickFigure.lowerHalf.y) / 2 * 0.03;
          this.collisionManager.updateCorpsePosition(corpseIndex, corpseX, corpseY);
        }
      }
    }

    // 清理已完全转化为经验的敌人
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const stickFigure = this.enemyStickFigures.get(enemy);
      if (stickFigure && stickFigure.isFullyConverted()) {
        this.enemyStickFigures.delete(enemy);
        this.enemies.splice(i, 1);
      }
    }

    // 更新弹幕（代替近战战斗判定）
    this.projectileManager.update(
      this.deltaTime,
      this.dungeonGenerator,
      this.player,
      this.enemies
    );

    // 处理敌人近战攻击（敌人仍然可以近战）
    this.combatManager.processEnemyAttacks(this.enemies, this.player);
    this.combatManager.update(this.deltaTime);

    // 更新碰撞管理器（尸体消失等）
    this.collisionManager.update(this.deltaTime);

    // 更新物品
    this.itemManager.update(this.deltaTime, this.player);

    // 更新寄生虫并检测收集
    const collectedParasites = this.parasiteManager.update(this.deltaTime, this.player);
    if (collectedParasites > 0) {
      this.player.collectDust(collectedParasites); // 复用染黑逻辑
    }

    // 相机跟随
    this.renderer.followTarget(this.player.x, this.player.y, 0.08);

    // 检查游戏状态
    this.checkGameState();

    // 检查进化状态
    if (this.player.evolutionReady) {
      this.gameState = 'evolution';
    }
  }

  /**
   * 检查游戏状态
   */
  checkGameState() {
    // 玩家死亡
    if (this.player.isDead()) {
      this.gameState = 'gameover';
      return;
    }

    // 检查是否到达出口
    const exitDist = Math.sqrt(
      Math.pow(this.player.x - this.dungeon.exitPoint.x, 2) +
      Math.pow(this.player.y - this.dungeon.exitPoint.y, 2)
    );

    // 清除所有敌人后可以进入下一层
    const aliveEnemies = this.enemies.filter(e => !e.isDead()).length;
    if (exitDist < 1.0 && aliveEnemies === 0) {
      this.currentFloor++;
      this.generateNewFloor();
    }
  }

  /**
   * 渲染画面
   */
  render() {
    const ctx = this.ctx;

    // 清空画布
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    // 渲染地牢
    this.renderDungeon();

    // 渲染墙壁实体
    this.renderWallEntities();

    // 渲染实体（按深度排序）
    this.renderEntities();

    // 渲染弹幕
    this.projectileManager.render(ctx, this.renderer);

    // 渲染特效
    this.combatManager.renderEffects(ctx, this.renderer);

    // 渲染物品
    this.itemManager.render(ctx, this.renderer);

    // 渲染寄生虫
    this.parasiteManager.render(ctx, this.renderer);

    // 渲染伤害数字
    this.combatManager.renderDamageNumbers(ctx, this.renderer);

    // 渲染UI
    this.renderUI();

    // 渲染进化选择界面
    if (this.gameState === 'evolution') {
      this.renderEvolutionUI();
    }
  }

  /**
   * 渲染地牢
   */
  renderDungeon() {
    const ctx = this.ctx;
    const map = this.dungeon.map;
    const gen = this.dungeonGenerator;

    // 计算可见范围
    const viewRange = 15;
    const playerTileX = Math.floor(this.player.x);
    const playerTileY = Math.floor(this.player.y);

    // 按深度顺序渲染（从远到近）
    for (let y = playerTileY - viewRange; y <= playerTileY + viewRange; y++) {
      for (let x = playerTileX - viewRange; x <= playerTileX + viewRange; x++) {
        if (!gen.isValid(x, y)) continue;

        const tile = map[y][x];
        if (tile === gen.TILE.VOID) continue;

        const color = gen.getTileColor(tile);

        // 渲染地面
        this.renderer.drawTile(ctx, x, y, color);

        // 渲染墙壁（有高度）
        if (tile === gen.TILE.WALL) {
          const colors = gen.getWallColors(tile);
          this.renderer.drawBlock(ctx, x, y, 20, colors.top, colors.left, colors.right);
        }

        // 出口特殊标记
        if (tile === gen.TILE.EXIT) {
          const pos = this.renderer.worldToScreen(x, y, 0);
          ctx.fillStyle = '#7a4a7a';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('出口', pos.x, pos.y - 20);
        }
      }
    }
  }

  /**
   * 渲染墙壁实体（柱子、短墙等障碍物）
   */
  renderWallEntities() {
    const ctx = this.ctx;

    for (const wall of this.collisionManager.walls) {
      if (wall.type === 'rect') {
        // 渲染矩形墙壁/柱子（使用等轴测3D方块）
        const blockHeight = 15;

        // 顶面
        const topColor = '#5a5a6a';
        const leftColor = '#3a3a4a';
        const rightColor = '#454555';

        this.renderer.drawBlock(ctx, wall.x + wall.width / 2, wall.y + wall.height / 2,
          blockHeight, topColor, leftColor, rightColor);
      } else {
        // 渲染线段墙壁
        const pos1 = this.renderer.worldToScreen(wall.x1, wall.y1, 0);
        const pos2 = this.renderer.worldToScreen(wall.x2, wall.y2, 0);
        const height = 12 * this.renderer.zoom;

        // 墙壁侧面
        ctx.fillStyle = '#3a3a4a';
        ctx.beginPath();
        ctx.moveTo(pos1.x, pos1.y);
        ctx.lineTo(pos2.x, pos2.y);
        ctx.lineTo(pos2.x, pos2.y - height);
        ctx.lineTo(pos1.x, pos1.y - height);
        ctx.closePath();
        ctx.fill();

        // 墙壁顶面
        ctx.fillStyle = '#5a5a6a';
        ctx.beginPath();
        const topOffset = 3 * this.renderer.zoom;
        ctx.moveTo(pos1.x, pos1.y - height);
        ctx.lineTo(pos2.x, pos2.y - height);
        ctx.lineTo(pos2.x + topOffset, pos2.y - height - topOffset * 0.5);
        ctx.lineTo(pos1.x + topOffset, pos1.y - height - topOffset * 0.5);
        ctx.closePath();
        ctx.fill();

        // 边框
        ctx.strokeStyle = '#2a2a3a';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  /**
   * 渲染实体
   */
  renderEntities() {
    const ctx = this.ctx;

    // 收集所有需要渲染的实体
    const entities = [];

    // 添加玩家
    entities.push({
      type: 'player',
      entity: this.player,
      depth: this.renderer.getDepth(this.player.x, this.player.y)
    });

    // 添加敌人（包括死亡中的敌人，用于显示死亡动画）
    for (const enemy of this.enemies) {
      const stickFigure = this.enemyStickFigures.get(enemy);
      // 活着的敌人，或者死亡但动画未完成的敌人都需要渲染
      const shouldRender = !enemy.isDead() || (stickFigure && !stickFigure.isFullyConverted());
      if (shouldRender) {
        entities.push({
          type: 'enemy',
          entity: enemy,
          depth: this.renderer.getDepth(enemy.x, enemy.y)
        });
      }
    }

    // 按深度排序
    entities.sort((a, b) => a.depth - b.depth);

    // 渲染实体
    for (const item of entities) {
      if (item.type === 'player') {
        this.renderPlayer(ctx);
      } else if (item.type === 'enemy') {
        this.renderEnemy(ctx, item.entity);
      }
    }
  }

  /**
   * 渲染玩家
   */
  renderPlayer(ctx) {
    const p = this.player;

    // 闪烁效果（无敌状态）
    if (p.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
      return;
    }

    // 获取屏幕坐标
    const pos = this.renderer.worldToScreen(p.x, p.y, 0);

    // 判断面朝方向（用于火柴人镜像）
    const facingRight = Math.cos(p.facingAngle) >= 0;

    // 渲染火柴人（带染黑效果）
    const scale = this.renderer.zoom * 0.8;
    this.playerStickFigure.render(ctx, pos.x, pos.y - 15 * scale, scale, facingRight, p.getBlackenedParts());
  }

  /**
   * 渲染敌人
   */
  renderEnemy(ctx, enemy) {
    // 获取屏幕坐标
    const pos = this.renderer.worldToScreen(enemy.x, enemy.y, 0);

    // 获取该敌人的火柴人渲染器
    const stickFigure = this.enemyStickFigures.get(enemy);

    if (stickFigure) {
      // 受击闪白（只有活着时才闪白）
      if (!enemy.isDead() && enemy.hitFlash > 0) {
        stickFigure.setColor('#FFFFFF');
      } else {
        stickFigure.setColor(enemy.color);
      }

      // 判断面朝方向
      const facingRight = Math.cos(enemy.facingAngle || 0) >= 0;

      // 渲染火柴人（敌人稍大一些）
      const scale = this.renderer.zoom * (enemy.type === 'boss' ? 1.2 : enemy.type === 'elite' ? 1.0 : 0.75);
      stickFigure.render(ctx, pos.x, pos.y - 12 * scale, scale, facingRight);
    }

    // 只有活着的敌人才显示血条和标记
    if (!enemy.isDead()) {
      // 绘制血条
      this.renderer.drawHealthBar(ctx, enemy.x, enemy.y, 25, enemy.hp, enemy.maxHP);

      // 精英/Boss标记
      if (enemy.type === 'elite' || enemy.type === 'boss') {
        const labelPos = this.renderer.worldToScreen(enemy.x, enemy.y, 50);
        ctx.fillStyle = enemy.type === 'boss' ? '#F44336' : '#9C27B0';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(enemy.type === 'boss' ? 'BOSS' : '精英', labelPos.x, labelPos.y);
      }
    }
  }

  /**
   * 渲染UI
   */
  renderUI() {
    const ctx = this.ctx;

    // 玩家状态栏
    this.renderPlayerStatus();

    // 虚拟摇杆
    this.renderJoystick();

    // 技能按钮
    this.renderButtons();

    // 小地图
    this.renderMinimap();

    // 游戏结束画面
    if (this.gameState === 'gameover') {
      this.renderGameOver();
    }
  }

  /**
   * 渲染玩家状态
   */
  renderPlayerStatus() {
    const ctx = this.ctx;
    const p = this.player;

    // 背景
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(10, 10, 180, 80);

    // 血条
    ctx.fillStyle = '#333';
    ctx.fillRect(20, 20, 120, 16);
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(20, 20, 120 * (p.hp / p.maxHP), 16);
    ctx.fillStyle = '#FFF';
    ctx.font = '12px sans-serif';
    ctx.fillText(`HP: ${p.hp}/${p.maxHP}`, 145, 33);

    // 寄生度条（替代经验条）
    ctx.fillStyle = '#333';
    ctx.fillRect(20, 42, 120, 10);
    ctx.fillStyle = '#3a1a2a';
    ctx.fillRect(20, 42, 120 * (p.darkness / 100), 10);

    // 寄生度数值
    ctx.fillStyle = '#E57373';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`寄生 ${Math.floor(p.darkness)}%`, 20, 70);

    // 楼层
    ctx.fillStyle = '#FFF';
    ctx.fillText(`地牢 ${this.currentFloor}F`, 80, 70);

    // 击杀数
    ctx.fillText(`击杀: ${this.killCount}`, 140, 70);
  }

  /**
   * 渲染虚拟摇杆
   */
  renderJoystick() {
    const ctx = this.ctx;
    const centerX = 80;
    const centerY = this.screenHeight - 100;
    const outerRadius = 60;
    const innerRadius = 25;

    // 外圈
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 内圈（摇杆位置）
    let stickX = centerX;
    let stickY = centerY;

    if (this.joystick.active) {
      const dx = this.joystick.currentX - this.joystick.startX;
      const dy = this.joystick.currentY - this.joystick.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = outerRadius - innerRadius;

      if (dist > maxDist) {
        stickX = centerX + (dx / dist) * maxDist;
        stickY = centerY + (dy / dist) * maxDist;
      } else {
        stickX = centerX + dx;
        stickY = centerY + dy;
      }
    }

    ctx.beginPath();
    ctx.arc(stickX, stickY, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();
  }

  /**
   * 渲染技能按钮
   */
  renderButtons() {
    const ctx = this.ctx;

    // 攻击按钮
    this.attackButton = {
      x: this.screenWidth - 80,
      y: this.screenHeight - 80,
      radius: 40
    };

    ctx.beginPath();
    ctx.arc(this.attackButton.x, this.attackButton.y, this.attackButton.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.player.attackCooldown > 0 ? 'rgba(200,50,50,0.4)' : 'rgba(200,50,50,0.7)';
    ctx.fill();
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('攻击', this.attackButton.x, this.attackButton.y);

    // 翻滚按钮
    this.rollButton = {
      x: this.screenWidth - 150,
      y: this.screenHeight - 50,
      radius: 30
    };

    ctx.beginPath();
    ctx.arc(this.rollButton.x, this.rollButton.y, this.rollButton.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.player.rollCooldown > 0 ? 'rgba(50,150,200,0.4)' : 'rgba(50,150,200,0.7)';
    ctx.fill();
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('闪避', this.rollButton.x, this.rollButton.y);
  }

  /**
   * 渲染小地图
   */
  renderMinimap() {
    const ctx = this.ctx;
    const mapSize = 100;
    const mapX = this.screenWidth - mapSize - 10;
    const mapY = 10;
    const scale = mapSize / Math.max(this.dungeon.width, this.dungeon.height);

    // 背景
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(mapX, mapY, mapSize, mapSize);

    // 绘制房间
    for (const room of this.dungeon.rooms) {
      ctx.fillStyle = 'rgba(100,100,120,0.8)';
      ctx.fillRect(
        mapX + room.x * scale,
        mapY + room.y * scale,
        room.width * scale,
        room.height * scale
      );
    }

    // 出口
    ctx.fillStyle = '#7a4a7a';
    ctx.fillRect(
      mapX + this.dungeon.exitPoint.x * scale - 2,
      mapY + this.dungeon.exitPoint.y * scale - 2,
      4, 4
    );

    // 玩家位置
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(
      mapX + this.player.x * scale,
      mapY + this.player.y * scale,
      3, 0, Math.PI * 2
    );
    ctx.fill();

    // 敌人位置
    for (const enemy of this.enemies) {
      if (!enemy.isDead()) {
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(
          mapX + enemy.x * scale,
          mapY + enemy.y * scale,
          2, 0, Math.PI * 2
        );
        ctx.fill();
      }
    }
  }

  /**
   * 渲染游戏结束画面
   */
  renderGameOver() {
    const ctx = this.ctx;

    // 遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    // 文字
    ctx.fillStyle = '#F44336';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', this.screenWidth / 2, this.screenHeight / 2 - 50);

    ctx.fillStyle = '#FFF';
    ctx.font = '24px sans-serif';
    ctx.fillText(`到达 ${this.currentFloor} 层`, this.screenWidth / 2, this.screenHeight / 2 + 10);
    ctx.fillText(`击杀 ${this.killCount} 个敌人`, this.screenWidth / 2, this.screenHeight / 2 + 50);

    ctx.font = '18px sans-serif';
    ctx.fillText('点击屏幕重新开始', this.screenWidth / 2, this.screenHeight / 2 + 100);
  }

  /**
   * 渲染进化选择界面
   */
  renderEvolutionUI() {
    const ctx = this.ctx;
    const choices = this.player.evolutionChoices;
    if (!choices) return;

    // 遮罩
    ctx.fillStyle = 'rgba(10, 5, 20, 0.9)';
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    // 标题
    ctx.fillStyle = '#E57373';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('寄生觉醒', this.screenWidth / 2, 60);

    ctx.fillStyle = '#EF9A9A';
    ctx.font = '16px sans-serif';
    ctx.fillText('寄生虫已完全侵蚀你的身体，选择变异形态', this.screenWidth / 2, 90);

    // 保存进化选项按钮位置
    this.evolutionButtons = [];

    // 绘制选项
    const cardWidth = Math.min(280, this.screenWidth * 0.8);
    const cardHeight = 120;
    const startY = 130;
    const gap = 20;

    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      const cardX = (this.screenWidth - cardWidth) / 2;
      const cardY = startY + i * (cardHeight + gap);

      // 保存按钮位置
      this.evolutionButtons.push({
        x: cardX,
        y: cardY,
        width: cardWidth,
        height: cardHeight,
        choiceId: choice.id
      });

      // 卡片背景
      ctx.fillStyle = choice.color;
      ctx.fillRect(cardX, cardY, cardWidth, cardHeight);

      // 边框发光
      ctx.strokeStyle = '#E57373';
      ctx.lineWidth = 2;
      ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

      // 内部渐变
      const gradient = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardHeight);
      gradient.addColorStop(0, 'rgba(229, 115, 115, 0.3)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(cardX, cardY, cardWidth, cardHeight);

      // 名称
      ctx.fillStyle = '#FFCDD2';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(choice.name, cardX + 15, cardY + 35);

      // 描述
      ctx.fillStyle = '#EF9A9A';
      ctx.font = '14px sans-serif';
      ctx.fillText(choice.desc, cardX + 15, cardY + 65);

      // 点击提示
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('点击选择', cardX + cardWidth - 15, cardY + cardHeight - 15);
    }
  }

  /**
   * 处理进化选择点击
   */
  handleEvolutionTouch(x, y) {
    if (this.gameState !== 'evolution' || !this.evolutionButtons) return false;

    for (const btn of this.evolutionButtons) {
      if (x >= btn.x && x <= btn.x + btn.width &&
          y >= btn.y && y <= btn.y + btn.height) {
        // 选择进化
        if (this.player.evolve(btn.choiceId)) {
          this.gameState = 'playing';
          this.evolutionButtons = null;
          return true;
        }
      }
    }
    return false;
  }
}

export default DungeonGame;
