/**
 * 八卦立方体 Roguelike - 微信小游戏入口
 *
 * 核心概念：
 * - 世界由正六边形时空间拼凑的莫比乌斯环组成
 * - 乾宫是观察/系统层面（创建角色、线上功能等）
 * - 其他宫位是冒险层面
 * - 64卦 × 6面 = 384种可能性
 */

// 引入模块
const { GAME_STATES, COLORS, CLASSES } = require('./js/config/GameConfig.js');
const ConstellationCube = require('./js/render/ConstellationCube.js');
const Character = require('./js/core/Character.js');
const SaveManager = require('./js/core/SaveManager.js');
const { BattleSystem, Enemy } = require('./js/core/BattleSystem.js');
const YaoChangeSystem = require('./js/core/YaoChangeSystem.js');

// 获取主 Canvas
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// 获取系统信息
const sysInfo = wx.getSystemInfoSync();
const W = sysInfo.windowWidth;
const H = sysInfo.windowHeight;
const DPR = sysInfo.pixelRatio;

// 游戏状态
let gameState = GAME_STATES.TITLE;
let currentCharacter = null;
let cubeRenderer = null;
let battleSystem = null;
let yaoSystem = null;

// UI 状态
let selectedClassIndex = 0;
let characterName = '旅者';
let currentWave = 0;
let showingDetail = false;

// 触摸状态
let touchStart = null;

// =============== 初始化 ===============

function init() {
  // 创建渲染器
  cubeRenderer = new ConstellationCube(canvas);

  // 创建战斗系统
  battleSystem = new BattleSystem();

  // 创建爻变系统
  yaoSystem = new YaoChangeSystem();

  // 加载存档
  const offlineData = SaveManager.loadOffline();
  const onlineData = SaveManager.loadOnline();

  if (offlineData && offlineData.character) {
    currentCharacter = offlineData.character;
    currentWave = offlineData.currentWave || 0;
    gameState = GAME_STATES.MAIN_MENU;
  } else {
    gameState = GAME_STATES.TITLE;
  }

  // 开始渲染循环
  requestAnimationFrame(gameLoop);
}

// =============== 游戏循环 ===============

let lastTime = Date.now();

function gameLoop() {
  const now = Date.now();
  const dt = now - lastTime;
  lastTime = now;

  // 清屏
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // 根据状态渲染
  switch (gameState) {
    case GAME_STATES.TITLE:
      renderTitle(dt);
      break;
    case GAME_STATES.MAIN_MENU:
      renderMainMenu(dt);
      break;
    case GAME_STATES.CREATE_CHAR:
      renderCreateChar(dt);
      break;
    case GAME_STATES.ADVENTURE:
      renderAdventure(dt);
      break;
    case GAME_STATES.BATTLE:
      renderBattle(dt);
      break;
    case GAME_STATES.GAME_OVER:
      renderGameOver(dt);
      break;
  }

  requestAnimationFrame(gameLoop);
}

// =============== 渲染函数 ===============

function renderTitle(dt) {
  // 背景
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, '#0F0F1A');
  gradient.addColorStop(1, '#050508');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  // 渲染星座立方体
  cubeRenderer.render(dt);

  // 标题
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('八卦立方体', W / 2, H * 0.15);

  ctx.fillStyle = '#E8E4D9';
  ctx.font = '16px sans-serif';
  ctx.fillText('Roguelike · 先天八卦', W / 2, H * 0.22);

  // 开始按钮
  const btnY = H * 0.75;
  const btnW = 180;
  const btnH = 50;

  ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(W / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(SaveManager.hasOfflineSave() ? '继续游戏' : '开始游戏', W / 2, btnY);

  // 新游戏按钮（如果有存档）
  if (SaveManager.hasOfflineSave()) {
    const btn2Y = btnY + 70;
    ctx.fillStyle = 'rgba(232, 228, 217, 0.1)';
    ctx.strokeStyle = 'rgba(232, 228, 217, 0.5)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - btnW / 2, btn2Y - btnH / 2, btnW, btnH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#E8E4D9';
    ctx.font = '16px sans-serif';
    ctx.fillText('新游戏', W / 2, btn2Y);
  }
}

function renderMainMenu(dt) {
  // 渲染星座立方体背景
  const charPos = cubeRenderer.render(dt);

  // 角色信息 HUD
  if (currentCharacter) {
    drawCharacterHUD();
  }

  // 底部按钮
  drawMenuButtons();
}

function renderCreateChar(dt) {
  // 背景
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, '#0F0F1A');
  gradient.addColorStop(1, '#050508');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  // 标题
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('创建角色', W / 2, 50);

  // 职业选择
  const classIds = Object.keys(CLASSES);
  const selectedClass = CLASSES[classIds[selectedClassIndex]];

  ctx.fillStyle = '#E8E4D9';
  ctx.font = '14px sans-serif';
  ctx.fillText('选择职业', W / 2, 90);

  // 职业卡片
  const cardW = W * 0.8;
  const cardH = 200;
  const cardX = (W - cardW) / 2;
  const cardY = 110;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.strokeStyle = selectedClass.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 16);
  ctx.fill();
  ctx.stroke();

  // 职业信息
  ctx.fillStyle = selectedClass.color;
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(`${selectedClass.symbol} ${selectedClass.name}`, W / 2, cardY + 40);

  ctx.fillStyle = '#E8E4D9';
  ctx.font = '16px sans-serif';
  ctx.fillText(selectedClass.nameCN, W / 2, cardY + 70);

  ctx.fillStyle = 'rgba(232, 228, 217, 0.8)';
  ctx.font = '14px sans-serif';
  ctx.fillText(selectedClass.description, W / 2, cardY + 100);

  // 属性预览
  const stats = selectedClass.baseStats;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  const statX = cardX + 20;
  let statY = cardY + 130;

  ctx.fillText(`HP: ${stats.hp}  攻击: ${stats.attack}  防御: ${stats.physDef}`, statX, statY);
  statY += 20;
  ctx.fillText(`速度: ${stats.moveSpeed}  暴击: ${stats.critRate}%  闪避: ${stats.dodge}%`, statX, statY);
  statY += 20;
  ctx.fillText(`法力: ${stats.mp}  幸运: ${stats.luck}`, statX, statY);

  // 左右切换箭头
  ctx.fillStyle = '#FFD700';
  ctx.font = '36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('◀', 30, cardY + cardH / 2);
  ctx.fillText('▶', W - 30, cardY + cardH / 2);

  // 创建按钮
  const btnY = H - 80;
  const btnW = 160;
  const btnH = 45;

  ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(W / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('开始冒险', W / 2, btnY);
}

function renderAdventure(dt) {
  // 背景
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, '#1A1A2E');
  gradient.addColorStop(1, '#0A0A12');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  // 当前波次信息
  ctx.fillStyle = '#E8E4D9';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`第 ${currentWave + 1} 波`, W / 2, 40);

  // 角色状态
  if (currentCharacter) {
    drawCharacterHUD();
  }

  // 爻变信息
  const hexInfo = yaoSystem.interpretHexagram();
  ctx.fillStyle = 'rgba(232, 228, 217, 0.6)';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`当前卦象: ${hexInfo.lower.name}之${hexInfo.upper.name}`, 20, H - 100);
  ctx.fillText(`${hexInfo.interpretation}`, 20, H - 80);

  // 战斗按钮
  const btnY = H / 2;
  const btnW = 140;
  const btnH = 50;

  ctx.fillStyle = 'rgba(255, 68, 68, 0.2)';
  ctx.strokeStyle = '#FF4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(W / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FF4444';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('进入战斗', W / 2, btnY);

  // 爻变按钮
  const yaoY = btnY + 70;
  ctx.fillStyle = 'rgba(68, 136, 255, 0.2)';
  ctx.strokeStyle = '#4488FF';
  ctx.beginPath();
  ctx.roundRect(W / 2 - btnW / 2, yaoY - btnH / 2, btnW, btnH, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#4488FF';
  ctx.fillText('投骰爻变', W / 2, yaoY);
}

function renderBattle(dt) {
  // 背景
  ctx.fillStyle = '#0A0A12';
  ctx.fillRect(0, 0, W, H);

  const battle = battleSystem.getBattleState();
  if (!battle) return;

  // 敌人区域
  ctx.fillStyle = '#E8E4D9';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('敌人', W / 2, 30);

  // 绘制敌人
  const enemyY = 100;
  const enemySpacing = W / (battle.enemies.length + 1);

  battle.enemies.forEach((enemy, i) => {
    const x = enemySpacing * (i + 1);

    // 敌人图标
    ctx.fillStyle = enemy.type === 'boss' ? '#FF4444' : '#E8E4D9';
    ctx.font = '32px sans-serif';
    ctx.fillText(enemy.type === 'boss' ? '👹' : '👾', x, enemyY);

    // 敌人名字和血量
    ctx.font = '12px sans-serif';
    ctx.fillText(enemy.name, x, enemyY + 30);
    ctx.fillText(`HP: ${enemy.currentHp}/${enemy.maxHp}`, x, enemyY + 48);

    // 血条
    const barW = 60;
    const barH = 6;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x - barW / 2, enemyY + 55, barW, barH);
    ctx.fillStyle = '#FF4444';
    ctx.fillRect(x - barW / 2, enemyY + 55, barW * (enemy.currentHp / enemy.maxHp), barH);
  });

  // 玩家区域
  if (currentCharacter) {
    const playerY = H - 150;

    // 玩家图标
    ctx.fillStyle = '#FFD700';
    ctx.font = '40px sans-serif';
    ctx.fillText('⚔️', W / 2, playerY);

    // 玩家状态
    ctx.fillStyle = '#E8E4D9';
    ctx.font = '14px sans-serif';
    ctx.fillText(currentCharacter.name, W / 2, playerY + 35);
    ctx.fillText(`HP: ${currentCharacter.currentHp}/${currentCharacter.currentStats.hp}`, W / 2, playerY + 55);

    // HP条
    const barW = 120;
    const barH = 8;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(W / 2 - barW / 2, playerY + 65, barW, barH);
    ctx.fillStyle = '#44FF44';
    ctx.fillRect(W / 2 - barW / 2, playerY + 65, barW * (currentCharacter.currentHp / currentCharacter.currentStats.hp), barH);
  }

  // 战斗按钮
  const btnY = H - 50;
  const btnW = 80;
  const btnH = 35;
  const btnGap = 20;

  // 攻击按钮
  ctx.fillStyle = 'rgba(255, 68, 68, 0.3)';
  ctx.strokeStyle = '#FF4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(W / 2 - btnW - btnGap / 2, btnY - btnH / 2, btnW, btnH, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FF4444';
  ctx.font = '14px sans-serif';
  ctx.fillText('攻击', W / 2 - btnW / 2 - btnGap / 2, btnY);

  // 逃跑按钮
  ctx.fillStyle = 'rgba(68, 136, 255, 0.3)';
  ctx.strokeStyle = '#4488FF';
  ctx.beginPath();
  ctx.roundRect(W / 2 + btnGap / 2, btnY - btnH / 2, btnW, btnH, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#4488FF';
  ctx.fillText('逃跑', W / 2 + btnW / 2 + btnGap / 2, btnY);

  // 战斗日志
  const log = battleSystem.getBattleLog();
  if (log.length > 0) {
    ctx.fillStyle = 'rgba(232, 228, 217, 0.8)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    const recentLogs = log.slice(-3);
    recentLogs.forEach((entry, i) => {
      ctx.fillText(entry.message, 20, H / 2 + 20 + i * 18);
    });
  }

  // 检查战斗结果
  if (battle.state === 'victory') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#44FF44';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('战斗胜利!', W / 2, H / 2);
    ctx.font = '16px sans-serif';
    ctx.fillText('点击继续', W / 2, H / 2 + 40);
  } else if (battle.state === 'defeat') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#FF4444';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('战斗失败', W / 2, H / 2);
    ctx.font = '16px sans-serif';
    ctx.fillText('点击继续', W / 2, H / 2 + 40);
  }
}

function renderGameOver(dt) {
  ctx.fillStyle = '#0A0A12';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#FF4444';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('游戏结束', W / 2, H / 3);

  ctx.fillStyle = '#E8E4D9';
  ctx.font = '16px sans-serif';
  ctx.fillText('线下存档已清空', W / 2, H / 3 + 40);
  ctx.fillText('线上数据已保留', W / 2, H / 3 + 65);

  // 重新开始按钮
  const btnY = H * 0.6;
  const btnW = 160;
  const btnH = 45;

  ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(W / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('重新开始', W / 2, btnY);
}

// =============== UI 辅助函数 ===============

function drawCharacterHUD() {
  const hudX = 10;
  const hudY = 10;
  const hudW = 180;
  const hudH = 100;

  ctx.fillStyle = 'rgba(20, 20, 35, 0.85)';
  ctx.beginPath();
  ctx.roundRect(hudX, hudY, hudW, hudH, 12);
  ctx.fill();

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(currentCharacter.name, hudX + 10, hudY + 22);

  ctx.fillStyle = '#E8E4D9';
  ctx.font = '12px sans-serif';
  ctx.fillText(`Lv.${currentCharacter.level} ${CLASSES[currentCharacter.classId].nameCN}`, hudX + 10, hudY + 40);

  // HP条
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(hudX + 10, hudY + 50, hudW - 20, 8);
  ctx.fillStyle = '#44FF44';
  ctx.fillRect(hudX + 10, hudY + 50, (hudW - 20) * (currentCharacter.currentHp / currentCharacter.currentStats.hp), 8);
  ctx.fillStyle = '#E8E4D9';
  ctx.font = '10px sans-serif';
  ctx.fillText(`HP: ${currentCharacter.currentHp}/${currentCharacter.currentStats.hp}`, hudX + 10, hudY + 72);

  // MP条
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(hudX + 10, hudY + 78, hudW - 20, 6);
  ctx.fillStyle = '#4488FF';
  ctx.fillRect(hudX + 10, hudY + 78, (hudW - 20) * (currentCharacter.currentMp / currentCharacter.currentStats.mp), 6);
  ctx.fillText(`MP: ${currentCharacter.currentMp}/${currentCharacter.currentStats.mp}`, hudX + 10, hudY + 95);
}

function drawMenuButtons() {
  const btnY = H - 60;
  const btnW = 100;
  const btnH = 40;
  const btnGap = 15;

  // 冒险按钮
  ctx.fillStyle = 'rgba(255, 68, 68, 0.2)';
  ctx.strokeStyle = '#FF4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(W / 2 - btnW - btnGap, btnY - btnH / 2, btnW, btnH, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FF4444';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('冒险', W / 2 - btnW / 2 - btnGap, btnY + 5);

  // 乾宫按钮
  ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
  ctx.strokeStyle = '#FFD700';
  ctx.beginPath();
  ctx.roundRect(W / 2 + btnGap, btnY - btnH / 2, btnW, btnH, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FFD700';
  ctx.fillText('乾宫', W / 2 + btnW / 2 + btnGap, btnY + 5);
}

// =============== 触摸处理 ===============

wx.onTouchStart((e) => {
  if (e.touches.length > 0) {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  }
});

wx.onTouchEnd((e) => {
  if (!touchStart || !e.changedTouches.length) return;

  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  const dt = Date.now() - touchStart.t;

  // 判断是否为点击
  if (dt < 300 && Math.abs(dx) < 30 && Math.abs(dy) < 30) {
    handleTap(touch.clientX, touch.clientY);
  }

  touchStart = null;
});

function handleTap(x, y) {
  switch (gameState) {
    case GAME_STATES.TITLE:
      handleTitleTap(x, y);
      break;
    case GAME_STATES.MAIN_MENU:
      handleMenuTap(x, y);
      break;
    case GAME_STATES.CREATE_CHAR:
      handleCreateCharTap(x, y);
      break;
    case GAME_STATES.ADVENTURE:
      handleAdventureTap(x, y);
      break;
    case GAME_STATES.BATTLE:
      handleBattleTap(x, y);
      break;
    case GAME_STATES.GAME_OVER:
      handleGameOverTap(x, y);
      break;
  }
}

function handleTitleTap(x, y) {
  const btnY = H * 0.75;
  const btnW = 180;
  const btnH = 50;

  // 开始/继续按钮
  if (x >= W / 2 - btnW / 2 && x <= W / 2 + btnW / 2 &&
    y >= btnY - btnH / 2 && y <= btnY + btnH / 2) {
    if (SaveManager.hasOfflineSave()) {
      const data = SaveManager.loadOffline();
      if (data && data.character) {
        currentCharacter = data.character;
        currentWave = data.currentWave || 0;
        gameState = GAME_STATES.MAIN_MENU;
      }
    } else {
      gameState = GAME_STATES.CREATE_CHAR;
    }
    return;
  }

  // 新游戏按钮
  if (SaveManager.hasOfflineSave()) {
    const btn2Y = btnY + 70;
    if (x >= W / 2 - btnW / 2 && x <= W / 2 + btnW / 2 &&
      y >= btn2Y - btnH / 2 && y <= btn2Y + btnH / 2) {
      SaveManager.clearOffline();
      gameState = GAME_STATES.CREATE_CHAR;
    }
  }
}

function handleMenuTap(x, y) {
  const btnY = H - 60;
  const btnW = 100;
  const btnH = 40;
  const btnGap = 15;

  // 冒险按钮
  if (x >= W / 2 - btnW - btnGap && x <= W / 2 - btnGap &&
    y >= btnY - btnH / 2 && y <= btnY + btnH / 2) {
    gameState = GAME_STATES.ADVENTURE;
    yaoSystem.initSeed();
    return;
  }

  // 乾宫按钮
  if (x >= W / 2 + btnGap && x <= W / 2 + btnW + btnGap &&
    y >= btnY - btnH / 2 && y <= btnY + btnH / 2) {
    // TODO: 进入乾宫（系统界面）
    wx.showToast({ title: '乾宫功能开发中', icon: 'none' });
  }
}

function handleCreateCharTap(x, y) {
  const classIds = Object.keys(CLASSES);

  // 左箭头
  if (x < 60) {
    selectedClassIndex = (selectedClassIndex - 1 + classIds.length) % classIds.length;
    return;
  }

  // 右箭头
  if (x > W - 60) {
    selectedClassIndex = (selectedClassIndex + 1) % classIds.length;
    return;
  }

  // 创建按钮
  const btnY = H - 80;
  const btnW = 160;
  const btnH = 45;
  if (x >= W / 2 - btnW / 2 && x <= W / 2 + btnW / 2 &&
    y >= btnY - btnH / 2 && y <= btnY + btnH / 2) {
    // 创建角色
    currentCharacter = new Character({
      name: characterName,
      classId: classIds[selectedClassIndex]
    });
    currentWave = 0;

    // 保存
    SaveManager.saveOffline({
      character: currentCharacter,
      currentWave: 0
    });

    gameState = GAME_STATES.MAIN_MENU;
  }
}

function handleAdventureTap(x, y) {
  const btnY = H / 2;
  const btnW = 140;
  const btnH = 50;

  // 进入战斗按钮
  if (x >= W / 2 - btnW / 2 && x <= W / 2 + btnW / 2 &&
    y >= btnY - btnH / 2 && y <= btnY + btnH / 2) {
    // 生成敌人并开始战斗
    const enemies = BattleSystem.generateWave(currentWave + 1, 'forest');
    battleSystem.startBattle(currentCharacter, enemies);
    gameState = GAME_STATES.BATTLE;
    return;
  }

  // 爻变按钮
  const yaoY = btnY + 70;
  if (x >= W / 2 - btnW / 2 && x <= W / 2 + btnW / 2 &&
    y >= yaoY - btnH / 2 && y <= yaoY + btnH / 2) {
    // 投骰决定是否爻变
    const result = yaoSystem.rollForYaoChange();
    if (result.triggered) {
      const change = yaoSystem.changeYao(result.yaoIndex, result.newValue);
      wx.showToast({
        title: `爻变! ${change.yaoMeaning.name}`,
        icon: 'none',
        duration: 2000
      });
    } else {
      wx.showToast({
        title: `骰子点数: ${result.roll}，未触发爻变`,
        icon: 'none'
      });
    }
  }
}

function handleBattleTap(x, y) {
  const battle = battleSystem.getBattleState();
  if (!battle) return;

  // 战斗结束时点击任意位置继续
  if (battle.state === 'victory') {
    currentWave++;
    SaveManager.saveOffline({ character: currentCharacter, currentWave });
    gameState = GAME_STATES.ADVENTURE;
    return;
  }

  if (battle.state === 'defeat') {
    SaveManager.recordDeath(currentCharacter);
    currentCharacter = null;
    currentWave = 0;
    gameState = GAME_STATES.GAME_OVER;
    return;
  }

  const btnY = H - 50;
  const btnW = 80;
  const btnH = 35;
  const btnGap = 20;

  // 攻击按钮
  if (x >= W / 2 - btnW - btnGap / 2 && x <= W / 2 - btnGap / 2 &&
    y >= btnY - btnH / 2 && y <= btnY + btnH / 2) {
    // 攻击第一个活着的敌人
    const targetIndex = battle.enemies.findIndex(e => e.currentHp > 0);
    if (targetIndex >= 0) {
      battleSystem.playerAttack(targetIndex);

      // 敌人反击
      setTimeout(() => {
        const state = battleSystem.getBattleState();
        if (state && state.state === 'active') {
          state.enemies.forEach((enemy, i) => {
            if (enemy.currentHp > 0) {
              battleSystem.enemyAttack(i);
            }
          });
        }
      }, 500);
    }
    return;
  }

  // 逃跑按钮
  if (x >= W / 2 + btnGap / 2 && x <= W / 2 + btnW + btnGap / 2 &&
    y >= btnY - btnH / 2 && y <= btnY + btnH / 2) {
    const result = battleSystem.tryEscape();
    if (result.escaped) {
      gameState = GAME_STATES.ADVENTURE;
    }
  }
}

function handleGameOverTap(x, y) {
  const btnY = H * 0.6;
  const btnW = 160;
  const btnH = 45;

  if (x >= W / 2 - btnW / 2 && x <= W / 2 + btnW / 2 &&
    y >= btnY - btnH / 2 && y <= btnY + btnH / 2) {
    gameState = GAME_STATES.CREATE_CHAR;
    selectedClassIndex = 0;
  }
}

// =============== 启动游戏 ===============

init();
console.log('八卦立方体 Roguelike 已启动');
