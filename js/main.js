/**
 * 地牢探索 Roguelike 游戏
 * 微信小游戏版本
 */

import { canvas, systemInfo } from './libs/weapp-adapter'

const ctx = canvas.getContext('2d')

// ============ 游戏配置 ============
const CONFIG = {
  TILE_SIZE: 40,
  MAP_WIDTH: 30,
  MAP_HEIGHT: 30,
  ROOM_MIN_SIZE: 4,
  ROOM_MAX_SIZE: 8,
  MAX_ROOMS: 12,
  ENEMY_BASE_COUNT: 5,
  ATTACK_RANGE: 60,
  ATTACK_COOLDOWN: 400,
  PLAYER_SPEED: 4,
  ENEMY_SPEED: 1.5,
}

// ============ 瓦片类型 ============
const TILE = {
  WALL: 0,
  FLOOR: 1,
  STAIRS: 2,
}

// ============ 颜色 ============
const COLORS = {
  BG: '#1a1a2e',
  WALL: '#2d3436',
  WALL_TOP: '#636e72',
  FLOOR: '#4a4a5e',
  FLOOR_ALT: '#3d3d4d',
  STAIRS: '#f1c40f',
  PLAYER: '#3498db',
  PLAYER_OUTLINE: '#2980b9',
  ENEMY: '#e74c3c',
  ENEMY_OUTLINE: '#c0392b',
  ELITE: '#9b59b6',
  ELITE_OUTLINE: '#8e44ad',
  ATTACK: 'rgba(255, 200, 100, 0.6)',
  HEALTH_BG: '#333',
  HEALTH_FILL: '#e74c3c',
  HUD_BG: 'rgba(0,0,0,0.7)',
  WHITE: '#ffffff',
  JOYSTICK_BG: 'rgba(255,255,255,0.15)',
  JOYSTICK_KNOB: 'rgba(255,255,255,0.8)',
  ATTACK_BTN: '#e74c3c',
  ATTACK_BTN_DARK: '#c0392b',
}

// ============ 游戏状态 ============
const game = {
  width: systemInfo.windowWidth,
  height: systemInfo.windowHeight,
  dpr: systemInfo.pixelRatio,
  map: [],
  rooms: [],
  player: null,
  enemies: [],
  particles: [],
  camera: { x: 0, y: 0 },
  floor: 1,
  kills: 0,
  gameOver: false,
  lastTime: 0,
  joystick: {
    active: false,
    startX: 0,
    startY: 0,
    dx: 0,
    dy: 0,
    centerX: 80,
    centerY: 0,
    radius: 50,
  },
  attack: {
    active: false,
    direction: null,
    lastTime: 0,
    isHolding: false,
    holdStartTime: 0,
    dragStart: null,
    centerX: 0,
    centerY: 0,
    radius: 45,
  },
  screenShake: 0,
  levelIndicator: {
    show: false,
    timer: 0,
    text: '第 1 层'
  },
  touches: new Map(),
}

// 初始化位置
game.joystick.centerY = game.height - 100
game.attack.centerX = game.width - 80
game.attack.centerY = game.height - 100

// 设置 canvas 尺寸
canvas.width = game.width * game.dpr
canvas.height = game.height * game.dpr
ctx.scale(game.dpr, game.dpr)

// ============ 玩家类 ============
class Player {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.radius = 15
    this.maxHp = 100
    this.hp = 100
    this.atk = 10
    this.def = 5
    this.speed = CONFIG.PLAYER_SPEED
    this.invincible = 0
    this.facingX = 0
    this.facingY = -1
  }

  update(dt) {
    if (this.invincible > 0) this.invincible -= dt

    const moveX = game.joystick.dx * this.speed
    const moveY = game.joystick.dy * this.speed

    if (moveX !== 0 || moveY !== 0) {
      const newX = this.x + moveX
      const newY = this.y + moveY

      if (!isWall(newX, this.y, this.radius)) this.x = newX
      if (!isWall(this.x, newY, this.radius)) this.y = newY

      this.facingX = game.joystick.dx
      this.facingY = game.joystick.dy
    }

    // 检查楼梯
    const tileX = Math.floor(this.x / CONFIG.TILE_SIZE)
    const tileY = Math.floor(this.y / CONFIG.TILE_SIZE)
    if (game.map[tileY] && game.map[tileY][tileX] === TILE.STAIRS) {
      nextFloor()
    }
  }

  draw() {
    const screenX = this.x - game.camera.x
    const screenY = this.y - game.camera.y

    if (this.invincible > 0 && Math.floor(this.invincible / 100) % 2 === 0) {
      ctx.globalAlpha = 0.5
    }

    // 身体
    ctx.beginPath()
    ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = COLORS.PLAYER
    ctx.fill()
    ctx.strokeStyle = COLORS.PLAYER_OUTLINE
    ctx.lineWidth = 3
    ctx.stroke()

    // 眼睛
    const eyeX = screenX + this.facingX * 5
    const eyeY = screenY + this.facingY * 5

    ctx.beginPath()
    ctx.arc(eyeX - 4, eyeY - 2, 3, 0, Math.PI * 2)
    ctx.arc(eyeX + 4, eyeY - 2, 3, 0, Math.PI * 2)
    ctx.fillStyle = COLORS.WHITE
    ctx.fill()

    ctx.globalAlpha = 1
  }

  takeDamage(dmg) {
    if (this.invincible > 0) return

    const actualDmg = Math.max(1, dmg - this.def)
    this.hp -= actualDmg
    this.invincible = 1000

    addDamageParticle(this.x, this.y, actualDmg, '#ff6b6b')
    game.screenShake = 5

    if (this.hp <= 0) {
      this.hp = 0
      endGame()
    }
  }
}

// ============ 敌人类 ============
class Enemy {
  constructor(x, y, type = 'normal') {
    this.x = x
    this.y = y
    this.radius = 12
    this.type = type

    const floorBonus = (game.floor - 1) * 0.2

    if (type === 'elite') {
      this.maxHp = 50 * (1 + floorBonus)
      this.hp = this.maxHp
      this.atk = 15 * (1 + floorBonus * 0.5)
      this.speed = CONFIG.ENEMY_SPEED * 0.8
      this.radius = 18
      this.color = COLORS.ELITE
      this.outline = COLORS.ELITE_OUTLINE
    } else {
      this.maxHp = 20 * (1 + floorBonus)
      this.hp = this.maxHp
      this.atk = 8 * (1 + floorBonus * 0.5)
      this.speed = CONFIG.ENEMY_SPEED
      this.color = COLORS.ENEMY
      this.outline = COLORS.ENEMY_OUTLINE
    }

    this.attackCooldown = 0
    this.knockback = { x: 0, y: 0 }
  }

  update(dt) {
    if (this.attackCooldown > 0) this.attackCooldown -= dt

    // 击退
    if (this.knockback.x !== 0 || this.knockback.y !== 0) {
      const newX = this.x + this.knockback.x
      const newY = this.y + this.knockback.y
      if (!isWall(newX, this.y, this.radius)) this.x = newX
      if (!isWall(this.x, newY, this.radius)) this.y = newY

      this.knockback.x *= 0.8
      this.knockback.y *= 0.8
      if (Math.abs(this.knockback.x) < 0.1) this.knockback.x = 0
      if (Math.abs(this.knockback.y) < 0.1) this.knockback.y = 0
      return
    }

    // 追踪玩家
    const dx = game.player.x - this.x
    const dy = game.player.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 30) {
      const moveX = (dx / dist) * this.speed
      const moveY = (dy / dist) * this.speed

      const newX = this.x + moveX
      const newY = this.y + moveY

      if (!isWall(newX, this.y, this.radius)) this.x = newX
      if (!isWall(this.x, newY, this.radius)) this.y = newY
    }

    // 攻击玩家
    if (dist < this.radius + game.player.radius + 5 && this.attackCooldown <= 0) {
      game.player.takeDamage(this.atk)
      this.attackCooldown = 1000
    }
  }

  draw() {
    const screenX = this.x - game.camera.x
    const screenY = this.y - game.camera.y

    // 身体
    ctx.beginPath()
    ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = this.color
    ctx.fill()
    ctx.strokeStyle = this.outline
    ctx.lineWidth = 2
    ctx.stroke()

    // 眼睛
    const dx = game.player.x - this.x
    const dy = game.player.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const eyeDirX = dx / dist
    const eyeDirY = dy / dist

    ctx.beginPath()
    ctx.arc(screenX + eyeDirX * 4 - 3, screenY + eyeDirY * 4, 2, 0, Math.PI * 2)
    ctx.arc(screenX + eyeDirX * 4 + 3, screenY + eyeDirY * 4, 2, 0, Math.PI * 2)
    ctx.fillStyle = COLORS.WHITE
    ctx.fill()

    // 血条
    const hpPercent = this.hp / this.maxHp
    const barWidth = this.radius * 2
    const barHeight = 4
    const barX = screenX - barWidth / 2
    const barY = screenY - this.radius - 10

    ctx.fillStyle = COLORS.HEALTH_BG
    ctx.fillRect(barX, barY, barWidth, barHeight)
    ctx.fillStyle = COLORS.HEALTH_FILL
    ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight)
  }

  takeDamage(dmg, knockbackDir) {
    this.hp -= dmg
    addDamageParticle(this.x, this.y, dmg, '#ffdd59')

    if (knockbackDir) {
      this.knockback.x = knockbackDir.x * 8
      this.knockback.y = knockbackDir.y * 8
    }

    // 粒子效果
    for (let i = 0; i < 5; i++) {
      game.particles.push({
        x: this.x,
        y: this.y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 500,
        maxLife: 500,
        color: this.color,
        size: 4,
      })
    }

    return this.hp <= 0
  }
}

// ============ 地图生成 ============
function generateMap() {
  game.map = []
  for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
    game.map[y] = []
    for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
      game.map[y][x] = TILE.WALL
    }
  }

  game.rooms = []

  for (let i = 0; i < CONFIG.MAX_ROOMS; i++) {
    const w = randomInt(CONFIG.ROOM_MIN_SIZE, CONFIG.ROOM_MAX_SIZE)
    const h = randomInt(CONFIG.ROOM_MIN_SIZE, CONFIG.ROOM_MAX_SIZE)
    const x = randomInt(1, CONFIG.MAP_WIDTH - w - 1)
    const y = randomInt(1, CONFIG.MAP_HEIGHT - h - 1)

    const newRoom = { x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) }

    let overlaps = false
    for (const room of game.rooms) {
      if (roomsOverlap(newRoom, room)) {
        overlaps = true
        break
      }
    }

    if (!overlaps) {
      carveRoom(newRoom)

      if (game.rooms.length > 0) {
        const prevRoom = game.rooms[game.rooms.length - 1]
        if (Math.random() < 0.5) {
          carveHorizontalTunnel(prevRoom.cx, newRoom.cx, prevRoom.cy)
          carveVerticalTunnel(prevRoom.cy, newRoom.cy, newRoom.cx)
        } else {
          carveVerticalTunnel(prevRoom.cy, newRoom.cy, prevRoom.cx)
          carveHorizontalTunnel(prevRoom.cx, newRoom.cx, newRoom.cy)
        }
      }

      game.rooms.push(newRoom)
    }
  }

  // 放置楼梯
  if (game.rooms.length > 1) {
    const lastRoom = game.rooms[game.rooms.length - 1]
    game.map[lastRoom.cy][lastRoom.cx] = TILE.STAIRS
  }
}

function roomsOverlap(r1, r2) {
  return r1.x <= r2.x + r2.w + 1 && r1.x + r1.w + 1 >= r2.x &&
         r1.y <= r2.y + r2.h + 1 && r1.y + r1.h + 1 >= r2.y
}

function carveRoom(room) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      game.map[y][x] = TILE.FLOOR
    }
  }
}

function carveHorizontalTunnel(x1, x2, y) {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
    if (y >= 0 && y < CONFIG.MAP_HEIGHT && x >= 0 && x < CONFIG.MAP_WIDTH) {
      game.map[y][x] = TILE.FLOOR
    }
  }
}

function carveVerticalTunnel(y1, y2, x) {
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
    if (y >= 0 && y < CONFIG.MAP_HEIGHT && x >= 0 && x < CONFIG.MAP_WIDTH) {
      game.map[y][x] = TILE.FLOOR
    }
  }
}

function isWall(x, y, radius) {
  const tileX1 = Math.floor((x - radius) / CONFIG.TILE_SIZE)
  const tileX2 = Math.floor((x + radius) / CONFIG.TILE_SIZE)
  const tileY1 = Math.floor((y - radius) / CONFIG.TILE_SIZE)
  const tileY2 = Math.floor((y + radius) / CONFIG.TILE_SIZE)

  for (let ty = tileY1; ty <= tileY2; ty++) {
    for (let tx = tileX1; tx <= tileX2; tx++) {
      if (ty < 0 || ty >= CONFIG.MAP_HEIGHT || tx < 0 || tx >= CONFIG.MAP_WIDTH) {
        return true
      }
      if (game.map[ty][tx] === TILE.WALL) {
        return true
      }
    }
  }
  return false
}

// ============ 敌人生成 ============
function spawnEnemies() {
  game.enemies = []

  const enemyCount = CONFIG.ENEMY_BASE_COUNT + Math.floor(game.floor * 1.5)

  for (let i = 0; i < enemyCount; i++) {
    const roomIdx = randomInt(1, game.rooms.length - 1)
    const room = game.rooms[roomIdx]

    if (!room) continue

    const x = (room.x + randomInt(1, room.w - 2)) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2
    const y = (room.y + randomInt(1, room.h - 2)) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2

    const type = Math.random() < 0.15 + game.floor * 0.02 ? 'elite' : 'normal'
    game.enemies.push(new Enemy(x, y, type))
  }
}

// ============ 攻击系统 ============
function performAttack(direction) {
  const now = Date.now()
  if (now - game.attack.lastTime < CONFIG.ATTACK_COOLDOWN) return
  game.attack.lastTime = now

  let attackDir

  if (direction) {
    attackDir = direction
  } else {
    // 自动攻击最近敌人
    let nearestEnemy = null
    let nearestDist = Infinity

    for (const enemy of game.enemies) {
      const dx = enemy.x - game.player.x
      const dy = enemy.y - game.player.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < nearestDist && dist < CONFIG.ATTACK_RANGE * 2) {
        nearestDist = dist
        nearestEnemy = enemy
      }
    }

    if (nearestEnemy) {
      const dx = nearestEnemy.x - game.player.x
      const dy = nearestEnemy.y - game.player.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      attackDir = { x: dx / dist, y: dy / dist }
    } else {
      attackDir = { x: game.player.facingX, y: game.player.facingY }
    }
  }

  // 攻击效果
  game.particles.push({
    type: 'attack',
    x: game.player.x + attackDir.x * 30,
    y: game.player.y + attackDir.y * 30,
    life: 200,
    maxLife: 200,
  })

  // 检测命中
  const attackX = game.player.x + attackDir.x * 30
  const attackY = game.player.y + attackDir.y * 30

  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const enemy = game.enemies[i]
    const dx = enemy.x - attackX
    const dy = enemy.y - attackY
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < CONFIG.ATTACK_RANGE) {
      const dead = enemy.takeDamage(game.player.atk, attackDir)
      if (dead) {
        game.enemies.splice(i, 1)
        game.kills++

        // 击杀粒子
        for (let j = 0; j < 10; j++) {
          game.particles.push({
            x: enemy.x,
            y: enemy.y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 800,
            maxLife: 800,
            color: enemy.color,
            size: 6,
          })
        }
      }
    }
  }
}

// ============ 下一层 ============
function nextFloor() {
  game.floor++

  // 显示层级提示
  game.levelIndicator.show = true
  game.levelIndicator.timer = 2000
  game.levelIndicator.text = `第 ${game.floor} 层`

  // 玩家属性提升
  game.player.atk += 2
  game.player.def += 1
  game.player.maxHp += 10
  game.player.hp = Math.min(game.player.hp + 30, game.player.maxHp)

  generateMap()
  spawnEnemies()

  const startRoom = game.rooms[0]
  game.player.x = startRoom.cx * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2
  game.player.y = startRoom.cy * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2
}

// ============ 游戏结束/重开 ============
function endGame() {
  game.gameOver = true
}

function restartGame() {
  game.gameOver = false
  game.floor = 1
  game.kills = 0
  game.enemies = []
  game.particles = []

  generateMap()

  const startRoom = game.rooms[0]
  game.player = new Player(
    startRoom.cx * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
    startRoom.cy * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2
  )

  spawnEnemies()

  game.levelIndicator.show = true
  game.levelIndicator.timer = 2000
  game.levelIndicator.text = '第 1 层'
}

// ============ 粒子效果 ============
function addDamageParticle(x, y, dmg, color) {
  game.particles.push({
    type: 'damage',
    x: x,
    y: y,
    vy: -2,
    text: '-' + Math.floor(dmg),
    color: color,
    life: 1000,
    maxLife: 1000,
  })
}

// ============ 渲染 ============
function render() {
  // 清屏
  ctx.fillStyle = COLORS.BG
  ctx.fillRect(0, 0, game.width, game.height)

  if (game.gameOver) {
    drawGameOver()
    return
  }

  // 相机跟随
  game.camera.x = game.player.x - game.width / 2
  game.camera.y = game.player.y - game.height / 2

  // 屏幕震动
  if (game.screenShake > 0) {
    game.camera.x += (Math.random() - 0.5) * game.screenShake * 2
    game.camera.y += (Math.random() - 0.5) * game.screenShake * 2
    game.screenShake *= 0.9
    if (game.screenShake < 0.5) game.screenShake = 0
  }

  // 绘制地图
  const startTileX = Math.max(0, Math.floor(game.camera.x / CONFIG.TILE_SIZE) - 1)
  const startTileY = Math.max(0, Math.floor(game.camera.y / CONFIG.TILE_SIZE) - 1)
  const endTileX = Math.min(CONFIG.MAP_WIDTH, Math.ceil((game.camera.x + game.width) / CONFIG.TILE_SIZE) + 1)
  const endTileY = Math.min(CONFIG.MAP_HEIGHT, Math.ceil((game.camera.y + game.height) / CONFIG.TILE_SIZE) + 1)

  for (let y = startTileY; y < endTileY; y++) {
    for (let x = startTileX; x < endTileX; x++) {
      const tile = game.map[y][x]
      const screenX = x * CONFIG.TILE_SIZE - game.camera.x
      const screenY = y * CONFIG.TILE_SIZE - game.camera.y

      if (tile === TILE.WALL) {
        ctx.fillStyle = COLORS.WALL_TOP
        ctx.fillRect(screenX, screenY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE * 0.3)
        ctx.fillStyle = COLORS.WALL
        ctx.fillRect(screenX, screenY + CONFIG.TILE_SIZE * 0.3, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE * 0.7)
      } else if (tile === TILE.FLOOR) {
        ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.FLOOR : COLORS.FLOOR_ALT
        ctx.fillRect(screenX, screenY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE)
      } else if (tile === TILE.STAIRS) {
        ctx.fillStyle = COLORS.FLOOR
        ctx.fillRect(screenX, screenY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE)
        ctx.fillStyle = COLORS.STAIRS
        ctx.font = '24px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('⬇', screenX + CONFIG.TILE_SIZE / 2, screenY + CONFIG.TILE_SIZE / 2)
      }
    }
  }

  // 绘制敌人
  for (const enemy of game.enemies) {
    enemy.draw()
  }

  // 绘制玩家
  game.player.draw()

  // 绘制粒子
  for (const p of game.particles) {
    if (p.type === 'attack') {
      const screenX = p.x - game.camera.x
      const screenY = p.y - game.camera.y
      const alpha = p.life / p.maxLife
      const size = 40 * (1 - alpha * 0.5)

      ctx.save()
      ctx.globalAlpha = alpha * 0.8
      ctx.fillStyle = COLORS.ATTACK
      ctx.beginPath()
      ctx.arc(screenX, screenY, size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    } else if (p.type === 'damage') {
      const screenX = p.x - game.camera.x
      const screenY = p.y - game.camera.y
      const alpha = p.life / p.maxLife

      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.font = 'bold 20px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(p.text, screenX, screenY)
      ctx.globalAlpha = 1
    } else {
      const screenX = p.x - game.camera.x
      const screenY = p.y - game.camera.y
      const alpha = p.life / p.maxLife

      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(screenX, screenY, p.size * alpha, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }

  // 绘制 HUD
  drawHUD()

  // 绘制控制器
  drawControls()

  // 层级提示
  if (game.levelIndicator.show) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(0, 0, game.width, game.height)

    ctx.fillStyle = COLORS.WHITE
    ctx.font = 'bold 48px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(game.levelIndicator.text, game.width / 2, game.height / 2)
  }
}

function drawHUD() {
  // 左上角面板
  ctx.fillStyle = COLORS.HUD_BG
  roundRect(ctx, 10, 10, 180, 80, 12)
  ctx.fill()

  // 血条
  ctx.fillStyle = COLORS.WHITE
  ctx.font = '14px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('❤️ 生命值', 20, 30)

  ctx.fillStyle = COLORS.HEALTH_BG
  roundRect(ctx, 20, 38, 150, 16, 8)
  ctx.fill()

  const hpPercent = game.player.hp / game.player.maxHp
  ctx.fillStyle = COLORS.HEALTH_FILL
  roundRect(ctx, 20, 38, 150 * hpPercent, 16, 8)
  ctx.fill()

  // 属性
  ctx.fillStyle = COLORS.WHITE
  ctx.font = '12px sans-serif'
  ctx.fillText(`⚔️${Math.floor(game.player.atk)}  🛡️${Math.floor(game.player.def)}  🏆${game.floor}层  💀${game.kills}`, 20, 75)

  // 小地图
  drawMinimap()
}

function drawMinimap() {
  const mapSize = 100
  const mapX = game.width - mapSize - 10
  const mapY = 10
  const scale = 3

  ctx.fillStyle = COLORS.HUD_BG
  roundRect(ctx, mapX, mapY, mapSize, mapSize, 8)
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  roundRect(ctx, mapX, mapY, mapSize, mapSize, 8)
  ctx.clip()

  const offsetX = mapX + mapSize / 2 - (game.player.x / CONFIG.TILE_SIZE) * scale
  const offsetY = mapY + mapSize / 2 - (game.player.y / CONFIG.TILE_SIZE) * scale

  // 绘制地图
  for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
    for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
      const tile = game.map[y][x]
      const px = x * scale + offsetX
      const py = y * scale + offsetY

      if (px < mapX - scale || px > mapX + mapSize || py < mapY - scale || py > mapY + mapSize) continue

      if (tile === TILE.FLOOR) {
        ctx.fillStyle = '#555'
        ctx.fillRect(px, py, scale, scale)
      } else if (tile === TILE.STAIRS) {
        ctx.fillStyle = COLORS.STAIRS
        ctx.fillRect(px, py, scale, scale)
      }
    }
  }

  // 敌人点
  ctx.fillStyle = COLORS.ENEMY
  for (const enemy of game.enemies) {
    const px = (enemy.x / CONFIG.TILE_SIZE) * scale + offsetX
    const py = (enemy.y / CONFIG.TILE_SIZE) * scale + offsetY
    ctx.beginPath()
    ctx.arc(px, py, 2, 0, Math.PI * 2)
    ctx.fill()
  }

  // 玩家点
  ctx.fillStyle = COLORS.PLAYER
  ctx.beginPath()
  ctx.arc(mapX + mapSize / 2, mapY + mapSize / 2, 4, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawControls() {
  // 摇杆
  ctx.fillStyle = COLORS.JOYSTICK_BG
  ctx.beginPath()
  ctx.arc(game.joystick.centerX, game.joystick.centerY, game.joystick.radius, 0, Math.PI * 2)
  ctx.fill()

  // 摇杆球
  const knobX = game.joystick.centerX + game.joystick.dx * game.joystick.radius * 0.7
  const knobY = game.joystick.centerY + game.joystick.dy * game.joystick.radius * 0.7
  ctx.fillStyle = COLORS.JOYSTICK_KNOB
  ctx.beginPath()
  ctx.arc(knobX, knobY, 25, 0, Math.PI * 2)
  ctx.fill()

  // 攻击按钮
  const gradient = ctx.createRadialGradient(
    game.attack.centerX, game.attack.centerY, 0,
    game.attack.centerX, game.attack.centerY, game.attack.radius
  )
  gradient.addColorStop(0, COLORS.ATTACK_BTN)
  gradient.addColorStop(1, COLORS.ATTACK_BTN_DARK)

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(game.attack.centerX, game.attack.centerY, game.attack.radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 3
  ctx.stroke()

  ctx.fillStyle = COLORS.WHITE
  ctx.font = 'bold 18px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('攻击', game.attack.centerX, game.attack.centerY)

  // 拖动方向指示
  if (game.attack.isHolding && game.attack.direction) {
    const arrowX = game.attack.centerX + game.attack.direction.x * 60
    const arrowY = game.attack.centerY + game.attack.direction.y * 60

    ctx.strokeStyle = COLORS.WHITE
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(game.attack.centerX, game.attack.centerY)
    ctx.lineTo(arrowX, arrowY)
    ctx.stroke()

    ctx.fillStyle = COLORS.WHITE
    ctx.beginPath()
    ctx.arc(arrowX, arrowY, 8, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.85)'
  ctx.fillRect(0, 0, game.width, game.height)

  ctx.fillStyle = COLORS.ENEMY
  ctx.font = 'bold 48px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('游戏结束', game.width / 2, game.height / 2 - 80)

  ctx.fillStyle = COLORS.WHITE
  ctx.font = '24px sans-serif'
  ctx.fillText(`到达层数: ${game.floor}`, game.width / 2, game.height / 2 - 20)
  ctx.fillText(`击杀敌人: ${game.kills}`, game.width / 2, game.height / 2 + 20)

  // 重新开始按钮
  const btnX = game.width / 2
  const btnY = game.height / 2 + 90
  const btnW = 160
  const btnH = 50

  ctx.fillStyle = '#27ae60'
  roundRect(ctx, btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 25)
  ctx.fill()

  ctx.fillStyle = COLORS.WHITE
  ctx.font = 'bold 20px sans-serif'
  ctx.fillText('重新开始', btnX, btnY + 2)

  // 保存按钮位置用于点击检测
  game.restartBtn = { x: btnX - btnW / 2, y: btnY - btnH / 2, w: btnW, h: btnH }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ============ 游戏循环 ============
function gameLoop(timestamp) {
  if (!game.lastTime) game.lastTime = timestamp
  const dt = timestamp - game.lastTime
  game.lastTime = timestamp

  if (!game.gameOver) {
    // 更新
    game.player.update(dt)

    for (const enemy of game.enemies) {
      enemy.update(dt)
    }

    // 更新粒子
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const p = game.particles[i]
      p.life -= dt
      if (p.vx) p.x += p.vx
      if (p.vy) p.y += p.vy
      if (p.life <= 0) {
        game.particles.splice(i, 1)
      }
    }

    // 自动攻击
    if (game.attack.isHolding && !game.attack.direction) {
      const now = Date.now()
      if (now - game.attack.holdStartTime > 200) {
        performAttack(null)
      }
    }

    // 层级提示
    if (game.levelIndicator.show) {
      game.levelIndicator.timer -= dt
      if (game.levelIndicator.timer <= 0) {
        game.levelIndicator.show = false
      }
    }
  }

  render()
  requestAnimationFrame(gameLoop)
}

// ============ 触摸处理 ============
function handleTouchStart(e) {
  for (const touch of e.changedTouches) {
    const x = touch.clientX
    const y = touch.clientY
    const id = touch.identifier

    game.touches.set(id, { x, y, type: null })

    // 游戏结束界面
    if (game.gameOver && game.restartBtn) {
      const btn = game.restartBtn
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        restartGame()
        return
      }
    }

    // 摇杆区域
    const joyDist = Math.sqrt(
      (x - game.joystick.centerX) ** 2 + (y - game.joystick.centerY) ** 2
    )
    if (joyDist < game.joystick.radius + 30) {
      game.touches.get(id).type = 'joystick'
      game.joystick.active = true
      continue
    }

    // 攻击按钮区域
    const atkDist = Math.sqrt(
      (x - game.attack.centerX) ** 2 + (y - game.attack.centerY) ** 2
    )
    if (atkDist < game.attack.radius + 20) {
      game.touches.get(id).type = 'attack'
      game.attack.isHolding = true
      game.attack.holdStartTime = Date.now()
      game.attack.dragStart = { x, y }
      game.attack.direction = null
    }
  }
}

function handleTouchMove(e) {
  for (const touch of e.changedTouches) {
    const x = touch.clientX
    const y = touch.clientY
    const id = touch.identifier

    const touchData = game.touches.get(id)
    if (!touchData) continue

    if (touchData.type === 'joystick') {
      let dx = x - game.joystick.centerX
      let dy = y - game.joystick.centerY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const maxDist = game.joystick.radius

      if (dist > maxDist) {
        dx = (dx / dist) * maxDist
        dy = (dy / dist) * maxDist
      }

      const normalizedDist = Math.min(dist, maxDist) / maxDist
      game.joystick.dx = (dx / maxDist) * normalizedDist
      game.joystick.dy = (dy / maxDist) * normalizedDist
    }

    if (touchData.type === 'attack' && game.attack.isHolding) {
      const dx = x - game.attack.dragStart.x
      const dy = y - game.attack.dragStart.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > 30) {
        game.attack.direction = { x: dx / dist, y: dy / dist }
      } else {
        game.attack.direction = null
      }
    }
  }
}

function handleTouchEnd(e) {
  for (const touch of e.changedTouches) {
    const id = touch.identifier
    const touchData = game.touches.get(id)

    if (!touchData) continue

    if (touchData.type === 'joystick') {
      game.joystick.active = false
      game.joystick.dx = 0
      game.joystick.dy = 0
    }

    if (touchData.type === 'attack') {
      if (game.attack.isHolding) {
        if (game.attack.direction) {
          performAttack(game.attack.direction)
        } else {
          performAttack(null)
        }
      }
      game.attack.isHolding = false
      game.attack.direction = null
    }

    game.touches.delete(id)
  }
}

// ============ 工具函数 ============
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ============ 初始化 ============
function init() {
  generateMap()

  const startRoom = game.rooms[0]
  game.player = new Player(
    startRoom.cx * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
    startRoom.cy * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2
  )

  spawnEnemies()

  // 绑定触摸事件
  wx.onTouchStart(handleTouchStart)
  wx.onTouchMove(handleTouchMove)
  wx.onTouchEnd(handleTouchEnd)
  wx.onTouchCancel(handleTouchEnd)

  // 显示层级提示
  game.levelIndicator.show = true
  game.levelIndicator.timer = 2000

  requestAnimationFrame(gameLoop)
}

init()
