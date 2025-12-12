/**
 * 八卦立方体 - 游戏配置
 * 控制游戏模式和各项设置
 */

const GameConfig = {
  // ==================== 游戏模式 ====================
  // 'canvas': 原始 Canvas 2D 模式（轻量，兼容性好）
  // 'unity':  Unity WebGL 模式（3D，功能丰富）
  mode: 'canvas',

  // ==================== Unity WebGL 配置 ====================
  unity: {
    // 构建文件路径（相对于 minigame 目录）
    buildPath: 'Build',
    dataFile: 'webgl.data',
    frameworkFile: 'webgl.framework.js',
    wasmFile: 'webgl.wasm',

    // 内存配置 (MB)
    initialMemory: 64,
    maximumMemory: 256,

    // 是否显示加载进度
    showLoadingScreen: true,

    // 加载超时时间 (ms)
    loadTimeout: 30000,
  },

  // ==================== Canvas 2D 配置 ====================
  canvas: {
    // 目标帧率
    targetFPS: 60,

    // 抗锯齿
    antialias: true,

    // 火柴人配置
    stickMan: {
      // 初始速度 (0-1)
      initialSpeed: 0.7,

      // 动画平滑度
      smoothness: 0.15,
    },

    // 场景配置
    scene: {
      // 场景移动速度
      moveSpeed: 0.004,

      // 地面元素密度
      elementDensity: 11,
    },
  },

  // ==================== 通用配置 ====================
  common: {
    // 游戏名称
    gameName: '八卦立方体',

    // 版本号
    version: '1.0.0',

    // 八卦系统
    bagua: {
      // 立方体边长 (米)
      cubeSize: 10,

      // 宫位名称
      palaceNames: ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'],

      // 宫位二进制
      palaceBits: ['000', '001', '010', '011', '100', '101', '110', '111'],
    },

    // 调试模式
    debug: false,

    // 显示 FPS
    showFPS: false,
  },

  // ==================== 微信小游戏配置 ====================
  wechat: {
    // AppID (需要在正式发布时填写)
    appId: '',

    // 分享配置
    share: {
      title: '八卦立方体 - 探索易经智慧',
      imageUrl: 'share.png',
    },

    // 广告配置
    ads: {
      // Banner 广告 ID
      bannerId: '',

      // 激励视频广告 ID
      rewardedVideoId: '',
    },
  },

  // ==================== 方法 ====================

  /**
   * 切换到 Canvas 模式
   */
  setCanvasMode() {
    this.mode = 'canvas';
    console.log('Switched to Canvas mode');
  },

  /**
   * 切换到 Unity 模式
   */
  setUnityMode() {
    this.mode = 'unity';
    console.log('Switched to Unity mode');
  },

  /**
   * 检查是否为 Unity 模式
   */
  isUnityMode() {
    return this.mode === 'unity';
  },

  /**
   * 检查是否为 Canvas 模式
   */
  isCanvasMode() {
    return this.mode === 'canvas';
  },

  /**
   * 获取 Unity 构建文件完整路径
   */
  getUnityBuildPath(filename) {
    return `${this.unity.buildPath}/${filename}`;
  },

  /**
   * 检查 Unity 构建文件是否存在
   */
  checkUnityBuildExists() {
    try {
      const fs = wx.getFileSystemManager();
      const dataPath = this.getUnityBuildPath(this.unity.dataFile);
      fs.accessSync(dataPath);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * 自动选择最佳模式
   */
  autoSelectMode() {
    // 检查设备性能
    const sysInfo = wx.getSystemInfoSync();
    const benchmarkLevel = sysInfo.benchmarkLevel || 0;

    // 检查 Unity 构建是否存在
    const hasUnityBuild = this.checkUnityBuildExists();

    if (hasUnityBuild && benchmarkLevel >= 20) {
      // 高性能设备且有 Unity 构建，使用 Unity 模式
      this.setUnityMode();
    } else {
      // 低性能设备或无 Unity 构建，使用 Canvas 模式
      this.setCanvasMode();
    }

    console.log(`Auto selected mode: ${this.mode} (benchmark: ${benchmarkLevel})`);
  },
};

// 导出
module.exports = GameConfig;
