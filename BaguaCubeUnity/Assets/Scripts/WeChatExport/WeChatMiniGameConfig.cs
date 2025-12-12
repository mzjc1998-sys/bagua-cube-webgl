using UnityEngine;

namespace BaguaCube.WeChatExport
{
    /// <summary>
    /// 微信小游戏配置 - 管理小游戏特定设置
    /// </summary>
    [CreateAssetMenu(fileName = "WeChatMiniGameConfig", menuName = "BaguaCube/WeChat Config")]
    public class WeChatMiniGameConfig : ScriptableObject
    {
        [Header("基础配置")]
        [Tooltip("小游戏 AppID")]
        public string appId = "";

        [Tooltip("游戏名称")]
        public string gameName = "八卦立方体";

        [Tooltip("游戏版本")]
        public string version = "1.0.0";

        [Header("显示设置")]
        [Tooltip("设计分辨率宽度")]
        public int designWidth = 750;

        [Tooltip("设计分辨率高度")]
        public int designHeight = 1334;

        [Tooltip("设备像素比")]
        public float devicePixelRatio = 2f;

        [Tooltip("是否全屏")]
        public bool fullScreen = true;

        [Header("性能设置")]
        [Tooltip("目标帧率")]
        public int targetFrameRate = 60;

        [Tooltip("是否启用GPU实例化")]
        public bool enableGPUInstancing = true;

        [Tooltip("阴影距离")]
        public float shadowDistance = 20f;

        [Tooltip("纹理质量 (0=Full, 1=Half, 2=Quarter)")]
        [Range(0, 2)]
        public int textureQuality = 1;

        [Header("触摸设置")]
        [Tooltip("触摸灵敏度")]
        public float touchSensitivity = 1f;

        [Tooltip("虚拟摇杆大小")]
        public float joystickSize = 150f;

        [Tooltip("虚拟摇杆偏移")]
        public Vector2 joystickOffset = new Vector2(100f, 100f);

        [Header("音频设置")]
        [Tooltip("背景音乐音量")]
        [Range(0f, 1f)]
        public float bgmVolume = 0.7f;

        [Tooltip("音效音量")]
        [Range(0f, 1f)]
        public float sfxVolume = 1f;

        [Header("分享设置")]
        [Tooltip("分享标题")]
        public string shareTitle = "八卦立方体 - 探索易经智慧";

        [Tooltip("分享图片路径")]
        public string shareImagePath = "share.png";

        [Header("广告设置")]
        [Tooltip("Banner广告ID")]
        public string bannerAdId = "";

        [Tooltip("激励视频广告ID")]
        public string rewardAdId = "";

        /// <summary>
        /// 获取 project.config.json 内容
        /// </summary>
        public string GetProjectConfig()
        {
            return $@"{{
  ""description"": ""八卦立方体微信小游戏"",
  ""packOptions"": {{
    ""ignore"": []
  }},
  ""setting"": {{
    ""urlCheck"": false,
    ""es6"": true,
    ""enhance"": true,
    ""postcss"": true,
    ""preloadBackgroundData"": false,
    ""minified"": true,
    ""newFeature"": true,
    ""coverView"": true,
    ""nodeModules"": false,
    ""autoAudits"": false,
    ""showShadowRootInWxmlPanel"": true,
    ""scopeDataCheck"": false,
    ""uglifyFileName"": false,
    ""checkInvalidKey"": true,
    ""checkSiteMap"": true,
    ""uploadWithSourceMap"": true,
    ""compileHotReLoad"": false,
    ""useMultiFrameRuntime"": true,
    ""useApiHook"": true,
    ""babelSetting"": {{
      ""ignore"": [],
      ""disablePlugins"": [],
      ""outputPath"": """"
    }},
    ""useIsolateContext"": true,
    ""useCompilerModule"": false,
    ""userConfirmedUseCompilerModuleSwitch"": false
  }},
  ""compileType"": ""game"",
  ""libVersion"": ""2.19.4"",
  ""appid"": ""{appId}"",
  ""projectname"": ""{gameName}"",
  ""condition"": {{}}
}}";
        }

        /// <summary>
        /// 获取 game.json 内容
        /// </summary>
        public string GetGameJson()
        {
            return $@"{{
  ""deviceOrientation"": ""portrait"",
  ""showStatusBar"": false,
  ""networkTimeout"": 60000,
  ""subpackages"": [],
  ""plugins"": {{}},
  ""resizable"": false
}}";
        }
    }
}
