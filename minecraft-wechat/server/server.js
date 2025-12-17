/**
 * Minecraft多人联机服务器
 * 使用Node.js和WebSocket
 */

const WebSocket = require('ws');
const http = require('http');

// 服务器配置
const PORT = process.env.PORT || 8080;

// 创建HTTP服务器
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Minecraft Multiplayer Server\n');
});

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server });

// 房间管理
class Room {
  constructor(id, name, maxPlayers, hostId) {
    this.id = id;
    this.name = name;
    this.maxPlayers = maxPlayers;
    this.hostId = hostId;
    this.players = new Map();
    this.seed = Date.now();
    this.worldChanges = []; // 存储世界修改
    this.createdAt = Date.now();
  }

  addPlayer(player) {
    if (this.players.size >= this.maxPlayers) {
      return false;
    }
    this.players.set(player.id, player);
    player.roomId = this.id;
    return true;
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
    // 如果房主离开，转移房主或关闭房间
    if (playerId === this.hostId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value;
    }
  }

  broadcast(message, excludeId = null) {
    const data = JSON.stringify(message);
    for (const [id, player] of this.players) {
      if (id !== excludeId && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(data);
      }
    }
  }

  getInfo() {
    return {
      id: this.id,
      name: this.name,
      players: this.players.size,
      maxPlayers: this.maxPlayers,
      hostId: this.hostId
    };
  }

  serialize() {
    return {
      id: this.id,
      name: this.name,
      seed: this.seed,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
        rotation: p.rotation
      })),
      worldChanges: this.worldChanges
    };
  }
}

// 玩家类
class Player {
  constructor(ws, id) {
    this.ws = ws;
    this.id = id;
    this.name = '玩家' + id.substring(0, 4);
    this.roomId = null;
    this.position = { x: 0, y: 50, z: 0 };
    this.rotation = { x: 0, y: 0 };
    this.lastUpdate = Date.now();
  }

  send(message) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

// 全局状态
const players = new Map();
const rooms = new Map();

// 生成唯一ID
function generateId() {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

// 处理WebSocket连接
wss.on('connection', (ws) => {
  const playerId = generateId();
  const player = new Player(ws, playerId);
  players.set(playerId, player);

  console.log(`玩家连接: ${playerId}`);

  // 发送欢迎消息
  player.send({
    type: 'welcome',
    playerId: playerId
  });

  // 处理消息
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(player, message);
    } catch (err) {
      console.error('消息解析错误:', err);
    }
  });

  // 处理断开连接
  ws.on('close', () => {
    console.log(`玩家断开: ${playerId}`);
    handlePlayerDisconnect(player);
    players.delete(playerId);
  });

  // 处理错误
  ws.on('error', (err) => {
    console.error(`WebSocket错误 (${playerId}):`, err);
  });
});

// 处理消息
function handleMessage(player, message) {
  switch (message.type) {
    case 'get_rooms':
      handleGetRooms(player);
      break;

    case 'create_room':
      handleCreateRoom(player, message);
      break;

    case 'join_room':
      handleJoinRoom(player, message);
      break;

    case 'leave_room':
      handleLeaveRoom(player);
      break;

    case 'player_update':
      handlePlayerUpdate(player, message);
      break;

    case 'block_change':
      handleBlockChange(player, message);
      break;

    case 'chat':
      handleChat(player, message);
      break;

    case 'request_world_sync':
      handleWorldSync(player);
      break;

    default:
      console.log('未知消息类型:', message.type);
  }
}

// 获取房间列表
function handleGetRooms(player) {
  const roomList = Array.from(rooms.values()).map(room => room.getInfo());
  player.send({
    type: 'room_list',
    rooms: roomList
  });
}

// 创建房间
function handleCreateRoom(player, message) {
  const roomId = generateId();
  const room = new Room(
    roomId,
    message.name || '我的世界',
    message.maxPlayers || 8,
    player.id
  );

  rooms.set(roomId, room);
  room.addPlayer(player);

  console.log(`房间创建: ${roomId} by ${player.id}`);

  player.send({
    type: 'room_created',
    roomId: roomId,
    seed: room.seed,
    isHost: true
  });
}

// 加入房间
function handleJoinRoom(player, message) {
  const room = rooms.get(message.roomId);

  if (!room) {
    player.send({
      type: 'error',
      message: '房间不存在'
    });
    return;
  }

  if (room.players.size >= room.maxPlayers) {
    player.send({
      type: 'error',
      message: '房间已满'
    });
    return;
  }

  // 更新玩家名称
  if (message.playerName) {
    player.name = message.playerName;
  }

  // 加入房间
  room.addPlayer(player);

  console.log(`玩家 ${player.name} 加入房间 ${room.id}`);

  // 通知加入者
  player.send({
    type: 'room_joined',
    roomId: room.id,
    seed: room.seed,
    isHost: room.hostId === player.id,
    players: Array.from(room.players.values())
      .filter(p => p.id !== player.id)
      .map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
        rotation: p.rotation
      })),
    worldChanges: room.worldChanges
  });

  // 通知其他玩家
  room.broadcast({
    type: 'player_join',
    player: {
      id: player.id,
      name: player.name,
      position: player.position,
      rotation: player.rotation
    }
  }, player.id);
}

// 离开房间
function handleLeaveRoom(player) {
  const room = rooms.get(player.roomId);
  if (!room) return;

  room.removePlayer(player.id);

  // 通知其他玩家
  room.broadcast({
    type: 'player_leave',
    playerId: player.id
  });

  // 如果房间空了，删除房间
  if (room.players.size === 0) {
    rooms.delete(room.id);
    console.log(`房间删除: ${room.id}`);
  }

  player.roomId = null;
}

// 玩家状态更新
function handlePlayerUpdate(player, message) {
  const room = rooms.get(player.roomId);
  if (!room) return;

  const data = message.player;
  if (data) {
    if (data.position) player.position = data.position;
    if (data.rotation) player.rotation = data.rotation;
    if (data.name) player.name = data.name;
    player.lastUpdate = Date.now();
  }

  // 广播给其他玩家
  room.broadcast({
    type: 'player_update',
    player: {
      id: player.id,
      name: player.name,
      position: player.position,
      rotation: player.rotation
    }
  }, player.id);
}

// 方块变化
function handleBlockChange(player, message) {
  const room = rooms.get(player.roomId);
  if (!room) return;

  // 存储世界修改
  room.worldChanges.push({
    x: message.x,
    y: message.y,
    z: message.z,
    blockType: message.blockType,
    playerId: player.id,
    timestamp: Date.now()
  });

  // 限制存储数量
  if (room.worldChanges.length > 10000) {
    room.worldChanges = room.worldChanges.slice(-5000);
  }

  // 广播给其他玩家
  room.broadcast({
    type: 'block_change',
    x: message.x,
    y: message.y,
    z: message.z,
    blockType: message.blockType,
    action: message.action,
    playerId: player.id
  }, player.id);
}

// 聊天消息
function handleChat(player, message) {
  const room = rooms.get(player.roomId);
  if (!room) return;

  // 广播给所有玩家（包括发送者）
  room.broadcast({
    type: 'chat',
    playerId: player.id,
    playerName: player.name,
    message: message.message
  });
}

// 世界同步
function handleWorldSync(player) {
  const room = rooms.get(player.roomId);
  if (!room) return;

  player.send({
    type: 'world_sync',
    worldChanges: room.worldChanges
  });
}

// 玩家断开连接
function handlePlayerDisconnect(player) {
  if (player.roomId) {
    handleLeaveRoom(player);
  }
}

// 定期清理断开的连接和空房间
setInterval(() => {
  const now = Date.now();

  // 清理超时的玩家
  for (const [id, player] of players) {
    if (player.ws.readyState !== WebSocket.OPEN) {
      handlePlayerDisconnect(player);
      players.delete(id);
    }
  }

  // 清理空房间
  for (const [id, room] of rooms) {
    if (room.players.size === 0 && now - room.createdAt > 60000) {
      rooms.delete(id);
      console.log(`清理空房间: ${id}`);
    }
  }
}, 30000);

// 启动服务器
server.listen(PORT, () => {
  console.log(`Minecraft多人联机服务器启动`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
  console.log(`HTTP: http://localhost:${PORT}`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');

  // 通知所有玩家
  for (const [id, player] of players) {
    player.send({
      type: 'error',
      message: '服务器正在维护'
    });
    player.ws.close();
  }

  wss.close(() => {
    server.close(() => {
      console.log('服务器已关闭');
      process.exit(0);
    });
  });
});

module.exports = { server, wss };
