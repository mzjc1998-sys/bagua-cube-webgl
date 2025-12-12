using UnityEngine;

namespace BaguaCube.CameraSystem
{
    /// <summary>
    /// 八卦立方体相机控制器 - 等距视角
    /// </summary>
    public class BaguaCameraController : MonoBehaviour
    {
        [Header("Target")]
        [SerializeField] private Transform target;
        [SerializeField] private Vector3 offset = new Vector3(0, 10, -10);

        [Header("Follow Settings")]
        [SerializeField] private float smoothSpeed = 5f;
        [SerializeField] private float lookAheadDistance = 2f;
        [SerializeField] private float lookAheadSpeed = 3f;

        [Header("Camera Settings")]
        [SerializeField] private bool isOrthographic = true;
        [SerializeField] private float orthographicSize = 10f;
        [SerializeField] private float fieldOfView = 60f;

        [Header("Rotation")]
        [SerializeField] private float rotationAngle = 45f;
        [SerializeField] private float tiltAngle = 35f;

        // 状态
        private Vector3 currentLookAhead;
        private Vector3 targetLookAhead;
        private Camera cam;

        // 八卦宫位视角
        private int currentPalace = 0;
        private float targetRotation = 0f;
        private float currentRotation = 0f;

        private void Awake()
        {
            cam = GetComponent<Camera>();

            if (cam != null)
            {
                cam.orthographic = isOrthographic;
                if (isOrthographic)
                    cam.orthographicSize = orthographicSize;
                else
                    cam.fieldOfView = fieldOfView;
            }
        }

        private void Start()
        {
            // 初始化相机位置
            if (target != null)
            {
                transform.position = target.position + offset;
                transform.rotation = Quaternion.Euler(tiltAngle, rotationAngle, 0);
            }
        }

        private void LateUpdate()
        {
            if (target == null) return;

            UpdateLookAhead();
            UpdatePosition();
            UpdateRotation();
        }

        private void UpdateLookAhead()
        {
            // 获取目标移动方向
            Rigidbody targetRb = target.GetComponent<Rigidbody>();
            if (targetRb != null && targetRb.velocity.magnitude > 0.1f)
            {
                targetLookAhead = targetRb.velocity.normalized * lookAheadDistance;
            }
            else
            {
                targetLookAhead = Vector3.zero;
            }

            // 平滑过渡
            currentLookAhead = Vector3.Lerp(currentLookAhead, targetLookAhead, lookAheadSpeed * Time.deltaTime);
        }

        private void UpdatePosition()
        {
            // 计算旋转后的偏移
            Quaternion rotation = Quaternion.Euler(0, currentRotation, 0);
            Vector3 rotatedOffset = rotation * offset;

            // 目标位置
            Vector3 targetPosition = target.position + currentLookAhead + rotatedOffset;

            // 平滑跟随
            transform.position = Vector3.Lerp(transform.position, targetPosition, smoothSpeed * Time.deltaTime);
        }

        private void UpdateRotation()
        {
            // 平滑旋转
            currentRotation = Mathf.LerpAngle(currentRotation, targetRotation, smoothSpeed * Time.deltaTime);

            // 应用旋转
            transform.rotation = Quaternion.Euler(tiltAngle, currentRotation + rotationAngle, 0);
        }

        /// <summary>
        /// 切换八卦宫位视角
        /// </summary>
        public void SetPalaceView(int palaceIndex)
        {
            currentPalace = palaceIndex % 8;
            targetRotation = currentPalace * 45f;
        }

        /// <summary>
        /// 顺时针旋转视角
        /// </summary>
        public void RotateClockwise()
        {
            SetPalaceView(currentPalace + 1);
        }

        /// <summary>
        /// 逆时针旋转视角
        /// </summary>
        public void RotateCounterClockwise()
        {
            SetPalaceView(currentPalace - 1 + 8);
        }

        /// <summary>
        /// 设置跟随目标
        /// </summary>
        public void SetTarget(Transform newTarget)
        {
            target = newTarget;
        }

        /// <summary>
        /// 震动效果
        /// </summary>
        public void Shake(float intensity, float duration)
        {
            StartCoroutine(ShakeCoroutine(intensity, duration));
        }

        private System.Collections.IEnumerator ShakeCoroutine(float intensity, float duration)
        {
            Vector3 originalOffset = offset;
            float elapsed = 0f;

            while (elapsed < duration)
            {
                float x = Random.Range(-1f, 1f) * intensity;
                float y = Random.Range(-1f, 1f) * intensity;
                offset = originalOffset + new Vector3(x, y, 0);

                elapsed += Time.deltaTime;
                yield return null;
            }

            offset = originalOffset;
        }
    }
}
