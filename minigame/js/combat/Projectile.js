/**
 * 弹幕/子弹类
 * 处理子弹的移动、碰撞检测
 */
class Projectile {
  constructor(x, y, angle, config = {}) {
    // 位置
    this.x = x;
    this.y = y;

    // 移动
    this.angle = angle;
    this.speed = config.speed || 0.3;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;

    // 属性
    this.damage = config.damage || 10;
    this.radius = config.radius || 0.15;
    this.maxRange = config.maxRange || 15;
    this.piercing = config.piercing || false; // 是否穿透
    this.knockback = config.knockback || 0.5;

    // 来源
    this.owner = config.owner || 'player'; // player/enemy
    this.ownerId = config.ownerId || null;

    // 状态
    this.active = true;
    this.distanceTraveled = 0;
    this.hitTargets = new Set(); // 已命中的目标（穿透时用）

    // 视觉
    this.color = config.color || '#FFD700';
    this.trailLength = config.trailLength || 5;
    this.trail = []; // 轨迹

    // 特效
    this.type = config.type || 'normal'; // normal, fire, ice, lightning
  }

  /**
   * 更新
   */
  update(deltaTime, dungeon) {
    if (!this.active) return;

    // 保存轨迹
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > this.trailLength) {
      this.trail.pop();
    }

    // 移动
    const moveX = this.vx * deltaTime * 0.1;
    const moveY = this.vy * deltaTime * 0.1;

    this.x += moveX;
    this.y += moveY;
    this.distanceTraveled += Math.sqrt(moveX * moveX + moveY * moveY);

    // 检查是否超出范围
    if (this.distanceTraveled >= this.maxRange) {
      this.active = false;
      return;
    }

    // 检查墙壁碰撞
    if (dungeon && !dungeon.isWalkable(this.x, this.y)) {
      this.active = false;
      return;
    }
  }

  /**
   * 检查与目标的碰撞
   */
  checkHit(target) {
    if (!this.active) return false;
    if (this.hitTargets.has(target)) return false;

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hitDist = this.radius + (target.radius || 0.3) * 0.05;

    if (dist <= hitDist) {
      this.hitTargets.add(target);
      if (!this.piercing) {
        this.active = false;
      }
      return true;
    }

    return false;
  }

  /**
   * 获取击退方向
   */
  getKnockbackAngle() {
    return this.angle;
  }

  /**
   * 销毁
   */
  destroy() {
    this.active = false;
  }
}

export default Projectile;
