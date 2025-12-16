# 黎明之前 - 文字冒险游戏框架

一个类似「黎明前20分钟」风格的微信小游戏基础框架。

## 功能特性

- **对话系统**：支持打字机效果、角色名称显示
- **选择分支**：支持多选项分支剧情
- **场景管理**：支持背景图片、角色立绘、氛围粒子效果
- **存档系统**：支持保存/读取游戏进度
- **音频管理**：支持背景音乐和音效
- **UI系统**：标题画面、游戏菜单等

## 目录结构

```
minigame/
├── game.js                 # 游戏入口
├── game.json               # 小游戏配置
├── project.config.json     # 项目配置
├── js/
│   ├── engine/
│   │   └── GameEngine.js   # 游戏核心引擎
│   ├── managers/
│   │   ├── DialogueManager.js  # 对话管理器
│   │   ├── ChoiceManager.js    # 选择分支管理器
│   │   ├── SceneManager.js     # 场景管理器
│   │   ├── SaveManager.js      # 存档管理器
│   │   ├── UIRenderer.js       # UI渲染器
│   │   └── AudioManager.js     # 音频管理器
│   └── data/
│       └── story.js        # 剧情数据
├── images/                 # 图片资源（自行添加）
└── audio/                  # 音频资源（自行添加）
```

## 剧情编写指南

在 `js/data/story.js` 中编写剧情。每个剧情节点包含：

```javascript
'node_id': {
  // 场景配置
  scene: {
    background: 'images/bg.png',      // 背景图片
    atmosphere: 'firefly',            // 粒子效果: snow/rain/dust/firefly
    characters: [                     // 角色立绘
      { id: 'char1', sprite: 'images/char1.png', position: 'center' }
    ],
    overlay: { ... }                  // 氛围叠加层
  },

  // 音频
  bgm: 'audio/bgm.mp3',              // 背景音乐
  sfx: 'audio/sfx.mp3',              // 音效

  // 对话列表
  dialogues: [
    { text: '旁白文字' },
    { name: '角色名', text: '角色对话' }
  ],

  // 选项（可选）
  choices: [
    { text: '选项1', next: 'next_node', setVariables: { key: value } },
    { text: '选项2', next: 'another_node' }
  ],

  // 下一个节点（无选项时使用）
  next: 'next_node',

  // 设置变量（可选）
  setVariables: { key: value }
}
```

## 氛围效果

支持以下粒子效果：
- `snow` - 雪花飘落
- `rain` - 雨滴下落
- `dust` - 灰尘/光粒上升
- `firefly` - 萤火虫发光

## 自定义扩展

### 添加新功能

1. 在对应的管理器类中添加方法
2. 在 `GameEngine.js` 中调用

### 修改UI样式

在各个管理器的 `config` 对象中修改配置参数。

### 添加新的氛围效果

在 `SceneManager.js` 的 `createParticle` 和 `renderParticles` 方法中扩展。

## 使用方法

1. 使用微信开发者工具打开 `minigame` 目录
2. 在 `project.config.json` 中填写你的 AppID
3. 编辑 `js/data/story.js` 添加你的剧情
4. 添加图片和音频资源到对应目录
5. 预览或上传发布

## 注意事项

- 图片建议使用 PNG 格式，尺寸适中
- 背景音乐建议使用 MP3 格式
- 注意微信小游戏的代码包大小限制
