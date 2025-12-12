/**
 * 八卦立方体 - 微信小游戏
 * Unity WebGL 模式
 *
 * 使用微信官方 Unity WebGL 适配方案
 * https://github.com/nichunen/minigame-unity-webgl-transform
 */

// ==================== 配置 ====================
const CONFIG = {
  // Unity 构建文件路径
  UNITY_DIR: 'Build',
  DATA_FILE: 'webgl.data.unityweb.bin.br',
  FRAMEWORK_FILE: 'webgl.framework.js.unityweb.bin.br',
  CODE_FILE: 'webgl.wasm.unityweb.bin.br',

  // 游戏配置
  GAME_NAME: '八卦立方体',
  VERSION: '1.0.0',
  CUBE_SIZE: 10,
};

// ==================== 初始化 ====================
const canvas = wx.createCanvas();
const sysInfo = wx.getSystemInfoSync();
const W = sysInfo.windowWidth;
const H = sysInfo.windowHeight;
const DPR = sysInfo.pixelRatio;

canvas.width = W * DPR;
canvas.height = H * DPR;

// ==================== Unity WebGL 加载器 ====================
let unityInstance = null;
let loadingProgress = 0;

function checkUnityBuildExists() {
  try {
    const fs = wx.getFileSystemManager();
    // 检查 framework 文件是否存在
    fs.accessSync(`${CONFIG.UNITY_DIR}/${CONFIG.FRAMEWORK_FILE}`);
    return true;
  } catch (e) {
    // 尝试检查不带压缩后缀的文件
    try {
      const fs = wx.getFileSystemManager();
      fs.accessSync(`${CONFIG.UNITY_DIR}/webgl.framework.js`);
      CONFIG.DATA_FILE = 'webgl.data';
      CONFIG.FRAMEWORK_FILE = 'webgl.framework.js';
      CONFIG.CODE_FILE = 'webgl.wasm';
      return true;
    } catch (e2) {
      return false;
    }
  }
}

function showLoadingScreen(ctx) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(CONFIG.GAME_NAME, W / 2, H / 2 - 60);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#888888';
  ctx.fillText('Unity WebGL 模式', W / 2, H / 2 - 30);

  ctx.fillStyle = '#ffffff';
  ctx.font = '14px sans-serif';
  ctx.fillText(`加载中... ${Math.round(loadingProgress * 100)}%`, W / 2, H / 2 + 10);

  // 进度条
  const barWidth = 200;
  const barHeight = 10;
  const barX = (W - barWidth) / 2;
  const barY = H / 2 + 40;

  ctx.fillStyle = '#333355';
  ctx.fillRect(barX, barY, barWidth, barHeight);

  ctx.fillStyle = '#6366f1';
  ctx.fillRect(barX, barY, barWidth * loadingProgress, barHeight);
}

function showError(ctx, title, message) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#ff6b6b';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, W / 2, H / 2 - 30);

  ctx.fillStyle = '#ffffff';
  ctx.font = '14px sans-serif';

  // 多行文本
  const lines = message.split('\n');
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, H / 2 + 10 + i * 20);
  });
}

function loadUnityGame() {
  const ctx = canvas.getContext('2d');

  // 显示加载界面
  showLoadingScreen(ctx);

  // 检查 Unity 构建文件
  if (!checkUnityBuildExists()) {
    console.log('Unity 构建文件不存在，请先导出 Unity WebGL');
    showError(ctx, 'Unity 构建文件不存在',
      '请按以下步骤操作:\n' +
      '1. 在 Unity 中打开 BaguaCubeUnity 项目\n' +
      '2. 安装微信小游戏 Unity 插件\n' +
      '3. 导出到 minigame 目录'
    );

    wx.showModal({
      title: '提示',
      content: 'Unity WebGL 构建文件不存在。请在 Unity 中使用微信小游戏插件导出。\n\n参考: https://github.com/nichunen/minigame-unity-webgl-transform',
      showCancel: false,
    });
    return;
  }

  console.log('开始加载 Unity WebGL...');

  // 加载 Unity (需要微信小游戏 Unity 适配库)
  try {
    // 这里使用微信官方的 Unity WebGL 适配方案
    // 实际使用时需要引入 unity-namespace.js 等适配文件

    require(`${CONFIG.UNITY_DIR}/${CONFIG.FRAMEWORK_FILE}`);

    const unityConfig = {
      dataUrl: `${CONFIG.UNITY_DIR}/${CONFIG.DATA_FILE}`,
      frameworkUrl: `${CONFIG.UNITY_DIR}/${CONFIG.FRAMEWORK_FILE}`,
      codeUrl: `${CONFIG.UNITY_DIR}/${CONFIG.CODE_FILE}`,

      onProgress: (progress) => {
        loadingProgress = progress;
        showLoadingScreen(ctx);
        console.log(`Unity 加载进度: ${Math.round(progress * 100)}%`);
      },

      onReady: (instance) => {
        console.log('Unity WebGL 加载完成');
        unityInstance = instance;

        // 发送初始化数据到 Unity
        sendToUnity('GameManager', 'InitFromWeChat', JSON.stringify({
          systemInfo: sysInfo,
          config: CONFIG,
        }));
      },

      onError: (error) => {
        console.error('Unity 加载失败:', error);
        showError(ctx, '加载失败', error.message || '未知错误');
      }
    };

    // 创建 Unity 实例
    createUnityInstance(canvas, unityConfig);

  } catch (e) {
    console.error('Unity 加载异常:', e);
    showError(ctx, '加载异常', e.message);
  }
}

function sendToUnity(gameObject, method, data) {
  if (unityInstance) {
    unityInstance.SendMessage(gameObject, method, data);
  }
}

// ==================== 触摸事件 ====================
wx.onTouchStart((e) => {
  if (!unityInstance || !e.touches.length) return;
  const touch = e.touches[0];
  sendToUnity('WeChatInput', 'OnTouchStart', `${touch.clientX},${touch.clientY}`);
});

wx.onTouchMove((e) => {
  if (!unityInstance || !e.touches.length) return;
  const touch = e.touches[0];
  sendToUnity('WeChatInput', 'OnTouchMove', `${touch.clientX},${touch.clientY}`);
});

wx.onTouchEnd((e) => {
  if (!unityInstance || !e.changedTouches.length) return;
  const touch = e.changedTouches[0];
  sendToUnity('WeChatInput', 'OnTouchEnd', `${touch.clientX},${touch.clientY}`);
});

// ==================== 全局 API ====================
// 供 Unity 调用的微信 API
GameGlobal.WeChatAPI = {
  showToast: (title, icon, duration) => {
    wx.showToast({ title, icon: icon || 'none', duration: duration || 1500 });
  },

  showModal: (title, content, callback) => {
    wx.showModal({
      title,
      content,
      success: (res) => {
        if (callback) callback(res.confirm ? 1 : 0);
      }
    });
  },

  vibrateShort: () => wx.vibrateShort({ type: 'medium' }),
  vibrateLong: () => wx.vibrateLong(),

  setStorage: (key, value) => wx.setStorageSync(key, value),
  getStorage: (key) => wx.getStorageSync(key) || '',

  getSystemInfo: () => JSON.stringify(sysInfo),

  share: (title, imageUrl) => {
    wx.shareAppMessage({ title, imageUrl });
  }
};

// ==================== 启动 ====================
console.log('========================================');
console.log(`${CONFIG.GAME_NAME} - Unity WebGL 模式`);
console.log(`版本: ${CONFIG.VERSION}`);
console.log('========================================');

loadUnityGame();
