/**
 * 八卦立方体核心逻辑
 * 将原始 Canvas 2D 渲染逻辑封装为类
 */

const STORAGE_KEY = "bagua_cube_settings_v2";

// 卦名映射
const bitsToName = {
  "000": "乾", "001": "兑", "010": "离", "011": "震",
  "100": "巽", "101": "坎", "110": "艮", "111": "坤"
};

const trigramBits = ["000", "001", "010", "011", "100", "101", "110", "111"];

// 颜色定义
const COLORS = {
  YANG: "#cfd6df",
  YIN: "#1f2329",
  NODE: "#0b0f14",
  LABEL: "#0b0f14",
  HI: "#ffb020",
  REAL: "#ffd24a",
  TRUE: "#5ad6ff",
  NEUTRAL: "rgba(20,25,30,.55)",
  NET: "rgba(30,40,55,.22)",
  WLINK: "rgba(40,50,60,.35)",
  NETCUBE: "rgba(110,130,150,.55)",
  BG: "#eef2f7"
};

class BaguaCube {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // 获取系统信息
    const sysInfo = wx.getSystemInfoSync();
    this.W = sysInfo.windowWidth;
    this.H = sysInfo.windowHeight;
    this.DPR = sysInfo.pixelRatio;

    // 设置 Canvas 尺寸
    this.canvas.width = Math.floor(this.W * this.DPR);
    this.canvas.height = Math.floor(this.H * this.DPR);

    // 状态变量
    this.mode = "hex64";
    this.projMode = "ortho";
    this.rotX = 0;
    this.rotY = 0;
    this.rotZ = Math.PI;
    this.zoom = 1.05;

    this.unfold = 0;
    this.unfoldTarget = 0;
    this.unfoldAnim = null;
    this.UNFOLD_DUR = 1200;
    this.W_DIST = 4.0;
    this.aXW = 0;
    this.aYW = 0;
    this.aYZ = 0;
    this.lastTs = null;

    this.vertices = [];
    this.edges = [];
    this.vByKey = new Map();
    this.sceneMaxAbs = 3.2;
    this.selKey = null;
    this.lastProjCache = null;

    this.ID_MAT = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    this.palaceBases = {};
    this.currentPalace = "乾";
    this.palaceMat = this.ID_MAT.slice();

    // 镜像设置
    this.mirrors = {
      mxp: false, mxn: false,
      myp: false, myn: false,
      mzp: false, mzn: false
    };

    // 64卦设置
    this.showHexNet = false;
    this.showStructure = true;
    this.hideYellow = false;
    this.showLabels64 = true;
    this.auto4d = false;
    this.lockStatic = false;

    // UI 状态
    this.hudCollapsed = false;
    this.showDetail = true;

    // 三角位置缓存
    this.trigramPos = {};

    // 触摸状态
    this.pointers = new Map();
    this.pointerDown = null;
    this.pinchStart = null;

    // 初始化
    this._initTrigramPos();
    this._computePalaceBases();
    this._loadSettings();
    this._buildScene();

    // 绑定触摸事件
    this._bindEvents();

    // 开始渲染循环
    this._startRenderLoop();
  }

  // 工具函数
  _clamp(v, min, max) { return v < min ? min : (v > max ? max : v); }
  _clamp01(v) { return this._clamp(v, 0, 1); }
  _lerp(a, b, t) { return a + (b - a) * t; }

  _easeInOutCubic(t) {
    t = this._clamp01(t);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  _trigramIndex(bits) { return (parseInt(bits, 2) & 7) + 1; }
  _invertBits3(bits) { return bits.replace(/[01]/g, c => c === "0" ? "1" : "0"); }

  // 向量运算
  _vecAdd(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
  _vecSub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
  _vecScale(v, s) { return { x: v.x * s, y: v.y * s, z: v.z * s }; }
  _vecLength(v) { return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z); }
  _vecNorm(v) {
    const L = this._vecLength(v) || 1;
    return { x: v.x / L, y: v.y / L, z: v.z / L };
  }

  _keyOf(cubeId, x, y, z) { return cubeId + "|" + x + "," + y + "," + z; }

  // 初始化三角位置
  _initTrigramPos() {
    for (const bits of trigramBits) {
      const b0 = bits[0], b1 = bits[1], b2 = bits[2];
      const x = (b2 === "1") ? 1 : -1;
      const y = (b0 === "1") ? 1 : -1;
      const z = (b1 === "1") ? 1 : -1;
      this.trigramPos[bits] = { x, y, z };
    }
  }

  _neighborBitsForUp(bits) {
    const b0 = bits[0], b1 = bits[1], b2 = bits[2];
    const flipped = b1 === "0" ? "1" : "0";
    return "" + b0 + flipped + b2;
  }

  _basisForPalace(frontBits, backBits) {
    const pA = this.trigramPos[frontBits];
    const pB = this.trigramPos[backBits];
    const forward = this._vecNorm(this._vecSub(pB, pA));
    const qBits = this._neighborBitsForUp(frontBits);
    const q = this.trigramPos[qBits];
    let upCand = this._vecSub(q, pA);
    const projLen = (upCand.x * forward.x + upCand.y * forward.y + upCand.z * forward.z);
    upCand = { x: upCand.x - forward.x * projLen, y: upCand.y - forward.y * projLen, z: upCand.z - forward.z * projLen };
    const up = this._vecNorm(upCand);
    let right = { x: up.y * forward.z - up.z * forward.y, y: up.z * forward.x - up.x * forward.z, z: up.x * forward.y - up.y * forward.x };
    right = this._vecNorm(right);
    return [
      right.x, right.y, right.z,
      up.x, up.y, up.z,
      forward.x, forward.y, forward.z
    ];
  }

  _computePalaceBases() {
    const pairs = {
      "乾": ["000", "111"],
      "坤": ["111", "000"],
      "兑": ["001", "110"],
      "艮": ["110", "001"],
      "离": ["010", "101"],
      "坎": ["101", "010"],
      "震": ["011", "100"],
      "巽": ["100", "011"]
    };
    this.palaceBases = {};
    for (const name in pairs) {
      const [f, b] = pairs[name];
      this.palaceBases[name] = this._basisForPalace(f, b);
    }
  }

  _applyPalaceMat(p) {
    if (this.mode !== "bagua" || !this.palaceMat) return p;
    const m = this.palaceMat;
    return {
      x: m[0] * p.x + m[1] * p.y + m[2] * p.z,
      y: m[3] * p.x + m[4] * p.y + m[5] * p.z,
      z: m[6] * p.x + m[7] * p.y + m[8] * p.z
    };
  }

  _rotPlane(v, i, j, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const a = v[i], b = v[j];
    v[i] = a * c - b * s;
    v[j] = a * s + b * c;
  }

  _rotate4D(base4) {
    const v = [base4.x, base4.y, base4.z, base4.w];
    this._rotPlane(v, 0, 3, this.aXW);
    this._rotPlane(v, 1, 3, this.aYW);
    this._rotPlane(v, 1, 2, this.aYZ);
    return v;
  }

  _project4Dto3D(v4) {
    const w = v4[3];
    const f = this.W_DIST / (this.W_DIST - w);
    return { x: v4[0] * f, y: v4[1] * f, z: v4[2] * f };
  }

  _rotate3D(p) {
    let v = p;
    if (this.mode === "bagua") v = this._applyPalaceMat(p);
    let x = v.x * this.zoom;
    let y = v.y * this.zoom;
    let z = v.z * this.zoom;

    const cy = Math.cos(this.rotY), sy = Math.sin(this.rotY);
    let x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    const cx = Math.cos(this.rotX), sx = Math.sin(this.rotX);
    let y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
    const cz = Math.cos(this.rotZ), sz = Math.sin(this.rotZ);
    let x3 = x1 * cz - y2 * sz, y3 = x1 * sz + y2 * cz;
    return { x: x3, y: y3, z: z2 };
  }

  _boundAbs() {
    if (this.mode === "hex64") {
      const folded = 3.2, unfolded = 6.2;
      return this._lerp(folded, unfolded, this.unfold);
    }
    return this.sceneMaxAbs;
  }

  _getOrthoScale() {
    return 0.42 * Math.min(this.W, this.H) / Math.max(1e-6, this._boundAbs());
  }

  _project(p3) {
    const pr = this._rotate3D(p3);
    if (this.projMode === "ortho") {
      const s = this._getOrthoScale();
      return { x: pr.x * s + this.W / 2, y: -pr.y * s + this.H / 2, z: pr.z, k: s };
    } else {
      const cameraDist = this._boundAbs() * 4.2 + 2.0;
      const fov = Math.min(this.W, this.H) * 1.25;
      const z = pr.z + cameraDist;
      const k = fov / z;
      return { x: pr.x * k + this.W / 2, y: -pr.y * k + this.H / 2, z, k };
    }
  }

  _hitTest(px, py, projCache) {
    let best = null, bestD2 = Infinity;
    for (const v of this.vertices) {
      if (!v.pickable) continue;
      const p = projCache.get(v.key);
      if (!p) continue;
      const r = Math.max(9, 12 * (p.k / 150));
      const dx = px - p.x, dy = py - p.y, d2 = dx * dx + dy * dy;
      if (d2 < r * r && d2 < bestD2) { bestD2 = d2; best = v.key; }
    }
    return best;
  }

  _worldPosCube(cube, xBit, yBit, zBit) {
    const bx = cube.ax.x.mirror ? (1 - xBit) : xBit;
    const by = cube.ax.y.mirror ? (1 - yBit) : yBit;
    const bz = cube.ax.z.mirror ? (1 - zBit) : zBit;
    return {
      x: cube.ax.x.base + 2 * bx,
      y: cube.ax.y.base + 2 * by,
      z: cube.ax.z.base + 2 * bz
    };
  }

  _makeCubeInstance({ id, axisBase = { x: -1, y: -1, z: -1 }, axisMirror = { x: false, y: false, z: false }, showLabels = true, pickable = true }) {
    return {
      id, showLabels, pickable,
      ax: {
        x: { base: axisBase.x, mirror: !!axisMirror.x },
        y: { base: axisBase.y, mirror: !!axisMirror.y },
        z: { base: axisBase.z, mirror: !!axisMirror.z }
      }
    };
  }

  _buildSceneBagua() {
    this.vertices = [];
    this.edges = [];
    this.vByKey.clear();
    this.sceneMaxAbs = 1;
    const cubes = [];
    const base = this._makeCubeInstance({ id: "B", showLabels: true, pickable: true });
    cubes.push(base);

    const mirrorCfgs = [
      { on: this.mirrors.mxp, id: "Mx+", axis: "x", base: 1, mirror: true },
      { on: this.mirrors.mxn, id: "Mx-", axis: "x", base: -3, mirror: true },
      { on: this.mirrors.myp, id: "My+", axis: "y", base: 1, mirror: true },
      { on: this.mirrors.myn, id: "My-", axis: "y", base: -3, mirror: true },
      { on: this.mirrors.mzp, id: "Mz+", axis: "z", base: 1, mirror: true },
      { on: this.mirrors.mzn, id: "Mz-", axis: "z", base: -3, mirror: true }
    ];
    for (const m of mirrorCfgs) {
      if (!m.on) continue;
      const axisBase = { x: -1, y: -1, z: -1 };
      const axisMirror = { x: false, y: false, z: false };
      axisBase[m.axis] = m.base;
      axisMirror[m.axis] = true;
      cubes.push(this._makeCubeInstance({ id: m.id, axisBase, axisMirror, showLabels: false, pickable: false }));
    }

    for (const cube of cubes) {
      for (let x = 0; x <= 1; x++)
        for (let y = 0; y <= 1; y++)
          for (let z = 0; z <= 1; z++) {
            const bits = "" + y + z + x;
            const w = this._worldPosCube(cube, x, y, z);
            const key = this._keyOf(cube.id, x, y, z);
            const v = {
              key, mode: "bagua", cubeId: cube.id,
              role: "bagua", pickable: cube.pickable, showLabel: cube.showLabels,
              local: { x, y, z }, bits, name: bitsToName[bits], world: w
            };
            this.vertices.push(v);
            this.vByKey.set(key, v);
            this.sceneMaxAbs = Math.max(this.sceneMaxAbs, Math.abs(w.x), Math.abs(w.y), Math.abs(w.z));
          }

      for (let y = 0; y <= 1; y++) for (let z = 0; z <= 1; z++)
        this.edges.push({ type: "edge8", cubeId: cube.id, val: y, a: this._keyOf(cube.id, 0, y, z), b: this._keyOf(cube.id, 1, y, z) });
      for (let x = 0; x <= 1; x++) for (let z = 0; z <= 1; z++)
        this.edges.push({ type: "edge8", cubeId: cube.id, val: z, a: this._keyOf(cube.id, x, 0, z), b: this._keyOf(cube.id, x, 1, z) });
      for (let x = 0; x <= 1; x++) for (let y = 0; y <= 1; y++)
        this.edges.push({ type: "edge8", cubeId: cube.id, val: x, a: this._keyOf(cube.id, x, y, 0), b: this._keyOf(cube.id, x, y, 1) });
    }
  }

  _buildSceneHex64() {
    this.vertices = [];
    this.edges = [];
    this.vByKey.clear();
    this.sceneMaxAbs = 6.0;
    const roles = [{ role: "real", w: +1 }, { role: "true", w: -1 }];

    for (const R of roles) {
      for (let x = 0; x <= 1; x++)
        for (let y = 0; y <= 1; y++)
          for (let z = 0; z <= 1; z++) {
            const coordBits = "" + y + z + x;
            const bits = (R.role === "real") ? coordBits : this._invertBits3(coordBits);
            const key = `${R.role}|${x},${y},${z}`;
            const base4 = { x: x ? 1 : -1, y: y ? 1 : -1, z: z ? 1 : -1, w: R.w };
            const v = {
              key, mode: "hex64", role: R.role, pickable: true, showLabel: true,
              local: { x, y, z }, coordBits, bits, name: bitsToName[bits], base4
            };
            this.vertices.push(v);
            this.vByKey.set(key, v);
          }
    }

    const addStruct = (role) => {
      for (let y = 0; y <= 1; y++) for (let z = 0; z <= 1; z++)
        this.edges.push({ type: "edge64", role, val: y, a: `${role}|0,${y},${z}`, b: `${role}|1,${y},${z}` });
      for (let x = 0; x <= 1; x++) for (let z = 0; z <= 1; z++)
        this.edges.push({ type: "edge64", role, val: z, a: `${role}|${x},0,${z}`, b: `${role}|${x},1,${z}` });
      for (let x = 0; x <= 1; x++) for (let y = 0; y <= 1; y++)
        this.edges.push({ type: "edge64", role, val: x, a: `${role}|${x},${y},0`, b: `${role}|${x},${y},1` });
    };
    addStruct("real");
    addStruct("true");

    for (let x = 0; x <= 1; x++)
      for (let y = 0; y <= 1; y++)
        for (let z = 0; z <= 1; z++)
          this.edges.push({ type: "wlink", a: `real|${x},${y},${z}`, b: `true|${x},${y},${z}` });
  }

  _applyStaticLayoutIfNeeded() {
    if (this.mode === "hex64" && this.lockStatic) {
      this.projMode = "ortho";
      this.unfold = this.unfoldTarget = 1;
      this.rotX = 0;
      this.rotY = 0;
      this.rotZ = 0;
      this.auto4d = false;
    }
  }

  _buildScene() {
    this.selKey = null;
    if (this.mode === "bagua") this._buildSceneBagua();
    else this._buildSceneHex64();

    this._applyStaticLayoutIfNeeded();
  }

  // 保存设置
  _saveSettings() {
    try {
      const data = {
        hudCollapsed: this.hudCollapsed,
        mode: this.mode,
        projMode: this.projMode,
        rot: { x: this.rotX, y: this.rotY, z: this.rotZ },
        zoom: this.zoom,
        currentPalace: this.currentPalace,
        mirrors: this.mirrors,
        hex: {
          showHexNet: this.showHexNet,
          showStructure: this.showStructure,
          hideYellow: this.hideYellow,
          showLabels64: this.showLabels64,
          auto4d: this.auto4d,
          lockStatic: this.lockStatic
        },
        unfoldTarget: this.unfoldTarget
      };
      wx.setStorageSync(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Save settings error:', e);
    }
  }

  // 加载设置
  _loadSettings() {
    try {
      const raw = wx.getStorageSync(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);

      if (typeof data.mode === "string") this.mode = data.mode;
      if (typeof data.projMode === "string") this.projMode = data.projMode;
      if (data.rot) {
        if (typeof data.rot.x === "number") this.rotX = data.rot.x;
        if (typeof data.rot.y === "number") this.rotY = data.rot.y;
        if (typeof data.rot.z === "number") this.rotZ = data.rot.z;
      }
      if (typeof data.zoom === "number") this.zoom = data.zoom;
      if ("currentPalace" in data) this.currentPalace = data.currentPalace;

      if (data.mirrors) {
        this.mirrors = { ...this.mirrors, ...data.mirrors };
      }
      if (data.hex) {
        this.showHexNet = !!data.hex.showHexNet;
        this.showStructure = !!data.hex.showStructure;
        this.hideYellow = !!data.hex.hideYellow;
        this.showLabels64 = !!data.hex.showLabels64;
        this.auto4d = !!data.hex.auto4d;
        this.lockStatic = !!data.hex.lockStatic;
      }
      if (typeof data.unfoldTarget === "number") {
        this.unfoldTarget = this._clamp01(data.unfoldTarget);
        this.unfold = this.unfoldTarget;
      }
      if (data.hudCollapsed) this.hudCollapsed = true;

      // 设置宫
      if (!this.currentPalace) this.currentPalace = "乾";
      this._setPalace(this.currentPalace, false);

      return true;
    } catch (e) {
      return false;
    }
  }

  // 视角控制
  _snapHexViewFor64() {
    this.rotY = -Math.PI / 4;
    this.rotX = Math.atan(1 / Math.sqrt(2));
    this.rotZ = Math.PI;
  }

  _resetView() {
    this.projMode = "ortho";
    this.zoom = (this.mode === "hex64") ? 1.05 : 1.12;
    if (this.mode === "hex64") this._snapHexViewFor64();
    else { this.rotX = this.rotY = 0; this.rotZ = Math.PI; }
    this._saveSettings();
  }

  _toggleFlip() {
    const zNorm = ((this.rotZ % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    this.rotZ = (Math.abs(zNorm) < 1e-3) ? Math.PI : 0;
    this._saveSettings();
  }

  _startUnfold(to) {
    this.unfoldTarget = to;
    this.unfoldAnim = { start: Date.now(), from: this.unfold, to, dur: this.UNFOLD_DUR };
    this._saveSettings();
  }

  _toggleUnfold() {
    if (this.mode !== "hex64") return;
    const to = (this.unfoldTarget > 0.5 || this.unfold > 0.5) ? 0 : 1;
    this._startUnfold(to);
  }

  _setPalace(name, resetRot = true) {
    if (!name) {
      this.currentPalace = null;
      this.palaceMat = this.ID_MAT.slice();
    } else {
      this.currentPalace = name;
      this.palaceMat = this.palaceBases[name] || this.ID_MAT.slice();
    }
    if (resetRot) {
      this.rotX = this.rotY = 0;
      this.rotZ = Math.PI;
    }
    this._saveSettings();
  }

  // 获取网格布局
  _getNetLayout(pos3ByKey) {
    if (this.mode !== "hex64") return null;
    const p000 = pos3ByKey.get("real|0,0,0");
    const p100 = pos3ByKey.get("real|1,0,0");
    const p010 = pos3ByKey.get("real|0,1,0");
    const p001 = pos3ByKey.get("real|0,0,1");
    if (!p000 || !p100 || !p010 || !p001) return null;
    const vx = this._vecSub(p100, p000);
    const vy = this._vecSub(p010, p000);
    const vz = this._vecSub(p001, p000);
    const lx = this._vecLength(vx), ly = this._vecLength(vy), lz = this._vecLength(vz);
    const ux = this._vecScale(vx, 1 / (lx || 1));
    const uy = this._vecScale(vy, 1 / (ly || 1));
    const uz = this._vecScale(vz, 1 / (lz || 1));
    const edge = (lx + ly + lz) / 3 || 1;
    const mag = edge * 2.1 * this.unfold;
    return { p000, ux, uy, uz, edge, mag };
  }

  // 绘制网格立方体
  _drawNetCubes(pos3ByKey) {
    if (!this.showStructure) return;
    if (this.unfold <= 0.001) return;
    const layout = this._getNetLayout(pos3ByKey);
    if (!layout) return;
    const { ux, uy, uz, mag } = layout;
    const shifts = [
      this._vecScale(ux, mag),
      this._vecScale(ux, -mag),
      this._vecScale(uy, mag),
      this._vecScale(uy, -mag),
      this._vecScale(uz, mag),
      this._vecScale(uz, -mag)
    ];
    const ctx = this.ctx;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.NETCUBE;
    ctx.globalAlpha = 0.45 + 0.35 * this.unfold;
    for (const s of shifts) {
      for (const e of this.edges) {
        if (e.type !== "edge64" || e.role !== "real") continue;
        const pa = pos3ByKey.get(e.a);
        const pb = pos3ByKey.get(e.b);
        if (!pa || !pb) continue;
        const pa2 = this._vecAdd(pa, s);
        const pb2 = this._vecAdd(pb, s);
        const Pa = this._project(pa2);
        const Pb = this._project(pb2);
        ctx.beginPath();
        ctx.moveTo(Pa.x, Pa.y);
        ctx.lineTo(Pb.x, Pb.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 绘制64卦网格线
  _drawHexNetLines(pos3ByKey) {
    if (!this.showHexNet) return;
    const layout = this._getNetLayout(pos3ByKey);
    if (!layout) return;
    const { ux, uy, uz, mag } = layout;
    const shifts = [
      this._vecScale(ux, mag),
      this._vecScale(ux, -mag),
      this._vecScale(uy, mag),
      this._vecScale(uy, -mag),
      this._vecScale(uz, mag),
      this._vecScale(uz, -mag)
    ];

    const ctx = this.ctx;
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = COLORS.NET;
    ctx.globalAlpha = 0.85;

    const qSources = this.vertices.filter(v => v.mode === "hex64" && v.role === "true");
    for (const v of qSources) {
      const src3 = pos3ByKey.get(v.key);
      if (!src3) continue;
      const pSrc2D = this._project(src3);

      const kunKey = "real|" + v.local.x + "," + v.local.y + "," + v.local.z;
      const baseKun3 = pos3ByKey.get(kunKey);
      if (!baseKun3) continue;

      const pKun2D = this._project(baseKun3);
      ctx.beginPath();
      ctx.moveTo(pSrc2D.x, pSrc2D.y);
      ctx.lineTo(pKun2D.x, pKun2D.y);
      ctx.stroke();

      for (const s of shifts) {
        const tgt3 = this._vecAdd(baseKun3, s);
        const pTgt2D = this._project(tgt3);
        ctx.beginPath();
        ctx.moveTo(pSrc2D.x, pSrc2D.y);
        ctx.lineTo(pTgt2D.x, pTgt2D.y);
        ctx.stroke();
      }
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  // 绑定触摸事件
  _bindEvents() {
    wx.onTouchStart(e => {
      for (const touch of e.changedTouches) {
        this.pointers.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
      }
      if (e.touches.length === 1) {
        this.pointerDown = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
      }
      if (this.pointers.size === 2) {
        const pts = [...this.pointers.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        this.pinchStart = { dist, zoom: this.zoom };
      }
    });

    wx.onTouchMove(e => {
      for (const touch of e.changedTouches) {
        if (!this.pointers.has(touch.identifier)) continue;
        const prev = this.pointers.get(touch.identifier);
        this.pointers.set(touch.identifier, { x: touch.clientX, y: touch.clientY });

        if (this.pointers.size === 1) {
          if (this.mode === "hex64" && this.lockStatic) continue;
          const dx = touch.clientX - prev.x, dy = touch.clientY - prev.y;
          this.rotY += dx * 0.008;
          this.rotX += dy * 0.008;
        } else if (this.pointers.size === 2 && this.pinchStart) {
          const pts = [...this.pointers.values()];
          const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          const factor = dist / this.pinchStart.dist;
          this.zoom = this._clamp(this.pinchStart.zoom * factor, 0.55, 3.2);
        }
      }
    });

    wx.onTouchEnd(e => {
      for (const touch of e.changedTouches) {
        this.pointers.delete(touch.identifier);
      }
      if (this.pointers.size < 2) this.pinchStart = null;

      if (!this.pointerDown) return;
      const touch = e.changedTouches[0];
      if (!touch) { this.pointerDown = null; return; }

      const dx = touch.clientX - this.pointerDown.x, dy = touch.clientY - this.pointerDown.y;
      const dt = Date.now() - this.pointerDown.t;
      this.pointerDown = null;

      if (dt < 350 && (dx * dx + dy * dy) < 16 * 16) {
        const pc = this.lastProjCache;
        if (!pc) return;
        const hit = this._hitTest(touch.clientX, touch.clientY, pc);
        if (hit) {
          this.selKey = (this.selKey === hit) ? null : hit;
          this._saveSettings();
        }
      } else {
        this._saveSettings();
      }
    });
  }

  // 渲染循环
  _startRenderLoop() {
    const loop = (ts) => {
      this._render(ts);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // 主渲染函数
  _render(ts) {
    const ctx = this.ctx;
    ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
    ctx.fillStyle = COLORS.BG;
    ctx.fillRect(0, 0, this.W, this.H);

    if (this.mode === "hex64") {
      if (this.lastTs == null) this.lastTs = ts;
      const dt = ts - this.lastTs;
      this.lastTs = ts;

      if (this.unfoldAnim) {
        const t = (Date.now() - this.unfoldAnim.start) / this.unfoldAnim.dur;
        const k = this._easeInOutCubic(t);
        this.unfold = this._lerp(this.unfoldAnim.from, this.unfoldAnim.to, k);
        if (t >= 1) { this.unfold = this.unfoldAnim.to; this.unfoldAnim = null; }
      }
      if (this.auto4d && !this.lockStatic) {
        this.aXW += dt * 0.00055;
        this.aYW += dt * 0.00035;
        this.aYZ += dt * 0.00045;
      }
    }

    const pos3ByKey = new Map();
    if (this.mode === "bagua") {
      for (const v of this.vertices) pos3ByKey.set(v.key, v.world);
    } else {
      for (const v of this.vertices) {
        const v4 = this._rotate4D(v.base4);
        const pFold = this._project4Dto3D(v4);
        const offsetY = (v.role === "true") ? this._lerp(0, -4, this.unfold) : 0;
        const p3 = { x: pFold.x, y: pFold.y + offsetY, z: pFold.z };
        pos3ByKey.set(v.key, p3);
      }
    }

    const projCache = new Map();
    for (const v of this.vertices) {
      const p3 = pos3ByKey.get(v.key);
      if (!p3) continue;
      projCache.set(v.key, this._project(p3));
    }
    this.lastProjCache = projCache;

    const showStructure = (this.mode === "hex64") ? this.showStructure : true;
    const hideYellow = (this.mode === "hex64") ? this.hideYellow : false;
    const showLabels64 = (this.mode === "hex64") ? this.showLabels64 : true;

    const drawableEdges = this.edges.filter(e => {
      if (this.mode === "bagua") return e.type === "edge8";
      if (e.type === "edge64" || e.type === "wlink") return showStructure;
      return false;
    });

    const edgesSorted = drawableEdges.map(e => {
      const pa = projCache.get(e.a), pb = projCache.get(e.b);
      const z = ((pa?.z ?? 1e9) + (pb?.z ?? 1e9)) / 2;
      return { e, pa, pb, z };
    }).sort((a, b) => b.z - a.z);

    const incident = (e) => this.selKey && (e.a === this.selKey || e.b === this.selKey);

    for (const it of edgesSorted) {
      const { e, pa, pb } = it;
      if (!pa || !pb) continue;
      const hi = incident(e);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);

      if (this.mode === "hex64" && e.type === "wlink") {
        ctx.setLineDash([10, 8]);
        ctx.lineWidth = hi ? 4.6 : 2.2;
        ctx.strokeStyle = hi ? COLORS.HI : COLORS.WLINK;
        ctx.stroke();
        ctx.setLineDash([]);
        continue;
      }

      ctx.lineWidth = hi ? 6.0 : 3.0;
      ctx.strokeStyle = hi ? COLORS.HI : (e.val === 0 ? COLORS.YANG : COLORS.YIN);
      ctx.stroke();
    }

    this._drawNetCubes(pos3ByKey);
    this._drawHexNetLines(pos3ByKey);

    const vertsSorted = this.vertices.map(v => ({ v, p: projCache.get(v.key) }))
      .filter(x => !!x.p).sort((a, b) => b.p.z - a.p.z);

    for (const { v, p } of vertsSorted) {
      const isSel = (this.selKey === v.key);
      const r = 7 + (p.k / 110);
      let fill = COLORS.NODE;
      if (this.mode === "bagua") {
        fill = isSel ? COLORS.HI : COLORS.NODE;
      } else {
        if (isSel) fill = COLORS.HI;
        else if (v.role === "true") fill = COLORS.TRUE;
        else fill = hideYellow ? COLORS.NEUTRAL : COLORS.REAL;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, isSel ? r * 1.25 : r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.globalAlpha = 0.92;
      ctx.fill();
      ctx.globalAlpha = 1;

      let showLabel = false;
      if (this.mode === "bagua") {
        showLabel = v.showLabel;
      } else {
        showLabel = showLabels64 || isSel;
        if (hideYellow && v.role === "real" && !isSel) showLabel = false;
      }
      if (showLabel) {
        ctx.fillStyle = COLORS.LABEL;
        ctx.font = "13px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(v.name + " " + v.bits, p.x, p.y - (isSel ? r * 1.6 : r * 1.25));
      }
    }

    if (this.mode === "hex64") {
      let cr = { x: 0, y: 0, z: 0 }, ct = { x: 0, y: 0, z: 0 }, nr = 0, nt = 0;
      for (const v of this.vertices) {
        const p3 = pos3ByKey.get(v.key);
        if (!p3) continue;
        if (v.role === "real") { cr = this._vecAdd(cr, p3); nr++; }
        else { ct = this._vecAdd(ct, p3); nt++; }
      }
      if (nr > 0 && nt > 0) {
        cr = this._vecScale(cr, 1 / nr);
        ct = this._vecScale(ct, 1 / nt);
        const pr = this._project(cr), pt = this._project(ct);
        ctx.fillStyle = "rgba(10,14,18,.9)";
        ctx.font = "13px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("坤宫(黄)", pr.x, pr.y);
        ctx.fillText("乾宫(蓝)", pt.x, pt.y);
      }
    }

    // 绘制 HUD
    this._drawHUD();
  }

  // 绘制 HUD
  _drawHUD() {
    const ctx = this.ctx;
    const padding = 10;
    const hudX = padding;
    const hudY = padding;
    const hudWidth = this.hudCollapsed ? 200 : Math.min(320, this.W - 20);
    const lineHeight = 22;

    // HUD 背景
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.56)";
    ctx.beginPath();

    if (this.hudCollapsed) {
      ctx.roundRect(hudX, hudY, hudWidth, 40, 14);
      ctx.fill();

      // 标题
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("八卦立方体", hudX + 12, hudY + 20);

      // 展开按钮
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("+", hudX + hudWidth - 12, hudY + 20);
    } else {
      const hudHeight = 280;
      ctx.roundRect(hudX, hudY, hudWidth, hudHeight, 14);
      ctx.fill();

      let y = hudY + 16;

      // 标题行
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("八卦立方体：8卦 / 64卦", hudX + 12, y);

      // 收起按钮
      ctx.font = "16px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("-", hudX + hudWidth - 12, y);

      y += lineHeight + 8;

      // 图例
      ctx.font = "12px sans-serif";
      ctx.textAlign = "left";

      // 浅色=阳爻
      ctx.fillStyle = COLORS.YANG;
      ctx.fillRect(hudX + 12, y, 12, 12);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.strokeRect(hudX + 12, y, 12, 12);
      ctx.fillStyle = "#fff";
      ctx.fillText("阳爻(0)", hudX + 28, y + 2);

      // 深色=阴爻
      ctx.fillStyle = COLORS.YIN;
      ctx.fillRect(hudX + 90, y, 12, 12);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.strokeRect(hudX + 90, y, 12, 12);
      ctx.fillStyle = "#fff";
      ctx.fillText("阴爻(1)", hudX + 106, y + 2);

      y += lineHeight;

      // 黄点=坤宫
      ctx.fillStyle = COLORS.REAL;
      ctx.fillRect(hudX + 12, y, 12, 12);
      ctx.fillStyle = "#fff";
      ctx.fillText("坤宫/本我", hudX + 28, y + 2);

      // 蓝点=乾宫
      ctx.fillStyle = COLORS.TRUE;
      ctx.fillRect(hudX + 110, y, 12, 12);
      ctx.fillStyle = "#fff";
      ctx.fillText("乾宫/真我", hudX + 126, y + 2);

      y += lineHeight + 10;

      // 模式状态
      ctx.fillStyle = "#fff";
      ctx.font = "12px sans-serif";
      const modeText = this.mode === "bagua" ? "8卦" : "64卦";
      const projText = this.projMode === "ortho" ? "正交" : "透视";
      ctx.fillText(`模式: ${modeText} | 投影: ${projText}`, hudX + 12, y);

      if (this.mode === "hex64") {
        y += lineHeight;
        ctx.fillText(`展开: ${Math.round(this.unfold * 100)}%`, hudX + 12, y);
      } else if (this.currentPalace) {
        y += lineHeight;
        ctx.fillText(`宫视角: ${this.currentPalace}宫`, hudX + 12, y);
      }

      y += lineHeight + 10;

      // 操作提示
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "11px sans-serif";
      ctx.fillText("拖拽旋转 | 双指缩放 | 点击查看", hudX + 12, y);

      y += lineHeight + 10;

      // 按钮区域
      this._drawButtons(hudX + 12, y, hudWidth - 24);

      // 选中详情
      if (this.selKey && this.showDetail) {
        this._drawDetail(hudX, hudY + 280 + 10, hudWidth);
      }
    }

    ctx.restore();

    // 保存按钮区域用于点击检测
    this.hudBounds = {
      x: hudX,
      y: hudY,
      width: hudWidth,
      height: this.hudCollapsed ? 40 : 280
    };
  }

  // 绘制按钮
  _drawButtons(x, y, width) {
    const ctx = this.ctx;
    const btnHeight = 28;
    const btnGap = 6;
    const btnWidth = (width - btnGap * 2) / 3;

    this.buttons = [];

    // 第一行按钮
    const row1 = [
      { text: "8卦", action: "mode8", active: this.mode === "bagua" },
      { text: "64卦", action: "mode64", active: this.mode === "hex64" },
      { text: this.mode === "hex64" ? (this.unfold > 0.5 ? "折叠" : "展开") : "展开", action: "unfold" }
    ];

    for (let i = 0; i < row1.length; i++) {
      const btn = row1[i];
      const bx = x + i * (btnWidth + btnGap);
      const by = y;

      ctx.fillStyle = btn.active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.10)";
      ctx.strokeStyle = btn.active ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, btnWidth, btnHeight, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(btn.text, bx + btnWidth / 2, by + btnHeight / 2);

      this.buttons.push({ x: bx, y: by, width: btnWidth, height: btnHeight, action: btn.action });
    }

    y += btnHeight + btnGap;

    // 第二行按钮
    const row2 = [
      { text: "正交", action: "ortho", active: this.projMode === "ortho" },
      { text: "透视", action: "persp", active: this.projMode === "persp" },
      { text: "重置", action: "reset" }
    ];

    for (let i = 0; i < row2.length; i++) {
      const btn = row2[i];
      const bx = x + i * (btnWidth + btnGap);
      const by = y;

      ctx.fillStyle = btn.active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.10)";
      ctx.strokeStyle = btn.active ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, btnWidth, btnHeight, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(btn.text, bx + btnWidth / 2, by + btnHeight / 2);

      this.buttons.push({ x: bx, y: by, width: btnWidth, height: btnHeight, action: btn.action });
    }

    y += btnHeight + btnGap;

    // 8卦模式下显示宫视角按钮
    if (this.mode === "bagua") {
      const palaces = ["乾", "坤", "兑", "艮", "离", "坎", "震", "巽"];
      const palaceBtnWidth = (width - btnGap * 3) / 4;

      for (let i = 0; i < 4; i++) {
        const palace = palaces[i];
        const bx = x + i * (palaceBtnWidth + btnGap);
        const by = y;
        const active = this.currentPalace === palace;

        ctx.fillStyle = active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.10)";
        ctx.strokeStyle = active ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.25)";
        ctx.beginPath();
        ctx.roundRect(bx, by, palaceBtnWidth, btnHeight, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.fillText(palace, bx + palaceBtnWidth / 2, by + btnHeight / 2);

        this.buttons.push({ x: bx, y: by, width: palaceBtnWidth, height: btnHeight, action: "palace", palace });
      }

      y += btnHeight + btnGap;

      for (let i = 0; i < 4; i++) {
        const palace = palaces[i + 4];
        const bx = x + i * (palaceBtnWidth + btnGap);
        const by = y;
        const active = this.currentPalace === palace;

        ctx.fillStyle = active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.10)";
        ctx.strokeStyle = active ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.25)";
        ctx.beginPath();
        ctx.roundRect(bx, by, palaceBtnWidth, btnHeight, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.fillText(palace, bx + palaceBtnWidth / 2, by + btnHeight / 2);

        this.buttons.push({ x: bx, y: by, width: palaceBtnWidth, height: btnHeight, action: "palace", palace });
      }
    }
  }

  // 绘制选中详情
  _drawDetail(x, y, width) {
    const ctx = this.ctx;
    const v = this.vByKey.get(this.selKey);
    if (!v) return;

    const height = 80;
    ctx.fillStyle = "rgba(0,0,0,0.56)";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 14);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    let ty = y + 12;

    if (this.mode === "bagua") {
      ctx.fillText(`选中: ${v.name} bits=${v.bits}`, x + 12, ty);
      ty += 18;
      ctx.fillText(`先天序: ${this._trigramIndex(v.bits)}`, x + 12, ty);
      ty += 18;
      ctx.fillText(`坐标: (${v.local.x},${v.local.y},${v.local.z})`, x + 12, ty);
    } else {
      const roleText = v.role === "real" ? "坤宫/本我(下卦)" : "乾宫/真我(上卦)";
      ctx.fillText(`选中: ${roleText}`, x + 12, ty);
      ty += 18;
      ctx.fillText(`卦: ${v.name} bits=${v.bits}`, x + 12, ty);
      ty += 18;
      ctx.fillText(`点击其他顶点查看64卦叠加`, x + 12, ty);
    }
  }

  // 处理点击
  handleTap(x, y) {
    // 检查是否点击了 HUD 区域
    if (this.hudBounds &&
      x >= this.hudBounds.x && x <= this.hudBounds.x + this.hudBounds.width &&
      y >= this.hudBounds.y && y <= this.hudBounds.y + this.hudBounds.height) {

      // 检查收起/展开按钮
      if (this.hudCollapsed) {
        // 点击任意位置展开
        this.hudCollapsed = false;
        this._saveSettings();
        return true;
      }

      // 检查收起按钮 (右上角)
      if (x >= this.hudBounds.x + this.hudBounds.width - 30 && y <= this.hudBounds.y + 40) {
        this.hudCollapsed = true;
        this._saveSettings();
        return true;
      }

      // 检查按钮点击
      if (this.buttons) {
        for (const btn of this.buttons) {
          if (x >= btn.x && x <= btn.x + btn.width &&
            y >= btn.y && y <= btn.y + btn.height) {
            this._handleButtonAction(btn);
            return true;
          }
        }
      }

      return true;
    }

    return false;
  }

  // 处理按钮动作
  _handleButtonAction(btn) {
    switch (btn.action) {
      case "mode8":
        this.mode = "bagua";
        this.rotX = this.rotY = 0;
        this.rotZ = Math.PI;
        this.unfold = this.unfoldTarget = 0;
        this.selKey = null;
        this._buildScene();
        break;
      case "mode64":
        this.mode = "hex64";
        this.selKey = null;
        this._buildScene();
        this._snapHexViewFor64();
        break;
      case "unfold":
        this._toggleUnfold();
        break;
      case "ortho":
        this.projMode = "ortho";
        break;
      case "persp":
        this.projMode = "persp";
        break;
      case "reset":
        this._resetView();
        break;
      case "palace":
        if (this.mode !== "bagua") this.mode = "bagua";
        this._setPalace(btn.palace);
        this._buildScene();
        break;
    }
    this._saveSettings();
  }

  // 公开方法
  setMode(mode) {
    if (mode === "bagua" || mode === "hex64") {
      this.mode = mode;
      this._buildScene();
      this._saveSettings();
    }
  }

  toggleHUD() {
    this.hudCollapsed = !this.hudCollapsed;
    this._saveSettings();
  }
}

module.exports = BaguaCube;
