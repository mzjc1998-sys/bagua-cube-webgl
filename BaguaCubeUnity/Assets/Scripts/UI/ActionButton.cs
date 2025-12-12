using UnityEngine;
using UnityEngine.UI;
using UnityEngine.Events;
using UnityEngine.EventSystems;

namespace BaguaCube.UI
{
    /// <summary>
    /// 动作按钮 UI 组件
    /// </summary>
    public class ActionButton : MonoBehaviour, IPointerDownHandler, IPointerUpHandler
    {
        [Header("Button Settings")]
        [SerializeField] private ActionType actionType = ActionType.Jump;
        [SerializeField] private float cooldown = 0f;

        [Header("Visual")]
        [SerializeField] private Image buttonImage;
        [SerializeField] private Color normalColor = Color.white;
        [SerializeField] private Color pressedColor = new Color(0.8f, 0.8f, 0.8f);
        [SerializeField] private Color cooldownColor = new Color(0.5f, 0.5f, 0.5f);

        [Header("Feedback")]
        [SerializeField] private bool useHapticFeedback = true;

        [Header("Events")]
        public UnityEvent OnButtonPressed;
        public UnityEvent OnButtonReleased;

        public enum ActionType
        {
            Jump,
            Action,
            Attack,
            Interact
        }

        // 状态
        private bool isPressed;
        private bool isOnCooldown;
        private float cooldownTimer;

        public bool IsPressed => isPressed;

        private void Start()
        {
            if (buttonImage == null)
            {
                buttonImage = GetComponent<Image>();
            }

            UpdateVisual();
        }

        private void Update()
        {
            if (isOnCooldown)
            {
                cooldownTimer -= Time.deltaTime;
                if (cooldownTimer <= 0f)
                {
                    isOnCooldown = false;
                    UpdateVisual();
                }
            }
        }

        public void OnPointerDown(PointerEventData eventData)
        {
            if (isOnCooldown) return;

            isPressed = true;
            UpdateVisual();

            if (useHapticFeedback)
            {
                WeChatExport.WeChatAPI.VibrateShort();
            }

            OnButtonPressed?.Invoke();

            // 根据动作类型触发
            TriggerAction();
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            if (!isPressed) return;

            isPressed = false;
            UpdateVisual();

            OnButtonReleased?.Invoke();

            // 启动冷却
            if (cooldown > 0f)
            {
                isOnCooldown = true;
                cooldownTimer = cooldown;
                UpdateVisual();
            }
        }

        private void UpdateVisual()
        {
            if (buttonImage == null) return;

            if (isOnCooldown)
            {
                buttonImage.color = cooldownColor;
            }
            else if (isPressed)
            {
                buttonImage.color = pressedColor;
            }
            else
            {
                buttonImage.color = normalColor;
            }
        }

        private void TriggerAction()
        {
            if (Core.GameManager.Instance == null) return;

            var player = Core.GameManager.Instance.Player;
            if (player == null) return;

            switch (actionType)
            {
                case ActionType.Jump:
                    // 跳跃逻辑可以在 StickManController 中实现
                    player.SendMessage("Jump", SendMessageOptions.DontRequireReceiver);
                    break;

                case ActionType.Action:
                    player.SendMessage("DoAction", SendMessageOptions.DontRequireReceiver);
                    break;

                case ActionType.Attack:
                    player.SendMessage("Attack", SendMessageOptions.DontRequireReceiver);
                    break;

                case ActionType.Interact:
                    player.SendMessage("Interact", SendMessageOptions.DontRequireReceiver);
                    break;
            }
        }

        /// <summary>
        /// 设置按钮可用性
        /// </summary>
        public void SetEnabled(bool enabled)
        {
            buttonImage.raycastTarget = enabled;
            buttonImage.color = enabled ? normalColor : cooldownColor;
        }

        /// <summary>
        /// 强制结束冷却
        /// </summary>
        public void ResetCooldown()
        {
            isOnCooldown = false;
            cooldownTimer = 0f;
            UpdateVisual();
        }
    }
}
