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
        // 简洁走路动画
        const walkT = (t * 3) % (Math.PI * 2);
        const walkPhase = walkT / (Math.PI * 2);

        // 左右腿相位差0.5
        const leftLegPhase = walkPhase;
        const rightLegPhase = (walkPhase + 0.5) % 1;

        const leftLeg = this.calculateLegPose(leftLegPhase, mirror);
        const rightLeg = this.calculateLegPose(rightLegPhase, mirror);

        // 应用腿部
        bones.kneeL.x += leftLeg.kneeX;
        bones.kneeL.y += leftLeg.kneeY;
        bones.footL.x += leftLeg.footX;
        bones.footL.y += leftLeg.footY;

        bones.kneeR.x += rightLeg.kneeX;
        bones.kneeR.y += rightLeg.kneeY;
        bones.footR.x += rightLeg.footX;
        bones.footR.y += rightLeg.footY;

        // 轻微身体起伏
        const bodyBob = this.calculateBodyBob(walkPhase);
        bones.head.y += bodyBob * 0.5;
        bones.spine.y += bodyBob * 0.3;

        // 手臂轻微摆动（与腿反向）
        const armSwingL = this.calculateArmSwing(rightLegPhase, mirror);
        const armSwingR = this.calculateArmSwing(leftLegPhase, mirror);

        bones.elbowL.x += armSwingL.elbowX;
        bones.handL.x += armSwingL.handX;
        bones.handL.y += armSwingL.handY;

        bones.elbowR.x += armSwingR.elbowX;
        bones.handR.x += armSwingR.handX;
        bones.handR.y += armSwingR.handY;
        break;

      case 'run':
        // 专业跑步动画 - 16帧循环，包含腾空期
        // 24fps，每循环16帧 = 0.67秒/循环
        const runT = (t * 4.5) % (Math.PI * 2); // 约0.7秒循环
        const runPhase = runT / (Math.PI * 2); // 0-1 相位

        // ===== 腿部动画（左右腿相位差0.5）=====
        const leftRunPhase = runPhase;
        const rightRunPhase = (runPhase + 0.5) % 1;

        const leftRunLeg = this.calculateRunLegPose(leftRunPhase, mirror);
        const rightRunLeg = this.calculateRunLegPose(rightRunPhase, mirror);

        // 应用左腿（髋、膝、踝关节）
        bones.hipL.x += leftRunLeg.hipX;
        bones.hipL.y += leftRunLeg.hipY;
        bones.kneeL.x += leftRunLeg.kneeX;
        bones.kneeL.y += leftRunLeg.kneeY;
        bones.footL.x += leftRunLeg.footX;
        bones.footL.y += leftRunLeg.footY;

        // 应用右腿
        bones.hipR.x += rightRunLeg.hipX;
        bones.hipR.y += rightRunLeg.hipY;
        bones.kneeR.x += rightRunLeg.kneeX;
        bones.kneeR.y += rightRunLeg.kneeY;
        bones.footR.x += rightRunLeg.footX;
        bones.footR.y += rightRunLeg.footY;

        // ===== 身体动态 =====
        // 1. 前倾（跑步特征，约15-20度）
        const forwardLean = 4 * mirror;
        bones.head.x += forwardLean;
        bones.neck.x += forwardLean * 0.75;
        bones.spine.x += forwardLean * 0.5;
        bones.hip.x += forwardLean * 0.2;

        // 2. 重心起伏（弹性）
        const runBodyBob = this.calculateRunBodyBob(runPhase);
        bones.head.y += runBodyBob - 1;
        bones.neck.y += runBodyBob * 0.9;
        bones.spine.y += runBodyBob * 0.7;
        bones.hip.y += runBodyBob * 0.5;
        bones.hipL.y += runBodyBob * 0.4;
        bones.hipR.y += runBodyBob * 0.4;

        // 3. 轻微左右摇摆（重心转移）
        const runBodySway = Math.sin(runT) * 0.8;
        bones.spine.x += runBodySway * mirror;
        bones.head.x += runBodySway * 1.1 * mirror;

        // ===== 手臂反向摆动 =====
        // 左臂与右腿反向，右臂与左腿反向
        const leftRunArm = this.calculateRunArmPose(rightRunPhase, mirror);
        const rightRunArm = this.calculateRunArmPose(leftRunPhase, mirror);

        // 左臂（肩、肘、腕关节）
        bones.shoulderL.x += leftRunArm.shoulderX;
        bones.shoulderL.y += leftRunArm.shoulderY;
        bones.elbowL.x += leftRunArm.elbowX;
        bones.elbowL.y += leftRunArm.elbowY;
        bones.handL.x += leftRunArm.handX;
        bones.handL.y += leftRunArm.handY;

        // 右臂
        bones.shoulderR.x += rightRunArm.shoulderX;
        bones.shoulderR.y += rightRunArm.shoulderY;
        bones.elbowR.x += rightRunArm.elbowX;
        bones.elbowR.y += rightRunArm.elbowY;
        bones.handR.x += rightRunArm.handX;
        bones.handR.y += rightRunArm.handY;
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
   * 计算走路腿部姿势（自然步态）
   * phase: 0-1，一条腿的完整周期
   */
  calculateLegPose(phase, mirror) {
    const result = { hipX: 0, kneeX: 0, kneeY: 0, footX: 0, footY: 0 };

    // 走路步幅要小，保持自然
    const strideLength = 5;

    if (phase < 0.5) {
      // === 支撑期：脚在地面，身体经过 ===
      const t = phase / 0.5;

      // 脚从前方移到后方（相对身体），始终贴地
      result.footX = (0.5 - t) * strideLength * mirror;
      result.footY = 0;

      // 膝盖：中间时最直，两端微屈
      result.kneeX = (0.4 - t * 0.8) * strideLength * 0.5 * mirror;
      const bendAmount = Math.abs(t - 0.5) * 2;
      result.kneeY = -bendAmount * 2;

    } else {
      // === 摆动期：脚离地向前摆 ===
      const t = (phase - 0.5) / 0.5;

      // 脚从后方摆到前方
      result.footX = (-0.5 + t) * strideLength * mirror;
      // 中间稍微抬高
      const lift = Math.sin(t * Math.PI) * 3;
      result.footY = -lift;

      // 膝盖随之弯曲
      result.kneeX = (-0.3 + t * 0.7) * strideLength * 0.5 * mirror;
      result.kneeY = -Math.sin(t * Math.PI) * 3 - 1;
    }

    return result;
  }

  /**
   * 计算走路身体重心起伏（轻微）
   */
  calculateBodyBob(phase) {
    // 走路起伏很小
    const doublePhase = phase * 2 % 1;
    return Math.cos(doublePhase * Math.PI * 2) * 1;
  }

  /**
   * 计算走路手臂摆动（自然下垂，轻微摆动）
   */
  calculateArmSwing(legPhase, mirror) {
    const result = { shoulderY: 0, elbowX: 0, elbowY: 0, handX: 0, handY: 0 };

    // 走路手臂自然下垂，轻微前后摆动
    const swing = Math.sin(legPhase * Math.PI * 2);

    // 肘部轻微摆动
    result.elbowX = swing * 2 * mirror;
    result.elbowY = 0;

    // 手部跟随
    result.handX = swing * 3 * mirror;
    result.handY = swing * 0.5;

    return result;
  }

  /**
   * 计算跑步腿部姿势（专业跑步周期，16帧循环）
   *
   * 关键相位：
   * 0.00-0.10: Contact（触地）- 脚跟触地，膝微屈，身体前倾
   * 0.10-0.20: Down/Loading（承重压缩）- 膝进一步弯曲，重心下沉，吸收冲击
   * 0.20-0.30: Mid-stance（中支撑）- 重心越过支撑脚，膝开始伸展
   * 0.30-0.40: Push-off（蹬离）- 踝跖屈，脚尖最后离地
   * 0.40-0.50: 腾空期开始 + 收腿
   * 0.50-0.70: Swing（摆动）- 膝屈曲收短，髋屈曲前摆
   * 0.70-0.90: 前伸准备
   * 0.90-1.00: 落地准备
   */
  calculateRunLegPose(phase, mirror) {
    const result = { hipX: 0, hipY: 0, kneeX: 0, kneeY: 0, footX: 0, footY: 0 };

    // 步幅参数（跑步比走路大）
    const strideLength = 12;
    const kneeHeight = 14;

    if (phase < 0.10) {
      // === Contact 触地期 ===
      // 脚在身体前方触地，膝微屈准备吸收冲击
      const t = phase / 0.10;

      // 脚刚触地，在前方（世界坐标锁定点开始）
      result.footX = strideLength * 0.5 * mirror;
      result.footY = 0; // 触地

      // 膝微屈，在脚后上方
      result.kneeX = strideLength * 0.35 * mirror;
      result.kneeY = -4 - t * 2; // 开始弯曲

      // 髋部
      result.hipX = 1 * mirror;
      result.hipY = t * 2; // 开始下沉

    } else if (phase < 0.20) {
      // === Down/Loading 承重压缩期 ===
      // 膝进一步弯曲，踝背屈，吸收冲击
      const t = (phase - 0.10) / 0.10;

      // 脚保持锁定，身体经过
      result.footX = strideLength * (0.5 - t * 0.25) * mirror;
      result.footY = 0;

      // 膝盖最大弯曲点
      result.kneeX = strideLength * (0.35 - t * 0.2) * mirror;
      result.kneeY = -6 - t * 3; // 压缩下沉

      result.hipX = (1 - t * 0.5) * mirror;
      result.hipY = 2 + t * 2; // 最低点接近

    } else if (phase < 0.30) {
      // === Mid-stance 中支撑期 ===
      // 重心越过支撑脚，膝开始回弹伸展
      const t = (phase - 0.20) / 0.10;

      // 脚继续后移（相对身体）
      result.footX = strideLength * (0.25 - t * 0.35) * mirror;
      result.footY = 0;

      // 膝伸展回弹
      result.kneeX = strideLength * (0.15 - t * 0.25) * mirror;
      result.kneeY = -9 + t * 3; // 回弹上升

      result.hipY = 4 - t * 2; // 从最低点回升

    } else if (phase < 0.40) {
      // === Push-off 蹬离期 ===
      // 踝跖屈（脚跟抬起），脚尖最后离地
      const t = (phase - 0.30) / 0.10;

      // 脚跟开始抬起
      result.footX = strideLength * (-0.1 - t * 0.4) * mirror;
      result.footY = -t * 6; // 脚尖离地

      // 膝向后伸展
      result.kneeX = strideLength * (-0.1 - t * 0.3) * mirror;
      result.kneeY = -6 - t * 4;

      result.hipY = 2 - t * 3;

    } else if (phase < 0.50) {
      // === 腾空期 + 收腿 ===
      // 快速屈膝收短，准备前摆
      const t = (phase - 0.40) / 0.10;

      // 脚快速上收，脚跟靠近臀部
      result.footX = strideLength * (-0.5 + t * 0.2) * mirror;
      result.footY = -6 - t * 8; // 高速上提

      // 膝快速屈曲
      result.kneeX = strideLength * (-0.4 + t * 0.15) * mirror;
      result.kneeY = -10 - t * 4;

      result.hipY = -1 - t * 1;

    } else if (phase < 0.70) {
      // === Swing 摆动期 ===
      // 髋屈曲抬膝前送，小腿折叠
      const t = (phase - 0.50) / 0.20;
      const swingEase = this.easeInOutQuad(t);

      // 膝高抬向前
      result.kneeX = strideLength * (-0.25 + swingEase * 0.6) * mirror;
      result.kneeY = -kneeHeight - Math.sin(t * Math.PI) * 2; // 最高点

      // 小腿折叠，脚跟接近臀部
      const foldAmount = Math.sin(t * Math.PI) * 0.8;
      result.footX = result.kneeX - foldAmount * 6 * mirror;
      result.footY = result.kneeY + 6 + foldAmount * 5;

      result.hipX = (-0.5 + swingEase * 1) * mirror;
      result.hipY = -2 + t * 0.5;

    } else if (phase < 0.90) {
      // === 前伸准备期 ===
      // 膝伸展，腿向前伸准备触地
      const t = (phase - 0.70) / 0.20;
      const extendEase = this.easeOutQuad(t);

      // 膝向前伸展
      result.kneeX = strideLength * (0.35 + extendEase * 0.1) * mirror;
      result.kneeY = -kneeHeight + extendEase * 8;

      // 脚从折叠位置伸出
      result.footX = strideLength * (0.2 + extendEase * 0.3) * mirror;
      result.footY = -10 + extendEase * 6;

      result.hipX = (0.5 + extendEase * 0.5) * mirror;
      result.hipY = -1.5 + extendEase * 0.5;

    } else {
      // === 落地准备期 ===
      // 保持微屈准备触地，脚调整角度
      const t = (phase - 0.90) / 0.10;

      // 腿伸直但保留微屈，准备触地
      result.footX = strideLength * 0.5 * mirror;
      result.footY = -4 + t * 4; // 下落触地

      result.kneeX = strideLength * 0.4 * mirror;
      result.kneeY = -6 + t * 2;

      result.hipX = 1 * mirror;
      result.hipY = -1 + t * 1;
    }

    return result;
  }

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
   * 计算跑步身体起伏（弹性重心）
   *
   * 触地后压缩下沉 → 蹬地时回弹上提 → 腾空期最高
   * 双周期（左右脚各一次）
   */
  calculateRunBodyBob(phase) {
    // 每个脚触地时下沉，腾空时上升
    // phase 0.10-0.20: 左脚承重压缩（下沉）
    // phase 0.40-0.50: 左脚蹬离腾空（上升）
    // phase 0.60-0.70: 右脚承重压缩（下沉）
    // phase 0.90-1.00: 右脚蹬离腾空（上升）

    const doublePhase = phase * 2 % 1; // 双频率

    // 使用更精确的相位控制
    let bob = 0;
    if (doublePhase < 0.20) {
      // 触地压缩期 - 下沉
      const t = doublePhase / 0.20;
      bob = this.easeOutQuad(t) * 4; // 正值=下沉
    } else if (doublePhase < 0.40) {
      // 中支撑到蹬离 - 回弹
      const t = (doublePhase - 0.20) / 0.20;
      bob = 4 - this.easeInOutQuad(t) * 6; // 从下沉到上升
    } else if (doublePhase < 0.60) {
      // 腾空期 - 最高点
      const t = (doublePhase - 0.40) / 0.20;
      bob = -2 + Math.sin(t * Math.PI) * -1; // 负值=上升
    } else {
      // 落地准备 - 下落
      const t = (doublePhase - 0.60) / 0.40;
      bob = -3 + this.easeInOutQuad(t) * 7;
    }

    return bob;
  }

  /**
   * 计算跑步手臂姿势（与腿反向对摆，保持节奏）
   *
   * 规则：
   * - 右腿前摆/触地时，左臂在前，右臂在后
   * - 肘保持约90度屈曲
   * - 摆臂有末端滞后（follow-through）
   * - 幅度适中，稳定躯干平衡
   */
  calculateRunArmPose(legPhase, mirror) {
    const result = {
      shoulderX: 0, shoulderY: 0,
      elbowX: 0, elbowY: 0,
      handX: 0, handY: 0
    };

    // 手臂与对侧腿反向摆动
    // 使用缓动使动作更自然，避免机械感
    const armPhase = legPhase;

    // 主摆动（使用平滑正弦）
    const mainSwing = Math.sin(armPhase * Math.PI * 2);

    // 肩膀轻微移动（驱动手臂）
    result.shoulderX = mainSwing * 1.5 * mirror;
    result.shoulderY = Math.abs(mainSwing) * -0.5; // 向后摆时稍抬

    // 肘部保持约90度弯曲，大幅前后摆动
    // 有轻微滞后（惯性效果）
    const elbowDelay = 0.06;
    const elbowPhase = (armPhase - elbowDelay + 1) % 1;
    const elbowSwing = Math.sin(elbowPhase * Math.PI * 2);

    result.elbowX = elbowSwing * 7 * mirror;
    // 保持高位，向前时稍高
    result.elbowY = -5 + elbowSwing * -2;

    // 手部（拳头）跟随，更大滞后（follow-through效果）
    const handDelay = 0.10;
    const handPhase = (armPhase - handDelay + 1) % 1;
    const handSwing = Math.sin(handPhase * Math.PI * 2);

    result.handX = handSwing * 9 * mirror;
    // 前摆时手靠近脸，后摆时手靠近髋
    result.handY = -3 + handSwing * 3;

    return result;
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
