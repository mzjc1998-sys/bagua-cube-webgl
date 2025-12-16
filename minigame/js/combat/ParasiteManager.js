/**
 * 寄生虫管理器
 * 管理从尸体断肢处钻出的寄生虫，会在地上扭曲蠕动并追击玩家
 */
class ParasiteManager {
  constructor() {
    // 地面上的寄生虫（会追击玩家）
    this.parasites = [];

    // 正在钻出的寄生虫（从断肢处爬出）
    this.emergingParasites = [];

    // 最大数量
    this.maxParasites = 80;
    this.maxEmergingParasites = 30;

    // 追击速度
    this.chaseSpeed = 0.012;
  }

  /**
   * 从断裂处钻出寄生虫（缓慢爬出效果）
   */
  sprayParasite(worldX, worldY, offsetX, offsetY, amount, angle, force) {
    // 大幅减少数量
    const toSpawn = Math.min(Math.ceil(amount * 0.3), this.maxEmergingParasites - this.emergingParasites.length, 2);

    for (let i = 0; i < toSpawn; i++) {
      // 钻出方向（沿着断裂面的方向）
      const emergeAngle = angle + (Math.random() - 0.5) * 0.4;

      const spawnX = worldX + offsetX * 0.03;
      const spawnY = worldY + offsetY * 0.03;

      this.emergingParasites.push({
        x: spawnX,
        y: spawnY,
        // 钻出进度 0-1
        emergeProgress: 0,
        emergeSpeed: 0.0008 + Math.random() * 0.0005, // 缓慢钻出
        emergeAngle: emergeAngle,
        size: 0.07 + Math.random() * 0.04,
        phase: Math.random() * Math.PI * 2,
        length: 4 + Math.floor(Math.random() * 2)
      });
    }
  }

  /**
   * 在尸体消失位置产生寄生虫
   */
  addParasiteSource(x, y, amount = 10) {
    // 减少数量
    const toSpawn = Math.min(Math.ceil(amount * 0.4), this.maxParasites - this.parasites.length, 5);

    for (let i = 0; i < toSpawn; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.3;

      this.parasites.push({
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius,
        size: 0.06 + Math.random() * 0.03,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.012 + Math.random() * 0.008,
        length: 4 + Math.floor(Math.random() * 2),
        angle: Math.random() * Math.PI * 2,
        life: 25000 + Math.random() * 10000,
        maxLife: 25000 + Math.random() * 10000,
        collected: false,
        chaseDelay: 800 + Math.random() * 500
      });
    }
  }

  /**
   * 更新寄生虫系统
   */
  update(deltaTime, player) {
    // 更新正在钻出的寄生虫
    for (let i = this.emergingParasites.length - 1; i >= 0; i--) {
      const p = this.emergingParasites[i];

      // 缓慢钻出
      p.emergeProgress += p.emergeSpeed * deltaTime;
      p.phase += 0.015 * deltaTime;

      // 沿钻出方向缓慢移动
      const emergeSpeed = 0.0003 * deltaTime;
      p.x += Math.cos(p.emergeAngle) * emergeSpeed;
      p.y += Math.sin(p.emergeAngle) * emergeSpeed * 0.5;

      // 完全钻出后变成地面寄生虫
      if (p.emergeProgress >= 1) {
        if (this.parasites.length < this.maxParasites) {
          this.parasites.push({
            x: p.x,
            y: p.y,
            size: p.size,
            phase: p.phase,
            phaseSpeed: 0.012 + Math.random() * 0.008,
            length: p.length,
            angle: p.emergeAngle,
            life: 20000 + Math.random() * 10000,
            maxLife: 20000 + Math.random() * 10000,
            collected: false,
            chaseDelay: 500 + Math.random() * 300
          });
        }
        this.emergingParasites.splice(i, 1);
      }
    }

    // 更新地面寄生虫
    let collectedCount = 0;
    for (let i = this.parasites.length - 1; i >= 0; i--) {
      const p = this.parasites[i];

      p.life -= deltaTime;
      p.phase += p.phaseSpeed * deltaTime;

      // 追击延迟
      if (p.chaseDelay > 0) {
        p.chaseDelay -= deltaTime;
      }

      // 追击玩家
      if (player && !p.collected && p.chaseDelay <= 0) {
        const dx = player.x - p.x;
        const dy = player.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.3) {
          // 蠕动式移动
          const wriggle = Math.sin(p.phase * 2) * 0.3;
          const speed = this.chaseSpeed * deltaTime * 0.1 * (1 + wriggle);
          p.x += (dx / dist) * speed;
          p.y += (dy / dist) * speed;

          // 平滑转向
          const targetAngle = Math.atan2(dy, dx);
          let angleDiff = targetAngle - p.angle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          p.angle += angleDiff * 0.08;
        }

        // 碰到玩家
        if (dist < 0.35) {
          p.collected = true;
          collectedCount++;
        }
      }

      // 移除死亡或已收集的寄生虫
      if (p.life <= 0 || p.collected) {
        this.parasites.splice(i, 1);
      }
    }

    return collectedCount;
  }

  /**
   * 渲染寄生虫
   */
  render(ctx, renderer) {
    // 渲染正在钻出的寄生虫
    for (const p of this.emergingParasites) {
      this.renderEmergingWorm(ctx, renderer, p);
    }

    // 渲染地面寄生虫
    for (const p of this.parasites) {
      this.renderWorm(ctx, renderer, p);
    }
  }

  /**
   * 渲染正在钻出的蠕虫
   */
  renderEmergingWorm(ctx, renderer, p) {
    const pos = renderer.worldToScreen(p.x, p.y, 0);
    const baseSize = p.size * renderer.zoom * 25;
    const visibleLength = Math.floor(p.length * p.emergeProgress);

    if (visibleLength < 1) return;

    ctx.save();
    ctx.globalAlpha = 0.9;

    const segmentLength = baseSize * 1.0;
    const screenAngle = Math.atan2(
      Math.sin(p.emergeAngle) * 0.5,
      Math.cos(p.emergeAngle)
    );

    // 只绘制已钻出的部分
    const points = [];
    let currentX = pos.x;
    let currentY = pos.y;

    for (let i = 0; i <= visibleLength; i++) {
      const waveOffset = Math.sin(p.phase + i * 1.5) * baseSize * 0.5;
      const perpAngle = screenAngle + Math.PI / 2;

      points.push({
        x: currentX + Math.cos(perpAngle) * waveOffset,
        y: currentY + Math.sin(perpAngle) * waveOffset,
        size: baseSize * (1 - i * 0.1)
      });

      currentX += Math.cos(screenAngle) * segmentLength;
      currentY += Math.sin(screenAngle) * segmentLength;
    }

    // 绘制身体
    this.drawWormBody(ctx, points, baseSize, screenAngle);

    ctx.restore();
  }

  /**
   * 渲染完整蠕虫
   */
  renderWorm(ctx, renderer, p) {
    const pos = renderer.worldToScreen(p.x, p.y, 0);
    const baseSize = p.size * renderer.zoom * 25;

    ctx.save();

    // 透明度
    let alpha = 1;
    if (p.life < 3000) {
      alpha = p.life / 3000;
    }
    ctx.globalAlpha = alpha;

    const segments = p.length || 4;
    const segmentLength = baseSize * 1.0;

    const screenAngle = Math.atan2(
      Math.sin(p.angle) * 0.5,
      Math.cos(p.angle)
    );

    // 计算身体节点
    const points = [];
    let currentX = pos.x;
    let currentY = pos.y;

    for (let i = 0; i <= segments; i++) {
      const waveOffset = Math.sin(p.phase + i * 1.5) * baseSize * 0.5;
      const perpAngle = screenAngle + Math.PI / 2;

      points.push({
        x: currentX + Math.cos(perpAngle) * waveOffset,
        y: currentY + Math.sin(perpAngle) * waveOffset,
        size: baseSize * (1 - i * 0.1)
      });

      currentX -= Math.cos(screenAngle) * segmentLength;
      currentY -= Math.sin(screenAngle) * segmentLength;
    }

    this.drawWormBody(ctx, points, baseSize, screenAngle);

    ctx.restore();
  }

  /**
   * 绘制蠕虫身体
   */
  drawWormBody(ctx, points, baseSize, screenAngle) {
    if (points.length < 2) return;

    // 连接线
    ctx.strokeStyle = 'rgba(20, 8, 15, 0.9)';
    ctx.lineWidth = baseSize * 1.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // 身体节
    for (let i = points.length - 1; i >= 0; i--) {
      const pt = points[i];
      const segSize = Math.max(2, pt.size);
      const brightness = 12 + Math.floor((1 - i / points.length) * 18);

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, segSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${brightness}, ${Math.floor(brightness * 0.3)}, ${Math.floor(brightness * 0.4)})`;
      ctx.fill();
    }

    // 头部
    const head = points[0];
    const headSize = Math.max(3, head.size * 1.1);
    ctx.beginPath();
    ctx.arc(head.x, head.y, headSize, 0, Math.PI * 2);
    ctx.fillStyle = '#1a0808';
    ctx.fill();

    // 眼睛
    const eyeOffset = headSize * 0.35;
    ctx.fillStyle = '#3a1515';
    ctx.beginPath();
    ctx.arc(
      head.x + Math.cos(screenAngle - 0.4) * eyeOffset,
      head.y + Math.sin(screenAngle - 0.4) * eyeOffset * 0.5,
      headSize * 0.18, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.beginPath();
    ctx.arc(
      head.x + Math.cos(screenAngle + 0.4) * eyeOffset,
      head.y + Math.sin(screenAngle + 0.4) * eyeOffset * 0.5,
      headSize * 0.18, 0, Math.PI * 2
    );
    ctx.fill();
  }

  /**
   * 获取寄生虫数量
   */
  getParasiteCount() {
    return this.parasites.length + this.emergingParasites.length;
  }

  /**
   * 清空所有寄生虫
   */
  clear() {
    this.parasites = [];
    this.emergingParasites = [];
  }
}

export default ParasiteManager;
