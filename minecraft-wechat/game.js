/**
 * Minecraft微信小游戏 - 主入口
 * 支持多人联机的3D方块世界
 */

import { Renderer } from './js/renderer.js';
import { World, BlockType } from './js/world.js';
import { Player, RemotePlayer } from './js/player.js';
import { NetworkManager } from './js/network.js';
import { UI } from './js/ui.js';
import { InputManager } from './js/input.js';

class MinecraftGame {
  constructor() {
    this.canvas = null;
    this.renderer = null;
    this.world = null;
    this.player = null;
    this.network = null;
    this.ui = null;
    this.input = null;

    this.remotePlayers = new Map();
    this.chunkMeshes = new Map();

    this.lastTime = 0;
    this.running = false;

    // 游戏状态
    this.state = 'lobby'; // 'lobby', 'connecting', 'playing'
    this.serverUrl = 'ws://localhost:8080';
  }

  // 初始化游戏
  async init() {
    // 获取或创建画布
    if (typeof wx !== 'undefined') {
      // 微信小游戏环境
      this.canvas = wx.createCanvas();
      const info = wx.getSystemInfoSync();
      this.canvas.width = info.windowWidth;
      this.canvas.height = info.windowHeight;
    } else {
      // 浏览器环境
      this.canvas = document.getElementById('gameCanvas');
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'gameCanvas';
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        document.body.appendChild(this.canvas);
        document.body.style.margin = '0';
        document.body.style.overflow = 'hidden';
      }
    }

    // 初始化渲染器
    this.renderer = new Renderer(this.canvas);

    // 初始化UI（用于大厅界面）
    const uiCanvas = typeof wx !== 'undefined' ?
      wx.createCanvas() :
      this.createUICanvas();

    this.ui = new UI(uiCanvas, this);

    // 显示大厅界面
    this.showLobby();
  }

  // 创建UI画布（浏览器环境）
  createUICanvas() {
    let uiCanvas = document.getElementById('uiCanvas');
    if (!uiCanvas) {
      uiCanvas = document.createElement('canvas');
      uiCanvas.id = 'uiCanvas';
      uiCanvas.width = this.canvas.width;
      uiCanvas.height = this.canvas.height;
      uiCanvas.style.position = 'absolute';
      uiCanvas.style.top = '0';
      uiCanvas.style.left = '0';
      uiCanvas.style.pointerEvents = 'auto';
      document.body.appendChild(uiCanvas);
    }
    return uiCanvas;
  }

  // 显示大厅界面
  showLobby() {
    this.state = 'lobby';
    this.renderLobby();
  }

  // 渲染大厅
  renderLobby() {
    const ctx = this.ui.ctx;
    const width = this.ui.width;
    const height = this.ui.height;

    // 背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // 标题
    ctx.fillStyle = '#4af';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('方块世界', width / 2, 100);

    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText('Minecraft风格多人联机游戏', width / 2, 140);

    // 按钮
    this.lobbyButtons = [];

    // 创建房间按钮
    const createBtn = {
      x: width / 2 - 120,
      y: height / 2 - 60,
      width: 240,
      height: 50,
      label: '创建房间',
      action: 'create'
    };
    this.lobbyButtons.push(createBtn);

    // 加入房间按钮
    const joinBtn = {
      x: width / 2 - 120,
      y: height / 2 + 10,
      width: 240,
      height: 50,
      label: '加入房间',
      action: 'join'
    };
    this.lobbyButtons.push(joinBtn);

    // 单人游戏按钮
    const singleBtn = {
      x: width / 2 - 120,
      y: height / 2 + 80,
      width: 240,
      height: 50,
      label: '单人游戏',
      action: 'single'
    };
    this.lobbyButtons.push(singleBtn);

    // 绘制按钮
    for (const btn of this.lobbyButtons) {
      ctx.fillStyle = '#3a3a5a';
      ctx.fillRect(btn.x, btn.y, btn.width, btn.height);

      ctx.strokeStyle = '#5a5a8a';
      ctx.lineWidth = 2;
      ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);

      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + 32);
    }

    // 版本信息
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('v1.0.0', width - 20, height - 20);

    // 绑定点击事件
    this.ui.canvas.onclick = (e) => this.handleLobbyClick(e);
  }

  // 处理大厅点击
  handleLobbyClick(e) {
    if (this.state !== 'lobby') return;

    const rect = this.ui.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const btn of this.lobbyButtons) {
      if (x >= btn.x && x <= btn.x + btn.width &&
          y >= btn.y && y <= btn.y + btn.height) {
        this.handleLobbyAction(btn.action);
        break;
      }
    }
  }

  // 处理大厅动作
  async handleLobbyAction(action) {
    switch (action) {
      case 'create':
        await this.createRoom();
        break;
      case 'join':
        await this.showRoomList();
        break;
      case 'single':
        this.startSinglePlayer();
        break;
    }
  }

  // 创建房间
  async createRoom() {
    this.state = 'connecting';
    this.showConnecting('正在创建房间...');

    try {
      this.network = new NetworkManager(this);
      await this.network.connect(this.serverUrl);

      this.network.onRoomJoined = (data) => {
        console.log('房间已创建:', data.roomId);
        this.startMultiplayer(data);
      };

      this.network.createRoom('我的世界', 8);
    } catch (err) {
      console.error('连接失败:', err);
      this.showError('连接服务器失败，请检查网络');
    }
  }

  // 显示房间列表
  async showRoomList() {
    this.state = 'connecting';
    this.showConnecting('正在获取房间列表...');

    try {
      this.network = new NetworkManager(this);
      await this.network.connect(this.serverUrl);

      this.network.onRoomList = (rooms) => {
        this.renderRoomList(rooms);
      };

      this.network.getRoomList();
    } catch (err) {
      console.error('连接失败:', err);
      this.showError('连接服务器失败');
    }
  }

  // 渲染房间列表
  renderRoomList(rooms) {
    const ctx = this.ui.ctx;
    const width = this.ui.width;
    const height = this.ui.height;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('选择房间', width / 2, 60);

    this.roomButtons = [];

    if (rooms.length === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '18px Arial';
      ctx.fillText('暂无房间，请创建一个', width / 2, height / 2);
    } else {
      let y = 120;
      for (const room of rooms) {
        const btn = {
          x: width / 2 - 150,
          y: y,
          width: 300,
          height: 60,
          roomId: room.id,
          label: `${room.name} (${room.players}/${room.maxPlayers})`
        };
        this.roomButtons.push(btn);

        ctx.fillStyle = '#3a3a5a';
        ctx.fillRect(btn.x, btn.y, btn.width, btn.height);

        ctx.strokeStyle = '#5a5a8a';
        ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);

        ctx.fillStyle = 'white';
        ctx.font = '18px Arial';
        ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + 36);

        y += 80;
      }
    }

    // 返回按钮
    const backBtn = {
      x: 20,
      y: 20,
      width: 80,
      height: 40,
      label: '返回',
      action: 'back'
    };
    this.roomButtons.push(backBtn);

    ctx.fillStyle = '#3a3a5a';
    ctx.fillRect(backBtn.x, backBtn.y, backBtn.width, backBtn.height);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText(backBtn.label, backBtn.x + backBtn.width / 2, backBtn.y + 26);

    this.ui.canvas.onclick = (e) => this.handleRoomListClick(e);
  }

  // 处理房间列表点击
  handleRoomListClick(e) {
    const rect = this.ui.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const btn of this.roomButtons) {
      if (x >= btn.x && x <= btn.x + btn.width &&
          y >= btn.y && y <= btn.y + btn.height) {
        if (btn.action === 'back') {
          this.network.disconnect();
          this.showLobby();
        } else if (btn.roomId) {
          this.joinRoom(btn.roomId);
        }
        break;
      }
    }
  }

  // 加入房间
  joinRoom(roomId) {
    this.showConnecting('正在加入房间...');

    this.network.onRoomJoined = (data) => {
      console.log('已加入房间:', data.roomId);
      this.startMultiplayer(data);
    };

    this.network.joinRoom(roomId, '玩家');
  }

  // 显示连接中
  showConnecting(message) {
    const ctx = this.ui.ctx;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.ui.width, this.ui.height);

    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, this.ui.width / 2, this.ui.height / 2);
  }

  // 显示错误
  showError(message) {
    const ctx = this.ui.ctx;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.ui.width, this.ui.height);

    ctx.fillStyle = '#f44';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, this.ui.width / 2, this.ui.height / 2);

    ctx.fillStyle = 'white';
    ctx.font = '18px Arial';
    ctx.fillText('点击返回大厅', this.ui.width / 2, this.ui.height / 2 + 40);

    this.ui.canvas.onclick = () => this.showLobby();
  }

  // 开始单人游戏
  startSinglePlayer() {
    console.log('开始单人游戏');

    // 初始化世界
    this.world = new World(Date.now());

    // 初始化玩家
    const spawn = this.world.getSpawnPoint();
    this.player = new Player(this.world);
    this.player.position = spawn;

    // 初始化输入
    this.input = new InputManager(this.ui.canvas, this);

    // 开始游戏
    this.state = 'playing';
    this.running = true;
    this.ui.canvas.onclick = null;

    // 预生成周围的chunks
    this.generateInitialChunks();

    // 开始游戏循环
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  // 开始多人游戏
  startMultiplayer(roomData) {
    console.log('开始多人游戏');

    // 初始化世界（使用房间种子）
    this.world = new World(roomData.seed || Date.now());

    // 初始化玩家
    const spawn = this.world.getSpawnPoint();
    this.player = new Player(this.world, this.network.playerId);
    this.player.position = spawn;

    // 设置网络回调
    this.setupNetworkCallbacks();

    // 初始化输入
    this.input = new InputManager(this.ui.canvas, this);

    // 开始游戏
    this.state = 'playing';
    this.running = true;
    this.ui.canvas.onclick = null;

    // 预生成周围的chunks
    this.generateInitialChunks();

    // 开始游戏循环
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  // 设置网络回调
  setupNetworkCallbacks() {
    this.network.onPlayerJoin = (playerData) => {
      console.log('玩家加入:', playerData.name);
      const remote = new RemotePlayer(playerData);
      this.remotePlayers.set(playerData.id, remote);
      this.ui.addChatMessage(`${playerData.name} 加入了游戏`);
    };

    this.network.onPlayerLeave = (playerId) => {
      const remote = this.remotePlayers.get(playerId);
      if (remote) {
        this.ui.addChatMessage(`${remote.name} 离开了游戏`);
        this.remotePlayers.delete(playerId);
      }
    };

    this.network.onPlayerUpdate = (playerData) => {
      if (playerData.id === this.player.id) return;

      let remote = this.remotePlayers.get(playerData.id);
      if (!remote) {
        remote = new RemotePlayer(playerData);
        this.remotePlayers.set(playerData.id, remote);
      }
      remote.setTarget(playerData);
    };

    this.network.onBlockChange = (data) => {
      this.world.setBlock(data.x, data.y, data.z, data.blockType);
      this.updateChunkMesh(data.x, data.y, data.z);
    };

    this.network.onChat = (data) => {
      this.ui.addChatMessage(data.message, data.playerName);
    };

    this.network.onDisconnect = () => {
      this.ui.addChatMessage('与服务器断开连接');
      setTimeout(() => this.returnToLobby(), 3000);
    };
  }

  // 生成初始chunks
  generateInitialChunks() {
    const chunks = this.world.getChunksAround(
      this.player.position.x,
      this.player.position.y,
      this.player.position.z,
      2
    );

    for (const chunk of chunks) {
      this.updateChunkMeshFromChunk(chunk);
    }
  }

  // 更新chunk网格
  updateChunkMesh(x, y, z) {
    const chunkSize = this.world.chunkSize;
    const cx = Math.floor(x / chunkSize);
    const cy = Math.floor(y / chunkSize);
    const cz = Math.floor(z / chunkSize);

    const chunk = this.world.getChunk(cx, cy, cz);
    if (chunk) {
      this.updateChunkMeshFromChunk(chunk);
    }
  }

  // 从chunk更新网格
  updateChunkMeshFromChunk(chunk) {
    const key = this.world.getChunkKey(chunk.x, chunk.y, chunk.z);

    // 删除旧网格
    const oldMesh = this.chunkMeshes.get(key);
    if (oldMesh) {
      this.renderer.deleteMesh(oldMesh);
    }

    // 创建新网格
    const mesh = this.renderer.createBlockMesh(chunk);
    if (mesh) {
      this.chunkMeshes.set(key, mesh);
    }

    chunk.dirty = false;
  }

  // 游戏循环
  gameLoop(timestamp) {
    if (!this.running) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    // 更新
    this.update(dt);

    // 渲染
    this.render();

    requestAnimationFrame(this.gameLoop.bind(this));
  }

  // 更新
  update(dt) {
    // 更新输入
    this.input.update();

    // 更新玩家
    this.player.update(dt);

    // 更新远程玩家
    for (const [id, remote] of this.remotePlayers) {
      remote.update(dt);
    }

    // 更新chunks
    this.updateChunks();

    // 发送网络更新
    if (this.network && this.network.connected) {
      this.network.sendPlayerUpdate(this.player);
    }
  }

  // 更新chunks
  updateChunks() {
    // 获取玩家周围的chunks
    const chunks = this.world.getChunksAround(
      this.player.position.x,
      this.player.position.y,
      this.player.position.z,
      2
    );

    // 更新需要重建的chunk
    for (const chunk of chunks) {
      if (chunk.dirty) {
        this.updateChunkMeshFromChunk(chunk);
      }
    }
  }

  // 渲染
  render() {
    // 清屏
    this.renderer.clear();

    // 设置摄像机
    this.renderer.setViewMatrix(
      this.player.getEyePosition(),
      this.player.rotation
    );

    // 渲染所有chunk
    for (const [key, mesh] of this.chunkMeshes) {
      this.renderer.renderChunk(mesh);
    }

    // 渲染UI
    const targetBlock = this.player.getTargetBlock();
    this.ui.render(this.player, this.remotePlayers, targetBlock);
  }

  // 放置方块
  placeBlock() {
    const result = this.player.placeBlock();
    if (result.success) {
      this.updateChunkMesh(result.position.x, result.position.y, result.position.z);

      // 发送网络更新
      if (this.network && this.network.connected) {
        this.network.sendBlockChange(
          result.position.x,
          result.position.y,
          result.position.z,
          result.type,
          'place'
        );
      }
    }
  }

  // 破坏方块
  breakBlock() {
    const result = this.player.breakBlock();
    if (result.success) {
      this.updateChunkMesh(result.position.x, result.position.y, result.position.z);

      // 发送网络更新
      if (this.network && this.network.connected) {
        this.network.sendBlockChange(
          result.position.x,
          result.position.y,
          result.position.z,
          BlockType.AIR,
          'break'
        );
      }
    }
  }

  // 返回大厅
  returnToLobby() {
    this.running = false;

    if (this.network) {
      this.network.disconnect();
      this.network = null;
    }

    this.remotePlayers.clear();
    this.chunkMeshes.clear();

    this.showLobby();
  }

  // 处理世界同步
  handleWorldSync(chunksData) {
    for (const chunkData of chunksData) {
      const chunk = Chunk.deserialize(chunkData);
      this.world.chunks.set(this.world.getChunkKey(chunk.x, chunk.y, chunk.z), chunk);
      this.updateChunkMeshFromChunk(chunk);
    }
  }
}

// 启动游戏
const game = new MinecraftGame();
game.init().catch(console.error);

export default MinecraftGame;
