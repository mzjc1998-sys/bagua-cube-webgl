using UnityEngine;
using BaguaCube.Environment;
using BaguaCube.Player;
using BaguaCube.CameraSystem;
using BaguaCube.UI;

namespace BaguaCube.Core
{
    /// <summary>
    /// 场景初始化器 - 在编辑器中快速设置场景
    /// </summary>
    public class SceneInitializer : MonoBehaviour
    {
        [Header("Prefab References")]
        [SerializeField] private GameObject playerPrefab;
        [SerializeField] private GameObject cameraPrefab;
        [SerializeField] private GameObject baguaCubePrefab;
        [SerializeField] private GameObject uiCanvasPrefab;

        [Header("Environment Prefabs")]
        [SerializeField] private GameObject treePrefab;
        [SerializeField] private GameObject rockPrefab;
        [SerializeField] private GameObject cratePrefab;

        [Header("Scene Settings")]
        [SerializeField] private float groundSize = 50f;
        [SerializeField] private int treeCount = 20;
        [SerializeField] private int rockCount = 15;
        [SerializeField] private int obstacleCount = 10;

        [Header("Spawn Area")]
        [SerializeField] private float spawnRadius = 20f;
        [SerializeField] private float minDistanceFromCenter = 5f;

        /// <summary>
        /// 初始化完整场景
        /// </summary>
        [ContextMenu("Initialize Full Scene")]
        public void InitializeFullScene()
        {
            CreateManagers();
            CreatePlayer();
            CreateCamera();
            CreateBaguaCube();
            CreateGround();
            CreateEnvironment();
            CreateUI();

            Debug.Log("场景初始化完成！");
        }

        /// <summary>
        /// 创建管理器
        /// </summary>
        [ContextMenu("Create Managers")]
        public void CreateManagers()
        {
            // GameManager
            if (FindObjectOfType<GameManager>() == null)
            {
                GameObject gmObj = new GameObject("GameManager");
                gmObj.AddComponent<GameManager>();
            }

            // MapCollisionManager
            if (FindObjectOfType<MapCollisionManager>() == null)
            {
                GameObject mcmObj = new GameObject("MapCollisionManager");
                mcmObj.AddComponent<MapCollisionManager>();
            }

            // PoolManager
            if (FindObjectOfType<Utils.PoolManager>() == null)
            {
                GameObject pmObj = new GameObject("PoolManager");
                pmObj.AddComponent<Utils.PoolManager>();
            }
        }

        /// <summary>
        /// 创建玩家
        /// </summary>
        [ContextMenu("Create Player")]
        public void CreatePlayer()
        {
            if (FindObjectOfType<StickManController>() != null)
            {
                Debug.Log("玩家已存在");
                return;
            }

            GameObject player;
            if (playerPrefab != null)
            {
                player = Instantiate(playerPrefab);
            }
            else
            {
                player = CreateDefaultPlayer();
            }

            player.name = "Player";
            player.transform.position = Vector3.zero;
            player.tag = "Player";
        }

        private GameObject CreateDefaultPlayer()
        {
            GameObject player = new GameObject("Player");

            // 添加基本组件
            player.AddComponent<StickManController>();
            player.AddComponent<StickManRagdoll>();

            // 添加碰撞体
            CapsuleCollider col = player.AddComponent<CapsuleCollider>();
            col.height = 2f;
            col.radius = 0.3f;
            col.center = new Vector3(0, 1f, 0);

            // 添加刚体
            Rigidbody rb = player.AddComponent<Rigidbody>();
            rb.constraints = RigidbodyConstraints.FreezeRotation;
            rb.mass = 70f;

            // 创建简单的火柴人视觉模型
            CreateStickManVisual(player.transform);

            // 地面检测点
            GameObject groundCheck = new GameObject("GroundCheck");
            groundCheck.transform.SetParent(player.transform);
            groundCheck.transform.localPosition = new Vector3(0, 0.1f, 0);

            return player;
        }

        private void CreateStickManVisual(Transform parent)
        {
            // 头部
            GameObject head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            head.name = "Head";
            head.transform.SetParent(parent);
            head.transform.localPosition = new Vector3(0, 1.7f, 0);
            head.transform.localScale = new Vector3(0.25f, 0.25f, 0.25f);
            DestroyImmediate(head.GetComponent<Collider>());

            // 身体
            GameObject body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            body.name = "Body";
            body.transform.SetParent(parent);
            body.transform.localPosition = new Vector3(0, 1.1f, 0);
            body.transform.localScale = new Vector3(0.15f, 0.4f, 0.15f);
            DestroyImmediate(body.GetComponent<Collider>());

            // 腿
            CreateLimb(parent, "LeftLeg", new Vector3(-0.1f, 0.4f, 0), new Vector3(0.08f, 0.35f, 0.08f));
            CreateLimb(parent, "RightLeg", new Vector3(0.1f, 0.4f, 0), new Vector3(0.08f, 0.35f, 0.08f));

            // 手臂
            CreateLimb(parent, "LeftArm", new Vector3(-0.2f, 1.3f, 0), new Vector3(0.06f, 0.25f, 0.06f));
            CreateLimb(parent, "RightArm", new Vector3(0.2f, 1.3f, 0), new Vector3(0.06f, 0.25f, 0.06f));
        }

        private void CreateLimb(Transform parent, string name, Vector3 position, Vector3 scale)
        {
            GameObject limb = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            limb.name = name;
            limb.transform.SetParent(parent);
            limb.transform.localPosition = position;
            limb.transform.localScale = scale;
            DestroyImmediate(limb.GetComponent<Collider>());
        }

        /// <summary>
        /// 创建相机
        /// </summary>
        [ContextMenu("Create Camera")]
        public void CreateCamera()
        {
            BaguaCameraController existingCam = FindObjectOfType<BaguaCameraController>();
            if (existingCam != null)
            {
                Debug.Log("相机已存在");
                return;
            }

            GameObject camObj;
            if (cameraPrefab != null)
            {
                camObj = Instantiate(cameraPrefab);
            }
            else
            {
                camObj = new GameObject("Main Camera");
                camObj.AddComponent<Camera>();
                camObj.AddComponent<AudioListener>();
                camObj.AddComponent<BaguaCameraController>();
                camObj.tag = "MainCamera";

                camObj.transform.position = new Vector3(0, 10, -10);
                camObj.transform.rotation = Quaternion.Euler(35, 0, 0);
            }

            // 设置相机目标
            StickManController player = FindObjectOfType<StickManController>();
            if (player != null)
            {
                BaguaCameraController camController = camObj.GetComponent<BaguaCameraController>();
                if (camController != null)
                {
                    camController.SetTarget(player.transform);
                }
            }
        }

        /// <summary>
        /// 创建八卦立方体
        /// </summary>
        [ContextMenu("Create Bagua Cube")]
        public void CreateBaguaCube()
        {
            if (FindObjectOfType<BaguaCube>() != null)
            {
                Debug.Log("八卦立方体已存在");
                return;
            }

            GameObject cubeObj;
            if (baguaCubePrefab != null)
            {
                cubeObj = Instantiate(baguaCubePrefab);
            }
            else
            {
                cubeObj = new GameObject("BaguaCube");
                cubeObj.AddComponent<BaguaCube>();
            }

            cubeObj.transform.position = Vector3.zero;
        }

        /// <summary>
        /// 创建地面
        /// </summary>
        [ContextMenu("Create Ground")]
        public void CreateGround()
        {
            GameObject existingGround = GameObject.Find("Ground");
            if (existingGround != null)
            {
                DestroyImmediate(existingGround);
            }

            // 创建菱形地面
            GameObject ground = GameObject.CreatePrimitive(PrimitiveType.Quad);
            ground.name = "Ground";
            ground.transform.position = Vector3.zero;
            ground.transform.rotation = Quaternion.Euler(90, 45, 0);
            ground.transform.localScale = new Vector3(groundSize, groundSize, 1);

            // 设置层
            ground.layer = LayerMask.NameToLayer("Ground");

            // 设置材质颜色
            ground.GetComponent<Renderer>().material.color = new Color(0.3f, 0.5f, 0.3f);

            // 添加碰撞体
            BoxCollider col = ground.AddComponent<BoxCollider>();
            col.size = new Vector3(1, 1, 0.1f);
        }

        /// <summary>
        /// 创建环境物体
        /// </summary>
        [ContextMenu("Create Environment")]
        public void CreateEnvironment()
        {
            // 创建环境容器
            GameObject envContainer = GameObject.Find("Environment");
            if (envContainer == null)
            {
                envContainer = new GameObject("Environment");
            }

            // 生成树木
            for (int i = 0; i < treeCount; i++)
            {
                Vector3 pos = GetRandomSpawnPosition();
                CreateTree(pos, envContainer.transform);
            }

            // 生成岩石
            for (int i = 0; i < rockCount; i++)
            {
                Vector3 pos = GetRandomSpawnPosition();
                CreateRock(pos, envContainer.transform);
            }

            // 生成障碍物
            for (int i = 0; i < obstacleCount; i++)
            {
                Vector3 pos = GetRandomSpawnPosition();
                CreateObstacle(pos, envContainer.transform);
            }
        }

        private Vector3 GetRandomSpawnPosition()
        {
            float angle = Random.Range(0f, Mathf.PI * 2f);
            float distance = Random.Range(minDistanceFromCenter, spawnRadius);
            return new Vector3(
                Mathf.Cos(angle) * distance,
                0,
                Mathf.Sin(angle) * distance
            );
        }

        private void CreateTree(Vector3 position, Transform parent)
        {
            GameObject tree;
            if (treePrefab != null)
            {
                tree = Instantiate(treePrefab, position, Quaternion.identity, parent);
            }
            else
            {
                tree = new GameObject("Tree");
                tree.transform.position = position;
                tree.transform.SetParent(parent);
                Tree treeComp = tree.AddComponent<Tree>();
                treeComp.GenerateSimpleTree();
            }
        }

        private void CreateRock(Vector3 position, Transform parent)
        {
            GameObject rock;
            if (rockPrefab != null)
            {
                rock = Instantiate(rockPrefab, position, Quaternion.identity, parent);
            }
            else
            {
                rock = new GameObject("Rock");
                rock.transform.position = position;
                rock.transform.SetParent(parent);
                Rock rockComp = rock.AddComponent<Rock>();
                rockComp.GenerateSimpleRock();
            }
        }

        private void CreateObstacle(Vector3 position, Transform parent)
        {
            GameObject obstacle;
            if (cratePrefab != null)
            {
                obstacle = Instantiate(cratePrefab, position, Quaternion.identity, parent);
            }
            else
            {
                obstacle = new GameObject("Crate");
                obstacle.transform.position = position;
                obstacle.transform.SetParent(parent);
                Obstacle obsComp = obstacle.AddComponent<Obstacle>();
                obsComp.GenerateObstacleModel();
            }
        }

        /// <summary>
        /// 创建 UI
        /// </summary>
        [ContextMenu("Create UI")]
        public void CreateUI()
        {
            if (FindObjectOfType<GameUI>() != null)
            {
                Debug.Log("UI已存在");
                return;
            }

            if (uiCanvasPrefab != null)
            {
                Instantiate(uiCanvasPrefab);
            }
            else
            {
                // 创建简单的UI Canvas
                GameObject canvasObj = new GameObject("GameCanvas");
                Canvas canvas = canvasObj.AddComponent<Canvas>();
                canvas.renderMode = RenderMode.ScreenSpaceOverlay;
                canvasObj.AddComponent<UnityEngine.UI.CanvasScaler>();
                canvasObj.AddComponent<UnityEngine.UI.GraphicRaycaster>();
                canvasObj.AddComponent<GameUI>();

                // 创建虚拟摇杆
                GameObject joystickObj = new GameObject("VirtualJoystick");
                joystickObj.transform.SetParent(canvasObj.transform);
                joystickObj.AddComponent<VirtualJoystick>();
            }
        }

        /// <summary>
        /// 清理场景
        /// </summary>
        [ContextMenu("Clear Scene")]
        public void ClearScene()
        {
            // 删除环境物体
            GameObject env = GameObject.Find("Environment");
            if (env != null) DestroyImmediate(env);

            // 删除玩家
            StickManController player = FindObjectOfType<StickManController>();
            if (player != null) DestroyImmediate(player.gameObject);

            // 删除相机
            BaguaCameraController cam = FindObjectOfType<BaguaCameraController>();
            if (cam != null) DestroyImmediate(cam.gameObject);

            // 删除八卦立方体
            BaguaCube cube = FindObjectOfType<BaguaCube>();
            if (cube != null) DestroyImmediate(cube.gameObject);

            // 删除地面
            GameObject ground = GameObject.Find("Ground");
            if (ground != null) DestroyImmediate(ground);

            // 删除UI
            GameUI ui = FindObjectOfType<GameUI>();
            if (ui != null) DestroyImmediate(ui.gameObject);

            // 删除管理器
            GameManager gm = FindObjectOfType<GameManager>();
            if (gm != null) DestroyImmediate(gm.gameObject);

            Debug.Log("场景已清理！");
        }
    }
}
