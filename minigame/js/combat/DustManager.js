/**
 * 黑色粉末管理器
 * 管理尸体产生的黑色粉末，玩家收集后染黑身体
 * 粉末直接落在地上，不会飘散
 */
class DustManager {
  constructor() {
    // 地面上的粉末粒子
    this.dustParticles = [];

    // 最大粒子数
    this.maxParticles = 500;
  }

  /**
   * 在尸体消失位置直接产生粉末（一次性生成，落在地上）
   */
  addDustSource(x, y, amount = 100) {
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
    // 更新粉末粒子
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
   * 渲染粉末（地面上的静态粉末）
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
  }
}

export default DustManager;
