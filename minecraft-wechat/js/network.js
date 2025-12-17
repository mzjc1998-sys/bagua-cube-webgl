/**
 * 多人联机网络模块
 * 支持微信小游戏WebSocket和普通WebSocket
 */

export class NetworkManager {
  constructor(game) {
    this.game = game;
    this.socket = null;
    this.connected = false;
    this.playerId = null;
    this.roomId = null;
    this.isHost = false;

    // 消息队列
    this.messageQueue = [];
    this.lastSendTime = 0;
    this.sendInterval = 50; // 20Hz更新率

    // 回调
    this.onConnect = null;
    this.onDisconnect = null;
    this.onPlayerJoin = null;
    this.onPlayerLeave = null;
    this.onPlayerUpdate = null;
    this.onBlockChange = null;
    this.onChat = null;
    this.onError = null;
    this.onRoomList = null;
    this.onRoomJoined = null;
  }

  // 连接服务器
  connect(serverUrl) {
    return new Promise((resolve, reject) => {
      try {
        // 检测环境：微信小游戏或普通浏览器
        if (typeof wx !== 'undefined' && wx.connectSocket) {
          // 微信小游戏环境
          this.socket = wx.connectSocket({
            url: serverUrl,
            success: () => console.log('WebSocket连接中...'),
            fail: (err) => {
              console.error('WebSocket连接失败:', err);
              reject(err);
            }
          });

          wx.onSocketOpen(() => {
            this.connected = true;
            console.log('WebSocket已连接');
            if (this.onConnect) this.onConnect();
            resolve();
          });

          wx.onSocketMessage((res) => {
            this.handleMessage(res.data);
          });

          wx.onSocketClose(() => {
            this.connected = false;
            if (this.onDisconnect) this.onDisconnect();
          });

          wx.onSocketError((err) => {
            console.error('WebSocket错误:', err);
            if (this.onError) this.onError(err);
          });
        } else {
          // 普通浏览器环境
          this.socket = new WebSocket(serverUrl);

          this.socket.onopen = () => {
            this.connected = true;
            console.log('WebSocket已连接');
            if (this.onConnect) this.onConnect();
            resolve();
          };

          this.socket.onmessage = (event) => {
            this.handleMessage(event.data);
          };

          this.socket.onclose = () => {
            this.connected = false;
            if (this.onDisconnect) this.onDisconnect();
          };

          this.socket.onerror = (err) => {
            console.error('WebSocket错误:', err);
            if (this.onError) this.onError(err);
            reject(err);
          };
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      if (typeof wx !== 'undefined') {
        wx.closeSocket();
      } else {
        this.socket.close();
      }
      this.socket = null;
      this.connected = false;
    }
  }

  // 发送消息
  send(data) {
    if (!this.connected) return;

    const message = JSON.stringify(data);

    if (typeof wx !== 'undefined') {
      wx.sendSocketMessage({ data: message });
    } else {
      this.socket.send(message);
    }
  }

  // 处理接收到的消息
  handleMessage(data) {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'welcome':
          this.playerId = message.playerId;
          console.log('收到玩家ID:', this.playerId);
          break;

        case 'room_list':
          if (this.onRoomList) this.onRoomList(message.rooms);
          break;

        case 'room_joined':
          this.roomId = message.roomId;
          this.isHost = message.isHost;
          if (this.onRoomJoined) this.onRoomJoined(message);
          break;

        case 'room_created':
          this.roomId = message.roomId;
          this.isHost = true;
          if (this.onRoomJoined) this.onRoomJoined({ ...message, isHost: true });
          break;

        case 'player_join':
          if (this.onPlayerJoin) this.onPlayerJoin(message.player);
          break;

        case 'player_leave':
          if (this.onPlayerLeave) this.onPlayerLeave(message.playerId);
          break;

        case 'player_update':
          if (this.onPlayerUpdate) this.onPlayerUpdate(message.player);
          break;

        case 'block_change':
          if (this.onBlockChange) this.onBlockChange(message);
          break;

        case 'world_sync':
          if (this.game && this.game.handleWorldSync) {
            this.game.handleWorldSync(message.chunks);
          }
          break;

        case 'chat':
          if (this.onChat) this.onChat(message);
          break;

        case 'error':
          console.error('服务器错误:', message.message);
          if (this.onError) this.onError(message);
          break;

        default:
          console.log('未知消息类型:', message.type);
      }
    } catch (err) {
      console.error('消息解析错误:', err);
    }
  }

  // 获取房间列表
  getRoomList() {
    this.send({ type: 'get_rooms' });
  }

  // 创建房间
  createRoom(name, maxPlayers = 8) {
    this.send({
      type: 'create_room',
      name: name,
      maxPlayers: maxPlayers
    });
  }

  // 加入房间
  joinRoom(roomId, playerName) {
    this.send({
      type: 'join_room',
      roomId: roomId,
      playerName: playerName
    });
  }

  // 离开房间
  leaveRoom() {
    this.send({ type: 'leave_room' });
    this.roomId = null;
    this.isHost = false;
  }

  // 发送玩家状态更新
  sendPlayerUpdate(player) {
    const now = Date.now();
    if (now - this.lastSendTime < this.sendInterval) return;
    this.lastSendTime = now;

    this.send({
      type: 'player_update',
      player: player.serialize()
    });
  }

  // 发送方块变化
  sendBlockChange(x, y, z, type, action) {
    this.send({
      type: 'block_change',
      x: x,
      y: y,
      z: z,
      blockType: type,
      action: action // 'place' 或 'break'
    });
  }

  // 发送聊天消息
  sendChat(message) {
    this.send({
      type: 'chat',
      message: message
    });
  }

  // 请求世界同步
  requestWorldSync() {
    this.send({ type: 'request_world_sync' });
  }
}

export default NetworkManager;
