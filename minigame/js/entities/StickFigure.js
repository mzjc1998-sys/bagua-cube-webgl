/**
 * 火柴人渲染系统
 * Alan Becker风格的火柴人，带布娃娃物理系统
 * 支持身体多处断裂、墙体碰撞、各自缩成一团变经验
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
    this.animSpeed = 1.0;

    // 布娃娃物理
    this.ragdollActive = false;
    this.gravity = 0.8;
    this.friction = 0.85;
    this.groundY = 28;

    // 断裂的身体部件列表
    this.bodyParts = []; // 每个部件独立物理

    // 死亡状态
    this.isDying = false;
    this.deathTimer = 0;
    this.deathPhase = 'falling'; // falling, writhing, curling, done
    this.fadeAlpha = 1.0;

    // 世界坐标（用于墙体碰撞）
    this.worldX = 0;
    this.worldY = 0;

    // 经验转化
    this.convertToExp = false;
    this.onExpReady = null;
  }

  /**
   * 获取动画帧的骨骼位置
   */
  getAnimatedBones(anim, time, facingRight = true) {
    const bones = JSON.parse(JSON.stringify(this.bones));
    const t = time * 0.003 * this.animSpeed;
    const mirror = facingRight ? 1 : -1;

    switch (anim) {
      case 'idle':
        bones.head.y += Math.sin(t * 1.5) * 1;
        bones.spine.y += Math.sin(t * 1.5) * 0.5;
        bones.handL.y += Math.sin(t * 1.5 + 0.5) * 1;
        bones.handR.y += Math.sin(t * 1.5 - 0.5) * 1;
        break;

      case 'walk':
        const walkCycle = Math.sin(t * 4);
        const walkCycle2 = Math.sin(t * 4 + Math.PI);

        bones.kneeL.x += walkCycle * 3 * mirror;
        bones.kneeL.y += Math.abs(walkCycle) * -2;
        bones.footL.x += walkCycle * 6 * mirror;
        bones.footL.y += Math.abs(walkCycle) * -4;

        bones.kneeR.x += walkCycle2 * 3 * mirror;
        bones.kneeR.y += Math.abs(walkCycle2) * -2;
        bones.footR.x += walkCycle2 * 6 * mirror;
        bones.footR.y += Math.abs(walkCycle2) * -4;

        bones.elbowL.x += walkCycle2 * 2 * mirror;
        bones.handL.x += walkCycle2 * 4 * mirror;
        bones.elbowR.x += walkCycle * 2 * mirror;
        bones.handR.x += walkCycle * 4 * mirror;

        bones.head.y += Math.abs(walkCycle) * -1.5;
        bones.spine.y += Math.abs(walkCycle) * -0.8;
        break;

      case 'run':
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

        bones.head.x += 2 * mirror;
        bones.head.y += Math.abs(runCycle) * -3 - 1;
        bones.spine.y += Math.abs(runCycle) * -1.5;
        break;

      case 'shoot':
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
   * 将身体断成多个部件
   */
  dismemberBody(impactAngle, force) {
    const currentBones = this.getAnimatedBones(this.currentAnim, this.animTime, true);

    // 可能断裂的部位及概率
    const possibleBreaks = [
      { name: 'head', chance: 0.3, bones: ['head'] },
      { name: 'armL', chance: 0.4, bones: ['shoulderL', 'elbowL', 'handL'] },
      { name: 'armR', chance: 0.4, bones: ['shoulderR', 'elbowR', 'handR'] },
      { name: 'legL', chance: 0.35, bones: ['hipL', 'kneeL', 'footL'] },
      { name: 'legR', chance: 0.35, bones: ['hipR', 'kneeR', 'footR'] }
    ];

    // 收集断裂的部位
    const severedParts = new Set();
    for (const breakPoint of possibleBreaks) {
      if (Math.random() < breakPoint.chance) {
        severedParts.add(breakPoint.name);
      }
    }

    // 确保至少断一个部位
    if (severedParts.size === 0) {
      const randomBreak = possibleBreaks[Math.floor(Math.random() * possibleBreaks.length)];
      severedParts.add(randomBreak.name);
    }

    // 收集主体剩余的骨骼
    const mainBodyBones = ['neck', 'spine', 'hip'];
    if (!severedParts.has('head')) mainBodyBones.push('head');
    if (!severedParts.has('armL')) mainBodyBones.push('shoulderL', 'elbowL', 'handL');
    if (!severedParts.has('armR')) mainBodyBones.push('shoulderR', 'elbowR', 'handR');
    if (!severedParts.has('legL')) mainBodyBones.push('hipL', 'kneeL', 'footL');
    if (!severedParts.has('legR')) mainBodyBones.push('hipR', 'kneeR', 'footR');

    // 创建主体部件
    this.bodyParts.push(this.createBodyPart(
      mainBodyBones,
      currentBones,
      impactAngle + (Math.random() - 0.5) * 0.5,
      force * 0.6,
      'main'
    ));

    // 创建断裂的部件
    for (const partName of severedParts) {
      const breakPoint = possibleBreaks.find(b => b.name === partName);
      if (breakPoint) {
        // 断裂部件向随机方向飞出
        const partAngle = impactAngle + (Math.random() - 0.5) * Math.PI;
        this.bodyParts.push(this.createBodyPart(
          breakPoint.bones,
          currentBones,
          partAngle,
          force * (0.8 + Math.random() * 0.6),
          partName
        ));
      }
    }
  }

  /**
   * 创建身体部件
   */
  createBodyPart(boneNames, sourceBones, angle, force, partName) {
    const part = {
      name: partName,
      bones: {},
      x: 0,
      y: 0,
      vx: Math.cos(angle) * force * 2,
      vy: Math.sin(angle) * force - 4,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      onGround: false,
      // 触手蠕动
      writhePhase: Math.random() * Math.PI * 2,
      writheSpeed: 0.02 + Math.random() * 0.01,
      writheIntensity: 1.0,
      // 蜷缩状态
      curlProgress: 0,
      isCurled: false,
      // 世界坐标
      worldX: this.worldX,
      worldY: this.worldY
    };

    // 计算中心
    let cx = 0, cy = 0, count = 0;
    for (const name of boneNames) {
      if (sourceBones[name]) {
        cx += sourceBones[name].x;
        cy += sourceBones[name].y;
        count++;
      }
    }
    if (count > 0) {
      cx /= count;
      cy /= count;
    }

    // 复制骨骼（相对于部件中心）
    for (const name of boneNames) {
      if (sourceBones[name]) {
        part.bones[name] = {
          x: sourceBones[name].x - cx,
          y: sourceBones[name].y - cy,
          baseX: sourceBones[name].x - cx,
          baseY: sourceBones[name].y - cy,
          radius: sourceBones[name].radius
        };
      }
    }

    part.x = cx;
    part.y = cy;

    return part;
  }

  /**
   * 激活布娃娃物理
   */
  activateRagdoll(initialBones, impactAngle = 0, force = 10) {
    this.ragdollActive = true;
    this.isDying = true;
    this.deathTimer = 0;
    this.deathPhase = 'falling';
    this.bodyParts = [];

    // 将身体断成多个部件
    this.dismemberBody(impactAngle, force);
  }

  /**
   * 更新身体部件物理（含墙体碰撞）
   */
  updateBodyPart(part, deltaTime, dungeon) {
    const dt = deltaTime * 0.05;

    // 蠕动效果
    if (!part.isCurled) {
      part.writhePhase += part.writheSpeed * deltaTime;
      const intensity = part.writheIntensity;

      for (const name in part.bones) {
        const bone = part.bones[name];
        // 克苏鲁触手蠕动
        const wave1 = Math.sin(part.writhePhase + bone.baseX * 0.1) * 4 * intensity;
        const wave2 = Math.cos(part.writhePhase * 1.3 + bone.baseY * 0.1) * 3 * intensity;
        bone.x = bone.baseX + wave1 + (Math.random() - 0.5) * 2 * intensity;
        bone.y = bone.baseY + wave2 * 0.5;
      }
    }

    // 物理移动
    if (!part.onGround) {
      const newX = part.x + part.vx * dt;
      const newY = part.y + part.vy * dt;

      // 墙体碰撞检测
      const worldNewX = part.worldX + newX * 0.03;
      const worldNewY = part.worldY + newY * 0.03;

      let canMoveX = true;
      let canMoveY = true;

      if (dungeon && dungeon.isWalkable) {
        canMoveX = dungeon.isWalkable(worldNewX, part.worldY + part.y * 0.03);
        canMoveY = dungeon.isWalkable(part.worldX + part.x * 0.03, worldNewY);
      }

      if (canMoveX) {
        part.x = newX;
        part.worldX = worldNewX;
      } else {
        part.vx *= -0.5; // 反弹
      }

      if (canMoveY) {
        part.y = newY;
        part.worldY = worldNewY;
      } else {
        part.vy *= -0.5;
      }

      part.vy += this.gravity * dt;
      part.rotation += part.rotationSpeed * dt;

      // 地面碰撞
      if (part.y > this.groundY) {
        part.y = this.groundY;
        part.vy *= -0.2;
        part.vx *= this.friction;
        part.rotationSpeed *= 0.7;

        if (Math.abs(part.vy) < 0.5 && Math.abs(part.vx) < 0.3) {
          part.onGround = true;
        }
      }

      part.vx *= 0.98;
      part.vy *= 0.98;
    }

    // 蜷缩效果（落地后开始）
    if (part.onGround && this.deathPhase === 'curling') {
      part.curlProgress += deltaTime * 0.001;
      part.writheIntensity = Math.max(0, 1 - part.curlProgress);

      if (part.curlProgress >= 1) {
        part.isCurled = true;
        // 所有骨骼收缩到中心
        for (const name in part.bones) {
          const bone = part.bones[name];
          bone.x = bone.baseX * 0.1;
          bone.y = bone.baseY * 0.1;
        }
      } else {
        // 逐渐收缩
        const curl = part.curlProgress;
        for (const name in part.bones) {
          const bone = part.bones[name];
          bone.x = bone.baseX * (1 - curl * 0.9);
          bone.y = bone.baseY * (1 - curl * 0.9);
        }
      }
    }
  }

  /**
   * 更新布娃娃物理
   */
  updateRagdoll(deltaTime, dungeon) {
    if (!this.ragdollActive) return;

    this.deathTimer += deltaTime;

    // 更新死亡阶段
    if (this.deathPhase === 'falling' && this.deathTimer > 800) {
      // 检查是否所有部件都落地
      const allOnGround = this.bodyParts.every(p => p.onGround);
      if (allOnGround || this.deathTimer > 1500) {
        this.deathPhase = 'writhing';
      }
    } else if (this.deathPhase === 'writhing' && this.deathTimer > 2500) {
      this.deathPhase = 'curling';
    } else if (this.deathPhase === 'curling' && this.deathTimer > 4000) {
      this.deathPhase = 'done';
      // 检查所有部件是否蜷缩完成
      const allCurled = this.bodyParts.every(p => p.isCurled);
      if (allCurled) {
        this.convertToExp = true;
        if (this.onExpReady) {
          this.onExpReady(this.bodyParts.length * 10);
        }
      }
    }

    // 淡出
    if (this.deathPhase === 'done') {
      this.fadeAlpha = Math.max(0, 1 - (this.deathTimer - 4000) / 1000);
      if (this.fadeAlpha <= 0) {
        this.convertToExp = true;
        if (this.onExpReady && !this._expGiven) {
          this._expGiven = true;
          this.onExpReady(this.bodyParts.length * 10);
        }
      }
    }

    // 更新所有身体部件
    for (const part of this.bodyParts) {
      this.updateBodyPart(part, deltaTime, dungeon);
    }
  }

  /**
   * 更新动画
   */
  update(deltaTime, state = {}, dungeon = null) {
    this.animTime += deltaTime;

    if (this.isDying) {
      this.updateRagdoll(deltaTime, dungeon);
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
      this.updateRagdoll(deltaTime, dungeon);
    }
  }

  /**
   * 设置世界坐标（用于墙体碰撞）
   */
  setWorldPosition(x, y) {
    this.worldX = x;
    this.worldY = y;
  }

  /**
   * 渲染火柴人
   */
  render(ctx, screenX, screenY, scale = 1, facingRight = true) {
    // 如果在死亡状态，渲染断裂的部件
    if (this.isDying && this.bodyParts.length > 0) {
      this.renderBodyParts(ctx, screenX, screenY, scale, facingRight);
      return;
    }

    // 正常渲染
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.scale(scale * (facingRight ? 1 : -1), scale);
    ctx.globalAlpha = this.fadeAlpha;

    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const bones = this.getAnimatedBones(this.currentAnim, this.animTime, facingRight);

    // 绘制身体
    this.drawLimb(ctx, bones.neck, bones.spine);
    this.drawLimb(ctx, bones.spine, bones.hip);

    // 手臂
    this.drawLimb(ctx, bones.shoulderL, bones.elbowL);
    this.drawLimb(ctx, bones.elbowL, bones.handL);
    this.drawLimb(ctx, bones.shoulderR, bones.elbowR);
    this.drawLimb(ctx, bones.elbowR, bones.handR);

    // 腿
    this.drawLimb(ctx, bones.hipL, bones.kneeL);
    this.drawLimb(ctx, bones.kneeL, bones.footL);
    this.drawLimb(ctx, bones.hipR, bones.kneeR);
    this.drawLimb(ctx, bones.kneeR, bones.footR);

    // 头部
    ctx.beginPath();
    ctx.arc(bones.head.x, bones.head.y, bones.head.radius || 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 渲染断裂的身体部件
   */
  renderBodyParts(ctx, screenX, screenY, scale, facingRight) {
    for (const part of this.bodyParts) {
      ctx.save();
      ctx.translate(screenX + part.x * scale, screenY + part.y * scale);
      ctx.rotate(part.rotation);
      ctx.scale(scale * (facingRight ? 1 : -1), scale);
      ctx.globalAlpha = this.fadeAlpha;

      ctx.strokeStyle = this.color;
      ctx.fillStyle = this.color;
      ctx.lineWidth = this.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const bones = part.bones;

      // 根据部件类型绘制
      if (part.name === 'main') {
        // 主体
        if (bones.neck && bones.spine) this.drawLimb(ctx, bones.neck, bones.spine);
        if (bones.spine && bones.hip) this.drawLimb(ctx, bones.spine, bones.hip);
        if (bones.shoulderL && bones.elbowL) this.drawLimb(ctx, bones.shoulderL, bones.elbowL);
        if (bones.elbowL && bones.handL) this.drawLimb(ctx, bones.elbowL, bones.handL);
        if (bones.shoulderR && bones.elbowR) this.drawLimb(ctx, bones.shoulderR, bones.elbowR);
        if (bones.elbowR && bones.handR) this.drawLimb(ctx, bones.elbowR, bones.handR);
        if (bones.hipL && bones.kneeL) this.drawLimb(ctx, bones.hipL, bones.kneeL);
        if (bones.kneeL && bones.footL) this.drawLimb(ctx, bones.kneeL, bones.footL);
        if (bones.hipR && bones.kneeR) this.drawLimb(ctx, bones.hipR, bones.kneeR);
        if (bones.kneeR && bones.footR) this.drawLimb(ctx, bones.kneeR, bones.footR);
        if (bones.head) {
          ctx.beginPath();
          ctx.arc(bones.head.x, bones.head.y, bones.head.radius || 8, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (part.name === 'head') {
        // 头部
        if (bones.head) {
          ctx.beginPath();
          ctx.arc(bones.head.x, bones.head.y, bones.head.radius || 8, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (part.name === 'armL' || part.name === 'armR') {
        // 手臂
        const shoulder = part.name === 'armL' ? bones.shoulderL : bones.shoulderR;
        const elbow = part.name === 'armL' ? bones.elbowL : bones.elbowR;
        const hand = part.name === 'armL' ? bones.handL : bones.handR;
        if (shoulder && elbow) this.drawLimb(ctx, shoulder, elbow);
        if (elbow && hand) this.drawLimb(ctx, elbow, hand);
      } else if (part.name === 'legL' || part.name === 'legR') {
        // 腿
        const hip = part.name === 'legL' ? bones.hipL : bones.hipR;
        const knee = part.name === 'legL' ? bones.kneeL : bones.kneeR;
        const foot = part.name === 'legL' ? bones.footL : bones.footR;
        if (hip && knee) this.drawLimb(ctx, hip, knee);
        if (knee && foot) this.drawLimb(ctx, knee, foot);
      }

      // 断裂处血迹
      if (!part.isCurled) {
        ctx.fillStyle = '#8B0000';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      }

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
    return this.convertToExp && this.fadeAlpha <= 0;
  }

  /**
   * 重置状态
   */
  reset() {
    this.ragdollActive = false;
    this.animTime = 0;
    this.currentAnim = 'idle';
    this.bodyParts = [];
    this.isDying = false;
    this.deathTimer = 0;
    this.deathPhase = 'falling';
    this.fadeAlpha = 1.0;
    this.convertToExp = false;
    this._expGiven = false;
  }

  /**
   * 设置颜色
   */
  setColor(color) {
    this.color = color;
  }
}

export default StickFigure;
