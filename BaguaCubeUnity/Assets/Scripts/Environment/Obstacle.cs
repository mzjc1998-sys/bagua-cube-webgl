using UnityEngine;

namespace BaguaCube.Environment
{
    /// <summary>
    /// 通用障碍物 - 可推动或静态的障碍
    /// </summary>
    public class Obstacle : EnvironmentObject
    {
        [Header("Obstacle Settings")]
        [SerializeField] private ObstacleType obstacleType = ObstacleType.Crate;
        [SerializeField] private bool isPushable = true;
        [SerializeField] private float pushForceRequired = 5f;

        [Header("Effects")]
        [SerializeField] private bool emitParticlesOnHit = false;
        [SerializeField] private ParticleSystem hitParticles;

        public enum ObstacleType
        {
            Crate,      // 木箱
            Barrel,     // 桶
            Fence,      // 栅栏
            Wall,       // 墙壁
            Pillar,     // 柱子
            Platform    // 平台
        }

        protected override void Awake()
        {
            SetupObstacleType();
            base.Awake();
        }

        private void SetupObstacleType()
        {
            switch (obstacleType)
            {
                case ObstacleType.Crate:
                    colliderType = ColliderType.Box;
                    colliderSize = new Vector3(1f, 1f, 1f);
                    mass = 20f;
                    usePhysics = isPushable;
                    objectType = isPushable ? ObjectType.Dynamic : ObjectType.Static;
                    break;

                case ObstacleType.Barrel:
                    colliderType = ColliderType.Capsule;
                    colliderRadius = 0.4f;
                    colliderSize = new Vector3(0.8f, 1.2f, 0.8f);
                    mass = 15f;
                    usePhysics = isPushable;
                    objectType = isPushable ? ObjectType.Dynamic : ObjectType.Static;
                    break;

                case ObstacleType.Fence:
                    colliderType = ColliderType.Box;
                    colliderSize = new Vector3(2f, 1f, 0.1f);
                    mass = 100f;
                    usePhysics = false;
                    objectType = ObjectType.Static;
                    isDestructible = true;
                    break;

                case ObstacleType.Wall:
                    colliderType = ColliderType.Box;
                    colliderSize = new Vector3(3f, 3f, 0.3f);
                    mass = 1000f;
                    usePhysics = false;
                    objectType = ObjectType.Static;
                    break;

                case ObstacleType.Pillar:
                    colliderType = ColliderType.Capsule;
                    colliderRadius = 0.5f;
                    colliderSize = new Vector3(1f, 4f, 1f);
                    mass = 500f;
                    usePhysics = false;
                    objectType = ObjectType.Static;
                    break;

                case ObstacleType.Platform:
                    colliderType = ColliderType.Box;
                    colliderSize = new Vector3(3f, 0.3f, 3f);
                    mass = 1000f;
                    usePhysics = false;
                    objectType = ObjectType.Static;
                    break;
            }
        }

        protected override void OnPlayerCollision(Collision collision)
        {
            if (emitParticlesOnHit && hitParticles != null)
            {
                hitParticles.Play();
            }

            // 检测推动
            if (isPushable && rb != null)
            {
                Vector3 pushDirection = (transform.position - collision.transform.position).normalized;
                pushDirection.y = 0;

                float pushMagnitude = collision.relativeVelocity.magnitude;

                if (pushMagnitude >= pushForceRequired)
                {
                    rb.AddForce(pushDirection * pushMagnitude * 2f, ForceMode.Impulse);
                }
            }

            // 高速碰撞触发布娃娃
            if (collision.relativeVelocity.magnitude > 10f)
            {
                var player = collision.gameObject.GetComponent<Player.StickManController>();
                if (player != null)
                {
                    player.ActivateRagdoll(collision.relativeVelocity * 0.3f);
                }
            }
        }

        protected override void OnDestruct()
        {
            // 破坏效果
            if (hitParticles != null)
            {
                hitParticles.transform.SetParent(null);
                hitParticles.Play();
                Destroy(hitParticles.gameObject, 3f);
            }

            base.OnDestruct();
        }

        /// <summary>
        /// 生成障碍物模型
        /// </summary>
        [ContextMenu("Generate Obstacle Model")]
        public void GenerateObstacleModel()
        {
            // 清除现有子物体
            while (transform.childCount > 0)
            {
                DestroyImmediate(transform.GetChild(0).gameObject);
            }

            GameObject model = null;

            switch (obstacleType)
            {
                case ObstacleType.Crate:
                    model = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    model.transform.localScale = Vector3.one;
                    model.GetComponent<Renderer>().material.color = new Color(0.6f, 0.4f, 0.2f);
                    break;

                case ObstacleType.Barrel:
                    model = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                    model.transform.localScale = new Vector3(0.8f, 0.6f, 0.8f);
                    model.GetComponent<Renderer>().material.color = new Color(0.4f, 0.3f, 0.2f);
                    break;

                case ObstacleType.Fence:
                    model = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    model.transform.localScale = new Vector3(2f, 1f, 0.1f);
                    model.GetComponent<Renderer>().material.color = new Color(0.5f, 0.35f, 0.2f);
                    break;

                case ObstacleType.Wall:
                    model = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    model.transform.localScale = new Vector3(3f, 3f, 0.3f);
                    model.GetComponent<Renderer>().material.color = new Color(0.7f, 0.7f, 0.7f);
                    break;

                case ObstacleType.Pillar:
                    model = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                    model.transform.localScale = new Vector3(1f, 2f, 1f);
                    model.transform.localPosition = new Vector3(0, 2f, 0);
                    model.GetComponent<Renderer>().material.color = new Color(0.6f, 0.6f, 0.6f);
                    break;

                case ObstacleType.Platform:
                    model = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    model.transform.localScale = new Vector3(3f, 0.3f, 3f);
                    model.GetComponent<Renderer>().material.color = new Color(0.4f, 0.4f, 0.4f);
                    break;
            }

            if (model != null)
            {
                model.name = $"{obstacleType}Model";
                model.transform.SetParent(transform);
                model.transform.localPosition = Vector3.zero;
                DestroyImmediate(model.GetComponent<Collider>());
            }
        }
    }
}
