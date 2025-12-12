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

// ===== 火柴人速度系统 =====
// 速度范围: 0 (静止) - 1 (全速跑)
let stickManSpeed = 0.7;        // 当前速度
let targetSpeed = 0.7;          // 目标速度
const SPEED_LERP = 0.05;        // 速度插值系数（平滑过渡）
const BASE_SCENE_SPEED = 0.004; // 基础场景移动速度

// ===== 姿势过渡系统 =====
// 存储上一帧的关节位置，用于平滑过渡
const poseState = {
  // 腿部 (髋->膝->踝->脚尖)
  rHipAngle: 0, rKneeAngle: 0, rAnkleAngle: 0,
  lHipAngle: 0, lKneeAngle: 0, lAnkleAngle: 0,
  rFootX: 0, rFootY: 0,
  lFootX: 0, lFootY: 0,
  rKneeX: 0, rKneeY: 0,
  lKneeX: 0, lKneeY: 0,
  rAnkleX: 0, rAnkleY: 0,
  lAnkleX: 0, lAnkleY: 0,
  // 手臂 (肩->肘->腕->手)
  rShoulderAngle: 0, rElbowAngle: 0, rWristAngle: 0,
  lShoulderAngle: 0, lElbowAngle: 0, lWristAngle: 0,
  rHandX: 0, rHandY: 0,
  lHandX: 0, lHandY: 0,
  rElbowX: 0, rElbowY: 0,
  lElbowX: 0, lElbowY: 0,
  rWristX: 0, rWristY: 0,
  lWristX: 0, lWristY: 0,
  // 脊椎弯曲 (4段)
  spineAngles: [0, 0, 0, 0],
  // 颈部
  neckAngle: 0,
  // 身体状态
  bounce: 0,
  lean: 0,
  torsoTwist: 0,  // 躯干扭转
  // 朝向
  facing: 0,
  // 是否已初始化
  initialized: false
};

// 姿势插值系数（越小越平滑，但响应越慢）
const POSE_LERP = 0.15;          // 普通过渡
const POSE_LERP_FAST = 0.25;     // 快速过渡（如脚落地）
const POSE_LERP_SLOW = 0.08;     // 慢速过渡（如方向改变）

// 线性插值函数
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// 角度插值（处理角度环绕）
function lerpAngle(a, b, t) {
  let diff = b - a;
  // 将差值归一化到 -PI 到 PI
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

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

// =============== Verlet 物理系统 ===============
// 基于 Verlet 积分的火柴人物理引擎
// 参考: https://pikuma.com/blog/verlet-integration-2d-cloth-physics-simulation

// 物理参数
const PHYSICS = {
  gravity: 0.15,        // 重力
  friction: 0.99,       // 空气摩擦
  groundFriction: 0.8,  // 地面摩擦
  bounce: 0.3,          // 弹性
  stiffness: 0.8,       // 约束刚度
  iterations: 5,        // 约束迭代次数
  muscleStrength: 0.4,  // 肌肉力量
  bendiness: 0.3,       // 弯曲程度
};

// Verlet 点类
class VerletPoint {
  constructor(x, y, pinned = false, mass = 1) {
    this.x = x;
    this.y = y;
    this.oldX = x;
    this.oldY = y;
    this.pinned = pinned;
    this.mass = mass;
  }

  update(gravity, friction) {
    if (this.pinned) return;

    const vx = (this.x - this.oldX) * friction;
    const vy = (this.y - this.oldY) * friction;

    this.oldX = this.x;
    this.oldY = this.y;

    this.x += vx;
    this.y += vy + gravity * this.mass;
  }

  applyForce(fx, fy) {
    if (this.pinned) return;
    this.x += fx;
    this.y += fy;
  }
}

// Verlet 约束（棍子）类
class VerletStick {
  constructor(p1, p2, length = null, stiffness = PHYSICS.stiffness) {
    this.p1 = p1;
    this.p2 = p2;
    this.length = length || Math.hypot(p2.x - p1.x, p2.y - p1.y);
    this.stiffness = stiffness;
  }

  solve() {
    const dx = this.p2.x - this.p1.x;
    const dy = this.p2.y - this.p1.y;
    const dist = Math.hypot(dx, dy);
    const diff = (this.length - dist) / dist * this.stiffness;

    const offsetX = dx * diff * 0.5;
    const offsetY = dy * diff * 0.5;

    if (!this.p1.pinned) {
      this.p1.x -= offsetX;
      this.p1.y -= offsetY;
    }
    if (!this.p2.pinned) {
      this.p2.x += offsetX;
      this.p2.y += offsetY;
    }
  }
}

// 角度约束类（控制关节弯曲范围）
class AngleConstraint {
  constructor(p1, p2, p3, minAngle, maxAngle, stiffness = 0.3) {
    this.p1 = p1; // 起点
    this.p2 = p2; // 中点（关节）
    this.p3 = p3; // 终点
    this.minAngle = minAngle;
    this.maxAngle = maxAngle;
    this.stiffness = stiffness;
  }

  solve() {
    const angle = Math.atan2(this.p3.y - this.p2.y, this.p3.x - this.p2.x) -
                  Math.atan2(this.p1.y - this.p2.y, this.p1.x - this.p2.x);

    let normalizedAngle = angle;
    while (normalizedAngle < -Math.PI) normalizedAngle += Math.PI * 2;
    while (normalizedAngle > Math.PI) normalizedAngle -= Math.PI * 2;

    if (normalizedAngle < this.minAngle) {
      this.rotatePoint(this.p3, this.p2, this.minAngle - normalizedAngle);
    } else if (normalizedAngle > this.maxAngle) {
      this.rotatePoint(this.p3, this.p2, this.maxAngle - normalizedAngle);
    }
  }

  rotatePoint(point, pivot, angle) {
    if (point.pinned) return;
    const cos = Math.cos(angle * this.stiffness);
    const sin = Math.sin(angle * this.stiffness);
    const dx = point.x - pivot.x;
    const dy = point.y - pivot.y;
    point.x = pivot.x + dx * cos - dy * sin;
    point.y = pivot.y + dx * sin + dy * cos;
  }
}

// 火柴人 Verlet 骨骼系统
class StickManVerlet {
  constructor(x, y, scale) {
    this.baseX = x;
    this.baseY = y;
    this.scale = scale;
    this.points = {};
    this.sticks = [];
    this.angleConstraints = [];

    this.initSkeleton();
  }

  initSkeleton() {
    const s = this.scale * 50;

    // 创建骨骼点（从头到脚）
    // 头部
    this.points.head = new VerletPoint(0, -s * 0.9, false, 0.8);

    // 躯干（多节脊椎，允许弯曲）
    this.points.neck = new VerletPoint(0, -s * 0.78, false, 0.5);
    this.points.chest = new VerletPoint(0, -s * 0.6, false, 1.2);
    this.points.waist = new VerletPoint(0, -s * 0.45, false, 1.0);
    this.points.hip = new VerletPoint(0, -s * 0.35, false, 1.2);

    // 左臂
    this.points.lShoulder = new VerletPoint(-s * 0.12, -s * 0.7, false, 0.3);
    this.points.lElbow = new VerletPoint(-s * 0.22, -s * 0.55, false, 0.2);
    this.points.lHand = new VerletPoint(-s * 0.28, -s * 0.4, false, 0.1);

    // 右臂
    this.points.rShoulder = new VerletPoint(s * 0.12, -s * 0.7, false, 0.3);
    this.points.rElbow = new VerletPoint(s * 0.22, -s * 0.55, false, 0.2);
    this.points.rHand = new VerletPoint(s * 0.28, -s * 0.4, false, 0.1);

    // 左腿
    this.points.lHip = new VerletPoint(-s * 0.06, -s * 0.35, false, 0.4);
    this.points.lKnee = new VerletPoint(-s * 0.08, -s * 0.18, false, 0.3);
    this.points.lFoot = new VerletPoint(-s * 0.06, 0, false, 0.2);

    // 右腿
    this.points.rHip = new VerletPoint(s * 0.06, -s * 0.35, false, 0.4);
    this.points.rKnee = new VerletPoint(s * 0.08, -s * 0.18, false, 0.3);
    this.points.rFoot = new VerletPoint(s * 0.06, 0, false, 0.2);

    // 创建约束（骨骼连接）
    const p = this.points;

    // 头颈躯干
    this.sticks.push(new VerletStick(p.head, p.neck, s * 0.12));
    this.sticks.push(new VerletStick(p.neck, p.chest, s * 0.18));
    this.sticks.push(new VerletStick(p.chest, p.waist, s * 0.15));
    this.sticks.push(new VerletStick(p.waist, p.hip, s * 0.10));

    // 肩膀连接
    this.sticks.push(new VerletStick(p.chest, p.lShoulder, s * 0.15));
    this.sticks.push(new VerletStick(p.chest, p.rShoulder, s * 0.15));
    this.sticks.push(new VerletStick(p.lShoulder, p.rShoulder, s * 0.24));

    // 髋部连接
    this.sticks.push(new VerletStick(p.hip, p.lHip, s * 0.08));
    this.sticks.push(new VerletStick(p.hip, p.rHip, s * 0.08));
    this.sticks.push(new VerletStick(p.lHip, p.rHip, s * 0.12));

    // 左臂
    this.sticks.push(new VerletStick(p.lShoulder, p.lElbow, s * 0.18));
    this.sticks.push(new VerletStick(p.lElbow, p.lHand, s * 0.16));

    // 右臂
    this.sticks.push(new VerletStick(p.rShoulder, p.rElbow, s * 0.18));
    this.sticks.push(new VerletStick(p.rElbow, p.rHand, s * 0.16));

    // 左腿
    this.sticks.push(new VerletStick(p.lHip, p.lKnee, s * 0.20));
    this.sticks.push(new VerletStick(p.lKnee, p.lFoot, s * 0.20));

    // 右腿
    this.sticks.push(new VerletStick(p.rHip, p.rKnee, s * 0.20));
    this.sticks.push(new VerletStick(p.rKnee, p.rFoot, s * 0.20));

    // 稳定性约束（防止身体变形）
    this.sticks.push(new VerletStick(p.head, p.chest, s * 0.30, 0.5));
    this.sticks.push(new VerletStick(p.neck, p.waist, s * 0.33, 0.3));
    this.sticks.push(new VerletStick(p.chest, p.hip, s * 0.25, 0.5));
  }

  // 应用跑步动画的肌肉力
  applyRunningForces(phase) {
    const s = this.scale * 50;
    const p = this.points;
    const strength = PHYSICS.muscleStrength;

    // ===== 保持身体直立的力 =====
    // 抵消重力，让上半身保持直立
    const antigravity = PHYSICS.gravity * 1.1;
    p.head.applyForce(0, -antigravity * p.head.mass);
    p.neck.applyForce(0, -antigravity * p.neck.mass);
    p.chest.applyForce(0, -antigravity * p.chest.mass);
    p.waist.applyForce(0, -antigravity * p.waist.mass);
    p.hip.applyForce(0, -antigravity * p.hip.mass * 0.8);

    // 保持脊椎垂直的力（把头拉向髋部正上方）
    const spineCorrection = (p.head.x - p.hip.x) * 0.05;
    p.head.applyForce(-spineCorrection, 0);
    p.chest.applyForce(-spineCorrection * 0.5, 0);

    // ===== 腿部摆动 =====
    const legSwing = Math.sin(phase) * strength * s * 0.02;
    const legLift = Math.abs(Math.sin(phase)) * strength * s * 0.015;

    // 右腿
    p.rKnee.applyForce(legSwing, -legLift);
    p.rFoot.applyForce(legSwing * 1.5, 0);

    // 左腿反向
    p.lKnee.applyForce(-legSwing, -legLift);
    p.lFoot.applyForce(-legSwing * 1.5, 0);

    // ===== 手臂与腿反向摆动 =====
    const armSwing = Math.sin(phase + Math.PI) * strength * s * 0.015;

    p.rElbow.applyForce(armSwing * 0.6, 0);
    p.rHand.applyForce(armSwing * 1.2, 0);
    p.lElbow.applyForce(-armSwing * 0.6, 0);
    p.lHand.applyForce(-armSwing * 1.2, 0);

    // ===== 躯干扭转 =====
    const torsoTwist = Math.sin(phase) * strength * s * 0.004;
    p.lShoulder.applyForce(torsoTwist, 0);
    p.rShoulder.applyForce(-torsoTwist, 0);

    // ===== 身体起伏（跑步节奏）=====
    const bounce = Math.abs(Math.sin(phase * 2)) * strength * s * 0.008;
    p.hip.applyForce(0, -bounce);
    p.chest.applyForce(0, -bounce * 0.5);

    // ===== 轻微前倾 =====
    p.head.applyForce(strength * s * 0.003, 0);
    p.chest.applyForce(strength * s * 0.002, 0);
  }

  update(time) {
    const phase = time * 7; // 跑步速度

    // 应用肌肉力
    this.applyRunningForces(phase);

    // 更新所有点的位置（Verlet积分）
    for (const key in this.points) {
      this.points[key].update(PHYSICS.gravity, PHYSICS.friction);
    }

    // 约束求解（多次迭代以增加稳定性）
    for (let i = 0; i < PHYSICS.iterations; i++) {
      // 骨骼长度约束
      for (const stick of this.sticks) {
        stick.solve();
      }

      // 角度约束
      for (const ac of this.angleConstraints) {
        ac.solve();
      }

      // 地面约束（脚不能低于地面）
      const groundY = 0;
      for (const key of ['lFoot', 'rFoot']) {
        const pt = this.points[key];
        if (pt.y > groundY) {
          pt.y = groundY;
          pt.oldX += (pt.x - pt.oldX) * (1 - PHYSICS.groundFriction);
        }
      }

      // 髋部高度约束（保持站立高度）
      const s = this.scale * 50;
      const targetHipY = -s * 0.35;
      const hipCorrection = (this.points.hip.y - targetHipY) * 0.3;
      this.points.hip.y -= hipCorrection;
      this.points.waist.y -= hipCorrection * 0.5;
    }
  }

  draw(ctx, offsetX, offsetY) {
    const p = this.points;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.strokeStyle = '#333333';
    ctx.fillStyle = '#333333';
    ctx.lineWidth = Math.max(1.5, 2.5 * this.scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 绘制弯曲的线段（使用二次贝塞尔曲线）
    const drawBendableLimb = (start, mid, end, bendFactor = PHYSICS.bendiness) => {
      // 计算弯曲控制点
      const mx = (start.x + end.x) / 2;
      const my = (start.y + end.y) / 2;
      const cx = mid.x + (mid.x - mx) * bendFactor;
      const cy = mid.y + (mid.y - my) * bendFactor;

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(cx, cy, mid.x, mid.y);
      ctx.quadraticCurveTo(
        mid.x + (mid.x - (mid.x + end.x) / 2) * bendFactor,
        mid.y + (mid.y - (mid.y + end.y) / 2) * bendFactor,
        end.x, end.y
      );
      ctx.stroke();
    };

    // 绘制简单线段
    const drawLine = (p1, p2) => {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    };

    // 绘制弯曲脊椎
    ctx.beginPath();
    ctx.moveTo(p.head.x, p.head.y);
    ctx.quadraticCurveTo(p.neck.x, p.neck.y, p.chest.x, p.chest.y);
    ctx.quadraticCurveTo(p.waist.x, p.waist.y, p.hip.x, p.hip.y);
    ctx.stroke();

    // 头部
    const headRadius = this.scale * 50 * 0.08;
    ctx.beginPath();
    ctx.arc(p.head.x, p.head.y - headRadius, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // 肩膀
    drawLine(p.lShoulder, p.rShoulder);

    // 髋部
    drawLine(p.lHip, p.rHip);

    // 左臂（弯曲）
    drawBendableLimb(p.lShoulder, p.lElbow, p.lHand);

    // 右臂（弯曲）
    drawBendableLimb(p.rShoulder, p.rElbow, p.rHand);

    // 左腿（弯曲）
    drawBendableLimb(p.lHip, p.lKnee, p.lFoot);

    // 右腿（弯曲）
    drawBendableLimb(p.rHip, p.rKnee, p.rFoot);

    ctx.restore();
  }
}

// =============== 逆向运动学 (IK) 火柴人动画系统 ===============
// 使用 Two-Bone IK 实现自然的肢体运动
// 脚准确踩地，手臂自然摆动

// 缓动函数 (Easing)
function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

// =============== 人体骨骼系统 ===============
// 基于人体解剖学的骨骼结构和关节约束

// 人体比例 (以头部为单位)
// 成年人身高约为 7.5-8 个头的高度
const HUMAN_PROPORTIONS = {
  headHeight: 1.0,        // 头部高度 = 1 单位
  neckLength: 0.3,        // 颈部
  shoulderWidth: 2.0,     // 肩宽
  torsoLength: 2.5,       // 躯干（肩到髋）
  hipWidth: 1.5,          // 髋宽
  upperArmLength: 1.3,    // 上臂
  forearmLength: 1.2,     // 前臂
  handLength: 0.7,        // 手
  thighLength: 1.8,       // 大腿
  shinLength: 1.7,        // 小腿
  footLength: 1.0,        // 脚
  // 脊椎分段
  spineSegments: 4,       // 脊椎分为4段
};

// 关节角度限制 (弧度)
// 基于人体关节的实际活动范围
const JOINT_LIMITS = {
  // 颈部
  neck: {
    flexion: 0.7,         // 前屈 ~40°
    extension: 1.0,       // 后仰 ~60°
    lateral: 0.6,         // 侧弯 ~35°
  },
  // 脊椎 (每节)
  spine: {
    flexion: 0.25,        // 前屈
    extension: 0.15,      // 后仰
    lateral: 0.15,        // 侧弯
  },
  // 肩关节 (球窝关节，活动范围大)
  shoulder: {
    flexion: 3.14,        // 前举 ~180°
    extension: 1.05,      // 后伸 ~60°
    abduction: 3.14,      // 外展 ~180°
  },
  // 肘关节 (铰链关节，只能单向弯曲)
  elbow: {
    minAngle: 0.0,        // 完全伸直 0°
    maxAngle: 2.6,        // 最大弯曲 ~150°
  },
  // 腕关节
  wrist: {
    flexion: 1.4,         // 掌屈 ~80°
    extension: 1.2,       // 背伸 ~70°
  },
  // 髋关节 (球窝关节)
  hip: {
    flexion: 2.1,         // 前屈 ~120°
    extension: 0.5,       // 后伸 ~30°
    abduction: 0.8,       // 外展 ~45°
  },
  // 膝关节 (铰链关节，只能单向弯曲)
  knee: {
    minAngle: 0.0,        // 完全伸直 0°
    maxAngle: 2.4,        // 最大弯曲 ~140°
  },
  // 踝关节
  ankle: {
    dorsiflexion: 0.35,   // 背屈 ~20°
    plantarflexion: 0.87, // 跖屈 ~50°
  },
};

// 限制角度在范围内
function clampAngle(angle, min, max) {
  return Math.max(min, Math.min(max, angle));
}

// ===== Two-Bone IK 求解器 (带关节限制) =====
// 给定起点、目标点和两段骨骼长度，计算中间关节位置
// bendDirection: 1 = 向外弯曲（膝盖向前），-1 = 向内弯曲（肘部向后）
// jointMin/jointMax: 关节角度限制
function solveIKConstrained(startX, startY, targetX, targetY, bone1Len, bone2Len,
                            bendDirection = 1, jointMin = 0, jointMax = Math.PI) {
  const dx = targetX - startX;
  const dy = targetY - startY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // 限制目标在可达范围内
  const maxDist = bone1Len + bone2Len - 0.01;
  const minDist = Math.abs(bone1Len - bone2Len) + 0.01;
  const clampedDist = Math.max(minDist, Math.min(maxDist, dist));

  // 从起点到目标的角度
  const angleToTarget = Math.atan2(dy, dx);

  // 余弦定理求关节弯曲角度
  const cosJoint = (bone1Len * bone1Len + bone2Len * bone2Len - clampedDist * clampedDist)
                   / (2 * bone1Len * bone2Len);
  let jointBendAngle = Math.acos(Math.max(-1, Math.min(1, cosJoint)));

  // 应用关节限制
  jointBendAngle = clampAngle(jointBendAngle, jointMin, jointMax);

  // 根据限制后的角度重新计算
  const cosAngle = (bone1Len * bone1Len + clampedDist * clampedDist - bone2Len * bone2Len)
                   / (2 * bone1Len * clampedDist);
  const angle1 = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

  // 计算中间关节位置
  const midAngle = angleToTarget + angle1 * bendDirection;
  const midX = startX + Math.cos(midAngle) * bone1Len;
  const midY = startY + Math.sin(midAngle) * bone1Len;

  // 计算终点
  let endX = targetX;
  let endY = targetY;
  if (dist > maxDist || dist < minDist) {
    const ratio = clampedDist / dist;
    endX = startX + dx * ratio;
    endY = startY + dy * ratio;
  }

  return { midX, midY, endX, endY, jointAngle: jointBendAngle };
}

// ===== Two-Bone IK 求解器 =====
// 给定起点、目标点和两段骨骼长度，计算中间关节位置
// bendDirection: 1 = 向外弯曲（膝盖向前，肘部向后），-1 = 向内弯曲
function solveIK(startX, startY, targetX, targetY, bone1Len, bone2Len, bendDirection = 1) {
  const dx = targetX - startX;
  const dy = targetY - startY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // 限制目标在可达范围内
  const maxDist = bone1Len + bone2Len - 0.01;
  const minDist = Math.abs(bone1Len - bone2Len) + 0.01;
  const clampedDist = Math.max(minDist, Math.min(maxDist, dist));

  // 从起点到目标的角度
  const angleToTarget = Math.atan2(dy, dx);

  // 余弦定理求中间关节角度
  // a² = b² + c² - 2bc*cos(A)
  const cosAngle = (bone1Len * bone1Len + clampedDist * clampedDist - bone2Len * bone2Len)
                   / (2 * bone1Len * clampedDist);
  const jointAngle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

  // 计算中间关节位置（膝盖/肘部）
  const midAngle = angleToTarget + jointAngle * bendDirection;
  const midX = startX + Math.cos(midAngle) * bone1Len;
  const midY = startY + Math.sin(midAngle) * bone1Len;

  // 如果目标超出范围，重新计算终点
  let endX = targetX;
  let endY = targetY;
  if (dist > maxDist || dist < minDist) {
    const ratio = clampedDist / dist;
    endX = startX + dx * ratio;
    endY = startY + dy * ratio;
  }

  return { midX, midY, endX, endY };
}

// ===== 走路周期中的脚步轨迹 =====
// 返回脚相对于髋部的位置 (基于相位 0-2PI)
function getFootTarget(phase, strideLength, stepHeight, groundY) {
  // 归一化相位到 0-1
  const t = ((phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2);

  let x, y;

  if (t < 0.5) {
    // 支撑阶段 (脚在地上，向后移动)
    const supportT = t * 2;  // 0 to 1
    x = strideLength * (0.5 - supportT);  // 从前向后
    y = groundY;  // 在地面上
  } else {
    // 摆动阶段 (脚抬起，向前移动)
    const swingT = (t - 0.5) * 2;  // 0 to 1
    x = strideLength * (-0.5 + swingT);  // 从后向前
    // 抛物线轨迹抬脚
    y = groundY - stepHeight * Math.sin(swingT * Math.PI);
  }

  return { x, y };
}

// ===== 手臂摆动轨迹 =====
function getHandTarget(phase, swingLength, swingHeight, shoulderY) {
  // 手臂在身体两侧自然下垂并前后摆动
  const swing = Math.sin(phase);
  const x = swing * swingLength;
  // 手臂向后摆时稍微抬高（自然的跑步姿势）
  const lift = Math.max(0, -swing) * swingHeight;
  const y = shoulderY + swingLength * 1.8 - lift;

  return { x, y };
}

// 计算火柴人朝向（基于000位置）
// 返回角度：0=向上(背面), PI=向下(正面), PI/2=向右, -PI/2=向左
function getStickManDirection(groundQuad) {
  const zeroPos = getZeroGroundCoords(groundQuad);
  const dx = zeroPos.x - 0.5;
  const dy = zeroPos.y - 0.5;
  return Math.atan2(dx, -dy);
}

function drawStickManPhysics(x, y, scale, time, groundQuad) {
  // ===== 简化的火柴人走路动画 =====
  // 基于 Processing 论坛的成熟方案：用 sin() 直接驱动关节角度
  // 参考: https://forum.processing.org/two/discussion/24143/

  const speed = stickManSpeed;
  const t = time * (4 + speed * 6);  // 动画速度

  // 获取朝向
  const targetFacing = groundQuad ? getStickManDirection(groundQuad) : 0;
  const facing = poseState.initialized
    ? lerpAngle(poseState.facing, targetFacing, 0.1)
    : targetFacing;
  poseState.facing = facing;
  poseState.initialized = true;

  // 视角
  const sideView = Math.abs(Math.sin(facing));
  const facingRight = Math.sin(facing) >= 0 ? 1 : -1;
  const facingAway = Math.cos(facing);

  // ===== 骨骼尺寸 =====
  const len = 12 * scale;  // 基本骨骼长度
  const headR = len * 0.5;
  const bodyLen = len * 1.8;
  const legLen = len * 1.0;   // 大腿/小腿长度
  const armLen = len * 0.8;   // 上臂/前臂长度

  // 身体宽度（正面宽，侧面窄）
  const bodyW = len * 0.5 * (0.3 + Math.abs(facingAway) * 0.7);

  // ===== 关节角度（使用 sin 函数）=====
  // 腿部：大腿角度，小腿有延迟
  const swingAmp = 0.5 + speed * 0.3;  // 摆动幅度

  // 右腿
  const rThigh = Math.sin(t) * swingAmp;                    // 大腿角度
  const rShin = Math.sin(t - 0.5) * swingAmp * 0.8 - 0.3;  // 小腿角度（有延迟，向后弯）

  // 左腿（相位差 PI）
  const lThigh = Math.sin(t + Math.PI) * swingAmp;
  const lShin = Math.sin(t + Math.PI - 0.5) * swingAmp * 0.8 - 0.3;

  // 手臂（与对侧腿反向）
  const rArm = Math.sin(t + Math.PI) * swingAmp * 0.6;
  const rForearm = Math.sin(t + Math.PI - 0.3) * swingAmp * 0.4 + 0.5;
  const lArm = Math.sin(t) * swingAmp * 0.6;
  const lForearm = Math.sin(t - 0.3) * swingAmp * 0.4 + 0.5;

  // 身体上下起伏
  const bounce = Math.abs(Math.sin(t * 2)) * 2 * scale * speed;

  // ===== 计算关节位置 =====
  ctx.save();
  ctx.translate(x, y - bounce);

  // 关键位置
  const hipY = 0;
  const shoulderY = hipY - bodyLen;
  const headY = shoulderY - len * 0.3 - headR;

  // 髋部和肩膀X位置
  const rHipX = bodyW * facingRight;
  const lHipX = -bodyW * facingRight;
  const rShoulderX = bodyW * 1.2 * facingRight;
  const lShoulderX = -bodyW * 1.2 * facingRight;

  // 计算腿部关节（侧面视角时前后摆动，正面时左右分开）
  const legSwingX = sideView * facingRight;
  const legSwingY = Math.abs(facingAway) * 0.3;

  // 右腿
  const rKneeX = rHipX + Math.sin(rThigh) * legLen * legSwingX;
  const rKneeY = hipY + Math.cos(rThigh) * legLen;
  const rFootX = rKneeX + Math.sin(rThigh + rShin) * legLen * legSwingX;
  const rFootY = rKneeY + Math.cos(rThigh + rShin) * legLen;

  // 左腿
  const lKneeX = lHipX + Math.sin(lThigh) * legLen * legSwingX;
  const lKneeY = hipY + Math.cos(lThigh) * legLen;
  const lFootX = lKneeX + Math.sin(lThigh + lShin) * legLen * legSwingX;
  const lFootY = lKneeY + Math.cos(lThigh + lShin) * legLen;

  // 右臂
  const rElbowX = rShoulderX + Math.sin(rArm) * armLen * legSwingX;
  const rElbowY = shoulderY + Math.cos(rArm) * armLen;
  const rHandX = rElbowX + Math.sin(rArm + rForearm) * armLen * legSwingX;
  const rHandY = rElbowY + Math.cos(rArm + rForearm) * armLen;

  // 左臂
  const lElbowX = lShoulderX + Math.sin(lArm) * armLen * legSwingX;
  const lElbowY = shoulderY + Math.cos(lArm) * armLen;
  const lHandX = lElbowX + Math.sin(lArm + lForearm) * armLen * legSwingX;
  const lHandY = lElbowY + Math.cos(lArm + lForearm) * armLen;

  // ===== 绘制 =====
  ctx.strokeStyle = '#333333';
  ctx.fillStyle = '#333333';
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 确定前后顺序
  const rLegForward = rThigh > 0;
  const drawRightFirst = facingAway > 0 ? !rLegForward : rLegForward;

  const frontColor = '#333333';
  const backColor = '#666666';

  // 后面的腿和手臂
  ctx.strokeStyle = backColor;
  if (drawRightFirst) {
    ctx.beginPath();
    ctx.moveTo(rHipX, hipY);
    ctx.lineTo(rKneeX, rKneeY);
    ctx.lineTo(rFootX, rFootY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rShoulderX, shoulderY);
    ctx.lineTo(rElbowX, rElbowY);
    ctx.lineTo(rHandX, rHandY);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(lHipX, hipY);
    ctx.lineTo(lKneeX, lKneeY);
    ctx.lineTo(lFootX, lFootY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lShoulderX, shoulderY);
    ctx.lineTo(lElbowX, lElbowY);
    ctx.lineTo(lHandX, lHandY);
    ctx.stroke();
  }

  // 身体
  ctx.strokeStyle = frontColor;
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(0, shoulderY);
  ctx.stroke();

  // 髋部
  ctx.beginPath();
  ctx.moveTo(lHipX, hipY);
  ctx.lineTo(rHipX, hipY);
  ctx.stroke();

  // 肩膀
  ctx.beginPath();
  ctx.moveTo(lShoulderX, shoulderY);
  ctx.lineTo(rShoulderX, shoulderY);
  ctx.stroke();

  // 头
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // 前面的腿和手臂
  ctx.strokeStyle = frontColor;
  if (drawRightFirst) {
    ctx.beginPath();
    ctx.moveTo(lHipX, hipY);
    ctx.lineTo(lKneeX, lKneeY);
    ctx.lineTo(lFootX, lFootY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lShoulderX, shoulderY);
    ctx.lineTo(lElbowX, lElbowY);
    ctx.lineTo(lHandX, lHandY);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(rHipX, hipY);
    ctx.lineTo(rKneeX, rKneeY);
    ctx.lineTo(rFootX, rFootY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rShoulderX, shoulderY);
    ctx.lineTo(rElbowX, rElbowY);
    ctx.lineTo(rHandX, rHandY);
    ctx.stroke();
  }

  ctx.restore();
}

// 保留旧函数作为备用
function drawStickManPhysicsOld(x, y, scale, time) {
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

  // 火柴人在菱形正中央，朝向 000 方向跑
  const stickPt = getDiamondCenter(groundQuad);
  drawStickManPhysics(stickPt.x, stickPt.y, stickPt.scale, walkTime, groundQuad);
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

  // 平滑过渡速度 (Slow In/Slow Out)
  stickManSpeed += (targetSpeed - stickManSpeed) * SPEED_LERP;

  // 场景平移（速度影响移动速度）
  // sceneOffset 可以无限增长，元素坐标通过模运算循环
  sceneOffset += BASE_SCENE_SPEED * stickManSpeed;

  draw();
  requestAnimationFrame(gameLoop);
}

// 设置火柴人速度 (0-1)
function setStickManSpeed(speed) {
  targetSpeed = Math.max(0, Math.min(1, speed));
}

// 获取当前速度
function getStickManSpeed() {
  return stickManSpeed;
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
