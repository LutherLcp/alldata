/**
 * Redis 客户端封装
 * 基于 ioredis，提供单例模式 + 常用方法
 */
import Redis from 'ioredis';
import { config } from '@/config';
import { logger } from '@/utils/logger';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });

    redisClient.on('error', (err) => {
      logger.error({ err: err.message }, 'Redis connection error');
    });
  }
  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// ============================================================
// 常用方法封装
// ============================================================

/** 设置缓存 */
export async function cacheSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const redis = getRedisClient();
  if (ttlSeconds) {
    await redis.set(key, value, 'EX', ttlSeconds);
  } else {
    await redis.set(key, value);
  }
}

/** 获取缓存 */
export async function cacheGet(key: string): Promise<string | null> {
  const redis = getRedisClient();
  return redis.get(key);
}

/** 删除缓存 */
export async function cacheDel(key: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(key);
}

/** 批量删除（按前缀） */
export async function cacheDelByPrefix(prefix: string): Promise<void> {
  const redis = getRedisClient();
  const keys = await redis.keys(`${prefix}*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

/** JSON 缓存 */
export async function cacheSetJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  await cacheSet(key, JSON.stringify(value), ttlSeconds);
}

/** JSON 缓存读取 */
export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const raw = await cacheGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** 自增计数器 */
export async function incr(key: string): Promise<number> {
  const redis = getRedisClient();
  return redis.incr(key);
}

/** 自增 + 设置过期 */
export async function incrWithExpire(key: string, ttlSeconds: number): Promise<number> {
  const redis = getRedisClient();
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, ttlSeconds);
  }
  return count;
}
