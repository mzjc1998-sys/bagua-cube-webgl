/**
 * 物品管理器
 * 处理掉落物、拾取、装备等
 */
class ItemManager {
  constructor() {
    // 地上的掉落物
    this.droppedItems = [];

    // 拾取回调
    this.onItemPickup = null;

    // 物品配置
    this.itemColors = {
      exp: '#9C27B0',
      health: '#4CAF50',
      coin: '#FFD700',
      equipment: '#2196F3'
    };

    this.rarityColors = {
      common: '#9E9E9E',
      uncommon: '#4CAF50',
      rare: '#2196F3',
      epic: '#9C27B0',
      legendary: '#FF9800'
    };
  }

  /**
   * 添加掉落物
   */
  addDrop(item) {
    this.droppedItems.push({
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      spawnTime: Date.now(),
      bobOffset: Math.random() * Math.PI * 2,
      collected: false,
      flyToPlayer: false,
      flyProgress: 0
    });
  }

  /**
   * 批量添加掉落物
   */
  addDrops(items) {
    for (const item of items) {
      this.addDrop(item);
    }
  }

  /**
   * 更新物品
   */
  update(deltaTime, player) {
    const pickupRange = player.pickupRange;

    for (let i = this.droppedItems.length - 1; i >= 0; i--) {
      const item = this.droppedItems[i];

      if (item.collected) {
        // 飞向玩家动画
        item.flyProgress += deltaTime * 0.01;
        item.x += (player.x - item.x) * item.flyProgress;
        item.y += (player.y - item.y) * item.flyProgress;

        if (item.flyProgress >= 1) {
          // 拾取完成
          this.pickupItem(item, player);
          this.droppedItems.splice(i, 1);
        }
        continue;
      }

      // 检查玩家是否在拾取范围内
      const dx = player.x - item.x;
      const dy = player.y - item.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= pickupRange) {
        item.collected = true;
        item.flyProgress = 0;
      }

      // 自动拾取经验
      if (item.type === 'exp' && dist <= pickupRange * 2) {
        // 经验球主动飞向玩家
        const pullSpeed = 0.003 * deltaTime;
        item.x += dx * pullSpeed;
        item.y += dy * pullSpeed;
      }

      // 物品过期（5分钟）
      if (Date.now() - item.spawnTime > 300000) {
        this.droppedItems.splice(i, 1);
      }
    }
  }

  /**
   * 拾取物品
   */
  pickupItem(item, player) {
    switch (item.type) {
      case 'exp':
        player.gainExp(item.value);
        break;

      case 'health':
        player.heal(item.value);
        break;

      case 'coin':
        // 金币（可扩展）
        break;

      case 'equipment':
        // 装备（可扩展）
        this.applyEquipment(item, player);
        break;
    }

    if (this.onItemPickup) {
      this.onItemPickup(item, player);
    }
  }

  /**
   * 应用装备效果
   */
  applyEquipment(item, player) {
    const bonusMultiplier = {
      common: 1,
      uncommon: 1.5,
      rare: 2,
      epic: 3,
      legendary: 5
    };

    const mult = bonusMultiplier[item.rarity] || 1;
    const bonusType = Math.random();

    if (bonusType < 0.33) {
      player.bonusAttack += Math.floor(3 * mult);
    } else if (bonusType < 0.66) {
      player.bonusDefense += Math.floor(2 * mult);
    } else {
      player.bonusSpeed += 0.005 * mult;
    }
  }

  /**
   * 渲染掉落物
   */
  render(ctx, renderer) {
    const time = Date.now() * 0.005;

    for (const item of this.droppedItems) {
      // 浮动动画
      const bob = Math.sin(time + item.bobOffset) * 3;
      const pos = renderer.worldToScreen(item.x, item.y, 5 + bob);

      // 光晕效果
      const glowRadius = 15 * renderer.zoom;
      const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowRadius);

      let color = this.itemColors[item.type] || '#FFFFFF';
      if (item.type === 'equipment') {
        color = this.rarityColors[item.rarity] || '#9E9E9E';
      }

      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, color + '88');
      gradient.addColorStop(1, color + '00');

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // 核心
      const coreRadius = 6 * renderer.zoom;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 装备显示稀有度边框
      if (item.type === 'equipment') {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, coreRadius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = this.rarityColors[item.rarity];
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  /**
   * 清理所有物品
   */
  clear() {
    this.droppedItems = [];
  }

  /**
   * 获取物品数量
   */
  getItemCount() {
    return this.droppedItems.length;
  }
}

export default ItemManager;
