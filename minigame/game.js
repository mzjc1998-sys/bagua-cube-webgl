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

// 地面元素（全局，保持相对位置）
// 坐标使用无限平面坐标系，不限于[0,1]范围
const groundElements = [
  { type: 'tree', x: 0.12, y: 0.18 },
  { type: 'tree', x: 0.82, y: 0.28 },
  { type: 'grass', x: 0.28, y: 0.38 },
  { type: 'flower', x: 0.68, y: 0.12 },
  { type: 'grass', x: 0.42, y: 0.58 },
  { type: 'tree', x: 0.22, y: 0.72 },
  { type: 'flower', x: 0.58, y: 0.42 },
  { type: 'grass', x: 0.78, y: 0.62 },
  { type: 'tree', x: 0.48, y: 0.88 },
  { type: 'flower', x: 0.32, y: 0.52 },
  { type: 'grass', x: 0.72, y: 0.82 },
];

// 上一帧的移动方向和偏移量（用于计算增量）
let lastSceneOffset = 0;
let lastMoveDir = { x: 0, y: 0 };

// 在地面菱形上计算一个点的屏幕坐标
// 以010为原点，010->011为X轴，010->110为Y轴
// x: 0-1 从010到011方向
// y: 0-1 从010到110方向
function getGroundPoint(groundQuad, x, y) {
  // 四个角点
  const p00 = groundQuad.farRight;  // 010 - 原点
  const p10 = groundQuad.nearRight; // 011 - X轴方向
  const p01 = groundQuad.nearLeft;  // 110 - Y轴方向
  const p11 = groundQuad.farLeft;   // 111 - 对角

  // 双线性插值计算屏幕坐标
  const screenX = (1-x)*(1-y)*p00.x + x*(1-y)*p10.x + (1-x)*y*p01.x + x*y*p11.x;
  const screenY = (1-x)*(1-y)*p00.y + x*(1-y)*p10.y + (1-x)*y*p01.y + x*y*p11.y;

  // 透视缩放：靠近010（原点）的物体大，靠近111的物体小
  // 计算到010的距离
  const distTo010 = Math.sqrt(x*x + y*y);
  const scale = 1.0 - distTo010 * 0.4;

  return { x: screenX, y: screenY, scale: Math.max(0.3, scale) };
}

// 获取菱形中心点（火柴人位置）
function getDiamondCenter(groundQuad) {
  return getGroundPoint(groundQuad, 0.5, 0.5);
}

// 画树（线段风格，带透视）
function drawTree(x, y, scale) {
  const h = 30 * scale;
  const trunkH = h * 0.4;
  const crownH = h * 0.6;

  ctx.strokeStyle = '#5D4037';
  ctx.lineWidth = Math.max(1, 2 * scale);

  // 树干
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - trunkH);
  ctx.stroke();

  // 树冠（三角形线条）
  ctx.strokeStyle = '#2E7D32';
  ctx.beginPath();
  ctx.moveTo(x, y - trunkH - crownH);
  ctx.lineTo(x - crownH * 0.5, y - trunkH);
  ctx.lineTo(x + crownH * 0.5, y - trunkH);
  ctx.closePath();
  ctx.stroke();
}

// 画草（线段风格，带透视）
function drawGrass(x, y, scale) {
  const h = 10 * scale;
  ctx.strokeStyle = '#4CAF50';
  ctx.lineWidth = Math.max(1, 1 * scale);

  ctx.beginPath();
  ctx.moveTo(x - 3 * scale, y);
  ctx.lineTo(x - 5 * scale, y - h);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h * 1.2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + 3 * scale, y);
  ctx.lineTo(x + 5 * scale, y - h);
  ctx.stroke();
}

// 画花（线段风格，带透视）
function drawFlower(x, y, scale) {
  const h = 15 * scale;

  // 茎
  ctx.strokeStyle = '#4CAF50';
  ctx.lineWidth = Math.max(1, 1 * scale);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h);
  ctx.stroke();

  // 花朵
  ctx.strokeStyle = '#FF6B6B';
  ctx.lineWidth = Math.max(1, 2 * scale);
  const flowerSize = 5 * scale;
  const cx = x, cy = y - h;

  ctx.beginPath();
  ctx.moveTo(cx, cy - flowerSize);
  ctx.lineTo(cx, cy + flowerSize);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - flowerSize, cy);
  ctx.lineTo(cx + flowerSize, cy);
  ctx.stroke();
}

// 平滑插值函数
function smoothStep(t) {
  return t * t * (3 - 2 * t);
}

// 弹性缓动
function easeOutElastic(t) {
  if (t === 0 || t === 1) return t;
  return Math.sin(-13 * Math.PI / 2 * (t + 1)) * Math.pow(2, -10 * t) + 1;
}

// 人体跑步生物力学动画
// 基于真实人体运动学：
// 1. 手臂与对侧腿交叉摆动（右腿前=左臂前）
// 2. 肘部保持约90度弯曲
// 3. 肩部随手臂旋转，与髋部反向
// 4. 上身前倾5-10度
// 5. 头部保持稳定
function drawStickManPhysics(x, y, scale, time) {
  const size = 50 * scale;
  const runSpeed = 7;
  const phase = time * runSpeed;

  // 跑步周期中的身体起伏（每步两次起伏）
  const verticalBounce = Math.abs(Math.sin(phase)) * 2.5 * scale;

  // 躯干前倾（跑步时约8度）
  const torsoLean = 0.14;

  ctx.save();
  ctx.translate(x, y - verticalBounce);
  ctx.rotate(torsoLean);
  ctx.strokeStyle = '#333333';
  ctx.fillStyle = '#333333';
  ctx.lineWidth = Math.max(1.5, 2.5 * scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // ===== 骨骼尺寸 =====
  const headR = size * 0.08;
  const neckLen = size * 0.05;
  const torsoLen = size * 0.35;
  const shoulderW = size * 0.14;
  const hipW = size * 0.09;
  const upperLegLen = size * 0.22;
  const lowerLegLen = size * 0.22;
  const upperArmLen = size * 0.14;
  const lowerArmLen = size * 0.13;

  // 关节位置
  const headY = -size * 0.95;
  const neckY = headY + headR;
  const shoulderY = neckY + neckLen;
  const hipY = shoulderY + torsoLen;

  // ===== 腿部动画（跑步周期）=====
  // 右腿在前时 phase=0，左腿在前时 phase=PI

  // 大腿摆动角度（前后各约45度）
  const rightThighAng = Math.sin(phase) * 0.7;
  const leftThighAng = Math.sin(phase + Math.PI) * 0.7;

  // 膝盖弯曲（抬腿时弯曲更大，支撑时较直）
  // 当腿向后摆时膝盖弯曲小，向前摆时弯曲大
  const rightKneeBend = 0.2 + Math.max(0, Math.sin(phase - 0.3)) * 1.0;
  const leftKneeBend = 0.2 + Math.max(0, Math.sin(phase + Math.PI - 0.3)) * 1.0;

  // 右腿关节计算
  const rHipX = hipW;
  const rKneeX = rHipX + Math.sin(rightThighAng) * upperLegLen;
  const rKneeY = hipY + Math.cos(rightThighAng) * upperLegLen;
  const rFootX = rKneeX + Math.sin(rightThighAng + rightKneeBend) * lowerLegLen;
  const rFootY = rKneeY + Math.cos(rightThighAng + rightKneeBend) * lowerLegLen;

  // 左腿关节计算
  const lHipX = -hipW;
  const lKneeX = lHipX + Math.sin(leftThighAng) * upperLegLen;
  const lKneeY = hipY + Math.cos(leftThighAng) * upperLegLen;
  const lFootX = lKneeX + Math.sin(leftThighAng + leftKneeBend) * lowerLegLen;
  const lFootY = lKneeY + Math.cos(leftThighAng + leftKneeBend) * lowerLegLen;

  // ===== 手臂动画（与对侧腿反向）=====
  // 右臂与左腿同步，左臂与右腿同步

  // 手臂摆动角度（从肩部）
  const rightArmAng = Math.sin(phase + Math.PI) * 0.5; // 与左腿同步
  const leftArmAng = Math.sin(phase) * 0.5; // 与右腿同步

  // 肘部保持约90度弯曲（约1.57弧度），跑步时会有变化
  const rightElbowBend = 1.4 + Math.sin(phase + Math.PI) * 0.2;
  const leftElbowBend = 1.4 + Math.sin(phase) * 0.2;

  // 右臂关节计算
  const rShoulderX = shoulderW;
  const rElbowX = rShoulderX + Math.sin(rightArmAng) * upperArmLen;
  const rElbowY = shoulderY + Math.cos(rightArmAng) * upperArmLen;
  const rHandX = rElbowX + Math.sin(rightArmAng + rightElbowBend) * lowerArmLen;
  const rHandY = rElbowY + Math.cos(rightArmAng + rightElbowBend) * lowerArmLen;

  // 左臂关节计算
  const lShoulderX = -shoulderW;
  const lElbowX = lShoulderX + Math.sin(leftArmAng) * upperArmLen;
  const lElbowY = shoulderY + Math.cos(leftArmAng) * upperArmLen;
  const lHandX = lElbowX + Math.sin(leftArmAng + leftElbowBend) * lowerArmLen;
  const lHandY = lElbowY + Math.cos(leftArmAng + leftElbowBend) * lowerArmLen;

  // ===== 肩部和髋部旋转（反向）=====
  const shoulderRotate = Math.sin(phase) * 0.08;
  const hipRotate = Math.sin(phase) * 0.04;

  // ===== 绘制 =====

  // 头部（保持相对稳定）
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // 颈部
  ctx.beginPath();
  ctx.moveTo(0, neckY);
  ctx.lineTo(0, shoulderY);
  ctx.stroke();

  // 躯干（脊椎）
  ctx.beginPath();
  ctx.moveTo(0, shoulderY);
  ctx.lineTo(0, hipY);
  ctx.stroke();

  // 肩膀（带旋转）
  ctx.beginPath();
  ctx.moveTo(-shoulderW, shoulderY - shoulderRotate * size);
  ctx.lineTo(shoulderW, shoulderY + shoulderRotate * size);
  ctx.stroke();

  // 髋部（带反向旋转）
  ctx.beginPath();
  ctx.moveTo(-hipW, hipY + hipRotate * size);
  ctx.lineTo(hipW, hipY - hipRotate * size);
  ctx.stroke();

  // 左臂（上臂 + 前臂）
  ctx.beginPath();
  ctx.moveTo(lShoulderX, shoulderY - shoulderRotate * size);
  ctx.lineTo(lElbowX, lElbowY);
  ctx.lineTo(lHandX, lHandY);
  ctx.stroke();

  // 右臂（上臂 + 前臂）
  ctx.beginPath();
  ctx.moveTo(rShoulderX, shoulderY + shoulderRotate * size);
  ctx.lineTo(rElbowX, rElbowY);
  ctx.lineTo(rHandX, rHandY);
  ctx.stroke();

  // 左腿（大腿 + 小腿）
  ctx.beginPath();
  ctx.moveTo(lHipX, hipY + hipRotate * size);
  ctx.lineTo(lKneeX, lKneeY);
  ctx.lineTo(lFootX, lFootY);
  ctx.stroke();

  // 右腿（大腿 + 小腿）
  ctx.beginPath();
  ctx.moveTo(rHipX, hipY - hipRotate * size);
  ctx.lineTo(rKneeX, rKneeY);
  ctx.lineTo(rFootX, rFootY);
  ctx.stroke();

  ctx.restore();
}

// 计算000在地面坐标系中的位置
// 使用逆双线性插值（近似）
function getZeroGroundCoords(groundQuad) {
  const zero = projCache.get('000');
  if (!zero) return { x: 0.5, y: 0.5 };

  const p00 = groundQuad.farRight;  // 原点 (0,0)
  const p10 = groundQuad.nearRight; // X轴方向 (1,0)
  const p01 = groundQuad.nearLeft;  // Y轴方向 (0,1)

  // 计算 X 轴和 Y 轴向量
  const xAxis = { x: p10.x - p00.x, y: p10.y - p00.y };
  const yAxis = { x: p01.x - p00.x, y: p01.y - p00.y };

  // 000 相对于原点的向量
  const v = { x: zero.x - p00.x, y: zero.y - p00.y };

  // 解线性方程组: v = x * xAxis + y * yAxis
  // 使用 Cramer's rule
  const det = xAxis.x * yAxis.y - xAxis.y * yAxis.x;
  if (Math.abs(det) < 0.001) {
    return { x: 0.5, y: 0.5 }; // 退化情况
  }

  const gx = (v.x * yAxis.y - v.y * yAxis.x) / det;
  const gy = (xAxis.x * v.y - xAxis.y * v.x) / det;

  return { x: gx, y: gy };
}

// 绘制单个地面元素
function drawGroundElement(groundQuad, type, x, y) {
  // 只绘制在可见范围内的元素
  if (x < -0.1 || x > 1.1 || y < -0.1 || y > 1.1) {
    return;
  }

  const pt = getGroundPoint(groundQuad, x, y);

  if (type === 'tree') {
    drawTree(pt.x, pt.y, pt.scale);
  } else if (type === 'grass') {
    drawGrass(pt.x, pt.y, pt.scale);
  } else if (type === 'flower') {
    drawFlower(pt.x, pt.y, pt.scale);
  }
}

// 绘制地面上的场景
function drawGroundScene(groundQuad) {
  // 场景移动原理：
  // 1. 火柴人永远朝向"000"方向奔跑
  // 2. 计算000在当前地面坐标系中的位置
  // 3. 场景向000的反方向移动（增量更新）
  // 4. 使用平铺渲染，确保地面始终有物体

  // 计算000在地面坐标系中的位置
  const zeroPos = getZeroGroundCoords(groundQuad);

  // 计算移动方向（从地面中心指向000的反方向）
  const dirX = 0.5 - zeroPos.x;
  const dirY = 0.5 - zeroPos.y;

  // 归一化方向向量
  const len = Math.sqrt(dirX * dirX + dirY * dirY);
  const normX = len > 0.01 ? dirX / len : 0;
  const normY = len > 0.01 ? dirY / len : 0;

  // 计算本帧的移动增量
  const deltaOffset = sceneOffset - lastSceneOffset;
  lastSceneOffset = sceneOffset;

  // 更新所有地面元素的位置（增量移动）
  for (const elem of groundElements) {
    elem.x += deltaOffset * normX;
    elem.y += deltaOffset * normY;

    // 使用模运算保持坐标在 [0, 1) 范围内
    // 这样元素会无缝循环
    elem.x = ((elem.x % 1.0) + 1.0) % 1.0;
    elem.y = ((elem.y % 1.0) + 1.0) % 1.0;
  }

  // 使用平铺渲染：绘制元素及其周围的副本
  // 这确保了边界处不会出现空白
  for (const elem of groundElements) {
    // 绘制 3x3 平铺（原位置 + 8个方向的副本）
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const x = elem.x + ox;
        const y = elem.y + oy;
        drawGroundElement(groundQuad, elem.type, x, y);
      }
    }
  }

  // 火柴人在菱形正中央
  const stickPt = getDiamondCenter(groundQuad);
  drawStickManPhysics(stickPt.x, stickPt.y, stickPt.scale, walkTime);
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

  // 计算地面菱形区域（下方的四边形：110-011-010-111）
  // 找到组成地面菱形的四个顶点
  const frontBitsLocal = getFrontBits();

  // 获取所有可见顶点，按Y坐标排序找到底部的顶点
  const visibleVerts = trigramBits
    .filter(bits => bits !== frontBitsLocal)
    .map(bits => ({ bits, p: projCache.get(bits) }))
    .filter(v => v.p);

  // 按Y坐标排序（从下到上）
  visibleVerts.sort((a, b) => b.p.y - a.p.y);

  if (visibleVerts.length >= 4) {
    // 底部4个顶点组成地面菱形
    // 最下面的是010，然后是110和011（左右两侧），然后是111（上方）
    const bottom4 = visibleVerts.slice(0, 4);

    // 找到最下方的点（010）
    const bottomPt = bottom4[0].p;

    // 找到左右两侧的点（110和011）
    const sidePts = bottom4.slice(1, 3);
    const leftPt = sidePts[0].p.x < sidePts[1].p.x ? sidePts[0].p : sidePts[1].p;
    const rightPt = sidePts[0].p.x < sidePts[1].p.x ? sidePts[1].p : sidePts[0].p;

    // 找到上方的点（111）
    const topPt = bottom4[3].p;

    // 地面菱形的四个角
    const groundQuad = {
      nearLeft: leftPt,      // 110
      nearRight: rightPt,    // 011
      farLeft: topPt,        // 111 (上方)
      farRight: bottomPt     // 010 (下方)
    };

    // 绘制地面上的场景
    drawGroundScene(groundQuad);
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
  // sceneOffset 可以无限增长，元素坐标通过模运算循环
  sceneOffset += 0.003;

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
