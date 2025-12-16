/**
 * 战斗管理器
 * 处理攻击判定、伤害计算、特效等
 */
class CombatManager {
  constructor() {
    // 伤害数字显示
    this.damageNumbers = [];

    // 攻击特效
    this.attackEffects = [];

    // 击杀回调
    this.onEnemyKilled = null;
  }

  /**
   * 处理玩家攻击
   */
  processPlayerAttack(player, enemies) {
    if (!player.isAttacking) return [];

    const attackArea = player.getAttackArea();
    const hits = [];

    // 创建攻击特效
    this.createAttackEffect(
      attackArea.x,
      attackArea.y,
      player.facingAngle,
      attackArea.radius,
      '#FFD700'
    );

    // 检测命中的敌人
    for (const enemy of enemies) {
      if (enemy.isDead()) continue;

      const dx = enemy.x - attackArea.x;
      const dy = enemy.y - attackArea.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= attackArea.radius + enemy.radius * 0.05) {
        // 命中
        const damage = player.calculateDamage();
        const knockbackAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
        const actualDamage = enemy.takeDamage(damage, knockbackAngle);

        // 显示伤害数字
        this.showDamageNumber(enemy.x, enemy.y, actualDamage, '#FFD700');

        hits.push({
          enemy,
          damage: actualDamage,
          killed: enemy.isDead()
        });

        // 处理击杀
        if (enemy.isDead() && this.onEnemyKilled) {
          this.onEnemyKilled(enemy);
        }
      }
    }

    return hits;
  }

  /**
   * 处理敌人攻击
   */
  processEnemyAttacks(enemies, player) {
    const hits = [];

    for (const enemy of enemies) {
      if (enemy.isDead() || !enemy.isAttacking) continue;
      if (enemy.attackAnimation < 250) continue; // 攻击动画前期不造成伤害

      const attackArea = enemy.getAttackArea();

      // 创建攻击特效
      this.createAttackEffect(
        attackArea.x,
        attackArea.y,
        enemy.facingAngle,
        attackArea.radius * 0.8,
        enemy.color
      );

      // 检测是否命中玩家
      const dx = player.x - attackArea.x;
      const dy = player.y - attackArea.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= attackArea.radius + player.radius * 0.05) {
        if (!player.invincible) {
          const damage = enemy.calculateDamage();
          const actualDamage = player.takeDamage(damage);

          // 显示伤害数字
          this.showDamageNumber(player.x, player.y, actualDamage, '#FF4444');

          hits.push({
            enemy,
            damage: actualDamage
          });
        }
      }

      // 标记这次攻击已处理
      enemy.attackAnimation = 0;
    }

    return hits;
  }

  /**
   * 显示伤害数字
   */
  showDamageNumber(x, y, damage, color) {
    this.damageNumbers.push({
      x,
      y,
      damage,
      color,
      alpha: 1,
      offsetY: 0,
      life: 800
    });
  }

  /**
   * 创建攻击特效
   */
  createAttackEffect(x, y, angle, radius, color) {
    this.attackEffects.push({
      x,
      y,
      angle,
      radius,
      color,
      alpha: 0.8,
      life: 150
    });
  }

  /**
   * 更新特效
   */
  update(deltaTime) {
    // 更新伤害数字
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.life -= deltaTime;
      dn.offsetY -= deltaTime * 0.05;
      dn.alpha = Math.max(0, dn.life / 800);

      if (dn.life <= 0) {
        this.damageNumbers.splice(i, 1);
      }
    }

    // 更新攻击特效
    for (let i = this.attackEffects.length - 1; i >= 0; i--) {
      const effect = this.attackEffects[i];
      effect.life -= deltaTime;
      effect.alpha = Math.max(0, effect.life / 150);
      effect.radius *= 1.02;

      if (effect.life <= 0) {
        this.attackEffects.splice(i, 1);
      }
    }
  }

  /**
   * 渲染攻击特效
   */
  renderEffects(ctx, renderer) {
    // 渲染攻击弧
    for (const effect of this.attackEffects) {
      const pos = renderer.worldToScreen(effect.x, effect.y, 10);
      const screenRadius = effect.radius * renderer.zoom * 30;

      ctx.save();
      ctx.globalAlpha = effect.alpha;
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(
        pos.x,
        pos.y,
        screenRadius,
        effect.angle - Math.PI / 3,
        effect.angle + Math.PI / 3
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * 渲染伤害数字
   */
  renderDamageNumbers(ctx, renderer) {
    ctx.save();
    ctx.font = 'bold 18px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const dn of this.damageNumbers) {
      const pos = renderer.worldToScreen(dn.x, dn.y, 30 + dn.offsetY);
      ctx.globalAlpha = dn.alpha;
      ctx.fillStyle = dn.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(`-${dn.damage}`, pos.x, pos.y);
      ctx.fillText(`-${dn.damage}`, pos.x, pos.y);
    }

    ctx.restore();
  }

  /**
   * 检查两个实体是否碰撞
   */
  checkCollision(entity1, entity2) {
    const dx = entity1.x - entity2.x;
    const dy = entity1.y - entity2.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = (entity1.radius + entity2.radius) * 0.05;
    return dist < minDist;
  }

  /**
   * 清理
   */
  clear() {
    this.damageNumbers = [];
    this.attackEffects = [];
  }
}

export default CombatManager;
