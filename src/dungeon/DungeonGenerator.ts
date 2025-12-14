/**
 * 地牢生成器
 * 负责生成每层地牢的地图结构
 */

import { getFloorEnemies, getFloorElites, getFloorBoss } from '../data/EnemiesData';

/**
 * 房间类型
 */
export enum RoomType {
  START = 'start',
  BATTLE = 'battle',
  ELITE = 'elite',
  BOSS = 'boss',
  SHOP = 'shop',
  REST = 'rest',
  EVENT = 'event',
  TREASURE = 'treasure'
}

/**
 * 地图节点
 */
export interface MapNode {
  id: string;
  type: RoomType;
  row: number;
  col: number;
  connections: string[];  // 连接到的节点ID
  visited: boolean;
  cleared: boolean;
  enemyIds?: string[];    // 该房间的敌人（战斗房间）
  eventId?: string;       // 该房间的事件（事件房间）
}

/**
 * 楼层配置
 */
export interface FloorConfig {
  name: string;
  rows: number;
  nodesPerRow: { min: number; max: number };
  roomWeights: {
    battle: number;
    elite: number;
    event: number;
    shop: number;
    rest: number;
    treasure: number;
  };
  eliteMinRow: number;    // 精英最早出现的行
  restMinRow: number;     // 休息点最早出现的行
  guaranteedShop: boolean;
  guaranteedRest: boolean;
}

/**
 * 楼层配置表
 */
const FLOOR_CONFIGS: Record<number, FloorConfig> = {
  1: {
    name: '土牢',
    rows: 8,
    nodesPerRow: { min: 2, max: 4 },
    roomWeights: {
      battle: 60,
      elite: 8,
      event: 15,
      shop: 5,
      rest: 5,
      treasure: 7
    },
    eliteMinRow: 3,
    restMinRow: 5,
    guaranteedShop: true,
    guaranteedRest: true
  },
  2: {
    name: '水狱',
    rows: 10,
    nodesPerRow: { min: 2, max: 4 },
    roomWeights: {
      battle: 55,
      elite: 10,
      event: 18,
      shop: 5,
      rest: 5,
      treasure: 7
    },
    eliteMinRow: 3,
    restMinRow: 6,
    guaranteedShop: true,
    guaranteedRest: true
  },
  3: {
    name: '火窟',
    rows: 12,
    nodesPerRow: { min: 3, max: 5 },
    roomWeights: {
      battle: 50,
      elite: 12,
      event: 18,
      shop: 5,
      rest: 8,
      treasure: 7
    },
    eliteMinRow: 4,
    restMinRow: 7,
    guaranteedShop: true,
    guaranteedRest: true
  },
  4: {
    name: '金殿',
    rows: 14,
    nodesPerRow: { min: 3, max: 5 },
    roomWeights: {
      battle: 48,
      elite: 14,
      event: 18,
      shop: 5,
      rest: 8,
      treasure: 7
    },
    eliteMinRow: 4,
    restMinRow: 8,
    guaranteedShop: true,
    guaranteedRest: true
  },
  5: {
    name: '木林',
    rows: 16,
    nodesPerRow: { min: 3, max: 5 },
    roomWeights: {
      battle: 45,
      elite: 15,
      event: 18,
      shop: 5,
      rest: 10,
      treasure: 7
    },
    eliteMinRow: 5,
    restMinRow: 9,
    guaranteedShop: true,
    guaranteedRest: true
  },
  6: {
    name: '混沌界',
    rows: 18,
    nodesPerRow: { min: 3, max: 6 },
    roomWeights: {
      battle: 42,
      elite: 18,
      event: 18,
      shop: 5,
      rest: 10,
      treasure: 7
    },
    eliteMinRow: 5,
    restMinRow: 10,
    guaranteedShop: true,
    guaranteedRest: true
  }
};

/**
 * 地牢生成器类
 */
export class DungeonGenerator {
  private seed: number;
  private random: () => number;

  constructor(seed?: number) {
    this.seed = seed || Date.now();
    this.random = this.createSeededRandom(this.seed);
  }

  /**
   * 创建带种子的随机数生成器
   */
  private createSeededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
  }

  /**
   * 生成楼层地图
   */
  generateFloor(floor: number): MapNode[] {
    const config = FLOOR_CONFIGS[floor] || FLOOR_CONFIGS[1];
    const nodes: MapNode[] = [];

    // 生成起始节点
    nodes.push({
      id: 'start',
      type: RoomType.START,
      row: 0,
      col: 0,
      connections: [],
      visited: false,
      cleared: true  // 起始点默认已清理
    });

    // 生成中间层节点
    const rowNodes: MapNode[][] = [nodes]; // 第0行是起始点

    for (let row = 1; row < config.rows; row++) {
      const nodeCount = this.randomInt(config.nodesPerRow.min, config.nodesPerRow.max);
      const rowNodeList: MapNode[] = [];

      for (let col = 0; col < nodeCount; col++) {
        const type = this.getRandomRoomType(row, config, floor);
        const node: MapNode = {
          id: `node_${row}_${col}`,
          type,
          row,
          col,
          connections: [],
          visited: false,
          cleared: false
        };

        // 为战斗房间分配敌人
        if (type === RoomType.BATTLE || type === RoomType.ELITE) {
          node.enemyIds = this.generateEnemyGroup(floor, type === RoomType.ELITE);
        }

        rowNodeList.push(node);
        nodes.push(node);
      }

      rowNodes.push(rowNodeList);
    }

    // 生成BOSS节点
    const bossNode: MapNode = {
      id: 'boss',
      type: RoomType.BOSS,
      row: config.rows,
      col: 0,
      connections: [],
      visited: false,
      cleared: false,
      enemyIds: [getFloorBoss(floor)?.id || 'earth_titan']
    };
    nodes.push(bossNode);
    rowNodes.push([bossNode]);

    // 生成连接
    this.generateConnections(rowNodes);

    // 确保有保证的房间类型
    this.ensureGuaranteedRooms(nodes, config);

    // 确保所有路径连通
    this.ensureConnectivity(nodes, rowNodes);

    return nodes;
  }

  /**
   * 获取随机房间类型
   */
  private getRandomRoomType(row: number, config: FloorConfig, floor: number): RoomType {
    // 精英房间限制
    if (row < config.eliteMinRow) {
      // 不能出现精英
    }

    // 休息点限制
    if (row < config.restMinRow) {
      // 不能出现休息点
    }

    // 权重随机
    const weights = { ...config.roomWeights };

    // 应用行限制
    if (row < config.eliteMinRow) weights.elite = 0;
    if (row < config.restMinRow) weights.rest = 0;

    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let r = this.random() * total;

    for (const [type, weight] of Object.entries(weights)) {
      r -= weight;
      if (r <= 0) {
        return type as RoomType;
      }
    }

    return RoomType.BATTLE;
  }

  /**
   * 生成敌人组合
   */
  private generateEnemyGroup(floor: number, isElite: boolean): string[] {
    if (isElite) {
      const elites = getFloorElites(floor);
      if (elites.length > 0) {
        const elite = elites[Math.floor(this.random() * elites.length)];
        return [elite.id];
      }
    }

    // 普通战斗：1-3个敌人
    const enemies = getFloorEnemies(floor);
    const count = this.randomInt(1, Math.min(3, enemies.length));
    const group: string[] = [];

    for (let i = 0; i < count; i++) {
      const enemy = enemies[Math.floor(this.random() * enemies.length)];
      group.push(enemy.id);
    }

    return group;
  }

  /**
   * 生成节点连接
   */
  private generateConnections(rowNodes: MapNode[][]): void {
    for (let row = 0; row < rowNodes.length - 1; row++) {
      const currentRow = rowNodes[row];
      const nextRow = rowNodes[row + 1];

      for (const node of currentRow) {
        // 每个节点连接1-3个下一行的节点
        const connectionCount = this.randomInt(1, Math.min(3, nextRow.length));

        // 找到位置相近的节点
        const sortedNextRow = [...nextRow].sort((a, b) => {
          const distA = Math.abs(a.col - node.col);
          const distB = Math.abs(b.col - node.col);
          return distA - distB;
        });

        // 优先连接近的节点，但也有一定概率连接远的
        const connections = new Set<string>();

        // 保证至少连接一个最近的
        connections.add(sortedNextRow[0].id);

        // 随机添加更多连接
        for (let i = 1; i < connectionCount && i < sortedNextRow.length; i++) {
          if (this.random() < 0.7) { // 70%概率添加
            connections.add(sortedNextRow[i].id);
          }
        }

        node.connections = Array.from(connections);
      }
    }
  }

  /**
   * 确保有保证的房间类型
   */
  private ensureGuaranteedRooms(nodes: MapNode[], config: FloorConfig): void {
    // 确保至少有一个商店
    if (config.guaranteedShop) {
      const hasShop = nodes.some(n => n.type === RoomType.SHOP);
      if (!hasShop) {
        const candidates = nodes.filter(n =>
          n.type === RoomType.BATTLE &&
          n.row >= Math.floor(config.rows / 2)
        );
        if (candidates.length > 0) {
          const node = candidates[Math.floor(this.random() * candidates.length)];
          node.type = RoomType.SHOP;
          delete node.enemyIds;
        }
      }
    }

    // 确保至少有一个休息点
    if (config.guaranteedRest) {
      const hasRest = nodes.some(n => n.type === RoomType.REST);
      if (!hasRest) {
        const candidates = nodes.filter(n =>
          n.type === RoomType.BATTLE &&
          n.row >= config.restMinRow
        );
        if (candidates.length > 0) {
          const node = candidates[Math.floor(this.random() * candidates.length)];
          node.type = RoomType.REST;
          delete node.enemyIds;
        }
      }
    }
  }

  /**
   * 确保连通性
   */
  private ensureConnectivity(nodes: MapNode[], rowNodes: MapNode[][]): void {
    // 确保每行的每个节点都至少有一个来源连接
    for (let row = 1; row < rowNodes.length; row++) {
      for (const node of rowNodes[row]) {
        // 检查是否有任何节点连接到这个节点
        const hasIncoming = rowNodes[row - 1].some(n =>
          n.connections.includes(node.id)
        );

        if (!hasIncoming) {
          // 随机选择上一行的一个节点连接过来
          const prevNode = rowNodes[row - 1][Math.floor(this.random() * rowNodes[row - 1].length)];
          if (!prevNode.connections.includes(node.id)) {
            prevNode.connections.push(node.id);
          }
        }
      }
    }
  }

  /**
   * 随机整数
   */
  private randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * 获取楼层名称
   */
  static getFloorName(floor: number): string {
    return FLOOR_CONFIGS[floor]?.name || `第${floor}层`;
  }

  /**
   * 获取楼层配置
   */
  static getFloorConfig(floor: number): FloorConfig {
    return FLOOR_CONFIGS[floor] || FLOOR_CONFIGS[1];
  }
}

export default DungeonGenerator;
