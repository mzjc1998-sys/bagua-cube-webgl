/**
 * 游戏入口文件
 * 「黎明之前」- 文字冒险游戏
 */

import GameEngine from './js/engine/GameEngine.js';
import DialogueManager from './js/managers/DialogueManager.js';
import ChoiceManager from './js/managers/ChoiceManager.js';
import SceneManager from './js/managers/SceneManager.js';
import SaveManager from './js/managers/SaveManager.js';
import UIRenderer from './js/managers/UIRenderer.js';
import AudioManager from './js/managers/AudioManager.js';
import storyData from './js/data/story.js';

// 创建游戏实例
const game = new GameEngine();

// 创建各个管理器
const dialogueManager = new DialogueManager();
const choiceManager = new ChoiceManager();
const sceneManager = new SceneManager();
const saveManager = new SaveManager();
const uiRenderer = new UIRenderer();
const audioManager = new AudioManager();

// 设置游戏标题
uiRenderer.setTitle('黎明之前', 'Before Dawn');

// 设置模块引用
game.setModules({
  dialogueManager,
  choiceManager,
  sceneManager,
  saveManager,
  uiRenderer,
  audioManager
});

// 加载剧情数据
game.loadStory(storyData);

// 初始化游戏
game.init();

console.log('游戏启动成功！');
