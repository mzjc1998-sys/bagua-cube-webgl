using UnityEngine;

namespace BaguaCube.Player
{
    /// <summary>
    /// 火柴人控制器 - 控制移动、动画和布娃娃切换
    /// </summary>
    public class StickManController : MonoBehaviour
    {
        [Header("Movement Settings")]
        [SerializeField] private float moveSpeed = 5f;
        [SerializeField] private float runSpeed = 10f;
        [SerializeField] private float acceleration = 8f;

        [Header("Animation")]
        [SerializeField] private Animator animator;

        [Header("Ragdoll")]
        [SerializeField] private StickManRagdoll ragdoll;

        [Header("Ground Check")]
        [SerializeField] private Transform groundCheck;
        [SerializeField] private float groundDistance = 0.2f;
        [SerializeField] private LayerMask groundMask;

        // 状态
        private Vector3 velocity;
        private Vector3 targetDirection;
        private float currentSpeed;
        private bool isGrounded;
        private bool isRagdoll;

        // 组件
        private Rigidbody rb;
        private CharacterController characterController;

        // 动画参数哈希
        private static readonly int SpeedHash = Animator.StringToHash("Speed");
        private static readonly int IsGroundedHash = Animator.StringToHash("IsGrounded");
        private static readonly int DirectionXHash = Animator.StringToHash("DirectionX");
        private static readonly int DirectionZHash = Animator.StringToHash("DirectionZ");

        private void Awake()
        {
            rb = GetComponent<Rigidbody>();
            characterController = GetComponent<CharacterController>();

            if (ragdoll == null)
                ragdoll = GetComponent<StickManRagdoll>();
        }

        private void Update()
        {
            if (isRagdoll) return;

            CheckGround();
            HandleInput();
            UpdateAnimation();
        }

        private void FixedUpdate()
        {
            if (isRagdoll) return;

            ApplyMovement();
        }

        private void CheckGround()
        {
            isGrounded = Physics.CheckSphere(groundCheck.position, groundDistance, groundMask);
        }

        private void HandleInput()
        {
            // 获取输入
            float horizontal = Input.GetAxisRaw("Horizontal");
            float vertical = Input.GetAxisRaw("Vertical");

            // 计算目标方向
            targetDirection = new Vector3(horizontal, 0f, vertical).normalized;

            // 计算目标速度
            float targetSpeed = Input.GetKey(KeyCode.LeftShift) ? runSpeed : moveSpeed;

            if (targetDirection.magnitude >= 0.1f)
            {
                currentSpeed = Mathf.Lerp(currentSpeed, targetSpeed, acceleration * Time.deltaTime);
            }
            else
            {
                currentSpeed = Mathf.Lerp(currentSpeed, 0f, acceleration * Time.deltaTime);
            }
        }

        private void ApplyMovement()
        {
            if (targetDirection.magnitude >= 0.1f)
            {
                // 旋转角色面向移动方向
                float targetAngle = Mathf.Atan2(targetDirection.x, targetDirection.z) * Mathf.Rad2Deg;
                transform.rotation = Quaternion.Slerp(
                    transform.rotation,
                    Quaternion.Euler(0f, targetAngle, 0f),
                    10f * Time.fixedDeltaTime
                );
            }

            // 移动
            Vector3 moveDirection = targetDirection * currentSpeed;

            if (characterController != null)
            {
                characterController.Move(moveDirection * Time.fixedDeltaTime);
            }
            else if (rb != null)
            {
                rb.MovePosition(rb.position + moveDirection * Time.fixedDeltaTime);
            }
        }

        private void UpdateAnimation()
        {
            if (animator == null) return;

            animator.SetFloat(SpeedHash, currentSpeed / runSpeed);
            animator.SetBool(IsGroundedHash, isGrounded);
            animator.SetFloat(DirectionXHash, targetDirection.x);
            animator.SetFloat(DirectionZHash, targetDirection.z);
        }

        /// <summary>
        /// 激活布娃娃模式
        /// </summary>
        public void ActivateRagdoll(Vector3 impactForce)
        {
            if (ragdoll == null) return;

            isRagdoll = true;

            if (animator != null)
                animator.enabled = false;

            if (characterController != null)
                characterController.enabled = false;

            ragdoll.EnableRagdoll(impactForce);
        }

        /// <summary>
        /// 从布娃娃恢复
        /// </summary>
        public void RecoverFromRagdoll()
        {
            if (ragdoll == null) return;

            ragdoll.DisableRagdoll();

            if (animator != null)
                animator.enabled = true;

            if (characterController != null)
                characterController.enabled = true;

            isRagdoll = false;
        }

        private void OnCollisionEnter(Collision collision)
        {
            // 检测高速碰撞触发布娃娃
            if (collision.relativeVelocity.magnitude > 10f)
            {
                Vector3 impactForce = collision.relativeVelocity * 0.5f;
                ActivateRagdoll(impactForce);
            }
        }
    }
}
