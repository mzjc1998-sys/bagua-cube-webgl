/**
 * Unity-WeChat API 桥接
 * 提供 Unity 调用微信 API 的接口
 */

const UnityBridge = {
  // 回调映射
  callbacks: {},
  callbackId: 0,

  /**
   * 初始化桥接
   */
  init() {
    // 注册全局方法供 Unity 调用
    if (typeof window === 'undefined') {
      globalThis.window = globalThis;
    }

    // 注册 Unity 回调接口
    window.WeChatBridge = this;

    console.log('Unity-WeChat Bridge initialized');
  },

  // ==================== 系统 API ====================

  /**
   * 获取系统信息
   */
  getSystemInfo() {
    const info = wx.getSystemInfoSync();
    return JSON.stringify({
      screenWidth: info.screenWidth,
      screenHeight: info.screenHeight,
      windowWidth: info.windowWidth,
      windowHeight: info.windowHeight,
      pixelRatio: info.pixelRatio,
      platform: info.platform,
      brand: info.brand,
      model: info.model,
      system: info.system,
      language: info.language,
      version: info.version,
      SDKVersion: info.SDKVersion,
      benchmarkLevel: info.benchmarkLevel || 0,
    });
  },

  /**
   * 获取启动参数
   */
  getLaunchOptions() {
    const options = wx.getLaunchOptionsSync();
    return JSON.stringify(options);
  },

  // ==================== UI API ====================

  /**
   * 显示 Toast
   */
  showToast(title, icon = 'none', duration = 1500) {
    wx.showToast({
      title: title,
      icon: icon,
      duration: duration,
    });
  },

  /**
   * 隐藏 Toast
   */
  hideToast() {
    wx.hideToast();
  },

  /**
   * 显示 Loading
   */
  showLoading(title = '加载中...') {
    wx.showLoading({
      title: title,
      mask: true,
    });
  },

  /**
   * 隐藏 Loading
   */
  hideLoading() {
    wx.hideLoading();
  },

  /**
   * 显示模态对话框
   */
  showModal(title, content, showCancel = true, callbackName = '') {
    wx.showModal({
      title: title,
      content: content,
      showCancel: showCancel,
      success: (res) => {
        if (callbackName && typeof UnityAdapter !== 'undefined' && UnityAdapter.unityInstance) {
          UnityAdapter.sendMessage('WeChatManager', callbackName, res.confirm ? '1' : '0');
        }
      }
    });
  },

  // ==================== 分享 API ====================

  /**
   * 分享小游戏
   */
  shareAppMessage(title, imageUrl, query = '') {
    wx.shareAppMessage({
      title: title,
      imageUrl: imageUrl,
      query: query,
    });
  },

  /**
   * 主动拉起分享
   */
  showShareMenu() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  /**
   * 更新分享菜单
   */
  updateShareMenu(withShareTicket = true) {
    wx.updateShareMenu({
      withShareTicket: withShareTicket,
    });
  },

  // ==================== 震动 API ====================

  /**
   * 短震动
   */
  vibrateShort(type = 'medium') {
    wx.vibrateShort({
      type: type, // 'heavy' | 'medium' | 'light'
    });
  },

  /**
   * 长震动
   */
  vibrateLong() {
    wx.vibrateLong();
  },

  // ==================== 存储 API ====================

  /**
   * 同步存储数据
   */
  setStorageSync(key, value) {
    try {
      wx.setStorageSync(key, value);
      return true;
    } catch (e) {
      console.error('setStorageSync error:', e);
      return false;
    }
  },

  /**
   * 同步读取数据
   */
  getStorageSync(key) {
    try {
      return wx.getStorageSync(key) || '';
    } catch (e) {
      console.error('getStorageSync error:', e);
      return '';
    }
  },

  /**
   * 同步删除数据
   */
  removeStorageSync(key) {
    try {
      wx.removeStorageSync(key);
      return true;
    } catch (e) {
      console.error('removeStorageSync error:', e);
      return false;
    }
  },

  /**
   * 清空存储
   */
  clearStorageSync() {
    try {
      wx.clearStorageSync();
      return true;
    } catch (e) {
      console.error('clearStorageSync error:', e);
      return false;
    }
  },

  // ==================== 广告 API ====================

  // Banner 广告实例
  _bannerAd: null,

  /**
   * 创建 Banner 广告
   */
  createBannerAd(adUnitId) {
    if (this._bannerAd) {
      this._bannerAd.destroy();
    }

    const sysInfo = wx.getSystemInfoSync();

    this._bannerAd = wx.createBannerAd({
      adUnitId: adUnitId,
      style: {
        left: 0,
        top: sysInfo.windowHeight - 100,
        width: sysInfo.windowWidth,
      }
    });

    this._bannerAd.onError((err) => {
      console.error('Banner ad error:', err);
    });

    this._bannerAd.onResize((res) => {
      this._bannerAd.style.top = sysInfo.windowHeight - res.height;
    });
  },

  /**
   * 显示 Banner 广告
   */
  showBannerAd() {
    if (this._bannerAd) {
      this._bannerAd.show().catch(err => {
        console.error('Show banner ad error:', err);
      });
    }
  },

  /**
   * 隐藏 Banner 广告
   */
  hideBannerAd() {
    if (this._bannerAd) {
      this._bannerAd.hide();
    }
  },

  /**
   * 销毁 Banner 广告
   */
  destroyBannerAd() {
    if (this._bannerAd) {
      this._bannerAd.destroy();
      this._bannerAd = null;
    }
  },

  // 激励视频广告实例
  _rewardedVideoAd: null,

  /**
   * 创建激励视频广告
   */
  createRewardedVideoAd(adUnitId, callbackName = 'OnRewardedVideoAdCallback') {
    if (this._rewardedVideoAd) {
      this._rewardedVideoAd.destroy();
    }

    this._rewardedVideoAd = wx.createRewardedVideoAd({
      adUnitId: adUnitId,
    });

    this._rewardedVideoAd.onClose((res) => {
      if (typeof UnityAdapter !== 'undefined' && UnityAdapter.unityInstance) {
        const result = (res && res.isEnded) ? '1' : '0';
        UnityAdapter.sendMessage('WeChatManager', callbackName, result);
      }
    });

    this._rewardedVideoAd.onError((err) => {
      console.error('Rewarded video ad error:', err);
      if (typeof UnityAdapter !== 'undefined' && UnityAdapter.unityInstance) {
        UnityAdapter.sendMessage('WeChatManager', callbackName, '-1');
      }
    });
  },

  /**
   * 显示激励视频广告
   */
  showRewardedVideoAd() {
    if (!this._rewardedVideoAd) {
      console.warn('Rewarded video ad not created');
      return;
    }

    this._rewardedVideoAd.show().catch(() => {
      // 广告未加载，先加载再显示
      this._rewardedVideoAd.load().then(() => {
        this._rewardedVideoAd.show();
      }).catch(err => {
        console.error('Load rewarded video ad error:', err);
      });
    });
  },

  // ==================== 触摸输入适配 ====================

  // 触摸数据
  _touches: [],

  /**
   * 初始化触摸监听
   */
  initTouchListeners() {
    wx.onTouchStart((e) => {
      this._updateTouches(e.touches);
      this._sendTouchEvent('TouchStart', e.touches);
    });

    wx.onTouchMove((e) => {
      this._updateTouches(e.touches);
      this._sendTouchEvent('TouchMove', e.touches);
    });

    wx.onTouchEnd((e) => {
      this._updateTouches(e.touches);
      this._sendTouchEvent('TouchEnd', e.changedTouches);
    });

    wx.onTouchCancel((e) => {
      this._updateTouches(e.touches);
      this._sendTouchEvent('TouchCancel', e.changedTouches);
    });
  },

  _updateTouches(touches) {
    this._touches = touches.map(t => ({
      identifier: t.identifier,
      clientX: t.clientX,
      clientY: t.clientY,
    }));
  },

  _sendTouchEvent(eventType, touches) {
    if (typeof UnityAdapter === 'undefined' || !UnityAdapter.unityInstance) return;

    const data = JSON.stringify({
      type: eventType,
      touches: touches.map(t => ({
        id: t.identifier,
        x: t.clientX,
        y: t.clientY,
      })),
      timestamp: Date.now(),
    });

    UnityAdapter.sendMessage('InputManager', 'OnTouchEvent', data);
  },

  /**
   * 获取当前触摸点
   */
  getTouches() {
    return JSON.stringify(this._touches);
  },

  // ==================== 音频 API ====================

  _audioContexts: {},

  /**
   * 播放音效
   */
  playSound(src, loop = false) {
    const audio = wx.createInnerAudioContext();
    audio.src = src;
    audio.loop = loop;
    audio.play();

    const id = Date.now().toString();
    this._audioContexts[id] = audio;

    if (!loop) {
      audio.onEnded(() => {
        audio.destroy();
        delete this._audioContexts[id];
      });
    }

    return id;
  },

  /**
   * 停止音效
   */
  stopSound(id) {
    const audio = this._audioContexts[id];
    if (audio) {
      audio.stop();
      audio.destroy();
      delete this._audioContexts[id];
    }
  },

  /**
   * 设置音量
   */
  setVolume(id, volume) {
    const audio = this._audioContexts[id];
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, volume));
    }
  },

  // ==================== 性能监控 ====================

  /**
   * 获取性能数据
   */
  getPerformance() {
    const perf = wx.getPerformance();
    const entries = perf.getEntriesByType('render');

    return JSON.stringify({
      fps: entries.length > 0 ? entries[entries.length - 1].fps : 60,
      memory: wx.getStorageInfoSync().currentSize,
    });
  },

  /**
   * 触发垃圾回收
   */
  triggerGC() {
    if (wx.triggerGC) {
      wx.triggerGC();
    }
  },
};

// 导出
module.exports = UnityBridge;
