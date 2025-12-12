using UnityEngine;
using System.Collections.Generic;

namespace BaguaCube.Player
{
    /// <summary>
    /// 火柴人布娃娃系统 - 管理骨骼物理
    /// </summary>
    public class StickManRagdoll : MonoBehaviour
    {
        [Header("Ragdoll Settings")]
        [SerializeField] private float recoveryDelay = 2f;
        [SerializeField] private float recoveryThreshold = 0.5f;

        [Header("Bone References")]
        [SerializeField] private Transform hipsBone;
        [SerializeField] private List<RagdollBone> ragdollBones = new List<RagdollBone>();

        [Header("Joint Settings")]
        [SerializeField] private float jointSpring = 1000f;
        [SerializeField] private float jointDamper = 100f;

        // 状态
        private bool isRagdoll;
        private float ragdollTimer;
        private Vector3 savedPosition;
        private Quaternion savedRotation;

        // 组件
        private Animator animator;

        [System.Serializable]
        public class RagdollBone
        {
            public string boneName;
            public Transform bone;
            public Rigidbody rb;
            public Collider col;
            public CharacterJoint joint;

            [HideInInspector] public Vector3 savedPosition;
            [HideInInspector] public Quaternion savedRotation;
        }

        private void Awake()
        {
            animator = GetComponent<Animator>();
            InitializeRagdoll();
        }

        private void Start()
        {
            // 默认禁用布娃娃
            DisableRagdoll();
        }

        private void Update()
        {
            if (isRagdoll)
            {
                ragdollTimer += Time.deltaTime;

                // 检测是否可以恢复
                if (ragdollTimer >= recoveryDelay && IsStable())
                {
                    // 可以恢复，通知控制器
                    GetComponent<StickManController>()?.RecoverFromRagdoll();
                }
            }
        }

        /// <summary>
        /// 初始化布娃娃系统
        /// </summary>
        private void InitializeRagdoll()
        {
            if (ragdollBones.Count == 0)
            {
                // 自动查找所有带 Rigidbody 的骨骼
                Rigidbody[] rbs = GetComponentsInChildren<Rigidbody>();
                foreach (var rb in rbs)
                {
                    if (rb.gameObject == gameObject) continue;

                    var bone = new RagdollBone
                    {
                        boneName = rb.gameObject.name,
                        bone = rb.transform,
                        rb = rb,
                        col = rb.GetComponent<Collider>(),
                        joint = rb.GetComponent<CharacterJoint>()
                    };
                    ragdollBones.Add(bone);
                }
            }
        }

        /// <summary>
        /// 启用布娃娃物理
        /// </summary>
        public void EnableRagdoll(Vector3 impactForce)
        {
            isRagdoll = true;
            ragdollTimer = 0f;

            // 保存当前位置
            savedPosition = transform.position;
            savedRotation = transform.rotation;

            foreach (var bone in ragdollBones)
            {
                if (bone.rb != null)
                {
                    bone.savedPosition = bone.bone.localPosition;
                    bone.savedRotation = bone.bone.localRotation;

                    bone.rb.isKinematic = false;
                    bone.rb.useGravity = true;

                    // 应用冲击力
                    bone.rb.AddForce(impactForce, ForceMode.Impulse);
                }

                if (bone.col != null)
                {
                    bone.col.enabled = true;
                }
            }
        }

        /// <summary>
        /// 禁用布娃娃物理
        /// </summary>
        public void DisableRagdoll()
        {
            isRagdoll = false;

            foreach (var bone in ragdollBones)
            {
                if (bone.rb != null)
                {
                    bone.rb.isKinematic = true;
                    bone.rb.useGravity = false;
                    bone.rb.velocity = Vector3.zero;
                    bone.rb.angularVelocity = Vector3.zero;
                }

                if (bone.col != null)
                {
                    bone.col.enabled = false;
                }
            }

            // 平滑恢复到站立姿势
            if (hipsBone != null)
            {
                transform.position = hipsBone.position;
                transform.rotation = Quaternion.Euler(0, transform.eulerAngles.y, 0);
            }
        }

        /// <summary>
        /// 检测布娃娃是否稳定（可以恢复）
        /// </summary>
        private bool IsStable()
        {
            float totalVelocity = 0f;

            foreach (var bone in ragdollBones)
            {
                if (bone.rb != null)
                {
                    totalVelocity += bone.rb.velocity.magnitude;
                }
            }

            return totalVelocity < recoveryThreshold * ragdollBones.Count;
        }

        /// <summary>
        /// 获取髋部当前位置（用于相机跟随）
        /// </summary>
        public Vector3 GetHipsPosition()
        {
            return hipsBone != null ? hipsBone.position : transform.position;
        }

        /// <summary>
        /// 在编辑器中自动设置布娃娃
        /// </summary>
        [ContextMenu("Setup Ragdoll From Skeleton")]
        public void SetupRagdollFromSkeleton()
        {
            ragdollBones.Clear();

            // 定义骨骼层级和碰撞体设置
            string[] boneNames = {
                "Hips", "Spine", "Chest", "Head",
                "LeftUpperArm", "LeftLowerArm", "LeftHand",
                "RightUpperArm", "RightLowerArm", "RightHand",
                "LeftUpperLeg", "LeftLowerLeg", "LeftFoot",
                "RightUpperLeg", "RightLowerLeg", "RightFoot"
            };

            foreach (string boneName in boneNames)
            {
                Transform bone = FindBoneByName(transform, boneName);
                if (bone != null)
                {
                    SetupBone(bone, boneName);
                }
            }

            Debug.Log($"Setup {ragdollBones.Count} ragdoll bones");
        }

        private Transform FindBoneByName(Transform parent, string name)
        {
            if (parent.name.Contains(name))
                return parent;

            foreach (Transform child in parent)
            {
                Transform found = FindBoneByName(child, name);
                if (found != null)
                    return found;
            }

            return null;
        }

        private void SetupBone(Transform bone, string boneName)
        {
            // 添加 Rigidbody
            Rigidbody rb = bone.GetComponent<Rigidbody>();
            if (rb == null)
                rb = bone.gameObject.AddComponent<Rigidbody>();

            rb.mass = GetBoneMass(boneName);
            rb.drag = 0.5f;
            rb.angularDrag = 0.5f;

            // 添加 Collider
            Collider col = bone.GetComponent<Collider>();
            if (col == null)
            {
                if (boneName.Contains("Head"))
                {
                    SphereCollider sphere = bone.gameObject.AddComponent<SphereCollider>();
                    sphere.radius = 0.15f;
                    col = sphere;
                }
                else
                {
                    CapsuleCollider capsule = bone.gameObject.AddComponent<CapsuleCollider>();
                    capsule.radius = 0.05f;
                    capsule.height = 0.2f;
                    col = capsule;
                }
            }

            // 添加到列表
            var ragdollBone = new RagdollBone
            {
                boneName = boneName,
                bone = bone,
                rb = rb,
                col = col
            };
            ragdollBones.Add(ragdollBone);

            // 设置 Hips 引用
            if (boneName == "Hips")
                hipsBone = bone;
        }

        private float GetBoneMass(string boneName)
        {
            if (boneName.Contains("Hips") || boneName.Contains("Chest"))
                return 10f;
            if (boneName.Contains("Head"))
                return 5f;
            if (boneName.Contains("Upper"))
                return 3f;
            if (boneName.Contains("Lower"))
                return 2f;
            return 1f;
        }
    }
}
