/**
 * 八卦立方体 - 微信小游戏
 * 正六边形投影，乾在中心
 */

// 获取 Canvas
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// 系统信息
const sysInfo = wx.getSystemInfoSync();
const W = sysInfo.windowWidth;
const H = sysInfo.windowHeight;
const DPR = sysInfo.pixelRatio;

canvas.width = W * DPR;
canvas.height = H * DPR;

// =============== 八卦定义 ===============
const TRIGRAMS = {
  '000': { name: '乾' },
  '001': { name: '兑' },
  '010': { name: '离' },
  '011': { name: '震' },
  '100': { name: '巽' },
  '101': { name: '坎' },
  '110': { name: '艮' },
  '111': { name: '坤' }
};

// =============== 六边形布局 ===============
// 按照截图精确布局：
// 上排（从左到右）：100(巽) 101(坎) 001(兑)
// 中心：000(乾)
// 下排（从左到右）：110(艮) 010(离) 011(震)
// 后面：111(坤) - 被乾遮挡

const R = Math.min(W, H) * 0.35;  // 六边形半径
const centerX = W / 2;
const centerY = H / 2;

// sin(60°) 和 cos(60°)
const sin60 = Math.sqrt(3) / 2;
const cos60 = 0.5;

// 精确的2D位置
const positions = {
  '000': { x: 0, y: 0, z: 1 },                    // 乾 - 中心（最前）
  '101': { x: 0, y: -R, z: 0 },                   // 坎 - 顶部
  '100': { x: -R * sin60, y: -R * cos60, z: 0 }, // 巽 - 左上
  '001': { x: R * sin60, y: -R * cos60, z: 0 },  // 兑 - 右上
  '110': { x: -R * sin60, y: R * cos60, z: 0 },  // 艮 - 左下
  '010': { x: 0, y: R, z: 0 },                    // 离 - 底部
  '011': { x: R * sin60, y: R * cos60, z: 0 },   // 震 - 右下
  '111': { x: 0, y: 0, z: -1 }                    // 坤 - 中心（最后，被遮挡）
};

// =============== 立方体边 ===============
// 汉明距离为1的顶点相连
const edges = [];
const bitsList = Object.keys(TRIGRAMS);
for (let i = 0; i < bitsList.length; i++) {
  for (let j = i + 1; j < bitsList.length; j++) {
    const a = bitsList[i];
    const b = bitsList[j];
    let diff = 0;
    for (let k = 0; k < 3; k++) {
      if (a[k] !== b[k]) diff++;
    }
    if (diff === 1) {
      edges.push([a, b]);
    }
  }
}

// =============== 绘制函数 ===============
function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // 背景
  ctx.fillStyle = '#ECEEF1';
  ctx.fillRect(0, 0, W, H);

  // 先画后面的边（浅色）
  ctx.strokeStyle = '#BBBBBB';
  ctx.lineWidth = 1.5;

  // 与坤(111)相连的边（后面的边）
  for (const [a, b] of edges) {
    if (a === '111' || b === '111') {
      const p1 = positions[a];
      const p2 = positions[b];
      ctx.beginPath();
      ctx.moveTo(centerX + p1.x, centerY + p1.y);
      ctx.lineTo(centerX + p2.x, centerY + p2.y);
      ctx.stroke();
    }
  }

  // 外圈的边（六边形边 + 部分内部边）
  for (const [a, b] of edges) {
    if (a === '111' || b === '111') continue;  // 跳过与坤相连的
    if (a === '000' || b === '000') continue;  // 跳过与乾相连的，后面画

    const p1 = positions[a];
    const p2 = positions[b];
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX + p1.x, centerY + p1.y);
    ctx.lineTo(centerX + p2.x, centerY + p2.y);
    ctx.stroke();
  }

  // 与乾(000)相连的边（前面的边，深色粗线）
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 2.5;
  for (const [a, b] of edges) {
    if (a === '000' || b === '000') {
      const p1 = positions[a];
      const p2 = positions[b];
      ctx.beginPath();
      ctx.moveTo(centerX + p1.x, centerY + p1.y);
      ctx.lineTo(centerX + p2.x, centerY + p2.y);
      ctx.stroke();
    }
  }

  // 画顶点（按z排序，后面的先画）
  const sortedBits = Object.keys(positions).sort((a, b) => positions[a].z - positions[b].z);

  for (const bits of sortedBits) {
    const pos = positions[bits];
    const name = TRIGRAMS[bits].name;

    // 坤在后面，画小一点或跳过
    if (bits === '111') continue;

    const px = centerX + pos.x;
    const py = centerY + pos.y;

    // 顶点圆点
    const radius = bits === '000' ? 12 : 10;
    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();

    // 标签
    ctx.fillStyle = '#333333';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 标签位置
    let labelX = px;
    let labelY = py - radius - 12;

    // 乾在中心，标签放下面
    if (bits === '000') {
      labelY = py + radius + 15;
    }
    // 下排的标签也放下面
    if (bits === '110' || bits === '010' || bits === '011') {
      labelY = py + radius + 15;
    }

    ctx.fillText(`${name} ${bits}`, labelX, labelY);
  }
}

// =============== 触摸交互 ===============
wx.onTouchStart((e) => {
  console.log('Touch:', e.touches[0].clientX, e.touches[0].clientY);
});

// =============== 启动 ===============
console.log('八卦立方体初始化...');
draw();
console.log('绘制完成');
