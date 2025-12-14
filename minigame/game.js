/**
 * 玄牢志 - 八卦地牢
 * 微信小游戏版本
 */

// ==================== 获取 Canvas ====================
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');
const gameWidth = canvas.width;
const gameHeight = canvas.height;

// ==================== 常量定义 ====================
const COLORS = {
  primary: '#ffd700',
  secondary: '#5ad6ff',
  danger: '#ff4757',
  success: '#2ed573',
  metal: '#c0c0c0',
  wood: '#2ed573',
  water: '#5ad6ff',
  fire: '#ff6b6b',
  earth: '#d4a574',
  attack: '#ff6b6b',
  skill: '#5ad6ff',
  power: '#a855f7',
  bg: '#1a1a2e',
  bgLight: '#252542',
  bgDark: '#0f0f1a',
  text: '#ffffff',
  textMuted: '#888888',
  border: '#3a3a5a'
};

const CARD_WIDTH = 90;
const CARD_HEIGHT = 130;

// ==================== 游戏状态 ====================
const GameState = {
  LOADING: 'loading',
  MAIN_MENU: 'main_menu',
  CHARACTER_SELECT: 'character_select',
  MAP: 'map',
  BATTLE: 'battle',
  REWARD: 'reward',
  GAME_OVER: 'game_over',
  VICTORY: 'victory'
};

// ==================== 全局变量 ====================
let currentState = GameState.MAIN_MENU;
let lastTime = 0;

const input = {
  touchX: 0,
  touchY: 0,
  isTouching: false,
  tapped: false
};

let game = null;
let floatingTexts = [];

// ==================== 卡牌数据 ====================
const CARDS = {
  strike: {
    id: 'strike',
    name: '横劈',
    type: 'attack',
    cost: 1,
    description: '造成6点伤害',
    damage: 6
  },
  defend: {
    id: 'defend',
    name: '格挡',
    type: 'skill',
    cost: 1,
    description: '获得5点护甲',
    armor: 5
  },
  bash: {
    id: 'bash',
    name: '痛击',
    type: 'attack',
    cost: 2,
    description: '造成8伤害\n+2易伤',
    damage: 8,
    vulnerable: 2
  },
  iron_wave: {
    id: 'iron_wave',
    name: '铁浪',
    type: 'skill',
    cost: 1,
    description: '5伤害+5护甲',
    damage: 5,
    armor: 5
  },
  cleave: {
    id: 'cleave',
    name: '横扫',
    type: 'attack',
    cost: 1,
    description: '全体8点伤害',
    damage: 8,
    aoe: true
  },
  shrug: {
    id: 'shrug',
    name: '护身',
    type: 'skill',
    cost: 1,
    description: '获得8点护甲',
    armor: 8
  }
};

// ==================== 敌人数据 ====================
const ENEMIES = {
  slime: {
    id: 'slime',
    name: '史莱姆',
    hpMin: 12,
    hpMax: 18,
    patterns: [
      { type: 'attack', value: 5 },
      { type: 'attack', value: 5 },
      { type: 'defend', value: 4 }
    ]
  },
  skeleton: {
    id: 'skeleton',
    name: '骷髅兵',
    hpMin: 25,
    hpMax: 32,
    patterns: [
      { type: 'attack', value: 8 },
      { type: 'attack', value: 8 },
      { type: 'defend', value: 6 }
    ]
  },
  goblin: {
    id: 'goblin',
    name: '哥布林',
    hpMin: 15,
    hpMax: 22,
    patterns: [
      { type: 'attack', value: 4 },
      { type: 'attack', value: 4 },
      { type: 'buff', value: 2, buffType: 'strength' }
    ]
  }
};

// ==================== 角色数据 ====================
const CHARACTERS = {
  swordsman: {
    id: 'swordsman',
    name: '剑客',
    title: '青锋剑士',
    hp: 80,
    deck: ['strike', 'strike', 'strike', 'strike', 'strike',
           'defend', 'defend', 'defend', 'defend', 'bash']
  }
};

// ==================== 工具函数 ====================
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pointInRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

// ==================== 绘制工具 ====================
function drawRoundRect(x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawText(text, x, y, options = {}) {
  const {
    size = 16,
    color = COLORS.text,
    align = 'center',
    baseline = 'middle'
  } = options;

  ctx.font = `${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawButton(x, y, w, h, text, options = {}) {
  const { color = COLORS.primary, textColor = '#000', disabled = false } = options;
  const isTouch = pointInRect(input.touchX, input.touchY, x, y, w, h);

  const bgColor = disabled ? '#444' : (isTouch && input.isTouching ? lightenColor(color, 20) : color);
  drawRoundRect(x, y, w, h, 8, bgColor);
  drawText(text, x + w/2, y + h/2, { color: disabled ? '#888' : textColor, size: 18 });

  if (input.tapped && isTouch && !disabled) {
    return true;
  }
  return false;
}

function lightenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// ==================== 飘字效果 ====================
function addFloatingText(text, x, y, color = COLORS.danger) {
  floatingTexts.push({ text, x, y, color, alpha: 1, vy: -2, life: 60 });
}

function updateFloatingTexts() {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y += ft.vy;
    ft.life--;
    ft.alpha = ft.life / 60;
    if (ft.life <= 0) floatingTexts.splice(i, 1);
  }
}

function drawFloatingTexts() {
  for (const ft of floatingTexts) {
    ctx.globalAlpha = ft.alpha;
    drawText(ft.text, ft.x, ft.y, { color: ft.color, size: 24 });
  }
  ctx.globalAlpha = 1;
}

// ==================== 游戏类 ====================
class Game {
  constructor() {
    this.player = null;
    this.enemies = [];
    this.floor = 1;
    this.gold = 99;
    this.deck = [];
    this.drawPile = [];
    this.hand = [];
    this.discardPile = [];
    this.energy = 3;
    this.maxEnergy = 3;
    this.turn = 0;
    this.isPlayerTurn = true;
    this.selectedCardIndex = -1;
    this.targetingMode = false;
    this.map = null;
  }

  startNewGame(characterId) {
    const char = CHARACTERS[characterId];
    this.player = {
      name: char.name,
      hp: char.hp,
      maxHp: char.hp,
      armor: 0,
      strength: 0,
      buffs: {}
    };
    this.deck = char.deck.map(id => ({ ...CARDS[id], uuid: Math.random().toString(36).substr(2, 9) }));
    this.floor = 1;
    this.gold = 99;
    this.generateMap();
    currentState = GameState.MAP;
  }

  generateMap() {
    this.map = { nodes: [], currentIndex: 0 };
    const types = ['battle', 'battle', 'battle', 'elite', 'rest', 'battle', 'battle', 'boss'];
    for (let i = 0; i < 8; i++) {
      this.map.nodes.push({
        index: i,
        type: types[i],
        cleared: false,
        available: i === 0
      });
    }
  }

  enterNode(index) {
    const node = this.map.nodes[index];
    if (!node.available || node.cleared) return;

    switch (node.type) {
      case 'battle':
        this.startBattle(['slime', 'goblin']);
        break;
      case 'elite':
        this.startBattle(['skeleton', 'skeleton']);
        break;
      case 'boss':
        this.startBattle(['skeleton', 'goblin', 'slime']);
        break;
      case 'rest':
        const heal = Math.floor(this.player.maxHp * 0.3);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
        addFloatingText(`+${heal}`, gameWidth/2, gameHeight/2, COLORS.success);
        this.completeNode(node);
        break;
    }
  }

  completeNode(node) {
    node.cleared = true;
    const nextIndex = node.index + 1;
    if (nextIndex < this.map.nodes.length) {
      this.map.nodes[nextIndex].available = true;
    }
    if (node.type === 'boss') {
      currentState = GameState.VICTORY;
      return;
    }
    currentState = GameState.MAP;
  }

  startBattle(enemyIds) {
    this.enemies = enemyIds.map((id, i) => this.createEnemy(id, i));
    this.turn = 0;
    this.energy = this.maxEnergy;
    this.drawPile = shuffle([...this.deck]);
    this.hand = [];
    this.discardPile = [];
    this.player.armor = 0;
    this.targetingMode = false;
    this.enemies.forEach(e => this.decideEnemyIntent(e));
    this.startPlayerTurn();
    currentState = GameState.BATTLE;
  }

  createEnemy(id, index) {
    const data = ENEMIES[id];
    const hp = randomInt(data.hpMin, data.hpMax);
    return {
      ...data,
      index,
      hp,
      maxHp: hp,
      armor: 0,
      strength: 0,
      buffs: {},
      patternIndex: 0,
      intent: null,
      x: gameWidth * 0.5 + (index - 1) * 120,
      y: gameHeight * 0.28,
      shake: 0
    };
  }

  decideEnemyIntent(enemy) {
    enemy.intent = { ...enemy.patterns[enemy.patternIndex] };
    enemy.patternIndex = (enemy.patternIndex + 1) % enemy.patterns.length;
  }

  startPlayerTurn() {
    this.turn++;
    this.isPlayerTurn = true;
    this.energy = this.maxEnergy;
    this.drawCards(5);
  }

  endPlayerTurn() {
    if (!this.isPlayerTurn) return;
    this.isPlayerTurn = false;
    this.targetingMode = false;
    while (this.hand.length > 0) this.discardPile.push(this.hand.pop());
    this.executeEnemyTurns();
  }

  executeEnemyTurns() {
    let delay = 0;
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      setTimeout(() => this.executeEnemyAction(enemy), delay);
      delay += 600;
    }

    setTimeout(() => {
      if (this.player.hp <= 0) {
        currentState = GameState.GAME_OVER;
        return;
      }
      this.enemies.forEach(e => e.armor = 0);
      this.enemies.forEach(e => { if (e.hp > 0) this.decideEnemyIntent(e); });
      this.player.armor = 0;
      this.startPlayerTurn();
    }, delay + 300);
  }

  executeEnemyAction(enemy) {
    const intent = enemy.intent;
    switch (intent.type) {
      case 'attack':
        let damage = intent.value + enemy.strength;
        if (this.player.buffs.vulnerable > 0) damage = Math.floor(damage * 1.5);
        if (this.player.armor >= damage) {
          this.player.armor -= damage;
          addFloatingText(`-${damage}`, gameWidth * 0.2, gameHeight * 0.5, COLORS.secondary);
        } else {
          const remain = damage - this.player.armor;
          this.player.armor = 0;
          this.player.hp -= remain;
          addFloatingText(`-${remain}`, gameWidth * 0.2, gameHeight * 0.5, COLORS.danger);
        }
        break;
      case 'defend':
        enemy.armor += intent.value;
        addFloatingText(`+${intent.value}`, enemy.x, enemy.y, COLORS.secondary);
        break;
      case 'buff':
        if (intent.buffType === 'strength') {
          enemy.strength += intent.value;
          addFloatingText(`+${intent.value}力`, enemy.x, enemy.y, COLORS.primary);
        }
        break;
    }
  }

  drawCards(count) {
    for (let i = 0; i < count; i++) {
      if (this.hand.length >= 10) break;
      if (this.drawPile.length === 0) {
        if (this.discardPile.length === 0) break;
        this.drawPile = shuffle(this.discardPile);
        this.discardPile = [];
      }
      this.hand.push(this.drawPile.pop());
    }
  }

  playCard(cardIndex, targetIndex = -1) {
    if (!this.isPlayerTurn) return false;
    const card = this.hand[cardIndex];
    if (!card || this.energy < card.cost) return false;

    if (card.type === 'attack' && !card.aoe && targetIndex === -1) {
      this.selectedCardIndex = cardIndex;
      this.targetingMode = true;
      return false;
    }

    this.energy -= card.cost;
    this.hand.splice(cardIndex, 1);
    this.discardPile.push(card);
    this.executeCard(card, targetIndex);
    this.targetingMode = false;
    this.selectedCardIndex = -1;
    this.checkBattleEnd();
    return true;
  }

  executeCard(card, targetIndex) {
    if (card.damage) {
      let damage = card.damage + this.player.strength;
      if (card.aoe) {
        this.enemies.forEach(e => { if (e.hp > 0) this.dealDamageToEnemy(e, damage); });
      } else {
        const enemy = this.enemies[targetIndex];
        if (enemy && enemy.hp > 0) this.dealDamageToEnemy(enemy, damage);
      }
    }
    if (card.armor) {
      this.player.armor += card.armor;
      addFloatingText(`+${card.armor}`, gameWidth * 0.2, gameHeight * 0.55, COLORS.secondary);
    }
    if (card.vulnerable) {
      const enemy = this.enemies[targetIndex];
      if (enemy) enemy.buffs.vulnerable = (enemy.buffs.vulnerable || 0) + card.vulnerable;
    }
  }

  dealDamageToEnemy(enemy, baseDamage) {
    let damage = baseDamage;
    if (enemy.buffs.vulnerable > 0) damage = Math.floor(damage * 1.5);
    if (enemy.armor >= damage) {
      enemy.armor -= damage;
      addFloatingText(`-${damage}`, enemy.x, enemy.y, COLORS.secondary);
    } else {
      const remain = damage - enemy.armor;
      enemy.armor = 0;
      enemy.hp -= remain;
      enemy.shake = 10;
      addFloatingText(`-${remain}`, enemy.x, enemy.y, COLORS.danger);
    }
  }

  checkBattleEnd() {
    if (this.enemies.every(e => e.hp <= 0)) {
      setTimeout(() => { currentState = GameState.REWARD; }, 500);
    }
  }

  collectReward() {
    this.gold += 20;
    const node = this.map.nodes.find(n => n.available && !n.cleared);
    if (node) this.completeNode(node);
  }
}

// ==================== 渲染函数 ====================
function render() {
  ctx.fillStyle = COLORS.bgDark;
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  switch (currentState) {
    case GameState.MAIN_MENU: renderMainMenu(); break;
    case GameState.CHARACTER_SELECT: renderCharacterSelect(); break;
    case GameState.MAP: renderMap(); break;
    case GameState.BATTLE: renderBattle(); break;
    case GameState.REWARD: renderReward(); break;
    case GameState.GAME_OVER: renderGameOver(); break;
    case GameState.VICTORY: renderVictory(); break;
  }

  drawFloatingTexts();
}

function renderMainMenu() {
  // 背景渐变
  const gradient = ctx.createLinearGradient(0, 0, 0, gameHeight);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#0f0f1a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  // 标题
  drawText('玄牢志', gameWidth/2, gameHeight * 0.25, { size: 56, color: COLORS.primary });
  drawText('八卦地牢 · 命运轮回', gameWidth/2, gameHeight * 0.35, { size: 18, color: COLORS.textMuted });

  // 按钮
  const btnW = 180;
  const btnH = 50;
  const btnX = (gameWidth - btnW) / 2;

  if (drawButton(btnX, gameHeight * 0.55, btnW, btnH, '开始游戏')) {
    currentState = GameState.CHARACTER_SELECT;
  }

  drawText('v0.1.0', gameWidth/2, gameHeight - 40, { size: 12, color: COLORS.textMuted });
}

function renderCharacterSelect() {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  drawText('选择角色', gameWidth/2, 50, { size: 28, color: COLORS.primary });

  // 角色卡
  const char = CHARACTERS.swordsman;
  const cardW = 160;
  const cardH = 220;
  const cardX = (gameWidth - cardW) / 2;
  const cardY = 100;

  const isTouch = pointInRect(input.touchX, input.touchY, cardX, cardY, cardW, cardH);
  drawRoundRect(cardX, cardY, cardW, cardH, 12, isTouch ? '#3a3a5a' : COLORS.bgLight, isTouch ? COLORS.primary : COLORS.border);

  ctx.beginPath();
  ctx.arc(cardX + cardW/2, cardY + 60, 35, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.primary;
  ctx.fill();

  drawText(char.name, cardX + cardW/2, cardY + 120, { size: 22 });
  drawText(char.title, cardX + cardW/2, cardY + 145, { size: 12, color: COLORS.textMuted });
  drawText(`HP: ${char.hp}`, cardX + cardW/2, cardY + 180, { size: 14, color: COLORS.danger });

  if (input.tapped && isTouch) {
    game = new Game();
    game.startNewGame(char.id);
  }

  if (drawButton(20, 20, 80, 36, '返回', { color: COLORS.bgLight, textColor: COLORS.text })) {
    currentState = GameState.MAIN_MENU;
  }
}

function renderMap() {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  drawText(`第 ${game.floor} 层`, gameWidth/2, 35, { size: 22, color: COLORS.primary });

  // 玩家信息
  drawText(`${game.player.name}`, 70, 70, { size: 14 });
  drawText(`HP: ${game.player.hp}/${game.player.maxHp}`, 70, 90, { size: 12, color: COLORS.danger });
  drawText(`金币: ${game.gold}`, 70, 110, { size: 12, color: COLORS.primary });

  // 地图节点
  const nodeR = 30;
  const startY = 150;
  const gapY = 55;

  game.map.nodes.forEach((node, i) => {
    const x = gameWidth / 2;
    const y = startY + i * gapY;
    const dist = Math.sqrt(Math.pow(input.touchX - x, 2) + Math.pow(input.touchY - y, 2));
    const isTouch = dist < nodeR;

    // 连接线
    if (i < game.map.nodes.length - 1) {
      ctx.beginPath();
      ctx.moveTo(x, y + nodeR);
      ctx.lineTo(x, y + gapY - nodeR);
      ctx.strokeStyle = node.cleared ? COLORS.success : COLORS.border;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 节点
    ctx.beginPath();
    ctx.arc(x, y, nodeR, 0, Math.PI * 2);
    let nodeColor = node.cleared ? COLORS.success : (node.available ? (isTouch ? COLORS.primary : COLORS.bgLight) : '#333');
    ctx.fillStyle = nodeColor;
    ctx.fill();
    ctx.strokeStyle = node.available && !node.cleared ? COLORS.primary : COLORS.border;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 图标
    let icon = '?';
    if (node.cleared) icon = '✓';
    else if (node.type === 'battle') icon = '⚔';
    else if (node.type === 'elite') icon = '💀';
    else if (node.type === 'boss') icon = '👹';
    else if (node.type === 'rest') icon = '🔥';

    drawText(icon, x, y, { size: 20, color: node.cleared ? '#fff' : COLORS.text });

    if (input.tapped && isTouch && node.available && !node.cleared) {
      game.enterNode(i);
    }
  });
}

function renderBattle() {
  const gradient = ctx.createLinearGradient(0, 0, 0, gameHeight);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(0.5, '#252542');
  gradient.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  // 分隔线
  ctx.beginPath();
  ctx.moveTo(0, gameHeight * 0.52);
  ctx.lineTo(gameWidth, gameHeight * 0.52);
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  renderEnemies();
  renderPlayer();
  renderHand();
  renderBattleUI();

  if (game.targetingMode) {
    drawText('选择目标', gameWidth/2, gameHeight * 0.47, { size: 18, color: COLORS.primary });
  }
}

function renderEnemies() {
  const aliveEnemies = game.enemies.filter(e => e.hp > 0);
  const baseX = gameWidth / 2;
  const spacing = 110;

  aliveEnemies.forEach((enemy, aliveIdx) => {
    const offset = (aliveEnemies.length - 1) / 2;
    const x = baseX + (aliveIdx - offset) * spacing;
    const y = gameHeight * 0.28;
    enemy.x = x;
    enemy.y = y;

    let shakeX = 0;
    if (enemy.shake > 0) {
      shakeX = (Math.random() - 0.5) * enemy.shake;
      enemy.shake -= 0.5;
    }

    const dist = Math.sqrt(Math.pow(input.touchX - x, 2) + Math.pow(input.touchY - y, 2));
    const isTouch = dist < 40;
    const isTargetable = game.targetingMode && isTouch;

    // 敌人圆形
    ctx.beginPath();
    ctx.arc(x + shakeX, y, 38, 0, Math.PI * 2);
    ctx.fillStyle = isTargetable ? '#4a4a6a' : COLORS.bgLight;
    ctx.fill();
    ctx.strokeStyle = isTargetable ? COLORS.danger : COLORS.border;
    ctx.lineWidth = isTargetable ? 3 : 2;
    ctx.stroke();

    // 名称
    drawText(enemy.name, x, y - 58, { size: 12 });

    // HP条
    const hpW = 60, hpH = 6;
    drawRoundRect(x - hpW/2, y + 45, hpW, hpH, 3, '#333');
    drawRoundRect(x - hpW/2, y + 45, hpW * (enemy.hp / enemy.maxHp), hpH, 3, COLORS.danger);
    drawText(`${enemy.hp}`, x, y + 62, { size: 10 });

    // 护甲
    if (enemy.armor > 0) {
      drawText(`🛡${enemy.armor}`, x - 35, y, { size: 12, color: COLORS.secondary });
    }

    // 意图
    if (enemy.intent) {
      let intentText = '';
      if (enemy.intent.type === 'attack') {
        intentText = `⚔${enemy.intent.value + enemy.strength}`;
      } else if (enemy.intent.type === 'defend') {
        intentText = `🛡${enemy.intent.value}`;
      } else if (enemy.intent.type === 'buff') {
        intentText = '↑';
      }
      drawText(intentText, x, y - 42, { size: 14, color: enemy.intent.type === 'attack' ? COLORS.danger : COLORS.secondary });
    }

    // 点击目标
    if (input.tapped && isTargetable) {
      game.playCard(game.selectedCardIndex, enemy.index);
    }
  });
}

function renderPlayer() {
  const x = gameWidth * 0.15;
  const y = gameHeight * 0.42;

  ctx.beginPath();
  ctx.arc(x, y, 42, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.bgLight;
  ctx.fill();
  ctx.strokeStyle = COLORS.primary;
  ctx.lineWidth = 3;
  ctx.stroke();

  drawText(game.player.name, x, y - 60, { size: 14 });

  // HP条
  const hpW = 80, hpH = 10;
  drawRoundRect(x - hpW/2, y + 50, hpW, hpH, 5, '#333');
  const hpPct = game.player.hp / game.player.maxHp;
  drawRoundRect(x - hpW/2, y + 50, hpW * hpPct, hpH, 5, hpPct > 0.5 ? COLORS.danger : '#ff9f43');
  drawText(`${game.player.hp}/${game.player.maxHp}`, x, y + 72, { size: 12 });

  // 护甲
  if (game.player.armor > 0) {
    ctx.beginPath();
    ctx.arc(x + 48, y - 15, 16, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.secondary;
    ctx.fill();
    drawText(game.player.armor.toString(), x + 48, y - 15, { size: 12, color: '#000' });
  }
}

function renderHand() {
  const handY = gameHeight - 85;
  const cardW = CARD_WIDTH;
  const cardH = CARD_HEIGHT;
  const handCount = game.hand.length;
  const maxSpread = Math.min(cardW * 0.65, (gameWidth - 160) / Math.max(handCount, 1));
  const totalWidth = (handCount - 1) * maxSpread + cardW;
  const startX = (gameWidth - totalWidth) / 2;

  game.hand.forEach((card, i) => {
    const x = startX + i * maxSpread;
    let y = handY;
    const isTouch = pointInRect(input.touchX, input.touchY, x, y - 15, cardW, cardH + 15);
    const isSelected = i === game.selectedCardIndex;
    const canPlay = game.isPlayerTurn && game.energy >= card.cost;

    if (isTouch) y -= 25;

    if (!canPlay) ctx.globalAlpha = 0.5;

    // 卡牌背景
    let borderColor = COLORS.border;
    if (card.type === 'attack') borderColor = COLORS.attack;
    else if (card.type === 'skill') borderColor = COLORS.skill;
    if (isSelected) borderColor = COLORS.primary;

    drawRoundRect(x, y, cardW, cardH, 6, COLORS.bgLight, borderColor);

    // 费用
    ctx.beginPath();
    ctx.arc(x + 14, y + 14, 12, 0, Math.PI * 2);
    ctx.fillStyle = canPlay ? COLORS.primary : '#666';
    ctx.fill();
    drawText(card.cost.toString(), x + 14, y + 14, { size: 14, color: '#000' });

    // 名称
    drawText(card.name, x + cardW/2, y + 40, { size: 13 });

    // 类型线
    drawRoundRect(x + 8, y + 52, cardW - 16, 2, 1, borderColor);

    // 描述
    const lines = card.description.split('\n');
    lines.forEach((line, li) => {
      drawText(line, x + cardW/2, y + 72 + li * 14, { size: 10, color: COLORS.textMuted });
    });

    ctx.globalAlpha = 1;

    // 点击打牌
    if (input.tapped && isTouch && canPlay && !game.targetingMode) {
      game.playCard(i);
    }
  });
}

function renderBattleUI() {
  // 能量
  const energyX = 50;
  const energyY = gameHeight - 140;
  ctx.beginPath();
  ctx.arc(energyX, energyY, 25, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.bgLight;
  ctx.fill();
  ctx.strokeStyle = COLORS.primary;
  ctx.lineWidth = 3;
  ctx.stroke();
  drawText(`${game.energy}/${game.maxEnergy}`, energyX, energyY, { size: 16, color: COLORS.primary });

  // 牌堆信息
  drawText(`抽:${game.drawPile.length}`, gameWidth - 50, gameHeight - 155, { size: 12, color: COLORS.textMuted });
  drawText(`弃:${game.discardPile.length}`, gameWidth - 50, gameHeight - 135, { size: 12, color: COLORS.textMuted });

  // 回合数
  drawText(`回合 ${game.turn}`, 50, 25, { size: 12, color: COLORS.textMuted });

  // 结束回合按钮
  if (game.isPlayerTurn && !game.targetingMode) {
    if (drawButton(gameWidth - 110, gameHeight - 55, 95, 36, '结束回合', { color: COLORS.danger, textColor: '#fff' })) {
      game.endPlayerTurn();
    }
  }

  // 取消目标
  if (game.targetingMode) {
    if (drawButton(gameWidth/2 - 40, gameHeight * 0.5, 80, 32, '取消', { color: COLORS.bgLight, textColor: COLORS.text })) {
      game.targetingMode = false;
      game.selectedCardIndex = -1;
    }
  }
}

function renderReward() {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  drawText('战斗胜利!', gameWidth/2, gameHeight * 0.3, { size: 32, color: COLORS.primary });
  drawText('获得奖励:', gameWidth/2, gameHeight * 0.45, { size: 18 });
  drawText('💰 +20 金币', gameWidth/2, gameHeight * 0.55, { size: 22, color: COLORS.primary });

  if (drawButton(gameWidth/2 - 60, gameHeight * 0.7, 120, 45, '继续')) {
    game.collectReward();
  }
}

function renderGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  drawText('游戏结束', gameWidth/2, gameHeight * 0.35, { size: 40, color: COLORS.danger });
  drawText(`到达第 ${game.floor} 层`, gameWidth/2, gameHeight * 0.5, { size: 16, color: COLORS.textMuted });

  if (drawButton(gameWidth/2 - 60, gameHeight * 0.65, 120, 45, '返回')) {
    currentState = GameState.MAIN_MENU;
    game = null;
  }
}

function renderVictory() {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, gameWidth, gameHeight);

  drawText('通关成功!', gameWidth/2, gameHeight * 0.3, { size: 40, color: COLORS.primary });
  drawText('恭喜征服地牢!', gameWidth/2, gameHeight * 0.45, { size: 18 });
  drawText(`获得金币: ${game.gold}`, gameWidth/2, gameHeight * 0.55, { size: 16, color: COLORS.primary });

  if (drawButton(gameWidth/2 - 60, gameHeight * 0.7, 120, 45, '返回')) {
    currentState = GameState.MAIN_MENU;
    game = null;
  }
}

// ==================== 游戏循环 ====================
function gameLoop(timestamp) {
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  updateFloatingTexts();
  render();

  input.tapped = false;

  requestAnimationFrame(gameLoop);
}

// ==================== 触摸事件 ====================
wx.onTouchStart((e) => {
  const touch = e.touches[0];
  input.touchX = touch.clientX;
  input.touchY = touch.clientY;
  input.isTouching = true;
});

wx.onTouchMove((e) => {
  const touch = e.touches[0];
  input.touchX = touch.clientX;
  input.touchY = touch.clientY;
});

wx.onTouchEnd((e) => {
  input.isTouching = false;
  input.tapped = true;
});

// ==================== 启动游戏 ====================
requestAnimationFrame(gameLoop);
