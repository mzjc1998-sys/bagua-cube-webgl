/**
 * 八卦立方体 - 微信小游戏
 * 第一步：创建八卦立方体俯视图
 */

// 获取 Canvas
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// 获取系统信息
const sysInfo = wx.getSystemInfoSync();
const W = sysInfo.windowWidth;
const H = sysInfo.windowHeight;
const DPR = sysInfo.pixelRatio;

// 设置 Canvas 尺寸
canvas.width = W * DPR;
canvas.height = H * DPR;

// =============== 八卦定义 ===============
// 二进制编码：0=阳爻，1=阴爻，爻序从下到上
const TRIGRAMS = {
  '000': { name: '乾', pinyin: 'qian' },
  '001': { name: '兑', pinyin: 'dui' },
  '010': { name: '离', pinyin: 'li' },
  '011': { name: '震', pinyin: 'zhen' },
  '100': { name: '巽', pinyin: 'xun' },
  '101': { name: '坎', pinyin: 'kan' },
  '110': { name: '艮', pinyin: 'gen' },
  '111': { name: '坤', pinyin: 'kun' }
};

// =============== 立方体顶点 ===============
// 二进制编码映射到3D坐标
// bit0(最右) -> x, bit1(中间) -> y, bit2(最左) -> z
const vertices = {};
for (const bits in TRIGRAMS) {
  const x = (bits[2] === '1') ? 1 : -1;  // bit0
  const y = (bits[1] === '1') ? 1 : -1;  // bit1
  const z = (bits[0] === '1') ? 1 : -1;  // bit2
  vertices[bits] = { x, y, z, ...TRIGRAMS[bits], bits };
}

// =============== 立方体边 ===============
// 只连接汉明距离为1的顶点（相邻顶点）
const edges = [];
const bitsList = Object.keys(TRIGRAMS);
for (let i = 0; i < bitsList.length; i++) {
  for (let j = i + 1; j < bitsList.length; j++) {
    const a = bitsList[i];
    const b = bitsList[j];
    // 计算汉明距离
    let diff = 0;
    for (let k = 0; k < 3; k++) {
      if (a[k] !== b[k]) diff++;
    }
    if (diff === 1) {
      edges.push([a, b]);
    }
  }
}

// =============== 3D 投影设置 ===============
// 等角投影，从上方俯视
const cubeSize = Math.min(W, H) * 0.32;
const centerX = W / 2;
const centerY = H / 2;

// 旋转角度（俯视角度）
const rotX = Math.PI * 0.35;  // 绕X轴旋转（俯视）
const rotY = -Math.PI / 4;    // 绕Y轴旋转45度

function rotate3D(x, y, z) {
  // 先绕Y轴旋转
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const x1 = x * cosY + z * sinY;
  const z1 = -x * sinY + z * cosY;

  // 再绕X轴旋转
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const y2 = y * cosX - z1 * sinX;
  const z2 = y * sinX + z1 * cosX;

  return { x: x1, y: y2, z: z2 };
}

function project(v) {
  const rotated = rotate3D(v.x, v.y, v.z);
  return {
    x: centerX + rotated.x * cubeSize,
    y: centerY - rotated.y * cubeSize,  // Y轴反转
    z: rotated.z,
    bits: v.bits,
    name: v.name
  };
}

// =============== 绘制函数 ===============
function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // 背景
  ctx.fillStyle = '#ECEEF1';
  ctx.fillRect(0, 0, W, H);

  // 投影所有顶点
  const projected = [];
  for (const bits in vertices) {
    projected.push(project(vertices[bits]));
  }

  // 按Z排序（远的先画）
  projected.sort((a, b) => a.z - b.z);

  // 画边
  for (const [a, b] of edges) {
    const p1 = project(vertices[a]);
    const p2 = project(vertices[b]);

    // 根据深度决定线条颜色
    const avgZ = (p1.z + p2.z) / 2;
    const alpha = 0.3 + (avgZ + 1) * 0.35;

    ctx.strokeStyle = `rgba(60, 60, 60, ${alpha})`;
    ctx.lineWidth = avgZ > 0 ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  // 画顶点和标签
  for (const p of projected) {
    // 根据深度决定大小和透明度
    const size = 8 + (p.z + 1) * 3;
    const alpha = 0.5 + (p.z + 1) * 0.25;

    // 顶点圆点
    ctx.fillStyle = `rgba(30, 30, 30, ${alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();

    // 标签
    ctx.fillStyle = `rgba(50, 50, 50, ${alpha})`;
    ctx.font = `${14 + (p.z + 1) * 2}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 标签位置偏移
    let labelY = p.y - size - 12;

    // 显示卦名和二进制
    ctx.fillText(`${p.name} ${p.bits}`, p.x, labelY);
  }
}

// =============== 触摸交互 ===============
let lastTouch = null;
let currentRotX = rotX;
let currentRotY = rotY;

wx.onTouchStart((e) => {
  if (e.touches.length > 0) {
    lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
});

wx.onTouchMove((e) => {
  if (!lastTouch || e.touches.length === 0) return;

  const touch = e.touches[0];
  const dx = touch.clientX - lastTouch.x;
  const dy = touch.clientY - lastTouch.y;

  // 暂时禁用旋转，保持固定视角
  // currentRotY += dx * 0.01;
  // currentRotX += dy * 0.01;

  lastTouch = { x: touch.clientX, y: touch.clientY };
});

wx.onTouchEnd(() => {
  lastTouch = null;
});

// =============== 启动 ===============
console.log('八卦立方体初始化...');
console.log('屏幕尺寸:', W, 'x', H);
console.log('顶点数:', Object.keys(vertices).length);
console.log('边数:', edges.length);

// 绘制
draw();

console.log('八卦立方体绘制完成');
