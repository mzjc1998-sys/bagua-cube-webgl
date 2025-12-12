# 八卦立方体 - 微信小游戏

基于易经八卦的微信小游戏，使用 Unity WebGL 渲染。

## 项目结构

```
minigame/
├── game.js              # 主程序入口 (Unity WebGL 加载器)
├── game.json            # 小游戏配置
├── project.config.json  # 项目配置
├── Build/               # Unity WebGL 构建输出目录
│   ├── webgl.data
│   ├── webgl.framework.js
│   └── webgl.wasm
└── README.md
```

## Unity 项目

Unity 项目位于 `BaguaCubeUnity/` 目录：

```
BaguaCubeUnity/
├── Assets/
│   ├── Scripts/
│   │   ├── Core/           # 核心脚本 (BaguaCube, GameManager)
│   │   ├── Player/         # 火柴人控制器
│   │   └── ...
│   └── Plugins/WebGL/      # 微信 API 插件
├── Packages/
└── ProjectSettings/
```

## 导出步骤

### 1. 安装微信小游戏 Unity 插件

```
参考官方文档:
https://github.com/nichunen/minigame-unity-webgl-transform
```

1. 下载微信小游戏 Unity SDK
2. 在 Unity 中导入 SDK 包
3. 配置项目设置

### 2. Unity 项目设置

1. 打开 `BaguaCubeUnity` 项目
2. File → Build Settings → 选择 **WebGL** 平台
3. Player Settings 配置:
   - Company Name: 你的公司名
   - Product Name: 八卦立方体
   - WebGL Memory Size: 256MB
   - Compression Format: Brotli (推荐) 或 Disabled

### 3. 导出微信小游戏

1. 菜单: 微信小游戏 → 导出
2. 导出目录选择: `minigame/`
3. 等待导出完成

### 4. 预览

在微信开发者工具中打开 `minigame` 目录即可预览。

## 功能

- 八卦立方体 3D 可视化（8个顶点代表八卦）
- 火柴人程序化行走动画
- 点击顶点切换宫位视角
- 物理引擎支持

## 交互

- **点击顶点**: 切换到对应宫位视角
- 八宫: 乾、坤、震、巽、坎、离、艮、兑

## 微信 API 支持

Unity 可通过 `WeChatPlugin.jslib` 调用微信 API:
- Toast / Modal 弹窗
- 震动反馈
- 本地存储
- 分享
- 广告 (Banner / 激励视频)

## 调试

```csharp
// Unity 调用微信 API 示例
[DllImport("__Internal")]
private static extern void WXShowToast(string title, string icon, int duration);

// 调用
WXShowToast("游戏开始", "success", 1500);
```
