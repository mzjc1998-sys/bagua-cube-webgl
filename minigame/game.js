/**
 * 八卦立方体 - 微信小游戏 (最小测试版)
 */

console.log('===== 游戏启动 =====');

// 创建 Canvas
var canvas = wx.createCanvas();
var ctx = canvas.getContext('2d');

console.log('Canvas 创建成功:', canvas);

// 获取系统信息
var sysInfo = wx.getSystemInfoSync();
var W = sysInfo.windowWidth;
var H = sysInfo.windowHeight;
var DPR = sysInfo.pixelRatio;

console.log('屏幕尺寸:', W, 'x', H, 'DPR:', DPR);

// 设置 Canvas 尺寸
canvas.width = W * DPR;
canvas.height = H * DPR;
ctx.scale(DPR, DPR);

console.log('Canvas 尺寸设置完成:', canvas.width, 'x', canvas.height);

// 绘制背景
ctx.fillStyle = '#1a1a2e';
ctx.fillRect(0, 0, W, H);

// 绘制标题
ctx.fillStyle = '#FFD700';
ctx.font = 'bold 28px sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('八卦立方体', W / 2, H / 3);

// 绘制副标题
ctx.fillStyle = '#E8E4D9';
ctx.font = '16px sans-serif';
ctx.fillText('Roguelike · 先天八卦', W / 2, H / 3 + 40);

// 绘制一个简单的圆
ctx.fillStyle = '#FFD700';
ctx.beginPath();
ctx.arc(W / 2, H / 2 + 50, 30, 0, Math.PI * 2);
ctx.fill();

// 绘制按钮区域
ctx.strokeStyle = '#FFD700';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(W / 2 - 80, H * 0.75 - 25);
ctx.lineTo(W / 2 + 80, H * 0.75 - 25);
ctx.lineTo(W / 2 + 80, H * 0.75 + 25);
ctx.lineTo(W / 2 - 80, H * 0.75 + 25);
ctx.closePath();
ctx.stroke();

ctx.fillStyle = '#FFD700';
ctx.font = '18px sans-serif';
ctx.fillText('点击开始', W / 2, H * 0.75);

console.log('===== 初始绘制完成 =====');

// 添加触摸事件
wx.onTouchStart(function(e) {
  console.log('触摸开始:', e.touches[0].clientX, e.touches[0].clientY);
});

wx.onTouchEnd(function(e) {
  console.log('触摸结束');

  // 重新绘制，换个颜色表示响应了
  ctx.fillStyle = '#2a2a4e';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#44FF44';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('触摸成功!', W / 2, H / 2);

  ctx.fillStyle = '#E8E4D9';
  ctx.font = '14px sans-serif';
  ctx.fillText('游戏正在加载完整版本...', W / 2, H / 2 + 40);
});

console.log('===== 事件监听注册完成 =====');
