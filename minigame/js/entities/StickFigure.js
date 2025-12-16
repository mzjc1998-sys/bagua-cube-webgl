/**
 * 火柴人渲染系统
 * Alan Becker风格的火柴人，带布娃娃物理系统
 * 支持身体断成两截、克苏鲁触手蠕动、搅成一团等效果
 */
class StickFigure {
  constructor(color = '#FF8800') {
    this.color = color;
    this.lineWidth = 3;

    // 骨骼定义（相对于中心点的偏移）
    // Alan Becker风格：简洁、紧凑的火柴人
    this.bones = {
      head: { x: 0, y: -22, radius: 7 },
      neck: { x: 0, y: -14 },
      spine: { x: 0, y: -4 },
      hip: { x: 0, y: 6 },

      // 手臂 - 自然下垂，靠近身体
      shoulderL: { x: 0, y: -12 },
      shoulderR: { x: 0, y: -12 },
      elbowL: { x: -2, y: -4 },
      elbowR: { x: 2, y: -4 },
      handL: { x: -3, y: 4 },
      handR: { x: 3, y: 4 },

      // 腿 - 并拢站立
      hipL: { x: -1, y: 6 },
      hipR: { x: 1, y: 6 },
      kneeL: { x: -1, y: 16 },
      kneeR: { x: 1, y: 16 },
      footL: { x: -1, y: 26 },
      footR: { x: 1, y: 26 }
    };

    // 动画状态
    this.animTime = 0;
    this.currentAnim = 'idle';
    this.animSpeed = 1.0;

    // 布娃娃物理
    this.ragdollActive = false;
    this.ragdollBones = null;
    this.ragdollVelocities = null;
    this.gravity = 0.8;
    this.friction = 0.92;
    this.groundY = 26;

    // 身体断裂系统 - 断成两截
    this.isBisected = false;
    this.bisectPoint = null; // 断裂点: 'neck', 'spine', 'hip'
    this.upperHalf = null;   // 上半身
    this.lowerHalf = null;   // 下半身

    // 触手蠕动参数
    this.tentaclePhase = 0;
    this.tentacleSpeed = 0.015;
    this.writheIntensity = 1.0;

    // 死亡状态
    this.isDying = false;
    this.deathTimer = 0;
    this.deathPhase = 'falling'; // falling, writhing, merging, fading
    this.fadeAlpha = 1.0;

    // 经验转化
    this.convertToExp = false;
    this.onExpReady = null;

    // 寄生虫钻出回调
    this.onDustSpray = null; // (x, y, amount, angle, force) => {}
    this.dustSprayTimer = 0;
    this.dustSprayInterval = 400; // 钻出间隔（更慢）
  }

  // ============================================
  // 动画系统 - 数据驱动的骨骼动画
  // ============================================

  /**
   * 获取动画帧的骨骼位置
   * 主入口函数，根据动画类型分发到具体处理函数
   */
  getAnimatedBones(anim, time, facingRight = true) {
    const bones = JSON.parse(JSON.stringify(this.bones));
    const t = time * 0.003 * this.animSpeed;
    const mirror = facingRight ? 1 : -1;

    switch (anim) {
      case 'idle':
        this.applyIdleAnimation(bones, t, mirror);
        break;
      case 'walk':
        this.applyWalkAnimation(bones, t, mirror);
        break;
      case 'run':
        this.applyRunAnimation(bones, t, mirror);
        break;
      case 'shoot':
        this.applyShootAnimation(bones, t, mirror);
        break;
      case 'roll':
        this.applyRollAnimation(bones, t, mirror);
        break;
      case 'hit':
        this.applyHitAnimation(bones, t, mirror);
        break;
      case 'attack':
        this.applyAttackAnimation(bones, t, mirror);
        break;
    }

    return bones;
  }

  // ============================================
  // 站立动画
  // ============================================

  /**
   * 站立呼吸动画 - 轻微起伏
   */
  applyIdleAnimation(bones, t, mirror) {
    const breathe = Math.sin(t * 1.2);

    // 身体轻微起伏（呼吸感）
    bones.head.y += breathe * 0.5;
    bones.neck.y += breathe * 0.3;
    bones.spine.y += breathe * 0.2;

    // 手臂自然下垂，极轻微摆动
    bones.handL.y += Math.sin(t * 1.2 + 0.3) * 0.3;
    bones.handR.y += Math.sin(t * 1.2 - 0.3) * 0.3;
  }

  // ============================================
  // 走路动画 - 自然放松的日常步行
  // ============================================

  /**
   * 走路动画主函数
   * Alan Becker风格：简洁、流畅的走路动画
   */
  applyWalkAnimation(bones, t, mirror) {
    // 走路周期
    const cycleSpeed = 3;
    const phase = (t * cycleSpeed) % 1;

    // 左右腿相位差0.5
    const leftPhase = phase;
    const rightPhase = (phase + 0.5) % 1;

    // === 腿部动画 ===
    this.applyWalkLeg(bones, leftPhase, mirror, 'L');
    this.applyWalkLeg(bones, rightPhase, mirror, 'R');

    // === 身体微小起伏 ===
    const bodyBob = Math.sin(phase * Math.PI * 2) * 0.5;
    bones.head.y += bodyBob * 0.6;
    bones.spine.y += bodyBob * 0.3;

    // === 手臂自然摆动 ===
    this.applyWalkArm(bones, rightPhase, mirror, 'L');
    this.applyWalkArm(bones, leftPhase, mirror, 'R');
  }

  /**
   * 走路腿部动画 - 简洁自然
   */
  applyWalkLeg(bones, phase, mirror, side) {
    const knee = bones[`knee${side}`];
    const foot = bones[`foot${side}`];

    // 走路参数
    const strideLength = 6;
    const liftHeight = 3;

    // 使用正弦波简化动画
    const legSwing = Math.sin(phase * Math.PI * 2);

    // 脚前后移动
    foot.x += legSwing * strideLength * 0.5 * mirror;

    // 抬脚：只在向前摆动时抬起
    if (phase > 0.5) {
      const liftPhase = (phase - 0.5) * 2;  // 0→1
      foot.y -= Math.sin(liftPhase * Math.PI) * liftHeight;
    }

    // 膝盖跟随
    knee.x += legSwing * strideLength * 0.3 * mirror;
    if (phase > 0.5) {
      const liftPhase = (phase - 0.5) * 2;
      knee.y -= Math.sin(liftPhase * Math.PI) * (liftHeight * 0.5);
    }
  }

  /**
   * 走路手臂摆动 - 与腿反向
   */
  applyWalkArm(bones, legPhase, mirror, side) {
    const elbow = bones[`elbow${side}`];
    const hand = bones[`hand${side}`];

    // 手臂与腿反向摆动
    const armSwing = Math.sin(legPhase * Math.PI * 2);

    // 前后摆动（幅度小）
    elbow.x += armSwing * 2 * mirror;
    hand.x += armSwing * 3 * mirror;

    // 轻微前后（深度感）
    hand.y += armSwing * 1;
  }

  // ============================================
  // 跑步动画 - 专业跑步周期
  // ============================================

  /**
   * 跑步动画主函数
   * Alan Becker风格：动感、有力的跑步
   */
  applyRunAnimation(bones, t, mirror) {
    // 跑步周期（比走路快）
    const cycleSpeed = 5;
    const phase = (t * cycleSpeed) % 1;

    // 左右腿相位差0.5
    const leftPhase = phase;
    const rightPhase = (phase + 0.5) % 1;

    // === 身体前倾 ===
    const lean = 2 * mirror;
    bones.head.x += lean;
    bones.neck.x += lean * 0.7;
    bones.spine.x += lean * 0.4;

    // === 腿部动画 ===
    this.applyRunLeg(bones, leftPhase, mirror, 'L');
    this.applyRunLeg(bones, rightPhase, mirror, 'R');

    // === 身体弹跳 ===
    const bounce = Math.abs(Math.sin(phase * Math.PI * 2)) * 2;
    bones.head.y -= bounce;
    bones.spine.y -= bounce * 0.6;

    // === 手臂大幅摆动 ===
    this.applyRunArm(bones, rightPhase, mirror, 'L');
    this.applyRunArm(bones, leftPhase, mirror, 'R');
  }

  /**
   * 跑步腿部动画 - 简化但有力
   */
  applyRunLeg(bones, phase, mirror, side) {
    const knee = bones[`knee${side}`];
    const foot = bones[`foot${side}`];

    // 跑步参数
    const strideLength = 10;
    const liftHeight = 8;

    // 腿部摆动
    const legSwing = Math.sin(phase * Math.PI * 2);

    // 脚前后移动（更大幅度）
    foot.x += legSwing * strideLength * 0.5 * mirror;

    // 高抬腿
    if (phase > 0.4 && phase < 0.9) {
      const liftPhase = (phase - 0.4) / 0.5;
      foot.y -= Math.sin(liftPhase * Math.PI) * liftHeight;
      knee.y -= Math.sin(liftPhase * Math.PI) * (liftHeight * 0.7);
    }

    // 膝盖前后
    knee.x += legSwing * strideLength * 0.35 * mirror;
  }

  /**
   * 跑步手臂摆动 - 大幅度
   */
  applyRunArm(bones, legPhase, mirror, side) {
    const elbow = bones[`elbow${side}`];
    const hand = bones[`hand${side}`];

    // 手臂大幅摆动
    const armSwing = Math.sin(legPhase * Math.PI * 2);

    // 肘部弯曲向上
    elbow.x += armSwing * 4 * mirror;
    elbow.y -= 3 + Math.abs(armSwing) * 2;

    // 手部跟随
    hand.x += armSwing * 6 * mirror;
    hand.y -= 2 + armSwing * 3;
  }

  // ============================================
  // 其他动画
  // ============================================

  /**
   * 射击动画
   */
  applyShootAnimation(bones, t, mirror) {
    const shootPhase = (t * 5) % (Math.PI * 2);
    const recoil = Math.max(0, Math.sin(shootPhase * 3)) * 1.5;

    // 持枪姿势 - 双手前伸
    bones.elbowR.x = 8 * mirror;
    bones.elbowR.y = -8;
    bones.handR.x = (14 - recoil) * mirror;
    bones.handR.y = -10;

    // 辅助手支撑
    bones.elbowL.x = 5 * mirror;
    bones.elbowL.y = -7;
    bones.handL.x = 10 * mirror;
    bones.handL.y = -9;

    // 身体微后仰
    bones.spine.x -= 0.5 * mirror;
    bones.head.x += 1 * mirror;
  }

  /**
   * 翻滚动画
   */
  applyRollAnimation(bones, t, mirror) {
    const rollPhase = (t * 8) % (Math.PI * 2);
    const curl = Math.sin(rollPhase);

    // 整体蜷缩旋转
    const rotation = rollPhase;

    // 头部收缩
    bones.head.y = -12 + curl * 8;
    bones.head.x = Math.sin(rotation) * 3 * mirror;

    // 腿收起成球
    bones.kneeL.y = 8 + curl * 4;
    bones.kneeL.x = -2 + curl * 3;
    bones.footL.y = 12 + curl * 6;
    bones.footL.x = -3 + curl * 5;

    bones.kneeR.y = 8 + curl * 4;
    bones.kneeR.x = 2 + curl * 3;
    bones.footR.y = 12 + curl * 6;
    bones.footR.x = 3 + curl * 5;

    // 手抱住身体
    bones.elbowL.x = -1;
    bones.elbowL.y = 0;
    bones.handL.x = -2;
    bones.handL.y = 6;

    bones.elbowR.x = 1;
    bones.elbowR.y = 0;
    bones.handR.x = 2;
    bones.handR.y = 6;
  }

  /**
   * 受击动画
   */
  applyHitAnimation(bones, t, mirror) {
    const hitRecoil = Math.sin(t * 12) * Math.exp(-t * 0.3);

    // 身体后仰
    bones.head.x -= hitRecoil * 5 * mirror;
    bones.head.y += Math.abs(hitRecoil) * 2;
    bones.spine.x -= hitRecoil * 3 * mirror;

    // 手臂甩开
    bones.handL.x -= hitRecoil * 4;
    bones.handR.x -= hitRecoil * 4;
    bones.elbowL.x -= hitRecoil * 2;
    bones.elbowR.x -= hitRecoil * 2;
  }

  /**
   * 攻击动画 - 简洁有力的挥击
   */
  applyAttackAnimation(bones, t, mirror) {
    const attackPhase = (t * 6) % 1;

    if (attackPhase < 0.25) {
      // 蓄力
      const prep = attackPhase / 0.25;
      bones.elbowR.x = (-2 - prep * 4) * mirror;
      bones.elbowR.y = -6 + prep * 2;
      bones.handR.x = (-4 - prep * 6) * mirror;
      bones.handR.y = -2 + prep * 4;
      bones.spine.x = -prep * 1 * mirror;

    } else if (attackPhase < 0.45) {
      // 挥击
      const swing = (attackPhase - 0.25) / 0.2;
      const ease = this.easeOutQuad(swing);
      bones.elbowR.x = (-6 + ease * 14) * mirror;
      bones.elbowR.y = -4 - ease * 3;
      bones.handR.x = (-10 + ease * 22) * mirror;
      bones.handR.y = 2 - ease * 6;
      bones.spine.x = (-1 + ease * 2) * mirror;

    } else {
      // 收招
      const recover = (attackPhase - 0.45) / 0.55;
      const ease = this.easeInOutQuad(recover);
      bones.elbowR.x = (8 - ease * 6) * mirror;
      bones.elbowR.y = -7 + ease * 3;
      bones.handR.x = (12 - ease * 9) * mirror;
      bones.handR.y = -4 + ease * 8;
      bones.spine.x = (1 - ease * 1) * mirror;
    }
  }

  // ============================================
  // 缓动函数
  // ============================================

  /**
   * 缓动函数 - 缓入缓出
   */
  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * 缓动函数 - 缓出
   */
  easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
  }

  /**
   * 缓动函数 - 缓入
   */
  easeInQuad(t) {
    return t * t;
  }

  /**
   * 将身体断成两截（或多截）
   */
  bisectBody(impactAngle, force) {
    if (this.isBisected) return;

    // 更多随机断裂点，包括四肢
    const bisectTypes = [
      'neck',      // 头飞出
      'spine',     // 腰断
      'hip',       // 臀部断
      'armL',      // 左臂断
      'armR',      // 右臂断
      'legL',      // 左腿断
      'legR',      // 右腿断
      'shoulder',  // 双臂断
      'legs'       // 双腿断
    ];
    this.bisectPoint = bisectTypes[Math.floor(Math.random() * bisectTypes.length)];
    this.isBisected = true;

    // 断开的肢体列表（用于多肢体断裂）
    this.detachedLimbs = [];

    const currentBones = this.ragdollBones || this.getAnimatedBones(this.currentAnim, this.animTime, true);

    // 获取断裂点的位置（用于粉末喷射）
    let breakPointX = 0, breakPointY = 0;
    if (this.bisectPoint === 'neck') {
      breakPointY = currentBones.neck.y;
    } else if (this.bisectPoint === 'spine') {
      breakPointY = currentBones.spine.y;
    } else if (this.bisectPoint === 'hip' || this.bisectPoint === 'legs') {
      breakPointY = currentBones.hip.y;
    } else if (this.bisectPoint === 'armL') {
      breakPointX = currentBones.shoulderL.x;
      breakPointY = currentBones.shoulderL.y;
    } else if (this.bisectPoint === 'armR') {
      breakPointX = currentBones.shoulderR.x;
      breakPointY = currentBones.shoulderR.y;
    } else if (this.bisectPoint === 'legL') {
      breakPointX = currentBones.hipL.x;
      breakPointY = currentBones.hipL.y;
    } else if (this.bisectPoint === 'legR') {
      breakPointX = currentBones.hipR.x;
      breakPointY = currentBones.hipR.y;
    } else if (this.bisectPoint === 'shoulder') {
      breakPointY = currentBones.neck.y;
    }
    this.breakPointOffset = { x: breakPointX, y: breakPointY };

    // 触发初始寄生虫喷射（断裂瞬间）
    // 骨骼坐标转换为世界坐标偏移
    const coordScale = 0.025;
    if (this.onDustSpray) {
      for (let i = 0; i < 5; i++) {
        const sprayAngle = impactAngle + (Math.random() - 0.5) * Math.PI;
        // 传递世界坐标偏移
        this.onDustSpray(breakPointX * coordScale, breakPointY * coordScale, 8, sprayAngle, force * 0.5 + Math.random() * 2);
      }
    }

    // 根据断裂类型分割身体
    if (this.bisectPoint === 'neck') {
      // 头飞出
      this.upperHalf = this.createBodyHalf(['head'], currentBones, impactAngle, force * 1.5);
      this.lowerHalf = this.createBodyHalf(
        ['neck', 'spine', 'hip', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'footL', 'footR'],
        currentBones, impactAngle + Math.PI, force * 0.5
      );
    } else if (this.bisectPoint === 'spine') {
      // 腰断
      this.upperHalf = this.createBodyHalf(
        ['head', 'neck', 'spine', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR'],
        currentBones, impactAngle, force
      );
      this.lowerHalf = this.createBodyHalf(
        ['hip', 'hipL', 'hipR', 'kneeL', 'kneeR', 'footL', 'footR'],
        currentBones, impactAngle + Math.PI * 0.8, force * 0.8
      );
    } else if (this.bisectPoint === 'hip') {
      // 臀部断
      this.upperHalf = this.createBodyHalf(
        ['head', 'neck', 'spine', 'hip', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR'],
        currentBones, impactAngle, force
      );
      this.lowerHalf = this.createBodyHalf(
        ['hipL', 'hipR', 'kneeL', 'kneeR', 'footL', 'footR'],
        currentBones, impactAngle + Math.PI * 1.2, force * 0.7
      );
    } else if (this.bisectPoint === 'armL') {
      // 左臂断开
      this.upperHalf = this.createBodyHalf(
        ['elbowL', 'handL'],
        currentBones, impactAngle - 0.5, force * 1.2
      );
      this.lowerHalf = this.createBodyHalf(
        ['head', 'neck', 'spine', 'hip', 'shoulderL', 'shoulderR', 'elbowR', 'handR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'footL', 'footR'],
        currentBones, impactAngle + Math.PI, force * 0.4
      );
    } else if (this.bisectPoint === 'armR') {
      // 右臂断开
      this.upperHalf = this.createBodyHalf(
        ['elbowR', 'handR'],
        currentBones, impactAngle + 0.5, force * 1.2
      );
      this.lowerHalf = this.createBodyHalf(
        ['head', 'neck', 'spine', 'hip', 'shoulderL', 'shoulderR', 'elbowL', 'handL', 'hipL', 'hipR', 'kneeL', 'kneeR', 'footL', 'footR'],
        currentBones, impactAngle + Math.PI, force * 0.4
      );
    } else if (this.bisectPoint === 'legL') {
      // 左腿断开
      this.upperHalf = this.createBodyHalf(
        ['kneeL', 'footL'],
        currentBones, impactAngle + Math.PI * 0.7, force * 1.0
      );
      this.lowerHalf = this.createBodyHalf(
        ['head', 'neck', 'spine', 'hip', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR', 'hipL', 'hipR', 'kneeR', 'footR'],
        currentBones, impactAngle + Math.PI, force * 0.4
      );
    } else if (this.bisectPoint === 'legR') {
      // 右腿断开
      this.upperHalf = this.createBodyHalf(
        ['kneeR', 'footR'],
        currentBones, impactAngle + Math.PI * 1.3, force * 1.0
      );
      this.lowerHalf = this.createBodyHalf(
        ['head', 'neck', 'spine', 'hip', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR', 'hipL', 'hipR', 'kneeL', 'footL'],
        currentBones, impactAngle + Math.PI, force * 0.4
      );
    } else if (this.bisectPoint === 'shoulder') {
      // 双臂同时断开
      this.upperHalf = this.createBodyHalf(
        ['head', 'neck', 'spine', 'hip', 'hipL', 'hipR', 'kneeL', 'kneeR', 'footL', 'footR'],
        currentBones, impactAngle + Math.PI, force * 0.5
      );
      this.lowerHalf = this.createBodyHalf(
        ['shoulderL', 'elbowL', 'handL'],
        currentBones, impactAngle - 0.8, force * 1.0
      );
      // 第三块：右臂
      this.detachedLimbs.push(this.createBodyHalf(
        ['shoulderR', 'elbowR', 'handR'],
        currentBones, impactAngle + 0.8, force * 1.0
      ));
    } else if (this.bisectPoint === 'legs') {
      // 双腿同时断开
      this.upperHalf = this.createBodyHalf(
        ['head', 'neck', 'spine', 'hip', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR'],
        currentBones, impactAngle, force * 0.6
      );
      this.lowerHalf = this.createBodyHalf(
        ['hipL', 'kneeL', 'footL'],
        currentBones, impactAngle + Math.PI * 0.6, force * 0.9
      );
      // 第三块：右腿
      this.detachedLimbs.push(this.createBodyHalf(
        ['hipR', 'kneeR', 'footR'],
        currentBones, impactAngle + Math.PI * 1.4, force * 0.9
      ));
    }
  }

  /**
   * 创建身体半截
   */
  createBodyHalf(boneNames, sourceBones, angle, force) {
    const half = {
      bones: {},
      velocities: {},
      x: 0,
      y: 0,
      vx: Math.cos(angle) * force * 2,
      vy: Math.sin(angle) * force - 3,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      tentacleOffsets: {}, // 每个骨骼的触手偏移
      groundY: this.groundY + Math.random() * 5,
      onGround: false
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
    cx /= count;
    cy /= count;

    // 复制骨骼
    for (const name of boneNames) {
      if (sourceBones[name]) {
        half.bones[name] = {
          x: sourceBones[name].x - cx,
          y: sourceBones[name].y - cy,
          radius: sourceBones[name].radius,
          baseX: sourceBones[name].x - cx,
          baseY: sourceBones[name].y - cy
        };
        half.velocities[name] = {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2
        };
        // 触手偏移初始化
        half.tentacleOffsets[name] = {
          phase: Math.random() * Math.PI * 2,
          amplitude: 3 + Math.random() * 5,
          frequency: 0.5 + Math.random() * 1.5
        };
      }
    }

    half.x = cx;
    half.y = cy;

    return half;
  }

  /**
   * 激活布娃娃物理并断成两截
   */
  activateRagdoll(initialBones, impactAngle = 0, force = 10) {
    this.ragdollActive = true;
    this.isDying = true;
    this.deathTimer = 0;
    this.deathPhase = 'falling';
    this.ragdollBones = JSON.parse(JSON.stringify(initialBones));
    this.ragdollVelocities = {};
    this.tentaclePhase = 0;
    this.writheIntensity = 1.0;

    // 立即断成两截
    this.bisectBody(impactAngle, force);
  }

  /**
   * 更新触手蠕动效果
   */
  updateTentacleWrithe(half, deltaTime) {
    if (!half || !half.bones) return;

    const t = this.tentaclePhase;
    const intensity = this.writheIntensity;

    for (const name in half.bones) {
      const bone = half.bones[name];
      const offset = half.tentacleOffsets[name];
      if (!offset) continue;

      // 克苏鲁触手式蠕动 - 多重正弦波叠加
      const wave1 = Math.sin(t * offset.frequency + offset.phase) * offset.amplitude;
      const wave2 = Math.sin(t * offset.frequency * 1.7 + offset.phase * 0.5) * offset.amplitude * 0.5;
      const wave3 = Math.cos(t * offset.frequency * 0.8 + offset.phase * 1.3) * offset.amplitude * 0.3;

      // 不规则扭动
      const twitch = Math.sin(t * 3 + offset.phase) * Math.random() * 2 * intensity;

      bone.x = bone.baseX + (wave1 + wave2 + twitch) * intensity;
      bone.y = bone.baseY + (wave3 + Math.abs(wave1) * 0.3) * intensity;
    }
  }

  /**
   * 更新身体半截物理
   */
  updateBodyHalf(half, deltaTime, targetX, targetY, mergeStrength) {
    if (!half) return;

    const dt = deltaTime * 0.05;

    // 移动
    if (!half.onGround) {
      half.x += half.vx * dt;
      half.y += half.vy * dt;
      half.vy += this.gravity * dt;
      half.rotation += half.rotationSpeed * dt;

      // 地面碰撞
      if (half.y > half.groundY) {
        half.y = half.groundY;
        half.vy *= -0.2;
        half.vx *= this.friction;
        half.rotationSpeed *= 0.7;

        if (Math.abs(half.vy) < 0.5) {
          half.onGround = true;
        }
      }
    }

    // 向目标点合并（搅成一团阶段）
    if (mergeStrength > 0) {
      half.x += (targetX - half.x) * mergeStrength * dt;
      half.y += (targetY - half.y) * mergeStrength * dt;
      half.rotation += 0.1 * dt; // 旋转搅动
    }

    // 更新触手蠕动
    this.updateTentacleWrithe(half, deltaTime);

    half.vx *= 0.99;
    half.vy *= 0.99;
  }

  /**
   * 更新布娃娃物理
   */
  updateRagdoll(deltaTime) {
    if (!this.ragdollActive) return;

    const dt = deltaTime * 0.05;
    this.deathTimer += deltaTime;
    this.tentaclePhase += this.tentacleSpeed * deltaTime;

    // 更新死亡阶段
    if (this.deathPhase === 'falling' && this.deathTimer > 600) {
      this.deathPhase = 'writhing';
    } else if (this.deathPhase === 'writhing' && this.deathTimer > 2500) {
      this.deathPhase = 'merging';
    } else if (this.deathPhase === 'merging' && this.deathTimer > 4000) {
      this.deathPhase = 'fading';
    } else if (this.deathPhase === 'fading' && this.deathTimer > 4800) {
      this.deathPhase = 'curling'; // 新增蜷缩阶段
      this.curlProgress = 0;
    } else if (this.deathPhase === 'curling' && this.deathTimer > 5800) {
      this.convertToExp = true;
      // 蜷缩完成，生成经验球（位置由外部enemy.x/y决定）
      if (this.onExpReady && !this._expGiven) {
        this._expGiven = true;
        this.onExpReady(50);
      }
    }

    // 蠕动强度调整
    if (this.deathPhase === 'writhing') {
      this.writheIntensity = 1.0;
      this.tentacleSpeed = 0.02;
    } else if (this.deathPhase === 'merging') {
      // 搅成一团时蠕动更剧烈
      this.writheIntensity = 1.5 - (this.deathTimer - 2500) / 3000;
      this.tentacleSpeed = 0.03;
    } else if (this.deathPhase === 'fading') {
      // 淡出阶段继续抽搐，逐渐减弱
      this.writheIntensity = Math.max(0.3, 1.0 - (this.deathTimer - 4000) / 1500);
      this.tentacleSpeed = 0.025;
    } else if (this.deathPhase === 'curling') {
      // 蜷缩阶段：持续抽搐卷成一团
      this.curlProgress = Math.min(1, (this.deathTimer - 4800) / 1000);
      this.writheIntensity = 0.5 * (1 - this.curlProgress * 0.8); // 逐渐减弱但不停止
      this.tentacleSpeed = 0.02;
      // 蜷缩时缩小
      this.curlScale = 1 - this.curlProgress * 0.9; // 缩小到10%
    }

    // 计算合并目标点
    let mergeX = 0, mergeY = this.groundY;
    if (this.upperHalf && this.lowerHalf) {
      mergeX = (this.upperHalf.x + this.lowerHalf.x) / 2;
      mergeY = (this.upperHalf.y + this.lowerHalf.y) / 2;
    }

    // 合并强度 - 全程持续卷成一团
    let mergeStrength = 0;
    if (this.deathPhase === 'merging') {
      mergeStrength = 0.03;
    } else if (this.deathPhase === 'fading') {
      // 淡出阶段继续合并
      mergeStrength = 0.05;
    } else if (this.deathPhase === 'curling') {
      // 蜷缩阶段快速收拢
      mergeStrength = 0.1 + this.curlProgress * 0.15;
    }

    // 更新两半身体
    this.updateBodyHalf(this.upperHalf, deltaTime, mergeX, mergeY, mergeStrength);
    this.updateBodyHalf(this.lowerHalf, deltaTime, mergeX, mergeY, mergeStrength);

    // 更新额外断开的肢体
    if (this.detachedLimbs) {
      for (const limb of this.detachedLimbs) {
        this.updateBodyHalf(limb, deltaTime, mergeX, mergeY, mergeStrength);
      }
    }

    // 持续从断裂处喷射寄生虫（falling和writhing阶段）
    if (this.onDustSpray && (this.deathPhase === 'falling' || this.deathPhase === 'writhing')) {
      this.dustSprayTimer += deltaTime;
      if (this.dustSprayTimer >= this.dustSprayInterval) {
        this.dustSprayTimer = 0;

        // 计算断裂点的世界坐标偏移
        // half.x/y 是火柴人坐标，需要转换为世界坐标偏移
        // 转换系数：火柴人坐标 * 0.025 ≈ 世界坐标偏移
        const coordScale = 0.025;

        if (this.upperHalf && this.lowerHalf) {
          // 从上半身断裂处喷射
          const upperWorldX = this.upperHalf.x * coordScale;
          const upperWorldY = this.upperHalf.y * coordScale;
          const sprayAngle1 = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
          this.onDustSpray(upperWorldX, upperWorldY, 3, sprayAngle1, 1 + Math.random());

          // 从下半身断裂处喷射
          const lowerWorldX = this.lowerHalf.x * coordScale;
          const lowerWorldY = this.lowerHalf.y * coordScale;
          const sprayAngle2 = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
          this.onDustSpray(lowerWorldX, lowerWorldY, 3, sprayAngle2, 1 + Math.random());
        }

        // 额外断开的肢体也喷射
        if (this.detachedLimbs) {
          for (const limb of this.detachedLimbs) {
            const limbWorldX = limb.x * coordScale;
            const limbWorldY = limb.y * coordScale;
            const limbAngle = Math.random() * Math.PI * 2;
            this.onDustSpray(limbWorldX, limbWorldY, 2, limbAngle, 0.5 + Math.random());
          }
        }
      }
    }

    // 淡出
    if (this.deathPhase === 'fading') {
      this.fadeAlpha = Math.max(0.3, 1 - (this.deathTimer - 4000) / 1000);
    } else if (this.deathPhase === 'curling') {
      // 蜷缩时继续淡出直到完全消失
      this.fadeAlpha = Math.max(0, 0.3 * (1 - this.curlProgress));
    }
  }

  /**
   * 更新动画
   */
  update(deltaTime, state = {}) {
    this.animTime += deltaTime;

    if (this.isDying) {
      this.updateRagdoll(deltaTime);
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
   * @param blackenedParts - 可选，染黑部位信息 { head: 0-100, armL: 0-100, ... }
   */
  render(ctx, screenX, screenY, scale = 1, facingRight = true, blackenedParts = null) {
    // 如果已断成两截，渲染两半
    if (this.isBisected) {
      this.renderBisectedBody(ctx, screenX, screenY, scale, facingRight);
      return;
    }

    // 正常渲染
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.scale(scale * (facingRight ? 1 : -1), scale);
    ctx.globalAlpha = this.fadeAlpha;

    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const bones = this.ragdollActive
      ? this.ragdollBones
      : this.getAnimatedBones(this.currentAnim, this.animTime, facingRight);

    // 获取部位颜色（根据染黑程度）
    const getPartColor = (part) => {
      if (!blackenedParts || blackenedParts[part] === undefined) return this.color;
      const darkness = blackenedParts[part] / 100;
      return this.lerpColor(this.color, '#1a0a1a', darkness);
    };

    // 绘制身体（上身）
    ctx.strokeStyle = getPartColor('bodyUpper');
    ctx.fillStyle = getPartColor('bodyUpper');
    this.drawLimb(ctx, bones.neck, bones.spine);

    // 绘制身体（下身）
    ctx.strokeStyle = getPartColor('bodyLower');
    ctx.fillStyle = getPartColor('bodyLower');
    this.drawLimb(ctx, bones.spine, bones.hip);

    // 左手臂
    ctx.strokeStyle = getPartColor('armL');
    ctx.fillStyle = getPartColor('armL');
    this.drawLimb(ctx, bones.shoulderL, bones.elbowL);
    this.drawLimb(ctx, bones.elbowL, bones.handL);

    // 右手臂
    ctx.strokeStyle = getPartColor('armR');
    ctx.fillStyle = getPartColor('armR');
    this.drawLimb(ctx, bones.shoulderR, bones.elbowR);
    this.drawLimb(ctx, bones.elbowR, bones.handR);

    // 左腿
    ctx.strokeStyle = getPartColor('legL');
    ctx.fillStyle = getPartColor('legL');
    this.drawLimb(ctx, bones.hipL, bones.kneeL);
    this.drawLimb(ctx, bones.kneeL, bones.footL);

    // 右腿
    ctx.strokeStyle = getPartColor('legR');
    ctx.fillStyle = getPartColor('legR');
    this.drawLimb(ctx, bones.hipR, bones.kneeR);
    this.drawLimb(ctx, bones.kneeR, bones.footR);

    // 头部
    ctx.fillStyle = getPartColor('head');
    ctx.beginPath();
    ctx.arc(bones.head.x, bones.head.y, bones.head.radius || 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 颜色插值
   */
  lerpColor(color1, color2, t) {
    // 解析颜色
    const c1 = this.parseColor(color1);
    const c2 = this.parseColor(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `rgb(${r},${g},${b})`;
  }

  /**
   * 解析颜色为RGB
   */
  parseColor(color) {
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        return {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16)
        };
      }
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
      };
    }
    // 默认返回橙色
    return { r: 255, g: 136, b: 0 };
  }

  /**
   * 渲染断成两截（或多截）的身体
   */
  renderBisectedBody(ctx, screenX, screenY, scale, facingRight) {
    ctx.globalAlpha = this.fadeAlpha;

    // 蜷缩阶段应用缩放
    const curlScale = this.curlScale || 1;
    const effectiveScale = scale * curlScale;

    // 渲染上半身
    if (this.upperHalf) {
      this.renderBodyHalf(ctx, screenX, screenY, effectiveScale, facingRight, this.upperHalf, true);
    }

    // 渲染下半身
    if (this.lowerHalf) {
      this.renderBodyHalf(ctx, screenX, screenY, effectiveScale, facingRight, this.lowerHalf, false);
    }

    // 渲染额外断开的肢体
    if (this.detachedLimbs) {
      for (const limb of this.detachedLimbs) {
        this.renderBodyHalf(ctx, screenX, screenY, effectiveScale, facingRight, limb, false);
      }
    }

    ctx.globalAlpha = 1;
  }

  /**
   * 渲染身体半截（支持任意骨骼组合）
   */
  renderBodyHalf(ctx, screenX, screenY, scale, facingRight, half, isUpper) {
    ctx.save();
    ctx.translate(screenX + half.x * scale, screenY + half.y * scale);
    ctx.rotate(half.rotation);
    ctx.scale(scale * (facingRight ? 1 : -1), scale);

    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const bones = half.bones;

    // 智能绘制所有存在的骨骼连接
    // 躯干连接
    if (bones.head && bones.neck) this.drawLimb(ctx, bones.head, bones.neck);
    if (bones.neck && bones.spine) this.drawLimb(ctx, bones.neck, bones.spine);
    if (bones.spine && bones.hip) this.drawLimb(ctx, bones.spine, bones.hip);

    // 肩膀连接到躯干
    if (bones.neck && bones.shoulderL) this.drawLimb(ctx, bones.neck, bones.shoulderL);
    if (bones.neck && bones.shoulderR) this.drawLimb(ctx, bones.neck, bones.shoulderR);

    // 左臂
    if (bones.shoulderL && bones.elbowL) this.drawLimb(ctx, bones.shoulderL, bones.elbowL);
    if (bones.elbowL && bones.handL) this.drawLimb(ctx, bones.elbowL, bones.handL);

    // 右臂
    if (bones.shoulderR && bones.elbowR) this.drawLimb(ctx, bones.shoulderR, bones.elbowR);
    if (bones.elbowR && bones.handR) this.drawLimb(ctx, bones.elbowR, bones.handR);

    // 髋部连接
    if (bones.hip && bones.hipL) this.drawLimb(ctx, bones.hip, bones.hipL);
    if (bones.hip && bones.hipR) this.drawLimb(ctx, bones.hip, bones.hipR);

    // 左腿
    if (bones.hipL && bones.kneeL) this.drawLimb(ctx, bones.hipL, bones.kneeL);
    if (bones.kneeL && bones.footL) this.drawLimb(ctx, bones.kneeL, bones.footL);

    // 右腿
    if (bones.hipR && bones.kneeR) this.drawLimb(ctx, bones.hipR, bones.kneeR);
    if (bones.kneeR && bones.footR) this.drawLimb(ctx, bones.kneeR, bones.footR);

    // 头部（圆形）
    if (bones.head) {
      ctx.beginPath();
      ctx.arc(bones.head.x, bones.head.y, bones.head.radius || 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 断裂处血迹/肉末效果
    ctx.fillStyle = '#8B0000';
    const bloodSpots = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < bloodSpots; i++) {
      ctx.beginPath();
      ctx.arc(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        2 + Math.random() * 2,
        0, Math.PI * 2
      );
      ctx.fill();
    }

    ctx.restore();
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
    this.ragdollBones = null;
    this.ragdollVelocities = null;
    this.animTime = 0;
    this.currentAnim = 'idle';
    this.isBisected = false;
    this.bisectPoint = null;
    this.upperHalf = null;
    this.lowerHalf = null;
    this.detachedLimbs = [];
    this.isDying = false;
    this.deathTimer = 0;
    this.deathPhase = 'falling';
    this.tentaclePhase = 0;
    this.writheIntensity = 1.0;
    this.fadeAlpha = 1.0;
    this.convertToExp = false;
    this._expGiven = false;
    this.dustSprayTimer = 0;
    this.breakPointOffset = null;
  }

  /**
   * 设置颜色
   */
  setColor(color) {
    this.color = color;
  }
}

export default StickFigure;
