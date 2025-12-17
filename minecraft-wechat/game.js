/**
 * Minecraft微信小游戏 - 主入口
 * 支持多人联机的3D方块世界
 */

// ============================================
// 方块类型定义
// ============================================
const BlockType = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  WOOD: 4,
  LEAVES: 5,
  SAND: 6,
  WATER: 7,
  GLASS: 8,
  BRICK: 9,
  COBBLESTONE: 10,
  PLANKS: 11,
  BEDROCK: 12
};

// ============================================
// Simplex噪声生成器
// ============================================
class SimplexNoise {
  constructor(seed) {
    this.seed = seed || Math.random();
    this.perm = new Uint8Array(512);
    this.gradP = new Array(512);

    const grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];

    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;

    let random = this.mulberry32(this.seed * 1000000);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }

    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.gradP[i] = grad3[this.perm[i] % 12];
    }
  }

  mulberry32(a) {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  dot2(g, x, y) {
    return g[0] * x + g[1] * y;
  }

  noise2D(x, y) {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;

    let n0, n1, n2;
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) n0 = 0;
    else { t0 *= t0; n0 = t0 * t0 * this.dot2(this.gradP[ii + this.perm[jj]], x0, y0); }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) n1 = 0;
    else { t1 *= t1; n1 = t1 * t1 * this.dot2(this.gradP[ii + i1 + this.perm[jj + j1]], x1, y1); }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) n2 = 0;
    else { t2 *= t2; n2 = t2 * t2 * this.dot2(this.gradP[ii + 1 + this.perm[jj + 1]], x2, y2); }

    return 70 * (n0 + n1 + n2);
  }
}

// ============================================
// Chunk类
// ============================================
class Chunk {
  constructor(x, y, z, size) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.size = size || 16;
    this.blocks = new Uint8Array(this.size * this.size * this.size);
    this.dirty = true;
  }

  getIndex(x, y, z) {
    return x + y * this.size + z * this.size * this.size;
  }

  getBlock(x, y, z) {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size || z < 0 || z >= this.size) {
      return BlockType.AIR;
    }
    return this.blocks[this.getIndex(x, y, z)];
  }

  getBlockSafe(x, y, z) {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size || z < 0 || z >= this.size) {
      return 0;
    }
    return this.blocks[this.getIndex(x, y, z)];
  }

  setBlock(x, y, z, type) {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size || z < 0 || z >= this.size) {
      return false;
    }
    this.blocks[this.getIndex(x, y, z)] = type;
    this.dirty = true;
    return true;
  }
}

// ============================================
// World类
// ============================================
class World {
  constructor(seed) {
    this.chunks = new Map();
    this.seed = seed || Date.now();
    this.noise = new SimplexNoise(this.seed);
    this.chunkSize = 16;
    this.seaLevel = 32;
    this.baseHeight = 30;
  }

  getChunkKey(cx, cy, cz) {
    return cx + ',' + cy + ',' + cz;
  }

  getChunk(cx, cy, cz) {
    return this.chunks.get(this.getChunkKey(cx, cy, cz));
  }

  getOrCreateChunk(cx, cy, cz) {
    const key = this.getChunkKey(cx, cy, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(cx, cy, cz, this.chunkSize);
      this.generateChunk(chunk);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  generateChunk(chunk) {
    const cx = chunk.x * this.chunkSize;
    const cy = chunk.y * this.chunkSize;
    const cz = chunk.z * this.chunkSize;

    for (let x = 0; x < this.chunkSize; x++) {
      for (let z = 0; z < this.chunkSize; z++) {
        const worldX = cx + x;
        const worldZ = cz + z;
        const height = this.getTerrainHeight(worldX, worldZ);

        for (let y = 0; y < this.chunkSize; y++) {
          const worldY = cy + y;
          let blockType = BlockType.AIR;

          if (worldY === 0) {
            blockType = BlockType.BEDROCK;
          } else if (worldY < height - 4) {
            blockType = BlockType.STONE;
          } else if (worldY < height - 1) {
            blockType = BlockType.DIRT;
          } else if (worldY < height) {
            blockType = worldY < this.seaLevel - 2 ? BlockType.SAND : BlockType.GRASS;
          } else if (worldY < this.seaLevel) {
            blockType = BlockType.WATER;
          }

          chunk.setBlock(x, y, z, blockType);
        }
      }
    }

    this.generateTrees(chunk);
  }

  getTerrainHeight(x, z) {
    let height = this.baseHeight;
    height += this.noise.noise2D(x * 0.01, z * 0.01) * 15;
    height += this.noise.noise2D(x * 0.05, z * 0.05) * 5;
    return Math.floor(height);
  }

  generateTrees(chunk) {
    const cx = chunk.x * this.chunkSize;
    const cz = chunk.z * this.chunkSize;
    const random = this.mulberry32(chunk.x * 73856093 ^ chunk.z * 19349663 ^ this.seed);

    for (let i = 0; i < 2; i++) {
      const x = Math.floor(random() * (this.chunkSize - 4)) + 2;
      const z = Math.floor(random() * (this.chunkSize - 4)) + 2;
      const height = this.getTerrainHeight(cx + x, cz + z);

      if (height > this.seaLevel && chunk.y === Math.floor(height / this.chunkSize)) {
        const localY = height % this.chunkSize;
        if (localY + 6 < this.chunkSize && localY > 0) {
          if (chunk.getBlock(x, localY - 1, z) === BlockType.GRASS) {
            this.placeTree(chunk, x, localY, z);
          }
        }
      }
    }
  }

  placeTree(chunk, x, y, z) {
    for (let i = 0; i < 4; i++) {
      if (y + i < this.chunkSize) chunk.setBlock(x, y + i, z, BlockType.WOOD);
    }
    const leafStart = y + 2;
    for (let dy = 0; dy < 3; dy++) {
      const radius = dy < 2 ? 2 : 1;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (dx === 0 && dz === 0 && dy < 2) continue;
          const lx = x + dx, ly = leafStart + dy, lz = z + dz;
          if (lx >= 0 && lx < this.chunkSize && ly >= 0 && ly < this.chunkSize && lz >= 0 && lz < this.chunkSize) {
            if (chunk.getBlock(lx, ly, lz) === BlockType.AIR) {
              chunk.setBlock(lx, ly, lz, BlockType.LEAVES);
            }
          }
        }
      }
    }
  }

  mulberry32(a) {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  getBlock(x, y, z) {
    const cx = Math.floor(x / this.chunkSize);
    const cy = Math.floor(y / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    const chunk = this.getChunk(cx, cy, cz);
    if (!chunk) return BlockType.AIR;

    const localX = ((x % this.chunkSize) + this.chunkSize) % this.chunkSize;
    const localY = ((y % this.chunkSize) + this.chunkSize) % this.chunkSize;
    const localZ = ((z % this.chunkSize) + this.chunkSize) % this.chunkSize;
    return chunk.getBlock(localX, localY, localZ);
  }

  setBlock(x, y, z, type) {
    const cx = Math.floor(x / this.chunkSize);
    const cy = Math.floor(y / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    const chunk = this.getOrCreateChunk(cx, cy, cz);

    const localX = ((x % this.chunkSize) + this.chunkSize) % this.chunkSize;
    const localY = ((y % this.chunkSize) + this.chunkSize) % this.chunkSize;
    const localZ = ((z % this.chunkSize) + this.chunkSize) % this.chunkSize;
    chunk.setBlock(localX, localY, localZ, type);
    return true;
  }

  getChunksAround(x, y, z, radius) {
    const cx = Math.floor(x / this.chunkSize);
    const cy = Math.floor(y / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    const chunks = [];

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          chunks.push(this.getOrCreateChunk(cx + dx, cy + dy, cz + dz));
        }
      }
    }
    return chunks;
  }

  raycast(origin, direction, maxDistance) {
    maxDistance = maxDistance || 10;
    const step = 0.1;
    let lastPos = null;

    for (let d = 0; d < maxDistance; d += step) {
      const px = origin.x + direction.x * d;
      const py = origin.y + direction.y * d;
      const pz = origin.z + direction.z * d;

      const blockX = Math.floor(px);
      const blockY = Math.floor(py);
      const blockZ = Math.floor(pz);
      const block = this.getBlock(blockX, blockY, blockZ);

      if (block !== BlockType.AIR && block !== BlockType.WATER) {
        return { hit: true, block, position: { x: blockX, y: blockY, z: blockZ }, lastPosition: lastPos };
      }
      lastPos = { x: blockX, y: blockY, z: blockZ };
    }
    return { hit: false };
  }

  getSpawnPoint() {
    const height = this.getTerrainHeight(0, 0);
    return { x: 0.5, y: height + 2, z: 0.5 };
  }
}

// ============================================
// Player类
// ============================================
class Player {
  constructor(world) {
    this.world = world;
    this.position = { x: 0, y: 50, z: 0 };
    this.rotation = { x: 0.3, y: 0 };  // 初始略微向下看
    this.velocity = { x: 0, y: 0, z: 0 };

    this.width = 0.6;
    this.height = 1.8;
    this.eyeHeight = 1.6;
    this.moveSpeed = 4.5;
    this.jumpForce = 8;
    this.gravity = 20;
    this.onGround = false;
    this.flying = false;

    this.input = { forward: false, backward: false, left: false, right: false, jump: false };

    this.inventory = { slots: [], selectedSlot: 0 };
    this.inventory.slots[0] = { type: BlockType.GRASS, count: 64 };
    this.inventory.slots[1] = { type: BlockType.DIRT, count: 64 };
    this.inventory.slots[2] = { type: BlockType.STONE, count: 64 };
    this.inventory.slots[3] = { type: BlockType.WOOD, count: 64 };
    this.inventory.slots[4] = { type: BlockType.PLANKS, count: 64 };
    this.inventory.slots[5] = { type: BlockType.GLASS, count: 64 };
    this.inventory.slots[6] = { type: BlockType.BRICK, count: 64 };
    this.inventory.slots[7] = { type: BlockType.SAND, count: 64 };
    this.inventory.slots[8] = { type: BlockType.COBBLESTONE, count: 64 };
  }

  update(dt) {
    const moveDir = { x: 0, z: 0 };

    if (this.input.forward) moveDir.z -= 1;
    if (this.input.backward) moveDir.z += 1;
    if (this.input.left) moveDir.x -= 1;
    if (this.input.right) moveDir.x += 1;

    if (moveDir.x !== 0 || moveDir.z !== 0) {
      const length = Math.sqrt(moveDir.x * moveDir.x + moveDir.z * moveDir.z);
      moveDir.x /= length;
      moveDir.z /= length;

      const cos = Math.cos(this.rotation.y);
      const sin = Math.sin(this.rotation.y);
      this.velocity.x = (moveDir.x * cos - moveDir.z * sin) * this.moveSpeed;
      this.velocity.z = (moveDir.x * sin + moveDir.z * cos) * this.moveSpeed;
    } else {
      this.velocity.x *= 0.8;
      this.velocity.z *= 0.8;
    }

    if (this.flying) {
      this.velocity.y = this.input.jump ? this.moveSpeed : 0;
    } else {
      this.velocity.y -= this.gravity * dt;
      if (this.input.jump && this.onGround) {
        this.velocity.y = this.jumpForce;
        this.onGround = false;
      }
    }

    this.velocity.y = Math.max(-50, this.velocity.y);
    this.moveWithCollision(dt);
  }

  moveWithCollision(dt) {
    let newX = this.position.x + this.velocity.x * dt;
    let newY = this.position.y + this.velocity.y * dt;
    let newZ = this.position.z + this.velocity.z * dt;

    if (this.checkCollision(newX, this.position.y, this.position.z)) {
      this.velocity.x = 0;
    } else {
      this.position.x = newX;
    }

    if (this.checkCollision(this.position.x, this.position.y, newZ)) {
      this.velocity.z = 0;
    } else {
      this.position.z = newZ;
    }

    this.onGround = false;
    if (this.checkCollision(this.position.x, newY, this.position.z)) {
      if (this.velocity.y < 0) this.onGround = true;
      this.velocity.y = 0;
    } else {
      this.position.y = newY;
    }

    if (this.position.y < -10) {
      const spawn = this.world.getSpawnPoint();
      this.position = spawn;
      this.velocity = { x: 0, y: 0, z: 0 };
    }
  }

  checkCollision(x, y, z) {
    const hw = this.width / 2;
    const corners = [
      [x - hw, y, z - hw], [x + hw, y, z - hw],
      [x - hw, y, z + hw], [x + hw, y, z + hw],
      [x - hw, y + this.height, z - hw], [x + hw, y + this.height, z - hw],
      [x - hw, y + this.height, z + hw], [x + hw, y + this.height, z + hw]
    ];

    for (const [cx, cy, cz] of corners) {
      const block = this.world.getBlock(Math.floor(cx), Math.floor(cy), Math.floor(cz));
      if (block !== BlockType.AIR && block !== BlockType.WATER) return true;
    }
    return false;
  }

  getEyePosition() {
    return { x: this.position.x, y: this.position.y + this.eyeHeight, z: this.position.z };
  }

  getLookDirection() {
    return {
      x: -Math.sin(this.rotation.y) * Math.cos(this.rotation.x),
      y: -Math.sin(this.rotation.x),
      z: -Math.cos(this.rotation.y) * Math.cos(this.rotation.x)
    };
  }

  placeBlock() {
    const result = this.world.raycast(this.getEyePosition(), this.getLookDirection(), 5);
    if (result.hit && result.lastPosition) {
      const item = this.inventory.slots[this.inventory.selectedSlot];
      if (item && item.count > 0) {
        const pos = result.lastPosition;
        this.world.setBlock(pos.x, pos.y, pos.z, item.type);
        item.count--;
        return { success: true, position: pos, type: item.type };
      }
    }
    return { success: false };
  }

  breakBlock() {
    const result = this.world.raycast(this.getEyePosition(), this.getLookDirection(), 5);
    if (result.hit && result.block !== BlockType.BEDROCK) {
      this.world.setBlock(result.position.x, result.position.y, result.position.z, BlockType.AIR);
      return { success: true, position: result.position };
    }
    return { success: false };
  }

  selectSlot(index) {
    if (index >= 0 && index < 9) this.inventory.selectedSlot = index;
  }
}

// ============================================
// WebGL渲染器
// ============================================
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl');
    if (!this.gl) {
      console.error('WebGL不支持');
      return;
    }

    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.CULL_FACE);

    this.projectionMatrix = this.createPerspectiveMatrix(70, canvas.width / canvas.height, 0.1, 1000);
    this.initShaders();
  }

  createPerspectiveMatrix(fov, aspect, near, far) {
    const f = 1.0 / Math.tan(fov * Math.PI / 360);
    const rangeInv = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, near * far * rangeInv * 2, 0
    ]);
  }

  createViewMatrix(position, rotation) {
    // 视图矩阵: 先平移到相机位置，再旋转
    const cx = Math.cos(-rotation.x), sx = Math.sin(-rotation.x);
    const cy = Math.cos(-rotation.y), sy = Math.sin(-rotation.y);

    // 先平移
    const tx = -position.x;
    const ty = -position.y;
    const tz = -position.z;

    // 构建组合矩阵: RotX * RotY * Trans
    // 这相当于先平移，再绕Y轴旋转，最后绕X轴旋转
    const m = new Float32Array(16);

    // 第一列
    m[0] = cy;
    m[1] = sx * sy;
    m[2] = -cx * sy;
    m[3] = 0;

    // 第二列
    m[4] = 0;
    m[5] = cx;
    m[6] = sx;
    m[7] = 0;

    // 第三列
    m[8] = sy;
    m[9] = -sx * cy;
    m[10] = cx * cy;
    m[11] = 0;

    // 第四列 (平移部分经过旋转变换)
    m[12] = cy * tx + sy * tz;
    m[13] = sx * sy * tx + cx * ty - sx * cy * tz;
    m[14] = -cx * sy * tx + sx * ty + cx * cy * tz;
    m[15] = 1;

    return m;
  }

  multiplyMatrices(a, b) {
    const r = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        r[i * 4 + j] = a[i * 4] * b[j] + a[i * 4 + 1] * b[4 + j] + a[i * 4 + 2] * b[8 + j] + a[i * 4 + 3] * b[12 + j];
      }
    }
    return r;
  }

  initShaders() {
    const vs = `
      attribute vec3 aPos;
      attribute vec3 aNormal;
      attribute float aBlock;
      uniform mat4 uProj;
      uniform mat4 uView;
      varying vec3 vNormal;
      varying float vBlock;
      varying vec3 vPos;
      void main() {
        gl_Position = uProj * uView * vec4(aPos, 1.0);
        vNormal = aNormal;
        vBlock = aBlock;
        vPos = aPos;
      }
    `;

    const fs = `
      precision mediump float;
      varying vec3 vNormal;
      varying float vBlock;
      varying vec3 vPos;

      void main() {
        vec3 color;
        if (vBlock < 1.5) color = vec3(0.3, 0.7, 0.2);
        else if (vBlock < 2.5) color = vec3(0.6, 0.4, 0.2);
        else if (vBlock < 3.5) color = vec3(0.5, 0.5, 0.5);
        else if (vBlock < 4.5) color = vec3(0.55, 0.35, 0.15);
        else if (vBlock < 5.5) color = vec3(0.2, 0.6, 0.1);
        else if (vBlock < 6.5) color = vec3(0.9, 0.85, 0.6);
        else if (vBlock < 7.5) color = vec3(0.2, 0.4, 0.8);
        else color = vec3(0.8, 0.8, 0.8);

        float light = max(dot(normalize(vNormal), normalize(vec3(0.5, 1.0, 0.3))), 0.4);
        color *= light;

        float fog = clamp((80.0 - length(vPos)) / 40.0, 0.0, 1.0);
        color = mix(vec3(0.6, 0.8, 1.0), color, fog);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const vShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    this.gl.shaderSource(vShader, vs);
    this.gl.compileShader(vShader);
    if (!this.gl.getShaderParameter(vShader, this.gl.COMPILE_STATUS)) {
      console.error('顶点着色器编译失败:', this.gl.getShaderInfoLog(vShader));
    }

    const fShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(fShader, fs);
    this.gl.compileShader(fShader);
    if (!this.gl.getShaderParameter(fShader, this.gl.COMPILE_STATUS)) {
      console.error('片段着色器编译失败:', this.gl.getShaderInfoLog(fShader));
    }

    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vShader);
    this.gl.attachShader(this.program, fShader);
    this.gl.linkProgram(this.program);
    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error('着色器程序链接失败:', this.gl.getProgramInfoLog(this.program));
    }
    this.gl.useProgram(this.program);
    console.log('主着色器初始化完成');

    this.aPos = this.gl.getAttribLocation(this.program, 'aPos');
    this.aNormal = this.gl.getAttribLocation(this.program, 'aNormal');
    this.aBlock = this.gl.getAttribLocation(this.program, 'aBlock');
    this.uProj = this.gl.getUniformLocation(this.program, 'uProj');
    this.uView = this.gl.getUniformLocation(this.program, 'uView');
  }

  createMesh(chunk) {
    const pos = [], norm = [], block = [], idx = [];
    let vc = 0;

    const faces = {
      top: { p: [[0,1,0],[1,1,0],[1,1,1],[0,1,1]], n: [0,1,0] },
      bottom: { p: [[0,0,1],[1,0,1],[1,0,0],[0,0,0]], n: [0,-1,0] },
      front: { p: [[0,0,1],[0,1,1],[1,1,1],[1,0,1]], n: [0,0,1] },
      back: { p: [[1,0,0],[1,1,0],[0,1,0],[0,0,0]], n: [0,0,-1] },
      left: { p: [[0,0,0],[0,1,0],[0,1,1],[0,0,1]], n: [-1,0,0] },
      right: { p: [[1,0,1],[1,1,1],[1,1,0],[1,0,0]], n: [1,0,0] }
    };

    const addFace = (x, y, z, face, b) => {
      const f = faces[face];
      for (const p of f.p) {
        pos.push(x + p[0], y + p[1], z + p[2]);
        norm.push(...f.n);
        block.push(b);
      }
      idx.push(vc, vc+1, vc+2, vc, vc+2, vc+3);
      vc += 4;
    };

    const s = chunk.size;
    for (let x = 0; x < s; x++) {
      for (let y = 0; y < s; y++) {
        for (let z = 0; z < s; z++) {
          const b = chunk.getBlock(x, y, z);
          if (b === 0) continue;
          const wx = chunk.x * s + x, wy = chunk.y * s + y, wz = chunk.z * s + z;
          if (!chunk.getBlockSafe(x, y+1, z)) addFace(wx, wy, wz, 'top', b);
          if (!chunk.getBlockSafe(x, y-1, z)) addFace(wx, wy, wz, 'bottom', b);
          if (!chunk.getBlockSafe(x, y, z+1)) addFace(wx, wy, wz, 'front', b);
          if (!chunk.getBlockSafe(x, y, z-1)) addFace(wx, wy, wz, 'back', b);
          if (!chunk.getBlockSafe(x-1, y, z)) addFace(wx, wy, wz, 'left', b);
          if (!chunk.getBlockSafe(x+1, y, z)) addFace(wx, wy, wz, 'right', b);
        }
      }
    }

    if (pos.length === 0) return null;

    const gl = this.gl;
    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);

    const normBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(norm), gl.STATIC_DRAW);

    const blockBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, blockBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(block), gl.STATIC_DRAW);

    const idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);

    return { pos: posBuf, norm: normBuf, block: blockBuf, idx: idxBuf, count: idx.length };
  }

  setCamera(position, rotation) {
    const view = this.createViewMatrix(position, rotation);
    this.gl.uniformMatrix4fv(this.uView, false, view);
  }

  renderMesh(mesh) {
    if (!mesh) return;
    const gl = this.gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pos);
    gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.aPos);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.norm);
    gl.vertexAttribPointer(this.aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.aNormal);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.block);
    gl.vertexAttribPointer(this.aBlock, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.aBlock);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.idx);
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
  }

  clear() {
    this.gl.clearColor(0.6, 0.8, 1.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.gl.uniformMatrix4fv(this.uProj, false, this.projectionMatrix);
  }

  deleteMesh(mesh) {
    if (!mesh) return;
    this.gl.deleteBuffer(mesh.pos);
    this.gl.deleteBuffer(mesh.norm);
    this.gl.deleteBuffer(mesh.block);
    this.gl.deleteBuffer(mesh.idx);
  }
}

// ============================================
// 游戏主类
// ============================================
class MinecraftGame {
  constructor() {
    this.canvas = null;
    this.ctx2d = null;
    this.renderer = null;
    this.world = null;
    this.player = null;
    this.chunkMeshes = new Map();
    this.lastTime = 0;
    this.running = false;
    this.state = 'lobby';

    this.joystick = { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 };
    this.lookTouch = null;
    this.lastLookX = 0;
    this.lastLookY = 0;

    this.screenWidth = 0;
    this.screenHeight = 0;

    this.init();
  }

  init() {
    const info = wx.getSystemInfoSync();
    this.screenWidth = info.windowWidth;
    this.screenHeight = info.windowHeight;
    this.pixelRatio = info.pixelRatio || 2;

    console.log('屏幕尺寸:', this.screenWidth, 'x', this.screenHeight, '像素比:', this.pixelRatio);

    // 创建主canvas - 使用WebGL
    this.canvas = wx.createCanvas();
    this.canvas.width = this.screenWidth * this.pixelRatio;
    this.canvas.height = this.screenHeight * this.pixelRatio;

    console.log('Canvas尺寸:', this.canvas.width, 'x', this.canvas.height);

    // 创建离屏2D canvas用于UI - 使用createOffscreenCanvas如果可用
    try {
      if (wx.createOffscreenCanvas) {
        this.uiCanvas = wx.createOffscreenCanvas({ type: '2d', width: this.canvas.width, height: this.canvas.height });
        this.ctx2d = this.uiCanvas.getContext('2d');
        console.log('使用OffscreenCanvas');
      } else {
        this.uiCanvas = wx.createCanvas();
        this.uiCanvas.width = this.canvas.width;
        this.uiCanvas.height = this.canvas.height;
        this.ctx2d = this.uiCanvas.getContext('2d');
        console.log('使用普通Canvas');
      }
    } catch (e) {
      console.log('OffscreenCanvas创建失败，使用普通Canvas:', e.message);
      this.uiCanvas = wx.createCanvas();
      this.uiCanvas.width = this.canvas.width;
      this.uiCanvas.height = this.canvas.height;
      this.ctx2d = this.uiCanvas.getContext('2d');
    }

    if (!this.ctx2d) {
      console.error('无法获取2D context');
    }

    // 初始化WebGL渲染器
    this.renderer = new Renderer(this.canvas);
    if (!this.renderer.gl) {
      console.error('WebGL初始化失败');
      return;
    }
    console.log('WebGL渲染器初始化完成');

    // 绑定触摸事件
    wx.onTouchStart(this.onTouchStart.bind(this));
    wx.onTouchMove(this.onTouchMove.bind(this));
    wx.onTouchEnd(this.onTouchEnd.bind(this));

    console.log('开始大厅循环');
    // 开始大厅循环
    this.lobbyLoop();
  }

  lobbyLoop() {
    if (this.state !== 'lobby') return;

    this.renderLobby();
    requestAnimationFrame(() => this.lobbyLoop());
  }

  renderLobby() {
    const gl = this.renderer.gl;
    gl.clearColor(0.1, 0.1, 0.18, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 使用2D canvas绘制UI，然后作为纹理显示
    const ctx = this.ctx2d;
    const w = this.uiCanvas.width;
    const h = this.uiCanvas.height;
    const s = w / this.screenWidth;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // 标题
    ctx.fillStyle = '#4af';
    ctx.font = `bold ${48 * s}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('方块世界', w / 2, 100 * s);

    ctx.fillStyle = 'white';
    ctx.font = `${20 * s}px Arial`;
    ctx.fillText('Minecraft风格小游戏', w / 2, 150 * s);

    // 按钮
    const btnW = 240 * s;
    const btnH = 50 * s;
    const btnX = w / 2 - btnW / 2;
    const btnY = h / 2 - btnH / 2;

    ctx.fillStyle = '#4a7';
    ctx.fillRect(btnX, btnY, btnW, btnH);

    ctx.fillStyle = 'white';
    ctx.font = `bold ${20 * s}px Arial`;
    ctx.fillText('开始游戏', w / 2, btnY + 32 * s);

    // 保存按钮位置（屏幕坐标）
    this.startButton = {
      x: this.screenWidth / 2 - 120,
      y: this.screenHeight / 2 - 25,
      w: 240,
      h: 50
    };

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `${14 * s}px Arial`;
    ctx.fillText('左侧摇杆移动 | 右侧滑动视角', w / 2, h - 60 * s);
    ctx.fillText('点击按钮操作方块', w / 2, h - 35 * s);

    // 将2D内容渲染为纹理
    this.renderUIToScreen();
  }

  renderUIToScreen() {
    const gl = this.renderer.gl;

    if (!this.uiTexture) {
      this.uiTexture = gl.createTexture();
      this.initUIShader();
    }

    gl.disable(gl.DEPTH_TEST);

    gl.bindTexture(gl.TEXTURE_2D, this.uiTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.uiCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.useProgram(this.uiProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.uiVB);
    gl.vertexAttribPointer(this.uiPosAttr, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(this.uiPosAttr);
    gl.vertexAttribPointer(this.uiTexAttr, 2, gl.FLOAT, false, 16, 8);
    gl.enableVertexAttribArray(this.uiTexAttr);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.uiTexture);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(this.renderer.program);
  }

  initUIShader() {
    const gl = this.renderer.gl;

    const vs = `
      attribute vec2 aPos;
      attribute vec2 aTex;
      varying vec2 vTex;
      void main() {
        gl_Position = vec4(aPos, 0.0, 1.0);
        vTex = aTex;
      }
    `;
    const fs = `
      precision mediump float;
      varying vec2 vTex;
      uniform sampler2D uTex;
      void main() {
        gl_FragColor = texture2D(uTex, vTex);
      }
    `;

    const vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, vs);
    gl.compileShader(vShader);
    if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
      console.error('UI顶点着色器编译失败:', gl.getShaderInfoLog(vShader));
    }

    const fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, fs);
    gl.compileShader(fShader);
    if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
      console.error('UI片段着色器编译失败:', gl.getShaderInfoLog(fShader));
    }

    this.uiProgram = gl.createProgram();
    gl.attachShader(this.uiProgram, vShader);
    gl.attachShader(this.uiProgram, fShader);
    gl.linkProgram(this.uiProgram);
    if (!gl.getProgramParameter(this.uiProgram, gl.LINK_STATUS)) {
      console.error('UI着色器程序链接失败:', gl.getProgramInfoLog(this.uiProgram));
    }
    console.log('UI着色器初始化完成');

    this.uiPosAttr = gl.getAttribLocation(this.uiProgram, 'aPos');
    this.uiTexAttr = gl.getAttribLocation(this.uiProgram, 'aTex');

    const verts = new Float32Array([-1,-1,0,1, 1,-1,1,1, -1,1,0,0, 1,1,1,0]);
    this.uiVB = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.uiVB);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  }

  startGame() {
    console.log('游戏开始!');
    this.state = 'playing';

    this.world = new World(Date.now());
    const spawn = this.world.getSpawnPoint();
    console.log('出生点:', spawn.x, spawn.y, spawn.z);

    this.player = new Player(this.world);
    this.player.position = { x: spawn.x, y: spawn.y, z: spawn.z };

    console.log('生成区块...');
    this.generateChunks();
    console.log('区块mesh数量:', this.chunkMeshes.size);

    this.running = true;
    this.lastTime = Date.now();
    console.log('开始游戏循环');
    this.gameLoop();
  }

  generateChunks() {
    const chunks = this.world.getChunksAround(
      this.player.position.x,
      this.player.position.y,
      this.player.position.z,
      2
    );
    for (const chunk of chunks) {
      this.updateMesh(chunk);
    }
  }

  updateMesh(chunk) {
    const key = this.world.getChunkKey(chunk.x, chunk.y, chunk.z);
    const old = this.chunkMeshes.get(key);
    if (old) this.renderer.deleteMesh(old);

    const mesh = this.renderer.createMesh(chunk);
    if (mesh) this.chunkMeshes.set(key, mesh);
    chunk.dirty = false;
  }

  gameLoop() {
    if (!this.running) return;

    const now = Date.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.update(dt);
    this.render();

    // 每60帧输出一次调试信息
    this.frameCount = (this.frameCount || 0) + 1;
    if (this.frameCount % 60 === 0) {
      console.log('GameLoop running, meshes:', this.chunkMeshes.size,
        'pos:', Math.floor(this.player.position.x), Math.floor(this.player.position.y), Math.floor(this.player.position.z));
    }

    requestAnimationFrame(() => this.gameLoop());
  }

  update(dt) {
    // 处理摇杆
    if (this.joystick.active) {
      const dx = this.joystick.currentX - this.joystick.startX;
      const dy = this.joystick.currentY - this.joystick.startY;
      this.player.input.forward = dy < -15;
      this.player.input.backward = dy > 15;
      this.player.input.left = dx < -15;
      this.player.input.right = dx > 15;
    } else {
      this.player.input.forward = false;
      this.player.input.backward = false;
      this.player.input.left = false;
      this.player.input.right = false;
    }

    this.player.update(dt);

    // 更新chunks
    const chunks = this.world.getChunksAround(
      this.player.position.x,
      this.player.position.y,
      this.player.position.z,
      2
    );
    for (const chunk of chunks) {
      if (chunk.dirty) this.updateMesh(chunk);
    }
  }

  render() {
    this.renderer.clear();
    this.renderer.setCamera(this.player.getEyePosition(), this.player.rotation);

    this.chunkMeshes.forEach(mesh => this.renderer.renderMesh(mesh));

    this.renderGameUI();
  }

  renderGameUI() {
    const ctx = this.ctx2d;
    const w = this.uiCanvas.width;
    const h = this.uiCanvas.height;
    const s = w / this.screenWidth;

    ctx.clearRect(0, 0, w, h);

    // 准星
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(w/2 - 10*s, h/2);
    ctx.lineTo(w/2 + 10*s, h/2);
    ctx.moveTo(w/2, h/2 - 10*s);
    ctx.lineTo(w/2, h/2 + 10*s);
    ctx.stroke();

    // 摇杆
    const jx = 100 * s;
    const jy = h - 140 * s;
    const jr = 60 * s;

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(jx, jy, jr, 0, Math.PI * 2);
    ctx.fill();

    let kx = jx, ky = jy;
    if (this.joystick.active) {
      const dx = (this.joystick.currentX - this.joystick.startX) * s;
      const dy = (this.joystick.currentY - this.joystick.startY) * s;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > 0) {
        const maxD = jr * 0.8;
        const clamped = Math.min(dist, maxD);
        kx += (dx / dist) * clamped;
        ky += (dy / dist) * clamped;
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(kx, ky, jr * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 按钮
    this.gameButtons = [];
    const btnSize = 60 * s;
    const margin = 20 * s;

    const buttons = [
      { x: w - btnSize - margin - 80*s, y: h - btnSize*2 - margin*2, label: '跳', action: 'jump' },
      { x: w - btnSize - margin, y: h - btnSize*2 - margin*2, label: '放', action: 'place' },
      { x: w - btnSize - margin - 40*s, y: h - btnSize - margin, label: '挖', action: 'break' }
    ];

    for (const b of buttons) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(b.x, b.y, btnSize, btnSize);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.strokeRect(b.x, b.y, btnSize, btnSize);
      ctx.fillStyle = 'white';
      ctx.font = `bold ${20*s}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x + btnSize/2, b.y + btnSize/2);

      // 转换为屏幕坐标
      this.gameButtons.push({
        x: b.x / s, y: b.y / s, w: btnSize / s, h: btnSize / s, action: b.action
      });
    }

    // 快捷栏
    const slotSize = 50 * s;
    const slotPad = 4 * s;
    const totalW = (slotSize + slotPad) * 9 - slotPad;
    const startX = (w - totalW) / 2;
    const startY = h - slotSize - 20 * s;

    const colors = {
      1: '#4a9f4a', 2: '#8b6c4a', 3: '#888', 4: '#8b6c4a',
      5: '#c8a870', 6: '#c8e8ff', 7: '#b86050', 8: '#e8d898', 9: '#707070'
    };

    for (let i = 0; i < 9; i++) {
      const x = startX + i * (slotSize + slotPad);
      ctx.fillStyle = i === this.player.inventory.selectedSlot ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
      ctx.fillRect(x, startY, slotSize, slotSize);
      ctx.strokeStyle = i === this.player.inventory.selectedSlot ? 'white' : 'rgba(255,255,255,0.3)';
      ctx.strokeRect(x, startY, slotSize, slotSize);

      const item = this.player.inventory.slots[i];
      if (item) {
        ctx.fillStyle = colors[item.type] || '#888';
        ctx.fillRect(x + 8*s, startY + 8*s, slotSize - 16*s, slotSize - 16*s);
      }
    }

    // 坐标
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(10*s, 10*s, 140*s, 50*s);
    ctx.fillStyle = 'white';
    ctx.font = `${12*s}px Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`X:${Math.floor(this.player.position.x)} Y:${Math.floor(this.player.position.y)} Z:${Math.floor(this.player.position.z)}`, 20*s, 25*s);

    // 渲染UI到屏幕
    const gl = this.renderer.gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.renderUIToScreen();
    gl.disable(gl.BLEND);
  }

  onTouchStart(e) {
    const touches = e.touches || e.changedTouches || [e];
    for (const touch of touches) {
      const x = touch.clientX || touch.x || 0;
      const y = touch.clientY || touch.y || 0;

      console.log('Touch:', x, y, 'State:', this.state);

      if (this.state === 'lobby') {
        const btn = this.startButton;
        console.log('按钮区域:', btn);
        if (btn && x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
          console.log('点击开始按钮!');
          this.startGame();
          return;
        }
        return;
      }

      // 游戏中 - 检查按钮
      if (this.gameButtons) {
        for (const btn of this.gameButtons) {
          if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
            if (btn.action === 'jump') {
              this.player.input.jump = true;
              setTimeout(() => this.player.input.jump = false, 100);
            } else if (btn.action === 'place') {
              const r = this.player.placeBlock();
              if (r.success) this.updateMeshAt(r.position);
            } else if (btn.action === 'break') {
              const r = this.player.breakBlock();
              if (r.success) this.updateMeshAt(r.position);
            }
            return;
          }
        }
      }

      // 快捷栏
      const slotSize = 50;
      const slotPad = 4;
      const totalW = (slotSize + slotPad) * 9 - slotPad;
      const startX = (this.screenWidth - totalW) / 2;
      const startY = this.screenHeight - slotSize - 20;

      if (y >= startY && y <= startY + slotSize && x >= startX && x <= startX + totalW) {
        const slot = Math.floor((x - startX) / (slotSize + slotPad));
        if (slot >= 0 && slot < 9) {
          this.player.selectSlot(slot);
          return;
        }
      }

      // 摇杆区域
      if (x < this.screenWidth / 3) {
        this.joystick.active = true;
        this.joystick.startX = x;
        this.joystick.startY = y;
        this.joystick.currentX = x;
        this.joystick.currentY = y;
      } else {
        this.lookTouch = touch.identifier;
        this.lastLookX = x;
        this.lastLookY = y;
      }
    }
  }

  onTouchMove(e) {
    if (this.state !== 'playing') return;

    const touches = e.touches || e.changedTouches || [e];
    for (const touch of touches) {
      const x = touch.clientX || touch.x || 0;
      const y = touch.clientY || touch.y || 0;

      if (this.joystick.active && x < this.screenWidth / 2) {
        this.joystick.currentX = x;
        this.joystick.currentY = y;
      }

      if (touch.identifier === this.lookTouch) {
        const dx = x - this.lastLookX;
        const dy = y - this.lastLookY;
        this.player.rotation.y += dx * 0.005;
        this.player.rotation.x = Math.max(-1.5, Math.min(1.5, this.player.rotation.x + dy * 0.005));
        this.lastLookX = x;
        this.lastLookY = y;
      }
    }
  }

  onTouchEnd(e) {
    let joyActive = false;
    let lookActive = false;

    const touches = e.touches || [];
    for (const touch of touches) {
      const x = touch.clientX || touch.x || 0;
      if (x < this.screenWidth / 3) joyActive = true;
      if (touch.identifier === this.lookTouch) lookActive = true;
    }

    if (!joyActive) this.joystick.active = false;
    if (!lookActive) this.lookTouch = null;
  }

  updateMeshAt(pos) {
    const cs = this.world.chunkSize;
    const cx = Math.floor(pos.x / cs);
    const cy = Math.floor(pos.y / cs);
    const cz = Math.floor(pos.z / cs);
    const chunk = this.world.getChunk(cx, cy, cz);
    if (chunk) this.updateMesh(chunk);
  }
}

// 启动
new MinecraftGame();
