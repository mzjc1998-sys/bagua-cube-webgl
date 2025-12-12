# 八卦立方体 Unity 项目

基于易经八卦哲学的 3D 游戏，支持导出到微信小游戏平台。

## 项目结构

```
BaguaCubeUnity/
├── Assets/
│   ├── Scripts/
│   │   ├── Core/              # 核心游戏逻辑
│   │   │   ├── GameManager.cs      # 游戏管理器
│   │   │   ├── BaguaCube.cs        # 八卦立方体
│   │   │   └── SceneInitializer.cs # 场景初始化
│   │   ├── Player/            # 玩家相关
│   │   │   ├── StickManController.cs # 火柴人控制器
│   │   │   └── StickManRagdoll.cs    # 布娃娃系统
│   │   ├── Camera/            # 相机系统
│   │   │   └── BaguaCameraController.cs # 八卦视角相机
│   │   ├── Environment/       # 环境物体
│   │   │   ├── EnvironmentObject.cs    # 环境物体基类
│   │   │   ├── MapCollisionManager.cs  # 碰撞管理
│   │   │   ├── Tree.cs               # 树木
│   │   │   ├── Rock.cs               # 岩石
│   │   │   └── Obstacle.cs           # 障碍物
│   │   ├── UI/                # 用户界面
│   │   │   ├── GameUI.cs            # 游戏UI
│   │   │   ├── VirtualJoystick.cs   # 虚拟摇杆
│   │   │   └── ActionButton.cs      # 动作按钮
│   │   ├── WeChatExport/      # 微信小游戏导出
│   │   │   ├── WeChatMiniGameConfig.cs # 配置
│   │   │   ├── WeChatAPI.cs          # API封装
│   │   │   └── WeChatTouchInput.cs   # 触摸输入
│   │   └── Utils/             # 工具类
│   │       ├── ObjectPool.cs        # 对象池
│   │       ├── Singleton.cs         # 单例基类
│   │       └── MathUtils.cs         # 数学工具
│   ├── Plugins/
│   │   └── WebGL/
│   │       └── WeChatPlugin.jslib   # 微信JS插件
│   ├── Prefabs/               # 预制体
│   ├── Materials/             # 材质
│   ├── Textures/              # 贴图
│   ├── Audio/                 # 音频
│   └── Scenes/                # 场景
└── README.md
```

## 八卦系统

游戏基于易经八卦的二进制系统：

| 宫位 | 二进制 | 卦象 | 五行 |
|------|--------|------|------|
| 乾   | 000    | ☰    | 金   |
| 兑   | 001    | ☱    | 金   |
| 离   | 010    | ☲    | 火   |
| 震   | 011    | ☳    | 木   |
| 巽   | 100    | ☴    | 木   |
| 坎   | 101    | ☵    | 水   |
| 艮   | 110    | ☶    | 土   |
| 坤   | 111    | ☷    | 土   |

## 功能特点

- **火柴人角色**: 带有布娃娃物理系统
- **八卦视角**: 8个方向的等距视角切换
- **碰撞系统**: 完整的环境物体碰撞
- **微信小游戏**: 支持导出到微信小游戏平台

## 快速开始

1. 在 Unity 中打开项目
2. 创建新场景
3. 添加 `SceneInitializer` 组件到空物体
4. 在 Inspector 中点击 "Initialize Full Scene"
5. 运行游戏

## 控制方式

### 键盘
- WASD / 方向键: 移动
- Q/E: 切换宫位视角
- 1-8: 直接跳转到对应宫位
- Shift: 奔跑
- Escape: 暂停

### 触摸（微信小游戏）
- 左侧区域: 虚拟摇杆移动
- 右上区域: 跳跃
- 右下区域: 动作

## 导出微信小游戏

1. 安装 Unity WebGL 构建支持
2. 配置 `WeChatMiniGameConfig` 资源
3. Build Settings 选择 WebGL
4. 构建项目
5. 使用微信开发者工具导入构建文件

## 版本要求

- Unity 2021.3 LTS 或更高版本
- 微信开发者工具最新版本
