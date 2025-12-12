/**
 * 八卦立方体 - 微信小游戏
 * Unity WebGL 模式
 *
 * 四维超立方体的三维投影 - 时空切片
 * 边长10m的正方体内部视角
 */

const GameConfig = require('./game-config.js');
const UnityBridge = require('./unity-bridge.js');
const UnityAdapter = require('./unity-adapter.js');

// 游戏画布
let canvas = null;
let loadingCtx = null;

// ==================== 加载界面 ====================

function showLoadingScreen() {
  loadingCtx = canvas.getContext('2d');
  const sysInfo = wx.getSystemInfoSync();
  const W = sysInfo.windowWidth;
  const H = sysInfo.windowHeight;
  const DPR = sysInfo.pixelRatio;

  canvas.width = W * DPR;
  canvas.height = H * DPR;

  loadingCtx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // 背景
  loadingCtx.fillStyle = '#1a1a2e';
  loadingCtx.fillRect(0, 0, W, H);

  // 标题
  loadingCtx.fillStyle = '#ffffff';
  loadingCtx.font = 'bold 28px sans-serif';
  loadingCtx.textAlign = 'center';
  loadingCtx.fillText('八卦立方体', W / 2, H / 2 - 60);

  // 副标题
  loadingCtx.font = '16px sans-serif';
  loadingCtx.fillStyle = '#888888';
  loadingCtx.fillText('Unity WebGL 模式', W / 2, H / 2 - 30);

  // 加载提示
  loadingCtx.fillStyle = '#ffffff';
  loadingCtx.font = '14px sans-serif';
  loadingCtx.fillText('加载中...', W / 2, H / 2 + 10);
}

function updateLoadingProgress(progress) {
  if (!loadingCtx) return;

  const sysInfo = wx.getSystemInfoSync();
  const W = sysInfo.windowWidth;
  const H = sysInfo.windowHeight;
  const DPR = sysInfo.pixelRatio;

  loadingCtx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // 清除进度条区域
  loadingCtx.fillStyle = '#1a1a2e';
  loadingCtx.fillRect(W / 2 - 120, H / 2 + 30, 240, 50);

  // 进度条背景
  loadingCtx.fillStyle = '#333355';
  loadingCtx.fillRect(W / 2 - 100, H / 2 + 40, 200, 12);

  // 进度条
  loadingCtx.fillStyle = '#6366f1';
  loadingCtx.fillRect(W / 2 - 100, H / 2 + 40, 200 * progress, 12);

  // 进度文字
  loadingCtx.fillStyle = '#ffffff';
  loadingCtx.font = '12px sans-serif';
  loadingCtx.textAlign = 'center';
  loadingCtx.fillText(`${Math.round(progress * 100)}%`, W / 2, H / 2 + 70);
}

function hideLoadingScreen() {
  loadingCtx = null;
}

function showError(title, message) {
  if (!loadingCtx) return;

  const sysInfo = wx.getSystemInfoSync();
  const W = sysInfo.windowWidth;
  const H = sysInfo.windowHeight;
  const DPR = sysInfo.pixelRatio;

  loadingCtx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // 背景
  loadingCtx.fillStyle = '#1a1a2e';
  loadingCtx.fillRect(0, 0, W, H);

  // 错误标题
  loadingCtx.fillStyle = '#ff6b6b';
  loadingCtx.font = 'bold 20px sans-serif';
  loadingCtx.textAlign = 'center';
  loadingCtx.fillText(title, W / 2, H / 2 - 30);

  // 错误信息
  loadingCtx.fillStyle = '#ffffff';
  loadingCtx.font = '14px sans-serif';
  loadingCtx.fillText(message, W / 2, H / 2 + 10);
}

// ==================== Unity 初始化 ====================

function initUnityGame() {
  console.log('初始化 Unity WebGL 模式...');

  // 检查 Unity 构建文件
  if (!GameConfig.checkUnityBuildExists()) {
    console.error('Unity 构建文件不存在');
    showError('加载失败', 'Unity 构建文件不存在，请先导出 Unity WebGL');
    wx.showModal({
      title: '提示',
      content: 'Unity WebGL 构建文件不存在，请先在 Unity 中导出 WebGL 构建到 minigame/Build/ 目录',
      showCancel: false,
    });
    return;
  }

  // 初始化 Unity 适配器
  if (!UnityAdapter.init(canvas, {
    dataUrl: GameConfig.getUnityBuildPath(GameConfig.unity.dataFile),
    frameworkUrl: GameConfig.getUnityBuildPath(GameConfig.unity.frameworkFile),
    codeUrl: GameConfig.getUnityBuildPath(GameConfig.unity.wasmFile),
  })) {
    console.error('Unity adapter init failed');
    showError('初始化失败', 'Unity 适配器初始化失败');
    return;
  }

  // 初始化微信桥接
  UnityBridge.init();
  UnityBridge.initTouchListeners();

  // 显示加载界面
  showLoadingScreen();

  // 进度回调
  UnityAdapter.onProgress = (progress) => {
    console.log(`Unity 加载进度: ${Math.round(progress * 100)}%`);
    updateLoadingProgress(progress);
  };

  // 加载完成回调
  UnityAdapter.onReady = (instance) => {
    console.log('Unity WebGL 加载完成');
    hideLoadingScreen();

    // 向 Unity 发送初始化数据
    UnityAdapter.sendMessage('GameManager', 'InitFromWeChat', JSON.stringify({
      systemInfo: UnityBridge.getSystemInfo(),
      config: GameConfig.common,
    }));
  };

  // 加载错误回调
  UnityAdapter.onError = (error) => {
    console.error('Unity WebGL 加载失败:', error);
    showError('加载失败', error.message || '未知错误');
    wx.showModal({
      title: '加载失败',
      content: `Unity WebGL 加载失败: ${error.message || '未知错误'}`,
      showCancel: false,
    });
  };

  // 开始加载
  UnityAdapter.load();
}

// ==================== 主入口 ====================

console.log('========================================');
console.log('八卦立方体 - Unity WebGL 模式');
console.log('版本:', GameConfig.common.version);
console.log('========================================');

// 创建画布
canvas = wx.createCanvas();

// 启动 Unity
initUnityGame();
