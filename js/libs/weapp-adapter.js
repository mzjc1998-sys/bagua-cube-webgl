/**
 * 微信小游戏适配器
 * 模拟浏览器环境的基本 API
 */

const canvas = wx.createCanvas()
const ctx = canvas.getContext('2d')

// 获取系统信息
const systemInfo = wx.getSystemInfoSync()

// 模拟 window 对象
GameGlobal.window = GameGlobal.window || {}
GameGlobal.canvas = canvas

// 屏幕尺寸
window.innerWidth = systemInfo.windowWidth
window.innerHeight = systemInfo.windowHeight
window.devicePixelRatio = systemInfo.pixelRatio

// requestAnimationFrame
window.requestAnimationFrame = function(callback) {
  return canvas.requestAnimationFrame(callback)
}

window.cancelAnimationFrame = function(id) {
  return canvas.cancelAnimationFrame(id)
}

// 性能 API
window.performance = {
  now: function() {
    return Date.now()
  }
}

// 事件监听模拟
window.addEventListener = function(type, listener) {
  if (type === 'resize') {
    // 微信小游戏没有 resize 事件
  }
}

// document 模拟
GameGlobal.document = {
  createElement: function(tagName) {
    if (tagName === 'canvas') {
      return wx.createCanvas()
    }
    if (tagName === 'div') {
      return {
        style: {},
        className: '',
        textContent: '',
        appendChild: function() {},
        remove: function() {}
      }
    }
    return {}
  },
  getElementById: function(id) {
    if (id === 'canvas' || id === 'gameCanvas') {
      return canvas
    }
    return null
  },
  body: {
    appendChild: function() {},
    insertBefore: function() {}
  }
}

// Image 类
GameGlobal.Image = function() {
  return canvas.createImage()
}

// localStorage 模拟
GameGlobal.localStorage = {
  getItem: function(key) {
    try {
      return wx.getStorageSync(key)
    } catch (e) {
      return null
    }
  },
  setItem: function(key, value) {
    try {
      wx.setStorageSync(key, value)
    } catch (e) {}
  },
  removeItem: function(key) {
    try {
      wx.removeStorageSync(key)
    } catch (e) {}
  },
  clear: function() {
    try {
      wx.clearStorageSync()
    } catch (e) {}
  }
}

// console 已经存在

export { canvas, ctx, systemInfo }
