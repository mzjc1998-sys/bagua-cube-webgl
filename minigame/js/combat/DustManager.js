/**
 * 黑色粉末管理器
 * 管理尸体产生的黑色粉末，玩家收集后染黑身体
 * 支持从断裂处喷射的动画效果
 */
class DustManager {
  constructor() {
    // 地面上的粉末粒子（已落地）
    this.dustParticles = [];

    // 飞行中的粉末粒子（喷射动画）
    this.flyingParticles = [];

    // 最大粒子数
    this.maxParticles = 500;
    this.maxFlyingParticles = 200;

    // 重力
    this.gravity = 0.015;
  }

  /**
   * 从断裂处喷射粉末（带速度的动画效果）
   * @param worldX - 世界坐标X（敌人位置）
   * @param worldY - 世界坐标Y（敌人位置）
   * @param offsetX - 相对于敌人的X偏移（火柴人坐标系）
   * @param offsetY - 相对于敌人的Y偏移（火柴人坐标系）
   * @param amount - 粉末数量
   * @param angle - 喷射角度
   * @param force - 喷射力度
   */
  sprayDust(worldX, worldY, offsetX, offsetY, amount, angle, force) {
    const particlesToSpawn = Math.min(amount, this.maxFlyingParticles - this.flyingParticles.length);

    for (let i = 0; i < particlesToSpawn; i++) {
      // 随机散布角度
      const spreadAngle = angle + (Math.random() - 0.5) * 0.8;
      const spreadForce = force * (0.5 + Math.random() * 0.5);

      // 转换火柴人坐标到世界坐标（简化，主要是Y轴向下）
      const spawnX = worldX + offsetX * 0.03;
      const spawnY = worldY + offsetY * 0.03;

      this.flyingParticles.push({
        x: spawnX,
        y: spawnY,
        z: 0.5 + Math.random() * 0.3, // 高度（用于渲染）
        vx: Math.cos(spreadAngle) * spreadForce * 0.02,
        vy: Math.sin(spreadAngle) * spreadForce * 0.01, // Y方向速度较小（等轴测）
        vz: -0.03 - Math.random() * 0.02, // 向上喷射
        size: 0.04 + Math.random() * 0.04,
        alpha: 0.8 + Math.random() * 0.2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2
      });
    }
  }

  /**
   * 在尸体消失位置直接产生粉末（一次性生成，落在地上）
   * 这个方法保留作为最终残留粉末
   */
  addDustSource(x, y, amount = 50) {
    // 一次性生成所有粉末，直接落在地面
    const particlesToSpawn = Math.min(amount, this.maxParticles - this.dustParticles.length);

    for (let i = 0; i < particlesToSpawn; i++) {
      // 在尸体周围随机散布
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.8; // 散布半径

      this.dustParticles.push({
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius,
        size: 0.06 + Math.random() * 0.05,
        alpha: 0.6 + Math.random() * 0.4,
        life: 15000 + Math.random() * 10000, // 持续更久
        maxLife: 15000 + Math.random() * 10000,
        collected: false
      });
    }
  }

  /**
   * 更新粉末系统
   */
  update(deltaTime, player) {
    const dt = deltaTime * 0.1;

    // 更新飞行中的粉末（喷射动画）
    for (let i = this.flyingParticles.length - 1; i >= 0; i--) {
      const dust = this.flyingParticles[i];

      // 应用速度
      dust.x += dust.vx * dt;
      dust.y += dust.vy * dt;
      dust.z += dust.vz * dt;

      // 重力（向下落）
      dust.vz += this.gravity * dt;

      // 旋转
      dust.rotation += dust.rotationSpeed * dt;

      // 空气阻力
      dust.vx *= 0.98;
      dust.vy *= 0.98;

      // 落地检测
      if (dust.z >= 0) {
        // 转换为地面粉末
        this.dustParticles.push({
          x: dust.x,
          y: dust.y,
          size: dust.size * 1.2,
          alpha: dust.alpha * 0.8,
          life: 12000 + Math.random() * 8000,
          maxLife: 12000 + Math.random() * 8000,
          collected: false
        });
        this.flyingParticles.splice(i, 1);
      }
    }

    // 更新地面粉末粒子
    let collectedCount = 0;
    for (let i = this.dustParticles.length - 1; i >= 0; i--) {
      const dust = this.dustParticles[i];

      dust.life -= deltaTime;

      // 检测与玩家的碰撞（粉末在地上，玩家走过时收集）
      if (player && !dust.collected) {
        const dx = player.x - dust.x;
        const dy = player.y - dust.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 玩家走到粉末上时收集
        if (dist < 0.4) {
          dust.collected = true;
          collectedCount++;
        }
      }

      // 淡出
      if (dust.life < 2000) {
        dust.alpha = (dust.life / 2000) * 0.8;
      }

      // 移除死亡或已收集的粉末
      if (dust.life <= 0 || dust.collected) {
        this.dustParticles.splice(i, 1);
      }
    }

    return collectedCount;
  }

  /**
   * 渲染粉末
   */
  render(ctx, renderer) {
    // 渲染地面粉末粒子
    for (const dust of this.dustParticles) {
      const pos = renderer.worldToScreen(dust.x, dust.y, 0); // z=0 表示在地面
      const screenSize = Math.max(3, dust.size * renderer.zoom * 35);

      ctx.save();
      ctx.globalAlpha = dust.alpha;

      // 黑色粉末（地面上的斑点）
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, screenSize, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0510';
      ctx.fill();

      // 稍亮的边缘
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, screenSize * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1a0a1a';
      ctx.fill();

      ctx.restore();
    }

    // 渲染飞行中的粉末（喷射动画）
    for (const dust of this.flyingParticles) {
      // z 是高度，负值表示在空中
      const screenZ = -dust.z * 30 * renderer.zoom; // 转换为屏幕高度偏移
      const pos = renderer.worldToScreen(dust.x, dust.y, 0);
      const screenSize = Math.max(2, dust.size * renderer.zoom * 40);

      ctx.save();
      ctx.globalAlpha = dust.alpha;
      ctx.translate(pos.x, pos.y + screenZ);
      ctx.rotate(dust.rotation);

      // 飞行中的粉末（带拖尾效果）
      // 拖尾
      const trailLength = Math.sqrt(dust.vx * dust.vx + dust.vy * dust.vy) * 50;
      if (trailLength > 1) {
        const gradient = ctx.createLinearGradient(0, 0, -trailLength, 0);
        gradient.addColorStop(0, 'rgba(26, 10, 26, 0.8)');
        gradient.addColorStop(1, 'rgba(26, 10, 26, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(-trailLength, -screenSize / 2, trailLength, screenSize);
      }

      // 主体
      ctx.beginPath();
      ctx.arc(0, 0, screenSize, 0, Math.PI * 2);
      ctx.fillStyle = '#1a0a1a';
      ctx.fill();

      // 高光
      ctx.beginPath();
      ctx.arc(-screenSize * 0.3, -screenSize * 0.3, screenSize * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = '#2d1a2d';
      ctx.fill();

      ctx.restore();
    }
  }

  /**
   * 获取活跃粉末数量
   */
  getParticleCount() {
    return this.dustParticles.length;
  }

  /**
   * 清空所有粉末
   */
  clear() {
    this.dustParticles = [];
    this.flyingParticles = [];
  }
}

export default DustManager;
