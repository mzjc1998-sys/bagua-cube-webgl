/**
 * 玩家控制系统
 */

import { BlockType } from './world.js';

export class Player {
  constructor(world, id = null) {
    this.world = world;
    this.id = id || this.generateId();
    this.name = '玩家' + this.id.substring(0, 4);

    // 位置和旋转
    this.position = { x: 0, y: 50, z: 0 };
    this.rotation = { x: 0, y: 0 }; // pitch, yaw
    this.velocity = { x: 0, y: 0, z: 0 };

    // 物理参数
    this.width = 0.6;
    this.height = 1.8;
    this.eyeHeight = 1.6;

    // 移动参数
    this.moveSpeed = 4.5;
    this.jumpForce = 8;
    this.gravity = 20;
    this.friction = 10;

    // 状态
    this.onGround = false;
    this.flying = false;
    this.sneaking = false;
    this.sprinting = false;

    // 输入状态
    this.input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      sneak: false
    };

    // 背包
    this.inventory = {
      slots: new Array(9).fill(null),
      selectedSlot: 0
    };

    // 初始化背包
    this.inventory.slots[0] = { type: BlockType.GRASS, count: 64 };
    this.inventory.slots[1] = { type: BlockType.DIRT, count: 64 };
    this.inventory.slots[2] = { type: BlockType.STONE, count: 64 };
    this.inventory.slots[3] = { type: BlockType.WOOD, count: 64 };
    this.inventory.slots[4] = { type: BlockType.PLANKS, count: 64 };
    this.inventory.slots[5] = { type: BlockType.GLASS, count: 64 };
    this.inventory.slots[6] = { type: BlockType.BRICK, count: 64 };
    this.inventory.slots[7] = { type: BlockType.SAND, count: 64 };
    this.inventory.slots[8] = { type: BlockType.COBBLESTONE, count: 64 };
  }

  generateId() {
    return Math.random().toString(36).substring(2, 15);
  }

  // 更新玩家
  update(dt) {
    // 处理移动输入
    const moveDir = { x: 0, z: 0 };

    if (this.input.forward) moveDir.z -= 1;
    if (this.input.backward) moveDir.z += 1;
    if (this.input.left) moveDir.x -= 1;
    if (this.input.right) moveDir.x += 1;

    // 根据视角旋转移动方向
    if (moveDir.x !== 0 || moveDir.z !== 0) {
      const length = Math.sqrt(moveDir.x * moveDir.x + moveDir.z * moveDir.z);
      moveDir.x /= length;
      moveDir.z /= length;

      const cos = Math.cos(this.rotation.y);
      const sin = Math.sin(this.rotation.y);

      const rotatedX = moveDir.x * cos - moveDir.z * sin;
      const rotatedZ = moveDir.x * sin + moveDir.z * cos;

      const speed = this.sprinting ? this.moveSpeed * 1.5 : this.moveSpeed;
      this.velocity.x = rotatedX * speed;
      this.velocity.z = rotatedZ * speed;
    } else {
      // 应用摩擦力
      this.velocity.x *= Math.max(0, 1 - this.friction * dt);
      this.velocity.z *= Math.max(0, 1 - this.friction * dt);
    }

    // 飞行模式
    if (this.flying) {
      if (this.input.jump) {
        this.velocity.y = this.moveSpeed;
      } else if (this.input.sneak) {
        this.velocity.y = -this.moveSpeed;
      } else {
        this.velocity.y = 0;
      }
    } else {
      // 重力
      this.velocity.y -= this.gravity * dt;

      // 跳跃
      if (this.input.jump && this.onGround) {
        this.velocity.y = this.jumpForce;
        this.onGround = false;
      }
    }

    // 限制下落速度
    if (this.velocity.y < -50) {
      this.velocity.y = -50;
    }

    // 应用速度并进行碰撞检测
    this.moveWithCollision(dt);
  }

  // 带碰撞检测的移动
  moveWithCollision(dt) {
    const newPos = {
      x: this.position.x + this.velocity.x * dt,
      y: this.position.y + this.velocity.y * dt,
      z: this.position.z + this.velocity.z * dt
    };

    // X轴碰撞
    if (this.checkCollision(newPos.x, this.position.y, this.position.z)) {
      this.velocity.x = 0;
    } else {
      this.position.x = newPos.x;
    }

    // Z轴碰撞
    if (this.checkCollision(this.position.x, this.position.y, newPos.z)) {
      this.velocity.z = 0;
    } else {
      this.position.z = newPos.z;
    }

    // Y轴碰撞
    this.onGround = false;
    if (this.checkCollision(this.position.x, newPos.y, this.position.z)) {
      if (this.velocity.y < 0) {
        this.onGround = true;
      }
      this.velocity.y = 0;
    } else {
      this.position.y = newPos.y;
    }

    // 防止掉出世界
    if (this.position.y < -10) {
      const spawn = this.world.getSpawnPoint();
      this.position.x = spawn.x;
      this.position.y = spawn.y;
      this.position.z = spawn.z;
      this.velocity = { x: 0, y: 0, z: 0 };
    }
  }

  // 碰撞检测
  checkCollision(x, y, z) {
    const halfWidth = this.width / 2;
    const corners = [
      { x: x - halfWidth, y: y, z: z - halfWidth },
      { x: x + halfWidth, y: y, z: z - halfWidth },
      { x: x - halfWidth, y: y, z: z + halfWidth },
      { x: x + halfWidth, y: y, z: z + halfWidth },
      { x: x - halfWidth, y: y + this.height, z: z - halfWidth },
      { x: x + halfWidth, y: y + this.height, z: z - halfWidth },
      { x: x - halfWidth, y: y + this.height, z: z + halfWidth },
      { x: x + halfWidth, y: y + this.height, z: z + halfWidth }
    ];

    for (const corner of corners) {
      const blockX = Math.floor(corner.x);
      const blockY = Math.floor(corner.y);
      const blockZ = Math.floor(corner.z);

      const block = this.world.getBlock(blockX, blockY, blockZ);
      if (block !== BlockType.AIR && block !== BlockType.WATER) {
        return true;
      }
    }

    return false;
  }

  // 获取眼睛位置
  getEyePosition() {
    return {
      x: this.position.x,
      y: this.position.y + this.eyeHeight,
      z: this.position.z
    };
  }

  // 获取视线方向
  getLookDirection() {
    const pitch = this.rotation.x;
    const yaw = this.rotation.y;

    return {
      x: -Math.sin(yaw) * Math.cos(pitch),
      y: -Math.sin(pitch),
      z: -Math.cos(yaw) * Math.cos(pitch)
    };
  }

  // 放置方块
  placeBlock() {
    const eye = this.getEyePosition();
    const dir = this.getLookDirection();

    const result = this.world.raycast(eye, dir, 5);

    if (result.hit && result.lastPosition) {
      const selectedItem = this.inventory.slots[this.inventory.selectedSlot];
      if (selectedItem && selectedItem.count > 0) {
        // 检查是否会与玩家碰撞
        const pos = result.lastPosition;
        if (!this.wouldCollideWithBlock(pos.x, pos.y, pos.z)) {
          this.world.setBlock(pos.x, pos.y, pos.z, selectedItem.type);
          selectedItem.count--;
          if (selectedItem.count <= 0) {
            this.inventory.slots[this.inventory.selectedSlot] = null;
          }
          return { success: true, position: pos, type: selectedItem.type };
        }
      }
    }

    return { success: false };
  }

  // 检查方块是否会与玩家碰撞
  wouldCollideWithBlock(bx, by, bz) {
    const halfWidth = this.width / 2;
    const playerMinX = this.position.x - halfWidth;
    const playerMaxX = this.position.x + halfWidth;
    const playerMinY = this.position.y;
    const playerMaxY = this.position.y + this.height;
    const playerMinZ = this.position.z - halfWidth;
    const playerMaxZ = this.position.z + halfWidth;

    return !(bx + 1 <= playerMinX || bx >= playerMaxX ||
             by + 1 <= playerMinY || by >= playerMaxY ||
             bz + 1 <= playerMinZ || bz >= playerMaxZ);
  }

  // 破坏方块
  breakBlock() {
    const eye = this.getEyePosition();
    const dir = this.getLookDirection();

    const result = this.world.raycast(eye, dir, 5);

    if (result.hit) {
      const pos = result.position;
      const block = result.block;

      // 不能破坏基岩
      if (block === BlockType.BEDROCK) {
        return { success: false };
      }

      this.world.setBlock(pos.x, pos.y, pos.z, BlockType.AIR);

      // 添加到背包
      this.addToInventory(block);

      return { success: true, position: pos, type: block };
    }

    return { success: false };
  }

  // 添加物品到背包
  addToInventory(blockType) {
    // 先尝试堆叠
    for (let i = 0; i < this.inventory.slots.length; i++) {
      const slot = this.inventory.slots[i];
      if (slot && slot.type === blockType && slot.count < 64) {
        slot.count++;
        return true;
      }
    }

    // 找空槽位
    for (let i = 0; i < this.inventory.slots.length; i++) {
      if (!this.inventory.slots[i]) {
        this.inventory.slots[i] = { type: blockType, count: 1 };
        return true;
      }
    }

    return false; // 背包满了
  }

  // 选择快捷栏
  selectSlot(index) {
    if (index >= 0 && index < this.inventory.slots.length) {
      this.inventory.selectedSlot = index;
    }
  }

  // 切换飞行模式
  toggleFlying() {
    this.flying = !this.flying;
    if (this.flying) {
      this.velocity.y = 0;
    }
  }

  // 获取目标方块信息
  getTargetBlock() {
    const eye = this.getEyePosition();
    const dir = this.getLookDirection();
    return this.world.raycast(eye, dir, 5);
  }

  // 序列化状态
  serialize() {
    return {
      id: this.id,
      name: this.name,
      position: this.position,
      rotation: this.rotation,
      velocity: this.velocity,
      flying: this.flying
    };
  }

  // 从服务器数据更新
  updateFromServer(data) {
    if (data.position) this.position = data.position;
    if (data.rotation) this.rotation = data.rotation;
    if (data.velocity) this.velocity = data.velocity;
    if (data.name) this.name = data.name;
  }
}

// 其他玩家（用于多人游戏）
export class RemotePlayer {
  constructor(data) {
    this.id = data.id;
    this.name = data.name || '玩家';
    this.position = data.position || { x: 0, y: 50, z: 0 };
    this.rotation = data.rotation || { x: 0, y: 0 };

    // 插值目标
    this.targetPosition = { ...this.position };
    this.targetRotation = { ...this.rotation };
  }

  // 平滑更新位置
  update(dt) {
    const lerpFactor = Math.min(1, dt * 10);

    this.position.x += (this.targetPosition.x - this.position.x) * lerpFactor;
    this.position.y += (this.targetPosition.y - this.position.y) * lerpFactor;
    this.position.z += (this.targetPosition.z - this.position.z) * lerpFactor;

    this.rotation.x += (this.targetRotation.x - this.rotation.x) * lerpFactor;
    this.rotation.y += (this.targetRotation.y - this.rotation.y) * lerpFactor;
  }

  // 设置目标状态（从服务器）
  setTarget(data) {
    if (data.position) this.targetPosition = data.position;
    if (data.rotation) this.targetRotation = data.rotation;
    if (data.name) this.name = data.name;
  }
}

export default Player;
