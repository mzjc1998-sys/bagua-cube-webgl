/**
 * 黑色粉末管理器
 * 管理尸体产生的黑色粉末，玩家收集后染黑身体
 */
class DustManager {
  constructor() {
    // 粉末源（尸体位置产生粉末）
    this.dustSources = [];

    // 飘散的粉末粒子
    this.dustParticles = [];

    // 最大粒子数
    this.maxParticles = 300;

    // 粉末生成间隔
    this.spawnInterval = 100; // ms
  }

  /**
   * 添加粉末源（尸体消失的位置）
   */
  addDustSource(x, y, amount = 100) {
    this.dustSources.push({
      x,
      y,
      remainingDust: amount,
      spawnTimer: 0,
      duration: 8000, // 持续8秒
      elapsed: 0
    });
  }

  /**
   * 更新粉末系统
   */
  update(deltaTime, player) {
    // 更新粉末源，生成新粉末
    for (let i = this.dustSources.length - 1; i >= 0; i--) {
      const source = this.dustSources[i];
      source.elapsed += deltaTime;
      source.spawnTimer += deltaTime;

      // 生成粉末
      if (source.spawnTimer >= this.spawnInterval &&
          source.remainingDust > 0 &&
          this.dustParticles.length < this.maxParticles) {
        source.spawnTimer = 0;
        source.remainingDust--;

        // 创建粉末粒子
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.01 + Math.random() * 0.02;
        this.dustParticles.push({
          x: source.x + (Math.random() - 0.5) * 0.5,
          y: source.y + (Math.random() - 0.5) * 0.5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.005, // 轻微上飘
          size: 0.08 + Math.random() * 0.06,
          alpha: 0.7 + Math.random() * 0.3,
          life: 5000 + Math.random() * 3000,
          maxLife: 5000 + Math.random() * 3000,
          collected: false
        });
      }

      // 移除耗尽的粉末源
      if (source.elapsed >= source.duration || source.remainingDust <= 0) {
        this.dustSources.splice(i, 1);
      }
    }

    // 更新粉末粒子
    let collectedCount = 0;
    for (let i = this.dustParticles.length - 1; i >= 0; i--) {
      const dust = this.dustParticles[i];

      // 移动
      dust.x += dust.vx * deltaTime * 0.1;
      dust.y += dust.vy * deltaTime * 0.1;

      // 轻微随机漂移
      dust.vx += (Math.random() - 0.5) * 0.0001 * deltaTime;
      dust.vy += (Math.random() - 0.5) * 0.0001 * deltaTime;

      // 阻尼
      dust.vx *= 0.99;
      dust.vy *= 0.99;

      dust.life -= deltaTime;

      // 检测与玩家的碰撞
      if (player && !dust.collected) {
        const dx = player.x - dust.x;
        const dy = player.y - dust.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 玩家靠近时吸引粉末
        if (dist < 1.5) {
          // 被吸引向玩家
          const attractSpeed = 0.003 * (1.5 - dist);
          dust.vx += dx * attractSpeed;
          dust.vy += dy * attractSpeed;
        }

        // 收集粉末
        if (dist < 0.3) {
          dust.collected = true;
          collectedCount++;
        }
      }

      // 淡出
      if (dust.life < 1000) {
        dust.alpha = (dust.life / 1000) * 0.8;
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
    // 渲染粉末源的光晕
    for (const source of this.dustSources) {
      const pos = renderer.worldToScreen(source.x, source.y, 0);
      const progress = source.elapsed / source.duration;
      const pulseAlpha = 0.3 * (1 - progress) * (0.5 + 0.5 * Math.sin(source.elapsed * 0.005));

      // 黑暗光晕
      const gradient = ctx.createRadialGradient(
        pos.x, pos.y, 0,
        pos.x, pos.y, 40 * renderer.zoom
      );
      gradient.addColorStop(0, `rgba(20, 10, 30, ${pulseAlpha})`);
      gradient.addColorStop(0.5, `rgba(10, 5, 15, ${pulseAlpha * 0.5})`);
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 40 * renderer.zoom, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // 渲染粉末粒子
    for (const dust of this.dustParticles) {
      const pos = renderer.worldToScreen(dust.x, dust.y, 5);
      const screenSize = Math.max(2, dust.size * renderer.zoom * 30);

      ctx.save();
      ctx.globalAlpha = dust.alpha;

      // 黑色粉末带紫色边缘
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, screenSize, 0, Math.PI * 2);
      ctx.fillStyle = '#1a0a1a';
      ctx.fill();

      // 微弱发光
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, screenSize * 0.6, 0, Math.PI * 2);
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
    this.dustSources = [];
    this.dustParticles = [];
  }
}

export default DustManager;
