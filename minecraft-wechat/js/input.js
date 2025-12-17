/**
 * 输入处理系统 - 支持触摸和键盘
 */

export class InputManager {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;

    // 触摸状态
    this.touches = new Map();
    this.lookTouch = null; // 用于视角控制的触摸
    this.joystickTouch = null; // 用于移动的触摸

    // 鼠标状态
    this.mouseDown = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.mouseSensitivity = 0.002;

    // 键盘状态
    this.keys = new Set();

    // 绑定事件
    this.bindEvents();
  }

  bindEvents() {
    // 触摸事件
    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
    this.canvas.addEventListener('touchcancel', this.onTouchEnd.bind(this), { passive: false });

    // 鼠标事件（用于PC端测试）
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // 键盘事件
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', this.onKeyDown.bind(this));
      document.addEventListener('keyup', this.onKeyUp.bind(this));
    }

    // 指针锁定（PC端）
    this.canvas.addEventListener('click', () => {
      if (typeof document !== 'undefined' && document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock && this.canvas.requestPointerLock();
      }
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
    }
  }

  // 触摸开始
  onTouchStart(e) {
    e.preventDefault();

    for (const touch of e.changedTouches) {
      const x = touch.clientX;
      const y = touch.clientY;

      this.touches.set(touch.identifier, { x, y, startX: x, startY: y });

      // 检查UI按钮
      const button = this.game.ui.checkButtonHit(x, y);
      if (button) {
        this.handleButtonPress(button);
        continue;
      }

      // 检查快捷栏
      const slot = this.game.ui.checkHotbarHit(x, y);
      if (slot >= 0) {
        this.game.player.selectSlot(slot);
        continue;
      }

      // 检查菜单
      if (this.game.ui.showMenu) {
        const menuBtn = this.game.ui.checkMenuHit(x, y);
        if (menuBtn >= 0) {
          this.handleMenuSelect(menuBtn);
        }
        continue;
      }

      // 检查摇杆区域（左侧）
      if (x < this.canvas.width / 3) {
        if (this.game.ui.checkJoystickHit(x, y)) {
          this.joystickTouch = touch.identifier;
          this.game.ui.startJoystick(x, y);
        }
      } else if (x > this.canvas.width / 2) {
        // 右侧用于视角控制
        this.lookTouch = touch.identifier;
      }
    }
  }

  // 触摸移动
  onTouchMove(e) {
    e.preventDefault();

    for (const touch of e.changedTouches) {
      const x = touch.clientX;
      const y = touch.clientY;
      const touchData = this.touches.get(touch.identifier);

      if (!touchData) continue;

      // 摇杆控制
      if (touch.identifier === this.joystickTouch) {
        this.game.ui.updateJoystick(x, y);
      }

      // 视角控制
      if (touch.identifier === this.lookTouch) {
        const dx = x - touchData.x;
        const dy = y - touchData.y;

        this.game.player.rotation.y += dx * this.mouseSensitivity * 2;
        this.game.player.rotation.x += dy * this.mouseSensitivity * 2;

        // 限制垂直旋转
        this.game.player.rotation.x = Math.max(-Math.PI / 2 + 0.1,
          Math.min(Math.PI / 2 - 0.1, this.game.player.rotation.x));
      }

      touchData.x = x;
      touchData.y = y;
    }
  }

  // 触摸结束
  onTouchEnd(e) {
    for (const touch of e.changedTouches) {
      const touchData = this.touches.get(touch.identifier);

      if (touch.identifier === this.joystickTouch) {
        this.joystickTouch = null;
        this.game.ui.endJoystick();
      }

      if (touch.identifier === this.lookTouch) {
        this.lookTouch = null;
      }

      this.touches.delete(touch.identifier);
    }
  }

  // 鼠标按下
  onMouseDown(e) {
    this.mouseDown = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    // 检查UI
    const button = this.game.ui.checkButtonHit(e.clientX, e.clientY);
    if (button) {
      this.handleButtonPress(button);
      return;
    }

    const slot = this.game.ui.checkHotbarHit(e.clientX, e.clientY);
    if (slot >= 0) {
      this.game.player.selectSlot(slot);
      return;
    }

    // 左键破坏，右键放置
    if (e.button === 0) {
      this.game.breakBlock();
    } else if (e.button === 2) {
      this.game.placeBlock();
    }
  }

  // 鼠标移动
  onMouseMove(e) {
    if (document.pointerLockElement === this.canvas) {
      // 指针锁定模式
      this.game.player.rotation.y += e.movementX * this.mouseSensitivity;
      this.game.player.rotation.x += e.movementY * this.mouseSensitivity;

      this.game.player.rotation.x = Math.max(-Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, this.game.player.rotation.x));
    } else if (this.mouseDown) {
      // 非锁定模式拖拽
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;

      this.game.player.rotation.y += dx * this.mouseSensitivity;
      this.game.player.rotation.x += dy * this.mouseSensitivity;

      this.game.player.rotation.x = Math.max(-Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, this.game.player.rotation.x));

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  }

  // 鼠标松开
  onMouseUp(e) {
    this.mouseDown = false;
  }

  // 指针锁定变化
  onPointerLockChange() {
    if (document.pointerLockElement === this.canvas) {
      console.log('指针已锁定');
    } else {
      console.log('指针已解锁');
    }
  }

  // 键盘按下
  onKeyDown(e) {
    this.keys.add(e.code);

    // 数字键选择快捷栏
    if (e.code >= 'Digit1' && e.code <= 'Digit9') {
      const slot = parseInt(e.code.replace('Digit', '')) - 1;
      this.game.player.selectSlot(slot);
    }

    // ESC打开菜单
    if (e.code === 'Escape') {
      this.game.ui.toggleMenu();
    }

    // F切换飞行模式
    if (e.code === 'KeyF') {
      this.game.player.toggleFlying();
    }

    // T打开聊天
    if (e.code === 'KeyT') {
      // TODO: 打开聊天输入
    }
  }

  // 键盘松开
  onKeyUp(e) {
    this.keys.delete(e.code);
  }

  // 处理按钮按下
  handleButtonPress(button) {
    switch (button) {
      case 'jump':
        this.game.player.input.jump = true;
        setTimeout(() => this.game.player.input.jump = false, 100);
        break;
      case 'place':
        this.game.placeBlock();
        break;
      case 'break':
        this.game.breakBlock();
        break;
      case 'menu':
        this.game.ui.toggleMenu();
        break;
      case 'chat':
        // TODO: 打开聊天
        break;
      case 'fly':
        this.game.player.toggleFlying();
        break;
    }
  }

  // 处理菜单选择
  handleMenuSelect(index) {
    switch (index) {
      case 0: // 继续游戏
        this.game.ui.showMenu = false;
        break;
      case 1: // 设置
        // TODO: 打开设置
        break;
      case 2: // 返回大厅
        this.game.returnToLobby();
        break;
    }
  }

  // 更新输入状态
  update() {
    const player = this.game.player;

    // 键盘输入
    player.input.forward = this.keys.has('KeyW') || this.keys.has('ArrowUp');
    player.input.backward = this.keys.has('KeyS') || this.keys.has('ArrowDown');
    player.input.left = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    player.input.right = this.keys.has('KeyD') || this.keys.has('ArrowRight');
    player.input.jump = this.keys.has('Space');
    player.input.sneak = this.keys.has('ShiftLeft');
    player.sprinting = this.keys.has('ControlLeft');

    // 摇杆输入
    const joystick = this.game.ui.getJoystickInput();
    if (joystick.x !== 0 || joystick.y !== 0) {
      player.input.forward = joystick.y < -0.3;
      player.input.backward = joystick.y > 0.3;
      player.input.left = joystick.x < -0.3;
      player.input.right = joystick.x > 0.3;
    }
  }
}

export default InputManager;
