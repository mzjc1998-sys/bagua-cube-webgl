using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;

namespace BaguaCube.UI
{
    /// <summary>
    /// 虚拟摇杆 UI 组件
    /// </summary>
    public class VirtualJoystick : MonoBehaviour, IPointerDownHandler, IDragHandler, IPointerUpHandler
    {
        [Header("Components")]
        [SerializeField] private RectTransform background;
        [SerializeField] private RectTransform handle;

        [Header("Settings")]
        [SerializeField] private float handleRange = 50f;
        [SerializeField] private float deadZone = 0.1f;
        [SerializeField] private bool isDynamic = true;
        [SerializeField] private float fadeSpeed = 5f;

        [Header("Visual")]
        [SerializeField] private CanvasGroup canvasGroup;
        [SerializeField] private float activeAlpha = 0.8f;
        [SerializeField] private float inactiveAlpha = 0.3f;

        // 输出
        private Vector2 input = Vector2.zero;
        public Vector2 Input => input;
        public float Horizontal => input.x;
        public float Vertical => input.y;

        // 状态
        private bool isActive;
        private Vector2 startPosition;
        private Canvas canvas;
        private Camera uiCamera;

        private void Start()
        {
            canvas = GetComponentInParent<Canvas>();

            if (canvas.renderMode == RenderMode.ScreenSpaceCamera)
            {
                uiCamera = canvas.worldCamera;
            }

            startPosition = background.anchoredPosition;

            if (canvasGroup == null)
            {
                canvasGroup = GetComponent<CanvasGroup>();
            }

            if (canvasGroup != null)
            {
                canvasGroup.alpha = inactiveAlpha;
            }

            if (isDynamic)
            {
                background.gameObject.SetActive(false);
            }
        }

        private void Update()
        {
            // 平滑淡入淡出
            if (canvasGroup != null)
            {
                float targetAlpha = isActive ? activeAlpha : inactiveAlpha;
                canvasGroup.alpha = Mathf.Lerp(canvasGroup.alpha, targetAlpha, fadeSpeed * Time.deltaTime);
            }
        }

        public void OnPointerDown(PointerEventData eventData)
        {
            isActive = true;

            if (isDynamic)
            {
                background.gameObject.SetActive(true);

                // 将背景移动到触摸位置
                Vector2 localPoint;
                RectTransformUtility.ScreenPointToLocalPointInRectangle(
                    canvas.transform as RectTransform,
                    eventData.position,
                    uiCamera,
                    out localPoint
                );

                background.anchoredPosition = localPoint;
            }

            OnDrag(eventData);
        }

        public void OnDrag(PointerEventData eventData)
        {
            Vector2 localPoint;
            RectTransformUtility.ScreenPointToLocalPointInRectangle(
                background,
                eventData.position,
                uiCamera,
                out localPoint
            );

            // 计算输入
            input = localPoint / handleRange;

            // 限制范围
            if (input.magnitude > 1f)
            {
                input = input.normalized;
            }

            // 应用死区
            if (input.magnitude < deadZone)
            {
                input = Vector2.zero;
            }

            // 更新手柄位置
            handle.anchoredPosition = input * handleRange;
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            isActive = false;
            input = Vector2.zero;
            handle.anchoredPosition = Vector2.zero;

            if (isDynamic)
            {
                background.anchoredPosition = startPosition;
                background.gameObject.SetActive(false);
            }
        }

        /// <summary>
        /// 获取移动方向（3D空间）
        /// </summary>
        public Vector3 GetDirection(Transform cameraTransform = null)
        {
            if (cameraTransform != null)
            {
                // 相对于相机方向
                Vector3 forward = cameraTransform.forward;
                Vector3 right = cameraTransform.right;

                forward.y = 0;
                right.y = 0;
                forward.Normalize();
                right.Normalize();

                return forward * input.y + right * input.x;
            }

            return new Vector3(input.x, 0, input.y);
        }
    }
}
