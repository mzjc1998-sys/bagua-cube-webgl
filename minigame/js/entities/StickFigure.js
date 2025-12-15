/**
 * 火柴人渲染系统
 * Alan Becker风格的火柴人，带布娃娃物理系统
 * 支持碎尸、抽搐、变成经验等效果
 */
class StickFigure {
  constructor(color = '#FF8800') {
    this.color = color;
    this.lineWidth = 3;

    // 骨骼定义（相对于中心点的偏移）
    this.bones = {
      head: { x: 0, y: -20, radius: 8 },
      neck: { x: 0, y: -12 },
      spine: { x: 0, y: 0 },
      hip: { x: 0, y: 8 },

      // 手臂
      shoulderL: { x: -4, y: -10 },
      shoulderR: { x: 4, y: -10 },
      elbowL: { x: -12, y: -6 },
      elbowR: { x: 12, y: -6 },
      handL: { x: -18, y: -2 },
      handR: { x: 18, y: -2 },

      // 腿
      hipL: { x: -3, y: 8 },
      hipR: { x: 3, y: 8 },
      kneeL: { x: -5, y: 18 },
      kneeR: { x: 5, y: 18 },
      footL: { x: -6, y: 28 },
      footR: { x: 6, y: 28 }
    };

    // 动画状态
    this.animTime = 0;
    this.currentAnim = 'idle';
    this.animSpeed = 1.0; // 动画速度控制

    // 布娃娃物理
    this.ragdollActive = false;
    this.ragdollBones = null;
    this.ragdollVelocities = null;
    this.gravity = 0.8;
    this.friction = 0.92;
    this.groundY = 28;

    // 碎尸系统
    this.gibs = []; // 分离的肢体碎片
    this.severedLimbs = new Set(); // 被切断的肢体

    // 死亡状态
    this.isDying = false;
    this.deathTimer = 0;
    this.deathPhase = 'falling'; // falling, twitching, curling, fading
    this.twitchIntensity = 1.0;
    this.fadeAlpha = 1.0;

    // 经验转化
    this.convertToExp = false;
    this.expParticles = [];
    this.onExpReady = null; // 回调
  }

  /**
   * 获取动画帧的骨骼位置（降低速度）
   */
  getAnimatedBones(anim, time, facingRight = true) {
    const bones = JSON.parse(JSON.stringify(this.bones));
    // 大幅降低动画速度
    const t = time * 0.003 * this.animSpeed;
    const mirror = facingRight ? 1 : -1;

    switch (anim) {
      case 'idle':
        // 轻微呼吸动画（更慢更自然）
        bones.head.y += Math.sin(t * 1.5) * 1;
        bones.spine.y += Math.sin(t * 1.5) * 0.5;
        bones.handL.y += Math.sin(t * 1.5 + 0.5) * 1;
        bones.handR.y += Math.sin(t * 1.5 - 0.5) * 1;
        break;

      case 'walk':
        // 走路动画（更慢更自然）
        const walkCycle = Math.sin(t * 4);
        const walkCycle2 = Math.sin(t * 4 + Math.PI);

        // 腿部摆动（幅度适中）
        bones.kneeL.x += walkCycle * 3 * mirror;
        bones.kneeL.y += Math.abs(walkCycle) * -2;
        bones.footL.x += walkCycle * 6 * mirror;
        bones.footL.y += Math.abs(walkCycle) * -4;

        bones.kneeR.x += walkCycle2 * 3 * mirror;
        bones.kneeR.y += Math.abs(walkCycle2) * -2;
        bones.footR.x += walkCycle2 * 6 * mirror;
        bones.footR.y += Math.abs(walkCycle2) * -4;

        // 手臂摆动
        bones.elbowL.x += walkCycle2 * 2 * mirror;
        bones.handL.x += walkCycle2 * 4 * mirror;
        bones.elbowR.x += walkCycle * 2 * mirror;
        bones.handR.x += walkCycle * 4 * mirror;

        // 身体轻微上下
        bones.head.y += Math.abs(walkCycle) * -1.5;
        bones.spine.y += Math.abs(walkCycle) * -0.8;
        break;

      case 'run':
        // 跑步动画（速度适中）
        const runCycle = Math.sin(t * 6);
        const runCycle2 = Math.sin(t * 6 + Math.PI);

        bones.kneeL.x += runCycle * 6 * mirror;
        bones.kneeL.y += Math.abs(runCycle) * -5;
        bones.footL.x += runCycle * 12 * mirror;
        bones.footL.y += Math.abs(runCycle) * -8;

        bones.kneeR.x += runCycle2 * 6 * mirror;
        bones.kneeR.y += Math.abs(runCycle2) * -5;
        bones.footR.x += runCycle2 * 12 * mirror;
        bones.footR.y += Math.abs(runCycle2) * -8;

        bones.elbowL.x += runCycle2 * 5 * mirror;
        bones.handL.x += runCycle2 * 10 * mirror;
        bones.handL.y += runCycle2 * 3;
        bones.elbowR.x += runCycle * 5 * mirror;
        bones.handR.x += runCycle * 10 * mirror;
        bones.handR.y += runCycle * 3;

        // 身体前倾
        bones.head.x += 2 * mirror;
        bones.head.y += Math.abs(runCycle) * -3 - 1;
        bones.spine.y += Math.abs(runCycle) * -1.5;
        break;

      case 'shoot':
        // 射击动画
        const shootPhase = (t * 5) % (Math.PI * 2);
        const recoil = Math.max(0, Math.sin(shootPhase * 3)) * 2;

        bones.shoulderR.x = 5 * mirror;
        bones.elbowR.x = 14 * mirror;
        bones.elbowR.y = -7;
        bones.handR.x = (22 - recoil) * mirror;
        bones.handR.y = -5;

        bones.elbowL.x = 8 * mirror;
        bones.elbowL.y = -5;
        bones.handL.x = 16 * mirror;
        bones.handL.y = -5;

        bones.spine.x -= 0.5 * mirror;
        break;

      case 'roll':
        // 翻滚动画
        const rollPhase = (t * 10) % (Math.PI * 2);
        const curl = Math.sin(rollPhase);

        bones.head.y = -10 + curl * 6;
        bones.head.x = curl * 4 * mirror;

        bones.kneeL.y = 10;
        bones.kneeL.x = -6 + curl * 5;
        bones.footL.y = 14;
        bones.footL.x = -8 + curl * 8;

        bones.kneeR.y = 10;
        bones.kneeR.x = 6 + curl * 5;
        bones.footR.y = 14;
        bones.footR.x = 8 + curl * 8;

        bones.handL.y = 4;
        bones.handL.x = -4;
        bones.handR.y = 4;
        bones.handR.x = 4;
        break;

      case 'hit':
        // 受击动画
        const hitRecoil = Math.sin(t * 12) * Math.exp(-t * 0.3);
        bones.head.x -= hitRecoil * 8 * mirror;
        bones.spine.x -= hitRecoil * 4 * mirror;
        bones.handL.x -= hitRecoil * 6;
        bones.handR.x -= hitRecoil * 6;
        break;
    }

    return bones;
  }

  /**
   * 击中肢体造成碎尸
   */
  severLimb(limbName, impactAngle, force) {
    if (this.severedLimbs.has(limbName)) return;

    // 肢体组定义
    const limbGroups = {
      'head': ['head'],
      'armL': ['shoulderL', 'elbowL', 'handL'],
      'armR': ['shoulderR', 'elbowR', 'handR'],
      'legL': ['hipL', 'kneeL', 'footL'],
      'legR': ['hipR', 'kneeR', 'footR']
    };

    const group = limbGroups[limbName];
    if (!group) return;

    this.severedLimbs.add(limbName);

    // 获取当前骨骼位置
    const currentBones = this.ragdollActive
      ? this.ragdollBones
      : this.getAnimatedBones(this.currentAnim, this.animTime, true);

    // 创建碎片
    const gib = {
      bones: {},
      velocities: {},
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      alpha: 1,
      groundY: this.groundY + Math.random() * 10,
      settled: false,
      settleTime: 0
    };

    // 计算碎片中心
    let centerX = 0, centerY = 0;
    for (const boneName of group) {
      const bone = currentBones[boneName];
      if (bone) {
        centerX += bone.x;
        centerY += bone.y;
      }
    }
    centerX /= group.length;
    centerY /= group.length;

    // 复制骨骼并设置速度
    const impactX = Math.cos(impactAngle) * force;
    const impactY = Math.sin(impactAngle) * force;

    for (const boneName of group) {
      const bone = currentBones[boneName];
      if (bone) {
        gib.bones[boneName] = {
          x: bone.x - centerX,
          y: bone.y - centerY,
          radius: bone.radius
        };
        gib.velocities[boneName] = {
          x: impactX * (0.8 + Math.random() * 0.4) + (Math.random() - 0.5) * 3,
          y: impactY * (0.8 + Math.random() * 0.4) - Math.random() * 8
        };
      }
    }

    gib.x = centerX;
    gib.y = centerY;
    gib.vx = impactX * 1.5;
    gib.vy = impactY - 5;

    this.gibs.push(gib);
  }

  /**
   * 激活布娃娃物理并进入死亡状态
   */
  activateRagdoll(initialBones, impactAngle = 0, force = 10) {
    this.ragdollActive = true;
    this.isDying = true;
    this.deathTimer = 0;
    this.deathPhase = 'falling';
    this.ragdollBones = JSON.parse(JSON.stringify(initialBones));
    this.ragdollVelocities = {};

    const impactX = Math.cos(impactAngle) * force;
    const impactY = Math.sin(impactAngle) * force;

    for (const key in this.ragdollBones) {
      if (this.isLimbSevered(key)) continue;

      const bone = this.ragdollBones[key];
      const distFromCenter = Math.sqrt(bone.x * bone.x + bone.y * bone.y);
      const randomFactor = 0.5 + Math.random() * 0.5;

      this.ragdollVelocities[key] = {
        x: impactX * randomFactor + (Math.random() - 0.5) * 4,
        y: impactY * randomFactor - Math.random() * 6 - distFromCenter * 0.15
      };
    }

    // 随机切断一个肢体
    if (force > 5 && Math.random() < 0.6) {
      const limbs = ['armL', 'armR', 'legL', 'legR'];
      if (Math.random() < 0.2) limbs.push('head'); // 小概率爆头
      const randomLimb = limbs[Math.floor(Math.random() * limbs.length)];
      this.severLimb(randomLimb, impactAngle, force * 1.5);
    }
  }

  /**
   * 检查骨骼是否属于被切断的肢体
   */
  isLimbSevered(boneName) {
    const limbMap = {
      'head': 'head',
      'shoulderL': 'armL', 'elbowL': 'armL', 'handL': 'armL',
      'shoulderR': 'armR', 'elbowR': 'armR', 'handR': 'armR',
      'hipL': 'legL', 'kneeL': 'legL', 'footL': 'legL',
      'hipR': 'legR', 'kneeR': 'legR', 'footR': 'legR'
    };
    return this.severedLimbs.has(limbMap[boneName]);
  }

  /**
   * 更新布娃娃物理（带抽搐和蜷缩）
   */
  updateRagdoll(deltaTime) {
    if (!this.ragdollActive) return;

    const dt = deltaTime * 0.05;
    this.deathTimer += deltaTime;

    // 更新死亡阶段
    if (this.deathPhase === 'falling' && this.deathTimer > 500) {
      this.deathPhase = 'twitching';
      this.twitchIntensity = 1.0;
    } else if (this.deathPhase === 'twitching' && this.deathTimer > 1500) {
      this.deathPhase = 'curling';
    } else if (this.deathPhase === 'curling' && this.deathTimer > 2500) {
      this.deathPhase = 'fading';
    } else if (this.deathPhase === 'fading' && this.deathTimer > 3500) {
      this.convertToExp = true;
      this.generateExpParticles();
    }

    // 更新主体骨骼
    for (const key in this.ragdollBones) {
      if (this.isLimbSevered(key)) continue;

      const bone = this.ragdollBones[key];
      const vel = this.ragdollVelocities[key];
      if (!vel) continue;

      // 应用速度
      bone.x += vel.x * dt;
      bone.y += vel.y * dt;

      // 应用重力
      vel.y += this.gravity * dt;

      // 抽搐效果
      if (this.deathPhase === 'twitching') {
        this.twitchIntensity *= 0.995;
        const twitch = Math.sin(this.deathTimer * 0.05) * this.twitchIntensity * 3;
        bone.x += (Math.random() - 0.5) * twitch;
        bone.y += (Math.random() - 0.5) * twitch * 0.5;
      }

      // 蜷缩效果 - 所有骨骼向中心收缩
      if (this.deathPhase === 'curling' || this.deathPhase === 'fading') {
        const curlSpeed = 0.02;
        const targetX = 0;
        const targetY = 10; // 蜷缩成一团的目标位置
        bone.x += (targetX - bone.x) * curlSpeed * dt;
        bone.y += (targetY - bone.y) * curlSpeed * dt;
        vel.x *= 0.95;
        vel.y *= 0.95;
      }

      // 地面碰撞
      if (bone.y > this.groundY) {
        bone.y = this.groundY;
        vel.y *= -0.2;
        vel.x *= this.friction;
      }

      // 摩擦力
      vel.x *= 0.98;
      vel.y *= 0.98;
    }

    // 淡出
    if (this.deathPhase === 'fading') {
      this.fadeAlpha = Math.max(0, 1 - (this.deathTimer - 2500) / 1000);
    }

    // 保持骨骼连接
    if (this.deathPhase !== 'fading') {
      this.applyBoneConstraints();
    }

    // 更新碎片
    this.updateGibs(deltaTime);
  }

  /**
   * 更新碎片
   */
  updateGibs(deltaTime) {
    const dt = deltaTime * 0.05;

    for (const gib of this.gibs) {
      if (gib.settled) {
        gib.settleTime += deltaTime;
        // 碎片也抽搐
        if (gib.settleTime < 1500) {
          const twitch = Math.sin(gib.settleTime * 0.03) * (1 - gib.settleTime / 1500) * 2;
          for (const key in gib.bones) {
            gib.bones[key].x += (Math.random() - 0.5) * twitch;
            gib.bones[key].y += (Math.random() - 0.5) * twitch * 0.5;
          }
        }
        // 淡出
        if (this.deathPhase === 'fading') {
          gib.alpha = this.fadeAlpha;
        }
        continue;
      }

      // 移动碎片整体
      gib.x += gib.vx * dt;
      gib.y += gib.vy * dt;
      gib.vy += this.gravity * dt;
      gib.rotation += gib.rotationSpeed * dt;

      // 地面碰撞
      if (gib.y > gib.groundY) {
        gib.y = gib.groundY;
        gib.vy *= -0.3;
        gib.vx *= this.friction;
        gib.rotationSpeed *= 0.8;

        if (Math.abs(gib.vy) < 0.5 && Math.abs(gib.vx) < 0.5) {
          gib.settled = true;
        }
      }

      gib.vx *= 0.99;
      gib.vy *= 0.99;
    }
  }

  /**
   * 生成经验粒子
   */
  generateExpParticles() {
    const particleCount = 5 + Math.floor(Math.random() * 5);

    for (let i = 0; i < particleCount; i++) {
      this.expParticles.push({
        x: (Math.random() - 0.5) * 20,
        y: 10 + Math.random() * 10,
        vx: (Math.random() - 0.5) * 2,
        vy: -2 - Math.random() * 3,
        size: 3 + Math.random() * 4,
        alpha: 1,
        color: `hsl(${280 + Math.random() * 40}, 80%, 60%)`
      });
    }

    if (this.onExpReady) {
      this.onExpReady(particleCount * 5); // 回调经验值
    }
  }

  /**
   * 应用骨骼约束
   */
  applyBoneConstraints() {
    const constraints = [
      ['head', 'neck', 8],
      ['neck', 'spine', 12],
      ['spine', 'hip', 8],
      ['shoulderL', 'elbowL', 10],
      ['elbowL', 'handL', 8],
      ['shoulderR', 'elbowR', 10],
      ['elbowR', 'handR', 8],
      ['hipL', 'kneeL', 10],
      ['kneeL', 'footL', 10],
      ['hipR', 'kneeR', 10],
      ['kneeR', 'footR', 10]
    ];

    for (const [bone1Key, bone2Key, maxDist] of constraints) {
      if (this.isLimbSevered(bone1Key) || this.isLimbSevered(bone2Key)) continue;

      const bone1 = this.ragdollBones[bone1Key];
      const bone2 = this.ragdollBones[bone2Key];

      if (!bone1 || !bone2) continue;

      const dx = bone2.x - bone1.x;
      const dy = bone2.y - bone1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > maxDist) {
        const correction = (dist - maxDist) / dist / 2;
        bone1.x += dx * correction;
        bone1.y += dy * correction;
        bone2.x -= dx * correction;
        bone2.y -= dy * correction;
      }
    }
  }

  /**
   * 更新动画
   */
  update(deltaTime, state = {}) {
    this.animTime += deltaTime;

    if (this.isDying) {
      this.updateRagdoll(deltaTime);
      // 更新经验粒子
      for (const p of this.expParticles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // 轻微重力
        p.alpha *= 0.98;
        p.size *= 0.99;
      }
      this.expParticles = this.expParticles.filter(p => p.alpha > 0.1);
      return;
    }

    // 根据状态切换动画
    if (state.isDead) {
      this.currentAnim = 'death';
    } else if (state.isRolling) {
      this.currentAnim = 'roll';
    } else if (state.isHit) {
      this.currentAnim = 'hit';
    } else if (state.isAttacking || state.isShooting) {
      this.currentAnim = state.isShooting ? 'shoot' : 'attack';
    } else if (state.isMoving) {
      this.currentAnim = state.isRunning ? 'run' : 'walk';
    } else {
      this.currentAnim = 'idle';
    }

    if (this.ragdollActive) {
      this.updateRagdoll(deltaTime);
    }
  }

  /**
   * 渲染火柴人
   */
  render(ctx, screenX, screenY, scale = 1, facingRight = true) {
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.scale(scale * (facingRight ? 1 : -1), scale);
    ctx.globalAlpha = this.fadeAlpha;

    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const bones = this.ragdollActive
      ? this.ragdollBones
      : this.getAnimatedBones(this.currentAnim, this.animTime, facingRight);

    // 绘制主体（排除被切断的部分）
    if (!this.isLimbSevered('head')) {
      this.drawLimb(ctx, bones.neck, bones.spine);
    }
    this.drawLimb(ctx, bones.spine, bones.hip);

    // 手臂
    if (!this.severedLimbs.has('armL')) {
      this.drawLimb(ctx, bones.shoulderL, bones.elbowL);
      this.drawLimb(ctx, bones.elbowL, bones.handL);
    }
    if (!this.severedLimbs.has('armR')) {
      this.drawLimb(ctx, bones.shoulderR, bones.elbowR);
      this.drawLimb(ctx, bones.elbowR, bones.handR);
    }

    // 腿
    if (!this.severedLimbs.has('legL')) {
      this.drawLimb(ctx, bones.hipL, bones.kneeL);
      this.drawLimb(ctx, bones.kneeL, bones.footL);
    }
    if (!this.severedLimbs.has('legR')) {
      this.drawLimb(ctx, bones.hipR, bones.kneeR);
      this.drawLimb(ctx, bones.kneeR, bones.footR);
    }

    // 头部
    if (!this.severedLimbs.has('head')) {
      ctx.beginPath();
      ctx.arc(bones.head.x, bones.head.y, bones.head.radius || 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 绘制断肢处的血迹效果
    ctx.fillStyle = '#8B0000';
    for (const limbName of this.severedLimbs) {
      let stumpPos;
      switch (limbName) {
        case 'head': stumpPos = bones.neck; break;
        case 'armL': stumpPos = bones.shoulderL; break;
        case 'armR': stumpPos = bones.shoulderR; break;
        case 'legL': stumpPos = bones.hipL; break;
        case 'legR': stumpPos = bones.hipR; break;
      }
      if (stumpPos) {
        ctx.beginPath();
        ctx.arc(stumpPos.x, stumpPos.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // 绘制碎片（在主体之外）
    this.renderGibs(ctx, screenX, screenY, scale, facingRight);

    // 绘制经验粒子
    this.renderExpParticles(ctx, screenX, screenY, scale);
  }

  /**
   * 渲染碎片
   */
  renderGibs(ctx, screenX, screenY, scale, facingRight) {
    for (const gib of this.gibs) {
      ctx.save();
      ctx.translate(screenX + gib.x * scale, screenY + gib.y * scale);
      ctx.rotate(gib.rotation);
      ctx.scale(scale * (facingRight ? 1 : -1), scale);
      ctx.globalAlpha = gib.alpha * this.fadeAlpha;

      ctx.strokeStyle = this.color;
      ctx.fillStyle = this.color;
      ctx.lineWidth = this.lineWidth;
      ctx.lineCap = 'round';

      // 绘制碎片骨骼
      const boneKeys = Object.keys(gib.bones);
      for (let i = 0; i < boneKeys.length - 1; i++) {
        const b1 = gib.bones[boneKeys[i]];
        const b2 = gib.bones[boneKeys[i + 1]];
        if (b1 && b2) {
          this.drawLimb(ctx, b1, b2);
        }
      }

      // 如果是头部，画圆
      if (gib.bones.head) {
        ctx.beginPath();
        ctx.arc(gib.bones.head.x, gib.bones.head.y, gib.bones.head.radius || 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // 血迹效果
      ctx.fillStyle = '#8B0000';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  /**
   * 渲染经验粒子
   */
  renderExpParticles(ctx, screenX, screenY, scale) {
    for (const p of this.expParticles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.arc(
        screenX + p.x * scale,
        screenY + p.y * scale,
        p.size * scale,
        0, Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * 绘制肢体
   */
  drawLimb(ctx, start, end) {
    if (!start || !end) return;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }

  /**
   * 检查是否已完全转化为经验
   */
  isFullyConverted() {
    return this.convertToExp && this.expParticles.length === 0;
  }

  /**
   * 重置状态
   */
  reset() {
    this.ragdollActive = false;
    this.ragdollBones = null;
    this.ragdollVelocities = null;
    this.animTime = 0;
    this.currentAnim = 'idle';
    this.gibs = [];
    this.severedLimbs.clear();
    this.isDying = false;
    this.deathTimer = 0;
    this.deathPhase = 'falling';
    this.twitchIntensity = 1.0;
    this.fadeAlpha = 1.0;
    this.convertToExp = false;
    this.expParticles = [];
  }

  /**
   * 设置颜色
   */
  setColor(color) {
    this.color = color;
  }
}

export default StickFigure;
