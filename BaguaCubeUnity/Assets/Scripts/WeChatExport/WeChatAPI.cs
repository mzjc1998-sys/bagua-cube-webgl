using UnityEngine;
using System.Runtime.InteropServices;

namespace BaguaCube.WeChatExport
{
    /// <summary>
    /// 微信小游戏 API 封装
    /// </summary>
    public static class WeChatAPI
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")]
        private static extern void WXShowToast(string title, string icon, int duration);

        [DllImport("__Internal")]
        private static extern void WXShowModal(string title, string content, bool showCancel);

        [DllImport("__Internal")]
        private static extern void WXShareAppMessage(string title, string imageUrl);

        [DllImport("__Internal")]
        private static extern void WXVibrateShort();

        [DllImport("__Internal")]
        private static extern void WXVibrateLong();

        [DllImport("__Internal")]
        private static extern string WXGetSystemInfo();

        [DllImport("__Internal")]
        private static extern void WXSetStorage(string key, string value);

        [DllImport("__Internal")]
        private static extern string WXGetStorage(string key);

        [DllImport("__Internal")]
        private static extern void WXShowBannerAd(string adUnitId);

        [DllImport("__Internal")]
        private static extern void WXHideBannerAd();

        [DllImport("__Internal")]
        private static extern void WXShowRewardedVideoAd(string adUnitId);
#endif

        /// <summary>
        /// 显示 Toast 提示
        /// </summary>
        public static void ShowToast(string title, string icon = "none", int duration = 1500)
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            WXShowToast(title, icon, duration);
#else
            Debug.Log($"[WeChat Toast] {title}");
#endif
        }

        /// <summary>
        /// 显示模态对话框
        /// </summary>
        public static void ShowModal(string title, string content, bool showCancel = true)
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            WXShowModal(title, content, showCancel);
#else
            Debug.Log($"[WeChat Modal] {title}: {content}");
#endif
        }

        /// <summary>
        /// 分享小游戏
        /// </summary>
        public static void ShareAppMessage(string title, string imageUrl = "")
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            WXShareAppMessage(title, imageUrl);
#else
            Debug.Log($"[WeChat Share] {title}");
#endif
        }

        /// <summary>
        /// 短震动
        /// </summary>
        public static void VibrateShort()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            WXVibrateShort();
#elif UNITY_ANDROID || UNITY_IOS
            Handheld.Vibrate();
#endif
        }

        /// <summary>
        /// 长震动
        /// </summary>
        public static void VibrateLong()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            WXVibrateLong();
#elif UNITY_ANDROID || UNITY_IOS
            Handheld.Vibrate();
#endif
        }

        /// <summary>
        /// 获取系统信息
        /// </summary>
        public static SystemInfo GetSystemInfo()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            string json = WXGetSystemInfo();
            return JsonUtility.FromJson<SystemInfo>(json);
#else
            return new SystemInfo
            {
                screenWidth = Screen.width,
                screenHeight = Screen.height,
                pixelRatio = 2f,
                platform = Application.platform.ToString()
            };
#endif
        }

        /// <summary>
        /// 保存数据到本地存储
        /// </summary>
        public static void SetStorage(string key, string value)
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            WXSetStorage(key, value);
#else
            PlayerPrefs.SetString(key, value);
            PlayerPrefs.Save();
#endif
        }

        /// <summary>
        /// 从本地存储读取数据
        /// </summary>
        public static string GetStorage(string key)
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            return WXGetStorage(key);
#else
            return PlayerPrefs.GetString(key, "");
#endif
        }

        /// <summary>
        /// 显示 Banner 广告
        /// </summary>
        public static void ShowBannerAd(string adUnitId)
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            WXShowBannerAd(adUnitId);
#else
            Debug.Log($"[WeChat Ad] Show Banner: {adUnitId}");
#endif
        }

        /// <summary>
        /// 隐藏 Banner 广告
        /// </summary>
        public static void HideBannerAd()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            WXHideBannerAd();
#else
            Debug.Log("[WeChat Ad] Hide Banner");
#endif
        }

        /// <summary>
        /// 显示激励视频广告
        /// </summary>
        public static void ShowRewardedVideoAd(string adUnitId)
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            WXShowRewardedVideoAd(adUnitId);
#else
            Debug.Log($"[WeChat Ad] Show Rewarded Video: {adUnitId}");
#endif
        }

        [System.Serializable]
        public class SystemInfo
        {
            public int screenWidth;
            public int screenHeight;
            public float pixelRatio;
            public string platform;
            public string brand;
            public string model;
            public string system;
        }
    }
}
