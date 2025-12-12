using UnityEngine;

namespace BaguaCube.Environment
{
    /// <summary>
    /// 树木 - 可碰撞的环境装饰物
    /// </summary>
    public class Tree : EnvironmentObject
    {
        [Header("Tree Settings")]
        [SerializeField] private float swayAmount = 0.02f;
        [SerializeField] private float swaySpeed = 1f;
        [SerializeField] private bool canSway = true;

        [Header("Tree Parts")]
        [SerializeField] private Transform trunk;
        [SerializeField] private Transform canopy;

        private Vector3 originalCanopyPosition;
        private float swayOffset;

        protected override void Awake()
        {
            // 设置为静态物体
            objectType = ObjectType.Static;
            colliderType = ColliderType.Capsule;
            colliderRadius = 0.3f;
            colliderSize = new Vector3(0.6f, 3f, 0.6f);

            base.Awake();

            if (canopy != null)
            {
                originalCanopyPosition = canopy.localPosition;
            }

            swayOffset = Random.Range(0f, Mathf.PI * 2f);
        }

        private void Update()
        {
            if (canSway && canopy != null)
            {
                // 树冠随风摇摆
                float sway = Mathf.Sin(Time.time * swaySpeed + swayOffset) * swayAmount;
                canopy.localPosition = originalCanopyPosition + new Vector3(sway, 0, sway * 0.5f);
            }
        }

        protected override void OnPlayerCollision(Collision collision)
        {
            // 玩家撞到树时的效果
            if (canopy != null)
            {
                // 增加摇摆幅度
                StartCoroutine(ShakeTree());
            }
        }

        private System.Collections.IEnumerator ShakeTree()
        {
            float originalSway = swayAmount;
            swayAmount = 0.1f;

            yield return new WaitForSeconds(1f);

            // 渐变恢复
            float elapsed = 0f;
            float duration = 2f;

            while (elapsed < duration)
            {
                swayAmount = Mathf.Lerp(0.1f, originalSway, elapsed / duration);
                elapsed += Time.deltaTime;
                yield return null;
            }

            swayAmount = originalSway;
        }

        /// <summary>
        /// 在编辑器中生成简单的树模型
        /// </summary>
        [ContextMenu("Generate Simple Tree")]
        public void GenerateSimpleTree()
        {
            // 清除现有子物体
            while (transform.childCount > 0)
            {
                DestroyImmediate(transform.GetChild(0).gameObject);
            }

            // 创建树干
            GameObject trunkObj = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            trunkObj.name = "Trunk";
            trunkObj.transform.SetParent(transform);
            trunkObj.transform.localPosition = new Vector3(0, 1.5f, 0);
            trunkObj.transform.localScale = new Vector3(0.3f, 1.5f, 0.3f);
            trunkObj.GetComponent<Renderer>().material.color = new Color(0.4f, 0.26f, 0.13f);
            DestroyImmediate(trunkObj.GetComponent<Collider>());
            trunk = trunkObj.transform;

            // 创建树冠
            GameObject canopyObj = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            canopyObj.name = "Canopy";
            canopyObj.transform.SetParent(transform);
            canopyObj.transform.localPosition = new Vector3(0, 4f, 0);
            canopyObj.transform.localScale = new Vector3(2f, 2.5f, 2f);
            canopyObj.GetComponent<Renderer>().material.color = new Color(0.2f, 0.6f, 0.2f);
            DestroyImmediate(canopyObj.GetComponent<Collider>());
            canopy = canopyObj.transform;
        }
    }
}
