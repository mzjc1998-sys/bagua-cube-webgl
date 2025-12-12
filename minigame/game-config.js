/**
 * 八卦立方体 - 游戏配置
 * Unity WebGL 模式
 */

const GameConfig = {
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
};

// 导出
module.exports = GameConfig;
