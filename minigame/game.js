/**
 * 八卦立方体 - 微信小游戏
 * 四维超立方体的三维投影 - 时空切片
 * 边长10m的正方体内部视角
 */

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

const sysInfo = wx.getSystemInfoSync();
const W = sysInfo.windowWidth;
const H = sysInfo.windowHeight;
const DPR = sysInfo.pixelRatio;

canvas.width = W * DPR;
canvas.height = H * DPR;

// =============== 颜色定义 ===============
const COLOR_BG = '#eef2f7';

function getNodeColor(bits) {
  let ones = 0;
  for (const c of bits) if (c === '1') ones++;
  const gray = Math.round(255 * (1 - ones / 3));
  return `rgb(${gray},${gray},${gray})`;
}

function getEdgeColor(val) {
  return val === 0 ? '#FFFFFF' : '#000000';
}

// =============== 八卦定义 ===============
const bitsToName = {
  '000': '乾', '001': '兑', '010': '离', '011': '震',
  '100': '巽', '101': '坎', '110': '艮', '111': '坤'
};

// =============== 顶点坐标 ===============
const trigramPos = {};
const trigramBits = ['000', '001', '010', '011', '100', '101', '110', '111'];

for (const bits of trigramBits) {
  const b0 = bits[0], b1 = bits[1], b2 = bits[2];
  const x = (b2 === '1') ? 1 : -1;
  const y = (b0 === '1') ? 1 : -1;
  const z = (b1 === '1') ? 1 : -1;
  trigramPos[bits] = { x, y, z, bits, name: bitsToName[bits] };
}

// =============== 边定义 ===============
const edges = [];
for (let i = 0; i < trigramBits.length; i++) {
  for (let j = i + 1; j < trigramBits.length; j++) {
    const a = trigramBits[i];
    const b = trigramBits[j];
    let diffBit = -1;
    let diffCount = 0;
    for (let k = 0; k < 3; k++) {
      if (a[k] !== b[k]) {
        diffBit = k;
        diffCount++;
      }
    }
    if (diffCount === 1) {
      const val = parseInt(a[diffBit]);
      edges.push({ a, b, diffBit, val });
    }
  }
}

// =============== 宫视角定义 ===============
const palacePairs = {
  '乾': ['000', '111'],
  '坤': ['111', '000'],
  '兑': ['001', '110'],
  '艮': ['110', '001'],
  '离': ['010', '101'],
  '坎': ['101', '010'],
  '震': ['011', '100'],
  '巽': ['100', '011']
};

let currentPalace = '乾';

function getFrontBits() {
  return palacePairs[currentPalace][0];
}

function getBackBits() {
  return palacePairs[currentPalace][1];
}

// =============== 向量工具 ===============
function vecSub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function vecLength(v) { return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z); }
function vecNorm(v) { const L = vecLength(v) || 1; return { x: v.x / L, y: v.y / L, z: v.z / L }; }

// =============== 宫视角矩阵计算 ===============
function neighborBitsForUp(bits) {
  const b0 = bits[0], b1 = bits[1], b2 = bits[2];
  const flipped = b1 === '0' ? '1' : '0';
  return '' + b0 + flipped + b2;
}

function basisForPalace(frontBits, backBits) {
  const pA = trigramPos[frontBits];
  const pB = trigramPos[backBits];
  const forward = vecNorm(vecSub(pB, pA));

  const qBits = neighborBitsForUp(frontBits);
  const q = trigramPos[qBits];
  let upCand = vecSub(q, pA);
  const projLen = upCand.x * forward.x + upCand.y * forward.y + upCand.z * forward.z;
  upCand = { x: upCand.x - forward.x * projLen, y: upCand.y - forward.y * projLen, z: upCand.z - forward.z * projLen };
  const up = vecNorm(upCand);

  let right = {
    x: up.y * forward.z - up.z * forward.y,
    y: up.z * forward.x - up.x * forward.z,
    z: up.x * forward.y - up.y * forward.x
  };
  right = vecNorm(right);

  return [
    right.x, right.y, right.z,
    up.x, up.y, up.z,
    forward.x, forward.y, forward.z
  ];
}

const palaceBases = {};
for (const name in palacePairs) {
  const [f, b] = palacePairs[name];
  palaceBases[name] = basisForPalace(f, b);
}

// =============== 3D变换 ===============
let rotX = 0;
let rotY = 0;
let rotZ = Math.PI;
const zoom = 1.0;

function applyPalaceMat(p) {
  const m = palaceBases[currentPalace];
  if (!m) return p;
  return {
    x: m[0] * p.x + m[1] * p.y + m[2] * p.z,
    y: m[3] * p.x + m[4] * p.y + m[5] * p.z,
    z: m[6] * p.x + m[7] * p.y + m[8] * p.z
  };
}

function rotate3D(p) {
  let v = applyPalaceMat(p);
  let x = v.x * zoom;
  let y = v.y * zoom;
  let z = v.z * zoom;

  const cy = Math.cos(rotY), sy = Math.sin(rotY);
  let x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
  const cx = Math.cos(rotX), sx = Math.sin(rotX);
  let y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
  const cz = Math.cos(rotZ), sz = Math.sin(rotZ);
  let x3 = x1 * cz - y2 * sz, y3 = x1 * sz + y2 * cz;

  return { x: x3, y: y3, z: z2 };
}

function project(p) {
  const pr = rotate3D(p);
  const scale = Math.min(W, H) * 0.25;
  return {
    x: pr.x * scale + W / 2,
    y: -pr.y * scale + H / 2,
    z: pr.z
  };
}

// =============== 投影缓存 ===============
let projCache = new Map();

function updateProjCache() {
  projCache.clear();
  for (const bits in trigramPos) {
    const p = project(trigramPos[bits]);
    projCache.set(bits, p);
  }
}

// =============== 火柴人与场景 ===============
let walkTime = 0;
const CUBE_SIZE = 10; // 10米边长
let sceneOffset = 0; // 场景偏移量

// 画树（线段风格）
function drawTree(x, groundY, scale) {
  const h = 25 * scale;
  const trunkH = h * 0.4;
  const crownH = h * 0.6;

  ctx.strokeStyle = '#5D4037';
  ctx.lineWidth = 2;

  // 树干
  ctx.beginPath();
  ctx.moveTo(x, groundY);
  ctx.lineTo(x, groundY - trunkH);
  ctx.stroke();

  // 树冠（三角形线条）
  ctx.strokeStyle = '#2E7D32';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, groundY - trunkH - crownH);
  ctx.lineTo(x - crownH * 0.5, groundY - trunkH);
  ctx.lineTo(x + crownH * 0.5, groundY - trunkH);
  ctx.closePath();
  ctx.stroke();
}

// 画草（线段风格）
function drawGrass(x, groundY, scale) {
  const h = 8 * scale;
  ctx.strokeStyle = '#4CAF50';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(x - 3, groundY);
  ctx.lineTo(x - 5, groundY - h);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x, groundY);
  ctx.lineTo(x, groundY - h * 1.2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + 3, groundY);
  ctx.lineTo(x + 5, groundY - h);
  ctx.stroke();
}

// 画花（线段风格）
function drawFlower(x, groundY, scale) {
  const h = 12 * scale;

  // 茎
  ctx.strokeStyle = '#4CAF50';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, groundY);
  ctx.lineTo(x, groundY - h);
  ctx.stroke();

  // 花朵（五角星形）
  ctx.strokeStyle = '#FF6B6B';
  ctx.lineWidth = 2;
  const flowerSize = 4;
  const cx = x, cy = groundY - h;

  ctx.beginPath();
  ctx.moveTo(cx, cy - flowerSize);
  ctx.lineTo(cx, cy + flowerSize);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - flowerSize, cy);
  ctx.lineTo(cx + flowerSize, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - flowerSize * 0.7, cy - flowerSize * 0.7);
  ctx.lineTo(cx + flowerSize * 0.7, cy + flowerSize * 0.7);
  ctx.stroke();
}

// 画火柴人
function drawStickMan(centerX, groundY, scale, time) {
  const size = 40 * scale;

  // 走路动画参数
  const legSwing = Math.sin(time * 8) * 0.3;
  const armSwing = Math.sin(time * 8 + Math.PI) * 0.25;
  const bodyBob = Math.abs(Math.sin(time * 8)) * 2;

  ctx.save();
  ctx.translate(centerX, groundY - bodyBob);
  ctx.strokeStyle = '#333333';
  ctx.fillStyle = '#333333';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  // 头
  const headRadius = size * 0.12;
  const headY = -size * 0.85;
  ctx.beginPath();
  ctx.arc(0, headY, headRadius, 0, Math.PI * 2);
  ctx.fill();

  // 身体
  const shoulderY = headY + headRadius + 2;
  const hipY = shoulderY + size * 0.35;
  ctx.beginPath();
  ctx.moveTo(0, shoulderY);
  ctx.lineTo(0, hipY);
  ctx.stroke();

  // 左臂
  ctx.beginPath();
  ctx.moveTo(0, shoulderY + 3);
  ctx.lineTo(-size * 0.2 + armSwing * size * 0.15, shoulderY + size * 0.25);
  ctx.stroke();

  // 右臂
  ctx.beginPath();
  ctx.moveTo(0, shoulderY + 3);
  ctx.lineTo(size * 0.2 - armSwing * size * 0.15, shoulderY + size * 0.25);
  ctx.stroke();

  // 左腿
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(-size * 0.12 + legSwing * size * 0.2, hipY + size * 0.35);
  ctx.stroke();

  // 右腿
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(size * 0.12 - legSwing * size * 0.2, hipY + size * 0.35);
  ctx.stroke();

  ctx.restore();
}

// 绘制场景（花草树木 + 火柴人）
function drawScene(leftX, rightX, groundY) {
  const sceneWidth = rightX - leftX;
  const scale = sceneWidth / 150; // 基于场景宽度缩放

  // 场景元素的相对位置（0-1）
  const elements = [
    { type: 'tree', pos: 0.1 },
    { type: 'grass', pos: 0.2 },
    { type: 'flower', pos: 0.25 },
    { type: 'grass', pos: 0.35 },
    { type: 'tree', pos: 0.45 },
    { type: 'flower', pos: 0.55 },
    { type: 'grass', pos: 0.6 },
    { type: 'grass', pos: 0.7 },
    { type: 'tree', pos: 0.8 },
    { type: 'flower', pos: 0.85 },
    { type: 'grass', pos: 0.95 },
  ];

  // 绘制移动的场景元素
  for (const elem of elements) {
    // 计算循环位置
    let pos = (elem.pos - sceneOffset) % 1;
    if (pos < 0) pos += 1;
    const x = leftX + pos * sceneWidth;

    if (elem.type === 'tree') {
      drawTree(x, groundY, scale);
    } else if (elem.type === 'grass') {
      drawGrass(x, groundY, scale);
    } else if (elem.type === 'flower') {
      drawFlower(x, groundY, scale);
    }
  }

  // 火柴人在中间
  const stickX = (leftX + rightX) / 2;
  drawStickMan(stickX, groundY, scale, walkTime);
}

// =============== 碰撞检测 ===============
function hitTest(px, py) {
  let best = null;
  let bestD2 = Infinity;
  const hitRadius = 25;
  const frontBits = getFrontBits();

  for (const bits in trigramPos) {
    if (bits === frontBits) continue;
    const p = projCache.get(bits);
    if (!p) continue;
    const dx = px - p.x;
    const dy = py - p.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < hitRadius * hitRadius && d2 < bestD2) {
      bestD2 = d2;
      best = bits;
    }
  }
  return best;
}

// =============== 绘制 ===============
function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // 背景
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, W, H);

  updateProjCache();

  const frontBits = getFrontBits();
  const backBits = getBackBits();

  // 过滤掉连接到中心点的边
  const visibleEdges = edges.filter(e => {
    return e.a !== frontBits && e.b !== frontBits;
  });

  // 按深度排序边
  const sortedEdges = visibleEdges.map(e => {
    const pa = projCache.get(e.a);
    const pb = projCache.get(e.b);
    const avgZ = (pa.z + pb.z) / 2;
    return { ...e, pa, pb, avgZ };
  }).sort((a, b) => a.avgZ - b.avgZ);

  // 画边
  for (const e of sortedEdges) {
    ctx.beginPath();
    ctx.moveTo(e.pa.x, e.pa.y);
    ctx.lineTo(e.pb.x, e.pb.y);

    ctx.strokeStyle = getEdgeColor(e.val);
    ctx.lineWidth = e.avgZ > 0 ? 4 : 3;

    if (e.val === 0) {
      ctx.save();
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = e.avgZ > 0 ? 6 : 5;
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = e.avgZ > 0 ? 3 : 2;
    }
    ctx.stroke();
  }

  // 过滤掉中心点，按深度排序顶点
  const sortedVerts = trigramBits
    .filter(bits => bits !== frontBits)
    .map(bits => {
      const p = projCache.get(bits);
      return { bits, p, name: bitsToName[bits] };
    }).sort((a, b) => a.p.z - b.p.z);

  // 画顶点和标签
  for (const v of sortedVerts) {
    const p = v.p;
    const isFront = p.z > 0;
    const radius = isFront ? 12 : 9;

    const nodeColor = getNodeColor(v.bits);

    ctx.beginPath();
    ctx.arc(p.x, p.y, radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = '#666666';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = nodeColor;
    ctx.fill();

    ctx.fillStyle = '#333333';
    ctx.font = isFront ? 'bold 13px sans-serif' : '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const labelY = p.y - radius - 12;
    ctx.fillText(v.bits, p.x, labelY);
  }

  // 找到底部两个顶点（011 和 110 对于乾宫）
  // 按 Y 坐标排序，找最大的两个（不包括后方顶点111）
  const frontBitsLocal = getFrontBits();
  const backBitsLocal = getBackBits();

  const sortedByY = trigramBits
    .filter(bits => bits !== frontBitsLocal && bits !== backBitsLocal)
    .map(bits => ({ bits, p: projCache.get(bits) }))
    .filter(v => v.p)
    .sort((a, b) => b.p.y - a.p.y);

  // 取Y最大的两个作为底部顶点
  if (sortedByY.length >= 2) {
    const bottom1 = sortedByY[0];
    const bottom2 = sortedByY[1];

    const leftX = Math.min(bottom1.p.x, bottom2.p.x);
    const rightX = Math.max(bottom1.p.x, bottom2.p.x);
    const groundY = (bottom1.p.y + bottom2.p.y) / 2;

    // 绘制场景（火柴人和移动的花草树木）
    drawScene(leftX, rightX, groundY);
  }

  // 显示信息
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`宫视角: ${currentPalace}宫`, 15, 25);
  ctx.font = '11px sans-serif';
  ctx.fillText('点击顶点切换视角', 15, 42);
  ctx.fillText(`超立方体时空切片 · ${CUBE_SIZE}m × ${CUBE_SIZE}m × ${CUBE_SIZE}m`, 15, 58);
}

// =============== 游戏循环 ===============
function gameLoop() {
  walkTime += 0.016; // 约60fps

  // 场景平移（模拟火柴人行走）
  sceneOffset += 0.003;

  // 循环场景
  if (sceneOffset > 1) {
    sceneOffset = 0;
  }

  draw();
  requestAnimationFrame(gameLoop);
}

// =============== 触摸处理 ===============
let touchStart = null;

wx.onTouchStart((e) => {
  if (e.touches.length > 0) {
    touchStart = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      t: Date.now()
    };
  }
});

wx.onTouchEnd((e) => {
  if (!touchStart || !e.changedTouches.length) return;

  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  const dt = Date.now() - touchStart.t;

  if (dt < 300 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
    const hit = hitTest(touch.clientX, touch.clientY);
    if (hit) {
      const name = bitsToName[hit];
      if (palacePairs[name]) {
        currentPalace = name;
        rotX = 0;
        rotY = 0;
        rotZ = Math.PI;
      }
    }
  }

  touchStart = null;
});

// =============== 启动 ===============
console.log('八卦立方体初始化...');
console.log('四维超立方体时空切片');
requestAnimationFrame(gameLoop);
console.log('游戏循环启动');
