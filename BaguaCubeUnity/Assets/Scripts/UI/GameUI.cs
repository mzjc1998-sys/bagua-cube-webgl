using UnityEngine;
using UnityEngine.UI;
using BaguaCube.Core;

namespace BaguaCube.UI
{
    /// <summary>
    /// 游戏主 UI 管理
    /// </summary>
    public class GameUI : MonoBehaviour
    {
        [Header("Palace Display")]
        [SerializeField] private Text palaceNameText;
        [SerializeField] private Text palaceBitsText;
        [SerializeField] private Image[] trigramLines = new Image[3];

        [Header("Status")]
        [SerializeField] private Text statusText;
        [SerializeField] private GameObject pausePanel;

        [Header("Palace Colors")]
        [SerializeField] private Image palaceColorIndicator;

        // 八卦颜色
        private static readonly Color[] PalaceColors = {
            new Color(1f, 1f, 1f),       // 乾 - 白
            new Color(0.8f, 0.6f, 0.2f), // 兑 - 金
            new Color(1f, 0.3f, 0f),     // 离 - 红
            new Color(0f, 0.8f, 0f),     // 震 - 绿
            new Color(0.5f, 0.8f, 0.5f), // 巽 - 浅绿
            new Color(0f, 0.5f, 1f),     // 坎 - 蓝
            new Color(0.6f, 0.4f, 0.2f), // 艮 - 棕
            new Color(0.2f, 0.2f, 0.2f)  // 坤 - 黑
        };

        private void Start()
        {
            if (pausePanel != null)
            {
                pausePanel.SetActive(false);
            }

            UpdatePalaceDisplay(0);
        }

        private void Update()
        {
            // 同步暂停状态
            if (GameManager.Instance != null && pausePanel != null)
            {
                pausePanel.SetActive(GameManager.Instance.IsPaused);
            }
        }

        /// <summary>
        /// 更新宫位显示
        /// </summary>
        public void UpdatePalaceDisplay(int palaceIndex)
        {
            palaceIndex = palaceIndex % 8;

            // 更新宫位名称
            if (palaceNameText != null)
            {
                palaceNameText.text = GameManager.PalaceNames[palaceIndex] + "宫";
            }

            // 更新二进制显示
            if (palaceBitsText != null)
            {
                palaceBitsText.text = GameManager.PalaceBits[palaceIndex];
            }

            // 更新卦象线条
            UpdateTrigramLines(palaceIndex);

            // 更新颜色指示器
            if (palaceColorIndicator != null)
            {
                palaceColorIndicator.color = PalaceColors[palaceIndex];
            }
        }

        /// <summary>
        /// 更新卦象线条显示
        /// </summary>
        private void UpdateTrigramLines(int palaceIndex)
        {
            if (trigramLines == null || trigramLines.Length < 3) return;

            string bits = GameManager.PalaceBits[palaceIndex];

            for (int i = 0; i < 3; i++)
            {
                if (trigramLines[i] == null) continue;

                // 0 = 阳爻（实线），1 = 阴爻（断线）
                bool isYin = bits[i] == '1';

                // 可以通过改变 sprite 或颜色来表示阴阳
                trigramLines[i].color = isYin ?
                    new Color(0.3f, 0.3f, 0.3f) :
                    new Color(1f, 1f, 1f);

                // 如果有子物体表示断开，设置其可见性
                Transform gap = trigramLines[i].transform.Find("Gap");
                if (gap != null)
                {
                    gap.gameObject.SetActive(isYin);
                }
            }
        }

        /// <summary>
        /// 设置状态文本
        /// </summary>
        public void SetStatusText(string text)
        {
            if (statusText != null)
            {
                statusText.text = text;
            }
        }

        /// <summary>
        /// 显示临时提示
        /// </summary>
        public void ShowToast(string message, float duration = 2f)
        {
            SetStatusText(message);
            CancelInvoke(nameof(ClearStatus));
            Invoke(nameof(ClearStatus), duration);
        }

        private void ClearStatus()
        {
            SetStatusText("");
        }

        /// <summary>
        /// 切换暂停面板
        /// </summary>
        public void TogglePausePanel()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.TogglePause();
            }
        }

        /// <summary>
        /// 重新开始游戏
        /// </summary>
        public void OnRestartButton()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.ResetGame();
            }
        }

        /// <summary>
        /// 上一个宫位
        /// </summary>
        public void OnPreviousPalace()
        {
            if (GameManager.Instance != null)
            {
                int current = GameManager.Instance.CurrentPalace;
                GameManager.Instance.SetPalace((current - 1 + 8) % 8);
                UpdatePalaceDisplay(GameManager.Instance.CurrentPalace);
            }
        }

        /// <summary>
        /// 下一个宫位
        /// </summary>
        public void OnNextPalace()
        {
            if (GameManager.Instance != null)
            {
                int current = GameManager.Instance.CurrentPalace;
                GameManager.Instance.SetPalace((current + 1) % 8);
                UpdatePalaceDisplay(GameManager.Instance.CurrentPalace);
            }
        }
    }
}
