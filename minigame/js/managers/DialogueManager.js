/**
 * 对话管理器
 * 处理对话显示、打字机效果、角色头像等
 */
class DialogueManager {
  constructor() {
    // 对话队列
    this.dialogues = [];
    this.currentIndex = 0;

    // 当前对话
    this.currentDialogue = null;
    this.displayedText = '';
    this.charIndex = 0;

    // 打字机效果
    this.typewriterSpeed = 50; // 每个字符的间隔（毫秒）
    this.typewriterTimer = 0;
    this.isTyping = false;
    this.skipTyping = false;

    // 对话框配置
    this.boxConfig = {
      marginX: 20,
      marginBottom: 30,
      height: 180,
      padding: 20,
      borderRadius: 12,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      borderColor: 'rgba(255, 255, 255, 0.3)',
      borderWidth: 2
    };

    // 文字配置
    this.textConfig = {
      fontSize: 18,
      lineHeight: 28,
      color: '#ffffff',
      nameColor: '#FFD700',
      nameFontSize: 16
    };

    // 完成回调
    this.onComplete = null;

    // 头像缓存
    this.avatarCache = new Map();

    // 继续提示动画
    this.continueIndicator = {
      visible: false,
      alpha: 1,
      direction: -1
    };
  }

  /**
   * 设置对话队列
   */
  setDialogues(dialogues, onComplete) {
    this.dialogues = dialogues || [];
    this.currentIndex = 0;
    this.onComplete = onComplete;
    this.showNextDialogue();
  }

  /**
   * 显示下一条对话
   */
  showNextDialogue() {
    if (this.currentIndex >= this.dialogues.length) {
      // 所有对话完成
      this.currentDialogue = null;
      if (this.onComplete) {
        this.onComplete();
      }
      return;
    }

    this.currentDialogue = this.dialogues[this.currentIndex];
    this.displayedText = '';
    this.charIndex = 0;
    this.isTyping = true;
    this.skipTyping = false;
    this.typewriterTimer = 0;
    this.continueIndicator.visible = false;
  }

  /**
   * 推进对话
   */
  advance() {
    if (this.isTyping) {
      // 跳过打字效果，直接显示全部文字
      this.skipTyping = true;
      this.displayedText = this.currentDialogue?.text || '';
      this.isTyping = false;
      this.continueIndicator.visible = true;
    } else if (this.currentDialogue) {
      // 显示下一条对话
      this.currentIndex++;
      this.showNextDialogue();
    }
  }

  /**
   * 清空对话
   */
  clear() {
    this.dialogues = [];
    this.currentIndex = 0;
    this.currentDialogue = null;
    this.displayedText = '';
    this.isTyping = false;
  }

  /**
   * 更新
   */
  update(deltaTime) {
    // 更新打字机效果
    if (this.isTyping && this.currentDialogue) {
      this.typewriterTimer += deltaTime;

      while (this.typewriterTimer >= this.typewriterSpeed && this.charIndex < this.currentDialogue.text.length) {
        this.typewriterTimer -= this.typewriterSpeed;
        this.displayedText += this.currentDialogue.text[this.charIndex];
        this.charIndex++;
      }

      if (this.charIndex >= this.currentDialogue.text.length) {
        this.isTyping = false;
        this.continueIndicator.visible = true;
      }
    }

    // 更新继续提示动画
    if (this.continueIndicator.visible) {
      this.continueIndicator.alpha += this.continueIndicator.direction * deltaTime * 0.003;
      if (this.continueIndicator.alpha <= 0.3) {
        this.continueIndicator.alpha = 0.3;
        this.continueIndicator.direction = 1;
      } else if (this.continueIndicator.alpha >= 1) {
        this.continueIndicator.alpha = 1;
        this.continueIndicator.direction = -1;
      }
    }
  }

  /**
   * 渲染对话框
   */
  render(ctx, screenWidth, screenHeight) {
    if (!this.currentDialogue) return;

    const box = this.boxConfig;
    const text = this.textConfig;

    // 对话框位置和大小
    const boxX = box.marginX;
    const boxY = screenHeight - box.marginBottom - box.height;
    const boxWidth = screenWidth - box.marginX * 2;
    const boxHeight = box.height;

    // 绘制对话框背景
    ctx.save();

    // 背景
    ctx.fillStyle = box.backgroundColor;
    ctx.beginPath();
    this.roundRect(ctx, boxX, boxY, boxWidth, boxHeight, box.borderRadius);
    ctx.fill();

    // 边框
    ctx.strokeStyle = box.borderColor;
    ctx.lineWidth = box.borderWidth;
    ctx.stroke();

    // 绘制角色名称
    let textStartY = boxY + box.padding;
    if (this.currentDialogue.name) {
      ctx.fillStyle = text.nameColor;
      ctx.font = `bold ${text.nameFontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.fillText(this.currentDialogue.name, boxX + box.padding, textStartY + text.nameFontSize);
      textStartY += text.nameFontSize + 10;
    }

    // 绘制对话文字（支持自动换行）
    ctx.fillStyle = text.color;
    ctx.font = `${text.fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;

    const maxWidth = boxWidth - box.padding * 2;
    const lines = this.wrapText(ctx, this.displayedText, maxWidth);

    let lineY = textStartY + text.fontSize;
    for (const line of lines) {
      if (lineY > boxY + boxHeight - box.padding) break;
      ctx.fillText(line, boxX + box.padding, lineY);
      lineY += text.lineHeight;
    }

    // 绘制继续提示
    if (this.continueIndicator.visible) {
      ctx.globalAlpha = this.continueIndicator.alpha;
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('点击继续 ▼', boxX + boxWidth - box.padding, boxY + boxHeight - box.padding);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  /**
   * 文字自动换行
   */
  wrapText(ctx, text, maxWidth) {
    const lines = [];
    let currentLine = '';

    for (const char of text) {
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
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

  /**
   * 检查是否有活跃对话
   */
  hasActiveDialogue() {
    return this.currentDialogue !== null;
  }

  /**
   * 设置打字速度
   */
  setTypewriterSpeed(speed) {
    this.typewriterSpeed = speed;
  }
}

export default DialogueManager;
