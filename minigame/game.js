/**
 * 八卦立方体 - 微信小游戏
 * Canvas 2D 版本 - 可直接运行
 */

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

const sysInfo = wx.getSystemInfoSync();
const W = sysInfo.windowWidth;
const H = sysInfo.windowHeight;
const DPR = sysInfo.pixelRatio;

canvas.width = W * DPR;
canvas.height = H * DPR;

// ==================== 配置 ====================
const COLOR_BG = '#eef2f7';
const CUBE_SIZE = 10;

// ==================== 八卦数据 ====================
const bitsToName = {
  '000': '乾', '001': '兑', '010': '离', '011': '震',
  '100': '巽', '101': '坎', '110': '艮', '111': '坤'
};

const trigramBits = ['000', '001', '010', '011', '100', '101', '110', '111'];
const trigramPos = {};

for (const bits of trigramBits) {
  trigramPos[bits] = {
    x: (bits[2] === '1') ? 1 : -1,
    y: (bits[0] === '1') ? 1 : -1,
    z: (bits[1] === '1') ? 1 : -1
  };
}

// 边
const edges = [];
for (let i = 0; i < 8; i++) {
  for (let j = i + 1; j < 8; j++) {
    const a = trigramBits[i], b = trigramBits[j];
    let diffBit = -1, diffCount = 0;
    for (let k = 0; k < 3; k++) {
      if (a[k] !== b[k]) { diffBit = k; diffCount++; }
    }
    if (diffCount === 1) {
      edges.push({ a, b, val: parseInt(a[diffBit]) });
    }
  }
}

// 宫位对
const palacePairs = {
  '乾': ['000', '111'], '坤': ['111', '000'],
  '兑': ['001', '110'], '艮': ['110', '001'],
  '离': ['010', '101'], '坎': ['101', '010'],
  '震': ['011', '100'], '巽': ['100', '011']
};

let currentPalace = '艮';
const getFrontBits = () => palacePairs[currentPalace][0];

// ==================== 3D 变换 ====================
const palaceBases = {};
for (const name in palacePairs) {
  const [f, b] = palacePairs[name];
  const pA = trigramPos[f], pB = trigramPos[b];

  // forward
  let fw = { x: pB.x - pA.x, y: pB.y - pA.y, z: pB.z - pA.z };
  const fwLen = Math.sqrt(fw.x*fw.x + fw.y*fw.y + fw.z*fw.z);
  fw = { x: fw.x/fwLen, y: fw.y/fwLen, z: fw.z/fwLen };

  // up (flip middle bit for up neighbor)
  const upBits = f[0] + (f[1]==='0'?'1':'0') + f[2];
  const q = trigramPos[upBits];
  let up = { x: q.x - pA.x, y: q.y - pA.y, z: q.z - pA.z };
  const dot = up.x*fw.x + up.y*fw.y + up.z*fw.z;
  up = { x: up.x - fw.x*dot, y: up.y - fw.y*dot, z: up.z - fw.z*dot };
  const upLen = Math.sqrt(up.x*up.x + up.y*up.y + up.z*up.z);
  up = { x: up.x/upLen, y: up.y/upLen, z: up.z/upLen };

  // right = up × forward
  const rt = {
    x: up.y*fw.z - up.z*fw.y,
    y: up.z*fw.x - up.x*fw.z,
    z: up.x*fw.y - up.y*fw.x
  };

  palaceBases[name] = [rt.x, rt.y, rt.z, up.x, up.y, up.z, fw.x, fw.y, fw.z];
}

let rotZ = Math.PI;
let projCache = new Map();

function project(p) {
  const m = palaceBases[currentPalace];
  const v = {
    x: m[0]*p.x + m[1]*p.y + m[2]*p.z,
    y: m[3]*p.x + m[4]*p.y + m[5]*p.z,
    z: m[6]*p.x + m[7]*p.y + m[8]*p.z
  };
  const cz = Math.cos(rotZ), sz = Math.sin(rotZ);
  const x = v.x*cz - v.y*sz, y = v.x*sz + v.y*cz;
  const scale = Math.min(W, H) * 0.25;
  return { x: x*scale + W/2, y: -y*scale + H/2, z: v.z };
}

function updateProjCache() {
  projCache.clear();
  for (const bits in trigramPos) {
    projCache.set(bits, project(trigramPos[bits]));
  }
}

// ==================== 动画 ====================
let walkTime = 0;
const poseState = { facing: 0, init: false };

// 场景元素 - 固定位置
const groundElements = [
  { type: 'tree', x: 0.15, y: 0.20 }, { type: 'tree', x: 0.85, y: 0.25 },
  { type: 'grass', x: 0.30, y: 0.40 }, { type: 'flower', x: 0.70, y: 0.15 },
  { type: 'grass', x: 0.45, y: 0.60 }, { type: 'tree', x: 0.20, y: 0.75 },
  { type: 'flower', x: 0.60, y: 0.45 }, { type: 'grass', x: 0.75, y: 0.65 },
  { type: 'tree', x: 0.50, y: 0.85 }, { type: 'flower', x: 0.35, y: 0.55 },
];

// ==================== 绘制 ====================
function getNodeColor(bits) {
  let ones = 0;
  for (const c of bits) if (c === '1') ones++;
  const g = Math.round(255 * (1 - ones/3));
  return { r: g, g: g, b: g };
}

// 绘制3D球体（带渐变和高光）
function drawSphere3D(x, y, radius, color, depth) {
  // 根据深度调整大小和亮度
  const depthFactor = 0.7 + depth * 0.3; // depth: 0=远, 1=近
  const r = radius * (0.7 + depthFactor * 0.3);

  // 创建径向渐变模拟球体
  const gradient = ctx.createRadialGradient(
    x - r * 0.3, y - r * 0.3, r * 0.1,  // 高光位置
    x, y, r
  );

  // 根据深度调整颜色亮度
  const brightnessMod = 0.7 + depthFactor * 0.3;
  const lightR = Math.min(255, color.r + 80);
  const lightG = Math.min(255, color.g + 80);
  const lightB = Math.min(255, color.b + 80);
  const darkR = Math.max(0, color.r * 0.4);
  const darkG = Math.max(0, color.g * 0.4);
  const darkB = Math.max(0, color.b * 0.4);

  gradient.addColorStop(0, `rgb(${lightR},${lightG},${lightB})`);
  gradient.addColorStop(0.5, `rgb(${color.r},${color.g},${color.b})`);
  gradient.addColorStop(1, `rgb(${darkR},${darkG},${darkB})`);

  // 绘制阴影
  ctx.beginPath();
  ctx.ellipse(x + r * 0.2, y + r * 1.2, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,0,0,${0.15 * depthFactor})`;
  ctx.fill();

  // 绘制球体
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // 添加高光
  ctx.beginPath();
  ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${0.4 * depthFactor})`;
  ctx.fill();

  return r;
}

// 绘制3D边（管道效果）
function drawEdge3D(x1, y1, x2, y2, isYang, depth) {
  const depthFactor = 0.6 + depth * 0.4;
  const baseWidth = isYang ? 5 : 7;
  const width = baseWidth * depthFactor;

  // 计算边的方向
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len, ny = dx / len;

  if (isYang) {
    // 阳爻 - 实心黑边，带3D效果
    // 绘制阴影
    ctx.beginPath();
    ctx.moveTo(x1 + 2, y1 + 2);
    ctx.lineTo(x2 + 2, y2 + 2);
    ctx.strokeStyle = `rgba(0,0,0,${0.2 * depthFactor})`;
    ctx.lineWidth = width + 2;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 创建线性渐变模拟圆柱
    const gradient = ctx.createLinearGradient(
      x1 + nx * width, y1 + ny * width,
      x1 - nx * width, y1 - ny * width
    );
    gradient.addColorStop(0, '#666');
    gradient.addColorStop(0.3, '#333');
    gradient.addColorStop(0.7, '#111');
    gradient.addColorStop(1, '#000');

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = width;
    ctx.stroke();
  } else {
    // 阴爻 - 空心白边
    // 外边框阴影
    ctx.beginPath();
    ctx.moveTo(x1 + 2, y1 + 2);
    ctx.lineTo(x2 + 2, y2 + 2);
    ctx.strokeStyle = `rgba(0,0,0,${0.15 * depthFactor})`;
    ctx.lineWidth = width + 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 外边框
    const gradientOuter = ctx.createLinearGradient(
      x1 + nx * width, y1 + ny * width,
      x1 - nx * width, y1 - ny * width
    );
    gradientOuter.addColorStop(0, '#AAA');
    gradientOuter.addColorStop(0.5, '#888');
    gradientOuter.addColorStop(1, '#666');

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = gradientOuter;
    ctx.lineWidth = width;
    ctx.stroke();

    // 内部白色
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = '#F8F8F8';
    ctx.lineWidth = width * 0.5;
    ctx.stroke();
  }
}

function getGroundPoint(quad, x, y) {
  const sx = (1-x)*(1-y)*quad[3].x + x*(1-y)*quad[2].x + (1-x)*y*quad[0].x + x*y*quad[1].x;
  const sy = (1-x)*(1-y)*quad[3].y + x*(1-y)*quad[2].y + (1-x)*y*quad[0].y + x*y*quad[1].y;
  const sc = Math.max(0.3, 1 - Math.sqrt(x*x + y*y) * 0.4);
  return { x: sx, y: sy, scale: sc };
}

function drawTree(x, y, s) {
  const h = 30 * s;
  const trunkW = 4 * s;

  // 树干阴影
  ctx.fillStyle = `rgba(0,0,0,${0.15 * s})`;
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 2, trunkW * 1.5, trunkW * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 树干 - 3D圆柱效果
  const trunkGrad = ctx.createLinearGradient(x - trunkW, y, x + trunkW, y);
  trunkGrad.addColorStop(0, '#8D6E63');
  trunkGrad.addColorStop(0.3, '#5D4037');
  trunkGrad.addColorStop(0.7, '#4E342E');
  trunkGrad.addColorStop(1, '#3E2723');

  ctx.fillStyle = trunkGrad;
  ctx.fillRect(x - trunkW / 2, y - h * 0.4, trunkW, h * 0.4);

  // 树冠 - 3D球体效果
  const crownR = h * 0.35;
  const crownY = y - h * 0.6;
  const crownGrad = ctx.createRadialGradient(
    x - crownR * 0.3, crownY - crownR * 0.3, crownR * 0.1,
    x, crownY, crownR
  );
  crownGrad.addColorStop(0, '#81C784');
  crownGrad.addColorStop(0.5, '#4CAF50');
  crownGrad.addColorStop(1, '#2E7D32');

  ctx.beginPath();
  ctx.arc(x, crownY, crownR, 0, Math.PI * 2);
  ctx.fillStyle = crownGrad;
  ctx.fill();

  // 树冠高光
  ctx.beginPath();
  ctx.arc(x - crownR * 0.25, crownY - crownR * 0.25, crownR * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${0.3 * s})`;
  ctx.fill();
}

function drawGrass(x, y, s) {
  const baseGreen = '#4CAF50';
  const darkGreen = '#2E7D32';

  // 草的阴影
  ctx.fillStyle = `rgba(0,0,0,${0.1 * s})`;
  ctx.beginPath();
  ctx.ellipse(x, y + 1, 6 * s, 2 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, 1.5 * s);

  // 左草叶
  const gradL = ctx.createLinearGradient(x - 3 * s, y, x - 5 * s, y - 10 * s);
  gradL.addColorStop(0, darkGreen);
  gradL.addColorStop(1, baseGreen);
  ctx.strokeStyle = gradL;
  ctx.beginPath(); ctx.moveTo(x - 3 * s, y); ctx.quadraticCurveTo(x - 6 * s, y - 5 * s, x - 5 * s, y - 10 * s); ctx.stroke();

  // 中草叶
  const gradM = ctx.createLinearGradient(x, y, x, y - 12 * s);
  gradM.addColorStop(0, darkGreen);
  gradM.addColorStop(1, '#66BB6A');
  ctx.strokeStyle = gradM;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 1 * s, y - 6 * s, x, y - 12 * s); ctx.stroke();

  // 右草叶
  const gradR = ctx.createLinearGradient(x + 3 * s, y, x + 5 * s, y - 10 * s);
  gradR.addColorStop(0, darkGreen);
  gradR.addColorStop(1, baseGreen);
  ctx.strokeStyle = gradR;
  ctx.beginPath(); ctx.moveTo(x + 3 * s, y); ctx.quadraticCurveTo(x + 6 * s, y - 5 * s, x + 5 * s, y - 10 * s); ctx.stroke();
}

function drawFlower(x, y, s) {
  // 茎的阴影
  ctx.fillStyle = `rgba(0,0,0,${0.1 * s})`;
  ctx.beginPath();
  ctx.ellipse(x, y + 1, 4 * s, 1.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // 茎 - 渐变
  const stemGrad = ctx.createLinearGradient(x, y, x, y - 15 * s);
  stemGrad.addColorStop(0, '#2E7D32');
  stemGrad.addColorStop(1, '#4CAF50');
  ctx.strokeStyle = stemGrad;
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 2 * s, y - 8 * s, x, y - 15 * s);
  ctx.stroke();

  // 花朵 - 3D效果
  const flowerY = y - 15 * s;
  const petalR = 4 * s;

  // 花瓣
  const colors = ['#FF6B6B', '#FF8A80', '#FF5252', '#EF5350', '#E57373'];
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(angle) * petalR * 0.8;
    const py = flowerY + Math.sin(angle) * petalR * 0.8;

    const petalGrad = ctx.createRadialGradient(px, py - 1, 0, px, py, petalR * 0.7);
    petalGrad.addColorStop(0, '#FFCDD2');
    petalGrad.addColorStop(0.5, colors[i]);
    petalGrad.addColorStop(1, '#C62828');

    ctx.beginPath();
    ctx.arc(px, py, petalR * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = petalGrad;
    ctx.fill();
  }

  // 花心
  const centerGrad = ctx.createRadialGradient(x - 1, flowerY - 1, 0, x, flowerY, petalR * 0.4);
  centerGrad.addColorStop(0, '#FFEE58');
  centerGrad.addColorStop(1, '#FFA000');
  ctx.beginPath();
  ctx.arc(x, flowerY, petalR * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = centerGrad;
  ctx.fill();
}

function drawStickMan(x, y, scale, time, quad) {
  const t = time * 7;
  const sw = 0.65;

  // 朝向计算
  const zero = projCache.get('000');
  if (zero && quad) {
    const dx = (zero.x - (quad[0].x + quad[3].x)/2) / W;
    const dy = (zero.y - (quad[0].y + quad[3].y)/2) / H;
    const target = Math.atan2(dx, -dy);
    poseState.facing = poseState.init ? poseState.facing + (target - poseState.facing) * 0.1 : target;
    poseState.init = true;
  }

  const facing = poseState.facing;
  const side = Math.abs(Math.sin(facing));
  const fRight = Math.sin(facing) >= 0 ? 1 : -1;
  const fAway = Math.cos(facing);

  const len = 12 * scale;
  const headR = len * 0.5;
  const bodyL = len * 1.8;
  const legL = len, armL = len * 0.8;
  const bodyW = len * 0.5 * (0.3 + Math.abs(fAway) * 0.7);

  const rT = Math.sin(t) * sw, rS = Math.sin(t - 0.5) * sw * 0.8 - 0.3;
  const lT = Math.sin(t + Math.PI) * sw, lS = Math.sin(t + Math.PI - 0.5) * sw * 0.8 - 0.3;
  const rA = Math.sin(t + Math.PI) * sw * 0.6, rF = Math.sin(t + Math.PI - 0.3) * sw * 0.4 + 0.5;
  const lA = Math.sin(t) * sw * 0.6, lF = Math.sin(t - 0.3) * sw * 0.4 + 0.5;
  const bounce = Math.abs(Math.sin(t * 2)) * 2 * scale * 0.7;

  ctx.save();
  ctx.translate(x, y - bounce);

  const hipY = 0, shY = -bodyL, headY = shY - len*0.3 - headR;
  const rHX = bodyW * fRight, lHX = -bodyW * fRight;
  const rSX = bodyW * 1.2 * fRight, lSX = -bodyW * 1.2 * fRight;
  const swX = side * fRight;

  const rKX = rHX + Math.sin(rT)*legL*swX, rKY = Math.cos(rT)*legL;
  const rFX = rKX + Math.sin(rT+rS)*legL*swX, rFY = rKY + Math.cos(rT+rS)*legL;
  const lKX = lHX + Math.sin(lT)*legL*swX, lKY = Math.cos(lT)*legL;
  const lFX = lKX + Math.sin(lT+lS)*legL*swX, lFY = lKY + Math.cos(lT+lS)*legL;
  const rEX = rSX + Math.sin(rA)*armL*swX, rEY = shY + Math.cos(rA)*armL;
  const rHaX = rEX + Math.sin(rA+rF)*armL*swX, rHaY = rEY + Math.cos(rA+rF)*armL;
  const lEX = lSX + Math.sin(lA)*armL*swX, lEY = shY + Math.cos(lA)*armL;
  const lHaX = lEX + Math.sin(lA+lF)*armL*swX, lHaY = lEY + Math.cos(lA+lF)*armL;

  ctx.lineWidth = Math.max(2, 3*scale);
  ctx.lineCap = 'round';

  const back = '#666', front = '#333';
  const drawR = fAway > 0 ? rT <= 0 : rT > 0;

  ctx.strokeStyle = back;
  if (drawR) {
    ctx.beginPath(); ctx.moveTo(rHX, hipY); ctx.lineTo(rKX, rKY); ctx.lineTo(rFX, rFY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rSX, shY); ctx.lineTo(rEX, rEY); ctx.lineTo(rHaX, rHaY); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(lHX, hipY); ctx.lineTo(lKX, lKY); ctx.lineTo(lFX, lFY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lSX, shY); ctx.lineTo(lEX, lEY); ctx.lineTo(lHaX, lHaY); ctx.stroke();
  }

  ctx.strokeStyle = front; ctx.fillStyle = front;
  ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(0, shY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lHX, hipY); ctx.lineTo(rHX, hipY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lSX, shY); ctx.lineTo(rSX, shY); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, headY, headR, 0, Math.PI*2); ctx.fill();

  if (drawR) {
    ctx.beginPath(); ctx.moveTo(lHX, hipY); ctx.lineTo(lKX, lKY); ctx.lineTo(lFX, lFY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lSX, shY); ctx.lineTo(lEX, lEY); ctx.lineTo(lHaX, lHaY); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(rHX, hipY); ctx.lineTo(rKX, rKY); ctx.lineTo(rFX, rFY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rSX, shY); ctx.lineTo(rEX, rEY); ctx.lineTo(rHaX, rHaY); ctx.stroke();
  }
  ctx.restore();
}

function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // 渐变背景
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#d4e4f7');
  bgGrad.addColorStop(0.5, '#eef2f7');
  bgGrad.addColorStop(1, '#e8ebe4');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  updateProjCache();
  const front = getFrontBits();

  // 计算深度范围用于归一化
  let minZ = Infinity, maxZ = -Infinity;
  for (const bits of trigramBits) {
    if (bits === front) continue;
    const p = projCache.get(bits);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  const zRange = maxZ - minZ || 1;

  // 边 - 按深度排序后绘制
  const visEdges = edges.filter(e => e.a !== front && e.b !== front).map(e => {
    const pa = projCache.get(e.a), pb = projCache.get(e.b);
    return { ...e, pa, pb, z: (pa.z + pb.z) / 2 };
  }).sort((a, b) => a.z - b.z);

  for (const e of visEdges) {
    const depth = (e.z - minZ) / zRange; // 0=远, 1=近
    drawEdge3D(e.pa.x, e.pa.y, e.pb.x, e.pb.y, e.val === 1, depth);
  }

  // 顶点 - 按深度排序后绘制
  const verts = trigramBits.filter(b => b !== front).map(b => ({ b, p: projCache.get(b) })).sort((a, b) => a.p.z - b.p.z);

  for (const v of verts) {
    const p = v.p;
    const depth = (p.z - minZ) / zRange; // 0=远, 1=近
    const color = getNodeColor(v.b);
    const baseRadius = 10;

    // 绘制3D球体
    const r = drawSphere3D(p.x, p.y, baseRadius, color, depth);

    // 标签 - 带阴影
    const fontSize = 10 + depth * 4;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';

    // 标签阴影
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillText(v.b, p.x + 1, p.y - r - 10 + 1);

    // 标签文字
    ctx.fillStyle = '#333';
    ctx.fillText(v.b, p.x, p.y - r - 10);

    // 卦名
    const name = bitsToName[v.b];
    ctx.font = `${8 + depth * 3}px sans-serif`;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillText(name, p.x + 1, p.y - r - 22 + 1);
    ctx.fillStyle = '#666';
    ctx.fillText(name, p.x, p.y - r - 22);
  }

  // 地面场景
  const sortedVerts = [...verts].sort((a, b) => b.p.y - a.p.y);
  if (sortedVerts.length >= 4) {
    const b4 = sortedVerts.slice(0, 4);
    const quad = [b4[1].p.x < b4[2].p.x ? b4[1].p : b4[2].p, b4[1].p.x < b4[2].p.x ? b4[2].p : b4[1].p, b4[0].p, b4[3].p];

    // 绘制场景元素（固定位置）
    for (const e of groundElements) {
      const pt = getGroundPoint(quad, e.x, e.y);
      if (e.type === 'tree') drawTree(pt.x, pt.y, pt.scale);
      else if (e.type === 'grass') drawGrass(pt.x, pt.y, pt.scale);
      else drawFlower(pt.x, pt.y, pt.scale);
    }

    // 火柴人
    const center = getGroundPoint(quad, 0.5, 0.5);
    drawStickMan(center.x, center.y, center.scale, walkTime, quad);
  }

  // UI - 带背景
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(10, 10, 200, 55);
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, 200, 55);

  ctx.fillStyle = '#333';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`宫视角: ${currentPalace}宫`, 18, 30);
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#666';
  ctx.fillText('点击顶点切换视角', 18, 45);
  ctx.fillText(`${CUBE_SIZE}m × ${CUBE_SIZE}m × ${CUBE_SIZE}m`, 18, 58);
}

// ==================== 游戏循环 ====================
function gameLoop() {
  walkTime += 0.016;
  draw();
  requestAnimationFrame(gameLoop);
}

// ==================== 触摸事件 ====================
let touchStart = null;

wx.onTouchStart(e => {
  if (e.touches.length) touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
});

wx.onTouchEnd(e => {
  if (!touchStart || !e.changedTouches.length) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
  if (Date.now() - touchStart.t < 300 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
    // 点击检测
    const front = getFrontBits();
    for (const bits in trigramPos) {
      if (bits === front) continue;
      const p = projCache.get(bits);
      if (!p) continue;
      const d2 = (t.clientX - p.x)**2 + (t.clientY - p.y)**2;
      if (d2 < 625) { // 25*25
        const name = bitsToName[bits];
        if (palacePairs[name]) {
          currentPalace = name;
          rotZ = Math.PI;
        }
        break;
      }
    }
  }
  touchStart = null;
});

// ==================== 启动 ====================
console.log('========================================');
console.log('八卦立方体 - Canvas 2D');
console.log('版本: 1.0.0');
console.log('========================================');

requestAnimationFrame(gameLoop);
