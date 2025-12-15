/**
 * UI渲染器
 * 处理标题画面、菜单、按钮等UI元素
 */
class UIRenderer {
  constructor() {
    // 游戏标题
    this.gameTitle = '黎明之前';
    this.gameSubtitle = 'Before Dawn';

    // 标题画面按钮
    this.titleButtons = [];

    // 菜单按钮
    this.menuButton = null;
    this.menuButtons = [];

    // 标题画面动画
    this.titleAnimation = {
      alpha: 0,
      subtitleAlpha: 0,
      buttonsAlpha: 0
    };

    // 按钮配置
    this.buttonConfig = {
      width: 200,
      height: 50,
      borderRadius: 25,
      fontSize: 18,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      hoverBackgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderColor: 'rgba(255, 255, 255, 0.5)',
      textColor: '#ffffff'
    };
  }

  /**
   * 设置游戏标题
   */
  setTitle(title, subtitle) {
    this.gameTitle = title;
    this.gameSubtitle = subtitle;
  }

  /**
   * 渲染标题画面
   */
  renderTitle(ctx, screenWidth, screenHeight) {
    // 背景渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, screenHeight);
    gradient.addColorStop(0, '#0d1b2a');
    gradient.addColorStop(0.3, '#1b263b');
    gradient.addColorStop(0.6, '#415a77');
    gradient.addColorStop(0.8, '#778da9');
    gradient.addColorStop(1, '#e0e1dd');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    // 装饰性粒子/星星
    this.renderTitleParticles(ctx, screenWidth, screenHeight);

    // 主标题
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 标题阴影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 5;

    ctx.font = `bold 42px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.fillText(this.gameTitle, screenWidth / 2, screenHeight * 0.3);

    // 副标题
    ctx.font = `300 18px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(this.gameSubtitle, screenWidth / 2, screenHeight * 0.3 + 50);

    ctx.restore();

    // 渲染按钮
    this.renderTitleButtons(ctx, screenWidth, screenHeight);
  }

  /**
   * 渲染标题画面粒子
   */
  renderTitleParticles(ctx, screenWidth, screenHeight) {
    ctx.save();
    const time = Date.now() * 0.001;

    // 星星效果
    for (let i = 0; i < 50; i++) {
      const x = (Math.sin(i * 0.5 + time * 0.1) * 0.5 + 0.5) * screenWidth;
      const y = (Math.cos(i * 0.3 + time * 0.05) * 0.3 + 0.2) * screenHeight;
      const alpha = (Math.sin(time + i) * 0.5 + 0.5) * 0.5;
      const size = 1 + Math.sin(i) * 1;

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * 渲染标题按钮
   */
  renderTitleButtons(ctx, screenWidth, screenHeight) {
    const cfg = this.buttonConfig;
    const centerX = screenWidth / 2;
    const startY = screenHeight * 0.55;
    const spacing = 70;

    this.titleButtons = [];

    const buttons = [
      { text: '开始游戏', action: 'start' },
      { text: '继续游戏', action: 'continue' }
    ];

    ctx.save();

    buttons.forEach((btn, index) => {
      const x = centerX - cfg.width / 2;
      const y = startY + index * spacing;

      // 缓存按钮区域
      this.titleButtons.push({
        x,
        y,
        width: cfg.width,
        height: cfg.height,
        action: btn.action
      });

      // 绘制按钮背景
      ctx.fillStyle = cfg.backgroundColor;
      ctx.beginPath();
      this.roundRect(ctx, x, y, cfg.width, cfg.height, cfg.borderRadius);
      ctx.fill();

      // 边框
      ctx.strokeStyle = cfg.borderColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      // 文字
      ctx.fillStyle = cfg.textColor;
      ctx.font = `${cfg.fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.text, centerX, y + cfg.height / 2);
    });

    ctx.restore();
  }

  /**
   * 获取标题按钮列表
   */
  getTitleButtons() {
    return this.titleButtons;
  }

  /**
   * 渲染游戏中的UI
   */
  renderPlayingUI(ctx, screenWidth, screenHeight) {
    // 菜单按钮
    const btnSize = 40;
    const btnX = screenWidth - btnSize - 15;
    const btnY = 15;

    this.menuButton = {
      x: btnX,
      y: btnY,
      width: btnSize,
      height: btnSize
    };

    ctx.save();

    // 按钮背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.arc(btnX + btnSize / 2, btnY + btnSize / 2, btnSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // 菜单图标（三条横线）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const lineWidth = 18;
    const lineSpacing = 6;
    const startX = btnX + (btnSize - lineWidth) / 2;
    const startY = btnY + btnSize / 2 - lineSpacing;

    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(startX, startY + i * lineSpacing);
      ctx.lineTo(startX + lineWidth, startY + i * lineSpacing);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * 获取菜单按钮
   */
  getMenuButton() {
    return this.menuButton;
  }

  /**
   * 渲染暂停菜单
   */
  renderMenu(ctx, screenWidth, screenHeight) {
    // 半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    // 菜单面板
    const panelWidth = 280;
    const panelHeight = 350;
    const panelX = (screenWidth - panelWidth) / 2;
    const panelY = (screenHeight - panelHeight) / 2;

    ctx.save();

    // 面板背景
    ctx.fillStyle = 'rgba(20, 30, 50, 0.95)';
    ctx.beginPath();
    this.roundRect(ctx, panelX, panelY, panelWidth, panelHeight, 16);
    ctx.fill();

    // 边框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 标题
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('菜单', screenWidth / 2, panelY + 40);

    // 菜单按钮
    const buttons = [
      { text: '继续游戏', action: 'resume' },
      { text: '保存游戏', action: 'save' },
      { text: '读取存档', action: 'load' },
      { text: '返回标题', action: 'title' }
    ];

    this.menuButtons = [];

    const btnWidth = 200;
    const btnHeight = 45;
    const btnStartY = panelY + 80;
    const btnSpacing = 60;

    buttons.forEach((btn, index) => {
      const x = (screenWidth - btnWidth) / 2;
      const y = btnStartY + index * btnSpacing;

      this.menuButtons.push({
        x,
        y,
        width: btnWidth,
        height: btnHeight,
        action: btn.action
      });

      // 背景
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      this.roundRect(ctx, x, y, btnWidth, btnHeight, 8);
      ctx.fill();

      // 边框
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 文字
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText(btn.text, screenWidth / 2, y + btnHeight / 2);
    });

    ctx.restore();
  }

  /**
   * 获取菜单按钮列表
   */
  getMenuButtons() {
    return this.menuButtons;
  }

  /**
   * 绘制圆角矩形
   */
  roundRect(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }
}

export default UIRenderer;
