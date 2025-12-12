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
const R = Math.min(W, H) * 0.35;
const centerX = W / 2;
const centerY = H / 2;

const sin60 = Math.sqrt(3) / 2;
const cos60 = 0.5;

const positions = {
  '000': { x: 0, y: 0, z: 1 },
  '101': { x: 0, y: -R, z: 0 },
  '100': { x: -R * sin60, y: -R * cos60, z: 0 },
  '001': { x: R * sin60, y: -R * cos60, z: 0 },
  '110': { x: -R * sin60, y: R * cos60, z: 0 },
  '010': { x: 0, y: R, z: 0 },
  '011': { x: R * sin60, y: R * cos60, z: 0 },
  '111': { x: 0, y: 0, z: -1 }
};

// =============== 立方体边 ===============
// 汉明距离为1的顶点相连，但排除 000-100, 000-001, 000-010
const edges = [];
const bitsList = Object.keys(TRIGRAMS);

// 要排除的边
const excludeEdges = [
  ['000', '100'],
  ['000', '001'],
  ['000', '010']
];

function isExcluded(a, b) {
  for (const [e1, e2] of excludeEdges) {
    if ((a === e1 && b === e2) || (a === e2 && b === e1)) {
      return true;
    }
  }
  return false;
}

for (let i = 0; i < bitsList.length; i++) {
  for (let j = i + 1; j < bitsList.length; j++) {
    const a = bitsList[i];
    const b = bitsList[j];

    // 排除指定的边
    if (isExcluded(a, b)) continue;

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

  // 先画后面的边（浅色）- 与坤相连的边
  ctx.strokeStyle = '#BBBBBB';
  ctx.lineWidth = 1.5;

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

  // 外圈的边（六边形边）- 深色
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 2;

  for (const [a, b] of edges) {
    if (a === '111' || b === '111') continue;
    if (a === '000' || b === '000') continue;

    const p1 = positions[a];
    const p2 = positions[b];
    ctx.beginPath();
    ctx.moveTo(centerX + p1.x, centerY + p1.y);
    ctx.lineTo(centerX + p2.x, centerY + p2.y);
    ctx.stroke();
  }

  // 与乾相连的边（如果有的话）
  for (const [a, b] of edges) {
    if (a === '000' || b === '000') {
      const p1 = positions[a];
      const p2 = positions[b];
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(centerX + p1.x, centerY + p1.y);
      ctx.lineTo(centerX + p2.x, centerY + p2.y);
      ctx.stroke();
    }
  }

  // 画顶点
  const sortedBits = Object.keys(positions).sort((a, b) => positions[a].z - positions[b].z);

  for (const bits of sortedBits) {
    const pos = positions[bits];

    // 坤在后面，跳过
    if (bits === '111') continue;

    const px = centerX + pos.x;
    const py = centerY + pos.y;

    // 顶点圆点
    const radius = bits === '000' ? 12 : 10;
    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();

    // 只显示二进制编码，不显示卦名
    ctx.fillStyle = '#333333';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let labelX = px;
    let labelY = py - radius - 12;

    // 乾和下排的标签放下面
    if (bits === '000' || bits === '110' || bits === '010' || bits === '011') {
      labelY = py + radius + 15;
    }

    ctx.fillText(bits, labelX, labelY);
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
