/**
 * 玄牢志 - 以撒风格版本
 * 实时动作Roguelike
 */

// ==================== Canvas ====================
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

// ==================== 常量 ====================
const ROOM_W = W;
const ROOM_H = H - 100; // 留出HUD空间
const TILE_SIZE = 40;
const PLAYER_SIZE = 30;
const TEAR_SIZE = 10;
const ENEMY_SIZE = 28;

const COLORS = {
  bg: '#1a1a2e',
  floor: '#2a2a3e',
  wall: '#4a4a5e',
  door: '#6a6a8e',
  doorOpen: '#8aaa6e',
  player: '#ffdd44',
  tear: '#88ccff',
  enemyNormal: '#ff6666',
  enemyFly: '#aa66ff',
  enemyBoss: '#ff4444',
  hp: '#ff4444',
  hpBg: '#333',
  gold: '#ffd700',
  item: '#44ff88'
};

// ==================== 游戏状态 ====================
let gameState = 'menu'; // menu, playing, paused, gameover, victory
let game = null;

// ==================== 输入 ====================
const keys = {
  up: false, down: false, left: false, right: false,
  shootUp: false, shootDown: false, shootLeft: false, shootRight: false
};
const touch = { x: 0, y: 0, active: false, tap: false };

// ==================== 玩家类 ====================
class Player {
  constructor() {
    this.x = ROOM_W / 2;
    this.y = ROOM_H / 2;
    this.vx = 0;
    this.vy = 0;
    this.speed = 3;
    this.hp = 6; // 3颗心
    this.maxHp = 6;
    this.damage = 1;
    this.tearSpeed = 8;
    this.fireRate = 0.4; // 秒
    this.fireCooldown = 0;
    this.range = 300;
    this.invincible = 0;
    this.coins = 0;
    this.bombs = 1;
    this.keys = 0;
    this.items = [];
  }

  update(dt) {
    // 移动
    this.vx = 0;
    this.vy = 0;
    if (keys.up) this.vy = -this.speed;
    if (keys.down) this.vy = this.speed;
    if (keys.left) this.vx = -this.speed;
    if (keys.right) this.vx = this.speed;

    // 对角线移动标准化
    if (this.vx !== 0 && this.vy !== 0) {
      this.vx *= 0.707;
      this.vy *= 0.707;
    }

    // 更新位置
    const newX = this.x + this.vx;
    const newY = this.y + this.vy;

    // 墙壁碰撞
    const margin = PLAYER_SIZE / 2 + 10;
    if (newX > margin && newX < ROOM_W - margin) this.x = newX;
    if (newY > margin && newY < ROOM_H - margin) this.y = newY;

    // 射击冷却
    if (this.fireCooldown > 0) this.fireCooldown -= dt;

    // 无敌帧
    if (this.invincible > 0) this.invincible -= dt;

    // 射击
    if (this.fireCooldown <= 0) {
      let sx = 0, sy = 0;
      if (keys.shootUp) sy = -1;
      else if (keys.shootDown) sy = 1;
      else if (keys.shootLeft) sx = -1;
      else if (keys.shootRight) sx = 1;

      if (sx !== 0 || sy !== 0) {
        this.shoot(sx, sy);
        this.fireCooldown = this.fireRate;
      }
    }
  }

  shoot(dx, dy) {
    game.tears.push(new Tear(
      this.x, this.y,
      dx * this.tearSpeed, dy * this.tearSpeed,
      this.damage, this.range
    ));
  }

  takeDamage(amount) {
    if (this.invincible > 0) return;
    this.hp -= amount;
    this.invincible = 1.5; // 1.5秒无敌
    if (this.hp <= 0) {
      gameState = 'gameover';
    }
  }

  draw() {
    ctx.save();

    // 无敌闪烁
    if (this.invincible > 0 && Math.floor(this.invincible * 10) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // 身体
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(this.x, this.y, PLAYER_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(this.x - 6, this.y - 3, 4, 0, Math.PI * 2);
    ctx.arc(this.x + 6, this.y - 3, 4, 0, Math.PI * 2);
    ctx.fill();

    // 眼泪
    ctx.fillStyle = '#88ccff';
    ctx.beginPath();
    ctx.arc(this.x - 6, this.y + 8, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ==================== 眼泪(子弹)类 ====================
class Tear {
  constructor(x, y, vx, vy, damage, range) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.range = range;
    this.traveled = 0;
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx;
    this.y += this.vy;
    this.traveled += Math.sqrt(this.vx * this.vx + this.vy * this.vy);

    // 超出范围
    if (this.traveled > this.range) {
      this.dead = true;
    }

    // 墙壁碰撞
    if (this.x < 20 || this.x > ROOM_W - 20 || this.y < 20 || this.y > ROOM_H - 20) {
      this.dead = true;
    }
  }

  draw() {
    ctx.fillStyle = COLORS.tear;
    ctx.beginPath();
    ctx.arc(this.x, this.y, TEAR_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(this.x - 2, this.y - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ==================== 敌人基类 ====================
class Enemy {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.vx = 0;
    this.vy = 0;
    this.hp = 3;
    this.damage = 1;
    this.speed = 1.5;
    this.dead = false;
    this.flash = 0;

    // 根据类型设置属性
    switch (type) {
      case 'fly':
        this.hp = 2;
        this.speed = 2;
        this.damage = 1;
        break;
      case 'crawler':
        this.hp = 4;
        this.speed = 1;
        this.damage = 1;
        break;
      case 'shooter':
        this.hp = 3;
        this.speed = 0.8;
        this.damage = 1;
        this.shootCooldown = 2;
        this.shootTimer = Math.random() * 2;
        break;
      case 'boss':
        this.hp = 30;
        this.speed = 1.2;
        this.damage = 2;
        this.shootCooldown = 1.5;
        this.shootTimer = 0;
        this.phase = 1;
        break;
    }
    this.maxHp = this.hp;
  }

  update(dt, player) {
    if (this.flash > 0) this.flash -= dt;

    // AI行为
    switch (this.type) {
      case 'fly':
        this.flyAI(player);
        break;
      case 'crawler':
        this.crawlerAI(player);
        break;
      case 'shooter':
        this.shooterAI(player, dt);
        break;
      case 'boss':
        this.bossAI(player, dt);
        break;
    }

    // 移动
    this.x += this.vx;
    this.y += this.vy;

    // 墙壁碰撞
    const margin = ENEMY_SIZE / 2 + 10;
    this.x = Math.max(margin, Math.min(ROOM_W - margin, this.x));
    this.y = Math.max(margin, Math.min(ROOM_H - margin, this.y));
  }

  flyAI(player) {
    // 飞向玩家
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      this.vx = (dx / dist) * this.speed;
      this.vy = (dy / dist) * this.speed;
    }
  }

  crawlerAI(player) {
    // 缓慢爬向玩家
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      this.vx = (dx / dist) * this.speed;
      this.vy = (dy / dist) * this.speed;
    }
  }

  shooterAI(player, dt) {
    // 保持距离并射击
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 150) {
      this.vx = (dx / dist) * this.speed;
      this.vy = (dy / dist) * this.speed;
    } else if (dist < 100) {
      this.vx = -(dx / dist) * this.speed;
      this.vy = -(dy / dist) * this.speed;
    } else {
      this.vx = 0;
      this.vy = 0;
    }

    // 射击
    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = this.shootCooldown;
      game.enemyTears.push(new EnemyTear(
        this.x, this.y,
        (dx / dist) * 4, (dy / dist) * 4
      ));
    }
  }

  bossAI(player, dt) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 移动
    this.vx = (dx / dist) * this.speed;
    this.vy = (dy / dist) * this.speed;

    // 射击
    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = this.shootCooldown;
      // 八方向射击
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        game.enemyTears.push(new EnemyTear(
          this.x, this.y,
          Math.cos(angle) * 3,
          Math.sin(angle) * 3
        ));
      }
    }

    // 阶段变化
    if (this.hp < this.maxHp * 0.5 && this.phase === 1) {
      this.phase = 2;
      this.speed = 1.8;
      this.shootCooldown = 1;
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.flash = 0.1;
    if (this.hp <= 0) {
      this.dead = true;
      // 掉落
      if (Math.random() < 0.3) {
        game.pickups.push(new Pickup(this.x, this.y, 'coin'));
      }
      if (Math.random() < 0.1) {
        game.pickups.push(new Pickup(this.x, this.y, 'heart'));
      }
    }
  }

  draw() {
    ctx.save();

    if (this.flash > 0) {
      ctx.fillStyle = '#fff';
    } else {
      switch (this.type) {
        case 'fly': ctx.fillStyle = COLORS.enemyFly; break;
        case 'boss': ctx.fillStyle = COLORS.enemyBoss; break;
        default: ctx.fillStyle = COLORS.enemyNormal;
      }
    }

    const size = this.type === 'boss' ? ENEMY_SIZE * 2 : ENEMY_SIZE;

    ctx.beginPath();
    ctx.arc(this.x, this.y, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛
    ctx.fillStyle = '#000';
    const eyeOffset = size / 6;
    ctx.beginPath();
    ctx.arc(this.x - eyeOffset, this.y - eyeOffset / 2, size / 8, 0, Math.PI * 2);
    ctx.arc(this.x + eyeOffset, this.y - eyeOffset / 2, size / 8, 0, Math.PI * 2);
    ctx.fill();

    // Boss血条
    if (this.type === 'boss') {
      const barW = 200;
      const barH = 10;
      const barX = ROOM_W / 2 - barW / 2;
      const barY = 20;
      ctx.fillStyle = COLORS.hpBg;
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = COLORS.hp;
      ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
    }

    ctx.restore();
  }
}

// ==================== 敌人子弹 ====================
class EnemyTear {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.dead = false;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 10 || this.x > ROOM_W - 10 || this.y < 10 || this.y > ROOM_H - 10) {
      this.dead = true;
    }
  }

  draw() {
    ctx.fillStyle = '#ff6666';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ==================== 掉落物 ====================
class Pickup {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.bobOffset = Math.random() * Math.PI * 2;
  }

  update(dt) {
    this.bobOffset += dt * 3;
  }

  draw() {
    const bobY = Math.sin(this.bobOffset) * 3;

    ctx.save();
    ctx.translate(this.x, this.y + bobY);

    switch (this.type) {
      case 'coin':
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);
        break;
      case 'heart':
        ctx.fillStyle = COLORS.hp;
        ctx.beginPath();
        ctx.arc(-4, -2, 6, 0, Math.PI * 2);
        ctx.arc(4, -2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(0, 12);
        ctx.lineTo(10, 0);
        ctx.fill();
        break;
      case 'key':
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(-3, -8, 6, 16);
        ctx.fillRect(-6, 4, 12, 4);
        break;
      case 'bomb':
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(0, -16);
        ctx.stroke();
        break;
    }

    ctx.restore();
  }
}

// ==================== 道具 ====================
class Item {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.bobOffset = 0;
  }

  update(dt) {
    this.bobOffset += dt * 2;
  }

  apply(player) {
    switch (this.type) {
      case 'damage_up':
        player.damage += 0.5;
        break;
      case 'speed_up':
        player.speed += 0.5;
        break;
      case 'hp_up':
        player.maxHp += 2;
        player.hp += 2;
        break;
      case 'tear_up':
        player.fireRate = Math.max(0.15, player.fireRate - 0.1);
        break;
      case 'range_up':
        player.range += 50;
        break;
    }
    player.items.push(this.type);
  }

  draw() {
    const bobY = Math.sin(this.bobOffset) * 5;

    ctx.save();
    ctx.translate(this.x, this.y + bobY);

    // 基座
    ctx.fillStyle = '#555';
    ctx.fillRect(-15, 15, 30, 8);

    // 道具
    ctx.fillStyle = COLORS.item;
    switch (this.type) {
      case 'damage_up':
        ctx.fillStyle = '#ff4444';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚔', 0, 5);
        break;
      case 'speed_up':
        ctx.fillStyle = '#44ff44';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('👟', 0, 5);
        break;
      case 'hp_up':
        ctx.fillStyle = '#ff4444';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('❤', 0, 5);
        break;
      case 'tear_up':
        ctx.fillStyle = '#4444ff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💧', 0, 5);
        break;
      case 'range_up':
        ctx.fillStyle = '#ffff44';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎯', 0, 5);
        break;
    }

    ctx.restore();
  }
}

// ==================== 房间类 ====================
class Room {
  constructor(type, x, y) {
    this.type = type; // normal, boss, item, shop, start
    this.gridX = x;
    this.gridY = y;
    this.cleared = type === 'start';
    this.visited = type === 'start';
    this.doors = { up: false, down: false, left: false, right: false };
    this.enemies = [];
    this.items = [];
  }

  generate() {
    if (this.type === 'start') return;

    if (this.type === 'boss') {
      this.enemies.push(new Enemy(ROOM_W / 2, ROOM_H / 2 - 50, 'boss'));
      return;
    }

    if (this.type === 'item') {
      const itemTypes = ['damage_up', 'speed_up', 'hp_up', 'tear_up', 'range_up'];
      const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
      this.items.push(new Item(ROOM_W / 2, ROOM_H / 2, itemType));
      this.cleared = true;
      return;
    }

    if (this.type === 'normal') {
      const enemyCount = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < enemyCount; i++) {
        const ex = 80 + Math.random() * (ROOM_W - 160);
        const ey = 80 + Math.random() * (ROOM_H - 160);
        const types = ['fly', 'crawler', 'shooter'];
        const type = types[Math.floor(Math.random() * types.length)];
        this.enemies.push(new Enemy(ex, ey, type));
      }
    }
  }
}

// ==================== 游戏主类 ====================
class Game {
  constructor() {
    this.player = new Player();
    this.tears = [];
    this.enemyTears = [];
    this.pickups = [];
    this.rooms = new Map();
    this.currentRoom = null;
    this.floor = 1;
    this.transitioning = false;

    this.generateFloor();
  }

  generateFloor() {
    this.rooms.clear();

    // 生成房间布局 (简单十字形)
    const layout = [
      { x: 0, y: 0, type: 'start' },
      { x: 0, y: -1, type: 'normal' },
      { x: 0, y: -2, type: 'item' },
      { x: -1, y: 0, type: 'normal' },
      { x: 1, y: 0, type: 'normal' },
      { x: 0, y: 1, type: 'normal' },
      { x: 0, y: 2, type: 'boss' }
    ];

    for (const r of layout) {
      const room = new Room(r.type, r.x, r.y);
      this.rooms.set(`${r.x},${r.y}`, room);
    }

    // 设置门
    for (const [key, room] of this.rooms) {
      const [x, y] = key.split(',').map(Number);
      if (this.rooms.has(`${x},${y - 1}`)) room.doors.up = true;
      if (this.rooms.has(`${x},${y + 1}`)) room.doors.down = true;
      if (this.rooms.has(`${x - 1},${y}`)) room.doors.left = true;
      if (this.rooms.has(`${x + 1},${y}`)) room.doors.right = true;
    }

    // 生成房间内容
    for (const room of this.rooms.values()) {
      room.generate();
    }

    // 设置当前房间
    this.currentRoom = this.rooms.get('0,0');
    this.player.x = ROOM_W / 2;
    this.player.y = ROOM_H / 2;
  }

  changeRoom(direction) {
    const [cx, cy] = this.getRoomCoords(this.currentRoom);
    let nx = cx, ny = cy;

    switch (direction) {
      case 'up': ny--; break;
      case 'down': ny++; break;
      case 'left': nx--; break;
      case 'right': nx++; break;
    }

    const nextRoom = this.rooms.get(`${nx},${ny}`);
    if (!nextRoom) return;

    this.transitioning = true;
    this.tears = [];
    this.enemyTears = [];

    setTimeout(() => {
      this.currentRoom = nextRoom;
      nextRoom.visited = true;

      // 设置玩家位置
      switch (direction) {
        case 'up': this.player.y = ROOM_H - 60; break;
        case 'down': this.player.y = 60; break;
        case 'left': this.player.x = ROOM_W - 60; break;
        case 'right': this.player.x = 60; break;
      }

      this.transitioning = false;
    }, 200);
  }

  getRoomCoords(room) {
    for (const [key, r] of this.rooms) {
      if (r === room) {
        return key.split(',').map(Number);
      }
    }
    return [0, 0];
  }

  update(dt) {
    if (this.transitioning || gameState !== 'playing') return;

    const room = this.currentRoom;

    // 更新玩家
    this.player.update(dt);

    // 更新眼泪
    for (const tear of this.tears) {
      tear.update(dt);
    }
    this.tears = this.tears.filter(t => !t.dead);

    // 更新敌人子弹
    for (const tear of this.enemyTears) {
      tear.update();
    }
    this.enemyTears = this.enemyTears.filter(t => !t.dead);

    // 更新敌人
    for (const enemy of room.enemies) {
      enemy.update(dt, this.player);
    }
    room.enemies = room.enemies.filter(e => !e.dead);

    // 更新掉落物
    for (const pickup of this.pickups) {
      pickup.update(dt);
    }

    // 更新道具
    for (const item of room.items) {
      item.update(dt);
    }

    // 碰撞检测
    this.checkCollisions();

    // 检查房间清理
    if (!room.cleared && room.enemies.length === 0) {
      room.cleared = true;
      // Boss房间通关
      if (room.type === 'boss') {
        gameState = 'victory';
      }
    }

    // 检查门碰撞
    this.checkDoors();
  }

  checkCollisions() {
    const p = this.player;
    const room = this.currentRoom;

    // 眼泪打敌人
    for (const tear of this.tears) {
      for (const enemy of room.enemies) {
        const dx = tear.x - enemy.x;
        const dy = tear.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const hitDist = (enemy.type === 'boss' ? ENEMY_SIZE * 2 : ENEMY_SIZE) / 2 + TEAR_SIZE / 2;

        if (dist < hitDist) {
          tear.dead = true;
          enemy.takeDamage(tear.damage);
          break;
        }
      }
    }

    // 敌人子弹打玩家
    for (const tear of this.enemyTears) {
      const dx = tear.x - p.x;
      const dy = tear.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < PLAYER_SIZE / 2 + 6) {
        tear.dead = true;
        p.takeDamage(1);
      }
    }

    // 敌人碰撞玩家
    for (const enemy of room.enemies) {
      const dx = enemy.x - p.x;
      const dy = enemy.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitDist = (enemy.type === 'boss' ? ENEMY_SIZE * 2 : ENEMY_SIZE) / 2 + PLAYER_SIZE / 2;

      if (dist < hitDist) {
        p.takeDamage(enemy.damage);
      }
    }

    // 拾取物品
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i];
      const dx = pickup.x - p.x;
      const dy = pickup.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 25) {
        switch (pickup.type) {
          case 'coin':
            p.coins++;
            break;
          case 'heart':
            p.hp = Math.min(p.maxHp, p.hp + 2);
            break;
          case 'key':
            p.keys++;
            break;
          case 'bomb':
            p.bombs++;
            break;
        }
        this.pickups.splice(i, 1);
      }
    }

    // 拾取道具
    for (let i = room.items.length - 1; i >= 0; i--) {
      const item = room.items[i];
      const dx = item.x - p.x;
      const dy = item.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 30) {
        item.apply(p);
        room.items.splice(i, 1);
      }
    }
  }

  checkDoors() {
    const p = this.player;
    const room = this.currentRoom;
    const doorW = 40;

    if (!room.cleared) return;

    // 上门
    if (room.doors.up && p.y < 30 && Math.abs(p.x - ROOM_W / 2) < doorW) {
      this.changeRoom('up');
    }
    // 下门
    if (room.doors.down && p.y > ROOM_H - 30 && Math.abs(p.x - ROOM_W / 2) < doorW) {
      this.changeRoom('down');
    }
    // 左门
    if (room.doors.left && p.x < 30 && Math.abs(p.y - ROOM_H / 2) < doorW) {
      this.changeRoom('left');
    }
    // 右门
    if (room.doors.right && p.x > ROOM_W - 30 && Math.abs(p.y - ROOM_H / 2) < doorW) {
      this.changeRoom('right');
    }
  }

  draw() {
    // 背景
    ctx.fillStyle = COLORS.floor;
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);

    // 墙壁
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(0, 0, ROOM_W, 20);
    ctx.fillRect(0, ROOM_H - 20, ROOM_W, 20);
    ctx.fillRect(0, 0, 20, ROOM_H);
    ctx.fillRect(ROOM_W - 20, 0, 20, ROOM_H);

    // 门
    const room = this.currentRoom;
    const doorColor = room.cleared ? COLORS.doorOpen : COLORS.door;

    if (room.doors.up) {
      ctx.fillStyle = doorColor;
      ctx.fillRect(ROOM_W / 2 - 25, 0, 50, 20);
    }
    if (room.doors.down) {
      ctx.fillStyle = doorColor;
      ctx.fillRect(ROOM_W / 2 - 25, ROOM_H - 20, 50, 20);
    }
    if (room.doors.left) {
      ctx.fillStyle = doorColor;
      ctx.fillRect(0, ROOM_H / 2 - 25, 20, 50);
    }
    if (room.doors.right) {
      ctx.fillStyle = doorColor;
      ctx.fillRect(ROOM_W - 20, ROOM_H / 2 - 25, 20, 50);
    }

    // 道具
    for (const item of room.items) {
      item.draw();
    }

    // 掉落物
    for (const pickup of this.pickups) {
      pickup.draw();
    }

    // 敌人
    for (const enemy of room.enemies) {
      enemy.draw();
    }

    // 眼泪
    for (const tear of this.tears) {
      tear.draw();
    }

    // 敌人子弹
    for (const tear of this.enemyTears) {
      tear.draw();
    }

    // 玩家
    this.player.draw();

    // HUD
    this.drawHUD();

    // 小地图
    this.drawMinimap();
  }

  drawHUD() {
    const p = this.player;
    const hudY = ROOM_H + 10;

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, ROOM_H, W, H - ROOM_H);

    // 生命值
    const heartSize = 20;
    for (let i = 0; i < Math.ceil(p.maxHp / 2); i++) {
      const x = 20 + i * (heartSize + 5);
      const y = hudY + 15;

      if (p.hp >= (i + 1) * 2) {
        // 满心
        ctx.fillStyle = COLORS.hp;
      } else if (p.hp >= i * 2 + 1) {
        // 半心
        ctx.fillStyle = COLORS.hp;
        ctx.globalAlpha = 0.5;
      } else {
        // 空心
        ctx.fillStyle = '#333';
      }

      // 画心形
      ctx.beginPath();
      ctx.arc(x - 5, y - 3, 8, 0, Math.PI * 2);
      ctx.arc(x + 5, y - 3, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 13, y);
      ctx.lineTo(x, y + 15);
      ctx.lineTo(x + 13, y);
      ctx.fill();

      ctx.globalAlpha = 1;
    }

    // 金币
    ctx.fillStyle = COLORS.gold;
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`💰 ${p.coins}`, 20, hudY + 55);

    // 炸弹
    ctx.fillText(`💣 ${p.bombs}`, 100, hudY + 55);

    // 钥匙
    ctx.fillText(`🔑 ${p.keys}`, 180, hudY + 55);

    // 楼层
    ctx.fillStyle = '#fff';
    ctx.fillText(`第 ${this.floor} 层`, ROOM_W - 80, hudY + 20);
  }

  drawMinimap() {
    const mapX = ROOM_W - 100;
    const mapY = ROOM_H + 35;
    const cellSize = 12;

    for (const [key, room] of this.rooms) {
      const [rx, ry] = key.split(',').map(Number);
      const x = mapX + rx * (cellSize + 2);
      const y = mapY + ry * (cellSize + 2);

      if (!room.visited) {
        ctx.fillStyle = '#333';
      } else if (room === this.currentRoom) {
        ctx.fillStyle = '#fff';
      } else if (room.type === 'boss') {
        ctx.fillStyle = '#ff4444';
      } else if (room.type === 'item') {
        ctx.fillStyle = '#44ff44';
      } else {
        ctx.fillStyle = '#666';
      }

      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
}

// ==================== 渲染 ====================
function render() {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  switch (gameState) {
    case 'menu':
      renderMenu();
      break;
    case 'playing':
      game.draw();
      renderControls();
      break;
    case 'gameover':
      game.draw();
      renderGameOver();
      break;
    case 'victory':
      game.draw();
      renderVictory();
      break;
  }
}

function renderMenu() {
  ctx.fillStyle = COLORS.primary;
  ctx.font = '48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('玄牢志', W / 2, H * 0.25);

  ctx.fillStyle = '#888';
  ctx.font = '18px sans-serif';
  ctx.fillText('以撒风格版', W / 2, H * 0.33);

  // 开始按钮
  const btnX = W / 2 - 80;
  const btnY = H * 0.5;
  const btnW = 160;
  const btnH = 50;

  ctx.fillStyle = COLORS.primary;
  ctx.fillRect(btnX, btnY, btnW, btnH);
  ctx.fillStyle = '#000';
  ctx.font = '20px sans-serif';
  ctx.fillText('开始游戏', W / 2, btnY + 30);

  // 点击检测
  if (touch.tap && touch.x > btnX && touch.x < btnX + btnW &&
      touch.y > btnY && touch.y < btnY + btnH) {
    game = new Game();
    gameState = 'playing';
  }

  // 操作说明
  ctx.fillStyle = '#666';
  ctx.font = '14px sans-serif';
  ctx.fillText('左侧摇杆移动 | 右侧摇杆射击', W / 2, H * 0.75);
}

function renderControls() {
  // 左摇杆 (移动)
  const ljX = 80;
  const ljY = ROOM_H - 80;
  const ljR = 50;

  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(ljX, ljY, ljR, 0, Math.PI * 2);
  ctx.fill();

  // 右摇杆 (射击)
  const rjX = ROOM_W - 80;
  const rjY = ROOM_H - 80;

  ctx.beginPath();
  ctx.arc(rjX, rjY, ljR, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;

  // 标签
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('移动', ljX, ljY + ljR + 15);
  ctx.fillText('射击', rjX, rjY + ljR + 15);
}

function renderGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#ff4444';
  ctx.font = '40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('游戏结束', W / 2, H * 0.4);

  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.fillText('点击屏幕返回', W / 2, H * 0.55);

  if (touch.tap) {
    gameState = 'menu';
  }
}

function renderVictory() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#44ff44';
  ctx.font = '40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('胜利!', W / 2, H * 0.4);

  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.fillText(`收集金币: ${game.player.coins}`, W / 2, H * 0.5);
  ctx.fillText('点击屏幕返回', W / 2, H * 0.6);

  if (touch.tap) {
    gameState = 'menu';
  }
}

// ==================== 触摸控制 ====================
const leftJoystick = { x: 80, y: 0, radius: 50, active: false, touchId: null };
const rightJoystick = { x: 0, y: 0, radius: 50, active: false, touchId: null };

function updateJoystickPositions() {
  leftJoystick.y = ROOM_H - 80;
  rightJoystick.x = ROOM_W - 80;
  rightJoystick.y = ROOM_H - 80;
}

wx.onTouchStart((e) => {
  for (const t of e.changedTouches) {
    touch.x = t.clientX;
    touch.y = t.clientY;
    touch.tap = true;

    if (gameState === 'playing') {
      updateJoystickPositions();

      // 左摇杆
      const ldx = t.clientX - leftJoystick.x;
      const ldy = t.clientY - leftJoystick.y;
      if (Math.sqrt(ldx * ldx + ldy * ldy) < leftJoystick.radius * 1.5) {
        leftJoystick.active = true;
        leftJoystick.touchId = t.identifier;
      }

      // 右摇杆
      const rdx = t.clientX - rightJoystick.x;
      const rdy = t.clientY - rightJoystick.y;
      if (Math.sqrt(rdx * rdx + rdy * rdy) < rightJoystick.radius * 1.5) {
        rightJoystick.active = true;
        rightJoystick.touchId = t.identifier;
      }
    }
  }
});

wx.onTouchMove((e) => {
  for (const t of e.changedTouches) {
    // 左摇杆
    if (leftJoystick.active && t.identifier === leftJoystick.touchId) {
      const dx = t.clientX - leftJoystick.x;
      const dy = t.clientY - leftJoystick.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      keys.up = dy < -20;
      keys.down = dy > 20;
      keys.left = dx < -20;
      keys.right = dx > 20;
    }

    // 右摇杆
    if (rightJoystick.active && t.identifier === rightJoystick.touchId) {
      const dx = t.clientX - rightJoystick.x;
      const dy = t.clientY - rightJoystick.y;

      keys.shootUp = dy < -20;
      keys.shootDown = dy > 20;
      keys.shootLeft = dx < -20;
      keys.shootRight = dx > 20;
    }
  }
});

wx.onTouchEnd((e) => {
  for (const t of e.changedTouches) {
    if (t.identifier === leftJoystick.touchId) {
      leftJoystick.active = false;
      keys.up = keys.down = keys.left = keys.right = false;
    }
    if (t.identifier === rightJoystick.touchId) {
      rightJoystick.active = false;
      keys.shootUp = keys.shootDown = keys.shootLeft = keys.shootRight = false;
    }
  }
});

// ==================== 游戏循环 ====================
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  if (game && gameState === 'playing') {
    game.update(dt);
  }

  render();

  touch.tap = false;

  requestAnimationFrame(gameLoop);
}

// ==================== 启动 ====================
requestAnimationFrame(gameLoop);
