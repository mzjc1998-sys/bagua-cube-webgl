using UnityEngine;
using UnityEngine.Events;

namespace BaguaCube.WeChatExport
{
    /// <summary>
    /// 微信小游戏触摸输入处理
    /// </summary>
    public class WeChatTouchInput : MonoBehaviour
    {
        [Header("Joystick Settings")]
        [SerializeField] private float joystickRadius = 75f;
        [SerializeField] private float deadZone = 0.1f;

        [Header("UI References")]
        [SerializeField] private RectTransform joystickBackground;
        [SerializeField] private RectTransform joystickHandle;

        [Header("Events")]
        public UnityEvent<Vector2> OnMove;
        public UnityEvent OnJump;
        public UnityEvent OnAction;

        // 触摸状态
        private bool isTouching;
        private Vector2 touchStartPosition;
        private Vector2 currentInput;
        private int joystickTouchId = -1;

        // 触摸区域
        private float screenWidth;
        private float screenHeight;
        private float joystickAreaWidth;

        public Vector2 MoveInput => currentInput;

        private void Start()
        {
            screenWidth = Screen.width;
            screenHeight = Screen.height;
            joystickAreaWidth = screenWidth * 0.4f; // 左侧40%为摇杆区域

            if (joystickBackground != null)
            {
                joystickBackground.gameObject.SetActive(false);
            }
        }

        private void Update()
        {
            HandleTouchInput();
            HandleKeyboardInput(); // 编辑器调试用
        }

        private void HandleTouchInput()
        {
            if (Input.touchCount > 0)
            {
                foreach (Touch touch in Input.touches)
                {
                    switch (touch.phase)
                    {
                        case TouchPhase.Began:
                            HandleTouchBegan(touch);
                            break;

                        case TouchPhase.Moved:
                        case TouchPhase.Stationary:
                            HandleTouchMoved(touch);
                            break;

                        case TouchPhase.Ended:
                        case TouchPhase.Canceled:
                            HandleTouchEnded(touch);
                            break;
                    }
                }
            }
            else
            {
                // 鼠标输入（编辑器调试）
                HandleMouseInput();
            }
        }

        private void HandleTouchBegan(Touch touch)
        {
            // 左侧区域 - 虚拟摇杆
            if (touch.position.x < joystickAreaWidth)
            {
                if (joystickTouchId == -1)
                {
                    joystickTouchId = touch.fingerId;
                    touchStartPosition = touch.position;
                    isTouching = true;

                    // 显示摇杆
                    if (joystickBackground != null)
                    {
                        joystickBackground.position = touch.position;
                        joystickBackground.gameObject.SetActive(true);
                    }
                }
            }
            // 右侧区域 - 动作按钮
            else
            {
                // 右上角 - 跳跃
                if (touch.position.y > screenHeight * 0.5f)
                {
                    OnJump?.Invoke();
                }
                // 右下角 - 动作
                else
                {
                    OnAction?.Invoke();
                }
            }
        }

        private void HandleTouchMoved(Touch touch)
        {
            if (touch.fingerId == joystickTouchId)
            {
                Vector2 direction = touch.position - touchStartPosition;
                float distance = direction.magnitude;

                // 限制在摇杆半径内
                if (distance > joystickRadius)
                {
                    direction = direction.normalized * joystickRadius;
                }

                // 计算输入值
                currentInput = direction / joystickRadius;

                // 应用死区
                if (currentInput.magnitude < deadZone)
                {
                    currentInput = Vector2.zero;
                }

                // 更新摇杆手柄位置
                if (joystickHandle != null)
                {
                    joystickHandle.position = touchStartPosition + direction;
                }

                // 触发移动事件
                OnMove?.Invoke(currentInput);
            }
        }

        private void HandleTouchEnded(Touch touch)
        {
            if (touch.fingerId == joystickTouchId)
            {
                joystickTouchId = -1;
                isTouching = false;
                currentInput = Vector2.zero;

                // 隐藏摇杆
                if (joystickBackground != null)
                {
                    joystickBackground.gameObject.SetActive(false);
                }

                if (joystickHandle != null)
                {
                    joystickHandle.localPosition = Vector3.zero;
                }

                OnMove?.Invoke(Vector2.zero);
            }
        }

        private void HandleMouseInput()
        {
            // 模拟触摸输入（编辑器调试）
            if (Input.GetMouseButtonDown(0))
            {
                Vector2 mousePos = Input.mousePosition;

                if (mousePos.x < joystickAreaWidth)
                {
                    touchStartPosition = mousePos;
                    isTouching = true;

                    if (joystickBackground != null)
                    {
                        joystickBackground.position = mousePos;
                        joystickBackground.gameObject.SetActive(true);
                    }
                }
            }
            else if (Input.GetMouseButton(0) && isTouching)
            {
                Vector2 mousePos = Input.mousePosition;
                Vector2 direction = mousePos - touchStartPosition;
                float distance = direction.magnitude;

                if (distance > joystickRadius)
                {
                    direction = direction.normalized * joystickRadius;
                }

                currentInput = direction / joystickRadius;

                if (currentInput.magnitude < deadZone)
                {
                    currentInput = Vector2.zero;
                }

                if (joystickHandle != null)
                {
                    joystickHandle.position = touchStartPosition + direction;
                }

                OnMove?.Invoke(currentInput);
            }
            else if (Input.GetMouseButtonUp(0))
            {
                isTouching = false;
                currentInput = Vector2.zero;

                if (joystickBackground != null)
                {
                    joystickBackground.gameObject.SetActive(false);
                }

                if (joystickHandle != null)
                {
                    joystickHandle.localPosition = Vector3.zero;
                }

                OnMove?.Invoke(Vector2.zero);
            }
        }

        private void HandleKeyboardInput()
        {
            // 键盘输入（编辑器调试）
            if (!isTouching)
            {
                float h = Input.GetAxisRaw("Horizontal");
                float v = Input.GetAxisRaw("Vertical");

                currentInput = new Vector2(h, v);

                if (currentInput.magnitude > 1f)
                {
                    currentInput.Normalize();
                }

                if (currentInput.magnitude > deadZone)
                {
                    OnMove?.Invoke(currentInput);
                }
                else
                {
                    OnMove?.Invoke(Vector2.zero);
                }
            }

            if (Input.GetKeyDown(KeyCode.Space))
            {
                OnJump?.Invoke();
            }

            if (Input.GetKeyDown(KeyCode.E))
            {
                OnAction?.Invoke();
            }
        }
    }
}
