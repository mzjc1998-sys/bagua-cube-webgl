# 技术架构文档

## 🏗️ 整体架构

### 架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                         微信小游戏运行时                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      游戏引擎层 (Cocos Creator)              │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │                   核心游戏系统                         │   │   │
│  │  ├──────────────────────────────────────────────────────┤   │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │   │   │
│  │  │  │ Battle  │ │  Card   │ │ Dungeon │ │ Entity  │    │   │   │
│  │  │  │ System  │ │ System  │ │Generator│ │ Manager │    │   │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │   │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │   │   │
│  │  │  │  Relic  │ │  Event  │ │  Meta   │ │  Save   │    │   │   │
│  │  │  │ System  │ │ System  │ │Progress │ │ System  │    │   │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │                     UI 层                              │   │   │
│  │  ├──────────────────────────────────────────────────────┤   │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │   │   │
│  │  │  │ Battle  │ │   Map   │ │  Card   │ │  Menu   │    │   │   │
│  │  │  │   UI    │ │   UI    │ │   UI    │ │   UI    │    │   │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │                    数据层                              │   │   │
│  │  ├──────────────────────────────────────────────────────┤   │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │   │   │
│  │  │  │  Cards  │ │ Enemies │ │ Relics  │ │ Events  │    │   │   │
│  │  │  │  Data   │ │  Data   │ │  Data   │ │  Data   │    │   │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    微信 API 适配层                           │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  [云存储] [分享] [广告] [支付] [排行榜] [用户信息]          │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 项目结构

```
dungeon-roguelike/
├── assets/
│   ├── scripts/
│   │   ├── core/                    # 核心系统
│   │   │   ├── GameManager.ts       # 游戏管理器(单例)
│   │   │   ├── GameStateManager.ts  # 状态机管理
│   │   │   ├── EventBus.ts          # 事件总线
│   │   │   └── ObjectPool.ts        # 对象池
│   │   │
│   │   ├── battle/                  # 战斗系统
│   │   │   ├── BattleManager.ts     # 战斗管理器
│   │   │   ├── TurnManager.ts       # 回合管理
│   │   │   ├── DamageCalculator.ts  # 伤害计算
│   │   │   ├── BuffSystem.ts        # Buff系统
│   │   │   └── ElementSystem.ts     # 五行系统
│   │   │
│   │   ├── card/                    # 卡牌系统
│   │   │   ├── CardManager.ts       # 卡牌管理器
│   │   │   ├── Card.ts              # 卡牌基类
│   │   │   ├── Deck.ts              # 牌组
│   │   │   ├── Hand.ts              # 手牌
│   │   │   └── CardEffects.ts       # 卡牌效果
│   │   │
│   │   ├── dungeon/                 # 地牢系统
│   │   │   ├── DungeonGenerator.ts  # 地牢生成器
│   │   │   ├── Room.ts              # 房间类
│   │   │   ├── Floor.ts             # 楼层类
│   │   │   └── MapNode.ts           # 地图节点
│   │   │
│   │   ├── entity/                  # 实体系统
│   │   │   ├── Entity.ts            # 实体基类
│   │   │   ├── Player.ts            # 玩家
│   │   │   ├── Enemy.ts             # 敌人
│   │   │   └── EnemyAI.ts           # 敌人AI
│   │   │
│   │   ├── relic/                   # 遗物系统
│   │   │   ├── RelicManager.ts      # 遗物管理器
│   │   │   ├── Relic.ts             # 遗物基类
│   │   │   └── RelicEffects.ts      # 遗物效果
│   │   │
│   │   ├── event/                   # 事件系统
│   │   │   ├── EventManager.ts      # 事件管理器
│   │   │   ├── RandomEvent.ts       # 随机事件
│   │   │   └── Shop.ts              # 商店
│   │   │
│   │   ├── meta/                    # Meta进度
│   │   │   ├── MetaProgress.ts      # 永久进度
│   │   │   ├── Achievements.ts      # 成就系统
│   │   │   └── Unlocks.ts           # 解锁系统
│   │   │
│   │   ├── save/                    # 存档系统
│   │   │   ├── SaveManager.ts       # 存档管理
│   │   │   ├── LocalStorage.ts      # 本地存储
│   │   │   └── CloudStorage.ts      # 云存储
│   │   │
│   │   ├── ui/                      # UI组件
│   │   │   ├── BattleUI.ts          # 战斗界面
│   │   │   ├── MapUI.ts             # 地图界面
│   │   │   ├── CardUI.ts            # 卡牌UI
│   │   │   ├── RewardUI.ts          # 奖励界面
│   │   │   ├── ShopUI.ts            # 商店界面
│   │   │   └── MenuUI.ts            # 菜单界面
│   │   │
│   │   ├── utils/                   # 工具类
│   │   │   ├── Random.ts            # 随机数(带种子)
│   │   │   ├── WeightedRandom.ts    # 权重随机
│   │   │   └── MathUtils.ts         # 数学工具
│   │   │
│   │   └── platform/                # 平台适配
│   │       ├── WechatAdapter.ts     # 微信适配
│   │       ├── AdManager.ts         # 广告管理
│   │       └── ShareManager.ts      # 分享管理
│   │
│   ├── data/                        # 数据配置(JSON)
│   │   ├── cards/
│   │   │   ├── attack_cards.json
│   │   │   ├── skill_cards.json
│   │   │   └── power_cards.json
│   │   ├── enemies/
│   │   │   ├── floor1_enemies.json
│   │   │   ├── floor2_enemies.json
│   │   │   └── bosses.json
│   │   ├── relics/
│   │   │   └── relics.json
│   │   ├── events/
│   │   │   └── random_events.json
│   │   └── characters/
│   │       └── characters.json
│   │
│   ├── prefabs/                     # 预制体
│   │   ├── Card.prefab
│   │   ├── Enemy.prefab
│   │   ├── DamageNumber.prefab
│   │   └── Effect.prefab
│   │
│   ├── textures/                    # 图片资源
│   │   ├── cards/
│   │   ├── enemies/
│   │   ├── ui/
│   │   └── effects/
│   │
│   ├── audio/                       # 音频资源
│   │   ├── bgm/
│   │   └── sfx/
│   │
│   └── scenes/                      # 场景
│       ├── Loading.scene
│       ├── MainMenu.scene
│       ├── Battle.scene
│       └── Map.scene
│
├── build/                           # 构建输出
│   └── wechatgame/
│
├── settings/                        # 项目设置
│
├── package.json
└── tsconfig.json
```

---

## 🔧 核心系统设计

### 1. 游戏状态机

```typescript
// GameStateManager.ts

enum GameState {
  LOADING = 'loading',
  MAIN_MENU = 'main_menu',
  CHARACTER_SELECT = 'character_select',
  MAP = 'map',
  BATTLE = 'battle',
  REWARD = 'reward',
  EVENT = 'event',
  SHOP = 'shop',
  GAME_OVER = 'game_over',
  VICTORY = 'victory'
}

class GameStateManager {
  private currentState: GameState;
  private stateStack: GameState[] = [];

  transition(newState: GameState): void {
    this.stateStack.push(this.currentState);
    this.onExitState(this.currentState);
    this.currentState = newState;
    this.onEnterState(newState);
    EventBus.emit('state_changed', { from: this.stateStack[this.stateStack.length - 1], to: newState });
  }

  back(): void {
    if (this.stateStack.length > 0) {
      const prevState = this.stateStack.pop();
      this.onExitState(this.currentState);
      this.currentState = prevState;
      this.onEnterState(prevState);
    }
  }
}
```

### 2. 事件总线

```typescript
// EventBus.ts

type EventCallback = (...args: any[]) => void;

class EventBus {
  private static listeners: Map<string, EventCallback[]> = new Map();

  static on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  static off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  static emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(...args));
    }
  }

  static clear(): void {
    this.listeners.clear();
  }
}

// 事件类型常量
const GameEvents = {
  // 战斗相关
  BATTLE_START: 'battle_start',
  BATTLE_END: 'battle_end',
  TURN_START: 'turn_start',
  TURN_END: 'turn_end',
  PLAYER_TURN_START: 'player_turn_start',
  ENEMY_TURN_START: 'enemy_turn_start',

  // 卡牌相关
  CARD_DRAWN: 'card_drawn',
  CARD_PLAYED: 'card_played',
  CARD_DISCARDED: 'card_discarded',
  CARD_EXHAUSTED: 'card_exhausted',
  CARD_ADDED: 'card_added',

  // 伤害/治疗
  DAMAGE_DEALT: 'damage_dealt',
  DAMAGE_TAKEN: 'damage_taken',
  HEAL: 'heal',
  ARMOR_GAINED: 'armor_gained',

  // 状态效果
  BUFF_APPLIED: 'buff_applied',
  BUFF_REMOVED: 'buff_removed',
  DEBUFF_APPLIED: 'debuff_applied',

  // 地牢进度
  ROOM_ENTERED: 'room_entered',
  FLOOR_CLEARED: 'floor_cleared',
  BOSS_DEFEATED: 'boss_defeated',

  // 奖励
  GOLD_GAINED: 'gold_gained',
  RELIC_OBTAINED: 'relic_obtained',
  CARD_OBTAINED: 'card_obtained',

  // 角色
  PLAYER_DIED: 'player_died',
  ENEMY_DIED: 'enemy_died'
};
```

### 3. 战斗系统

```typescript
// BattleManager.ts

interface BattleState {
  player: Player;
  enemies: Enemy[];
  turn: number;
  phase: 'player' | 'enemy';
  isActive: boolean;
}

class BattleManager {
  private state: BattleState;
  private turnManager: TurnManager;
  private damageCalculator: DamageCalculator;

  startBattle(enemies: Enemy[]): void {
    this.state = {
      player: GameManager.instance.player,
      enemies: enemies,
      turn: 0,
      phase: 'player',
      isActive: true
    };

    this.state.player.deck.shuffle();
    this.drawCards(5);
    this.startPlayerTurn();

    EventBus.emit(GameEvents.BATTLE_START, { enemies });
  }

  startPlayerTurn(): void {
    this.state.turn++;
    this.state.phase = 'player';

    // 重置能量
    this.state.player.energy = this.state.player.maxEnergy;

    // 应用回合开始效果
    this.applyTurnStartEffects(this.state.player);

    // 抽牌
    this.drawCards(5);

    EventBus.emit(GameEvents.PLAYER_TURN_START, { turn: this.state.turn });
  }

  endPlayerTurn(): void {
    // 弃掉手牌
    this.state.player.hand.discardAll();

    // 应用回合结束效果
    this.applyTurnEndEffects(this.state.player);

    // 护甲衰减(可选规则)
    // this.state.player.armor = 0;

    this.startEnemyTurn();
  }

  async startEnemyTurn(): Promise<void> {
    this.state.phase = 'enemy';
    EventBus.emit(GameEvents.ENEMY_TURN_START);

    for (const enemy of this.state.enemies) {
      if (enemy.isAlive()) {
        await this.executeEnemyAction(enemy);
      }
    }

    // 检查玩家是否存活
    if (this.state.player.hp <= 0) {
      this.endBattle(false);
      return;
    }

    this.startPlayerTurn();
  }

  playCard(card: Card, target?: Entity): boolean {
    if (this.state.phase !== 'player') return false;
    if (this.state.player.energy < card.cost) return false;

    // 消耗能量
    this.state.player.energy -= card.cost;

    // 执行卡牌效果
    card.play(this.state.player, target, this.state.enemies);

    // 移动到弃牌堆(除非是消耗牌)
    if (card.exhaust) {
      this.state.player.hand.exhaust(card);
    } else {
      this.state.player.hand.discard(card);
    }

    EventBus.emit(GameEvents.CARD_PLAYED, { card, target });

    // 检查战斗是否结束
    this.checkBattleEnd();

    return true;
  }

  private checkBattleEnd(): void {
    const allEnemiesDead = this.state.enemies.every(e => !e.isAlive());
    if (allEnemiesDead) {
      this.endBattle(true);
    }
  }

  private endBattle(victory: boolean): void {
    this.state.isActive = false;
    EventBus.emit(GameEvents.BATTLE_END, { victory });

    if (victory) {
      GameStateManager.transition(GameState.REWARD);
    } else {
      GameStateManager.transition(GameState.GAME_OVER);
    }
  }
}
```

### 4. 卡牌系统

```typescript
// Card.ts

enum CardType {
  ATTACK = 'attack',
  SKILL = 'skill',
  POWER = 'power',
  STATUS = 'status',
  CURSE = 'curse'
}

enum CardRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  LEGENDARY = 'legendary'
}

enum Element {
  NONE = 'none',
  METAL = 'metal',
  WOOD = 'wood',
  WATER = 'water',
  FIRE = 'fire',
  EARTH = 'earth'
}

interface CardData {
  id: string;
  name: string;
  description: string;
  type: CardType;
  rarity: CardRarity;
  cost: number;
  element: Element;
  exhaust: boolean;
  upgradable: boolean;
  effects: CardEffect[];
}

abstract class Card {
  id: string;
  name: string;
  description: string;
  type: CardType;
  rarity: CardRarity;
  cost: number;
  element: Element;
  exhaust: boolean;
  upgraded: boolean = false;

  constructor(data: CardData) {
    Object.assign(this, data);
  }

  abstract play(owner: Player, target: Entity | null, allEnemies: Enemy[]): void;

  upgrade(): void {
    if (this.upgraded) return;
    this.upgraded = true;
    this.applyUpgrade();
  }

  protected abstract applyUpgrade(): void;

  getDisplayDescription(): string {
    // 替换变量显示实际数值
    return this.description
      .replace('{damage}', this.getDamage().toString())
      .replace('{armor}', this.getArmor().toString());
  }

  protected getDamage(): number { return 0; }
  protected getArmor(): number { return 0; }
}

// 具体卡牌实现示例
class StrikeCard extends Card {
  private baseDamage: number = 6;

  play(owner: Player, target: Entity): void {
    const damage = this.baseDamage + owner.strength;
    DamageCalculator.dealDamage(owner, target, damage, this.element);
  }

  protected applyUpgrade(): void {
    this.baseDamage = 9;
    this.name = "横劈+";
  }

  protected getDamage(): number {
    return this.baseDamage;
  }
}

class DefendCard extends Card {
  private baseArmor: number = 5;

  play(owner: Player): void {
    const armor = this.baseArmor + owner.dexterity;
    owner.gainArmor(armor);
  }

  protected applyUpgrade(): void {
    this.baseArmor = 8;
    this.name = "铁壁+";
  }

  protected getArmor(): number {
    return this.baseArmor;
  }
}
```

### 5. 地牢生成器

```typescript
// DungeonGenerator.ts

interface MapNode {
  id: string;
  type: RoomType;
  position: { x: number, y: number };
  connections: string[];
  visited: boolean;
  cleared: boolean;
}

enum RoomType {
  START = 'start',
  BATTLE = 'battle',
  ELITE = 'elite',
  BOSS = 'boss',
  SHOP = 'shop',
  REST = 'rest',
  EVENT = 'event',
  TREASURE = 'treasure'
}

class DungeonGenerator {
  private floorConfig: FloorConfig;

  generate(floor: number): MapNode[] {
    this.floorConfig = FLOOR_CONFIGS[floor];

    const nodes: MapNode[] = [];
    const rows = this.floorConfig.rows;
    const nodesPerRow = this.floorConfig.nodesPerRow;

    // 生成起点
    nodes.push(this.createNode('start_0', RoomType.START, 0, Math.floor(nodesPerRow / 2)));

    // 生成中间层
    for (let row = 1; row < rows - 1; row++) {
      const count = this.getNodesForRow(row);
      const offset = Math.floor((nodesPerRow - count) / 2);

      for (let col = 0; col < count; col++) {
        const type = this.getRandomRoomType(row, floor);
        nodes.push(this.createNode(`node_${row}_${col}`, type, row, col + offset));
      }
    }

    // 生成BOSS房
    nodes.push(this.createNode('boss_0', RoomType.BOSS, rows - 1, Math.floor(nodesPerRow / 2)));

    // 生成连接
    this.generateConnections(nodes, rows);

    // 确保路径连通性
    this.ensurePathExists(nodes);

    return nodes;
  }

  private getRandomRoomType(row: number, floor: number): RoomType {
    const weights = this.floorConfig.roomWeights;

    // 精英房只在特定行出现
    if (row === Math.floor(this.floorConfig.rows / 2)) {
      if (Random.chance(0.3)) return RoomType.ELITE;
    }

    // 休息点在后半段出现
    if (row > this.floorConfig.rows * 0.6) {
      if (Random.chance(0.2)) return RoomType.REST;
    }

    return WeightedRandom.pick([
      { value: RoomType.BATTLE, weight: weights.battle },
      { value: RoomType.EVENT, weight: weights.event },
      { value: RoomType.SHOP, weight: weights.shop },
      { value: RoomType.TREASURE, weight: weights.treasure }
    ]);
  }

  private generateConnections(nodes: MapNode[], rows: number): void {
    for (let row = 0; row < rows - 1; row++) {
      const currentRowNodes = nodes.filter(n => n.position.y === row);
      const nextRowNodes = nodes.filter(n => n.position.y === row + 1);

      for (const node of currentRowNodes) {
        // 每个节点连接1-3个下一行节点
        const connectionCount = Random.int(1, Math.min(3, nextRowNodes.length));
        const nearbyNodes = this.getNearbyNodes(node, nextRowNodes);

        for (let i = 0; i < connectionCount && i < nearbyNodes.length; i++) {
          node.connections.push(nearbyNodes[i].id);
        }
      }
    }
  }

  private getNearbyNodes(node: MapNode, candidates: MapNode[]): MapNode[] {
    return candidates
      .filter(n => Math.abs(n.position.x - node.position.x) <= 1)
      .sort((a, b) =>
        Math.abs(a.position.x - node.position.x) -
        Math.abs(b.position.x - node.position.x)
      );
  }
}

// 楼层配置
const FLOOR_CONFIGS: Record<number, FloorConfig> = {
  1: {
    name: "土牢",
    rows: 8,
    nodesPerRow: 4,
    roomWeights: { battle: 60, event: 15, shop: 10, treasure: 10, rest: 5 },
    enemyPool: ['slime', 'skeleton', 'goblin'],
    elitePool: ['stone_golem'],
    boss: 'earth_titan'
  },
  2: {
    name: "水狱",
    rows: 10,
    nodesPerRow: 5,
    roomWeights: { battle: 55, event: 18, shop: 12, treasure: 8, rest: 7 },
    enemyPool: ['water_sprite', 'kraken_spawn', 'sirens'],
    elitePool: ['sea_serpent'],
    boss: 'abyssal_lord'
  }
  // ... 更多楼层
};
```

### 6. 敌人AI系统

```typescript
// EnemyAI.ts

interface EnemyIntent {
  type: 'attack' | 'defend' | 'buff' | 'debuff' | 'summon' | 'special';
  value?: number;
  target?: Entity;
  description: string;
  icon: string;
}

abstract class EnemyAI {
  protected enemy: Enemy;
  protected intentHistory: EnemyIntent[] = [];

  constructor(enemy: Enemy) {
    this.enemy = enemy;
  }

  abstract decideIntent(): EnemyIntent;
  abstract executeIntent(intent: EnemyIntent): void;

  protected getRandomIntent(options: Array<{ intent: EnemyIntent, weight: number }>): EnemyIntent {
    return WeightedRandom.pick(options.map(o => ({ value: o.intent, weight: o.weight })));
  }
}

class BasicEnemyAI extends EnemyAI {
  private patterns: EnemyIntent[] = [];
  private patternIndex: number = 0;

  constructor(enemy: Enemy, patterns: EnemyIntent[]) {
    super(enemy);
    this.patterns = patterns;
  }

  decideIntent(): EnemyIntent {
    const intent = this.patterns[this.patternIndex];
    this.patternIndex = (this.patternIndex + 1) % this.patterns.length;
    return intent;
  }

  executeIntent(intent: EnemyIntent): void {
    switch (intent.type) {
      case 'attack':
        DamageCalculator.dealDamage(this.enemy, GameManager.instance.player, intent.value);
        break;
      case 'defend':
        this.enemy.gainArmor(intent.value);
        break;
      case 'buff':
        this.enemy.applyBuff(intent.buffType, intent.value);
        break;
      case 'debuff':
        GameManager.instance.player.applyDebuff(intent.debuffType, intent.value);
        break;
    }
  }
}

class BossAI extends EnemyAI {
  private phase: number = 1;
  private turnCount: number = 0;

  decideIntent(): EnemyIntent {
    this.updatePhase();
    return this.getPhaseIntent();
  }

  private updatePhase(): void {
    const hpPercent = this.enemy.hp / this.enemy.maxHp;
    if (hpPercent <= 0.25) this.phase = 3;
    else if (hpPercent <= 0.5) this.phase = 2;
    else this.phase = 1;
  }

  private getPhaseIntent(): EnemyIntent {
    switch (this.phase) {
      case 1:
        return this.getPhase1Intent();
      case 2:
        return this.getPhase2Intent();
      case 3:
        return this.getPhase3Intent();
    }
  }

  // 子类实现具体BOSS行为
  protected abstract getPhase1Intent(): EnemyIntent;
  protected abstract getPhase2Intent(): EnemyIntent;
  protected abstract getPhase3Intent(): EnemyIntent;
}
```

---

## 💾 数据配置格式

### 卡牌数据 (JSON)

```json
// cards/attack_cards.json
{
  "cards": [
    {
      "id": "strike",
      "name": "横劈",
      "nameUpgraded": "横劈+",
      "description": "造成{damage}点伤害",
      "type": "attack",
      "rarity": "common",
      "cost": 1,
      "costUpgraded": 1,
      "element": "none",
      "exhaust": false,
      "effects": [
        { "type": "damage", "value": 6, "valueUpgraded": 9, "target": "single" }
      ]
    },
    {
      "id": "heavy_blow",
      "name": "重击",
      "nameUpgraded": "重击+",
      "description": "造成{damage}点伤害，若敌人有易伤，额外造成{bonus}点伤害",
      "type": "attack",
      "rarity": "uncommon",
      "cost": 2,
      "element": "metal",
      "effects": [
        { "type": "damage", "value": 12, "valueUpgraded": 16, "target": "single" },
        { "type": "conditional_damage", "condition": "vulnerable", "value": 5, "valueUpgraded": 8 }
      ]
    },
    {
      "id": "whirlwind",
      "name": "旋风斩",
      "description": "消耗所有能量，对所有敌人造成{damage}x能量点伤害",
      "type": "attack",
      "rarity": "rare",
      "cost": -1,
      "element": "wood",
      "effects": [
        { "type": "damage_per_energy", "value": 5, "valueUpgraded": 8, "target": "all" }
      ]
    }
  ]
}
```

### 敌人数据 (JSON)

```json
// enemies/floor1_enemies.json
{
  "enemies": [
    {
      "id": "slime",
      "name": "史莱姆",
      "hp": { "min": 15, "max": 20 },
      "element": "water",
      "aiType": "pattern",
      "patterns": [
        { "type": "attack", "value": 5, "icon": "sword" },
        { "type": "attack", "value": 5, "icon": "sword" },
        { "type": "defend", "value": 4, "icon": "shield" }
      ],
      "drops": {
        "gold": { "min": 5, "max": 15 },
        "cardChance": 0.3
      }
    },
    {
      "id": "skeleton",
      "name": "骷髅兵",
      "hp": { "min": 28, "max": 35 },
      "element": "earth",
      "aiType": "weighted",
      "actions": [
        { "type": "attack", "value": 8, "weight": 50, "icon": "sword" },
        { "type": "defend", "value": 6, "weight": 30, "icon": "shield" },
        { "type": "debuff", "effect": "weak", "value": 1, "weight": 20, "icon": "skull" }
      ]
    }
  ],

  "elites": [
    {
      "id": "stone_golem",
      "name": "石傀儡",
      "hp": { "min": 80, "max": 100 },
      "element": "earth",
      "aiType": "boss",
      "phases": [
        {
          "threshold": 1.0,
          "actions": [
            { "type": "attack", "value": 12, "weight": 40 },
            { "type": "defend", "value": 15, "weight": 40 },
            { "type": "buff", "effect": "strength", "value": 2, "weight": 20 }
          ]
        },
        {
          "threshold": 0.5,
          "actions": [
            { "type": "attack", "value": 18, "weight": 50 },
            { "type": "special", "effect": "quake", "value": 8, "target": "all", "weight": 50 }
          ]
        }
      ],
      "drops": {
        "gold": { "min": 30, "max": 50 },
        "relicChance": 0.5
      }
    }
  ]
}
```

---

## 📱 微信小游戏适配

### 平台适配器

```typescript
// WechatAdapter.ts

class WechatAdapter {
  private static instance: WechatAdapter;

  // 初始化
  async init(): Promise<void> {
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    GameManager.instance.setScreenSize(systemInfo.windowWidth, systemInfo.windowHeight);

    // 初始化云开发
    wx.cloud.init({
      env: 'your-env-id'
    });

    // 初始化广告
    await AdManager.init();

    // 加载用户数据
    await this.loadUserData();
  }

  // 云存档
  async saveToCloud(data: SaveData): Promise<void> {
    const db = wx.cloud.database();
    const userInfo = await this.getUserInfo();

    await db.collection('saves').where({
      openId: userInfo.openId
    }).update({
      data: {
        saveData: data,
        updateTime: new Date()
      }
    });
  }

  async loadFromCloud(): Promise<SaveData | null> {
    const db = wx.cloud.database();
    const userInfo = await this.getUserInfo();

    const result = await db.collection('saves').where({
      openId: userInfo.openId
    }).get();

    return result.data[0]?.saveData || null;
  }

  // 分享
  shareAppMessage(title: string, imageUrl: string, query?: string): void {
    wx.shareAppMessage({
      title,
      imageUrl,
      query
    });
  }

  // 显示激励广告
  async showRewardedAd(): Promise<boolean> {
    return AdManager.showRewardedAd();
  }

  // 排行榜
  async submitScore(score: number): Promise<void> {
    const kvData = {
      wxgame: {
        score,
        update_time: Date.now()
      }
    };

    wx.setUserCloudStorage({
      KVDataList: [{ key: 'score', value: JSON.stringify(kvData) }]
    });
  }
}
```

### 广告管理器

```typescript
// AdManager.ts

class AdManager {
  private static rewardedAd: WechatMinigame.RewardedVideoAd | null = null;
  private static bannerAd: WechatMinigame.BannerAd | null = null;

  static async init(): Promise<void> {
    // 创建激励视频广告
    if (wx.createRewardedVideoAd) {
      this.rewardedAd = wx.createRewardedVideoAd({
        adUnitId: 'your-rewarded-ad-id'
      });

      this.rewardedAd.onError((err) => {
        console.error('激励广告加载失败', err);
      });
    }

    // 预加载广告
    await this.preloadRewardedAd();
  }

  static async showRewardedAd(): Promise<boolean> {
    if (!this.rewardedAd) return false;

    return new Promise((resolve) => {
      const onClose = (res: { isEnded: boolean }) => {
        this.rewardedAd.offClose(onClose);
        resolve(res.isEnded);

        // 预加载下一个广告
        this.preloadRewardedAd();
      };

      this.rewardedAd.onClose(onClose);

      this.rewardedAd.show().catch(() => {
        // 广告未加载完成，尝试重新加载
        this.rewardedAd.load().then(() => {
          this.rewardedAd.show();
        }).catch(() => {
          resolve(false);
        });
      });
    });
  }

  private static async preloadRewardedAd(): Promise<void> {
    if (this.rewardedAd) {
      await this.rewardedAd.load().catch(() => {});
    }
  }
}
```

---

## 🎯 性能优化策略

### 1. 对象池

```typescript
// ObjectPool.ts

class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;

  constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize: number = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;

    // 预创建对象
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  get(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  release(obj: T): void {
    this.resetFn(obj);
    this.pool.push(obj);
  }

  clear(): void {
    this.pool = [];
  }
}

// 使用示例
const damageNumberPool = new ObjectPool(
  () => new DamageNumber(),
  (dn) => dn.reset(),
  20
);
```

### 2. 资源管理

```typescript
// ResourceManager.ts

class ResourceManager {
  private static loadedResources: Map<string, any> = new Map();
  private static loadingPromises: Map<string, Promise<any>> = new Map();

  // 预加载资源
  static async preload(resources: string[]): Promise<void> {
    const promises = resources.map(res => this.load(res));
    await Promise.all(promises);
  }

  // 加载单个资源
  static async load<T>(path: string): Promise<T> {
    // 已加载
    if (this.loadedResources.has(path)) {
      return this.loadedResources.get(path);
    }

    // 正在加载
    if (this.loadingPromises.has(path)) {
      return this.loadingPromises.get(path);
    }

    // 开始加载
    const promise = new Promise<T>((resolve, reject) => {
      cc.resources.load(path, (err, asset) => {
        if (err) {
          reject(err);
        } else {
          this.loadedResources.set(path, asset);
          resolve(asset as T);
        }
        this.loadingPromises.delete(path);
      });
    });

    this.loadingPromises.set(path, promise);
    return promise;
  }

  // 释放资源
  static release(path: string): void {
    if (this.loadedResources.has(path)) {
      const asset = this.loadedResources.get(path);
      cc.resources.release(path);
      this.loadedResources.delete(path);
    }
  }

  // 释放场景资源
  static releaseSceneResources(scene: string): void {
    // 根据场景释放不再需要的资源
  }
}
```

### 3. 渲染优化

```typescript
// 合批优化
// 1. 使用图集 (Sprite Atlas)
// 2. 相同材质的精灵放在一起
// 3. 减少动态合批打断

// 卡牌渲染优化
class CardRenderer {
  private cardAtlas: cc.SpriteAtlas;
  private cardPool: ObjectPool<cc.Node>;

  // 批量更新卡牌显示
  updateHand(cards: Card[]): void {
    // 先隐藏所有
    this.hideAllCards();

    // 按顺序显示
    cards.forEach((card, index) => {
      const cardNode = this.cardPool.get();
      this.setupCard(cardNode, card, index);
    });
  }

  // 使用图集中的精灵
  private getCardSprite(cardId: string): cc.SpriteFrame {
    return this.cardAtlas.getSpriteFrame(cardId);
  }
}
```

---

## 📊 内存管理

```typescript
// MemoryManager.ts

class MemoryManager {
  private static readonly MEMORY_WARNING_THRESHOLD = 0.8; // 80%

  static init(): void {
    // 监听内存警告
    if (wx.onMemoryWarning) {
      wx.onMemoryWarning(() => {
        this.onMemoryWarning();
      });
    }

    // 定期检查内存
    setInterval(() => {
      this.checkMemory();
    }, 30000); // 30秒检查一次
  }

  private static onMemoryWarning(): void {
    console.warn('收到内存警告，执行清理');

    // 清理对象池
    ObjectPoolManager.shrinkAll();

    // 释放未使用的资源
    ResourceManager.releaseUnused();

    // 触发垃圾回收(如果可用)
    if (typeof gc === 'function') {
      gc();
    }
  }

  private static checkMemory(): void {
    const info = wx.getPerformance?.()?.memory;
    if (info) {
      const usage = info.usedJSHeapSize / info.totalJSHeapSize;
      if (usage > this.MEMORY_WARNING_THRESHOLD) {
        this.onMemoryWarning();
      }
    }
  }
}
```

---

*技术架构文档 v1.0*
