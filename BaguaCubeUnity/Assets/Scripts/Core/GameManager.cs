using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// 游戏管理器 - 八卦立方体游戏核心
/// </summary>
public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    [Header("场景引用")]
    public BaguaCube baguaCube;
    public StickManController stickMan;
    public Camera mainCamera;

    [Header("UI")]
    public Text palaceText;
    public Text infoText;

    [Header("设置")]
    public float cubeSize = 10f;
    public Color backgroundColor = new Color(0.93f, 0.95f, 0.97f);

    // 状态
    private bool isInitialized = false;

    void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }

    void Start()
    {
        Initialize();
    }

    void Initialize()
    {
        // 设置背景色
        if (mainCamera == null)
            mainCamera = Camera.main;

        if (mainCamera != null)
            mainCamera.backgroundColor = backgroundColor;

        // 创建或获取八卦立方体
        if (baguaCube == null)
        {
            GameObject cubeObj = new GameObject("BaguaCube");
            baguaCube = cubeObj.AddComponent<BaguaCube>();
            baguaCube.cubeSize = cubeSize;
        }
        baguaCube.Initialize();
        baguaCube.OnPalaceChanged += OnPalaceChanged;

        // 创建或获取火柴人
        if (stickMan == null)
        {
            GameObject stickManObj = new GameObject("StickMan");
            stickMan = stickManObj.AddComponent<StickManController>();
        }

        // 设置火柴人位置 (地面中心)
        Vector3 groundCenter = baguaCube.GetGroundCenter();
        stickMan.SetPosition(groundCenter);

        // 设置相机
        SetupCamera();

        UpdateUI();
        isInitialized = true;

        Debug.Log("========================================");
        Debug.Log("八卦立方体 - Unity 版本");
        Debug.Log("版本: 1.0.0");
        Debug.Log("========================================");
    }

    void SetupCamera()
    {
        if (mainCamera == null) return;

        // 设置相机位置 (从前方节点位置看向对面)
        Vector3 frontPos = baguaCube.GetFrontPosition();
        Vector3 backPos = baguaCube.GetBackPosition();

        // 相机放在前方节点位置稍前
        Vector3 cameraPos = frontPos;
        mainCamera.transform.position = cameraPos;
        mainCamera.transform.LookAt(backPos);
    }

    void Update()
    {
        if (!isInitialized) return;

        HandleInput();
    }

    void HandleInput()
    {
        // 触摸/鼠标点击检测节点
        if (Input.GetMouseButtonDown(0))
        {
            Ray ray = mainCamera.ScreenPointToRay(Input.mousePosition);
            RaycastHit hit;

            if (Physics.Raycast(ray, out hit, 100f))
            {
                BaguaNode node = hit.collider.GetComponent<BaguaNode>();
                if (node != null)
                {
                    baguaCube.OnNodeClicked(node.bits);
                }
            }
        }

        // 键盘控制
#if UNITY_EDITOR || UNITY_STANDALONE
        // 数字键切换宫位
        for (int i = 0; i < 8; i++)
        {
            if (Input.GetKeyDown(KeyCode.Alpha1 + i))
            {
                string[] names = { "乾", "兑", "离", "震", "巽", "坎", "艮", "坤" };
                baguaCube.SetPalace(names[i]);
            }
        }
#endif
    }

    void OnPalaceChanged(string palaceName)
    {
        // 更新相机
        SetupCamera();

        // 更新UI
        UpdateUI();

        Debug.Log($"切换到 {palaceName}宫");
    }

    void UpdateUI()
    {
        if (palaceText != null)
        {
            palaceText.text = $"宫视角: {baguaCube.CurrentPalace}宫";
        }

        if (infoText != null)
        {
            infoText.text = $"超立方体时空切片 · {cubeSize}m × {cubeSize}m × {cubeSize}m";
        }
    }

    // 微信小游戏接口
    public void InitFromWeChat(string jsonData)
    {
        Debug.Log("从微信初始化: " + jsonData);
        // 解析配置数据
    }
}
