/**
 * 火柴人渲染系统 - 专业动画物理版本
 * 基于 Richard Williams《The Animator's Survival Kit》原理
 * 实现：脚锁地、重心压缩回弹、非线性Timing、弧线Spacing、惯性延迟
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

    // ============================================
    // 新增：专业动画物理参数
    // ============================================

    // 走路参数（基于真实人体运动学）
    this.walkParams = {
      cycleDuration: 800,        // 完整步行周期（毫秒）
      strideLength: 5,           // 步幅（火柴人坐标单位）
      liftHeight: 2.5,           // 抬脚高度
      compressionDepth: 1.2,     // 重心下沉深度（身高的2-4%）
      armSwingAmplitude: 2.5,    // 手臂摆动幅度
      contactDuration: 0.15,     // 触地相位占比（脚锁住时间）
      overlapDelay: 0.08         // 惯性延迟（末端滞后）
    };

    // 跑步参数
    this.runParams = {
      cycleDuration: 500,        // 跑步周期更短
      strideLength: 8,           // 步幅更大
      liftHeight: 6,             // 抬腿更高
      compressionDepth: 2.5,     // 压缩更明显（身高的5-10%）
      armSwingAmplitude: 5,      // 手臂摆动更大
      bodyLean: 2.5,             // 身体前倾角度
      airTime: 0.2,              // 腾空时间占比
      overlapDelay: 0.1          // 惯性延迟更大
    };

    // 惯性延迟状态（用于实现末端滞后）
    this.overlap = {
      handL: { x: 0, y: 0, targetX: 0, targetY: 0 },
      handR: { x: 0, y: 0, targetX: 0, targetY: 0 },
      footL: { x: 0, y: 0, targetX: 0, targetY: 0 },
      footR: { x: 0, y: 0, targetX: 0, targetY: 0 }
    };

    // 上一帧时间（用于惯性计算）
    this.lastAnimTime = 0;

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
  // 专业走路动画系统
  // 基于四大关键姿势：Contact → Down → Passing → Up
  // 实现脚锁地、重心压缩回弹、非线性Timing
  // ============================================

  /**
   * 走路关键姿势相位定义
   * 一个完整周期包含两步（左右各一步）
   */
  getWalkKeyPhases() {
    return {
      // 相位 0.00: 右脚触地 (Contact)
      // 相位 0.12: 右脚承重下沉 (Down) - 重心最低点
      // 相位 0.25: 右腿过腿 (Passing) - 左脚离地
      // 相位 0.38: 右腿回升 (Up) - 重心最高点
      // 相位 0.50: 左脚触地 (Contact) - 右脚开始离地
      // ... 重复
      contact: 0.0,
      down: 0.12,
      passing: 0.25,
      up: 0.38,
      halfCycle: 0.5
    };
  }

  /**
   * 走路动画主函数 - 专业版
   * 实现脚锁地、重心曲线、弧线运动
   */
  applyWalkAnimation(bones, t, mirror) {
    const params = this.walkParams;

    // 计算当前相位 (0-1)
    const cycleTime = params.cycleDuration / 1000;
    const phase = (t / cycleTime) % 1;

    // 左右腿相位差 0.5
    const rightPhase = phase;
    const leftPhase = (phase + 0.5) % 1;

    // === 重心压缩曲线（最关键的自然感来源）===
    const bodyOffset = this.calculateWalkBodyOffset(phase, params);

    // 应用重心偏移到所有上半身骨骼
    bones.head.y += bodyOffset.y * 0.9;
    bones.neck.y += bodyOffset.y * 0.7;
    bones.spine.y += bodyOffset.y * 0.5;
    bones.hip.y += bodyOffset.y * 0.3;

    // 轻微左右摇摆（重心转移）
    const swayPhase = phase * 2 * Math.PI;
    const sway = Math.sin(swayPhase) * 0.3;
    bones.hip.x += sway;
    bones.spine.x += sway * 0.6;

    // === 腿部动画（脚锁地系统）===
    this.applyWalkLegPro(bones, rightPhase, mirror, 'R', params);
    this.applyWalkLegPro(bones, leftPhase, mirror, 'L', params);

    // === 手臂自然摆动（带惯性延迟）===
    // 手臂与同侧腿反向摆动
    this.applyWalkArmPro(bones, leftPhase, mirror, 'R', params);  // 右臂与左腿反向
    this.applyWalkArmPro(bones, rightPhase, mirror, 'L', params); // 左臂与右腿反向

    // === 细节：头部微微点头 ===
    const headNod = Math.sin(phase * 4 * Math.PI) * 0.15;
    bones.head.y += headNod;
  }

  /**
   * 计算走路时的重心垂直偏移
   * 实现 Contact→Down→Passing→Up 的重心曲线
   */
  calculateWalkBodyOffset(phase, params) {
    const keys = this.getWalkKeyPhases();

    // 每半个周期重复一次（因为两条腿交替）
    const halfPhase = (phase * 2) % 1;

    let y = 0;

    if (halfPhase < keys.down * 2) {
      // Contact → Down: 快速下沉
      const t = halfPhase / (keys.down * 2);
      y = this.easeOutQuad(t) * params.compressionDepth;
    } else if (halfPhase < keys.passing * 2) {
      // Down → Passing: 保持低位，开始回升
      const t = (halfPhase - keys.down * 2) / ((keys.passing - keys.down) * 2);
      y = params.compressionDepth * (1 - this.easeInQuad(t) * 0.5);
    } else if (halfPhase < keys.up * 2) {
      // Passing → Up: 快速回升到最高点
      const t = (halfPhase - keys.passing * 2) / ((keys.up - keys.passing) * 2);
      y = params.compressionDepth * 0.5 * (1 - this.easeOutQuad(t)) - params.compressionDepth * 0.3 * this.easeOutQuad(t);
    } else {
      // Up → Contact: 从最高点下落到触地
      const t = (halfPhase - keys.up * 2) / ((keys.halfCycle - keys.up) * 2);
      y = -params.compressionDepth * 0.3 * (1 - this.easeInQuad(t));
    }

    return { y };
  }

  /**
   * 专业走路腿部动画 - 脚锁地系统
   * 核心原理：触地脚固定不动，身体从脚的后方移动到前方
   */
  applyWalkLegPro(bones, phase, mirror, side, params) {
    const hip = bones[`hip${side}`];
    const knee = bones[`knee${side}`];
    const foot = bones[`foot${side}`];

    const stride = params.strideLength;
    const lift = params.liftHeight;
    const contactDur = params.contactDuration;

    // 定义走路阶段
    const stanceStart = 0;          // 触地开始
    const stanceEnd = 0.5;          // 触地结束（开始离地）
    const swingMid = 0.75;          // 摆动中点（最高点）
    const swingEnd = 1.0;           // 摆动结束（准备触地）

    let footX = 0, footY = 0;
    let kneeX = 0, kneeY = 0;

    if (phase < stanceEnd) {
      // === 支撑相 (Stance Phase): 脚锁地 ===
      // 脚固定在地面，位置从前方滑到后方（实际是身体在移动）
      const stanceProgress = phase / stanceEnd;

      // 使用缓入缓出，中间快两头慢
      const easedProgress = this.easeInOutSine(stanceProgress);

      // 脚的位置：从前方（stride/2）移动到后方（-stride/2）
      // 这实际上模拟的是身体越过固定的脚
      footX = (0.5 - easedProgress) * stride * mirror;
      footY = 0; // 触地时脚在地面

      // 膝盖在支撑相微微弯曲
      const kneeBend = Math.sin(stanceProgress * Math.PI) * 1.5;
      kneeX = footX * 0.6;
      kneeY = -kneeBend; // 膝盖略微向上弯曲

    } else {
      // === 摆动相 (Swing Phase): 脚离地摆动 ===
      const swingProgress = (phase - stanceEnd) / (swingEnd - stanceEnd);

      // 使用非线性缓动：离地快、最高点慢、落地减速
      const easedSwing = this.easeInOutQuad(swingProgress);

      // 脚的水平位置：从后方摆到前方（弧线运动）
      footX = (-0.5 + easedSwing) * stride * mirror;

      // 脚的垂直位置：抬起形成弧线
      // 使用正弦波但加入非对称性（抬起快、落下慢）
      const liftCurve = Math.sin(swingProgress * Math.PI);
      const asymmetry = swingProgress < 0.5 ?
        this.easeOutQuad(swingProgress * 2) :
        this.easeInQuad((swingProgress - 0.5) * 2);
      footY = -lift * liftCurve * (0.7 + 0.3 * (1 - asymmetry));

      // 膝盖在摆动相大幅弯曲（高抬腿）
      const kneeProgress = swingProgress < 0.6 ?
        this.easeOutQuad(swingProgress / 0.6) :
        this.easeInQuad((swingProgress - 0.6) / 0.4);

      kneeX = footX * 0.5 + (1 - Math.abs(swingProgress - 0.5) * 2) * 2 * mirror;
      kneeY = -lift * 0.7 * Math.sin(swingProgress * Math.PI);
    }

    // 应用到骨骼
    foot.x += footX;
    foot.y += footY;
    knee.x += kneeX;
    knee.y += kneeY;

    // 髋部轻微跟随
    hip.x += footX * 0.1;
  }

  /**
   * 专业走路手臂动画 - 带惯性延迟
   */
  applyWalkArmPro(bones, legPhase, mirror, side, params) {
    const shoulder = bones[`shoulder${side}`];
    const elbow = bones[`elbow${side}`];
    const hand = bones[`hand${side}`];

    const amp = params.armSwingAmplitude;
    const delay = params.overlapDelay;

    // 手臂摆动使用缓动的正弦波
    const swingPhase = legPhase * 2 * Math.PI;
    const armSwing = Math.sin(swingPhase);

    // 主摆动（肘部）
    const elbowSwing = armSwing * amp * 0.6;
    elbow.x += elbowSwing * mirror;
    elbow.y += Math.abs(armSwing) * 0.8; // 摆动时肘部略微抬起

    // 手部带惯性延迟（晚一点到达）
    const delayedPhase = ((legPhase - delay) + 1) % 1;
    const delayedSwing = Math.sin(delayedPhase * 2 * Math.PI);
    const handSwing = delayedSwing * amp;

    hand.x += handSwing * mirror;
    hand.y += delayedSwing * 1.2; // 手部有更多的前后运动（深度感）

    // 细节：手在换向时有小幅度的"甩"
    const velocityFactor = Math.cos(swingPhase) * 0.3;
    hand.x += velocityFactor * mirror;
  }

  // ============================================
  // 专业跑步动画系统
  // 跑步特点：有腾空、更强压缩、前倾、高抬腿
  // ============================================

  /**
   * 跑步关键姿势相位定义
   * 跑步与走路的关键区别：有腾空时间（double flight）
   */
  getRunKeyPhases() {
    return {
      // 相位 0.00: 触地 (Contact) - 脚跟着地
      // 相位 0.10: 压缩 (Compression) - 重心最低、蓄力
      // 相位 0.25: 蹬地 (Push-off) - 发力蹬地
      // 相位 0.35: 离地腾空开始 (Toe-off)
      // 相位 0.50: 腾空中点 (Flight) - 双脚离地
      // 相位 0.65: 摆动最高点 (Swing High)
      // 相位 0.85: 准备触地 (Pre-contact)
      // 相位 1.00: 触地
      contact: 0.0,
      compression: 0.10,
      pushOff: 0.25,
      toeOff: 0.35,
      flight: 0.50,
      swingHigh: 0.65,
      preContact: 0.85,
      halfCycle: 0.5
    };
  }

  /**
   * 跑步动画主函数 - 专业版
   */
  applyRunAnimation(bones, t, mirror) {
    const params = this.runParams;

    // 计算当前相位 (0-1)
    const cycleTime = params.cycleDuration / 1000;
    const phase = (t / cycleTime) % 1;

    // 左右腿相位差 0.5
    const rightPhase = phase;
    const leftPhase = (phase + 0.5) % 1;

    // === 身体前倾（跑步的核心特征）===
    const lean = params.bodyLean * mirror;
    bones.head.x += lean * 1.2;
    bones.neck.x += lean * 0.9;
    bones.spine.x += lean * 0.5;

    // === 重心曲线（带腾空）===
    const bodyOffset = this.calculateRunBodyOffset(phase, params);
    bones.head.y += bodyOffset.y * 1.0;
    bones.neck.y += bodyOffset.y * 0.85;
    bones.spine.y += bodyOffset.y * 0.6;
    bones.hip.y += bodyOffset.y * 0.4;

    // 躯干旋转（跑步时更明显的扭转）
    const torsoTwist = Math.sin(phase * 2 * Math.PI) * 0.8;
    bones.spine.x += torsoTwist * mirror;
    bones.hip.x -= torsoTwist * 0.3 * mirror;

    // === 腿部动画（高抬腿 + 有力蹬地）===
    this.applyRunLegPro(bones, rightPhase, mirror, 'R', params);
    this.applyRunLegPro(bones, leftPhase, mirror, 'L', params);

    // === 手臂大幅摆动（90度弯曲，有力）===
    this.applyRunArmPro(bones, leftPhase, mirror, 'R', params);
    this.applyRunArmPro(bones, rightPhase, mirror, 'L', params);

    // === 头部稳定（跑步时头部相对稳定，眼睛看前方）===
    bones.head.y -= bodyOffset.y * 0.15; // 轻微补偿，保持头部稳定
  }

  /**
   * 计算跑步时的重心垂直偏移
   * 特点：有明显的腾空时间，压缩更深
   */
  calculateRunBodyOffset(phase, params) {
    // 每半个周期重复（两腿交替）
    const halfPhase = (phase * 2) % 1;

    const compression = params.compressionDepth;
    const airTime = params.airTime;

    let y = 0;

    // 跑步的重心曲线更加复杂：
    // 触地压缩 → 蹬地回升 → 腾空（最高点）→ 落地缓冲

    if (halfPhase < 0.2) {
      // 触地压缩阶段（快速下沉）
      const t = halfPhase / 0.2;
      y = this.easeOutQuad(t) * compression;
    } else if (halfPhase < 0.4) {
      // 蹬地阶段（快速回升并超过平衡点）
      const t = (halfPhase - 0.2) / 0.2;
      y = compression * (1 - this.easeInQuad(t) * 1.5);
    } else if (halfPhase < 0.7) {
      // 腾空阶段（抛物线上升到最高点再下降）
      const t = (halfPhase - 0.4) / 0.3;
      // 抛物线：先上升后下降
      const parabola = 1 - Math.pow(t * 2 - 1, 2);
      y = -compression * 0.5 - parabola * compression * 0.5;
    } else {
      // 落地准备阶段（下降并准备缓冲）
      const t = (halfPhase - 0.7) / 0.3;
      y = -compression * 0.5 * (1 - this.easeOutQuad(t));
    }

    return { y };
  }

  /**
   * 专业跑步腿部动画
   * 特点：高抬腿、有力蹬地、明显的膝盖弯曲
   */
  applyRunLegPro(bones, phase, mirror, side, params) {
    const hip = bones[`hip${side}`];
    const knee = bones[`knee${side}`];
    const foot = bones[`foot${side}`];

    const stride = params.strideLength;
    const lift = params.liftHeight;

    // 跑步的支撑相更短（约30%），摆动相更长（约70%）
    const stanceEnd = 0.3;

    let footX = 0, footY = 0;
    let kneeX = 0, kneeY = 0;
    let hipOffset = 0;

    if (phase < stanceEnd) {
      // === 支撑相：触地 → 蹬地 ===
      const stanceProgress = phase / stanceEnd;

      // 使用强力的缓出（蹬地感）
      const easedProgress = this.easeOutCubic(stanceProgress);

      // 脚从前方快速移到后方（蹬地）
      footX = (0.5 - easedProgress * 1.2) * stride * mirror;

      // 触地缓冲：脚跟着地 → 全脚掌 → 脚尖蹬地
      const groundCurve = Math.sin(stanceProgress * Math.PI * 0.5);
      footY = groundCurve * 0.5; // 轻微的触地缓冲动作

      // 膝盖在支撑相前期弯曲（缓冲），后期伸直（蹬地）
      const kneeBend = stanceProgress < 0.5 ?
        Math.sin(stanceProgress * 2 * Math.PI) * 2.5 :
        Math.sin((1 - (stanceProgress - 0.5) * 2) * Math.PI * 0.5) * 1.5;

      kneeX = footX * 0.5;
      kneeY = -kneeBend;

      // 髋部在蹬地时略微后移
      hipOffset = -stanceProgress * 0.8;

    } else {
      // === 摆动相：离地 → 高抬腿 → 准备触地 ===
      const swingProgress = (phase - stanceEnd) / (1 - stanceEnd);

      // 脚的水平运动：从后方快速摆到前方
      // 使用强力的缓入缓出（摆动感）
      const easedSwing = this.easeInOutCubic(swingProgress);
      footX = (-0.5 + easedSwing * 1.2) * stride * mirror;

      // 脚的垂直运动：高抬腿轨迹
      // 使用非对称曲线：快速抬起、在最高点停顿、缓慢放下
      let liftCurve;
      if (swingProgress < 0.4) {
        // 快速抬起
        liftCurve = this.easeOutQuad(swingProgress / 0.4);
      } else if (swingProgress < 0.6) {
        // 最高点保持
        liftCurve = 1;
      } else {
        // 缓慢放下准备触地
        liftCurve = 1 - this.easeInQuad((swingProgress - 0.6) / 0.4);
      }
      footY = -lift * liftCurve;

      // 膝盖在摆动相高度弯曲（典型的跑步高抬腿）
      const kneeProgress = swingProgress < 0.5 ?
        this.easeOutQuad(swingProgress * 2) :
        1 - this.easeInQuad((swingProgress - 0.5) * 2) * 0.7;

      // 膝盖向前抬起
      kneeX = footX * 0.3 + stride * 0.3 * kneeProgress * mirror;
      kneeY = -lift * 0.9 * kneeProgress;

      // 髋部跟随
      hipOffset = (swingProgress - 0.5) * 0.5;
    }

    // 应用到骨骼
    foot.x += footX;
    foot.y += footY;
    knee.x += kneeX;
    knee.y += kneeY;
    hip.x += hipOffset * mirror;
  }

  /**
   * 专业跑步手臂动画
   * 特点：90度弯曲、大幅度、有力
   */
  applyRunArmPro(bones, legPhase, mirror, side, params) {
    const shoulder = bones[`shoulder${side}`];
    const elbow = bones[`elbow${side}`];
    const hand = bones[`hand${side}`];

    const amp = params.armSwingAmplitude;
    const delay = params.overlapDelay;

    // 跑步时手臂保持约90度弯曲
    const baseElbowBend = -4; // 肘部向上弯曲的基础值

    // 手臂前后摆动
    const swingPhase = legPhase * 2 * Math.PI;
    const armSwing = Math.sin(swingPhase);

    // 肘部摆动（幅度大，保持弯曲）
    elbow.x += armSwing * amp * 0.8 * mirror;
    elbow.y += baseElbowBend + Math.abs(armSwing) * 2; // 摆动时肘部抬起

    // 手部带惯性延迟
    const delayedPhase = ((legPhase - delay) + 1) % 1;
    const delayedSwing = Math.sin(delayedPhase * 2 * Math.PI);

    // 手保持在肘部附近（90度弯曲）
    hand.x += delayedSwing * amp * 1.2 * mirror;
    hand.y += baseElbowBend - 2 + delayedSwing * 3;

    // 手在摆动换向时的"甩"效果
    const velocityFactor = Math.cos(swingPhase);
    hand.x += velocityFactor * 0.6 * mirror;
    hand.y += Math.abs(velocityFactor) * 0.3;

    // 肩部轻微前后摆动
    shoulder.x += armSwing * 0.5 * mirror;
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
  // 缓动函数库 - 专业动画必备
  // 基于 Robert Penner 的缓动方程
  // ============================================

  /**
   * 缓动函数 - 二次缓入缓出
   */
  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * 缓动函数 - 二次缓出
   */
  easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
  }

  /**
   * 缓动函数 - 二次缓入
   */
  easeInQuad(t) {
    return t * t;
  }

  /**
   * 缓动函数 - 正弦缓入缓出（最自然的动画曲线）
   */
  easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  /**
   * 缓动函数 - 正弦缓出
   */
  easeOutSine(t) {
    return Math.sin((t * Math.PI) / 2);
  }

  /**
   * 缓动函数 - 正弦缓入
   */
  easeInSine(t) {
    return 1 - Math.cos((t * Math.PI) / 2);
  }

  /**
   * 缓动函数 - 三次缓入缓出（更强的加速感）
   */
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * 缓动函数 - 三次缓出（强力减速）
   */
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * 缓动函数 - 三次缓入（强力加速）
   */
  easeInCubic(t) {
    return t * t * t;
  }

  /**
   * 缓动函数 - 弹性缓出（适合打击感）
   */
  easeOutElastic(t) {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 :
      Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  /**
   * 缓动函数 - 回弹缓出（落地缓冲感）
   */
  easeOutBounce(t) {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  }

  /**
   * 线性插值
   */
  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * 角度线性插值（处理角度环绕）
   */
  lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
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
