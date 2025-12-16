/**
 * 音频管理器
 * 处理背景音乐和音效的播放
 */
class AudioManager {
  constructor() {
    // 背景音乐
    this.bgm = null;
    this.bgmPath = null;

    // 音效缓存
    this.sfxCache = new Map();

    // 音量设置
    this.bgmVolume = 0.6;
    this.sfxVolume = 0.8;

    // 是否静音
    this.bgmMuted = false;
    this.sfxMuted = false;

    // 淡入淡出
    this.fadeInterval = null;
  }

  /**
   * 播放背景音乐
   */
  playBGM(path, loop = true) {
    if (this.bgmPath === path && this.bgm) {
      // 已经在播放同一首
      return;
    }

    // 停止当前BGM
    this.stopBGM();

    this.bgmPath = path;
    this.bgm = wx.createInnerAudioContext();
    this.bgm.src = path;
    this.bgm.loop = loop;
    this.bgm.volume = this.bgmMuted ? 0 : this.bgmVolume;

    this.bgm.onCanplay(() => {
      this.bgm.play();
    });

    this.bgm.onError((err) => {
      console.error('[AudioManager] BGM播放失败:', err);
    });
  }

  /**
   * 停止背景音乐
   */
  stopBGM() {
    if (this.bgm) {
      this.bgm.stop();
      this.bgm.destroy();
      this.bgm = null;
      this.bgmPath = null;
    }
  }

  /**
   * 暂停背景音乐
   */
  pauseBGM() {
    if (this.bgm) {
      this.bgm.pause();
    }
  }

  /**
   * 恢复背景音乐
   */
  resumeBGM() {
    if (this.bgm) {
      this.bgm.play();
    }
  }

  /**
   * 淡出背景音乐
   */
  fadeOutBGM(duration = 1000, callback) {
    if (!this.bgm) {
      if (callback) callback();
      return;
    }

    const startVolume = this.bgm.volume;
    const steps = 20;
    const stepTime = duration / steps;
    const volumeStep = startVolume / steps;
    let currentStep = 0;

    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }

    this.fadeInterval = setInterval(() => {
      currentStep++;
      const newVolume = Math.max(0, startVolume - volumeStep * currentStep);
      this.bgm.volume = newVolume;

      if (currentStep >= steps) {
        clearInterval(this.fadeInterval);
        this.fadeInterval = null;
        this.stopBGM();
        if (callback) callback();
      }
    }, stepTime);
  }

  /**
   * 淡入背景音乐
   */
  fadeInBGM(path, duration = 1000) {
    this.playBGM(path);

    if (!this.bgm) return;

    this.bgm.volume = 0;
    const targetVolume = this.bgmMuted ? 0 : this.bgmVolume;
    const steps = 20;
    const stepTime = duration / steps;
    const volumeStep = targetVolume / steps;
    let currentStep = 0;

    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }

    this.fadeInterval = setInterval(() => {
      currentStep++;
      const newVolume = Math.min(targetVolume, volumeStep * currentStep);
      this.bgm.volume = newVolume;

      if (currentStep >= steps) {
        clearInterval(this.fadeInterval);
        this.fadeInterval = null;
      }
    }, stepTime);
  }

  /**
   * 播放音效
   */
  playSFX(path) {
    if (this.sfxMuted) return;

    // 创建新的音效实例
    const sfx = wx.createInnerAudioContext();
    sfx.src = path;
    sfx.volume = this.sfxVolume;

    sfx.onCanplay(() => {
      sfx.play();
    });

    sfx.onEnded(() => {
      sfx.destroy();
    });

    sfx.onError((err) => {
      console.error('[AudioManager] 音效播放失败:', err);
      sfx.destroy();
    });
  }

  /**
   * 预加载音效
   */
  preloadSFX(path) {
    if (this.sfxCache.has(path)) return;

    const sfx = wx.createInnerAudioContext();
    sfx.src = path;
    this.sfxCache.set(path, sfx);
  }

  /**
   * 设置BGM音量
   */
  setBGMVolume(volume) {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    if (this.bgm && !this.bgmMuted) {
      this.bgm.volume = this.bgmVolume;
    }
  }

  /**
   * 设置音效音量
   */
  setSFXVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * 静音/取消静音BGM
   */
  toggleBGMMute() {
    this.bgmMuted = !this.bgmMuted;
    if (this.bgm) {
      this.bgm.volume = this.bgmMuted ? 0 : this.bgmVolume;
    }
    return this.bgmMuted;
  }

  /**
   * 静音/取消静音音效
   */
  toggleSFXMute() {
    this.sfxMuted = !this.sfxMuted;
    return this.sfxMuted;
  }

  /**
   * 全部静音
   */
  muteAll() {
    this.bgmMuted = true;
    this.sfxMuted = true;
    if (this.bgm) {
      this.bgm.volume = 0;
    }
  }

  /**
   * 取消全部静音
   */
  unmuteAll() {
    this.bgmMuted = false;
    this.sfxMuted = false;
    if (this.bgm) {
      this.bgm.volume = this.bgmVolume;
    }
  }

  /**
   * 销毁
   */
  destroy() {
    this.stopBGM();

    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    // 销毁缓存的音效
    for (const sfx of this.sfxCache.values()) {
      sfx.destroy();
    }
    this.sfxCache.clear();
  }
}

export default AudioManager;
