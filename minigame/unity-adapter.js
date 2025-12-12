/**
 * Unity WebGL 适配器 - 微信小游戏
 * 负责加载和管理 Unity WebGL 构建
 */

const UnityAdapter = {
  // Unity 实例
  unityInstance: null,

  // 配置
  config: {
    // Unity WebGL 构建文件路径
    dataUrl: 'Build/webgl.data',
    frameworkUrl: 'Build/webgl.framework.js',
    codeUrl: 'Build/webgl.wasm',
    streamingAssetsUrl: 'StreamingAssets',

    // 显示设置
    devicePixelRatio: 1,
    matchWebGLToCanvasSize: true,

    // 内存设置 (MB)
    INITIAL_MEMORY: 64,
    MAXIMUM_MEMORY: 256,
  },

  // 状态
  isLoading: false,
  isReady: false,
  loadProgress: 0,

  // 回调
  onProgress: null,
  onReady: null,
  onError: null,

  /**
   * 初始化 Unity 适配器
   */
  init(canvas, options = {}) {
    this.canvas = canvas;
    Object.assign(this.config, options);

    // 设置 canvas 尺寸
    const sysInfo = wx.getSystemInfoSync();
    canvas.width = sysInfo.windowWidth * sysInfo.pixelRatio;
    canvas.height = sysInfo.windowHeight * sysInfo.pixelRatio;

    // 初始化 WebGL 上下文
    this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!this.gl) {
      console.error('WebGL not supported');
      if (this.onError) this.onError('WebGL not supported');
      return false;
    }

    return true;
  },

  /**
   * 加载 Unity WebGL 构建
   */
  async load() {
    if (this.isLoading || this.isReady) return;
    this.isLoading = true;

    try {
      // 检查文件是否存在
      const fileSystem = wx.getFileSystemManager();

      // 加载 framework.js
      console.log('Loading Unity framework...');
      await this._loadScript(this.config.frameworkUrl);

      // 创建 Unity 实例
      console.log('Creating Unity instance...');
      await this._createUnityInstance();

      this.isLoading = false;
      this.isReady = true;

      if (this.onReady) this.onReady(this.unityInstance);

    } catch (error) {
      console.error('Unity load error:', error);
      this.isLoading = false;
      if (this.onError) this.onError(error);
    }
  },

  /**
   * 加载脚本文件
   */
  _loadScript(url) {
    return new Promise((resolve, reject) => {
      // 微信小游戏环境下使用 require 或 eval 加载脚本
      try {
        const fileSystem = wx.getFileSystemManager();
        const content = fileSystem.readFileSync(url, 'utf-8');

        // 在全局作用域执行脚本
        const func = new Function(content);
        func();
        resolve();
      } catch (error) {
        // 尝试使用网络加载
        wx.request({
          url: url,
          success: (res) => {
            try {
              const func = new Function(res.data);
              func();
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          fail: reject
        });
      }
    });
  },

  /**
   * 创建 Unity 实例
   */
  async _createUnityInstance() {
    // Unity WebGL 构建配置
    const buildConfig = {
      dataUrl: this.config.dataUrl,
      frameworkUrl: this.config.frameworkUrl,
      codeUrl: this.config.codeUrl,
      streamingAssetsUrl: this.config.streamingAssetsUrl,
      companyName: 'BaguaCube',
      productName: 'BaguaCube',
      productVersion: '1.0.0',
    };

    // Unity 进度回调
    const onProgress = (progress) => {
      this.loadProgress = progress;
      if (this.onProgress) this.onProgress(progress);
    };

    // 检查 createUnityInstance 是否可用
    if (typeof createUnityInstance === 'function') {
      this.unityInstance = await createUnityInstance(this.canvas, buildConfig, onProgress);
    } else {
      throw new Error('createUnityInstance not found. Make sure Unity WebGL build is correct.');
    }
  },

  /**
   * 发送消息到 Unity
   */
  sendMessage(gameObject, method, param) {
    if (!this.unityInstance) {
      console.warn('Unity instance not ready');
      return;
    }

    try {
      this.unityInstance.SendMessage(gameObject, method, param);
    } catch (error) {
      console.error('SendMessage error:', error);
    }
  },

  /**
   * 设置全屏
   */
  setFullscreen(fullscreen) {
    if (!this.unityInstance) return;
    this.unityInstance.SetFullscreen(fullscreen ? 1 : 0);
  },

  /**
   * 退出 Unity
   */
  quit() {
    if (!this.unityInstance) return;

    this.unityInstance.Quit().then(() => {
      console.log('Unity quit successfully');
      this.unityInstance = null;
      this.isReady = false;
    });
  },

  /**
   * 获取内存使用情况
   */
  getMemoryInfo() {
    if (!this.unityInstance) return null;

    // 尝试获取 HEAP 信息
    if (typeof Module !== 'undefined' && Module.HEAP8) {
      return {
        total: Module.HEAP8.length,
        used: Module.HEAP8.length, // 简化，实际需要更复杂的计算
      };
    }
    return null;
  }
};

// 导出
module.exports = UnityAdapter;
