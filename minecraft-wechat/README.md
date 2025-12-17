# 方块世界 - Minecraft风格多人联机小游戏

一个使用WebGL开发的Minecraft风格3D方块世界游戏，支持微信小游戏和浏览器运行，具备多人联机功能。

## 功能特性

- 3D方块世界渲染（WebGL）
- 程序化地形生成（噪声算法）
- 玩家移动、跳跃、飞行
- 方块放置和破坏
- 多人在线联机
- 实时玩家同步
- 聊天系统
- 触摸和键鼠控制

## 项目结构

```
minecraft-wechat/
├── game.json           # 微信小游戏配置
├── project.config.json # 项目配置
├── game.js             # 游戏主入口（微信小游戏）
├── index.html          # 浏览器入口
├── js/
│   ├── renderer.js     # WebGL渲染引擎
│   ├── world.js        # 方块世界系统
│   ├── player.js       # 玩家控制
│   ├── network.js      # 网络通信
│   ├── ui.js           # 用户界面
│   └── input.js        # 输入处理
├── server/
│   ├── server.js       # 多人联机服务器
│   └── package.json    # 服务器依赖
└── assets/             # 资源文件（可选）
```

## 快速开始

### 浏览器运行

1. 启动本地服务器（需要支持ES6模块）:
```bash
# 使用Python
python -m http.server 3000

# 或使用Node.js
npx serve .
```

2. 打开浏览器访问 `http://localhost:3000`

### 多人联机

1. 安装服务器依赖:
```bash
cd server
npm install
```

2. 启动服务器:
```bash
npm start
```

3. 服务器默认运行在 `ws://localhost:8080`

4. 多个玩家可以通过局域网连接到同一服务器

### 微信小游戏

1. 下载并安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)

2. 导入项目目录 `minecraft-wechat`

3. 在 `project.config.json` 中填入你的AppID

4. 点击预览或真机调试

## 操作说明

### PC端
- `W/A/S/D` - 移动
- `空格` - 跳跃
- `鼠标移动` - 视角
- `左键点击` - 破坏方块
- `右键点击` - 放置方块
- `数字键1-9` - 选择快捷栏
- `F` - 切换飞行模式
- `ESC` - 打开菜单

### 移动端
- `左侧虚拟摇杆` - 移动
- `右侧滑动` - 视角
- `跳` - 跳跃
- `挖` - 破坏方块
- `放` - 放置方块
- `飞` - 切换飞行模式

## 方块类型

| ID | 名称 | 描述 |
|:--:|:----:|:----:|
| 0 | 空气 | 透明 |
| 1 | 草方块 | 地表 |
| 2 | 泥土 | 地下 |
| 3 | 石头 | 深层 |
| 4 | 木头 | 树干 |
| 5 | 树叶 | 树冠 |
| 6 | 沙子 | 海滩 |
| 7 | 水 | 液体 |
| 8 | 玻璃 | 透明 |
| 9 | 砖块 | 建筑 |
| 10 | 圆石 | 建筑 |
| 11 | 木板 | 建筑 |
| 12 | 基岩 | 底层 |

## 技术细节

### 渲染引擎
- 使用原生WebGL实现
- 贪婪网格合并优化
- 面剔除（只渲染暴露的面）
- 简单光照和雾效

### 世界生成
- Simplex噪声地形生成
- 16x16x16 Chunk分块
- 按需加载和卸载
- 程序化树木生成

### 网络同步
- WebSocket实时通信
- 玩家位置插值平滑
- 方块变化广播
- 房间系统管理

## 配置

### 服务器配置
编辑 `server/server.js`:
```javascript
const PORT = process.env.PORT || 8080;
```

### 客户端配置
编辑 `index.html` 或 `game.js`:
```javascript
this.serverUrl = 'ws://your-server-ip:8080';
```

## 扩展开发

### 添加新方块
1. 在 `js/world.js` 的 `BlockType` 中添加类型
2. 在 `js/renderer.js` 的着色器中添加颜色
3. 在 `js/ui.js` 的 `blockColors` 中添加UI颜色

### 添加新功能
- 生物/怪物系统
- 物品合成系统
- 存档功能
- 音效系统

## 注意事项

1. WebGL需要支持的浏览器
2. 多人联机需要服务器支持WebSocket
3. 微信小游戏需要配置安全域名
4. 建议使用Chrome/Safari等现代浏览器

## 许可证

MIT License
