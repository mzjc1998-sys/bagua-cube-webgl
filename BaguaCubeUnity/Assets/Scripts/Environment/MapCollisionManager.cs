using UnityEngine;
using System.Collections.Generic;

namespace BaguaCube.Environment
{
    /// <summary>
    /// 地图碰撞管理器 - 管理所有环境物体的碰撞
    /// </summary>
    public class MapCollisionManager : MonoBehaviour
    {
        [Header("Collision Settings")]
        [SerializeField] private LayerMask collisionLayers;
        [SerializeField] private float bounceForce = 5f;
        [SerializeField] private float frictionCoefficient = 0.3f;

        [Header("Debug")]
        [SerializeField] private bool showDebugGizmos = true;

        // 所有可碰撞物体
        private List<EnvironmentObject> environmentObjects = new List<EnvironmentObject>();

        public static MapCollisionManager Instance { get; private set; }

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
        }

        private void Start()
        {
            // 收集所有环境物体
            CollectEnvironmentObjects();
        }

        /// <summary>
        /// 收集场景中的所有环境物体
        /// </summary>
        public void CollectEnvironmentObjects()
        {
            environmentObjects.Clear();
            EnvironmentObject[] objects = FindObjectsOfType<EnvironmentObject>();
            environmentObjects.AddRange(objects);

            Debug.Log($"收集到 {environmentObjects.Count} 个环境物体");
        }

        /// <summary>
        /// 注册环境物体
        /// </summary>
        public void RegisterObject(EnvironmentObject obj)
        {
            if (!environmentObjects.Contains(obj))
            {
                environmentObjects.Add(obj);
            }
        }

        /// <summary>
        /// 注销环境物体
        /// </summary>
        public void UnregisterObject(EnvironmentObject obj)
        {
            environmentObjects.Remove(obj);
        }

        /// <summary>
        /// 检测点是否在任何碰撞体内
        /// </summary>
        public bool IsPointInCollider(Vector3 point)
        {
            foreach (var obj in environmentObjects)
            {
                if (obj.ContainsPoint(point))
                    return true;
            }
            return false;
        }

        /// <summary>
        /// 获取最近的碰撞点
        /// </summary>
        public bool GetClosestCollisionPoint(Vector3 origin, Vector3 direction, float maxDistance, out RaycastHit hit)
        {
            return Physics.Raycast(origin, direction, out hit, maxDistance, collisionLayers);
        }

        /// <summary>
        /// 处理碰撞响应
        /// </summary>
        public Vector3 HandleCollisionResponse(Vector3 velocity, Vector3 normal)
        {
            // 计算反弹
            Vector3 reflected = Vector3.Reflect(velocity, normal);

            // 应用弹力系数
            reflected *= bounceForce;

            // 应用摩擦
            Vector3 tangent = velocity - Vector3.Dot(velocity, normal) * normal;
            reflected -= tangent * frictionCoefficient;

            return reflected;
        }

#if UNITY_EDITOR
        private void OnDrawGizmos()
        {
            if (!showDebugGizmos) return;

            foreach (var obj in environmentObjects)
            {
                if (obj == null) continue;

                Gizmos.color = Color.yellow;
                Collider col = obj.GetComponent<Collider>();
                if (col != null)
                {
                    Gizmos.DrawWireCube(col.bounds.center, col.bounds.size);
                }
            }
        }
#endif
    }
}
