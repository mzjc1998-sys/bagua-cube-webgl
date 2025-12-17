/**
 * Minecraft微信小游戏 - 主入口
 * 支持多人联机的3D方块世界
 *
 * 注意：微信小游戏不支持ES6模块，所有代码合并在此文件
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

const BlockNames = {
  [BlockType.AIR]: '空气',
  [BlockType.GRASS]: '草方块',
  [BlockType.DIRT]: '泥土',
  [BlockType.STONE]: '石头',
  [BlockType.WOOD]: '木头',
  [BlockType.LEAVES]: '树叶',
  [BlockType.SAND]: '沙子',
  [BlockType.WATER]: '水',
  [BlockType.GLASS]: '玻璃',
  [BlockType.BRICK]: '砖块',
  [BlockType.COBBLESTONE]: '圆石',
  [BlockType.PLANKS]: '木板',
  [BlockType.BEDROCK]: '基岩'
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
// Chunk类 - 16x16x16方块区域
// ============================================
class Chunk {
  constructor(x, y, z, size) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.size = size || 16;
    this.blocks = new Uint8Array(this.size * this.size * this.size);
    this.mesh = null;
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
// World类 - 世界管理
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
            if (worldY < this.seaLevel - 2) {
              blockType = BlockType.SAND;
            } else {
              blockType = BlockType.GRASS;
            }
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
    height += this.noise.noise2D(x * 0.1, z * 0.1) * 2;
    return Math.floor(height);
  }

  generateTrees(chunk) {
    const cx = chunk.x * this.chunkSize;
    const cz = chunk.z * this.chunkSize;
    const random = this.mulberry32(chunk.x * 73856093 ^ chunk.z * 19349663 ^ this.seed);

    for (let i = 0; i < 2; i++) {
      const x = Math.floor(random() * (this.chunkSize - 4)) + 2;
      const z = Math.floor(random() * (this.chunkSize - 4)) + 2;
      const worldX = cx + x;
      const worldZ = cz + z;
      const height = this.getTerrainHeight(worldX, worldZ);

      if (height > this.seaLevel && chunk.y === Math.floor(height / this.chunkSize)) {
        const localY = height % this.chunkSize;
        if (localY + 6 < this.chunkSize && localY > 0) {
          const blockBelow = chunk.getBlock(x, localY - 1, z);
          if (blockBelow === BlockType.GRASS || blockBelow === BlockType.DIRT) {
            this.placeTree(chunk, x, localY, z);
          }
        }
      }
    }
  }

  placeTree(chunk, x, y, z) {
    const trunkHeight = 4;
    for (let i = 0; i < trunkHeight; i++) {
      if (y + i < this.chunkSize) {
        chunk.setBlock(x, y + i, z, BlockType.WOOD);
      }
    }

    const leafStart = y + trunkHeight - 2;
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
          const chunk = this.getOrCreateChunk(cx + dx, cy + dy, cz + dz);
          chunks.push(chunk);
        }
      }
    }
    return chunks;
  }

  raycast(origin, direction, maxDistance) {
    maxDistance = maxDistance || 10;
    const step = 0.1;
    const pos = { x: origin.x, y: origin.y, z: origin.z };
    let lastPos = null;

    for (let d = 0; d < maxDistance; d += step) {
      pos.x = origin.x + direction.x * d;
      pos.y = origin.y + direction.y * d;
      pos.z = origin.z + direction.z * d;

      const blockX = Math.floor(pos.x);
      const blockY = Math.floor(pos.y);
      const blockZ = Math.floor(pos.z);
      const block = this.getBlock(blockX, blockY, blockZ);

      if (block !== BlockType.AIR && block !== BlockType.WATER) {
        return {
          hit: true,
          block: block,
          position: { x: blockX, y: blockY, z: blockZ },
          lastPosition: lastPos
        };
      }
      lastPos = { x: blockX, y: blockY, z: blockZ };
    }
    return { hit: false };
  }

  getSpawnPoint() {
    const x = 0, z = 0;
    const height = this.getTerrainHeight(x, z);
    return { x: x + 0.5, y: height + 2, z: z + 0.5 };
  }
}

// ============================================
// Player类 - 玩家控制
// ============================================
class Player {
  constructor(world, id) {
    this.world = world;
    this.id = id || (Math.random().toString(36).substring(2, 15));
    this.name = '玩家' + this.id.substring(0, 4);

    this.position = { x: 0, y: 50, z: 0 };
    this.rotation = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };

    this.width = 0.6;
    this.height = 1.8;
    this.eyeHeight = 1.6;

    this.moveSpeed = 4.5;
    this.jumpForce = 8;
    this.gravity = 20;
    this.friction = 10;

    this.onGround = false;
    this.flying = false;

    this.input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false
    };

    this.inventory = {
      slots: [],
      selectedSlot: 0
    };

    // 初始化背包
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
      const rotatedX = moveDir.x * cos - moveDir.z * sin;
      const rotatedZ = moveDir.x * sin + moveDir.z * cos;

      this.velocity.x = rotatedX * this.moveSpeed;
      this.velocity.z = rotatedZ * this.moveSpeed;
    } else {
      this.velocity.x *= Math.max(0, 1 - this.friction * dt);
      this.velocity.z *= Math.max(0, 1 - this.friction * dt);
    }

    if (this.flying) {
      if (this.input.jump) this.velocity.y = this.moveSpeed;
      else this.velocity.y = 0;
    } else {
      this.velocity.y -= this.gravity * dt;
      if (this.input.jump && this.onGround) {
        this.velocity.y = this.jumpForce;
        this.onGround = false;
      }
    }

    if (this.velocity.y < -50) this.velocity.y = -50;

    this.moveWithCollision(dt);
  }

  moveWithCollision(dt) {
    const newPos = {
      x: this.position.x + this.velocity.x * dt,
      y: this.position.y + this.velocity.y * dt,
      z: this.position.z + this.velocity.z * dt
    };

    if (this.checkCollision(newPos.x, this.position.y, this.position.z)) {
      this.velocity.x = 0;
    } else {
      this.position.x = newPos.x;
    }

    if (this.checkCollision(this.position.x, this.position.y, newPos.z)) {
      this.velocity.z = 0;
    } else {
      this.position.z = newPos.z;
    }

    this.onGround = false;
    if (this.checkCollision(this.position.x, newPos.y, this.position.z)) {
      if (this.velocity.y < 0) this.onGround = true;
      this.velocity.y = 0;
    } else {
      this.position.y = newPos.y;
    }

    if (this.position.y < -10) {
      const spawn = this.world.getSpawnPoint();
      this.position = spawn;
      this.velocity = { x: 0, y: 0, z: 0 };
    }
  }

  checkCollision(x, y, z) {
    const halfWidth = this.width / 2;
    const corners = [
      { x: x - halfWidth, y: y, z: z - halfWidth },
      { x: x + halfWidth, y: y, z: z - halfWidth },
      { x: x - halfWidth, y: y, z: z + halfWidth },
      { x: x + halfWidth, y: y, z: z + halfWidth },
      { x: x - halfWidth, y: y + this.height, z: z - halfWidth },
      { x: x + halfWidth, y: y + this.height, z: z - halfWidth },
      { x: x - halfWidth, y: y + this.height, z: z + halfWidth },
      { x: x + halfWidth, y: y + this.height, z: z + halfWidth }
    ];

    for (let i = 0; i < corners.length; i++) {
      const corner = corners[i];
      const block = this.world.getBlock(
        Math.floor(corner.x),
        Math.floor(corner.y),
        Math.floor(corner.z)
      );
      if (block !== BlockType.AIR && block !== BlockType.WATER) {
        return true;
      }
    }
    return false;
  }

  getEyePosition() {
    return {
      x: this.position.x,
      y: this.position.y + this.eyeHeight,
      z: this.position.z
    };
  }

  getLookDirection() {
    const pitch = this.rotation.x;
    const yaw = this.rotation.y;
    return {
      x: -Math.sin(yaw) * Math.cos(pitch),
      y: -Math.sin(pitch),
      z: -Math.cos(yaw) * Math.cos(pitch)
    };
  }

  placeBlock() {
    const eye = this.getEyePosition();
    const dir = this.getLookDirection();
    const result = this.world.raycast(eye, dir, 5);

    if (result.hit && result.lastPosition) {
      const selectedItem = this.inventory.slots[this.inventory.selectedSlot];
      if (selectedItem && selectedItem.count > 0) {
        const pos = result.lastPosition;
        this.world.setBlock(pos.x, pos.y, pos.z, selectedItem.type);
        selectedItem.count--;
        return { success: true, position: pos, type: selectedItem.type };
      }
    }
    return { success: false };
  }

  breakBlock() {
    const eye = this.getEyePosition();
    const dir = this.getLookDirection();
    const result = this.world.raycast(eye, dir, 5);

    if (result.hit) {
      const pos = result.position;
      if (result.block === BlockType.BEDROCK) return { success: false };

      this.world.setBlock(pos.x, pos.y, pos.z, BlockType.AIR);
      return { success: true, position: pos, type: result.block };
    }
    return { success: false };
  }

  selectSlot(index) {
    if (index >= 0 && index < this.inventory.slots.length) {
      this.inventory.selectedSlot = index;
    }
  }

  toggleFlying() {
    this.flying = !this.flying;
    if (this.flying) this.velocity.y = 0;
  }

  getTargetBlock() {
    const eye = this.getEyePosition();
    const dir = this.getLookDirection();
    return this.world.raycast(eye, dir, 5);
  }

  serialize() {
    return {
      id: this.id,
      name: this.name,
      position: this.position,
      rotation: this.rotation
    };
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

    this.viewMatrix = this.createIdentityMatrix();
    this.projectionMatrix = this.createPerspectiveMatrix(70, canvas.width / canvas.height, 0.1, 1000);

    this.initShaders();
  }

  createIdentityMatrix() {
    return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
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
    const cosX = Math.cos(rotation.x);
    const sinX = Math.sin(rotation.x);
    const cosY = Math.cos(rotation.y);
    const sinY = Math.sin(rotation.y);

    const rotX = new Float32Array([1,0,0,0, 0,cosX,sinX,0, 0,-sinX,cosX,0, 0,0,0,1]);
    const rotY = new Float32Array([cosY,0,-sinY,0, 0,1,0,0, sinY,0,cosY,0, 0,0,0,1]);
    const trans = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, -position.x,-position.y,-position.z,1]);

    return this.multiplyMatrices(this.multiplyMatrices(rotX, rotY), trans);
  }

  multiplyMatrices(a, b) {
    const result = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        result[i * 4 + j] = 0;
        for (let k = 0; k < 4; k++) {
          result[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j];
        }
      }
    }
    return result;
  }

  initShaders() {
    const vsSource = `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      attribute float aBlockType;
      uniform mat4 uProjection;
      uniform mat4 uView;
      varying vec3 vNormal;
      varying float vBlockType;
      varying vec3 vPosition;
      void main() {
        gl_Position = uProjection * uView * vec4(aPosition, 1.0);
        vNormal = aNormal;
        vBlockType = aBlockType;
        vPosition = aPosition;
      }
    `;

    const fsSource = `
      precision mediump float;
      varying vec3 vNormal;
      varying float vBlockType;
      varying vec3 vPosition;
      uniform vec3 uLightDir;

      void main() {
        vec3 baseColor;
        if (vBlockType < 0.5) baseColor = vec3(0.3, 0.7, 0.2);
        else if (vBlockType < 1.5) baseColor = vec3(0.3, 0.7, 0.2);
        else if (vBlockType < 2.5) baseColor = vec3(0.6, 0.4, 0.2);
        else if (vBlockType < 3.5) baseColor = vec3(0.5, 0.5, 0.5);
        else if (vBlockType < 4.5) baseColor = vec3(0.6, 0.4, 0.2);
        else if (vBlockType < 5.5) baseColor = vec3(0.2, 0.6, 0.1);
        else if (vBlockType < 6.5) baseColor = vec3(0.9, 0.85, 0.6);
        else if (vBlockType < 7.5) baseColor = vec3(0.2, 0.4, 0.8);
        else baseColor = vec3(0.8, 0.8, 0.8);

        vec3 normal = normalize(vNormal);
        float light = max(dot(normal, normalize(uLightDir)), 0.4);
        vec3 color = baseColor * light;

        float dist = length(vPosition);
        float fog = clamp((100.0 - dist) / 50.0, 0.0, 1.0);
        color = mix(vec3(0.6, 0.8, 1.0), color, fog);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const vertexShader = this.compileShader(vsSource, this.gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(fsSource, this.gl.FRAGMENT_SHADER);

    this.shaderProgram = this.gl.createProgram();
    this.gl.attachShader(this.shaderProgram, vertexShader);
    this.gl.attachShader(this.shaderProgram, fragmentShader);
    this.gl.linkProgram(this.shaderProgram);
    this.gl.useProgram(this.shaderProgram);

    this.attribs = {
      position: this.gl.getAttribLocation(this.shaderProgram, 'aPosition'),
      normal: this.gl.getAttribLocation(this.shaderProgram, 'aNormal'),
      blockType: this.gl.getAttribLocation(this.shaderProgram, 'aBlockType')
    };

    this.uniforms = {
      projection: this.gl.getUniformLocation(this.shaderProgram, 'uProjection'),
      view: this.gl.getUniformLocation(this.shaderProgram, 'uView'),
      lightDir: this.gl.getUniformLocation(this.shaderProgram, 'uLightDir')
    };

    this.gl.uniform3f(this.uniforms.lightDir, 0.5, 1.0, 0.3);
  }

  compileShader(source, type) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('着色器编译失败:', this.gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  createBlockMesh(chunk) {
    const positions = [];
    const normals = [];
    const blockTypes = [];
    const indices = [];
    let vertexCount = 0;

    const addFace = (x, y, z, face, blockType) => {
      const faceData = {
        top: { positions: [[0,1,0],[1,1,0],[1,1,1],[0,1,1]], normal: [0,1,0] },
        bottom: { positions: [[0,0,1],[1,0,1],[1,0,0],[0,0,0]], normal: [0,-1,0] },
        front: { positions: [[0,0,1],[0,1,1],[1,1,1],[1,0,1]], normal: [0,0,1] },
        back: { positions: [[1,0,0],[1,1,0],[0,1,0],[0,0,0]], normal: [0,0,-1] },
        left: { positions: [[0,0,0],[0,1,0],[0,1,1],[0,0,1]], normal: [-1,0,0] },
        right: { positions: [[1,0,1],[1,1,1],[1,1,0],[1,0,0]], normal: [1,0,0] }
      };

      const fd = faceData[face];
      for (let i = 0; i < fd.positions.length; i++) {
        const pos = fd.positions[i];
        positions.push(x + pos[0], y + pos[1], z + pos[2]);
        normals.push(fd.normal[0], fd.normal[1], fd.normal[2]);
        blockTypes.push(blockType);
      }

      indices.push(vertexCount, vertexCount + 1, vertexCount + 2);
      indices.push(vertexCount, vertexCount + 2, vertexCount + 3);
      vertexCount += 4;
    };

    const size = chunk.size;
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        for (let z = 0; z < size; z++) {
          const block = chunk.getBlock(x, y, z);
          if (block === 0) continue;

          const worldX = chunk.x * size + x;
          const worldY = chunk.y * size + y;
          const worldZ = chunk.z * size + z;

          if (!chunk.getBlockSafe(x, y + 1, z)) addFace(worldX, worldY, worldZ, 'top', block);
          if (!chunk.getBlockSafe(x, y - 1, z)) addFace(worldX, worldY, worldZ, 'bottom', block);
          if (!chunk.getBlockSafe(x, y, z + 1)) addFace(worldX, worldY, worldZ, 'front', block);
          if (!chunk.getBlockSafe(x, y, z - 1)) addFace(worldX, worldY, worldZ, 'back', block);
          if (!chunk.getBlockSafe(x - 1, y, z)) addFace(worldX, worldY, worldZ, 'left', block);
          if (!chunk.getBlockSafe(x + 1, y, z)) addFace(worldX, worldY, worldZ, 'right', block);
        }
      }
    }

    if (positions.length === 0) return null;

    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

    const normalBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, normalBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(normals), this.gl.STATIC_DRAW);

    const blockTypeBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, blockTypeBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(blockTypes), this.gl.STATIC_DRAW);

    const indexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);

    return {
      position: positionBuffer,
      normal: normalBuffer,
      blockType: blockTypeBuffer,
      indices: indexBuffer,
      indexCount: indices.length
    };
  }

  setViewMatrix(position, rotation) {
    this.viewMatrix = this.createViewMatrix(position, rotation);
    this.gl.uniformMatrix4fv(this.uniforms.view, false, this.viewMatrix);
  }

  renderChunk(mesh) {
    if (!mesh) return;
    const gl = this.gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.position);
    gl.vertexAttribPointer(this.attribs.position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.attribs.position);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normal);
    gl.vertexAttribPointer(this.attribs.normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.attribs.normal);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.blockType);
    gl.vertexAttribPointer(this.attribs.blockType, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.attribs.blockType);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices);
    gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
  }

  clear() {
    this.gl.clearColor(0.6, 0.8, 1.0, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.gl.uniformMatrix4fv(this.uniforms.projection, false, this.projectionMatrix);
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
    this.projectionMatrix = this.createPerspectiveMatrix(70, width / height, 0.1, 1000);
  }

  deleteMesh(mesh) {
    if (!mesh) return;
    this.gl.deleteBuffer(mesh.position);
    this.gl.deleteBuffer(mesh.normal);
    this.gl.deleteBuffer(mesh.blockType);
    this.gl.deleteBuffer(mesh.indices);
  }
}

// ============================================
// 游戏主类
// ============================================
class MinecraftGame {
  constructor() {
    this.canvas = null;
    this.renderer = null;
    this.world = null;
    this.player = null;

    this.chunkMeshes = new Map();
    this.lastTime = 0;
    this.running = false;
    this.state = 'lobby';

    // 触摸状态
    this.joystick = { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 };
    this.lookTouch = null;
    this.lastLookX = 0;
    this.lastLookY = 0;

    this.init();
  }

  init() {
    // 微信小游戏环境
    this.canvas = wx.createCanvas();
    const info = wx.getSystemInfoSync();
    this.canvas.width = info.windowWidth * info.pixelRatio;
    this.canvas.height = info.windowHeight * info.pixelRatio;

    this.screenWidth = info.windowWidth;
    this.screenHeight = info.windowHeight;
    this.pixelRatio = info.pixelRatio;

    // 初始化渲染器
    this.renderer = new Renderer(this.canvas);

    // 绑定触摸事件
    wx.onTouchStart(this.onTouchStart.bind(this));
    wx.onTouchMove(this.onTouchMove.bind(this));
    wx.onTouchEnd(this.onTouchEnd.bind(this));

    // 显示大厅
    this.showLobby();
  }

  showLobby() {
    this.state = 'lobby';
    this.renderLobby();
  }

  renderLobby() {
    const ctx = this.canvas.getContext('2d');
    const width = this.canvas.width;
    const height = this.canvas.height;
    const scale = this.pixelRatio;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#4af';
    ctx.font = `bold ${48 * scale}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('方块世界', width / 2, 100 * scale);

    ctx.fillStyle = 'white';
    ctx.font = `${20 * scale}px Arial`;
    ctx.fillText('Minecraft风格小游戏', width / 2, 150 * scale);

    // 按钮
    this.lobbyButtons = [];
    const btnWidth = 240 * scale;
    const btnHeight = 50 * scale;
    let btnY = height / 2 - 40 * scale;

    const buttons = [
      { label: '开始游戏', action: 'start' }
    ];

    for (const btn of buttons) {
      const button = {
        x: width / 2 - btnWidth / 2,
        y: btnY,
        width: btnWidth,
        height: btnHeight,
        label: btn.label,
        action: btn.action
      };
      this.lobbyButtons.push(button);

      ctx.fillStyle = '#4a7';
      ctx.fillRect(button.x, button.y, button.width, button.height);

      ctx.fillStyle = 'white';
      ctx.font = `bold ${20 * scale}px Arial`;
      ctx.fillText(btn.label, width / 2, btnY + 32 * scale);

      btnY += btnHeight + 20 * scale;
    }

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `${14 * scale}px Arial`;
    ctx.fillText('左侧摇杆移动 | 右侧滑动视角', width / 2, height - 60 * scale);
    ctx.fillText('点击放/挖按钮操作方块', width / 2, height - 35 * scale);
  }

  startGame() {
    console.log('开始游戏');
    this.state = 'playing';

    this.world = new World(Date.now());
    const spawn = this.world.getSpawnPoint();

    this.player = new Player(this.world);
    this.player.position = { x: spawn.x, y: spawn.y, z: spawn.z };

    this.generateInitialChunks();

    this.running = true;
    this.lastTime = Date.now();
    this.gameLoop();
  }

  generateInitialChunks() {
    const chunks = this.world.getChunksAround(
      this.player.position.x,
      this.player.position.y,
      this.player.position.z,
      2
    );

    for (let i = 0; i < chunks.length; i++) {
      this.updateChunkMeshFromChunk(chunks[i]);
    }
  }

  updateChunkMesh(x, y, z) {
    const chunkSize = this.world.chunkSize;
    const cx = Math.floor(x / chunkSize);
    const cy = Math.floor(y / chunkSize);
    const cz = Math.floor(z / chunkSize);
    const chunk = this.world.getChunk(cx, cy, cz);
    if (chunk) this.updateChunkMeshFromChunk(chunk);
  }

  updateChunkMeshFromChunk(chunk) {
    const key = this.world.getChunkKey(chunk.x, chunk.y, chunk.z);
    const oldMesh = this.chunkMeshes.get(key);
    if (oldMesh) this.renderer.deleteMesh(oldMesh);

    const mesh = this.renderer.createBlockMesh(chunk);
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

    requestAnimationFrame(this.gameLoop.bind(this));
  }

  update(dt) {
    // 处理摇杆输入
    if (this.joystick.active) {
      const dx = this.joystick.currentX - this.joystick.startX;
      const dy = this.joystick.currentY - this.joystick.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 10) {
        this.player.input.forward = dy < -20;
        this.player.input.backward = dy > 20;
        this.player.input.left = dx < -20;
        this.player.input.right = dx > 20;
      } else {
        this.player.input.forward = false;
        this.player.input.backward = false;
        this.player.input.left = false;
        this.player.input.right = false;
      }
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
    for (let i = 0; i < chunks.length; i++) {
      if (chunks[i].dirty) {
        this.updateChunkMeshFromChunk(chunks[i]);
      }
    }
  }

  render() {
    this.renderer.clear();

    this.renderer.setViewMatrix(
      this.player.getEyePosition(),
      this.player.rotation
    );

    this.chunkMeshes.forEach((mesh) => {
      this.renderer.renderChunk(mesh);
    });

    // 渲染UI
    this.renderUI();
  }

  renderUI() {
    const ctx = this.canvas.getContext('2d');
    const scale = this.pixelRatio;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // 准星
    const cx = width / 2;
    const cy = height / 2;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - 10 * scale, cy);
    ctx.lineTo(cx + 10 * scale, cy);
    ctx.moveTo(cx, cy - 10 * scale);
    ctx.lineTo(cx, cy + 10 * scale);
    ctx.stroke();

    // 虚拟摇杆区域
    const joystickX = 100 * scale;
    const joystickY = height - 140 * scale;
    const joystickRadius = 60 * scale;

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(joystickX, joystickY, joystickRadius, 0, Math.PI * 2);
    ctx.fill();

    // 摇杆内圈
    let knobX = joystickX;
    let knobY = joystickY;
    if (this.joystick.active) {
      const dx = (this.joystick.currentX - this.joystick.startX) * scale;
      const dy = (this.joystick.currentY - this.joystick.startY) * scale;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const maxDist = joystickRadius * 0.8;
        const clampedDist = Math.min(dist, maxDist);
        knobX = joystickX + (dx / dist) * clampedDist;
        knobY = joystickY + (dy / dist) * clampedDist;
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(knobX, knobY, joystickRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 按钮
    this.uiButtons = [];
    const btnSize = 60 * scale;
    const margin = 20 * scale;

    // 跳跃按钮
    const jumpBtn = { x: width - btnSize - margin - 80 * scale, y: height - btnSize * 2 - margin * 2, width: btnSize, height: btnSize, label: '跳', action: 'jump' };
    this.uiButtons.push(jumpBtn);

    // 放置按钮
    const placeBtn = { x: width - btnSize - margin, y: height - btnSize * 2 - margin * 2, width: btnSize, height: btnSize, label: '放', action: 'place' };
    this.uiButtons.push(placeBtn);

    // 破坏按钮
    const breakBtn = { x: width - btnSize - margin - 40 * scale, y: height - btnSize - margin, width: btnSize, height: btnSize, label: '挖', action: 'break' };
    this.uiButtons.push(breakBtn);

    // 绘制按钮
    for (let i = 0; i < this.uiButtons.length; i++) {
      const btn = this.uiButtons[i];
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(btn.x, btn.y, btn.width, btn.height);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
      ctx.fillStyle = 'white';
      ctx.font = `bold ${20 * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2);
    }

    // 快捷栏
    const slotSize = 50 * scale;
    const slotPadding = 4 * scale;
    const totalWidth = (slotSize + slotPadding) * 9 - slotPadding;
    const startX = (width - totalWidth) / 2;
    const startY = height - slotSize - 20 * scale;

    const blockColors = {
      [BlockType.GRASS]: '#4a9f4a',
      [BlockType.DIRT]: '#8b6c4a',
      [BlockType.STONE]: '#888888',
      [BlockType.WOOD]: '#8b6c4a',
      [BlockType.PLANKS]: '#c8a870',
      [BlockType.GLASS]: '#c8e8ff',
      [BlockType.BRICK]: '#b86050',
      [BlockType.SAND]: '#e8d898',
      [BlockType.COBBLESTONE]: '#707070'
    };

    for (let i = 0; i < 9; i++) {
      const x = startX + i * (slotSize + slotPadding);
      const y = startY;

      ctx.fillStyle = i === this.player.inventory.selectedSlot ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
      ctx.fillRect(x, y, slotSize, slotSize);

      ctx.strokeStyle = i === this.player.inventory.selectedSlot ? 'white' : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2 * scale;
      ctx.strokeRect(x, y, slotSize, slotSize);

      const item = this.player.inventory.slots[i];
      if (item) {
        ctx.fillStyle = blockColors[item.type] || '#888';
        ctx.fillRect(x + 8 * scale, y + 8 * scale, slotSize - 16 * scale, slotSize - 16 * scale);

        if (item.count > 1) {
          ctx.fillStyle = 'white';
          ctx.font = `bold ${14 * scale}px Arial`;
          ctx.textAlign = 'right';
          ctx.fillText(item.count.toString(), x + slotSize - 4 * scale, y + slotSize - 4 * scale);
        }
      }
    }

    // 坐标
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(10 * scale, 10 * scale, 120 * scale, 50 * scale);
    ctx.fillStyle = 'white';
    ctx.font = `${12 * scale}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText('X: ' + Math.floor(this.player.position.x), 20 * scale, 28 * scale);
    ctx.fillText('Y: ' + Math.floor(this.player.position.y), 20 * scale, 43 * scale);
    ctx.fillText('Z: ' + Math.floor(this.player.position.z), 70 * scale, 28 * scale);
  }

  onTouchStart(e) {
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const x = touch.clientX;
      const y = touch.clientY;

      if (this.state === 'lobby') {
        // 检查大厅按钮
        for (let j = 0; j < this.lobbyButtons.length; j++) {
          const btn = this.lobbyButtons[j];
          const scale = this.pixelRatio;
          if (x * scale >= btn.x && x * scale <= btn.x + btn.width &&
              y * scale >= btn.y && y * scale <= btn.y + btn.height) {
            if (btn.action === 'start') this.startGame();
            return;
          }
        }
        return;
      }

      // 游戏中
      // 检查UI按钮
      if (this.uiButtons) {
        for (let j = 0; j < this.uiButtons.length; j++) {
          const btn = this.uiButtons[j];
          const scale = this.pixelRatio;
          if (x * scale >= btn.x && x * scale <= btn.x + btn.width &&
              y * scale >= btn.y && y * scale <= btn.y + btn.height) {
            if (btn.action === 'jump') {
              this.player.input.jump = true;
              setTimeout(() => { this.player.input.jump = false; }, 100);
            } else if (btn.action === 'place') {
              this.placeBlock();
            } else if (btn.action === 'break') {
              this.breakBlock();
            }
            return;
          }
        }
      }

      // 检查快捷栏
      const scale = this.pixelRatio;
      const slotSize = 50 * scale;
      const slotPadding = 4 * scale;
      const totalWidth = (slotSize + slotPadding) * 9 - slotPadding;
      const startX = (this.canvas.width - totalWidth) / 2;
      const startY = this.canvas.height - slotSize - 20 * scale;

      if (y * scale >= startY && y * scale <= startY + slotSize) {
        const slotIndex = Math.floor((x * scale - startX) / (slotSize + slotPadding));
        if (slotIndex >= 0 && slotIndex < 9) {
          this.player.selectSlot(slotIndex);
          return;
        }
      }

      // 左侧是摇杆
      if (x < this.screenWidth / 3) {
        this.joystick.active = true;
        this.joystick.startX = x;
        this.joystick.startY = y;
        this.joystick.currentX = x;
        this.joystick.currentY = y;
      } else {
        // 右侧是视角控制
        this.lookTouch = touch.identifier;
        this.lastLookX = x;
        this.lastLookY = y;
      }
    }
  }

  onTouchMove(e) {
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const x = touch.clientX;
      const y = touch.clientY;

      if (this.state !== 'playing') return;

      // 摇杆
      if (this.joystick.active && x < this.screenWidth / 2) {
        this.joystick.currentX = x;
        this.joystick.currentY = y;
      }

      // 视角
      if (touch.identifier === this.lookTouch) {
        const dx = x - this.lastLookX;
        const dy = y - this.lastLookY;

        this.player.rotation.y += dx * 0.005;
        this.player.rotation.x += dy * 0.005;
        this.player.rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.player.rotation.x));

        this.lastLookX = x;
        this.lastLookY = y;
      }
    }
  }

  onTouchEnd(e) {
    // 检查摇杆是否松开
    let joystickStillActive = false;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].clientX < this.screenWidth / 3) {
        joystickStillActive = true;
        break;
      }
    }
    if (!joystickStillActive) {
      this.joystick.active = false;
    }

    // 检查视角触摸是否松开
    let lookStillActive = false;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === this.lookTouch) {
        lookStillActive = true;
        break;
      }
    }
    if (!lookStillActive) {
      this.lookTouch = null;
    }
  }

  placeBlock() {
    const result = this.player.placeBlock();
    if (result.success) {
      this.updateChunkMesh(result.position.x, result.position.y, result.position.z);
    }
  }

  breakBlock() {
    const result = this.player.breakBlock();
    if (result.success) {
      this.updateChunkMesh(result.position.x, result.position.y, result.position.z);
    }
  }
}

// 启动游戏
new MinecraftGame();
