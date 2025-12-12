/**
 * 八卦立方体 - 微信小游戏入口
 * 先天八卦 / 64卦：bit 立方体 + 宫视角
 */

// 引入核心逻辑
const BaguaCube = require('./js/core/BaguaCube.js');

// 获取主 Canvas
const canvas = wx.createCanvas();

// 创建游戏实例
const game = new BaguaCube(canvas);

// 额外的触摸处理 - 用于 HUD 交互
wx.onTouchEnd((e) => {
  if (e.changedTouches.length > 0) {
    const touch = e.changedTouches[0];
    game.handleTap(touch.clientX, touch.clientY);
  }
});

// 监听窗口大小变化
wx.onWindowResize && wx.onWindowResize((res) => {
  // 更新游戏尺寸
  game.W = res.windowWidth;
  game.H = res.windowHeight;
  game.canvas.width = Math.floor(game.W * game.DPR);
  game.canvas.height = Math.floor(game.H * game.DPR);
});

console.log('八卦立方体小游戏已启动');
