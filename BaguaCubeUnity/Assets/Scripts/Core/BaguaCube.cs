using UnityEngine;

namespace BaguaCube.Core
{
    /// <summary>
    /// 八卦立方体 - 管理八卦宫位视觉效果
    /// </summary>
    public class BaguaCube : MonoBehaviour
    {
        [Header("Cube Settings")]
        [SerializeField] private float cubeSize = 10f;
        [SerializeField] private Material[] palaceMaterials = new Material[8];

        [Header("Visual Settings")]
        [SerializeField] private Color[] palaceColors = new Color[8];
        [SerializeField] private float lineWidth = 0.05f;
        [SerializeField] private bool showTrigramLines = true;

        [Header("Ground Diamond")]
        [SerializeField] private Transform groundPlane;
        [SerializeField] private Material groundMaterial;

        // 八卦宫位顶点（立方体角）
        private Vector3[] palacePositions;
        private GameObject[] palaceMarkers;
        private LineRenderer[] trigramLines;

        // 当前状态
        private int currentPalace = 0;
        private float targetRotation = 0f;
        private float currentRotation = 0f;

        // 八卦颜色映射
        private static readonly Color[] DefaultPalaceColors = {
            new Color(1f, 1f, 1f),       // 乾 - 白色 (天)
            new Color(0.8f, 0.6f, 0.2f), // 兑 - 金色 (泽)
            new Color(1f, 0.3f, 0f),     // 离 - 红橙 (火)
            new Color(0f, 0.8f, 0f),     // 震 - 绿色 (雷)
            new Color(0.5f, 0.8f, 0.5f), // 巽 - 浅绿 (风)
            new Color(0f, 0.5f, 1f),     // 坎 - 蓝色 (水)
            new Color(0.6f, 0.4f, 0.2f), // 艮 - 棕色 (山)
            new Color(0.2f, 0.2f, 0.2f)  // 坤 - 黑色 (地)
        };

        private void Awake()
        {
            // 初始化颜色
            if (palaceColors == null || palaceColors.Length != 8)
            {
                palaceColors = DefaultPalaceColors;
            }

            CalculatePalacePositions();
        }

        /// <summary>
        /// 初始化八卦立方体
        /// </summary>
        public void Initialize(float size)
        {
            cubeSize = size;
            CalculatePalacePositions();
            CreatePalaceMarkers();
            CreateGroundDiamond();

            if (showTrigramLines)
            {
                CreateTrigramLines();
            }
        }

        /// <summary>
        /// 计算八卦宫位位置（立方体顶点）
        /// </summary>
        private void CalculatePalacePositions()
        {
            float half = cubeSize / 2f;

            // 八卦二进制对应立方体顶点
            // 000=乾, 001=兑, 010=离, 011=震, 100=巽, 101=坎, 110=艮, 111=坤
            palacePositions = new Vector3[8];

            for (int i = 0; i < 8; i++)
            {
                float x = ((i & 1) == 0) ? -half : half;
                float y = ((i & 2) == 0) ? -half : half;
                float z = ((i & 4) == 0) ? -half : half;
                palacePositions[i] = new Vector3(x, y, z);
            }
        }

        /// <summary>
        /// 创建宫位标记
        /// </summary>
        private void CreatePalaceMarkers()
        {
            palaceMarkers = new GameObject[8];

            for (int i = 0; i < 8; i++)
            {
                GameObject marker = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                marker.name = $"Palace_{GameManager.PalaceNames[i]}_{GameManager.PalaceBits[i]}";
                marker.transform.SetParent(transform);
                marker.transform.localPosition = palacePositions[i];
                marker.transform.localScale = Vector3.one * 0.5f;

                // 设置材质
                Renderer renderer = marker.GetComponent<Renderer>();
                if (palaceMaterials[i] != null)
                {
                    renderer.material = palaceMaterials[i];
                }
                else
                {
                    renderer.material.color = palaceColors[i];
                }

                // 添加发光效果
                var light = marker.AddComponent<Light>();
                light.type = LightType.Point;
                light.color = palaceColors[i];
                light.intensity = 0.5f;
                light.range = 2f;

                palaceMarkers[i] = marker;
            }
        }

        /// <summary>
        /// 创建地面菱形
        /// </summary>
        private void CreateGroundDiamond()
        {
            if (groundPlane != null)
            {
                // 调整地面大小
                groundPlane.localScale = new Vector3(cubeSize * 1.5f, 1f, cubeSize * 1.5f);
                return;
            }

            // 创建地面
            GameObject ground = GameObject.CreatePrimitive(PrimitiveType.Quad);
            ground.name = "GroundDiamond";
            ground.transform.SetParent(transform);
            ground.transform.localPosition = new Vector3(0, -cubeSize / 2f, 0);
            ground.transform.localRotation = Quaternion.Euler(90, 45, 0);
            ground.transform.localScale = new Vector3(cubeSize * 1.5f, cubeSize * 1.5f, 1f);

            // 设置材质
            if (groundMaterial != null)
            {
                ground.GetComponent<Renderer>().material = groundMaterial;
            }

            groundPlane = ground.transform;
        }

        /// <summary>
        /// 创建卦象线条
        /// </summary>
        private void CreateTrigramLines()
        {
            trigramLines = new LineRenderer[12]; // 立方体12条边

            int lineIndex = 0;
            int[,] edges = {
                {0,1}, {0,2}, {0,4},  // 从乾出发
                {7,6}, {7,5}, {7,3},  // 从坤出发
                {1,3}, {1,5},         // 兑连接
                {2,3}, {2,6},         // 离连接
                {4,5}, {4,6}          // 巽连接
            };

            for (int i = 0; i < 12; i++)
            {
                GameObject lineObj = new GameObject($"Edge_{i}");
                lineObj.transform.SetParent(transform);

                LineRenderer line = lineObj.AddComponent<LineRenderer>();
                line.startWidth = lineWidth;
                line.endWidth = lineWidth;
                line.positionCount = 2;
                line.SetPosition(0, palacePositions[edges[i, 0]]);
                line.SetPosition(1, palacePositions[edges[i, 1]]);

                // 渐变色
                line.startColor = palaceColors[edges[i, 0]];
                line.endColor = palaceColors[edges[i, 1]];

                trigramLines[lineIndex++] = line;
            }
        }

        /// <summary>
        /// 设置当前宫位视角
        /// </summary>
        public void SetPalaceView(int palaceIndex)
        {
            currentPalace = palaceIndex % 8;
            targetRotation = currentPalace * 45f;

            // 高亮当前宫位
            HighlightPalace(currentPalace);
        }

        /// <summary>
        /// 高亮指定宫位
        /// </summary>
        private void HighlightPalace(int index)
        {
            for (int i = 0; i < 8; i++)
            {
                if (palaceMarkers[i] == null) continue;

                Light light = palaceMarkers[i].GetComponent<Light>();
                if (light != null)
                {
                    light.intensity = (i == index) ? 2f : 0.5f;
                }

                // 缩放效果
                float targetScale = (i == index) ? 0.8f : 0.5f;
                palaceMarkers[i].transform.localScale = Vector3.one * targetScale;
            }
        }

        private void Update()
        {
            // 平滑旋转
            currentRotation = Mathf.LerpAngle(currentRotation, targetRotation, 5f * Time.deltaTime);
            transform.rotation = Quaternion.Euler(0, currentRotation, 0);
        }

        /// <summary>
        /// 获取宫位世界坐标
        /// </summary>
        public Vector3 GetPalaceWorldPosition(int index)
        {
            return transform.TransformPoint(palacePositions[index % 8]);
        }

        /// <summary>
        /// 获取地面中心坐标
        /// </summary>
        public Vector3 GetGroundCenter()
        {
            return transform.position + Vector3.down * (cubeSize / 2f);
        }

#if UNITY_EDITOR
        private void OnDrawGizmos()
        {
            if (palacePositions == null || palacePositions.Length != 8)
            {
                CalculatePalacePositions();
            }

            // 绘制立方体边
            Gizmos.color = Color.cyan;
            for (int i = 0; i < 8; i++)
            {
                Vector3 pos = transform.TransformPoint(palacePositions[i]);
                Gizmos.DrawWireSphere(pos, 0.2f);

                // 连接线
                for (int j = i + 1; j < 8; j++)
                {
                    // 只连接相邻顶点（二进制只差一位）
                    int diff = i ^ j;
                    if (diff == 1 || diff == 2 || diff == 4)
                    {
                        Gizmos.DrawLine(pos, transform.TransformPoint(palacePositions[j]));
                    }
                }
            }
        }
#endif
    }
}
