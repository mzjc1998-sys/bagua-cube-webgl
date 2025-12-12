mergeInto(LibraryManager.library, {

    WXShowToast: function(titlePtr, iconPtr, duration) {
        var title = UTF8ToString(titlePtr);
        var icon = UTF8ToString(iconPtr);

        if (typeof wx !== 'undefined') {
            wx.showToast({
                title: title,
                icon: icon,
                duration: duration
            });
        } else {
            console.log('[WeChat] Toast:', title);
        }
    },

    WXShowModal: function(titlePtr, contentPtr, showCancel) {
        var title = UTF8ToString(titlePtr);
        var content = UTF8ToString(contentPtr);

        if (typeof wx !== 'undefined') {
            wx.showModal({
                title: title,
                content: content,
                showCancel: showCancel
            });
        } else {
            console.log('[WeChat] Modal:', title, content);
        }
    },

    WXShareAppMessage: function(titlePtr, imageUrlPtr) {
        var title = UTF8ToString(titlePtr);
        var imageUrl = UTF8ToString(imageUrlPtr);

        if (typeof wx !== 'undefined') {
            wx.shareAppMessage({
                title: title,
                imageUrl: imageUrl
            });
        } else {
            console.log('[WeChat] Share:', title);
        }
    },

    WXVibrateShort: function() {
        if (typeof wx !== 'undefined') {
            wx.vibrateShort({ type: 'medium' });
        }
    },

    WXVibrateLong: function() {
        if (typeof wx !== 'undefined') {
            wx.vibrateLong();
        }
    },

    WXGetSystemInfo: function() {
        var info = {
            screenWidth: 750,
            screenHeight: 1334,
            pixelRatio: 2,
            platform: 'devtools',
            brand: '',
            model: '',
            system: ''
        };

        if (typeof wx !== 'undefined') {
            var sysInfo = wx.getSystemInfoSync();
            info.screenWidth = sysInfo.screenWidth;
            info.screenHeight = sysInfo.screenHeight;
            info.pixelRatio = sysInfo.pixelRatio;
            info.platform = sysInfo.platform;
            info.brand = sysInfo.brand;
            info.model = sysInfo.model;
            info.system = sysInfo.system;
        }

        var jsonStr = JSON.stringify(info);
        var bufferSize = lengthBytesUTF8(jsonStr) + 1;
        var buffer = _malloc(bufferSize);
        stringToUTF8(jsonStr, buffer, bufferSize);
        return buffer;
    },

    WXSetStorage: function(keyPtr, valuePtr) {
        var key = UTF8ToString(keyPtr);
        var value = UTF8ToString(valuePtr);

        if (typeof wx !== 'undefined') {
            wx.setStorageSync(key, value);
        } else {
            localStorage.setItem(key, value);
        }
    },

    WXGetStorage: function(keyPtr) {
        var key = UTF8ToString(keyPtr);
        var value = '';

        if (typeof wx !== 'undefined') {
            try {
                value = wx.getStorageSync(key) || '';
            } catch (e) {
                value = '';
            }
        } else {
            value = localStorage.getItem(key) || '';
        }

        var bufferSize = lengthBytesUTF8(value) + 1;
        var buffer = _malloc(bufferSize);
        stringToUTF8(value, buffer, bufferSize);
        return buffer;
    },

    WXShowBannerAd: function(adUnitIdPtr) {
        var adUnitId = UTF8ToString(adUnitIdPtr);

        if (typeof wx !== 'undefined' && adUnitId) {
            var sysInfo = wx.getSystemInfoSync();
            var bannerAd = wx.createBannerAd({
                adUnitId: adUnitId,
                style: {
                    left: 0,
                    top: sysInfo.windowHeight - 100,
                    width: sysInfo.windowWidth
                }
            });

            bannerAd.show().catch(function(err) {
                console.error('Banner ad error:', err);
            });

            window._bannerAd = bannerAd;
        }
    },

    WXHideBannerAd: function() {
        if (window._bannerAd) {
            window._bannerAd.hide();
        }
    },

    WXShowRewardedVideoAd: function(adUnitIdPtr) {
        var adUnitId = UTF8ToString(adUnitIdPtr);

        if (typeof wx !== 'undefined' && adUnitId) {
            var rewardedVideoAd = wx.createRewardedVideoAd({
                adUnitId: adUnitId
            });

            rewardedVideoAd.onClose(function(res) {
                if (res && res.isEnded) {
                    // 用户完整观看了广告
                    SendMessage('GameManager', 'OnRewardedAdComplete', '1');
                } else {
                    // 用户中途退出
                    SendMessage('GameManager', 'OnRewardedAdComplete', '0');
                }
            });

            rewardedVideoAd.show().catch(function() {
                rewardedVideoAd.load().then(function() {
                    return rewardedVideoAd.show();
                });
            });
        }
    }
});
