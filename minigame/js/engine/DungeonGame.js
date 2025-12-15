/**
 * 地牢游戏主引擎
 * Minecraft Dungeons 风格的等轴测动作游戏
 */
import IsometricRenderer from './IsometricRenderer.js';
import DungeonGenerator from '../dungeon/DungeonGenerator.js';
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import CombatManager from '../combat/CombatManager.js';
import ItemManager from '../items/ItemManager.js';

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
      radius: 60
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
      const drops = enemy.getDrops();
      this.itemManager.addDrops(drops);
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
      const joyDirX = this.joystick.active ?
        (this.joystick.currentX - this.joystick.startX) / this.joystick.radius : 0;
      const joyDirY = this.joystick.active ?
        (this.joystick.currentY - this.joystick.startY) / this.joystick.radius : 0;
      this.player.roll(joyDirX, joyDirY);
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
        // 滑动时设置攻击方向（转换为世界坐标）
        const worldDirX = (dx - dy) / Math.sqrt(2);
        const worldDirY = (dx + dy) / Math.sqrt(2);
        this.player.facingAngle = Math.atan2(worldDirY, worldDirX);
      }
      return;
    }

    // 移动摇杆
    if (this.joystick.active && this.joystick.touchId === id) {
      this.joystick.currentX = x;
      this.joystick.currentY = y;

      // 计算移动方向
      const dx = x - this.joystick.startX;
      const dy = y - this.joystick.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        // 转换为世界坐标方向（等轴测）
        const worldDirX = (dx - dy) / Math.sqrt(2);
        const worldDirY = (dx + dy) / Math.sqrt(2);

        const targetX = this.player.x + worldDirX * 0.1;
        const targetY = this.player.y + worldDirY * 0.1;

        this.player.setMoveTarget(targetX, targetY);
      }
    }
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
      this.player.isMoving = false;
    }
  }

  /**
   * 执行攻击（自动瞄准最近敌人或使用当前朝向）
   */
  performAttack() {
    // 如果不是滑动状态，自动瞄准最近的敌人
    if (!this.attackInput.isDragging) {
      const nearestEnemy = this.findNearestEnemy();
      if (nearestEnemy) {
        const dx = nearestEnemy.x - this.player.x;
        const dy = nearestEnemy.y - this.player.y;
        this.player.facingAngle = Math.atan2(dy, dx);
      }
    }
    this.player.startAttack();
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

    // 更新攻击输入（长按自动攻击）
    this.updateAttackInput();

    // 更新玩家
    this.player.update(this.deltaTime, this.dungeonGenerator);

    // 更新敌人
    for (const enemy of this.enemies) {
      if (!enemy.isDead()) {
        enemy.update(this.deltaTime, this.player, this.dungeonGenerator);
      }
    }

    // 处理战斗
    this.combatManager.processPlayerAttack(this.player, this.enemies);
    this.combatManager.processEnemyAttacks(this.enemies, this.player);
    this.combatManager.update(this.deltaTime);

    // 更新物品
    this.itemManager.update(this.deltaTime, this.player);

    // 相机跟随
    this.renderer.followTarget(this.player.x, this.player.y, 0.08);

    // 检查游戏状态
    this.checkGameState();
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

    // 渲染实体（按深度排序）
    this.renderEntities();

    // 渲染特效
    this.combatManager.renderEffects(ctx, this.renderer);

    // 渲染物品
    this.itemManager.render(ctx, this.renderer);

    // 渲染伤害数字
    this.combatManager.renderDamageNumbers(ctx, this.renderer);

    // 渲染UI
    this.renderUI();
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

    // 添加敌人
    for (const enemy of this.enemies) {
      if (!enemy.isDead()) {
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

    // 翻滚时变扁
    const scaleY = p.isRolling ? 0.5 : 1.0;

    // 绘制实体
    let color = p.color;
    if (p.isAttacking) {
      color = '#8BC34A'; // 攻击时变色
    }

    this.renderer.drawEntity(ctx, p.x, p.y, p.radius * scaleY, color, 8);

    // 绘制面朝方向指示器
    const pos = this.renderer.worldToScreen(p.x, p.y, 15);
    const indicatorLen = 20 * this.renderer.zoom;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(
      pos.x + Math.cos(p.facingAngle) * indicatorLen,
      pos.y + Math.sin(p.facingAngle) * indicatorLen * 0.5
    );
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  /**
   * 渲染敌人
   */
  renderEnemy(ctx, enemy) {
    // 受击闪白
    let color = enemy.color;
    if (enemy.hitFlash > 0) {
      color = '#FFFFFF';
    }

    // 绘制实体
    this.renderer.drawEntity(ctx, enemy.x, enemy.y, enemy.radius, color, 8);

    // 绘制血条
    this.renderer.drawHealthBar(ctx, enemy.x, enemy.y, 20, enemy.hp, enemy.maxHP);

    // 精英/Boss标记
    if (enemy.type === 'elite' || enemy.type === 'boss') {
      const pos = this.renderer.worldToScreen(enemy.x, enemy.y, 45);
      ctx.fillStyle = enemy.type === 'boss' ? '#F44336' : '#9C27B0';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(enemy.type === 'boss' ? 'BOSS' : '精英', pos.x, pos.y);
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

    // 经验条
    ctx.fillStyle = '#333';
    ctx.fillRect(20, 42, 120, 10);
    ctx.fillStyle = '#9C27B0';
    ctx.fillRect(20, 42, 120 * (p.exp / p.expToNextLevel), 10);

    // 等级
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`Lv.${p.level}`, 20, 70);

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
}

export default DungeonGame;
