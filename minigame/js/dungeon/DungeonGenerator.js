/**
 * 地牢生成器
 * 程序化生成 Minecraft Dungeons 风格的地牢地图
 */
class DungeonGenerator {
  constructor() {
    // 地图尺寸
    this.width = 50;
    this.height = 50;

    // 瓦片类型
    this.TILE = {
      VOID: 0,      // 空（不可行走）
      FLOOR: 1,     // 地板
      WALL: 2,      // 墙壁
      DOOR: 3,      // 门
      SPAWN: 4,     // 出生点
      EXIT: 5,      // 出口
      CHEST: 6,     // 宝箱位置
      TRAP: 7       // 陷阱
    };

    // 地图数据
    this.map = [];
    this.rooms = [];
    this.corridors = [];
    this.spawnPoint = null;
    this.exitPoint = null;
    this.enemySpawns = [];
  }

  /**
   * 生成新地牢
   */
  generate(config = {}) {
    const {
      width = 50,
      height = 50,
      roomCount = 8,
      minRoomSize = 5,
      maxRoomSize = 10,
      seed = Date.now()
    } = config;

    this.width = width;
    this.height = height;
    this.seed = seed;
    this.rng = this.createRNG(seed);

    // 初始化地图
    this.initMap();

    // 生成房间
    this.generateRooms(roomCount, minRoomSize, maxRoomSize);

    // 连接房间（生成走廊）
    this.connectRooms();

    // 放置特殊点
    this.placeSpecialPoints();

    // 生成敌人生成点
    this.generateEnemySpawns();

    return {
      map: this.map,
      width: this.width,
      height: this.height,
      rooms: this.rooms,
      spawnPoint: this.spawnPoint,
      exitPoint: this.exitPoint,
      enemySpawns: this.enemySpawns,
      seed: this.seed
    };
  }

  /**
   * 创建伪随机数生成器
   */
  createRNG(seed) {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  /**
   * 随机整数
   */
  randomInt(min, max) {
    return Math.floor(this.rng() * (max - min + 1)) + min;
  }

  /**
   * 初始化地图（全部填充为空）
   */
  initMap() {
    this.map = [];
    for (let y = 0; y < this.height; y++) {
      this.map[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.map[y][x] = this.TILE.VOID;
      }
    }
    this.rooms = [];
    this.corridors = [];
    this.enemySpawns = [];
  }

  /**
   * 生成房间
   */
  generateRooms(count, minSize, maxSize) {
    const maxAttempts = count * 20;
    let attempts = 0;

    while (this.rooms.length < count && attempts < maxAttempts) {
      attempts++;

      const roomWidth = this.randomInt(minSize, maxSize);
      const roomHeight = this.randomInt(minSize, maxSize);
      const x = this.randomInt(2, this.width - roomWidth - 2);
      const y = this.randomInt(2, this.height - roomHeight - 2);

      const newRoom = {
        x, y,
        width: roomWidth,
        height: roomHeight,
        centerX: Math.floor(x + roomWidth / 2),
        centerY: Math.floor(y + roomHeight / 2)
      };

      // 检查是否与其他房间重叠
      let overlaps = false;
      for (const room of this.rooms) {
        if (this.roomsOverlap(newRoom, room, 2)) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        this.rooms.push(newRoom);
        this.carveRoom(newRoom);
      }
    }
  }

  /**
   * 检查两个房间是否重叠
   */
  roomsOverlap(room1, room2, padding = 0) {
    return (
      room1.x - padding < room2.x + room2.width + padding &&
      room1.x + room1.width + padding > room2.x - padding &&
      room1.y - padding < room2.y + room2.height + padding &&
      room1.y + room1.height + padding > room2.y - padding
    );
  }

  /**
   * 挖出房间
   */
  carveRoom(room) {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        this.map[y][x] = this.TILE.FLOOR;
      }
    }

    // 添加墙壁边界
    for (let x = room.x - 1; x <= room.x + room.width; x++) {
      if (this.isValid(x, room.y - 1) && this.map[room.y - 1][x] === this.TILE.VOID) {
        this.map[room.y - 1][x] = this.TILE.WALL;
      }
      if (this.isValid(x, room.y + room.height) && this.map[room.y + room.height][x] === this.TILE.VOID) {
        this.map[room.y + room.height][x] = this.TILE.WALL;
      }
    }
    for (let y = room.y - 1; y <= room.y + room.height; y++) {
      if (this.isValid(room.x - 1, y) && this.map[y][room.x - 1] === this.TILE.VOID) {
        this.map[y][room.x - 1] = this.TILE.WALL;
      }
      if (this.isValid(room.x + room.width, y) && this.map[y][room.x + room.width] === this.TILE.VOID) {
        this.map[y][room.x + room.width] = this.TILE.WALL;
      }
    }
  }

  /**
   * 连接所有房间
   */
  connectRooms() {
    // 使用最小生成树算法连接房间
    const connected = [0];
    const unconnected = this.rooms.slice(1).map((_, i) => i + 1);

    while (unconnected.length > 0) {
      let bestDist = Infinity;
      let bestConnected = 0;
      let bestUnconnected = 0;

      for (const ci of connected) {
        for (const ui of unconnected) {
          const dist = this.roomDistance(this.rooms[ci], this.rooms[ui]);
          if (dist < bestDist) {
            bestDist = dist;
            bestConnected = ci;
            bestUnconnected = ui;
          }
        }
      }

      // 连接两个房间
      this.carveCorridor(this.rooms[bestConnected], this.rooms[bestUnconnected]);

      connected.push(bestUnconnected);
      unconnected.splice(unconnected.indexOf(bestUnconnected), 1);
    }

    // 额外连接一些房间增加复杂度
    const extraConnections = Math.floor(this.rooms.length * 0.3);
    for (let i = 0; i < extraConnections; i++) {
      const room1 = this.rooms[this.randomInt(0, this.rooms.length - 1)];
      const room2 = this.rooms[this.randomInt(0, this.rooms.length - 1)];
      if (room1 !== room2) {
        this.carveCorridor(room1, room2);
      }
    }
  }

  /**
   * 计算两个房间中心的距离
   */
  roomDistance(room1, room2) {
    const dx = room1.centerX - room2.centerX;
    const dy = room1.centerY - room2.centerY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 挖出走廊
   */
  carveCorridor(room1, room2) {
    let x = room1.centerX;
    let y = room1.centerY;
    const targetX = room2.centerX;
    const targetY = room2.centerY;

    const corridor = { points: [] };

    // L形走廊
    const horizontalFirst = this.rng() > 0.5;

    if (horizontalFirst) {
      // 先水平后垂直
      while (x !== targetX) {
        this.carveCorridorTile(x, y);
        corridor.points.push({ x, y });
        x += x < targetX ? 1 : -1;
      }
      while (y !== targetY) {
        this.carveCorridorTile(x, y);
        corridor.points.push({ x, y });
        y += y < targetY ? 1 : -1;
      }
    } else {
      // 先垂直后水平
      while (y !== targetY) {
        this.carveCorridorTile(x, y);
        corridor.points.push({ x, y });
        y += y < targetY ? 1 : -1;
      }
      while (x !== targetX) {
        this.carveCorridorTile(x, y);
        corridor.points.push({ x, y });
        x += x < targetX ? 1 : -1;
      }
    }

    this.corridors.push(corridor);
  }

  /**
   * 挖出走廊瓦片（宽度为3，确保通行）
   */
  carveCorridorTile(x, y) {
    // 3x3 范围内全部挖成地板，确保走廊通畅
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (this.isValid(nx, ny)) {
          // 中心和相邻格子都设为地板
          if (this.map[ny][nx] === this.TILE.VOID || this.map[ny][nx] === this.TILE.WALL) {
            this.map[ny][nx] = this.TILE.FLOOR;
          }
        }
      }
    }
  }

  /**
   * 放置特殊点（出生点、出口）
   */
  placeSpecialPoints() {
    if (this.rooms.length < 2) return;

    // 出生点在第一个房间
    const spawnRoom = this.rooms[0];
    this.spawnPoint = {
      x: spawnRoom.centerX,
      y: spawnRoom.centerY
    };
    this.map[this.spawnPoint.y][this.spawnPoint.x] = this.TILE.SPAWN;

    // 出口在最远的房间
    let farthestRoom = this.rooms[1];
    let farthestDist = 0;
    for (let i = 1; i < this.rooms.length; i++) {
      const dist = this.roomDistance(spawnRoom, this.rooms[i]);
      if (dist > farthestDist) {
        farthestDist = dist;
        farthestRoom = this.rooms[i];
      }
    }

    this.exitPoint = {
      x: farthestRoom.centerX,
      y: farthestRoom.centerY
    };
    this.map[this.exitPoint.y][this.exitPoint.x] = this.TILE.EXIT;

    // 在一些房间放置宝箱
    for (let i = 1; i < this.rooms.length; i++) {
      if (this.rooms[i] !== farthestRoom && this.rng() < 0.4) {
        const room = this.rooms[i];
        const chestX = room.x + this.randomInt(1, room.width - 2);
        const chestY = room.y + this.randomInt(1, room.height - 2);
        if (this.map[chestY][chestX] === this.TILE.FLOOR) {
          this.map[chestY][chestX] = this.TILE.CHEST;
        }
      }
    }
  }

  /**
   * 生成敌人生成点
   */
  generateEnemySpawns() {
    this.enemySpawns = [];

    for (let i = 1; i < this.rooms.length; i++) {
      const room = this.rooms[i];

      // 每个房间1-3个敌人生成点
      const enemyCount = this.randomInt(1, 3);
      for (let j = 0; j < enemyCount; j++) {
        const x = room.x + this.randomInt(1, room.width - 2);
        const y = room.y + this.randomInt(1, room.height - 2);

        if (this.map[y][x] === this.TILE.FLOOR) {
          this.enemySpawns.push({
            x,
            y,
            roomIndex: i,
            type: this.rng() < 0.7 ? 'normal' : 'elite'
          });
        }
      }
    }

    // 在走廊中也放一些敌人
    for (const corridor of this.corridors) {
      if (corridor.points.length > 5 && this.rng() < 0.5) {
        const point = corridor.points[Math.floor(corridor.points.length / 2)];
        if (this.map[point.y][point.x] === this.TILE.FLOOR) {
          this.enemySpawns.push({
            x: point.x,
            y: point.y,
            roomIndex: -1,
            type: 'patrol'
          });
        }
      }
    }
  }

  /**
   * 检查坐标是否有效
   */
  isValid(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /**
   * 检查位置是否可行走
   */
  isWalkable(x, y) {
    if (!this.isValid(x, y)) return false;
    const tile = this.map[Math.floor(y)][Math.floor(x)];
    return tile === this.TILE.FLOOR ||
           tile === this.TILE.DOOR ||
           tile === this.TILE.SPAWN ||
           tile === this.TILE.EXIT ||
           tile === this.TILE.CHEST;
  }

  /**
   * 获取瓦片颜色
   */
  getTileColor(tile) {
    switch (tile) {
      case this.TILE.VOID:   return '#1a1a2e';
      case this.TILE.FLOOR:  return '#4a4a5e';
      case this.TILE.WALL:   return '#2d2d3d';
      case this.TILE.DOOR:   return '#6a5a4a';
      case this.TILE.SPAWN:  return '#4a7a4a';
      case this.TILE.EXIT:   return '#7a4a7a';
      case this.TILE.CHEST:  return '#8a7a3a';
      case this.TILE.TRAP:   return '#7a3a3a';
      default:               return '#1a1a2e';
    }
  }

  /**
   * 获取墙壁颜色
   */
  getWallColors(tile) {
    if (tile === this.TILE.WALL) {
      return {
        top: '#3d3d4d',
        left: '#2a2a3a',
        right: '#252535'
      };
    }
    return null;
  }
}

export default DungeonGenerator;
