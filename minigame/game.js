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
const sceneOffset = { x: 0 }; // 场景偏移量（用于平移效果）
const sceneSpeed = 0.8; // 场景移动速度

// 场景元素（树、草、花）
const sceneElements = [];
const SCENE_WIDTH = 400; // 场景总宽度

function initSceneElements() {
  sceneElements.length = 0;
  // 生成树木
  for (let i = 0; i < 6; i++) {
    sceneElements.push({
      type: 'tree',
      x: i * 70 + Math.random() * 30,
      depth: 0.3 + Math.random() * 0.4, // 深度影响透视
      height: 20 + Math.random() * 15
    });
  }
  // 生成草
  for (let i = 0; i < 15; i++) {
    sceneElements.push({
      type: 'grass',
      x: i * 28 + Math.random() * 20,
      depth: 0.5 + Math.random() * 0.3,
      height: 5 + Math.random() * 8
    });
  }
  // 生成花
  for (let i = 0; i < 10; i++) {
    sceneElements.push({
      type: 'flower',
      x: i * 42 + Math.random() * 25,
      depth: 0.4 + Math.random() * 0.4,
      height: 8 + Math.random() * 6
    });
  }
}
initSceneElements();

// 画树（线段风格）
function drawTree(x, y, height, perspectiveScale) {
  const h = height * perspectiveScale;
  const trunkH = h * 0.4;
  const crownH = h * 0.6;

  ctx.strokeStyle = '#5D4037';
  ctx.lineWidth = Math.max(1, 2 * perspectiveScale);

  // 树干
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - trunkH);
  ctx.stroke();

  // 树冠（三角形线条）
  ctx.strokeStyle = '#2E7D32';
  ctx.beginPath();
  ctx.moveTo(x, y - trunkH - crownH);
  ctx.lineTo(x - crownH * 0.4, y - trunkH);
  ctx.lineTo(x + crownH * 0.4, y - trunkH);
  ctx.closePath();
  ctx.stroke();
}

// 画草（线段风格）
function drawGrass(x, y, height, perspectiveScale) {
  const h = height * perspectiveScale;
  ctx.strokeStyle = '#4CAF50';
  ctx.lineWidth = Math.max(1, 1.5 * perspectiveScale);

  // 三根草叶
  ctx.beginPath();
  ctx.moveTo(x - 2 * perspectiveScale, y);
  ctx.lineTo(x - 4 * perspectiveScale, y - h);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h * 1.2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + 2 * perspectiveScale, y);
  ctx.lineTo(x + 4 * perspectiveScale, y - h);
  ctx.stroke();
}

// 画花（线段风格）
function drawFlower(x, y, height, perspectiveScale) {
  const h = height * perspectiveScale;

  // 茎
  ctx.strokeStyle = '#4CAF50';
  ctx.lineWidth = Math.max(1, 1 * perspectiveScale);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h);
  ctx.stroke();

  // 花朵（简单的米字形）
  const flowerSize = 3 * perspectiveScale;
  ctx.strokeStyle = '#E91E63';
  ctx.lineWidth = Math.max(1, 1.5 * perspectiveScale);
  const cx = x, cy = y - h;

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(angle) * flowerSize, cy - Math.sin(angle) * flowerSize);
    ctx.lineTo(cx + Math.cos(angle) * flowerSize, cy + Math.sin(angle) * flowerSize);
    ctx.stroke();
  }
}

// 画火柴人（带透视）
function drawStickMan(centerX, centerY, scale, time, perspectiveScale) {
  const size = scale * 0.12 * perspectiveScale;

  // 走路动画参数
  const legSwing = Math.sin(time * 8) * 0.4;
  const armSwing = Math.sin(time * 8 + Math.PI) * 0.3;
  const bodyBob = Math.abs(Math.sin(time * 8)) * 2 * perspectiveScale;

  ctx.save();
  ctx.translate(centerX, centerY - bodyBob);
  ctx.strokeStyle = '#333333';
  ctx.fillStyle = '#333333';
  ctx.lineWidth = Math.max(1, 2 * perspectiveScale);
  ctx.lineCap = 'round';

  // 头
  const headRadius = size * 0.15;
  const headY = -size * 0.7;
  ctx.beginPath();
  ctx.arc(0, headY, headRadius, 0, Math.PI * 2);
  ctx.fill();

  // 身体
  const shoulderY = headY + headRadius + size * 0.05;
  const hipY = shoulderY + size * 0.35;
  ctx.beginPath();
  ctx.moveTo(0, shoulderY);
  ctx.lineTo(0, hipY);
  ctx.stroke();

  // 左臂
  ctx.beginPath();
  ctx.moveTo(0, shoulderY + size * 0.05);
  ctx.lineTo(-size * 0.15 + armSwing * size * 0.1, shoulderY + size * 0.2);
  ctx.stroke();

  // 右臂
  ctx.beginPath();
  ctx.moveTo(0, shoulderY + size * 0.05);
  ctx.lineTo(size * 0.15 - armSwing * size * 0.1, shoulderY + size * 0.2);
  ctx.stroke();

  // 左腿
  const footY = hipY + size * 0.3;
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(-size * 0.1 + legSwing * size * 0.15, footY);
  ctx.stroke();

  // 右腿
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(size * 0.1 - legSwing * size * 0.15, footY);
  ctx.stroke();

  ctx.restore();
}

// 获取底部两个顶点
function getBottomTwoVertices() {
  const frontBits = getFrontBits();
  let bottomTwo = [];
  let maxY = -Infinity;

  for (const bits of trigramBits) {
    if (bits === frontBits) continue;
    const p = projCache.get(bits);
    if (p && p.y > maxY - 20) {
      if (p.y > maxY + 10) {
        bottomTwo = [{ bits, p }];
        maxY = p.y;
      } else {
        bottomTwo.push({ bits, p });
      }
    }
  }

  // 排序找最底部的两个
  bottomTwo.sort((a, b) => b.p.y - a.p.y);
  return bottomTwo.slice(0, 2);
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

  // 获取底部两个顶点来定位火柴人
  const bottomVerts = getBottomTwoVertices();
  if (bottomVerts.length >= 2) {
    const leftV = bottomVerts[0].p.x < bottomVerts[1].p.x ? bottomVerts[0] : bottomVerts[1];
    const rightV = bottomVerts[0].p.x < bottomVerts[1].p.x ? bottomVerts[1] : bottomVerts[0];

    // 火柴人位置：在底部两个顶点之间的中心，Y与它们对齐
    const stickX = (leftV.p.x + rightV.p.x) / 2;
    const stickY = (leftV.p.y + rightV.p.y) / 2;

    // 计算场景区域的边界
    const sceneLeft = leftV.p.x;
    const sceneRight = rightV.p.x;
    const sceneWidth = sceneRight - sceneLeft;

    // 透视比例（基于深度，底部更近所以更大）
    const perspectiveScale = 0.8;

    // 计算火柴人的缩放（基于画面大小）
    const stickScale = Math.min(W, H) * 0.5;

    // 画场景元素（按深度排序，远的先画）
    const sortedElements = [...sceneElements].sort((a, b) => a.depth - b.depth);

    for (const elem of sortedElements) {
      // 计算元素位置（循环滚动）
      let elemX = ((elem.x - sceneOffset.x) % SCENE_WIDTH + SCENE_WIDTH) % SCENE_WIDTH;
      // 映射到场景区域
      const mappedX = sceneLeft + (elemX / SCENE_WIDTH) * sceneWidth;
      const elemPerspective = 0.5 + (1 - elem.depth) * 0.5;

      // 只绘制在场景范围内的元素
      if (mappedX >= sceneLeft - 20 && mappedX <= sceneRight + 20) {
        if (elem.type === 'tree') {
          drawTree(mappedX, stickY, elem.height, elemPerspective);
        } else if (elem.type === 'grass') {
          drawGrass(mappedX, stickY, elem.height, elemPerspective);
        } else if (elem.type === 'flower') {
          drawFlower(mappedX, stickY, elem.height, elemPerspective);
        }
      }
    }

    // 画火柴人（在场景中间，透视稍大）
    drawStickMan(stickX, stickY, stickScale, walkTime, perspectiveScale);
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
  sceneOffset.x += sceneSpeed;

  // 循环场景
  if (sceneOffset.x > SCENE_WIDTH) {
    sceneOffset.x = 0;
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
