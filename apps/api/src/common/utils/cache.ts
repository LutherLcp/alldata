/**
 * Redis 缓存工具 — 分层缓存策略
 *
 * 缓存层级:
 * - L1: 内存缓存 (Map) — 热点数据, TTL 60s
 * - L2: Redis 缓存 — 查询结果, TTL 5min
 * - L3: 数据库 — 持久化存储
 */
import { getRedisClient } from './redis';

// L1 内存缓存
const memoryCache = new Map<string, { value: any; expireAt: number }>();
const L1_TTL = 60 * 1000; // 60秒
const L1_MAX_SIZE = 1000;

// L2 Redis TTL 配置 (秒)
export const CACHE_TTL = {
  SHORT: 60, // 1分钟 — 高频变化数据
  MEDIUM: 300, // 5分钟 — 分析查询结果
  LONG: 900, // 15分钟 — 配置数据
  VERY_LONG: 3600, // 1小时 — 静态数据
};

/**
 * 获取缓存（先查 L1，再查 L2）
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  // L1: 内存缓存
  const l1 = memoryCache.get(key);
  if (l1 && l1.expireAt > Date.now()) {
    return l1.value as T;
  }
  if (l1) memoryCache.delete(key); // 过期清理

  // L2: Redis 缓存
  try {
    const redis = getRedisClient();
    const cached = await redis.get(key);
    if (cached) {
      const value = JSON.parse(cached);
      // 回填 L1
      setL1(key, value);
      return value as T;
    }
  } catch (e) {
    // Redis 不可用时降级
  }
  return null;
}

/**
 * 设置缓存（同时写入 L1 和 L2）
 */
export async function cacheSet(
  key: string,
  value: any,
  ttl: number = CACHE_TTL.MEDIUM
): Promise<void> {
  // L1: 内存缓存
  setL1(key, value);

  // L2: Redis 缓存
  try {
    const redis = getRedisClient();
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch (e) {
    // Redis 不可用时降级
  }
}

/**
 * 删除缓存
 */
export async function cacheDel(key: string): Promise<void> {
  memoryCache.delete(key);
  try {
    const redis = getRedisClient();
    await redis.del(key);
  } catch (e) {
    // ignore
  }
}

/**
 * 按前缀删除缓存
 */
export async function cacheDelByPrefix(prefix: string): Promise<void> {
  // 清理 L1
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }
  // 清理 L2
  try {
    const redis = getRedisClient();
    const keys = await redis.keys(`${prefix}*`);
    if (keys.length > 0) await redis.del(...keys);
  } catch (e) {
    // ignore
  }
}

/**
 * 带缓存的函数包装器
 */
export function withCache<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyGenerator: (...args: TArgs) => string,
  ttl: number = CACHE_TTL.MEDIUM
) {
  return async (...args: TArgs): Promise<TResult> => {
    const key = keyGenerator(...args);
    const cached = await cacheGet<TResult>(key);
    if (cached !== null) return cached;

    const result = await fn(...args);
    await cacheSet(key, result, ttl);
    return result;
  };
}

// ─── 内部方法 ─────────────────────────
function setL1(key: string, value: any) {
  // LRU 简单实现：超过上限时清理最早的
  if (memoryCache.size >= L1_MAX_SIZE) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }
  memoryCache.set(key, { value, expireAt: Date.now() + L1_TTL });
}
