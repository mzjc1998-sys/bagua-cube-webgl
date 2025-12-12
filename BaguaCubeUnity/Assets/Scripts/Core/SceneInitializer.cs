using UnityEngine;

/// <summary>
/// 场景初始化器 - 自动创建游戏场景
/// </summary>
public class SceneInitializer : MonoBehaviour
{
    [Header("场景设置")]
    public float cubeSize = 10f;
    public bool autoInitialize = true;

    void Awake()
    {
        if (autoInitialize)
        {
            InitializeScene();
        }
    }

    [ContextMenu("初始化场景")]
    public void InitializeScene()
    {
        // 确保只有一个 GameManager
        if (FindObjectOfType<GameManager>() == null)
        {
            GameObject gmObj = new GameObject("GameManager");
            GameManager gm = gmObj.AddComponent<GameManager>();
            gm.cubeSize = cubeSize;
        }

        Debug.Log("场景初始化完成");
    }

    [ContextMenu("清理场景")]
    public void ClearScene()
    {
        // 删除所有游戏对象
        GameManager gm = FindObjectOfType<GameManager>();
        if (gm != null) DestroyImmediate(gm.gameObject);

        BaguaCube cube = FindObjectOfType<BaguaCube>();
        if (cube != null) DestroyImmediate(cube.gameObject);

        StickManController stickMan = FindObjectOfType<StickManController>();
        if (stickMan != null) DestroyImmediate(stickMan.gameObject);

        Debug.Log("场景已清理");
    }
}
