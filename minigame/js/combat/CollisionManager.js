/**
 * 碰撞管理器
 * 管理尸体、墙壁等实体的碰撞体积
 */
class CollisionManager {
  constructor() {
    // 尸体碰撞体
    this.corpses = [];

    // 墙壁实体（动态生成的墙壁）
    this.walls = [];

    // 碰撞参数
    this.corpseRadius = 0.4;  // 尸体碰撞半径
    this.wallThickness = 0.3; // 墙壁厚度
  }

  /**
   * 添加尸体碰撞体
   */
  addCorpse(x, y, radius = 0.4) {
    this.corpses.push({
      x,
      y,
      radius,
      fadeTimer: 0,
      maxFadeTime: 6000 // 尸体消失时间
    });
  }

  /**
   * 更新尸体位置（跟随火柴人动画）
   */
  updateCorpsePosition(index, x, y) {
    if (index >= 0 && index < this.corpses.length) {
      this.corpses[index].x = x;
      this.corpses[index].y = y;
    }
  }

  /**
   * 添加墙壁实体
   * @param x1, y1 - 起点
   * @param x2, y2 - 终点
   * @param thickness - 厚度
   */
  addWall(x1, y1, x2, y2, thickness = 0.3) {
    this.walls.push({
      x1, y1, x2, y2,
      thickness,
      // 预计算墙壁向量
      dx: x2 - x1,
      dy: y2 - y1,
      length: Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
    });
  }

  /**
   * 添加矩形墙壁
   */
  addRectWall(x, y, width, height) {
    this.walls.push({
      type: 'rect',
      x, y, width, height
    });
  }

  /**
   * 更新碰撞管理器
   */
  update(deltaTime) {
    // 更新尸体消失计时
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      const corpse = this.corpses[i];
      corpse.fadeTimer += deltaTime;

      // 移除已消失的尸体
      if (corpse.fadeTimer >= corpse.maxFadeTime) {
        this.corpses.splice(i, 1);
      }
    }
  }

  /**
   * 检查点是否与尸体碰撞
   */
  checkCorpseCollision(x, y, radius = 0.3) {
    for (const corpse of this.corpses) {
      const dx = x - corpse.x;
      const dy = y - corpse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = radius + corpse.radius;

      if (dist < minDist) {
        return {
          collided: true,
          corpse,
          pushX: dx / dist * (minDist - dist),
          pushY: dy / dist * (minDist - dist)
        };
      }
    }
    return { collided: false };
  }

  /**
   * 检查点是否与墙壁碰撞
   */
  checkWallCollision(x, y, radius = 0.3) {
    for (const wall of this.walls) {
      if (wall.type === 'rect') {
        // 矩形墙壁碰撞
        const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
        const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));
        const dx = x - closestX;
        const dy = y - closestY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < radius) {
          return {
            collided: true,
            wall,
            pushX: dist > 0 ? dx / dist * (radius - dist) : radius,
            pushY: dist > 0 ? dy / dist * (radius - dist) : 0
          };
        }
      } else {
        // 线段墙壁碰撞
        const collision = this.pointToLineDistance(x, y, wall);
        if (collision.dist < radius + wall.thickness) {
          const pushDist = radius + wall.thickness - collision.dist;
          return {
            collided: true,
            wall,
            pushX: collision.nx * pushDist,
            pushY: collision.ny * pushDist
          };
        }
      }
    }
    return { collided: false };
  }

  /**
   * 计算点到线段的距离
   */
  pointToLineDistance(px, py, wall) {
    const { x1, y1, x2, y2, dx, dy, length } = wall;

    if (length === 0) {
      const dist = Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
      return { dist, nx: (px - x1) / dist, ny: (py - y1) / dist };
    }

    // 计算投影参数 t
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));

    // 最近点
    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;

    // 距离和法向量
    const distX = px - nearestX;
    const distY = py - nearestY;
    const dist = Math.sqrt(distX * distX + distY * distY);

    return {
      dist,
      nx: dist > 0 ? distX / dist : 0,
      ny: dist > 0 ? distY / dist : 1
    };
  }

  /**
   * 检查移动是否有效（综合检查所有碰撞）
   * @returns 调整后的位置
   */
  resolveCollision(x, y, radius = 0.3) {
    let newX = x;
    let newY = y;

    // 检查尸体碰撞
    const corpseResult = this.checkCorpseCollision(newX, newY, radius);
    if (corpseResult.collided) {
      newX += corpseResult.pushX;
      newY += corpseResult.pushY;
    }

    // 检查墙壁碰撞
    const wallResult = this.checkWallCollision(newX, newY, radius);
    if (wallResult.collided) {
      newX += wallResult.pushX;
      newY += wallResult.pushY;
    }

    return { x: newX, y: newY };
  }

  /**
   * 检查位置是否被阻挡
   */
  isBlocked(x, y, radius = 0.3) {
    return this.checkCorpseCollision(x, y, radius).collided ||
           this.checkWallCollision(x, y, radius).collided;
  }

  /**
   * 清空所有碰撞体
   */
  clear() {
    this.corpses = [];
    this.walls = [];
  }

  /**
   * 移除指定尸体
   */
  removeCorpse(index) {
    if (index >= 0 && index < this.corpses.length) {
      this.corpses.splice(index, 1);
    }
  }

  /**
   * 获取尸体数量
   */
  getCorpseCount() {
    return this.corpses.length;
  }

  /**
   * 渲染碰撞体（调试用）
   */
  renderDebug(ctx, renderer) {
    // 渲染尸体碰撞体
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    for (const corpse of this.corpses) {
      const pos = renderer.worldToScreen(corpse.x, corpse.y, 0);
      const screenRadius = corpse.radius * renderer.zoom * 30;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, screenRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 渲染墙壁碰撞体
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    for (const wall of this.walls) {
      if (wall.type === 'rect') {
        const pos1 = renderer.worldToScreen(wall.x, wall.y, 0);
        const pos2 = renderer.worldToScreen(wall.x + wall.width, wall.y + wall.height, 0);
        ctx.strokeRect(pos1.x, pos1.y, pos2.x - pos1.x, pos2.y - pos1.y);
      } else {
        const pos1 = renderer.worldToScreen(wall.x1, wall.y1, 0);
        const pos2 = renderer.worldToScreen(wall.x2, wall.y2, 0);
        ctx.beginPath();
        ctx.moveTo(pos1.x, pos1.y);
        ctx.lineTo(pos2.x, pos2.y);
        ctx.stroke();
      }
    }
  }
}

export default CollisionManager;
