using UnityEngine;
using System.Collections.Generic;

namespace BaguaCube.Utils
{
    /// <summary>
    /// 通用对象池 - 优化性能
    /// </summary>
    public class ObjectPool<T> where T : Component
    {
        private readonly T prefab;
        private readonly Transform parent;
        private readonly Queue<T> pool = new Queue<T>();
        private readonly List<T> activeObjects = new List<T>();
        private readonly int initialSize;
        private readonly int maxSize;

        public int ActiveCount => activeObjects.Count;
        public int PooledCount => pool.Count;

        public ObjectPool(T prefab, Transform parent, int initialSize = 10, int maxSize = 100)
        {
            this.prefab = prefab;
            this.parent = parent;
            this.initialSize = initialSize;
            this.maxSize = maxSize;

            // 预创建对象
            for (int i = 0; i < initialSize; i++)
            {
                CreateNew();
            }
        }

        private T CreateNew()
        {
            T obj = Object.Instantiate(prefab, parent);
            obj.gameObject.SetActive(false);
            pool.Enqueue(obj);
            return obj;
        }

        /// <summary>
        /// 获取对象
        /// </summary>
        public T Get()
        {
            T obj;

            if (pool.Count > 0)
            {
                obj = pool.Dequeue();
            }
            else if (activeObjects.Count < maxSize)
            {
                obj = Object.Instantiate(prefab, parent);
            }
            else
            {
                // 达到最大数量，回收最旧的
                obj = activeObjects[0];
                activeObjects.RemoveAt(0);
            }

            obj.gameObject.SetActive(true);
            activeObjects.Add(obj);
            return obj;
        }

        /// <summary>
        /// 获取对象并设置位置
        /// </summary>
        public T Get(Vector3 position, Quaternion rotation)
        {
            T obj = Get();
            obj.transform.position = position;
            obj.transform.rotation = rotation;
            return obj;
        }

        /// <summary>
        /// 回收对象
        /// </summary>
        public void Return(T obj)
        {
            if (obj == null) return;

            obj.gameObject.SetActive(false);
            activeObjects.Remove(obj);
            pool.Enqueue(obj);
        }

        /// <summary>
        /// 回收所有活动对象
        /// </summary>
        public void ReturnAll()
        {
            foreach (var obj in activeObjects.ToArray())
            {
                Return(obj);
            }
        }

        /// <summary>
        /// 清空对象池
        /// </summary>
        public void Clear()
        {
            foreach (var obj in activeObjects)
            {
                if (obj != null)
                    Object.Destroy(obj.gameObject);
            }
            activeObjects.Clear();

            while (pool.Count > 0)
            {
                var obj = pool.Dequeue();
                if (obj != null)
                    Object.Destroy(obj.gameObject);
            }
        }
    }

    /// <summary>
    /// 对象池管理器
    /// </summary>
    public class PoolManager : MonoBehaviour
    {
        public static PoolManager Instance { get; private set; }

        private Dictionary<string, object> pools = new Dictionary<string, object>();

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
        }

        /// <summary>
        /// 创建对象池
        /// </summary>
        public ObjectPool<T> CreatePool<T>(string poolName, T prefab, int initialSize = 10, int maxSize = 100) where T : Component
        {
            if (pools.ContainsKey(poolName))
            {
                return pools[poolName] as ObjectPool<T>;
            }

            Transform poolParent = new GameObject($"Pool_{poolName}").transform;
            poolParent.SetParent(transform);

            var pool = new ObjectPool<T>(prefab, poolParent, initialSize, maxSize);
            pools[poolName] = pool;
            return pool;
        }

        /// <summary>
        /// 获取对象池
        /// </summary>
        public ObjectPool<T> GetPool<T>(string poolName) where T : Component
        {
            if (pools.TryGetValue(poolName, out object pool))
            {
                return pool as ObjectPool<T>;
            }
            return null;
        }

        /// <summary>
        /// 清理所有对象池
        /// </summary>
        public void ClearAll()
        {
            foreach (var pool in pools.Values)
            {
                var method = pool.GetType().GetMethod("Clear");
                method?.Invoke(pool, null);
            }
            pools.Clear();
        }
    }
}
