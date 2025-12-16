/**
 * 场景管理器
 * 处理场景背景、角色立绘、场景切换效果
 */
class SceneManager {
  constructor() {
    // 当前场景
    this.currentScene = null;

    // 背景图片
    this.backgroundImage = null;
    this.backgroundLoaded = false;

    // 角色立绘
    this.characters = [];

    // 图片缓存
    this.imageCache = new Map();

    // 场景切换动画
    this.transition = {
      active: false,
      progress: 0,
      duration: 800,
      oldBackground: null,
      newBackground: null
    };

    // 天气/氛围效果
    this.atmosphere = {
      particles: [],
      type: null // 'snow', 'rain', 'dust', 'firefly'
    };

    // 场景配置
    this.config = {
      // 渐变叠加（模拟黄昏/夜晚氛围）
      overlayGradient: null,
      overlayAlpha: 0.3,

      // 角色立绘配置
      characterScale: 1.0,
      characterY: 0 // 相对于底部的偏移
    };
  }

  /**
   * 设置场景
   */
  setScene(sceneData) {
    if (!sceneData) return;

    const prevScene = this.currentScene;
    this.currentScene = sceneData;

    // 加载背景
    if (sceneData.background) {
      this.loadBackground(sceneData.background);
    }

    // 设置角色
    if (sceneData.characters) {
      this.setCharacters(sceneData.characters);
    }

    // 设置氛围
    if (sceneData.atmosphere) {
      this.setAtmosphere(sceneData.atmosphere);
    }

    // 设置叠加层
    if (sceneData.overlay) {
      this.setOverlay(sceneData.overlay);
    }
  }

  /**
   * 获取当前场景
   */
  getCurrentScene() {
    return this.currentScene;
  }

  /**
   * 加载背景图片
   */
  loadBackground(path) {
    if (this.imageCache.has(path)) {
      this.backgroundImage = this.imageCache.get(path);
      this.backgroundLoaded = true;
      return;
    }

    this.backgroundLoaded = false;
    const img = wx.createImage();
    img.onload = () => {
      this.imageCache.set(path, img);
      this.backgroundImage = img;
      this.backgroundLoaded = true;
    };
    img.onerror = () => {
      console.error(`[SceneManager] 加载背景失败: ${path}`);
      this.backgroundLoaded = false;
    };
    img.src = path;
  }

  /**
   * 设置角色立绘
   */
  setCharacters(characters) {
    this.characters = [];

    for (const char of characters) {
      const character = {
        id: char.id,
        image: null,
        loaded: false,
        position: char.position || 'center', // left, center, right
        scale: char.scale || 1.0,
        alpha: char.alpha || 1.0,
        offsetX: char.offsetX || 0,
        offsetY: char.offsetY || 0
      };

      if (char.sprite) {
        if (this.imageCache.has(char.sprite)) {
          character.image = this.imageCache.get(char.sprite);
          character.loaded = true;
        } else {
          const img = wx.createImage();
          img.onload = () => {
            this.imageCache.set(char.sprite, img);
            character.image = img;
            character.loaded = true;
          };
          img.src = char.sprite;
        }
      }

      this.characters.push(character);
    }
  }

  /**
   * 设置氛围效果
   */
  setAtmosphere(type) {
    this.atmosphere.type = type;
    this.atmosphere.particles = [];

    // 初始化粒子
    if (type) {
      this.initParticles(type);
    }
  }

  /**
   * 初始化粒子效果
   */
  initParticles(type) {
    const count = type === 'firefly' ? 30 : 100;

    for (let i = 0; i < count; i++) {
      this.atmosphere.particles.push(this.createParticle(type));
    }
  }

  /**
   * 创建粒子
   */
  createParticle(type) {
    const particle = {
      x: Math.random(),
      y: Math.random(),
      speed: 0.0005 + Math.random() * 0.001,
      size: 2 + Math.random() * 3,
      alpha: 0.3 + Math.random() * 0.7
    };

    switch (type) {
      case 'snow':
        particle.speedX = (Math.random() - 0.5) * 0.0003;
        particle.wobble = Math.random() * Math.PI * 2;
        break;
      case 'rain':
        particle.speed = 0.003 + Math.random() * 0.002;
        particle.size = 1 + Math.random() * 2;
        particle.length = 10 + Math.random() * 20;
        break;
      case 'dust':
        particle.speed = 0.0002 + Math.random() * 0.0003;
        particle.speedX = (Math.random() - 0.5) * 0.0001;
        break;
      case 'firefly':
        particle.glowPhase = Math.random() * Math.PI * 2;
        particle.glowSpeed = 0.002 + Math.random() * 0.002;
        particle.moveAngle = Math.random() * Math.PI * 2;
        particle.moveSpeed = 0.0001 + Math.random() * 0.0002;
        break;
    }

    return particle;
  }

  /**
   * 设置叠加层（用于氛围渲染）
   */
  setOverlay(overlay) {
    if (overlay.gradient) {
      this.config.overlayGradient = overlay.gradient;
    }
    if (typeof overlay.alpha === 'number') {
      this.config.overlayAlpha = overlay.alpha;
    }
  }

  /**
   * 更新
   */
  update(deltaTime) {
    // 更新粒子
    this.updateParticles(deltaTime);

    // 更新场景切换动画
    if (this.transition.active) {
      this.transition.progress += deltaTime / this.transition.duration;
      if (this.transition.progress >= 1) {
        this.transition.progress = 1;
        this.transition.active = false;
      }
    }
  }

  /**
   * 更新粒子
   */
  updateParticles(deltaTime) {
    const type = this.atmosphere.type;
    if (!type) return;

    for (const p of this.atmosphere.particles) {
      switch (type) {
        case 'snow':
          p.y += p.speed * deltaTime;
          p.wobble += 0.01;
          p.x += Math.sin(p.wobble) * 0.0005 + (p.speedX || 0);
          break;
        case 'rain':
          p.y += p.speed * deltaTime;
          p.x += 0.0001 * deltaTime;
          break;
        case 'dust':
          p.y -= p.speed * deltaTime;
          p.x += (p.speedX || 0) * deltaTime;
          break;
        case 'firefly':
          p.glowPhase += p.glowSpeed * deltaTime;
          p.moveAngle += (Math.random() - 0.5) * 0.1;
          p.x += Math.cos(p.moveAngle) * p.moveSpeed * deltaTime;
          p.y += Math.sin(p.moveAngle) * p.moveSpeed * deltaTime;
          break;
      }

      // 循环
      if (p.y > 1.1) p.y = -0.1;
      if (p.y < -0.1 && type === 'dust') p.y = 1.1;
      if (p.x > 1.1) p.x = -0.1;
      if (p.x < -0.1) p.x = 1.1;
    }
  }

  /**
   * 渲染
   */
  render(ctx, screenWidth, screenHeight) {
    // 渲染背景
    this.renderBackground(ctx, screenWidth, screenHeight);

    // 渲染角色
    this.renderCharacters(ctx, screenWidth, screenHeight);

    // 渲染氛围叠加层
    this.renderOverlay(ctx, screenWidth, screenHeight);

    // 渲染粒子效果
    this.renderParticles(ctx, screenWidth, screenHeight);
  }

  /**
   * 渲染背景
   */
  renderBackground(ctx, screenWidth, screenHeight) {
    if (!this.backgroundLoaded || !this.backgroundImage) {
      // 默认渐变背景（黄昏感）
      const gradient = ctx.createLinearGradient(0, 0, 0, screenHeight);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(0.4, '#16213e');
      gradient.addColorStop(0.7, '#0f3460');
      gradient.addColorStop(1, '#1a1a2e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, screenWidth, screenHeight);
      return;
    }

    // 绘制背景图片（cover模式）
    const img = this.backgroundImage;
    const imgRatio = img.width / img.height;
    const screenRatio = screenWidth / screenHeight;

    let drawWidth, drawHeight, drawX, drawY;

    if (imgRatio > screenRatio) {
      drawHeight = screenHeight;
      drawWidth = screenHeight * imgRatio;
      drawX = (screenWidth - drawWidth) / 2;
      drawY = 0;
    } else {
      drawWidth = screenWidth;
      drawHeight = screenWidth / imgRatio;
      drawX = 0;
      drawY = (screenHeight - drawHeight) / 2;
    }

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  }

  /**
   * 渲染角色立绘
   */
  renderCharacters(ctx, screenWidth, screenHeight) {
    for (const char of this.characters) {
      if (!char.loaded || !char.image) continue;

      const img = char.image;
      const scale = char.scale * this.config.characterScale;

      // 计算位置
      let x;
      switch (char.position) {
        case 'left':
          x = screenWidth * 0.2;
          break;
        case 'right':
          x = screenWidth * 0.8;
          break;
        default:
          x = screenWidth * 0.5;
      }

      const drawHeight = screenHeight * 0.7 * scale;
      const drawWidth = (img.width / img.height) * drawHeight;
      const drawX = x - drawWidth / 2 + char.offsetX;
      const drawY = screenHeight - drawHeight + this.config.characterY + char.offsetY;

      ctx.save();
      ctx.globalAlpha = char.alpha;
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      ctx.restore();
    }
  }

  /**
   * 渲染氛围叠加层
   */
  renderOverlay(ctx, screenWidth, screenHeight) {
    if (!this.config.overlayGradient) return;

    ctx.save();
    ctx.globalAlpha = this.config.overlayAlpha;

    const gradientConfig = this.config.overlayGradient;
    const gradient = ctx.createLinearGradient(
      gradientConfig.x1 * screenWidth,
      gradientConfig.y1 * screenHeight,
      gradientConfig.x2 * screenWidth,
      gradientConfig.y2 * screenHeight
    );

    for (const stop of gradientConfig.stops) {
      gradient.addColorStop(stop.offset, stop.color);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, screenWidth, screenHeight);
    ctx.restore();
  }

  /**
   * 渲染粒子效果
   */
  renderParticles(ctx, screenWidth, screenHeight) {
    const type = this.atmosphere.type;
    if (!type || this.atmosphere.particles.length === 0) return;

    ctx.save();

    for (const p of this.atmosphere.particles) {
      const x = p.x * screenWidth;
      const y = p.y * screenHeight;

      switch (type) {
        case 'snow':
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(x, y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'rain':
          ctx.strokeStyle = `rgba(150, 180, 220, ${p.alpha * 0.6})`;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 2, y + p.length);
          ctx.stroke();
          break;

        case 'dust':
          ctx.fillStyle = `rgba(255, 230, 180, ${p.alpha * 0.5})`;
          ctx.beginPath();
          ctx.arc(x, y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'firefly':
          const glow = (Math.sin(p.glowPhase) + 1) / 2;
          const radius = p.size * (0.5 + glow * 0.5);
          const alpha = p.alpha * (0.3 + glow * 0.7);

          // 外发光
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
          gradient.addColorStop(0, `rgba(200, 255, 100, ${alpha})`);
          gradient.addColorStop(0.5, `rgba(150, 255, 50, ${alpha * 0.3})`);
          gradient.addColorStop(1, 'rgba(100, 200, 50, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
          ctx.fill();

          // 核心
          ctx.fillStyle = `rgba(255, 255, 200, ${alpha})`;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
          break;
      }
    }

    ctx.restore();
  }

  /**
   * 预加载图片
   */
  preloadImage(path) {
    if (this.imageCache.has(path)) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const img = wx.createImage();
      img.onload = () => {
        this.imageCache.set(path, img);
        resolve();
      };
      img.onerror = reject;
      img.src = path;
    });
  }

  /**
   * 批量预加载
   */
  preloadImages(paths) {
    return Promise.all(paths.map(p => this.preloadImage(p)));
  }
}

export default SceneManager;
