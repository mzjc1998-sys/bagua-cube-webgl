using UnityEngine;

namespace BaguaCube.Environment
{
    /// <summary>
    /// 环境物体基类 - 所有可交互环境物体的基础
    /// </summary>
    public class EnvironmentObject : MonoBehaviour
    {
        [Header("Object Settings")]
        [SerializeField] protected ObjectType objectType = ObjectType.Static;
        [SerializeField] protected float mass = 1f;
        [SerializeField] protected bool isDestructible = false;

        [Header("Collision")]
        [SerializeField] protected bool hasCollision = true;
        [SerializeField] protected ColliderType colliderType = ColliderType.Box;
        [SerializeField] protected Vector3 colliderSize = Vector3.one;
        [SerializeField] protected float colliderRadius = 0.5f;

        [Header("Physics")]
        [SerializeField] protected bool usePhysics = false;
        [SerializeField] protected float bounciness = 0.3f;
        [SerializeField] protected float friction = 0.5f;

        // 组件缓存
        protected Collider col;
        protected Rigidbody rb;

        public enum ObjectType
        {
            Static,      // 静态物体（不可移动）
            Dynamic,     // 动态物体（可被推动）
            Kinematic,   // 动画物体
            Trigger      // 触发器
        }

        public enum ColliderType
        {
            Box,
            Sphere,
            Capsule,
            Mesh
        }

        protected virtual void Awake()
        {
            SetupCollider();
            SetupRigidbody();
            RegisterWithManager();
        }

        protected virtual void OnDestroy()
        {
            UnregisterFromManager();
        }

        /// <summary>
        /// 设置碰撞体
        /// </summary>
        protected virtual void SetupCollider()
        {
            if (!hasCollision) return;

            col = GetComponent<Collider>();

            if (col == null)
            {
                switch (colliderType)
                {
                    case ColliderType.Box:
                        BoxCollider box = gameObject.AddComponent<BoxCollider>();
                        box.size = colliderSize;
                        col = box;
                        break;
                    case ColliderType.Sphere:
                        SphereCollider sphere = gameObject.AddComponent<SphereCollider>();
                        sphere.radius = colliderRadius;
                        col = sphere;
                        break;
                    case ColliderType.Capsule:
                        CapsuleCollider capsule = gameObject.AddComponent<CapsuleCollider>();
                        capsule.radius = colliderRadius;
                        capsule.height = colliderSize.y;
                        col = capsule;
                        break;
                    case ColliderType.Mesh:
                        MeshCollider mesh = gameObject.AddComponent<MeshCollider>();
                        mesh.convex = usePhysics;
                        col = mesh;
                        break;
                }
            }

            // 设置为触发器
            if (objectType == ObjectType.Trigger)
            {
                col.isTrigger = true;
            }

            // 设置物理材质
            PhysicMaterial physicMat = new PhysicMaterial();
            physicMat.bounciness = bounciness;
            physicMat.dynamicFriction = friction;
            physicMat.staticFriction = friction;
            col.material = physicMat;
        }

        /// <summary>
        /// 设置刚体
        /// </summary>
        protected virtual void SetupRigidbody()
        {
            if (!usePhysics && objectType == ObjectType.Static) return;

            rb = GetComponent<Rigidbody>();

            if (rb == null && (usePhysics || objectType == ObjectType.Dynamic))
            {
                rb = gameObject.AddComponent<Rigidbody>();
            }

            if (rb != null)
            {
                rb.mass = mass;
                rb.isKinematic = (objectType == ObjectType.Kinematic || objectType == ObjectType.Static);
                rb.useGravity = usePhysics;
            }
        }

        /// <summary>
        /// 注册到碰撞管理器
        /// </summary>
        protected void RegisterWithManager()
        {
            if (MapCollisionManager.Instance != null)
            {
                MapCollisionManager.Instance.RegisterObject(this);
            }
        }

        /// <summary>
        /// 从碰撞管理器注销
        /// </summary>
        protected void UnregisterFromManager()
        {
            if (MapCollisionManager.Instance != null)
            {
                MapCollisionManager.Instance.UnregisterObject(this);
            }
        }

        /// <summary>
        /// 检测点是否在碰撞体内
        /// </summary>
        public virtual bool ContainsPoint(Vector3 point)
        {
            if (col == null) return false;
            return col.bounds.Contains(point);
        }

        /// <summary>
        /// 获取最近表面点
        /// </summary>
        public virtual Vector3 GetClosestPoint(Vector3 point)
        {
            if (col == null) return point;
            return col.ClosestPoint(point);
        }

        /// <summary>
        /// 受到冲击
        /// </summary>
        public virtual void OnImpact(Vector3 impactPoint, Vector3 impactForce)
        {
            if (rb != null && usePhysics)
            {
                rb.AddForceAtPosition(impactForce, impactPoint, ForceMode.Impulse);
            }

            if (isDestructible)
            {
                OnDestruct();
            }
        }

        /// <summary>
        /// 物体被破坏
        /// </summary>
        protected virtual void OnDestruct()
        {
            // 派生类实现具体破坏效果
            Destroy(gameObject);
        }

        protected virtual void OnCollisionEnter(Collision collision)
        {
            // 检测与玩家碰撞
            if (collision.gameObject.CompareTag("Player"))
            {
                OnPlayerCollision(collision);
            }
        }

        protected virtual void OnTriggerEnter(Collider other)
        {
            // 检测玩家进入触发区
            if (other.CompareTag("Player"))
            {
                OnPlayerEnterTrigger(other);
            }
        }

        protected virtual void OnTriggerExit(Collider other)
        {
            // 检测玩家离开触发区
            if (other.CompareTag("Player"))
            {
                OnPlayerExitTrigger(other);
            }
        }

        /// <summary>
        /// 玩家碰撞回调
        /// </summary>
        protected virtual void OnPlayerCollision(Collision collision)
        {
            // 派生类实现
        }

        /// <summary>
        /// 玩家进入触发区回调
        /// </summary>
        protected virtual void OnPlayerEnterTrigger(Collider player)
        {
            // 派生类实现
        }

        /// <summary>
        /// 玩家离开触发区回调
        /// </summary>
        protected virtual void OnPlayerExitTrigger(Collider player)
        {
            // 派生类实现
        }

#if UNITY_EDITOR
        protected virtual void OnDrawGizmosSelected()
        {
            Gizmos.color = new Color(0, 1, 0, 0.3f);

            switch (colliderType)
            {
                case ColliderType.Box:
                    Gizmos.DrawWireCube(transform.position, colliderSize);
                    break;
                case ColliderType.Sphere:
                    Gizmos.DrawWireSphere(transform.position, colliderRadius);
                    break;
                case ColliderType.Capsule:
                    // 简化的胶囊体可视化
                    Gizmos.DrawWireSphere(transform.position + Vector3.up * (colliderSize.y / 2 - colliderRadius), colliderRadius);
                    Gizmos.DrawWireSphere(transform.position - Vector3.up * (colliderSize.y / 2 - colliderRadius), colliderRadius);
                    break;
            }
        }
#endif
    }
}
