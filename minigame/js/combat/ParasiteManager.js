/**
 * 寄生虫管理器
 * 管理从尸体喷出的寄生虫，会在地上扭曲蠕动并追击玩家
 */
class ParasiteManager {
  constructor() {
    // 地面上的寄生虫（已落地，会追击玩家）
    this.parasites = [];

    // 飞行中的寄生虫（喷射动画）
    this.flyingParasites = [];

    // 最大数量
    this.maxParasites = 300;
    this.maxFlyingParasites = 150;

    // 重力
    this.gravity = 0.02;

    // 追击速度
    this.chaseSpeed = 0.008;
  }

  /**
   * 从断裂处喷射寄生虫
   */
  sprayParasite(worldX, worldY, offsetX, offsetY, amount, angle, force) {
    const toSpawn = Math.min(amount, this.maxFlyingParasites - this.flyingParasites.length);

    for (let i = 0; i < toSpawn; i++) {
      const spreadAngle = angle + (Math.random() - 0.5) * 0.8;
      const spreadForce = force * (0.5 + Math.random() * 0.5);

      const spawnX = worldX + offsetX * 0.03;
      const spawnY = worldY + offsetY * 0.03;

      this.flyingParasites.push({
        x: spawnX,
        y: spawnY,
        z: 0.5 + Math.random() * 0.3,
        vx: Math.cos(spreadAngle) * spreadForce * 0.025,
        vy: Math.sin(spreadAngle) * spreadForce * 0.015,
        vz: -0.04 - Math.random() * 0.02,
        size: 0.08 + Math.random() * 0.06,
        phase: Math.random() * Math.PI * 2, // 蠕动相位
        length: 3 + Math.floor(Math.random() * 3) // 身体节数
      });
    }
  }

  /**
   * 在尸体消失位置产生寄生虫
   */
  addParasiteSource(x, y, amount = 30) {
    const toSpawn = Math.min(amount, this.maxParasites - this.parasites.length);

    for (let i = 0; i < toSpawn; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.6;

      this.parasites.push({
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius,
        size: 0.06 + Math.random() * 0.04,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.015 + Math.random() * 0.01,
        length: 3 + Math.floor(Math.random() * 3),
        angle: Math.random() * Math.PI * 2, // 朝向
        life: 20000 + Math.random() * 10000,
        maxLife: 20000 + Math.random() * 10000,
        collected: false,
        chaseDelay: 500 + Math.random() * 1000 // 落地后延迟追击
      });
    }
  }

  /**
   * 更新寄生虫系统
   */
  update(deltaTime, player) {
    const dt = deltaTime * 0.1;

    // 更新飞行中的寄生虫
    for (let i = this.flyingParasites.length - 1; i >= 0; i--) {
      const p = this.flyingParasites[i];

      // 应用速度
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // 重力
      p.vz += this.gravity * dt;

      // 蠕动
      p.phase += 0.02 * deltaTime;

      // 空气阻力
      p.vx *= 0.97;
      p.vy *= 0.97;

      // 落地
      if (p.z >= 0) {
        // 转换为地面寄生虫
        this.parasites.push({
          x: p.x,
          y: p.y,
          size: p.size,
          phase: p.phase,
          phaseSpeed: 0.015 + Math.random() * 0.01,
          length: p.length,
          angle: Math.atan2(p.vy, p.vx),
          life: 18000 + Math.random() * 8000,
          maxLife: 18000 + Math.random() * 8000,
          collected: false,
          chaseDelay: 300 + Math.random() * 500
        });
        this.flyingParasites.splice(i, 1);
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
          // 追击移动
          const speed = this.chaseSpeed * dt * (1 + Math.sin(p.phase) * 0.3);
          p.x += (dx / dist) * speed;
          p.y += (dy / dist) * speed;

          // 更新朝向（平滑转向）
          const targetAngle = Math.atan2(dy, dx);
          let angleDiff = targetAngle - p.angle;
          // 归一化角度差
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          p.angle += angleDiff * 0.1;
        }

        // 碰到玩家
        if (dist < 0.4) {
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
    // 渲染地面寄生虫
    for (const p of this.parasites) {
      this.renderWorm(ctx, renderer, p, false);
    }

    // 渲染飞行中的寄生虫
    for (const p of this.flyingParasites) {
      this.renderWorm(ctx, renderer, p, true);
    }
  }

  /**
   * 渲染单个蠕虫
   */
  renderWorm(ctx, renderer, p, isFlying) {
    const screenZ = isFlying ? -p.z * 30 * renderer.zoom : 0;
    const pos = renderer.worldToScreen(p.x, p.y, 0);
    const baseSize = p.size * renderer.zoom * 25;

    ctx.save();

    // 透明度（生命值低时淡出）
    let alpha = 1;
    if (!isFlying && p.life < 3000) {
      alpha = p.life / 3000;
    }
    ctx.globalAlpha = alpha;

    // 蠕虫身体 - 多节扭曲
    const segments = p.length || 4;
    const segmentLength = baseSize * 1.2;

    // 计算每个身体节点的位置
    const points = [];
    let currentX = pos.x;
    let currentY = pos.y + screenZ;
    let currentAngle = p.angle || 0;

    // 转换为屏幕角度（等轴测）
    const screenAngle = Math.atan2(
      Math.sin(currentAngle) * 0.5,
      Math.cos(currentAngle)
    );

    for (let i = 0; i <= segments; i++) {
      // 蠕动偏移
      const waveOffset = Math.sin(p.phase + i * 1.2) * baseSize * 0.6;
      const perpAngle = screenAngle + Math.PI / 2;

      points.push({
        x: currentX + Math.cos(perpAngle) * waveOffset,
        y: currentY + Math.sin(perpAngle) * waveOffset,
        size: baseSize * (1 - i * 0.12) // 头大尾小
      });

      // 下一节位置
      currentX -= Math.cos(screenAngle) * segmentLength;
      currentY -= Math.sin(screenAngle) * segmentLength;
    }

    // 绘制身体（从尾到头）
    for (let i = points.length - 1; i >= 0; i--) {
      const pt = points[i];
      const segSize = Math.max(2, pt.size);

      // 身体节
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, segSize, 0, Math.PI * 2);

      // 颜色渐变（头部较亮）
      const brightness = 10 + Math.floor((1 - i / segments) * 20);
      ctx.fillStyle = `rgb(${brightness}, ${brightness * 0.4}, ${brightness})`;
      ctx.fill();

      // 高光
      if (i === 0) {
        ctx.beginPath();
        ctx.arc(pt.x - segSize * 0.3, pt.y - segSize * 0.3, segSize * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(60, 30, 60, 0.8)';
        ctx.fill();
      }
    }

    // 连接线（让身体更连贯）
    ctx.strokeStyle = 'rgba(15, 8, 15, 0.9)';
    ctx.lineWidth = baseSize * 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // 重新绘制头部（确保在最上层）
    const head = points[0];
    const headSize = Math.max(3, head.size * 1.2);
    ctx.beginPath();
    ctx.arc(head.x, head.y, headSize, 0, Math.PI * 2);
    ctx.fillStyle = '#1a0a1a';
    ctx.fill();

    // 眼睛（两个小红点）
    const eyeOffset = headSize * 0.4;
    const eyeAngle = screenAngle;
    ctx.fillStyle = '#4a1a2a';
    ctx.beginPath();
    ctx.arc(
      head.x + Math.cos(eyeAngle - 0.5) * eyeOffset,
      head.y + Math.sin(eyeAngle - 0.5) * eyeOffset * 0.5,
      headSize * 0.2, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.beginPath();
    ctx.arc(
      head.x + Math.cos(eyeAngle + 0.5) * eyeOffset,
      head.y + Math.sin(eyeAngle + 0.5) * eyeOffset * 0.5,
      headSize * 0.2, 0, Math.PI * 2
    );
    ctx.fill();

    ctx.restore();
  }

  /**
   * 获取寄生虫数量
   */
  getParasiteCount() {
    return this.parasites.length + this.flyingParasites.length;
  }

  /**
   * 清空所有寄生虫
   */
  clear() {
    this.parasites = [];
    this.flyingParasites = [];
  }
}

export default ParasiteManager;
