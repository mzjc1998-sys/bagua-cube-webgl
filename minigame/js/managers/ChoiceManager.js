/**
 * 选择分支管理器
 * 处理玩家选项的显示和选择
 */
class ChoiceManager {
  constructor() {
    // 选项列表
    this.choices = [];

    // 是否显示
    this.visible = false;

    // 选项框配置
    this.config = {
      marginX: 40,
      marginY: 60,
      itemHeight: 60,
      itemSpacing: 15,
      borderRadius: 10,
      backgroundColor: 'rgba(30, 30, 50, 0.9)',
      hoverColor: 'rgba(60, 60, 90, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.4)',
      selectedBorderColor: '#FFD700',
      borderWidth: 2,
      fontSize: 17,
      textColor: '#ffffff'
    };

    // 动画
    this.animation = {
      alpha: 0,
      targetAlpha: 0,
      itemOffsets: []
    };

    // 选中状态（用于视觉反馈）
    this.hoveredIndex = -1;

    // 缓存的选项区域
    this.choiceRects = [];
  }

  /**
   * 设置选项
   */
  setChoices(choices) {
    this.choices = choices || [];
    this.visible = false;
    this.animation.alpha = 0;
    this.animation.targetAlpha = 0;
    this.animation.itemOffsets = this.choices.map(() => 30);
    this.hoveredIndex = -1;
    this.choiceRects = [];
  }

  /**
   * 显示选项
   */
  show() {
    if (this.choices.length === 0) return;
    this.visible = true;
    this.animation.targetAlpha = 1;
  }

  /**
   * 隐藏选项
   */
  hide() {
    this.animation.targetAlpha = 0;
  }

  /**
   * 清空选项
   */
  clear() {
    this.choices = [];
    this.visible = false;
    this.animation.alpha = 0;
    this.animation.targetAlpha = 0;
    this.choiceRects = [];
  }

  /**
   * 检查是否活跃
   */
  isActive() {
    return this.visible && this.choices.length > 0;
  }

  /**
   * 获取点击位置的选项索引
   */
  getChoiceAt(x, y) {
    for (let i = 0; i < this.choiceRects.length; i++) {
      const rect = this.choiceRects[i];
      if (x >= rect.x && x <= rect.x + rect.width &&
          y >= rect.y && y <= rect.y + rect.height) {
        return i;
      }
    }
    return null;
  }

  /**
   * 获取指定索引的选项
   */
  getChoice(index) {
    return this.choices[index] || null;
  }

  /**
   * 更新动画
   */
  update(deltaTime) {
    // 更新整体透明度
    const alphaSpeed = 0.006;
    if (this.animation.alpha < this.animation.targetAlpha) {
      this.animation.alpha = Math.min(
        this.animation.targetAlpha,
        this.animation.alpha + alphaSpeed * deltaTime
      );
    } else if (this.animation.alpha > this.animation.targetAlpha) {
      this.animation.alpha = Math.max(
        this.animation.targetAlpha,
        this.animation.alpha - alphaSpeed * deltaTime
      );

      // 完全隐藏后清理
      if (this.animation.alpha <= 0) {
        this.visible = false;
      }
    }

    // 更新各选项的滑入动画
    const offsetSpeed = 0.15;
    for (let i = 0; i < this.animation.itemOffsets.length; i++) {
      if (this.animation.itemOffsets[i] > 0) {
        this.animation.itemOffsets[i] = Math.max(
          0,
          this.animation.itemOffsets[i] - offsetSpeed * deltaTime
        );
      }
    }
  }

  /**
   * 渲染选项
   */
  render(ctx, screenWidth, screenHeight) {
    if (!this.visible || this.choices.length === 0) return;

    const config = this.config;
    const alpha = this.animation.alpha;

    // 计算选项区域
    const totalHeight = this.choices.length * config.itemHeight +
                       (this.choices.length - 1) * config.itemSpacing;
    const startY = (screenHeight - totalHeight) / 2;

    ctx.save();
    ctx.globalAlpha = alpha;

    // 半透明遮罩背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    // 清空缓存
    this.choiceRects = [];

    // 绘制每个选项
    for (let i = 0; i < this.choices.length; i++) {
      const choice = this.choices[i];
      const offset = this.animation.itemOffsets[i] || 0;

      const x = config.marginX + offset;
      const y = startY + i * (config.itemHeight + config.itemSpacing);
      const width = screenWidth - config.marginX * 2;
      const height = config.itemHeight;

      // 缓存选项区域用于点击检测
      this.choiceRects.push({ x, y, width, height });

      // 背景
      const isHovered = i === this.hoveredIndex;
      ctx.fillStyle = isHovered ? config.hoverColor : config.backgroundColor;
      ctx.beginPath();
      this.roundRect(ctx, x, y, width, height, config.borderRadius);
      ctx.fill();

      // 边框
      ctx.strokeStyle = isHovered ? config.selectedBorderColor : config.borderColor;
      ctx.lineWidth = config.borderWidth;
      ctx.stroke();

      // 选项文字
      ctx.fillStyle = config.textColor;
      ctx.font = `${config.fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(choice.text, x + width / 2, y + height / 2);
    }

    ctx.restore();
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

export default ChoiceManager;
