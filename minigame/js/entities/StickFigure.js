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
    this.ragdollBones = null;
    this.ragdollVelocities = null;
    this.gravity = 0.8;
    this.friction = 0.92;
    this.groundY = 28;

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
    const breathe = Math.sin(t * 1.5);

    // 身体轻微起伏
    bones.head.y += breathe * 0.8;
    bones.neck.y += breathe * 0.5;
    bones.spine.y += breathe * 0.3;

    // 手臂自然下垂，轻微摆动
    bones.handL.y += Math.sin(t * 1.5 + 0.5) * 0.8;
    bones.handR.y += Math.sin(t * 1.5 - 0.5) * 0.8;
    bones.elbowL.y += Math.sin(t * 1.5 + 0.3) * 0.4;
    bones.elbowR.y += Math.sin(t * 1.5 - 0.3) * 0.4;
  }

  // ============================================
  // 走路动画 - 自然放松的日常步行
  // ============================================

  /**
   * 走路动画主函数
   * 特点：
   * - 步幅小、抬脚低
   * - 60%支撑期 + 40%摆动期（有双脚支撑）
   * - 身体几乎直立
   * - 手臂自然小幅摆动
   */
  applyWalkAnimation(bones, t, mirror) {
    // 走路周期：约0.8秒一步
    const cycleSpeed = 2.5;
    const phase = (t * cycleSpeed) % 1;

    // 左右腿相位差0.5
    const leftPhase = phase;
    const rightPhase = (phase + 0.5) % 1;

    // === 腿部动画 ===
    this.applyWalkLeg(bones, leftPhase, mirror, 'L');
    this.applyWalkLeg(bones, rightPhase, mirror, 'R');

    // === 身体起伏（极小）===
    // 双脚支撑时最低，单脚支撑最高点在中间
    const bodyBob = Math.cos(phase * Math.PI * 4) * 0.4;
    bones.head.y += bodyBob;
    bones.neck.y += bodyBob * 0.8;
    bones.spine.y += bodyBob * 0.5;

    // === 手臂摆动（与对侧腿反向）===
    this.applyWalkArm(bones, rightPhase, mirror, 'L');
    this.applyWalkArm(bones, leftPhase, mirror, 'R');
  }

  /**
   * 走路腿部动画
   * @param side - 'L' 或 'R'
   */
  applyWalkLeg(bones, phase, mirror, side) {
    // 走路参数 - 极小幅度
    const strideLength = 4;   // 步幅（前后总距离）
    const liftHeight = 2;     // 抬脚高度

    const hip = bones[`hip${side}`];
    const knee = bones[`knee${side}`];
    const foot = bones[`foot${side}`];

    // 支撑期 vs 摆动期
    const stanceRatio = 0.6;  // 60%支撑期

    if (phase < stanceRatio) {
      // === 支撑期：脚在地面从前向后移动 ===
      const t = phase / stanceRatio;

      // 脚从前方（+strideLength/2）移到后方（-strideLength/2）
      const footProgress = 0.5 - t;  // 0.5 → -0.5
      foot.x += footProgress * strideLength * mirror;
      foot.y = 0;  // 锁定地面

      // 膝盖跟随脚，稍微在前
      knee.x += (footProgress * 0.7) * strideLength * mirror;
      // 支撑期膝盖微屈：中间最直（passing），两端微屈
      const kneeBend = Math.abs(t - 0.5) * 2;  // 0→1→0 在中间
      knee.y += -kneeBend * 1.2;

    } else {
      // === 摆动期：脚抬起向前摆动 ===
      const t = (phase - stanceRatio) / (1 - stanceRatio);

      // 脚从后方摆到前方
      const footProgress = -0.5 + t;  // -0.5 → 0.5
      foot.x += footProgress * strideLength * mirror;

      // 抬脚高度：正弦曲线，中间最高
      foot.y = -Math.sin(t * Math.PI) * liftHeight;

      // 膝盖在摆动期弯曲抬起
      knee.x += (footProgress * 0.6) * strideLength * mirror;
      knee.y = -Math.sin(t * Math.PI) * (liftHeight + 1);
    }
  }

  /**
   * 走路手臂摆动
   */
  applyWalkArm(bones, legPhase, mirror, side) {
    const elbow = bones[`elbow${side}`];
    const hand = bones[`hand${side}`];

    // 手臂与对侧腿反向摆动，幅度很小
    const swing = Math.sin(legPhase * Math.PI * 2);
    const armAmplitude = 2;

    // 前后摆动
    elbow.x += swing * armAmplitude * 0.6 * mirror;
    hand.x += swing * armAmplitude * mirror;

    // 轻微上下（向前摆时稍高）
    hand.y += swing * 0.5;
  }

  // ============================================
  // 跑步动画 - 专业跑步周期
  // ============================================

  /**
   * 跑步动画主函数
   * 特点：
   * - 包含腾空期（flight phase）
   * - 前倾姿势
   * - 高抬膝
   * - 手臂大幅摆动
   */
  applyRunAnimation(bones, t, mirror) {
    // 跑步周期：约0.5秒一步（更快）
    const cycleSpeed = 4;
    const phase = (t * cycleSpeed) % 1;

    // 左右腿相位差0.5
    const leftPhase = phase;
    const rightPhase = (phase + 0.5) % 1;

    // === 身体前倾 ===
    const lean = 3 * mirror;
    bones.head.x += lean;
    bones.neck.x += lean * 0.8;
    bones.spine.x += lean * 0.5;
    bones.hip.x += lean * 0.2;

    // === 腿部动画 ===
    this.applyRunLeg(bones, leftPhase, mirror, 'L');
    this.applyRunLeg(bones, rightPhase, mirror, 'R');

    // === 身体起伏（弹性）===
    const bodyBob = this.calculateRunBob(phase);
    bones.head.y += bodyBob;
    bones.neck.y += bodyBob * 0.9;
    bones.spine.y += bodyBob * 0.7;
    bones.hip.y += bodyBob * 0.5;
    bones.hipL.y += bodyBob * 0.4;
    bones.hipR.y += bodyBob * 0.4;

    // === 身体左右摇摆（重心转移）===
    const sway = Math.sin(phase * Math.PI * 2) * 1;
    bones.spine.x += sway * mirror;
    bones.head.x += sway * 1.2 * mirror;

    // === 手臂摆动（与对侧腿反向）===
    this.applyRunArm(bones, rightPhase, mirror, 'L');
    this.applyRunArm(bones, leftPhase, mirror, 'R');
  }

  /**
   * 跑步腿部动画 - 8相位专业周期
   */
  applyRunLeg(bones, phase, mirror, side) {
    const hip = bones[`hip${side}`];
    const knee = bones[`knee${side}`];
    const foot = bones[`foot${side}`];

    // 跑步参数
    const strideLength = 10;
    const maxKneeLift = 12;

    // 8个关键相位
    if (phase < 0.125) {
      // 1. Contact - 脚跟触地
      const t = phase / 0.125;
      foot.x = strideLength * 0.4 * mirror;
      foot.y = 0;
      knee.x = strideLength * 0.3 * mirror;
      knee.y = -3 - t * 2;
      hip.y = t * 2;

    } else if (phase < 0.25) {
      // 2. Loading - 承重下沉
      const t = (phase - 0.125) / 0.125;
      foot.x = strideLength * (0.4 - t * 0.15) * mirror;
      foot.y = 0;
      knee.x = strideLength * (0.3 - t * 0.1) * mirror;
      knee.y = -5 - t * 3;
      hip.y = 2 + t * 2;

    } else if (phase < 0.375) {
      // 3. Mid-stance - 重心越过，开始回弹
      const t = (phase - 0.25) / 0.125;
      foot.x = strideLength * (0.25 - t * 0.3) * mirror;
      foot.y = 0;
      knee.x = strideLength * (0.2 - t * 0.25) * mirror;
      knee.y = -8 + t * 3;
      hip.y = 4 - t * 2;

    } else if (phase < 0.5) {
      // 4. Push-off - 蹬离地面
      const t = (phase - 0.375) / 0.125;
      foot.x = strideLength * (-0.05 - t * 0.35) * mirror;
      foot.y = -t * 5;
      knee.x = strideLength * (-0.05 - t * 0.25) * mirror;
      knee.y = -5 - t * 4;
      hip.y = 2 - t * 3;

    } else if (phase < 0.625) {
      // 5. Flight + Fold - 腾空收腿
      const t = (phase - 0.5) / 0.125;
      foot.x = strideLength * (-0.4 + t * 0.15) * mirror;
      foot.y = -5 - t * 7;
      knee.x = strideLength * (-0.3 + t * 0.1) * mirror;
      knee.y = -9 - t * 3;
      hip.y = -1 - t * 1;

    } else if (phase < 0.75) {
      // 6. Swing - 高抬膝前摆
      const t = (phase - 0.625) / 0.125;
      const ease = this.easeInOutQuad(t);
      knee.x = strideLength * (-0.2 + ease * 0.4) * mirror;
      knee.y = -maxKneeLift - Math.sin(t * Math.PI) * 2;
      // 小腿折叠
      foot.x = knee.x - 4 * mirror;
      foot.y = knee.y + 5 + Math.sin(t * Math.PI) * 3;
      hip.x = (-0.3 + ease * 0.5) * mirror;
      hip.y = -2 + t * 0.5;

    } else if (phase < 0.875) {
      // 7. Extend - 前伸准备
      const t = (phase - 0.75) / 0.125;
      const ease = this.easeOutQuad(t);
      knee.x = strideLength * (0.2 + ease * 0.15) * mirror;
      knee.y = -maxKneeLift + ease * 7;
      foot.x = strideLength * (0.15 + ease * 0.25) * mirror;
      foot.y = -8 + ease * 5;
      hip.x = (0.2 + ease * 0.3) * mirror;
      hip.y = -1.5 + ease * 0.5;

    } else {
      // 8. Pre-contact - 落地准备
      const t = (phase - 0.875) / 0.125;
      foot.x = strideLength * 0.4 * mirror;
      foot.y = -3 + t * 3;
      knee.x = strideLength * 0.35 * mirror;
      knee.y = -5 + t * 2;
      hip.x = 0.5 * mirror;
      hip.y = -1 + t * 1;
    }
  }

  /**
   * 跑步身体起伏
   */
  calculateRunBob(phase) {
    // 每步两次起伏（左右脚各一次）
    const doublePhase = (phase * 2) % 1;

    if (doublePhase < 0.25) {
      // 触地下沉
      return this.easeOutQuad(doublePhase / 0.25) * 3;
    } else if (doublePhase < 0.5) {
      // 回弹上升
      const t = (doublePhase - 0.25) / 0.25;
      return 3 - this.easeInOutQuad(t) * 5;
    } else if (doublePhase < 0.75) {
      // 腾空最高
      const t = (doublePhase - 0.5) / 0.25;
      return -2 - Math.sin(t * Math.PI) * 1;
    } else {
      // 下落准备触地
      const t = (doublePhase - 0.75) / 0.25;
      return -3 + this.easeInOutQuad(t) * 6;
    }
  }

  /**
   * 跑步手臂摆动
   */
  applyRunArm(bones, legPhase, mirror, side) {
    const shoulder = bones[`shoulder${side}`];
    const elbow = bones[`elbow${side}`];
    const hand = bones[`hand${side}`];

    // 主摆动
    const swing = Math.sin(legPhase * Math.PI * 2);

    // 肩膀
    shoulder.x += swing * 1.5 * mirror;
    shoulder.y += Math.abs(swing) * -0.5;

    // 肘部（有滞后）
    const elbowPhase = (legPhase - 0.05 + 1) % 1;
    const elbowSwing = Math.sin(elbowPhase * Math.PI * 2);
    elbow.x += elbowSwing * 6 * mirror;
    elbow.y += -4 + elbowSwing * -2;

    // 手部（更大滞后，follow-through效果）
    const handPhase = (legPhase - 0.1 + 1) % 1;
    const handSwing = Math.sin(handPhase * Math.PI * 2);
    hand.x += handSwing * 8 * mirror;
    hand.y += -2 + handSwing * 3;
  }

  // ============================================
  // 其他动画
  // ============================================

  /**
   * 射击动画
   */
  applyShootAnimation(bones, t, mirror) {
    const shootPhase = (t * 5) % (Math.PI * 2);
    const recoil = Math.max(0, Math.sin(shootPhase * 3)) * 2;

    // 持枪姿势
    bones.shoulderR.x = 5 * mirror;
    bones.elbowR.x = 14 * mirror;
    bones.elbowR.y = -7;
    bones.handR.x = (22 - recoil) * mirror;
    bones.handR.y = -5;

    // 辅助手
    bones.elbowL.x = 8 * mirror;
    bones.elbowL.y = -5;
    bones.handL.x = 16 * mirror;
    bones.handL.y = -5;

    // 身体微后仰
    bones.spine.x -= 0.5 * mirror;
  }

  /**
   * 翻滚动画
   */
  applyRollAnimation(bones, t, mirror) {
    const rollPhase = (t * 10) % (Math.PI * 2);
    const curl = Math.sin(rollPhase);

    // 蜷缩成球
    bones.head.y = -10 + curl * 6;
    bones.head.x = curl * 4 * mirror;

    // 腿收起
    bones.kneeL.y = 10;
    bones.kneeL.x = -6 + curl * 5;
    bones.footL.y = 14;
    bones.footL.x = -8 + curl * 8;

    bones.kneeR.y = 10;
    bones.kneeR.x = 6 + curl * 5;
    bones.footR.y = 14;
    bones.footR.x = 8 + curl * 8;

    // 手抱住身体
    bones.handL.y = 4;
    bones.handL.x = -4;
    bones.handR.y = 4;
    bones.handR.x = 4;
  }

  /**
   * 受击动画
   */
  applyHitAnimation(bones, t, mirror) {
    const hitRecoil = Math.sin(t * 12) * Math.exp(-t * 0.3);
    bones.head.x -= hitRecoil * 8 * mirror;
    bones.spine.x -= hitRecoil * 4 * mirror;
    bones.handL.x -= hitRecoil * 6;
    bones.handR.x -= hitRecoil * 6;
  }

  /**
   * 攻击动画
   */
  applyAttackAnimation(bones, t, mirror) {
    const attackPhase = (t * 8) % 1;

    if (attackPhase < 0.3) {
      // 蓄力后摆
      const prep = attackPhase / 0.3;
      bones.shoulderR.x = -3 * mirror;
      bones.elbowR.x = (-8 - prep * 4) * mirror;
      bones.elbowR.y = -5 + prep * 3;
      bones.handR.x = (-12 - prep * 6) * mirror;
      bones.handR.y = -3 + prep * 5;
      bones.spine.x = -prep * 2 * mirror;
    } else if (attackPhase < 0.5) {
      // 挥击
      const swing = (attackPhase - 0.3) / 0.2;
      const ease = this.easeOutQuad(swing);
      bones.shoulderR.x = (-3 + ease * 8) * mirror;
      bones.elbowR.x = (-12 + ease * 26) * mirror;
      bones.elbowR.y = -2 - ease * 4;
      bones.handR.x = (-18 + ease * 40) * mirror;
      bones.handR.y = 2 - ease * 6;
      bones.spine.x = (-2 + ease * 4) * mirror;
    } else {
      // 收招
      const recover = (attackPhase - 0.5) / 0.5;
      bones.shoulderR.x = (5 - recover * 5) * mirror;
      bones.elbowR.x = (14 - recover * 2) * mirror;
      bones.elbowR.y = -6 + recover * 0;
      bones.handR.x = (22 - recover * 4) * mirror;
      bones.handR.y = -4 + recover * 2;
      bones.spine.x = (2 - recover * 2) * mirror;
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
