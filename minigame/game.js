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

// 物理引擎火柴人 - 带关节系统
function drawStickManPhysics(x, y, scale, time) {
  const size = 50 * scale;
  const runSpeed = 10; // 跑步速度
  const cycle = time * runSpeed; // 跑步周期

  // 身体上下摆动（跑步时的起伏）
  const bodyBob = Math.abs(Math.sin(cycle)) * 3 * scale;
  const bodyLean = Math.sin(cycle * 0.5) * 0.05; // 轻微前后摆动

  ctx.save();
  ctx.translate(x, y - bodyBob);
  ctx.rotate(bodyLean);
  ctx.strokeStyle = '#333333';
  ctx.fillStyle = '#333333';
  ctx.lineWidth = Math.max(1, 2.5 * scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // ===== 骨骼系统定义 =====
  // 头部
  const headRadius = size * 0.1;
  const headY = -size * 0.95;

  // 颈部
  const neckY = headY + headRadius;

  // 肩膀
  const shoulderY = neckY + size * 0.05;
  const shoulderWidth = size * 0.15;

  // 躯干
  const spineY = shoulderY + size * 0.25; // 脊椎中点
  const hipY = shoulderY + size * 0.4;
  const hipWidth = size * 0.1;

  // ===== 腿部关节（物理动画）=====
  // 大腿摆动角度
  const leftThighAngle = Math.sin(cycle) * 0.7;
  const rightThighAngle = Math.sin(cycle + Math.PI) * 0.7;

  // 小腿角度（膝盖弯曲）
  const leftKneeAngle = Math.max(0, -Math.sin(cycle) * 0.8 + 0.3);
  const rightKneeAngle = Math.max(0, -Math.sin(cycle + Math.PI) * 0.8 + 0.3);

  const thighLength = size * 0.22;
  const shinLength = size * 0.22;

  // 左腿
  const leftHipX = -hipWidth;
  const leftKneeX = leftHipX + Math.sin(leftThighAngle) * thighLength;
  const leftKneeY = hipY + Math.cos(leftThighAngle) * thighLength;
  const leftFootX = leftKneeX + Math.sin(leftThighAngle + leftKneeAngle) * shinLength;
  const leftFootY = leftKneeY + Math.cos(leftThighAngle + leftKneeAngle) * shinLength;

  // 右腿
  const rightHipX = hipWidth;
  const rightKneeX = rightHipX + Math.sin(rightThighAngle) * thighLength;
  const rightKneeY = hipY + Math.cos(rightThighAngle) * thighLength;
  const rightFootX = rightKneeX + Math.sin(rightThighAngle + rightKneeAngle) * shinLength;
  const rightFootY = rightKneeY + Math.cos(rightThighAngle + rightKneeAngle) * shinLength;

  // ===== 手臂关节（物理动画）=====
  // 手臂与腿相反摆动
  const leftArmAngle = Math.sin(cycle + Math.PI) * 0.6;
  const rightArmAngle = Math.sin(cycle) * 0.6;

  // 肘部弯曲
  const leftElbowAngle = Math.abs(Math.sin(cycle + Math.PI)) * 0.5 + 0.3;
  const rightElbowAngle = Math.abs(Math.sin(cycle)) * 0.5 + 0.3;

  const upperArmLength = size * 0.15;
  const forearmLength = size * 0.15;

  // 左臂
  const leftShoulderX = -shoulderWidth;
  const leftElbowX = leftShoulderX + Math.sin(leftArmAngle) * upperArmLength;
  const leftElbowY = shoulderY + Math.cos(leftArmAngle) * upperArmLength;
  const leftHandX = leftElbowX + Math.sin(leftArmAngle + leftElbowAngle) * forearmLength;
  const leftHandY = leftElbowY + Math.cos(leftArmAngle + leftElbowAngle) * forearmLength;

  // 右臂
  const rightShoulderX = shoulderWidth;
  const rightElbowX = rightShoulderX + Math.sin(rightArmAngle) * upperArmLength;
  const rightElbowY = shoulderY + Math.cos(rightArmAngle) * upperArmLength;
  const rightHandX = rightElbowX + Math.sin(rightArmAngle + rightElbowAngle) * forearmLength;
  const rightHandY = rightElbowY + Math.cos(rightArmAngle + rightElbowAngle) * forearmLength;

  // ===== 绘制骨骼 =====

  // 头
  ctx.beginPath();
  ctx.arc(0, headY, headRadius, 0, Math.PI * 2);
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

  // 肩膀横杆
  ctx.beginPath();
  ctx.moveTo(-shoulderWidth, shoulderY);
  ctx.lineTo(shoulderWidth, shoulderY);
  ctx.stroke();

  // 髋部横杆
  ctx.beginPath();
  ctx.moveTo(-hipWidth, hipY);
  ctx.lineTo(hipWidth, hipY);
  ctx.stroke();

  // 左臂（上臂 + 前臂）
  ctx.beginPath();
  ctx.moveTo(leftShoulderX, shoulderY);
  ctx.lineTo(leftElbowX, leftElbowY);
  ctx.lineTo(leftHandX, leftHandY);
  ctx.stroke();

  // 右臂（上臂 + 前臂）
  ctx.beginPath();
  ctx.moveTo(rightShoulderX, shoulderY);
  ctx.lineTo(rightElbowX, rightElbowY);
  ctx.lineTo(rightHandX, rightHandY);
  ctx.stroke();

  // 左腿（大腿 + 小腿）
  ctx.beginPath();
  ctx.moveTo(leftHipX, hipY);
  ctx.lineTo(leftKneeX, leftKneeY);
  ctx.lineTo(leftFootX, leftFootY);
  ctx.stroke();

  // 右腿（大腿 + 小腿）
  ctx.beginPath();
  ctx.moveTo(rightHipX, hipY);
  ctx.lineTo(rightKneeX, rightKneeY);
  ctx.lineTo(rightFootX, rightFootY);
  ctx.stroke();

  // 关节点（可选：显示关节）
  ctx.fillStyle = '#555555';
  const jointRadius = 2 * scale;

  // 肘关节
  ctx.beginPath();
  ctx.arc(leftElbowX, leftElbowY, jointRadius, 0, Math.PI * 2);
  ctx.arc(rightElbowX, rightElbowY, jointRadius, 0, Math.PI * 2);
  ctx.fill();

  // 膝关节
  ctx.beginPath();
  ctx.arc(leftKneeX, leftKneeY, jointRadius, 0, Math.PI * 2);
  ctx.arc(rightKneeX, rightKneeY, jointRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// 绘制地面上的场景
function drawGroundScene(groundQuad) {
  // 地面坐标系：010为原点，X轴指向011，Y轴指向110
  // 火柴人向000方向移动（从地面向观察者方向跑）
  // 地面物体相对向后移动 = 从000方向向111方向移动
  // 在屏幕上表现为：物体从111(远/小)向010(近/大)移动
  // 即 x和y 同时减少

  // 地面上的固定物体（x: 0-1, y: 0-1）
  const elements = [
    { type: 'tree', x: 0.1, y: 0.1 },
    { type: 'tree', x: 0.9, y: 0.2 },
    { type: 'grass', x: 0.2, y: 0.3 },
    { type: 'flower', x: 0.7, y: 0.15 },
    { type: 'grass', x: 0.4, y: 0.5 },
    { type: 'tree', x: 0.15, y: 0.7 },
    { type: 'flower', x: 0.6, y: 0.4 },
    { type: 'grass', x: 0.85, y: 0.6 },
    { type: 'tree', x: 0.5, y: 0.85 },
    { type: 'flower', x: 0.3, y: 0.65 },
    { type: 'grass', x: 0.75, y: 0.8 },
  ];

  // 绘制移动的场景元素
  // 物体从111向010方向移动（x和y减少），表示火柴人向000方向跑
  for (const elem of elements) {
    // x和y坐标同时减少sceneOffset（向010方向平移）
    let x = (elem.x - sceneOffset + 1.0) % 1.0;
    let y = (elem.y - sceneOffset + 1.0) % 1.0;

    const pt = getGroundPoint(groundQuad, x, y);

    if (elem.type === 'tree') {
      drawTree(pt.x, pt.y, pt.scale);
    } else if (elem.type === 'grass') {
      drawGrass(pt.x, pt.y, pt.scale);
    } else if (elem.type === 'flower') {
      drawFlower(pt.x, pt.y, pt.scale);
    }
  }

  // 火柴人在菱形正中央（0.5, 0.5）
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
