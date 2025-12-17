/**
 * 弹幕管理器
 * 管理所有子弹的创建、更新、碰撞检测和渲染
 */
import Projectile from './Projectile.js';

class ProjectileManager {
  constructor() {
    this.projectiles = [];
    this.maxProjectiles = 200;

    // 回调
    this.onEnemyHit = null;
    this.onPlayerHit = null;
  }

  /**
   * 创建玩家子弹
   */
  firePlayerProjectile(player, config = {}) {
    if (this.projectiles.length >= this.maxProjectiles) {
      // 移除最老的子弹
      this.projectiles.shift();
    }

    const projectile = new Projectile(
      player.x + Math.cos(player.facingAngle) * 0.3,
      player.y + Math.sin(player.facingAngle) * 0.3,
      player.facingAngle,
      {
        damage: config.damage || player.calculateDamage(),
        speed: config.speed || 0.35,
        radius: config.radius || 0.15,
        maxRange: config.maxRange || 12,
        piercing: config.piercing || false,
        color: config.color || '#FFD700',
        owner: 'player',
        ownerId: player,
        type: config.type || 'normal'
      }
    );

    this.projectiles.push(projectile);
    return projectile;
  }

  /**
   * 创建敌人子弹
   */
  fireEnemyProjectile(enemy, targetX, targetY, config = {}) {
    if (this.projectiles.length >= this.maxProjectiles) {
      this.projectiles.shift();
    }

    const angle = Math.atan2(targetY - enemy.y, targetX - enemy.x);

    const projectile = new Projectile(
      enemy.x + Math.cos(angle) * 0.3,
      enemy.y + Math.sin(angle) * 0.3,
      angle,
      {
        damage: config.damage || enemy.attack,
        speed: config.speed || 0.2,
        radius: config.radius || 0.12,
        maxRange: config.maxRange || 10,
        piercing: false,
        color: config.color || enemy.color,
        owner: 'enemy',
        ownerId: enemy,
        type: config.type || 'normal'
      }
    );

    this.projectiles.push(projectile);
    return projectile;
  }

  /**
   * 创建散射弹幕
   */
  fireSpread(source, angle, count, spreadAngle, config = {}) {
    const startAngle = angle - spreadAngle / 2;
    const angleStep = spreadAngle / (count - 1);

    for (let i = 0; i < count; i++) {
      const bulletAngle = startAngle + angleStep * i;
      const projectile = new Projectile(
        source.x + Math.cos(bulletAngle) * 0.3,
        source.y + Math.sin(bulletAngle) * 0.3,
        bulletAngle,
        {
          damage: config.damage || 10,
          speed: config.speed || 0.25,
          radius: config.radius || 0.1,
          maxRange: config.maxRange || 10,
          color: config.color || '#FFD700',
          owner: config.owner || 'player',
          ownerId: source,
          type: config.type || 'normal'
        }
      );
      this.projectiles.push(projectile);
    }
  }

  /**
   * 更新所有子弹
   */
  update(deltaTime, dungeon, player, enemies) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];

      // 更新位置
      proj.update(deltaTime, dungeon);

      if (!proj.active) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // 碰撞检测
      if (proj.owner === 'player') {
        // 玩家子弹 -> 检测敌人
        for (const enemy of enemies) {
          if (enemy.isDead()) continue;

          if (proj.checkHit(enemy)) {
            const knockbackAngle = proj.getKnockbackAngle();
            const actualDamage = enemy.takeDamage(proj.damage, knockbackAngle);

            if (this.onEnemyHit) {
              this.onEnemyHit(enemy, actualDamage, proj);
            }

            if (!proj.active) break;
          }
        }
      } else {
        // 敌人子弹 -> 检测玩家
        if (!player.invincible && proj.checkHit(player)) {
          const actualDamage = player.takeDamage(proj.damage);

          if (this.onPlayerHit) {
            this.onPlayerHit(player, actualDamage, proj);
          }
        }
      }
    }
  }

  /**
   * 渲染所有子弹
   */
  render(ctx, renderer) {
    for (const proj of this.projectiles) {
      if (!proj.active) continue;

      // 渲染轨迹
      if (proj.trail.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = proj.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;

        for (let i = 0; i < proj.trail.length; i++) {
          const pos = renderer.worldToScreen(proj.trail[i].x, proj.trail[i].y, 8);
          if (i === 0) {
            ctx.moveTo(pos.x, pos.y);
          } else {
            ctx.lineTo(pos.x, pos.y);
          }
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // 渲染子弹
      const pos = renderer.worldToScreen(proj.x, proj.y, 8);
      const screenRadius = Math.max(4, proj.radius * renderer.zoom * 50);

      // 外发光
      const gradient = ctx.createRadialGradient(
        pos.x, pos.y, 0,
        pos.x, pos.y, screenRadius * 2
      );
      gradient.addColorStop(0, proj.color);
      gradient.addColorStop(0.5, proj.color + '80');
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, screenRadius * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // 核心
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, screenRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#FFF';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, screenRadius * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = proj.color;
      ctx.fill();
    }
  }

  /**
   * 获取子弹数量
   */
  getCount() {
    return this.projectiles.length;
  }

  /**
   * 清除所有子弹
   */
  clear() {
    this.projectiles = [];
  }

  /**
   * 清除指定所有者的子弹
   */
  clearByOwner(ownerType) {
    this.projectiles = this.projectiles.filter(p => p.owner !== ownerType);
  }
}

export default ProjectileManager;
