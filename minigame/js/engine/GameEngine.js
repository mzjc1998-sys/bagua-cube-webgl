/**
 * 游戏核心引擎
 * 管理游戏主循环、场景、状态等
 */
class GameEngine {
  constructor() {
    // 画布和上下文
    this.canvas = null;
    this.ctx = null;

    // 屏幕尺寸
    this.screenWidth = 0;
    this.screenHeight = 0;
    this.dpr = 1;

    // 游戏状态
    this.gameState = 'title'; // title, playing, paused, menu

    // 模块引用
    this.dialogueManager = null;
    this.choiceManager = null;
    this.sceneManager = null;
    this.saveManager = null;
    this.uiRenderer = null;
    this.audioManager = null;

    // 当前剧情数据
    this.storyData = null;
    this.currentChapter = null;
    this.currentNode = null;

    // 游戏变量（用于分支判断）
    this.gameVariables = {};

    // 触摸状态
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.isTouching = false;

    // 时间相关
    this.lastTime = 0;
    this.deltaTime = 0;

    // 过渡效果
    this.transition = {
      active: false,
      type: 'fade',
      progress: 0,
      duration: 500,
      callback: null
    };
  }

  /**
   * 初始化游戏引擎
   */
  init() {
    // 创建画布
    this.canvas = wx.createCanvas();
    this.ctx = this.canvas.getContext('2d');

    // 获取屏幕信息
    const systemInfo = wx.getSystemInfoSync();
    this.screenWidth = systemInfo.windowWidth;
    this.screenHeight = systemInfo.windowHeight;
    this.dpr = systemInfo.pixelRatio;

    // 设置画布大小
    this.canvas.width = this.screenWidth * this.dpr;
    this.canvas.height = this.screenHeight * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);

    // 初始化各模块
    this.initModules();

    // 绑定触摸事件
    this.bindEvents();

    // 开始游戏循环
    this.lastTime = Date.now();
    this.gameLoop();

    console.log('[GameEngine] 初始化完成');
  }

  /**
   * 初始化各模块
   */
  initModules() {
    // 由外部设置模块引用
  }

  /**
   * 设置模块引用
   */
  setModules({ dialogueManager, choiceManager, sceneManager, saveManager, uiRenderer, audioManager }) {
    this.dialogueManager = dialogueManager;
    this.choiceManager = choiceManager;
    this.sceneManager = sceneManager;
    this.saveManager = saveManager;
    this.uiRenderer = uiRenderer;
    this.audioManager = audioManager;
  }

  /**
   * 绑定触摸事件
   */
  bindEvents() {
    wx.onTouchStart((e) => {
      if (e.touches.length > 0) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.isTouching = true;
      }
    });

    wx.onTouchEnd((e) => {
      if (!this.isTouching) return;
      this.isTouching = false;

      const touch = e.changedTouches[0];
      if (!touch) return;

      const x = touch.clientX;
      const y = touch.clientY;

      this.handleTap(x, y);
    });
  }

  /**
   * 处理点击事件
   */
  handleTap(x, y) {
    // 过渡动画中不响应
    if (this.transition.active) return;

    switch (this.gameState) {
      case 'title':
        this.handleTitleTap(x, y);
        break;
      case 'playing':
        this.handlePlayingTap(x, y);
        break;
      case 'menu':
        this.handleMenuTap(x, y);
        break;
    }
  }

  /**
   * 标题画面点击
   */
  handleTitleTap(x, y) {
    const buttons = this.uiRenderer?.getTitleButtons() || [];
    for (const btn of buttons) {
      if (this.isInRect(x, y, btn)) {
        if (btn.action === 'start') {
          this.startNewGame();
        } else if (btn.action === 'continue') {
          this.continueGame();
        }
        break;
      }
    }
  }

  /**
   * 游戏中点击
   */
  handlePlayingTap(x, y) {
    // 检查是否点击选项
    if (this.choiceManager?.isActive()) {
      const choice = this.choiceManager.getChoiceAt(x, y);
      if (choice !== null) {
        this.selectChoice(choice);
        return;
      }
    }

    // 检查是否点击菜单按钮
    const menuBtn = this.uiRenderer?.getMenuButton();
    if (menuBtn && this.isInRect(x, y, menuBtn)) {
      this.openMenu();
      return;
    }

    // 推进对话
    if (this.dialogueManager) {
      this.dialogueManager.advance();
    }
  }

  /**
   * 菜单点击
   */
  handleMenuTap(x, y) {
    const buttons = this.uiRenderer?.getMenuButtons() || [];
    for (const btn of buttons) {
      if (this.isInRect(x, y, btn)) {
        this.handleMenuAction(btn.action);
        break;
      }
    }
  }

  /**
   * 处理菜单操作
   */
  handleMenuAction(action) {
    switch (action) {
      case 'resume':
        this.gameState = 'playing';
        break;
      case 'save':
        this.saveGame();
        break;
      case 'load':
        this.loadGame();
        break;
      case 'title':
        this.goToTitle();
        break;
    }
  }

  /**
   * 判断点是否在矩形内
   */
  isInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.width &&
           y >= rect.y && y <= rect.y + rect.height;
  }

  /**
   * 开始新游戏
   */
  startNewGame() {
    this.gameVariables = {};
    this.startTransition('fade', () => {
      this.gameState = 'playing';
      if (this.storyData) {
        this.jumpToNode(this.storyData.startNode || 'start');
      }
    });
  }

  /**
   * 继续游戏
   */
  continueGame() {
    const saveData = this.saveManager?.load();
    if (saveData) {
      this.gameVariables = saveData.variables || {};
      this.startTransition('fade', () => {
        this.gameState = 'playing';
        this.jumpToNode(saveData.currentNode);
        if (saveData.scene) {
          this.sceneManager?.setScene(saveData.scene);
        }
      });
    } else {
      // 没有存档，开始新游戏
      this.startNewGame();
    }
  }

  /**
   * 保存游戏
   */
  saveGame() {
    if (this.saveManager) {
      const data = {
        currentNode: this.currentNode?.id,
        variables: this.gameVariables,
        scene: this.sceneManager?.getCurrentScene(),
        timestamp: Date.now()
      };
      this.saveManager.save(data);
    }
  }

  /**
   * 读取游戏
   */
  loadGame() {
    this.continueGame();
  }

  /**
   * 返回标题
   */
  goToTitle() {
    this.startTransition('fade', () => {
      this.gameState = 'title';
      this.dialogueManager?.clear();
      this.choiceManager?.clear();
    });
  }

  /**
   * 打开菜单
   */
  openMenu() {
    this.gameState = 'menu';
  }

  /**
   * 加载剧情数据
   */
  loadStory(storyData) {
    this.storyData = storyData;
    console.log('[GameEngine] 剧情数据加载完成');
  }

  /**
   * 跳转到指定节点
   */
  jumpToNode(nodeId) {
    if (!this.storyData || !this.storyData.nodes) {
      console.error('[GameEngine] 没有剧情数据');
      return;
    }

    const node = this.storyData.nodes[nodeId];
    if (!node) {
      console.error(`[GameEngine] 找不到节点: ${nodeId}`);
      return;
    }

    this.currentNode = { ...node, id: nodeId };
    this.processNode(node);
  }

  /**
   * 处理节点
   */
  processNode(node) {
    // 处理场景切换
    if (node.scene && this.sceneManager) {
      this.sceneManager.setScene(node.scene);
    }

    // 处理背景音乐
    if (node.bgm && this.audioManager) {
      this.audioManager.playBGM(node.bgm);
    }

    // 处理音效
    if (node.sfx && this.audioManager) {
      this.audioManager.playSFX(node.sfx);
    }

    // 处理对话
    if (node.dialogues && this.dialogueManager) {
      this.dialogueManager.setDialogues(node.dialogues, () => {
        this.onDialoguesComplete(node);
      });
    }

    // 处理选项
    if (node.choices && this.choiceManager) {
      this.choiceManager.setChoices(node.choices);
    }

    // 处理变量设置
    if (node.setVariables) {
      Object.assign(this.gameVariables, node.setVariables);
    }
  }

  /**
   * 对话完成回调
   */
  onDialoguesComplete(node) {
    // 如果有选项，等待选择
    if (node.choices && node.choices.length > 0) {
      this.choiceManager?.show();
      return;
    }

    // 自动跳转到下一个节点
    if (node.next) {
      this.jumpToNode(node.next);
    }
  }

  /**
   * 选择选项
   */
  selectChoice(index) {
    const choice = this.choiceManager?.getChoice(index);
    if (!choice) return;

    // 处理选项效果
    if (choice.setVariables) {
      Object.assign(this.gameVariables, choice.setVariables);
    }

    // 隐藏选项
    this.choiceManager?.clear();

    // 跳转到目标节点
    if (choice.next) {
      this.jumpToNode(choice.next);
    }
  }

  /**
   * 获取变量值
   */
  getVariable(key) {
    return this.gameVariables[key];
  }

  /**
   * 设置变量值
   */
  setVariable(key, value) {
    this.gameVariables[key] = value;
  }

  /**
   * 开始过渡动画
   */
  startTransition(type, callback, duration = 500) {
    this.transition = {
      active: true,
      type,
      progress: 0,
      duration,
      callback,
      phase: 'out' // out -> callback -> in
    };
  }

  /**
   * 更新过渡动画
   */
  updateTransition() {
    if (!this.transition.active) return;

    const speed = this.deltaTime / this.transition.duration;

    if (this.transition.phase === 'out') {
      this.transition.progress += speed * 2;
      if (this.transition.progress >= 1) {
        this.transition.progress = 1;
        if (this.transition.callback) {
          this.transition.callback();
        }
        this.transition.phase = 'in';
      }
    } else {
      this.transition.progress -= speed * 2;
      if (this.transition.progress <= 0) {
        this.transition.progress = 0;
        this.transition.active = false;
      }
    }
  }

  /**
   * 游戏主循环
   */
  gameLoop() {
    const now = Date.now();
    this.deltaTime = now - this.lastTime;
    this.lastTime = now;

    // 更新
    this.update();

    // 渲染
    this.render();

    // 下一帧
    requestAnimationFrame(() => this.gameLoop());
  }

  /**
   * 更新逻辑
   */
  update() {
    // 更新过渡动画
    this.updateTransition();

    // 更新对话
    if (this.dialogueManager) {
      this.dialogueManager.update(this.deltaTime);
    }

    // 更新场景
    if (this.sceneManager) {
      this.sceneManager.update(this.deltaTime);
    }
  }

  /**
   * 渲染画面
   */
  render() {
    const ctx = this.ctx;

    // 清空画布
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    switch (this.gameState) {
      case 'title':
        this.renderTitle();
        break;
      case 'playing':
        this.renderPlaying();
        break;
      case 'menu':
        this.renderPlaying(); // 先渲染游戏画面
        this.renderMenu();    // 再渲染菜单遮罩
        break;
    }

    // 渲染过渡效果
    this.renderTransition();
  }

  /**
   * 渲染标题画面
   */
  renderTitle() {
    if (this.uiRenderer) {
      this.uiRenderer.renderTitle(this.ctx, this.screenWidth, this.screenHeight);
    }
  }

  /**
   * 渲染游戏画面
   */
  renderPlaying() {
    // 渲染场景背景
    if (this.sceneManager) {
      this.sceneManager.render(this.ctx, this.screenWidth, this.screenHeight);
    }

    // 渲染对话框
    if (this.dialogueManager) {
      this.dialogueManager.render(this.ctx, this.screenWidth, this.screenHeight);
    }

    // 渲染选项
    if (this.choiceManager?.isActive()) {
      this.choiceManager.render(this.ctx, this.screenWidth, this.screenHeight);
    }

    // 渲染UI（菜单按钮等）
    if (this.uiRenderer) {
      this.uiRenderer.renderPlayingUI(this.ctx, this.screenWidth, this.screenHeight);
    }
  }

  /**
   * 渲染菜单
   */
  renderMenu() {
    if (this.uiRenderer) {
      this.uiRenderer.renderMenu(this.ctx, this.screenWidth, this.screenHeight);
    }
  }

  /**
   * 渲染过渡效果
   */
  renderTransition() {
    if (!this.transition.active) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${this.transition.progress})`;
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
    ctx.restore();
  }
}

export default GameEngine;
