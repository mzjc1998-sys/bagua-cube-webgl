/**
 * UI系统 - 背包、聊天、菜单等
 */

import { BlockNames, BlockType } from './world.js';

export class UI {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;

    this.width = canvas.width;
    this.height = canvas.height;

    // UI状态
    this.showChat = false;
    this.showMenu = false;
    this.showInventory = false;
    this.chatMessages = [];
    this.chatInput = '';
    this.maxChatMessages = 10;

    // 虚拟摇杆
    this.joystick = {
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      radius: 60
    };

    // 按钮区域
    this.buttons = {};
    this.setupButtons();

    // 方块颜色
    this.blockColors = {
      [BlockType.GRASS]: '#4a9f4a',
      [BlockType.DIRT]: '#8b6c4a',
      [BlockType.STONE]: '#888888',
      [BlockType.WOOD]: '#8b6c4a',
      [BlockType.LEAVES]: '#3a8f3a',
      [BlockType.SAND]: '#e8d898',
      [BlockType.WATER]: '#4a7ab8',
      [BlockType.GLASS]: '#c8e8ff',
      [BlockType.BRICK]: '#b86050',
      [BlockType.COBBLESTONE]: '#707070',
      [BlockType.PLANKS]: '#c8a870',
      [BlockType.BEDROCK]: '#404040'
    };
  }

  // 设置按钮区域
  setupButtons() {
    const btnSize = 60;
    const margin = 20;

    // 右侧操作按钮
    this.buttons.jump = {
      x: this.width - btnSize - margin - 80,
      y: this.height - btnSize * 2 - margin * 2,
      width: btnSize,
      height: btnSize,
      label: '跳'
    };

    this.buttons.place = {
      x: this.width - btnSize - margin,
      y: this.height - btnSize * 2 - margin * 2,
      width: btnSize,
      height: btnSize,
      label: '放'
    };

    this.buttons.break = {
      x: this.width - btnSize - margin - 40,
      y: this.height - btnSize - margin,
      width: btnSize,
      height: btnSize,
      label: '挖'
    };

    // 菜单按钮
    this.buttons.menu = {
      x: this.width - 50,
      y: 10,
      width: 40,
      height: 40,
      label: '≡'
    };

    // 聊天按钮
    this.buttons.chat = {
      x: 10,
      y: 10,
      width: 40,
      height: 40,
      label: '💬'
    };

    // 飞行按钮
    this.buttons.fly = {
      x: this.width - btnSize - margin - 160,
      y: this.height - btnSize - margin,
      width: btnSize * 0.8,
      height: btnSize * 0.8,
      label: '飞'
    };
  }

  // 更新画布大小
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.setupButtons();
  }

  // 渲染UI
  render(player, remotePlayers, targetBlock) {
    this.ctx.save();

    // 准星
    this.renderCrosshair();

    // 快捷栏
    this.renderHotbar(player);

    // 虚拟摇杆
    this.renderJoystick();

    // 操作按钮
    this.renderButtons();

    // 目标方块信息
    if (targetBlock && targetBlock.hit) {
      this.renderTargetInfo(targetBlock);
    }

    // 玩家列表
    this.renderPlayerList(player, remotePlayers);

    // 坐标显示
    this.renderCoordinates(player);

    // 聊天消息
    this.renderChat();

    // 菜单
    if (this.showMenu) {
      this.renderMenu();
    }

    this.ctx.restore();
  }

  // 渲染准星
  renderCrosshair() {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const size = 10;

    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.moveTo(cx - size, cy);
    this.ctx.lineTo(cx + size, cy);
    this.ctx.moveTo(cx, cy - size);
    this.ctx.lineTo(cx, cy + size);
    this.ctx.stroke();
  }

  // 渲染快捷栏
  renderHotbar(player) {
    const slotSize = 50;
    const padding = 4;
    const totalWidth = (slotSize + padding) * 9 - padding;
    const startX = (this.width - totalWidth) / 2;
    const startY = this.height - slotSize - 20;

    for (let i = 0; i < 9; i++) {
      const x = startX + i * (slotSize + padding);
      const y = startY;

      // 背景
      this.ctx.fillStyle = i === player.inventory.selectedSlot ?
        'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(x, y, slotSize, slotSize);

      // 边框
      this.ctx.strokeStyle = i === player.inventory.selectedSlot ?
        'white' : 'rgba(255, 255, 255, 0.3)';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, slotSize, slotSize);

      // 物品
      const item = player.inventory.slots[i];
      if (item) {
        // 方块颜色
        this.ctx.fillStyle = this.blockColors[item.type] || '#888888';
        this.ctx.fillRect(x + 8, y + 8, slotSize - 16, slotSize - 16);

        // 数量
        if (item.count > 1) {
          this.ctx.fillStyle = 'white';
          this.ctx.font = 'bold 14px Arial';
          this.ctx.textAlign = 'right';
          this.ctx.fillText(item.count.toString(), x + slotSize - 4, y + slotSize - 4);
        }
      }

      // 快捷键数字
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.fillText((i + 1).toString(), x + 4, y + 14);
    }
  }

  // 渲染虚拟摇杆
  renderJoystick() {
    const baseX = 100;
    const baseY = this.height - 140;
    const radius = this.joystick.radius;

    // 外圈
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.beginPath();
    this.ctx.arc(baseX, baseY, radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // 内圈（控制点）
    let knobX = baseX;
    let knobY = baseY;

    if (this.joystick.active) {
      const dx = this.joystick.currentX - this.joystick.startX;
      const dy = this.joystick.currentY - this.joystick.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        const maxDist = radius * 0.8;
        const clampedDist = Math.min(dist, maxDist);
        knobX = baseX + (dx / dist) * clampedDist;
        knobY = baseY + (dy / dist) * clampedDist;
      }
    }

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.beginPath();
    this.ctx.arc(knobX, knobY, radius * 0.4, 0, Math.PI * 2);
    this.ctx.fill();

    // 保存摇杆基础位置供触摸检测使用
    this.joystick.baseX = baseX;
    this.joystick.baseY = baseY;
  }

  // 渲染按钮
  renderButtons() {
    for (const [name, btn] of Object.entries(this.buttons)) {
      // 背景
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(btn.x, btn.y, btn.width, btn.height);

      // 边框
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);

      // 文字
      this.ctx.fillStyle = 'white';
      this.ctx.font = 'bold 20px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2);
    }
  }

  // 渲染目标方块信息
  renderTargetInfo(target) {
    const name = BlockNames[target.block] || '未知';
    const pos = target.position;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(this.width / 2 - 60, 10, 120, 25);

    this.ctx.fillStyle = 'white';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${name} (${pos.x}, ${pos.y}, ${pos.z})`, this.width / 2, 27);
  }

  // 渲染玩家列表
  renderPlayerList(player, remotePlayers) {
    const x = this.width - 150;
    let y = 60;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(x - 10, y - 15, 150, 25 + remotePlayers.size * 20);

    this.ctx.fillStyle = 'white';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'left';

    // 当前玩家
    this.ctx.fillStyle = '#4af';
    this.ctx.fillText(`● ${player.name} (你)`, x, y);
    y += 20;

    // 其他玩家
    this.ctx.fillStyle = 'white';
    for (const [id, remote] of remotePlayers) {
      this.ctx.fillText(`● ${remote.name}`, x, y);
      y += 20;
    }
  }

  // 渲染坐标
  renderCoordinates(player) {
    const x = Math.floor(player.position.x);
    const y = Math.floor(player.position.y);
    const z = Math.floor(player.position.z);

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(10, 60, 150, 60);

    this.ctx.fillStyle = 'white';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`X: ${x}`, 20, 78);
    this.ctx.fillText(`Y: ${y}`, 20, 93);
    this.ctx.fillText(`Z: ${z}`, 20, 108);

    if (player.flying) {
      this.ctx.fillStyle = '#4af';
      this.ctx.fillText('飞行模式', 80, 78);
    }
  }

  // 渲染聊天
  renderChat() {
    if (this.chatMessages.length === 0) return;

    const x = 10;
    let y = this.height - 200;
    const lineHeight = 20;

    // 只显示最近的消息
    const recentMessages = this.chatMessages.slice(-this.maxChatMessages);

    for (const msg of recentMessages) {
      // 计算淡出效果
      const age = Date.now() - msg.time;
      const alpha = Math.max(0, 1 - age / 10000); // 10秒后淡出

      if (alpha <= 0) continue;

      this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.5})`;
      this.ctx.fillRect(x, y - 15, 300, lineHeight);

      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.font = '14px Arial';
      this.ctx.textAlign = 'left';

      const text = msg.playerName ? `<${msg.playerName}> ${msg.message}` : msg.message;
      this.ctx.fillText(text, x + 5, y);

      y += lineHeight;
    }
  }

  // 渲染菜单
  renderMenu() {
    // 半透明背景
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 菜单框
    const menuWidth = 300;
    const menuHeight = 400;
    const menuX = (this.width - menuWidth) / 2;
    const menuY = (this.height - menuHeight) / 2;

    this.ctx.fillStyle = 'rgba(50, 50, 50, 0.9)';
    this.ctx.fillRect(menuX, menuY, menuWidth, menuHeight);

    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(menuX, menuY, menuWidth, menuHeight);

    // 标题
    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('游戏菜单', this.width / 2, menuY + 40);

    // 菜单选项
    const options = ['继续游戏', '设置', '返回大厅'];
    const optionHeight = 50;
    let optionY = menuY + 80;

    this.menuButtons = [];

    for (const option of options) {
      const btn = {
        x: menuX + 30,
        y: optionY,
        width: menuWidth - 60,
        height: optionHeight - 10,
        label: option
      };
      this.menuButtons.push(btn);

      this.ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
      this.ctx.fillRect(btn.x, btn.y, btn.width, btn.height);

      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);

      this.ctx.fillStyle = 'white';
      this.ctx.font = '18px Arial';
      this.ctx.fillText(option, this.width / 2, optionY + 28);

      optionY += optionHeight;
    }
  }

  // 添加聊天消息
  addChatMessage(message, playerName = null) {
    this.chatMessages.push({
      message: message,
      playerName: playerName,
      time: Date.now()
    });

    // 限制消息数量
    if (this.chatMessages.length > 50) {
      this.chatMessages.shift();
    }
  }

  // 检测按钮点击
  checkButtonHit(x, y) {
    for (const [name, btn] of Object.entries(this.buttons)) {
      if (x >= btn.x && x <= btn.x + btn.width &&
          y >= btn.y && y <= btn.y + btn.height) {
        return name;
      }
    }
    return null;
  }

  // 检测快捷栏点击
  checkHotbarHit(x, y) {
    const slotSize = 50;
    const padding = 4;
    const totalWidth = (slotSize + padding) * 9 - padding;
    const startX = (this.width - totalWidth) / 2;
    const startY = this.height - slotSize - 20;

    if (y >= startY && y <= startY + slotSize) {
      const slotIndex = Math.floor((x - startX) / (slotSize + padding));
      if (slotIndex >= 0 && slotIndex < 9) {
        return slotIndex;
      }
    }
    return -1;
  }

  // 检测摇杆区域
  checkJoystickHit(x, y) {
    const dx = x - this.joystick.baseX;
    const dy = y - this.joystick.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist <= this.joystick.radius * 1.5;
  }

  // 开始摇杆控制
  startJoystick(x, y) {
    this.joystick.active = true;
    this.joystick.startX = this.joystick.baseX;
    this.joystick.startY = this.joystick.baseY;
    this.joystick.currentX = x;
    this.joystick.currentY = y;
  }

  // 更新摇杆
  updateJoystick(x, y) {
    if (this.joystick.active) {
      this.joystick.currentX = x;
      this.joystick.currentY = y;
    }
  }

  // 结束摇杆控制
  endJoystick() {
    this.joystick.active = false;
  }

  // 获取摇杆输入
  getJoystickInput() {
    if (!this.joystick.active) {
      return { x: 0, y: 0 };
    }

    const dx = this.joystick.currentX - this.joystick.startX;
    const dy = this.joystick.currentY - this.joystick.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) {
      return { x: 0, y: 0 };
    }

    const maxDist = this.joystick.radius * 0.8;
    const normalizedDist = Math.min(dist, maxDist) / maxDist;

    return {
      x: (dx / dist) * normalizedDist,
      y: (dy / dist) * normalizedDist
    };
  }

  // 检测菜单按钮点击
  checkMenuHit(x, y) {
    if (!this.showMenu || !this.menuButtons) return -1;

    for (let i = 0; i < this.menuButtons.length; i++) {
      const btn = this.menuButtons[i];
      if (x >= btn.x && x <= btn.x + btn.width &&
          y >= btn.y && y <= btn.y + btn.height) {
        return i;
      }
    }
    return -1;
  }

  // 切换菜单
  toggleMenu() {
    this.showMenu = !this.showMenu;
  }
}

export default UI;
