/**
 * 火柴人渲染系统
 * Alan Becker风格的火柴人，带布娃娃物理系统
 */
class StickFigure {
  constructor(color = '#FF8800') {
    this.color = color;
    this.lineWidth = 3;

    // 骨骼定义（相对于中心点的偏移）
    // Alan Becker风格：简洁的线条，圆形头部
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

    // 布娃娃物理
    this.ragdollActive = false;
    this.ragdollBones = null;
    this.ragdollVelocities = null;
    this.gravity = 0.5;
    this.friction = 0.95;
    this.groundY = 28; // 地面高度（相对）

    // 动画混合
    this.blendFactor = 0;
    this.targetAnim = null;
  }

  /**
   * 获取动画帧的骨骼位置
   */
  getAnimatedBones(anim, time, facingRight = true) {
    const bones = JSON.parse(JSON.stringify(this.bones));
    const t = time * 0.01;
    const mirror = facingRight ? 1 : -1;

    switch (anim) {
      case 'idle':
        // 轻微呼吸动画
        bones.head.y += Math.sin(t * 2) * 1;
        bones.spine.y += Math.sin(t * 2) * 0.5;
        bones.handL.y += Math.sin(t * 2 + 0.5) * 1;
        bones.handR.y += Math.sin(t * 2 - 0.5) * 1;
        break;

      case 'walk':
        // 走路动画
        const walkCycle = Math.sin(t * 8);
        const walkCycle2 = Math.sin(t * 8 + Math.PI);

        // 腿部摆动
        bones.kneeL.x += walkCycle * 4 * mirror;
        bones.kneeL.y += Math.abs(walkCycle) * -3;
        bones.footL.x += walkCycle * 8 * mirror;
        bones.footL.y += Math.abs(walkCycle) * -5;

        bones.kneeR.x += walkCycle2 * 4 * mirror;
        bones.kneeR.y += Math.abs(walkCycle2) * -3;
        bones.footR.x += walkCycle2 * 8 * mirror;
        bones.footR.y += Math.abs(walkCycle2) * -5;

        // 手臂摆动（与腿相反）
        bones.elbowL.x += walkCycle2 * 3 * mirror;
        bones.handL.x += walkCycle2 * 6 * mirror;
        bones.elbowR.x += walkCycle * 3 * mirror;
        bones.handR.x += walkCycle * 6 * mirror;

        // 身体轻微上下
        bones.head.y += Math.abs(walkCycle) * -2;
        bones.spine.y += Math.abs(walkCycle) * -1;
        break;

      case 'run':
        // 跑步动画（更夸张）
        const runCycle = Math.sin(t * 12);
        const runCycle2 = Math.sin(t * 12 + Math.PI);

        bones.kneeL.x += runCycle * 8 * mirror;
        bones.kneeL.y += Math.abs(runCycle) * -6;
        bones.footL.x += runCycle * 15 * mirror;
        bones.footL.y += Math.abs(runCycle) * -10;

        bones.kneeR.x += runCycle2 * 8 * mirror;
        bones.kneeR.y += Math.abs(runCycle2) * -6;
        bones.footR.x += runCycle2 * 15 * mirror;
        bones.footR.y += Math.abs(runCycle2) * -10;

        bones.elbowL.x += runCycle2 * 6 * mirror;
        bones.handL.x += runCycle2 * 12 * mirror;
        bones.handL.y += runCycle2 * 4;
        bones.elbowR.x += runCycle * 6 * mirror;
        bones.handR.x += runCycle * 12 * mirror;
        bones.handR.y += runCycle * 4;

        // 身体前倾
        bones.head.x += 3 * mirror;
        bones.head.y += Math.abs(runCycle) * -4 - 2;
        bones.spine.y += Math.abs(runCycle) * -2;
        break;

      case 'attack':
        // 攻击动画 - 向前冲拳
        const attackPhase = (t * 15) % (Math.PI * 2);

        if (attackPhase < Math.PI) {
          // 蓄力
          bones.handR.x = 8 * mirror;
          bones.handR.y = -8;
          bones.elbowR.x = 6 * mirror;
          bones.elbowR.y = -10;
        } else {
          // 出拳
          const punch = Math.sin(attackPhase - Math.PI);
          bones.handR.x = (8 + punch * 20) * mirror;
          bones.handR.y = -4 + punch * 2;
          bones.elbowR.x = (6 + punch * 10) * mirror;
          bones.elbowR.y = -6;

          // 身体跟随
          bones.spine.x += punch * 2 * mirror;
          bones.head.x += punch * 3 * mirror;
        }
        break;

      case 'shoot':
        // 射击动画 - 伸手射击
        const shootPhase = (t * 10) % (Math.PI * 2);
        const recoil = Math.max(0, Math.sin(shootPhase * 4)) * 3;

        // 伸直手臂
        bones.shoulderR.x = 6 * mirror;
        bones.elbowR.x = 16 * mirror;
        bones.elbowR.y = -8;
        bones.handR.x = (26 - recoil) * mirror;
        bones.handR.y = -6;

        // 另一只手支撑
        bones.elbowL.x = 10 * mirror;
        bones.elbowL.y = -6;
        bones.handL.x = 20 * mirror;
        bones.handL.y = -6;

        // 身体略微后仰
        bones.spine.x -= 1 * mirror;
        break;

      case 'roll':
        // 翻滚动画
        const rollPhase = (t * 20) % (Math.PI * 2);
        const rollAngle = rollPhase;

        // 蜷缩身体
        const curl = Math.sin(rollAngle);
        bones.head.y = -10 + curl * 8;
        bones.head.x = curl * 5 * mirror;

        bones.kneeL.y = 10;
        bones.kneeL.x = -8 + curl * 6;
        bones.footL.y = 15;
        bones.footL.x = -10 + curl * 10;

        bones.kneeR.y = 10;
        bones.kneeR.x = 8 + curl * 6;
        bones.footR.y = 15;
        bones.footR.x = 10 + curl * 10;

        bones.handL.y = 5;
        bones.handL.x = -5;
        bones.handR.y = 5;
        bones.handR.x = 5;
        break;

      case 'hit':
        // 受击动画
        const hitRecoil = Math.sin(t * 20) * Math.exp(-t * 0.5);
        bones.head.x -= hitRecoil * 10 * mirror;
        bones.spine.x -= hitRecoil * 5 * mirror;
        bones.handL.x -= hitRecoil * 8;
        bones.handR.x -= hitRecoil * 8;
        break;

      case 'death':
        // 死亡 - 激活布娃娃
        if (!this.ragdollActive) {
          this.activateRagdoll(bones);
        }
        break;
    }

    return bones;
  }

  /**
   * 激活布娃娃物理
   */
  activateRagdoll(initialBones, impactAngle = 0, force = 10) {
    this.ragdollActive = true;
    this.ragdollBones = JSON.parse(JSON.stringify(initialBones));
    this.ragdollVelocities = {};

    const impactX = Math.cos(impactAngle) * force;
    const impactY = Math.sin(impactAngle) * force;

    for (const key in this.ragdollBones) {
      // 根据骨骼位置添加不同的初始速度
      const bone = this.ragdollBones[key];
      const distFromCenter = Math.sqrt(bone.x * bone.x + bone.y * bone.y);
      const randomFactor = 0.5 + Math.random() * 0.5;

      this.ragdollVelocities[key] = {
        x: impactX * randomFactor + (Math.random() - 0.5) * 3,
        y: impactY * randomFactor - Math.random() * 5 - distFromCenter * 0.2,
        rotation: (Math.random() - 0.5) * 0.3
      };
    }
  }

  /**
   * 更新布娃娃物理
   */
  updateRagdoll(deltaTime) {
    if (!this.ragdollActive) return;

    const dt = deltaTime * 0.05;

    for (const key in this.ragdollBones) {
      const bone = this.ragdollBones[key];
      const vel = this.ragdollVelocities[key];

      // 应用速度
      bone.x += vel.x * dt;
      bone.y += vel.y * dt;

      // 应用重力
      vel.y += this.gravity * dt;

      // 地面碰撞
      if (bone.y > this.groundY) {
        bone.y = this.groundY;
        vel.y *= -0.3; // 弹跳
        vel.x *= this.friction;
      }

      // 摩擦力
      vel.x *= 0.99;
      vel.y *= 0.99;
    }

    // 保持骨骼连接（简化的约束）
    this.applyBoneConstraints();
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

    // 更新布娃娃
    if (this.ragdollActive) {
      this.updateRagdoll(deltaTime);
    }
  }

  /**
   * 渲染火柴人
   */
  render(ctx, screenX, screenY, scale = 1, facingRight = true) {
    const bones = this.ragdollActive
      ? this.ragdollBones
      : this.getAnimatedBones(this.currentAnim, this.animTime, facingRight);

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.scale(scale * (facingRight ? 1 : -1), scale);

    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 绘制身体
    this.drawLimb(ctx, bones.neck, bones.spine); // 脖子到脊椎
    this.drawLimb(ctx, bones.spine, bones.hip); // 脊椎到臀部

    // 绘制手臂
    this.drawLimb(ctx, bones.shoulderL, bones.elbowL);
    this.drawLimb(ctx, bones.elbowL, bones.handL);
    this.drawLimb(ctx, bones.shoulderR, bones.elbowR);
    this.drawLimb(ctx, bones.elbowR, bones.handR);

    // 绘制腿
    this.drawLimb(ctx, bones.hipL, bones.kneeL);
    this.drawLimb(ctx, bones.kneeL, bones.footL);
    this.drawLimb(ctx, bones.hipR, bones.kneeR);
    this.drawLimb(ctx, bones.kneeR, bones.footR);

    // 绘制头部（圆形）
    ctx.beginPath();
    ctx.arc(bones.head.x, bones.head.y, bones.head.radius || 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 绘制肢体
   */
  drawLimb(ctx, start, end) {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
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
  }

  /**
   * 设置颜色
   */
  setColor(color) {
    this.color = color;
  }
}

export default StickFigure;
