/**
 * 星座风格立方体渲染器
 *
 * 设计说明：
 * - 顶点做成星星，亮度由阴阳决定（阳=亮，阴=暗）
 * - 爻像连接星座的辅助线
 * - 为了抽象，只显示阴爻连线
 * - 锁定视角，角色在地面菱形中心
 */

const { TRIGRAMS, COLORS, getBitsName } = require('../config/GameConfig.js');

class ConstellationCube {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // 获取屏幕尺寸
    const sysInfo = wx.getSystemInfoSync();
    this.W = sysInfo.windowWidth;
    this.H = sysInfo.windowHeight;
    this.DPR = sysInfo.pixelRatio;

    // 设置 Canvas 尺寸
    this.canvas.width = Math.floor(this.W * this.DPR);
    this.canvas.height = Math.floor(this.H * this.DPR);

    // 视角参数（锁定为乾宫视角，可见六边形）
    this.rotX = Math.atan(1 / Math.sqrt(2)); // 俯视角度
    this.rotY = -Math.PI / 4; // 45度旋转
    this.rotZ = Math.PI;
    this.zoom = 1.0;

    // 立方体尺寸
    this.cubeSize = Math.min(this.W, this.H) * 0.35;

    // 动画参数
    this.starTwinkle = 0;
    this.time = 0;

    // 构建顶点和边
    this._buildVertices();
    this._buildEdges();
  }

  // 构建8个顶点（八卦）
  _buildVertices() {
    this.vertices = [];

    // 乾000 坤111 的定义
    const trigramBits = ['000', '001', '010', '011', '100', '101', '110', '111'];

    for (const bits of trigramBits) {
      // 从 bits 计算 3D 坐标
      // bits[0] = 初爻 -> Y轴
      // bits[1] = 二爻 -> Z轴
      // bits[2] = 三爻 -> X轴
      const x = bits[2] === '1' ? 1 : -1;
      const y = bits[0] === '1' ? 1 : -1;
      const z = bits[1] === '1' ? 1 : -1;

      // 计算阳爻数量（0的个数）
      let yangCount = 0;
      for (const c of bits) {
        if (c === '0') yangCount++;
      }

      this.vertices.push({
        bits,
        name: getBitsName(bits),
        symbol: TRIGRAMS[bits].symbol,
        local: { x, y, z },
        yangCount, // 阳爻数量决定亮度
        brightness: 0.3 + yangCount * 0.23 // 0-3个阳爻 -> 0.3-1.0
      });
    }
  }

  // 构建12条边（爻）
  _buildEdges() {
    this.edges = [];

    // 立方体的12条边
    // 每条边连接两个只有一个bit不同的顶点
    const edgePairs = [
      // X轴方向的边（对应第三爻）
      ['000', '001'], ['010', '011'], ['100', '101'], ['110', '111'],
      // Y轴方向的边（对应初爻）
      ['000', '100'], ['001', '101'], ['010', '110'], ['011', '111'],
      // Z轴方向的边（对应二爻）
      ['000', '010'], ['001', '011'], ['100', '110'], ['101', '111']
    ];

    for (const [a, b] of edgePairs) {
      // 找出不同的那一位（爻）
      let diffIndex = -1;
      for (let i = 0; i < 3; i++) {
        if (a[i] !== b[i]) {
          diffIndex = i;
          break;
        }
      }

      // 判断这条边代表的爻是阴还是阳
      // 边连接的两个点，其中一个该位是0，一个是1
      // 我们用1（阴爻）来决定是否显示这条边
      const yaoValue = a[diffIndex] === '1' ? '1' : b[diffIndex];

      this.edges.push({
        from: a,
        to: b,
        yaoIndex: diffIndex, // 0=初爻, 1=二爻, 2=三爻
        isYin: yaoValue === '1' // 这条边是否代表阴爻
      });
    }
  }

  // 3D旋转
  _rotate3D(p) {
    let x = p.x * this.zoom;
    let y = p.y * this.zoom;
    let z = p.z * this.zoom;

    // Y轴旋转
    const cy = Math.cos(this.rotY), sy = Math.sin(this.rotY);
    let x1 = x * cy + z * sy, z1 = -x * sy + z * cy;

    // X轴旋转
    const cx = Math.cos(this.rotX), sx = Math.sin(this.rotX);
    let y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;

    // Z轴旋转
    const cz = Math.cos(this.rotZ), sz = Math.sin(this.rotZ);
    let x3 = x1 * cz - y2 * sz, y3 = x1 * sz + y2 * cz;

    return { x: x3, y: y3, z: z2 };
  }

  // 投影到2D
  _project(p3) {
    const pr = this._rotate3D(p3);
    const scale = this.cubeSize;
    return {
      x: pr.x * scale + this.W / 2,
      y: -pr.y * scale + this.H / 2,
      z: pr.z
    };
  }

  // 绘制星星
  _drawStar(ctx, x, y, brightness, size = 8, twinkle = 0) {
    const actualBrightness = brightness * (0.85 + 0.15 * Math.sin(twinkle));

    // 星星光晕
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
    gradient.addColorStop(0, `rgba(255, 250, 205, ${actualBrightness})`);
    gradient.addColorStop(0.3, `rgba(255, 250, 205, ${actualBrightness * 0.5})`);
    gradient.addColorStop(1, 'rgba(255, 250, 205, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 2, 0, Math.PI * 2);
    ctx.fill();

    // 星星核心
    ctx.fillStyle = `rgba(255, 255, 255, ${actualBrightness})`;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // 十字光芒
    ctx.strokeStyle = `rgba(255, 250, 205, ${actualBrightness * 0.7})`;
    ctx.lineWidth = 1;
    const rayLength = size * 1.5;

    ctx.beginPath();
    ctx.moveTo(x - rayLength, y);
    ctx.lineTo(x + rayLength, y);
    ctx.moveTo(x, y - rayLength);
    ctx.lineTo(x, y + rayLength);
    ctx.stroke();
  }

  // 绘制阴爻连线
  _drawYinLine(ctx, x1, y1, x2, y2, alpha = 0.6) {
    ctx.strokeStyle = `rgba(100, 90, 80, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]); // 虚线表示阴爻

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  // 绘制背景
  _drawBackground(ctx) {
    // 深空渐变背景
    const gradient = ctx.createLinearGradient(0, 0, 0, this.H);
    gradient.addColorStop(0, '#0F0F1A');
    gradient.addColorStop(1, '#050508');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.W, this.H);

    // 绘制一些背景星星
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 50; i++) {
      const x = (Math.sin(i * 7.3) * 0.5 + 0.5) * this.W;
      const y = (Math.cos(i * 11.7) * 0.5 + 0.5) * this.H;
      const size = 0.5 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 绘制地面菱形（角色站立的位置）
  _drawGroundDiamond(ctx) {
    // 地面四个点：110, 111, 011, 010 (y=-1 的四个点)
    const groundBits = ['110', '111', '011', '010'];
    const groundPoints = [];

    for (const bits of groundBits) {
      const vertex = this.vertices.find(v => v.bits === bits);
      if (vertex) {
        const p = this._project(vertex.local);
        groundPoints.push(p);
      }
    }

    if (groundPoints.length === 4) {
      // 绘制地面
      ctx.fillStyle = 'rgba(139, 69, 19, 0.15)';
      ctx.strokeStyle = 'rgba(139, 69, 19, 0.4)';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(groundPoints[0].x, groundPoints[0].y);
      for (let i = 1; i < 4; i++) {
        ctx.lineTo(groundPoints[i].x, groundPoints[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 计算中心点（角色位置）
      const centerX = groundPoints.reduce((sum, p) => sum + p.x, 0) / 4;
      const centerY = groundPoints.reduce((sum, p) => sum + p.y, 0) / 4;

      return { x: centerX, y: centerY };
    }

    return null;
  }

  // 主渲染函数
  render(dt = 16) {
    const ctx = this.ctx;
    ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);

    // 更新动画时间
    this.time += dt;
    this.starTwinkle += dt * 0.003;

    // 绘制背景
    this._drawBackground(ctx);

    // 计算所有顶点的投影位置
    const projectedVertices = [];
    for (const v of this.vertices) {
      const p = this._project(v.local);
      projectedVertices.push({
        ...v,
        projected: p
      });
    }

    // 按Z排序（后面的先画）
    projectedVertices.sort((a, b) => b.projected.z - a.projected.z);

    // 先绘制阴爻连线（只显示阴爻）
    for (const edge of this.edges) {
      if (!edge.isYin) continue; // 只绘制阴爻

      const fromVertex = this.vertices.find(v => v.bits === edge.from);
      const toVertex = this.vertices.find(v => v.bits === edge.to);

      if (fromVertex && toVertex) {
        const p1 = this._project(fromVertex.local);
        const p2 = this._project(toVertex.local);

        // 根据深度调整透明度
        const avgZ = (p1.z + p2.z) / 2;
        const alpha = 0.3 + 0.4 * (1 - (avgZ + 1) / 2);

        this._drawYinLine(ctx, p1.x, p1.y, p2.x, p2.y, alpha);
      }
    }

    // 绘制地面菱形
    const charPos = this._drawGroundDiamond(ctx);

    // 绘制星星（顶点）
    for (const v of projectedVertices) {
      const { projected, brightness, name, symbol, bits } = v;

      // 星星大小根据深度变化
      const depthFactor = 1 - (projected.z + 1) / 4;
      const size = 6 + 6 * depthFactor;

      // 绘制星星
      this._drawStar(
        ctx,
        projected.x,
        projected.y,
        brightness,
        size,
        this.starTwinkle + v.bits.charCodeAt(0)
      );

      // 绘制卦名（只在主要顶点显示）
      if (bits === '000' || bits === '111') {
        ctx.fillStyle = `rgba(232, 228, 217, ${brightness})`;
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${symbol} ${name}`, projected.x, projected.y - size - 5);
      }
    }

    return charPos;
  }

  // 设置视角（锁定乾宫视角用于六边形显示）
  setQianPalaceView() {
    this.rotX = Math.atan(1 / Math.sqrt(2));
    this.rotY = -Math.PI / 4;
    this.rotZ = Math.PI;
  }

  // 获取乾宫六边形投影（当从乾宫视角看时可见）
  getHexagonProjection() {
    // 乾宫视角下，立方体投影为正六边形
    // 六个顶点围绕中心
    const hexPoints = [];

    // 中间一圈的6个顶点
    const middleRing = ['001', '010', '011', '100', '101', '110'];

    for (const bits of middleRing) {
      const vertex = this.vertices.find(v => v.bits === bits);
      if (vertex) {
        const p = this._project(vertex.local);
        hexPoints.push({ bits, ...p });
      }
    }

    return hexPoints;
  }
}

module.exports = ConstellationCube;
