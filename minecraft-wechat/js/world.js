/**
 * 方块世界系统 - Minecraft风格
 */

// 方块类型枚举
export const BlockType = {
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

// 方块名称映射
export const BlockNames = {
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

// Chunk类 - 16x16x16的方块区域
export class Chunk {
  constructor(x, y, z, size = 16) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.size = size;
    this.blocks = new Uint8Array(size * size * size);
    this.mesh = null;
    this.dirty = true;
  }

  // 获取方块索引
  getIndex(x, y, z) {
    return x + y * this.size + z * this.size * this.size;
  }

  // 获取方块
  getBlock(x, y, z) {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size || z < 0 || z >= this.size) {
      return BlockType.AIR;
    }
    return this.blocks[this.getIndex(x, y, z)];
  }

  // 安全获取方块（用于边界检查）
  getBlockSafe(x, y, z) {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size || z < 0 || z >= this.size) {
      return 0; // 返回0表示空气，这样边界面会被渲染
    }
    return this.blocks[this.getIndex(x, y, z)];
  }

  // 设置方块
  setBlock(x, y, z, type) {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size || z < 0 || z >= this.size) {
      return false;
    }
    this.blocks[this.getIndex(x, y, z)] = type;
    this.dirty = true;
    return true;
  }

  // 序列化
  serialize() {
    return {
      x: this.x,
      y: this.y,
      z: this.z,
      blocks: Array.from(this.blocks)
    };
  }

  // 反序列化
  static deserialize(data) {
    const chunk = new Chunk(data.x, data.y, data.z);
    chunk.blocks = new Uint8Array(data.blocks);
    chunk.dirty = true;
    return chunk;
  }
}

// 噪声函数用于地形生成
class SimplexNoise {
  constructor(seed = Math.random()) {
    this.seed = seed;
    this.perm = new Uint8Array(512);
    this.gradP = new Array(512);

    const grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];

    // 使用种子初始化排列表
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }

    // Fisher-Yates洗牌
    let random = this.mulberry32(seed * 1000000);
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
    }
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
    if (x0 > y0) {
      i1 = 1; j1 = 0;
    } else {
      i1 = 0; j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) {
      n0 = 0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * this.dot2(this.gradP[ii + this.perm[jj]], x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) {
      n1 = 0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * this.dot2(this.gradP[ii + i1 + this.perm[jj + j1]], x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) {
      n2 = 0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * this.dot2(this.gradP[ii + 1 + this.perm[jj + 1]], x2, y2);
    }

    return 70 * (n0 + n1 + n2);
  }
}

// 世界类 - 管理所有chunk
export class World {
  constructor(seed = Date.now()) {
    this.chunks = new Map();
    this.seed = seed;
    this.noise = new SimplexNoise(seed);
    this.chunkSize = 16;
    this.seaLevel = 32;
    this.baseHeight = 30;
  }

  // 获取chunk键
  getChunkKey(cx, cy, cz) {
    return `${cx},${cy},${cz}`;
  }

  // 获取chunk
  getChunk(cx, cy, cz) {
    return this.chunks.get(this.getChunkKey(cx, cy, cz));
  }

  // 创建或获取chunk
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

  // 生成chunk地形
  generateChunk(chunk) {
    const cx = chunk.x * this.chunkSize;
    const cy = chunk.y * this.chunkSize;
    const cz = chunk.z * this.chunkSize;

    for (let x = 0; x < this.chunkSize; x++) {
      for (let z = 0; z < this.chunkSize; z++) {
        const worldX = cx + x;
        const worldZ = cz + z;

        // 使用多层噪声生成地形高度
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
            // 顶层
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

    // 生成树木
    this.generateTrees(chunk);
  }

  // 获取地形高度
  getTerrainHeight(x, z) {
    // 多层噪声叠加
    let height = this.baseHeight;

    // 大型地形起伏
    height += this.noise.noise2D(x * 0.01, z * 0.01) * 15;

    // 中型地形细节
    height += this.noise.noise2D(x * 0.05, z * 0.05) * 5;

    // 小型地形细节
    height += this.noise.noise2D(x * 0.1, z * 0.1) * 2;

    return Math.floor(height);
  }

  // 生成树木
  generateTrees(chunk) {
    const cx = chunk.x * this.chunkSize;
    const cz = chunk.z * this.chunkSize;

    // 使用确定性随机数生成树的位置
    const random = this.mulberry32(chunk.x * 73856093 ^ chunk.z * 19349663 ^ this.seed);

    for (let i = 0; i < 3; i++) {
      const x = Math.floor(random() * (this.chunkSize - 4)) + 2;
      const z = Math.floor(random() * (this.chunkSize - 4)) + 2;

      const worldX = cx + x;
      const worldZ = cz + z;
      const height = this.getTerrainHeight(worldX, worldZ);

      // 只在草地上生成树
      if (height > this.seaLevel && chunk.y === Math.floor(height / this.chunkSize)) {
        const localY = height % this.chunkSize;

        if (localY + 6 < this.chunkSize) {
          // 检查是否有足够空间
          const blockBelow = chunk.getBlock(x, localY - 1, z);
          if (blockBelow === BlockType.GRASS || blockBelow === BlockType.DIRT) {
            this.placeTree(chunk, x, localY, z);
          }
        }
      }
    }
  }

  // 放置树
  placeTree(chunk, x, y, z) {
    const trunkHeight = 4 + Math.floor(Math.random() * 2);

    // 树干
    for (let i = 0; i < trunkHeight; i++) {
      if (y + i < this.chunkSize) {
        chunk.setBlock(x, y + i, z, BlockType.WOOD);
      }
    }

    // 树叶
    const leafStart = y + trunkHeight - 2;
    for (let dy = 0; dy < 4; dy++) {
      const radius = dy < 2 ? 2 : 1;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (dx === 0 && dz === 0 && dy < 3) continue; // 树干位置跳过
          const lx = x + dx;
          const ly = leafStart + dy;
          const lz = z + dz;

          if (lx >= 0 && lx < this.chunkSize &&
              ly >= 0 && ly < this.chunkSize &&
              lz >= 0 && lz < this.chunkSize) {
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
    }
  }

  // 世界坐标获取方块
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

  // 世界坐标设置方块
  setBlock(x, y, z, type) {
    const cx = Math.floor(x / this.chunkSize);
    const cy = Math.floor(y / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);

    const chunk = this.getOrCreateChunk(cx, cy, cz);

    const localX = ((x % this.chunkSize) + this.chunkSize) % this.chunkSize;
    const localY = ((y % this.chunkSize) + this.chunkSize) % this.chunkSize;
    const localZ = ((z % this.chunkSize) + this.chunkSize) % this.chunkSize;

    chunk.setBlock(localX, localY, localZ, type);

    // 标记相邻chunk为dirty（如果在边界）
    if (localX === 0) this.markChunkDirty(cx - 1, cy, cz);
    if (localX === this.chunkSize - 1) this.markChunkDirty(cx + 1, cy, cz);
    if (localY === 0) this.markChunkDirty(cx, cy - 1, cz);
    if (localY === this.chunkSize - 1) this.markChunkDirty(cx, cy + 1, cz);
    if (localZ === 0) this.markChunkDirty(cx, cy, cz - 1);
    if (localZ === this.chunkSize - 1) this.markChunkDirty(cx, cy, cz + 1);

    return true;
  }

  // 标记chunk为dirty
  markChunkDirty(cx, cy, cz) {
    const chunk = this.getChunk(cx, cy, cz);
    if (chunk) {
      chunk.dirty = true;
    }
  }

  // 获取玩家周围的chunks
  getChunksAround(x, y, z, radius = 2) {
    const cx = Math.floor(x / this.chunkSize);
    const cy = Math.floor(y / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);

    const chunks = [];

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -1; dy <= 1; dy++) { // 垂直方向只加载3层
        for (let dz = -radius; dz <= radius; dz++) {
          const chunk = this.getOrCreateChunk(cx + dx, cy + dy, cz + dz);
          chunks.push(chunk);
        }
      }
    }

    return chunks;
  }

  // 射线检测 - 用于方块选择
  raycast(origin, direction, maxDistance = 10) {
    const step = 0.1;
    const pos = { x: origin.x, y: origin.y, z: origin.z };

    let lastBlock = null;
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

  // 序列化所有修改过的chunks
  serializeModified() {
    const data = {
      seed: this.seed,
      chunks: []
    };

    for (const [key, chunk] of this.chunks) {
      data.chunks.push(chunk.serialize());
    }

    return data;
  }

  // 获取出生点
  getSpawnPoint() {
    const x = 0;
    const z = 0;
    const height = this.getTerrainHeight(x, z);
    return { x: x + 0.5, y: height + 2, z: z + 0.5 };
  }
}

export default World;
