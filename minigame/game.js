/**
 * 八卦立方体 - 微信小游戏
 * 第一步：创建八卦立方体俯视图（正六边形投影，乾在中心）
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
  '000': { name: '乾' },
  '001': { name: '兑' },
  '010': { name: '离' },
  '011': { name: '震' },
  '100': { name: '巽' },
  '101': { name: '坎' },
  '110': { name: '艮' },
  '111': { name: '坤' }
};

// =============== 立方体顶点 ===============
// 二进制编码映射到3D坐标
// 乾(000)在原点，坤(111)在对角
const vertices = {};
for (const bits in TRIGRAMS) {
  // 0 -> 0, 1 -> 1
  const x = parseInt(bits[2]);  // bit0 (最右)
  const y = parseInt(bits[1]);  // bit1 (中间)
  const z = parseInt(bits[0]);  // bit2 (最左)
  vertices[bits] = {
    x: x - 0.5,  // 中心化到 -0.5 ~ 0.5
    y: y - 0.5,
    z: z - 0.5,
    ...TRIGRAMS[bits],
    bits
  };
}

// =============== 立方体边 ===============
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

// =============== 等角投影（正六边形视图） ===============
const cubeSize = Math.min(W, H) * 0.35;
const centerX = W / 2;
const centerY = H / 2;

// 从体对角线方向看：从坤(1,1,1)看向乾(0,0,0)
// 标准等角投影角度
const angleY = Math.PI / 4;  // 45度
const angleX = Math.atan(1 / Math.sqrt(2));  // ≈35.26度

function project(v) {
  let { x, y, z } = v;

  // 绕Y轴旋转45度
  const cosY = Math.cos(angleY);
  const sinY = Math.sin(angleY);
  const x1 = x * cosY - z * sinY;
  const z1 = x * sinY + z * cosY;

  // 绕X轴旋转（俯视角度）
  const cosX = Math.cos(angleX);
  const sinX = Math.sin(angleX);
  const y2 = y * cosX - z1 * sinX;
  const z2 = y * sinX + z1 * cosX;

  return {
    x: centerX + x1 * cubeSize * 1.5,
    y: centerY - y2 * cubeSize * 1.5,
    z: z2,
    bits: v.bits,
    name: v.name
  };
}

// =============== 绘制函数 ===============
function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // 背景（浅灰色，匹配截图）
  ctx.fillStyle = '#ECEEF1';
  ctx.fillRect(0, 0, W, H);

  // 投影所有顶点并按Z排序
  const projected = [];
  for (const bits in vertices) {
    projected.push(project(vertices[bits]));
  }
  projected.sort((a, b) => a.z - b.z);

  // 画边
  for (const [a, b] of edges) {
    const p1 = project(vertices[a]);
    const p2 = project(vertices[b]);

    // 根据深度决定颜色深浅
    const avgZ = (p1.z + p2.z) / 2;
    const normalizedZ = (avgZ + 1) / 2;  // 0~1

    if (normalizedZ > 0.5) {
      // 前面的边：深色粗线
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 2;
    } else {
      // 后面的边：浅色细线
      ctx.strokeStyle = '#AAAAAA';
      ctx.lineWidth = 1;
    }

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  // 画顶点和标签
  for (const p of projected) {
    const normalizedZ = (p.z + 1) / 2;

    // 顶点圆点
    const radius = normalizedZ > 0.5 ? 10 : 7;
    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // 标签
    ctx.fillStyle = '#333333';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 标签位置：根据位置调整偏移
    let labelX = p.x;
    let labelY = p.y - radius - 15;

    // 乾在中心，特殊处理
    if (p.bits === '000') {
      labelY = p.y + radius + 18;
    }

    ctx.fillText(`${p.name} ${p.bits}`, labelX, labelY);
  }
}

// =============== 触摸交互（预留） ===============
wx.onTouchStart((e) => {
  console.log('Touch:', e.touches[0].clientX, e.touches[0].clientY);
});

// =============== 启动 ===============
console.log('八卦立方体初始化...');
draw();
console.log('绘制完成');
