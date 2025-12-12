# 八卦立方体 - 微信小游戏

基于易经八卦的微信小游戏，支持 Canvas 2D 和 Unity WebGL 两种渲染模式。

## 项目结构

```
minigame/
├── game.js              # 主入口，模式选择和初始化
├── game-config.js       # 游戏配置
├── game-canvas.js       # Canvas 2D 渲染模式
├── unity-adapter.js     # Unity WebGL 适配器
├── unity-bridge.js      # Unity-WeChat API 桥接
├── game.json            # 小游戏配置
├── project.config.json  # 项目配置
├── Build/               # Unity WebGL 构建文件 (可选)
│   ├── webgl.data
│   ├── webgl.framework.js
│   └── webgl.wasm
└── README.md
```

## 渲染模式

### Canvas 2D 模式（默认）
- 轻量级，启动快
- 兼容性好，支持所有设备
- 2D 线条风格渲染

### Unity WebGL 模式
- 3D 渲染，视觉效果丰富
- 布娃娃物理系统
- 需要 Unity WebGL 构建文件

## 配置

编辑 `game-config.js` 可以修改游戏配置：

```javascript
// 切换模式
mode: 'canvas',  // 或 'unity'

// Canvas 配置
canvas: {
  targetFPS: 60,
  stickMan: {
    initialSpeed: 0.7,
    smoothness: 0.15,
  },
},

// Unity 配置
unity: {
  buildPath: 'Build',
  initialMemory: 64,
  maximumMemory: 256,
},
```

## Unity WebGL 导出步骤

1. 在 Unity 中打开 `BaguaCubeUnity` 项目
2. 构建设置选择 **WebGL**
3. Player Settings 配置：
   - Compression Format: Disabled (微信不支持压缩)
   - Memory Size: 64MB-256MB
   - Exception Support: None (减小包体)
4. 构建到 `minigame/Build/` 目录
5. 修改 `game-config.js` 中的 `mode` 为 `'unity'`

## API 桥接

Unity 可以通过 `WeChatBridge` 调用微信 API：

```csharp
// C# 端调用示例
[DllImport("__Internal")]
private static extern void WXShowToast(string title, string icon, int duration);

// 显示 Toast
WXShowToast("游戏开始", "success", 1500);
```

支持的 API：
- 系统信息
- Toast / Modal 弹窗
- 分享
- 震动反馈
- 本地存储
- Banner / 激励视频广告
- 触摸输入

## 调试

在微信开发者工具中打开 `minigame` 目录即可预览。

开启调试模式：
```javascript
// game-config.js
common: {
  debug: true,
  showFPS: true,
}
```

## 性能优化

- 低端设备自动使用 Canvas 模式
- Unity 构建使用分包加载
- WiFi 环境预加载 Unity 资源
