/**
 * 等轴测渲染引擎
 * Minecraft Dungeons 风格的 2.5D 视角
 */
class IsometricRenderer {
  constructor() {
    // 等轴测角度（标准为 30 度）
    this.angle = Math.PI / 6; // 30度
    this.cos = Math.cos(this.angle);
    this.sin = Math.sin(this.angle);

    // 瓦片大小
    this.tileWidth = 64;
    this.tileHeight = 32;

    // 相机位置（世界坐标）
    this.cameraX = 0;
    this.cameraY = 0;

    // 缩放
    this.zoom = 1.0;

    // 屏幕中心偏移
    this.screenOffsetX = 0;
    this.screenOffsetY = 0;
  }

  /**
   * 设置屏幕尺寸
   */
  setScreenSize(width, height) {
    this.screenOffsetX = width / 2;
    this.screenOffsetY = height / 3; // 略偏上，给UI留空间
  }

  /**
   * 世界坐标转屏幕坐标
   */
  worldToScreen(worldX, worldY, worldZ = 0) {
    // 相对于相机
    const relX = worldX - this.cameraX;
    const relY = worldY - this.cameraY;

    // 等轴测投影
    const screenX = (relX - relY) * (this.tileWidth / 2) * this.zoom;
    const screenY = (relX + relY) * (this.tileHeight / 2) * this.zoom - worldZ * this.zoom;

    return {
      x: screenX + this.screenOffsetX,
      y: screenY + this.screenOffsetY
    };
  }

  /**
   * 屏幕坐标转世界坐标
   */
  screenToWorld(screenX, screenY) {
    const relScreenX = (screenX - this.screenOffsetX) / this.zoom;
    const relScreenY = (screenY - this.screenOffsetY) / this.zoom;

    const worldX = (relScreenX / (this.tileWidth / 2) + relScreenY / (this.tileHeight / 2)) / 2 + this.cameraX;
    const worldY = (relScreenY / (this.tileHeight / 2) - relScreenX / (this.tileWidth / 2)) / 2 + this.cameraY;

    return { x: worldX, y: worldY };
  }

  /**
   * 设置相机位置（跟随目标）
   */
  setCamera(worldX, worldY) {
    this.cameraX = worldX;
    this.cameraY = worldY;
  }

  /**
   * 平滑跟随目标
   */
  followTarget(targetX, targetY, smoothing = 0.1) {
    this.cameraX += (targetX - this.cameraX) * smoothing;
    this.cameraY += (targetY - this.cameraY) * smoothing;
  }

  /**
   * 设置缩放
   */
  setZoom(zoom) {
    this.zoom = Math.max(0.5, Math.min(2.0, zoom));
  }

  /**
   * 绘制等轴测瓦片（地面）
   */
  drawTile(ctx, worldX, worldY, color, height = 0) {
    const pos = this.worldToScreen(worldX, worldY, height);
    const hw = (this.tileWidth / 2) * this.zoom;
    const hh = (this.tileHeight / 2) * this.zoom;

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y - hh);      // 顶部
    ctx.lineTo(pos.x + hw, pos.y);       // 右边
    ctx.lineTo(pos.x, pos.y + hh);       // 底部
    ctx.lineTo(pos.x - hw, pos.y);       // 左边
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /**
   * 绘制等轴测方块（有高度）
   */
  drawBlock(ctx, worldX, worldY, blockHeight, topColor, leftColor, rightColor) {
    const top = this.worldToScreen(worldX, worldY, blockHeight);
    const bottom = this.worldToScreen(worldX, worldY, 0);
    const hw = (this.tileWidth / 2) * this.zoom;
    const hh = (this.tileHeight / 2) * this.zoom;
    const h = blockHeight * this.zoom;

    // 左侧面
    ctx.beginPath();
    ctx.moveTo(top.x - hw, top.y);
    ctx.lineTo(top.x, top.y + hh);
    ctx.lineTo(bottom.x, bottom.y + hh);
    ctx.lineTo(bottom.x - hw, bottom.y);
    ctx.closePath();
    ctx.fillStyle = leftColor;
    ctx.fill();

    // 右侧面
    ctx.beginPath();
    ctx.moveTo(top.x + hw, top.y);
    ctx.lineTo(top.x, top.y + hh);
    ctx.lineTo(bottom.x, bottom.y + hh);
    ctx.lineTo(bottom.x + hw, bottom.y);
    ctx.closePath();
    ctx.fillStyle = rightColor;
    ctx.fill();

    // 顶面
    ctx.beginPath();
    ctx.moveTo(top.x, top.y - hh);
    ctx.lineTo(top.x + hw, top.y);
    ctx.lineTo(top.x, top.y + hh);
    ctx.lineTo(top.x - hw, top.y);
    ctx.closePath();
    ctx.fillStyle = topColor;
    ctx.fill();
  }

  /**
   * 绘制实体（圆形阴影 + 精灵）
   */
  drawEntity(ctx, worldX, worldY, radius, color, height = 0) {
    // 阴影
    const shadowPos = this.worldToScreen(worldX, worldY, 0);
    const shadowRadiusX = radius * this.zoom * 0.8;
    const shadowRadiusY = radius * this.zoom * 0.4;

    ctx.beginPath();
    ctx.ellipse(shadowPos.x, shadowPos.y, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();

    // 实体
    const entityPos = this.worldToScreen(worldX, worldY, height);
    const entityRadius = radius * this.zoom;

    ctx.beginPath();
    ctx.arc(entityPos.x, entityPos.y - entityRadius, entityRadius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /**
   * 绘制血条
   */
  drawHealthBar(ctx, worldX, worldY, height, currentHP, maxHP, width = 40) {
    const pos = this.worldToScreen(worldX, worldY, height + 20);
    const barWidth = width * this.zoom;
    const barHeight = 6 * this.zoom;
    const hpRatio = Math.max(0, currentHP / maxHP);

    // 背景
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(pos.x - barWidth / 2, pos.y, barWidth, barHeight);

    // 血量
    const hpColor = hpRatio > 0.5 ? '#4CAF50' : hpRatio > 0.25 ? '#FFC107' : '#F44336';
    ctx.fillStyle = hpColor;
    ctx.fillRect(pos.x - barWidth / 2, pos.y, barWidth * hpRatio, barHeight);

    // 边框
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(pos.x - barWidth / 2, pos.y, barWidth, barHeight);
  }

  /**
   * 获取渲染排序用的深度值
   */
  getDepth(worldX, worldY, worldZ = 0) {
    return worldX + worldY - worldZ * 0.01;
  }
}

export default IsometricRenderer;
