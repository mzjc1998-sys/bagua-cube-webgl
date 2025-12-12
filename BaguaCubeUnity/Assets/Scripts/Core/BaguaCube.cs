using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// 八卦立方体核心类
/// 管理8个顶点(八卦)和12条边的可视化
/// </summary>
public class BaguaCube : MonoBehaviour
{
    [Header("立方体设置")]
    public float cubeSize = 10f;

    [Header("节点设置")]
    public float nodeRadius = 0.3f;

    [Header("预制体")]
    public GameObject nodePrefab;
    public Material lineMaterial;

    // 八卦数据
    public static readonly string[] TrigramBits = { "000", "001", "010", "011", "100", "101", "110", "111" };

    public static readonly Dictionary<string, string> BitsToName = new Dictionary<string, string>
    {
        {"000", "乾"}, {"001", "兑"}, {"010", "离"}, {"011", "震"},
        {"100", "巽"}, {"101", "坎"}, {"110", "艮"}, {"111", "坤"}
    };

    // 宫位对 (站立位置, 对面位置)
    public static readonly Dictionary<string, string[]> PalacePairs = new Dictionary<string, string[]>
    {
        {"乾", new[]{"000", "111"}}, {"坤", new[]{"111", "000"}},
        {"兑", new[]{"001", "110"}}, {"艮", new[]{"110", "001"}},
        {"离", new[]{"010", "101"}}, {"坎", new[]{"101", "010"}},
        {"震", new[]{"011", "100"}}, {"巽", new[]{"100", "011"}}
    };

    // 运行时数据
    private Dictionary<string, GameObject> nodes = new Dictionary<string, GameObject>();
    private Dictionary<string, Vector3> nodePositions = new Dictionary<string, Vector3>();
    private List<EdgeData> edgeDataList = new List<EdgeData>();
    private string currentPalace = "艮";
    private string frontBits = "110";

    public string CurrentPalace => currentPalace;
    public string FrontBits => frontBits;
    public string BackBits => PalacePairs[currentPalace][1];

    public event System.Action<string> OnPalaceChanged;

    private class EdgeData
    {
        public string a;
        public string b;
        public int diffBit;
        public bool isWhite;
        public LineRenderer lineRenderer;
        public LineRenderer outlineRenderer;
    }

    void Awake()
    {
        CalculateNodePositions();
    }

    public void Initialize()
    {
        CreateNodes();
        CreateEdges();
        SetPalace(currentPalace);
    }

    void CalculateNodePositions()
    {
        float halfSize = cubeSize / 2f;

        foreach (string bits in TrigramBits)
        {
            // bit0 -> Y轴(阴阳), bit1 -> Z轴, bit2 -> X轴
            float x = (bits[2] == '1') ? halfSize : -halfSize;
            float y = (bits[0] == '1') ? -halfSize : halfSize;
            float z = (bits[1] == '1') ? halfSize : -halfSize;

            nodePositions[bits] = new Vector3(x, y, z);
        }
    }

    void CreateNodes()
    {
        GameObject nodesParent = new GameObject("Nodes");
        nodesParent.transform.SetParent(transform);

        foreach (string bits in TrigramBits)
        {
            GameObject node;

            if (nodePrefab != null)
            {
                node = Instantiate(nodePrefab, nodesParent.transform);
            }
            else
            {
                node = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                node.transform.SetParent(nodesParent.transform);
            }

            node.name = $"Node_{bits}_{BitsToName[bits]}";
            node.transform.localPosition = nodePositions[bits];
            node.transform.localScale = Vector3.one * nodeRadius * 2;

            // 颜色: 根据1的数量计算灰度
            int ones = CountOnes(bits);
            float gray = 1f - (ones / 3f);

            Renderer renderer = node.GetComponent<Renderer>();
            if (renderer != null)
            {
                Material mat = new Material(Shader.Find("Unlit/Color"));
                mat.color = new Color(gray, gray, gray);
                renderer.material = mat;
            }

            // 点击检测
            var collider = node.GetComponent<Collider>();
            if (collider == null)
            {
                collider = node.AddComponent<SphereCollider>();
            }
            ((SphereCollider)collider).radius = 2f;

            // 节点数据
            BaguaNode nodeData = node.AddComponent<BaguaNode>();
            nodeData.bits = bits;
            nodeData.palaceName = BitsToName[bits];
            nodeData.baguaCube = this;

            nodes[bits] = node;

            // 标签
            CreateLabel(node, bits);
        }
    }

    void CreateLabel(GameObject node, string bits)
    {
        GameObject labelObj = new GameObject($"Label_{bits}");
        labelObj.transform.SetParent(node.transform);
        labelObj.transform.localPosition = Vector3.up * 1.2f;

        TextMesh textMesh = labelObj.AddComponent<TextMesh>();
        textMesh.text = bits;
        textMesh.fontSize = 32;
        textMesh.alignment = TextAlignment.Center;
        textMesh.anchor = TextAnchor.MiddleCenter;
        textMesh.color = new Color(0.2f, 0.2f, 0.2f);
        textMesh.characterSize = 0.08f;

        labelObj.AddComponent<BillboardText>();
    }

    void CreateEdges()
    {
        GameObject edgesParent = new GameObject("Edges");
        edgesParent.transform.SetParent(transform);

        for (int i = 0; i < TrigramBits.Length; i++)
        {
            for (int j = i + 1; j < TrigramBits.Length; j++)
            {
                string a = TrigramBits[i];
                string b = TrigramBits[j];

                int diffBit = -1;
                int diffCount = 0;

                for (int k = 0; k < 3; k++)
                {
                    if (a[k] != b[k])
                    {
                        diffBit = k;
                        diffCount++;
                    }
                }

                if (diffCount == 1)
                {
                    bool isWhite = a[diffBit] == '0';
                    CreateEdge(edgesParent, a, b, diffBit, isWhite);
                }
            }
        }
    }

    void CreateEdge(GameObject parent, string a, string b, int diffBit, bool isWhite)
    {
        EdgeData edgeData = new EdgeData
        {
            a = a,
            b = b,
            diffBit = diffBit,
            isWhite = isWhite
        };

        Material whiteMat = new Material(Shader.Find("Unlit/Color"));
        whiteMat.color = Color.white;

        Material blackMat = new Material(Shader.Find("Unlit/Color"));
        blackMat.color = Color.black;

        Material grayMat = new Material(Shader.Find("Unlit/Color"));
        grayMat.color = new Color(0.5f, 0.5f, 0.5f);

        if (isWhite)
        {
            // 白边: 先画灰色描边
            GameObject outlineObj = new GameObject($"EdgeOutline_{a}_{b}");
            outlineObj.transform.SetParent(parent.transform);

            LineRenderer outlineLr = outlineObj.AddComponent<LineRenderer>();
            outlineLr.positionCount = 2;
            outlineLr.SetPosition(0, nodePositions[a]);
            outlineLr.SetPosition(1, nodePositions[b]);
            outlineLr.material = grayMat;
            outlineLr.startWidth = 0.15f;
            outlineLr.endWidth = 0.15f;
            outlineLr.useWorldSpace = false;
            edgeData.outlineRenderer = outlineLr;

            // 白边主体
            GameObject edgeObj = new GameObject($"Edge_{a}_{b}");
            edgeObj.transform.SetParent(parent.transform);

            LineRenderer lr = edgeObj.AddComponent<LineRenderer>();
            lr.positionCount = 2;
            lr.SetPosition(0, nodePositions[a]);
            lr.SetPosition(1, nodePositions[b]);
            lr.material = whiteMat;
            lr.startWidth = 0.08f;
            lr.endWidth = 0.08f;
            lr.useWorldSpace = false;
            edgeData.lineRenderer = lr;
        }
        else
        {
            // 黑边
            GameObject edgeObj = new GameObject($"Edge_{a}_{b}");
            edgeObj.transform.SetParent(parent.transform);

            LineRenderer lr = edgeObj.AddComponent<LineRenderer>();
            lr.positionCount = 2;
            lr.SetPosition(0, nodePositions[a]);
            lr.SetPosition(1, nodePositions[b]);
            lr.material = blackMat;
            lr.startWidth = 0.08f;
            lr.endWidth = 0.08f;
            lr.useWorldSpace = false;
            edgeData.lineRenderer = lr;
        }

        edgeDataList.Add(edgeData);
    }

    int CountOnes(string bits)
    {
        int count = 0;
        foreach (char c in bits) if (c == '1') count++;
        return count;
    }

    public void SetPalace(string palaceName)
    {
        if (!PalacePairs.ContainsKey(palaceName)) return;

        currentPalace = palaceName;
        frontBits = PalacePairs[palaceName][0];

        // 隐藏前方节点和相连的边
        foreach (var kvp in nodes)
        {
            kvp.Value.SetActive(kvp.Key != frontBits);
        }

        foreach (var edge in edgeDataList)
        {
            bool visible = edge.a != frontBits && edge.b != frontBits;
            if (edge.lineRenderer != null)
                edge.lineRenderer.gameObject.SetActive(visible);
            if (edge.outlineRenderer != null)
                edge.outlineRenderer.gameObject.SetActive(visible);
        }

        OnPalaceChanged?.Invoke(palaceName);
    }

    public void OnNodeClicked(string bits)
    {
        if (bits == frontBits) return;

        string palaceName = BitsToName[bits];
        if (PalacePairs.ContainsKey(palaceName))
        {
            SetPalace(palaceName);
        }
    }

    public Vector3 GetNodePosition(string bits)
    {
        return nodePositions.ContainsKey(bits) ? transform.TransformPoint(nodePositions[bits]) : transform.position;
    }

    public Vector3 GetNodeLocalPosition(string bits)
    {
        return nodePositions.ContainsKey(bits) ? nodePositions[bits] : Vector3.zero;
    }

    public Vector3 GetFrontPosition()
    {
        return GetNodePosition(frontBits);
    }

    public Vector3 GetBackPosition()
    {
        return GetNodePosition(BackBits);
    }

    public Vector3 GetGroundCenter()
    {
        return transform.position + Vector3.down * (cubeSize / 2f);
    }

    // 获取底部四个顶点(地面菱形)
    public Vector3[] GetGroundQuad()
    {
        List<KeyValuePair<string, float>> bottomNodes = new List<KeyValuePair<string, float>>();

        foreach (var bits in TrigramBits)
        {
            if (bits == frontBits) continue;
            float y = nodePositions[bits].y;
            bottomNodes.Add(new KeyValuePair<string, float>(bits, y));
        }

        bottomNodes.Sort((a, b) => a.Value.CompareTo(b.Value));

        Vector3[] quad = new Vector3[4];
        for (int i = 0; i < 4 && i < bottomNodes.Count; i++)
        {
            quad[i] = GetNodePosition(bottomNodes[i].Key);
        }
        return quad;
    }
}

/// <summary>
/// 八卦节点组件
/// </summary>
public class BaguaNode : MonoBehaviour
{
    public string bits;
    public string palaceName;
    public BaguaCube baguaCube;

    void OnMouseDown()
    {
        baguaCube?.OnNodeClicked(bits);
    }
}

/// <summary>
/// 使文字始终面向相机
/// </summary>
public class BillboardText : MonoBehaviour
{
    void LateUpdate()
    {
        if (Camera.main != null)
        {
            transform.LookAt(transform.position + Camera.main.transform.rotation * Vector3.forward,
                           Camera.main.transform.rotation * Vector3.up);
        }
    }
}
