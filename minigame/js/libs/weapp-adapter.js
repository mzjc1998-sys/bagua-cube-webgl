/**
 * 微信小游戏适配器
 * 用于适配 Web API 到微信小游戏环境
 */

// 获取系统信息
const systemInfo = wx.getSystemInfoSync();

// 创建全局 window 对象
const window = {
  innerWidth: systemInfo.windowWidth,
  innerHeight: systemInfo.windowHeight,
  devicePixelRatio: systemInfo.pixelRatio,

  // requestAnimationFrame 适配
  requestAnimationFrame: function(callback) {
    return requestAnimationFrame(callback);
  },

  // 性能 API
  performance: {
    now: function() {
      return Date.now();
    }
  },

  // 事件监听（简化实现）
  addEventListener: function(type, listener) {
    if (type === 'resize') {
      // 微信小游戏中监听屏幕大小变化
      wx.onWindowResize && wx.onWindowResize(function(res) {
        window.innerWidth = res.windowWidth;
        window.innerHeight = res.windowHeight;
        listener();
      });
    }
  },

  removeEventListener: function(type, listener) {
    // 简化实现
  }
};

// 创建全局 document 对象
const document = {
  createElement: function(tagName) {
    tagName = tagName.toLowerCase();

    if (tagName === 'canvas') {
      return wx.createCanvas();
    }

    // 返回一个模拟的 DOM 元素
    return {
      tagName: tagName.toUpperCase(),
      style: {},
      classList: {
        _classes: [],
        add: function(cls) {
          if (this._classes.indexOf(cls) === -1) {
            this._classes.push(cls);
          }
        },
        remove: function(cls) {
          const idx = this._classes.indexOf(cls);
          if (idx !== -1) {
            this._classes.splice(idx, 1);
          }
        },
        toggle: function(cls, force) {
          if (force === undefined) {
            force = this._classes.indexOf(cls) === -1;
          }
          if (force) {
            this.add(cls);
          } else {
            this.remove(cls);
          }
          return force;
        },
        contains: function(cls) {
          return this._classes.indexOf(cls) !== -1;
        }
      },
      addEventListener: function() {},
      removeEventListener: function() {},
      appendChild: function() {},
      insertBefore: function() {},
      setAttribute: function() {},
      getAttribute: function() { return null; }
    };
  },

  getElementById: function(id) {
    return null;
  },

  querySelectorAll: function(selector) {
    return [];
  },

  body: {
    appendChild: function() {},
    insertBefore: function() {},
    firstChild: null
  }
};

// localStorage 适配
const localStorage = {
  getItem: function(key) {
    try {
      return wx.getStorageSync(key) || null;
    } catch (e) {
      return null;
    }
  },

  setItem: function(key, value) {
    try {
      wx.setStorageSync(key, value);
    } catch (e) {
      console.error('Storage setItem error:', e);
    }
  },

  removeItem: function(key) {
    try {
      wx.removeStorageSync(key);
    } catch (e) {
      console.error('Storage removeItem error:', e);
    }
  },

  clear: function() {
    try {
      wx.clearStorageSync();
    } catch (e) {
      console.error('Storage clear error:', e);
    }
  }
};

// 导出全局变量
GameGlobal.window = window;
GameGlobal.document = document;
GameGlobal.localStorage = localStorage;
GameGlobal.HTMLCanvasElement = wx.createCanvas().constructor;

// 让 Canvas 支持 style 属性
const _bindCanvas = function(canvas) {
  canvas.style = canvas.style || {};
  return canvas;
};

// 导出适配器
module.exports = {
  window,
  document,
  localStorage,
  bindCanvas: _bindCanvas
};
