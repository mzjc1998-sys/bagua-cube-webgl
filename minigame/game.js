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
let walkTime = 0, sceneOffset = 0, lastSceneOffset = 0;
let stickManSpeed = 0.7;
const poseState = { facing: 0, init: false };

const groundElements = [
  { type: 'tree', x: 0.12, y: 0.18 }, { type: 'tree', x: 0.82, y: 0.28 },
  { type: 'grass', x: 0.28, y: 0.38 }, { type: 'flower', x: 0.68, y: 0.12 },
  { type: 'grass', x: 0.42, y: 0.58 }, { type: 'tree', x: 0.22, y: 0.72 },
  { type: 'flower', x: 0.58, y: 0.42 }, { type: 'grass', x: 0.78, y: 0.62 },
  { type: 'tree', x: 0.48, y: 0.88 }, { type: 'flower', x: 0.32, y: 0.52 },
];

// ==================== 绘制 ====================
function getNodeColor(bits) {
  let ones = 0;
  for (const c of bits) if (c === '1') ones++;
  const g = Math.round(255 * (1 - ones/3));
  return `rgb(${g},${g},${g})`;
}

function getGroundPoint(quad, x, y) {
  const sx = (1-x)*(1-y)*quad[3].x + x*(1-y)*quad[2].x + (1-x)*y*quad[0].x + x*y*quad[1].x;
  const sy = (1-x)*(1-y)*quad[3].y + x*(1-y)*quad[2].y + (1-x)*y*quad[0].y + x*y*quad[1].y;
  const sc = Math.max(0.3, 1 - Math.sqrt(x*x + y*y) * 0.4);
  return { x: sx, y: sy, scale: sc };
}

function drawTree(x, y, s) {
  const h = 30*s;
  ctx.strokeStyle = '#5D4037'; ctx.lineWidth = Math.max(1, 2*s);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h*0.4); ctx.stroke();
  ctx.strokeStyle = '#2E7D32';
  ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x - h*0.3, y - h*0.4); ctx.lineTo(x + h*0.3, y - h*0.4); ctx.closePath(); ctx.stroke();
}

function drawGrass(x, y, s) {
  ctx.strokeStyle = '#4CAF50'; ctx.lineWidth = Math.max(1, s);
  ctx.beginPath(); ctx.moveTo(x-3*s, y); ctx.lineTo(x-5*s, y-10*s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y-12*s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+3*s, y); ctx.lineTo(x+5*s, y-10*s); ctx.stroke();
}

function drawFlower(x, y, s) {
  ctx.strokeStyle = '#4CAF50'; ctx.lineWidth = Math.max(1, s);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y-15*s); ctx.stroke();
  ctx.strokeStyle = '#FF6B6B'; ctx.lineWidth = Math.max(1, 2*s);
  ctx.beginPath(); ctx.moveTo(x, y-15*s-5*s); ctx.lineTo(x, y-15*s+5*s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x-5*s, y-15*s); ctx.lineTo(x+5*s, y-15*s); ctx.stroke();
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
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, W, H);

  updateProjCache();
  const front = getFrontBits();

  // 边
  const visEdges = edges.filter(e => e.a !== front && e.b !== front).map(e => {
    const pa = projCache.get(e.a), pb = projCache.get(e.b);
    return { ...e, pa, pb, z: (pa.z + pb.z) / 2 };
  }).sort((a, b) => a.z - b.z);

  for (const e of visEdges) {
    ctx.beginPath();
    ctx.moveTo(e.pa.x, e.pa.y);
    ctx.lineTo(e.pb.x, e.pb.y);
    if (e.val === 0) {
      ctx.strokeStyle = '#888'; ctx.lineWidth = e.z > 0 ? 6 : 5; ctx.stroke();
      ctx.strokeStyle = '#FFF'; ctx.lineWidth = e.z > 0 ? 3 : 2;
    } else {
      ctx.strokeStyle = '#000'; ctx.lineWidth = e.z > 0 ? 4 : 3;
    }
    ctx.stroke();
  }

  // 顶点
  const verts = trigramBits.filter(b => b !== front).map(b => ({ b, p: projCache.get(b) })).sort((a, b) => a.p.z - b.p.z);
  for (const v of verts) {
    const p = v.p, isFront = p.z > 0, r = isFront ? 12 : 9;
    ctx.beginPath(); ctx.arc(p.x, p.y, r + 2, 0, Math.PI*2); ctx.fillStyle = '#666'; ctx.fill();
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI*2); ctx.fillStyle = getNodeColor(v.b); ctx.fill();
    ctx.fillStyle = '#333'; ctx.font = isFront ? 'bold 13px sans-serif' : '11px sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(v.b, p.x, p.y - r - 12);
  }

  // 地面场景
  const sortedVerts = verts.sort((a, b) => b.p.y - a.p.y);
  if (sortedVerts.length >= 4) {
    const b4 = sortedVerts.slice(0, 4);
    const quad = [b4[1].p.x < b4[2].p.x ? b4[1].p : b4[2].p, b4[1].p.x < b4[2].p.x ? b4[2].p : b4[1].p, b4[0].p, b4[3].p];

    // 移动场景元素
    const delta = sceneOffset - lastSceneOffset;
    lastSceneOffset = sceneOffset;
    for (const e of groundElements) {
      e.x = ((e.x + delta * 0.5) % 1 + 1) % 1;
      e.y = ((e.y + delta * 0.3) % 1 + 1) % 1;
    }

    // 绘制场景元素
    for (const e of groundElements) {
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const ex = e.x + ox, ey = e.y + oy;
          if (ex < -0.1 || ex > 1.1 || ey < -0.1 || ey > 1.1) continue;
          const pt = getGroundPoint(quad, ex, ey);
          if (e.type === 'tree') drawTree(pt.x, pt.y, pt.scale);
          else if (e.type === 'grass') drawGrass(pt.x, pt.y, pt.scale);
          else drawFlower(pt.x, pt.y, pt.scale);
        }
      }
    }

    // 火柴人
    const center = getGroundPoint(quad, 0.5, 0.5);
    drawStickMan(center.x, center.y, center.scale, walkTime, quad);
  }

  // UI
  ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(`宫视角: ${currentPalace}宫`, 15, 25);
  ctx.font = '11px sans-serif';
  ctx.fillText('点击顶点切换视角', 15, 42);
  ctx.fillText(`超立方体时空切片 · ${CUBE_SIZE}m × ${CUBE_SIZE}m × ${CUBE_SIZE}m`, 15, 58);
}

// ==================== 游戏循环 ====================
function gameLoop() {
  walkTime += 0.016;
  sceneOffset += 0.003 * stickManSpeed;
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
