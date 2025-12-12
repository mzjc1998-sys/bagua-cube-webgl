using UnityEngine;

namespace BaguaCube.Utils
{
    /// <summary>
    /// 数学工具函数
    /// </summary>
    public static class MathUtils
    {
        /// <summary>
        /// 角度插值（处理360度跨越）
        /// </summary>
        public static float LerpAngle(float from, float to, float t)
        {
            float delta = Mathf.Repeat(to - from, 360f);
            if (delta > 180f)
                delta -= 360f;
            return from + delta * Mathf.Clamp01(t);
        }

        /// <summary>
        /// 平滑阻尼角度
        /// </summary>
        public static float SmoothDampAngle(float current, float target, ref float velocity, float smoothTime)
        {
            return Mathf.SmoothDampAngle(current, target, ref velocity, smoothTime);
        }

        /// <summary>
        /// 将角度限制在 -180 到 180 范围
        /// </summary>
        public static float NormalizeAngle(float angle)
        {
            while (angle > 180f) angle -= 360f;
            while (angle < -180f) angle += 360f;
            return angle;
        }

        /// <summary>
        /// 二维向量旋转
        /// </summary>
        public static Vector2 RotateVector2(Vector2 v, float degrees)
        {
            float radians = degrees * Mathf.Deg2Rad;
            float sin = Mathf.Sin(radians);
            float cos = Mathf.Cos(radians);
            return new Vector2(
                cos * v.x - sin * v.y,
                sin * v.x + cos * v.y
            );
        }

        /// <summary>
        /// 三维向量绕Y轴旋转
        /// </summary>
        public static Vector3 RotateAroundY(Vector3 v, float degrees)
        {
            float radians = degrees * Mathf.Deg2Rad;
            float sin = Mathf.Sin(radians);
            float cos = Mathf.Cos(radians);
            return new Vector3(
                cos * v.x - sin * v.z,
                v.y,
                sin * v.x + cos * v.z
            );
        }

        /// <summary>
        /// 计算两个角度之间的最短差值
        /// </summary>
        public static float AngleDifference(float a, float b)
        {
            float diff = (b - a + 180f) % 360f - 180f;
            return diff < -180f ? diff + 360f : diff;
        }

        /// <summary>
        /// 平滑步进函数
        /// </summary>
        public static float SmoothStep(float from, float to, float t)
        {
            t = Mathf.Clamp01(t);
            t = t * t * (3f - 2f * t);
            return Mathf.Lerp(from, to, t);
        }

        /// <summary>
        /// 更平滑的步进函数
        /// </summary>
        public static float SmootherStep(float from, float to, float t)
        {
            t = Mathf.Clamp01(t);
            t = t * t * t * (t * (6f * t - 15f) + 10f);
            return Mathf.Lerp(from, to, t);
        }

        /// <summary>
        /// 弹性缓动
        /// </summary>
        public static float ElasticOut(float t)
        {
            if (t <= 0f) return 0f;
            if (t >= 1f) return 1f;

            float p = 0.3f;
            return Mathf.Pow(2f, -10f * t) * Mathf.Sin((t - p / 4f) * (2f * Mathf.PI) / p) + 1f;
        }

        /// <summary>
        /// 弹跳缓动
        /// </summary>
        public static float BounceOut(float t)
        {
            if (t < 1f / 2.75f)
            {
                return 7.5625f * t * t;
            }
            else if (t < 2f / 2.75f)
            {
                t -= 1.5f / 2.75f;
                return 7.5625f * t * t + 0.75f;
            }
            else if (t < 2.5f / 2.75f)
            {
                t -= 2.25f / 2.75f;
                return 7.5625f * t * t + 0.9375f;
            }
            else
            {
                t -= 2.625f / 2.75f;
                return 7.5625f * t * t + 0.984375f;
            }
        }

        /// <summary>
        /// 重新映射值范围
        /// </summary>
        public static float Remap(float value, float fromMin, float fromMax, float toMin, float toMax)
        {
            float t = Mathf.InverseLerp(fromMin, fromMax, value);
            return Mathf.Lerp(toMin, toMax, t);
        }

        /// <summary>
        /// 获取贝塞尔曲线点
        /// </summary>
        public static Vector3 QuadraticBezier(Vector3 p0, Vector3 p1, Vector3 p2, float t)
        {
            float u = 1f - t;
            return u * u * p0 + 2f * u * t * p1 + t * t * p2;
        }

        /// <summary>
        /// 获取三次贝塞尔曲线点
        /// </summary>
        public static Vector3 CubicBezier(Vector3 p0, Vector3 p1, Vector3 p2, Vector3 p3, float t)
        {
            float u = 1f - t;
            float tt = t * t;
            float uu = u * u;
            float uuu = uu * u;
            float ttt = tt * t;

            return uuu * p0 + 3f * uu * t * p1 + 3f * u * tt * p2 + ttt * p3;
        }

        /// <summary>
        /// 八卦宫位索引转二进制位
        /// </summary>
        public static int[] PalaceIndexToBits(int palaceIndex)
        {
            palaceIndex = palaceIndex % 8;
            return new int[]
            {
                (palaceIndex >> 2) & 1,
                (palaceIndex >> 1) & 1,
                palaceIndex & 1
            };
        }

        /// <summary>
        /// 二进制位转八卦宫位索引
        /// </summary>
        public static int BitsToPalaceIndex(int b0, int b1, int b2)
        {
            return (b0 << 2) | (b1 << 1) | b2;
        }
    }
}
