using UnityEngine;
using BaguaCube.Player;
using BaguaCube.CameraSystem;

namespace BaguaCube.Core
{
    /// <summary>
    /// 游戏管理器 - 八卦立方体游戏核心
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("References")]
        [SerializeField] private StickManController player;
        [SerializeField] private BaguaCameraController cameraController;
        [SerializeField] private BaguaCube baguaCube;

        [Header("Game Settings")]
        [SerializeField] private float cubeSize = 10f;

        // 八卦宫位定义
        public static readonly string[] PalaceNames = {
            "乾", "兑", "离", "震", "巽", "坎", "艮", "坤"
        };

        public static readonly string[] PalaceBits = {
            "000", "001", "010", "011", "100", "101", "110", "111"
        };

        // 当前状态
        private int currentPalace = 0;
        private bool isPaused = false;

        public StickManController Player => player;
        public int CurrentPalace => currentPalace;
        public bool IsPaused => isPaused;

        private void Awake()
        {
            // 单例
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        private void Start()
        {
            InitializeGame();
        }

        private void Update()
        {
            HandleInput();
        }

        private void InitializeGame()
        {
            // 初始化八卦立方体
            if (baguaCube != null)
            {
                baguaCube.Initialize(cubeSize);
            }

            // 设置初始宫位
            SetPalace(0);
        }

        private void HandleInput()
        {
            // 切换宫位 (Q/E 或数字键)
            if (Input.GetKeyDown(KeyCode.Q))
            {
                SetPalace(currentPalace - 1 + 8);
            }
            else if (Input.GetKeyDown(KeyCode.E))
            {
                SetPalace(currentPalace + 1);
            }

            // 数字键直接切换
            for (int i = 0; i < 8; i++)
            {
                if (Input.GetKeyDown(KeyCode.Alpha1 + i))
                {
                    SetPalace(i);
                }
            }

            // 暂停
            if (Input.GetKeyDown(KeyCode.Escape))
            {
                TogglePause();
            }
        }

        /// <summary>
        /// 设置当前宫位
        /// </summary>
        public void SetPalace(int palaceIndex)
        {
            currentPalace = palaceIndex % 8;

            // 更新相机视角
            if (cameraController != null)
            {
                cameraController.SetPalaceView(currentPalace);
            }

            // 更新八卦立方体显示
            if (baguaCube != null)
            {
                baguaCube.SetPalaceView(currentPalace);
            }

            Debug.Log($"切换到 {PalaceNames[currentPalace]}宫 ({PalaceBits[currentPalace]})");
        }

        /// <summary>
        /// 获取宫位名称
        /// </summary>
        public string GetPalaceName(int index)
        {
            return PalaceNames[index % 8];
        }

        /// <summary>
        /// 暂停/继续游戏
        /// </summary>
        public void TogglePause()
        {
            isPaused = !isPaused;
            Time.timeScale = isPaused ? 0f : 1f;
        }

        /// <summary>
        /// 重置游戏
        /// </summary>
        public void ResetGame()
        {
            // 重置玩家位置
            if (player != null)
            {
                player.transform.position = Vector3.zero;
                player.RecoverFromRagdoll();
            }

            // 重置宫位
            SetPalace(0);

            // 恢复时间
            isPaused = false;
            Time.timeScale = 1f;
        }
    }
}
