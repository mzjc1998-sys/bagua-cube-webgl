using UnityEngine;

namespace BaguaCube.Environment
{
    /// <summary>
    /// 岩石 - 可碰撞的环境物体，较大的可作为掩体
    /// </summary>
    public class Rock : EnvironmentObject
    {
        [Header("Rock Settings")]
        [SerializeField] private RockSize rockSize = RockSize.Medium;
        [SerializeField] private bool canBeClimbed = false;

        public enum RockSize
        {
            Small,   // 小石头
            Medium,  // 中型岩石
            Large,   // 大型岩石
            Boulder  // 巨石
        }

        protected override void Awake()
        {
            objectType = ObjectType.Static;
            colliderType = ColliderType.Sphere;

            // 根据大小设置碰撞体
            switch (rockSize)
            {
                case RockSize.Small:
                    colliderRadius = 0.3f;
                    mass = 10f;
                    break;
                case RockSize.Medium:
                    colliderRadius = 0.8f;
                    mass = 50f;
                    break;
                case RockSize.Large:
                    colliderRadius = 1.5f;
                    mass = 200f;
                    break;
                case RockSize.Boulder:
                    colliderRadius = 3f;
                    mass = 1000f;
                    break;
            }

            base.Awake();
        }

        protected override void OnPlayerCollision(Collision collision)
        {
            // 检测高速碰撞
            if (collision.relativeVelocity.magnitude > 8f)
            {
                // 触发玩家布娃娃效果
                var player = collision.gameObject.GetComponent<Player.StickManController>();
                if (player != null)
                {
                    Vector3 impactForce = collision.relativeVelocity * 0.5f;
                    player.ActivateRagdoll(impactForce);
                }
            }
        }

        /// <summary>
        /// 生成简单岩石模型
        /// </summary>
        [ContextMenu("Generate Simple Rock")]
        public void GenerateSimpleRock()
        {
            // 清除现有子物体
            while (transform.childCount > 0)
            {
                DestroyImmediate(transform.GetChild(0).gameObject);
            }

            // 基础岩石形状
            GameObject rockObj = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            rockObj.name = "RockBody";
            rockObj.transform.SetParent(transform);
            rockObj.transform.localPosition = Vector3.zero;

            float scale = 1f;
            switch (rockSize)
            {
                case RockSize.Small:
                    scale = 0.5f;
                    break;
                case RockSize.Medium:
                    scale = 1.2f;
                    break;
                case RockSize.Large:
                    scale = 2.5f;
                    break;
                case RockSize.Boulder:
                    scale = 5f;
                    break;
            }

            // 随机变形使其看起来更自然
            float scaleX = scale * Random.Range(0.8f, 1.2f);
            float scaleY = scale * Random.Range(0.6f, 1f);
            float scaleZ = scale * Random.Range(0.8f, 1.2f);
            rockObj.transform.localScale = new Vector3(scaleX, scaleY, scaleZ);

            // 随机旋转
            rockObj.transform.localRotation = Quaternion.Euler(
                Random.Range(-15f, 15f),
                Random.Range(0f, 360f),
                Random.Range(-15f, 15f)
            );

            // 灰色岩石材质
            rockObj.GetComponent<Renderer>().material.color = new Color(0.5f, 0.5f, 0.5f);

            // 移除子物体的碰撞体（使用父物体的）
            DestroyImmediate(rockObj.GetComponent<Collider>());
        }
    }
}
